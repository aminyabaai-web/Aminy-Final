// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * provider-branding.ts
 *
 * White-label branding system for B2B provider partners.
 * Allows clinics/agencies to display their own logo and brand colors
 * while maintaining "Powered by Aminy" attribution.
 *
 * Storage: localStorage (instant load) + Supabase sync (persistence)
 */

import { supabase } from '../utils/supabase/client';

export interface ProviderBranding {
  orgName: string;
  logoUrl?: string;         // URL to org's logo image
  primaryColor?: string;    // Hex color for header/accent (e.g., "#1a73e8")
  tagline?: string;         // Optional tagline under org name
  showPoweredBy: boolean;   // Always true for non-enterprise tiers
}

const STORAGE_KEY = 'aminy-provider-branding';
const DEFAULT_BRANDING: ProviderBranding = {
  orgName: '',
  showPoweredBy: true,
};

/**
 * Get branding config — localStorage first, then Supabase fallback
 */
export function getBranding(): ProviderBranding | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Always enforce "Powered by Aminy" for non-enterprise
      return { ...parsed, showPoweredBy: true };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save branding config locally and sync to Supabase
 */
export async function saveBranding(
  providerId: string,
  branding: Partial<ProviderBranding>
): Promise<{ success: boolean; error?: string }> {
  const merged: ProviderBranding = {
    ...DEFAULT_BRANDING,
    ...getBranding(),
    ...branding,
    showPoweredBy: true, // enforced
  };

  // Save locally for instant load
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

  // Sync to Supabase
  try {
    const { error } = await supabase.from('provider_branding').upsert({
      provider_id: providerId,
      org_name: merged.orgName,
      logo_url: merged.logoUrl || null,
      primary_color: merged.primaryColor || null,
      tagline: merged.tagline || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' });

    if (error) {
      console.warn('[Branding] Supabase sync error (using local):', error);
    }

    return { success: true };
  } catch (err) {
    console.warn('[Branding] Supabase sync failed (using local):', err);
    return { success: true }; // local save succeeded
  }
}

/**
 * Load branding from Supabase and cache locally
 */
export async function loadBrandingFromServer(providerId: string): Promise<ProviderBranding | null> {
  try {
    const { data, error } = await supabase
      .from('provider_branding')
      .select('org_name, logo_url, primary_color, tagline')
      .eq('provider_id', providerId)
      .single();

    if (error || !data) return getBranding();

    const branding: ProviderBranding = {
      orgName: data.org_name || '',
      logoUrl: data.logo_url || undefined,
      primaryColor: data.primary_color || undefined,
      tagline: data.tagline || undefined,
      showPoweredBy: true,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    return branding;
  } catch {
    return getBranding();
  }
}

/**
 * Clear branding (revert to default Aminy branding)
 */
export function clearBranding(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get CSS custom properties for the brand color
 */
export function getBrandColorStyles(branding: ProviderBranding | null): React.CSSProperties {
  if (!branding?.primaryColor) return {};
  return {
    '--brand-primary': branding.primaryColor,
  } as React.CSSProperties;
}
