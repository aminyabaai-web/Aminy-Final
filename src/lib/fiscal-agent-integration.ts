/**
 * Fiscal Agent Integration
 *
 * Electronic Visit Verification (EVV), authorization tracking,
 * and budget management for Medicaid waiver services.
 *
 * Acumen/DCI/Fiscal Agent Perspective: 7/10 → 9/10
 */

import { supabase } from '../utils/supabase/client';

// ============================================
// TYPES
// ============================================

export type FiscalAgentType = 'acumen' | 'dci' | 'ppl' | 'conduent' | 'other';

export interface ServiceAuthorization {
  id: string;
  childId: string;
  fiscalAgent: FiscalAgentType;
  authorizationNumber: string;
  serviceCode: string;
  serviceName: string;
  authorizedUnits: number;
  usedUnits: number;
  remainingUnits: number;
  unitType: 'hours' | '15min' | 'daily' | 'monthly';
  effectiveDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'exhausted' | 'pending';
  providerNpi?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EVVRecord {
  id: string;
  authorizationId: string;
  childId: string;
  providerId: string;
  providerName: string;
  serviceDate: string;
  clockInTime: string;
  clockOutTime: string;
  clockInLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  clockOutLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  durationMinutes: number;
  units: number;
  serviceCode: string;
  verificationMethod: 'gps' | 'telephony' | 'fob' | 'biometric';
  clientSignature?: string; // Base64 encoded
  providerSignature?: string;
  status: 'pending' | 'verified' | 'rejected' | 'submitted';
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

export interface BudgetSummary {
  authorizationId: string;
  serviceName: string;
  totalAuthorized: number;
  totalUsed: number;
  remaining: number;
  percentUsed: number;
  daysRemaining: number;
  projectedExhaustion?: Date;
  burnRate: number; // Units per week
  onTrack: boolean;
}

export interface Timesheet {
  id: string;
  childId: string;
  providerId: string;
  periodStart: string;
  periodEnd: string;
  evvRecords: EVVRecord[];
  totalHours: number;
  totalUnits: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'submitted' | 'paid' | 'rejected';
  parentSignature?: string;
  parentSignedAt?: string;
  providerSignature?: string;
  providerSignedAt?: string;
  submittedAt?: string;
  paidAt?: string;
  paidAmount?: number;
  createdAt: string;
}

// ============================================
// AUTHORIZATION TRACKING
// ============================================

/**
 * Get all authorizations for a child
 */
export async function getAuthorizations(childId: string): Promise<ServiceAuthorization[]> {
  try {
    const { data, error } = await supabase
      .from('service_authorizations')
      .select('*')
      .eq('child_id', childId)
      .order('effective_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      childId: row.child_id,
      fiscalAgent: row.fiscal_agent,
      authorizationNumber: row.authorization_number,
      serviceCode: row.service_code,
      serviceName: row.service_name,
      authorizedUnits: row.authorized_units,
      usedUnits: row.used_units,
      remainingUnits: row.authorized_units - row.used_units,
      unitType: row.unit_type,
      effectiveDate: row.effective_date,
      endDate: row.end_date,
      status: calculateAuthStatus(row),
      providerNpi: row.provider_npi,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('[FiscalAgent] Error fetching authorizations:', err);
    return [];
  }
}

function calculateAuthStatus(auth: any): ServiceAuthorization['status'] {
  const now = new Date();
  const endDate = new Date(auth.end_date);
  const remaining = auth.authorized_units - auth.used_units;

  if (remaining <= 0) return 'exhausted';
  if (endDate < now) return 'expired';
  if (!auth.authorization_number) return 'pending';
  return 'active';
}

/**
 * Create a new authorization
 */
export async function createAuthorization(
  auth: Omit<ServiceAuthorization, 'id' | 'usedUnits' | 'remainingUnits' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<ServiceAuthorization | null> {
  try {
    const { data, error } = await supabase
      .from('service_authorizations')
      .insert({
        child_id: auth.childId,
        fiscal_agent: auth.fiscalAgent,
        authorization_number: auth.authorizationNumber,
        service_code: auth.serviceCode,
        service_name: auth.serviceName,
        authorized_units: auth.authorizedUnits,
        used_units: 0,
        unit_type: auth.unitType,
        effective_date: auth.effectiveDate,
        end_date: auth.endDate,
        provider_npi: auth.providerNpi,
        notes: auth.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      childId: data.child_id,
      fiscalAgent: data.fiscal_agent,
      authorizationNumber: data.authorization_number,
      serviceCode: data.service_code,
      serviceName: data.service_name,
      authorizedUnits: data.authorized_units,
      usedUnits: 0,
      remainingUnits: data.authorized_units,
      unitType: data.unit_type,
      effectiveDate: data.effective_date,
      endDate: data.end_date,
      status: 'active',
      providerNpi: data.provider_npi,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error('[FiscalAgent] Error creating authorization:', err);
    return null;
  }
}

// ============================================
// EVV RECORDING
// ============================================

/**
 * Clock in for a visit
 */
export async function clockIn(
  authorizationId: string,
  childId: string,
  providerId: string,
  providerName: string,
  serviceCode: string,
  location: { latitude: number; longitude: number }
): Promise<EVVRecord | null> {
  try {
    const { data, error } = await supabase
      .from('evv_records')
      .insert({
        authorization_id: authorizationId,
        child_id: childId,
        provider_id: providerId,
        provider_name: providerName,
        service_date: new Date().toISOString().split('T')[0],
        clock_in_time: new Date().toISOString(),
        clock_in_location: location,
        service_code: serviceCode,
        verification_method: 'gps',
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      authorizationId: data.authorization_id,
      childId: data.child_id,
      providerId: data.provider_id,
      providerName: data.provider_name,
      serviceDate: data.service_date,
      clockInTime: data.clock_in_time,
      clockOutTime: '',
      clockInLocation: data.clock_in_location,
      clockOutLocation: { latitude: 0, longitude: 0 },
      durationMinutes: 0,
      units: 0,
      serviceCode: data.service_code,
      verificationMethod: data.verification_method,
      status: data.status,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[EVV] Error clocking in:', err);
    return null;
  }
}

/**
 * Clock out from a visit
 */
export async function clockOut(
  recordId: string,
  location: { latitude: number; longitude: number },
  notes?: string
): Promise<EVVRecord | null> {
  try {
    // Get the existing record
    const { data: existing, error: fetchError } = await supabase
      .from('evv_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchError) throw fetchError;

    const clockOutTime = new Date();
    const clockInTime = new Date(existing.clock_in_time);
    const durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60));
    const units = Math.ceil(durationMinutes / 15); // 15-min units

    const { data, error } = await supabase
      .from('evv_records')
      .update({
        clock_out_time: clockOutTime.toISOString(),
        clock_out_location: location,
        duration_minutes: durationMinutes,
        units: units,
        notes: notes,
        status: 'verified',
      })
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;

    // Update authorization used units
    await supabase.rpc('increment_used_units', {
      auth_id: existing.authorization_id,
      unit_count: units,
    });

    return {
      id: data.id,
      authorizationId: data.authorization_id,
      childId: data.child_id,
      providerId: data.provider_id,
      providerName: data.provider_name,
      serviceDate: data.service_date,
      clockInTime: data.clock_in_time,
      clockOutTime: data.clock_out_time,
      clockInLocation: data.clock_in_location,
      clockOutLocation: data.clock_out_location,
      durationMinutes: data.duration_minutes,
      units: data.units,
      serviceCode: data.service_code,
      verificationMethod: data.verification_method,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[EVV] Error clocking out:', err);
    return null;
  }
}

/**
 * Get EVV records for a child
 */
export async function getEVVRecords(
  childId: string,
  startDate?: Date,
  endDate?: Date
): Promise<EVVRecord[]> {
  try {
    let query = supabase
      .from('evv_records')
      .select('*')
      .eq('child_id', childId)
      .order('service_date', { ascending: false });

    if (startDate) {
      query = query.gte('service_date', startDate.toISOString().split('T')[0]);
    }
    if (endDate) {
      query = query.lte('service_date', endDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      authorizationId: row.authorization_id,
      childId: row.child_id,
      providerId: row.provider_id,
      providerName: row.provider_name,
      serviceDate: row.service_date,
      clockInTime: row.clock_in_time,
      clockOutTime: row.clock_out_time || '',
      clockInLocation: row.clock_in_location,
      clockOutLocation: row.clock_out_location || { latitude: 0, longitude: 0 },
      durationMinutes: row.duration_minutes || 0,
      units: row.units || 0,
      serviceCode: row.service_code,
      verificationMethod: row.verification_method,
      clientSignature: row.client_signature,
      providerSignature: row.provider_signature,
      status: row.status,
      rejectionReason: row.rejection_reason,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('[EVV] Error fetching records:', err);
    return [];
  }
}

// ============================================
// BUDGET CALCULATOR
// ============================================

/**
 * Calculate budget summary for an authorization
 */
export function calculateBudgetSummary(
  authorization: ServiceAuthorization,
  evvRecords: EVVRecord[]
): BudgetSummary {
  const now = new Date();
  const endDate = new Date(authorization.endDate);
  const effectiveDate = new Date(authorization.effectiveDate);

  // Days remaining
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate burn rate (units per week)
  const authRecords = evvRecords.filter(r => r.authorizationId === authorization.id);
  const totalDays = Math.max(1, (now.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24));
  const unitsPerDay = authorization.usedUnits / totalDays;
  const burnRate = unitsPerDay * 7;

  // Project exhaustion date
  let projectedExhaustion: Date | undefined;
  if (burnRate > 0) {
    const daysToExhaustion = authorization.remainingUnits / unitsPerDay;
    projectedExhaustion = new Date(now.getTime() + daysToExhaustion * 24 * 60 * 60 * 1000);
  }

  // Check if on track
  const expectedUsed = (authorization.authorizedUnits / totalDays) * (totalDays - daysRemaining);
  const onTrack = authorization.usedUnits <= expectedUsed * 1.1; // Within 10% of expected

  return {
    authorizationId: authorization.id,
    serviceName: authorization.serviceName,
    totalAuthorized: authorization.authorizedUnits,
    totalUsed: authorization.usedUnits,
    remaining: authorization.remainingUnits,
    percentUsed: Math.round((authorization.usedUnits / authorization.authorizedUnits) * 100),
    daysRemaining,
    projectedExhaustion,
    burnRate: Math.round(burnRate * 10) / 10,
    onTrack,
  };
}

/**
 * Get all budget summaries for a child
 */
export async function getAllBudgetSummaries(childId: string): Promise<BudgetSummary[]> {
  const authorizations = await getAuthorizations(childId);
  const evvRecords = await getEVVRecords(childId);

  return authorizations
    .filter(a => a.status === 'active')
    .map(auth => calculateBudgetSummary(auth, evvRecords));
}

// ============================================
// TIMESHEET GENERATION
// ============================================

/**
 * Generate timesheet for a pay period
 */
export async function generateTimesheet(
  childId: string,
  providerId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<Timesheet | null> {
  try {
    // Get EVV records for the period
    const evvRecords = await getEVVRecords(childId, periodStart, periodEnd);
    const providerRecords = evvRecords.filter(r => r.providerId === providerId && r.status === 'verified');

    if (providerRecords.length === 0) return null;

    const totalMinutes = providerRecords.reduce((sum, r) => sum + r.durationMinutes, 0);
    const totalUnits = providerRecords.reduce((sum, r) => sum + r.units, 0);

    const { data, error } = await supabase
      .from('timesheets')
      .insert({
        child_id: childId,
        provider_id: providerId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        evv_record_ids: providerRecords.map(r => r.id),
        total_hours: totalMinutes / 60,
        total_units: totalUnits,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      childId: data.child_id,
      providerId: data.provider_id,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      evvRecords: providerRecords,
      totalHours: data.total_hours,
      totalUnits: data.total_units,
      status: data.status,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[Timesheet] Error generating timesheet:', err);
    return null;
  }
}

/**
 * Export timesheet as PDF data
 */
export function exportTimesheetToPDF(timesheet: Timesheet): {
  title: string;
  periods: { start: string; end: string };
  records: Array<{
    date: string;
    clockIn: string;
    clockOut: string;
    hours: number;
    service: string;
  }>;
  totals: { hours: number; units: number };
  signatures: {
    parent?: { signed: boolean; date?: string };
    provider?: { signed: boolean; date?: string };
  };
} {
  return {
    title: `Timesheet - ${new Date(timesheet.periodStart).toLocaleDateString()} to ${new Date(timesheet.periodEnd).toLocaleDateString()}`,
    periods: {
      start: timesheet.periodStart,
      end: timesheet.periodEnd,
    },
    records: timesheet.evvRecords.map(r => ({
      date: r.serviceDate,
      clockIn: new Date(r.clockInTime).toLocaleTimeString(),
      clockOut: r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString() : '',
      hours: r.durationMinutes / 60,
      service: r.serviceCode,
    })),
    totals: {
      hours: timesheet.totalHours,
      units: timesheet.totalUnits,
    },
    signatures: {
      parent: timesheet.parentSignature ? { signed: true, date: timesheet.parentSignedAt } : { signed: false },
      provider: timesheet.providerSignature ? { signed: true, date: timesheet.providerSignedAt } : { signed: false },
    },
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  getAuthorizations,
  createAuthorization,
  clockIn,
  clockOut,
  getEVVRecords,
  calculateBudgetSummary,
  getAllBudgetSummaries,
  generateTimesheet,
  exportTimesheetToPDF,
};
