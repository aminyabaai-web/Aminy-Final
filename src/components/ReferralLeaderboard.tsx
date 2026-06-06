/**
 * ReferralLeaderboard.tsx
 *
 * Anonymized leaderboard showing top referrers with gamification.
 * - Rank, anonymized name (e.g. "Sarah T."), referral count, tier badge
 * - Current user highlighted with their position
 * - Weekly / Monthly / All-time tabs
 * - Progress to next tier
 *
 * Data sourced from existing referral tables via Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { Trophy, Medal, Crown, ChevronUp, Flame, Star } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { REFERRAL_TIERS, type ReferralTier, getReferralTier } from '../lib/referral-program';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimeRange = 'weekly' | 'monthly' | 'all_time';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  anonymizedName: string;
  referralCount: number;
  tier: ReferralTier | null;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Turn "Sarah Thompson" into "Sarah T." — privacy-safe */
function anonymizeName(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) return 'Aminy User';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function getTimeRangeFilter(range: TimeRange): string | null {
  const now = new Date();
  switch (range) {
    case 'weekly': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo.toISOString();
    }
    case 'monthly': {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo.toISOString();
    }
    case 'all_time':
      return null;
  }
}

function getTierBadge(tier: ReferralTier | null): {
  icon: typeof Trophy;
  color: string;
  label: string;
} {
  if (!tier) {
    return { icon: Star, color: 'text-gray-400', label: 'Starter' };
  }
  switch (tier.name) {
    case 'Ambassador':
      return { icon: Crown, color: 'text-amber-500', label: 'Ambassador' };
    case 'Champion':
      return { icon: Trophy, color: 'text-primary', label: 'Champion' };
    case 'Supporter':
    default:
      return { icon: Medal, color: 'text-blue-500', label: 'Supporter' };
  }
}

function getRankStyle(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-amber-50 border-amber-200';
    case 2:
      return 'bg-[#FAF7F2] border-gray-200';
    case 3:
      return 'bg-orange-50 border-orange-200';
    default:
      return 'bg-white border-gray-100';
  }
}

function getRankBadge(rank: number): string {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return `#${rank}`;
  }
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchLeaderboard(
  range: TimeRange,
  currentUserId: string | null
): Promise<LeaderboardData> {
  try {
    const sinceDate = getTimeRangeFilter(range);

    // Query referrals grouped by referrer_id, counting converted referrals
    let query = supabase
      .from('referrals')
      .select('referrer_id, status, created_at')
      .in('status', ['converted', 'rewarded']);

    if (sinceDate) {
      query = query.gte('created_at', sinceDate);
    }

    const { data: referrals, error } = await query;

    if (error) {
      console.warn('[Leaderboard] Error fetching referrals:', error);
      return {
        entries: [],
        currentUserEntry: null,
        loading: false,
        error: 'Unable to load leaderboard',
      };
    }

    // Aggregate by referrer_id
    const countMap = new Map<string, number>();
    for (const ref of referrals ?? []) {
      const uid = ref.referrer_id as string;
      countMap.set(uid, (countMap.get(uid) ?? 0) + 1);
    }

    // Sort descending by count
    const sorted = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50); // top 50

    // Fetch profile names for top entries
    const userIds = sorted.map(([uid]) => uid);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, display_name')
      .in('id', userIds.length > 0 ? userIds : ['__none__']);

    const profileMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      profileMap.set(
        p.id,
        anonymizeName(p.display_name || p.full_name)
      );
    }

    // Build entries
    const entries: LeaderboardEntry[] = sorted.map(([uid, count], idx) => ({
      rank: idx + 1,
      userId: uid,
      anonymizedName: profileMap.get(uid) ?? 'Aminy User',
      referralCount: count,
      tier: getReferralTier(count),
      isCurrentUser: uid === currentUserId,
    }));

    // Find current user entry (may not be in top 50)
    let currentUserEntry: LeaderboardEntry | null = null;
    if (currentUserId) {
      const existing = entries.find((e) => e.isCurrentUser);
      if (existing) {
        currentUserEntry = existing;
      } else {
        // User is not in top 50 — compute their rank
        const userCount = countMap.get(currentUserId) ?? 0;
        const rank =
          sorted.filter(([, count]) => count > userCount).length + 1;
        currentUserEntry = {
          rank,
          userId: currentUserId,
          anonymizedName: 'You',
          referralCount: userCount,
          tier: getReferralTier(userCount),
          isCurrentUser: true,
        };
      }
    }

    return { entries, currentUserEntry, loading: false, error: null };
  } catch (err) {
    console.error('[Leaderboard] Unexpected error:', err);
    return {
      entries: [],
      currentUserEntry: null,
      loading: false,
      error: 'Something went wrong',
    };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ReferralLeaderboardProps {
  currentUserId: string | null;
  onClose?: () => void;
}

export function ReferralLeaderboard({
  currentUserId,
  onClose,
}: ReferralLeaderboardProps) {
  const [range, setRange] = useState<TimeRange>('all_time');
  const [data, setData] = useState<LeaderboardData>({
    entries: [],
    currentUserEntry: null,
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    const result = await fetchLeaderboard(range, currentUserId);
    setData(result);
  }, [range, currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Next tier progress for current user
  const nextTierInfo = data.currentUserEntry
    ? (() => {
        const count = data.currentUserEntry.referralCount;
        const currentTier = getReferralTier(count);
        const currentTierIndex = currentTier
          ? REFERRAL_TIERS.indexOf(currentTier)
          : -1;
        const nextTier =
          currentTierIndex < REFERRAL_TIERS.length - 1
            ? REFERRAL_TIERS[currentTierIndex + 1]
            : null;
        if (!nextTier) return null;
        const needed = nextTier.minReferrals - count;
        const progress =
          currentTier
            ? ((count - currentTier.minReferrals) /
                (nextTier.minReferrals - currentTier.minReferrals)) *
              100
            : (count / nextTier.minReferrals) * 100;
        return { nextTier, needed, progress: Math.min(100, Math.max(0, progress)) };
      })()
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden max-w-md w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <h2 className="font-bold text-lg">Referral Leaderboard</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-sm"
            >
              Close
            </button>
          )}
        </div>

        {/* Time range tabs */}
        <div className="flex gap-1 mt-3 bg-white/15 rounded-lg p-0.5">
          {(
            [
              { key: 'weekly', label: 'This Week' },
              { key: 'monthly', label: 'This Month' },
              { key: 'all_time', label: 'All Time' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                range === key
                  ? 'bg-white text-[#6B9080] shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Current user progress to next tier */}
      {nextTierInfo && data.currentUserEntry && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-[#6B9080]/10 border border-teal-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-teal-800">
              Next tier: {nextTierInfo.nextTier.badgeIcon}{' '}
              {nextTierInfo.nextTier.name}
            </span>
            <span className="text-xs text-[#6B9080]">
              {nextTierInfo.needed} more referral
              {nextTierInfo.needed !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="w-full h-2 bg-[#6B9080]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${nextTierInfo.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      <div className="p-4">
        {data.loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#6B9080]/20 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : data.error ? (
          <p className="text-center text-sm text-gray-500 py-8">
            {data.error}
          </p>
        ) : data.entries.length === 0 ? (
          <div className="text-center py-8">
            <Flame className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No referrals yet. Be the first!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.entries.slice(0, 20).map((entry) => {
              const badge = getTierBadge(entry.tier);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    entry.isCurrentUser
                      ? 'bg-[#6B9080]/10 border-[#6B9080]/20 ring-1 ring-teal-300'
                      : getRankStyle(entry.rank)
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center font-bold text-sm">
                    {entry.rank <= 3 ? (
                      <span className="text-lg">{getRankBadge(entry.rank)}</span>
                    ) : (
                      <span className="text-gray-500">
                        {getRankBadge(entry.rank)}
                      </span>
                    )}
                  </div>

                  {/* Avatar placeholder + name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-medium text-sm truncate ${
                          entry.isCurrentUser
                            ? 'text-teal-800'
                            : 'text-gray-900'
                        }`}
                      >
                        {entry.isCurrentUser
                          ? `${entry.anonymizedName} (You)`
                          : entry.anonymizedName}
                      </span>
                      <BadgeIcon
                        size={14}
                        className={badge.color}
                      />
                    </div>
                    {entry.tier && (
                      <span className="text-xs text-gray-500">
                        {entry.tier.badgeIcon} {entry.tier.name}
                      </span>
                    )}
                  </div>

                  {/* Referral count */}
                  <div className="text-right">
                    <span className="font-bold text-sm text-gray-900">
                      {entry.referralCount}
                    </span>
                    <p className="text-xs text-gray-400">
                      referral{entry.referralCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Current user outside top 20 */}
            {data.currentUserEntry &&
              !data.entries.slice(0, 20).some((e) => e.isCurrentUser) && (
                <>
                  <div className="flex items-center gap-2 py-1 px-3">
                    <div className="flex-1 border-t border-dashed border-gray-200" />
                    <ChevronUp size={14} className="text-gray-400" />
                    <div className="flex-1 border-t border-dashed border-gray-200" />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border bg-[#6B9080]/10 border-[#6B9080]/20 ring-1 ring-teal-300">
                    <div className="w-8 text-center font-bold text-sm text-gray-500">
                      #{data.currentUserEntry.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-teal-800">
                        You
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-gray-900">
                        {data.currentUserEntry.referralCount}
                      </span>
                      <p className="text-xs text-gray-400">
                        referral
                        {data.currentUserEntry.referralCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReferralLeaderboard;
