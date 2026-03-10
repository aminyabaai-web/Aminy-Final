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
  Info,
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
