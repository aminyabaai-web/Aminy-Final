import React, { ReactNode, useEffect, useState } from 'react';
import { useAminyStore } from '../lib/store';
import { supabase } from '../utils/supabase/client';
import { logAuditEvent, type AuditUserRole } from '../lib/audit-logger';
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
     * Optional content to render while the role is being resolved.
     * If omitted, nothing is rendered during loading.
     */
    loadingFallback?: ReactNode;
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
 *
 * The user's role is resolved from three sources in priority order:
 *   1. Supabase auth session user_metadata.role (set during signup or by admin)
 *   2. The Zustand store's user.tier mapped to a role (provider/admin tiers)
 *   3. Fallback: 'parent' (safest default for a family-facing app)
 *
 * The userId comes from the live Supabase session.
 */
export function RoleGate({
    allowedRoles,
    children,
    fallback = null,
    loadingFallback = null,
    resourceName,
}: RoleGateProps) {
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Pull role from Zustand store as a secondary/reactive source
    const storeUser = useAminyStore((s) => s.user);

    useEffect(() => {
        let cancelled = false;

        async function resolveRole() {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (cancelled) return;

                if (!session?.user) {
                    // No session - fall back to store or default
                    setUserId(storeUser?.id ?? null);
                    setUserRole(resolveRoleFromStore());
                    setIsLoading(false);
                    return;
                }

                const uid = session.user.id;
                setUserId(uid);

                // Priority 1: role from user_metadata (set by admin or during signup)
                const metadataRole = session.user.user_metadata?.role as UserRole | undefined;
                if (metadataRole && isValidRole(metadataRole)) {
                    setUserRole(metadataRole);
                    setIsLoading(false);
                    return;
                }

                // Priority 2: role from the profiles table (loaded by App.tsx auth listener)
                // Try to read it from the Supabase profiles table directly
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', uid)
                        .single();

                    if (!cancelled && profile?.role && isValidRole(profile.role as UserRole)) {
                        setUserRole(profile.role as UserRole);
                        setIsLoading(false);
                        return;
                    }
                } catch {
                    // Profile lookup failed, continue to fallback
                }

                // Priority 3: role from the Zustand store
                if (!cancelled) {
                    setUserRole(resolveRoleFromStore());
                    setIsLoading(false);
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn('[RoleGate] Error resolving role, defaulting to parent:', error);
                    setUserRole('parent');
                    setUserId(storeUser?.id ?? null);
                    setIsLoading(false);
                }
            }
        }

        resolveRole();

        // Listen for auth changes so RoleGate updates live
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (cancelled) return;
                if (session?.user) {
                    setUserId(session.user.id);
                    const metaRole = session.user.user_metadata?.role as UserRole | undefined;
                    if (metaRole && isValidRole(metaRole)) {
                        setUserRole(metaRole);
                    }
                    // If metadata doesn't have role, the effect above already set it
                } else {
                    setUserId(null);
                    setUserRole(resolveRoleFromStore());
                }
            }
        );

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, [storeUser?.id]); // Re-run if the store user changes

    /**
     * Derive a role from the Zustand store. The store doesn't have an explicit
     * 'role' field on UserProfile, so we default to 'parent'.
     * If App.tsx has set userData.role through the profiles table, that would
     * already be caught by the Supabase query above.
     */
    function resolveRoleFromStore(): UserRole {
        // The store's UserProfile doesn't carry a 'role' field in its type,
        // but App.tsx userData does. Default to 'parent'.
        return 'parent';
    }

    const hasAccess = userRole !== null && allowedRoles.includes(userRole);

    // Audit log unauthorized access attempts
    useEffect(() => {
        if (isLoading || userRole === null) return;

        if (!hasAccess) {
            logAuditEvent({
                userId: userId || 'anonymous',
                userRole: (userRole as AuditUserRole) || 'parent',
                action: 'access_requested',
                resourceType: 'settings',
                resourceId: resourceName,
                details: {
                    reason: 'RBAC Violation: User attempted to render protected component without required role.',
                    requiredRoles: allowedRoles,
                    actualRole: userRole,
                },
                sessionId: 'session-' + Date.now(),
                success: false,
                errorMessage: 'Unauthorized access attempt',
            }).catch(console.error);

            if (import.meta.env.DEV) {
                console.warn(
                    `[RBAC] Access denied for user ${userId} (${userRole}) to resource: ${resourceName}`
                );
            }
        }
    }, [isLoading, hasAccess, allowedRoles, userRole, userId, resourceName]);

    // While loading, show loading fallback (or nothing)
    if (isLoading) {
        return <>{loadingFallback}</>;
    }

    if (!hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * Type guard to validate a role string
 */
function isValidRole(role: string): role is UserRole {
    return ['parent', 'provider', 'admin', 'caregiver'].includes(role);
}
