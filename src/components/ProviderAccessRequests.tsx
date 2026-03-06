/**
 * Provider Access Requests Component
 *
 * Allows parents to review and approve/deny provider access requests
 * Inspired by One Medical's clean access management UI
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  AlertCircle,
  FileText,
  Eye,
  Download,
  Bell,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { logAccessDecision, logAccessRequest } from '../lib/audit-logger';
import { supabase } from '../utils/supabase/client';

// Types
interface Provider {
  id: string;
  name: string;
  credentials: string; // e.g., "BCBA, LBA"
  specialty: string;
  organization?: string;
  photoUrl?: string;
  verifiedAt?: string;
}

interface AccessRequest {
  id: string;
  provider: Provider;
  childId: string;
  childName: string;
  requestedLevel: 'summary' | 'full' | 'clinical';
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  expiresAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface ActiveAccess {
  id: string;
  provider: Provider;
  childId: string;
  childName: string;
  accessLevel: 'summary' | 'full' | 'clinical';
  grantedAt: string;
  expiresAt: string;
  lastAccessedAt?: string;
  accessCount: number;
}

// Access level descriptions
const ACCESS_LEVELS = {
  summary: {
    label: 'Summary',
    description: 'Basic overview, goals, and recent progress',
    icon: Eye,
    color: 'text-blue-600 bg-blue-50'
  },
  full: {
    label: 'Full Access',
    description: 'All observations, care plan details, and vault documents',
    icon: FileText,
    color: 'text-purple-600 bg-purple-50'
  },
  clinical: {
    label: 'Clinical',
    description: 'Full access plus FHIR export and clinical reports',
    icon: Download,
    color: 'text-teal-600 bg-teal-50'
  }
};

// Mock data for demonstration
const MOCK_REQUESTS: AccessRequest[] = [
  {
    id: 'req_1',
    provider: {
      id: 'prov_1',
      name: 'Dr. Sarah Johnson',
      credentials: 'BCBA, LBA',
      specialty: 'Applied Behavior Analysis',
      organization: 'Bright Futures ABA',
      verifiedAt: '2024-01-15'
    },
    childId: 'child_1',
    childName: 'Max',
    requestedLevel: 'full',
    reason: 'Preparing for our upcoming assessment and need to review historical data to create an updated behavior intervention plan.',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: 'req_2',
    provider: {
      id: 'prov_2',
      name: 'Emily Chen',
      credentials: 'MS, CCC-SLP',
      specialty: 'Speech-Language Pathology',
      organization: 'ABC Therapy Center'
    },
    childId: 'child_1',
    childName: 'Max',
    requestedLevel: 'summary',
    reason: 'Initial evaluation - need to review communication goals and current progress.',
    status: 'pending',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  }
];

const MOCK_ACTIVE_ACCESS: ActiveAccess[] = [
  {
    id: 'access_1',
    provider: {
      id: 'prov_3',
      name: 'Dr. Michael Roberts',
      credentials: 'PhD, BCBA-D',
      specialty: 'Developmental Psychology',
      organization: 'Developmental Pediatrics Associates',
      verifiedAt: '2023-11-01'
    },
    childId: 'child_1',
    childName: 'Max',
    accessLevel: 'clinical',
    grantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    lastAccessedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    accessCount: 12
  }
];

interface ProviderAccessRequestsProps {
  userId: string;
  onClose?: () => void;
  onBack?: () => void;
}

export function ProviderAccessRequests({ userId, onClose }: ProviderAccessRequestsProps) {
  const [requests, setRequests] = useState<AccessRequest[]>(MOCK_REQUESTS);
  const [activeAccess, setActiveAccess] = useState<ActiveAccess[]>(MOCK_ACTIVE_ACCESS);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'active'>('pending');
  const [loading, setLoading] = useState(true);

  // Load access requests and active access from Supabase, fall back to mocks
  useEffect(() => {
    async function loadAccessData() {
      try {
        setLoading(true);

        // Fetch pending/recent requests
        const { data: reqData, error: reqErr } = await supabase
          .from('provider_access_requests')
          .select(`
            id,
            child_id,
            child_name,
            requested_level,
            reason,
            status,
            created_at,
            expires_at,
            resolved_at,
            resolved_by,
            provider:provider_profiles(
              id,
              full_name,
              credentials,
              specialty,
              organization,
              photo_url,
              verified_at
            )
          `)
          .eq('parent_user_id', userId)
          .order('created_at', { ascending: false });

        if (reqErr) throw reqErr;

        if (reqData && reqData.length > 0) {
          setRequests(reqData.map((r: Record<string, unknown>) => {
            const prov = r.provider as Record<string, unknown> | null;
            return {
              id: r.id as string,
              provider: {
                id: (prov?.id as string) || 'unknown',
                name: (prov?.full_name as string) || 'Provider',
                credentials: (prov?.credentials as string) || '',
                specialty: (prov?.specialty as string) || '',
                organization: prov?.organization as string | undefined,
                photoUrl: prov?.photo_url as string | undefined,
                verifiedAt: prov?.verified_at as string | undefined,
              },
              childId: r.child_id as string,
              childName: (r.child_name as string) || '',
              requestedLevel: (r.requested_level as AccessRequest['requestedLevel']) || 'summary',
              reason: (r.reason as string) || '',
              status: (r.status as AccessRequest['status']) || 'pending',
              createdAt: r.created_at as string,
              expiresAt: r.expires_at as string | undefined,
              resolvedAt: r.resolved_at as string | undefined,
              resolvedBy: r.resolved_by as string | undefined,
            };
          }));
        }
        // If no data, MOCK_REQUESTS remains as initial state

        // Fetch active access grants
        const { data: accessData, error: accessErr } = await supabase
          .from('provider_active_access')
          .select(`
            id,
            child_id,
            child_name,
            access_level,
            granted_at,
            expires_at,
            last_accessed_at,
            access_count,
            provider:provider_profiles(
              id,
              full_name,
              credentials,
              specialty,
              organization,
              photo_url,
              verified_at
            )
          `)
          .eq('parent_user_id', userId)
          .gte('expires_at', new Date().toISOString());

        if (accessErr) throw accessErr;

        if (accessData && accessData.length > 0) {
          setActiveAccess(accessData.map((a: Record<string, unknown>) => {
            const prov = a.provider as Record<string, unknown> | null;
            return {
              id: a.id as string,
              provider: {
                id: (prov?.id as string) || 'unknown',
                name: (prov?.full_name as string) || 'Provider',
                credentials: (prov?.credentials as string) || '',
                specialty: (prov?.specialty as string) || '',
                organization: prov?.organization as string | undefined,
                photoUrl: prov?.photo_url as string | undefined,
                verifiedAt: prov?.verified_at as string | undefined,
              },
              childId: a.child_id as string,
              childName: (a.child_name as string) || '',
              accessLevel: (a.access_level as ActiveAccess['accessLevel']) || 'summary',
              grantedAt: a.granted_at as string,
              expiresAt: a.expires_at as string,
              lastAccessedAt: a.last_accessed_at as string | undefined,
              accessCount: (a.access_count as number) || 0,
            };
          }));
        }
        // If no data, MOCK_ACTIVE_ACCESS remains as initial state
      } catch (err) {
        console.warn('ProviderAccessRequests: Failed to load from Supabase, using mock data', err);
        // Mocks remain as initial values
      } finally {
        setLoading(false);
      }
    }

    loadAccessData();
  }, [userId]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // Handle approve request
  const handleApprove = async (request: AccessRequest, duration: number = 30) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    // Log the approval
    await logAccessDecision(
      userId,
      request.provider.id,
      request.childId,
      request.id,
      'granted',
      request.requestedLevel
    );

    // Update request status
    setRequests(prev =>
      prev.map(r =>
        r.id === request.id
          ? { ...r, status: 'approved' as const, resolvedAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() }
          : r
      )
    );

    // Add to active access
    setActiveAccess(prev => [
      ...prev,
      {
        id: `access_${Date.now()}`,
        provider: request.provider,
        childId: request.childId,
        childName: request.childName,
        accessLevel: request.requestedLevel,
        grantedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        accessCount: 0
      }
    ]);

    setSelectedRequest(null);
  };

  // Handle deny request
  const handleDeny = async (request: AccessRequest) => {
    await logAccessDecision(
      userId,
      request.provider.id,
      request.childId,
      request.id,
      'denied'
    );

    setRequests(prev =>
      prev.map(r =>
        r.id === request.id
          ? { ...r, status: 'denied' as const, resolvedAt: new Date().toISOString() }
          : r
      )
    );

    setSelectedRequest(null);
  };

  // Handle revoke access
  const handleRevoke = async (accessId: string) => {
    const access = activeAccess.find(a => a.id === accessId);
    if (!access) return;

    await logAccessDecision(
      userId,
      access.provider.id,
      access.childId,
      accessId,
      'denied'
    );

    setActiveAccess(prev => prev.filter(a => a.id !== accessId));
    setShowRevokeConfirm(null);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Access Requests
              </h1>
              {pendingCount > 0 && (
                <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
                  {pendingCount} pending request{pendingCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setTab('pending')}
              className={`
                flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all min-h-[44px]
                ${tab === 'pending'
                  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                }
              `}
            >
              Pending
              {pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-teal-500 text-white text-xs rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('active')}
              className={`
                flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all min-h-[44px]
                ${tab === 'active'
                  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                }
              `}
            >
              Active Access
              <span className="ml-2 text-xs opacity-60">({activeAccess.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {tab === 'pending' ? (
          <>
            {requests.filter(r => r.status === 'pending').length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No pending requests
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  When a provider requests access to your child's data, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {requests
                  .filter(r => r.status === 'pending')
                  .map(request => (
                    <Card
                      key={request.id}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Provider Avatar */}
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                          {request.provider.photoUrl ? (
                            <img
                              src={request.provider.photoUrl}
                              alt={request.provider.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-white" />
                          )}
                        </div>

                        {/* Request Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {request.provider.name}
                            </h3>
                            {request.provider.verifiedAt && (
                              <Shield className="w-4 h-4 text-teal-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {request.provider.credentials} • {request.provider.specialty}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                            "{request.reason}"
                          </p>

                          <div className="flex items-center gap-3 sm:gap-4 mt-3">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${ACCESS_LEVELS[request.requestedLevel].color}`}>
                              {React.createElement(ACCESS_LEVELS[request.requestedLevel].icon, { className: 'w-3 h-3' })}
                              {ACCESS_LEVELS[request.requestedLevel].label}
                            </div>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(request.createdAt)}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </>
        ) : (
          <>
            {activeAccess.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No active access grants
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Approved provider access will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {activeAccess.map(access => (
                  <Card key={access.id} className="p-3 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Provider Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>

                      {/* Access Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {access.provider.name}
                          </h3>
                          {access.provider.verifiedAt && (
                            <Shield className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {access.provider.credentials}
                        </p>

                        <div className="flex items-center gap-3 sm:gap-4 mt-3">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${ACCESS_LEVELS[access.accessLevel].color}`}>
                            {React.createElement(ACCESS_LEVELS[access.accessLevel].icon, { className: 'w-3 h-3' })}
                            {ACCESS_LEVELS[access.accessLevel].label}
                          </div>
                          <span className="text-xs text-gray-400">
                            {access.accessCount} views
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                          <span className="text-xs text-gray-500">
                            Expires {new Date(access.expiresAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => setShowRevokeConfirm(access.id)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium min-h-[32px] px-3 flex items-center"
                          >
                            Revoke Access
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Revoke Confirmation */}
                    {showRevokeConfirm === access.id && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                          Are you sure you want to revoke {access.provider.name}'s access to {access.childName}'s data?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleRevoke(access.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white min-h-[44px]"
                          >
                            Yes, Revoke
                          </Button>
                          <Button
                            onClick={() => setShowRevokeConfirm(null)}
                            variant="outline"
                            className="flex-1 min-h-[44px]"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Review Request
                </h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-3 sm:space-y-4 sm:space-y-6">
              {/* Provider Info */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedRequest.provider.name}
                    </h3>
                    {selectedRequest.provider.verifiedAt && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full">
                        <Shield className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{selectedRequest.provider.credentials}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.provider.specialty}</p>
                  {selectedRequest.provider.organization && (
                    <p className="text-sm text-gray-400 mt-1">{selectedRequest.provider.organization}</p>
                  )}
                </div>
              </div>

              {/* Request Details */}
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Request
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  "{selectedRequest.reason}"
                </p>
              </div>

              {/* Access Level */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Requested Access Level
                </h4>
                <div className={`p-4 rounded-xl border-2 ${ACCESS_LEVELS[selectedRequest.requestedLevel].color} border-current/20`}>
                  <div className="flex items-center gap-3">
                    {React.createElement(ACCESS_LEVELS[selectedRequest.requestedLevel].icon, { className: 'w-5 h-5' })}
                    <div>
                      <div className="font-medium">{ACCESS_LEVELS[selectedRequest.requestedLevel].label}</div>
                      <div className="text-sm opacity-80">{ACCESS_LEVELS[selectedRequest.requestedLevel].description}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* What This Includes */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  This provider will be able to see:
                </h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-500" />
                    {selectedRequest.childName}'s profile and basic info
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-500" />
                    Current goals and progress
                  </li>
                  {(selectedRequest.requestedLevel === 'full' || selectedRequest.requestedLevel === 'clinical') && (
                    <>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-500" />
                        Care plan details
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-500" />
                        Vault documents
                      </li>
                    </>
                  )}
                  {selectedRequest.requestedLevel === 'clinical' && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-500" />
                      FHIR data export
                    </li>
                  )}
                </ul>
              </div>

              {/* Duration Selection */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Access Duration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { days: 7, label: '1 Week' },
                    { days: 30, label: '30 Days' },
                    { days: 90, label: '90 Days' }
                  ].map(({ days, label }) => (
                    <button
                      key={days}
                      onClick={() => handleApprove(selectedRequest, days)}
                      className="py-3 px-4 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-sm font-medium transition-colors min-h-[48px]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <Button
                  onClick={() => handleDeny(selectedRequest)}
                  variant="outline"
                  className="flex-1 min-h-[48px] border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deny
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest, 30)}
                  className="flex-1 min-h-[48px] bg-teal-600 hover:bg-teal-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve (30 days)
                </Button>
              </div>
            </div>

            {/* Safe area */}
            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProviderAccessRequests;
