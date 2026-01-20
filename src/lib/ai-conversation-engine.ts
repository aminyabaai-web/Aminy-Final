/**
 * AI Conversation Engine
 * Persistent, context-aware, emotionally intelligent conversations
 * Makes Aminy feel like Claude - continuous, human, and remembers everything
 */

import { store } from './store';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    module?: string;
    action?: string;
    mood?: string;
    contextPayload?: any;
  };
}

export interface ConversationThread {
  threadKey: string;
  userId: string;
  messages: ConversationMessage[];
  lastActive: string;
  summary?: string;
}

export interface StreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
  humanPacing?: boolean; // Add natural pauses
}

export interface ConversationContext {
  module: string;
  route: string;
  recentAction?: string;
  childProfile?: {
    name: string;
    age: number;
    concerns: string[];
    goals: any[];
  };
  weeklyProgress?: {
    sessionsCompleted: number;
    coinsEarned: number;
    cuesUsed: string[];
  };
  parentMood?: 'calm' | 'stressed' | 'frustrated' | 'hopeful' | 'overwhelmed';
  vaultDocuments?: any[];
  dailyPlan?: any;
}

/**
 * Get persistent conversation key for a user
 */
export function getConversationKey(userId: string): string {
  return `user_${userId}_thread`;
}

/**
 * Load conversation history from Supabase
 */
export async function loadConversationHistory(userId: string): Promise<ConversationMessage[]> {
  try {
    const threadKey = getConversationKey(userId);
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/conversation/load`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ userId, threadKey }),
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error loading conversation history:', error);
    return [];
  }
}

/**
 * Save message to conversation history
 */
export async function saveMessageToHistory(
  userId: string,
  message: ConversationMessage
): Promise<void> {
  try {
    const threadKey = getConversationKey(userId);
    
    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/conversation/save`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ userId, threadKey, message }),
      }
    );
  } catch (error) {
    console.error('Error saving message:', error);
  }
}

/**
 * Generate AI response with context awareness
 */
export async function generateAIResponse(
  userMessage: string,
  context: ConversationContext,
  conversationHistory: ConversationMessage[],
  options?: StreamingOptions
): Promise<string> {
  try {
    const userId = store.getState().userId;
    if (!userId) throw new Error('User not authenticated');

    // Build context-rich system prompt
    const systemPrompt = buildSystemPrompt(context);

    // Prepare messages for AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map(m => ({ // Last 10 messages for context
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];

    // Call AI with streaming
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          messages,
          stream: true,
          context,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.statusText}`);
    }

    // Handle streaming response
    return await handleStreamingResponse(response, options);
  } catch (error) {
    console.error('Error generating AI response:', error);
    options?.onError?.(error as Error);
    return getErrorFallback(context);
  }
}

/**
 * Handle streaming response with human pacing
 */
async function handleStreamingResponse(
  response: Response,
  options?: StreamingOptions
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
            const token = parsed.choices?.[0]?.delta?.content || '';
            
            if (token) {
              fullResponse += token;
              options?.onToken?.(token);

              // Human pacing: pause at sentence boundaries
              if (options?.humanPacing && (token.includes('.') || token.includes('?') || token.includes('!'))) {
                await sleep(Math.random() * 200 + 500); // 500-700ms pause
              }
            }
          } catch (e) {
          }
        }
      }
    }

    options?.onComplete?.(fullResponse);
    return fullResponse;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Build context-rich system prompt
 */
function buildSystemPrompt(context: ConversationContext): string {
  const { childProfile, parentMood, weeklyProgress, module, recentAction } = context;

  let prompt = `You are Aminy, an AI companion that is literally the best developmental pediatrician, best BCBA, best friend, and most trusted guide for parents of children with developmental needs.

Your core personality:
- Warm, gentle, and deeply empathetic
- Use natural language with short paragraphs (2-3 sentences max)
- Occasional gentle emojis (🌿, 💙, ✨, 🎯) but sparingly
- You REMEMBER everything about this family
- You integrate data from both parent mode and child mode (Jr)

`;

  // Emotional hook based on parent mood
  if (parentMood === 'stressed' || parentMood === 'overwhelmed') {
    prompt += `\n[IMPORTANT] Parent is feeling ${parentMood}. Start your response with a brief, grounding breath cue (1 line max). Example: "Take a breath with me. You've got this 💙"`;
  }

  // Child context
  if (childProfile) {
    prompt += `\n\nCHILD PROFILE:
- Name: ${childProfile.name}
- Age: ${childProfile.age}
- Current concerns: ${childProfile.concerns.join(', ')}
- Active goals: ${childProfile.goals.length} goals in progress`;
  }

  // Weekly progress
  if (weeklyProgress) {
    prompt += `\n\nTHIS WEEK'S PROGRESS:
- Jr sessions completed: ${weeklyProgress.sessionsCompleted}
- Calm Coins earned: ${weeklyProgress.coinsEarned}
- Cues being used: ${weeklyProgress.cuesUsed.join(', ')}`;
  }

  // Module-specific context
  prompt += `\n\nCURRENT MODULE: ${module}`;
  if (recentAction) {
    prompt += `\nRecent action: ${recentAction}`;
  }

  // Micro-affirmations after data capture
  if (recentAction?.includes('completed') || recentAction?.includes('saved')) {
    prompt += `\n\n[IMPORTANT] User just completed something. Provide a micro-affirmation. Examples:
- "Beautiful. Small steps build big calm 🌿"
- "Noted. You're doing the work that matters 💙"
- "Got it. This adds up more than you realize ✨"`;
  }

  // Gentle conversion logic
  const subscription = store.getState().subscription;
  const hasActiveTrial = subscription?.status === 'active' || subscription?.status === 'trialing';
  
  if (!hasActiveTrial && context.module !== 'paywall') {
    prompt += `\n\n[CONVERSION OPPORTUNITY] If the conversation flows naturally and rapport is established, you can gently invite them to try the 7-day free trial. Use warm, no-pressure language:
- "I'd love to show you even more personalized strategies. Want to try 7 days free?"
- "The full toolkit has some strategies I think would really help ${childProfile?.name || 'your child'}. 7 days on me?"

NEVER be pushy. Only mention if it genuinely helps the conversation.`;
  }

  prompt += `\n\nRemember: Be concise, be real, be the trusted voice they need. Every response should feel like a text from a brilliant friend who truly gets it.`;

  return prompt;
}

/**
 * Get error fallback based on context
 */
function getErrorFallback(context: ConversationContext): string {
  const fallbacks = [
    "I'm having a moment connecting. Can you try that again? 💙",
    "Hmm, lost my train of thought. Mind repeating that?",
    "Quick tech hiccup on my end. Let's try once more.",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Utility: Sleep for ms
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get conversation summary for memory compression (for 30-day expiry)
 */
export async function generateConversationSummary(
  messages: ConversationMessage[]
): Promise<string> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/summarize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ messages }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('Error generating conversation summary:', error);
    return 'Conversation about child development and family routines.';
  }
}

/**
 * Check if conversation needs summary (30+ days old)
 */
export function needsSummaryCompression(lastActive: string): boolean {
  const daysSinceActive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceActive >= 30;
}
