// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useProviderData Hook
 * Loads provider profile, analytics, and verification data from Supabase.
 *
 * For screens: provider-identity-verification, provider-analytics, bcba-briefing
 * Tables: providers (019_provider_portal), provider_patients, provider_sessions, session_notes
 * Replaces localStorage keys: aminy-pending-provider-id, aminy-viewing-provider-id, aminy-viewing-provider-name
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ProviderProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  providerType: string;
  specialties: string[];
  languages: string[];
  credentials: string[];
  locationCity?: string;
  locationState?: string;
  offersTelehealth: boolean;
  offersInPerson: boolean;
  insuranceAccepted: string[];
  hourlyRate?: number;
  acceptsNewPatients: boolean;
  rating: number;
  reviewCount: number;
  verified: boolean;
  verificationLevel: 'none' | 'pending' | 'verified' | 'gold';
}

export interface ProviderStats {
  totalPatients: number;
  activePatients: number;
  sessionsThisMonth: number;
  sessionsTotal: number;
  earningsThisMonth: number;
  earningsTotal: number;
  nextAvailableSlot?: string;
}

export interface ProviderData {
  // For provider-facing screens
  myProfile: ProviderProfile | null;
  stats: ProviderStats | null;
  // For parent-facing screens (viewing a provider)
  viewingProvider: ProviderProfile | null;
  pendingProviderId: string | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache
// ============================================================================

const CACHE_KEYS = {
  MY_PROFILE: 'aminy-provider-profile-cache',
  VIEWING: 'aminy-viewing-provider-cache',
} as const;

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

function mapProviderRow(row: Record<string, unknown>): ProviderProfile {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id as string) || '',
    firstName: (row.first_name as string) || (row.name as string)?.split(' ')[0] || '',
    lastName: (row.last_name as string) || (row.name as string)?.split(' ').slice(1).join(' ') || '',
    title: (row.title as string) || (row.credentials as string) || '',
    email: (row.email as string) || '',
    phone: (row.phone as string) || undefined,
    avatarUrl: (row.avatar_url as string) || (row.photo as string) || undefined,
    bio: (row.bio as string) || undefined,
    providerType: (row.provider_type as string) || (row.role as string) || '',
    specialties: (row.specialties as string[]) || [],
    languages: (row.languages as string[]) || ['English'],
    credentials: Array.isArray(row.credentials) ? row.credentials as string[] : [],
    locationCity: (row.location_city as string) || undefined,
    locationState: (row.location_state as string) || undefined,
    offersTelehealth: (row.offers_telehealth as boolean) ?? (row.video_enabled as boolean) ?? true,
    offersInPerson: (row.offers_in_person as boolean) ?? false,
    insuranceAccepted: (row.insurance_accepted as string[]) || [],
    hourlyRate: (row.hourly_rate as number) || undefined,
    acceptsNewPatients: (row.accepts_new_patients as boolean) ?? (row.accepting_new_patients as boolean) ?? true,
    rating: (row.rating as number) || 5.0,
    reviewCount: (row.review_count as number) || 0,
    verified: (row.verified as boolean) ?? false,
    verificationLevel: (row.verification_level as ProviderProfile['verificationLevel']) || 'none',
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useProviderData(
  userId?: string,
  viewProviderId?: string,
): ProviderData & {
  refetch: () => Promise<void>;
  setViewingProvider: (providerId: string, providerName?: string) => void;
  clearViewingProvider: () => void;
  setPendingProviderId: (id: string) => void;
  clearPendingProviderId: () => void;
} {
  const [data, setData] = useState<ProviderData>({
    myProfile: null,
    stats: null,
    viewingProvider: null,
    pendingProviderId: localStorage.getItem('aminy-pending-provider-id'),
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Determine which provider to view
      const provToView = viewProviderId || localStorage.getItem('aminy-viewing-provider-id');

      const [myProfileResult, viewingResult] = await Promise.all([
        // Check if current user is a provider
        supabase
          .from('providers')
          .select('*')
          .eq('user_id', userId)
          .single()
          .then(null, (err: unknown) => {
            // Not a provider — that's fine
            return { data: null, error: err };
          }),

        // Load provider being viewed (if any)
        provToView
          ? supabase
              .from('providers')
              .select('*')
              .eq('id', provToView)
              .single()
              .then(null, (err: unknown) => {
                console.warn('[Provider] Viewing provider fetch failed:', err);
                return { data: null, error: err };
              })
          : Promise.resolve({ data: null, error: null }),
      ]);

      const myProfile = myProfileResult?.data ? mapProviderRow(myProfileResult.data) : null;
      const viewingProvider = viewingResult?.data ? mapProviderRow(viewingResult.data) : null;

      // Load stats if user is a provider
      let stats: ProviderStats | null = null;
      if (myProfile) {
        try {
          const { data: statsData } = await supabase
            .rpc('get_provider_stats', { p_provider_id: myProfile.id });
          if (statsData && statsData.length > 0) {
            const s = statsData[0];
            stats = {
              totalPatients: s.total_patients || 0,
              activePatients: s.active_patients || 0,
              sessionsThisMonth: s.sessions_this_month || 0,
              sessionsTotal: s.sessions_total || 0,
              earningsThisMonth: s.earnings_this_month || 0,
              earningsTotal: s.earnings_total || 0,
              nextAvailableSlot: s.next_available_slot || undefined,
            };
          }
        } catch (err) {
          console.warn('[Provider] Stats RPC failed:', err);
        }
      }

      // Cache
      if (myProfile) writeCache(CACHE_KEYS.MY_PROFILE, myProfile);
      if (viewingProvider) writeCache(CACHE_KEYS.VIEWING, viewingProvider);

      setData({
        myProfile,
        stats,
        viewingProvider,
        pendingProviderId: localStorage.getItem('aminy-pending-provider-id'),
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.error('[Provider] Load failed:', error);
      setData(prev => ({
        ...prev,
        myProfile: readCache<ProviderProfile | null>(CACHE_KEYS.MY_PROFILE, null),
        viewingProvider: readCache<ProviderProfile | null>(CACHE_KEYS.VIEWING, null),
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load provider data',
      }));
    }
  }, [userId, viewProviderId]);

  const setViewingProvider = useCallback((providerId: string, providerName?: string) => {
    localStorage.setItem('aminy-viewing-provider-id', providerId);
    if (providerName) {
      localStorage.setItem('aminy-viewing-provider-name', providerName);
    }
    loadData();
  }, [loadData]);

  const clearViewingProvider = useCallback(() => {
    localStorage.removeItem('aminy-viewing-provider-id');
    localStorage.removeItem('aminy-viewing-provider-name');
    setData(prev => ({ ...prev, viewingProvider: null }));
  }, []);

  const setPendingProviderId = useCallback((id: string) => {
    localStorage.setItem('aminy-pending-provider-id', id);
    setData(prev => ({ ...prev, pendingProviderId: id }));
  }, []);

  const clearPendingProviderId = useCallback(() => {
    localStorage.removeItem('aminy-pending-provider-id');
    setData(prev => ({ ...prev, pendingProviderId: null }));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refetch: loadData,
    setViewingProvider,
    clearViewingProvider,
    setPendingProviderId,
    clearPendingProviderId,
  };
}

export default useProviderData;
