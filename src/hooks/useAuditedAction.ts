/**
 * useAuditedAction — HIPAA audit hook for PHI-handling screens
 *
 * Logs a `view` event on mount and provides helpers for action/export logging.
 * Drop this into any component that displays or manipulates PHI.
 *
 * Usage:
 *   const { logAction, logExport } = useAuditedAction('child_data', 'child-123');
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  logDataAccess,
  logDocumentExport,
  logAuditEvent,
  type AuditResourceType,
  type AuditAction,
  type AuditUserRole,
} from '../lib/audit-logger';
import { useAminyStore } from '../lib/store';

interface UseAuditedActionOptions {
  /** Skip the automatic view-on-mount log (default: false) */
  skipAutoLog?: boolean;
  /** Override detected user role */
  userRole?: AuditUserRole;
  /** Extra details to attach to every event from this hook */
  details?: Record<string, unknown>;
}

export function useAuditedAction(
  resourceType: AuditResourceType,
  resourceId?: string,
  options: UseAuditedActionOptions = {}
) {
  const { skipAutoLog = false, userRole: roleOverride, details: baseDetails } = options;
  const loggedRef = useRef(false);

  // Derive userId and role from store
  const userId = useAminyStore((s) => s.user?.id) ?? 'anonymous';
  const detectedRole: AuditUserRole = roleOverride ?? 'parent';

  // Log view on mount (once)
  useEffect(() => {
    if (skipAutoLog || loggedRef.current) return;
    loggedRef.current = true;

    logDataAccess(
      userId,
      detectedRole,
      resourceType,
      resourceId ?? 'screen',
      'view',
      { ...baseDetails, source: 'useAuditedAction' }
    );
  }, [userId, detectedRole, resourceType, resourceId, skipAutoLog]);

  /** Log an arbitrary action on this resource */
  const logAction = useCallback(
    (action: AuditAction, extra: Record<string, unknown> = {}) =>
      logAuditEvent({
        userId,
        userRole: detectedRole,
        action,
        resourceType,
        resourceId: resourceId ?? 'unknown',
        details: { ...baseDetails, ...extra },
        sessionId: '', // auto-populated by logAuditEvent via getSessionId()
        success: true,
      }),
    [userId, detectedRole, resourceType, resourceId, baseDetails]
  );

  /** Shorthand for document/report export events */
  const logExport = useCallback(
    (
      documentType: 'fhir_bundle' | 'provider_summary' | 'progress_report' | 'superbill',
      documentId: string,
      format: 'json' | 'pdf' | 'csv' = 'pdf'
    ) =>
      logDocumentExport(userId, detectedRole, resourceId ?? 'unknown', documentType, documentId, format),
    [userId, detectedRole, resourceId]
  );

  return { logAction, logExport } as const;
}
