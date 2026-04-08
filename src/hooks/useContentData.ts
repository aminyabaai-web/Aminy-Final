// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useContentData Hook
 * Loads clinical content, screening, and resource data from Supabase with localStorage fallback.
 *
 * For screens: vision-ai, clinical-templates, mchat-screening, resources, medications
 * Tables: screening_recommendations, medications
 * Replaces localStorage keys: vision results, template caching, screening data
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface VisionResult {
  id: string;
  imageUrl?: string;
  analysis: string;
  concerns: string[];
  recommendations: string[];
  analyzedAt: string;
}

export interface ClinicalTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
  tags: string[];
  isDefault: boolean;
  createdAt: string;
}

export interface ScreeningData {
  id: string;
  type: 'mchat' | 'developmental' | 'sensory' | 'behavioral';
  responses: Record<string, unknown>;
  score?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  completedAt: string;
  recommendations?: string[];
}

export interface MedicationEntry {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate?: string;
  endDate?: string;
  sideEffects?: string[];
  notes?: string;
  isActive: boolean;
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  category: string;
  tags: string[];
  isFavorited: boolean;
}

export interface ContentData {
  visionResults: VisionResult[];
  clinicalTemplates: ClinicalTemplate[];
  screenings: ScreeningData[];
  medications: MedicationEntry[];
  resources: ResourceItem[];
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache helpers (offline fallback only)
// ============================================================================

const CACHE_KEYS = {
  VISION: 'aminy-vision-results',
  TEMPLATES: 'aminy-clinical-templates',
  SCREENINGS: 'aminy-screening-data',
  MEDICATIONS: 'aminy-medications',
  RESOURCES: 'aminy-resources',
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
  } catch {
    // Storage full or blocked — ignore
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useContentData(userId?: string) {
  const [data, setData] = useState<ContentData>({
    visionResults: [],
    clinicalTemplates: [],
    screenings: [],
    medications: [],
    resources: [],
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

      const [screeningsResult, medicationsResult] = await Promise.all([
        supabase
          .from('screening_recommendations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
          .then(r => r, err => ({ data: null, error: err })),
        supabase
          .from('medications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .then(r => r, err => ({ data: null, error: err })),
      ]);

      const screenings: ScreeningData[] = (screeningsResult.data || []).map((r: Record<string, unknown>) => ({
        id: (r.id as string) || '',
        type: (r.screening_type as ScreeningData['type']) || 'behavioral',
        responses: (r.responses as Record<string, unknown>) || {},
        score: r.score as number | undefined,
        riskLevel: r.risk_level as ScreeningData['riskLevel'],
        completedAt: (r.completed_at as string) || (r.created_at as string) || '',
        recommendations: r.recommendations as string[] | undefined,
      }));

      const medications: MedicationEntry[] = (medicationsResult.data || []).map((m: Record<string, unknown>) => ({
        id: (m.id as string) || '',
        name: (m.name as string) || '',
        dosage: (m.dosage as string) || '',
        frequency: (m.frequency as string) || '',
        prescribedBy: m.prescribed_by as string | undefined,
        startDate: m.start_date as string | undefined,
        endDate: m.end_date as string | undefined,
        sideEffects: m.side_effects as string[] | undefined,
        notes: m.notes as string | undefined,
        isActive: (m.is_active as boolean) ?? true,
      }));

      writeCache(CACHE_KEYS.SCREENINGS, screenings);
      writeCache(CACHE_KEYS.MEDICATIONS, medications);

      // Vision + templates + resources use localStorage until dedicated tables exist
      const visionResults = readCache<VisionResult[]>(CACHE_KEYS.VISION, []);
      const clinicalTemplates = readCache<ClinicalTemplate[]>(CACHE_KEYS.TEMPLATES, []);
      const resources = readCache<ResourceItem[]>(CACHE_KEYS.RESOURCES, []);

      setData({
        visionResults, clinicalTemplates, screenings, medications, resources,
        loading: false, error: null,
      });
    } catch (err) {
      console.warn('useContentData: Supabase failed, using cache', err);
      setData({
        visionResults: readCache(CACHE_KEYS.VISION, []),
        clinicalTemplates: readCache(CACHE_KEYS.TEMPLATES, []),
        screenings: readCache(CACHE_KEYS.SCREENINGS, []),
        medications: readCache(CACHE_KEYS.MEDICATIONS, []),
        resources: readCache(CACHE_KEYS.RESOURCES, []),
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load content data',
      });
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const addVisionResult = useCallback(async (result: Omit<VisionResult, 'id'>) => {
    const newResult: VisionResult = { ...result, id: crypto.randomUUID() };
    setData(prev => {
      const updated = [newResult, ...prev.visionResults];
      writeCache(CACHE_KEYS.VISION, updated);
      return { ...prev, visionResults: updated };
    });
  }, []);

  const addMedication = useCallback(async (med: Omit<MedicationEntry, 'id'>) => {
    if (!userId) return;
    const { error } = await supabase
      .from('medications')
      .insert({ ...med, user_id: userId })
      .select()
      .single();
    if (!error) await loadData();
  }, [userId, loadData]);

  const updateMedication = useCallback(async (id: string, updates: Partial<MedicationEntry>) => {
    const { error } = await supabase.from('medications').update(updates).eq('id', id);
    if (!error) await loadData();
  }, [loadData]);

  return { ...data, refresh: loadData, addVisionResult, addMedication, updateMedication };
}
