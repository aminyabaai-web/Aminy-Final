import type { SyncDirection, SyncErrorEntry, SyncLogEntry } from './centralreach-sync-scheduler';

export interface CentralReachSyncJob {
  dataType: string;
  direction: SyncDirection;
  lastAttemptAt: string | null;
  lastStatus: 'started' | 'success' | 'error' | 'partial' | 'idle';
  recordsProcessed: number;
  recordsFailed: number;
  reconciliationState: 'healthy' | 'retry_required' | 'attention_needed';
  unresolvedErrors: number;
  nextRetryAt: string | null;
  operatorMessage: string;
}

export function buildCentralReachSyncJobs(
  logs: SyncLogEntry[],
  errors: SyncErrorEntry[],
): CentralReachSyncJob[] {
  const jobMap = new Map<string, CentralReachSyncJob>();

  for (const entry of logs) {
    const key = `${entry.data_type}:${entry.direction}`;
    const existing = jobMap.get(key);
    if (existing && existing.lastAttemptAt && existing.lastAttemptAt > entry.started_at) {
      continue;
    }

    jobMap.set(key, {
      dataType: entry.data_type,
      direction: entry.direction as SyncDirection,
      lastAttemptAt: entry.started_at,
      lastStatus: entry.status,
      recordsProcessed: entry.records_processed || 0,
      recordsFailed: entry.records_failed || 0,
      reconciliationState: entry.status === 'success' ? 'healthy' : entry.status === 'partial' ? 'attention_needed' : 'retry_required',
      unresolvedErrors: 0,
      nextRetryAt: null,
      operatorMessage:
        entry.status === 'success'
          ? 'Latest sync completed successfully.'
          : entry.status === 'partial'
            ? 'Latest sync completed with partial failures. Review queue before clinic handoff.'
            : entry.status === 'error'
              ? 'Latest sync failed. Retry and reconcile before using this data operationally.'
              : 'Latest sync started and is still running.',
    });
  }

  for (const error of errors) {
    const key = `${error.data_type}:${error.direction}`;
    const existing = jobMap.get(key) || {
      dataType: error.data_type,
      direction: error.direction as SyncDirection,
      lastAttemptAt: null,
      lastStatus: 'idle' as const,
      recordsProcessed: 0,
      recordsFailed: 0,
      reconciliationState: 'retry_required' as const,
      unresolvedErrors: 0,
      nextRetryAt: null,
      operatorMessage: 'No successful sync has been recorded yet.',
    };

    existing.unresolvedErrors += error.resolved ? 0 : 1;
    existing.recordsFailed += error.resolved ? 0 : 1;
    if (!error.resolved) {
      existing.reconciliationState = error.retry_count >= error.max_retries ? 'attention_needed' : 'retry_required';
      existing.nextRetryAt = error.next_retry_at || existing.nextRetryAt;
      existing.operatorMessage = error.retry_count >= error.max_retries
        ? 'Sync needs operator review because automatic retries are exhausted.'
        : 'Retry is queued or available. Keep reconciliation visible until the export succeeds.';
    }

    jobMap.set(key, existing);
  }

  return Array.from(jobMap.values()).sort((a, b) => {
    const aTime = a.lastAttemptAt ? new Date(a.lastAttemptAt).getTime() : 0;
    const bTime = b.lastAttemptAt ? new Date(b.lastAttemptAt).getTime() : 0;
    return bTime - aTime;
  });
}
