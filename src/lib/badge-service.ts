// Badge system — definitions + Supabase-backed award logic
import { supabase } from '../utils/supabase/client';

export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  triggerEvent: string;
  requirementCount: number;
}

export interface EarnedBadge extends BadgeDefinition {
  earnedAt: string;
  celebrationShown: boolean;
}

// ── Badge Definitions ────────────────────────────────────────────────

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_screening',
    name: 'First Steps',
    emoji: '🔍',
    description: 'Completed your first screening',
    triggerEvent: 'screening',
    requirementCount: 1,
  },
  {
    id: 'first_booking',
    name: 'Connected',
    emoji: '📅',
    description: 'Booked your first appointment',
    triggerEvent: 'booking',
    requirementCount: 1,
  },
  {
    id: 'first_conversation',
    name: 'Hello Aminy',
    emoji: '💬',
    description: 'Had your first AI conversation',
    triggerEvent: 'conversation',
    requirementCount: 1,
  },
  {
    id: 'conversation_10',
    name: 'Deep Listener',
    emoji: '🧠',
    description: 'Had 10 conversations with Aminy',
    triggerEvent: 'conversation',
    requirementCount: 10,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    emoji: '🔥',
    description: '7-day streak',
    triggerEvent: 'streak',
    requirementCount: 7,
  },
  {
    id: 'streak_30',
    name: 'Monthly Champion',
    emoji: '🏆',
    description: '30-day streak',
    triggerEvent: 'streak',
    requirementCount: 30,
  },
  {
    id: 'community_first',
    name: 'Community Voice',
    emoji: '🤝',
    description: 'Made your first community post',
    triggerEvent: 'community_post',
    requirementCount: 1,
  },
  {
    id: 'vault_first',
    name: 'Organized',
    emoji: '📁',
    description: 'Uploaded your first document',
    triggerEvent: 'vault_upload',
    requirementCount: 1,
  },
  {
    id: 'calm_session_5',
    name: 'Finding Peace',
    emoji: '🌊',
    description: 'Completed 5 calm sessions',
    triggerEvent: 'calm_session',
    requirementCount: 5,
  },
  {
    id: 'calm_session_20',
    name: 'Zen Master',
    emoji: '🧘',
    description: 'Completed 20 calm sessions',
    triggerEvent: 'calm_session',
    requirementCount: 20,
  },
];

// ── Check & Award ────────────────────────────────────────────────────

export async function checkAndAwardBadges(
  userId: string,
  event: string,
  count?: number
): Promise<EarnedBadge[]> {
  if (!userId) return [];

  try {
    // Get already-earned badges
    const { data: existing } = await supabase
      .from('user_milestones')
      .select('milestone_type')
      .eq('user_id', userId);

    const earnedIds = new Set((existing || []).map((m: { milestone_type: string }) => m.milestone_type));

    // Find badges matching this event that haven't been earned yet
    const candidates = BADGE_DEFINITIONS.filter(
      b => b.triggerEvent === event && !earnedIds.has(b.id)
    );

    if (candidates.length === 0) return [];

    // For count-based badges, check if the count meets the requirement
    const newBadges: EarnedBadge[] = [];

    for (const badge of candidates) {
      let meetsRequirement = false;

      if (count !== undefined) {
        meetsRequirement = count >= badge.requirementCount;
      } else if (badge.requirementCount === 1) {
        // Single-event badges always award on trigger
        meetsRequirement = true;
      } else {
        // Query for event count from relevant tables
        meetsRequirement = await checkEventCount(userId, badge);
      }

      if (meetsRequirement) {
        const now = new Date().toISOString();

        // Insert into user_milestones
        await supabase.from('user_milestones').insert({
          user_id: userId,
          milestone_type: badge.id,
          milestone_data: { name: badge.name, emoji: badge.emoji },
          celebration_shown: false,
          achieved_at: now,
        });

        newBadges.push({
          ...badge,
          earnedAt: now,
          celebrationShown: false,
        });
      }
    }

    return newBadges;
  } catch (err) {
    console.error('Badge check error:', err);
    return [];
  }
}

async function checkEventCount(userId: string, badge: BadgeDefinition): Promise<boolean> {
  try {
    switch (badge.triggerEvent) {
      case 'conversation': {
        const { count } = await supabase
          .from('conversation_memories')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        return (count || 0) >= badge.requirementCount;
      }
      case 'calm_session': {
        const { count } = await supabase
          .from('calm_tool_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        return (count || 0) >= badge.requirementCount;
      }
      case 'streak': {
        const { data } = await supabase
          .from('user_streaks')
          .select('longest_streak')
          .eq('user_id', userId)
          .single();
        return (data?.longest_streak || 0) >= badge.requirementCount;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

// ── Getters ──────────────────────────────────────────────────────────

export async function getUserBadges(userId: string): Promise<EarnedBadge[]> {
  if (!userId) return [];

  try {
    const { data } = await supabase
      .from('user_milestones')
      .select('milestone_type, achieved_at, celebration_shown')
      .eq('user_id', userId)
      .order('achieved_at', { ascending: false });

    if (!data) return [];

    return data
      .map((m: { milestone_type: string; achieved_at: string; celebration_shown?: boolean }) => {
        const def = BADGE_DEFINITIONS.find(b => b.id === m.milestone_type);
        if (!def) return null;
        return {
          ...def,
          earnedAt: m.achieved_at,
          celebrationShown: m.celebration_shown ?? true,
        };
      })
      .filter(Boolean) as EarnedBadge[];
  } catch {
    return [];
  }
}

export async function getNewBadges(userId: string): Promise<EarnedBadge[]> {
  const badges = await getUserBadges(userId);
  return badges.filter(b => !b.celebrationShown);
}

export async function markBadgeCelebrated(userId: string, badgeId: string): Promise<void> {
  try {
    await supabase
      .from('user_milestones')
      .update({ celebration_shown: true })
      .eq('user_id', userId)
      .eq('milestone_type', badgeId);
  } catch { /* ignore */ }
}
