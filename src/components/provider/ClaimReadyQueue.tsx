// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ClaimReadyQueue.tsx
 *
 * Split-view claim queue: Ready / Blocked / Submitted.
 * Each blocked claim shows exactly why it's blocked with a Fix Now action.
 * Batch submit with confirmation modal. Running tally header.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronRight,
  DollarSign,
  FileText,
  Filter,
  Layers,
  RefreshCw,
  Send,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  DEMO_CLAIM_QUEUE,
  buildBatch,
  submitBatch,
  getQueueSummary,
  type ClaimReadyItem,
  type ClaimReadyStatus,
} from '../../lib/claim-queue';
import { isDemoMode } from '../../lib/demo-seed';

interface ClaimReadyQueueProps {
  providerId?: string;
  onBack?: () => void;
  onNavigateTo?: (screen: string) => void;
}

const PLACE_OF_SERVICE_LABELS: Record<string, string> = {
  '02': 'Telehealth',
  '11': 'Office',
  '12': 'Home',
  '99': 'Other',
};

type TabType = 'ready' | 'blocked' | 'submitted';

const TAB_CONFIG: { id: TabType; label: string; status: ClaimReadyStatus[] }[] = [
  { id: 'ready', label: 'Ready', status: ['ready'] },
  { id: 'blocked', label: 'Blocked', status: ['blocked'] },
  { id: 'submitted', label: 'Submitted', status: ['submitted', 'paid'] },
];

function ClaimCard({
  item,
  selected,
  onToggle,
  onFixNow,
}: {
  item: ClaimReadyItem;
  selected?: boolean;
  onToggle?: () => void;
  onFixNow?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const failedChecks = item.validationResults.filter(v => !v.passed && v.severity === 'error');

  return (
    <div
      className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
        selected ? 'border-[#6B9080] ring-2 ring-teal-100' :
        item.status === 'blocked' ? 'border-red-200' :
        item.status === 'submitted' ? 'border-[#C8DDE8]' :
        'border-[#E8E4DF]'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {item.status === 'ready' && onToggle && (
            <button
              onClick={onToggle}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                selected ? 'bg-primary border-[#6B9080]' : 'border-[#E8E4DF] bg-white'
              }`}
            >
              {selected && <Check size={11} className="text-white" />}
            </button>
          )}
          {item.status === 'blocked' && (
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          )}
          {item.status === 'submitted' && (
            <CheckCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#1B2733]">{item.clientName}</p>
                <p className="text-xs text-[#5A6B7A]">{item.dateOfService} · {PLACE_OF_SERVICE_LABELS[item.placeOfService] ?? item.placeOfService}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-[#1B2733]">${item.billedAmount.toFixed(2)}</p>
                <p className="text-xs text-[#8A9BA8]">{item.units} units</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-[#F0EDE8] text-[#5A6B7A] px-1.5 py-0.5 rounded font-mono">{item.cptCode}</span>
              <span className="text-xs text-[#5A6B7A]">{item.payerName}</span>
            </div>

            {/* Block reasons */}
            {item.blockReasons.length > 0 && (
              <div className="mt-2 space-y-1">
                {item.blockReasons.map((reason, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2 py-1">
                    <XCircle size={11} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-700">{reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-[#5A6B7A] hover:text-[#3A4A57] transition-colors"
          >
            <FileText size={12} />
            {failedChecks.length > 0 ? `${failedChecks.length} issue${failedChecks.length > 1 ? 's' : ''}` : 'All checks passed'}
          </button>
          {item.status === 'blocked' && onFixNow && (
            <button
              onClick={onFixNow}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Zap size={12} />
              Fix Now
            </button>
          )}
          {item.submittedAt && (
            <span className="ml-auto text-xs text-[#8A9BA8]">
              Submitted {new Date(item.submittedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Expanded validation results */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-1 pt-2 border-t border-gray-50">
                {item.validationResults.map(v => (
                  <div key={v.checkId} className="flex items-center gap-2">
                    {v.passed ? (
                      <CheckCircle size={12} className="text-green-500 shrink-0" />
                    ) : (
                      <XCircle size={12} className={v.severity === 'error' ? 'text-red-500 shrink-0' : 'text-amber-400 shrink-0'} />
                    )}
                    <span className={`text-xs ${v.passed ? 'text-[#5A6B7A]' : v.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                      {v.message}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ClaimReadyQueue({ providerId, onBack, onNavigateTo }: ClaimReadyQueueProps) {
  const [tab, setTab] = useState<TabType>('ready');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Sample claims are shown only in demo mode (investor/AACT walkthroughs).
  // Real providers start empty until their submitted claims sync from the billing pipeline.
  const [claims, setClaims] = useState<ClaimReadyItem[]>(() => (isDemoMode() ? DEMO_CLAIM_QUEUE : []));

  const summary = useMemo(() => getQueueSummary(claims), [claims]);

  const filteredClaims = useMemo(() => {
    const statuses = TAB_CONFIG.find(t => t.id === tab)?.status ?? [];
    return claims.filter(c => statuses.includes(c.status));
  }, [tab, claims]);

  const selectedClaims = claims.filter(c => selectedIds.has(c.id) && c.status === 'ready');
  const totalSelected = selectedClaims.reduce((s, c) => s + c.billedAmount, 0);

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    const readyClaims = claims.filter(c => c.status === 'ready');
    if (selectedIds.size === readyClaims.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(readyClaims.map(c => c.id)));
    }
  };

  const handleBatchSubmit = () => {
    const batchMap = buildBatch(selectedClaims);
    batchMap.forEach((items, payerId) => {
      submitBatch(items, payerId);
    });
    setClaims(prev =>
      prev.map(c =>
        selectedIds.has(c.id)
          ? { ...c, status: 'submitted' as const, submittedAt: new Date().toISOString(), batchId: `BATCH-${Date.now()}` }
          : c
      )
    );
    setSelectedIds(new Set());
    setShowConfirmModal(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setTab('submitted');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div style={{ background: '#0D1B2A' }} className="px-4 pt-12 pb-4 text-white">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold">Claim-Ready Queue</h1>
            <p className="text-xs text-white/60">Review, fix & submit claims</p>
          </div>
        </div>

        {/* Running tally */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">${summary.totalBilledThisWeek.toLocaleString()}</p>
            <p className="text-xs text-white/60">Submitted this week</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-400">${summary.totalPaidThisWeek.toLocaleString()}</p>
            <p className="text-xs text-white/60">Paid</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-amber-400">${(summary.totalBilledThisWeek - summary.totalPaidThisWeek).toLocaleString()}</p>
            <p className="text-xs text-white/60">In process</p>
          </div>
        </div>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-green-600 text-white text-sm font-medium px-4 py-3 flex items-center gap-2"
          >
            <CheckCircle size={16} />
            Claims submitted successfully
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#E8E4DF] px-4">
        {TAB_CONFIG.map(t => {
          const count = claims.filter(c => t.status.includes(c.status)).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[#6B9080] text-[#6B9080]'
                  : 'border-transparent text-[#5A6B7A] hover:text-[#3A4A57]'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-[#6B9080]/10 text-[#6B9080]' : 'bg-[#F0EDE8] text-[#5A6B7A]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-4 pb-32 space-y-3">
        {/* Select all for ready tab */}
        {tab === 'ready' && filteredClaims.length > 0 && (
          <div className="flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="text-xs text-[#6B9080] font-medium flex items-center gap-1.5"
            >
              <Layers size={13} />
              {selectedIds.size === filteredClaims.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-[#8A9BA8]">{filteredClaims.length} claims</span>
          </div>
        )}

        {/* Blocked reasons summary */}
        {tab === 'blocked' && summary.blockedReasons.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-3">
            <p className="text-xs font-semibold text-red-700 mb-2">Most common block reasons:</p>
            {summary.blockedReasons.map(r => (
              <div key={r.reason} className="flex items-center gap-2 text-xs text-red-600">
                <span className="font-mono font-bold">{r.count}×</span>
                <span>{r.reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Claims list */}
        {claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F0EDE8] flex items-center justify-center mb-4">
              <FileText size={26} className="text-[#8A9BA8]" />
            </div>
            <p className="text-sm font-semibold text-[#3A4A57]">No claims yet</p>
            <p className="text-xs text-[#5A6B7A] mt-1 max-w-xs">
              Submitted claims will appear here once your sessions are billed. Finish and sign a session note to start the queue.
            </p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle size={32} className="text-[#8A9BA8] mb-3" />
            <p className="text-sm text-[#5A6B7A]">No claims in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClaims.map(claim => (
              <ClaimCard
                key={claim.id}
                item={claim}
                selected={selectedIds.has(claim.id)}
                onToggle={() => handleToggle(claim.id)}
                onFixNow={() => onNavigateTo?.('session-note-editor')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Batch Submit Sticky Footer */}
      {tab === 'ready' && selectedIds.size > 0 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E4DF] p-4 pb-8"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-[#1B2733]">{selectedIds.size} claims selected</p>
              <p className="text-xs text-[#5A6B7A]">Total billed: ${totalSelected.toFixed(2)}</p>
            </div>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-3 rounded-xl hover:bg-[#6B9080] transition-colors"
            >
              <Send size={15} />
              Submit Batch
            </button>
          </div>
        </motion.div>
      )}

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full bg-white rounded-t-3xl p-5 pb-10"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
            >
              <h2 className="text-base font-bold text-[#1B2733] mb-1">Confirm Batch Submission</h2>
              <p className="text-sm text-[#5A6B7A] mb-4">
                You're submitting {selectedIds.size} claims totaling{' '}
                <strong className="text-[#1B2733]">${totalSelected.toFixed(2)}</strong> to{' '}
                {Array.from(new Set(selectedClaims.map(c => c.payerName))).join(', ')}.
              </p>

              <div className="bg-[#FAF7F2] rounded-xl p-3 mb-4 space-y-1">
                {selectedClaims.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="text-[#5A6B7A]">{c.clientName} · {c.cptCode}</span>
                    <span className="font-medium text-[#1B2733]">${c.billedAmount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-700">
                  <strong>Before submitting:</strong> Ensure all session notes are signed, authorizations are active, and diagnosis codes match your authorization.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 border border-[#E8E4DF] rounded-xl font-medium text-sm text-[#5A6B7A]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchSubmit}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Send size={15} />
                  Submit {selectedIds.size} Claims
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
