// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ReferralAnalytics — Referral Funnel Dashboard
 *
 * Visual dashboard showing:
 * - Total invites sent
 * - Signups from referrals
 * - Conversion funnel (invited -> installed -> signed up -> subscribed)
 * - Rewards earned (free months, credits)
 * - K-factor gauge
 *
 * Data sources:
 * - Supabase `referrals` table via viral-analytics.ts
 * - Supabase `referral_codes` / `referral_rewards` via referral-program.ts
 * - Local summary via getReferralSummary()
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Gift,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Crown,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  getUserReferralStats,
  interpretKFactor,
  calculateViralMetrics,
  type ViralMetrics,
} from '../lib/viral-analytics';
import {
  getUserReferrals,
  getReferralSummary,
  REFERRAL_TIERS,
  type ReferralSummary,
} from '../lib/referral-program';

// ── Types ─────────────────────────────────────────────────────────────

interface ReferralAnalyticsProps {
  userId: string;
  referralCode: string;
  onInvitePress?: () => void;
}

interface FunnelStage {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────

export function ReferralAnalytics({
  userId,
  referralCode,
  onInvitePress,
}: ReferralAnalyticsProps) {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [viralMetrics, setViralMetrics] = useState<ViralMetrics | null>(null);
  const [userStats, setUserStats] = useState<{
    code: string;
    totalInvites: number;
    converted: number;
    pending: number;
    credits: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [referrals, stats, metrics] = await Promise.all([
        getUserReferrals(userId),
        getUserReferralStats(userId),
        calculateViralMetrics(),
      ]);

      setSummary(getReferralSummary(referrals, referralCode));
      setUserStats(stats);
      setViralMetrics(metrics);
    } catch (err) {
      console.error('[ReferralAnalytics] Failed to load data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, referralCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ── Funnel ──────────────────────────────────────────────────────────

  const funnel: FunnelStage[] = userStats
    ? [
        {
          label: 'Invites Sent',
          value: userStats.totalInvites,
          color: 'bg-blue-500',
          icon: <UserPlus className="w-4 h-4" />,
        },
        {
          label: 'Installed App',
          value: Math.round(userStats.totalInvites * 0.35), // Estimated from click-through
          color: 'bg-cyan-500',
          icon: <Users className="w-4 h-4" />,
        },
        {
          label: 'Signed Up',
          value: userStats.pending + userStats.converted,
          color: 'bg-primary',
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          label: 'Subscribed',
          value: userStats.converted,
          color: 'bg-emerald-500',
          icon: <Crown className="w-4 h-4" />,
        },
      ]
    : [];

  const maxFunnelValue = Math.max(...funnel.map((s) => s.value), 1);

  // ── Tier progress ───────────────────────────────────────────────────

  const currentTier = summary?.currentTier;
  const nextTier = summary?.nextTier;

  // ── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-[#E8E4DF] rounded w-40" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[#F0EDE8] rounded-xl" />
            ))}
          </div>
          <div className="h-32 bg-[#F0EDE8] rounded-xl" />
        </div>
      </div>
    );
  }

  // ── K-Factor interpretation ─────────────────────────────────────────

  const kInterp = viralMetrics
    ? interpretKFactor(viralMetrics.kFactor)
    : null;

  const trendIcon =
    viralMetrics?.kFactorTrend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-emerald-500" />
    ) : viralMetrics?.kFactorTrend === 'down' ? (
      <TrendingDown className="w-4 h-4 text-red-500" />
    ) : (
      <Minus className="w-4 h-4 text-[#8A9BA8]" />
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1B2733]">Referral Performance</h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-[#8A9BA8] hover:text-[#5A6B7A] hover:bg-[#F0EDE8] rounded-full transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-[#FAF7F2] to-[#F0EDE8] rounded-xl p-3.5 border border-blue-100">
          <p className="text-xs text-blue-600 font-medium">Invites</p>
          <p className="text-2xl font-bold text-blue-900 mt-0.5">
            {userStats?.totalInvites ?? 0}
          </p>
        </div>
        <div className="bg-gradient-to-br from-[#FAF7F2] to-emerald-50 rounded-xl p-3.5 border border-[#E8E4DF]">
          <p className="text-xs text-[#6B9080] font-medium">Conversions</p>
          <p className="text-2xl font-bold text-[#6B9080] mt-0.5">
            {userStats?.converted ?? 0}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3.5 border border-amber-100">
          <p className="text-xs text-amber-600 font-medium">Rewards</p>
          <p className="text-2xl font-bold text-amber-900 mt-0.5">
            {summary?.totalRewardsEarned ?? 0}
            <span className="text-sm font-normal text-amber-600 ml-0.5">mo</span>
          </p>
        </div>
      </div>

      {/* Conversion funnel */}
      {funnel.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <h4 className="text-sm font-semibold text-[#3A4A57] mb-3">
            Conversion Funnel
          </h4>
          <div className="space-y-2.5">
            {funnel.map((stage, i) => {
              const widthPct = Math.max(
                8,
                Math.round((stage.value / maxFunnelValue) * 100)
              );
              return (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-[#5A6B7A] font-medium">
                      {stage.icon}
                      {stage.label}
                    </span>
                    <span className="font-bold text-[#1B2733]">{stage.value}</span>
                  </div>
                  <div className="w-full bg-[#F0EDE8] rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`${stage.color} h-2.5 rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  {i < funnel.length - 1 && (
                    <div className="flex justify-center my-0.5">
                      <ArrowRight className="w-3 h-3 text-[#8A9BA8] rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Conversion rate */}
          {userStats && userStats.totalInvites > 0 && (
            <div className="mt-3 pt-3 border-t border-[#E8E4DF] flex items-center justify-between">
              <span className="text-xs text-[#5A6B7A]">Overall conversion</span>
              <span className="text-sm font-bold text-[#6B9080]">
                {Math.round(
                  (userStats.converted / userStats.totalInvites) * 100
                )}
                %
              </span>
            </div>
          )}
        </div>
      )}

      {/* K-Factor gauge */}
      {viralMetrics && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-[#3A4A57]">
              Viral Coefficient (K-Factor)
            </h4>
            {trendIcon}
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-[#1B2733]">
              {viralMetrics.kFactor.toFixed(2)}
            </span>
            {viralMetrics.weekOverWeekGrowth !== 0 && (
              <span
                className={`text-xs font-medium mb-1 ${
                  viralMetrics.weekOverWeekGrowth > 0
                    ? 'text-emerald-600'
                    : 'text-red-500'
                }`}
              >
                {viralMetrics.weekOverWeekGrowth > 0 ? '+' : ''}
                {viralMetrics.weekOverWeekGrowth.toFixed(1)}% WoW
              </span>
            )}
          </div>
          {kInterp && (
            <p className={`text-xs ${kInterp.color}`}>{kInterp.message}</p>
          )}
          {/* K-factor bar */}
          <div className="mt-3 relative">
            <div className="w-full bg-[#F0EDE8] rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${
                  viralMetrics.kFactor >= 1
                    ? 'bg-emerald-500'
                    : viralMetrics.kFactor >= 0.5
                    ? 'bg-blue-500'
                    : viralMetrics.kFactor >= 0.2
                    ? 'bg-amber-500'
                    : 'bg-red-400'
                }`}
                style={{
                  width: `${Math.min(100, viralMetrics.kFactor * 100)}%`,
                }}
              />
            </div>
            {/* Viral threshold marker */}
            <div
              className="absolute top-0 w-0.5 h-3 bg-gray-400"
              style={{ left: '100%', transform: 'translateX(-1px)' }}
            />
            <div className="flex justify-between text-xs text-[#8A9BA8] mt-1">
              <span>0</span>
              <span className="text-[#5A6B7A] font-medium">1.0 = Viral</span>
            </div>
          </div>
        </div>
      )}

      {/* Referral tier progress */}
      {summary && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <h4 className="text-sm font-semibold text-[#3A4A57] mb-3">
            Referral Tier
          </h4>
          {currentTier ? (
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: `${currentTier.badgeColor}20` }}
              >
                {currentTier.badgeIcon}
              </div>
              <div>
                <p className="text-sm font-bold text-[#1B2733]">
                  {currentTier.name}
                </p>
                <p className="text-xs text-[#5A6B7A]">
                  {summary.qualifiedReferrals} qualified referral
                  {summary.qualifiedReferrals !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#5A6B7A] mb-3">
              Refer your first friend to unlock rewards
            </p>
          )}

          {/* Progress to next tier */}
          {nextTier && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#5A6B7A]">
                  {summary.referralsToNextTier} more to{' '}
                  <span className="font-semibold">{nextTier.name}</span>
                </span>
                <span className="text-[#8A9BA8]">
                  {nextTier.badgeIcon}
                </span>
              </div>
              <div className="w-full bg-[#F0EDE8] rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (summary.qualifiedReferrals /
                        nextTier.minReferrals) *
                        100
                    )}%`,
                    backgroundColor: nextTier.badgeColor,
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {nextTier.perks.map((perk) => (
                  <span
                    key={perk}
                    className="text-xs bg-[#FAF7F2] text-[#5A6B7A] px-2 py-0.5 rounded-full border border-[#E8E4DF]"
                  >
                    {perk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Already at max tier */}
          {!nextTier && currentTier && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              <Sparkles className="w-4 h-4" />
              <span>
                You are at the highest referral tier. Thank you for spreading the
                word!
              </span>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      {onInvitePress && (
        <button
          onClick={onInvitePress}
          className="w-full py-3 bg-primary hover:bg-[#6B9080] text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Gift className="w-4 h-4" />
          Invite More Friends
        </button>
      )}
    </div>
  );
}

export default ReferralAnalytics;
