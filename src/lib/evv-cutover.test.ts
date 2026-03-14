import { describe, expect, it } from 'vitest';
import { getSampleEVVCycles, summarizeEVVCutover } from './evv-cutover';

describe('evv cutover summary', () => {
  it('marks sample cycles as parallel run when thresholds are not fully met', () => {
    const summary = summarizeEVVCutover(getSampleEVVCycles());
    expect(summary.state).toBe('parallel_run');
    expect(summary.cyclesCompleted).toBe(3);
    expect(summary.cleanCycles).toBe(2);
    expect(summary.cutoverBlockedReasons.length).toBeGreaterThan(0);
  });

  it('marks fully reconciled cycles as cutover ready', () => {
    const summary = summarizeEVVCutover([
      {
        id: '1',
        label: 'Cycle 1',
        systemOfRecord: 'spokchoice',
        exportedAt: '2026-03-01T00:00:00Z',
        payrollDate: '2026-03-02',
        recordsCompared: 100,
        discrepancies: {},
        accuracy: 99.8,
        criticalExceptions: 0,
      },
      {
        id: '2',
        label: 'Cycle 2',
        systemOfRecord: 'spokchoice',
        exportedAt: '2026-03-08T00:00:00Z',
        payrollDate: '2026-03-09',
        recordsCompared: 100,
        discrepancies: {},
        accuracy: 99.9,
        criticalExceptions: 0,
      },
      {
        id: '3',
        label: 'Cycle 3',
        systemOfRecord: 'dci',
        exportedAt: '2026-03-15T00:00:00Z',
        payrollDate: '2026-03-16',
        recordsCompared: 100,
        discrepancies: {},
        accuracy: 99.7,
        criticalExceptions: 0,
      },
    ]);

    expect(summary.state).toBe('cutover_ready');
    expect(summary.cutoverBlockedReasons).toHaveLength(0);
  });
});
