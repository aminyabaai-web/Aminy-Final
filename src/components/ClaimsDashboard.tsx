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
import { isDemoMode } from '../lib/demo-seed';
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
      return { icon: <Clock className="w-4 h-4 text-blue-500" />, label: 'Pending', color: 'bg-[#EEF4F8] text-blue-700' };
    case 'self_pay':
      return { icon: <CreditCard className="w-4 h-4 text-[#5A6B7A]" />, label: 'Self-Pay', color: 'bg-[#FAF7F2] text-[#3A4A57]' };
  }
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E8E4DF]">
        <div className="h-4 bg-[#E8E4DF] rounded w-1/3 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-lg p-3 bg-[#FAF7F2]">
              <div className="h-3 bg-[#E8E4DF] rounded w-2/3 mb-2" />
              <div className="h-5 bg-[#E8E4DF] rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E8E4DF]">
        <div className="h-4 bg-[#E8E4DF] rounded w-1/4 mb-3" />
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-[#E8E4DF] rounded-lg p-3 mb-3">
            <div className="h-4 bg-[#E8E4DF] rounded w-3/4 mb-2" />
            <div className="h-3 bg-[#E8E4DF] rounded w-1/2" />
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
    <div className="bg-white rounded-xl p-8 shadow-sm border border-[#E8E4DF] text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-[#6B9080]/10 flex items-center justify-center mb-4">
        <Inbox className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-[#1B2733] mb-2">
        No expenses tracked yet
      </h3>
      <p className="text-sm text-[#5A6B7A] max-w-[260px] mx-auto leading-relaxed">
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
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E8E4DF]">
        <h3 className="text-sm font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-[#6B9080]" />
          This Year&apos;s Summary
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-sm text-emerald-600 font-medium">Insurance Covered</p>
            <p className="text-lg font-bold text-emerald-800">{formatCurrency(insurancePaid)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-sm text-orange-600 font-medium">Your Out-of-Pocket</p>
            <p className="text-lg font-bold text-orange-800">{formatCurrency(youPaid)}</p>
          </div>
          <div className="bg-[#EEF4F8] rounded-lg p-3">
            <p className="text-sm text-blue-600 font-medium">Pending Claims</p>
            <p className="text-lg font-bold text-[#4A6478]">{formatCurrency(pendingAmount)}</p>
          </div>
          <div className="bg-[#FAF7F2] rounded-lg p-3">
            <p className="text-sm text-[#5A6B7A] font-medium">Total Billed</p>
            <p className="text-lg font-bold text-[#1B2733]">{formatCurrency(totalCharged)}</p>
          </div>
        </div>
      </div>

      {/* ── Denial Alerts ──────────────────────────────────────────────── */}
      {!loadingDenials && activeDenials.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
          <h3 className="text-sm font-semibold text-[#1B2733] mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Denied Claims ({activeDenials.length})
          </h3>
          <p className="text-sm text-[#5A6B7A] mb-3">
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
                      <p className="text-sm font-medium text-[#1B2733]">
                        {denial.payerName}
                      </p>
                      <p className="text-sm text-[#5A6B7A]">
                        Service: {denial.dateOfService} &middot; {categoryLabels[denial.category] || denial.category}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-700 ml-2 flex-shrink-0">
                      {formatCurrency(denial.deniedAmount)}
                    </span>
                  </div>

                  {/* Appeal deadline warning */}
                  {daysUntilDeadline !== null && (
                    <div className={`flex items-center gap-1.5 text-sm mt-1.5 ${
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
                    <div className="mt-2 p-2 rounded-md bg-white border border-[#E8E4DF]">
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-[#3A4A57]">Recommended action</p>
                          <p className="text-sm text-[#5A6B7A] mt-0.5">{topAction.description}</p>
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
                      'bg-[#F0EDE8] text-[#5A6B7A]'
                    }`}>
                      {denial.status === 'new' ? 'New' :
                       denial.status === 'appealed' ? 'Appealed' :
                       denial.status === 'resubmitted' ? 'Resubmitted' :
                       denial.status === 'under-review' ? 'Under Review' :
                       denial.status === 'corrective-action' ? 'Action Needed' :
                       denial.status}
                    </span>
                    {denial.priority === 'critical' && (
                      <span className="text-sm text-red-600 font-semibold">⚠ Critical</span>
                    )}
                  </div>
                </div>
              );
            })}

            {activeDenials.length > 5 && (
              <p className="text-sm text-[#5A6B7A] text-center pt-1">
                + {activeDenials.length - 5} more denied claims
              </p>
            )}
          </div>
        </div>
      )}

      {loadingDenials && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E8E4DF] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#6B9080]" />
          <span className="text-sm text-[#5A6B7A]">Checking for denied claims...</span>
        </div>
      )}

      {/* Expense List */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E8E4DF]">
        <h3 className="text-sm font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#6B9080]" />
          Recent Expenses
        </h3>
        <div className="space-y-3">
          {expenses.map(exp => {
            const statusConfig = getStatusConfig(exp.status);
            return (
              <div key={exp.id} className="border border-[#E8E4DF] rounded-lg p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1B2733] truncate">{exp.service}</p>
                    <p className="text-sm text-[#5A6B7A]">{exp.provider}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${statusConfig.color}`}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-[#8A9BA8]">
                  <span>{exp.date}</span>
                  <div className="flex items-center gap-3">
                    {exp.insurancePaid > 0 && (
                      <span className="text-emerald-600">Ins: {formatCurrency(exp.insurancePaid)}</span>
                    )}
                    <span className={exp.youPaid > 0 ? 'font-semibold text-[#3A4A57]' : 'text-[#8A9BA8]'}>
                      You: {formatCurrency(exp.youPaid)}
                    </span>
                  </div>
                </div>
                {exp.status === 'denied' && (
                  <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-100">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-700">Claim denied by insurance</p>
                        <p className="text-sm text-red-600 mt-0.5">Contact your provider to request a resubmission or appeal</p>
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
      <div className="flex items-start gap-2 p-3 bg-[#6B9080]/10 rounded-xl border border-[#E8E4DF]">
        <Info className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#6B9080]">Paying out-of-pocket?</p>
          <p className="text-sm text-[#6B9080] mt-0.5">
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
  const demo = isDemoMode();
  return (
    <div className="space-y-4">
      {/* Deductible Tracker — real plan figures only shown in demo; real users
          must connect their plan before we can show dollar amounts. */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E8E4DF]">
        <h3 className="text-sm font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#6B9080]" />
          Deductible &amp; Out-of-Pocket Max
        </h3>
        {demo ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#5A6B7A]">Individual Deductible</span>
                <span className="font-medium text-[#1B2733]">$450 / $1,500</span>
              </div>
              <div className="h-2.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '30%' }} />
              </div>
              <p className="text-sm text-[#8A9BA8] mt-0.5">$1,050 remaining until deductible is met</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#5A6B7A]">Out-of-Pocket Maximum</span>
                <span className="font-medium text-[#1B2733]">$470 / $6,000</span>
              </div>
              <div className="h-2.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '8%' }} />
              </div>
              <p className="text-sm text-[#8A9BA8] mt-0.5">After this, insurance covers 100%</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#5A6B7A] leading-relaxed">
            Connect your insurance plan to track your deductible and out-of-pocket
            maximum here. Ask Aminy AI to help you read your plan summary, or enter
            your details in Settings.
          </p>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E8E4DF]">
        <h3 className="text-sm font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-[#6B9080]" />
          Your Benefits
        </h3>
        <div className="space-y-4">
          {benefits.map((b) => {
            const total = b.used + b.remaining;
            const usedPercent = total > 0 ? Math.round((b.used / total) * 100) : 0;
            const isLow = b.remaining < (total * 0.2);

            return (
              <div key={b.category} className="border border-[#E8E4DF] rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-[#1B2733]">{b.category}</p>
                    <p className="text-sm text-[#5A6B7A]">{b.description}</p>
                  </div>
                  {b.authRequired && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      Auth Required
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#5A6B7A]">
                    {b.unit === 'dollars' ? formatCurrency(b.used) : `${b.used} ${b.unit}`} used
                  </span>
                  <span className={`font-medium ${isLow ? 'text-red-600' : 'text-[#1B2733]'}`}>
                    {b.unit === 'dollars' ? formatCurrency(b.remaining) : `${b.remaining} ${b.unit}`} remaining
                  </span>
                </div>
                <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isLow ? 'bg-red-400' : 'bg-primary'}`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
                <p className="text-sm text-[#8A9BA8] mt-1">Annual limit: {b.annualLimit}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help */}
      <div className="flex items-start gap-2 p-3 bg-[#EEF4F8] rounded-xl border border-blue-100">
        <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#4A6478]">Need help understanding your benefits?</p>
          <p className="text-sm text-blue-700 mt-0.5">
            Ask Aminy AI to explain any coverage terms, or contact your insurance company using the number on the back of your card.
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
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6B9080] to-[#43AA8B] text-white px-4 pt-12 pb-4">
        <nav aria-label="Coverage navigation" className="mb-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Costs &amp; Coverage</h1>
            <h2 className="sr-only">Coverage overview</h2>
            <h3 className="sr-only">Claims, benefits, and next steps</h3>
            <p className="text-sm text-white/70">
              {childName}&apos;s insurance &amp; expenses
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('superbill')}
            className="action-button ml-auto min-h-11 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#6B9080] shadow-sm transition-colors hover:bg-[#6B9080]/10"
          >
            Generate superbill
          </button>
        </nav>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/10 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[#6B9080] shadow-sm'
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
            <div className="bg-white rounded-xl p-8 shadow-sm border border-[#E8E4DF] text-center">
              <div className="animate-spin w-8 h-8 border-2 border-[#6B9080] border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-[#5A6B7A]">Loading superbill generator...</p>
            </div>
          }>
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-[#6B9080]/10 rounded-xl border border-[#E8E4DF]">
                <Info className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#6B9080]">What&apos;s a superbill?</p>
                  <p className="text-sm text-[#6B9080] mt-0.5">
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
