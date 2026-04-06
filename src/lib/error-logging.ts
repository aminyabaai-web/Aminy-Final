// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Error Logging Service
 * Tracks application errors and user feedback
 */

import { supabase } from '@/utils/supabase/client';

interface ErrorLogData {
  error_message: string;
  error_stack?: string;
  page_url: string;
  component_name?: string;
  browser_info?: string;
  severity: 'error' | 'warning' | 'info';
}

interface FeedbackData {
  message: string;
  page_url: string;
  feedback_type: 'bug' | 'suggestion' | 'question' | 'other';
}

/**
 * Log an error to the database
 */
export async function logError(
  error: Error,
  componentName?: string,
  severity: 'error' | 'warning' | 'info' = 'error'
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const errorData: ErrorLogData = {
      error_message: error.message,
      error_stack: error.stack,
      page_url: typeof window !== 'undefined' ? window.location.href : '',
      component_name: componentName,
      browser_info: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      severity
    };

    // Insert with or without user_id
    const insertData = user?.id
      ? { ...errorData, user_id: user.id }
      : errorData;

    await supabase.from('error_logs').insert(insertData);
  } catch (e) {
    // Silent fail - don't break the app if logging fails
    // Still log to console in development
    if (import.meta.env.DEV) {
      console.error('Failed to log error to database:', e);
    }
  }
}

/**
 * Submit user feedback
 */
export async function submitFeedback(
  message: string,
  feedbackType: 'bug' | 'suggestion' | 'question' | 'other' = 'other'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'You must be logged in to submit feedback' };
    }

    const feedbackData: FeedbackData & { user_id: string } = {
      user_id: user.id,
      message,
      page_url: typeof window !== 'undefined' ? window.location.href : '',
      feedback_type: feedbackType
    };

    const { error } = await supabase.from('user_feedback').insert(feedbackData);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to submit feedback'
    };
  }
}

/**
 * Get recent errors (admin only)
 */
export async function getRecentErrors(limit: number = 50): Promise<ErrorLogData[]> {
  const { data, error } = await supabase
    .from('error_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get user feedback (admin only)
 */
export async function getUserFeedback(
  status?: 'new' | 'reviewed' | 'resolved' | 'wont_fix',
  limit: number = 50
): Promise<FeedbackData[]> {
  let query = supabase
    .from('user_feedback')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Update feedback status (admin only)
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: 'new' | 'reviewed' | 'resolved' | 'wont_fix'
): Promise<boolean> {
  const { error } = await supabase
    .from('user_feedback')
    .update({ status })
    .eq('id', feedbackId);

  return !error;
}
