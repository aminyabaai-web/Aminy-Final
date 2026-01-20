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

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
// Restrict to allowed origins for security
const allowedOrigins = [
  'https://aminy.app',
  'https://www.aminy.app',
  'https://app.aminy.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  "/*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return 'https://aminy.app';
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) return origin;
      // In development, allow any localhost
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
      // Default to main domain
      return 'https://aminy.app';
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

async function callAI(config: AIConfig, options: {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ text: string; usage?: any }> {
  const { systemPrompt, messages, maxTokens = 1000, temperature = 0.7 } = options;

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
    return {
      text: data.choices[0].message.content,
      usage: data.usage
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
    return {
      text: data.content[0].text,
      usage: data.usage
    };
  }
}

// AI Orchestrator endpoint - categorize and prioritize tasks
app.post("/make-server-8a022548/ai/categorize", async (c) => {
  try {
    const { userInput, context, userId, tier } = await c.req.json();

    // Rate limiting
    const rateLimitId = userId || c.req.header('x-forwarded-for') || 'anonymous';
    const rateLimitCheck = await checkAllRateLimits(rateLimitId, tier || 'free', 'ai-categorize');
    if (!rateLimitCheck.allowed) {
      return c.json(
        { error: rateLimitCheck.reason, retryAfter: rateLimitCheck.result.retryAfter },
        { status: 429, headers: getRateLimitHeaders(rateLimitCheck.result) }
      );
    }

    if (!userInput || typeof userInput !== 'string') {
      return c.json({ error: 'userInput is required and must be a string' }, 400);
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

    const result = await callAI(aiConfig, {
      systemPrompt,
      messages: [
        { role: 'user', content: `${context ? `Context: ${context}\n\n` : ''}User's thoughts: ${userInput}\n\nRespond ONLY with valid JSON matching the format specified in the system prompt.` }
      ],
      maxTokens: 1000,
      temperature: 0.7
    });

    const aiResponse = JSON.parse(result.text);
    return c.json(aiResponse);
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

    const { userMessage, conversationHistory, systemPrompt, userId, tier } = body;

    // Rate limiting
    const rateLimitId = userId || c.req.header('x-forwarded-for') || 'anonymous';
    const rateLimitCheck = await checkAllRateLimits(rateLimitId, tier || 'free', 'ai-brain');
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
    return c.json({ error: `Failed to process request: ${error.message || error}` }, 500);
  }
});

// AI Chat endpoint - For conversational AI (onboarding, Ask Aminy, etc)
app.post("/make-server-8a022548/ai/chat", async (c) => {
  try {
    const body = await c.req.json();

    const { messages, context, userId, tier } = body;

    // Rate limiting - use userId if provided, otherwise use IP
    const rateLimitId = userId || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'anonymous';
    const userTier = tier || 'free';

    // Create Supabase client for usage tracking
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

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

    // Prepare messages for the AI call
    const filteredMessages = messages.filter(m => m.role !== 'system');

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
      temperature: 0.9
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
    return c.json({ error: `Failed to process request: ${error.message || error}` }, 500);
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

    return c.json({
      tier,
      dailyLimit: DAILY_MESSAGE_LIMITS[tier] || DAILY_MESSAGE_LIMITS.default,
      usage: {
        used: dailyUsage.messagesUsed,
        limit: dailyUsage.messagesLimit,
        remaining: dailyUsage.messagesRemaining,
        resetsAt: dailyUsage.resetsAt,
      },
    });
  } catch (error) {
    console.error('Usage status error:', error);
    return c.json({ error: 'Failed to get usage status' }, 500);
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

    // Fetch week's events
    const allEvents = await kv.getByPrefix(`event:${user.id}:`);
    const weekEvents = allEvents.filter(event => {
      if (event.childId !== childId) return false;
      const eventDate = new Date(event.timestamp);
      return eventDate >= weekStartDate && eventDate <= weekEndDate;
    });

    // Generate simple summary (counts)
    const totalActivities = weekEvents.filter(e => e.eventType === 'activity_completed').length;
    const sessionsCompleted = weekEvents.filter(e => e.eventType === 'session_completed').length;
    const milestones = weekEvents
      .filter(e => e.eventType === 'milestone_reached')
      .map(e => e.eventData?.milestone || 'Milestone achieved');
    
    const goalsProgress = weekEvents.filter(e => e.eventType === 'goal_progress').length;
    
    const behaviorInsights = weekEvents
      .filter(e => e.eventType === 'behavior_logged')
      .map(e => e.eventData?.behavior || 'Behavior logged')
      .slice(0, 5); // Top 5

    // Determine trend
    let trend = 'stable';
    if (totalActivities > 10 && goalsProgress > 5) trend = 'improving';
    if (totalActivities < 3 || goalsProgress === 0) trend = 'needs_attention';

    const summary = {
      weekStart: weekStart,
      weekEnd: weekEndDate.toISOString(),
      childId,
      totalActivities,
      goalsProgress,
      behaviorInsights,
      sessionsCompleted,
      milestones,
      trend,
    };

    // If AI requested, enhance with AI summary
    if (useAI) {
      const aiConfig = getAIConfig();
      if (aiConfig) {
        try {
          const aiPrompt = `Based on this week's data for a child:
- ${totalActivities} activities completed
- ${sessionsCompleted} therapy sessions
- ${goalsProgress} goal progress entries
- Milestones: ${milestones.join(', ') || 'None'}
- Behaviors: ${behaviorInsights.join(', ') || 'None'}

Write a brief, encouraging 2-sentence summary for parents highlighting progress and next steps.`;

          const result = await callAI(aiConfig, {
            systemPrompt: 'You are Aminy, a supportive AI assistant for parents of neurodivergent children.',
            messages: [{ role: 'user', content: aiPrompt }],
            maxTokens: 200,
            temperature: 0.7
          });

          summary.aiSummary = result.text;
        } catch (aiError) {
        }
      }
    }

    return c.json(summary);
  } catch (error) {
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

    // Generate summaries for each of the past N weeks
    const trends = [];
    const now = new Date();
    
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
      weekStart.setHours(0, 0, 0, 0);

      // Call weekly summary logic (simplified version)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const allEvents = await kv.getByPrefix(`event:${user.id}:`);
      const weekEvents = allEvents.filter(event => {
        if (event.childId !== childId) return false;
        const eventDate = new Date(event.timestamp);
        return eventDate >= weekStart && eventDate <= weekEnd;
      });

      trends.push({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        childId,
        totalActivities: weekEvents.filter(e => e.eventType === 'activity_completed').length,
        goalsProgress: weekEvents.filter(e => e.eventType === 'goal_progress').length,
        behaviorInsights: [],
        sessionsCompleted: weekEvents.filter(e => e.eventType === 'session_completed').length,
        milestones: [],
        trend: 'stable',
      });
    }

    return c.json(trends.reverse()); // Oldest to newest
  } catch (error) {
    return c.json({ error: 'Failed to fetch trends' }, 500);
  }
});

// ============================================================================
// REPORT BUILDER ENDPOINTS
// ============================================================================

// Generate a PDF report
app.post("/make-server-8a022548/reports/generate", async (c) => {
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

    const request = await c.req.json();
    const { childId, reportType, startDate, endDate, watermark } = request;

    // Create bucket if it doesn't exist
    const bucketName = 'make-8a022548-reports';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    // Generate simple PDF content (placeholder - would use a PDF library in production)
    const reportContent = `
AMINY ${reportType.toUpperCase()} REPORT
${watermark ? `\n${watermark}\n` : ''}

Child ID: ${childId}
Period: ${startDate} to ${endDate}
Generated: ${new Date().toISOString()}

This is a placeholder report. In production, this would be a formatted PDF with:
- Child progress data
- Charts and visualizations
- Goals and milestones
- Clinical observations
- Recommendations

Report generated by Aminy AI
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
// ============================================================================

// Create a video room for a telehealth session
app.post("/make-server-8a022548/video/create-room", async (c) => {
  return createVideoRoom(c.req.raw);
});

// Get a meeting token for joining a room
app.post("/make-server-8a022548/video/get-token", async (c) => {
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

// Schedule a session
app.post("/make-server-8a022548/providers/:providerId/sessions", async (c) => {
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

// Apply referral credit
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

    // Find referrer by code
    const referralData = await kv.get(`referral:code:${referralCode}`);
    if (!referralData) {
      return c.json({ error: 'Invalid referral code' }, 400);
    }

    // Add credits to both users
    const creditsAdded = 10; // $10 credit

    const subscription = await kv.get(`subscription:${user.id}`);
    if (subscription) {
      subscription.referralCredits += creditsAdded;
      await kv.set(`subscription:${user.id}`, subscription);
    }

    return c.json({ creditsAdded });
  } catch (error) {
    return c.json({ error: 'Failed to apply referral credit' }, 500);
  }
});

// Get referral info
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

    // Get or create referral code
    let referralInfo = await kv.get(`referral:${user.id}`);
    if (!referralInfo) {
      const code = `AMINY${user.id.substring(0, 6).toUpperCase()}`;
      referralInfo = {
        code,
        totalReferrals: 0,
        creditsEarned: 0,
      };
      await kv.set(`referral:${user.id}`, referralInfo);
      await kv.set(`referral:code:${code}`, { userId: user.id });
    }

    return c.json(referralInfo);
  } catch (error) {
    return c.json({ error: 'Failed to fetch referral info' }, 500);
  }
});

// Check feature access
app.get("/make-server-8a022548/payments/feature-access", async (c) => {
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

    const feature = c.req.query('feature');
    const subscription = await kv.get(`subscription:${user.id}`);
    const tier = subscription?.tier || 'free';

    // Define feature access per tier
    const featureAccess = {
      'ai_coach': ['basic', 'plus', 'premium'],
      'telehealth': ['plus', 'premium'],
      'unlimited_vault': ['plus', 'premium'],
      'pdf_reports': ['premium'],
      'priority_support': ['premium'],
    };

    const hasAccess = featureAccess[feature]?.includes(tier) || false;
    const upgradeRequired = hasAccess ? null : featureAccess[feature]?.[0] || 'premium';

    return c.json({ hasAccess, tier, upgradeRequired });
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
      subscription.status = 'active';
      subscription.tier = 'free'; // Downgrade to free
      delete subscription.trialEndsAt;
      await kv.set(`subscription:${user.id}`, subscription);
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to expire trial' }, 500);
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

Deno.serve(app.fetch);
