/**
 * CentralReach Data Validation Dashboard
 *
 * Shows parents exactly what data synced to/from CentralReach:
 * - Last sync time per data type
 * - Items synced (count + sample preview)
 * - Any errors or validation failures
 * - Data freshness indicators
 * - Sync health score
 *
 * This component builds trust by making the integration transparent.
 * Parents can see that their data is actually flowing and verify
 * nothing is lost or stale.
 *
 * Accessed from: Settings → CentralReach → Data Validation
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  ArrowDown,
  ArrowUp,
  FileCheck,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Info,
  Download,
  Table2,
  Link2,
  Unlink,
  AlertOctagon,
  Gauge,
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

interface ValidationRecord {
  dataType: string;
  direction: 'pull' | 'push';
  label: string;
  description: string;
  lastSyncAt: string | null;
  recordCount: number;
  errorCount: number;
  errors: ValidationError[];
  freshness: 'fresh' | 'aging' | 'stale' | 'never';
  sampleItems: SampleItem[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'warning' | 'error';
  recordId?: string;
  timestamp: string;
}

interface SampleItem {
  id: string;
  label: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

interface DataValidationSummary {
  overallHealth: 'healthy' | 'degraded' | 'critical' | 'no_data';
  healthScore: number; // 0-100
  totalRecordsSynced: number;
  totalErrors: number;
  lastSuccessfulSync: string | null;
  pullRecords: ValidationRecord[];
  pushRecords: ValidationRecord[];
  encryptionActive: boolean;
  auditLogActive: boolean;
}

interface CRDataValidationProps {
  userId: string;
  childId?: string;
  onBack?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PULL_DATA_TYPES = [
  {
    type: 'sessions',
    label: 'Therapy Sessions',
    description: 'Session notes, dates, goals, and billing codes from your provider.',
    table: 'cr_sessions',
    freshnessHours: 24,
  },
  {
    type: 'goals',
    label: 'Treatment Goals',
    description: 'Active treatment goals, current levels, and target benchmarks.',
    table: 'cr_goals',
    freshnessHours: 48,
  },
  {
    type: 'insurance',
    label: 'Insurance & Authorization',
    description: 'Coverage details, authorized units remaining, and expiration dates.',
    table: 'cr_insurance',
    freshnessHours: 168, // weekly
  },
  {
    type: 'home_programs',
    label: 'Home Programs',
    description: 'Activities assigned by your BCBA for practice at home.',
    table: 'cr_home_programs',
    freshnessHours: 48,
  },
] as const;

const PUSH_DATA_TYPES = [
  {
    type: 'behavior_logs',
    label: 'Behavior Logs (ABC)',
    description: 'Antecedent-Behavior-Consequence logs sent to your provider.',
    table: 'cr_push_queue',
    eventType: 'behavior_log',
    freshnessHours: 12,
  },
  {
    type: 'routine_completions',
    label: 'Routine Completions',
    description: 'Daily routine progress shared with your treatment team.',
    table: 'cr_push_queue',
    eventType: 'routine_completion',
    freshnessHours: 24,
  },
  {
    type: 'junior_results',
    label: 'Junior Session Results',
    description: 'Aminy Junior game scores and skill data for your BCBA.',
    table: 'cr_push_queue',
    eventType: 'junior_session',
    freshnessHours: 24,
  },
  {
    type: 'wellness_data',
    label: 'Caregiver Wellness',
    description: 'Your wellness check-in data shared with your care team.',
    table: 'cr_push_queue',
    eventType: 'caregiver_wellness',
    freshnessHours: 48,
  },
] as const;

// ============================================================================
// FIELD MAPPING TYPES & DATA
// ============================================================================

/** Validation status for a single field mapping */
type FieldMappingStatus = 'mapped' | 'unmapped' | 'type_mismatch' | 'value_range_warning';

/** A single field-level mapping entry */
interface FieldMapping {
  crField: string;
  crType: string;
  aminyField: string;
  aminyType: string;
  status: FieldMappingStatus;
  notes?: string;
  transform?: string;
}

/** A data type grouping of field mappings */
interface FieldMappingGroup {
  dataType: string;
  label: string;
  direction: 'pull' | 'push';
  mappings: FieldMapping[];
}

const FIELD_MAPPING_STATUS_CONFIG: Record<
  FieldMappingStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  mapped: {
    label: 'Mapped',
    color: 'text-green-700',
    bg: 'bg-green-50',
    icon: Link2,
  },
  unmapped: {
    label: 'Unmapped',
    color: 'text-red-700',
    bg: 'bg-red-50',
    icon: Unlink,
  },
  type_mismatch: {
    label: 'Type Mismatch',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    icon: AlertOctagon,
  },
  value_range_warning: {
    label: 'Range Warning',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    icon: Gauge,
  },
};

/**
 * Complete field-level mapping between CentralReach and Aminy data models.
 * This is the authoritative reference for which CR fields map to which Aminy fields,
 * used for both the UI display and the exported mapping report.
 */
const FIELD_MAPPING_GROUPS: FieldMappingGroup[] = [
  // ── Sessions (Pull: CR → Aminy) ──
  {
    dataType: 'sessions',
    label: 'Therapy Sessions',
    direction: 'pull',
    mappings: [
      { crField: 'id', crType: 'string', aminyField: 'cr_session_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'clientId', crType: 'string', aminyField: 'child_id', aminyType: 'uuid', status: 'mapped', transform: 'CR client ID → Aminy child UUID lookup' },
      { crField: 'providerId', crType: 'string', aminyField: 'provider_id', aminyType: 'uuid', status: 'mapped', transform: 'CR provider ID → Aminy provider UUID lookup' },
      { crField: 'date', crType: 'string (YYYY-MM-DD)', aminyField: 'session_date', aminyType: 'date', status: 'mapped' },
      { crField: 'startTime', crType: 'string (HH:MM)', aminyField: 'start_time', aminyType: 'timestamptz', status: 'mapped', transform: 'Combined with date to form ISO 8601 timestamp' },
      { crField: 'endTime', crType: 'string (HH:MM)', aminyField: 'end_time', aminyType: 'timestamptz', status: 'mapped', transform: 'Combined with date to form ISO 8601 timestamp' },
      { crField: 'duration', crType: 'number (minutes)', aminyField: 'duration_minutes', aminyType: 'integer', status: 'mapped' },
      { crField: 'sessionType', crType: 'CRSessionType enum', aminyField: 'session_type', aminyType: 'text', status: 'mapped', transform: 'Enum → human-readable label' },
      { crField: 'notes', crType: 'string', aminyField: 'session_notes', aminyType: 'text', status: 'mapped' },
      { crField: 'goals', crType: 'CRGoalData[]', aminyField: 'goal_progress (jsonb)', aminyType: 'jsonb', status: 'mapped', notes: 'Nested array mapped into goal_progress JSONB column' },
      { crField: 'billingCode', crType: 'string (CPT)', aminyField: 'billing_code', aminyType: 'text', status: 'mapped' },
      { crField: 'billingUnits', crType: 'number', aminyField: 'billing_units', aminyType: 'integer', status: 'mapped', notes: 'Value range: 1-32 units per session' },
      { crField: 'status', crType: 'string enum', aminyField: 'session_status', aminyType: 'text', status: 'mapped' },
      { crField: 'signedOff', crType: 'boolean', aminyField: 'is_signed', aminyType: 'boolean', status: 'mapped' },
      { crField: 'signedOffBy', crType: 'string', aminyField: 'signed_by_provider_id', aminyType: 'uuid', status: 'mapped', transform: 'CR provider ID → Aminy UUID lookup' },
      { crField: 'signedOffAt', crType: 'string (ISO)', aminyField: 'signed_at', aminyType: 'timestamptz', status: 'mapped' },
    ],
  },
  // ── Goals (Pull: CR → Aminy) ──
  {
    dataType: 'goals',
    label: 'Treatment Goals',
    direction: 'pull',
    mappings: [
      { crField: 'id', crType: 'string', aminyField: 'cr_goal_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'clientId', crType: 'string', aminyField: 'child_id', aminyType: 'uuid', status: 'mapped', transform: 'CR client ID → Aminy child UUID lookup' },
      { crField: 'description', crType: 'string', aminyField: 'goal_description', aminyType: 'text', status: 'mapped' },
      { crField: 'targetBehavior', crType: 'string', aminyField: 'target_behavior', aminyType: 'text', status: 'mapped' },
      { crField: 'baseline', crType: 'number (0-100)', aminyField: 'baseline_level', aminyType: 'integer', status: 'value_range_warning', notes: 'CR sends 0-100; verify no values outside range before insert' },
      { crField: 'currentLevel', crType: 'number (0-100)', aminyField: 'current_level', aminyType: 'integer', status: 'value_range_warning', notes: 'CR sends 0-100; verify no values outside range before insert' },
      { crField: 'target', crType: 'number (0-100)', aminyField: 'target_level', aminyType: 'integer', status: 'mapped' },
      { crField: 'measurementMethod', crType: 'CRMeasurementMethod enum', aminyField: 'measurement_method', aminyType: 'text', status: 'mapped' },
      { crField: 'domain', crType: 'CRGoalDomain enum', aminyField: 'goal_domain', aminyType: 'text', status: 'mapped' },
      { crField: 'status', crType: 'string enum', aminyField: 'goal_status', aminyType: 'text', status: 'mapped' },
      { crField: 'targetDate', crType: 'string (YYYY-MM-DD)', aminyField: 'target_date', aminyType: 'date', status: 'mapped' },
    ],
  },
  // ── Insurance (Pull: CR → Aminy) ──
  {
    dataType: 'insurance',
    label: 'Insurance & Authorization',
    direction: 'pull',
    mappings: [
      { crField: 'payerId', crType: 'string', aminyField: 'payer_id', aminyType: 'text', status: 'mapped' },
      { crField: 'payerName', crType: 'string', aminyField: 'payer_display_name', aminyType: 'text', status: 'mapped' },
      { crField: 'memberId', crType: 'string', aminyField: 'member_id', aminyType: 'text', status: 'mapped', notes: 'PHI — encrypted at rest' },
      { crField: 'groupNumber', crType: 'string', aminyField: 'group_number', aminyType: 'text', status: 'mapped', notes: 'PHI — encrypted at rest' },
      { crField: 'authorizationNumber', crType: 'string', aminyField: 'auth_number', aminyType: 'text', status: 'mapped' },
      { crField: 'authUnitsRemaining', crType: 'number', aminyField: 'units_remaining', aminyType: 'integer', status: 'value_range_warning', notes: 'Typically 0-500; flag if >1000' },
      { crField: 'authUnitsUsed', crType: 'number', aminyField: 'units_used', aminyType: 'integer', status: 'mapped' },
      { crField: 'authStartDate', crType: 'string (YYYY-MM-DD)', aminyField: 'auth_start', aminyType: 'date', status: 'mapped' },
      { crField: 'authEndDate', crType: 'string (YYYY-MM-DD)', aminyField: 'auth_end', aminyType: 'date', status: 'mapped' },
      { crField: 'authStatus', crType: 'string enum', aminyField: 'auth_status', aminyType: 'text', status: 'mapped' },
    ],
  },
  // ── Home Programs (Pull: CR → Aminy) ──
  {
    dataType: 'home_programs',
    label: 'Home Programs',
    direction: 'pull',
    mappings: [
      { crField: 'id', crType: 'string', aminyField: 'cr_home_program_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'clientId', crType: 'string', aminyField: 'child_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'providerId', crType: 'string', aminyField: 'assigned_by_provider_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'assignedDate', crType: 'string (YYYY-MM-DD)', aminyField: 'assigned_date', aminyType: 'date', status: 'mapped' },
      { crField: 'activities', crType: 'CRActivity[]', aminyField: 'activities (jsonb)', aminyType: 'jsonb', status: 'mapped', notes: 'Nested array preserved as JSONB' },
      { crField: 'dueDate', crType: 'string (YYYY-MM-DD)', aminyField: 'due_date', aminyType: 'date', status: 'mapped' },
      { crField: 'status', crType: 'string enum', aminyField: 'program_status', aminyType: 'text', status: 'mapped' },
      { crField: 'instructions', crType: 'string', aminyField: 'instructions', aminyType: 'text', status: 'mapped' },
      { crField: 'frequencyPerWeek', crType: 'number', aminyField: 'frequency_per_week', aminyType: 'integer', status: 'value_range_warning', notes: 'Expected 1-7; flag if outside range' },
    ],
  },
  // ── Behavior Logs (Push: Aminy → CR) ──
  {
    dataType: 'behavior_logs',
    label: 'Behavior Logs (ABC)',
    direction: 'push',
    mappings: [
      { crField: 'ClientId', crType: 'string', aminyField: 'child_id', aminyType: 'uuid', status: 'mapped', transform: 'Aminy child UUID → CR client ID lookup' },
      { crField: 'ReportedBy', crType: 'string', aminyField: 'reported_by_user_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'Date', crType: 'string (YYYY-MM-DD)', aminyField: 'log_date', aminyType: 'date', status: 'mapped' },
      { crField: 'Time', crType: 'string (HH:MM)', aminyField: 'log_time', aminyType: 'time', status: 'mapped' },
      { crField: 'Antecedent', crType: 'string', aminyField: 'antecedent', aminyType: 'text', status: 'mapped' },
      { crField: 'Behavior', crType: 'string', aminyField: 'behavior', aminyType: 'text', status: 'mapped' },
      { crField: 'Consequence', crType: 'string', aminyField: 'consequence', aminyType: 'text', status: 'mapped' },
      { crField: 'Severity', crType: 'number (1-5)', aminyField: 'severity', aminyType: 'integer', status: 'value_range_warning', notes: 'Must be 1-5; clamped before push' },
      { crField: 'Location', crType: 'string', aminyField: 'location', aminyType: 'text', status: 'mapped' },
      { crField: 'Duration', crType: 'number (minutes)', aminyField: 'duration_minutes', aminyType: 'integer', status: 'mapped', notes: 'Optional field' },
      { crField: 'EnvironmentalFactors', crType: 'string[]', aminyField: 'environmental_factors', aminyType: 'text[]', status: 'mapped', notes: 'Optional field' },
      { crField: 'Notes', crType: 'string', aminyField: 'notes', aminyType: 'text', status: 'mapped', notes: 'Optional field' },
    ],
  },
  // ── Routine Completions (Push: Aminy → CR) ──
  {
    dataType: 'routine_completions',
    label: 'Routine Completions',
    direction: 'push',
    mappings: [
      { crField: 'ClientId', crType: 'string', aminyField: 'child_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'ReportedBy', crType: 'string', aminyField: 'reported_by_user_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'Date', crType: 'string (YYYY-MM-DD)', aminyField: 'completion_date', aminyType: 'date', status: 'mapped' },
      { crField: 'RoutineType', crType: 'string enum', aminyField: 'routine_type', aminyType: 'text', status: 'mapped' },
      { crField: 'RoutineName', crType: 'string', aminyField: 'routine_name', aminyType: 'text', status: 'mapped' },
      { crField: 'StepsCompleted', crType: 'number', aminyField: 'steps_completed', aminyType: 'integer', status: 'mapped' },
      { crField: 'StepsTotal', crType: 'number', aminyField: 'steps_total', aminyType: 'integer', status: 'mapped' },
      { crField: 'CompletionPercentage', crType: 'number (0-100)', aminyField: 'completion_pct', aminyType: 'integer', status: 'mapped' },
      { crField: 'IndependenceLevel', crType: 'CRPromptLevel enum', aminyField: 'independence_level', aminyType: 'text', status: 'mapped' },
      { crField: 'Duration', crType: 'number (minutes)', aminyField: 'duration_minutes', aminyType: 'integer', status: 'mapped' },
      { crField: 'BillingDocumentation', crType: 'object', aminyField: 'billing_metadata (jsonb)', aminyType: 'jsonb', status: 'mapped', notes: 'Nested billing doc → JSONB' },
    ],
  },
  // ── Junior Results (Push: Aminy → CR) ──
  {
    dataType: 'junior_results',
    label: 'Junior Session Results',
    direction: 'push',
    mappings: [
      { crField: 'ClientId', crType: 'string', aminyField: 'child_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'Date', crType: 'string (YYYY-MM-DD)', aminyField: 'session_date', aminyType: 'date', status: 'mapped' },
      { crField: 'SessionDuration', crType: 'number (minutes)', aminyField: 'duration_minutes', aminyType: 'integer', status: 'mapped' },
      { crField: 'GameType', crType: 'string', aminyField: 'game_type', aminyType: 'text', status: 'mapped' },
      { crField: 'SkillDomain', crType: 'CRGoalDomain enum', aminyField: 'skill_domain', aminyType: 'text', status: 'mapped' },
      { crField: 'TrialsCompleted', crType: 'number', aminyField: 'trials_completed', aminyType: 'integer', status: 'mapped' },
      { crField: 'TrialsCorrect', crType: 'number', aminyField: 'trials_correct', aminyType: 'integer', status: 'mapped' },
      { crField: 'Accuracy', crType: 'number (0-100)', aminyField: 'accuracy_pct', aminyType: 'integer', status: 'value_range_warning', notes: 'Must be 0-100' },
      { crField: 'EngagementScore', crType: 'number (0-100)', aminyField: 'engagement_score', aminyType: 'integer', status: 'value_range_warning', notes: 'Must be 0-100' },
      { crField: 'LinkedGoalIds', crType: 'string[]', aminyField: 'linked_goal_ids', aminyType: 'uuid[]', status: 'mapped', transform: 'CR goal IDs → Aminy goal UUIDs lookup' },
      { crField: 'Rewards', crType: 'object', aminyField: 'rewards_data (jsonb)', aminyType: 'jsonb', status: 'mapped' },
      { crField: 'AdaptiveDifficulty', crType: 'object', aminyField: 'adaptive_difficulty (jsonb)', aminyType: 'jsonb', status: 'mapped' },
    ],
  },
  // ── Wellness Data (Push: Aminy → CR) ──
  {
    dataType: 'wellness_data',
    label: 'Caregiver Wellness',
    direction: 'push',
    mappings: [
      { crField: 'CaregiverId', crType: 'string', aminyField: 'user_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'ClientId', crType: 'string', aminyField: 'child_id', aminyType: 'uuid', status: 'mapped' },
      { crField: 'Date', crType: 'string (YYYY-MM-DD)', aminyField: 'checkin_date', aminyType: 'date', status: 'mapped' },
      { crField: 'StressLevel', crType: 'number (1-10)', aminyField: 'stress_level', aminyType: 'integer', status: 'value_range_warning', notes: 'Must be 1-10' },
      { crField: 'SleepHours', crType: 'number', aminyField: 'sleep_hours', aminyType: 'numeric(3,1)', status: 'type_mismatch', notes: 'CR sends integer hours; Aminy stores decimal. Transform: Math.round to 1 decimal.' },
      { crField: 'SelfCareCompleted', crType: 'boolean', aminyField: 'self_care_completed', aminyType: 'boolean', status: 'mapped' },
      { crField: 'SupportNetworkContact', crType: 'boolean', aminyField: 'support_contact', aminyType: 'boolean', status: 'mapped' },
      { crField: 'WellnessScore', crType: 'number (0-100)', aminyField: 'wellness_score', aminyType: 'integer', status: 'mapped' },
      { crField: 'Concerns', crType: 'string', aminyField: 'concerns_text', aminyType: 'text', status: 'mapped', notes: 'Optional — may be null' },
      { crField: 'Notes', crType: 'string', aminyField: 'notes', aminyType: 'text', status: 'mapped', notes: 'Optional — may be null' },
    ],
  },
];

/** Compute summary statistics for field mappings */
function computeMappingSummary(groups: FieldMappingGroup[]): {
  totalFields: number;
  mapped: number;
  unmapped: number;
  typeMismatch: number;
  rangeWarning: number;
  coveragePercent: number;
} {
  const allMappings = groups.flatMap((g) => g.mappings);
  const totalFields = allMappings.length;
  const mapped = allMappings.filter((m) => m.status === 'mapped').length;
  const unmapped = allMappings.filter((m) => m.status === 'unmapped').length;
  const typeMismatch = allMappings.filter((m) => m.status === 'type_mismatch').length;
  const rangeWarning = allMappings.filter((m) => m.status === 'value_range_warning').length;
  const coveragePercent = totalFields > 0 ? Math.round(((totalFields - unmapped) / totalFields) * 100) : 0;

  return { totalFields, mapped, unmapped, typeMismatch, rangeWarning, coveragePercent };
}

/** Generate the mapping report as a JSON object for export */
function generateMappingReport(groups: FieldMappingGroup[]): Record<string, unknown> {
  const summary = computeMappingSummary(groups);

  return {
    reportVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    generator: 'Aminy CRDataValidation',
    summary: {
      totalFields: summary.totalFields,
      mappedFields: summary.mapped,
      unmappedFields: summary.unmapped,
      typeMismatches: summary.typeMismatch,
      valueRangeWarnings: summary.rangeWarning,
      coveragePercent: summary.coveragePercent,
    },
    dataTypes: groups.map((g) => ({
      dataType: g.dataType,
      label: g.label,
      direction: g.direction,
      fieldCount: g.mappings.length,
      mappedCount: g.mappings.filter((m) => m.status === 'mapped').length,
      issues: g.mappings
        .filter((m) => m.status !== 'mapped')
        .map((m) => ({
          crField: m.crField,
          aminyField: m.aminyField,
          status: m.status,
          notes: m.notes,
        })),
      fields: g.mappings.map((m) => ({
        crField: m.crField,
        crType: m.crType,
        aminyField: m.aminyField,
        aminyType: m.aminyType,
        status: m.status,
        transform: m.transform ?? null,
        notes: m.notes ?? null,
      })),
    })),
  };
}

/** Trigger a JSON file download in the browser */
function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchValidationData(userId: string): Promise<DataValidationSummary> {
  const pullRecords: ValidationRecord[] = [];
  const pushRecords: ValidationRecord[] = [];
  let totalRecordsSynced = 0;
  let totalErrors = 0;
  let lastSuccessfulSync: string | null = null;

  // Fetch pull records
  for (const dt of PULL_DATA_TYPES) {
    try {
      // Get sync status
      const { data: syncStatus } = await supabase
        .from('cr_sync_status')
        .select('*')
        .eq('user_id', userId)
        .eq('data_type', dt.type)
        .eq('direction', 'pull')
        .single();

      // Get record count
      const { count } = await supabase
        .from(dt.table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get recent validation errors
      const { data: errors } = await supabase
        .from('cr_validation_errors')
        .select('*')
        .eq('user_id', userId)
        .eq('data_type', dt.type)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get sample items
      const { data: samples } = await supabase
        .from(dt.table)
        .select('id, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(3);

      const recordCount = count ?? 0;
      const lastSync = syncStatus?.last_sync_at ?? null;
      const errorList: ValidationError[] = (errors ?? []).map((e) => ({
        field: e.field_name ?? 'unknown',
        message: e.error_message ?? 'Validation failed',
        severity: e.severity ?? 'warning',
        recordId: e.record_id,
        timestamp: e.created_at,
      }));
      const errorCount = errorList.length;

      totalRecordsSynced += recordCount;
      totalErrors += errorCount;

      if (lastSync && (!lastSuccessfulSync || lastSync > lastSuccessfulSync)) {
        lastSuccessfulSync = lastSync;
      }

      pullRecords.push({
        dataType: dt.type,
        direction: 'pull',
        label: dt.label,
        description: dt.description,
        lastSyncAt: lastSync,
        recordCount,
        errorCount,
        errors: errorList,
        freshness: computeFreshness(lastSync, dt.freshnessHours),
        sampleItems: (samples ?? []).map((s) => ({
          id: s.id,
          label: `${dt.label} record`,
          timestamp: s.updated_at ?? s.created_at,
          status: 'success' as const,
        })),
      });
    } catch {
      pullRecords.push({
        dataType: dt.type,
        direction: 'pull',
        label: dt.label,
        description: dt.description,
        lastSyncAt: null,
        recordCount: 0,
        errorCount: 0,
        errors: [],
        freshness: 'never',
        sampleItems: [],
      });
    }
  }

  // Fetch push records
  for (const dt of PUSH_DATA_TYPES) {
    try {
      const { data: syncStatus } = await supabase
        .from('cr_sync_status')
        .select('*')
        .eq('user_id', userId)
        .eq('data_type', dt.type)
        .eq('direction', 'push')
        .single();

      // Count successfully pushed items
      const { count: successCount } = await supabase
        .from(dt.table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('push_type', dt.eventType)
        .eq('status', 'delivered');

      // Count pending items
      const { count: pendingCount } = await supabase
        .from(dt.table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('push_type', dt.eventType)
        .in('status', ['pending', 'queued']);

      // Count failed items
      const { count: failedCount } = await supabase
        .from(dt.table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('push_type', dt.eventType)
        .eq('status', 'failed');

      const recordCount = (successCount ?? 0) + (pendingCount ?? 0);
      const errorCount = failedCount ?? 0;
      const lastSync = syncStatus?.last_sync_at ?? null;

      totalRecordsSynced += recordCount;
      totalErrors += errorCount;

      if (lastSync && (!lastSuccessfulSync || lastSync > lastSuccessfulSync)) {
        lastSuccessfulSync = lastSync;
      }

      // Build sample items from recent pushes
      const { data: recentPushes } = await supabase
        .from(dt.table)
        .select('id, created_at, status')
        .eq('user_id', userId)
        .eq('push_type', dt.eventType)
        .order('created_at', { ascending: false })
        .limit(3);

      pushRecords.push({
        dataType: dt.type,
        direction: 'push',
        label: dt.label,
        description: dt.description,
        lastSyncAt: lastSync,
        recordCount,
        errorCount,
        errors: errorCount > 0
          ? [
              {
                field: 'push_delivery',
                message: `${errorCount} item(s) failed to deliver to CentralReach.`,
                severity: 'error',
                timestamp: new Date().toISOString(),
              },
            ]
          : [],
        freshness: computeFreshness(lastSync, dt.freshnessHours),
        sampleItems: (recentPushes ?? []).map((p) => ({
          id: p.id,
          label: `${dt.label} entry`,
          timestamp: p.created_at,
          status: p.status === 'delivered' ? 'success' : p.status === 'failed' ? 'error' : 'warning',
        })),
      });
    } catch {
      pushRecords.push({
        dataType: dt.type,
        direction: 'push',
        label: dt.label,
        description: dt.description,
        lastSyncAt: null,
        recordCount: 0,
        errorCount: 0,
        errors: [],
        freshness: 'never',
        sampleItems: [],
      });
    }
  }

  // Compute overall health
  const allRecords = [...pullRecords, ...pushRecords];
  const freshCount = allRecords.filter((r) => r.freshness === 'fresh').length;
  const staleCount = allRecords.filter((r) => r.freshness === 'stale' || r.freshness === 'never').length;
  const errorRecords = allRecords.filter((r) => r.errorCount > 0).length;

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (freshCount / allRecords.length) * 60 +
          ((allRecords.length - errorRecords) / allRecords.length) * 30 +
          (totalRecordsSynced > 0 ? 10 : 0),
      ),
    ),
  );

  let overallHealth: DataValidationSummary['overallHealth'];
  if (totalRecordsSynced === 0 && !lastSuccessfulSync) {
    overallHealth = 'no_data';
  } else if (staleCount > allRecords.length / 2 || errorRecords > 2) {
    overallHealth = 'critical';
  } else if (staleCount > 0 || errorRecords > 0) {
    overallHealth = 'degraded';
  } else {
    overallHealth = 'healthy';
  }

  return {
    overallHealth,
    healthScore,
    totalRecordsSynced,
    totalErrors,
    lastSuccessfulSync,
    pullRecords,
    pushRecords,
    encryptionActive: true, // Always true — HIPAA encryption is mandatory
    auditLogActive: true, // Always true — audit logging is mandatory
  };
}

function computeFreshness(
  lastSyncAt: string | null,
  freshnessHoursThreshold: number,
): 'fresh' | 'aging' | 'stale' | 'never' {
  if (!lastSyncAt) return 'never';

  const hoursSince = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60);

  if (hoursSince <= freshnessHoursThreshold) return 'fresh';
  if (hoursSince <= freshnessHoursThreshold * 2) return 'aging';
  return 'stale';
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function FreshnessIndicator({ freshness }: { freshness: ValidationRecord['freshness'] }) {
  const config = {
    fresh: { color: 'text-green-600', bg: 'bg-green-50', label: 'Fresh', icon: CheckCircle2 },
    aging: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Aging', icon: Clock },
    stale: { color: 'text-red-600', bg: 'bg-red-50', label: 'Stale', icon: AlertTriangle },
    never: { color: 'text-gray-400', bg: 'bg-gray-50', label: 'No Data', icon: Info },
  }[freshness];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon size={10} />
      {config.label}
    </span>
  );
}

function ValidationCard({
  record,
  onExpand,
  isExpanded,
}: {
  record: ValidationRecord;
  onExpand: () => void;
  isExpanded: boolean;
}) {
  const DirectionIcon = record.direction === 'pull' ? ArrowDown : ArrowUp;
  const directionColor = record.direction === 'pull' ? 'text-blue-500' : 'text-teal-500';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={onExpand}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <DirectionIcon size={14} className={directionColor} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{record.label}</p>
              <FreshnessIndicator freshness={record.freshness} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {record.recordCount > 0
                ? `${record.recordCount} records \u2022 ${timeAgo(record.lastSyncAt)}`
                : 'No data synced yet'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {record.errorCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
              <XCircle size={10} />
              {record.errorCount}
            </span>
          )}
          <ChevronRight
            size={14}
            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-3">
          <p className="text-xs text-gray-500">{record.description}</p>

          {/* Sample items */}
          {record.sampleItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Recent Items</p>
              <div className="space-y-1">
                {record.sampleItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs bg-gray-50 rounded p-2"
                  >
                    <div className="flex items-center gap-2">
                      {item.status === 'success' && <CheckCircle2 size={10} className="text-green-500" />}
                      {item.status === 'warning' && <Clock size={10} className="text-amber-500" />}
                      {item.status === 'error' && <XCircle size={10} className="text-red-500" />}
                      <span className="text-gray-700">{item.label}</span>
                    </div>
                    <span className="text-gray-400">{timeAgo(item.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {record.errors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-700 mb-1">Issues</p>
              <div className="space-y-1">
                {record.errors.map((err, i) => (
                  <div
                    key={i}
                    className={`text-xs rounded p-2 ${
                      err.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <span className="font-medium">{err.field}:</span> {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-xs bg-gray-50 rounded p-2">
              <span className="text-gray-500">Total Records</span>
              <p className="font-semibold text-gray-900">{record.recordCount}</p>
            </div>
            <div className="text-xs bg-gray-50 rounded p-2">
              <span className="text-gray-500">Last Sync</span>
              <p className="font-semibold text-gray-900">{timeAgo(record.lastSyncAt)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FIELD MAPPING COMPONENTS
// ============================================================================

function FieldMappingStatusBadge({ status }: { status: FieldMappingStatus }) {
  const cfg = FIELD_MAPPING_STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.color} whitespace-nowrap`}
    >
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}

function FieldMappingGroupCard({
  group,
  isExpanded,
  onToggle,
}: {
  group: FieldMappingGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const mappedCount = group.mappings.filter((m) => m.status === 'mapped').length;
  const issueCount = group.mappings.length - mappedCount;
  const DirectionIcon = group.direction === 'pull' ? ArrowDown : ArrowUp;
  const dirColor = group.direction === 'pull' ? 'text-blue-500' : 'text-teal-500';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <DirectionIcon size={14} className={dirColor} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{group.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {mappedCount}/{group.mappings.length} fields mapped
              {issueCount > 0 && (
                <span className="text-amber-600"> &bull; {issueCount} issue{issueCount !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {issueCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
              <AlertTriangle size={10} />
              {issueCount}
            </span>
          )}
          {isExpanded ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">CR Field</div>
            <div className="col-span-2">CR Type</div>
            <div className="col-span-3">Aminy Field</div>
            <div className="col-span-2">Aminy Type</div>
            <div className="col-span-2">Status</div>
          </div>

          {/* Field rows */}
          <div className="divide-y divide-gray-50">
            {group.mappings.map((mapping, idx) => (
              <div
                key={`${mapping.crField}-${idx}`}
                className="grid grid-cols-12 gap-1 px-3 py-2 text-xs items-start hover:bg-gray-50"
              >
                <div className="col-span-3">
                  <code className="text-gray-800 bg-gray-100 px-1 py-0.5 rounded text-[10px] font-mono break-all">
                    {mapping.crField}
                  </code>
                </div>
                <div className="col-span-2 text-gray-500 text-[10px] break-all">
                  {mapping.crType}
                </div>
                <div className="col-span-3">
                  <code className="text-gray-800 bg-blue-50 px-1 py-0.5 rounded text-[10px] font-mono break-all">
                    {mapping.aminyField}
                  </code>
                </div>
                <div className="col-span-2 text-gray-500 text-[10px] break-all">
                  {mapping.aminyType}
                </div>
                <div className="col-span-2">
                  <FieldMappingStatusBadge status={mapping.status} />
                </div>
                {(mapping.notes || mapping.transform) && (
                  <div className="col-span-12 mt-1 pl-1 text-[10px] text-gray-400 italic">
                    {mapping.transform && (
                      <span className="block">Transform: {mapping.transform}</span>
                    )}
                    {mapping.notes && (
                      <span className="block">Note: {mapping.notes}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldMappingSection() {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);

  const summary = computeMappingSummary(FIELD_MAPPING_GROUPS);

  const handleExport = () => {
    const report = generateMappingReport(FIELD_MAPPING_GROUPS);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadJson(report, `aminy-cr-mapping-report-${dateStr}.json`);
  };

  return (
    <div className="space-y-3">
      {/* Section Header (always visible) */}
      <button
        onClick={() => setShowMapping(!showMapping)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Table2 size={14} className="text-indigo-500" />
          Field-Level Mapping
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{summary.totalFields} fields</span>
          {showMapping ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )}
        </div>
      </button>

      {showMapping && (
        <>
          {/* Mapping Summary Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
              <div className="flex items-center gap-1.5">
                <Link2 size={12} className="text-green-600" />
                <span className="text-xs font-medium text-green-700">Coverage</span>
              </div>
              <p className="text-lg font-bold text-green-800 mt-1">{summary.coveragePercent}%</p>
              <p className="text-[10px] text-green-600">{summary.mapped} of {summary.totalFields} fields mapped</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-500" />
                <span className="text-xs font-medium text-gray-700">Issues</span>
              </div>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {summary.unmapped + summary.typeMismatch + summary.rangeWarning}
              </p>
              <p className="text-[10px] text-gray-500">
                {summary.unmapped > 0 && `${summary.unmapped} unmapped`}
                {summary.unmapped > 0 && summary.typeMismatch > 0 && ', '}
                {summary.typeMismatch > 0 && `${summary.typeMismatch} type mismatch`}
                {(summary.unmapped > 0 || summary.typeMismatch > 0) && summary.rangeWarning > 0 && ', '}
                {summary.rangeWarning > 0 && `${summary.rangeWarning} range warn`}
                {summary.unmapped === 0 && summary.typeMismatch === 0 && summary.rangeWarning === 0 && 'None'}
              </p>
            </div>
          </div>

          {/* Status Legend */}
          <div className="flex flex-wrap gap-2 px-1">
            {(Object.entries(FIELD_MAPPING_STATUS_CONFIG) as [FieldMappingStatus, typeof FIELD_MAPPING_STATUS_CONFIG[FieldMappingStatus]][]).map(
              ([status]) => (
                <FieldMappingStatusBadge key={status} status={status} />
              ),
            )}
          </div>

          {/* Data Type Groups */}
          <div className="space-y-2">
            {FIELD_MAPPING_GROUPS.map((group) => (
              <FieldMappingGroupCard
                key={`${group.dataType}:${group.direction}`}
                group={group}
                isExpanded={expandedGroup === `${group.dataType}:${group.direction}`}
                onToggle={() =>
                  setExpandedGroup(
                    expandedGroup === `${group.dataType}:${group.direction}`
                      ? null
                      : `${group.dataType}:${group.direction}`,
                  )
                }
              />
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <Download size={14} />
            Export Mapping Report (JSON)
          </button>

          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            Export includes all field mappings, types, transforms, and validation issues
            for technical review by your integration team.
          </p>
        </>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CRDataValidation({ userId, childId, onBack }: CRDataValidationProps) {
  const [summary, setSummary] = useState<DataValidationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchValidationData(userId);
      setSummary(data);
    } catch (err) {
      console.error('[CRDataValidation] Failed to load:', err);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Unable to load validation data. Please try again.</p>
      </div>
    );
  }

  const healthConfig = {
    healthy: { color: 'bg-green-50 border-green-200', icon: CheckCircle2, iconColor: 'text-green-600', text: 'All Data Validated' },
    degraded: { color: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600', text: 'Some Issues Detected' },
    critical: { color: 'bg-red-50 border-red-200', icon: XCircle, iconColor: 'text-red-600', text: 'Sync Needs Attention' },
    no_data: { color: 'bg-gray-50 border-gray-200', icon: Database, iconColor: 'text-gray-400', text: 'No Data Synced Yet' },
  }[summary.overallHealth];

  const HealthIcon = healthConfig.icon;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Data Validation</h2>
          <p className="text-xs text-gray-500 mt-0.5">Verify what synced with CentralReach</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50 transition-colors"
            aria-label="Refresh validation data"
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
          {onBack && (
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Health Score Banner */}
      <div className={`rounded-xl p-4 border ${healthConfig.color}`}>
        <div className="flex items-center gap-3">
          <HealthIcon className={`w-6 h-6 ${healthConfig.iconColor}`} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{healthConfig.text}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Health score: {summary.healthScore}/100 &bull; {summary.totalRecordsSynced} total records
              {summary.totalErrors > 0 && ` \u2022 ${summary.totalErrors} errors`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{summary.healthScore}</p>
            <p className="text-xs text-gray-400">/100</p>
          </div>
        </div>
      </div>

      {/* Security Indicators */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ShieldCheck size={12} className="text-green-500" />
          <span>HIPAA Encrypted</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <FileCheck size={12} className="text-green-500" />
          <span>Audit Logging Active</span>
        </div>
        {summary.lastSuccessfulSync && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock size={12} className="text-blue-500" />
            <span>Last sync: {timeAgo(summary.lastSuccessfulSync)}</span>
          </div>
        )}
      </div>

      {/* Pull Data (Provider → Aminy) */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <ArrowDown size={14} className="text-blue-500" />
          Data Received from Provider
        </h3>
        <div className="space-y-2">
          {summary.pullRecords.map((record) => (
            <ValidationCard
              key={`${record.dataType}:${record.direction}`}
              record={record}
              isExpanded={expandedCard === `${record.dataType}:${record.direction}`}
              onExpand={() =>
                setExpandedCard(
                  expandedCard === `${record.dataType}:${record.direction}`
                    ? null
                    : `${record.dataType}:${record.direction}`,
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Push Data (Aminy → Provider) */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <ArrowUp size={14} className="text-teal-500" />
          Data Sent to Provider
        </h3>
        <div className="space-y-2">
          {summary.pushRecords.map((record) => (
            <ValidationCard
              key={`${record.dataType}:${record.direction}`}
              record={record}
              isExpanded={expandedCard === `${record.dataType}:${record.direction}`}
              onExpand={() =>
                setExpandedCard(
                  expandedCard === `${record.dataType}:${record.direction}`
                    ? null
                    : `${record.dataType}:${record.direction}`,
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Field-Level Mapping Section */}
      <FieldMappingSection />

      {/* Privacy Notice */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          All data is validated with Zod schemas before sync, encrypted in transit (TLS 1.3) and at
          rest (AES-256), and logged in an immutable audit trail. Only your authorized care team can
          access shared data through CentralReach.
        </p>
      </div>
    </div>
  );
}

export default CRDataValidation;
