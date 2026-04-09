// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useMemo } from 'react';
import {
  MapPin, Clock, CheckCircle, AlertTriangle, XCircle, Download,
  ArrowLeft, ChevronDown, ChevronUp, FileText, RefreshCw, Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ───────────────────────────────────────────────────────────

export interface BillingCycle {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: 'clean' | 'warning' | 'critical';
  totalVisits: number;
  reconciled: number;
  discrepancies: number;
  cleanRate: number;
  submittedAt?: string;
}

export interface EVVVisit {
  id: string;
  clientName: string;
  clientId: string;
  providerId: string;
  providerName: string;
  serviceDate: string;
  serviceCode: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  gpsCheckIn?: GPSVerification;
  gpsCheckOut?: GPSVerification;
  timesheetMatch: 'match' | 'minor-variance' | 'mismatch' | 'missing';
  reconciliationStatus: 'verified' | 'pending' | 'discrepancy' | 'resolved';
  discrepancyType?: DiscrepancyType;
  discrepancyNote?: string;
  fiscalAgentConfidence: number; // 0-100
}

export interface GPSVerification {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  matchesServiceLocation: boolean;
  distanceFromExpected: number; // meters
}

export type DiscrepancyType =
  | 'time-mismatch'
  | 'gps-mismatch'
  | 'missing-checkout'
  | 'missing-checkin'
  | 'timesheet-mismatch'
  | 'duplicate-visit'
  | 'service-code-mismatch'
  | 'unauthorized-service';

interface EVVReconciliationProps {
  cycles: BillingCycle[];
  visits: EVVVisit[];
  onResolve: (visitId: string, resolution: string) => void;
  onExportProofPacket: (cycleId: string) => void;
  onRefresh: () => void;
  onBack?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────

const DISCREPANCY_LABELS: Record<DiscrepancyType, string> = {
  'time-mismatch': 'Time Mismatch',
  'gps-mismatch': 'GPS Mismatch',
  'missing-checkout': 'Missing Check-Out',
  'missing-checkin': 'Missing Check-In',
  'timesheet-mismatch': 'Timesheet Mismatch',
  'duplicate-visit': 'Duplicate Visit',
  'service-code-mismatch': 'Service Code Mismatch',
  'unauthorized-service': 'Unauthorized Service',
};

const STATUS_COLORS = {
  clean: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', dot: 'bg-green-500' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', dot: 'bg-red-500' },
};

// ─── Component ───────────────────────────────────────────────────────

export default function EVVReconciliation({
  cycles,
  visits,
  onResolve,
  onExportProofPacket,
  onRefresh,
  onBack,
}: EVVReconciliationProps) {
  const [selectedCycle, setSelectedCycle] = useState<string>(cycles[0]?.id ?? '');
  const [filterStatus, setFilterStatus] = useState<'all' | 'discrepancy' | 'pending' | 'verified'>('all');
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const cycleVisits = useMemo(() => {
    const cycle = cycles.find(c => c.id === selectedCycle);
    if (!cycle) return [];

    let result = visits.filter(v => {
      const d = new Date(v.serviceDate);
      return d >= new Date(cycle.startDate) && d <= new Date(cycle.endDate);
    });

    if (filterStatus === 'discrepancy') result = result.filter(v => v.reconciliationStatus === 'discrepancy');
    if (filterStatus === 'pending') result = result.filter(v => v.reconciliationStatus === 'pending');
    if (filterStatus === 'verified') result = result.filter(v => v.reconciliationStatus === 'verified');

    return result.sort((a, b) => {
      // Discrepancies first
      if (a.reconciliationStatus === 'discrepancy' && b.reconciliationStatus !== 'discrepancy') return -1;
      if (b.reconciliationStatus === 'discrepancy' && a.reconciliationStatus !== 'discrepancy') return 1;
      return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime();
    });
  }, [cycles, visits, selectedCycle, filterStatus]);

  const currentCycle = cycles.find(c => c.id === selectedCycle);
  const discrepancyCount = cycleVisits.filter(v => v.reconciliationStatus === 'discrepancy').length;

  const handleResolve = (visitId: string) => {
    if (!resolutionNote.trim()) return;
    onResolve(visitId, resolutionNote.trim());
    setResolutionNote('');
    setExpandedVisit(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">EVV Reconciliation</h1>
            <p className="text-xs text-gray-500">Electronic Visit Verification</p>
          </div>
          <button
            onClick={onRefresh}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Billing Cycle Cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
          {cycles.map(cycle => {
            const colors = STATUS_COLORS[cycle.status];
            const isSelected = cycle.id === selectedCycle;

            return (
              <button
                key={cycle.id}
                onClick={() => setSelectedCycle(cycle.id)}
                className={`flex-shrink-0 rounded-xl border-2 p-3 text-left transition-all ${
                  isSelected
                    ? `${colors.border} ${colors.bg}`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={{ minWidth: '160px' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                  <span className="text-xs font-semibold text-gray-900">{cycle.label}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(cycle.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
                  {new Date(cycle.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-gray-900">{cycle.cleanRate}%</span>
                  <span className="text-xs text-gray-500">clean</span>
                </div>
                <p className="text-xs text-gray-500">
                  {cycle.reconciled}/{cycle.totalVisits} visits | {cycle.discrepancies} issues
                </p>
              </button>
            );
          })}
        </div>

        {/* Summary Stats */}
        {currentCycle && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <CheckCircle className="mx-auto h-5 w-5 text-green-500 mb-1" />
              <p className="text-lg font-bold text-gray-900">{currentCycle.reconciled}</p>
              <p className="text-xs text-gray-500">Verified</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <AlertTriangle className="mx-auto h-5 w-5 text-amber-500 mb-1" />
              <p className="text-lg font-bold text-gray-900">{discrepancyCount}</p>
              <p className="text-xs text-gray-500">Discrepancies</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <Clock className="mx-auto h-5 w-5 text-blue-500 mb-1" />
              <p className="text-lg font-bold text-gray-900">
                {currentCycle.totalVisits - currentCycle.reconciled - discrepancyCount}
              </p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'discrepancy', 'pending', 'verified'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'discrepancy' && discrepancyCount > 0 && (
                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {discrepancyCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Visit List */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {cycleVisits.map(visit => {
              const isExpanded = expandedVisit === visit.id;
              const confidenceColor =
                visit.fiscalAgentConfidence >= 90 ? 'text-green-600' :
                visit.fiscalAgentConfidence >= 70 ? 'text-amber-600' : 'text-red-600';

              return (
                <motion.div
                  key={visit.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-xl border bg-white overflow-hidden ${
                    visit.reconciliationStatus === 'discrepancy'
                      ? 'border-red-200'
                      : visit.reconciliationStatus === 'verified'
                        ? 'border-green-200'
                        : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => setExpandedVisit(isExpanded ? null : visit.id)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {visit.reconciliationStatus === 'verified' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {visit.reconciliationStatus === 'discrepancy' && <XCircle className="h-4 w-4 text-red-500" />}
                          {visit.reconciliationStatus === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                          {visit.reconciliationStatus === 'resolved' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                          <span className="text-sm font-semibold text-gray-900 truncate">{visit.clientName}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(visit.serviceDate).toLocaleDateString()} | {visit.serviceCode} | {visit.providerName}
                        </p>
                        {visit.discrepancyType && (
                          <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            {DISCREPANCY_LABELS[visit.discrepancyType]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`text-xs font-bold ${confidenceColor}`}>
                          {visit.fiscalAgentConfidence}%
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-100 p-3 space-y-3">
                          {/* Time Comparison */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500">Scheduled</p>
                              <p className="text-sm text-gray-900">{visit.scheduledStart} - {visit.scheduledEnd}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500">Actual</p>
                              <p className="text-sm text-gray-900">
                                {visit.actualStart ?? '—'} - {visit.actualEnd ?? '—'}
                              </p>
                            </div>
                          </div>

                          {/* GPS */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500">GPS Check-In</p>
                              {visit.gpsCheckIn ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <MapPin className={`h-3.5 w-3.5 ${visit.gpsCheckIn.matchesServiceLocation ? 'text-green-500' : 'text-red-500'}`} />
                                  <span className={visit.gpsCheckIn.matchesServiceLocation ? 'text-green-700' : 'text-red-700'}>
                                    {visit.gpsCheckIn.matchesServiceLocation ? 'Verified' : `${visit.gpsCheckIn.distanceFromExpected}m off`}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-red-500">Missing</span>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500">GPS Check-Out</p>
                              {visit.gpsCheckOut ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <MapPin className={`h-3.5 w-3.5 ${visit.gpsCheckOut.matchesServiceLocation ? 'text-green-500' : 'text-red-500'}`} />
                                  <span className={visit.gpsCheckOut.matchesServiceLocation ? 'text-green-700' : 'text-red-700'}>
                                    {visit.gpsCheckOut.matchesServiceLocation ? 'Verified' : `${visit.gpsCheckOut.distanceFromExpected}m off`}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-red-500">Missing</span>
                              )}
                            </div>
                          </div>

                          {/* Timesheet Match */}
                          <div>
                            <p className="text-xs font-medium text-gray-500">Timesheet</p>
                            <span className={`inline-flex items-center gap-1 text-sm ${
                              visit.timesheetMatch === 'match' ? 'text-green-700' :
                              visit.timesheetMatch === 'minor-variance' ? 'text-amber-700' :
                              visit.timesheetMatch === 'mismatch' ? 'text-red-700' : 'text-gray-500'
                            }`}>
                              {visit.timesheetMatch === 'match' && <><CheckCircle className="h-3.5 w-3.5" /> Matches</>}
                              {visit.timesheetMatch === 'minor-variance' && <><AlertTriangle className="h-3.5 w-3.5" /> Minor Variance</>}
                              {visit.timesheetMatch === 'mismatch' && <><XCircle className="h-3.5 w-3.5" /> Mismatch</>}
                              {visit.timesheetMatch === 'missing' && 'No timesheet'}
                            </span>
                          </div>

                          {/* Fiscal Agent Confidence */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Fiscal Agent Confidence</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    visit.fiscalAgentConfidence >= 90 ? 'bg-green-500' :
                                    visit.fiscalAgentConfidence >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${visit.fiscalAgentConfidence}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold ${confidenceColor}`}>
                                {visit.fiscalAgentConfidence}%
                              </span>
                            </div>
                          </div>

                          {/* Resolution Queue */}
                          {visit.reconciliationStatus === 'discrepancy' && (
                            <div className="rounded-lg bg-red-50 p-3">
                              <p className="text-xs font-semibold text-red-800 mb-2">Resolution Required</p>
                              {visit.discrepancyNote && (
                                <p className="text-xs text-red-700 mb-2">{visit.discrepancyNote}</p>
                              )}
                              <textarea
                                value={resolutionNote}
                                onChange={e => setResolutionNote(e.target.value)}
                                placeholder="Describe resolution action taken..."
                                rows={2}
                                className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                              />
                              <button
                                onClick={() => handleResolve(visit.id)}
                                disabled={!resolutionNote.trim()}
                                className="mt-2 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40"
                              >
                                Resolve Discrepancy
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {cycleVisits.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-3 text-sm text-gray-500">No visits found for this filter.</p>
            </div>
          )}
        </div>

        {/* Export Proof Packet */}
        {currentCycle && (
          <button
            onClick={() => onExportProofPacket(currentCycle.id)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Download className="h-4 w-4" />
            Export Proof Packet — {currentCycle.label}
          </button>
        )}
      </div>
    </div>
  );
}
