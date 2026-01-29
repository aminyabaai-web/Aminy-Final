/**
 * AI Context Enhancer
 *
 * Integrates vector embeddings and fact extraction to provide
 * richer, more personalized context for AI conversations.
 */

import {
  embeddingStore,
  indexMessage,
  indexFact,
  searchRelevantContext,
  buildSemanticContext,
  SemanticSearchResult,
} from './vector-embeddings';

import {
  extractFactsFromMessage,
  extractFactsFromConversation,
  getTopFacts,
  formatFactsForContext,
  ExtractedFact,
} from './fact-extraction';

import { memoryManager, MemoryFact } from './memory-system';
import type { TierType } from './tier-utils';

// ============================================
// TYPES
// ============================================

export interface EnhancedContext {
  semanticContext: string;
  extractedFacts: ExtractedFact[];
  memoryContext: string;
  relevantHistory: SemanticSearchResult[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// ============================================
// CONTEXT ENHANCEMENT
// ============================================

/**
 * Get enhanced context for a user query using semantic search
 * and fact-based memory
 */
export function getEnhancedContext(
  childId: string,
  userQuery: string,
  tier: TierType
): EnhancedContext {
  // 1. Semantic search for relevant past context
  const relevantHistory = searchRelevantContext(childId, userQuery, 5);
  const semanticContext = buildSemanticContext(relevantHistory);

  // 2. Get memory-based context
  const memoryContext = memoryManager.generateAIContext(childId, tier);

  // 3. Extract any facts from the current query
  const extractedFacts = extractFactsFromMessage(userQuery, 'current');

  return {
    semanticContext,
    extractedFacts,
    memoryContext,
    relevantHistory,
  };
}

/**
 * Build a complete context string for the AI system prompt
 */
export function buildEnhancedContextString(
  childId: string,
  userQuery: string,
  tier: TierType
): string {
  const enhanced = getEnhancedContext(childId, userQuery, tier);

  let contextParts: string[] = [];

  // Add memory context (facts about the child)
  if (enhanced.memoryContext) {
    contextParts.push('=== What I Remember About This Family ===');
    contextParts.push(enhanced.memoryContext);
  }

  // Add semantically relevant history
  if (enhanced.semanticContext && enhanced.relevantHistory.length > 0) {
    contextParts.push('\n=== Relevant Past Conversations ===');
    contextParts.push(enhanced.semanticContext);
  }

  return contextParts.join('\n');
}

// ============================================
// POST-CONVERSATION PROCESSING
// ============================================

/**
 * Process a conversation after it ends to extract and store facts
 */
export function processConversation(
  childId: string,
  messages: ConversationMessage[],
  tier: TierType
): {
  factsExtracted: number;
  messagesIndexed: number;
} {
  let factsExtracted = 0;
  let messagesIndexed = 0;

  // Index all messages for semantic search
  messages.forEach((msg, idx) => {
    // Determine emotional context based on message content
    const emotionalContext = detectEmotionalContext(msg.content);

    indexMessage(
      childId,
      msg.content,
      msg.role,
      emotionalContext
    );
    messagesIndexed++;
  });

  // Extract facts from user messages
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => ({ author: 'user', content: m.content }));

  const extractedFacts = extractFactsFromConversation(userMessages);

  // Store top facts in memory system
  const topFacts = getTopFacts(extractedFacts, 5);

  topFacts.forEach(fact => {
    // Check if similar fact already exists
    const existingFacts = memoryManager.getFacts(childId, tier);
    const isDuplicate = existingFacts.some(ef =>
      ef.category === fact.category &&
      isSimilarContent(ef.content, fact.content)
    );

    if (!isDuplicate) {
      memoryManager.addFact({
        childId,
        category: fact.category,
        content: fact.content,
        source: 'conversation',
        confidence: fact.confidence,
      });

      // Also index for semantic search
      indexFact(childId, fact.content, fact.category);

      factsExtracted++;
    }
  });

  return { factsExtracted, messagesIndexed };
}

/**
 * Simple similarity check for fact deduplication
 */
function isSimilarContent(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, '').trim();

  const aNorm = normalize(a);
  const bNorm = normalize(b);

  if (aNorm === bNorm) return true;
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return true;

  return false;
}

/**
 * Detect emotional context from message content
 */
function detectEmotionalContext(
  content: string
): 'positive' | 'neutral' | 'stressed' | 'crisis' {
  const lower = content.toLowerCase();

  // Crisis indicators
  if (
    lower.includes('hurt myself') ||
    lower.includes('harm myself') ||
    lower.includes('want to die') ||
    lower.includes('suicidal') ||
    lower.includes("can't go on") ||
    lower.includes('end it all')
  ) {
    return 'crisis';
  }

  // Stressed indicators
  if (
    lower.includes("can't handle") ||
    lower.includes('overwhelmed') ||
    lower.includes("don't know what to do") ||
    lower.includes('at my wit') ||
    lower.includes('breaking point') ||
    lower.includes('so frustrated') ||
    lower.includes('exhausted') ||
    lower.includes('burned out') ||
    lower.includes('meltdown') ||
    lower.includes('falling apart')
  ) {
    return 'stressed';
  }

  // Positive indicators
  if (
    lower.includes('great day') ||
    lower.includes('breakthrough') ||
    lower.includes('so proud') ||
    lower.includes('amazing') ||
    lower.includes('finally') ||
    lower.includes('first time') ||
    lower.includes('worked!') ||
    lower.includes('thank you') ||
    lower.includes('grateful') ||
    lower.includes('happy')
  ) {
    return 'positive';
  }

  return 'neutral';
}

// ============================================
// REAL-TIME FACT EXTRACTION DURING CHAT
// ============================================

/**
 * Process a single message in real-time during conversation
 * Returns any facts that should be surfaced to the AI
 */
export function processMessageInRealTime(
  childId: string,
  message: string,
  role: 'user' | 'assistant'
): {
  facts: ExtractedFact[];
  emotionalContext: string;
  shouldAlertCrisis: boolean;
} {
  const emotionalContext = detectEmotionalContext(message);
  const shouldAlertCrisis = emotionalContext === 'crisis';

  // Only extract facts from user messages
  if (role !== 'user') {
    return { facts: [], emotionalContext, shouldAlertCrisis };
  }

  const facts = extractFactsFromMessage(message);

  return {
    facts,
    emotionalContext,
    shouldAlertCrisis,
  };
}

// ============================================
// CONVERSATION SUMMARIZATION
// ============================================

/**
 * Generate a summary of a conversation for long-term memory
 */
export function summarizeConversation(
  messages: ConversationMessage[]
): {
  summary: string;
  keyTopics: string[];
  emotionalArc: string;
} {
  // Extract key topics from user messages
  const userContent = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ');

  // Simple topic extraction based on keywords
  const keyTopics: string[] = [];
  const topicPatterns = [
    { pattern: /meltdown|tantrum|behavior/i, topic: 'behavioral challenges' },
    { pattern: /sleep|bedtime|night/i, topic: 'sleep issues' },
    { pattern: /school|teacher|class/i, topic: 'school' },
    { pattern: /therapy|therapist|aba|bcba/i, topic: 'therapy' },
    { pattern: /sensory|noise|texture|light/i, topic: 'sensory' },
    { pattern: /communicate|speak|words|language/i, topic: 'communication' },
    { pattern: /anxiety|worry|fear|scared/i, topic: 'anxiety' },
    { pattern: /friend|social|play date/i, topic: 'social skills' },
    { pattern: /food|eating|meal/i, topic: 'eating/food' },
    { pattern: /toilet|potty|bathroom/i, topic: 'toileting' },
  ];

  topicPatterns.forEach(({ pattern, topic }) => {
    if (pattern.test(userContent) && !keyTopics.includes(topic)) {
      keyTopics.push(topic);
    }
  });

  // Determine emotional arc
  const emotionalStates = messages.map(m => detectEmotionalContext(m.content));
  const startEmotion = emotionalStates[0] || 'neutral';
  const endEmotion = emotionalStates[emotionalStates.length - 1] || 'neutral';

  let emotionalArc = 'steady';
  if (startEmotion === 'stressed' && endEmotion === 'positive') {
    emotionalArc = 'improved';
  } else if (startEmotion === 'positive' && endEmotion === 'stressed') {
    emotionalArc = 'declined';
  } else if (emotionalStates.includes('crisis')) {
    emotionalArc = 'crisis-support';
  }

  // Generate summary
  const topicsText = keyTopics.length > 0
    ? `Topics: ${keyTopics.join(', ')}`
    : 'General conversation';

  const summary = `${topicsText}. Emotional arc: ${emotionalArc}. ${messages.length} messages exchanged.`;

  return {
    summary,
    keyTopics,
    emotionalArc,
  };
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the context enhancement system for a child
 * Called when the app loads or user signs in
 */
export function initializeContextEnhancement(childId: string): void {
  // Check if we need to rebuild the vocabulary
  const stats = embeddingStore.getStats(childId);

  if (stats.totalEmbeddings === 0) {
    console.log('[ContextEnhancer] No embeddings found, will build as conversations happen');
  } else {
    console.log(`[ContextEnhancer] Loaded ${stats.totalEmbeddings} embeddings for child ${childId}`);
  }
}

/**
 * Clean up old data to manage storage
 */
export function cleanupOldData(childId: string, tier: TierType): void {
  // Clean up based on tier limits
  const maxAgeDays = tier === 'free' ? 14 : tier === 'starter' ? 30 : 90;

  embeddingStore.cleanup(childId, maxAgeDays);
  memoryManager.cleanupExpiredMemories(childId, tier);

  console.log(`[ContextEnhancer] Cleaned up data older than ${maxAgeDays} days`);
}
