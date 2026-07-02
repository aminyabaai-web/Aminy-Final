// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Conversation Memory System for Aminy
 *
 * Persists conversations to Supabase with semantic search capability
 * Enables long-term memory and context retrieval for better AI responses
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { syncEncryptedStorage } from '../security/encrypted-storage';

// Types
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    topic?: string;
    sentiment?: 'positive' | 'neutral' | 'negative' | 'concerned';
    hasActionItems?: boolean;
    confidence?: number;
  };
}

export interface Conversation {
  id: string;
  userId: string;
  childId: string;
  title: string;
  messages: ConversationMessage[];
  summary?: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryFact {
  id: string;
  userId: string;
  childId: string;
  category: MemoryCategory;
  content: string;
  source: MemorySource;
  confidence: number;
  createdAt: string;
  expiresAt?: string | null;
}

export type MemoryCategory =
  | 'preference'
  | 'trigger'
  | 'strength'
  | 'challenge'
  | 'milestone'
  | 'strategy'
  | 'medical'
  | 'educational'
  | 'routine'
  | 'relationship';

export type MemorySource =
  | 'conversation'
  | 'onboarding'
  | 'vault'
  | 'provider'
  | 'manual'
  | 'inferred';

// Backend URL
const getBackendUrl = () => `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

/**
 * KV thread key for a user's saved conversations.
 *
 * CONTRACT (M5): the edge routes in new-routes.tsx are thin KV wrappers —
 * POST /conversation/save expects { userId, threadKey, message } and APPENDS
 * `message` to the array stored at `threadKey` (capped at 100 entries);
 * POST /conversation/load expects { userId, threadKey } and returns
 * { messages: [...] }. We store one Conversation SNAPSHOT per save, then
 * dedupe by conversation id (keeping the newest snapshot) on load.
 */
const conversationThreadKey = (userId: string) => `conversations:${userId}`;

/**
 * Save a conversation to the database
 */
export async function saveConversation(
  userId: string,
  childId: string,
  conversation: Partial<Conversation>
): Promise<string | null> {
  try {
    const snapshot = {
      ...conversation,
      userId,
      childId,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${getBackendUrl()}/conversation/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'X-User-Id': userId,
      },
      // Shape matches the /conversation/save route: { userId, threadKey, message }
      body: JSON.stringify({
        userId,
        threadKey: conversationThreadKey(userId),
        message: snapshot,
      }),
    });

    if (!response.ok) {
      console.error('Failed to save conversation:', await response.text());
      return null;
    }

    // Route returns { success: true } — the id is client-generated
    return conversation.id || null;
  } catch (error) {
    console.error('Error saving conversation:', error);
    return null;
  }
}

/**
 * Load recent conversations for a user (most recent first)
 */
export async function loadRecentConversations(
  userId: string,
  limit: number = 10
): Promise<Conversation[]> {
  try {
    const response = await fetch(
      `${getBackendUrl()}/conversation/load`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId,
        },
        // Shape matches the /conversation/load route: { userId, threadKey }
        body: JSON.stringify({ userId, threadKey: conversationThreadKey(userId) }),
      }
    );

    if (!response.ok) {
      return [];
    }

    // Route returns { messages } — an append-only array of Conversation
    // snapshots. Dedupe by conversation id keeping the newest snapshot.
    const data = await response.json();
    return dedupeConversationSnapshots(data.messages || []).slice(0, limit);
  } catch (error) {
    console.error('Error loading conversations:', error);
    return [];
  }
}

/**
 * Dedupe an append-only list of conversation snapshots: keep the LAST (newest)
 * snapshot per conversation id, ordered most-recently-updated first.
 * Exported for contract tests.
 */
export function dedupeConversationSnapshots(snapshots: Array<Partial<Conversation>>): Conversation[] {
  const byId = new Map<string, Partial<Conversation>>();
  for (const snap of snapshots) {
    if (snap && snap.id) byId.set(snap.id, snap); // later snapshots overwrite earlier
  }
  return Array.from(byId.values())
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .map(snap => ({
      id: snap.id!,
      userId: snap.userId || '',
      childId: snap.childId || '',
      title: snap.title || 'Conversation',
      messages: snap.messages || [],
      summary: snap.summary,
      topics: snap.topics || [],
      createdAt: snap.createdAt || snap.updatedAt || new Date().toISOString(),
      updatedAt: snap.updatedAt || new Date().toISOString(),
    }));
}

/**
 * Load a specific conversation by ID.
 * There is no GET /conversation/:id route on the edge fn — resolve from the
 * user's conversation thread, falling back to the local (offline) copy.
 */
export async function loadConversation(
  conversationId: string,
  userId: string
): Promise<Conversation | null> {
  try {
    const recent = await loadRecentConversations(userId, 100);
    const match = recent.find(conv => conv.id === conversationId);
    if (match) return match;
    return loadConversationLocally(conversationId);
  } catch (error) {
    console.error('Error loading conversation:', error);
    return loadConversationLocally(conversationId);
  }
}

/**
 * Store a memory fact for long-term retention
 */
export async function storeMemoryFact(
  userId: string,
  childId: string,
  fact: {
    category: MemoryCategory;
    content: string;
    source?: MemorySource;
    confidence?: number;
  }
): Promise<boolean> {
  try {
    const response = await fetch(`${getBackendUrl()}/memory/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        userId,
        childId,
        category: fact.category,
        content: fact.content,
        source: fact.source || 'conversation',
        confidence: fact.confidence || 0.8,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error storing memory fact:', error);
    return false;
  }
}

/**
 * Get relevant memory facts for context
 */
export async function getRelevantMemories(
  userId: string,
  childId: string,
  query?: string,
  categories?: MemoryCategory[],
  limit: number = 20
): Promise<MemoryFact[]> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (query) params.append('query', query);
    if (categories) params.append('categories', categories.join(','));

    const response = await fetch(
      `${getBackendUrl()}/memory/recent?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Id': userId,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    // /memory/recent returns raw memory_facts rows (snake_case, fact text in
    // `value`) — map to the client MemoryFact shape and drop expired rows.
    const data = await response.json();
    const now = Date.now();
    return ((data.memories || []) as Array<Record<string, unknown>>)
      .map(row => ({
        id: String(row.id ?? ''),
        userId: String(row.user_id ?? userId),
        childId: String(row.child_id ?? childId ?? ''),
        category: normalizeCategory(String(row.category ?? 'challenge')),
        content: String(row.value ?? row.content ?? ''),
        source: (row.source as MemorySource) || 'conversation',
        confidence: typeof row.confidence === 'number' ? row.confidence : 0.8,
        createdAt: String(row.created_at ?? row.extracted_at ?? new Date().toISOString()),
        expiresAt: (row.expires_at as string | null) ?? null,
      }))
      .filter(f => f.content && (!f.expiresAt || new Date(f.expiresAt).getTime() > now));
  } catch (error) {
    console.error('Error getting memories:', error);
    return [];
  }
}

/**
 * Search memories by query.
 * NOTE (M5): there is no /memory/search route on the edge function — the old
 * implementation POSTed to it, always 404ed, and fell back anyway. Go straight
 * to recency-based retrieval via /memory/recent.
 */
export async function searchMemoriesSemantic(
  userId: string,
  query: string,
  limit: number = 10
): Promise<MemoryFact[]> {
  return getRelevantMemories(userId, '', query, undefined, limit);
}

/**
 * Extract and store facts from a conversation
 * Uses AI-powered extraction when available for better accuracy
 */
export async function extractAndStoreFacts(
  userId: string,
  childId: string,
  messages: ConversationMessage[],
  useAI: boolean = true
): Promise<{ stored: number; extracted: number }> {
  // Extract facts from the conversation (AI with regex fallback)
  const extractedFacts = await extractFactsEnhanced(messages, useAI);

  // Store each fact
  let stored = 0;
  for (const fact of extractedFacts) {
    const success = await storeMemoryFact(userId, childId, fact);
    if (success) stored++;
  }

  if (import.meta.env.DEV) console.log(`[Memory] Stored ${stored}/${extractedFacts.length} facts`);
  return { stored, extracted: extractedFacts.length };
}

/**
 * Extract facts from conversation messages (regex fallback)
 */
function extractFactsFromMessagesRegex(
  messages: ConversationMessage[]
): Array<{ category: MemoryCategory; content: string; confidence: number }> {
  const facts: Array<{ category: MemoryCategory; content: string; confidence: number }> = [];
  const userMessages = messages.filter(m => m.role === 'user');

  for (const message of userMessages) {
    const content = message.content.toLowerCase();

    // Extract preferences
    if (/\b(likes?|loves?|enjoys?|prefers?|favorite)\b/.test(content)) {
      facts.push({
        category: 'preference',
        content: message.content,
        confidence: 0.8,
      });
    }

    // Extract triggers
    if (/\b(triggers?|upset|meltdown|tantrum|freaks? out|can'?t handle)\b/.test(content)) {
      facts.push({
        category: 'trigger',
        content: message.content,
        confidence: 0.85,
      });
    }

    // Extract strengths
    if (/\b(good at|strength|excels?|amazing at|talented)\b/.test(content)) {
      facts.push({
        category: 'strength',
        content: message.content,
        confidence: 0.8,
      });
    }

    // Extract challenges
    if (/\b(struggles?|difficult|hard|challenge|problem|issue)\b/.test(content)) {
      facts.push({
        category: 'challenge',
        content: message.content,
        confidence: 0.85,
      });
    }

    // Extract milestones
    if (/\b(first time|finally|milestone|achieved|accomplished|learned to)\b/.test(content)) {
      facts.push({
        category: 'milestone',
        content: message.content,
        confidence: 0.9,
      });
    }

    // Extract successful strategies
    if (/\b(worked|helped|success|tried and|effective)\b/.test(content)) {
      facts.push({
        category: 'strategy',
        content: message.content,
        confidence: 0.75,
      });
    }

    // Extract routine information
    if (/\b(routine|schedule|every (day|morning|night)|usually|always)\b/.test(content)) {
      facts.push({
        category: 'routine',
        content: message.content,
        confidence: 0.7,
      });
    }
  }

  return facts;
}

/**
 * AI-powered fact extraction from conversation messages
 * Uses AI to extract structured facts with higher accuracy than regex
 */
async function extractFactsWithAI(
  messages: ConversationMessage[]
): Promise<Array<{ category: MemoryCategory; content: string; confidence: number }>> {
  try {
    const conversationText = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n');

    if (conversationText.length < 20) {
      return []; // Not enough content to extract
    }

    const response = await fetch(`${getBackendUrl()}/ai/extract-facts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        conversation: conversationText,
        extractionPrompt: FACT_EXTRACTION_PROMPT,
      }),
    });

    if (!response.ok) {
      console.warn('[Memory] AI extraction failed, falling back to regex');
      return extractFactsFromMessagesRegex(messages);
    }

    const data = await response.json();
    const facts = data.facts || [];

    // Validate and normalize the facts
    return facts.map((fact: { category: string; content: string; confidence: number }) => ({
      category: normalizeCategory(fact.category),
      content: fact.content.substring(0, 500), // Limit content length
      confidence: Math.min(Math.max(fact.confidence || 0.7, 0), 1), // Clamp 0-1
    }));
  } catch (error) {
    console.error('[Memory] AI fact extraction error:', error);
    return extractFactsFromMessagesRegex(messages);
  }
}

/**
 * Normalize category string to valid MemoryCategory
 */
function normalizeCategory(category: string): MemoryCategory {
  const normalized = category.toLowerCase().trim();
  const validCategories: MemoryCategory[] = [
    'preference', 'trigger', 'strength', 'challenge',
    'milestone', 'strategy', 'medical', 'educational',
    'routine', 'relationship'
  ];

  if (validCategories.includes(normalized as MemoryCategory)) {
    return normalized as MemoryCategory;
  }

  // Map common variations
  const categoryMap: Record<string, MemoryCategory> = {
    'like': 'preference',
    'likes': 'preference',
    'love': 'preference',
    'enjoy': 'preference',
    'fear': 'trigger',
    'anxiety': 'trigger',
    'worry': 'trigger',
    'meltdown': 'trigger',
    'skill': 'strength',
    'ability': 'strength',
    'talent': 'strength',
    'difficulty': 'challenge',
    'struggle': 'challenge',
    'problem': 'challenge',
    'achievement': 'milestone',
    'progress': 'milestone',
    'success': 'milestone',
    'technique': 'strategy',
    'approach': 'strategy',
    'method': 'strategy',
    'diagnosis': 'medical',
    'medication': 'medical',
    'therapy': 'medical',
    'school': 'educational',
    'iep': 'educational',
    'learning': 'educational',
    'schedule': 'routine',
    'habit': 'routine',
    'family': 'relationship',
    'sibling': 'relationship',
    'friend': 'relationship',
  };

  return categoryMap[normalized] || 'challenge'; // Default to challenge
}

/**
 * Prompt for AI fact extraction
 */
const FACT_EXTRACTION_PROMPT = `You are analyzing a conversation between a parent and an AI assistant about their child with developmental needs.

Extract specific, actionable facts about the child and family. Return a JSON array of facts.

CATEGORIES TO EXTRACT:
- preference: Things the child likes, enjoys, is interested in
- trigger: Things that upset the child, cause meltdowns, or should be avoided
- strength: Skills, abilities, things the child is good at
- challenge: Current difficulties, struggles, areas needing support
- milestone: Recent achievements, progress, first-time accomplishments
- strategy: Techniques that worked, helpful approaches
- medical: Diagnoses, medications, health information
- educational: School-related info, IEP details, learning styles
- routine: Daily schedules, habits, regular activities
- relationship: Family dynamics, social connections

For each fact:
1. Extract the SPECIFIC information (not the full sentence)
2. Assign confidence (0.6-0.95 based on how clearly stated)
3. Choose the most appropriate category

Example output:
[
  {"category": "preference", "content": "Loves trains and anything transportation-related", "confidence": 0.9},
  {"category": "trigger", "content": "Loud sudden noises cause meltdowns", "confidence": 0.85},
  {"category": "strategy", "content": "Visual timer helps with transitions", "confidence": 0.8}
]

Only extract facts that are clearly stated. Do not infer or assume. Be concise.`;

/**
 * Extract facts from conversation - uses AI with regex fallback
 */
function extractFactsFromMessages(
  messages: ConversationMessage[]
): Array<{ category: MemoryCategory; content: string; confidence: number }> {
  // For synchronous use, fall back to regex
  return extractFactsFromMessagesRegex(messages);
}

/**
 * Enhanced fact extraction that tries AI first
 */
export async function extractFactsEnhanced(
  messages: ConversationMessage[],
  useAI: boolean = true
): Promise<Array<{ category: MemoryCategory; content: string; confidence: number }>> {
  if (useAI) {
    try {
      const aiFacts = await extractFactsWithAI(messages);
      if (aiFacts.length > 0) {
        if (import.meta.env.DEV) console.log(`[Memory] AI extracted ${aiFacts.length} facts`);
        return aiFacts;
      }
    } catch (e) {
      console.warn('[Memory] AI extraction failed, using regex fallback');
    }
  }

  const regexFacts = extractFactsFromMessagesRegex(messages);
  if (import.meta.env.DEV) console.log(`[Memory] Regex extracted ${regexFacts.length} facts`);
  return regexFacts;
}

/**
 * Generate a summary of a conversation
 */
export async function generateConversationSummary(
  messages: ConversationMessage[]
): Promise<string> {
  try {
    const response = await fetch(`${getBackendUrl()}/ai/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      // Fallback summary
      const topics = extractTopicsFromMessages(messages);
      return `Conversation about ${topics.join(', ') || 'child development and support'}`;
    }

    const data = await response.json();
    return data.summary || 'Conversation about child development and support';
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Conversation about child development and support';
  }
}

/**
 * Extract topics from messages
 */
function extractTopicsFromMessages(messages: ConversationMessage[]): string[] {
  const topics = new Set<string>();
  const topicPatterns = [
    { pattern: /routine|schedule/i, topic: 'routines' },
    { pattern: /behavior|meltdown|tantrum/i, topic: 'behavior' },
    { pattern: /speech|communication|talk/i, topic: 'communication' },
    { pattern: /school|iep|teacher/i, topic: 'school' },
    { pattern: /sensory|overwhelm/i, topic: 'sensory' },
    { pattern: /sleep|bedtime/i, topic: 'sleep' },
    { pattern: /eating|food|meal/i, topic: 'feeding' },
    { pattern: /anxiety|worry/i, topic: 'anxiety' },
    { pattern: /social|friends/i, topic: 'social skills' },
    { pattern: /therapy|aba|ot/i, topic: 'therapy' },
  ];

  for (const message of messages) {
    for (const { pattern, topic } of topicPatterns) {
      if (pattern.test(message.content)) {
        topics.add(topic);
      }
    }
  }

  return Array.from(topics);
}

/**
 * Build context string from memories for AI prompt
 */
export function buildMemoryContextString(memories: MemoryFact[]): string {
  if (memories.length === 0) return '';

  const grouped: Record<MemoryCategory, string[]> = {
    preference: [],
    trigger: [],
    strength: [],
    challenge: [],
    milestone: [],
    strategy: [],
    medical: [],
    educational: [],
    routine: [],
    relationship: [],
  };

  for (const memory of memories) {
    grouped[memory.category]?.push(memory.content);
  }

  const parts: string[] = [];

  if (grouped.preference.length > 0) {
    parts.push(`PREFERENCES: ${grouped.preference.slice(0, 3).join('; ')}`);
  }
  if (grouped.trigger.length > 0) {
    parts.push(`TRIGGERS TO WATCH: ${grouped.trigger.slice(0, 3).join('; ')}`);
  }
  if (grouped.strength.length > 0) {
    parts.push(`STRENGTHS: ${grouped.strength.slice(0, 3).join('; ')}`);
  }
  if (grouped.challenge.length > 0) {
    parts.push(`CURRENT CHALLENGES: ${grouped.challenge.slice(0, 3).join('; ')}`);
  }
  if (grouped.strategy.length > 0) {
    parts.push(`STRATEGIES THAT WORK: ${grouped.strategy.slice(0, 3).join('; ')}`);
  }
  if (grouped.milestone.length > 0) {
    parts.push(`RECENT MILESTONES: ${grouped.milestone.slice(0, 2).join('; ')}`);
  }
  if (grouped.routine.length > 0) {
    parts.push(`ROUTINE INFO: ${grouped.routine.slice(0, 2).join('; ')}`);
  }

  return parts.join('\n');
}

/**
 * Local conversation storage (for offline/fallback)
 */
const STORAGE_KEY_PREFIX = 'aminy_conversation_';

export function saveConversationLocally(
  conversationId: string,
  conversation: Partial<Conversation>
): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${conversationId}`;
    syncEncryptedStorage.setItem(key, JSON.stringify({
      ...conversation,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error saving conversation locally:', error);
  }
}

export function loadConversationLocally(conversationId: string): Conversation | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${conversationId}`;
    const data = syncEncryptedStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading conversation locally:', error);
    return null;
  }
}

export function listLocalConversations(): string[] {
  const keys: string[] = [];
  try {
    // Check both encrypted (enc_) and unencrypted versions
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const cleanKey = key.replace(/^enc_/, '');
        if (cleanKey.startsWith(STORAGE_KEY_PREFIX) && !keys.includes(cleanKey.replace(STORAGE_KEY_PREFIX, ''))) {
          keys.push(cleanKey.replace(STORAGE_KEY_PREFIX, ''));
        }
      }
    }
  } catch (error) {
    console.error('Error listing local conversations:', error);
  }
  return keys;
}

export default {
  saveConversation,
  loadRecentConversations,
  loadConversation,
  storeMemoryFact,
  getRelevantMemories,
  searchMemoriesSemantic,
  extractAndStoreFacts,
  extractFactsEnhanced,
  generateConversationSummary,
  buildMemoryContextString,
  saveConversationLocally,
  loadConversationLocally,
  listLocalConversations,
};
