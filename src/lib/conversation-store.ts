// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Conversation Store — Supabase + localStorage Dual-Write Persistence
 *
 * Strategy:
 *   WRITE: Supabase (primary) + localStorage (cache/offline fallback)
 *   READ:  localStorage first (speed) → Supabase fallback (completeness)
 *   SYNC:  Background sync localStorage → Supabase on reconnect
 *
 * Tables: ai_conversations, ai_messages (see migration 20260310_ai_conversation_tables.sql)
 *
 * Unlike the existing conversation-persistence.ts (which stores messages as JSON blobs),
 * this uses normalized tables (one row per message) for better querying, indexing,
 * and cross-device sync with proper conflict resolution.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ConversationRecord {
  id: string;
  userId: string;
  childId?: string;
  title: string;
  summary?: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: MessageMetadata;
  createdAt: string;
}

export interface MessageMetadata {
  topic?: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'concerned';
  hasActionItems?: boolean;
  ragContextUsed?: boolean;
  memoryFactsUsed?: number;
  model?: string;
  tokenCount?: number;
  [key: string]: unknown;
}

// ============================================================================
// Constants
// ============================================================================

const LOCAL_CONV_PREFIX = 'aminy_conv_v2_';
const LOCAL_MSG_PREFIX = 'aminy_msg_v2_';
const SYNC_QUEUE_KEY = 'aminy_conv_sync_queue';

// ============================================================================
// Save Message
// ============================================================================

/**
 * Save a single message to a conversation.
 * Writes to both localStorage (immediate) and Supabase (async).
 */
export async function saveMessage(
  conversationId: string,
  role: MessageRecord['role'],
  content: string,
  metadata?: MessageMetadata
): Promise<MessageRecord> {
  const now = new Date().toISOString();
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const message: MessageRecord = {
    id: messageId,
    conversationId,
    role,
    content,
    metadata,
    createdAt: now,
  };

  // 1. Save to localStorage immediately (fast, offline-safe)
  saveMessageLocally(message);

  // 2. Update conversation's lastMessageAt locally
  updateConversationTimestampLocally(conversationId, now);

  // 3. Save to Supabase in background
  saveMessageToSupabase(message).catch(err => {
    console.warn('[ConvStore] Supabase message save failed, queued for sync:', err);
    queueForSync({ type: 'message', data: message });
  });

  return message;
}

// ============================================================================
// Create Conversation
// ============================================================================

/**
 * Create a new conversation record.
 * Auto-generates title from first user message if not provided.
 */
export async function createConversation(
  userId: string,
  childId?: string,
  title?: string
): Promise<ConversationRecord> {
  const now = new Date().toISOString();
  const conversationId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const conversation: ConversationRecord = {
    id: conversationId,
    userId,
    childId,
    title: title || 'New Conversation',
    messageCount: 0,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // Save locally
  saveConversationLocally(conversation);

  // Save to Supabase
  createConversationInSupabase(conversation).catch(err => {
    console.warn('[ConvStore] Supabase conversation create failed:', err);
    queueForSync({ type: 'conversation', data: conversation });
  });

  return conversation;
}

/**
 * Auto-generate a title from the first user message.
 */
export function generateTitle(firstMessage: string): string {
  // Topic detection patterns
  const topics: Array<{ pattern: RegExp; title: string }> = [
    { pattern: /routine|schedule|morning|bedtime|transition/i, title: 'Daily Routines' },
    { pattern: /behavior|meltdown|tantrum|hitting|biting/i, title: 'Behavior Support' },
    { pattern: /speech|communication|talk|words|language/i, title: 'Communication' },
    { pattern: /school|iep|teacher|classroom/i, title: 'School Support' },
    { pattern: /sensory|overwhelm|loud|touch|texture/i, title: 'Sensory Needs' },
    { pattern: /sleep|night|wake|bed/i, title: 'Sleep Strategies' },
    { pattern: /eating|food|meal|picky/i, title: 'Feeding Challenges' },
    { pattern: /anxiety|worry|fear|scared/i, title: 'Anxiety Support' },
    { pattern: /social|friends|play|peer/i, title: 'Social Skills' },
    { pattern: /therapy|aba|ot|pt|speech therapy/i, title: 'Therapy Coordination' },
    { pattern: /insurance|coverage|benefits|medicaid|waiver/i, title: 'Benefits & Coverage' },
    { pattern: /calm|stress|overwhelm|self[- ]care|burnout/i, title: 'Caregiver Wellness' },
  ];

  for (const { pattern, title } of topics) {
    if (pattern.test(firstMessage)) {
      return title;
    }
  }

  // Fallback: use first 40 chars of message
  const cleaned = firstMessage.replace(/\s+/g, ' ').trim();
  return cleaned.length > 40 ? cleaned.slice(0, 37) + '...' : cleaned;
}

// ============================================================================
// Get Conversation
// ============================================================================

/**
 * Load a full conversation with all messages.
 * Reads from localStorage first (fast), falls back to Supabase.
 */
export async function getConversation(
  conversationId: string
): Promise<{ conversation: ConversationRecord | null; messages: MessageRecord[] }> {
  // Try localStorage first
  const localConv = loadConversationLocally(conversationId);
  const localMessages = loadMessagesLocally(conversationId);

  if (localConv && localMessages.length > 0) {
    return { conversation: localConv, messages: localMessages };
  }

  // Fall back to Supabase
  try {
    const { data: convData, error: convError } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !convData) {
      return { conversation: localConv, messages: localMessages };
    }

    const { data: msgData, error: msgError } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      return { conversation: mapDbConversation(convData), messages: localMessages };
    }

    const conversation = mapDbConversation(convData);
    const messages = (msgData || []).map(mapDbMessage);

    // Update local cache
    saveConversationLocally(conversation);
    messages.forEach(saveMessageLocally);

    return { conversation, messages };
  } catch {
    return { conversation: localConv, messages: localMessages };
  }
}

// ============================================================================
// List Conversations
// ============================================================================

/**
 * List conversations for a user, sorted by most recent first.
 */
export async function listConversations(
  userId: string,
  limit: number = 20
): Promise<ConversationRecord[]> {
  // Try Supabase first for most complete list
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      const conversations = data.map(mapDbConversation);
      // Update local cache
      conversations.forEach(saveConversationLocally);
      return conversations;
    }
  } catch {
    // Supabase unavailable, use local
  }

  // Fall back to localStorage
  return listConversationsLocally(userId, limit);
}

// ============================================================================
// Delete Conversation
// ============================================================================

/**
 * Delete a conversation and all its messages.
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  // Remove locally
  removeConversationLocally(conversationId);

  // Remove from Supabase
  try {
    // Messages cascade-delete via foreign key
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', conversationId);

    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// Sync
// ============================================================================

/**
 * Sync queued items from localStorage to Supabase.
 * Call this when the app regains connectivity.
 */
export async function syncToSupabase(): Promise<{ synced: number; failed: number }> {
  const queue = getSyncQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: Array<{ type: string; data: unknown }> = [];

  for (const item of queue) {
    try {
      if (item.type === 'conversation') {
        await createConversationInSupabase(item.data as ConversationRecord);
        synced++;
      } else if (item.type === 'message') {
        await saveMessageToSupabase(item.data as MessageRecord);
        synced++;
      }
    } catch {
      failed++;
      remaining.push(item);
    }
  }

  // Update queue with remaining items
  saveSyncQueue(remaining);

  return { synced, failed };
}

// ============================================================================
// Supabase Operations
// ============================================================================

async function createConversationInSupabase(conv: ConversationRecord): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .upsert({
      id: conv.id,
      user_id: conv.userId,
      child_id: conv.childId || null,
      title: conv.title,
      summary: conv.summary || null,
      message_count: conv.messageCount,
      last_message_at: conv.lastMessageAt,
      created_at: conv.createdAt,
      updated_at: conv.updatedAt,
    }, { onConflict: 'id' });

  if (error) throw error;
}

async function saveMessageToSupabase(msg: MessageRecord): Promise<void> {
  const { error } = await supabase
    .from('ai_messages')
    .upsert({
      id: msg.id,
      conversation_id: msg.conversationId,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata || {},
      created_at: msg.createdAt,
    }, { onConflict: 'id' });

  if (error) throw error;

  // Update conversation message count
  await supabase
    .from('ai_conversations')
    .update({
      message_count: await getMessageCount(msg.conversationId),
      last_message_at: msg.createdAt,
      updated_at: msg.createdAt,
    })
    .eq('id', msg.conversationId);
}

async function getMessageCount(conversationId: string): Promise<number> {
  const { count } = await supabase
    .from('ai_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);
  return count || 0;
}

// ============================================================================
// localStorage Operations
// ============================================================================

function saveConversationLocally(conv: ConversationRecord): void {
  try {
    localStorage.setItem(`${LOCAL_CONV_PREFIX}${conv.id}`, JSON.stringify(conv));
  } catch { /* localStorage full — non-critical */ }
}

function loadConversationLocally(id: string): ConversationRecord | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_CONV_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function removeConversationLocally(id: string): void {
  try {
    localStorage.removeItem(`${LOCAL_CONV_PREFIX}${id}`);
    // Also remove all messages for this conversation
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${LOCAL_MSG_PREFIX}${id}_`)) {
        localStorage.removeItem(key);
      }
    }
  } catch { /* non-critical */ }
}

function listConversationsLocally(userId: string, limit: number): ConversationRecord[] {
  const conversations: ConversationRecord[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(LOCAL_CONV_PREFIX)) continue;
      const data = JSON.parse(localStorage.getItem(key) || '');
      if (data.userId === userId) {
        conversations.push(data);
      }
    }
  } catch { /* non-critical */ }

  return conversations
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .slice(0, limit);
}

function saveMessageLocally(msg: MessageRecord): void {
  try {
    // Store messages keyed by conversation + message ID for efficient retrieval
    const key = `${LOCAL_MSG_PREFIX}${msg.conversationId}_${msg.id}`;
    localStorage.setItem(key, JSON.stringify(msg));
  } catch { /* localStorage full */ }
}

function loadMessagesLocally(conversationId: string): MessageRecord[] {
  const messages: MessageRecord[] = [];
  try {
    const prefix = `${LOCAL_MSG_PREFIX}${conversationId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      messages.push(JSON.parse(localStorage.getItem(key) || ''));
    }
  } catch { /* non-critical */ }

  return messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function updateConversationTimestampLocally(conversationId: string, timestamp: string): void {
  const conv = loadConversationLocally(conversationId);
  if (conv) {
    conv.lastMessageAt = timestamp;
    conv.updatedAt = timestamp;
    conv.messageCount = (conv.messageCount || 0) + 1;
    saveConversationLocally(conv);
  }
}

// ============================================================================
// Sync Queue
// ============================================================================

function getSyncQueue(): Array<{ type: string; data: unknown }> {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSyncQueue(queue: Array<{ type: string; data: unknown }>): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch { /* non-critical */ }
}

function queueForSync(item: { type: string; data: unknown }): void {
  const queue = getSyncQueue();
  queue.push(item);
  // Cap queue at 200 items to prevent localStorage bloat
  if (queue.length > 200) {
    queue.splice(0, queue.length - 200);
  }
  saveSyncQueue(queue);
}

// ============================================================================
// DB Mapping
// ============================================================================

function mapDbConversation(row: Record<string, unknown>): ConversationRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    childId: row.child_id as string | undefined,
    title: row.title as string,
    summary: row.summary as string | undefined,
    messageCount: (row.message_count || 0) as number,
    lastMessageAt: row.last_message_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDbMessage(row: Record<string, unknown>): MessageRecord {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as MessageRecord['role'],
    content: row.content as string,
    metadata: row.metadata as MessageMetadata | undefined,
    createdAt: row.created_at as string,
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  saveMessage,
  createConversation,
  generateTitle,
  getConversation,
  listConversations,
  deleteConversation,
  syncToSupabase,
};
