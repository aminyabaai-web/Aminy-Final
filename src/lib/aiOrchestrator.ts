/**
 * AI Orchestrator
 * Centralizes all AI-powered features for Aminy
 * Handles task categorization, prioritization, and focus recommendations
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

export interface Task {
  title: string;
  category: 'urgent' | 'important' | 'routine' | 'someday';
  context: 'child-care' | 'self-care' | 'admin' | 'family';
  estimatedTime: '5 min' | '15 min' | '30 min' | '1 hour' | 'longer';
}

export interface TopFocus {
  taskIndex: number;
  reason: string;
}

export interface CategorizeResponse {
  tasks: Task[];
  topFocus: TopFocus;
  encouragement: string;
}

export interface FocusTask {
  title: string;
  category: string;
  context: string;
  estimatedTime: string;
  reason?: string;
}

export interface StreakData {
  count: number;
  lastCompleted: string | null;
}

/**
 * Categorize user's stream-of-consciousness input into actionable tasks
 */
export async function categorizeUserInput(
  userInput: string,
  context?: string
): Promise<CategorizeResponse> {
  try {
    const response = await fetch(`${API_BASE}/ai/categorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ userInput, context }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI service error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI Orchestrator categorization error:', error);
    throw error;
  }
}

/**
 * Get current focus task and streak
 */
export async function getCurrentFocus(userId: string = 'default'): Promise<{
  task: FocusTask | null;
  streak: StreakData;
}> {
  try {
    const response = await fetch(`${API_BASE}/focus/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'X-User-Id': userId,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get focus: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI Orchestrator get focus error:', error);
    return { task: null, streak: { count: 0, lastCompleted: null } };
  }
}

/**
 * Update the current focus task
 */
export async function updateFocusTask(
  task: FocusTask,
  userId: string = 'default'
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/focus/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'X-User-Id': userId,
      },
      body: JSON.stringify({ task }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update focus: ${response.status}`);
    }
  } catch (error) {
    console.error('AI Orchestrator update focus error:', error);
    throw error;
  }
}

/**
 * Complete the current focus task and update streak
 */
export async function completeFocusTask(
  userId: string = 'default'
): Promise<StreakData> {
  try {
    const response = await fetch(`${API_BASE}/focus/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'X-User-Id': userId,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to complete focus: ${response.status}`);
    }

    const data = await response.json();
    return data.streak;
  } catch (error) {
    console.error('AI Orchestrator complete focus error:', error);
    throw error;
  }
}

/**
 * Helper: Extract task from categorization response
 */
export function getTopFocusTask(response: CategorizeResponse): FocusTask | null {
  if (!response.tasks || response.tasks.length === 0) {
    return null;
  }

  const task = response.tasks[response.topFocus.taskIndex];
  if (!task) {
    return response.tasks[0] as FocusTask;
  }

  return {
    ...task,
    reason: response.topFocus.reason,
  };
}
