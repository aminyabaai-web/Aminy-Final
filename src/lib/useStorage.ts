// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// Single source of truth for storage usage across the vault.
// Quotas come from tier-utils entitlements (100MB free / 5GB Core / 25GB Pro /
// unlimited Family) — NEVER hardcode a second copy here; it drifts.
import { useMemo, useState, useEffect } from 'react';
import {
  getStorageLimitBytes,
  getCanonicalTierName,
  type TierType,
} from './tier-utils';

export interface StorageInfo {
  usedBytes: number;
  /** null = unlimited (Family plan, fair-use) */
  quotaBytes: number | null;
  planTier: TierType;
  capabilities: {
    search?: {
      fullText: boolean;
    };
    sharing?: {
      links: boolean;
    };
    ai?: {
      summary: boolean;
      search: boolean;
    };
    reports?: {
      dropIn: boolean;
    };
  };
}

export function useStorage(
  records?: Array<{ files?: Array<{ size: number }> }>,
  /** Pass the authoritative tier (e.g. from App's effectiveUserTier prop). Falls back to window.aminyTier, then 'core'. */
  tierOverride?: TierType | string | null,
): StorageInfo {
  const [subscribedTier, setSubscribedTier] = useState<string | null>(null);

  // Get tier from global tier manager when no explicit tier was provided
  useEffect(() => {
    if (tierOverride) return;
    if (typeof window !== 'undefined' && window.aminyTier?.get) {
      setSubscribedTier(window.aminyTier.get());
    }
    if (typeof window !== 'undefined' && window.aminyTier?.subscribe) {
      const unsubscribe = window.aminyTier.subscribe((newTier: string) => {
        setSubscribedTier(newTier);
      });
      return unsubscribe;
    }
  }, [tierOverride]);

  return useMemo(() => {
    const rawTier = tierOverride || subscribedTier || 'core';
    const canonical = getCanonicalTierName(rawTier);
    const quotaBytes = getStorageLimitBytes(rawTier);

    // Real usage from the actual records — an empty vault reads 0, never a mock
    const usedBytes = records
      ? records.reduce(
          (sum, record) =>
            sum + (record.files?.reduce((fileSum, file) => fileSum + file.size, 0) || 0),
          0,
        )
      : 0;

    const capabilitiesByTier: Record<string, StorageInfo['capabilities']> = {
      free: {
        search: { fullText: false },
        sharing: { links: false },
        ai: { summary: false, search: false },
        reports: { dropIn: false },
      },
      core: {
        search: { fullText: true },
        sharing: { links: true },
        ai: { summary: false, search: false },
        reports: { dropIn: false },
      },
      pro: {
        search: { fullText: true },
        sharing: { links: true },
        ai: { summary: true, search: true },
        reports: { dropIn: true },
      },
      family: {
        search: { fullText: true },
        sharing: { links: true },
        ai: { summary: true, search: true },
        reports: { dropIn: true },
      },
    };

    return {
      usedBytes,
      quotaBytes,
      planTier: (rawTier as TierType) || 'core',
      capabilities: capabilitiesByTier[canonical] || capabilitiesByTier.core,
    };
  }, [tierOverride, subscribedTier, records]);
}
