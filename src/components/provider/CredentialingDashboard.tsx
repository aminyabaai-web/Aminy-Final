/**
 * CredentialingDashboard.tsx
 *
 * Comprehensive credentialing status dashboard for providers.
 * Shows payer enrollment statuses, CAQH attestation, NPI verification,
 * and an insurance panel matrix.
 *
 * Uses:
 * - CredentialingTracker from credentialing-engine.ts
 * - NPI verification from credential-verification.ts
 * - CAQH attestation check from credentialing-engine.ts
 * - Existing UI components (Card, Badge, Button, Progress)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Building2,
  FileText,
  Activity,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Search,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  CredentialingTracker,
  checkCAQHAttestationStatus,
  type CredentialingApplication,
  type CredentialingStatus,
  type CAQHAttestationStatus,
} from '../../lib/credentialing-engine';
import {
  verifyNPI,
  type VerificationResult,
} from '../../lib/credential-verification';

// ============================================================================
// Types
// ============================================================================

interface CredentialingDashboardProps {
  providerId: string;
  providerName?: string;
  npiNumber?: string;
  caqhNumber?: string;
  onBack?: () => void;
}

interface DashboardStats {
  credentialedPayers: number;
  pendingApplications: number;
  expiringSoon: number;
  actionRequired: number;
}

type SortField = 'payerName' | 'status' | 'effectiveDate' | 'expirationDate';
type SortDirection = 'asc' | 'desc';

// ============================================================================
// Helpers
// ============================================================================

const STATUS_CONFIG: Record<CredentialingStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}> = {
  'not-started': {
    label: 'Not Started',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: <Clock className="h-4 w-4 text-gray-400" />,
  },
  'documents-pending': {
    label: 'Docs Pending',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    icon: <FileText className="h-4 w-4 text-yellow-500" />,
  },
  'submitted': {
    label: 'Submitted',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: <Clock className="h-4 w-4 text-blue-500" />,
  },
  'under-review': {
    label: 'Under Review',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    icon: <Activity className="h-4 w-4 text-indigo-500" />,
  },
  'approved': {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
  },
  'denied': {
    label: 'Denied',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: <XCircle className="h-4 w-4 text-red-500" />,
  },
  'expired': {
    label: 'Expired',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  },
  'renewal-needed': {
    label: 'Renewal Needed',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    icon: <RefreshCw className="h-4 w-4 text-amber-500" />,
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getEnrollmentCompletionPercent(app: CredentialingApplication): number {
  const totalDocs = app.documentsRequired.length;
  if (totalDocs === 0) {
    // If no documents required, base it on status
    const statusWeights: Record<CredentialingStatus, number> = {
      'not-started': 0,
      'documents-pending': 25,
      'submitted': 50,
      'under-review': 75,
      'approved': 100,
      'denied': 0,
      'expired': 100,
      'renewal-needed': 90,
    };
    return statusWeights[app.status] ?? 0;
  }

  const uploadedDocs = app.documentsSubmitted.filter(d =>
    d.status !== 'rejected'
  ).length;
  const docProgress = (uploadedDocs / totalDocs) * 60; // 60% for documents

  // Remaining 40% for submission/review stages
  let stageProgress = 0;
  switch (app.status) {
    case 'submitted':
      stageProgress = 20;
      break;
    case 'under-review':
      stageProgress = 30;
      break;
    case 'approved':
      stageProgress = 40;
      break;
    default:
      stageProgress = 0;
  }

  return Math.min(100, Math.round(docProgress + stageProgress));
}

// ============================================================================
// Sub-components
// ============================================================================

/** Summary stat card */
function StatCard({ title, value, icon, color }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className={`p-4 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-gray-50">{icon}</div>
      </div>
    </Card>
  );
}

/** CAQH attestation status card */
function CAQHAttestationCard({ caqhStatus, loading }: {
  caqhStatus: CAQHAttestationStatus | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">CAQH ProView Attestation</h3>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Checking attestation status...</span>
        </div>
      </Card>
    );
  }

  if (!caqhStatus) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold">CAQH ProView Attestation</h3>
        </div>
        <p className="text-sm text-gray-500">No CAQH number configured. Add your CAQH ProView ID to track attestation.</p>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    current: 'text-green-700 bg-green-50',
    expired: 'text-red-700 bg-red-50',
    'not-attested': 'text-gray-700 bg-gray-100',
    'in-progress': 'text-blue-700 bg-blue-50',
  };

  const colorClass = statusColors[caqhStatus.status] ?? 'text-gray-700 bg-gray-100';
  const days = caqhStatus.daysUntilExpiration;
  const isUrgent = days !== null && days <= 30 && days > 0;
  const isExpired = days !== null && days <= 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">CAQH ProView Attestation</h3>
        </div>
        <Badge className={colorClass}>
          {caqhStatus.status === 'current' ? 'Current' :
           caqhStatus.status === 'expired' ? 'Expired' :
           caqhStatus.status === 'in-progress' ? 'In Progress' : 'Not Attested'}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">CAQH #</span>
          <span className="font-medium">{caqhStatus.caqhNumber}</span>
        </div>

        {caqhStatus.attestationDate && (
          <div className="flex justify-between">
            <span className="text-gray-500">Last Attested</span>
            <span className="font-medium">{formatDate(caqhStatus.attestationDate)}</span>
          </div>
        )}

        {caqhStatus.nextAttestationDue && (
          <div className="flex justify-between">
            <span className="text-gray-500">Next Due</span>
            <span className={`font-medium ${isExpired ? 'text-red-600' : isUrgent ? 'text-amber-600' : ''}`}>
              {formatDate(caqhStatus.nextAttestationDue)}
            </span>
          </div>
        )}

        {days !== null && (
          <div className="mt-2">
            {isExpired ? (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Attestation expired {Math.abs(days)} days ago. Re-attest now.</span>
              </div>
            ) : isUrgent ? (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">Expires in {days} days. Re-attest soon.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">{days} days until next attestation</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/** NPI verification status card */
function NPIVerificationCard({ npiResult, loading, npi }: {
  npiResult: VerificationResult | null;
  loading: boolean;
  npi: string | undefined;
}) {
  if (!npi) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold">NPI Verification</h3>
        </div>
        <p className="text-sm text-gray-500">No NPI number configured.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">NPI Verification</h3>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Verifying NPI #{npi}...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">NPI Verification</h3>
        </div>
        <Badge className={npiResult?.success ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}>
          {npiResult?.success ? 'Verified' : 'Not Verified'}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">NPI #</span>
          <span className="font-medium">{npi}</span>
        </div>

        {npiResult?.data?.name && (
          <div className="flex justify-between">
            <span className="text-gray-500">Registry Name</span>
            <span className="font-medium">{npiResult.data.name}</span>
          </div>
        )}

        {npiResult?.data?.status && (
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="font-medium">{npiResult.data.status}</span>
          </div>
        )}

        {npiResult?.data?.specializations && npiResult.data.specializations.length > 0 && (
          <div>
            <span className="text-gray-500 block mb-1">Taxonomy</span>
            <div className="flex flex-wrap gap-1">
              {npiResult.data.specializations.slice(0, 3).map((spec, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {npiResult?.error && (
          <div className="mt-2 p-2 bg-red-50 rounded-lg text-red-600 text-xs">
            {npiResult.error}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Single payer enrollment row (expandable) */
function EnrollmentRow({ app }: { app: CredentialingApplication }) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[app.status];
  const completionPct = getEnrollmentCompletionPercent(app);
  const expDays = daysUntil(app.expirationDate);
  const isExpiringSoon = expDays !== null && expDays > 0 && expDays <= 90;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-shrink-0">{config.icon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{app.payerName}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {app.payerType}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <Progress value={completionPct} className="h-1.5 flex-1" />
            <span className="text-xs text-gray-400 w-8 text-right">{completionPct}%</span>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          <Badge className={`${config.bgColor} ${config.color} text-xs`}>
            {config.label}
          </Badge>

          {isExpiringSoon && (
            <Badge className="bg-amber-50 text-amber-700 text-xs">
              {expDays}d
            </Badge>
          )}

          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t px-4 py-3 bg-gray-50 space-y-3 text-sm">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-500 text-xs">Submitted</span>
                  <p className="font-medium">{formatDate(app.submittedAt)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Effective Date</span>
                  <p className="font-medium">{formatDate(app.effectiveDate)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Expiration</span>
                  <p className={`font-medium ${isExpiringSoon ? 'text-amber-600' : ''}`}>
                    {formatDate(app.expirationDate)}
                    {expDays !== null && expDays > 0 && (
                      <span className="text-xs text-gray-400 ml-1">({expDays}d)</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">License</span>
                  <p className="font-medium">{app.licenseState} #{app.licenseNumber}</p>
                </div>
              </div>

              {/* Documents */}
              {app.documentsRequired.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Documents</p>
                  <div className="space-y-1">
                    {app.documentsRequired.map(doc => {
                      const submitted = app.documentsSubmitted.find(d => d.type === doc.type);
                      return (
                        <div key={doc.id} className="flex items-center gap-2 text-xs">
                          {submitted ? (
                            submitted.status === 'rejected' ? (
                              <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                            ) : (
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                            )
                          ) : (
                            <Clock className="h-3 w-3 text-gray-300 flex-shrink-0" />
                          )}
                          <span className={submitted ? '' : 'text-gray-400'}>{doc.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent timeline events */}
              {app.timeline.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Recent Activity</p>
                  <div className="space-y-1">
                    {app.timeline.slice(-3).reverse().map(event => (
                      <div key={event.id} className="text-xs text-gray-600 flex gap-2">
                        <span className="text-gray-400 flex-shrink-0">
                          {formatDate(event.timestamp)}
                        </span>
                        <span>{event.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Insurance Panel Matrix */
function InsurancePanelMatrix({ applications }: {
  applications: CredentialingApplication[];
}) {
  if (applications.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">Insurance Panel Matrix</h3>
        </div>
        <p className="text-sm text-gray-500">No payer enrollments found. Start credentialing to build your panel.</p>
      </Card>
    );
  }

  // Group by payer type
  const grouped: Record<string, CredentialingApplication[]> = {};
  for (const app of applications) {
    const type = app.payerType;
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(app);
  }

  const typeLabels: Record<string, string> = {
    medicaid: 'Medicaid',
    chip: 'CHIP',
    private: 'Private Insurance',
    tricare: 'TRICARE',
    'workers-comp': "Workers' Comp",
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold">Insurance Panel Matrix</h3>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([type, apps]) => (
          <div key={type}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {typeLabels[type] ?? type}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {apps.map(app => {
                const config = STATUS_CONFIG[app.status];
                return (
                  <div
                    key={app.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${config.bgColor}`}
                  >
                    {config.icon}
                    <span className={`font-medium truncate ${config.color}`}>
                      {app.payerName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="mt-4 pt-3 border-t flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>{applications.filter(a => a.status === 'approved').length} Active</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-blue-500" />
          <span>{applications.filter(a => ['submitted', 'under-review', 'documents-pending'].includes(a.status)).length} Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          <span>{applications.filter(a => a.status === 'expired' || a.status === 'renewal-needed').length} Action</span>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CredentialingDashboard({
  providerId,
  providerName,
  npiNumber,
  caqhNumber,
  onBack,
}: CredentialingDashboardProps) {
  // State
  const [applications, setApplications] = useState<CredentialingApplication[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    credentialedPayers: 0,
    pendingApplications: 0,
    expiringSoon: 0,
    actionRequired: 0,
  });
  const [caqhStatus, setCaqhStatus] = useState<CAQHAttestationStatus | null>(null);
  const [npiResult, setNpiResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [npiLoading, setNpiLoading] = useState(false);
  const [caqhLoading, setCaqhLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<CredentialingStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('payerName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [error, setError] = useState<string | null>(null);

  // Initialize tracker
  const tracker = React.useMemo(() => new CredentialingTracker(), []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [apps, dashStats] = await Promise.all([
        tracker.getProviderCredentialingStatus(providerId),
        tracker.getDashboardStats(providerId),
      ]);

      setApplications(apps);
      setStats(dashStats);
    } catch (err) {
      console.error('Failed to load credentialing data:', err);
      setError('Failed to load credentialing data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [providerId, tracker]);

  // NPI verification
  const loadNPI = useCallback(async () => {
    if (!npiNumber) return;
    setNpiLoading(true);
    try {
      const result = await verifyNPI(npiNumber);
      setNpiResult(result);
    } catch (err) {
      console.error('NPI verification failed:', err);
    } finally {
      setNpiLoading(false);
    }
  }, [npiNumber]);

  // CAQH attestation check
  const loadCAQH = useCallback(async () => {
    if (!caqhNumber) return;
    setCaqhLoading(true);
    try {
      const status = await checkCAQHAttestationStatus(caqhNumber);
      setCaqhStatus(status);
    } catch (err) {
      console.error('CAQH attestation check failed:', err);
    } finally {
      setCaqhLoading(false);
    }
  }, [caqhNumber]);

  useEffect(() => {
    loadData();
    loadNPI();
    loadCAQH();
  }, [loadData, loadNPI, loadCAQH]);

  // Filter & sort applications
  const filteredApplications = React.useMemo(() => {
    let filtered = applications;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    // Text search
    if (searchFilter.trim()) {
      const query = searchFilter.toLowerCase();
      filtered = filtered.filter(a =>
        a.payerName.toLowerCase().includes(query) ||
        a.payerType.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'payerName':
          cmp = a.payerName.localeCompare(b.payerName);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'effectiveDate':
          cmp = (a.effectiveDate ?? '').localeCompare(b.effectiveDate ?? '');
          break;
        case 'expirationDate':
          cmp = (a.expirationDate ?? '').localeCompare(b.expirationDate ?? '');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [applications, statusFilter, searchFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">Credentialing Dashboard</h1>
            {providerName && (
              <p className="text-sm text-gray-500 truncate">{providerName}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { loadData(); loadNPI(); loadCAQH(); }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-7 bg-gray-200 rounded w-12" />
                </Card>
              ))}
            </div>
            <Card className="p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded" />
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title="Credentialed Payers"
                value={stats.credentialedPayers}
                icon={<CheckCircle className="h-5 w-5 text-green-500" />}
                color="border-green-400"
              />
              <StatCard
                title="Pending Applications"
                value={stats.pendingApplications}
                icon={<Clock className="h-5 w-5 text-blue-500" />}
                color="border-blue-400"
              />
              <StatCard
                title="Expiring Soon"
                value={stats.expiringSoon}
                icon={<Calendar className="h-5 w-5 text-amber-500" />}
                color="border-amber-400"
              />
              <StatCard
                title="Action Required"
                value={stats.actionRequired}
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                color="border-red-400"
              />
            </div>

            {/* NPI + CAQH cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <NPIVerificationCard
                npiResult={npiResult}
                loading={npiLoading}
                npi={npiNumber}
              />
              <CAQHAttestationCard
                caqhStatus={caqhStatus}
                loading={caqhLoading}
              />
            </div>

            {/* Payer Enrollments */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Payer Enrollments
                  <Badge variant="outline" className="text-xs">{applications.length}</Badge>
                </h3>
              </div>

              {/* Filters */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search payers..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as CredentialingStatus | 'all')}
                  className="text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="under-review">Under Review</option>
                  <option value="submitted">Submitted</option>
                  <option value="documents-pending">Docs Pending</option>
                  <option value="not-started">Not Started</option>
                  <option value="denied">Denied</option>
                  <option value="expired">Expired</option>
                  <option value="renewal-needed">Renewal Needed</option>
                </select>
              </div>

              {/* Sort controls */}
              <div className="flex gap-2 mb-3 text-xs">
                <span className="text-gray-400">Sort by:</span>
                {([
                  ['payerName', 'Name'],
                  ['status', 'Status'],
                  ['effectiveDate', 'Effective'],
                  ['expirationDate', 'Expires'],
                ] as [SortField, string][]).map(([field, label]) => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`px-2 py-0.5 rounded ${sortField === field ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {label}
                    {sortField === field && (sortDirection === 'asc' ? ' \u2191' : ' \u2193')}
                  </button>
                ))}
              </div>

              {/* Enrollment list */}
              {filteredApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {applications.length === 0
                      ? 'No payer enrollments yet. Start credentialing to see progress here.'
                      : 'No enrollments match your filters.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredApplications.map(app => (
                    <EnrollmentRow key={app.id} app={app} />
                  ))}
                </div>
              )}
            </Card>

            {/* Insurance Panel Matrix */}
            <InsurancePanelMatrix applications={applications} />
          </>
        )}
      </div>
    </div>
  );
}
