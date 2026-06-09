// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * EVVReconciliation2.tsx
 *
 * Enhanced EVV reconciliation view — clean cycle rate, discrepancy table,
 * fix & resubmit actions, fiscal agent submission readiness, and
 * historical clean rate trend (mini bar chart).
 *
 * Named EVVReconciliation2 to avoid conflict with existing EVVReconciliation.tsx
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  MapPin,
  RefreshCw,
  Send,
  Shield,
  XCircle,
} from 'lucide-react';
import {
  DEMO_EVV_RECORDS,
  reconcileEVV,
  flagDiscrepancies,
  generateEVVReport,
  exportFiscalAgentFile,
  type EVVRecord,
  type EVVDiscrepancy,
} from '../../lib/evv-reconciliation';
import { isDemoMode } from '../../lib/demo-seed';

interface EVVReconciliationEnhancedProps {
  providerId?: string;
  onBack?: () => void;
}

type ViewTab = 'overview' | 'discrepancies' | 'fiscal';

function MiniBarChart({ data }: { data: { period: string; rate: number }[] }) {
  const max = Math.max(...data.map(d => d.rate));
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className={`w-full rounded-t transition-all ${d.rate >= 90 ? 'bg-green-500' : d.rate >= 80 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ height: `${(d.rate / max) * 48}px` }}
          />
          <span className="text-xs text-[#8A9BA8] leading-none" style={{ fontSize: '9px' }}>
            {d.period.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  );
}

const DISCREPANCY_TYPE_LABELS: Record<string, string> = {
  'early-departure': 'Early Departure',
  'late-arrival': 'Late Arrival',
  'no-checkout': 'No Check-Out',
  'no-checkin': 'No Check-In',
  'location-mismatch': 'Location Mismatch',
  'units-overbilled': 'Units Overbilled',
  'units-underbilled': 'Units Underbilled',
  'time-variance': 'Time Variance',
};

function DiscrepancyRow({ record, discrepancies }: { record: EVVRecord; discrepancies: EVVDiscrepancy[] }) {
  const [expanded, setExpanded] = useState(false);
  const severityColor = discrepancies.some(d => d.severity === 'critical')
    ? 'text-red-600 bg-red-50 border-red-200'
    : discrepancies.some(d => d.severity === 'high')
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-yellow-600 bg-[#FDF9F0] border-[#F0EDE8]';

  return (
    <div className={`border rounded-2xl overflow-hidden ${severityColor.split(' ').slice(1).join(' ')}`}>
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${severityColor.split(' ')[0]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1B2733]">{record.clientName}</p>
          <p className="text-xs text-[#5A6B7A]">{record.serviceCode} · {record.serviceDescription} · {record.scheduledStart.split('T')[0]}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {discrepancies.map(d => (
              <span
                key={d.id}
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${severityColor}`}
              >
                {DISCREPANCY_TYPE_LABELS[d.type] ?? d.type}
              </span>
            ))}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-[#8A9BA8] shrink-0 transition-transform mt-1 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/50">
              {discrepancies.map(d => (
                <div key={d.id} className="mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${severityColor.split(' ')[0]}`}>
                      {d.severity}
                    </span>
                    <span className="text-xs text-[#5A6B7A]">{d.description}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-xs text-[#8A9BA8] mb-0.5">Scheduled</p>
                      <p className="text-xs font-medium text-[#3A4A57] break-all">{d.scheduledValue}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-xs text-[#8A9BA8] mb-0.5">Actual</p>
                      <p className="text-xs font-medium text-[#3A4A57] break-all">{d.actualValue}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#5A6B7A] italic">{d.correctionNote}</p>
                  {d.requiresCorrection && (
                    <button className="mt-2 flex items-center gap-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
                      <RefreshCw size={11} />
                      Fix &amp; Resubmit
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EVVReconciliationEnhanced({ providerId, onBack }: EVVReconciliationEnhancedProps) {
  const [tab, setTab] = useState<ViewTab>('overview');
  const [exportLoading, setExportLoading] = useState(false);
  const [exported, setExported] = useState(false);

  // Sample EVV records are shown only in demo mode (investor/AACT walkthroughs).
  // Real providers see their own visit records once captured/synced.
  const records = isDemoMode() ? DEMO_EVV_RECORDS : [];
  const report = useMemo(() => generateEVVReport(records, '2026-03'), [records]);
  const discrepancyGroups = useMemo(() => flagDiscrepancies(records), [records]);
  const fiscalExport = useMemo(() => exportFiscalAgentFile(records), [records]);

  const handleExport = () => {
    setExportLoading(true);
    setTimeout(() => {
      setExportLoading(false);
      setExported(true);
    }, 1500);
  };

  const CHECKLIST_ITEMS = [
    { label: 'All sessions have check-in and check-out', done: !records.some(r => !r.actualCheckIn || !r.actualCheckOut) },
    { label: 'All GPS locations verified', done: !records.some(r => r.checkInLatitude == null) },
    { label: 'Units match billed amounts', done: discrepancyGroups.filter(d => d.discrepancies.some(x => x.type === 'units-overbilled')).length === 0 },
    { label: 'No critical unresolved discrepancies', done: discrepancyGroups.filter(d => d.discrepancies.some(x => x.severity === 'critical' && x.requiresCorrection)).length === 0 },
    { label: 'All authorization numbers on file', done: records.every(r => !!r.authorizationNumber) },
  ];

  const checklistComplete = CHECKLIST_ITEMS.every(i => i.done);

  // No real records → friendly empty state instead of zeroed metrics and sample trends.
  if (records.length === 0) {
    return (
      <div className="min-h-screen bg-mist">
        <div style={{ background: '#0D1B2A' }} className="px-4 pt-12 pb-4 text-white">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="text-lg font-bold">EVV Reconciliation</h1>
              <p className="text-xs text-white/60">Clean cycles &amp; fiscal agent submission</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center mb-4">
            <Shield size={30} className="text-[#8A9BA8]" />
          </div>
          <p className="text-base font-semibold text-[#3A4A57]">No EVV records to reconcile</p>
          <p className="text-sm text-[#5A6B7A] mt-1 max-w-xs">
            Once visits are captured with check-in/check-out, your clean-cycle rate, discrepancies, and fiscal agent export will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div style={{ background: '#0D1B2A' }} className="px-4 pt-12 pb-4 text-white">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold">EVV Reconciliation</h1>
            <p className="text-xs text-white/60">March 2026 billing period</p>
          </div>
        </div>

        {/* Clean cycle rate hero */}
        <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div>
            <p className="text-3xl font-bold">
              {report.cleanCyclePercent}%
            </p>
            <p className="text-xs text-white/70">Clean Cycles</p>
          </div>
          <div className="h-12 w-px bg-white/20" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {report.cleanCyclePercent >= 90 ? (
                <CheckCircle size={16} className="text-green-400" />
              ) : (
                <AlertTriangle size={16} className="text-amber-400" />
              )}
              <span className="text-sm font-medium">
                {report.cleanCycles}/{report.totalRecords} records clean
              </span>
            </div>
            <p className="text-xs text-white/60">
              {report.discrepancies.length > 0
                ? `${discrepancyGroups.length} record${discrepancyGroups.length > 1 ? 's' : ''} need${discrepancyGroups.length === 1 ? 's' : ''} attention`
                : 'All records clean — ready for fiscal agent'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#E8E4DF] px-4">
        {([
          { id: 'overview' as const, label: 'Overview', icon: <BarChart3 size={13} /> },
          { id: 'discrepancies' as const, label: 'Discrepancies', icon: <AlertTriangle size={13} />, count: discrepancyGroups.length },
          { id: 'fiscal' as const, label: 'Fiscal Agent', icon: <Send size={13} /> },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-[#6B9080] text-[#6B9080]' : 'border-transparent text-[#5A6B7A]'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Historical trend */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                <h2 className="text-sm font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
                  <BarChart3 size={15} className="text-[#6B9080]" />
                  Historical Clean Rate Trend
                </h2>
                <MiniBarChart data={report.historicalCleanRates} />
                <div className="flex items-center gap-3 mt-3 text-xs text-[#8A9BA8]">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded" /> ≥90%</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-400 rounded" /> 80-89%</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-400 rounded" /> &lt;80%</div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Records', value: report.totalRecords, color: 'text-[#1B2733]' },
                  { label: 'Clean Cycles', value: report.cleanCycles, color: 'text-green-600' },
                  { label: 'Discrepancies', value: discrepancyGroups.length, color: 'text-red-600' },
                  { label: 'Discrepancy Rate', value: `${report.discrepancyRate}%`, color: report.discrepancyRate > 15 ? 'text-red-600' : 'text-amber-600' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-2xl p-4 border border-[#E8E4DF] shadow-sm text-center">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-[#5A6B7A] mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'discrepancies' && (
            <motion.div key="discrepancies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {discrepancyGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle size={36} className="text-green-400 mb-3" />
                  <p className="text-base font-semibold text-[#3A4A57]">All clean!</p>
                  <p className="text-sm text-[#8A9BA8] mt-1">No discrepancies found in this billing period</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#5A6B7A]">{discrepancyGroups.length} records need attention before fiscal agent submission</p>
                  {discrepancyGroups.map(({ record, discrepancies }) => (
                    <DiscrepancyRow key={record.id} record={record} discrepancies={discrepancies} />
                  ))}
                </>
              )}
            </motion.div>
          )}

          {tab === 'fiscal' && (
            <motion.div key="fiscal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Readiness checklist */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                <h2 className="text-sm font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
                  <ClipboardList size={15} className="text-[#6B9080]" />
                  Fiscal Agent Submission Readiness
                </h2>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50">
                      {item.done ? (
                        <CheckCircle size={16} className="text-green-500 shrink-0" />
                      ) : (
                        <XCircle size={16} className="text-red-500 shrink-0" />
                      )}
                      <span className={`text-sm ${item.done ? 'text-[#5A6B7A]' : 'text-[#1B2733] font-medium'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={`mt-4 p-3 rounded-xl ${checklistComplete ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <div className="flex items-center gap-2">
                    {checklistComplete ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-600" />
                    )}
                    <p className={`text-sm font-semibold ${checklistComplete ? 'text-green-700' : 'text-amber-700'}`}>
                      {checklistComplete ? 'Ready for fiscal agent submission' : 'Resolve issues before submitting'}
                    </p>
                  </div>
                  {!checklistComplete && (
                    <p className="text-xs text-amber-600 mt-1">
                      AHCCCS may reject EVV submissions with unresolved discrepancies. Fix issues in the Discrepancies tab first.
                    </p>
                  )}
                </div>
              </div>

              {/* Export stats */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                <h2 className="text-sm font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
                  <FileText size={15} className="text-[#5A6B7A]" />
                  Export Summary
                </h2>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Period', value: fiscalExport.period },
                    { label: 'Total Records', value: fiscalExport.totalRecords.toString() },
                    { label: 'Clean Records', value: fiscalExport.cleanRecords.toString() },
                    { label: 'Discrepancy Records', value: fiscalExport.discrepancyRecords.toString() },
                    { label: 'Format', value: 'AHCCCS CSV (HCBS EVV format)' },
                    { label: 'Filename', value: fiscalExport.filename },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-[#5A6B7A]">{row.label}</span>
                      <span className="font-medium text-[#1B2733] text-xs">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export button */}
              <button
                onClick={handleExport}
                disabled={exportLoading || !fiscalExport.readyForSubmission}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
                  exported
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : fiscalExport.readyForSubmission
                    ? 'bg-primary text-white hover:bg-[#6B9080]'
                    : 'bg-[#E8E4DF] text-[#8A9BA8] cursor-not-allowed'
                }`}
              >
                {exportLoading ? (
                  <><RefreshCw size={16} className="animate-spin" /> Generating AHCCCS export…</>
                ) : exported ? (
                  <><CheckCircle size={16} /> AHCCCS file downloaded</>
                ) : (
                  <><Download size={16} /> Export Fiscal Agent File</>
                )}
              </button>

              {!fiscalExport.readyForSubmission && fiscalExport.blockingIssues.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                  <p className="text-xs font-semibold text-red-700 mb-1">Cannot export — resolve first:</p>
                  {fiscalExport.blockingIssues.map((issue, i) => (
                    <p key={i} className="text-xs text-red-600">• {issue}</p>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
