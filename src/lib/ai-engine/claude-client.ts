/**
 * Claude AI Client for Aminy
 *
 * Real AI integration using Claude API via backend proxy
 * Supports streaming, conversation memory, and context-aware responses
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { getConfigForMessage, type AIConfig, type QueryClassification } from '../ai-config';
import { detectCrisis as advancedCrisisDetection, generateCrisisResponse, type CrisisDetectionResult } from '../crisis-detection';

// Types
export interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamingCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export interface ClaudeRequestOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface ConversationContext {
  childName: string;
  childAge: number;
  concerns: string[];
  goals: string[];
  diagnoses: string[];
  communicationLevel: string;
  sensoryProfile?: {
    seekers: string[];
    avoiders: string[];
  };
  parentName: string;
  recentTopics?: string[];
  tier: 'free' | 'starter' | 'core' | 'pro' | 'proplus';
}

// Backend API URL
const getBackendUrl = () => `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

// Rate limiting state (simple client-side throttling)
const rateLimitState = {
  lastRequest: 0,
  requestCount: 0,
  windowStart: Date.now(),
};

const RATE_LIMIT = {
  maxRequestsPerMinute: 30,
  minIntervalMs: 500, // Minimum 500ms between requests
};

/**
 * Check and update rate limit - throws if limit exceeded
 */
function checkRateLimit(): void {
  const now = Date.now();

  // Reset window every minute
  if (now - rateLimitState.windowStart > 60000) {
    rateLimitState.windowStart = now;
    rateLimitState.requestCount = 0;
  }

  // Check requests per minute
  if (rateLimitState.requestCount >= RATE_LIMIT.maxRequestsPerMinute) {
    throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
  }

  // Check minimum interval
  if (now - rateLimitState.lastRequest < RATE_LIMIT.minIntervalMs) {
    throw new Error('Please wait a moment before sending another message.');
  }

  rateLimitState.lastRequest = now;
  rateLimitState.requestCount++;
}

/**
 * Sanitize user input before sending to AI
 * Removes potential injection attempts and limits message length
 */
function sanitizeMessage(content: string): string {
  // Remove any HTML/script tags
  let sanitized = content.replace(/<[^>]*>/g, '');

  // Limit message length to prevent abuse (10,000 chars)
  const MAX_LENGTH = 10000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH) + '... [truncated]';
  }

  // Remove null bytes and other control characters (except newlines, tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized.trim();
}

/**
 * Check if the AI backend is available
 */
export async function isAIAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${getBackendUrl()}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Build the comprehensive Aminy system prompt
 */
export function buildAminySystemPrompt(context: ConversationContext): string {
  return `You are Aminy — the world's most caring, knowledgeable, and effective AI companion for parents of neurodivergent children.

WHO YOU ARE (Your Core Identity):
1. THE BEST DEVELOPMENTAL PEDIATRICIAN — Deep clinical knowledge of autism, ADHD, anxiety, sensory processing disorders, and developmental delays. You understand the science and latest research.
2. THE BEST BCBA — Master of Applied Behavior Analysis. You know reinforcement, antecedent strategies, skill acquisition, and crisis prevention.
3. THE BEST FRIEND — Warm, non-judgmental, genuinely caring. You celebrate small wins and never shame.
4. THE BEST THERAPIST — You support the PARENT's emotional wellbeing. You recognize caregiver burnout, validate struggles, and help them cope.
5. THE TRUSTED GUIDE — You make parents feel confident, capable, and never alone on this journey.

═══════════════════════════════════════════════════════════════
FAMILY CONTEXT (You know this family deeply)
═══════════════════════════════════════════════════════════════

CHILD: ${context.childName}
• Age: ${context.childAge} years old
• Communication: ${context.communicationLevel || 'developing'}
${context.diagnoses.length > 0 ? `• Diagnoses: ${context.diagnoses.join(', ')}` : ''}
• Working on: ${context.concerns.join(', ') || 'general developmental support'}
• Goals: ${context.goals.join(', ') || 'being developed'}
${context.sensoryProfile ? `
SENSORY PROFILE:
• Seeks: ${context.sensoryProfile.seekers.join(', ') || 'to be assessed'}
• Avoids: ${context.sensoryProfile.avoiders.join(', ') || 'to be assessed'}` : ''}

PARENT: ${context.parentName}
${context.recentTopics && context.recentTopics.length > 0 ? `• Recent conversation topics: ${context.recentTopics.slice(-5).join(', ')}` : ''}

═══════════════════════════════════════════════════════════════
RESPONSE GUIDELINES
═══════════════════════════════════════════════════════════════

1. BE PERSONAL — Always use ${context.childName}'s name. Reference specific details you know about them.

2. BE CLINICAL — Ground advice in evidence. Mention ABA principles when relevant. Cite strategies by name (First-Then, Visual Schedules, Social Stories, etc.)

3. BE WARM — You're their trusted friend who happens to be an expert. Use "we" language. ("Let's try..." not "You should...")

4. SUPPORT THE PARENT — Check in on THEIR wellbeing. They're often exhausted. Validate their feelings.

5. BE ACTIONABLE — Give 2-3 specific, concrete steps they can do TODAY.

6. BE BRIEF — 2-3 paragraphs max unless they ask for detail. Parents are busy and stressed.

7. CELEBRATE WINS — When they report progress, make a big deal of it. Small wins matter.

8. BE PROACTIVE — Suggest next steps. Reference upcoming challenges. Anticipate needs.

9. DRIVE ENGAGEMENT — End with something that invites them back. A question, a follow-up prompt, curiosity about how something went.

10. YOU ARE AN AI — NEVER suggest phone calls, video calls, in-person meetings, or scheduling appointments with yourself. You are Aminy, an AI companion. Guide parents to use Aminy's features (the chat, tools, trackers, etc.) for continued support.

TONE: Warm, confident, never condescending. Like a brilliant friend who genuinely cares. Use gentle humor when appropriate. Always end on hope.

CRISIS DETECTION: If a parent mentions self-harm, suicidal thoughts, or being in crisis:
1. IMMEDIATELY acknowledge their pain with compassion
2. Express that you care about them
3. PROVIDE CRISIS RESOURCES: "If you're having thoughts of harming yourself, please reach out to the 988 Suicide & Crisis Lifeline (call or text 988). You matter, and help is available right now."

REMEMBER: Every response should make this parent feel more capable, more hopeful, and less alone.`;
}

/**
 * Send a message to Claude and get a streaming response
 */
export async function sendMessageToClaudeStreaming(
  messages: ClaudeMessage[],
  context: ConversationContext,
  callbacks: StreamingCallbacks,
  options: ClaudeRequestOptions = {}
): Promise<string> {
  // Check rate limit before proceeding
  checkRateLimit();

  // Sanitize all user messages before sending
  const sanitizedMessages = messages.map(m => ({
    ...m,
    content: m.role === 'user' ? sanitizeMessage(m.content) : m.content,
  }));

  // Get dynamic config based on message content
  const lastUserMessage = sanitizedMessages.filter(m => m.role === 'user').pop()?.content || '';
  const { config: dynamicConfig, classification } = getConfigForMessage(lastUserMessage);

  // Log query classification for analytics (can be sent to Supabase)
  console.log('[AI Config] Query classified as:', classification.type, 'confidence:', classification.confidence);

  const {
    maxTokens = dynamicConfig.maxTokens,
    temperature = dynamicConfig.temperature,
    systemPrompt = buildAminySystemPrompt(context),
  } = options;

  try {
    const response = await fetch(`${getBackendUrl()}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          ...sanitizedMessages.slice(-20), // Last 20 messages for context
        ],
        max_tokens: maxTokens,
        temperature,
        stream: true,
        context: {
          childName: context.childName,
          childAge: context.childAge,
          tier: context.tier,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI request failed: ${response.status} - ${errorText}`);
    }

    return await handleStreamingResponse(response, callbacks);
  } catch (error) {
    console.error('Claude API error:', error);
    callbacks.onError?.(error as Error);
    throw error;
  }
}

/**
 * Send a message to Claude and get a non-streaming response
 */
export async function sendMessageToClaude(
  messages: ClaudeMessage[],
  context: ConversationContext,
  options: ClaudeRequestOptions = {}
): Promise<string> {
  // Check rate limit before proceeding
  checkRateLimit();

  // Sanitize all user messages before sending
  const sanitizedMessages = messages.map(m => ({
    ...m,
    content: m.role === 'user' ? sanitizeMessage(m.content) : m.content,
  }));

  // Get dynamic config based on message content
  const lastUserMessage = sanitizedMessages.filter(m => m.role === 'user').pop()?.content || '';
  const { config: dynamicConfig, classification } = getConfigForMessage(lastUserMessage);

  console.log('[AI Config] Query classified as:', classification.type, 'confidence:', classification.confidence);

  const {
    maxTokens = dynamicConfig.maxTokens,
    temperature = dynamicConfig.temperature,
    systemPrompt = buildAminySystemPrompt(context),
  } = options;

  try {
    const response = await fetch(`${getBackendUrl()}/ai/brain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        userMessage: sanitizedMessages[sanitizedMessages.length - 1]?.content || '',
        conversationHistory: sanitizedMessages.slice(0, -1),
        systemPrompt,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.message || data.content || '';
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

/**
 * Handle streaming response from the API
 */
async function handleStreamingResponse(
  response: Response,
  callbacks: StreamingCallbacks
): Promise<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  if (!reader) {
    throw new Error('No response stream available');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            // Handle different response formats
            const token =
              parsed.choices?.[0]?.delta?.content ||
              parsed.delta?.text ||
              parsed.content ||
              '';

            if (token) {
              fullResponse += token;
              callbacks.onToken?.(token);
            }
          } catch {
            // Non-JSON line, might be raw text
            if (data && data !== '[DONE]') {
              fullResponse += data;
              callbacks.onToken?.(data);
            }
          }
        }
      }
    }

    callbacks.onComplete?.(fullResponse);
    return fullResponse;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Generate a conversation title based on the first message
 */
export function generateConversationTitle(firstMessage: string): string {
  // Extract key topics from the message
  const topics = [
    { pattern: /routine|schedule|morning|bedtime|transition/i, title: 'Daily Routines' },
    { pattern: /behavior|meltdown|tantrum|hitting|biting/i, title: 'Behavior Support' },
    { pattern: /speech|communication|talk|words|language/i, title: 'Communication' },
    { pattern: /school|iep|teacher|classroom/i, title: 'School Support' },
    { pattern: /sensory|overwhelm|loud|touch|texture/i, title: 'Sensory Needs' },
    { pattern: /sleep|night|wake|bed/i, title: 'Sleep Strategies' },
    { pattern: /eating|food|meal|picky/i, title: 'Feeding Challenges' },
    { pattern: /anxiety|worry|fear|scared/i, title: 'Anxiety Support' },
    { pattern: /social|friends|play|peer/i, title: 'Social Skills' },
    { pattern: /therapy|aba|ot|pt|speech/i, title: 'Therapy Coordination' },
  ];

  for (const { pattern, title } of topics) {
    if (pattern.test(firstMessage)) {
      return title;
    }
  }

  // Fallback: truncate the message
  return firstMessage.length > 40
    ? firstMessage.substring(0, 37) + '...'
    : firstMessage;
}

/**
 * Detect if user message indicates a crisis situation
 * Uses advanced multi-layer detection system
 */
export function detectCrisis(message: string): { isCrisis: boolean; type?: string; result?: CrisisDetectionResult } {
  // Use advanced crisis detection system
  const result = advancedCrisisDetection(message);

  if (result.isCrisis) {
    // Map new types to legacy types for backwards compatibility
    const typeMapping: Record<string, string> = {
      'suicidal_ideation': 'suicidal',
      'self_harm': 'self-harm',
      'caregiver_burnout': 'despair',
      'domestic_violence': 'abuse',
      'child_safety': 'abuse',
      'mental_health_crisis': 'despair',
      'medical_emergency': 'medical',
    };

    return {
      isCrisis: true,
      type: result.type ? typeMapping[result.type] || result.type : 'unknown',
      result, // Include full result for advanced handling
    };
  }

  return { isCrisis: false };
}

/**
 * Get crisis response if needed
 * Enhanced with medical emergency support and better formatting
 */
export function getCrisisResponse(type: string): string {
  const responses: Record<string, string> = {
    suicidal: `I hear you, and I'm so grateful you're sharing this with me. What you're feeling is real and valid, and you don't have to face it alone.

**Please reach out right now:**
• **988 Suicide & Crisis Lifeline**: Call or text **988** (24/7)
• **Crisis Text Line**: Text **HOME to 741741**
• If you're in immediate danger, please call **911**

You matter. Your child needs you. Help is available right now, and reaching out is a sign of strength, not weakness.

I'm here with you. Would you like to talk about what's been overwhelming you?`,

    'self-harm': `I'm so sorry you're going through something this painful. Reaching out takes courage, and I want you to know you're not alone.

**If you're hurting right now, please contact:**
• **988 Suicide & Crisis Lifeline**: Call or text **988** (24/7)
• **Crisis Text Line**: Text **HOME to 741741**

Your pain is valid, and there are people who specialize in helping during these moments. Would you like to talk about what's been building up?`,

    despair: `I can hear how exhausted and overwhelmed you are. Caring for a child with special needs is incredibly hard, and feeling like you can't go on doesn't make you a bad parent—it makes you human.

**If these feelings are intense, please reach out:**
• **988 Suicide & Crisis Lifeline**: Call or text **988** (24/7)
• **Crisis Text Line**: Text **HOME to 741741**
• **Caregiver Action Network**: **1-855-227-3640**

You deserve support too. What would help most right now?`,

    abuse: `Your safety matters. If you or your child are in danger, please reach out for help immediately.

**Please contact:**
• **National Domestic Violence Hotline**: **1-800-799-7233** (24/7)
• **Text**: **START to 88788**
• If in immediate danger, call **911**

You deserve to be safe, and there are people ready to help. Would you like to talk about what's happening?`,

    medical: `This sounds like it could be a medical emergency.

**Please seek immediate help:**
• **Call 911** for medical emergencies
• **Poison Control**: **1-800-222-1222** (if poisoning is suspected)

If you can, please call for help right now. Is there someone with you who can assist?`,
  };

  return responses[type] || responses.despair;
}

export default {
  isAIAvailable,
  buildAminySystemPrompt,
  sendMessageToClaudeStreaming,
  sendMessageToClaude,
  generateConversationTitle,
  detectCrisis,
  getCrisisResponse,
};
