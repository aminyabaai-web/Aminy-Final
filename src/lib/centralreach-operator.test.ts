import { describe, expect, it } from 'vitest';
import { buildCentralReachClinicWorkflowSummary, buildCentralReachSyncJobs } from './centralreach-operator';
import type { SyncErrorEntry, SyncLogEntry } from './centralreach-sync-scheduler';

describe('centralreach operator jobs', () => {
  it('derives retry-required and attention-needed jobs from logs and errors', () => {
    const logs: SyncLogEntry[] = [
      {
        id: 'log-1',
        user_id: 'user-1',
        child_id: 'child-1',
        data_type: 'goals',
        direction: 'pull',
        status: 'success',
        records_processed: 12,
        records_failed: 0,
        error_message: null,
        error_code: null,
        duration_ms: 2200,
        sync_metadata: {},
        started_at: '2026-03-11T10:00:00Z',
        completed_at: '2026-03-11T10:00:02Z',
        created_at: '2026-03-11T10:00:00Z',
      },
      {
        id: 'log-2',
        user_id: 'user-1',
        child_id: 'child-1',
        data_type: 'routine_completions',
        direction: 'push',
        status: 'partial',
        records_processed: 8,
        records_failed: 1,
        error_message: 'One row failed export',
        error_code: 'PARTIAL_EXPORT',
        duration_ms: 1900,
        sync_metadata: {},
        started_at: '2026-03-11T11:00:00Z',
        completed_at: '2026-03-11T11:00:02Z',
        created_at: '2026-03-11T11:00:00Z',
      },
    ];

    const errors: SyncErrorEntry[] = [
      {
        id: 'err-1',
        user_id: 'user-1',
        sync_log_id: 'log-2',
        data_type: 'routine_completions',
        direction: 'push',
        record_id: 'record-1',
        error_code: 'TIMEOUT',
        error_message: 'Timed out talking to CentralReach',
        error_details: {},
        retry_count: 1,
        max_retries: 3,
        next_retry_at: '2026-03-11T11:10:00Z',
        resolved: false,
        resolved_at: null,
        resolved_by: null,
        created_at: '2026-03-11T11:00:03Z',
        updated_at: '2026-03-11T11:00:03Z',
      },
      {
        id: 'err-2',
        user_id: 'user-1',
        sync_log_id: null,
        data_type: 'insurance',
        direction: 'pull',
        record_id: 'plan-1',
        error_code: 'AUTH',
        error_message: 'Manual review required',
        error_details: {},
        retry_count: 3,
        max_retries: 3,
        next_retry_at: null,
        resolved: false,
        resolved_at: null,
        resolved_by: null,
        created_at: '2026-03-11T11:05:00Z',
        updated_at: '2026-03-11T11:05:00Z',
      },
    ];

    const jobs = buildCentralReachSyncJobs(logs, errors);

    const healthy = jobs.find((job) => job.dataType === 'goals' && job.direction === 'pull');
    const retryRequired = jobs.find((job) => job.dataType === 'routine_completions' && job.direction === 'push');
    const attentionNeeded = jobs.find((job) => job.dataType === 'insurance' && job.direction === 'pull');

    expect(healthy?.reconciliationState).toBe('healthy');
    expect(retryRequired?.reconciliationState).toBe('retry_required');
    expect(retryRequired?.unresolvedErrors).toBe(1);
    expect(attentionNeeded?.reconciliationState).toBe('attention_needed');
    expect(attentionNeeded?.operatorMessage).toContain('operator review');
  });

  it('builds a clinic workflow readiness summary from sync jobs', () => {
    const jobs = buildCentralReachSyncJobs([
      {
        id: 'log-sessions',
        user_id: 'user-1',
        child_id: 'child-1',
        data_type: 'sessions',
        direction: 'pull',
        status: 'success',
        records_processed: 4,
        records_failed: 0,
        error_message: null,
        error_code: null,
        duration_ms: 1500,
        sync_metadata: {},
        started_at: '2026-03-12T10:00:00Z',
        completed_at: '2026-03-12T10:00:01Z',
        created_at: '2026-03-12T10:00:00Z',
      },
      {
        id: 'log-goals',
        user_id: 'user-1',
        child_id: 'child-1',
        data_type: 'goals',
        direction: 'pull',
        status: 'success',
        records_processed: 6,
        records_failed: 0,
        error_message: null,
        error_code: null,
        duration_ms: 1700,
        sync_metadata: {},
        started_at: '2026-03-12T10:10:00Z',
        completed_at: '2026-03-12T10:10:01Z',
        created_at: '2026-03-12T10:10:00Z',
      },
      {
        id: 'log-insurance',
        user_id: 'user-1',
        child_id: 'child-1',
        data_type: 'insurance',
        direction: 'pull',
        status: 'success',
        records_processed: 2,
        records_failed: 0,
        error_message: null,
        error_code: null,
        duration_ms: 1500,
        sync_metadata: {},
        started_at: '2026-03-12T10:20:00Z',
        completed_at: '2026-03-12T10:20:01Z',
        created_at: '2026-03-12T10:20:00Z',
      },
      {
        id: 'log-auth',
        user_id: 'user-1',
        child_id: 'child-1',
        data_type: 'auth_status',
        direction: 'pull',
        status: 'success',
        records_processed: 2,
        records_failed: 0,
        error_message: null,
        error_code: null,
        duration_ms: 1500,
        sync_metadata: {},
        started_at: '2026-03-12T10:30:00Z',
        completed_at: '2026-03-12T10:30:01Z',
        created_at: '2026-03-12T10:30:00Z',
      },
      {
        id: 'log-routines',
        user_id: 'user-1',
        child_id: 'child-1',
        data_type: 'routine_completions',
        direction: 'push',
        status: 'partial',
        records_processed: 3,
        records_failed: 1,
        error_message: 'One summary packet still needs retry',
        error_code: 'PARTIAL_EXPORT',
        duration_ms: 1400,
        sync_metadata: {},
        started_at: '2026-03-12T10:40:00Z',
        completed_at: '2026-03-12T10:40:01Z',
        created_at: '2026-03-12T10:40:00Z',
      },
    ], []);

    const summary = buildCentralReachClinicWorkflowSummary(jobs);

    expect(summary.state).toBe('needs_review');
    expect(summary.healthyLanes).toBeGreaterThanOrEqual(4);
    expect(summary.lanes.find((lane) => lane.lane === 'routine_completions')?.state).toBe('warning');
    expect(summary.lanes.find((lane) => lane.lane === 'home_programs')?.state).toBe('warning');
  });
});
