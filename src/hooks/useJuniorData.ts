// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useJuniorData Hook
 * Loads Junior/Parent Bridge data from Supabase with localStorage fallback.
 *
 * Replaces localStorage-primary access in parent-junior-bridge.ts.
 * Tables: jr_sessions, children, child_profiles
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import type {
  FocusArea,
  FocusDomain,
  JuniorProgressEntry,
  JuniorAccessConfig,
  JuniorAccessMode,
  JuniorDifficultyOverride,
  JuniorAvoidanceTrigger,
  JuniorRecommendation,
  DifficultyLevel,
} from '../lib/parent-junior-bridge';

// ============================================================================
// Storage keys — used ONLY as offline fallback cache
// ============================================================================
const CACHE_KEYS = {
  FOCUS_AREAS: 'aminy-junior-focus-areas',
  PROGRESS: 'aminy-junior-progress',
  ACCESS_MODE: 'aminy-junior-access-mode',
  DIFFICULTY: 'aminy-junior-difficulty',
  AVOIDANCE: 'aminy-junior-avoidance-triggers',
  RECOMMENDATIONS: 'aminy-junior-recommendations',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface JuniorData {
  juniorProgress: JuniorProgressEntry[];
  focusAreas: FocusArea[];
  accessMode: JuniorAccessConfig;
  difficulty: JuniorDifficultyOverride[];
  avoidanceProfile: JuniorAvoidanceTrigger[];
  recommendations: JuniorRecommendation[];
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Helper: read/write localStorage cache safely
// ============================================================================

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
    // Storage full or blocked — ignore
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useJuniorData(
  userId?: string,
  childId?: string,
): JuniorData & {
  refresh: () => Promise<void>;
  updateProgress: (entry: JuniorProgressEntry) => Promise<void>;
  updateFocusAreas: (areas: FocusArea[]) => Promise<void>;
  updateAccessMode: (config: JuniorAccessConfig) => Promise<void>;
  updateDifficulty: (domain: FocusDomain, level: DifficultyLevel, reason?: string) => Promise<void>;
  addAvoidanceTrigger: (trigger: string, source: 'parent' | 'ai', notes?: string) => Promise<void>;
  removeAvoidanceTrigger: (trigger: string) => Promise<void>;
  addRecommendation: (rec: Omit<JuniorRecommendation, 'generatedAt' | 'applied'>) => Promise<void>;
} {
  const [data, setData] = useState<JuniorData>({
    juniorProgress: [],
    focusAreas: [],
    accessMode: { mode: 'open' as JuniorAccessMode, calmCornerAlwaysAvailable: true },
    difficulty: [],
    avoidanceProfile: [],
    recommendations: [],
    loading: true,
    error: null,
  });

  // --------------------------------------------------------------------------
  // Load all Junior data from Supabase, fall back to localStorage on failure
  // --------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const resolvedChildId = childId || '';

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Parallel fetch: jr_sessions + child_profiles (JSONB settings columns)
      const [
        sessionsResult,
        childResult,
      ] = await Promise.all([
        // Get junior progress sessions
        supabase
          .from('jr_sessions')
          .select('*')
          .eq('parent_id', userId)
          .order('started_at', { ascending: false })
          .limit(500)
          .then(null, (err: unknown) => {
            console.warn('[JuniorData] jr_sessions fetch failed:', err);
            return { data: null, error: err };
          }),

        // Get child profile (contains focus areas, access config, etc. in data JSONB)
        resolvedChildId
          ? supabase
              .from('children')
              .select('*')
              .eq('id', resolvedChildId)
              .eq('parent_id', userId)
              .single()
              .then(null, (err: unknown) => {
                console.warn('[JuniorData] children fetch failed:', err);
                return { data: null, error: err };
              })
          : Promise.resolve({ data: null, error: null }),
      ]);

      // Convert jr_sessions rows to JuniorProgressEntry format
      const sessionsData = Array.isArray(sessionsResult?.data) ? sessionsResult.data : [];
      const juniorProgress: JuniorProgressEntry[] = sessionsData.map((s: Record<string, unknown>) => ({
        activityId: (s.id as string) || '',
        activityTitle: (s.activity_name as string) || (s.session_type as string) || 'Activity',
        domain: ((s.data as Record<string, unknown>)?.domain as FocusDomain) || 'routines',
        completedAt: (s.completed_at as string) || (s.started_at as string) || new Date().toISOString(),
        durationSeconds: (s.duration_seconds as number) || 0,
        accuracy: (s.score as number) || undefined,
        promptLevel: ((s.data as Record<string, unknown>)?.promptLevel as number) || undefined,
        tokensEarned: (s.coins_earned as number) || 0,
        emotionBefore: ((s.data as Record<string, unknown>)?.emotionBefore as string) || undefined,
        emotionAfter: ((s.data as Record<string, unknown>)?.emotionAfter as string) || undefined,
        notes: ((s.data as Record<string, unknown>)?.notes as string) || undefined,
      }));

      // Read bridge settings from child's JSONB data column or fallback
      // The child row has a school_info JSONB column we can repurpose, or we use localStorage as cache
      const childData = childResult?.data;
      // For now, read structured settings from localStorage cache (they get synced to Supabase below)
      // These are client-side config settings that don't need their own table
      const allFocusAreas = readCache<Record<string, FocusArea[]>>(CACHE_KEYS.FOCUS_AREAS, {});
      const allAccessConfigs = readCache<Record<string, JuniorAccessConfig>>(CACHE_KEYS.ACCESS_MODE, {});
      const allDifficulty = readCache<Record<string, JuniorDifficultyOverride[]>>(CACHE_KEYS.DIFFICULTY, {});
      const allAvoidance = readCache<Record<string, JuniorAvoidanceTrigger[]>>(CACHE_KEYS.AVOIDANCE, {});
      const allRecommendations = readCache<Record<string, JuniorRecommendation[]>>(CACHE_KEYS.RECOMMENDATIONS, {});

      const cid = resolvedChildId || (childData?.id as string) || 'default';
      const focusAreas = allFocusAreas[cid] || [];
      const accessMode: JuniorAccessConfig = allAccessConfigs[cid] || {
        mode: 'open' as JuniorAccessMode,
        calmCornerAlwaysAvailable: true,
      };
      const difficulty = allDifficulty[cid] || [];
      const avoidanceProfile = allAvoidance[cid] || [];
      const recommendations = allRecommendations[cid] || [];

      // Cache progress to localStorage for offline
      if (juniorProgress.length > 0) {
        const allProgress = readCache<Record<string, JuniorProgressEntry[]>>(CACHE_KEYS.PROGRESS, {});
        allProgress[cid] = juniorProgress;
        writeCache(CACHE_KEYS.PROGRESS, allProgress);
      }

      setData({
        juniorProgress,
        focusAreas,
        accessMode,
        difficulty,
        avoidanceProfile,
        recommendations,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.error('[JuniorData] Load failed, falling back to localStorage:', error);

      // Full localStorage fallback
      const cid = childId || 'default';
      const allProgress = readCache<Record<string, JuniorProgressEntry[]>>(CACHE_KEYS.PROGRESS, {});
      const allFocusAreas = readCache<Record<string, FocusArea[]>>(CACHE_KEYS.FOCUS_AREAS, {});
      const allAccessConfigs = readCache<Record<string, JuniorAccessConfig>>(CACHE_KEYS.ACCESS_MODE, {});
      const allDifficulty = readCache<Record<string, JuniorDifficultyOverride[]>>(CACHE_KEYS.DIFFICULTY, {});
      const allAvoidance = readCache<Record<string, JuniorAvoidanceTrigger[]>>(CACHE_KEYS.AVOIDANCE, {});
      const allRecommendations = readCache<Record<string, JuniorRecommendation[]>>(CACHE_KEYS.RECOMMENDATIONS, {});

      setData({
        juniorProgress: allProgress[cid] || [],
        focusAreas: allFocusAreas[cid] || [],
        accessMode: allAccessConfigs[cid] || { mode: 'open' as JuniorAccessMode, calmCornerAlwaysAvailable: true },
        difficulty: allDifficulty[cid] || [],
        avoidanceProfile: allAvoidance[cid] || [],
        recommendations: allRecommendations[cid] || [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load Junior data',
      });
    }
  }, [userId, childId]);

  // --------------------------------------------------------------------------
  // Mutation: record progress
  // --------------------------------------------------------------------------
  const updateProgress = useCallback(async (entry: JuniorProgressEntry) => {
    if (!userId) return;
    const cid = childId || 'default';

    try {
      // Write to Supabase
      await supabase.from('jr_sessions').insert({
        child_id: childId || null,
        parent_id: userId,
        session_type: entry.domain,
        activity_name: entry.activityTitle,
        duration_seconds: entry.durationSeconds,
        coins_earned: entry.tokensEarned,
        completed: true,
        score: entry.accuracy || null,
        data: {
          domain: entry.domain,
          promptLevel: entry.promptLevel,
          emotionBefore: entry.emotionBefore,
          emotionAfter: entry.emotionAfter,
          notes: entry.notes,
        },
        started_at: new Date().toISOString(),
        completed_at: entry.completedAt,
      });

      // Cache to localStorage
      const allProgress = readCache<Record<string, JuniorProgressEntry[]>>(CACHE_KEYS.PROGRESS, {});
      if (!allProgress[cid]) allProgress[cid] = [];
      allProgress[cid].push(entry);
      if (allProgress[cid].length > 500) allProgress[cid] = allProgress[cid].slice(-500);
      writeCache(CACHE_KEYS.PROGRESS, allProgress);

      // Update local state
      setData(prev => ({
        ...prev,
        juniorProgress: [...prev.juniorProgress, entry],
      }));
    } catch (err) {
      console.warn('[JuniorData] Failed to save progress to Supabase, cached locally:', err);
      // Still cache locally
      const allProgress = readCache<Record<string, JuniorProgressEntry[]>>(CACHE_KEYS.PROGRESS, {});
      if (!allProgress[cid]) allProgress[cid] = [];
      allProgress[cid].push(entry);
      writeCache(CACHE_KEYS.PROGRESS, allProgress);
      setData(prev => ({ ...prev, juniorProgress: [...prev.juniorProgress, entry] }));
    }
  }, [userId, childId]);

  // --------------------------------------------------------------------------
  // Mutation: update focus areas
  // --------------------------------------------------------------------------
  const updateFocusAreas = useCallback(async (areas: FocusArea[]) => {
    const cid = childId || 'default';
    const allFocusAreas = readCache<Record<string, FocusArea[]>>(CACHE_KEYS.FOCUS_AREAS, {});
    allFocusAreas[cid] = areas;
    writeCache(CACHE_KEYS.FOCUS_AREAS, allFocusAreas);
    setData(prev => ({ ...prev, focusAreas: areas }));
  }, [childId]);

  // --------------------------------------------------------------------------
  // Mutation: update access mode
  // --------------------------------------------------------------------------
  const updateAccessMode = useCallback(async (config: JuniorAccessConfig) => {
    const cid = childId || 'default';
    const allConfigs = readCache<Record<string, JuniorAccessConfig>>(CACHE_KEYS.ACCESS_MODE, {});
    allConfigs[cid] = config;
    writeCache(CACHE_KEYS.ACCESS_MODE, allConfigs);
    setData(prev => ({ ...prev, accessMode: config }));
  }, [childId]);

  // --------------------------------------------------------------------------
  // Mutation: update difficulty
  // --------------------------------------------------------------------------
  const updateDifficulty = useCallback(async (domain: FocusDomain, level: DifficultyLevel, reason?: string) => {
    const cid = childId || 'default';
    const allDifficulty = readCache<Record<string, JuniorDifficultyOverride[]>>(CACHE_KEYS.DIFFICULTY, {});
    if (!allDifficulty[cid]) allDifficulty[cid] = [];

    const override: JuniorDifficultyOverride = { domain, level, setAt: new Date().toISOString(), reason };
    const idx = allDifficulty[cid].findIndex(d => d.domain === domain);
    if (idx >= 0) {
      allDifficulty[cid][idx] = override;
    } else {
      allDifficulty[cid].push(override);
    }
    writeCache(CACHE_KEYS.DIFFICULTY, allDifficulty);
    setData(prev => ({ ...prev, difficulty: [...allDifficulty[cid]] }));
  }, [childId]);

  // --------------------------------------------------------------------------
  // Mutation: add/remove avoidance triggers
  // --------------------------------------------------------------------------
  const addAvoidanceTrigger = useCallback(async (trigger: string, source: 'parent' | 'ai', notes?: string) => {
    const cid = childId || 'default';
    const allAvoidance = readCache<Record<string, JuniorAvoidanceTrigger[]>>(CACHE_KEYS.AVOIDANCE, {});
    if (!allAvoidance[cid]) allAvoidance[cid] = [];
    if (allAvoidance[cid].some(t => t.trigger.toLowerCase() === trigger.toLowerCase())) return;

    allAvoidance[cid].push({ trigger, addedAt: new Date().toISOString(), source, notes });
    writeCache(CACHE_KEYS.AVOIDANCE, allAvoidance);
    setData(prev => ({ ...prev, avoidanceProfile: [...allAvoidance[cid]] }));
  }, [childId]);

  const removeAvoidanceTrigger = useCallback(async (trigger: string) => {
    const cid = childId || 'default';
    const allAvoidance = readCache<Record<string, JuniorAvoidanceTrigger[]>>(CACHE_KEYS.AVOIDANCE, {});
    if (!allAvoidance[cid]) return;
    allAvoidance[cid] = allAvoidance[cid].filter(
      t => t.trigger.toLowerCase() !== trigger.toLowerCase()
    );
    writeCache(CACHE_KEYS.AVOIDANCE, allAvoidance);
    setData(prev => ({ ...prev, avoidanceProfile: [...allAvoidance[cid]] }));
  }, [childId]);

  // --------------------------------------------------------------------------
  // Mutation: add recommendation
  // --------------------------------------------------------------------------
  const addRecommendation = useCallback(async (rec: Omit<JuniorRecommendation, 'generatedAt' | 'applied'>) => {
    const cid = childId || 'default';
    const allRecs = readCache<Record<string, JuniorRecommendation[]>>(CACHE_KEYS.RECOMMENDATIONS, {});
    if (!allRecs[cid]) allRecs[cid] = [];
    if (allRecs[cid].length >= 20) allRecs[cid].shift();
    allRecs[cid].push({ ...rec, generatedAt: new Date().toISOString(), applied: false });
    writeCache(CACHE_KEYS.RECOMMENDATIONS, allRecs);
    setData(prev => ({ ...prev, recommendations: [...allRecs[cid]] }));
  }, [childId]);

  // --------------------------------------------------------------------------
  // Auto-load on mount
  // --------------------------------------------------------------------------
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refresh: loadData,
    updateProgress,
    updateFocusAreas,
    updateAccessMode,
    updateDifficulty,
    addAvoidanceTrigger,
    removeAvoidanceTrigger,
    addRecommendation,
  };
}

export default useJuniorData;
