import { useEffect, useState } from 'react';
import type { SyncStatus } from './product-truth';

const STORAGE_KEYS = {
  childProfile: 'aminy:sync:child-profile',
  dailyPlan: 'aminy:sync:daily-plan',
  aiMemory: 'aminy:sync:ai-memory',
  juniorProgress: 'aminy:sync:junior-progress',
  caregiverSummary: 'aminy:sync:caregiver-summary',
} as const;

export type CoreWorkflowSyncKey = keyof typeof STORAGE_KEYS;

export interface WorkflowSyncState {
  status: SyncStatus;
  updatedAt: string;
}

const SYNC_EVENT = 'aminy:workflow-sync';

export function setWorkflowSyncStatus(
  key: CoreWorkflowSyncKey,
  status: SyncStatus,
): void {
  if (typeof window === 'undefined') return;

  const payload: WorkflowSyncState = {
    status,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key, payload } }));
  } catch {
    // Ignore storage errors for sync-state metadata.
  }
}

export function getWorkflowSyncState(
  key: CoreWorkflowSyncKey,
): WorkflowSyncState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkflowSyncState>;
    if (!parsed.status || !parsed.updatedAt) return null;
    return {
      status: parsed.status,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function useWorkflowSyncState(
  key: CoreWorkflowSyncKey,
): WorkflowSyncState | null {
  const [state, setState] = useState<WorkflowSyncState | null>(() =>
    getWorkflowSyncState(key),
  );

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: CoreWorkflowSyncKey; payload: WorkflowSyncState }>;
      if (customEvent.detail?.key === key) {
        setState(customEvent.detail.payload);
      }
    };

    const handleStorage = () => {
      setState(getWorkflowSyncState(key));
    };

    window.addEventListener(SYNC_EVENT, handleUpdate as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SYNC_EVENT, handleUpdate as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [key]);

  return state;
}
