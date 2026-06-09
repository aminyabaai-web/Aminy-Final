import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { generatePDFReport, generateHTMLReport } from "./pdf-generator.ts";
import {
  sendReportShareEmail,
  sendWelcomeEmail,
  sendReEngagementEmail,
  sendTrialExpirationEmail,
  sendWeeklyDigestEmail,
  sendChurnPreventionEmail,
  type ChurnEmailType,
} from "./email-service.ts";
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

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
// Restrict to allowed origins for security
const allowedOrigins = [
  'https://aminy.ai',
  'https://www.aminy.ai',
  'https://app.aminy.ai',
  'https://aminyapp.vercel.app',
  'https://aminy-onboarding.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  "/*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return 'https://aminy.ai';
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) return origin;
      // In development, allow any localhost
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
      // Default to main domain
      return 'https://aminy.ai';
    },
    allowHeaders: ["Content-Type", "Authorization", "X-User-Id", "X-Coach-Id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    maxAge: 600,
    credentials: true,
  }),
);

// Health check endpoint
app.get("/make-server-8a022548/health", (c) => {
  return c.json({ status: "ok" });
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
  // Claude (Anthropic) is the preferred provider. OpenAI is fallback only.
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    return { provider: 'anthropic', apiKey: anthropicKey };
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (openaiKey) {
    return { provider: 'openai', apiKey: openaiKey };
  }

  return null;
}

/**
 * Get the OpenAI fallback config explicitly. Used when Anthropic throws a
 * billing/auth/rate-limit error (4xx) — we transparently retry the same call
 * against OpenAI so the parent never sees "AI is down."
 */
function getOpenAIFallbackConfig(): AIConfig | null {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  return openaiKey ? { provider: 'openai', apiKey: openaiKey } : null;
}

// Token cost tracking (approximate costs per 1K tokens as of 2025)
const TOKEN_COSTS = {
  'gpt-4o': { input: 0.0025, output: 0.01 }, // $2.50 / $10 per 1M tokens
  'claude-sonnet-4-6': { input: 0.003, output: 0.015 }, // $3 / $15 per 1M tokens
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
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: filteredMessages
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${errorText.slice(0, 300)}`);
    }

    const data = await response.json();
    const model = 'claude-sonnet-4-6';
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

    // Detect vision payload: userMessage may be a string OR an Anthropic-format
    // content array with image blocks (frontend sends this when parent attaches a photo)
    const isVisionPayload = Array.isArray(userMessage) &&
      userMessage.some((b: any) => b?.type === 'image');

    // For OpenAI fallback, convert Anthropic image blocks to OpenAI format
    let normalizedUserMessage = userMessage;
    if (isVisionPayload && aiConfig.provider === 'openai') {
      normalizedUserMessage = (userMessage as any[]).map(b => {
        if (b.type === 'image' && b.source?.type === 'base64') {
          return { type: 'image_url', image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } };
        }
        return b;
      });
    }

    // Prepare messages
    const conversationMessages = (conversationHistory || []).filter(m => m.role !== 'system');
    const messages = [
      ...conversationMessages,
      { role: 'user', content: normalizedUserMessage }
    ];

    // Try the preferred provider (Anthropic) first. If it fails with a billing,
    // auth, or rate-limit error, transparently retry against OpenAI so the
    // parent's chat never visibly breaks just because Claude credits ran out.
    let result;
    let activeProvider = aiConfig.provider;
    try {
      result = await callAI(aiConfig, {
        systemPrompt: systemPrompt || 'You are Aminy, a helpful AI assistant for parents.',
        messages,
        maxTokens: isVisionPayload ? 1500 : 500,
        temperature: 0.8
      });
    } catch (primaryError) {
      const errMsg = primaryError instanceof Error ? primaryError.message : '';
      const is4xx = /API error: 4\d\d/.test(errMsg);
      const fallback = aiConfig.provider === 'anthropic' ? getOpenAIFallbackConfig() : null;

      if (is4xx && fallback) {
        // Vision payloads converted to Anthropic format need re-conversion for OpenAI
        const fallbackUserMsg = isVisionPayload && Array.isArray(userMessage)
          ? (userMessage as any[]).map(b => {
              if (b.type === 'image' && b.source?.type === 'base64') {
                return { type: 'image_url', image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } };
              }
              return b;
            })
          : userMessage;
        const fallbackMessages = [
          ...conversationMessages,
          { role: 'user', content: fallbackUserMsg }
        ];
        result = await callAI(fallback, {
          systemPrompt: systemPrompt || 'You are Aminy, a helpful AI assistant for parents.',
          messages: fallbackMessages,
          maxTokens: isVisionPayload ? 1500 : 500,
          temperature: 0.8
        });
        activeProvider = fallback.provider;
      } else {
        throw primaryError;
      }
    }


    return c.json({
      message: result.text,
      usage: result.usage,
      provider: activeProvider
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

    // SECURITY: Detect potential prompt injection attempts
    // Log suspicious activity for security monitoring
    for (const msg of messages) {
      if (msg.role === 'user' && msg.content) {
        const injectionCheck = detectPromptInjection(msg.content);
        if (injectionCheck.suspicious) {
          console.warn(`SECURITY: Potential prompt injection detected from ${rateLimitId}`, {
            patterns: injectionCheck.patterns,
            contentPreview: msg.content.substring(0, 100) + '...',
            timestamp: new Date().toISOString(),
          });
          // Continue processing - sanitization will handle it
          // But log for security monitoring
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

// Share report via email (KV-stored reports)
app.post("/make-server-8a022548/reports/:reportId/share", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reportId = c.req.param('reportId');
    const { recipientEmail, message } = await c.req.json();

    const report = await kv.get(`report:${reportId}`);
    if (!report || report.userId !== user.id) {
      return c.json({ error: 'Report not found' }, 404);
    }

    // Get sender name from profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const senderName = profile?.full_name || 'An Aminy parent';
    const childName = report.childName || 'their child';
    const reportUrl = `https://app.aminy.ai/shared/report/${reportId}`;

    await sendReportShareEmail(recipientEmail, senderName, childName, reportUrl, message);

    return c.json({ success: true });
  } catch (error) {
    console.error('[Share] Report share error:', error);
    return c.json({ error: 'Failed to share report' }, 500);
  }
});

// Share progress report via email (direct — no KV storage required)
app.post("/make-server-8a022548/reports/share-direct", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user } } = await supabaseClient.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { recipientEmail, childName, parentName, reportSummary, message } = await c.req.json();

    if (!recipientEmail || !childName) {
      return c.json({ error: 'recipientEmail and childName are required' }, 400);
    }

    const senderName = parentName || 'An Aminy parent';

    // Store report in KV with 7-day TTL for the shareable link
    const reportId = crypto.randomUUID();
    await kv.set(`report:${reportId}`, {
      userId: user.id,
      childName,
      parentName: senderName,
      reportSummary,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const reportUrl = `https://app.aminy.ai/shared/report/${reportId}`;

    const sent = await sendReportShareEmail(recipientEmail, senderName, childName, reportUrl, message);

    if (!sent) {
      return c.json({ error: 'Failed to send email. Email service may not be configured.' }, 500);
    }

    return c.json({ success: true, reportId, reportUrl });
  } catch (error) {
    console.error('[Share] Direct share error:', error);
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

// ─── Ask BCBA — AI draft endpoint ───────────────────────────────────────────
// Parent submits a question → row inserted with status='pending' → this fires
// async to generate an AI draft response using Claude with full family context.
// BCBA then reviews + edits + signs within 24h.
app.post("/make-server-8a022548/ai/draft-bcba-response", async (c) => {
  try {
    const { threadId } = await c.req.json();
    if (!threadId) return c.json({ error: 'threadId required' }, 400);

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load thread + child context
    const { data: thread } = await sb
      .from('ask_bcba_threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (!thread) return c.json({ error: 'Thread not found' }, 404);

    // Pull related child profile for richer context
    let childCtx = '';
    if (thread.child_id) {
      const { data: child } = await sb
        .from('children')
        .select('name, age_years, diagnosis, priorities')
        .eq('id', thread.child_id)
        .maybeSingle();
      if (child) {
        childCtx = `Child: ${child.name}, age ${child.age_years}${child.diagnosis ? `, ${child.diagnosis}` : ''}.`;
      }
    }
    if (!childCtx && thread.child_name) {
      childCtx = `Child: ${thread.child_name}.`;
    }

    const aiConfig = getAIConfig();
    if (!aiConfig) {
      return c.json({ error: 'AI not configured' }, 500);
    }

    const systemPrompt = `You are a BCBA (Board Certified Behavior Analyst) responding to a parent's question. Be warm, specific, and actionable.

${childCtx}

RESPONSE REQUIREMENTS:
- Acknowledge the parent's experience first (1 sentence)
- Identify the likely behavioral FUNCTION if relevant
- Give 1 specific, evidence-based strategy with implementation steps
- 4-6 sentences total — concise but complete
- End with one focused follow-up question OR a clear next action
- Never say "consult a BCBA" — you ARE the BCBA
- This is a DRAFT — a human BCBA will review before sending to the parent
- Sign with "— AI draft, pending BCBA review"`;

    const result = await callAI(aiConfig, {
      systemPrompt,
      messages: [{ role: 'user', content: thread.question }],
      maxTokens: 800,
      temperature: 0.6,  // Lower temp for clinical responses
    });

    // Update the thread with the AI draft
    await sb
      .from('ask_bcba_threads')
      .update({
        ai_draft: result.text,
        ai_drafted_at: new Date().toISOString(),
        ai_model: result.usage?.model || 'claude-sonnet-4-6',
        status: 'awaiting_bcba',  // AI drafted → now awaiting human review
      })
      .eq('id', threadId);

    return c.json({ success: true, draft: result.text });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Draft failed';
    return c.json({ error: msg.slice(0, 200) }, 500);
  }
});

// ─── Voice transcription (Whisper) ──────────────────────────────────────────
// Parent records audio in BevelChatOverlay (hands-busy moments mid-meltdown,
// driving, holding a baby, etc.). We send to OpenAI Whisper for STT and
// return the transcript. Parent reviews + sends as normal message.
// ─── Twilio SMS sender ──────────────────────────────────────────────────────
// Used for appointment reminders, magic-link backup, urgent provider messages.
// Requires Supabase secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
app.post("/make-server-8a022548/notifications/sms", async (c) => {
  try {
    const { phoneNumber, message } = await c.req.json();
    if (!phoneNumber || !message) {
      return c.json({ success: false, error: 'phoneNumber and message required' }, 400);
    }

    const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const token = Deno.env.get('TWILIO_AUTH_TOKEN');
    const from = Deno.env.get('TWILIO_FROM_NUMBER');
    if (!sid || !token || !from) {
      return c.json({ success: false, error: 'Twilio not configured' }, 503);
    }

    // Twilio REST API — Form-encoded body, basic auth (sid:token)
    const auth = btoa(`${sid}:${token}`);
    const body = new URLSearchParams();
    body.set('To', phoneNumber);
    body.set('From', from);
    body.set('Body', message.slice(0, 1500));  // hard cap to avoid runaway costs

    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return c.json({ success: false, error: `Twilio: ${errText.slice(0, 200)}` }, 502);
    }

    const data = await resp.json();
    return c.json({ success: true, messageId: data.sid });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'SMS failed';
    return c.json({ success: false, error: msg.slice(0, 200) }, 500);
  }
});

app.post("/make-server-8a022548/ai/transcribe", async (c) => {
  try {
    const { audioBase64, mimeType } = await c.req.json();
    if (!audioBase64) {
      return c.json({ error: 'audioBase64 is required' }, 400);
    }

    // Whisper needs OpenAI key — separate from the chat key (which prefers Claude).
    // OPENAI_API_KEY may be set as a Supabase secret specifically for Whisper.
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return c.json({ error: 'Voice transcription not configured' }, 503);
    }

    // Convert base64 → binary blob for multipart upload to OpenAI
    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const ext = (mimeType || 'audio/webm').includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob([bytes], { type: mimeType || 'audio/webm' });

    const formData = new FormData();
    formData.append('file', blob, `audio.${ext}`);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');

    const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: formData,
    });

    if (!whisperResp.ok) {
      const errText = await whisperResp.text();
      return c.json({ error: `Whisper error: ${whisperResp.status}`, detail: errText.slice(0, 200) }, 500);
    }

    const data = await whisperResp.json();
    return c.json({ text: data.text || '' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Transcription failed';
    return c.json({ error: msg.slice(0, 200) }, 500);
  }
});

// ─── B2B Org Subscription Checkout ──────────────────────────────────────────
// Per-seat billing for AACT pilots, clinics, schools, agencies, enterprise.
// Default $99/seat/mo, 10% off annual.
app.post("/make-server-8a022548/org/checkout", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) return c.json({ error: 'Unauthorized' }, 401);

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user } } = await sb.auth.getUser(accessToken);
    if (!user?.id) return c.json({ error: 'Unauthorized' }, 401);

    const { orgId, interval, successUrl, cancelUrl } = await c.req.json();
    if (!orgId || !interval) return c.json({ error: 'Missing orgId or interval' }, 400);

    // Verify caller is the org owner (security gate)
    const { data: org } = await sb
      .from('organizations')
      .select('id, name, seat_count, price_per_seat_cents, owner_id, stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (!org || org.owner_id !== user.id) {
      return c.json({ error: 'Not the org owner' }, 403);
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return c.json({ error: 'Stripe not configured' }, 500);

    // Calculate amount: seats × price/seat × (12 if annual with 15% off, 1 if monthly)
    // Keep in sync with src/lib/org-licensing.ts ($49/seat, 15% annual — June 2026)
    const seatPriceCents = org.price_per_seat_cents || 4900;
    const seats = org.seat_count;
    const unitAmount = interval === 'year'
      ? Math.round(seatPriceCents * 12 * 0.85)  // 15% annual discount
      : seatPriceCents;

    // Build Stripe checkout URL — using `price_data` for dynamic per-seat pricing
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('success_url', successUrl);
    params.set('cancel_url', cancelUrl);
    params.set('client_reference_id', orgId);
    params.set('line_items[0][price_data][currency]', 'usd');
    params.set('line_items[0][price_data][product_data][name]', `Aminy for Organizations — ${org.name}`);
    params.set('line_items[0][price_data][product_data][description]', `${seats} seats — ${interval === 'year' ? 'Annual (15% off)' : 'Monthly'}`);
    params.set('line_items[0][price_data][unit_amount]', String(unitAmount));
    params.set('line_items[0][price_data][recurring][interval]', interval === 'year' ? 'year' : 'month');
    params.set('line_items[0][quantity]', String(seats));
    params.set('customer_email', user.email || '');
    params.set('subscription_data[metadata][org_id]', orgId);
    params.set('subscription_data[metadata][owner_id]', user.id);

    const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!stripeResp.ok) {
      const errText = await stripeResp.text();
      return c.json({ error: `Stripe error: ${errText.slice(0, 200)}` }, 500);
    }

    const session = await stripeResp.json();
    return c.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Org checkout failed';
    return c.json({ error: msg.slice(0, 200) }, 500);
  }
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

    // Send email with coverage report summary
    const { sendEmail: sendEmailDirect } = await import('./email-service.ts');
    await sendEmailDirect({
      to: email,
      subject: 'Your Coverage Clarity Report - Aminy',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0891b2;">Your Coverage Clarity Report</h1>
          <p>Here is your insurance coverage analysis from Aminy.</p>
          <p>For the full PDF report, please download it from your Aminy dashboard.</p>
          <p>Best regards,<br>The Aminy Team</p>
        </div>
      `,
      text: 'Your Coverage Clarity Report is ready. Download the full PDF from your Aminy dashboard.',
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to send email' }, 500);
  }
});

// ============================================================================
// EMAIL ENDPOINTS (Retention, Notifications, etc.)
// ============================================================================

// Send welcome email after onboarding
app.post("/make-server-8a022548/email/welcome", async (c) => {
  try {
    const { email, userName, childName } = await c.req.json();

    if (!email || !userName || !childName) {
      return c.json({ error: 'email, userName, and childName required' }, 400);
    }

    await sendWelcomeEmail(email, userName, childName);

    return c.json({ success: true, message: 'Welcome email sent' });
  } catch (error) {
    console.error('[Email] Welcome email error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Failed to send welcome email', details: errorMessage }, 500);
  }
});

// Send re-engagement email
app.post("/make-server-8a022548/email/re-engage", async (c) => {
  try {
    const { email, userName, childName, daysSinceLastActivity } = await c.req.json();

    if (!email || !userName || !childName) {
      return c.json({ error: 'email, userName, and childName required' }, 400);
    }

    const success = await sendReEngagementEmail(
      email,
      userName,
      childName,
      daysSinceLastActivity || 3
    );

    if (!success) {
      return c.json({ error: 'Failed to send re-engagement email' }, 500);
    }

    return c.json({ success: true, message: 'Re-engagement email sent' });
  } catch (error) {
    console.error('[Email] Re-engagement email error:', error);
    return c.json({ error: 'Failed to send re-engagement email' }, 500);
  }
});

// Send trial expiration reminder
app.post("/make-server-8a022548/email/trial-reminder", async (c) => {
  try {
    const { email, userName, daysLeft } = await c.req.json();

    if (!email || !userName || daysLeft === undefined) {
      return c.json({ error: 'email, userName, and daysLeft required' }, 400);
    }

    const success = await sendTrialExpirationEmail(email, userName, daysLeft);

    if (!success) {
      return c.json({ error: 'Failed to send trial reminder' }, 500);
    }

    return c.json({ success: true, message: 'Trial reminder sent' });
  } catch (error) {
    console.error('[Email] Trial reminder error:', error);
    return c.json({ error: 'Failed to send trial reminder' }, 500);
  }
});

// Send churn prevention email (day 4, day 6, day 8 after trial start)
app.post("/make-server-8a022548/email/churn-prevention", async (c) => {
  try {
    const { email, userName, childName, emailType, progressStats, offerCode, offerDiscount } = await c.req.json();

    if (!email || !userName || !childName || !emailType) {
      return c.json({ error: 'email, userName, childName, and emailType required' }, 400);
    }

    // Validate emailType
    const validTypes: ChurnEmailType[] = ['trial_progress', 'trial_ending', 'trial_expired_offer'];
    if (!validTypes.includes(emailType)) {
      return c.json({ error: `Invalid emailType. Must be one of: ${validTypes.join(', ')}` }, 400);
    }

    const success = await sendChurnPreventionEmail(
      email,
      userName,
      childName,
      emailType as ChurnEmailType,
      { progressStats, offerCode, offerDiscount }
    );

    if (!success) {
      return c.json({ error: 'Failed to send churn prevention email' }, 500);
    }

    return c.json({ success: true, message: `Churn prevention email (${emailType}) sent` });
  } catch (error) {
    console.error('[Email] Churn prevention error:', error);
    return c.json({ error: 'Failed to send churn prevention email' }, 500);
  }
});

// Send weekly digest
app.post("/make-server-8a022548/email/weekly-digest", async (c) => {
  try {
    const { email, userName, childName, weekStats } = await c.req.json();

    if (!email || !userName || !childName || !weekStats) {
      return c.json({ error: 'email, userName, childName, and weekStats required' }, 400);
    }

    const success = await sendWeeklyDigestEmail(email, userName, childName, weekStats);

    if (!success) {
      return c.json({ error: 'Failed to send weekly digest' }, 500);
    }

    return c.json({ success: true, message: 'Weekly digest sent' });
  } catch (error) {
    console.error('[Email] Weekly digest error:', error);
    return c.json({ error: 'Failed to send weekly digest' }, 500);
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
// BILLING ENGINE ENDPOINTS
// ============================================================================

// Get invoices
app.get("/make-server-8a022548/billing/invoices", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '10');

    // Get invoices from Stripe via stored data
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    return c.json({ invoices: invoices || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch invoices' }, 500);
  }
});

// Get payment methods
app.get("/make-server-8a022548/billing/payment-methods", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get Stripe customer ID
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!customer?.stripe_customer_id) {
      return c.json({ paymentMethods: [] });
    }

    // In production, fetch from Stripe API
    // For now, return stored payment methods
    const { data: methods } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id);

    return c.json({ paymentMethods: methods || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch payment methods' }, 500);
  }
});

// ============================================================================
// PROVIDER DASHBOARD ENDPOINTS
// ============================================================================

// Start provider video session
app.post("/make-server-8a022548/provider/start-session", async (c) => {
  try {
    const { appointmentId } = await c.req.json();

    // Create or get video room
    const room = await createVideoRoom(c.req.raw);

    // Get meeting token
    const tokenResponse = await getMeetingToken(c.req.raw);
    const tokenData = await tokenResponse.json();

    return c.json({
      roomUrl: room.url || `https://aminy.daily.co/${appointmentId}`,
      token: tokenData.token,
    });
  } catch (error) {
    return c.json({ error: 'Failed to start session' }, 500);
  }
});

// End provider video session
app.post("/make-server-8a022548/provider/end-session", async (c) => {
  try {
    const { appointmentId } = await c.req.json();

    // Update appointment status
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await supabase
      .from('appointments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', appointmentId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to end session' }, 500);
  }
});

// ============================================================================
// AI MEMORY ENDPOINTS
// ============================================================================

// Extract facts from text
app.post("/make-server-8a022548/ai/extract-facts", async (c) => {
  try {
    const { text } = await c.req.json();

    // Use Claude to extract facts
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return c.json({ facts: [] });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Extract structured facts from this text about a child and family. Return as JSON array with objects containing: category (child_info, preference, trigger, strength, challenge, strategy, medical, educational), key (short identifier), value (the fact), confidence (0-1).

Text: ${text}

Return only valid JSON array.`
        }],
      }),
    });

    if (!response.ok) {
      return c.json({ facts: [] });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '[]';

    try {
      const facts = JSON.parse(content);
      return c.json({ facts });
    } catch {
      return c.json({ facts: [] });
    }
  } catch (error) {
    return c.json({ facts: [] });
  }
});

// Analyze document
app.post("/make-server-8a022548/ai/analyze-document", async (c) => {
  try {
    const { content, documentType } = await c.req.json();

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return c.json({ summary: 'Document processed', keyFindings: [], goals: [], recommendations: [] });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `Analyze this ${documentType} document and extract key information. Return as JSON with: summary (brief overview), keyFindings (array of important points), goals (array of goals mentioned), recommendations (array of recommendations).

Document content: ${content.substring(0, 10000)}

Return only valid JSON.`
        }],
      }),
    });

    if (!response.ok) {
      return c.json({ summary: 'Document processed', keyFindings: [], goals: [], recommendations: [] });
    }

    const data = await response.json();
    const contentText = data.content?.[0]?.text || '{}';

    try {
      return c.json(JSON.parse(contentText));
    } catch {
      return c.json({ summary: 'Document processed', keyFindings: [], goals: [], recommendations: [] });
    }
  } catch (error) {
    return c.json({ summary: 'Document processed', keyFindings: [], goals: [], recommendations: [] });
  }
});

// Generate routine from ABA goals
app.post("/make-server-8a022548/ai/generate-routine", async (c) => {
  try {
    const { prompt, period, goals } = await c.req.json();

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return c.json({ error: 'AI not configured' }, 500);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `${prompt}

Return as JSON with: name (routine name), description (brief description), difficulty (easy/moderate/challenging), steps (array with title, description, duration in minutes, skillArea, promptLevel, isOptional boolean).`
        }],
      }),
    });

    if (!response.ok) {
      return c.json({ error: 'Failed to generate routine' }, 500);
    }

    const data = await response.json();
    const contentText = data.content?.[0]?.text || '{}';

    try {
      return c.json(JSON.parse(contentText));
    } catch {
      return c.json({ error: 'Failed to parse routine' }, 500);
    }
  } catch (error) {
    return c.json({ error: 'Failed to generate routine' }, 500);
  }
});

// ============================================================================
// AI CARE PLAN GENERATION
// ============================================================================

app.post("/make-server-8a022548/ai/care-plan", async (c) => {
  try {
    const body = await c.req.json();
    const { messages, max_tokens } = body;

    const authHeader = c.req.header('Authorization');
    const authResult = await verifyAuth(authHeader);
    const rateLimitId = (authResult.authenticated && authResult.user)
      ? authResult.user.userId
      : (c.req.header('x-forwarded-for') || 'anonymous');
    const userTier: TierType = (authResult.authenticated && authResult.user)
      ? authResult.user.tier
      : 'free';

    const rateLimitCheck = await checkAllRateLimits(rateLimitId, userTier, 'ai-brain');
    if (!rateLimitCheck.allowed) {
      return c.json({ error: rateLimitCheck.reason }, { status: 429, headers: getRateLimitHeaders(rateLimitCheck.result) });
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (anthropicApiKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: max_tokens || 1500,
          system: messages?.find((m: {role: string}) => m.role === 'system')?.content || 'You are a clinical care planning assistant for families of neurodivergent children. Generate evidence-informed, practical care plan recommendations. Be warm, specific, and actionable. Return structured JSON only.',
          messages: (messages || []).filter((m: {role: string}) => m.role !== 'system'),
        }),
      });
      if (!response.ok) {
        return c.json({ error: 'AI care plan generation failed', status: response.status }, 500);
      }
      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      return c.json({ message: content, content });
    }

    if (openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: max_tokens || 1500,
          messages: messages || [],
        }),
      });
      if (!response.ok) return c.json({ error: 'AI care plan generation failed' }, 500);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return c.json({ message: content, content });
    }

    return c.json({ error: 'No AI provider configured' }, 500);
  } catch (error) {
    return c.json({ error: 'Care plan generation failed' }, 500);
  }
});

// ============================================================================
// RETENTION ENGINE ENDPOINTS
// ============================================================================

// Track retention event
app.post("/make-server-8a022548/retention/event", async (c) => {
  try {
    const event = await c.req.json();

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Store event for analytics
    await supabase.from('retention_events').insert({
      user_id: event.userId,
      event_type: event.type,
      metadata: event.metadata || {},
      created_at: event.timestamp || new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to track event' }, 500);
  }
});

// Get engagement profile
app.get("/make-server-8a022548/retention/profile/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get user profile and stats
    const [profileResult, streakResult, conversationsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_streaks').select('*').eq('user_id', userId).eq('type', 'daily_checkin').single(),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    const profile = profileResult.data;
    const streak = streakResult.data;

    return c.json({
      userId,
      lastActiveAt: streak?.last_activity_date || profile?.updated_at || new Date().toISOString(),
      totalSessions: 0,
      streakDays: streak?.current_streak || 0,
      longestStreak: streak?.longest_streak || 0,
      aiConversations: conversationsResult.count || 0,
      goalsCompleted: 0,
      tier: profile?.tier || 'free',
      onboardingCompleted: profile?.onboarding_completed || false,
      notificationsEnabled: true,
      emailPreferences: {
        weeklyDigest: true,
        progressUpdates: true,
        tips: true,
        promotional: false,
      },
      riskLevel: 'low',
    });
  } catch (error) {
    return c.json({ error: 'Failed to get profile' }, 500);
  }
});

Deno.serve(app.fetch);
