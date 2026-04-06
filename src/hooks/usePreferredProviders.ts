// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Hook for managing user's preferred/favorite providers
 * Allows users to mark providers as favorites for priority booking
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

export interface PreferredProvider {
  id: string;
  provider_id: string;
  priority: number;
  notes: string | null;
  times_booked: number;
  last_booked_at: string | null;
  created_at: string;
}

export interface ProviderWithPreference {
  id: string;
  name: string;
  title: string;
  bio: string;
  provider_type: string;
  specialties: string[];
  licenses: Record<string, unknown>;
  profile_image_url: string | null;
  rating: number;
  review_count: number;
  is_preferred: boolean;
  preference_priority: number;
  times_booked: number;
}

export function usePreferredProviders() {
  const [preferredProviders, setPreferredProviders] = useState<PreferredProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's preferred providers
  const fetchPreferredProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_preferred_providers')
        .select('*')
        .order('priority', { ascending: true });

      if (fetchError) throw fetchError;
      setPreferredProviders(data || []);
    } catch (err) {
      console.error('Error fetching preferred providers:', err);
      setError('Failed to load preferred providers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle provider as preferred
  const togglePreferred = useCallback(async (providerId: string): Promise<boolean> => {
    try {
      const { data, error: toggleError } = await supabase
        .rpc('toggle_preferred_provider', { p_provider_id: providerId });

      if (toggleError) throw toggleError;

      if (data?.success) {
        // Refresh the list
        await fetchPreferredProviders();

        // Show feedback
        if (data.action === 'added') {
          toast.success('Added to your preferred providers');
        } else {
          toast.success('Removed from preferred providers');
        }

        return data.is_preferred;
      }

      throw new Error(data?.error || 'Failed to update preference');
    } catch (err) {
      console.error('Error toggling preferred provider:', err);
      toast.error('Failed to update provider preference');
      return false;
    }
  }, [fetchPreferredProviders]);

  // Check if a provider is preferred
  const isPreferred = useCallback((providerId: string): boolean => {
    return preferredProviders.some(p => p.provider_id === providerId);
  }, [preferredProviders]);

  // Get preferred provider IDs as a Set for fast lookup
  const preferredIds = new Set(preferredProviders.map(p => p.provider_id));

  // Update provider notes
  const updateNotes = useCallback(async (providerId: string, notes: string): Promise<void> => {
    try {
      const { error: updateError } = await supabase
        .from('user_preferred_providers')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('provider_id', providerId);

      if (updateError) throw updateError;

      await fetchPreferredProviders();
      toast.success('Notes updated');
    } catch (err) {
      console.error('Error updating notes:', err);
      toast.error('Failed to update notes');
    }
  }, [fetchPreferredProviders]);

  // Reorder preferred providers
  const reorderProviders = useCallback(async (providerIds: string[]): Promise<void> => {
    try {
      // Update priorities based on new order
      const updates = providerIds.map((id, index) => ({
        provider_id: id,
        priority: index + 1,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        await supabase
          .from('user_preferred_providers')
          .update({ priority: update.priority, updated_at: update.updated_at })
          .eq('provider_id', update.provider_id);
      }

      await fetchPreferredProviders();
    } catch (err) {
      console.error('Error reordering providers:', err);
      toast.error('Failed to reorder providers');
    }
  }, [fetchPreferredProviders]);

  // Initial fetch
  useEffect(() => {
    fetchPreferredProviders();
  }, [fetchPreferredProviders]);

  return {
    preferredProviders,
    preferredIds,
    loading,
    error,
    togglePreferred,
    isPreferred,
    updateNotes,
    reorderProviders,
    refresh: fetchPreferredProviders
  };
}

/**
 * Hook to get providers sorted by user preference
 */
export function useProvidersWithPreference(
  providerType?: string,
  specialty?: string
) {
  const [providers, setProviders] = useState<ProviderWithPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_providers_by_preference', {
          p_provider_type: providerType || null,
          p_specialty: specialty || null
        });

      if (fetchError) throw fetchError;
      setProviders(data || []);
    } catch (err) {
      console.error('Error fetching providers with preference:', err);
      setError('Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [providerType, specialty]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return {
    providers,
    loading,
    error,
    refresh: fetchProviders
  };
}

export default usePreferredProviders;
