import React, { ReactNode, useEffect } from 'react';
import { useAminyStore } from '../lib/store';
import { logAuditEvent } from '../lib/audit-logger';
import { toast } from 'sonner';

export type UserRole = 'parent' | 'provider' | 'admin' | 'caregiver';

interface RoleGateProps {
    /**
     * Roles that are allowed to view this component's children.
     */
    allowedRoles: UserRole[];
    /**
     * The content to render if the user has permission.
     */
    children: ReactNode;
    /**
     * Optional content to render if the user does NOT have permission.
     * If omitted, nothing is rendered.
     */
    fallback?: ReactNode;
    /**
     * The resource being protected. Used for audit logging access violations.
     */
    resourceName: string;
}

/**
 * RoleGate
 * A declarative Role-Based Access Control (RBAC) wrapper component.
 * It enforces that only users with specific roles can access the wrapped content.
 * Any unauthorized access attempts are immediately logged to the HIPAA audit trail.
 */
export function RoleGate({ allowedRoles, children, fallback = null, resourceName }: RoleGateProps) {
    // In the current architecture, useAminyStore or a similar auth context holds user data.
    // We'll mock the active user role here, but ideally this reads from your secure session.
    // For the MVP, we assume the user is a 'parent' unless specified otherwise in the store.
    const userRole: UserRole = 'parent'; // TODO: Wire this to actual Supabase auth metadata
    const userId = 'current-user-id'; // TODO: Wire to useAminyStore().user?.id

    const hasAccess = allowedRoles.includes(userRole);

    useEffect(() => {
        // If the component mounts but the user doesn't have access, log a security event.
        if (!hasAccess) {
            logAuditEvent({
                userId,
                userRole: userRole as any,
                action: 'access_requested', // Using 'access_requested' as a proxy for an access attempt
                resourceType: 'settings', // Generic resource type for RBAC violations
                resourceId: resourceName,
                details: {
                    reason: 'RBAC Violation: User attempted to render protected component without required role.',
                    requiredRoles: allowedRoles,
                    actualRole: userRole
                },
                sessionId: 'session-' + Date.now(),
                success: false,
                errorMessage: 'Unauthorized access attempt'
            }).catch(console.error);

            console.warn(`[RBAC] Access denied for user ${userId} (${userRole}) to resource: ${resourceName}`);
        }
    }, [hasAccess, allowedRoles, userRole, userId, resourceName]);

    if (!hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
