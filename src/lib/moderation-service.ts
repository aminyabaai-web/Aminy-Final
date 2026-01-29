/**
 * Moderation Service
 *
 * Handles content moderation queue management, AI content analysis,
 * and moderation actions. Connects ModerationDashboard to real data.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type ContentType = 'post' | 'comment' | 'message' | 'profile' | 'document';
export type FlagCategory = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'self_harm' | 'privacy' | 'copyright' | 'other';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

export interface FlaggedContent {
  id: string;
  contentType: ContentType;
  contentId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  flagCategory: FlagCategory;
  flagReason?: string;
  flaggedBy: string | null; // null if AI-flagged
  flaggedAt: string;
  aiConfidence?: number;
  aiExplanation?: string;
  status: ModerationStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface ModerationStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  escalatedToday: number;
  avgResponseTime: number; // in minutes
}

export interface UserModerationHistory {
  userId: string;
  userName: string;
  userEmail: string;
  totalFlags: number;
  approvedFlags: number;
  rejectedFlags: number;
  warnings: number;
  status: 'good_standing' | 'warned' | 'restricted' | 'suspended' | 'banned';
  lastFlagDate?: string;
}

export interface ModerationAction {
  action: 'approve' | 'reject' | 'escalate';
  notes?: string;
  warnUser?: boolean;
  removeContent?: boolean;
}

// ============================================================================
// AI Content Analysis
// ============================================================================

// Keywords and patterns for basic content analysis
const HARMFUL_PATTERNS = {
  self_harm: [
    /\b(suicide|self.?harm|kill\s+myself|end\s+my\s+life|want\s+to\s+die)\b/i,
    /\b(cutting|hurting\s+myself)\b/i,
  ],
  harassment: [
    /\b(stupid|idiot|dumb|hate\s+you|f\*+k|sh\*+t)\b/i,
    /\b(kill\s+yourself|die)\b/i,
  ],
  spam: [
    /\b(buy\s+now|click\s+here|free\s+money|act\s+fast)\b/i,
    /(http[s]?:\/\/[^\s]+){3,}/i, // Multiple URLs
  ],
  misinformation: [
    /\b(cure|treatment|guaranteed|100%|miracle)\b.*\b(autism|adhd|asd)\b/i,
    /\b(vaccines?\s+cause|bleach|mms)\b/i,
  ],
  privacy: [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Emails
    /\b\d{3}[-]?\d{2}[-]?\d{4}\b/, // SSN-like
  ],
};

/**
 * Analyze content for potential policy violations
 */
export function analyzeContent(content: string): {
  shouldFlag: boolean;
  category?: FlagCategory;
  confidence: number;
  explanation?: string;
} {
  const normalizedContent = content.toLowerCase();

  // Check each category
  for (const [category, patterns] of Object.entries(HARMFUL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return {
          shouldFlag: true,
          category: category as FlagCategory,
          confidence: 0.85,
          explanation: `Content matches ${category} pattern`,
        };
      }
    }
  }

  // Check for excessive caps (shouting)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.5 && content.length > 20) {
    return {
      shouldFlag: true,
      category: 'inappropriate',
      confidence: 0.6,
      explanation: 'Excessive use of capital letters',
    };
  }

  return {
    shouldFlag: false,
    confidence: 0.1,
  };
}

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Flag content for moderation
 */
export async function flagContent(
  contentType: ContentType,
  contentId: string,
  content: string,
  authorId: string,
  authorName: string,
  options: {
    category: FlagCategory;
    reason?: string;
    flaggedBy?: string; // null for AI
    aiConfidence?: number;
    aiExplanation?: string;
  }
): Promise<{ success: boolean; itemId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('moderation_queue')
      .insert({
        content_type: contentType,
        content_id: contentId,
        content_text: content,
        content_author_id: authorId,
        content_author_name: authorName,
        flag_category: options.category,
        flag_reason: options.reason,
        flagged_by: options.flaggedBy,
        ai_confidence: options.aiConfidence,
        ai_explanation: options.aiExplanation,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, itemId: data.id };
  } catch (error) {
    console.error('[Moderation] Error flagging content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to flag content',
    };
  }
}

/**
 * Get moderation queue with optional filters
 */
export async function getModerationQueue(options?: {
  status?: ModerationStatus;
  contentType?: ContentType;
  category?: FlagCategory;
  limit?: number;
}): Promise<FlaggedContent[]> {
  try {
    let query = supabase
      .from('moderation_queue')
      .select('*')
      .order('flagged_at', { ascending: false })
      .limit(options?.limit || 50);

    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.contentType) {
      query = query.eq('content_type', options.contentType);
    }
    if (options?.category) {
      query = query.eq('flag_category', options.category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      contentType: item.content_type,
      contentId: item.content_id,
      content: item.content_text || '',
      authorId: item.content_author_id,
      authorName: item.content_author_name || 'Unknown',
      flagCategory: item.flag_category,
      flagReason: item.flag_reason,
      flaggedBy: item.flagged_by,
      flaggedAt: item.flagged_at,
      aiConfidence: item.ai_confidence,
      aiExplanation: item.ai_explanation,
      status: item.status,
      resolvedBy: item.resolved_by,
      resolvedAt: item.resolved_at,
      resolutionNotes: item.resolution_notes,
    }));
  } catch (error) {
    console.error('[Moderation] Error fetching queue:', error);
    return [];
  }
}

/**
 * Get moderation statistics
 */
export async function getModerationStats(): Promise<ModerationStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingResult, todayResult, avgTimeResult] = await Promise.all([
      // Pending count
      supabase
        .from('moderation_queue')
        .select('id', { count: 'exact' })
        .eq('status', 'pending'),

      // Today's resolved items
      supabase
        .from('moderation_queue')
        .select('status')
        .gte('resolved_at', today.toISOString())
        .not('status', 'eq', 'pending'),

      // Average response time (last 7 days)
      supabase
        .from('moderation_queue')
        .select('flagged_at, resolved_at')
        .not('resolved_at', 'is', null)
        .gte('resolved_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const todayItems = todayResult.data || [];
    const avgTimeItems = avgTimeResult.data || [];

    // Calculate average response time
    let avgResponseTime = 0;
    if (avgTimeItems.length > 0) {
      const totalMinutes = avgTimeItems.reduce((sum, item) => {
        const flagged = new Date(item.flagged_at).getTime();
        const resolved = new Date(item.resolved_at).getTime();
        return sum + (resolved - flagged) / 60000; // Convert to minutes
      }, 0);
      avgResponseTime = Math.round(totalMinutes / avgTimeItems.length);
    }

    return {
      pending: pendingResult.count || 0,
      approvedToday: todayItems.filter(i => i.status === 'approved').length,
      rejectedToday: todayItems.filter(i => i.status === 'rejected').length,
      escalatedToday: todayItems.filter(i => i.status === 'escalated').length,
      avgResponseTime,
    };
  } catch (error) {
    console.error('[Moderation] Error fetching stats:', error);
    return {
      pending: 0,
      approvedToday: 0,
      rejectedToday: 0,
      escalatedToday: 0,
      avgResponseTime: 0,
    };
  }
}

/**
 * Take moderation action on an item
 */
export async function takeAction(
  itemId: string,
  moderatorId: string,
  action: ModerationAction
): Promise<{ success: boolean; error?: string }> {
  try {
    const status: ModerationStatus =
      action.action === 'approve' ? 'approved' :
      action.action === 'reject' ? 'rejected' : 'escalated';

    // Update moderation queue item
    const { error: updateError } = await supabase
      .from('moderation_queue')
      .update({
        status,
        resolved_by: moderatorId,
        resolved_at: new Date().toISOString(),
        resolution_notes: action.notes,
      })
      .eq('id', itemId);

    if (updateError) throw updateError;

    // If rejecting and should remove content, update the source content
    if (action.action === 'reject' && action.removeContent) {
      const { data: item } = await supabase
        .from('moderation_queue')
        .select('content_type, content_id')
        .eq('id', itemId)
        .single();

      if (item) {
        await removeContent(item.content_type, item.content_id);
      }
    }

    // If warning user, create history record
    if (action.warnUser) {
      const { data: item } = await supabase
        .from('moderation_queue')
        .select('content_author_id')
        .eq('id', itemId)
        .single();

      if (item?.content_author_id) {
        await supabase.from('user_moderation_history').insert({
          user_id: item.content_author_id,
          action: 'warning_issued',
          reason: action.notes || 'Content policy violation',
          related_content_id: itemId,
          performed_by: moderatorId,
        });
      }
    }

    // Log to audit log
    await supabase.from('admin_audit_log').insert({
      admin_id: moderatorId,
      admin_email: '', // Would be fetched from auth
      action: `moderation_${action.action}`,
      action_category: 'moderation',
      target_type: 'content',
      target_id: itemId,
      new_state: { status, notes: action.notes },
    });

    return { success: true };
  } catch (error) {
    console.error('[Moderation] Error taking action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to take action',
    };
  }
}

/**
 * Remove content from its source table
 */
async function removeContent(contentType: string, contentId: string): Promise<void> {
  const tableMap: Record<string, string> = {
    post: 'community_posts',
    comment: 'community_comments',
    message: 'messages',
  };

  const table = tableMap[contentType];
  if (!table) return;

  try {
    await supabase
      .from(table)
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', contentId);
  } catch (error) {
    console.warn('[Moderation] Error removing content:', error);
  }
}

/**
 * Get user's moderation history
 */
export async function getUserModerationHistory(
  userId: string
): Promise<UserModerationHistory | null> {
  try {
    // Get user profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email, moderation_status, warning_count')
      .eq('id', userId)
      .single();

    // Get flag counts
    const { data: flags } = await supabase
      .from('moderation_queue')
      .select('status, flagged_at')
      .eq('content_author_id', userId);

    const flagList = flags || [];

    return {
      userId,
      userName: profile?.display_name || 'Unknown',
      userEmail: profile?.email || '',
      totalFlags: flagList.length,
      approvedFlags: flagList.filter(f => f.status === 'approved').length,
      rejectedFlags: flagList.filter(f => f.status === 'rejected').length,
      warnings: profile?.warning_count || 0,
      status: profile?.moderation_status || 'good_standing',
      lastFlagDate: flagList.length > 0
        ? flagList.sort((a, b) =>
            new Date(b.flagged_at).getTime() - new Date(a.flagged_at).getTime()
          )[0].flagged_at
        : undefined,
    };
  } catch (error) {
    console.error('[Moderation] Error fetching user history:', error);
    return null;
  }
}

/**
 * Ban or suspend a user
 */
export async function moderateUser(
  userId: string,
  moderatorId: string,
  action: 'warn' | 'restrict' | 'suspend' | 'ban' | 'unban',
  reason: string,
  expiresAt?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const statusMap: Record<string, string> = {
      warn: 'warned',
      restrict: 'restricted',
      suspend: 'suspended',
      ban: 'banned',
      unban: 'good_standing',
    };

    // Update user profile
    await supabase
      .from('profiles')
      .update({
        moderation_status: statusMap[action],
        last_moderation_action: new Date().toISOString(),
        moderation_notes: reason,
      })
      .eq('id', userId);

    // Create history record
    const actionMap: Record<string, string> = {
      warn: 'warning_issued',
      restrict: 'restricted',
      suspend: 'suspended',
      ban: 'banned',
      unban: 'unbanned',
    };

    await supabase.from('user_moderation_history').insert({
      user_id: userId,
      action: actionMap[action],
      reason,
      performed_by: moderatorId,
      expires_at: expiresAt,
    });

    return { success: true };
  } catch (error) {
    console.error('[Moderation] Error moderating user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to moderate user',
    };
  }
}

// ============================================================================
// Auto-moderation Integration
// ============================================================================

/**
 * Auto-moderate content before publishing
 * Returns whether content should be blocked
 */
export async function autoModerateContent(
  content: string,
  contentType: ContentType,
  authorId: string,
  authorName: string
): Promise<{
  allowed: boolean;
  flagged: boolean;
  itemId?: string;
  reason?: string;
}> {
  const analysis = analyzeContent(content);

  if (!analysis.shouldFlag) {
    return { allowed: true, flagged: false };
  }

  // High confidence harmful content should be blocked
  if (analysis.confidence >= 0.85 && analysis.category === 'self_harm') {
    // Flag but still allow - show crisis resources instead of blocking
    const result = await flagContent(
      contentType,
      `auto-${Date.now()}`,
      content,
      authorId,
      authorName,
      {
        category: analysis.category,
        reason: analysis.explanation,
        aiConfidence: analysis.confidence,
        aiExplanation: analysis.explanation,
      }
    );

    return {
      allowed: true,
      flagged: true,
      itemId: result.itemId,
      reason: 'Content flagged for review - crisis resources shown',
    };
  }

  // Other high confidence violations should be queued
  if (analysis.confidence >= 0.7) {
    const result = await flagContent(
      contentType,
      `auto-${Date.now()}`,
      content,
      authorId,
      authorName,
      {
        category: analysis.category!,
        reason: analysis.explanation,
        aiConfidence: analysis.confidence,
        aiExplanation: analysis.explanation,
      }
    );

    return {
      allowed: true, // Still allow but flag
      flagged: true,
      itemId: result.itemId,
      reason: 'Content queued for moderation review',
    };
  }

  return { allowed: true, flagged: false };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  analyzeContent,
  flagContent,
  getModerationQueue,
  getModerationStats,
  takeAction,
  getUserModerationHistory,
  moderateUser,
  autoModerateContent,
};
