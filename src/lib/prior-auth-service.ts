// Prior Authorization service — Supabase-backed with localStorage fallback + PDF generation
import jsPDF from 'jspdf';
import { supabase } from '../utils/supabase/client';

export interface PriorAuthRequest {
  id: string;
  userId: string;
  childName: string;
  serviceType: string;
  frequency: string;
  duration: string;
  diagnosisCodes: string[];
  providerName: string;
  providerNPI?: string;
  providerCredentials?: string;
  insuranceCompany: string;
  memberId?: string;
  attachedDocuments: string[];
  status: 'draft' | 'ready' | 'submitted' | 'approved' | 'denied';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'aminy-prior-auth-requests';

// ── DB <-> App mapping ──────────────────────────────────────────────

interface DbRow {
  id: string;
  user_id: string;
  child_name: string;
  service_type: string;
  frequency: string;
  duration: string;
  diagnosis_codes: string[];
  provider_name: string;
  provider_npi: string | null;
  provider_credentials: string | null;
  insurance_company: string;
  member_id: string | null;
  attached_documents: string[];
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbToRequest(row: DbRow): PriorAuthRequest {
  return {
    id: row.id,
    userId: row.user_id,
    childName: row.child_name,
    serviceType: row.service_type,
    frequency: row.frequency,
    duration: row.duration,
    diagnosisCodes: row.diagnosis_codes ?? [],
    providerName: row.provider_name,
    providerNPI: row.provider_npi ?? undefined,
    providerCredentials: row.provider_credentials ?? undefined,
    insuranceCompany: row.insurance_company,
    memberId: row.member_id ?? undefined,
    attachedDocuments: row.attached_documents ?? [],
    status: row.status as PriorAuthRequest['status'],
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRequestToDb(req: PriorAuthRequest): Omit<DbRow, 'created_at' | 'updated_at'> & { created_at: string; updated_at: string } {
  return {
    id: req.id,
    user_id: req.userId,
    child_name: req.childName,
    service_type: req.serviceType,
    frequency: req.frequency,
    duration: req.duration,
    diagnosis_codes: req.diagnosisCodes,
    provider_name: req.providerName,
    provider_npi: req.providerNPI ?? null,
    provider_credentials: req.providerCredentials ?? null,
    insurance_company: req.insuranceCompany,
    member_id: req.memberId ?? null,
    attached_documents: req.attachedDocuments,
    status: req.status,
    notes: req.notes || null,
    created_at: req.createdAt,
    updated_at: req.updatedAt,
  };
}

// ── localStorage helpers ────────────────────────────────────────────

function getFromLocalStorage(userId?: string): PriorAuthRequest[] {
  try {
    const all: PriorAuthRequest[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return userId ? all.filter(r => r.userId === userId) : all;
  } catch {
    // localStorage unavailable
    return [];
  }
}

function saveAllToLocalStorage(requests: PriorAuthRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch { /* localStorage full or unavailable */ }
}

function upsertInLocalStorage(request: PriorAuthRequest): void {
  try {
    const all: PriorAuthRequest[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = all.findIndex(r => r.id === request.id);
    if (idx >= 0) {
      all[idx] = request;
    } else {
      all.push(request);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* localStorage full or unavailable */ }
}

// ── CRUD — Supabase-first, localStorage fallback ────────────────────

export async function createAuthRequest(
  data: Omit<PriorAuthRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PriorAuthRequest> {
  const now = new Date().toISOString();
  const request: PriorAuthRequest = {
    ...data,
    id: `pa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };

  // Attempt Supabase insert
  try {
    const { error } = await supabase
      .from('prior_auth_requests')
      .insert(mapRequestToDb(request));

    if (error) {
      console.warn('[PriorAuth] Supabase insert failed, using localStorage fallback:', error.message);
    }
  } catch (err) {
    console.warn('[PriorAuth] Supabase unavailable, using localStorage fallback:', err);
  }

  // Always update localStorage cache
  upsertInLocalStorage(request);

  // Also add to benefit-requests for tracking (localStorage-only cross-feature link)
  try {
    const tracked = JSON.parse(localStorage.getItem('aminy-benefit-requests') || '[]');
    tracked.push({
      title: `Prior Auth: ${data.serviceType}`,
      status: 'submitted',
      date: request.createdAt,
      type: 'prior-auth',
      id: request.id,
    });
    localStorage.setItem('aminy-benefit-requests', JSON.stringify(tracked));
  } catch { /* ignore */ }

  return request;
}

export async function getAuthRequests(userId: string): Promise<PriorAuthRequest[]> {
  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('prior_auth_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped = (data as DbRow[]).map(mapDbToRequest);
      // Update localStorage cache with fresh server data
      saveAllToLocalStorage(mapped);
      return mapped;
    }

    if (error) {
      console.warn('[PriorAuth] Supabase query failed, falling back to localStorage:', error.message);
    }
  } catch (err) {
    console.warn('[PriorAuth] Supabase unavailable, falling back to localStorage:', err);
  }

  // Fallback to localStorage
  return getFromLocalStorage(userId);
}

export async function updateAuthStatus(
  requestId: string,
  status: PriorAuthRequest['status'],
  notes?: string
): Promise<void> {
  const now = new Date().toISOString();

  // Try Supabase first
  try {
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: now,
    };
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    const { error } = await supabase
      .from('prior_auth_requests')
      .update(updatePayload)
      .eq('id', requestId);

    if (error) {
      console.warn('[PriorAuth] Supabase update failed, using localStorage fallback:', error.message);
    }
  } catch (err) {
    console.warn('[PriorAuth] Supabase unavailable, using localStorage fallback:', err);
  }

  // Always update localStorage cache
  try {
    const all: PriorAuthRequest[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = all.findIndex(r => r.id === requestId);
    if (idx >= 0) {
      all[idx].status = status;
      all[idx].updatedAt = now;
      if (notes !== undefined) all[idx].notes = notes;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  } catch { /* ignore */ }
}

/**
 * One-time migration: push any localStorage-only records up to Supabase.
 * Safe to call multiple times — uses upsert so duplicates are handled.
 * Call this once after the user logs in or when the app boots.
 */
export async function syncLocalStorageToSupabase(userId: string): Promise<void> {
  const local = getFromLocalStorage(userId);
  if (local.length === 0) return;

  try {
    const rows = local.map(mapRequestToDb);
    const { error } = await supabase
      .from('prior_auth_requests')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('[PriorAuth] localStorage-to-Supabase sync failed:', error.message);
    } else {
      if (import.meta.env.DEV) console.info(`[PriorAuth] Synced ${rows.length} localStorage record(s) to Supabase`);
    }
  } catch (err) {
    console.warn('[PriorAuth] Sync unavailable:', err);
  }
}

// ── PDF Generation ───────────────────────────────────────────────────

export function generateAuthPDF(request: PriorAuthRequest): void {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Prior Authorization Request', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
  doc.text(`Request ID: ${request.id}`, 120, y);
  y += 8;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, 190, y);
  y += 10;

  // Patient Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Information', margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Patient Name: ${request.childName}`, margin, y); y += 6;
  doc.text(`Diagnosis Codes: ${request.diagnosisCodes.join(', ')}`, margin, y); y += 6;
  if (request.memberId) {
    doc.text(`Member ID: ${request.memberId}`, margin, y); y += 6;
  }
  doc.text(`Insurance: ${request.insuranceCompany}`, margin, y); y += 10;

  // Service Requested
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Service Requested', margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Service Type: ${request.serviceType}`, margin, y); y += 6;
  doc.text(`Frequency: ${request.frequency}`, margin, y); y += 6;
  doc.text(`Duration: ${request.duration}`, margin, y); y += 10;

  // Provider Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Requesting Provider', margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Provider: ${request.providerName}`, margin, y); y += 6;
  if (request.providerNPI) {
    doc.text(`NPI: ${request.providerNPI}`, margin, y); y += 6;
  }
  if (request.providerCredentials) {
    doc.text(`Credentials: ${request.providerCredentials}`, margin, y); y += 6;
  }
  y += 4;

  // Medical Necessity
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Medical Necessity Statement', margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const necessityText = `${request.serviceType} is medically necessary for ${request.childName} based on their diagnosis of ${request.diagnosisCodes.join(', ')}. This treatment follows evidence-based guidelines recommended by the American Academy of Pediatrics and is the gold-standard intervention for individuals with autism spectrum disorder.`;
  const lines = doc.splitTextToSize(necessityText, 170);
  doc.text(lines, margin, y);
  y += lines.length * 5 + 10;

  // Notes
  if (request.notes) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Notes', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(request.notes, 170);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 10;
  }

  // Attached Documents
  if (request.attachedDocuments.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Attached Documentation', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    request.attachedDocuments.forEach(docName => {
      doc.text(`• ${docName}`, margin + 5, y);
      y += 6;
    });
    y += 4;
  }

  // Signature line
  y = Math.max(y, 240);
  doc.line(margin, y, 100, y);
  y += 5;
  doc.text('Provider Signature / Date', margin, y);
  y += 15;
  doc.line(margin, y - 10, 100, y - 10);
  doc.text('Parent/Guardian Signature / Date', margin, y - 5);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('Generated by Aminy — Behavioral Wellness Platform', margin, 285);
  doc.text(`${new Date().toLocaleString()}`, 140, 285);

  doc.save(`prior-auth-${request.serviceType.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Common diagnosis codes for autism services
export const COMMON_DIAGNOSIS_CODES = [
  { code: 'F84.0', label: 'Autism Spectrum Disorder' },
  { code: 'F84.5', label: "Asperger's Syndrome" },
  { code: 'F84.9', label: 'Pervasive Developmental Disorder, Unspecified' },
  { code: 'F80.1', label: 'Expressive Language Disorder' },
  { code: 'F80.2', label: 'Mixed Receptive-Expressive Language Disorder' },
  { code: 'F82', label: 'Developmental Coordination Disorder' },
  { code: 'F88', label: 'Other Disorders of Psychological Development' },
  { code: 'F90.0', label: 'ADHD, Predominantly Inattentive' },
  { code: 'F90.1', label: 'ADHD, Predominantly Hyperactive' },
  { code: 'F90.2', label: 'ADHD, Combined Type' },
];

// Common service types for prior auth
export const SERVICE_TYPES = [
  'ABA Therapy',
  'Speech-Language Therapy',
  'Occupational Therapy',
  'Behavioral Health Assessment',
  'Diagnostic Evaluation',
  'Respite Care',
  'Social Skills Group',
  'Parent Training',
];
