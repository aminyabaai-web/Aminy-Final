// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useCalmToolsData Hook
 * Loads calm tool session data from Supabase with localStorage fallback.
 *
 * Table: calm_tool_sessions
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface CalmToolSession {
  id: string;
  userId: string;
  childId?: string;
  toolType: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  moodBefore?: number;
  moodAfter?: number;
  wasEffective?: boolean;
  triggeredBy?: string;
  context?: string;
  notes?: string;
  coinsEarned: number;
}

export interface CalmToolsData {
  sessions: CalmToolSession[];
  favorites: string[];
  recentTools: string[];
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache
// ============================================================================

const CACHE_KEY = 'aminy-calm-tools-cache';
const FAVORITES_KEY = 'aminy-calm-favorites';

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
  } catch { /* ignore */ }
}

// ============================================================================
// Row mapper
// ============================================================================

function mapSession(row: Record<string, unknown>): CalmToolSession {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id as string) || '',
    childId: row.child_id as string | undefined,
    toolType: (row.tool_type as string) || 'breathing',
    startedAt: (row.started_at as string) || new Date().toISOString(),
    endedAt: row.ended_at as string | undefined,
    durationSeconds: (row.duration_seconds as number) || 0,
    moodBefore: row.mood_before as number | undefined,
    moodAfter: row.mood_after as number | undefined,
    wasEffective: row.was_effective as boolean | undefined,
    triggeredBy: row.triggered_by as string | undefined,
    context: row.context as string | undefined,
    notes: row.notes as string | undefined,
    coinsEarned: (row.coins_earned as number) || 0,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useCalmToolsData(userId?: string, childId?: string): CalmToolsData & {
  refresh: () => Promise<void>;
  logSession: (session: Omit<CalmToolSession, 'id' | 'userId'>) => Promise<void>;
  toggleFavorite: (toolType: string) => void;
} {
  const [data, setData] = useState<CalmToolsData>({
    sessions: [],
    favorites: readCache<string[]>(FAVORITES_KEY, []),
    recentTools: [],
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      let query = supabase
        .from('calm_tool_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(100);

      if (childId) query = query.eq('child_id', childId);

      const { data: rows, error } = await query;

      if (error) throw error;

      const sessions = (rows || []).map((r: Record<string, unknown>) => mapSession(r));

      // Derive recent tools from last 20 sessions
      const recentTools = [...new Set(sessions.slice(0, 20).map(s => s.toolType))];
      const favorites = readCache<string[]>(FAVORITES_KEY, []);

      // Cache for offline
      writeCache(CACHE_KEY, sessions);

      setData({ sessions, favorites, recentTools, loading: false, error: null });
    } catch (error: unknown) {
      console.error('[CalmTools] Load failed, using cache:', error);
      const cached = readCache<CalmToolSession[]>(CACHE_KEY, []);
      const recentTools = [...new Set(cached.slice(0, 20).map(s => s.toolType))];
      setData({
        sessions: cached,
        favorites: readCache<string[]>(FAVORITES_KEY, []),
        recentTools,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load calm tools data',
      });
    }
  }, [userId, childId]);

  const logSession = useCallback(async (session: Omit<CalmToolSession, 'id' | 'userId'>) => {
    if (!userId) return;

    const id = crypto.randomUUID?.() || `ct-${Date.now()}`;

    try {
      await supabase.from('calm_tool_sessions').insert({
        id,
        user_id: userId,
        child_id: session.childId || childId || null,
        tool_type: session.toolType,
        started_at: session.startedAt,
        ended_at: session.endedAt || null,
        duration_seconds: session.durationSeconds,
        mood_before: session.moodBefore || null,
        mood_after: session.moodAfter || null,
        was_effective: session.wasEffective ?? null,
        triggered_by: session.triggeredBy || null,
        context: session.context || null,
        notes: session.notes || null,
        coins_earned: session.coinsEarned || 0,
      });
    } catch (err) {
      console.warn('[CalmTools] Failed to save session to Supabase:', err);
    }

    // Update local state and cache
    const newSession: CalmToolSession = { ...session, id, userId };
    setData(prev => {
      const sessions = [newSession, ...prev.sessions];
      writeCache(CACHE_KEY, sessions);
      return {
        ...prev,
        sessions,
        recentTools: [...new Set([session.toolType, ...prev.recentTools])],
      };
    });
  }, [userId, childId]);

  const toggleFavorite = useCallback((toolType: string) => {
    setData(prev => {
      const favorites = prev.favorites.includes(toolType)
        ? prev.favorites.filter(f => f !== toolType)
        : [...prev.favorites, toolType];
      writeCache(FAVORITES_KEY, favorites);
      return { ...prev, favorites };
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refresh: loadData,
    logSession,
    toggleFavorite,
  };
}

export default useCalmToolsData;
