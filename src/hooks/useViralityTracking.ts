// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useViralityTracking — React Hook for Virality Engine
 *
 * Wraps the virality-engine.ts classes for use in React components.
 * Provides:
 *   - useShareTracking()  — track share events, get share count, referral link
 *   - useGrowthLoop()     — detect share triggers, get prompt config
 *   - useLeaderboard()    — weekly leaderboard, community stats
 *
 * Auto-tracks share events from MilestoneShareCard, community interactions,
 * and any component that calls `trackShare()`.
 *
 * @see src/lib/virality-engine.ts — underlying engine
 * @see src/hooks/useReferralData.ts — existing referral code hook (complementary)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getReferralTracker,
  getShareAnalytics,
  getGrowthLoopEngine,
  getLeaderboardService,
  type SharePlatform,
  type ShareContentType,
  type ShareTriggerType,
  type SharePromptConfig,
  type ShareMetrics,
  type ReferralStats,
  type LeaderboardEntry,
  type CommunityStats,
} from '../lib/virality-engine';

// ============================================================================
// useShareTracking
// ============================================================================

export interface UseShareTrackingReturn {
  /** Track a share event */
  trackShare: (
    contentType: ShareContentType,
    platform: SharePlatform,
    contentId?: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  /** Generate a referral link for the current user */
  generateReferralLink: (campaign?: string) => Promise<{ url: string; referralCode: string }>;
  /** Current referral link (generated on mount) */
  referralLink: string | null;
  /** Current referral code */
  referralCode: string | null;
  /** Total shares by this user */
  shareCount: number;
  /** Full referral stats */
  referralStats: ReferralStats | null;
  /** Share metrics for the current period */
  shareMetrics: ShareMetrics | null;
  /** K-factor for the last 30 days */
  viralCoefficient: number;
  /** Loading state */
  loading: boolean;
}

export function useShareTracking(userId?: string): UseShareTrackingReturn {
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [shareCount, setShareCount] = useState(0);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [shareMetrics, setShareMetrics] = useState<ShareMetrics | null>(null);
  const [viralCoefficient, setViralCoefficient] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Memoize engine instances to avoid re-creating on every render
  const tracker = useMemo(
    () => (userId ? getReferralTracker(userId) : null),
    [userId]
  );
  const analytics = useMemo(
    () => (userId ? getShareAnalytics(userId) : null),
    [userId]
  );

  // Load initial data
  useEffect(() => {
    if (!userId || !tracker || !analytics) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      try {
        // Generate referral link
        const linkResult = await tracker!.generateReferralLink('default');
        if (cancelled) return;
        setReferralLink(linkResult.url);
        setReferralCode(linkResult.referralCode);

        // Load referral stats
        const stats = await tracker!.getReferralStats();
        if (cancelled) return;
        setReferralStats(stats);
        setShareCount(stats.totalShares);

        // Load share metrics (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const metrics = await analytics!.getShareMetrics({
          start: thirtyDaysAgo.toISOString(),
          end: now.toISOString(),
        });
        if (cancelled) return;
        setShareMetrics(metrics);

        // Calculate viral coefficient
        const kResult = await analytics!.calculateViralCoefficient(30);
        if (cancelled) return;
        setViralCoefficient(kResult.kFactor);
      } catch (err) {
        console.warn('[useShareTracking] Failed to load data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [userId, tracker, analytics]);

  // Clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const trackShare = useCallback(async (
    contentType: ShareContentType,
    platform: SharePlatform,
    contentId?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!analytics) return;
    await analytics.trackShareEvent(contentType, platform, contentId, metadata);
    if (mountedRef.current) {
      setShareCount(prev => prev + 1);
    }
  }, [analytics]);

  const generateReferralLinkFn = useCallback(async (
    campaign?: string
  ): Promise<{ url: string; referralCode: string }> => {
    if (!tracker) {
      return { url: '', referralCode: '' };
    }
    const result = await tracker.generateReferralLink(campaign);
    if (mountedRef.current) {
      setReferralLink(result.url);
      setReferralCode(result.referralCode);
    }
    return result;
  }, [tracker]);

  return {
    trackShare,
    generateReferralLink: generateReferralLinkFn,
    referralLink,
    referralCode,
    shareCount,
    referralStats,
    shareMetrics,
    viralCoefficient,
    loading,
  };
}

// ============================================================================
// useGrowthLoop
// ============================================================================

export interface UseGrowthLoopReturn {
  /** Check if an event should trigger a share prompt */
  checkShareTrigger: (event: { type: string; data?: Record<string, unknown> }) => ShareTriggerType | null;
  /** Get share prompt config for a trigger */
  getPromptConfig: (triggerType: ShareTriggerType) => SharePromptConfig;
  /** Whether the user can be shown a share prompt right now */
  canShowPrompt: boolean;
  /** Show a share prompt (call this after displaying the prompt UI) */
  recordPromptShown: () => void;
  /** Currently active share prompt (null if none) */
  activePrompt: SharePromptConfig | null;
  /** Trigger a share prompt from an event */
  triggerSharePrompt: (event: { type: string; data?: Record<string, unknown> }) => SharePromptConfig | null;
  /** Dismiss the active prompt */
  dismissPrompt: () => void;
}

export function useGrowthLoop(userId?: string): UseGrowthLoopReturn {
  const [canShowPrompt, setCanShowPrompt] = useState(false);
  const [activePrompt, setActivePrompt] = useState<SharePromptConfig | null>(null);

  const engine = useMemo(() => getGrowthLoopEngine(), []);

  // Check if prompts are allowed on mount
  useEffect(() => {
    if (!userId) return;
    setCanShowPrompt(engine.shouldShowSharePrompt(userId));
  }, [userId, engine]);

  const checkShareTrigger = useCallback((
    event: { type: string; data?: Record<string, unknown> }
  ): ShareTriggerType | null => {
    return engine.identifyShareTrigger(event);
  }, [engine]);

  const getPromptConfig = useCallback((
    triggerType: ShareTriggerType
  ): SharePromptConfig => {
    return engine.getSharePromptConfig(triggerType);
  }, [engine]);

  const recordPromptShown = useCallback(() => {
    if (!userId) return;
    engine.recordPromptShown(userId);
    setCanShowPrompt(engine.shouldShowSharePrompt(userId));
  }, [userId, engine]);

  const triggerSharePrompt = useCallback((
    event: { type: string; data?: Record<string, unknown> }
  ): SharePromptConfig | null => {
    if (!userId || !engine.shouldShowSharePrompt(userId)) return null;

    const trigger = engine.identifyShareTrigger(event);
    if (!trigger) return null;

    const config = engine.getSharePromptConfig(trigger);
    setActivePrompt(config);
    engine.recordPromptShown(userId);
    setCanShowPrompt(engine.shouldShowSharePrompt(userId));
    return config;
  }, [userId, engine]);

  const dismissPrompt = useCallback(() => {
    setActivePrompt(null);
  }, []);

  return {
    checkShareTrigger,
    getPromptConfig,
    canShowPrompt,
    recordPromptShown,
    activePrompt,
    triggerSharePrompt,
    dismissPrompt,
  };
}

// ============================================================================
// useLeaderboard
// ============================================================================

export interface UseLeaderboardReturn {
  /** Weekly leaderboard entries */
  leaderboard: LeaderboardEntry[];
  /** Aggregate community stats */
  communityStats: CommunityStats | null;
  /** Current metric being displayed */
  currentMetric: 'activities_completed' | 'streak_days' | 'junior_levels';
  /** Change the leaderboard metric */
  setMetric: (metric: 'activities_completed' | 'streak_days' | 'junior_levels') => void;
  /** Refresh leaderboard data */
  refresh: () => Promise<void>;
  /** Loading state */
  loading: boolean;
}

export function useLeaderboard(): UseLeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [currentMetric, setCurrentMetric] = useState<'activities_completed' | 'streak_days' | 'junior_levels'>('activities_completed');
  const [loading, setLoading] = useState(true);

  const service = useMemo(() => getLeaderboardService(), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lb, stats] = await Promise.all([
        service.getWeeklyLeaderboard(currentMetric),
        service.getCommunityStats(),
      ]);
      setLeaderboard(lb);
      setCommunityStats(stats);
    } catch (err) {
      console.warn('[useLeaderboard] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [service, currentMetric]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setMetric = useCallback((
    metric: 'activities_completed' | 'streak_days' | 'junior_levels'
  ) => {
    setCurrentMetric(metric);
  }, []);

  return {
    leaderboard,
    communityStats,
    currentMetric,
    setMetric,
    refresh: loadData,
    loading,
  };
}

// ============================================================================
// Convenience re-exports
// ============================================================================

export type {
  SharePlatform,
  ShareContentType,
  ShareTriggerType,
  SharePromptConfig,
  ShareMetrics,
  ReferralStats,
  LeaderboardEntry,
  CommunityStats,
};

export default {
  useShareTracking,
  useGrowthLoop,
  useLeaderboard,
};
