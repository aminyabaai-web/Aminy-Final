/**
 * Costs & Coverage — Parent-Facing Insurance & Expense Tracker
 *
 * Helps parents understand and manage the financial side of their child's care:
 * - Track out-of-pocket spending across providers
 * - View what insurance has covered/denied (EOB-style)
 * - Understand benefits and remaining coverage
 * - Generate superbills for self-pay reimbursement
 *
 * Note: Provider-facing billing (claims submission, EDI 837P, clearinghouse)
 * lives in the Provider Portal / BCBA dashboard, not here.
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  ArrowLeft,
  DollarSign,
  Receipt,
  Heart,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  HelpCircle,
  ChevronRight,
  Calendar,
  CreditCard,
  PiggyBank,
  FileText,
  AlertCircle,
  Info,
  Building2,
  Download,
  Inbox,
  Loader2,
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuditedAction } from '../hooks/useAuditedAction';
import {
  getDenialRecordsForPatient,
  type DenialRecord,
  type DenialCategory,
} from '../lib/denial-management';

const SuperbillGenerator = lazy(() => import('./SuperbillGenerator'));

// ============================================================================
// Types
// ============================================================================

interface ClaimsDashboardProps {
  userId: string;
  childId: string;
  childName: string;
  childDOB?: string;
  onBack: () => void;
}

type TabId = 'spending' | 'coverage' | 'superbill';

interface ExpenseRecord {
  id: string;
  date: string;
  provider: string;
  service: string;
  totalCharged: number;
  insurancePaid: number;
  youPaid: number;
  status: 'covered' | 'partial' | 'denied' | 'pending' | 'self_pay';
}

interface CoverageBenefit {
  category: string;
  description: string;
  annualLimit: string;
  used: number;
  remaining: number;
  unit: 'hours' | 'visits' | 'dollars';
  authRequired: boolean;
}

// ============================================================================
// Default Benefits (used as initial values until user configures their own)
// ============================================================================

const DEFAULT_BENEFITS: CoverageBenefit[] = [
  {
    category: 'ABA Therapy',
    description: 'Applied Behavior Analysis sessions',
    annualLimit: '1,040 hours/year',
    used: 0,
    remaining: 1040,
    unit: 'hours',
    authRequired: true,
  },
  {
    category: 'Speech Therapy',
    description: 'Speech-language pathology',
    annualLimit: '60 visits/year',
    used: 0,
    remaining: 60,
    unit: 'visits',
    authRequired: false,
  },
  {
    category: 'Occupational Therapy',
    description: 'OT evaluation and treatment',
    annualLimit: '60 visits/year',
    used: 0,
    remaining: 60,
    unit: 'visits',
    authRequired: false,
  },
  {
    category: 'Mental Health',
    description: 'Psychotherapy and counseling',
    annualLimit: '52 visits/year',
    used: 0,
    remaining: 52,
    unit: 'visits',
    authRequired: false,
  },
  {
    category: 'Developmental Assessment',
    description: 'Autism assessment and testing',
    annualLimit: '$5,000/year',
    used: 0,
    remaining: 5000,
    unit: 'dollars',
    authRequired: true,
  },
];

// ============================================================================
// Supabase → ExpenseRecord mapping helpers
// ============================================================================

/** Map a superbill status string to the ExpenseRecord status enum */
function mapSuperbillStatus(
  status: string | null | undefined
): ExpenseRecord['status'] {
  switch (status) {
    case 'submitted':
      return 'pending';
    case 'downloaded':
    case 'generated':
      return 'self_pay';
    default:
      return 'self_pay';
  }
}

/** Map a raw Supabase superbill row to the component's ExpenseRecord */
function mapSuperbillToExpense(sb: Record<string, any>): ExpenseRecord {
  const totalBilled = Number(sb.total_billed) || 0;
  const amountPaid = Number(sb.amount_paid) || 0;

  // In the current cash-pay model, amount_paid = what the patient paid.
  // Insurance coverage = total_billed - amount_paid (0 for self-pay).
  // If amount_paid >= total_billed, it's fully self-pay (no insurance).
  const insurancePaid = Math.max(0, totalBilled - amountPaid);
  const youPaid = amountPaid;

  return {
    id: sb.id,
    date: sb.date_of_service ?? sb.generated_at?.split('T')[0] ?? '',
    provider: sb.provider_name
      ? `${sb.provider_name}${sb.provider_credentials ? `, ${sb.provider_credentials}` : ''}`
      : 'Provider',
    service:
      (Array.isArray(sb.line_items) && sb.line_items[0]?.description) ||
      'Therapy Session',
    totalCharged: totalBilled,
    insurancePaid,
    youPaid,
    status: mapSuperbillStatus(sb.status),
  };
}

// ============================================================================
// localStorage helpers for benefits (no Supabase table yet)
// ============================================================================

const BENEFITS_STORAGE_KEY = 'aminy-coverage-benefits';

function loadBenefitsFromStorage(userId: string): CoverageBenefit[] {
  try {
    const raw = localStorage.getItem(`${BENEFITS_STORAGE_KEY}-${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Corrupted storage — fall through to defaults
  }
  return DEFAULT_BENEFITS;
}

function saveBenefitsToStorage(userId: string, benefits: CoverageBenefit[]) {
  try {
    localStorage.setItem(
      `${BENEFITS_STORAGE_KEY}-${userId}`,
      JSON.stringify(benefits)
    );
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getStatusConfig(status: ExpenseRecord['status']) {
  switch (status) {
    case 'covered':
      return { icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, label: 'Covered', color: 'bg-emerald-50 text-emerald-700' };
    case 'partial':
      return { icon: <CheckCircle className="w-4 h-4 text-amber-500" />, label: 'Partial', color: 'bg-amber-50 text-amber-700' };
    case 'denied':
      return { icon: <XCircle className="w-4 h-4 text-red-500" />, label: 'Denied', color: 'bg-red-50 text-red-700' };
    case 'pending':
      return { icon: <Clock className="w-4 h-4 text-blue-500" />, label: 'Pending', color: 'bg-blue-50 text-blue-700' };
    case 'self_pay':
      return { icon: <CreditCard className="w-4 h-4 text-gray-500" />, label: 'Self-Pay', color: 'bg-gray-50 text-gray-700' };
  }
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-lg p-3 bg-gray-50">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-gray-100 rounded-lg p-3 mb-3">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyExpenseState() {
  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-4">
        <Inbox className="w-6 h-6 text-teal-500" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">
        No expenses tracked yet
      </h3>
      <p className="text-xs text-gray-500 max-w-[260px] mx-auto leading-relaxed">
        After your first telehealth session, your superbill will appear here
        automatically. You can also generate one from the Superbill tab.
      </p>
    </div>
  );
}

// ============================================================================
// Spending Tab
// ============================================================================

function SpendingTab({ expenses, childName, loading, denials = [], loadingDenials = false }: {
  expenses: ExpenseRecord[];
  childName: string;
  loading: boolean;
  denials?: DenialRecord[];
  loadingDenials?: boolean;
}) {
  if (loading) return <LoadingSkeleton />;
  if (expenses.length === 0 && denials.length === 0) return <EmptyExpenseState />;
  const totalCharged = expenses.reduce((s, e) => s + e.totalCharged, 0);
  const insurancePaid = expenses.reduce((s, e) => s + e.insurancePaid, 0);
  const youPaid = expenses.reduce((s, e) => s + e.youPaid, 0);
  const pendingAmount = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.totalCharged, 0);

  // Denial aggregations
  const activeDenials = denials.filter(d => d.status !== 'resolved' && d.status !== 'written-off');
  const totalDeniedAmount = activeDenials.reduce((s, d) => s + d.deniedAmount, 0);

  // Human-readable category labels
  const categoryLabels: Record<DenialCategory, string> = {
    'eligibility': 'Eligibility Issue',
    'authorization': 'Missing Authorization',
    'coding': 'Coding Error',
    'timely-filing': 'Filed Too Late',
    'duplicate': 'Duplicate Claim',
    'medical-necessity': 'Medical Necessity',
    'bundling': 'Bundling Issue',
    'coordination-of-benefits': 'Benefits Coordination',
    'missing-info': 'Missing Information',
    'contractual': 'Contractual Adjustment',
    'patient-responsibility': 'Patient Responsibility',
    'other': 'Other',
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-teal-600" />
          This Year&apos;s Summary
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-600 font-medium">Insurance Covered</p>
            <p className="text-lg font-bold text-emerald-800">{formatCurrency(insurancePaid)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-xs text-orange-600 font-medium">Your Out-of-Pocket</p>
            <p className="text-lg font-bold text-orange-800">{formatCurrency(youPaid)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium">Pending Claims</p>
            <p className="text-lg font-bold text-blue-800">{formatCurrency(pendingAmount)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Total Billed</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(totalCharged)}</p>
          </div>
        </div>
      </div>

      {/* ── Denial Alerts ──────────────────────────────────────────────── */}
      {!loadingDenials && activeDenials.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Denied Claims ({activeDenials.length})
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            {formatCurrency(totalDeniedAmount)} in claims need attention
          </p>

          <div className="space-y-3">
            {activeDenials.slice(0, 5).map(denial => {
              const daysUntilDeadline = denial.appealDeadline
                ? Math.ceil((new Date(denial.appealDeadline).getTime() - Date.now()) / 86400000)
                : null;
              const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 14;
              const topAction = denial.suggestedActions?.[0];

              return (
                <div key={denial.id} className="border border-red-100 rounded-lg p-3 bg-red-50/40">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {denial.payerName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Service: {denial.dateOfService} &middot; {categoryLabels[denial.category] || denial.category}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-700 ml-2 flex-shrink-0">
                      {formatCurrency(denial.deniedAmount)}
                    </span>
                  </div>

                  {/* Appeal deadline warning */}
                  {daysUntilDeadline !== null && (
                    <div className={`flex items-center gap-1.5 text-xs mt-1.5 ${
                      isUrgent ? 'text-red-600 font-semibold' : 'text-amber-600'
                    }`}>
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {daysUntilDeadline <= 0
                        ? 'Appeal deadline passed'
                        : `${daysUntilDeadline} days to appeal`}
                    </div>
                  )}

                  {/* Suggested action */}
                  {topAction && (
                    <div className="mt-2 p-2 rounded-md bg-white border border-gray-100">
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-700">Recommended action</p>
                          <p className="text-xs text-gray-600 mt-0.5">{topAction.description}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      denial.status === 'new' ? 'bg-red-100 text-red-700' :
                      denial.status === 'appealed' ? 'bg-blue-100 text-blue-700' :
                      denial.status === 'resubmitted' ? 'bg-amber-100 text-amber-700' :
                      denial.status === 'under-review' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {denial.status === 'new' ? 'New' :
                       denial.status === 'appealed' ? 'Appealed' :
                       denial.status === 'resubmitted' ? 'Resubmitted' :
                       denial.status === 'under-review' ? 'Under Review' :
                       denial.status === 'corrective-action' ? 'Action Needed' :
                       denial.status}
                    </span>
                    {denial.priority === 'critical' && (
                      <span className="text-xs text-red-600 font-semibold">⚠ Critical</span>
                    )}
                  </div>
                </div>
              );
            })}

            {activeDenials.length > 5 && (
              <p className="text-xs text-gray-500 text-center pt-1">
                + {activeDenials.length - 5} more denied claims
              </p>
            )}
          </div>
        </div>
      )}

      {loadingDenials && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
          <span className="text-xs text-gray-500">Checking for denied claims...</span>
        </div>
      )}

      {/* Expense List */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600" />
          Recent Expenses
        </h3>
        <div className="space-y-3">
          {expenses.map(exp => {
            const statusConfig = getStatusConfig(exp.status);
            return (
              <div key={exp.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{exp.service}</p>
                    <p className="text-xs text-gray-500">{exp.provider}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${statusConfig.color}`}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{exp.date}</span>
                  <div className="flex items-center gap-3">
                    {exp.insurancePaid > 0 && (
                      <span className="text-emerald-600">Ins: {formatCurrency(exp.insurancePaid)}</span>
                    )}
                    <span className={exp.youPaid > 0 ? 'font-semibold text-gray-700' : 'text-gray-400'}>
                      You: {formatCurrency(exp.youPaid)}
                    </span>
                  </div>
                </div>
                {exp.status === 'denied' && (
                  <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-100">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-red-700">Claim denied by insurance</p>
                        <p className="text-xs text-red-600 mt-0.5">Contact your provider to request a resubmission or appeal</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Self-Pay Tip */}
      <div className="flex items-start gap-2 p-3 bg-teal-50 rounded-xl border border-teal-100">
        <Info className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-teal-800">Paying out-of-pocket?</p>
          <p className="text-xs text-teal-700 mt-0.5">
            Use the Superbill tab to generate documentation you can submit to your insurance for reimbursement.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Coverage Tab
// ============================================================================

function CoverageTab({ benefits }: { benefits: CoverageBenefit[] }) {
  return (
    <div className="space-y-4">
      {/* Deductible Tracker */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-600" />
          Deductible &amp; Out-of-Pocket Max
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Individual Deductible</span>
              <span className="font-medium text-gray-900">$450 / $1,500</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: '30%' }} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">$1,050 remaining until deductible is met</p>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Out-of-Pocket Maximum</span>
              <span className="font-medium text-gray-900">$470 / $6,000</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '8%' }} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">After this, insurance covers 100%</p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-teal-600" />
          Your Benefits
        </h3>
        <div className="space-y-4">
          {benefits.map((b, i) => {
            const total = b.used + b.remaining;
            const usedPercent = total > 0 ? Math.round((b.used / total) * 100) : 0;
            const isLow = b.remaining < (total * 0.2);

            return (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.category}</p>
                    <p className="text-xs text-gray-500">{b.description}</p>
                  </div>
                  {b.authRequired && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      Auth Required
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">
                    {b.unit === 'dollars' ? formatCurrency(b.used) : `${b.used} ${b.unit}`} used
                  </span>
                  <span className={`font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                    {b.unit === 'dollars' ? formatCurrency(b.remaining) : `${b.remaining} ${b.unit}`} remaining
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isLow ? 'bg-red-400' : 'bg-teal-500'}`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Annual limit: {b.annualLimit}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-blue-800">Need help understanding your benefits?</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Ask Aminy to explain any coverage terms, or contact your insurance company using the number on the back of your card.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ClaimsDashboard({
  userId,
  childId,
  childName,
  childDOB,
  onBack,
}: ClaimsDashboardProps) {
  useAuditedAction('payment');
  const [activeTab, setActiveTab] = useState<TabId>('spending');

  // ── Real data state ──────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [benefits, setBenefits] = useState<CoverageBenefit[]>(() =>
    loadBenefitsFromStorage(userId)
  );
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // ── Denial records state ──────────────────────────────────────────────
  const [denials, setDenials] = useState<DenialRecord[]>([]);
  const [loadingDenials, setLoadingDenials] = useState(true);

  // ── Load expenses from Supabase superbills table ─────────────────────
  const loadExpenses = useCallback(async () => {
    if (!userId) {
      setLoadingExpenses(false);
      return;
    }

    setLoadingExpenses(true);
    setExpenseError(null);

    try {
      const { data: superbills, error } = await supabase
        .from('superbills')
        .select('*')
        .eq('user_id', userId)
        .order('date_of_service', { ascending: false });

      if (error) {
        console.warn('[ClaimsDashboard] Supabase error loading expenses:', error.message);
        setExpenseError(error.message);
        setExpenses([]);
        return;
      }

      if (superbills && superbills.length > 0) {
        setExpenses(superbills.map(mapSuperbillToExpense));
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.warn('[ClaimsDashboard] Failed to load expenses:', err);
      setExpenseError('Unable to load expense data. Please try again later.');
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  }, [userId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // ── Load denial records for this child ─────────────────────────────
  const loadDenials = useCallback(async () => {
    if (!childName) {
      setLoadingDenials(false);
      return;
    }

    setLoadingDenials(true);
    try {
      const records = await getDenialRecordsForPatient(childName);
      setDenials(records);
    } catch {
      console.warn('[ClaimsDashboard] Failed to load denials');
      setDenials([]);
    } finally {
      setLoadingDenials(false);
    }
  }, [childName]);

  useEffect(() => {
    loadDenials();
  }, [loadDenials]);

  // ── Persist benefits whenever they change ────────────────────────────
  useEffect(() => {
    if (userId) {
      saveBenefitsToStorage(userId, benefits);
    }
  }, [userId, benefits]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'spending', label: 'Spending', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'coverage', label: 'Coverage', icon: <Shield className="w-4 h-4" /> },
    { id: 'superbill', label: 'Superbill', icon: <Receipt className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 text-white px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Costs &amp; Coverage</h1>
            <p className="text-xs text-white/70">
              {childName}&apos;s insurance &amp; expenses
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/10 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {activeTab === 'spending' && (
          <SpendingTab expenses={expenses} childName={childName} loading={loadingExpenses} denials={denials} loadingDenials={loadingDenials} />
        )}
        {activeTab === 'coverage' && (
          <CoverageTab benefits={benefits} />
        )}
        {activeTab === 'superbill' && (
          <Suspense fallback={
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading superbill generator...</p>
            </div>
          }>
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-teal-50 rounded-xl border border-teal-100">
                <Info className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-teal-800">What&apos;s a superbill?</p>
                  <p className="text-xs text-teal-700 mt-0.5">
                    A superbill is a detailed receipt from your provider. If you pay out-of-pocket,
                    you can submit this to your insurance company to request reimbursement.
                  </p>
                </div>
              </div>
              <SuperbillGenerator
                userId={userId}
                childName={childName}
                childDOB={childDOB || ''}
                appointmentId="latest"
                appointmentDate={new Date().toISOString().split('T')[0]}
                providerName="Provider"
                providerCredentials="BCBA"
                providerNPI=""
                onClose={() => setActiveTab('spending')}
              />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}

export { ClaimsDashboard };
