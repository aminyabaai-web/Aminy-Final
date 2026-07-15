// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { supabase } from '../utils/supabase/client';

function normalizeQueryableChildId(childId?: string): string | undefined {
  if (!childId) return undefined;

  const normalized = childId.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : undefined;
}

function getStoredSupabaseAccessToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const authKey = Object.keys(window.localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
  if (!authKey) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(authKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token || null;
  } catch {
    return null;
  }
}

export type EVVCutoverState = 'shadow' | 'parallel_run' | 'cutover_ready' | 'primary';
export type EVVDiscrepancyCategory =
  | 'time_mismatch'
  | 'location_mismatch'
  | 'service_code_mismatch'
  | 'missing_authorization'
  | 'export_format_issue';

export interface EVVShift {
  id: string;
  recordId: string;
  childId: string;
  providerId: string;
  serviceDate: string;
  state: EVVCutoverState;
  authorizationLinked: boolean;
}

export interface EVVExportBatch {
  id: string;
  system: 'spokchoice' | 'dci';
  periodStart: string;
  periodEnd: string;
  exportedAt: string;
  shiftCount: number;
  status: 'draft' | 'exported' | 'reconciled' | 'failed';
}

export interface EVVDiscrepancy {
  id: string;
  runId: string;
  category: EVVDiscrepancyCategory;
  severity: 'critical' | 'warning';
  shiftId?: string;
  details: string;
}

export interface EVVReconciliationRun {
  id: string;
  label: string;
  systemOfRecord: 'spokchoice' | 'dci';
  exportedAt: string;
  payrollDate: string;
  recordsCompared: number;
  accuracy: number;
  criticalExceptions: number;
  discrepancies: EVVDiscrepancy[];
  exportBatchIds: string[];
}

export interface EVVReconciliationCycle {
  id: string;
  label: string;
  systemOfRecord: 'spokchoice' | 'dci';
  exportedAt: string;
  payrollDate: string;
  recordsCompared: number;
  discrepancies: Partial<Record<EVVDiscrepancyCategory, number>>;
  accuracy: number;
  criticalExceptions: number;
}

export interface EVVCutoverSummary {
  state: EVVCutoverState;
  cyclesCompleted: number;
  cleanCycles: number;
  consecutiveCleanCycles: number;
  averageAccuracy: number;
  trailingWindowAccuracy: number;
  unresolvedCriticalExceptions: number;
  systemsValidated: Array<'spokchoice' | 'dci'>;
  discrepancyTotals: Record<EVVDiscrepancyCategory, number>;
  cutoverBlockedReasons: string[];
}

const DISCREPANCY_CATEGORIES: EVVDiscrepancyCategory[] = [
  'time_mismatch',
  'location_mismatch',
  'service_code_mismatch',
  'missing_authorization',
  'export_format_issue',
];

export function buildEVVReconciliationCycle(run: EVVReconciliationRun): EVVReconciliationCycle {
  const discrepancies = run.discrepancies.reduce<Partial<Record<EVVDiscrepancyCategory, number>>>(
    (totals, discrepancy) => {
      totals[discrepancy.category] = (totals[discrepancy.category] || 0) + 1;
      return totals;
    },
    {},
  );

  return {
    id: run.id,
    label: run.label,
    systemOfRecord: run.systemOfRecord,
    exportedAt: run.exportedAt,
    payrollDate: run.payrollDate,
    recordsCompared: run.recordsCompared,
    discrepancies,
    accuracy: run.accuracy,
    criticalExceptions: run.criticalExceptions,
  };
}

export function summarizeEVVCutover(
  cycles: EVVReconciliationCycle[],
): EVVCutoverSummary {
  const sortedCycles = [...cycles].sort((a, b) => {
    const aTime = new Date(a.payrollDate || a.exportedAt).getTime();
    const bTime = new Date(b.payrollDate || b.exportedAt).getTime();
    return bTime - aTime;
  });
  const recentCycles = sortedCycles.slice(0, 3);
  const isCleanCycle = (cycle: EVVReconciliationCycle) => cycle.accuracy >= 99.5 && cycle.criticalExceptions === 0;
  const discrepancyTotals = DISCREPANCY_CATEGORIES.reduce<Record<EVVDiscrepancyCategory, number>>(
    (totals, category) => {
      totals[category] = cycles.reduce(
        (sum, cycle) => sum + (cycle.discrepancies[category] || 0),
        0,
      );
      return totals;
    },
    {
      time_mismatch: 0,
      location_mismatch: 0,
      service_code_mismatch: 0,
      missing_authorization: 0,
      export_format_issue: 0,
    },
  );

  const cyclesCompleted = cycles.length;
  const cleanCycles = cycles.filter(isCleanCycle).length;
  let consecutiveCleanCycles = 0;
  for (const cycle of recentCycles) {
    if (!isCleanCycle(cycle)) break;
    consecutiveCleanCycles += 1;
  }
  const averageAccuracy =
    cyclesCompleted === 0
      ? 0
      : Math.round(
          (cycles.reduce((sum, cycle) => sum + cycle.accuracy, 0) / cyclesCompleted) * 10,
        ) / 10;
  const trailingWindowAccuracy =
    recentCycles.length === 0
      ? 0
      : Math.round(
          (recentCycles.reduce((sum, cycle) => sum + cycle.accuracy, 0) / recentCycles.length) * 10,
        ) / 10;
  const unresolvedCriticalExceptions = recentCycles.reduce(
    (sum, cycle) => sum + cycle.criticalExceptions,
    0,
  );
  const systemsValidated = Array.from(new Set(recentCycles.map((cycle) => cycle.systemOfRecord))) as Array<'spokchoice' | 'dci'>;

  const cutoverBlockedReasons: string[] = [];
  if (cyclesCompleted < 3) {
    cutoverBlockedReasons.push('Three payroll cycles have not been compared against your current system yet.');
  }
  if (recentCycles.length >= 3 && consecutiveCleanCycles < 3) {
    cutoverBlockedReasons.push('The three most recent payroll cycles do not all match your current system at 99.5% accuracy.');
  }
  if (recentCycles.length > 0 && trailingWindowAccuracy < 99.5) {
    cutoverBlockedReasons.push('Recent payroll cycles are averaging below the 99.5% match rate needed to switch.');
  }
  if (unresolvedCriticalExceptions > 0) {
    cutoverBlockedReasons.push('Critical visit-record issues must be resolved before Aminy can replace your current system.');
  }
  if (recentCycles.length >= 3 && !systemsValidated.includes('dci')) {
    cutoverBlockedReasons.push('At least one recent clean payroll cycle must be checked through DCI before switching.');
  }

  const state: EVVCutoverState = cutoverBlockedReasons.length === 0
    ? 'cutover_ready'
    : cyclesCompleted === 0
      ? 'shadow'
      : 'parallel_run';

  return {
    state,
    cyclesCompleted,
    cleanCycles,
    consecutiveCleanCycles,
    averageAccuracy,
    trailingWindowAccuracy,
    unresolvedCriticalExceptions,
    systemsValidated,
    discrepancyTotals,
    cutoverBlockedReasons,
  };
}

export function summarizeEVVCutoverRuns(runs: EVVReconciliationRun[]): EVVCutoverSummary {
  return summarizeEVVCutover(runs.map(buildEVVReconciliationCycle));
}

export function getSampleEVVCycles(): EVVReconciliationCycle[] {
  return [
    {
      id: 'cycle-1',
      label: 'Feb 1-15 Payroll',
      systemOfRecord: 'spokchoice',
      exportedAt: '2026-02-16T18:00:00Z',
      payrollDate: '2026-02-18',
      recordsCompared: 132,
      discrepancies: {
        time_mismatch: 1,
        location_mismatch: 1,
        service_code_mismatch: 0,
        missing_authorization: 0,
        export_format_issue: 0,
      },
      accuracy: 99.2,
      criticalExceptions: 1,
    },
    {
      id: 'cycle-2',
      label: 'Feb 16-29 Payroll',
      systemOfRecord: 'spokchoice',
      exportedAt: '2026-03-01T18:00:00Z',
      payrollDate: '2026-03-03',
      recordsCompared: 141,
      discrepancies: {
        time_mismatch: 0,
        location_mismatch: 1,
        service_code_mismatch: 0,
        missing_authorization: 0,
        export_format_issue: 0,
      },
      accuracy: 99.6,
      criticalExceptions: 0,
    },
    {
      id: 'cycle-3',
      label: 'Mar 1-15 Payroll',
      systemOfRecord: 'dci',
      exportedAt: '2026-03-16T18:00:00Z',
      payrollDate: '2026-03-18',
      recordsCompared: 148,
      discrepancies: {
        time_mismatch: 0,
        location_mismatch: 0,
        service_code_mismatch: 0,
        missing_authorization: 0,
        export_format_issue: 1,
      },
      accuracy: 99.7,
      criticalExceptions: 0,
    },
  ];
}

export function getSampleEVVReconciliationRuns(): EVVReconciliationRun[] {
  return getSampleEVVCycles().map((cycle, index) => ({
    id: cycle.id,
    label: cycle.label,
    systemOfRecord: cycle.systemOfRecord,
    exportedAt: cycle.exportedAt,
    payrollDate: cycle.payrollDate,
    recordsCompared: cycle.recordsCompared,
    accuracy: cycle.accuracy,
    criticalExceptions: cycle.criticalExceptions,
    exportBatchIds: [`batch-${index + 1}`],
    discrepancies: Object.entries(cycle.discrepancies).flatMap(([category, count]) =>
      Array.from({ length: count || 0 }, (_, discrepancyIndex) => ({
        id: `${cycle.id}-${category}-${discrepancyIndex + 1}`,
        runId: cycle.id,
        category: category as EVVDiscrepancyCategory,
        severity: category === 'missing_authorization' ? 'critical' : 'warning',
        details: `${category.replace(/_/g, ' ')} needs reconciliation before cutover.`,
      })),
    ),
  }));
}

function mapRunRow(row: Record<string, unknown>, discrepancies: EVVDiscrepancy[]): EVVReconciliationRun {
  return {
    id: String(row.id),
    label: String(row.label || ''),
    systemOfRecord: String(row.system_of_record || 'spokchoice') as 'spokchoice' | 'dci',
    exportedAt: String(row.exported_at || row.created_at || new Date().toISOString()),
    payrollDate: String(row.payroll_date || ''),
    recordsCompared: Number(row.records_compared || 0),
    accuracy: Number(row.accuracy || 0),
    criticalExceptions: Number(row.critical_exceptions || 0),
    discrepancies,
    exportBatchIds: Array.isArray(row.export_batch_ids) ? (row.export_batch_ids as string[]) : [],
  };
}

async function fetchEVVReconciliationRunsViaRest(childId?: string): Promise<EVVReconciliationRun[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  const accessToken = getStoredSupabaseAccessToken();
  const authHeaders = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
    Accept: 'application/json',
  };

  const queryableChildId = normalizeQueryableChildId(childId);
  const runParams = new URLSearchParams({ select: '*', order: 'exported_at.desc', limit: '12' });
  if (queryableChildId) {
    runParams.set('child_id', `eq.${queryableChildId}`);
  }

  const runResponse = await fetch(`${supabaseUrl}/rest/v1/evv_reconciliation_runs?${runParams.toString()}`, {
    headers: authHeaders,
  });

  if (!runResponse.ok) {
    throw new Error(`EVV runs REST fallback failed: ${runResponse.status} ${await runResponse.text()}`);
  }

  const runRows = await runResponse.json() as Record<string, unknown>[];
  if (runRows.length === 0) {
    return [];
  }

  const runIds = runRows.map((row) => String(row.id)).filter(Boolean);
  const discrepancyMap = new Map<string, EVVDiscrepancy[]>();

  if (runIds.length > 0) {
    const discrepancyParams = new URLSearchParams({
      select: '*',
      run_id: `in.(${runIds.map((id) => `"${id}"`).join(',')})`,
      limit: '100',
    });

    const discrepancyResponse = await fetch(`${supabaseUrl}/rest/v1/evv_discrepancies?${discrepancyParams.toString()}`, {
      headers: authHeaders,
    });

    if (!discrepancyResponse.ok) {
      throw new Error(`EVV discrepancies REST fallback failed: ${discrepancyResponse.status} ${await discrepancyResponse.text()}`);
    }

    const discrepancyRows = await discrepancyResponse.json() as Record<string, unknown>[];
    for (const discrepancy of discrepancyRows) {
      const runId = String(discrepancy.run_id || '');
      if (!runId) continue;
      const entries = discrepancyMap.get(runId) || [];
      entries.push({
        id: String(discrepancy.id),
        runId,
        category: String(discrepancy.category) as EVVDiscrepancyCategory,
        severity: String(discrepancy.severity || 'warning') as 'critical' | 'warning',
        shiftId: discrepancy.shift_id ? String(discrepancy.shift_id) : undefined,
        details: String(discrepancy.details || ''),
      });
      discrepancyMap.set(runId, entries);
    }
  }

  return runRows.map((row) => mapRunRow(row, discrepancyMap.get(String(row.id)) || []));
}

// ============================================
// CUTOVER CONFIDENCE SCORING
// ============================================

export interface CutoverConfidenceResult {
  confidenceScore: number; // 0-100
  recommendation: 'proceed' | 'delay' | 'not_ready';
  factors: {
    factor: string;
    score: number; // 0-100
    weight: number;
    details: string;
  }[];
  shadowCycleSummary: {
    totalCycles: number;
    cleanCycles: number;
    averageAccuracy: number;
    consecutiveClean: number;
  };
  riskAssessment: string;
}

/**
 * Calculate a confidence score (0-100) for proceeding with EVV cutover,
 * based on shadow mode reconciliation results.
 */
export function calculateCutoverConfidence(
  shadowResults: EVVReconciliationCycle[],
  targetCleanRate: number = 99.5
): CutoverConfidenceResult {
  const factors: CutoverConfidenceResult['factors'] = [];

  // Factor 1: Number of completed cycles (weight 20%)
  const cycleCountScore = Math.min(100, (shadowResults.length / 3) * 100);
  factors.push({
    factor: 'Completed Reconciliation Cycles',
    score: Math.round(cycleCountScore),
    weight: 0.2,
    details: `${shadowResults.length} of 3 minimum cycles completed`,
  });

  // Factor 2: Average accuracy across all cycles (weight 30%)
  const avgAccuracy = shadowResults.length > 0
    ? shadowResults.reduce((sum, c) => sum + c.accuracy, 0) / shadowResults.length
    : 0;
  const accuracyScore = Math.min(100, (avgAccuracy / targetCleanRate) * 100);
  factors.push({
    factor: 'Average Accuracy',
    score: Math.round(accuracyScore),
    weight: 0.3,
    details: `${avgAccuracy.toFixed(1)}% average vs ${targetCleanRate}% target`,
  });

  // Factor 3: Consecutive clean cycles (weight 25%)
  const sorted = [...shadowResults].sort((a, b) =>
    new Date(b.payrollDate || b.exportedAt).getTime() - new Date(a.payrollDate || a.exportedAt).getTime()
  );
  let consecutiveClean = 0;
  for (const cycle of sorted) {
    if (cycle.accuracy >= targetCleanRate && cycle.criticalExceptions === 0) {
      consecutiveClean++;
    } else {
      break;
    }
  }
  const consecutiveScore = Math.min(100, (consecutiveClean / 3) * 100);
  factors.push({
    factor: 'Consecutive Clean Cycles',
    score: Math.round(consecutiveScore),
    weight: 0.25,
    details: `${consecutiveClean} consecutive clean cycles (3 required)`,
  });

  // Factor 4: No unresolved critical exceptions (weight 25%)
  const recentCriticals = sorted.slice(0, 3).reduce((sum, c) => sum + c.criticalExceptions, 0);
  const criticalScore = recentCriticals === 0 ? 100 : Math.max(0, 100 - recentCriticals * 33);
  factors.push({
    factor: 'Critical Exceptions Resolved',
    score: Math.round(criticalScore),
    weight: 0.25,
    details: recentCriticals === 0
      ? 'No unresolved critical exceptions in recent cycles'
      : `${recentCriticals} unresolved critical exceptions in recent cycles`,
  });

  // Weighted confidence score
  const confidenceScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  // Recommendation
  const recommendation: CutoverConfidenceResult['recommendation'] =
    confidenceScore >= 90 ? 'proceed'
    : confidenceScore >= 70 ? 'delay'
    : 'not_ready';

  // Risk assessment
  const riskAssessment =
    recommendation === 'proceed'
      ? 'Shadow mode results meet all cutover criteria. Proceeding to primary is low risk.'
      : recommendation === 'delay'
        ? 'Some criteria are not yet met. Continue shadow mode for additional cycles to build confidence.'
        : 'Significant gaps remain. Address critical exceptions and improve accuracy before considering cutover.';

  const cleanCycles = shadowResults.filter(
    c => c.accuracy >= targetCleanRate && c.criticalExceptions === 0
  ).length;

  return {
    confidenceScore,
    recommendation,
    factors,
    shadowCycleSummary: {
      totalCycles: shadowResults.length,
      cleanCycles,
      averageAccuracy: Math.round(avgAccuracy * 10) / 10,
      consecutiveClean,
    },
    riskAssessment,
  };
}

// ============================================
// SHADOW vs PRIMARY COMPARISON
// ============================================

export interface ShadowPrimaryDiscrepancy {
  shiftId: string;
  field: string;
  shadowValue: string;
  primaryValue: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

export interface ShadowPrimaryComparison {
  totalCompared: number;
  matchedPerfectly: number;
  withDiscrepancies: number;
  matchRate: number; // 0-100
  discrepancies: ShadowPrimaryDiscrepancy[];
  discrepancySummary: Record<string, number>; // field -> count
  recommendation: string;
}

/**
 * Compare shadow EVV records against primary system records to identify
 * discrepancies that need resolution before cutover.
 */
export function compareShadowToPrimary(
  shadowRecords: EVVShift[],
  primaryRecords: EVVShift[]
): ShadowPrimaryComparison {
  const discrepancies: ShadowPrimaryDiscrepancy[] = [];

  // Index primary records by recordId for fast lookup
  const primaryMap = new Map<string, EVVShift>();
  for (const pr of primaryRecords) {
    primaryMap.set(pr.recordId, pr);
  }

  let matchedPerfectly = 0;

  for (const shadow of shadowRecords) {
    const primary = primaryMap.get(shadow.recordId);

    if (!primary) {
      discrepancies.push({
        shiftId: shadow.id,
        field: 'existence',
        shadowValue: 'present',
        primaryValue: 'missing',
        severity: 'critical',
        description: `Record ${shadow.recordId} exists in shadow but not in primary system`,
      });
      continue;
    }

    let hasDiscrepancy = false;

    // Compare service date
    if (shadow.serviceDate !== primary.serviceDate) {
      hasDiscrepancy = true;
      discrepancies.push({
        shiftId: shadow.id,
        field: 'serviceDate',
        shadowValue: shadow.serviceDate,
        primaryValue: primary.serviceDate,
        severity: 'critical',
        description: `Service date mismatch: shadow=${shadow.serviceDate}, primary=${primary.serviceDate}`,
      });
    }

    // Compare child linkage
    if (shadow.childId !== primary.childId) {
      hasDiscrepancy = true;
      discrepancies.push({
        shiftId: shadow.id,
        field: 'childId',
        shadowValue: shadow.childId,
        primaryValue: primary.childId,
        severity: 'critical',
        description: `Client/child ID mismatch between shadow and primary`,
      });
    }

    // Compare provider linkage
    if (shadow.providerId !== primary.providerId) {
      hasDiscrepancy = true;
      discrepancies.push({
        shiftId: shadow.id,
        field: 'providerId',
        shadowValue: shadow.providerId,
        primaryValue: primary.providerId,
        severity: 'warning',
        description: `Provider ID mismatch between shadow and primary`,
      });
    }

    // Compare authorization linkage
    if (shadow.authorizationLinked !== primary.authorizationLinked) {
      hasDiscrepancy = true;
      discrepancies.push({
        shiftId: shadow.id,
        field: 'authorizationLinked',
        shadowValue: String(shadow.authorizationLinked),
        primaryValue: String(primary.authorizationLinked),
        severity: shadow.authorizationLinked && !primary.authorizationLinked ? 'warning' : 'critical',
        description: `Authorization linkage differs: shadow=${shadow.authorizationLinked}, primary=${primary.authorizationLinked}`,
      });
    }

    if (!hasDiscrepancy) {
      matchedPerfectly++;
    }
  }

  // Check for records in primary but not in shadow
  for (const primary of primaryRecords) {
    const hasShadow = shadowRecords.some(s => s.recordId === primary.recordId);
    if (!hasShadow) {
      discrepancies.push({
        shiftId: primary.id,
        field: 'existence',
        shadowValue: 'missing',
        primaryValue: 'present',
        severity: 'warning',
        description: `Record ${primary.recordId} exists in primary but not captured in shadow`,
      });
    }
  }

  const totalCompared = shadowRecords.length;
  const withDiscrepancies = totalCompared - matchedPerfectly;
  const matchRate = totalCompared > 0 ? Math.round((matchedPerfectly / totalCompared) * 1000) / 10 : 0;

  // Discrepancy summary by field
  const discrepancySummary: Record<string, number> = {};
  for (const d of discrepancies) {
    discrepancySummary[d.field] = (discrepancySummary[d.field] || 0) + 1;
  }

  const criticalCount = discrepancies.filter(d => d.severity === 'critical').length;
  const recommendation =
    criticalCount === 0 && matchRate >= 99.5
      ? 'Shadow and primary systems are aligned. Safe to proceed with cutover.'
      : criticalCount === 0 && matchRate >= 95
        ? 'Minor discrepancies exist but no critical issues. Review warnings before cutover.'
        : `${criticalCount} critical discrepancies found. Resolve all critical issues before cutover.`;

  return {
    totalCompared,
    matchedPerfectly,
    withDiscrepancies,
    matchRate,
    discrepancies,
    discrepancySummary,
    recommendation,
  };
}

export async function listEVVReconciliationRuns(childId?: string): Promise<EVVReconciliationRun[]> {
  const queryableChildId = normalizeQueryableChildId(childId);

  try {
    const restRuns = await fetchEVVReconciliationRunsViaRest(queryableChildId);
    return restRuns;
  } catch (restError) {
    try {
      let query = supabase
        .from('evv_reconciliation_runs')
        .select('*, evv_discrepancies(*)')
        .order('exported_at', { ascending: false })
        .limit(12);

      if (queryableChildId) {
        query = query.eq('child_id', queryableChildId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row) => mapRunRow(
        row as Record<string, unknown>,
        Array.isArray((row as { evv_discrepancies?: unknown[] }).evv_discrepancies)
          ? ((row as { evv_discrepancies: Record<string, unknown>[] }).evv_discrepancies).map((discrepancy) => ({
              id: String(discrepancy.id),
              runId: String(discrepancy.run_id || row.id),
              category: String(discrepancy.category) as EVVDiscrepancyCategory,
              severity: String(discrepancy.severity || 'warning') as 'critical' | 'warning',
              shiftId: discrepancy.shift_id ? String(discrepancy.shift_id) : undefined,
              details: String(discrepancy.details || ''),
            }))
          : [],
      ));
    } catch (error) {
      console.warn('[EVV] Falling back to sample reconciliation runs:', restError, error);
      return getSampleEVVReconciliationRuns();
    }
  }
}
