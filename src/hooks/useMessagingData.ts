// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useMessagingData Hook
 * Loads messaging and access request data from Supabase with localStorage fallback.
 *
 * For screens: messages, access-requests
 * Tables: messages, conversations, access_requests
 * Replaces localStorage keys: conversation state, request metadata
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: string[];
  participantAvatars?: string[];
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isArchived: boolean;
  isPinned: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  attachments?: { url: string; type: string; name: string }[];
  isRead: boolean;
  sentAt: string;
}

export interface AccessRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole: string;
  targetUserId: string;
  accessType: 'view' | 'edit' | 'full';
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requestedAt: string;
  respondedAt?: string;
}

export interface MessagingData {
  conversations: Conversation[];
  activeMessages: Message[];
  accessRequests: AccessRequest[];
  unreadTotal: number;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache helpers
// ============================================================================

const CACHE_KEYS = {
  CONVERSATIONS: 'aminy-conversations',
  MESSAGES: 'aminy-active-messages',
  ACCESS_REQUESTS: 'aminy-access-requests',
} as const;

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useMessagingData(userId?: string) {
  const [data, setData] = useState<MessagingData>({
    conversations: [],
    activeMessages: [],
    accessRequests: [],
    unreadTotal: 0,
    loading: true,
    error: null,
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [conversationsResult, accessRequestsResult] = await Promise.all([
        supabase
          .from('conversations')
          .select('*')
          .contains('participant_ids', [userId])
          .order('last_message_at', { ascending: false })
          .limit(50)
          .then(r => r, err => ({ data: null, error: err })),
        supabase
          .from('access_requests')
          .select('*')
          .or(`requester_id.eq.${userId},target_user_id.eq.${userId}`)
          .order('requested_at', { ascending: false })
          .limit(20)
          .then(r => r, err => ({ data: null, error: err })),
      ]);

      const conversations: Conversation[] = (conversationsResult.data || []).map((c: Record<string, unknown>) => ({
        id: (c.id as string) || '',
        participantIds: (c.participant_ids as string[]) || [],
        participantNames: (c.participant_names as string[]) || [],
        participantAvatars: c.participant_avatars as string[] | undefined,
        lastMessageText: c.last_message_text as string | undefined,
        lastMessageAt: c.last_message_at as string | undefined,
        unreadCount: (c.unread_count as number) || 0,
        isArchived: (c.is_archived as boolean) || false,
        isPinned: (c.is_pinned as boolean) || false,
        createdAt: (c.created_at as string) || '',
      }));

      const accessRequests: AccessRequest[] = (accessRequestsResult.data || []).map((r: Record<string, unknown>) => ({
        id: (r.id as string) || '',
        requesterId: (r.requester_id as string) || '',
        requesterName: (r.requester_name as string) || '',
        requesterEmail: (r.requester_email as string) || '',
        requesterRole: (r.requester_role as string) || '',
        targetUserId: (r.target_user_id as string) || '',
        accessType: (r.access_type as AccessRequest['accessType']) || 'view',
        reason: (r.reason as string) || '',
        status: (r.status as AccessRequest['status']) || 'pending',
        requestedAt: (r.requested_at as string) || '',
        respondedAt: r.responded_at as string | undefined,
      }));

      const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

      writeCache(CACHE_KEYS.CONVERSATIONS, conversations);
      writeCache(CACHE_KEYS.ACCESS_REQUESTS, accessRequests);

      setData({
        conversations, activeMessages: [], accessRequests, unreadTotal,
        loading: false, error: null,
      });
    } catch (err) {
      console.warn('useMessagingData: Supabase failed, using cache', err);
      const cachedConvos = readCache<Conversation[]>(CACHE_KEYS.CONVERSATIONS, []);
      setData({
        conversations: cachedConvos,
        activeMessages: readCache(CACHE_KEYS.MESSAGES, []),
        accessRequests: readCache(CACHE_KEYS.ACCESS_REQUESTS, []),
        unreadTotal: cachedConvos.reduce((s, c) => s + c.unreadCount, 0),
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load messaging data',
      });
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    if (!userId) return;

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })
      .limit(100);

    const messages: Message[] = (msgs || []).map((m: Record<string, unknown>) => ({
      id: (m.id as string) || '',
      conversationId: (m.conversation_id as string) || '',
      senderId: (m.sender_id as string) || '',
      senderName: (m.sender_name as string) || '',
      senderAvatar: m.sender_avatar as string | undefined,
      text: (m.text as string) || '',
      attachments: m.attachments as Message['attachments'],
      isRead: (m.is_read as boolean) || false,
      sentAt: (m.sent_at as string) || '',
    }));

    writeCache(CACHE_KEYS.MESSAGES, messages);
    setData(prev => ({ ...prev, activeMessages: messages }));
  }, [userId]);

  const sendMessage = useCallback(async (conversationId: string, text: string) => {
    if (!userId) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      text,
      sent_at: new Date().toISOString(),
    });
    if (!error) await loadMessages(conversationId);
  }, [userId, loadMessages]);

  const respondToAccessRequest = useCallback(async (requestId: string, approved: boolean) => {
    const { error } = await supabase
      .from('access_requests')
      .update({
        status: approved ? 'approved' : 'denied',
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId);
    if (!error) await loadData();
  }, [loadData]);

  return {
    ...data,
    activeConversationId,
    refresh: loadData,
    loadMessages,
    sendMessage,
    respondToAccessRequest,
  };
}
