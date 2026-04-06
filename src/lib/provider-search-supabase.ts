// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * provider-search-supabase.ts
 *
 * Real Supabase provider search. Falls back to 3 realistic demo providers.
 */

import { supabase } from '../utils/supabase/client';
import type { ProviderProfile } from './ai-provider-search';

// ─── Types ────────────────────────────────────────────────────────────

export interface ProviderSearchCriteria {
  specialty?: 'aba' | 'mh' | 'speech' | 'ot' | string;
  insurance?: string;
  state?: string;
  zipCode?: string;
  telehealth?: boolean;
  maxWaitDays?: number;
}

export interface ProviderSearchResult {
  providers: ProviderProfile[];
  isLiveSearch: boolean;
  totalFound: number;
  searchedAt: string;
}

// ─── Demo providers fallback ─────────────────────────────────────────

function getDemoProviders(criteria?: ProviderSearchCriteria): ProviderProfile[] {
  const state = criteria?.state || 'AZ';
  return [
    {
      id: 'demo-bcba-001',
      name: 'Dr. Sarah Mitchell, BCBA',
      specialties: ['Applied Behavior Analysis', 'Early Intervention', 'Autism'],
      credentials: ['BCBA', 'LBA'],
      acceptedInsurance: ['AHCCCS', 'United Healthcare', 'Blue Cross Blue Shield AZ', 'Cigna'],
      telehealth: true,
      inPerson: false,
      languages: ['English', 'Spanish'],
      ageRange: { min: 2, max: 18 },
      availability: 'open',
      waitTimeDays: 3,
      rating: 4.9,
      reviewCount: 47,
      location: { lat: 33.45, lng: -112.07, city: 'Phoenix', state },
      cashRate: 175,
      diagnoses: ['Autism Spectrum Disorder', 'ADHD'],
      crisisCapable: false,
      culturalCompetencies: ['Spanish-speaking families', 'Latinx cultural values', 'Neurodiversity-affirming'],
      nextAvailableSlot: new Date(Date.now() + 3 * 86400000).toISOString(),
    },
    {
      id: 'demo-slp-001',
      name: 'Maria Chen, CCC-SLP',
      specialties: ['Speech Therapy', 'Language Disorders', 'AAC', 'Feeding Therapy'],
      credentials: ['CCC-SLP', 'SLP'],
      acceptedInsurance: ['United Healthcare', 'Aetna', 'Cigna', 'Blue Cross Blue Shield AZ'],
      telehealth: true,
      inPerson: true,
      languages: ['English', 'Mandarin', 'Cantonese'],
      ageRange: { min: 1, max: 12 },
      availability: 'open',
      waitTimeDays: 7,
      rating: 4.8,
      reviewCount: 33,
      location: { lat: 33.49, lng: -112.07, city: 'Phoenix', state },
      cashRate: 150,
      diagnoses: ['Speech Delay', 'Autism Spectrum Disorder', 'Apraxia', 'Down Syndrome'],
      crisisCapable: false,
      culturalCompetencies: ['Chinese cultural context', 'Multilingual families', 'Feeding-aversive children'],
      nextAvailableSlot: new Date(Date.now() + 7 * 86400000).toISOString(),
    },
    {
      id: 'demo-lcsw-001',
      name: 'James Okafor, LCSW',
      specialties: ['Mental Health Therapy', 'Anxiety', 'ADHD', 'Family Systems'],
      credentials: ['LCSW'],
      acceptedInsurance: ['AHCCCS', 'United Healthcare', 'Aetna', 'Magellan'],
      telehealth: true,
      inPerson: false,
      languages: ['English'],
      ageRange: { min: 5, max: 21 },
      availability: 'open',
      waitTimeDays: 10,
      rating: 4.7,
      reviewCount: 28,
      location: { lat: 33.42, lng: -111.94, city: 'Tempe', state },
      cashRate: 175,
      diagnoses: ['ADHD', 'Anxiety Disorder', 'ODD', 'Trauma', 'Depression'],
      crisisCapable: true,
      culturalCompetencies: ['Black families', 'Cultural identity development', 'School-related stress'],
      nextAvailableSlot: new Date(Date.now() + 10 * 86400000).toISOString(),
    },
  ];
}

// ─── Map DB row → ProviderProfile ────────────────────────────────────

function mapDbProviderToProfile(p: Record<string, unknown>): ProviderProfile {
  return {
    id: String(p.id),
    name: String(p.full_name || p.name || 'Provider'),
    specialties: (p.specialties as string[]) || [],
    credentials: [String(p.provider_type || '').toUpperCase()].filter(Boolean),
    acceptedInsurance: (p.insurance_accepted as string[]) || [],
    telehealth: Boolean(p.offers_telehealth ?? true),
    inPerson: Boolean(p.offers_in_person ?? false),
    languages: (p.languages as string[]) || ['English'],
    ageRange: undefined,
    availability: Boolean(p.accepting_new_patients ?? p.accepts_new_patients) ? 'open' : 'waitlist',
    waitTimeDays: undefined,
    rating: parseFloat(String(p.rating)) || 4.5,
    reviewCount: Number(p.review_count) || 0,
    location: p.location_state
      ? { lat: 0, lng: 0, city: String(p.location_city || ''), state: String(p.location_state || '') }
      : undefined,
    cashRate: p.hourly_rate ? Number(p.hourly_rate) / 100 : undefined,
    diagnoses: [],
    crisisCapable: false,
    culturalCompetencies: [],
    nextAvailableSlot: undefined,
  };
}

// ─── Main search function ─────────────────────────────────────────────

export async function searchProviders(criteria: ProviderSearchCriteria = {}): Promise<ProviderSearchResult> {
  try {
    // Try 'providers' table first (019_provider_portal.sql), fall back to 'provider_profiles'
    let query = supabase
      .from('providers')
      .select(`
        id, first_name, last_name, provider_type, specialties,
        insurance_accepted, languages, rating, review_count,
        verified, accepts_new_patients, offers_telehealth, offers_in_person,
        location_city, location_state, hourly_rate
      `)
      .eq('verified', true)
      .eq('accepts_new_patients', true);

    if (criteria.telehealth !== false) {
      query = query.eq('offers_telehealth', true);
    }

    if (criteria.state) {
      query = query.eq('location_state', criteria.state.toUpperCase());
    }

    if (criteria.specialty) {
      // Filter by provider_type or specialties array
      const specialtyMap: Record<string, string[]> = {
        aba: ['bcba'],
        mh: ['lcsw', 'lmft', 'psychologist'],
        speech: ['slp'],
        ot: ['ot'],
      };
      const types = specialtyMap[criteria.specialty] || [criteria.specialty];
      query = query.in('provider_type', types);
    }

    const { data, error } = await query.order('rating', { ascending: false }).limit(10);

    if (error || !data || data.length === 0) {
      throw new Error('No providers in DB');
    }

    const providers = data.map((p: Record<string, unknown>) => {
      // Combine first_name + last_name
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      return mapDbProviderToProfile({ ...p, full_name: fullName });
    });

    // Filter by insurance if specified
    let filtered = providers;
    if (criteria.insurance) {
      const ins = criteria.insurance.toLowerCase();
      filtered = providers.filter((p) =>
        p.acceptedInsurance.some((i) => i.toLowerCase().includes(ins)),
      );
      if (filtered.length === 0) filtered = providers; // don't over-filter
    }

    return {
      providers: filtered,
      isLiveSearch: true,
      totalFound: filtered.length,
      searchedAt: new Date().toISOString(),
    };
  } catch {
    // Try provider_profiles table as fallback (older schema)
    try {
      const { data: altData, error: altError } = await supabase
        .from('provider_profiles')
        .select(`
          id, full_name, name, provider_type, credentials, bio, rating, review_count,
          verified, accepting_new_patients, offers_telehealth, license_state, state,
          hourly_rate, photo_url, specialties, insurance_accepted, languages
        `)
        .eq('verified', true)
        .eq('accepting_new_patients', true)
        .eq('offers_telehealth', true)
        .order('rating', { ascending: false })
        .limit(6);

      if (!altError && altData && altData.length > 0) {
        return {
          providers: altData.map((p: Record<string, unknown>) => mapDbProviderToProfile({
            ...p,
            location_state: p.license_state || p.state,
          })),
          isLiveSearch: true,
          totalFound: altData.length,
          searchedAt: new Date().toISOString(),
        };
      }
    } catch {
      // both failed
    }

    return {
      providers: getDemoProviders(criteria),
      isLiveSearch: false,
      totalFound: 3,
      searchedAt: new Date().toISOString(),
    };
  }
}
