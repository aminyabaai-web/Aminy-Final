/**
 * CentralReach Sync Error Recovery Dashboard
 *
 * Admin/provider-facing dashboard for monitoring and managing CentralReach
 * data synchronization. Shows detailed sync status per data type with
 * error recovery controls.
 *
 * Features:
 *   - Sync status per data type: last sync time, records synced, errors
 *   - Failed sync items with individual retry buttons
 *   - Error details: API error code, failed record ID, error message
 *   - Bulk retry: "Retry all failed" button
 *   - Sync history timeline (last 30 days)
 *   - Pull data from cr_sync_log and cr_sync_errors tables
 *
 * Accessed from: Settings -> CentralReach -> Sync Dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Activity,
  Calendar,
  Hash,
  Timer,
  AlertOctagon,
  Zap,
} from 'lucide-react';
import { syncScheduler } from '../lib/centralreach-sync-scheduler';
import type {
  SyncRecord,
  SyncLogEntry,
  SyncErrorEntry,
  SyncHistorySummary,
  SyncDataType,
  SyncDirection,
} from '../lib/centralreach-sync-scheduler';

// ============================================================================
// Types
// ============================================================================

interface CRSyncDashboardProps {
  userId: string;
  childId?: string;
  onBack?: () => void;
}

type TabView = 'status' | 'errors' | 'history';

// ============================================================================
// Helpers
// ============================================================================

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '--';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const STATUS_CONFIG = {
  idle: { color: 'text-gray-500', bg: 'bg-gray-50', label: 'Idle', icon: Clock },
  syncing: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Syncing...', icon: Loader2 },
  success: { color: 'text-green-600', bg: 'bg-green-50', label: 'Success', icon: CheckCircle2 },
  error: { color: 'text-red-600', bg: 'bg-red-50', label: 'Error', icon: XCircle },
  backoff: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Backed Off', icon: AlertTriangle },
};

const DATA_TYPE_LABELS: Record<string, string> = {
  sessions: 'Therapy Sessions',
  goals: 'Treatment Goals',
  insurance: 'Insurance Coverage',
  auth_status: 'Authorization Status',
  home_programs: 'Home Programs',
  behavior_logs: 'Behavior Logs (ABC)',
  routine_completions: 'Routine Completions',
  junior_results: 'Junior Results',
  wellness_data: 'Caregiver Wellness',
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: SyncRecord['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      <Icon size={10} className={status === 'syncing' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}

function SyncRecordCard({
  record,
  onSync,
  syncing,
}: {
  record: SyncRecord;
  onSync: () => void;
  syncing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const DirectionIcon = record.direction === 'pull' ? ArrowDown : ArrowUp;
  const directionColor =
    record.direction === 'pull' ? 'text-blue-500' : 'text-teal-500';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <DirectionIcon size={14} className={directionColor} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {DATA_TYPE_LABELS[record.dataType] || record.dataType}
              </p>
              <StatusBadge status={record.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {record.recordsSynced > 0
                ? `${record.recordsSynced} records synced`
                : 'No data synced yet'}
              {record.lastSyncAt ? ` \u2022 ${timeAgo(record.lastSyncAt)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSync();
            }}
            disabled={syncing || record.status === 'syncing'}
            className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50 transition-colors"
            title="Sync now"
          >
            {syncing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
          </button>
          {expanded ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-xs bg-gray-50 rounded p-2">
              <span className="text-gray-500">Direction</span>
              <p className="font-medium text-gray-900 capitalize">{record.direction}</p>
            </div>
            <div className="text-xs bg-gray-50 rounded p-2">
              <span className="text-gray-500">Records</span>
              <p className="font-medium text-gray-900">{record.recordsSynced}</p>
            </div>
            <div className="text-xs bg-gray-50 rounded p-2">
              <span className="text-gray-500">Last Sync</span>
              <p className="font-medium text-gray-900">{timeAgo(record.lastSyncAt)}</p>
            </div>
            <div className="text-xs bg-gray-50 rounded p-2">
              <span className="text-gray-500">Next Sync</span>
              <p className="font-medium text-gray-900">{timeAgo(record.nextSyncAt)}</p>
            </div>
          </div>

          {record.lastError && (
            <div className="text-xs bg-red-50 text-red-700 rounded p-2">
              <span className="font-medium">Last Error:</span> {record.lastError}
            </div>
          )}

          {record.consecutiveFailures > 0 && (
            <div className="text-xs bg-amber-50 text-amber-700 rounded p-2">
              <span className="font-medium">Consecutive Failures:</span>{' '}
              {record.consecutiveFailures}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ErrorCard({
  error,
  onRetry,
  retrying,
}: {
  error: SyncErrorEntry;
  onRetry: () => void;
  retrying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-red-50/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertOctagon size={14} className="text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {DATA_TYPE_LABELS[error.data_type] || error.data_type} ({error.direction})
            </p>
            <p className="text-xs text-red-600 mt-0.5 truncate">
              {error.error_message}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            disabled={retrying}
            className="px-2 py-1 rounded-md bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium disabled:opacity-50 transition-colors"
          >
            {retrying ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              'Retry'
            )}
          </button>
          {expanded ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-red-100 pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {error.error_code && (
              <div className="text-xs bg-gray-50 rounded p-2">
                <span className="text-gray-500">Error Code</span>
                <p className="font-mono font-medium text-gray-900">{error.error_code}</p>
              </div>
            )}
            {error.record_id && (
              <div className="text-xs bg-gray-50 rounded p-2">
                <span className="text-gray-500">Record ID</span>
                <p className="font-mono font-medium text-gray-900 truncate">
                  {error.record_id}
                </p>
              </div>
            )}
            <div className="text-xs bg-gray-50 rounded p-2">
              <span className="text-gray-500">Retries</span>
              <p className="font-medium text-gray-900">
                {error.retry_count} / {error.max_retries}
              </p>
            </div>
            <div className="text-xs bg-gray-50 rounded p-2">
              <span className="text-gray-500">Created</span>
              <p className="font-medium text-gray-900">
                {formatDate(error.created_at)}
              </p>
            </div>
          </div>

          <div className="text-xs bg-red-50 text-red-700 rounded p-2">
            <span className="font-medium">Full Error:</span>
            <p className="mt-1 break-words">{error.error_message}</p>
          </div>

          {error.next_retry_at && (
            <p className="text-xs text-gray-500">
              Next automatic retry: {formatDate(error.next_retry_at)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryTimeline({ entries }: { entries: SyncLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No sync history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 50).map((entry) => {
        const statusColor =
          entry.status === 'success'
            ? 'bg-green-400'
            : entry.status === 'error'
              ? 'bg-red-400'
              : entry.status === 'partial'
                ? 'bg-amber-400'
                : 'bg-gray-400';

        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 bg-white rounded-lg border border-gray-100 p-3"
          >
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusColor}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">
                  {DATA_TYPE_LABELS[entry.data_type] || entry.data_type}
                </p>
                <span className="text-xs text-gray-400">
                  {formatDate(entry.started_at)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  {entry.direction === 'pull' ? (
                    <ArrowDown size={10} className="text-blue-500" />
                  ) : (
                    <ArrowUp size={10} className="text-teal-500" />
                  )}
                  {entry.direction}
                </span>
                <span className="flex items-center gap-1">
                  <Hash size={10} />
                  {entry.records_processed} records
                </span>
                {entry.duration_ms != null && (
                  <span className="flex items-center gap-1">
                    <Timer size={10} />
                    {formatDuration(entry.duration_ms)}
                  </span>
                )}
                {entry.records_failed > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle size={10} />
                    {entry.records_failed} failed
                  </span>
                )}
              </div>
              {entry.error_message && (
                <p className="text-xs text-red-600 mt-1 truncate">
                  {entry.error_message}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CRSyncDashboard({ userId, onBack }: CRSyncDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabView>('status');
  const [syncRecords, setSyncRecords] = useState<SyncRecord[]>([]);
  const [errors, setErrors] = useState<SyncErrorEntry[]>([]);
  const [history, setHistory] = useState<SyncHistorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingItems, setSyncingItems] = useState<Set<string>>(new Set());
  const [retryingItems, setRetryingItems] = useState<Set<string>>(new Set());
  const [bulkRetrying, setBulkRetrying] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Initialize scheduler if needed
      await syncScheduler.init(userId);

      // Load all data in parallel
      const [records, unresolvedErrors, syncHistory] = await Promise.all([
        Promise.resolve(syncScheduler.getStatus()),
        syncScheduler.getUnresolvedErrors(),
        syncScheduler.getSyncHistory(30),
      ]);

      setSyncRecords(records);
      setErrors(unresolvedErrors);
      setHistory(syncHistory);
    } catch (err) {
      console.error('[CRSyncDashboard] Failed to load:', err);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleSync = async (dataType: SyncDataType, direction: SyncDirection) => {
    const key = `${dataType}:${direction}`;
    setSyncingItems((prev) => new Set(prev).add(key));

    try {
      await syncScheduler.startSync(dataType, direction);
      await loadData();
    } finally {
      setSyncingItems((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleRetryError = async (errorId: string) => {
    setRetryingItems((prev) => new Set(prev).add(errorId));

    try {
      await syncScheduler.retryError(errorId);
      await loadData();
    } finally {
      setRetryingItems((prev) => {
        const next = new Set(prev);
        next.delete(errorId);
        return next;
      });
    }
  };

  const handleRetryAll = async () => {
    setBulkRetrying(true);
    try {
      const result = await syncScheduler.retryAllErrors();
      console.log(
        `[CRSyncDashboard] Bulk retry: ${result.succeeded} succeeded, ${result.failed} failed`,
      );
      await loadData();
    } finally {
      setBulkRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
      </div>
    );
  }

  const errorCount = errors.length;
  const pullRecords = syncRecords.filter((r) => r.direction === 'pull');
  const pushRecords = syncRecords.filter((r) => r.direction === 'push');

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Sync Dashboard</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            CentralReach data synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw size={16} />
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; Back
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {history && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <Activity size={16} className="text-teal-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">
              {history.totalSyncs}
            </p>
            <p className="text-xs text-gray-500">Total Syncs</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <Zap size={16} className="text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">
              {history.totalRecordsProcessed}
            </p>
            <p className="text-xs text-gray-500">Records</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <XCircle
              size={16}
              className={`mx-auto mb-1 ${errorCount > 0 ? 'text-red-500' : 'text-gray-300'}`}
            />
            <p
              className={`text-lg font-bold ${errorCount > 0 ? 'text-red-600' : 'text-gray-900'}`}
            >
              {errorCount}
            </p>
            <p className="text-xs text-gray-500">Open Errors</p>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex border-b border-gray-200">
        {(
          [
            { id: 'status', label: 'Status' },
            { id: 'errors', label: `Errors${errorCount > 0 ? ` (${errorCount})` : ''}` },
            { id: 'history', label: 'History' },
          ] as { id: TabView; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Tab */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {/* Pull Data */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <ArrowDown size={14} className="text-blue-500" />
              Pull (CentralReach &rarr; Aminy)
            </h3>
            <div className="space-y-2">
              {pullRecords.map((record) => (
                <SyncRecordCard
                  key={`${record.dataType}:${record.direction}`}
                  record={record}
                  onSync={() => handleSync(record.dataType, record.direction)}
                  syncing={syncingItems.has(
                    `${record.dataType}:${record.direction}`,
                  )}
                />
              ))}
            </div>
          </div>

          {/* Push Data */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <ArrowUp size={14} className="text-teal-500" />
              Push (Aminy &rarr; CentralReach)
            </h3>
            <div className="space-y-2">
              {pushRecords.map((record) => (
                <SyncRecordCard
                  key={`${record.dataType}:${record.direction}`}
                  record={record}
                  onSync={() => handleSync(record.dataType, record.direction)}
                  syncing={syncingItems.has(
                    `${record.dataType}:${record.direction}`,
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Errors Tab */}
      {activeTab === 'errors' && (
        <div className="space-y-3">
          {errors.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {errors.length} unresolved error{errors.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={handleRetryAll}
                disabled={bulkRetrying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium disabled:opacity-50 transition-colors"
              >
                {bulkRetrying ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RotateCcw size={12} />
                )}
                Retry All Failed
              </button>
            </div>
          )}

          {errors.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No sync errors</p>
              <p className="text-xs text-gray-400 mt-1">
                All data is syncing successfully
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map((error) => (
                <ErrorCard
                  key={error.id}
                  error={error}
                  onRetry={() => handleRetryError(error.id)}
                  retrying={retryingItems.has(error.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {history && (
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center bg-green-50 rounded-lg p-2">
                <p className="text-sm font-bold text-green-700">
                  {history.successCount}
                </p>
                <p className="text-xs text-green-600">Success</p>
              </div>
              <div className="text-center bg-red-50 rounded-lg p-2">
                <p className="text-sm font-bold text-red-700">
                  {history.errorCount}
                </p>
                <p className="text-xs text-red-600">Errors</p>
              </div>
              <div className="text-center bg-amber-50 rounded-lg p-2">
                <p className="text-sm font-bold text-amber-700">
                  {history.partialCount}
                </p>
                <p className="text-xs text-amber-600">Partial</p>
              </div>
              <div className="text-center bg-gray-50 rounded-lg p-2">
                <p className="text-sm font-bold text-gray-700">
                  {formatDuration(history.avgDurationMs)}
                </p>
                <p className="text-xs text-gray-500">Avg Time</p>
              </div>
            </div>
          )}

          <h3 className="text-sm font-semibold text-gray-700">
            Last 30 Days
          </h3>

          <HistoryTimeline entries={history?.entries ?? []} />
        </div>
      )}
    </div>
  );
}

export default CRSyncDashboard;
