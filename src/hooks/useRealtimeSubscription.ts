// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useRealtimeSubscription — Supabase Realtime Channel Hook
 *
 * Wraps Supabase's realtime Postgres Changes API with:
 * - Typed event handlers for INSERT / UPDATE / DELETE
 * - Automatic channel cleanup on unmount
 * - Configurable table and filter scoping
 * - Connection status tracking
 * - Dev-only logging
 *
 * Usage:
 *   useRealtimeSubscription<Message>({
 *     table: 'messages',
 *     schema: 'public',
 *     filter: `conversation_id=eq.${conversationId}`,
 *     onInsert: (newMsg) => setMessages(prev => [...prev, newMsg]),
 *     onUpdate: (updated) => setMessages(prev =>
 *       prev.map(m => m.id === updated.id ? updated : m)
 *     ),
 *     onDelete: (deleted) => setMessages(prev =>
 *       prev.filter(m => m.id !== deleted.id)
 *     ),
 *   });
 *
 * Designed for:
 * - Chat messages (real-time delivery)
 * - Community posts/comments (live feed updates)
 * - Provider session status changes
 * - Collaborative care plan updates
 * - Notification delivery
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────────────

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface UseRealtimeSubscriptionOptions<T extends Record<string, unknown>> {
  /** Supabase table to subscribe to */
  table: string;
  /** Database schema (default: 'public') */
  schema?: string;
  /**
   * Supabase realtime filter expression
   * e.g. 'user_id=eq.abc123' or 'conversation_id=eq.some-uuid'
   */
  filter?: string;
  /** Specific events to listen for (default: all three) */
  events?: RealtimeEvent[];
  /** Handler for INSERT events */
  onInsert?: (record: T) => void;
  /** Handler for UPDATE events */
  onUpdate?: (record: T, oldRecord: Partial<T>) => void;
  /** Handler for DELETE events */
  onDelete?: (oldRecord: T) => void;
  /** Generic handler for any change event */
  onChange?: (
    event: RealtimeEvent,
    payload: RealtimePostgresChangesPayload<T>
  ) => void;
  /** Whether the subscription is active (default: true). Set false to pause. */
  enabled?: boolean;
  /** Custom channel name (default: auto-generated from table + filter) */
  channelName?: string;
}

export interface UseRealtimeSubscriptionReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** The underlying Supabase channel (for advanced use) */
  channel: RealtimeChannel | null;
  /** Manually unsubscribe */
  unsubscribe: () => void;
  /** Manually resubscribe after unsubscribing */
  resubscribe: () => void;
}

// ── Dev-only logging ─────────────────────────────────────────────────

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log('[Realtime]', ...args);
  }
};

// ── Hook ─────────────────────────────────────────────────────────────

export function useRealtimeSubscription<T extends Record<string, unknown>>(
  options: UseRealtimeSubscriptionOptions<T>
): UseRealtimeSubscriptionReturn {
  const {
    table,
    schema = 'public',
    filter,
    events = ['INSERT', 'UPDATE', 'DELETE'],
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
    channelName,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Stable refs for callbacks to avoid resubscribing on handler changes
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Generate a stable channel name
  const resolvedChannelName = channelName ?? `realtime:${schema}:${table}${filter ? `:${filter}` : ''}`;

  // ── Subscribe ────────────────────────────────────────────────────

  const subscribe = useCallback(() => {
    if (!enabled) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setStatus('connecting');

    // Build the channel with postgres_changes listeners
    const channel = supabase.channel(resolvedChannelName);

    // Add listeners for each requested event type
    for (const event of events) {
      const listenConfig: {
        event: 'INSERT' | 'UPDATE' | 'DELETE';
        schema: string;
        table: string;
        filter?: string;
      } = {
        event,
        schema,
        table,
      };

      if (filter) {
        listenConfig.filter = filter;
      }

      channel.on(
        'postgres_changes' as never,
        listenConfig as never,
        (payload: RealtimePostgresChangesPayload<T>) => {
          devLog(`${event} on ${table}:`, payload);

          // Dispatch to typed handlers
          switch (payload.eventType) {
            case 'INSERT':
              if (onInsertRef.current && payload.new) {
                onInsertRef.current(payload.new as T);
              }
              break;
            case 'UPDATE':
              if (onUpdateRef.current && payload.new) {
                onUpdateRef.current(
                  payload.new as T,
                  (payload.old ?? {}) as Partial<T>
                );
              }
              break;
            case 'DELETE':
              if (onDeleteRef.current && payload.old) {
                onDeleteRef.current(payload.old as T);
              }
              break;
          }

          // Generic handler
          if (onChangeRef.current) {
            onChangeRef.current(payload.eventType as RealtimeEvent, payload);
          }
        }
      );
    }

    // Subscribe to the channel
    channel.subscribe((channelStatus) => {
      switch (channelStatus) {
        case 'SUBSCRIBED':
          setStatus('connected');
          devLog(`Subscribed to ${table}`);
          break;
        case 'CLOSED':
          setStatus('disconnected');
          devLog(`Unsubscribed from ${table}`);
          break;
        case 'CHANNEL_ERROR':
          setStatus('error');
          devLog(`Channel error on ${table}`);
          break;
        case 'TIMED_OUT':
          setStatus('error');
          devLog(`Channel timeout on ${table}`);
          break;
      }
    });

    channelRef.current = channel;
  }, [enabled, resolvedChannelName, schema, table, filter, events]);

  // ── Unsubscribe ──────────────────────────────────────────────────

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setStatus('disconnected');
    }
  }, []);

  // ── Lifecycle ────────────────────────────────────────────────────

  useEffect(() => {
    if (enabled) {
      subscribe();
    } else {
      unsubscribe();
    }

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, subscribe, unsubscribe]);

  return {
    status,
    channel: channelRef.current,
    unsubscribe,
    resubscribe: subscribe,
  };
}

// ── Convenience: Pre-typed hooks for common tables ───────────────────

/**
 * Subscribe to chat messages in a conversation
 */
export function useChatMessages<T extends Record<string, unknown>>(
  conversationId: string | null,
  handlers: {
    onInsert?: (msg: T) => void;
    onUpdate?: (msg: T, old: Partial<T>) => void;
    onDelete?: (msg: T) => void;
  }
) {
  return useRealtimeSubscription<T>({
    table: 'ai_chat_messages',
    filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
    enabled: !!conversationId,
    events: ['INSERT', 'UPDATE', 'DELETE'],
    ...handlers,
  });
}

/**
 * Subscribe to community post updates (live feed)
 */
export function useCommunityFeed<T extends Record<string, unknown>>(
  handlers: {
    onInsert?: (post: T) => void;
    onUpdate?: (post: T, old: Partial<T>) => void;
    onDelete?: (post: T) => void;
  }
) {
  return useRealtimeSubscription<T>({
    table: 'community_posts',
    events: ['INSERT', 'UPDATE'],
    ...handlers,
  });
}

/**
 * Subscribe to session status changes for a provider
 */
export function useSessionUpdates<T extends Record<string, unknown>>(
  providerId: string | null,
  handlers: {
    onInsert?: (session: T) => void;
    onUpdate?: (session: T, old: Partial<T>) => void;
  }
) {
  return useRealtimeSubscription<T>({
    table: 'provider_sessions',
    filter: providerId ? `provider_id=eq.${providerId}` : undefined,
    enabled: !!providerId,
    events: ['INSERT', 'UPDATE'],
    ...handlers,
  });
}

/**
 * Subscribe to notification-style events for the current user
 */
export function useUserNotifications<T extends Record<string, unknown>>(
  userId: string | null,
  handlers: {
    onInsert?: (event: T) => void;
  }
) {
  return useRealtimeSubscription<T>({
    table: 'analytics_events',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    events: ['INSERT'],
    ...handlers,
  });
}

export default useRealtimeSubscription;
