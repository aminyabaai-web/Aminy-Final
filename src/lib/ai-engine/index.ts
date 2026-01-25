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

export default {
  sendMessage,
  getCurrentContext,
  isAIAvailable,
  rememberFact,
  getConversationHistory,
};
