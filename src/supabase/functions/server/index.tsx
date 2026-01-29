import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { generatePDFReport, generateHTMLReport } from "./pdf-generator.ts";
import { sendReportShareEmail } from "./email-service.ts";
import { checkAllRateLimits, getRateLimitHeaders, checkAllLimits, getDailyUsage, DAILY_MESSAGE_LIMITS } from "./rate-limiter.ts";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  resumeSubscription,
  createOneTimePayment,
  handleWebhook,
  validatePromoCode,
} from "./stripe-routes.ts";
import {
  createRoom as createVideoRoom,
  getMeetingToken,
  getRoom as getVideoRoom,
  deleteRoom as deleteVideoRoom,
  getRoomPresence,
  startRecording,
  stopRecording,
} from "./video-routes.ts";
import {
  getProvider,
  searchProviders,
  saveProvider,
  updateAvailability,
  getProviderPatients,
  getProviderSessions,
  getProviderStats,
  scheduleSession,
  updateSessionStatus,
  submitSessionNotes,
  requestProfileAccess,
  getAvailableSlots,
  verifyProvider,
} from "./provider-routes.ts";
import { sanitizeForAI, sanitizeMessages, sanitizeName, scrubPIIFromError, detectPromptInjection } from "./sanitize.ts";
import {
  verifyAuth,
  verifyAuthAndFeature,
  hasTierFeature,
  unauthorizedResponse,
  forbiddenResponse,
  type AuthUser,
  type TierType,
} from "./auth-middleware.ts";
import {
  checkAdminPermission,
  logAdminAction,
  getModerationQueue,
  getModerationItem,
  reviewModerationItem,
  applyUserModerationAction,
  getUserModerationHistory,
  flagContent,
  getModerationStats,
} from "./moderation-routes.ts";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
// SECURITY: Strict origin validation - only allow known domains
const isProduction = Deno.env.get('ENVIRONMENT') === 'production' ||
                     Deno.env.get('DENO_ENV') === 'production' ||
                     !Deno.env.get('ENVIRONMENT'); // Default to production if not set

const productionOrigins = [
  'https://aminy.app',
  'https://www.aminy.app',
  'https://app.aminy.app',
];

const developmentOrigins = [
  ...productionOrigins,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const allowedOrigins = isProduction ? productionOrigins : developmentOrigins;

app.use(
  "/*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, server-to-server)
      if (!origin) return productionOrigins[0];

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) return origin;

      // SECURITY: In production, reject unknown origins
      // In development, allow specific localhost ports only (not wildcard)
      if (!isProduction) {
        // Only allow localhost with specific ports, not arbitrary ports
        const localhostMatch = origin.match(/^http:\/\/(localhost|127\.0\.0\.1):(3000|5173|5174|8080)$/);
        if (localhostMatch) return origin;
      }

      // Log rejected origins for monitoring
      console.warn('[CORS] Rejected origin:', origin, 'Production:', isProduction);

      // Return null to reject (proper CORS rejection)
      // Returning the origin would allow it, so we return the production domain
      // which will cause a CORS error on the client
      return productionOrigins[0];
    },
    allowHeaders: ["Content-Type", "Authorization", "X-User-Id", "X-Coach-Id", "X-Request-Id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Request-Id"],
    maxAge: 600,
    credentials: true,
  }),
);

// Security headers middleware - applies to all API responses
app.use('*', async (c, next) => {
  await next();

  // Add security headers to all responses
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS for production
  const isProduction = !c.req.url.includes('localhost');
  if (isProduction) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // API-specific CSP (more restrictive than frontend)
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
});

// ============================================================================
// HEALTH CHECK ENDPOINTS - Production Monitoring
// ============================================================================

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    latencyMs?: number;
  }[];
  system?: {
    memory: {
      heapUsed: number;
      heapTotal: number;
    };
  };
}

const startTime = Date.now();

// Basic health check (for load balancers)
app.get("/make-server-8a022548/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
  });
});

// Liveness probe (is the service running?)
app.get("/make-server-8a022548/health/live", (c) => {
  return c.json({ status: "ok" });
});

// Readiness probe (is the service ready to accept traffic?)
app.get("/make-server-8a022548/health/ready", async (c) => {
  const checks = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check AI configuration
  const aiConfig = getAIConfig();
  if (aiConfig) {
    checks.push({ name: 'ai_config', status: 'pass' as const });
  } else {
    checks.push({ name: 'ai_config', status: 'fail' as const, message: 'No AI provider configured' });
    overallStatus = 'unhealthy';
  }

  // Check Stripe configuration
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (stripeKey) {
    checks.push({ name: 'stripe_config', status: 'pass' as const });
  } else {
    checks.push({ name: 'stripe_config', status: 'warn' as const, message: 'Stripe not configured' });
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }

  // Check Daily.co configuration
  const dailyKey = Deno.env.get('DAILY_API_KEY');
  if (dailyKey) {
    checks.push({ name: 'video_config', status: 'pass' as const });
  } else {
    checks.push({ name: 'video_config', status: 'warn' as const, message: 'Video calls not configured' });
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: Date.now() - startTime,
    checks,
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  return c.json(result, statusCode);
});

// Deep health check (comprehensive check of all dependencies)
app.get("/make-server-8a022548/health/deep", async (c) => {
  const authHeader = c.req.header('Authorization');

  // Deep health check requires authentication
  const authResult = await verifyAuth(authHeader);
  if (!authResult.user || authResult.user.role !== 'admin') {
    // Return basic health for non-admins
    return c.json({
      status: 'ok',
      message: 'Admin authentication required for deep health check',
    });
  }

  const checks: HealthCheckResult['checks'] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check AI provider connectivity
  const aiConfig = getAIConfig();
  if (aiConfig) {
    const aiStart = Date.now();
    try {
      // Simple ping to AI provider
      if (aiConfig.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${aiConfig.apiKey}` },
        });
        if (response.ok) {
          checks.push({
            name: 'ai_provider',
            status: 'pass',
            latencyMs: Date.now() - aiStart
          });
        } else {
          throw new Error(`API returned ${response.status}`);
        }
      } else {
        // Anthropic doesn't have a simple ping endpoint, check key format
        if (aiConfig.apiKey.startsWith('sk-ant-')) {
          checks.push({
            name: 'ai_provider',
            status: 'pass',
            message: 'API key format valid',
            latencyMs: Date.now() - aiStart
          });
        } else {
          checks.push({ name: 'ai_provider', status: 'warn', message: 'API key format unusual' });
        }
      }
    } catch (error) {
      checks.push({
        name: 'ai_provider',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Connection failed'
      });
      overallStatus = 'degraded';
    }
  } else {
    checks.push({ name: 'ai_provider', status: 'fail', message: 'No AI provider configured' });
    overallStatus = 'unhealthy';
  }

  // Check Stripe connectivity
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (stripeKey) {
    const stripeStart = Date.now();
    try {
      const response = await fetch('https://api.stripe.com/v1/balance', {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      });
      if (response.ok) {
        checks.push({
          name: 'stripe',
          status: 'pass',
          latencyMs: Date.now() - stripeStart
        });
      } else {
        checks.push({
          name: 'stripe',
          status: 'warn',
          message: `API returned ${response.status}`,
          latencyMs: Date.now() - stripeStart
        });
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      }
    } catch (error) {
      checks.push({
        name: 'stripe',
        status: 'fail',
        message: 'Connection failed'
      });
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    }
  } else {
    checks.push({ name: 'stripe', status: 'warn', message: 'Not configured' });
  }

  // Check Daily.co connectivity
  const dailyKey = Deno.env.get('DAILY_API_KEY');
  if (dailyKey) {
    const dailyStart = Date.now();
    try {
      const response = await fetch('https://api.daily.co/v1/', {
        headers: { 'Authorization': `Bearer ${dailyKey}` },
      });
      if (response.ok) {
        checks.push({
          name: 'daily_video',
          status: 'pass',
          latencyMs: Date.now() - dailyStart
        });
      } else {
        checks.push({
          name: 'daily_video',
          status: 'warn',
          message: `API returned ${response.status}`
        });
      }
    } catch (error) {
      checks.push({ name: 'daily_video', status: 'fail', message: 'Connection failed' });
    }
  } else {
    checks.push({ name: 'daily_video', status: 'warn', message: 'Not configured' });
  }

  // Check KV store
  const kvStart = Date.now();
  try {
    const testKey = `health_check_${Date.now()}`;
    await kv.setKV(testKey, 'test', 5000); // 5 second TTL
    const result = await kv.getKV(testKey);
    if (result === 'test') {
      checks.push({
        name: 'kv_store',
        status: 'pass',
        latencyMs: Date.now() - kvStart
      });
    } else {
      checks.push({ name: 'kv_store', status: 'warn', message: 'Read/write mismatch' });
    }
  } catch (error) {
    checks.push({ name: 'kv_store', status: 'fail', message: 'KV store error' });
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: Date.now() - startTime,
    checks,
    system: {
      memory: {
        // @ts-ignore - Deno memory info
        heapUsed: Deno.memoryUsage?.()?.heapUsed || 0,
        heapTotal: Deno.memoryUsage?.()?.heapTotal || 0,
      },
    },
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  return c.json(result, statusCode);
});

// Metrics endpoint for monitoring systems
app.get("/make-server-8a022548/metrics", async (c) => {
  const authHeader = c.req.header('Authorization');

  // Metrics require authentication
  const authResult = await verifyAuth(authHeader);
  if (!authResult.user || authResult.user.role !== 'admin') {
    return c.json({ error: 'Admin authentication required' }, 401);
  }

  // Return Prometheus-style metrics
  const metrics = [
    `# HELP aminy_uptime_seconds Server uptime in seconds`,
    `# TYPE aminy_uptime_seconds gauge`,
    `aminy_uptime_seconds ${(Date.now() - startTime) / 1000}`,
    ``,
    `# HELP aminy_health_status Health status (1=healthy, 0.5=degraded, 0=unhealthy)`,
    `# TYPE aminy_health_status gauge`,
    `aminy_health_status 1`,
  ].join('\n');

  return c.text(metrics, 200, {
    'Content-Type': 'text/plain; version=0.0.4',
  });
});

// ============================================================================
// AI PROVIDER UTILITIES - Support both OpenAI and Anthropic (Claude)
// ============================================================================

type AIProvider = 'openai' | 'anthropic';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

function getAIConfig(): AIConfig | null {
  // Check OpenAI first (user preference), then Anthropic
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (openaiKey) {
    return { provider: 'openai', apiKey: openaiKey };
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    return { provider: 'anthropic', apiKey: anthropicKey };
  }

  return null;
}

// Token cost tracking (approximate costs per 1K tokens as of 2025)
const TOKEN_COSTS = {
  'gpt-4o': { input: 0.0025, output: 0.01 }, // $2.50 / $10 per 1M tokens
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 }, // $3 / $15 per 1M tokens
};

interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
}

async function trackTokenUsage(
  userId: string,
  usage: AIUsage
): Promise<void> {
  try {
    // Store token usage for cost monitoring
    const usageKey = `ai_tokens:${userId}:${new Date().toISOString().split('T')[0]}`;
    const existing = await kv.get(usageKey) || { totalTokens: 0, totalCost: 0, requests: 0 };

    await kv.set(usageKey, {
      totalTokens: existing.totalTokens + usage.totalTokens,
      totalCost: existing.totalCost + usage.estimatedCost,
      requests: existing.requests + 1,
      lastUpdated: new Date().toISOString(),
    });

    // Alert if daily cost exceeds threshold (logged for monitoring)
    const DAILY_COST_ALERT_THRESHOLD = 10; // $10/day per user
    if (existing.totalCost + usage.estimatedCost > DAILY_COST_ALERT_THRESHOLD) {
      console.warn(`[COST ALERT] User ${userId} exceeded $${DAILY_COST_ALERT_THRESHOLD}/day AI spend`);
    }
  } catch (error) {
    console.error('Token tracking error:', error);
  }
}

async function callAI(config: AIConfig, options: {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  userId?: string;
}): Promise<{ text: string; usage?: AIUsage }> {
  const { systemPrompt, messages, maxTokens = 1000, temperature = 0.7, userId } = options;

  if (config.provider === 'openai') {
    // OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const model = 'gpt-4o';
    const costs = TOKEN_COSTS[model];
    const usage: AIUsage = {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
      estimatedCost: ((data.usage?.prompt_tokens || 0) * costs.input + (data.usage?.completion_tokens || 0) * costs.output) / 1000,
      model,
    };

    // Track usage if userId provided
    if (userId) {
      await trackTokenUsage(userId, usage);
    }

    return {
      text: data.choices[0].message.content,
      usage,
    };
  } else {
    // Anthropic (Claude) API
    // Filter out system messages for Claude
    const filteredMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: filteredMessages
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const model = 'claude-sonnet-4-20250514';
    const costs = TOKEN_COSTS[model];
    const usage: AIUsage = {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      estimatedCost: ((data.usage?.input_tokens || 0) * costs.input + (data.usage?.output_tokens || 0) * costs.output) / 1000,
      model,
    };

    // Track usage if userId provided
    if (userId) {
      await trackTokenUsage(userId, usage);
    }

    return {
      text: data.content[0].text,
      usage,
    };
  }
}

// AI Orchestrator endpoint - categorize and prioritize tasks
app.post("/make-server-8a022548/ai/categorize", async (c) => {
  try {
    const { userInput, context } = await c.req.json();

    // SECURITY: Verify auth token and get REAL tier from database
    const authHeader = c.req.header('Authorization');
    const authResult = await verifyAuth(authHeader);

    let rateLimitId: string;
    let userTier: TierType;

    if (authResult.authenticated && authResult.user) {
      rateLimitId = authResult.user.userId;
      userTier = authResult.user.tier;
    } else {
      rateLimitId = c.req.header('x-forwarded-for') || 'anonymous';
      userTier = 'free';
    }

    // Rate limiting with verified tier
    const rateLimitCheck = await checkAllRateLimits(rateLimitId, userTier, 'ai-categorize');
    if (!rateLimitCheck.allowed) {
      return c.json(
        { error: rateLimitCheck.reason, retryAfter: rateLimitCheck.result.retryAfter },
        { status: 429, headers: getRateLimitHeaders(rateLimitCheck.result) }
      );
    }

    if (!userInput || typeof userInput !== 'string') {
      return c.json({ error: 'userInput is required and must be a string' }, 400);
    }

    // SECURITY: Sanitize user input to prevent prompt injection
    const sanitizedInput = sanitizeForAI(userInput);
    if (!sanitizedInput) {
      return c.json({ error: 'Invalid input after sanitization' }, 400);
    }

    const aiConfig = getAIConfig();
    if (!aiConfig) {
      return c.json({ error: 'AI service not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.' }, 500);
    }


    // System prompt for Aminy - gentle, focused, parent-first
    const systemPrompt = `You are Aminy, a compassionate AI assistant helping parents of neurodivergent children manage their daily lives. Your role is to:

1. Parse user's stream-of-consciousness thoughts and extract actionable tasks
2. Categorize each task into: "urgent" (today), "important" (this week), "routine" (ongoing), or "someday" (future)
3. Identify the single MOST IMPORTANT task the parent should focus on right now (their "top focus")
4. Provide gentle, encouraging guidance

When the user shares their thoughts, respond with a JSON object:
{
  "tasks": [
    {
      "title": "Brief task description (5-7 words max)",
      "category": "urgent|important|routine|someday",
      "context": "Which area: child-care, self-care, admin, or family",
      "estimatedTime": "5 min|15 min|30 min|1 hour|longer"
    }
  ],
  "topFocus": {
    "taskIndex": 0,
    "reason": "One sentence explaining why this is the top priority"
  },
  "encouragement": "A warm, brief message of support (1-2 sentences max)"
}

Keep language simple, warm, and action-oriented. Remember: these parents are overwhelmed—help them focus on ONE thing at a time.`;

    // Also sanitize context if provided
    const sanitizedContext = context ? sanitizeForAI(context) : '';

    const result = await callAI(aiConfig, {
      systemPrompt,
      messages: [
        { role: 'user', content: `${sanitizedContext ? `Context: ${sanitizedContext}\n\n` : ''}User's thoughts: ${sanitizedInput}\n\nRespond ONLY with valid JSON matching the format specified in the system prompt.` }
      ],
      maxTokens: 1000,
      temperature: 0.7,
      userId, // Track token usage
    });

    const aiResponse = JSON.parse(result.text);
    return c.json({ ...aiResponse, usage: result.usage });
  } catch (error) {
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Get focus task and streak
app.get("/make-server-8a022548/focus/current", async (c) => {
  try {
    const userId = c.req.header('X-User-Id') || 'default';
    
    // Get current focus task
    const focusTask = await kv.get(`focus:${userId}:current`);
    
    // Get streak data
    const streakData = await kv.get(`focus:${userId}:streak`);
    
    return c.json({
      task: focusTask,
      streak: streakData || { count: 0, lastCompleted: null }
    });
  } catch (error) {
    return c.json({ error: 'Failed to get focus task' }, 500);
  }
});

// Update focus task
app.post("/make-server-8a022548/focus/update", async (c) => {
  try {
    const userId = c.req.header('X-User-Id') || 'default';
    const { task } = await c.req.json();
    
    if (!task) {
      return c.json({ error: 'task is required' }, 400);
    }

    await kv.set(`focus:${userId}:current`, task);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to update focus task' }, 500);
  }
});

// Complete focus task (increments streak)
app.post("/make-server-8a022548/focus/complete", async (c) => {
  try {
    const userId = c.req.header('X-User-Id') || 'default';
    
    // Get current streak
    const streakData = await kv.get(`focus:${userId}:streak`) || { count: 0, lastCompleted: null };
    
    // Check if completed today already
    const today = new Date().toDateString();
    const lastCompleted = streakData.lastCompleted ? new Date(streakData.lastCompleted).toDateString() : null;
    
    let newStreak = { ...streakData };
    
    if (lastCompleted === today) {
      // Already completed today, don't increment
      return c.json({ streak: newStreak });
    }
    
    // Check if streak should continue
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastCompleted === yesterdayStr || !lastCompleted) {
      // Continue or start streak
      newStreak.count += 1;
    } else {
      // Streak broken, restart
      newStreak.count = 1;
    }
    
    newStreak.lastCompleted = new Date().toISOString();
    
    await kv.set(`focus:${userId}:streak`, newStreak);
    
    // Clear current focus task
    await kv.del(`focus:${userId}:current`);
    
    return c.json({ streak: newStreak });
  } catch (error) {
    return c.json({ error: 'Failed to complete task' }, 500);
  }
});

// AI Brain endpoint - For contextual AI with full child/vault context
app.post("/make-server-8a022548/ai/brain", async (c) => {
  try {
    const body = await c.req.json();

    const { userMessage, conversationHistory, systemPrompt } = body;

    // SECURITY: Verify auth token and get REAL tier from database
    const authHeader = c.req.header('Authorization');
    const authResult = await verifyAuth(authHeader);

    let rateLimitId: string;
    let userTier: TierType;

    if (authResult.authenticated && authResult.user) {
      rateLimitId = authResult.user.userId;
      userTier = authResult.user.tier;
    } else {
      rateLimitId = c.req.header('x-forwarded-for') || 'anonymous';
      userTier = 'free';
    }

    // Rate limiting with verified tier
    const rateLimitCheck = await checkAllRateLimits(rateLimitId, userTier, 'ai-brain');
    if (!rateLimitCheck.allowed) {
      return c.json(
        { error: rateLimitCheck.reason, retryAfter: rateLimitCheck.result.retryAfter },
        { status: 429, headers: getRateLimitHeaders(rateLimitCheck.result) }
      );
    }

    if (!userMessage) {
      return c.json({ error: 'userMessage is required' }, 400);
    }

    const aiConfig = getAIConfig();
    if (!aiConfig) {
      return c.json({ error: 'AI service not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.' }, 500);
    }


    // Prepare messages
    const conversationMessages = (conversationHistory || []).filter(m => m.role !== 'system');
    const messages = [
      ...conversationMessages,
      { role: 'user', content: userMessage }
    ];

    const result = await callAI(aiConfig, {
      systemPrompt: systemPrompt || 'You are Aminy, a helpful AI assistant for parents.',
      messages,
      maxTokens: 500,
      temperature: 0.8
    });


    return c.json({
      message: result.text,
      usage: result.usage,
      provider: aiConfig.provider
    });
  } catch (error) {
    // SECURITY: Scrub PII from error messages before returning to client
    const safeError = scrubPIIFromError(error);
    return c.json({ error: safeError, code: 'AI_PROCESSING_ERROR' }, 500);
  }
});

// AI Chat endpoint - For conversational AI (onboarding, Ask Aminy, etc)
app.post("/make-server-8a022548/ai/chat", async (c) => {
  try {
    const body = await c.req.json();

    const { messages, context } = body;

    // Create Supabase client for usage tracking
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // SECURITY: Verify auth token and get REAL tier from database
    // NEVER trust tier from client - always verify server-side
    const authHeader = c.req.header('Authorization');
    const authResult = await verifyAuth(authHeader);

    let rateLimitId: string;
    let userTier: TierType;

    if (authResult.authenticated && authResult.user) {
      // Authenticated user - use verified tier from database
      rateLimitId = authResult.user.userId;
      userTier = authResult.user.tier;
    } else {
      // Anonymous user - use IP and default to free tier
      rateLimitId = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'anonymous';
      userTier = 'free';
    }

    // Check both per-minute rate limits AND daily usage limits
    const limitCheck = await checkAllLimits(supabase, rateLimitId, userTier, 'ai-chat', true);
    if (!limitCheck.allowed) {
      const headers = getRateLimitHeaders(limitCheck.rateLimitResult);
      return c.json(
        {
          error: limitCheck.reason,
          retryAfter: limitCheck.rateLimitResult.retryAfter,
          dailyUsage: {
            used: limitCheck.dailyUsage.messagesUsed,
            limit: limitCheck.dailyUsage.messagesLimit,
            remaining: limitCheck.dailyUsage.messagesRemaining,
            resetsAt: limitCheck.dailyUsage.resetsAt,
          },
          showPaywall: limitCheck.dailyUsage.shouldShowPaywall,
        },
        { status: 429, headers }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: 'messages array is required' }, 400);
    }

    // SECURITY: Detect and BLOCK prompt injection attempts
    // High-severity patterns are blocked; low-severity are sanitized
    const HIGH_SEVERITY_PATTERNS = ['jailbreak_attempt', 'instruction_override', 'context_delimiter'];

    for (const msg of messages) {
      if (msg.role === 'user' && msg.content) {
        const injectionCheck = detectPromptInjection(msg.content);
        if (injectionCheck.suspicious) {
          console.warn(`SECURITY: Potential prompt injection detected from ${rateLimitId}`, {
            patterns: injectionCheck.patterns,
            contentPreview: msg.content.substring(0, 100) + '...',
            timestamp: new Date().toISOString(),
          });

          // BLOCK high-severity injection attempts
          const hasHighSeverity = injectionCheck.patterns.some(p => HIGH_SEVERITY_PATTERNS.includes(p));
          if (hasHighSeverity) {
            console.error(`SECURITY: BLOCKED high-severity prompt injection from ${rateLimitId}`, {
              patterns: injectionCheck.patterns,
            });
            return c.json({
              error: 'Your message could not be processed. Please rephrase and try again.',
              code: 'CONTENT_POLICY_VIOLATION',
            }, 400);
          }
          // Low-severity patterns will be handled by sanitization
        }
      }
    }

    // SECURITY: Sanitize all user messages to prevent prompt injection
    const sanitizedMessages = sanitizeMessages(messages);
    if (sanitizedMessages.length === 0) {
      return c.json({ error: 'No valid messages after sanitization' }, 400);
    }

    // Get AI config (OpenAI preferred, Anthropic fallback)
    const aiConfig = getAIConfig();
    if (!aiConfig) {
      console.error('No AI API key found (OPENAI_API_KEY or ANTHROPIC_API_KEY)');
      return c.json({
        error: 'AI service not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in Supabase secrets.',
        debug: { timestamp: new Date().toISOString() }
      }, 500);
    }


    // Build system prompt based on context - AI-powered behavioral wellness companion
    let systemPrompt = `You are Aminy - an AI-powered behavioral wellness companion built on the principles of Applied Behavior Analysis (ABA). You combine the expertise of a BCBA with the warmth of a best friend. You sound EXACTLY like ChatGPT having a real conversation - warm, natural, intelligent, never scripted.

CORE PERSONALITY:
- Talk like you're texting a close friend who happens to be a world-class behavioral science expert
- Use contractions, natural pauses, conversational flow
- Show personality - you can be warm, use light humor when appropriate, be real
- NEVER use formal language or sound like a form ("Great! To start..." = BAD)
- NEVER repeat yourself or use the same phrases twice
- Handle weird inputs like a real person would (with grace and maybe a touch of humor)

ABA + AI LANGUAGE FRAMEWORK:
- USE: calm, connect, cue, progress, gentle, science-backed, everyday, together, support, growth, celebration, routine, structure, reinforcement, consistency
- AVOID: therapy, diagnosis, disorder, prescription, patient, treatment plan, intervention, clinical
- Frame everything as behavioral wellness and family empowerment, not clinical care
- Pair ABA with AI: "Using ABA principles, Aminy helps..." or "Powered by adaptive AI and grounded in ABA behavioral science..."

INTELLIGENCE:
- If someone types gibberish or something that doesn't make sense, respond naturally: "Ha, did your pocket type that? What's your kiddo's name?"
- If they seem stressed or overwhelmed, acknowledge it: "I can feel the exhaustion in what you're sharing..."
- Read between the lines - show emotional intelligence
- Remember details and reference them naturally

YOUR MISSION:
- Get parents to WANT to sign up by showing genuine intelligence and value
- Every response should make them think "This AI actually understands"
- Be brief but impactful - like a really smart friend who knows exactly what to say
- Build trust through being insightful, warm, and real`;

    if (context?.step === 'welcome') {
      systemPrompt = `You are Aminy meeting a parent for the first time. You're an AI-powered behavioral wellness companion using ABA principles. Sound like a warm, real human - not a bot.

GOOD: "Hey! I'm Aminy. Your behavioral wellness companion. I use proven ABA principles to help create calm routines and celebrate progress together. What's your child's name?"

BAD: "Great! To start, what's your child's first name?"

Keep it natural, warm, 1-2 sentences. You're starting a real relationship. Focus on calm, connection, and everyday progress.`;

    } else if (context?.step === 'asking_name') {
      const hasUserMessages = messages.some(m => m.role === 'user');

      if (!hasUserMessages) {
        systemPrompt = `You are Aminy. You just introduced yourself and now need to ask for the child's name.

Be warm and natural, but BRIEF (1 sentence only - you just introduced yourself):
- "What's your child's name?"
- "What should I call your little one?"
- "Tell me your kiddo's name?"

Pick ONE variation and keep it short.`;
      } else {
        systemPrompt = `You are Aminy. The parent just told you their child's name OR they typed something weird/invalid.

IF THEY GAVE YOU A REAL NAME:
- Respond naturally: "Eddie! Love it. How old is he?"
- Don't say "Thanks!" or "Perfect!" - vary your language
- Be conversational and warm

IF THEY TYPED NONSENSE (like "gkhqkhg" or random characters):
- Respond like a real person would: "Ha, looks like someone's cat walked on the keyboard. What's your kiddo's name?"
- Keep it light and friendly
- Don't repeat "what's your child's name" robotically

1-2 sentences max.`;
      }

    } else if (context?.step === 'asking_age') {
      const childName = context.childName || 'their child';
      systemPrompt = `You are Aminy. Context: You're asking about ${childName}'s age.

IF THEY GAVE A VALID AGE:
- Move forward naturally: "Got it! Tell me what's been going on with ${childName} lately - what's feeling hard?"
- Or: "${childName} is at such an interesting age. What brings you here today?"
- Vary your language - sound natural

IF THEY TYPED INVALID INPUT (letters, gibberish, unrealistic ages):
- Handle it naturally: "Hmm, I need the age as a number - like 3, 5, or 7. How old is ${childName}?"
- Or with light humor: "I think autocorrect got you there. What's ${childName}'s age in years?"
- Don't sound robotic or repeat yourself

1-2 sentences max.`;

    } else if (context?.step === 'main_story') {
      const childName = context.childName || 'their child';
      const childAge = context.childAge || 'unknown age';
      systemPrompt = `You are Aminy at your ABSOLUTE BEST. This parent is opening up about ${childName} (${childAge}).

This is where you PROVE your value and make them want to sign up:

RESPOND LIKE THIS:
- Reflect back what you hear: "Mornings sound absolutely exhausting - especially when you're already running on empty"
- Show clinical understanding: "The getting-dressed battles are really common at this age when sensory sensitivities are at play"
- Ask smart follow-ups: "Is it more about the textures of clothes, or the transition from one activity to another?"
- Plant value seeds naturally: "This is exactly what Aminy's visual routine builder helps with - breaking it down into manageable steps"

DON'T:
- Say generic things like "tell me more" without showing you listened
- Use formal language or clinical jargon
- Sound like you're reading from a script

3-4 sentences. Make them think "WOW, this AI really gets it."`;

    } else if (context?.childName) {
      systemPrompt += `\n\nYou're talking with the parent of ${context.childName}${context.childAge ? `, age ${context.childAge}` : ''}. Always use their child's name naturally in your responses.`;
    }

    // Prepare messages for the AI call (use sanitized messages)
    const filteredMessages = sanitizedMessages.filter(m => m.role !== 'system');

    // Ensure messages alternate between user and assistant
    const validMessages = [];
    let lastRole = null;
    for (const msg of filteredMessages) {
      if (msg.role !== lastRole) {
        validMessages.push(msg);
        lastRole = msg.role;
      }
    }

    // Ensure first message is from user
    if (validMessages.length > 0 && validMessages[0].role !== 'user') {
      validMessages.shift();
    }

    // If no messages left, create a default user message
    if (validMessages.length === 0) {
      validMessages.push({ role: 'user', content: 'Hello' });
    }


    const result = await callAI(aiConfig, {
      systemPrompt,
      messages: validMessages,
      maxTokens: 500,
      temperature: 0.9,
      userId: rateLimitId, // Track token usage
    });

    // Extract name and age from user's last message if present
    const lastUserMessage = validMessages[validMessages.length - 1]?.content || '';

    let detectedName = null;
    let detectedAge = null;

    // Extract name (simple pattern - look for capitalized words that look like names)
    if (context?.step === 'asking_name') {
      const nameMatch = lastUserMessage.match(/\b([A-Z][a-z]{1,15})\b/);
      if (nameMatch && nameMatch[1] &&
          !['Yes', 'No', 'The', 'My', 'Is', 'At', 'In', 'On'].includes(nameMatch[1])) {
        detectedName = nameMatch[1];
      }
    }

    // Extract age (look for numbers 1-18)
    if (context?.step === 'asking_age') {
      const ageMatch = lastUserMessage.match(/\b(\d+)\b/);
      if (ageMatch) {
        const age = parseInt(ageMatch[1]);
        if (age >= 1 && age <= 18) {
          detectedAge = age.toString();
        }
      }
    }

    return c.json({
      message: result.text,
      detectedName,
      detectedAge,
      usage: result.usage,
      provider: aiConfig.provider,
      // Include daily usage info in successful responses
      dailyUsage: {
        used: limitCheck.dailyUsage.messagesUsed,
        limit: limitCheck.dailyUsage.messagesLimit,
        remaining: limitCheck.dailyUsage.messagesRemaining,
        resetsAt: limitCheck.dailyUsage.resetsAt,
      },
    });
  } catch (error) {
    // SECURITY: Scrub PII from error messages before returning to client
    const safeError = scrubPIIFromError(error);
    return c.json({ error: safeError, code: 'AI_CHAT_ERROR' }, 500);
  }
});

// Get daily usage status endpoint
app.get("/make-server-8a022548/ai/usage", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get user's tier from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    const tier = profile?.tier || 'free';

    // Get daily usage
    const dailyUsage = await getDailyUsage(supabase, user.id, tier);

    // Get token usage for today
    const today = new Date().toISOString().split('T')[0];
    const tokenUsage = await kv.get(`ai_tokens:${user.id}:${today}`) || { totalTokens: 0, totalCost: 0, requests: 0 };

    return c.json({
      tier,
      dailyLimit: DAILY_MESSAGE_LIMITS[tier] || DAILY_MESSAGE_LIMITS.default,
      usage: {
        used: dailyUsage.messagesUsed,
        limit: dailyUsage.messagesLimit,
        remaining: dailyUsage.messagesRemaining,
        resetsAt: dailyUsage.resetsAt,
      },
      tokenUsage: {
        totalTokens: tokenUsage.totalTokens,
        estimatedCost: tokenUsage.totalCost,
        requests: tokenUsage.requests,
        date: today,
      },
    });
  } catch (error) {
    console.error('Usage status error:', error);
    return c.json({ error: 'Failed to get usage status' }, 500);
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// Track analytics events (no auth required for anonymous tracking)
app.post("/make-server-8a022548/analytics/track", async (c) => {
  try {
    const { events, sessionId } = await c.req.json();

    if (!events || !Array.isArray(events)) {
      return c.json({ error: 'events array required' }, 400);
    }

    // Store analytics events in KV store by session
    const analyticsKey = `analytics:${sessionId}:${Date.now()}`;
    await kv.set(analyticsKey, {
      events,
      sessionId,
      receivedAt: new Date().toISOString(),
      ip: c.req.header('x-forwarded-for') || 'unknown',
      userAgent: c.req.header('user-agent') || 'unknown',
    });

    return c.json({ success: true, received: events.length });
  } catch (error) {
    console.error('Analytics track error:', error);
    return c.json({ error: 'Failed to track analytics' }, 500);
  }
});

// ============================================================================
// OUTCOME AI ENDPOINTS
// ============================================================================

// Log a user event
app.post("/make-server-8a022548/events/log", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const event = await c.req.json();
    const eventId = `event:${user.id}:${Date.now()}`;
    
    await kv.set(eventId, {
      ...event,
      id: eventId,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    return c.json({ success: true, eventId });
  } catch (error) {
    return c.json({ error: 'Failed to log event' }, 500);
  }
});

// Fetch child events within a date range
app.get("/make-server-8a022548/events/child/:childId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const childId = c.req.param('childId');
    const startDate = c.req.query('start');
    const endDate = c.req.query('end');

    // Fetch events from KV store
    const allEvents = await kv.getByPrefix(`event:${user.id}:`);
    const filteredEvents = allEvents.filter(event => {
      if (event.childId !== childId) return false;
      if (startDate && event.timestamp < startDate) return false;
      if (endDate && event.timestamp > endDate) return false;
      return true;
    });

    return c.json(filteredEvents);
  } catch (error) {
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

// Generate weekly outcome summary
app.post("/make-server-8a022548/outcomes/weekly-summary", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { childId, weekStart, useAI } = await c.req.json();

    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    // Fetch data from real database tables
    // Stress logs
    const { data: stressLogs } = await supabase
      .from('stress_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', weekStartDate.toISOString())
      .lt('created_at', weekEndDate.toISOString());

    // Routine completions
    const { data: routines } = await supabase
      .from('routine_completions')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_at', weekStartDate.toISOString())
      .lt('scheduled_at', weekEndDate.toISOString());

    // Goal achievements
    const { data: goals } = await supabase
      .from('goal_achievements')
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', weekStartDate.toISOString())
      .lt('updated_at', weekEndDate.toISOString());

    // Wins journal
    const { data: wins } = await supabase
      .from('wins_journal')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', weekStartDate.toISOString())
      .lt('created_at', weekEndDate.toISOString());

    // Calculate metrics
    const totalRoutinesScheduled = routines?.length || 0;
    const routinesCompleted = routines?.filter(r => r.completion_status === 'completed').length || 0;
    const adherenceRate = totalRoutinesScheduled > 0
      ? Math.round((routinesCompleted / totalRoutinesScheduled) * 100)
      : 0;

    const goalsAchieved = goals?.filter(g => g.achieved_at).length || 0;
    const goalsInProgress = goals?.filter(g => !g.achieved_at && g.current_value > 0).length || 0;

    const avgStress = stressLogs && stressLogs.length > 0
      ? Math.round(stressLogs.reduce((sum, l) => sum + l.stress_level, 0) / stressLogs.length * 10) / 10
      : null;

    const morningStress = stressLogs?.filter(l => l.context === 'morning');
    const eveningStress = stressLogs?.filter(l => l.context === 'evening');
    const avgMorningStress = morningStress && morningStress.length > 0
      ? Math.round(morningStress.reduce((sum, l) => sum + l.stress_level, 0) / morningStress.length * 10) / 10
      : null;
    const avgEveningStress = eveningStress && eveningStress.length > 0
      ? Math.round(eveningStress.reduce((sum, l) => sum + l.stress_level, 0) / eveningStress.length * 10) / 10
      : null;

    // Determine trend based on multiple factors
    let trend: 'improving' | 'stable' | 'needs_attention' = 'stable';
    if (adherenceRate >= 80 && goalsAchieved >= 1) trend = 'improving';
    if (adherenceRate < 50 || (avgStress && avgStress >= 7)) trend = 'needs_attention';

    const milestones = wins?.filter(w => w.category === 'milestone').map(w => w.title) || [];
    const recentWins = wins?.slice(0, 5).map(w => w.title) || [];

    const summary = {
      weekStart: weekStart,
      weekEnd: weekEndDate.toISOString(),
      childId,
      // Routine metrics
      totalRoutinesScheduled,
      routinesCompleted,
      adherenceRate,
      // Goal metrics
      goalsAchieved,
      goalsInProgress,
      // Stress metrics
      stressCheckins: stressLogs?.length || 0,
      avgStress,
      avgMorningStress,
      avgEveningStress,
      // Achievements
      milestones,
      recentWins,
      winsCount: wins?.length || 0,
      // Overall
      trend,
    };

    // If AI requested, enhance with AI summary
    if (useAI) {
      const aiConfig = getAIConfig();
      if (aiConfig) {
        try {
          const aiPrompt = `Based on this week's data for a parent:
- Routine adherence: ${adherenceRate}% (${routinesCompleted}/${totalRoutinesScheduled} completed)
- Goals achieved: ${goalsAchieved}, in progress: ${goalsInProgress}
- Average stress level: ${avgStress || 'No data'}/10
- Stress check-ins: ${stressLogs?.length || 0}
- Wins logged: ${wins?.length || 0}
- Recent milestones: ${milestones.join(', ') || 'None'}

Write a brief, encouraging 2-sentence summary highlighting progress and one actionable suggestion for next week.`;

          const result = await callAI(aiConfig, {
            systemPrompt: 'You are Aminy, a supportive AI assistant for parents of neurodivergent children. Use ABA principles and focus on positive reinforcement.',
            messages: [{ role: 'user', content: aiPrompt }],
            maxTokens: 200,
            temperature: 0.7
          });

          summary.aiSummary = result.text;
        } catch (aiError) {
          console.error('AI summary generation failed:', aiError);
        }
      }
    }

    return c.json(summary);
  } catch (error) {
    console.error('Weekly summary error:', error);
    return c.json({ error: 'Failed to generate summary' }, 500);
  }
});

// Get outcome trends over multiple weeks
app.get("/make-server-8a022548/outcomes/trends/:childId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const childId = c.req.param('childId');
    const weeks = parseInt(c.req.query('weeks') || '4');

    // Generate summaries for each of the past N weeks using real database data
    const trends = [];
    const now = new Date();

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Fetch real data from database for this week
      const [stressResult, routinesResult, goalsResult, winsResult] = await Promise.all([
        supabase
          .from('stress_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('child_id', childId)
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString()),
        supabase
          .from('routine_completions')
          .select('*')
          .eq('user_id', user.id)
          .eq('child_id', childId)
          .gte('scheduled_at', weekStart.toISOString())
          .lt('scheduled_at', weekEnd.toISOString()),
        supabase
          .from('goal_achievements')
          .select('*')
          .eq('user_id', user.id)
          .eq('child_id', childId)
          .gte('achieved_at', weekStart.toISOString())
          .lt('achieved_at', weekEnd.toISOString()),
        supabase
          .from('wins_journal')
          .select('*')
          .eq('user_id', user.id)
          .eq('child_id', childId)
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString()),
      ]);

      const stressLogs = stressResult.data || [];
      const routines = routinesResult.data || [];
      const goals = goalsResult.data || [];
      const wins = winsResult.data || [];

      // Calculate metrics
      const completedRoutines = routines.filter(r => r.completed).length;
      const totalRoutines = routines.length;
      const adherenceRate = totalRoutines > 0 ? Math.round((completedRoutines / totalRoutines) * 100) : 0;

      const avgStress = stressLogs.length > 0
        ? Math.round(stressLogs.reduce((sum, l) => sum + (l.stress_level || 0), 0) / stressLogs.length * 10) / 10
        : 0;

      // Determine trend based on stress levels
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (stressLogs.length >= 2) {
        const firstHalf = stressLogs.slice(0, Math.floor(stressLogs.length / 2));
        const secondHalf = stressLogs.slice(Math.floor(stressLogs.length / 2));
        const firstAvg = firstHalf.reduce((sum, l) => sum + (l.stress_level || 0), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, l) => sum + (l.stress_level || 0), 0) / secondHalf.length;
        if (secondAvg < firstAvg - 0.5) trend = 'improving';
        else if (secondAvg > firstAvg + 0.5) trend = 'declining';
      }

      // Extract behavior insights from stress log notes
      const behaviorInsights = stressLogs
        .filter(l => l.notes && l.notes.length > 10)
        .slice(0, 3)
        .map(l => l.notes);

      // Extract milestones from goals
      const milestones = goals.map(g => ({
        title: g.goal_description || 'Goal achieved',
        achievedAt: g.achieved_at,
      }));

      trends.push({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        childId,
        totalActivities: completedRoutines,
        goalsProgress: goals.length,
        behaviorInsights,
        sessionsCompleted: wins.length,
        milestones,
        trend,
        metrics: {
          adherenceRate,
          avgStress,
          totalStressLogs: stressLogs.length,
          totalRoutines,
          completedRoutines,
          goalsAchieved: goals.length,
          winsRecorded: wins.length,
        },
      });
    }

    return c.json(trends.reverse()); // Oldest to newest
  } catch (error) {
    console.error('Trends fetch error:', error);
    return c.json({ error: 'Failed to fetch trends' }, 500);
  }
});

// ============================================================================
// REPORT BUILDER ENDPOINTS
// ============================================================================

// Generate a PDF report
app.post("/make-server-8a022548/reports/generate", async (c) => {
  try {
    // SECURITY: Verify auth and feature access
    const authHeader = c.req.header('Authorization');
    const authCheck = await verifyAuthAndFeature(authHeader, 'basic-reports');

    if (!authCheck.authenticated || !authCheck.user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user has access to reports feature
    if (!authCheck.featureAllowed) {
      return c.json({
        error: 'Upgrade required to access reports',
        code: 'FEATURE_GATED',
        minimumTier: authCheck.minimumTier || 'starter',
        upgradeRequired: true,
      }, 403);
    }

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const user = { id: authCheck.user.userId };

    const request = await c.req.json();
    const { childId, reportType, startDate, endDate, watermark } = request;

    // Fetch real data from database for the report period
    const userId = authCheck.user.userId;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch stress logs
    const { data: stressLogs } = await supabase
      .from('stress_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });

    // Fetch routine completions
    const { data: routines } = await supabase
      .from('routine_completions')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .order('scheduled_at', { ascending: true });

    // Fetch goal achievements
    const { data: goals } = await supabase
      .from('goal_achievements')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Fetch wins journal
    const { data: wins } = await supabase
      .from('wins_journal')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    // Calculate metrics
    const stressMetrics = {
      avgMorning: 0,
      avgEvening: 0,
      avgOverall: 0,
      trend: 'stable' as 'improving' | 'stable' | 'worsening',
      totalCheckins: stressLogs?.length || 0,
    };

    if (stressLogs && stressLogs.length > 0) {
      const morningLogs = stressLogs.filter(l => l.context === 'morning');
      const eveningLogs = stressLogs.filter(l => l.context === 'evening');

      stressMetrics.avgMorning = morningLogs.length > 0
        ? Math.round(morningLogs.reduce((sum, l) => sum + l.stress_level, 0) / morningLogs.length * 10) / 10
        : 0;
      stressMetrics.avgEvening = eveningLogs.length > 0
        ? Math.round(eveningLogs.reduce((sum, l) => sum + l.stress_level, 0) / eveningLogs.length * 10) / 10
        : 0;
      stressMetrics.avgOverall = Math.round(stressLogs.reduce((sum, l) => sum + l.stress_level, 0) / stressLogs.length * 10) / 10;

      // Calculate trend (first half vs second half)
      const midpoint = Math.floor(stressLogs.length / 2);
      if (midpoint > 0) {
        const firstHalf = stressLogs.slice(0, midpoint);
        const secondHalf = stressLogs.slice(midpoint);
        const firstAvg = firstHalf.reduce((sum, l) => sum + l.stress_level, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, l) => sum + l.stress_level, 0) / secondHalf.length;
        if (secondAvg < firstAvg - 0.5) stressMetrics.trend = 'improving';
        else if (secondAvg > firstAvg + 0.5) stressMetrics.trend = 'worsening';
      }
    }

    const routineMetrics = {
      totalScheduled: routines?.length || 0,
      completed: routines?.filter(r => r.completion_status === 'completed').length || 0,
      partial: routines?.filter(r => r.completion_status === 'partial').length || 0,
      skipped: routines?.filter(r => r.completion_status === 'skipped').length || 0,
      adherenceRate: 0,
    };
    if (routineMetrics.totalScheduled > 0) {
      routineMetrics.adherenceRate = Math.round(
        ((routineMetrics.completed + routineMetrics.partial * 0.5) / routineMetrics.totalScheduled) * 100
      );
    }

    const goalMetrics = {
      total: goals?.length || 0,
      achieved: goals?.filter(g => g.achieved_at).length || 0,
      inProgress: goals?.filter(g => !g.achieved_at && g.current_value > 0).length || 0,
    };

    // Create bucket if it doesn't exist
    const bucketName = 'make-8a022548-reports';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    // Generate report content with real data
    const reportContent = `
AMINY ${reportType.toUpperCase()} REPORT
${watermark ? `\n${watermark}\n` : ''}
=====================================

REPORT PERIOD: ${startDate} to ${endDate}
Generated: ${new Date().toISOString()}

=====================================
STRESS & WELLNESS OVERVIEW
=====================================

Total Check-ins: ${stressMetrics.totalCheckins}
Average Morning Stress: ${stressMetrics.avgMorning || 'N/A'}/10
Average Evening Stress: ${stressMetrics.avgEvening || 'N/A'}/10
Overall Average: ${stressMetrics.avgOverall || 'N/A'}/10
Trend: ${stressMetrics.trend === 'improving' ? 'Improving' : stressMetrics.trend === 'worsening' ? 'Needs Attention' : 'Stable'}

=====================================
ROUTINE ADHERENCE
=====================================

Total Routines Scheduled: ${routineMetrics.totalScheduled}
Completed: ${routineMetrics.completed}
Partially Completed: ${routineMetrics.partial}
Skipped: ${routineMetrics.skipped}
Adherence Rate: ${routineMetrics.adherenceRate}%

=====================================
GOALS PROGRESS
=====================================

Total Goals: ${goalMetrics.total}
Achieved: ${goalMetrics.achieved}
In Progress: ${goalMetrics.inProgress}

${wins && wins.length > 0 ? `
=====================================
WINS & CELEBRATIONS
=====================================

${wins.slice(0, 5).map(w => `- ${w.title}${w.category ? ` (${w.category})` : ''}`).join('\n')}
${wins.length > 5 ? `\n...and ${wins.length - 5} more wins!` : ''}
` : ''}

=====================================

Report generated by Aminy AI
Powered by ABA principles for behavioral wellness
    `.trim();

    const reportId = `report-${user.id}-${Date.now()}`;
    const fileName = `${reportId}.txt`; // Would be .pdf in production

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, reportContent, {
        contentType: 'text/plain', // Would be 'application/pdf' in production
        upsert: false,
      });

    if (uploadError) {
      return c.json({ error: 'Failed to upload report' }, 500);
    }

    // Create signed URL (7 days expiration)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 7 * 24 * 60 * 60); // 7 days in seconds

    if (urlError) {
      return c.json({ error: 'Failed to create signed URL' }, 500);
    }

    // Store report metadata
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const reportMetadata = {
      reportId,
      userId: user.id,
      childId,
      reportType,
      signedUrl: urlData.signedUrl,
      expiresAt: expiresAt.toISOString(),
      generatedAt: new Date().toISOString(),
      fileSize: reportContent.length,
      fileName,
    };

    await kv.set(`report:${reportId}`, reportMetadata);

    return c.json(reportMetadata);
  } catch (error) {
    return c.json({ error: 'Failed to generate report' }, 500);
  }
});

// Get a specific report
app.get("/make-server-8a022548/reports/:reportId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reportId = c.req.param('reportId');
    const report = await kv.get(`report:${reportId}`);

    if (!report || report.userId !== user.id) {
      return c.json({ error: 'Report not found' }, 404);
    }

    return c.json(report);
  } catch (error) {
    return c.json({ error: 'Failed to fetch report' }, 500);
  }
});

// List reports for a child
app.get("/make-server-8a022548/reports/list", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const childId = c.req.query('childId');
    const reportType = c.req.query('type');

    const allReports = await kv.getByPrefix('report:');
    const userReports = allReports.filter(report => {
      if (report.userId !== user.id) return false;
      if (childId && report.childId !== childId) return false;
      if (reportType && report.reportType !== reportType) return false;
      return true;
    });

    return c.json(userReports);
  } catch (error) {
    return c.json({ error: 'Failed to list reports' }, 500);
  }
});

// Delete a report
app.delete("/make-server-8a022548/reports/:reportId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reportId = c.req.param('reportId');
    const report = await kv.get(`report:${reportId}`);

    if (!report || report.userId !== user.id) {
      return c.json({ error: 'Report not found' }, 404);
    }

    // Delete from storage
    const bucketName = 'make-8a022548-reports';
    await supabase.storage.from(bucketName).remove([report.fileName]);

    // Delete metadata
    await kv.del(`report:${reportId}`);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete report' }, 500);
  }
});

// Share report via email (placeholder)
app.post("/make-server-8a022548/reports/:reportId/share", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reportId = c.req.param('reportId');
    const { recipientEmail, message } = await c.req.json();

    const report = await kv.get(`report:${reportId}`);
    if (!report || report.userId !== user.id) {
      return c.json({ error: 'Report not found' }, 404);
    }

    // In production, this would send an email via SendGrid, Resend, etc.

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to share report' }, 500);
  }
});

// ============================================================================
// PAYMENTS / STRIPE ENDPOINTS
// ============================================================================

// Get subscription details
app.get("/make-server-8a022548/payments/subscription", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get subscription from KV store
    let subscription = await kv.get(`subscription:${user.id}`);
    
    // If no subscription, create a default free tier
    if (!subscription) {
      subscription = {
        id: `sub-${user.id}`,
        userId: user.id,
        tier: 'free',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        credits: 0,
        referralCredits: 0,
      };
      await kv.set(`subscription:${user.id}`, subscription);
    }

    return c.json(subscription);
  } catch (error) {
    return c.json({ error: 'Failed to fetch subscription' }, 500);
  }
});

// Create Stripe checkout session - REAL STRIPE INTEGRATION
app.post("/make-server-8a022548/payments/checkout", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Forward to Stripe checkout handler
    return createCheckoutSession(c.req.raw);
  } catch (error) {
    return c.json({ error: 'Failed to create checkout session' }, 500);
  }
});

// Create Stripe checkout session - alternate endpoint for frontend compatibility
app.post("/make-server-8a022548/payments/create-checkout", async (c) => {
  return createCheckoutSession(c.req.raw);
});

// Validate promo code (secure server-side validation)
app.post("/make-server-8a022548/payments/validate-promo", async (c) => {
  return validatePromoCode(c.req.raw);
});

// Create Stripe customer portal session - REAL STRIPE INTEGRATION
app.post("/make-server-8a022548/payments/portal", async (c) => {
  return createPortalSession(c.req.raw);
});

// Alternate endpoint for frontend compatibility
app.post("/make-server-8a022548/payments/create-portal", async (c) => {
  return createPortalSession(c.req.raw);
});

// Cancel subscription - REAL STRIPE INTEGRATION
app.post("/make-server-8a022548/payments/subscription/cancel", async (c) => {
  return cancelSubscription(c.req.raw);
});

// Alternate endpoint for frontend compatibility
app.post("/make-server-8a022548/payments/cancel", async (c) => {
  return cancelSubscription(c.req.raw);
});

// Resume subscription - REAL STRIPE INTEGRATION
app.post("/make-server-8a022548/payments/subscription/resume", async (c) => {
  return resumeSubscription(c.req.raw);
});

// Alternate endpoint for frontend compatibility
app.post("/make-server-8a022548/payments/resume", async (c) => {
  return resumeSubscription(c.req.raw);
});

// Get subscription status - uses real Stripe
app.get("/make-server-8a022548/payments/subscription/:userId", async (c) => {
  const userId = c.req.param('userId');
  return getSubscription(userId);
});

// Create one-time payment (telehealth, etc.)
app.post("/make-server-8a022548/payments/create-payment", async (c) => {
  return createOneTimePayment(c.req.raw);
});

// Stripe webhook handler
app.post("/make-server-8a022548/payments/webhook", async (c) => {
  return handleWebhook(c.req.raw);
});

// ============================================================================
// VIDEO / DAILY.CO ENDPOINTS - Real telehealth video calls
// Requires 'marketplace-access' feature (Core tier or higher)
// ============================================================================

// Create a video room for a telehealth session
app.post("/make-server-8a022548/video/create-room", async (c) => {
  // SECURITY: Verify auth and feature access for marketplace
  const authHeader = c.req.header('Authorization');
  const authCheck = await verifyAuthAndFeature(authHeader, 'marketplace-access');

  if (!authCheck.authenticated || !authCheck.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!authCheck.featureAllowed) {
    return c.json({
      error: 'Upgrade to Core tier to access telehealth features',
      code: 'FEATURE_GATED',
      minimumTier: 'core',
      upgradeRequired: true,
    }, 403);
  }

  return createVideoRoom(c.req.raw);
});

// Get a meeting token for joining a room
app.post("/make-server-8a022548/video/get-token", async (c) => {
  // SECURITY: Verify auth and feature access for marketplace
  const authHeader = c.req.header('Authorization');
  const authCheck = await verifyAuthAndFeature(authHeader, 'marketplace-access');

  if (!authCheck.authenticated || !authCheck.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!authCheck.featureAllowed) {
    return c.json({
      error: 'Upgrade to Core tier to access telehealth features',
      code: 'FEATURE_GATED',
      minimumTier: 'core',
      upgradeRequired: true,
    }, 403);
  }

  return getMeetingToken(c.req.raw);
});

// Get room info by name/session
app.get("/make-server-8a022548/video/room/:roomName", async (c) => {
  const roomName = c.req.param('roomName');
  return getVideoRoom(roomName);
});

// Delete a room
app.delete("/make-server-8a022548/video/room/:roomName", async (c) => {
  const roomName = c.req.param('roomName');
  return deleteVideoRoom(roomName);
});

// Get room presence (who's in the room)
app.get("/make-server-8a022548/video/room/:roomName/presence", async (c) => {
  const roomName = c.req.param('roomName');
  return getRoomPresence(roomName);
});

// Start recording
app.post("/make-server-8a022548/video/room/:roomName/record/start", async (c) => {
  const roomName = c.req.param('roomName');
  return startRecording(roomName);
});

// Stop recording
app.post("/make-server-8a022548/video/room/:roomName/record/stop", async (c) => {
  const roomName = c.req.param('roomName');
  return stopRecording(roomName);
});

// ============================================================================
// PROVIDER ENDPOINTS - Production-ready provider management
// ============================================================================

// Get provider by ID
app.get("/make-server-8a022548/providers/:providerId", async (c) => {
  const providerId = c.req.param('providerId');
  return getProvider(providerId);
});

// Search providers
app.get("/make-server-8a022548/providers/search", async (c) => {
  return searchProviders(c.req.raw);
});

// Create provider (POST) or Update provider (PUT)
app.post("/make-server-8a022548/providers", async (c) => {
  return saveProvider(c.req.raw);
});

app.put("/make-server-8a022548/providers", async (c) => {
  return saveProvider(c.req.raw);
});

// Update provider availability
app.put("/make-server-8a022548/providers/:providerId/availability", async (c) => {
  const providerId = c.req.param('providerId');
  return updateAvailability(c.req.raw, providerId);
});

// Get provider's patients
app.get("/make-server-8a022548/providers/:providerId/patients", async (c) => {
  const providerId = c.req.param('providerId');
  return getProviderPatients(providerId);
});

// Get provider's sessions
app.get("/make-server-8a022548/providers/:providerId/sessions", async (c) => {
  const providerId = c.req.param('providerId');
  return getProviderSessions(c.req.raw, providerId);
});

// Get provider stats
app.get("/make-server-8a022548/providers/:providerId/stats", async (c) => {
  const providerId = c.req.param('providerId');
  return getProviderStats(providerId);
});

// Schedule a session - requires marketplace-access (Core tier)
app.post("/make-server-8a022548/providers/:providerId/sessions", async (c) => {
  // SECURITY: Verify auth and feature access for marketplace
  const authHeader = c.req.header('Authorization');
  const authCheck = await verifyAuthAndFeature(authHeader, 'marketplace-access');

  if (!authCheck.authenticated || !authCheck.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!authCheck.featureAllowed) {
    return c.json({
      error: 'Upgrade to Core tier to book provider sessions',
      code: 'FEATURE_GATED',
      minimumTier: 'core',
      upgradeRequired: true,
    }, 403);
  }

  const providerId = c.req.param('providerId');
  return scheduleSession(c.req.raw, providerId);
});

// Get available slots
app.get("/make-server-8a022548/providers/:providerId/slots", async (c) => {
  const providerId = c.req.param('providerId');
  return getAvailableSlots(c.req.raw, providerId);
});

// Request profile access
app.post("/make-server-8a022548/providers/:providerId/request-access", async (c) => {
  const providerId = c.req.param('providerId');
  return requestProfileAccess(c.req.raw, providerId);
});

// Verify provider credentials
app.post("/make-server-8a022548/providers/:providerId/verify", async (c) => {
  const providerId = c.req.param('providerId');
  return verifyProvider(c.req.raw, providerId);
});

// Update session status
app.put("/make-server-8a022548/sessions/:sessionId/status", async (c) => {
  const sessionId = c.req.param('sessionId');
  return updateSessionStatus(c.req.raw, sessionId);
});

// Submit session notes
app.post("/make-server-8a022548/sessions/:sessionId/notes", async (c) => {
  const sessionId = c.req.param('sessionId');
  return submitSessionNotes(c.req.raw, sessionId);
});

// Apply referral credit on signup (uses database-backed referral system)
app.post("/make-server-8a022548/payments/referral/apply", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { referralCode } = await c.req.json();

    // Get IP and user agent for fraud detection
    const ipAddress = c.req.header('x-forwarded-for')?.split(',')[0] || c.req.header('x-real-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    // Use database function for referral processing with fraud detection
    const { data: result, error } = await supabase.rpc('process_referral_signup', {
      p_new_user_id: user.id,
      p_referral_code: referralCode.toUpperCase(),
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (error || !result?.success) {
      return c.json({ error: result?.error || 'Invalid referral code' }, 400);
    }

    return c.json({
      success: true,
      creditsAdded: result.credited ? 10 : 0, // $10 credit if not flagged
      referrerId: result.referrer_id,
      message: result.credited
        ? 'Welcome! You received $10 in credits!'
        : 'Referral recorded. Credits will be applied after verification.',
    });
  } catch (error) {
    console.error('Referral apply error:', error);
    return c.json({ error: 'Failed to apply referral credit' }, 500);
  }
});

// Get referral info (uses database-backed referral system)
app.get("/make-server-8a022548/payments/referral/info", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Use database function to get stats (auto-generates code if needed)
    const { data: stats, error } = await supabase.rpc('get_referral_stats', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Referral stats error:', error);
      // Fallback to basic info
      return c.json({
        code: `AMINY${user.id.substring(0, 6).toUpperCase()}`,
        totalReferrals: 0,
        creditsEarned: 0,
      });
    }

    // Also get user's referral credits from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_credits')
      .eq('id', user.id)
      .single();

    return c.json({
      code: stats.code,
      totalReferrals: stats.total_referrals || 0,
      pendingReferrals: stats.pending_referrals || 0,
      creditedReferrals: stats.credited_referrals || 0,
      creditsEarned: (stats.total_credits_earned || 0) / 100, // Convert cents to dollars
      currentCredits: (profile?.referral_credits || 0) / 100, // Current spendable credits
    });
  } catch (error) {
    console.error('Referral info error:', error);
    return c.json({ error: 'Failed to fetch referral info' }, 500);
  }
});

// Credit referrer when referred user subscribes to a paid plan
app.post("/make-server-8a022548/payments/referral/credit-referrer", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Credit the referrer when this user subscribes
    const { data: result, error } = await supabase.rpc('credit_referrer_on_subscription', {
      p_referred_user_id: user.id,
    });

    if (error) {
      console.error('Credit referrer error:', error);
      return c.json({ success: false, error: 'Failed to credit referrer' }, 500);
    }

    return c.json(result || { success: false, error: 'No pending referral found' });
  } catch (error) {
    console.error('Credit referrer error:', error);
    return c.json({ error: 'Failed to credit referrer' }, 500);
  }
});

// Check feature access
app.get("/make-server-8a022548/payments/feature-access", async (c) => {
  try {
    const feature = c.req.query('feature');

    if (!feature) {
      return c.json({ error: 'feature query parameter required' }, 400);
    }

    // SECURITY: Use the auth middleware to verify and get tier from database
    const authHeader = c.req.header('Authorization');
    const authCheck = await verifyAuthAndFeature(authHeader, feature);

    if (!authCheck.authenticated || !authCheck.user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return c.json({
      hasAccess: authCheck.featureAllowed,
      tier: authCheck.user.tier,
      upgradeRequired: authCheck.featureAllowed ? null : authCheck.minimumTier,
    });
  } catch (error) {
    return c.json({ error: 'Failed to check feature access' }, 500);
  }
});

// Handle trial expiration
app.post("/make-server-8a022548/payments/trial/expire", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const subscription = await kv.get(`subscription:${user.id}`);
    if (subscription && subscription.status === 'trialing') {
      // Trial expired without payment - downgrade to free
      subscription.status = 'none'; // No active subscription
      subscription.tier = 'free';   // Downgrade to free tier
      delete subscription.trialEndsAt;
      await kv.set(`subscription:${user.id}`, subscription);

      // Also update the user's profile tier in database
      await supabase
        .from('profiles')
        .update({ tier: 'free', updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to expire trial' }, 500);
  }
});

// ============================================================================
// INSURANCE VERIFICATION ENDPOINTS
// ============================================================================

// Request insurance eligibility verification
app.post("/make-server-8a022548/insurance/verify", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const {
      payerId,
      memberId,
      groupNumber,
      subscriberName,
      subscriberDob,
      patientName,
      patientDob,
      patientRelationship,
      serviceType,
      serviceCodes,
    } = await c.req.json();

    // Validate required fields
    if (!payerId || !memberId || !subscriberName || !subscriberDob) {
      return c.json({ error: 'Missing required insurance information' }, 400);
    }

    // Use database function to create verification request
    const { data: result, error } = await supabase.rpc('request_insurance_verification', {
      p_user_id: user.id,
      p_payer_id: payerId,
      p_member_id: memberId,
      p_group_number: groupNumber || null,
      p_subscriber_name: subscriberName,
      p_subscriber_dob: subscriberDob,
      p_patient_name: patientName || subscriberName,
      p_patient_dob: patientDob || subscriberDob,
      p_patient_relationship: patientRelationship || 'self',
      p_service_type: serviceType || 'ABA',
      p_service_codes: serviceCodes || ['97153', '97155', '97156', '97151'],
    });

    if (error) {
      console.error('Insurance verification error:', error);
      return c.json({ error: 'Failed to submit verification request' }, 500);
    }

    return c.json(result);
  } catch (error) {
    console.error('Insurance verification error:', error);
    return c.json({ error: 'Failed to process verification request' }, 500);
  }
});

// Get user's insurance verifications
app.get("/make-server-8a022548/insurance/verifications", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: verifications, error } = await supabase
      .from('insurance_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Fetch verifications error:', error);
      return c.json({ error: 'Failed to fetch verifications' }, 500);
    }

    return c.json({ verifications: verifications || [] });
  } catch (error) {
    console.error('Fetch verifications error:', error);
    return c.json({ error: 'Failed to fetch verifications' }, 500);
  }
});

// Get list of supported payers
app.get("/make-server-8a022548/insurance/payers", async (c) => {
  try {
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: payers, error } = await supabase
      .from('payers')
      .select('payer_id, name, supports_270_271, supports_278')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Fetch payers error:', error);
      return c.json({ error: 'Failed to fetch payers' }, 500);
    }

    return c.json({ payers: payers || [] });
  } catch (error) {
    console.error('Fetch payers error:', error);
    return c.json({ error: 'Failed to fetch payers' }, 500);
  }
});

// ============================================================================
// CONVERSATION ENDPOINTS
// ============================================================================

// Create a new conversation - saves to Supabase database
app.post("/make-server-8a022548/conversations/create", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { childId, title } = await c.req.json();

    // Insert into database
    const { data: conversation, error: insertError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: title || 'New Conversation',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create conversation:', insertError);
      return c.json({ error: 'Failed to create conversation' }, 500);
    }

    // Return in expected format
    return c.json({
      id: conversation.id,
      userId: conversation.user_id,
      childId,
      title: conversation.title,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      archived: false,
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    return c.json({ error: 'Failed to create conversation' }, 500);
  }
});

// List user's conversations
app.get("/make-server-8a022548/conversations/list", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Query conversations from database
    const { data: conversations, error: queryError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('archived', false)
      .order('updated_at', { ascending: false });

    if (queryError) {
      console.error('Failed to list conversations:', queryError);
      return c.json({ error: 'Failed to list conversations' }, 500);
    }

    // Transform to expected format
    const formattedConversations = (conversations || []).map(conv => ({
      id: conv.id,
      userId: conv.user_id,
      childId: conv.child_id,
      title: conv.title,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      archived: conv.archived,
    }));

    return c.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('List conversations error:', error);
    return c.json({ error: 'Failed to list conversations' }, 500);
  }
});

// Get messages for a conversation
app.get("/make-server-8a022548/conversations/:conversationId/messages", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const conversationId = c.req.param('conversationId');

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation || conversation.user_id !== user.id) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    // Get messages from database
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Failed to get messages:', msgError);
      return c.json({ error: 'Failed to get messages' }, 500);
    }

    // Transform to expected format
    const formattedMessages = (messages || []).map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      author: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
      metadata: msg.metadata || {},
    }));

    return c.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Get messages error:', error);
    return c.json({ error: 'Failed to get messages' }, 500);
  }
});

// Add message to conversation
app.post("/make-server-8a022548/conversations/:conversationId/messages", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const conversationId = c.req.param('conversationId');
    const { author, content, metadata } = await c.req.json();

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation || conversation.user_id !== user.id) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    // Map author to role (user/assistant/system)
    const role = author === 'aminy' ? 'assistant' : author === 'user' ? 'user' : author;

    // Insert message into database
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to add message:', insertError);
      return c.json({ error: 'Failed to add message' }, 500);
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Return in expected format
    return c.json({
      id: message.id,
      conversationId: message.conversation_id,
      author: message.role === 'assistant' ? 'aminy' : message.role,
      content: message.content,
      timestamp: message.created_at,
      metadata: message.metadata || {},
    });
  } catch (error) {
    console.error('Add message error:', error);
    return c.json({ error: 'Failed to add message' }, 500);
  }
});

// Archive a conversation
app.post("/make-server-8a022548/conversations/:conversationId/archive", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const conversationId = c.req.param('conversationId');

    // Verify user owns this conversation and archive it
    const { data: conversation, error: updateError } = await supabase
      .from('conversations')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Archive conversation error:', error);
    return c.json({ error: 'Failed to archive conversation' }, 500);
  }
});

// ============================================================================
// STRESS LOG ENDPOINTS
// ============================================================================

// Get recent stress logs
app.get("/make-server-8a022548/stress-logs/recent", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const days = parseInt(c.req.query('days') || '7');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all stress logs for user
    const allLogs = await kv.getByPrefix(`stress_log:${user.id}:`);
    
    // Filter by date
    const recentLogs = allLogs
      .filter((log: any) => new Date(log.timestamp) >= cutoffDate)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ logs: recentLogs });
  } catch (error) {
    return c.json({ error: 'Failed to fetch stress logs' }, 500);
  }
});

// Log a stress event
app.post("/make-server-8a022548/stress-logs/log", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { stressLevel, trigger, notes, childId } = await c.req.json();

    if (stressLevel < 1 || stressLevel > 10) {
      return c.json({ error: 'Stress level must be between 1 and 10' }, 400);
    }

    const timestamp = new Date().toISOString();
    const log = {
      id: `stress_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: user.id,
      childId,
      stressLevel,
      trigger,
      notes,
      timestamp,
    };

    await kv.set(`stress_log:${user.id}:${timestamp}`, log);

    return c.json(log);
  } catch (error) {
    return c.json({ error: 'Failed to log stress' }, 500);
  }
});

// ============================================================================
// AMINY JR ENDPOINTS
// ============================================================================

// Sync Calm Coins to parent profile
app.post("/make-server-8a022548/jr-session", async (c) => {
  try {
    const { parentId, childId, coinsEarned, timestamp } = await c.req.json();
    
    if (!parentId || !coinsEarned) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get current balance
    const balanceKey = `calm_coins:${parentId}`;
    const currentBalance = await kv.get(balanceKey) || 0;
    const newBalance = currentBalance + coinsEarned;
    
    // Update balance
    await kv.set(balanceKey, newBalance);
    
    // Log transaction
    const transactionId = `transaction:${parentId}:${Date.now()}`;
    await kv.set(transactionId, {
      parentId,
      childId,
      amount: coinsEarned,
      type: 'earned',
      source: 'aminy_jr',
      timestamp: timestamp || new Date().toISOString()
    });

    return c.json({ 
      success: true, 
      newBalance,
      coinsEarned 
    });
  } catch (error) {
    return c.json({ error: 'Failed to sync Calm Coins' }, 500);
  }
});

// Save Jr session summary
app.post("/make-server-8a022548/jr-session/save", async (c) => {
  try {
    const session = await c.req.json();
    
    if (!session.childId || !session.parentId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const sessionId = `jr_session:${session.childId}:${Date.now()}`;
    await kv.set(sessionId, {
      ...session,
      id: sessionId,
      savedAt: new Date().toISOString()
    });

    return c.json({ success: true, sessionId });
  } catch (error) {
    return c.json({ error: 'Failed to save session' }, 500);
  }
});

// Get Jr sessions for child
app.get("/make-server-8a022548/jr-session/:childId", async (c) => {
  try {
    const childId = c.req.param('childId');
    const prefix = `jr_session:${childId}:`;
    const sessions = await kv.getByPrefix(prefix);
    
    // Sort by timestamp descending
    const sortedSessions = sessions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return c.json({ sessions: sortedSessions });
  } catch (error) {
    return c.json({ error: 'Failed to fetch sessions' }, 500);
  }
});

// ============================================================================
// SHOP ENDPOINTS
// ============================================================================

// Process shop purchase
app.post("/make-server-8a022548/shop/purchase", async (c) => {
  try {
    const { parentId, itemId, paymentMethod, amount, itemDetails } = await c.req.json();

    if (!parentId || !itemId || !paymentMethod || !amount) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    let newBalance: number | undefined;

    if (paymentMethod === 'coins') {
      // Check balance
      const balanceKey = `calm_coins:${parentId}`;
      const currentBalance = await kv.get(balanceKey) || 0;

      if (currentBalance < amount) {
        return c.json({ error: 'Insufficient Calm Coins' }, 400);
      }

      // Deduct coins
      newBalance = currentBalance - amount;
      await kv.set(balanceKey, newBalance);

      // Log transaction
      const transactionId = `transaction:${parentId}:${Date.now()}`;
      await kv.set(transactionId, {
        parentId,
        amount: -amount,
        type: 'spent',
        source: 'shop_purchase',
        itemId,
        timestamp: new Date().toISOString()
      });
    }

    // Save purchase record
    const purchaseId = `purchase:${parentId}:${Date.now()}`;
    await kv.set(purchaseId, {
      id: purchaseId,
      parentId,
      itemId,
      itemDetails,
      paymentMethod,
      amount,
      status: 'completed',
      timestamp: new Date().toISOString()
    });

    return c.json({
      success: true,
      purchaseId,
      ...(newBalance !== undefined && { newBalance })
    });
  } catch (error) {
    return c.json({ error: 'Failed to process purchase' }, 500);
  }
});

// Get user purchases
app.get("/make-server-8a022548/shop/purchases/:parentId", async (c) => {
  try {
    const parentId = c.req.param('parentId');
    const prefix = `purchase:${parentId}:`;
    const purchases = await kv.getByPrefix(prefix);
    
    // Sort by timestamp descending
    const sortedPurchases = purchases.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return c.json({ purchases: sortedPurchases });
  } catch (error) {
    return c.json({ error: 'Failed to fetch purchases' }, 500);
  }
});

// Get Calm Coins balance
app.get("/make-server-8a022548/shop/balance/:parentId", async (c) => {
  try {
    const parentId = c.req.param('parentId');
    const balanceKey = `calm_coins:${parentId}`;
    const balance = await kv.get(balanceKey) || 0;

    return c.json({ balance });
  } catch (error) {
    return c.json({ error: 'Failed to fetch balance' }, 500);
  }
});

// Get Calm Coins transactions
app.get("/make-server-8a022548/shop/transactions/:parentId", async (c) => {
  try {
    const parentId = c.req.param('parentId');
    const prefix = `transaction:${parentId}:`;
    const transactions = await kv.getByPrefix(prefix);
    
    // Sort by timestamp descending
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return c.json({ transactions: sortedTransactions });
  } catch (error) {
    return c.json({ error: 'Failed to fetch transactions' }, 500);
  }
});

// ============================================================================
// COVERAGE COACH ENDPOINTS
// ============================================================================

// Save coverage report
app.post("/make-server-8a022548/coverage/reports", async (c) => {
  try {
    const { parentId, report } = await c.req.json();
    
    if (!parentId || !report) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const reportId = `coverage_report:${parentId}:${Date.now()}`;
    await kv.set(reportId, {
      ...report,
      id: reportId,
      parentId,
      savedAt: new Date().toISOString()
    });

    return c.json({ success: true, reportId });
  } catch (error) {
    return c.json({ error: 'Failed to save report' }, 500);
  }
});

// Get coverage reports for parent
app.get("/make-server-8a022548/coverage/reports/:parentId", async (c) => {
  try {
    const parentId = c.req.param('parentId');
    const prefix = `coverage_report:${parentId}:`;
    const reports = await kv.getByPrefix(prefix);
    
    // Sort by savedAt descending
    const sortedReports = reports.sort((a, b) => 
      new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );

    return c.json({ reports: sortedReports });
  } catch (error) {
    return c.json({ error: 'Failed to fetch reports' }, 500);
  }
});

// Delete coverage report
app.delete("/make-server-8a022548/coverage/reports/:reportId", async (c) => {
  try {
    const reportId = c.req.param('reportId');
    await kv.del(reportId);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete report' }, 500);
  }
});

// Generate PDF
app.post("/make-server-8a022548/coverage/pdf", async (c) => {
  try {
    const { report } = await c.req.json();
    
    if (!report) {
      return c.json({ error: 'Report data required' }, 400);
    }

    // Generate PDF using pdf-generator
    const pdfBuffer = await generatePDFReport({
      title: 'Coverage Clarity Report',
      ...report
    });

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="coverage-report.pdf"`
      }
    });
  } catch (error) {
    return c.json({ error: 'Failed to generate PDF' }, 500);
  }
});

// Email coverage report
app.post("/make-server-8a022548/coverage/email", async (c) => {
  try {
    const { parentId, email, report } = await c.req.json();
    
    if (!email || !report) {
      return c.json({ error: 'Email and report required' }, 400);
    }

    // Generate PDF
    const pdfBuffer = await generatePDFReport({
      title: 'Coverage Clarity Report',
      ...report
    });

    // Send email with PDF attachment
    await sendReportShareEmail({
      toEmail: email,
      reportType: 'Coverage Clarity Report',
      attachmentBuffer: pdfBuffer,
      attachmentFilename: 'coverage-report.pdf'
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to send email' }, 500);
  }
});

// ============================================================================
// AI CONTEXT & MEMORY ENDPOINTS
// ============================================================================

// Get user context
app.get("/make-server-8a022548/context/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // Fetch user context from KV store
    const context = await kv.get(`context:${userId}`) || {
      progressThisWeek: { sessionsCompleted: 0, calmMoments: 0, newStrategies: 0 },
      strugglingWith: [],
      celebratingWins: []
    };

    return c.json({ context });
  } catch (error) {
    return c.json({ error: 'Failed to fetch context' }, 500);
  }
});

// Update user context
app.post("/make-server-8a022548/context/update", async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ error: 'X-User-Id header required' }, 400);
    }

    const { updates } = await c.req.json();
    
    // Get existing context
    const existingContext = await kv.get(`context:${userId}`) || {};
    
    // Merge updates
    const newContext = { ...existingContext, ...updates };
    
    // Save
    await kv.set(`context:${userId}`, newContext);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to update context' }, 500);
  }
});

// Store memory (30-day lifecycle)
app.post("/make-server-8a022548/memory/store", async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ error: 'X-User-Id header required' }, 400);
    }

    const memory = await c.req.json();
    const memoryId = `memory:${userId}:${Date.now()}`;
    
    await kv.set(memoryId, {
      ...memory,
      id: memoryId,
      userId,
      timestamp: new Date().toISOString()
    });

    return c.json({ success: true, memoryId });
  } catch (error) {
    return c.json({ error: 'Failed to store memory' }, 500);
  }
});

// Get recent memories
app.get("/make-server-8a022548/memory/recent", async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ error: 'X-User-Id header required' }, 400);
    }

    const limit = parseInt(c.req.query('limit') || '5');
    
    // Fetch memories
    const allMemories = await kv.getByPrefix(`memory:${userId}:`);
    
    // Filter expired (> 30 days) and sort by timestamp
    const now = Date.now();
    const validMemories = allMemories
      .filter(m => {
        const expiresAt = m.expiresAt ? new Date(m.expiresAt).getTime() : now + 30 * 24 * 60 * 60 * 1000;
        return expiresAt > now;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return c.json({ memories: validMemories });
  } catch (error) {
    return c.json({ error: 'Failed to fetch memories' }, 500);
  }
});

// Submit feedback
app.post("/make-server-8a022548/feedback/submit", async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json({ error: 'X-User-Id header required' }, 400);
    }

    const feedback = await c.req.json();
    const feedbackId = `feedback:${userId}:${Date.now()}`;
    
    await kv.set(feedbackId, {
      ...feedback,
      id: feedbackId,
      userId,
      submittedAt: new Date().toISOString()
    });


    return c.json({ success: true, feedbackId });
  } catch (error) {
    return c.json({ error: 'Failed to submit feedback' }, 500);
  }
});

// ============================================================================
// COACH PORTAL ENDPOINTS
// ============================================================================

// Get all families for a coach
app.get("/make-server-8a022548/coach/families", async (c) => {
  try {
    const coachId = c.req.header('X-Coach-Id') || 'default_coach';
    
    // Get family assignments for this coach
    const assignments = await kv.getByPrefix(`coach_assignment:${coachId}:`);
    
    if (!assignments || assignments.length === 0) {
      // Return mock data for demo
      return c.json({
        families: [
          {
            id: '1',
            childName: 'Emma',
            parentName: 'Sarah Johnson',
            age: '5',
            activeGoals: 4,
            lastVisit: '2 days ago',
            status: 'active',
            progress: 78
          },
          {
            id: '2',
            childName: 'Liam',
            parentName: 'Michael Chen',
            age: '7',
            activeGoals: 3,
            lastVisit: '1 week ago',
            status: 'active',
            progress: 65
          },
          {
            id: '3',
            childName: 'Sophia',
            parentName: 'Jennifer Rodriguez',
            age: '4',
            activeGoals: 5,
            lastVisit: '3 weeks ago',
            status: 'review',
            progress: 42
          }
        ]
      });
    }
    
    const families = await Promise.all(
      assignments.map(async (assignment) => {
        const family = await kv.get(`family:${assignment.familyId}`);
        return family;
      })
    );
    
    return c.json({ families: families.filter(f => f !== null) });
  } catch (error) {
    return c.json({ error: 'Failed to fetch families' }, 500);
  }
});

// Get family detail with goals and notes
app.get("/make-server-8a022548/coach/family/:familyId", async (c) => {
  try {
    const familyId = c.req.param('familyId');
    const coachId = c.req.header('X-Coach-Id') || 'default_coach';
    
    // Get family data
    const family = await kv.get(`family:${familyId}`);
    
    // Get goals
    const goals = await kv.getByPrefix(`goal:${familyId}:`);
    
    // Get notes
    const notes = await kv.getByPrefix(`coach_note:${coachId}:${familyId}:`);
    
    if (!family && goals.length === 0) {
      // Return mock data for demo
      return c.json({
        family: {
          id: familyId,
          childName: 'Emma',
          parentName: 'Sarah Johnson',
          age: '5'
        },
        goals: [
          {
            id: '1',
            title: 'Increase eye contact during conversations',
            description: 'Maintain eye contact for 3-5 seconds during structured activities',
            status: 'active',
            progress: 75,
            baseline: '1-2 seconds',
            target: '3-5 seconds',
            category: 'Social Skills'
          },
          {
            id: '2',
            title: 'Request help independently',
            description: 'Use words or gestures to request assistance without prompting',
            status: 'active',
            progress: 60,
            baseline: '0-1 per session',
            target: '3-4 per session',
            category: 'Communication'
          }
        ],
        notes: [
          {
            id: '1',
            date: '2025-10-25',
            content: 'Great progress on eye contact today. Emma maintained contact for 4 seconds during puzzle activity.',
            tags: ['progress', 'social-skills']
          },
          {
            id: '2',
            date: '2025-10-20',
            content: 'Working on generalization of requesting help. Practice at home recommended.',
            tags: ['recommendation', 'communication']
          }
        ]
      });
    }
    
    return c.json({
      family,
      goals,
      notes: notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch family data' }, 500);
  }
});

// Save a coach note
app.post("/make-server-8a022548/coach/note", async (c) => {
  try {
    const { familyId, content, tags } = await c.req.json();
    const coachId = c.req.header('X-Coach-Id') || 'default_coach';
    
    if (!familyId || !content) {
      return c.json({ error: 'familyId and content are required' }, 400);
    }
    
    const noteId = `coach_note:${coachId}:${familyId}:${Date.now()}`;
    const note = {
      id: noteId,
      familyId,
      coachId,
      content,
      tags: tags || [],
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    
    await kv.set(noteId, note);
    
    return c.json(note);
  } catch (error) {
    return c.json({ error: 'Failed to save note' }, 500);
  }
});

// Update goal progress
app.post("/make-server-8a022548/coach/goal/update", async (c) => {
  try {
    const { goalId, progress, status } = await c.req.json();
    
    if (!goalId) {
      return c.json({ error: 'goalId is required' }, 400);
    }
    
    const goal = await kv.get(goalId);
    if (!goal) {
      return c.json({ error: 'Goal not found' }, 404);
    }
    
    const updatedGoal = {
      ...goal,
      ...(progress !== undefined && { progress }),
      ...(status !== undefined && { status }),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(goalId, updatedGoal);
    
    return c.json(updatedGoal);
  } catch (error) {
    return c.json({ error: 'Failed to update goal' }, 500);
  }
});

// ============================================================================
// MODERATION API ROUTES
// ============================================================================

// Get moderation queue
app.get("/make-server-8a022548/moderation/queue", async (c) => {
  const authHeader = c.req.header('Authorization');
  const authResult = await verifyAuth(authHeader);

  if (!authResult.user) {
    return unauthorizedResponse(c, authResult.error || 'Authentication required');
  }

  // Check admin/moderator permissions
  const permResult = await checkAdminPermission(authResult.user.id, 'moderator');
  if (!permResult.allowed) {
    return forbiddenResponse(c, 'Moderator access required');
  }

  const status = c.req.query('status') as 'pending' | 'approved' | 'rejected' | 'escalated' | undefined;
  const content_type = c.req.query('content_type');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await getModerationQueue({ status, content_type, limit, offset });

  if (result.error) {
    return c.json({ error: result.error }, 500);
  }

  return c.json({
    items: result.data,
    total: result.count,
    limit,
    offset,
  });
});

// Get single moderation item
app.get("/make-server-8a022548/moderation/queue/:id", async (c) => {
  const authHeader = c.req.header('Authorization');
  const authResult = await verifyAuth(authHeader);

  if (!authResult.user) {
    return unauthorizedResponse(c, authResult.error || 'Authentication required');
  }

  const permResult = await checkAdminPermission(authResult.user.id, 'moderator');
  if (!permResult.allowed) {
    return forbiddenResponse(c, 'Moderator access required');
  }

  const itemId = c.req.param('id');
  const result = await getModerationItem(itemId);

  if (result.error) {
    return c.json({ error: result.error }, 404);
  }

  return c.json(result.data);
});

// Review/resolve moderation item
app.post("/make-server-8a022548/moderation/queue/:id/review", async (c) => {
  const authHeader = c.req.header('Authorization');
  const authResult = await verifyAuth(authHeader);

  if (!authResult.user) {
    return unauthorizedResponse(c, authResult.error || 'Authentication required');
  }

  const permResult = await checkAdminPermission(authResult.user.id, 'moderator');
  if (!permResult.allowed) {
    return forbiddenResponse(c, 'Moderator access required');
  }

  const itemId = c.req.param('id');
  const body = await c.req.json();

  const { status, notes, userAction } = body;

  if (!status || !['approved', 'rejected', 'escalated'].includes(status)) {
    return c.json({ error: 'Valid status required (approved, rejected, escalated)' }, 400);
  }

  const result = await reviewModerationItem(itemId, authResult.user.id, {
    status,
    notes,
    userAction,
  });

  // Log admin action
  await logAdminAction({
    admin_id: authResult.user.id,
    admin_email: authResult.user.email || '',
    action: `moderation_${status}`,
    action_category: 'moderation',
    target_type: 'content',
    target_id: itemId,
    target_details: { status, notes },
    ip_address: c.req.header('x-forwarded-for') || undefined,
    user_agent: c.req.header('user-agent'),
    success: result.success,
    error_message: result.error,
  });

  if (!result.success) {
    return c.json({ error: result.error }, 500);
  }

  return c.json({ success: true, message: `Item ${status}` });
});

// Flag content for moderation
app.post("/make-server-8a022548/moderation/flag", async (c) => {
  const authHeader = c.req.header('Authorization');
  const authResult = await verifyAuth(authHeader);

  if (!authResult.user) {
    return unauthorizedResponse(c, authResult.error || 'Authentication required');
  }

  const body = await c.req.json();
  const { contentType, contentId, flagCategory, flagReason, contentText } = body;

  if (!contentType || !contentId || !flagCategory) {
    return c.json({ error: 'contentType, contentId, and flagCategory are required' }, 400);
  }

  const result = await flagContent(contentType, contentId, flagCategory, {
    flaggedBy: authResult.user.id,
    flagReason,
    contentText,
  });

  if (!result.success) {
    return c.json({ error: result.error }, 500);
  }

  return c.json({ success: true, id: result.id });
});

// Get user moderation history
app.get("/make-server-8a022548/moderation/user/:userId/history", async (c) => {
  const authHeader = c.req.header('Authorization');
  const authResult = await verifyAuth(authHeader);

  if (!authResult.user) {
    return unauthorizedResponse(c, authResult.error || 'Authentication required');
  }

  const permResult = await checkAdminPermission(authResult.user.id, 'moderator');
  if (!permResult.allowed) {
    return forbiddenResponse(c, 'Moderator access required');
  }

  const userId = c.req.param('userId');
  const limit = parseInt(c.req.query('limit') || '50');

  const result = await getUserModerationHistory(userId, limit);

  if (result.error) {
    return c.json({ error: result.error }, 500);
  }

  return c.json({ history: result.data });
});

// Apply moderation action to user
app.post("/make-server-8a022548/moderation/user/:userId/action", async (c) => {
  const authHeader = c.req.header('Authorization');
  const authResult = await verifyAuth(authHeader);

  if (!authResult.user) {
    return unauthorizedResponse(c, authResult.error || 'Authentication required');
  }

  // Require admin (not just moderator) for user actions
  const permResult = await checkAdminPermission(authResult.user.id, 'admin');
  if (!permResult.allowed) {
    return forbiddenResponse(c, 'Admin access required');
  }

  const userId = c.req.param('userId');
  const body = await c.req.json();

  const { action, reason, notes, expires_at } = body;

  if (!action || !reason) {
    return c.json({ error: 'action and reason are required' }, 400);
  }

  const result = await applyUserModerationAction(userId, authResult.user.id, {
    action,
    reason,
    notes,
    expires_at,
  });

  // Log admin action
  await logAdminAction({
    admin_id: authResult.user.id,
    admin_email: authResult.user.email || '',
    action: `user_${action}`,
    action_category: 'user_management',
    target_type: 'user',
    target_id: userId,
    target_details: { action, reason, notes },
    ip_address: c.req.header('x-forwarded-for') || undefined,
    user_agent: c.req.header('user-agent'),
    success: result.success,
    error_message: result.error,
  });

  if (!result.success) {
    return c.json({ error: result.error }, 500);
  }

  return c.json({ success: true, message: `Action ${action} applied to user` });
});

// Get moderation statistics
app.get("/make-server-8a022548/moderation/stats", async (c) => {
  const authHeader = c.req.header('Authorization');
  const authResult = await verifyAuth(authHeader);

  if (!authResult.user) {
    return unauthorizedResponse(c, authResult.error || 'Authentication required');
  }

  const permResult = await checkAdminPermission(authResult.user.id, 'moderator');
  if (!permResult.allowed) {
    return forbiddenResponse(c, 'Moderator access required');
  }

  const stats = await getModerationStats();

  return c.json(stats);
});

Deno.serve(app.fetch);
