// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { supabase } from '../utils/supabase/client';

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
  if (!token) {
    return { success: false, error: 'No token provided' };
  }

  const { data: link, error } = await supabase
    .from('vault_share_links')
    .select(`
      id,
      expires_at,
      created_at,
      vault_documents (
        id,
        file_name,
        file_type,
        category,
        user_id,
        profiles:user_id (
          first_name,
          child_name
        )
      )
    `)
    .eq('id', token)
    .single();

  if (error || !link) {
    return { success: false, error: 'Link not found or expired' };
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { success: false, error: 'This link has expired' };
  }

  const doc = link.vault_documents as Record<string, unknown> | null;
  const profile = doc?.profiles as Record<string, string> | null;

  return {
    success: true,
    content: {
      type: 'weekly_snapshot',
      data: doc || {},
      createdAt: link.created_at,
    },
    shareToken: {
      id: link.id,
      token,
      contentType: doc?.file_type as string || 'document',
      expiresAt: link.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: link.created_at,
      metadata: {
        parentFirstName: profile?.first_name || '',
        childFirstName: profile?.child_name || '',
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
