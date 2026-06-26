// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ERA 835 Payment Reconciliation Dashboard
 *
 * Displays matched/unmatched payments, discrepancies, write-off suggestions,
 * and appeal recommendations from automated ERA 835 payment posting.
 *
 * Features:
 * - Payment posting summary with totals
 * - Per-claim reconciliation status (matched, partial, unmatched, over/underpaid)
 * - Service-line breakdown with adjustment reasons
 * - Write-off suggestion cards with one-click actions
 * - Appeal recommendation cards with success likelihood
 * - Filtering by status, payer, date range
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  reconcilePayments,
  getPaymentPostingSummary,
  getUnreconciledPayments,
  type ReconciliationResult,
  type PostedPayment,
  type WriteOffSuggestion,
  type AppealSuggestion,
} from '../lib/era-payment-posting';

// ============================================================================
// Sub-Components
// ============================================================================

interface SummaryCardProps {
  label: string;
  value: string;
  subLabel?: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}

function SummaryCard({ label, value, subLabel, color }: SummaryCardProps) {
  const colorClasses: Record<string, string> = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    yellow: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-[#EEF4F8] border-[#C8DDE8] text-blue-700',
    gray: 'bg-[#F6FBFB] border-[#E8E4DF] text-[#3A4A57]',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {subLabel && <p className="mt-0.5 text-sm opacity-60">{subLabel}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    matched: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Matched' },
    partial_match: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Partial Match' },
    unmatched: { bg: 'bg-red-100', text: 'text-red-800', label: 'Unmatched' },
    overpaid: { bg: 'bg-blue-100', text: 'text-[#4A6478]', label: 'Overpaid' },
    underpaid: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Underpaid' },
    posted: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Posted' },
    pending_review: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending Review' },
    write_off: { bg: 'bg-[#EDF4F7]', text: 'text-[#132F43]', label: 'Write Off' },
    appeal: { bg: 'bg-red-100', text: 'text-red-800', label: 'Appeal' },
  };

  const config = statusConfig[status] || { bg: 'bg-[#EDF4F7]', text: 'text-[#3A4A57]', label: status };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ServiceLineRow({ line }: {
  line: ReconciliationResult['serviceLineReconciliation'][0];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-[#E8E4DF] last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#F6FBFB]"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-[#132F43]">{line.procedureCode}</span>
          <StatusBadge status={line.status === 'paid_in_full' ? 'matched' : line.status === 'denied' ? 'unmatched' : 'partial_match'} />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[#5A6B7A]">Charged: ${line.originalCharge.toFixed(2)}</span>
          <span className="font-semibold text-[#132F43]">Paid: ${line.paidAmount.toFixed(2)}</span>
          <span className="text-[#8A9BA8]">{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#F6FBFB] px-4 pb-3"
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-[#5A6B7A]">Allowed Amount:</span>{' '}
                <span className="font-medium">${line.allowedAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#5A6B7A]">Adjustment:</span>{' '}
                <span className="font-medium">${line.adjustmentAmount.toFixed(2)}</span>
              </div>
            </div>
            {line.adjustmentReasons.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-sm font-semibold text-[#5A6B7A]">Adjustment Reasons:</p>
                {line.adjustmentReasons.map((adj, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="inline-flex items-center rounded bg-[#E8E4DF] px-1.5 py-0.5 font-mono text-[#3A4A57]">
                      {adj.groupCode}-{adj.reasonCode}
                    </span>
                    <span className="text-[#5A6B7A]">{adj.description}</span>
                    <span className="ml-auto font-medium text-[#132F43]">${adj.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WriteOffCard({ suggestion, onAction }: {
  suggestion: WriteOffSuggestion;
  onAction: (action: string) => void;
}) {
  const recConfig: Record<string, { color: string; icon: string; label: string }> = {
    write_off: { color: 'text-[#5A6B7A]', icon: '\u2718', label: 'Write Off' },
    appeal: { color: 'text-red-600', icon: '\u26A0', label: 'Appeal' },
    patient_bill: { color: 'text-blue-600', icon: '\u2709', label: 'Bill Patient' },
    review: { color: 'text-amber-600', icon: '\u2753', label: 'Review' },
  };

  const config = recConfig[suggestion.recommendation] || recConfig.review;

  return (
    <div className="rounded-lg border border-[#E8E4DF] bg-white p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{suggestion.procedureCode}</span>
            <span className={`text-sm font-semibold ${config.color}`}>
              {config.icon} {config.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#5A6B7A]">
            {suggestion.adjustmentGroupCode}-{suggestion.adjustmentReasonCode}: {suggestion.description}
          </p>
        </div>
        <span className="text-sm font-bold text-[#132F43]">${suggestion.amount.toFixed(2)}</span>
      </div>
      <p className="mt-2 text-sm text-[#5A6B7A]">{suggestion.rationale}</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => onAction(suggestion.recommendation)}
          className="rounded-md bg-gray-900 px-3 py-1 text-sm font-medium text-white hover:bg-gray-700"
        >
          {config.label}
        </button>
        {suggestion.recommendation !== 'review' && (
          <button
            onClick={() => onAction('review')}
            className="rounded-md border border-[#E8E4DF] px-3 py-1 text-sm font-medium text-[#3A4A57] hover:bg-[#F6FBFB]"
          >
            Review Instead
          </button>
        )}
      </div>
    </div>
  );
}

function AppealCard({ suggestion, onStartAppeal }: {
  suggestion: AppealSuggestion;
  onStartAppeal: () => void;
}) {
  const likelihoodColors = {
    high: 'bg-emerald-100 text-emerald-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-red-100 text-red-800',
  };

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{suggestion.procedureCode}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${likelihoodColors[suggestion.successLikelihood]}`}>
              {suggestion.successLikelihood} success rate
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-red-800">
            CARC {suggestion.denialReasonCode}: {suggestion.denialDescription}
          </p>
        </div>
        <span className="text-sm font-bold text-red-900">${suggestion.amount.toFixed(2)}</span>
      </div>
      <p className="mt-2 text-sm text-red-700">{suggestion.suggestedAction}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm text-red-600">
          Deadline: {suggestion.appealDeadlineDays} days from denial
        </span>
        <button
          onClick={onStartAppeal}
          className="rounded-md bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-600"
        >
          Start Appeal
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface ERAReconciliationProps {
  onNavigateBack?: () => void;
}

export default function ERAReconciliation({ onNavigateBack }: ERAReconciliationProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'reconciliation' | 'write_offs' | 'appeals'>('overview');
  const [summary, setSummary] = useState<{
    totalPosted: number;
    totalPaid: number;
    totalAdjusted: number;
    totalPatientResponsibility: number;
    byStatus: Record<string, number>;
    byPayer: Array<{ payerName: string; totalPaid: number; claimCount: number }>;
  } | null>(null);
  const [unreconciledPayments, setUnreconciledPayments] = useState<PostedPayment[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, unreconciled] = await Promise.all([
        getPaymentPostingSummary(dateRange.from, dateRange.to),
        getUnreconciledPayments(),
      ]);
      setSummary(summaryData);
      setUnreconciledPayments(unreconciled);
    } catch (err) {
      console.error('Failed to load ERA reconciliation data:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReconcile = async (claimId: string) => {
    setLoading(true);
    try {
      const result = await reconcilePayments(claimId);
      setReconciliationResult(result);
      setSelectedClaimId(claimId);
      setActiveTab('reconciliation');
    } catch (err) {
      console.error('Reconciliation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteOffAction = (_action: string) => {
    // In production, this would update the payment status in Supabase
  };

  const handleStartAppeal = () => {
    // In production, this would navigate to the appeal form with pre-filled data
  };

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center gap-3">
            {onNavigateBack && (
              <button
                onClick={onNavigateBack}
                className="rounded-lg p-1.5 text-[#5A6B7A] hover:bg-[#EDF4F7]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-lg font-bold text-[#132F43]">Payment Reconciliation</h1>
              <p className="text-sm text-[#5A6B7A]">ERA 835 Automated Payment Posting</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-4 flex gap-1 rounded-lg bg-[#EDF4F7] p-1">
            {(['overview', 'reconciliation', 'write_offs', 'appeals'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-[#132F43] shadow-sm'
                    : 'text-[#5A6B7A] hover:text-[#3A4A57]'
                }`}
              >
                {tab === 'overview' ? 'Overview' : tab === 'reconciliation' ? 'Reconcile' : tab === 'write_offs' ? 'Write-Offs' : 'Appeals'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E8E4DF] border-t-gray-900" />
          </div>
        )}

        {!loading && activeTab === 'overview' && summary && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                label="Total Posted"
                value={summary.totalPosted.toString()}
                subLabel="payment lines"
                color="blue"
              />
              <SummaryCard
                label="Total Paid"
                value={`$${summary.totalPaid.toFixed(2)}`}
                subLabel="received from payers"
                color="green"
              />
              <SummaryCard
                label="Adjustments"
                value={`$${summary.totalAdjusted.toFixed(2)}`}
                subLabel="contractual/other"
                color="yellow"
              />
              <SummaryCard
                label="Patient Resp."
                value={`$${summary.totalPatientResponsibility.toFixed(2)}`}
                subLabel="to collect from patients"
                color="gray"
              />
            </div>

            {/* Status Breakdown */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[#132F43]">Posting Status Breakdown</h3>
              <div className="mt-3 space-y-2">
                {Object.entries(summary.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <StatusBadge status={status} />
                    <span className="text-sm font-semibold text-[#132F43]">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payer Breakdown */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[#132F43]">Payments by Payer</h3>
              <div className="mt-3 space-y-2">
                {summary.byPayer.map((payer, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-[#5A6B7A]">{payer.payerName}</span>
                    <div className="text-right">
                      <span className="font-semibold text-[#132F43]">${payer.totalPaid.toFixed(2)}</span>
                      <span className="ml-2 text-sm text-[#8A9BA8]">({payer.claimCount} claims)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unreconciled Payments */}
            {unreconciledPayments.length > 0 && (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#132F43]">
                  Unreconciled Payments ({unreconciledPayments.length})
                </h3>
                <div className="mt-3 space-y-2">
                  {unreconciledPayments.slice(0, 10).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between rounded-lg bg-[#F6FBFB] p-2">
                      <div>
                        <p className="text-sm font-medium text-[#132F43]">
                          {payment.claimControlNumber} - {payment.procedureCode}
                        </p>
                        <p className="text-sm text-[#5A6B7A]">{payment.payerName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">${(payment.paidAmount || 0).toFixed(2)}</span>
                        <button
                          onClick={() => handleReconcile(payment.claimControlNumber)}
                          className="rounded bg-gray-900 px-2 py-1 text-sm text-white hover:bg-gray-700"
                        >
                          Reconcile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {!loading && activeTab === 'reconciliation' && reconciliationResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Reconciliation Header */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#132F43]">
                    Claim {reconciliationResult.claimControlNumber}
                  </h3>
                  <StatusBadge status={reconciliationResult.status} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#5A6B7A]">Variance</p>
                  <p className={`text-lg font-bold ${
                    reconciliationResult.variance === 0 ? 'text-emerald-600' :
                    reconciliationResult.variance > 0 ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    ${reconciliationResult.variance.toFixed(2)}
                  </p>
                  <p className="text-sm text-[#8A9BA8]">
                    ({reconciliationResult.variancePercentage.toFixed(1)}%)
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#F6FBFB] p-2">
                  <p className="text-sm text-[#5A6B7A]">Charged</p>
                  <p className="text-sm font-bold">${reconciliationResult.originalChargedAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="text-sm text-[#5A6B7A]">Paid</p>
                  <p className="text-sm font-bold text-emerald-700">${reconciliationResult.totalPaidAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <p className="text-sm text-[#5A6B7A]">Adjusted</p>
                  <p className="text-sm font-bold text-amber-700">${reconciliationResult.totalAdjustmentAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Service Line Breakdown */}
            <div className="rounded-xl bg-white shadow-sm">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold text-[#132F43]">Service Lines</h3>
              </div>
              {reconciliationResult.serviceLineReconciliation.map((line, idx) => (
                <ServiceLineRow key={idx} line={line} />
              ))}
            </div>

            {/* Timeline */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[#132F43]">Reconciliation Timeline</h3>
              <div className="mt-3 space-y-3">
                {reconciliationResult.timeline.map((event, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                      {idx < reconciliationResult.timeline.length - 1 && (
                        <div className="w-px flex-1 bg-[#E8E4DF]" />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium text-[#132F43]">{event.event.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-[#5A6B7A]">{event.details}</p>
                      <p className="text-sm text-[#8A9BA8]">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {!loading && activeTab === 'write_offs' && reconciliationResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#132F43]">
                Write-Off Suggestions ({reconciliationResult.writeOffSuggestions.length})
              </h3>
              <span className="text-sm text-[#5A6B7A]">
                Total: ${reconciliationResult.writeOffSuggestions.reduce((s, w) => s + w.amount, 0).toFixed(2)}
              </span>
            </div>
            {reconciliationResult.writeOffSuggestions.map((suggestion, idx) => (
              <WriteOffCard
                key={idx}
                suggestion={suggestion}
                onAction={handleWriteOffAction}
              />
            ))}
            {reconciliationResult.writeOffSuggestions.length === 0 && (
              <div className="py-8 text-center text-sm text-[#8A9BA8]">
                No write-off suggestions for this claim.
              </div>
            )}
          </motion.div>
        )}

        {!loading && activeTab === 'appeals' && reconciliationResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#132F43]">
                Appeal Recommendations ({reconciliationResult.appealSuggestions.length})
              </h3>
              <span className="text-sm text-[#5A6B7A]">
                Recoverable: ${reconciliationResult.appealSuggestions.reduce((s, a) => s + a.amount, 0).toFixed(2)}
              </span>
            </div>
            {reconciliationResult.appealSuggestions.map((suggestion, idx) => (
              <AppealCard
                key={idx}
                suggestion={suggestion}
                onStartAppeal={handleStartAppeal}
              />
            ))}
            {reconciliationResult.appealSuggestions.length === 0 && (
              <div className="py-8 text-center text-sm text-[#8A9BA8]">
                No appeal recommendations for this claim.
              </div>
            )}
          </motion.div>
        )}

        {!loading && (activeTab === 'reconciliation' || activeTab === 'write_offs' || activeTab === 'appeals') && !reconciliationResult && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#5A6B7A]">Select a claim from the Overview tab to view reconciliation details.</p>
            <button
              onClick={() => setActiveTab('overview')}
              className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Go to Overview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
