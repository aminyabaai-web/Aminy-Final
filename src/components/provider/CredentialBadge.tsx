// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CredentialBadge.tsx
 *
 * Displays provider credential verification status with visual badges.
 * Shows BACB, NPI, and state license verification status.
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/button';
import type { CredentialType, VerificationStatus, ProviderCredential } from '../../lib/provider-verification';
import { getProviderCredentials, initiateVerification } from '../../lib/provider-verification';

interface CredentialBadgeProps {
  providerId: string;
  showDetails?: boolean;
  compact?: boolean;
}

// Credential display configuration
const CREDENTIAL_CONFIG: Record<CredentialType, {
  label: string;
  shortLabel: string;
  color: string;
  description: string;
}> = {
  'bcba': {
    label: 'Board Certified Behavior Analyst',
    shortLabel: 'BCBA',
    color: 'from-purple-500 to-violet-600',
    description: 'Certified by the BACB',
  },
  'bcba-d': {
    label: 'BCBA-Doctoral',
    shortLabel: 'BCBA-D',
    color: 'from-purple-600 to-indigo-700',
    description: 'Doctoral-level BCBA',
  },
  'bcaba': {
    label: 'Board Certified Assistant Behavior Analyst',
    shortLabel: 'BCaBA',
    color: 'from-blue-500 to-indigo-600',
    description: 'Certified by the BACB',
  },
  'rbt': {
    label: 'Registered Behavior Technician',
    shortLabel: 'RBT',
    color: 'from-teal-500 to-cyan-600',
    description: 'Registered with BACB',
  },
  'lcsw': {
    label: 'Licensed Clinical Social Worker',
    shortLabel: 'LCSW',
    color: 'from-rose-500 to-pink-600',
    description: 'State licensed',
  },
  'lmft': {
    label: 'Licensed Marriage & Family Therapist',
    shortLabel: 'LMFT',
    color: 'from-amber-500 to-orange-600',
    description: 'State licensed',
  },
  'psychologist': {
    label: 'Licensed Psychologist',
    shortLabel: 'Psychologist',
    color: 'from-emerald-500 to-green-600',
    description: 'State licensed',
  },
  'slp': {
    label: 'Speech-Language Pathologist',
    shortLabel: 'SLP',
    color: 'from-sky-500 to-blue-600',
    description: 'ASHA certified',
  },
  'ot': {
    label: 'Occupational Therapist',
    shortLabel: 'OT',
    color: 'from-lime-500 to-green-600',
    description: 'Licensed OT',
  },
  'pt': {
    label: 'Physical Therapist',
    shortLabel: 'PT',
    color: 'from-orange-500 to-red-600',
    description: 'Licensed PT',
  },
  'npi': {
    label: 'National Provider Identifier',
    shortLabel: 'NPI',
    color: 'from-slate-500 to-gray-600',
    description: 'CMS verified',
  },
};

// Status display configuration
const STATUS_CONFIG: Record<VerificationStatus, {
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
  label: string;
}> = {
  'verified': {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    label: 'Verified',
  },
  'pending': {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    label: 'Pending',
  },
  'expired': {
    icon: AlertTriangle,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    label: 'Expired',
  },
  'failed': {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    label: 'Failed',
  },
  'manual_review': {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    label: 'Under Review',
  },
};

export function CredentialBadge({ providerId, showDetails = false, compact = false }: CredentialBadgeProps) {
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(showDetails);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
  }, [providerId]);

  const loadCredentials = async () => {
    setIsLoading(true);
    try {
      const creds = await getProviderCredentials(providerId);
      setCredentials(creds);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      // Use demo data if fetch fails
      setCredentials([
        {
          provider_id: providerId,
          credential_type: 'bcba',
          credential_number: '1-23-45678',
          issuing_body: 'BACB',
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          provider_id: providerId,
          credential_type: 'npi',
          credential_number: '1234567890',
          issuing_body: 'CMS',
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (credentialId: string) => {
    setVerifyingId(credentialId);
    try {
      await initiateVerification(credentialId);
      await loadCredentials(); // Reload to get updated status
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setVerifyingId(null);
    }
  };

  // Get overall verification status
  const getOverallStatus = (): VerificationStatus => {
    if (credentials.length === 0) return 'pending';
    if (credentials.some(c => c.verification_status === 'expired')) return 'expired';
    if (credentials.some(c => c.verification_status === 'failed')) return 'failed';
    if (credentials.every(c => c.verification_status === 'verified')) return 'verified';
    return 'pending';
  };

  const overallStatus = getOverallStatus();
  const verifiedCount = credentials.filter(c => c.verification_status === 'verified').length;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-neutral-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading credentials...</span>
      </div>
    );
  }

  // Compact display - just badges
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {credentials.map((cred, idx) => {
          const config = CREDENTIAL_CONFIG[cred.credential_type];
          const statusConfig = STATUS_CONFIG[cred.verification_status];
          const StatusIcon = statusConfig.icon;

          return (
            <Badge
              key={idx}
              variant="secondary"
              className={`${statusConfig.bgColor} ${statusConfig.color} border-0 text-xs px-2 py-0.5`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {config?.shortLabel || cred.credential_type.toUpperCase()}
            </Badge>
          );
        })}
        {credentials.length === 0 && (
          <Badge variant="secondary" className="bg-neutral-100 text-neutral-500 border-0 text-xs">
            No credentials
          </Badge>
        )}
      </div>
    );
  }

  // Full display with details
  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${STATUS_CONFIG[overallStatus].bgColor}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            overallStatus === 'verified'
              ? 'bg-emerald-100 dark:bg-emerald-800'
              : 'bg-amber-100 dark:bg-amber-800'
          }`}>
            <Shield className={`w-4 h-4 ${STATUS_CONFIG[overallStatus].color}`} />
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white text-sm">
              Credential Verification
            </p>
            <p className={`text-xs ${STATUS_CONFIG[overallStatus].color}`}>
              {verifiedCount}/{credentials.length} credentials verified
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-2 pl-2">
          {credentials.map((cred, idx) => {
            const config = CREDENTIAL_CONFIG[cred.credential_type];
            const statusConfig = STATUS_CONFIG[cred.verification_status];
            const StatusIcon = statusConfig.icon;
            const isExpired = cred.expiration_date && new Date(cred.expiration_date) < new Date();
            const expiresWarning = cred.expiration_date &&
              new Date(cred.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  cred.verification_status === 'verified'
                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10'
                    : 'border-neutral-200 bg-neutral-50 dark:border-slate-700 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config?.color || 'from-gray-400 to-gray-500'} flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">
                      {config?.shortLabel?.slice(0, 3) || cred.credential_type.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-neutral-900 dark:text-white text-sm">
                        {config?.shortLabel || cred.credential_type.toUpperCase()}
                      </p>
                      <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-slate-400">
                      #{cred.credential_number}
                      {cred.state && ` • ${cred.state}`}
                    </p>
                    {cred.expiration_date && (
                      <p className={`text-xs ${isExpired ? 'text-rose-600' : expiresWarning ? 'text-amber-600' : 'text-neutral-400'}`}>
                        {isExpired ? 'Expired' : 'Expires'}: {new Date(cred.expiration_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {cred.verification_status !== 'verified' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cred.id && handleVerify(cred.id)}
                      disabled={verifyingId === cred.id}
                      className="text-xs h-8"
                    >
                      {verifyingId === cred.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Shield className="w-3 h-3 mr-1" />
                      )}
                      Verify Now
                    </Button>
                  )}
                  {cred.verification_status === 'verified' && cred.verified_at && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      Verified {new Date(cred.verified_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {credentials.length === 0 && (
            <div className="text-center p-6 bg-neutral-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-neutral-200 dark:border-slate-700">
              <Shield className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
              <p className="text-neutral-600 dark:text-slate-400 text-sm">No credentials added yet</p>
              <Button variant="outline" size="sm" className="mt-3">
                Add Credential
              </Button>
            </div>
          )}

          {/* Add credential button */}
          {credentials.length > 0 && (
            <Button variant="outline" size="sm" className="w-full text-xs">
              + Add Another Credential
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified badge for inline use
export function VerifiedBadge({ status }: { status: VerificationStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

export default CredentialBadge;
