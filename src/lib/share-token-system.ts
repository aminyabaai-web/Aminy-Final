/**
 * Share Token System
 *
 * Manages shareable content tokens for non-authenticated viewers.
 * Supports weekly snapshots, plan summaries, and streak cards.
 */

export interface ShareToken {
  id: string;
  token: string;
  contentType: string;
  expiresAt: string;
  createdAt: string;
  metadata: {
    parentFirstName: string;
    childFirstName: string;
    [key: string]: unknown;
  };
}

export interface ShareableContent {
  type: 'weekly_snapshot' | 'plan_summary' | 'streak_card';
  data: Record<string, unknown>;
  createdAt: string;
}

export async function getSharedContent(token: string): Promise<{
  success: boolean;
  content?: ShareableContent;
  shareToken?: ShareToken;
  error?: string;
}> {
  // TODO: Implement real API call to fetch shared content by token
  // For now, return a placeholder response
  if (!token) {
    return { success: false, error: 'No token provided' };
  }
  return {
    success: true,
    content: {
      type: 'weekly_snapshot',
      data: {},
      createdAt: new Date().toISOString(),
    },
    shareToken: {
      id: token,
      token,
      contentType: 'weekly_snapshot',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      metadata: {
        parentFirstName: 'Parent',
        childFirstName: 'Child',
      },
    },
  };
}

export function formatExpirationDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return 'Expires tomorrow';
  return `Expires in ${diffDays} days`;
}

export function getContentTypeDisplayName(type: string): string {
  switch (type) {
    case 'weekly_snapshot': return 'Weekly Snapshot';
    case 'plan_summary': return 'Plan Summary';
    case 'streak_card': return 'Streak Card';
    default: return 'Shared Content';
  }
}

export function getContentIcon(type: string): string {
  switch (type) {
    case 'weekly_snapshot': return '\uD83D\uDCCA';
    case 'plan_summary': return '\uD83D\uDCCB';
    case 'streak_card': return '\u2B50';
    default: return '\uD83D\uDCE4';
  }
}
