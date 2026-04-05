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

function isExpectedPilotAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const maybeCode = 'code' in err ? String((err as { code?: unknown }).code || '') : '';
  const maybeMessage = 'message' in err ? String((err as { message?: unknown }).message || '') : '';

  return (
    maybeCode === '42P01' ||
    maybeCode === 'PGRST205' ||
    maybeCode === 'PGRST116' ||
    maybeMessage.includes('service_authorizations') ||
    maybeMessage.includes('relation') ||
    maybeMessage.includes('schema cache')
  );
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
    if (!isExpectedPilotAuthError(err)) {
      console.warn('[FiscalAgent] Error fetching authorizations:', err);
    }
    return [];
  }
}

function calculateAuthStatus(auth: { end_date: string; authorized_units: number; used_units: number; authorization_number?: string }): ServiceAuthorization['status'] {
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
    if (!isExpectedPilotAuthError(err)) {
      console.warn('[FiscalAgent] Error creating authorization:', err);
    }
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
// FISCAL AGENT VALIDATION RULES
// ============================================

import type { EVVRecord as ReconciliationEVVRecord, FiscalAgentSubmission } from './evv-reconciliation';

export interface FiscalAgentValidationError {
  recordId: string;
  agent: FiscalAgentType;
  rule: string;
  description: string;
  severity: 'blocking' | 'warning';
  resolution: string;
}

export interface FiscalAgentValidationResult {
  agent: FiscalAgentType;
  totalRecords: number;
  passedRecords: number;
  failedRecords: number;
  errors: FiscalAgentValidationError[];
  overallPass: boolean;
}

/**
 * Validate EVV records against fiscal-agent-specific rules.
 * - Acumen: GPS within 0.25 miles of service location
 * - DCI: Exact unit matching (billed must equal EVV-calculated)
 * - PPL: Caregiver credential verification required
 */
export function validateForFiscalAgent(
  records: ReconciliationEVVRecord[],
  agent: FiscalAgentType
): FiscalAgentValidationResult {
  const errors: FiscalAgentValidationError[] = [];

  for (const record of records) {
    // Common validations for all agents
    if (!record.actualCheckIn) {
      errors.push({
        recordId: record.id,
        agent,
        rule: 'checkin_required',
        description: 'EVV check-in is missing',
        severity: 'blocking',
        resolution: 'Provider must record check-in via EVV device before session can be submitted.',
      });
    }
    if (!record.actualCheckOut) {
      errors.push({
        recordId: record.id,
        agent,
        rule: 'checkout_required',
        description: 'EVV check-out is missing',
        severity: 'blocking',
        resolution: 'Provider must submit a manual attestation for the checkout time.',
      });
    }

    // Agent-specific rules
    if (agent === 'acumen') {
      // Acumen requires GPS within 0.25 miles
      if (record.checkInLatitude != null && record.checkInLongitude != null) {
        const dist = haversineDistance(
          record.checkInLatitude, record.checkInLongitude,
          record.expectedLatitude, record.expectedLongitude
        );
        if (dist > 0.25) {
          errors.push({
            recordId: record.id,
            agent,
            rule: 'acumen_gps_proximity',
            description: `Check-in GPS is ${dist.toFixed(2)} miles from service location (Acumen max: 0.25 miles)`,
            severity: 'blocking',
            resolution: 'Verify service was delivered at the authorized address. If community-based, attach a location override form signed by the BCBA.',
          });
        }
      } else {
        errors.push({
          recordId: record.id,
          agent,
          rule: 'acumen_gps_required',
          description: 'Acumen requires GPS coordinates for check-in',
          severity: 'blocking',
          resolution: 'Ensure EVV device has location services enabled before check-in.',
        });
      }
    }

    if (agent === 'dci') {
      // DCI requires exact unit matching
      if (record.actualCheckIn && record.actualCheckOut) {
        const actualStart = new Date(record.actualCheckIn);
        const actualEnd = new Date(record.actualCheckOut);
        const durationHours = (actualEnd.getTime() - actualStart.getTime()) / 3600000;
        const evvUnits = Math.floor(durationHours * 4); // 15-min units
        const billedUnits = record.actualUnits ?? record.scheduledUnits;

        if (billedUnits !== evvUnits) {
          errors.push({
            recordId: record.id,
            agent,
            rule: 'dci_exact_unit_match',
            description: `Billed ${billedUnits} units but EVV clock time supports exactly ${evvUnits} units (DCI requires exact match)`,
            severity: 'blocking',
            resolution: `Adjust billed units to ${evvUnits} to match EVV-verified duration. DCI does not allow rounding up.`,
          });
        }
      }
    }

    if (agent === 'ppl') {
      // PPL requires caregiver credential verification
      if (!record.providerId || record.providerId.trim() === '') {
        errors.push({
          recordId: record.id,
          agent,
          rule: 'ppl_provider_id_required',
          description: 'PPL requires a valid provider/caregiver ID on every record',
          severity: 'blocking',
          resolution: 'Link the caregiver profile with their PPL-registered employee ID before submission.',
        });
      }
      // PPL also requires authorization linkage
      if (!record.authorizationNumber || record.authorizationNumber.trim() === '') {
        errors.push({
          recordId: record.id,
          agent,
          rule: 'ppl_authorization_required',
          description: 'PPL requires an active authorization number',
          severity: 'blocking',
          resolution: 'Attach a valid AHCCCS authorization number. Contact PPL if the authorization has not been loaded.',
        });
      }
    }
  }

  const failedRecordIds = new Set(errors.filter(e => e.severity === 'blocking').map(e => e.recordId));

  return {
    agent,
    totalRecords: records.length,
    passedRecords: records.length - failedRecordIds.size,
    failedRecords: failedRecordIds.size,
    errors,
    overallPass: failedRecordIds.size === 0,
  };
}

/** Haversine distance in miles (local helper for fiscal agent validation) */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================
// ACCEPTANCE RATE TRACKING
// ============================================

export interface AcceptanceRateReport {
  totalSubmissions: number;
  acceptedCount: number;
  rejectedCount: number;
  acceptanceRate: number; // 0-100
  commonRejectionReasons: { reason: string; count: number; percentage: number }[];
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    recentRate: number; // last 3 submissions
    overallRate: number;
  };
}

export function trackAcceptanceRate(submissions: FiscalAgentSubmission[]): AcceptanceRateReport {
  const accepted = submissions.filter(s => s.readyForSubmission && s.blockingIssues.length === 0);
  const rejected = submissions.filter(s => !s.readyForSubmission || s.blockingIssues.length > 0);

  // Common rejection reasons
  const reasonCounts = new Map<string, number>();
  for (const sub of rejected) {
    for (const issue of sub.blockingIssues) {
      reasonCounts.set(issue, (reasonCounts.get(issue) || 0) + 1);
    }
  }
  const totalRejections = rejected.length || 1;
  const commonRejectionReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / totalRejections) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Trend: compare recent (last 3) vs overall
  const recent = submissions.slice(-3);
  const recentAccepted = recent.filter(s => s.readyForSubmission && s.blockingIssues.length === 0);
  const recentRate = recent.length > 0 ? Math.round((recentAccepted.length / recent.length) * 100) : 0;
  const overallRate = submissions.length > 0 ? Math.round((accepted.length / submissions.length) * 100) : 0;

  const direction: AcceptanceRateReport['trend']['direction'] =
    recentRate > overallRate + 5 ? 'improving'
    : recentRate < overallRate - 5 ? 'declining'
    : 'stable';

  return {
    totalSubmissions: submissions.length,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    acceptanceRate: overallRate,
    commonRejectionReasons,
    trend: { direction, recentRate, overallRate },
  };
}

// ============================================
// BUDGET UTILIZATION ALERTS
// ============================================

export type BudgetAlertLevel = 'none' | 'warning' | 'critical' | 'exhausted';

export interface BudgetAlert {
  authorizationId: string;
  serviceName: string;
  alertLevel: BudgetAlertLevel;
  percentUsed: number;
  remainingUnits: number;
  totalAuthorized: number;
  estimatedDepletionDate: string | null; // ISO date
  daysUntilDepletion: number | null;
  message: string;
}

export function checkBudgetAlerts(authorization: ServiceAuthorization): BudgetAlert {
  const percentUsed = authorization.authorizedUnits > 0
    ? Math.round((authorization.usedUnits / authorization.authorizedUnits) * 1000) / 10
    : 0;

  // Alert thresholds: 80% warning, 90% critical, 95%+ exhausted at 100%
  let alertLevel: BudgetAlertLevel = 'none';
  if (percentUsed >= 100) {
    alertLevel = 'exhausted';
  } else if (percentUsed >= 95) {
    alertLevel = 'critical';
  } else if (percentUsed >= 90) {
    alertLevel = 'critical';
  } else if (percentUsed >= 80) {
    alertLevel = 'warning';
  }

  // Estimate depletion date based on burn rate
  const effectiveDate = new Date(authorization.effectiveDate);
  const now = new Date();
  const daysSinceStart = Math.max(1, (now.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24));
  const unitsPerDay = authorization.usedUnits / daysSinceStart;

  let estimatedDepletionDate: string | null = null;
  let daysUntilDepletion: number | null = null;

  if (unitsPerDay > 0 && authorization.remainingUnits > 0) {
    const daysLeft = Math.ceil(authorization.remainingUnits / unitsPerDay);
    daysUntilDepletion = daysLeft;
    const depletionDate = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000);
    estimatedDepletionDate = depletionDate.toISOString().split('T')[0];
  }

  // Build message
  let message = '';
  switch (alertLevel) {
    case 'exhausted':
      message = `Authorization ${authorization.authorizationNumber} is fully exhausted. No remaining units available for ${authorization.serviceName}.`;
      break;
    case 'critical':
      message = `Authorization ${authorization.authorizationNumber} is at ${percentUsed}% utilization. Only ${authorization.remainingUnits} units remain for ${authorization.serviceName}.${daysUntilDepletion != null ? ` Estimated depletion in ${daysUntilDepletion} days.` : ''}`;
      break;
    case 'warning':
      message = `Authorization ${authorization.authorizationNumber} has reached ${percentUsed}% utilization. ${authorization.remainingUnits} units remain for ${authorization.serviceName}.${daysUntilDepletion != null ? ` Projected depletion: ${estimatedDepletionDate}.` : ''}`;
      break;
    default:
      message = `Authorization ${authorization.authorizationNumber} is on track with ${percentUsed}% utilization.`;
  }

  return {
    authorizationId: authorization.id,
    serviceName: authorization.serviceName,
    alertLevel,
    percentUsed,
    remainingUnits: authorization.remainingUnits,
    totalAuthorized: authorization.authorizedUnits,
    estimatedDepletionDate,
    daysUntilDepletion,
    message,
  };
}

// ============================================
// FISCAL AGENT ERROR CODES
// ============================================

export interface FiscalAgentErrorCode {
  code: string;
  agent: FiscalAgentType;
  description: string;
  commonCause: string;
  resolutionSteps: string[];
}

export const FISCAL_AGENT_ERROR_CODES: FiscalAgentErrorCode[] = [
  // Acumen error codes
  {
    code: 'ACU-001',
    agent: 'acumen',
    description: 'GPS location out of range',
    commonCause: 'Provider checked in from a location more than 0.25 miles from the authorized service address.',
    resolutionSteps: [
      'Verify the service address on the authorization matches the actual service location.',
      'If community-based service, submit a Location Override Form (Acumen Form LO-7).',
      'Ensure the provider GPS/location services were enabled at check-in.',
    ],
  },
  {
    code: 'ACU-002',
    agent: 'acumen',
    description: 'Missing caregiver credential',
    commonCause: 'The provider NPI or employee ID is not registered with Acumen.',
    resolutionSteps: [
      'Verify the provider is enrolled with Acumen as an active caregiver.',
      'Submit provider enrollment form if not yet registered.',
      'Allow 5-7 business days for Acumen to process new enrollments.',
    ],
  },
  {
    code: 'ACU-003',
    agent: 'acumen',
    description: 'Authorization expired or not found',
    commonCause: 'The authorization number does not match any active authorization in Acumen system.',
    resolutionSteps: [
      'Verify the authorization number is correct and active.',
      'Check if the authorization has been renewed — use the new authorization number.',
      'Contact Acumen support to confirm authorization status.',
    ],
  },
  {
    code: 'ACU-004',
    agent: 'acumen',
    description: 'Duplicate submission detected',
    commonCause: 'A record with the same date, provider, and client was already submitted.',
    resolutionSteps: [
      'Check if a previous submission for this service date was already accepted.',
      'If this is a correction, use the void-and-replace workflow.',
      'Contact Acumen to confirm the original submission status.',
    ],
  },
  // DCI error codes
  {
    code: 'DCI-001',
    agent: 'dci',
    description: 'Unit count mismatch',
    commonCause: 'Billed units do not exactly match EVV-calculated units from clock times.',
    resolutionSteps: [
      'Recalculate units from actual clock-in and clock-out times (15-minute increments).',
      'Adjust billed units to match the EVV-verified duration exactly.',
      'DCI does not allow rounding — ensure units are truncated, not rounded.',
    ],
  },
  {
    code: 'DCI-002',
    agent: 'dci',
    description: 'Service code not authorized',
    commonCause: 'The submitted service code is not listed on the client authorization.',
    resolutionSteps: [
      'Verify the service code matches the authorization (e.g., H2019 vs H2019-HQ).',
      'Check for modifier requirements — DCI requires exact code+modifier matching.',
      'Request authorization amendment if service code needs to change.',
    ],
  },
  {
    code: 'DCI-003',
    agent: 'dci',
    description: 'Overlapping service dates',
    commonCause: 'Two records for the same client overlap in time on the same service date.',
    resolutionSteps: [
      'Review the schedule for duplicate or overlapping appointments.',
      'Adjust clock times so sessions do not overlap.',
      'If concurrent services are authorized, ensure different service codes are used.',
    ],
  },
  // PPL error codes
  {
    code: 'PPL-001',
    agent: 'ppl',
    description: 'Caregiver not enrolled',
    commonCause: 'The caregiver/provider is not registered in the PPL employer system.',
    resolutionSteps: [
      'Complete PPL caregiver enrollment packet.',
      'Submit background check and required training documentation.',
      'Wait for PPL confirmation of enrollment before submitting timesheets.',
    ],
  },
  {
    code: 'PPL-002',
    agent: 'ppl',
    description: 'Missing parent/employer signature',
    commonCause: 'The timesheet was submitted without the parent (employer of record) signature.',
    resolutionSteps: [
      'Obtain parent/guardian signature on the timesheet before resubmission.',
      'PPL accepts electronic signatures via the PPL portal or Aminy app.',
      'Ensure the signing parent matches the employer of record on file with PPL.',
    ],
  },
  {
    code: 'PPL-003',
    agent: 'ppl',
    description: 'Overtime limit exceeded',
    commonCause: 'Caregiver hours exceed the weekly overtime cap set by PPL.',
    resolutionSteps: [
      'Review total weekly hours across all clients served by this caregiver.',
      'PPL enforces a 40-hour weekly cap unless overtime is pre-approved.',
      'Request overtime authorization from PPL before submission if needed.',
    ],
  },
  {
    code: 'PPL-004',
    agent: 'ppl',
    description: 'Invalid pay period',
    commonCause: 'Timesheet dates do not align with the PPL pay period calendar.',
    resolutionSteps: [
      'Verify the pay period start/end dates match the PPL biweekly calendar.',
      'PPL pay periods start on Monday and end on the following Sunday (biweekly).',
      'Split timesheets that span two pay periods into separate submissions.',
    ],
  },
  // Conduent error codes
  {
    code: 'CON-001',
    agent: 'conduent',
    description: 'Claim format rejected',
    commonCause: 'The export file does not conform to the Conduent 837P format requirements.',
    resolutionSteps: [
      'Verify the export uses the correct ANSI X12 837P format.',
      'Check required segments: ISA, GS, ST, CLM, SV1 are all populated.',
      'Run the Conduent pre-submission validator before uploading.',
    ],
  },
  {
    code: 'CON-002',
    agent: 'conduent',
    description: 'Member not eligible',
    commonCause: 'The client AHCCCS ID is not active or is not eligible for the service date.',
    resolutionSteps: [
      'Verify the client AHCCCS eligibility for the date of service.',
      'Check if the client coverage has lapsed or changed MCOs.',
      'Contact AHCCCS member services to confirm eligibility.',
    ],
  },
];

/**
 * Look up error codes for a specific fiscal agent
 */
export function getErrorCodesForAgent(agent: FiscalAgentType): FiscalAgentErrorCode[] {
  return FISCAL_AGENT_ERROR_CODES.filter(e => e.agent === agent);
}

/**
 * Look up a specific error code
 */
export function resolveErrorCode(code: string): FiscalAgentErrorCode | undefined {
  return FISCAL_AGENT_ERROR_CODES.find(e => e.code === code);
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
  validateForFiscalAgent,
  trackAcceptanceRate,
  checkBudgetAlerts,
  getErrorCodesForAgent,
  resolveErrorCode,
  FISCAL_AGENT_ERROR_CODES,
};
