// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useOnboardingData Hook
 * Loads onboarding/screening data from Supabase with localStorage fallback.
 *
 * For screens: free-screening, onboarding, create-account
 * Tables: profiles (002_profiles_and_stripe), screening_recommendations (20260303)
 * Replaces localStorage keys: aminy_screening_results, aminy_screening_routing, aminy-onboarding-progress
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ScreeningResult {
  question: string;
  answer: string | number | boolean;
  score?: number;
  flagged?: boolean;
}

export interface ScreeningRouting {
  concernLevel: 'low' | 'medium' | 'high';
  recommendedProvider?: string;
  suggestedConcern?: string;
  urgency?: string;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  parentName?: string;
  childName?: string;
  childAge?: number;
  relationship?: string;
  state?: string;
  concerns?: string[];
  completedAt?: string;
}

export interface OnboardingData {
  screeningResults: ScreeningResult[];
  screeningRouting: ScreeningRouting | null;
  onboardingProgress: OnboardingProgress | null;
  hasCompletedOnboarding: boolean;
  hasCompletedScreening: boolean;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache keys
// ============================================================================

const CACHE_KEYS = {
  SCREENING_RESULTS: 'aminy_screening_results',
  SCREENING_ROUTING: 'aminy_screening_routing',
  ONBOARDING_PROGRESS: 'aminy-onboarding-progress',
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
  } catch { /* ignore */ }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useOnboardingData(
  userId?: string,
): OnboardingData & {
  refetch: () => Promise<void>;
  saveScreeningResults: (results: ScreeningResult[], routing?: ScreeningRouting) => Promise<void>;
  saveOnboardingProgress: (progress: Partial<OnboardingProgress>) => Promise<void>;
  completeOnboarding: (profile: {
    parentName: string;
    childName: string;
    relationship: string;
    state: string;
  }) => Promise<boolean>;
  clearOnboardingData: () => void;
} {
  const [data, setData] = useState<OnboardingData>({
    screeningResults: [],
    screeningRouting: null,
    onboardingProgress: null,
    hasCompletedOnboarding: false,
    hasCompletedScreening: false,
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!userId) {
      // No user — load from localStorage only (pre-auth onboarding flow)
      const results = readCache<ScreeningResult[]>(CACHE_KEYS.SCREENING_RESULTS, []);
      const routing = readCache<ScreeningRouting | null>(CACHE_KEYS.SCREENING_ROUTING, null);
      const progress = readCache<OnboardingProgress | null>(CACHE_KEYS.ONBOARDING_PROGRESS, null);

      setData({
        screeningResults: results,
        screeningRouting: routing,
        onboardingProgress: progress,
        hasCompletedOnboarding: false,
        hasCompletedScreening: results.length > 0,
        loading: false,
        error: null,
      });
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [profileResult, screeningResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('has_completed_onboarding, parent_name, child_name, relationship, state')
          .eq('id', userId)
          .single()
          .then(null, (err: unknown) => {
            console.warn('[Onboarding] Profile fetch failed:', err);
            return { data: null, error: err };
          }),

        supabase
          .from('screening_recommendations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
          .then(null, (err: unknown) => {
            console.warn('[Onboarding] Screening fetch failed:', err);
            return { data: [], error: err };
          }),
      ]);

      const profile = profileResult?.data;
      const screeningRecs = Array.isArray(screeningResult?.data) ? screeningResult.data : [];

      // Also read localStorage for pre-login screening data
      const cachedResults = readCache<ScreeningResult[]>(CACHE_KEYS.SCREENING_RESULTS, []);
      const cachedRouting = readCache<ScreeningRouting | null>(CACHE_KEYS.SCREENING_ROUTING, null);
      const cachedProgress = readCache<OnboardingProgress | null>(CACHE_KEYS.ONBOARDING_PROGRESS, null);

      const hasCompletedOnboarding = profile?.has_completed_onboarding || false;

      // If we have DB screening recs, use those; otherwise use cached
      const hasDbScreening = screeningRecs.length > 0;
      const screeningResults = hasDbScreening
        ? screeningRecs.map((r: Record<string, unknown>) => ({
            question: (r.instrument as string) || '',
            answer: (r.reason as string) || '',
            score: undefined,
            flagged: (r.priority as string) === 'high',
          }))
        : cachedResults;

      setData({
        screeningResults,
        screeningRouting: cachedRouting,
        onboardingProgress: hasCompletedOnboarding
          ? {
              currentStep: 0,
              totalSteps: 0,
              completedSteps: ['all'],
              parentName: profile?.parent_name || '',
              childName: profile?.child_name || '',
              completedAt: 'completed',
            }
          : cachedProgress,
        hasCompletedOnboarding,
        hasCompletedScreening: screeningResults.length > 0,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.error('[Onboarding] Load failed:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load onboarding data',
      }));
    }
  }, [userId]);

  const saveScreeningResults = useCallback(async (
    results: ScreeningResult[],
    routing?: ScreeningRouting,
  ) => {
    // Always cache locally (works pre-auth)
    writeCache(CACHE_KEYS.SCREENING_RESULTS, results);
    if (routing) {
      writeCache(CACHE_KEYS.SCREENING_ROUTING, routing);
    }

    // If authenticated, also persist to Supabase
    if (userId) {
      try {
        const flagged = results.filter(r => r.flagged);
        if (flagged.length > 0) {
          const inserts = flagged.map(r => ({
            user_id: userId,
            instrument: r.question,
            reason: typeof r.answer === 'string' ? r.answer : JSON.stringify(r.answer),
            priority: r.flagged ? 'high' : 'medium',
          }));
          await supabase.from('screening_recommendations').insert(inserts);
        }
      } catch (err) {
        console.warn('[Onboarding] Save screening to Supabase failed:', err);
      }
    }

    setData(prev => ({
      ...prev,
      screeningResults: results,
      screeningRouting: routing || prev.screeningRouting,
      hasCompletedScreening: results.length > 0,
    }));
  }, [userId]);

  const saveOnboardingProgress = useCallback(async (progress: Partial<OnboardingProgress>) => {
    const current = readCache<OnboardingProgress | null>(CACHE_KEYS.ONBOARDING_PROGRESS, null) || {
      currentStep: 0,
      totalSteps: 6,
      completedSteps: [],
    };
    const updated = { ...current, ...progress };
    writeCache(CACHE_KEYS.ONBOARDING_PROGRESS, updated);

    setData(prev => ({ ...prev, onboardingProgress: updated }));
  }, []);

  const completeOnboarding = useCallback(async (profile: {
    parentName: string;
    childName: string;
    relationship: string;
    state: string;
  }): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          parent_name: profile.parentName,
          child_name: profile.childName,
          relationship: profile.relationship,
          state: profile.state,
          has_completed_onboarding: true,
        })
        .eq('id', userId);

      if (error) throw error;

      // Clear localStorage onboarding data
      localStorage.removeItem(CACHE_KEYS.ONBOARDING_PROGRESS);

      await loadData();
      return true;
    } catch (err) {
      console.error('[Onboarding] Complete failed:', err);
      return false;
    }
  }, [userId, loadData]);

  const clearOnboardingData = useCallback(() => {
    localStorage.removeItem(CACHE_KEYS.SCREENING_RESULTS);
    localStorage.removeItem(CACHE_KEYS.SCREENING_ROUTING);
    localStorage.removeItem(CACHE_KEYS.ONBOARDING_PROGRESS);
    setData(prev => ({
      ...prev,
      screeningResults: [],
      screeningRouting: null,
      onboardingProgress: null,
      hasCompletedScreening: false,
    }));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refetch: loadData,
    saveScreeningResults,
    saveOnboardingProgress,
    completeOnboarding,
    clearOnboardingData,
  };
}

export default useOnboardingData;
