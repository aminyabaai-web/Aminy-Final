/**
 * CentralReach Sync Status Indicator
 *
 * Compact status badge showing CR sync health at a glance:
 * - Last sync time (relative)
 * - Queued items count
 * - Failed items count with retry indicator
 * - Manual sync trigger
 *
 * Drop into any provider-facing dashboard or settings screen.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  CloudOff,
  Loader2,
} from 'lucide-react';
import {
  getPendingPushes,
  getFailedPushes,
  syncDataBidirectional,
} from '../lib/centralreach-integration';
import type { CRSyncRecord } from '../lib/centralreach-types';

interface CRSyncStatusProps {
  /** CentralReach client ID for triggering manual sync */
  clientId?: string;
  /** Compact mode shows just the icon badge (default: false) */
  compact?: boolean;
  /** Poll interval in ms to refresh queue counts (default: 30000) */
  pollInterval?: number;
}

interface SyncSnapshot {
  pending: number;
  failed: number;
  lastSyncTime: string | null;
  oldestPendingAge: string | null;
}

/**
 * Format a date into a relative "X ago" string.
 */
function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Derive a sync health snapshot from the in-memory queue.
 */
function getSyncSnapshot(): SyncSnapshot {
  const pending = getPendingPushes();
  const failed = getFailedPushes();

  // Find the most recent completed sync across all records
  const allRecords = [...pending, ...failed];
  const completedTimes = allRecords
    .filter((r) => r.lastSyncAt)
    .map((r) => new Date(r.lastSyncAt).getTime());

  const lastSyncTime = completedTimes.length > 0
    ? new Date(Math.max(...completedTimes)).toISOString()
    : null;

  // Find the oldest pending item to show staleness
  const pendingTimes = pending
    .filter((r) => r.createdAt)
    .map((r) => new Date(r.createdAt).getTime());

  const oldestPendingAge = pendingTimes.length > 0
    ? new Date(Math.min(...pendingTimes)).toISOString()
    : null;

  return {
    pending: pending.length,
    failed: failed.length,
    lastSyncTime,
    oldestPendingAge,
  };
}

type SyncHealth = 'healthy' | 'pending' | 'warning' | 'error';

function getHealth(snapshot: SyncSnapshot): SyncHealth {
  if (snapshot.failed > 0) return 'error';
  if (snapshot.pending > 3) return 'warning';
  if (snapshot.pending > 0) return 'pending';
  return 'healthy';
}

const healthConfig: Record<SyncHealth, {
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
  label: string;
}> = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Synced',
  },
  pending: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Syncing',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    label: 'Queued',
  },
  error: {
    icon: CloudOff,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Sync Error',
  },
};

export function CRSyncStatus({
  clientId,
  compact = false,
  pollInterval = 30_000,
}: CRSyncStatusProps) {
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(getSyncSnapshot);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refresh snapshot on interval
  useEffect(() => {
    const refresh = () => setSnapshot(getSyncSnapshot());
    const id = setInterval(refresh, pollInterval);
    return () => clearInterval(id);
  }, [pollInterval]);

  // Manual sync handler
  const handleManualSync = useCallback(async () => {
    if (!clientId || isSyncing) return;
    setIsSyncing(true);

    try {
      await syncDataBidirectional(clientId);
    } catch (error) {
      console.error('[CRSyncStatus] Manual sync failed:', error);
    } finally {
      setSnapshot(getSyncSnapshot());
      setIsSyncing(false);
    }
  }, [clientId, isSyncing]);

  const health = getHealth(snapshot);
  const config = healthConfig[health];
  const Icon = config.icon;

  // Compact mode: just a status dot
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
        title={`CR: ${config.label} • ${snapshot.pending} pending • ${snapshot.failed} failed`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{config.label}</span>
        {(snapshot.pending > 0 || snapshot.failed > 0) && (
          <span className="ml-0.5 tabular-nums">
            {snapshot.pending + snapshot.failed}
          </span>
        )}
      </div>
    );
  }

  // Full mode: card with details + sync button
  return (
    <div className={`rounded-xl border p-4 ${config.bgColor} border-gray-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <h4 className="text-sm font-semibold text-gray-900">
            CentralReach Sync
          </h4>
        </div>

        {clientId && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-1.5 rounded-lg hover:bg-white/60 transition-colors disabled:opacity-50"
            title="Sync now"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/60 rounded-lg px-2 py-1.5">
          <p className="text-xs text-gray-500">Last Sync</p>
          <p className="text-sm font-medium text-gray-900">
            {snapshot.lastSyncTime
              ? formatRelativeTime(snapshot.lastSyncTime)
              : '—'}
          </p>
        </div>
        <div className="bg-white/60 rounded-lg px-2 py-1.5">
          <p className="text-xs text-gray-500">Queued</p>
          <p className={`text-sm font-medium ${snapshot.pending > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {snapshot.pending}
          </p>
        </div>
        <div className="bg-white/60 rounded-lg px-2 py-1.5">
          <p className="text-xs text-gray-500">Failed</p>
          <p className={`text-sm font-medium ${snapshot.failed > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {snapshot.failed}
          </p>
        </div>
      </div>

      {/* Oldest pending item warning */}
      {snapshot.oldestPendingAge && snapshot.pending > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Oldest queued item: {formatRelativeTime(snapshot.oldestPendingAge)}
        </p>
      )}

      {/* Error details */}
      {snapshot.failed > 0 && (
        <p className="text-xs text-red-600 mt-2">
          {snapshot.failed} item{snapshot.failed !== 1 ? 's' : ''} failed to sync.
          {clientId ? ' Try syncing manually.' : ''}
        </p>
      )}
    </div>
  );
}

export default CRSyncStatus;
