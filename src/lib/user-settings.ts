// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * User Settings - Stub
 * Original file was removed. This provides no-op exports to prevent build errors.
 */

import type { ChildProfile } from './child-profiles';

export type { ChildProfile };

export async function addChildProfile(
  _userId: string,
  _profile: Partial<ChildProfile> & Record<string, unknown>
): Promise<{ success: boolean; childId?: string; error?: string | null }> {
  console.warn('[user-settings] addChildProfile is a no-op stub');
  return { success: false, error: 'Stub: not implemented' };
}

export async function getUserSettings(_userId: string): Promise<Record<string, unknown>> {
  console.warn('[user-settings] getUserSettings is a no-op stub');
  return {};
}

export async function saveUserSettings(
  _userId: string,
  _settings: Record<string, unknown>
): Promise<void> {
  console.warn('[user-settings] saveUserSettings is a no-op stub');
}
