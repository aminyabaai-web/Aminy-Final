/**
 * Moderation API Routes
 * Endpoints for content moderation and user management
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Types
export interface ModerationQueueItem {
  id: string;
  content_type: 'post' | 'comment' | 'message' | 'profile' | 'document';
  content_id: string;
  content_text: string | null;
  content_author_id: string | null;
  content_author_name: string | null;
  flag_category: string;
  flag_reason: string | null;
  flagged_by: string | null;
  flagged_at: string;
  ai_confidence: number | null;
  ai_explanation: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModerationAction {
  action: 'warning_issued' | 'warning_cleared' | 'restricted' | 'unrestricted' |
          'suspended' | 'unsuspended' | 'banned' | 'unbanned' |
          'content_removed' | 'content_restored';
  reason: string;
  notes?: string;
  expires_at?: string;
}

export interface AdminAuditEntry {
  admin_id: string;
  admin_email: string;
  action: string;
  action_category: string;
  target_type: string;
  target_id?: string;
  target_details?: Record<string, unknown>;
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  success: boolean;
  error_message?: string;
}

/**
 * Check if user has admin/moderator permissions
 */
export async function checkAdminPermission(
  userId: string,
  requiredRole: 'admin' | 'moderator' | 'super_admin' = 'moderator'
): Promise<{ allowed: boolean; role?: string; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return { allowed: false, error: 'User not found' };
    }

    const roleHierarchy: Record<string, number> = {
      'user': 0,
      'provider': 1,
      'moderator': 2,
      'admin': 3,
      'super_admin': 4,
    };

    const userLevel = roleHierarchy[profile.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel >= requiredLevel) {
      return { allowed: true, role: profile.role };
    }

    return { allowed: false, error: 'Insufficient permissions' };
  } catch (error) {
    console.error('[Moderation] Permission check failed:', error);
    return { allowed: false, error: 'Permission check failed' };
  }
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    await supabase.from('admin_audit_log').insert(entry);
  } catch (error) {
    console.error('[Moderation] Failed to log admin action:', error);
    // Don't throw - audit logging failure shouldn't block operations
  }
}

/**
 * Get moderation queue items
 */
export async function getModerationQueue(options: {
  status?: 'pending' | 'approved' | 'rejected' | 'escalated';
  content_type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: ModerationQueueItem[]; count: number; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { status = 'pending', content_type, limit = 50, offset = 0 } = options;

  try {
    let query = supabase
      .from('moderation_queue')
      .select('*', { count: 'exact' })
      .order('flagged_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (content_type) {
      query = query.eq('content_type', content_type);
    }

    const { data, count, error } = await query;

    if (error) {
      return { data: [], count: 0, error: error.message };
    }

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('[Moderation] Failed to get queue:', error);
    return { data: [], count: 0, error: 'Failed to fetch moderation queue' };
  }
}

/**
 * Get single moderation queue item
 */
export async function getModerationItem(
  itemId: string
): Promise<{ data: ModerationQueueItem | null; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await supabase
      .from('moderation_queue')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data };
  } catch (error) {
    console.error('[Moderation] Failed to get item:', error);
    return { data: null, error: 'Failed to fetch moderation item' };
  }
}

/**
 * Review/resolve a moderation queue item
 */
export async function reviewModerationItem(
  itemId: string,
  adminId: string,
  decision: {
    status: 'approved' | 'rejected' | 'escalated';
    notes?: string;
    userAction?: ModerationAction;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the item first
    const { data: item, error: fetchError } = await supabase
      .from('moderation_queue')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      return { success: false, error: 'Moderation item not found' };
    }

    // Update the moderation queue item
    const { error: updateError } = await supabase
      .from('moderation_queue')
      .update({
        status: decision.status,
        resolved_by: adminId,
        resolved_at: new Date().toISOString(),
        resolution_notes: decision.notes,
      })
      .eq('id', itemId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // If user action is specified, apply it
    if (decision.userAction && item.content_author_id) {
      await applyUserModerationAction(
        item.content_author_id,
        adminId,
        decision.userAction,
        itemId
      );
    }

    return { success: true };
  } catch (error) {
    console.error('[Moderation] Failed to review item:', error);
    return { success: false, error: 'Failed to review moderation item' };
  }
}

/**
 * Apply moderation action to a user
 */
export async function applyUserModerationAction(
  userId: string,
  adminId: string,
  action: ModerationAction,
  relatedContentId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Insert moderation history record (trigger will update user profile)
    const { error } = await supabase.from('user_moderation_history').insert({
      user_id: userId,
      action: action.action,
      reason: action.reason,
      related_content_id: relatedContentId,
      performed_by: adminId,
      notes: action.notes,
      expires_at: action.expires_at,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[Moderation] Failed to apply user action:', error);
    return { success: false, error: 'Failed to apply moderation action' };
  }
}

/**
 * Get user moderation history
 */
export async function getUserModerationHistory(
  userId: string,
  limit: number = 50
): Promise<{ data: Record<string, unknown>[]; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await supabase
      .from('user_moderation_history')
      .select(`
        *,
        performed_by_profile:profiles!user_moderation_history_performed_by_fkey(
          display_name,
          email
        )
      `)
      .eq('user_id', userId)
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    console.error('[Moderation] Failed to get user history:', error);
    return { data: [], error: 'Failed to fetch moderation history' };
  }
}

/**
 * Flag content for moderation
 */
export async function flagContent(
  contentType: string,
  contentId: string,
  flagCategory: string,
  options: {
    flaggedBy?: string;
    flagReason?: string;
    contentText?: string;
    contentAuthorId?: string;
    contentAuthorName?: string;
    aiConfidence?: number;
    aiExplanation?: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await supabase
      .from('moderation_queue')
      .insert({
        content_type: contentType,
        content_id: contentId,
        content_text: options.contentText,
        content_author_id: options.contentAuthorId,
        content_author_name: options.contentAuthorName,
        flag_category: flagCategory,
        flag_reason: options.flagReason,
        flagged_by: options.flaggedBy,
        ai_confidence: options.aiConfidence,
        ai_explanation: options.aiExplanation,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error('[Moderation] Failed to flag content:', error);
    return { success: false, error: 'Failed to flag content' };
  }
}

/**
 * Get moderation statistics
 */
export async function getModerationStats(): Promise<{
  pending: number;
  resolved_today: number;
  escalated: number;
  average_resolution_time_hours: number;
  error?: string;
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get pending count
    const { count: pending } = await supabase
      .from('moderation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get resolved today count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: resolvedToday } = await supabase
      .from('moderation_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'rejected'])
      .gte('resolved_at', today.toISOString());

    // Get escalated count
    const { count: escalated } = await supabase
      .from('moderation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'escalated');

    // Calculate average resolution time (simplified)
    const { data: resolvedItems } = await supabase
      .from('moderation_queue')
      .select('flagged_at, resolved_at')
      .not('resolved_at', 'is', null)
      .limit(100);

    let avgHours = 0;
    if (resolvedItems && resolvedItems.length > 0) {
      const totalHours = resolvedItems.reduce((sum, item) => {
        const flagged = new Date(item.flagged_at).getTime();
        const resolved = new Date(item.resolved_at).getTime();
        return sum + (resolved - flagged) / (1000 * 60 * 60);
      }, 0);
      avgHours = totalHours / resolvedItems.length;
    }

    return {
      pending: pending || 0,
      resolved_today: resolvedToday || 0,
      escalated: escalated || 0,
      average_resolution_time_hours: Math.round(avgHours * 10) / 10,
    };
  } catch (error) {
    console.error('[Moderation] Failed to get stats:', error);
    return {
      pending: 0,
      resolved_today: 0,
      escalated: 0,
      average_resolution_time_hours: 0,
      error: 'Failed to fetch statistics',
    };
  }
}
