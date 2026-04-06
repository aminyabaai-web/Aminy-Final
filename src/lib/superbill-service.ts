// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * superbill-service.ts
 *
 * Bridges the gap between the provider session completion flow and
 * superbill PDF generation. After a provider finishes a session and
 * writes clinical notes, this service:
 *
 * 1. Auto-suggests CPT codes using the AI engine in cpt-codes.ts
 * 2. Maps session data to superbill line items with standard rates
 * 3. Builds a complete Superbill object ready for PDF generation
 * 4. Persists superbills to Supabase for later retrieval
 */

import { suggestCPTCodes, getCPTByCode, type CPTCode } from './cpt-codes';
import {
  COMMON_CPT_CODES,
  type Superbill,
  type SuperbillLineItem,
} from '../types/telehealth';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

/** Minimal session shape consumed by the superbill generator */
export interface SessionForSuperbill {
  id: string;
  patientId: string;
  patientName: string;
  scheduledAt: Date | string;
  duration: number; // minutes
  type: string; // e.g., "Parent Consultation", "Follow-up Session", "Telehealth Session"
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
}

/** Clinical note content keyed by field name */
export interface ClinicalNoteForSuperbill {
  noteType: string;
  content: Record<string, string>;
  cptCode?: string;
  patientName: string;
  sessionId?: string;
}

/** Provider info needed for superbill header */
export interface ProviderForSuperbill {
  id: string;
  name: string;
  credentials: string;
  type: string; // maps to providerType for CPT suggestion
  npi?: string;
  taxId?: string;
}

// ============================================================================
// Rate Lookup
// ============================================================================

/**
 * Standard rate table for CPT codes. Uses the defaultPrice from
 * COMMON_CPT_CODES in telehealth.ts as the single source of truth,
 * with fallback rates for codes only defined in cpt-codes.ts.
 */
function getStandardRate(cptCode: string): number {
  const telehealthEntry = COMMON_CPT_CODES[cptCode as keyof typeof COMMON_CPT_CODES];
  if (telehealthEntry && telehealthEntry.defaultPrice > 0) {
    return telehealthEntry.defaultPrice;
  }

  // Fallback rates by category for codes in cpt-codes.ts but not in
  // COMMON_CPT_CODES (or priced at zero like modifiers)
  const cpt = getCPTByCode(cptCode);
  if (!cpt) return 0;

  const categoryRates: Record<string, number> = {
    'aba': 85,
    'slp': 125,
    'mental-health': 125,
    'diagnostic': 175,
    'dev-ped': 150,
    'telehealth': 0,
    'general': 100,
  };

  return categoryRates[cpt.category] ?? 100;
}

// ============================================================================
// Provider Type Mapping
// ============================================================================

/**
 * Maps the ProviderProfile.type string (from ProviderPortal) to the
 * providerType enum expected by suggestCPTCodes().
 */
function mapProviderType(
  type: string
): 'bcba' | 'rbt' | 'slp' | 'psychologist' | 'therapist' | 'dev-ped' | undefined {
  const mapping: Record<string, 'bcba' | 'rbt' | 'slp' | 'psychologist' | 'therapist' | 'dev-ped'> = {
    'bcba': 'bcba',
    'rbt': 'rbt',
    'slp': 'slp',
    'psychologist': 'psychologist',
    'therapist': 'therapist',
    'dev-ped': 'dev-ped',
    // Additional aliases that ProviderPortal might use
    'behavior-analyst': 'bcba',
    'speech-language-pathologist': 'slp',
    'counselor': 'therapist',
    'lcsw': 'therapist',
    'lmft': 'therapist',
  };
  return mapping[type.toLowerCase()] ?? undefined;
}

/**
 * Maps the session type string to the sessionType enum expected by
 * suggestCPTCodes().
 */
function mapSessionType(
  sessionTypeStr: string
): 'individual' | 'family' | 'group' | 'evaluation' | 'follow-up' | undefined {
  const lower = sessionTypeStr.toLowerCase();

  if (lower.includes('eval') || lower.includes('assessment') || lower.includes('diagnostic')) {
    return 'evaluation';
  }
  if (lower.includes('family') || lower.includes('parent')) {
    return 'family';
  }
  if (lower.includes('group')) {
    return 'group';
  }
  if (lower.includes('follow-up') || lower.includes('followup')) {
    return 'follow-up';
  }
  return 'individual';
}

// ============================================================================
// Core: Generate Superbill from Session
// ============================================================================

/**
 * Generates a complete Superbill object from a completed session,
 * clinical note, and provider profile. This is the primary entry point
 * for the auto-generation pipeline.
 *
 * Flow:
 * 1. If the clinical note already has a CPT code attached, use it.
 * 2. Otherwise, auto-suggest CPT codes using the AI engine.
 * 3. Build line items with standard rates and unit calculations.
 * 4. Assemble a full Superbill ready for PDF generation or Supabase storage.
 */
export function generateSuperbillFromSession(
  session: SessionForSuperbill,
  clinicalNote: ClinicalNoteForSuperbill,
  provider: ProviderForSuperbill
): Superbill {
  // ── Step 1: Determine CPT codes ──────────────────────────────────────
  const cptCodes: CPTCode[] = [];

  // If the provider already selected a CPT code during note-writing, prefer it
  if (clinicalNote.cptCode) {
    const explicit = getCPTByCode(clinicalNote.cptCode);
    if (explicit) cptCodes.push(explicit);
  }

  // If no explicit code, auto-suggest based on session context
  if (cptCodes.length === 0) {
    const suggestions = suggestCPTCodes({
      providerType: mapProviderType(provider.type),
      sessionType: mapSessionType(session.type),
      duration: session.duration,
      isTelemedicine: session.type.toLowerCase().includes('telehealth') ||
                       session.type.toLowerCase().includes('tele'),
    });
    // Take the top suggestion (most relevant)
    if (suggestions.length > 0) {
      cptCodes.push(suggestions[0]);
    }
  }

  // ── Step 2: Build line items ─────────────────────────────────────────
  const lineItems: SuperbillLineItem[] = cptCodes.map(cpt => {
    const rate = getStandardRate(cpt.code);

    // Calculate units based on code billing structure
    let units = 1;
    if (cpt.typicalDuration.includes('15 min')) {
      // Time-based codes billed in 15-minute units
      units = Math.max(1, Math.ceil(session.duration / 15));
    } else if (cpt.typicalDuration.includes('30 min') && session.duration > 30) {
      // Codes billed per 30-minute block
      units = Math.max(1, Math.ceil(session.duration / 30));
    } else {
      // Session-based codes (psychotherapy, evaluations) - 1 unit
      units = 1;
    }

    return {
      cptCode: cpt.code,
      description: cpt.description,
      units,
      unitCharge: rate,
      totalCharge: units * rate,
    };
  });

  // If we still have no line items (e.g., provider type not recognized),
  // create a generic entry based on session duration
  if (lineItems.length === 0) {
    lineItems.push({
      cptCode: '99213',
      description: 'Office/outpatient visit, established patient, low complexity',
      units: 1,
      unitCharge: 100,
      totalCharge: 100,
    });
  }

  // ── Step 3: Calculate totals ─────────────────────────────────────────
  const totalBilled = lineItems.reduce((sum, item) => sum + item.totalCharge, 0);

  // ── Step 4: Determine diagnosis codes from clinical note ─────────────
  // Extract any ICD-10 codes mentioned in the note content.
  // Default to F84.0 (Autism) as a common placeholder for the population.
  const diagnosisCodes = extractDiagnosisCodes(clinicalNote.content);
  if (diagnosisCodes.length === 0) {
    diagnosisCodes.push('F84.0'); // Autistic disorder - most common in this population
  }

  // ── Step 5: Determine place of service ───────────────────────────────
  const isTelehealth =
    session.type.toLowerCase().includes('telehealth') ||
    session.type.toLowerCase().includes('tele') ||
    session.type.toLowerCase().includes('virtual') ||
    session.type.toLowerCase().includes('remote');

  const placeOfService = isTelehealth ? '02' : '11'; // 02 = Telehealth, 11 = Office

  // ── Step 6: Assemble the Superbill ───────────────────────────────────
  const scheduledDate = session.scheduledAt instanceof Date
    ? session.scheduledAt
    : new Date(session.scheduledAt);

  const superbill: Superbill = {
    id: `sb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: session.patientId,
    appointmentId: session.id,
    providerId: provider.id,
    // Patient info
    patientName: session.patientName || clinicalNote.patientName,
    patientDOB: '', // Will be filled in by SuperbillGenerator form
    // Provider info
    providerName: provider.name,
    providerCredentials: provider.credentials,
    providerNPI: provider.npi,
    providerTaxId: provider.taxId,
    // Service info
    dateOfService: scheduledDate.toISOString().split('T')[0],
    placeOfService,
    diagnosisCodes,
    lineItems,
    // Totals
    totalBilled,
    amountPaid: totalBilled, // Default to full payment (cash-pay model)
    // Generation metadata
    generatedAt: new Date().toISOString(),
    status: 'generated',
  };

  return superbill;
}

// ============================================================================
// Helper: Extract ICD-10 Codes from Note Content
// ============================================================================

/**
 * Scans clinical note fields for ICD-10 diagnosis codes.
 * Matches patterns like F84.0, F90.2, R62.50, Z13.4, etc.
 */
function extractDiagnosisCodes(content: Record<string, string>): string[] {
  const icd10Pattern = /\b([A-Z]\d{2}(?:\.\d{1,3})?)\b/g;
  const codes = new Set<string>();

  for (const value of Object.values(content)) {
    if (!value) continue;
    const matches = value.matchAll(icd10Pattern);
    for (const match of matches) {
      const code = match[1];
      // Basic validation: ICD-10 codes relevant to behavioral health
      // start with F (mental/behavioral), R (symptoms), or Z (encounters)
      if (code.startsWith('F') || code.startsWith('R') || code.startsWith('Z')) {
        codes.add(code);
      }
    }
  }

  return Array.from(codes);
}

// ============================================================================
// Supabase Persistence
// ============================================================================

/**
 * Saves a generated superbill to the `superbills` table in Supabase.
 * Returns the saved superbill ID or null on error.
 */
export async function saveSuperbillToSupabase(
  superbill: Superbill
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('superbills')
      .insert({
        id: superbill.id,
        user_id: superbill.userId,
        appointment_id: superbill.appointmentId,
        provider_id: superbill.providerId,
        patient_name: superbill.patientName,
        patient_dob: superbill.patientDOB || null,
        provider_name: superbill.providerName,
        provider_credentials: superbill.providerCredentials,
        provider_npi: superbill.providerNPI || null,
        provider_tax_id: superbill.providerTaxId || null,
        date_of_service: superbill.dateOfService,
        place_of_service: superbill.placeOfService,
        diagnosis_codes: superbill.diagnosisCodes,
        line_items: superbill.lineItems,
        total_billed: superbill.totalBilled,
        amount_paid: superbill.amountPaid,
        generated_at: superbill.generatedAt,
        pdf_url: superbill.pdfUrl || null,
        status: superbill.status,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[superbill-service] Error saving superbill:', error.message);
      return null;
    }

    return data?.id ?? superbill.id;
  } catch (err) {
    console.error('[superbill-service] Unexpected error saving superbill:', err);
    return null;
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Fetches all superbills for a given patient (user_id).
 * Returns newest first.
 */
export async function getSuperbillsForPatient(
  patientId: string
): Promise<Superbill[]> {
  try {
    const { data, error } = await supabase
      .from('superbills')
      .select('*')
      .eq('user_id', patientId)
      .order('generated_at', { ascending: false });

    if (error) {
      console.error('[superbill-service] Error fetching patient superbills:', error.message);
      return [];
    }

    return (data ?? []).map(mapRowToSuperbill);
  } catch (err) {
    console.error('[superbill-service] Unexpected error fetching patient superbills:', err);
    return [];
  }
}

/**
 * Fetches all superbills generated by a given provider.
 * Returns newest first.
 */
export async function getSuperbillsForProvider(
  providerId: string
): Promise<Superbill[]> {
  try {
    const { data, error } = await supabase
      .from('superbills')
      .select('*')
      .eq('provider_id', providerId)
      .order('generated_at', { ascending: false });

    if (error) {
      console.error('[superbill-service] Error fetching provider superbills:', error.message);
      return [];
    }

    return (data ?? []).map(mapRowToSuperbill);
  } catch (err) {
    console.error('[superbill-service] Unexpected error fetching provider superbills:', err);
    return [];
  }
}

// ============================================================================
// Row Mapper
// ============================================================================

/**
 * Maps a Supabase row back into the Superbill interface.
 */
function mapRowToSuperbill(row: Record<string, unknown>): Superbill {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    appointmentId: row.appointment_id as string,
    providerId: row.provider_id as string,
    patientName: row.patient_name as string,
    patientDOB: (row.patient_dob as string) ?? '',
    providerName: row.provider_name as string,
    providerCredentials: row.provider_credentials as string,
    providerNPI: row.provider_npi as string | undefined,
    providerTaxId: row.provider_tax_id as string | undefined,
    dateOfService: row.date_of_service as string,
    placeOfService: row.place_of_service as string,
    diagnosisCodes: (row.diagnosis_codes as string[]) ?? [],
    lineItems: (row.line_items as SuperbillLineItem[]) ?? [],
    totalBilled: row.total_billed as number,
    amountPaid: row.amount_paid as number,
    generatedAt: row.generated_at as string,
    pdfUrl: row.pdf_url as string | undefined,
    status: row.status as 'generated' | 'downloaded' | 'submitted',
  };
}
