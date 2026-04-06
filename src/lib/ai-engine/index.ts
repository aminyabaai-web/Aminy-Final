// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Aminy AI Engine - Main Export
 *
 * Unified AI service combining Claude client with conversation memory
 * Provides a simple interface for the UI components
 */

import {
  sendMessageToClaudeStreaming,
  sendMessageToClaude,
  buildAminySystemPrompt,
  detectCrisis,
  getCrisisResponse,
  generateConversationTitle,
  isAIAvailable,
  type ClaudeMessage,
  type StreamingCallbacks,
  type ConversationContext,
} from './claude-client';

import { buildParentAIContext } from '../parent-junior-bridge';
import { getScreeningResults } from '../screening-instruments';

import {
  saveConversation,
  loadRecentConversations,
  storeMemoryFact,
  getRelevantMemories,
  extractAndStoreFacts,
  buildMemoryContextString,
  saveConversationLocally,
  loadConversationLocally,
  type ConversationMessage,
  type Conversation,
  type MemoryCategory,
  type MemoryFact,
} from './conversation-memory';

import { useAminyStore } from '../store';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Re-export rich context (types + builder)
export { buildAIContext } from './rich-context';
export type { AminyAIContext } from './rich-context';

// Re-export clinical reports
export { generateClinicalReport } from './clinical-reports';

// Re-export conversation memory functions for direct consumers
export {
  storeMemoryFact,
  getRelevantMemories,
  saveConversation,
  loadRecentConversations,
  saveConversationLocally,
  loadConversationLocally,
} from './conversation-memory';

// Re-export streaming chat functions (from ai-conversation-engine, for StreamingAIChat.tsx)
// These use a server-side thread model — Phase 7 will refactor to use sendMessage() directly
export {
  loadConversationHistory,
  saveMessageToHistory,
  generateAIResponse as generateStreamingAIResponse,
  type ConversationMessage as StreamingChatMessage,
  type ConversationContext as StreamingChatContext,
  type StreamingOptions,
  type DailyUsageInfo,
} from '../ai-conversation-engine';

// Re-export types
export type {
  ClaudeMessage,
  StreamingCallbacks,
  ConversationContext,
  ConversationMessage,
  Conversation,
  MemoryCategory,
  MemoryFact,
};

export interface AIResponse {
  content: string;
  conversationId: string;
  title?: string;
  suggestions?: string[];
  crisisDetected?: boolean;
  crisisType?: string;
  memoryFactsUsed?: number;
}

export interface AIEngineOptions {
  userId: string;
  childId: string;
  conversationId?: string;
  enableMemory?: boolean;
  enableStreaming?: boolean;
  maxTokens?: number;
}

/**
 * Get the current conversation context from the store
 */
export function getCurrentContext(): ConversationContext {
  const state = useAminyStore.getState();

  // Get child info from user profile or stored state
  const childName = state.user?.childName || 'your child';
  const childAge = state.user?.childAge || 0;
  const parentName = state.user?.caregiverName || 'there';

  // Get goals from store
  const goalDescriptions = state.goals
    ?.filter(g => g.status === 'active')
    ?.map(g => g.description || g.title) || [];

  // Get tier from user profile
  const tier = state.user?.tier || 'starter';
  const mappedTier: ConversationContext['tier'] =
    tier === 'complete' ? 'pro' :
    tier === 'core' ? 'core' :
    'starter';

  // Build Junior activity context (feeds AI with child's practice data)
  const childId = state.user?.id ? `child-${state.user.id.substring(0, 8)}` : 'default';
  let juniorContext: string | undefined;
  try {
    const bridgeContext = buildParentAIContext(childId, mappedTier);
    if (bridgeContext.trim()) juniorContext = bridgeContext;
  } catch {
    // Bridge not available — no Junior data yet, which is fine
  }

  // Build screening results context (if parent has completed screenings)
  let screeningContext: string | undefined;
  try {
    const screenings = getScreeningResults();
    if (screenings.length > 0) {
      const recent = screenings.slice(-3); // Last 3 screenings
      screeningContext = recent.map(s =>
        `${s.instrumentName} (${new Date(s.completedAt).toLocaleDateString()}): Score ${s.totalScore} — ${s.riskLevel} risk. ${s.summary}`
      ).join('\n');
    }
  } catch {
    // Screening data not available
  }

  return {
    childName,
    childAge,
    concerns: [], // Would come from onboarding data
    goals: goalDescriptions,
    diagnoses: [], // Would come from health profile
    communicationLevel: 'developing',
    sensoryProfile: undefined,
    parentName,
    recentTopics: [],
    tier: mappedTier,
    juniorContext,
    screeningContext,
  };
}

/**
 * Main function to send a message and get an AI response with streaming
 */
export async function sendMessage(
  message: string,
  conversationHistory: ConversationMessage[],
  options: AIEngineOptions,
  callbacks?: StreamingCallbacks
): Promise<AIResponse> {
  const {
    userId,
    childId,
    conversationId = `conv-${Date.now()}`,
    enableMemory = true,
    maxTokens = 1024,
  } = options;

  // Get current context
  const context = getCurrentContext();

  // Check for crisis situation first
  const crisis = detectCrisis(message);
  if (crisis.isCrisis && crisis.type) {
    const crisisResponse = getCrisisResponse(crisis.type);

    // Save to conversation history
    const newMessages: ConversationMessage[] = [
      ...conversationHistory,
      { id: `${Date.now()}-user`, role: 'user', content: message, timestamp: new Date().toISOString() },
      { id: `${Date.now()}-assistant`, role: 'assistant', content: crisisResponse, timestamp: new Date().toISOString() },
    ];

    // Save conversation
    await saveConversation(userId, childId, {
      id: conversationId,
      messages: newMessages,
      topics: ['crisis-support'],
    });

    // Trigger complete callback immediately for crisis responses
    callbacks?.onComplete?.(crisisResponse);

    return {
      content: crisisResponse,
      conversationId,
      crisisDetected: true,
      crisisType: crisis.type,
    };
  }

  // Get relevant memories for enhanced context
  let memoryContext = '';
  let memoryFactsUsed = 0;

  if (enableMemory) {
    try {
      const memories = await getRelevantMemories(userId, childId, message, undefined, 15);
      if (memories.length > 0) {
        memoryContext = buildMemoryContextString(memories);
        memoryFactsUsed = memories.length;
      }
    } catch (error) {
      console.warn('Could not load memories:', error);
    }
  }

  // Build enhanced system prompt with memories
  let systemPrompt = buildAminySystemPrompt(context);
  if (memoryContext) {
    systemPrompt += `\n\n═══════════════════════════════════════════════════════════════
LONG-TERM MEMORY (What you remember about this family)
═══════════════════════════════════════════════════════════════
${memoryContext}`;
  }

  // Inject Junior activity context so parent AI knows about child's practice
  try {
    const juniorContext = buildParentAIContext(childId, context.tier);
    if (juniorContext) {
      systemPrompt += `\n\n${juniorContext}`;
    }
  } catch (error) {
    // Non-critical — parent AI still works without Junior data
  }

  // Convert history to Claude format
  const claudeMessages: ClaudeMessage[] = conversationHistory.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Add the new user message
  claudeMessages.push({ role: 'user', content: message });

  // Send to Claude with streaming
  try {
    let fullResponse = '';

    if (callbacks) {
      fullResponse = await sendMessageToClaudeStreaming(
        claudeMessages,
        context,
        callbacks,
        { maxTokens, systemPrompt }
      );
    } else {
      fullResponse = await sendMessageToClaude(
        claudeMessages,
        context,
        { maxTokens, systemPrompt }
      );
    }

    // Generate title if this is the first message
    const title = conversationHistory.length === 0
      ? generateConversationTitle(message)
      : undefined;

    // Generate follow-up suggestions
    const suggestions = generateSuggestions(message, fullResponse, context);

    // Save conversation with new messages
    const newMessages: ConversationMessage[] = [
      ...conversationHistory,
      { id: `${Date.now()}-user`, role: 'user', content: message, timestamp: new Date().toISOString() },
      { id: `${Date.now()}-assistant`, role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
    ];

    // Save to backend (async, don't await)
    saveConversation(userId, childId, {
      id: conversationId,
      title: title || conversationHistory[0]?.content?.slice(0, 40),
      messages: newMessages,
      topics: extractTopics(message, fullResponse),
    }).catch(err => console.warn('Failed to save conversation:', err));

    // Extract and store facts (async, don't await)
    if (enableMemory) {
      extractAndStoreFacts(userId, childId, newMessages).catch(
        err => console.warn('Failed to extract facts:', err)
      );
    }

    // Also save locally for offline access
    saveConversationLocally(conversationId, {
      id: conversationId,
      userId,
      childId,
      title: title || 'Conversation',
      messages: newMessages,
      topics: extractTopics(message, fullResponse),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      content: fullResponse,
      conversationId,
      title,
      suggestions,
      memoryFactsUsed,
    };
  } catch (error) {
    console.error('AI Engine error:', error);

    // Return fallback response
    const fallbackResponse = getFallbackResponse(context);
    callbacks?.onError?.(error as Error);

    return {
      content: fallbackResponse,
      conversationId,
    };
  }
}

/**
 * Generate contextual suggestions for follow-up
 */
function generateSuggestions(
  userMessage: string,
  aiResponse: string,
  context: ConversationContext
): string[] {
  const combined = `${userMessage} ${aiResponse}`.toLowerCase();
  const suggestions: string[] = [];

  // Topic-based suggestions
  if (combined.includes('routine') || combined.includes('schedule')) {
    suggestions.push('Create a visual schedule');
    suggestions.push('Transition strategies');
  } else if (combined.includes('behavior') || combined.includes('meltdown')) {
    suggestions.push('Prevention strategies');
    suggestions.push('Calming techniques');
  } else if (combined.includes('communication') || combined.includes('speech')) {
    suggestions.push('Communication games');
    suggestions.push('Visual supports');
  } else if (combined.includes('school') || combined.includes('iep')) {
    suggestions.push('IEP meeting prep');
    suggestions.push('Teacher communication tips');
  } else if (combined.includes('sensory')) {
    suggestions.push('Sensory toolkit ideas');
    suggestions.push('Environment modifications');
  }

  // Proactive caregiver discovery — detect diagnosis + burnout/financial stress keywords
  const burnoutKeywords = ['overwhelmed', 'exhausted', 'burned out', 'burnout', 'can\'t afford', 'too expensive', 'insurance won\'t', 'financial', 'paying for', 'help paying', 'tired', 'alone', 'struggling'];
  const hasDiagnosis = context.diagnoses && context.diagnoses.length > 0;
  const hasBurnoutSignal = burnoutKeywords.some(kw => combined.includes(kw));

  if (hasDiagnosis && hasBurnoutSignal) {
    suggestions.push('Check paid caregiver eligibility');
    suggestions.push('Explore insurance benefits');
  } else if (combined.includes('caregiver') || combined.includes('paid') || combined.includes('medicaid') || combined.includes('waiver')) {
    suggestions.push('Check paid caregiver eligibility');
  }

  // Always add a general follow-up option
  if (suggestions.length < 2) {
    suggestions.push(`More strategies for ${context.childName}`);
    suggestions.push('Tell me more about this');
  }

  return suggestions.slice(0, 4);
}

/**
 * Extract topics from conversation
 */
function extractTopics(userMessage: string, aiResponse: string): string[] {
  const combined = `${userMessage} ${aiResponse}`.toLowerCase();
  const topics: string[] = [];

  const topicPatterns = [
    { pattern: /routine|schedule/i, topic: 'routines' },
    { pattern: /behavior|meltdown/i, topic: 'behavior' },
    { pattern: /communication|speech/i, topic: 'communication' },
    { pattern: /school|iep/i, topic: 'school' },
    { pattern: /sensory/i, topic: 'sensory' },
    { pattern: /sleep|bedtime/i, topic: 'sleep' },
    { pattern: /eating|food/i, topic: 'feeding' },
    { pattern: /anxiety/i, topic: 'anxiety' },
    { pattern: /social|friends/i, topic: 'social' },
    { pattern: /therapy|aba/i, topic: 'therapy' },
  ];

  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(combined)) {
      topics.push(topic);
    }
  }

  return topics.length > 0 ? topics : ['general'];
}

/**
 * Get fallback response when AI is unavailable
 */
function getFallbackResponse(context: ConversationContext): string {
  const fallbacks = [
    `I'm having trouble connecting right now, but I'm here for you and ${context.childName}. Can you try asking again in a moment?`,
    `I want to give you the best response for ${context.childName}, but I'm having a connection issue. Please try again shortly.`,
    `My connection hiccuped! I'm still here to help with ${context.childName}. Mind trying that again?`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Quick check if AI is available
 */
export { isAIAvailable };

/**
 * Store a memory fact manually
 */
export async function rememberFact(
  userId: string,
  childId: string,
  category: MemoryCategory,
  content: string
): Promise<boolean> {
  return storeMemoryFact(userId, childId, {
    category,
    content,
    source: 'manual',
    confidence: 0.95,
  });
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  userId: string,
  limit: number = 10
): Promise<Conversation[]> {
  return loadRecentConversations(userId, limit);
}

// ============================================================================
// Brain-compatible wrappers (for consumers migrating from aminy-ai-brain.ts)
// ============================================================================

/**
 * Generate contextual AI response using the rich context builder.
 * Drop-in replacement for aminy-ai-brain.ts generateContextualAIResponse().
 */
export async function generateContextualAIResponse(
  userMessage: string,
  conversationHistory: { role: string; content: string }[]
): Promise<string> {
  const { buildAIContext: buildRichContext } = await import('./rich-context');
  const context = await buildRichContext();
  const systemPrompt = buildContextualSystemPrompt(context);

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userMessage,
          conversationHistory,
          systemPrompt
        })
      }
    );

    if (!response.ok) {
      let errorMessage = `Server returned ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!data.message) throw new Error('Invalid response format from server');
    return data.message;
  } catch (error) {
    console.error('AI response error:', error);
    return `I'm having trouble connecting right now. Can you try asking again in a moment?`;
  }
}

/**
 * Build the contextual system prompt from rich context.
 * Used by generateContextualAIResponse().
 */
function buildContextualSystemPrompt(context: import('./rich-context').AminyAIContext): string {
  return `You are Aminy — the world's most caring AI companion for parents of neurodivergent children.

CHILD: ${context.child.name}
• Age: ${context.child.age} years old
• Communication: ${context.child.communicationLevel}
${context.child.diagnoses.length > 0 ? `• Diagnoses: ${context.child.diagnoses.join(', ')}` : ''}
• Strengths: ${context.child.strengths.join(', ') || 'Still discovering their unique gifts'}
• Working on: ${context.child.concerns.join(', ') || 'General developmental support'}
• Current Goals: ${context.child.currentGoals.map(g => `${g.area}: ${g.description}`).join('; ') || 'Goals being developed'}

PARENT: ${context.parentProfile.name}
• Primary concerns: ${context.parentProfile.primaryConcerns.join(', ') || 'Supporting their child'}

TODAY'S PLAN:
${context.dailyPlan.todaysFocus.length > 0
  ? `Focus: ${context.dailyPlan.todaysFocus.map(a => a.title).join(', ')}`
  : 'No specific plan yet — offer to help create one!'}

MEMORY:
Recent topics: ${context.memory.conversations.slice(-5).map(c => c.topic).join(', ') || 'First conversations'}
What's worked: ${context.memory.successfulStrategies.slice(0, 3).map(s => s.description).join('; ') || 'Still learning'}

GUIDELINES:
1. BE PERSONAL — Always use ${context.child.name}'s name
2. BE SPECIFIC — Reference actual data, not generic advice
3. BE WARM — Validate feelings, celebrate wins
4. BE ACTIONABLE — Give 2-3 concrete steps
5. If crisis detected, provide 988 Lifeline immediately`;
}

/**
 * Store a conversation for memory.
 * Drop-in replacement for aminy-ai-brain.ts storeConversation().
 */
export async function storeConversation(
  messages: { role: string; content: string }[],
  topic: string,
  outcome?: string
): Promise<void> {
  const state = useAminyStore.getState();
  const childId = state.currentChildId || (state.children ?? [])[0]?.id;
  const userId = state.user?.id;

  if (!childId || !userId) return;

  const conversationId = `conv-${Date.now()}`;

  // Save via conversation memory
  await saveConversation(userId, childId, {
    id: conversationId,
    title: topic,
    messages: messages.map((m, i) => ({
      id: `${conversationId}-${i}`,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: new Date().toISOString(),
    })),
    topics: [topic],
  });
}

/**
 * Store a memory fact with brain-compatible signature.
 * Drop-in replacement for aminy-ai-brain.ts storeMemoryFact().
 */
export async function storeMemoryFactCompat(
  childId: string,
  category: 'preference' | 'trigger' | 'strength' | 'challenge' | 'milestone' | 'strategy' | 'medical' | 'educational',
  content: string,
  source: 'conversation' | 'onboarding' | 'vault' | 'provider' | 'manual' = 'manual',
  confidence: number = 0.8
): Promise<void> {
  const state = useAminyStore.getState();
  const userId = state.user?.id;
  if (!userId) return;

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/store`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId
        },
        body: JSON.stringify({
          childId,
          category,
          content,
          source,
          confidence,
          expiresAt: null
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to store memory fact: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to store memory fact:', error);
  }
}

/**
 * Get all memory facts for a child.
 * Drop-in replacement for aminy-ai-brain.ts getMemoryFacts().
 */
export async function getMemoryFacts(childId: string): Promise<Record<string, unknown>[]> {
  const state = useAminyStore.getState();
  const userId = state.user?.id;
  if (!userId) return [];

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/recent?limit=50`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get memory facts: ${response.status}`);
    }

    const data = await response.json();
    return data.memories || [];
  } catch (error) {
    console.error('Failed to get memory facts:', error);
    return [];
  }
}

export default {
  sendMessage,
  getCurrentContext,
  isAIAvailable,
  rememberFact,
  getConversationHistory,
  generateContextualAIResponse,
  storeConversation,
  storeMemoryFactCompat,
  getMemoryFacts,
};
