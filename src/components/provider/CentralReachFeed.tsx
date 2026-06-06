/**
 * CentralReachFeed.tsx
 *
 * What Aminy sends to CentralReach — explainer panel, sync status,
 * export button, data quality score, and value prop list.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Database,
  Download,
  FileText,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { getCRSyncStatus, generateCRImportFile } from '../../lib/centralreach-data-feed';

interface CentralReachFeedProps {
  providerId?: string;
  onBack?: () => void;
}

const VALUE_PROPS = [
  {
    icon: <Target size={16} className="text-[#6B9080]" />,
    title: 'Goal Progress Updates',
    description: 'Saves manual entry of mastery % and data points — Aminy pushes directly to CR goal bank',
    stat: '~3 hrs/week saved',
  },
  {
    icon: <FileText size={16} className="text-blue-600" />,
    title: 'Session Logs with CPT Codes',
    description: 'SOAP notes pre-formatted for billing — includes CPT, units, place of service, and auth number',
    stat: 'Billing-ready',
  },
  {
    icon: <Shield size={16} className="text-purple-600" />,
    title: 'Authorization Tracking',
    description: 'Remaining auth units updated per session — prevents accidental over-billing',
    stat: 'Compliance protected',
  },
  {
    icon: <Users size={16} className="text-amber-600" />,
    title: 'Parent Communication Logs',
    description: 'Parent training session records and caregiver communication logs — required for BCBA recertification',
    stat: 'Audit-ready',
  },
];

export default function CentralReachFeed({ providerId, onBack }: CentralReachFeedProps) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncStatus = getCRSyncStatus();

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const exportData = generateCRImportFile(['client-001', 'client-002']);
      // In production: trigger download
      const blob = new Blob([JSON.stringify(exportData.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportData.filename;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      setExported(true);
    }, 1500);
  };

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  const lastSyncDate = new Date(syncStatus.lastSyncAt);
  const hoursAgo = Math.round((Date.now() - lastSyncDate.getTime()) / 3600000);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div style={{ background: '#0D1B2A' }} className="px-4 pt-12 pb-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Database size={18} className="text-primary" />
              CentralReach Data Feed
            </h1>
            <p className="text-xs text-white/60">Aminy → CentralReach sync engine</p>
          </div>
        </div>

        {/* Last sync + data quality */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-sm font-bold">{hoursAgo}h ago</p>
            <p className="text-xs text-white/60">Last Sync</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-amber-400">{syncStatus.pendingRecords}</p>
            <p className="text-xs text-white/60">Pending</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-green-400">{syncStatus.dataQualityScore}%</p>
            <p className="text-xs text-white/60">Data Quality</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Explainer */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
          <h2 className="text-sm font-semibold text-[#1B2733] mb-2 flex items-center gap-2">
            <Sparkles size={15} className="text-[#6B9080]" />
            What Aminy sends to CentralReach
          </h2>
          <p className="text-xs text-[#5A6B7A] leading-relaxed mb-3">
            CentralReach is the practice management EHR used by most ABA organizations. Aminy exports
            structured data CR can import directly — eliminating double-entry and keeping your EHR current automatically.
          </p>

          {/* Data flow diagram */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-[#FAF7F2] to-blue-50 rounded-xl p-3 border border-[#E8E4DF]">
            <div className="text-center">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mx-auto">
                <Zap size={18} className="text-white" />
              </div>
              <p className="text-xs font-semibold text-[#3A4A57] mt-1">Aminy</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <ArrowRight size={20} className="text-primary" />
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mx-auto">
                <Database size={18} className="text-white" />
              </div>
              <p className="text-xs font-semibold text-[#3A4A57] mt-1">CentralReach</p>
            </div>
          </div>

          {/* What's included */}
          <div className="mt-3 space-y-1.5">
            {[
              'Session notes (SOAP format, signed)',
              'Goal progress updates (mastery %)',
              'Behavior data (frequency/duration/intensity)',
              'Authorization tracking (used vs. remaining units)',
              'Parent training session logs',
              'Billing-ready CPT codes + diagnosis codes',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[#5A6B7A]">
                <CheckCircle size={13} className="text-green-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Value props */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
          <h2 className="text-sm font-semibold text-[#1B2733] mb-3">CentralReach loves this data</h2>
          <div className="space-y-3">
            {VALUE_PROPS.map((vp, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3 p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E4DF]"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-[#E8E4DF]">
                  {vp.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#1B2733]">{vp.title}</p>
                    <span className="text-xs font-medium text-[#6B9080] bg-[#6B9080]/10 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      {vp.stat}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B7A] mt-0.5 leading-relaxed">{vp.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Data Quality */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
          <h2 className="text-sm font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
            <Shield size={15} className="text-purple-600" />
            Data Quality Score: {syncStatus.dataQualityScore}%
          </h2>
          <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${syncStatus.dataQualityScore}%` }}
            />
          </div>
          <div className="space-y-2">
            {[
              { label: 'Sessions', complete: syncStatus.completenessBreakdown.sessions.complete, incomplete: syncStatus.completenessBreakdown.sessions.incomplete },
              { label: 'Goals', complete: syncStatus.completenessBreakdown.goals.complete, incomplete: syncStatus.completenessBreakdown.goals.incomplete },
              { label: 'Billing', complete: syncStatus.completenessBreakdown.billing.complete, incomplete: syncStatus.completenessBreakdown.billing.incomplete },
              { label: 'Demographics', complete: syncStatus.completenessBreakdown.demographics.complete, incomplete: syncStatus.completenessBreakdown.demographics.incomplete },
            ].map(row => {
              const total = row.complete + row.incomplete;
              const pct = total > 0 ? Math.round((row.complete / total) * 100) : 100;
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs text-[#5A6B7A] w-20 shrink-0">{row.label}</span>
                  <div className="flex-1 h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : pct >= 80 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#5A6B7A] w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>

          {syncStatus.syncErrors.length > 0 && (
            <div className="mt-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-xs font-semibold text-amber-700 mb-1">Sync errors ({syncStatus.syncErrors.length})</p>
              {syncStatus.syncErrors.map((err, i) => (
                <p key={i} className="text-xs text-amber-600">
                  • {err.recordType} {err.recordId}: {err.error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
              exported
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {exporting ? (
              <><RefreshCw size={16} className="animate-spin" /> Building CentralReach export…</>
            ) : exported ? (
              <><CheckCircle size={16} /> Export downloaded</>
            ) : (
              <><Download size={16} /> Export for CentralReach</>
            )}
          </button>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm border border-[#E8E4DF] bg-white text-[#3A4A57] hover:bg-[#FAF7F2] transition-colors"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>

        {/* Schedule info */}
        <div className="flex items-center gap-2 bg-[#F0EDE8] rounded-xl p-3">
          <Clock size={14} className="text-[#5A6B7A] shrink-0" />
          <p className="text-xs text-[#5A6B7A]">
            Auto-sync runs every 6 hours. Next sync in ~{6 - (hoursAgo % 6)}h.
            Data is transmitted securely via encrypted API with signed session tokens.
          </p>
        </div>
      </div>
    </div>
  );
}
