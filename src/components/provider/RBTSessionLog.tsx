// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * RBT Session Log
 * RBT-facing session documentation with BCBA review queue.
 * Logs direct service sessions, goals, data collection, and running hour tallies.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus, Clock, Target, FileText, AlertTriangle,
  CheckCircle2, ChevronRight, X, MessageSquare, BarChart3,
  Calendar, User,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getRBTDirectSessions,
  addRBTDirectSession,
  getDirectServiceHours,
  calculateSupervisionCompliance,
  type RBTDirectSession,
  type SessionGoal,
  type DataCollectionEntry,
} from '../../lib/rbt-supervision';
import { isDemoMode } from '../../lib/demo-seed';

interface RBTSessionLogProps {
  onBack: () => void;
  rbtId?: string;
}

type ViewMode = 'sessions' | 'review-queue' | 'hours';

export function RBTSessionLog({ onBack, rbtId = 'rbt-001' }: RBTSessionLogProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('sessions');
  const [showNewSession, setShowNewSession] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Real BCBAs/RBTs see only what they've actually logged. The rbt-supervision
  // store seeds fabricated direct-hour totals + supervision history for demo
  // walk-throughs, so those seeded figures are gated behind demo mode here.
  const demo = isDemoMode();
  const sessions = useMemo(() => getRBTDirectSessions(rbtId), [rbtId, refreshKey]);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthSessions = sessions.filter((s) => s.date.startsWith(thisMonth));
  // Outside demo mode, derive hours from logged sessions only (never the seeded totals).
  const loggedMonthHours = monthSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
  const monthHours = useMemo(
    () => (demo ? getDirectServiceHours(rbtId, thisMonth) : loggedMonthHours),
    [demo, rbtId, thisMonth, refreshKey, loggedMonthHours],
  );
  const seededCompliance = useMemo(() => calculateSupervisionCompliance(rbtId, thisMonth), [rbtId, thisMonth, refreshKey]);
  const compliance = demo ? seededCompliance : { ...seededCompliance, compliancePercent: 0 };
  const pendingReview = sessions.filter((s) => s.bcbaReviewStatus === 'pending');
  const flaggedSessions = sessions.filter((s) => s.bcbaReviewStatus === 'flagged');

  const views: { id: ViewMode; label: string; count?: number }[] = [
    { id: 'sessions', label: 'My Sessions' },
    { id: 'review-queue', label: 'BCBA Review', count: pendingReview.length },
    { id: 'hours', label: 'Hours' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Session Log</h1>
            <p className="text-xs text-white/80">RBT Direct Service Documentation</p>
          </div>
          <button
            onClick={() => setShowNewSession(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg text-sm font-medium backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        {/* Month summary */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur-sm">
            <div className="text-lg font-bold">{monthHours.toFixed(1)}</div>
            <div className="text-[10px] text-white/80">Hours This Mo</div>
          </div>
          <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur-sm">
            <div className="text-lg font-bold">{monthSessions.length}</div>
            <div className="text-[10px] text-white/80">Sessions</div>
          </div>
          <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur-sm">
            <div className={`text-lg font-bold ${compliance.compliancePercent >= 5 ? 'text-emerald-300' : 'text-amber-300'}`}>
              {compliance.compliancePercent.toFixed(1)}%
            </div>
            <div className="text-[10px] text-white/80">Supervision</div>
          </div>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 px-3 py-2 bg-white border-b border-slate-200">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setViewMode(v.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewMode === v.id ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {v.label}
            {v.count !== undefined && v.count > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
                {v.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-3 pb-24">
        <AnimatePresence mode="wait">
          {viewMode === 'sessions' && (
            <motion.div key="sessions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <SessionsList sessions={sessions} />
            </motion.div>
          )}
          {viewMode === 'review-queue' && (
            <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ReviewQueue pending={pendingReview} flagged={flaggedSessions} />
            </motion.div>
          )}
          {viewMode === 'hours' && (
            <motion.div key="hours" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <HoursView rbtId={rbtId} sessions={sessions} demo={demo} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Session Modal */}
      <AnimatePresence>
        {showNewSession && (
          <NewSessionModal
            rbtId={rbtId}
            onClose={() => setShowNewSession(false)}
            onSave={() => {
              setShowNewSession(false);
              setRefreshKey((k) => k + 1);
              toast.success('Session logged successfully');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sessions List ───────────────────────────────────────────────────

function SessionsList({ sessions }: { sessions: RBTDirectSession[] }) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No sessions logged yet</p>
        <p className="text-xs text-slate-400 mt-1">Tap + to log your first session</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-700">Recent Sessions</h2>
      {sorted.map((s) => (
        <div key={s.id} className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
              <User className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">{s.clientName}</div>
              <div className="text-xs text-slate-500">
                {s.date} &middot; {s.startTime}-{s.endTime} &middot; {s.sessionType}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-700">{s.durationMinutes}m</div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                s.bcbaReviewStatus === 'reviewed' ? 'bg-emerald-100 text-emerald-700' :
                s.bcbaReviewStatus === 'flagged' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {s.bcbaReviewStatus}
              </span>
            </div>
          </div>

          {/* Goals summary */}
          {s.goalsTargeted.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {s.goalsTargeted.map((g, i) => (
                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {g.goalName}
                </span>
              ))}
            </div>
          )}

          {/* Data collected */}
          {s.dataCollected.length > 0 && (
            <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
              {s.dataCollected.map((d, i) => (
                <span key={i} className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {d.label}: {d.value}{d.total ? `/${d.total}` : ''}{d.unit ?? ''}
                </span>
              ))}
            </div>
          )}

          {/* Flag for BCBA */}
          {s.bcbaFlagReason && (
            <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-1 text-xs text-amber-700">
                <MessageSquare className="w-3 h-3" />
                <span className="font-medium">Flagged:</span> {s.bcbaFlagReason}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Review Queue ────────────────────────────────────────────────────

function ReviewQueue({
  pending,
  flagged,
}: {
  pending: RBTDirectSession[];
  flagged: RBTDirectSession[];
}) {
  return (
    <div className="space-y-4">
      {/* Flagged first */}
      {flagged.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Flagged for Attention ({flagged.length})
          </h3>
          {flagged.map((s) => (
            <div key={s.id} className="bg-red-50 rounded-xl p-3 border border-red-200 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{s.clientName}</span>
                <span className="text-xs text-slate-500">{s.date}</span>
              </div>
              {s.bcbaFlagReason && (
                <p className="text-xs text-red-700 mt-1">{s.bcbaFlagReason}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending review */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Pending BCBA Review ({pending.length})
        </h3>
        {pending.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">All caught up!</p>
            <p className="text-xs text-slate-400">No sessions awaiting review</p>
          </div>
        )}
        {pending.map((s) => (
          <div key={s.id} className="bg-white rounded-xl p-3 border border-slate-200 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800">{s.clientName}</div>
                <div className="text-xs text-slate-500">{s.date} &middot; {s.durationMinutes}m</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                Pending
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hours View ──────────────────────────────────────────────────────

function HoursView({ rbtId, sessions, demo }: { rbtId: string; sessions: RBTDirectSession[]; demo: boolean }) {
  const now = new Date();

  // Group by month
  const byMonth = useMemo(() => {
    const map: Record<string, { sessions: number; minutes: number }> = {};
    for (const s of sessions) {
      const month = s.date.substring(0, 7);
      if (!map[month]) map[month] = { sessions: 0, minutes: 0 };
      map[month].sessions++;
      map[month].minutes += s.durationMinutes;
    }
    return map;
  }, [sessions]);

  const months = Object.keys(byMonth).sort().reverse();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // Seeded direct-hour totals are demo-only; real users see hours from logged sessions.
  const directHours = demo
    ? getDirectServiceHours(rbtId, thisMonth)
    : (byMonth[thisMonth]?.minutes ?? 0) / 60;

  return (
    <div className="space-y-4">
      {/* Current month highlight */}
      <div className="bg-white rounded-xl p-4 border border-teal-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">This Month</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-teal-50 rounded-lg">
            <div className="text-2xl font-bold text-teal-700">{directHours.toFixed(1)}</div>
            <div className="text-xs text-teal-600">Direct Hours</div>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-700">
              {sessions.filter((s) => s.date.startsWith(thisMonth)).length}
            </div>
            <div className="text-xs text-slate-500">Sessions</div>
          </div>
        </div>
      </div>

      {/* Monthly breakdown */}
      {months.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Monthly History</h3>
          {months.map((month) => {
            const data = byMonth[month];
            return (
              <div key={month} className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-700">{month}</div>
                  <div className="text-xs text-slate-500">{data.sessions} sessions</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800">{(data.minutes / 60).toFixed(1)}h</div>
                  <div className="text-[10px] text-slate-400">{data.minutes}min</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {months.length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No session history yet</p>
        </div>
      )}
    </div>
  );
}

// ── New Session Modal ───────────────────────────────────────────────

function NewSessionModal({
  rbtId,
  onClose,
  onSave,
}: {
  rbtId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [sessionType, setSessionType] = useState<'1:1' | 'group'>('1:1');
  const [goalName, setGoalName] = useState('');
  const [notes, setNotes] = useState('');
  const [flagForBCBA, setFlagForBCBA] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [dataType, setDataType] = useState<DataCollectionEntry['type']>('trial-by-trial');
  const [dataLabel, setDataLabel] = useState('');
  const [dataValue, setDataValue] = useState('');
  const [dataTotal, setDataTotal] = useState('');

  const calculateDuration = useCallback((): number => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }, [startTime, endTime]);

  const handleSave = useCallback(() => {
    if (!clientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    const duration = calculateDuration();
    if (duration <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    const goals: SessionGoal[] = goalName.trim()
      ? [{ goalId: `g-${Date.now()}`, goalName: goalName.trim(), targetBehavior: '', notes: '' }]
      : [];

    const dataCollected: DataCollectionEntry[] = (dataLabel.trim() && dataValue.trim())
      ? [{
          type: dataType,
          label: dataLabel.trim(),
          value: parseInt(dataValue),
          total: dataTotal ? parseInt(dataTotal) : undefined,
        }]
      : [];

    const session: RBTDirectSession = {
      id: `rbt-s-${Date.now()}`,
      rbtId,
      clientId: `client-${clientName.toLowerCase().replace(/\s+/g, '-')}`,
      clientName: clientName.trim(),
      date,
      startTime,
      endTime,
      sessionType,
      goalsTargeted: goals,
      dataCollected,
      notes,
      bcbaReviewStatus: flagForBCBA ? 'flagged' : 'pending',
      bcbaFlagReason: flagForBCBA ? flagReason : undefined,
      durationMinutes: duration,
    };

    addRBTDirectSession(session);
    onSave();
  }, [clientName, date, startTime, endTime, sessionType, goalName, notes, flagForBCBA, flagReason, dataType, dataLabel, dataValue, dataTotal, rbtId, calculateDuration, onSave]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full bg-white rounded-t-2xl p-4 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Log Session</h3>
          <button onClick={onClose} className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="space-y-3">
          {/* Client */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Client Name *</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Aiden M."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Start</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">End</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {calculateDuration() > 0 && (
            <p className="text-xs text-teal-600 font-medium">Duration: {calculateDuration()} minutes</p>
          )}

          {/* Session Type */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Session Type</label>
            <div className="flex gap-2">
              {(['1:1', 'group'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSessionType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    sessionType === t
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  {t === '1:1' ? '1:1 Individual' : 'Group'}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Goal Targeted</label>
            <input type="text" value={goalName} onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g. Manding for preferred items"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Data Collection */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-2">
            <label className="text-xs font-semibold text-slate-600">Data Collection</label>
            <select value={dataType} onChange={(e) => setDataType(e.target.value as DataCollectionEntry['type'])}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="trial-by-trial">Trial-by-Trial</option>
              <option value="interval-recording">Interval Recording</option>
              <option value="frequency-count">Frequency Count</option>
              <option value="duration">Duration</option>
              <option value="latency">Latency</option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input type="text" value={dataLabel} onChange={(e) => setDataLabel(e.target.value)}
                placeholder="Label" className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              <input type="number" value={dataValue} onChange={(e) => setDataValue(e.target.value)}
                placeholder="Value" className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              <input type="number" value={dataTotal} onChange={(e) => setDataTotal(e.target.value)}
                placeholder="Total" className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Session Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Session observations, client response, etc."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-20 resize-none" />
          </div>

          {/* Flag for BCBA */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={flagForBCBA}
              onChange={(e) => setFlagForBCBA(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-teal-600" />
            <span className="text-sm text-slate-700">Flag for BCBA attention</span>
          </label>

          {flagForBCBA && (
            <input type="text" value={flagReason} onChange={(e) => setFlagReason(e.target.value)}
              placeholder="What do you need guidance on?"
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-amber-50" />
          )}

          <button onClick={handleSave}
            className="w-full bg-teal-600 text-white py-3 rounded-xl font-semibold text-sm mt-2">
            Log Session
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default RBTSessionLog;
