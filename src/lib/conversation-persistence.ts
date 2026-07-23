// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Conversation Persistence Service
 *
 * Replaces localStorage-only conversation storage with Supabase persistence.
 * Provides cross-device continuity for Ask Aminy conversations.
 *
 * Strategy:
 * 1. Save to Supabase (primary) + localStorage (cache/offline fallback)
 * 2. Load from Supabase first, fall back to localStorage
 * 3. Sync localStorage → Supabase on reconnection
 */

import { supabase } from '../utils/supabase/client';

// ============================================
// Types
// ============================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  userId: string;
  childId?: string;
  title: string;
  messages: ConversationMessage[];
  messageCount: number;
  factsExtracted?: Array<{ type: string; content: string; confidence: number }>;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'crisis';
  topics?: string[];
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Save Conversation
// ============================================

/**
 * Save or update a conversation in Supabase + localStorage cache.
 */
export async function saveConversation(
  conversation: Omit<Conversation, 'createdAt' | 'updatedAt'>
): Promise<boolean> {
  const now = new Date().toISOString();

  // Save to localStorage immediately (offline-first)
  saveConversationLocally(conversation.id, conversation);

  // Save to Supabase
  try {
    const { error } = await supabase
      .from('conversations')
      .upsert({
        id: conversation.id,
        user_id: conversation.userId,
        child_id: conversation.childId || null,
        title: conversation.title,
        messages: conversation.messages,
        message_count: conversation.messages.length,
        facts_extracted: conversation.factsExtracted || [],
        sentiment: conversation.sentiment || 'neutral',
        topics: conversation.topics || [],
        last_message_at: conversation.lastMessageAt || now,
        updated_at: now,
      }, {
        onConflict: 'id',
      });

    if (error) {
      console.error('Failed to save conversation to Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Conversation persistence error:', err);
    return false;
  }
}

// ============================================
// Load Conversations
// ============================================

/**
 * Load recent conversations for a user.
 * Tries Supabase first, falls back to localStorage.
 */
export async function loadConversations(
  userId: string,
  limit: number = 20
): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(mapDbToConversation);
  } catch {
    // Fall back to localStorage
    return loadLocalConversations(userId);
  }
}

/**
 * Lightweight conversation summary — no message bodies. Used to hydrate the
 * chat history list quickly and cheaply (bodies are lazy-loaded per session
 * via loadConversation only when the parent taps into a conversation).
 */
export interface ConversationSummary {
  id: string;
  userId: string;
  title: string;
  messageCount: number;
  lastMessageAt: string;
}

/**
 * Load conversation summaries for a user WITHOUT the (potentially large)
 * messages JSONB blob. Cross-device history roaming reads this on chat open.
 * Never throws — returns [] on any failure so chat never breaks.
 */
export async function loadConversationSummaries(
  userId: string,
  limit: number = 25
): Promise<ConversationSummary[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, user_id, title, message_count, last_message_at, updated_at')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || [])
      .filter((r: Record<string, unknown>) => ((r.message_count as number) || 0) > 0)
      .map((r: Record<string, unknown>) => ({
        id: r.id as string,
        userId: r.user_id as string,
        title: (r.title as string) || 'Conversation',
        messageCount: (r.message_count as number) || 0,
        lastMessageAt:
          (r.last_message_at as string) ||
          (r.updated_at as string) ||
          new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

/**
 * Load a single conversation by ID.
 */
export async function loadConversation(
  conversationId: string,
  userId: string
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data ? mapDbToConversation(data) : null;
  } catch {
    // Fall back to localStorage
    return loadConversationLocally(conversationId);
  }
}

// ============================================
// Delete Conversation
// ============================================

/**
 * Delete a conversation from Supabase + localStorage.
 */
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  // Remove from localStorage
  removeConversationLocally(conversationId);

  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

// ============================================
// Rename Conversation
// ============================================

/**
 * Rename a conversation (title only) in Supabase + the localStorage cache.
 * Used by the chat-history drawer's per-row rename and by AI title generation.
 */
export async function renameConversation(
  conversationId: string,
  userId: string,
  title: string
): Promise<boolean> {
  // Update local cache first (offline-first)
  const local = loadConversationLocally(conversationId);
  if (local) {
    saveConversationLocally(conversationId, { ...local, title } as unknown as Record<string, unknown>);
  }

  try {
    const { error } = await supabase
      .from('conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

// ============================================
// Sync localStorage → Supabase
// ============================================

/**
 * Sync any localStorage-only conversations to Supabase.
 * Call on login or when connectivity returns.
 */
export async function syncLocalToSupabase(userId: string): Promise<number> {
  const localConversations = loadLocalConversations(userId);
  let synced = 0;

  for (const conv of localConversations) {
    const success = await saveConversation({
      ...conv,
      userId,
    });
    if (success) synced++;
  }

  return synced;
}

// ============================================
// localStorage helpers
// ============================================

const LOCAL_KEY_PREFIX = 'aminy-conversation-';

function saveConversationLocally(id: string, data: Record<string, unknown>) {
  try {
    localStorage.setItem(
      `${LOCAL_KEY_PREFIX}${id}`,
      JSON.stringify({ ...data, updatedAt: new Date().toISOString() })
    );
  } catch { /* localStorage full — non-critical */ }
}

function loadConversationLocally(id: string): Conversation | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadLocalConversations(userId: string): Conversation[] {
  const conversations: Conversation[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(LOCAL_KEY_PREFIX)) continue;

    try {
      const data = JSON.parse(localStorage.getItem(key) || '');
      if (data.userId === userId || !data.userId) {
        conversations.push(data);
      }
    } catch { continue; }
  }

  return conversations.sort((a, b) =>
    new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
}

function removeConversationLocally(id: string) {
  localStorage.removeItem(`${LOCAL_KEY_PREFIX}${id}`);
}

// ============================================
// DB mapping
// ============================================

function mapDbToConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    childId: row.child_id as string | undefined,
    title: row.title as string,
    messages: (row.messages || []) as ConversationMessage[],
    messageCount: row.message_count as number,
    factsExtracted: row.facts_extracted as Conversation['factsExtracted'],
    sentiment: row.sentiment as Conversation['sentiment'],
    topics: row.topics as string[],
    lastMessageAt: row.last_message_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export default {
  save: saveConversation,
  load: loadConversation,
  loadAll: loadConversations,
  loadSummaries: loadConversationSummaries,
  rename: renameConversation,
  delete: deleteConversation,
  syncLocal: syncLocalToSupabase,
};
