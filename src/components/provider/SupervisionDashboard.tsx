/**
 * BCBA Supervision Dashboard
 * Manages RBT roster, compliance tracking, competency heatmaps, and quick session logging.
 * BACB-compliant: 5% supervision, 2 contacts/month, 1 individual, 1 direct observation.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Users, Calendar, AlertTriangle, CheckCircle2,
  Clock, Eye, Plus, ChevronRight, BarChart3, X, Shield,
  TrendingUp, FileText, User,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getRBTProfiles,
  getSupervisionSessions,
  calculateSupervisionCompliance,
  getAllComplianceRisks,
  addSupervisionSession,
  loadRBTDataFromSupabase,
  BACB_TASK_LIST_AREAS,
  getCompetencyAssessments,
  RATING_LABELS,
  type RBTProfile,
  type SupervisionSession,
  type SupervisionPeriod,
  type ComplianceRisk,
} from '../../lib/rbt-supervision';
import { supabase } from '../../utils/supabase/client';

interface SupervisionDashboardProps {
  onBack: () => void;
  onNavigateToRBTLog?: () => void;
  onNavigateToAssessment?: () => void;
}

type Tab = 'roster' | 'calendar' | 'compliance' | 'heatmap' | 'alerts';

export function SupervisionDashboard({ onBack, onNavigateToRBTLog, onNavigateToAssessment }: SupervisionDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [selectedRBT, setSelectedRBT] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) {
        loadRBTDataFromSupabase(data.user.id).then(() => setRefreshKey(k => k + 1));
      }
    });
  }, []);

  const profiles = useMemo(() => getRBTProfiles(), [refreshKey]);
  const allSessions = useMemo(() => getSupervisionSessions(), [refreshKey]);
  const risks = useMemo(() => getAllComplianceRisks(), [refreshKey]);
  const criticalRisks = risks.filter((r) => r.severity === 'critical');

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const complianceByRBT = useMemo(() => {
    const map: Record<string, SupervisionPeriod> = {};
    for (const p of profiles) {
      map[p.id] = calculateSupervisionCompliance(p.id, thisMonth);
    }
    return map;
  }, [profiles, thisMonth, refreshKey]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'roster', label: 'Roster', icon: <Users className="w-4 h-4" /> },
    { id: 'compliance', label: 'Compliance', icon: <Shield className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> },
    { id: 'heatmap', label: 'Heatmap', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'alerts', label: 'Alerts', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">RBT Supervision</h1>
            <p className="text-sm text-white/80">BACB Compliance Tracker</p>
          </div>
          <button
            onClick={() => setShowQuickLog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg text-sm font-medium backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />
            Log Session
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur-sm">
            <div className="text-lg font-bold">{profiles.length}</div>
            <div className="text-sm text-white/80">Active RBTs</div>
          </div>
          <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur-sm">
            <div className="text-lg font-bold">{allSessions.filter((s) => s.date.startsWith(thisMonth) && s.status === 'completed').length}</div>
            <div className="text-sm text-white/80">Sessions This Mo</div>
          </div>
          <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur-sm">
            <div className="text-lg font-bold text-amber-300">{criticalRisks.length}</div>
            <div className="text-sm text-white/80">Critical Alerts</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 px-3 py-2 bg-white border-b border-[#E8E4DF] no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-[#5A6B7A] hover:bg-[#EDF4F7]'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'alerts' && criticalRisks.length > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {criticalRisks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-3 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'roster' && (
            <motion.div key="roster" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <RosterView profiles={profiles} compliance={complianceByRBT} onSelectRBT={setSelectedRBT} />
            </motion.div>
          )}
          {activeTab === 'compliance' && (
            <motion.div key="compliance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ComplianceView profiles={profiles} compliance={complianceByRBT} month={thisMonth} />
            </motion.div>
          )}
          {activeTab === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CalendarView sessions={allSessions} month={thisMonth} profiles={profiles} />
            </motion.div>
          )}
          {activeTab === 'heatmap' && (
            <motion.div key="heatmap" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CompetencyHeatmap profiles={profiles} />
            </motion.div>
          )}
          {activeTab === 'alerts' && (
            <motion.div key="alerts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AlertsView risks={risks} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Log Modal */}
      <AnimatePresence>
        {showQuickLog && (
          <QuickLogModal
            profiles={profiles}
            onClose={() => setShowQuickLog(false)}
            onSave={() => {
              setShowQuickLog(false);
              setRefreshKey((k) => k + 1);
              toast.success('Supervision session logged');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Roster View ─────────────────────────────────────────────────────

function RosterView({
  profiles,
  compliance,
  onSelectRBT,
}: {
  profiles: RBTProfile[];
  compliance: Record<string, SupervisionPeriod>;
  onSelectRBT: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[#3A4A57]">RBT Roster ({profiles.length})</h2>
      {profiles.map((rbt) => {
        const c = compliance[rbt.id];
        const statusColor = c?.status === 'compliant' ? 'bg-emerald-500' : c?.status === 'at-risk' ? 'bg-amber-500' : 'bg-red-500';
        return (
          <motion.button
            key={rbt.id}
            onClick={() => onSelectRBT(rbt.id)}
            className="w-full bg-white rounded-xl p-3 border border-[#E8E4DF] text-left"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="w-5 h-5 text-[#6B9080]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#132F43] truncate">{rbt.name}</span>
                  <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                </div>
                <div className="text-sm text-[#5A6B7A]">{rbt.rbtNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[#3A4A57]">{c?.compliancePercent.toFixed(1)}%</div>
                <div className="text-sm text-slate-400">supervision</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex gap-3 text-sm text-[#5A6B7A]">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c?.directServiceHours}h direct</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{c?.directObservationCount} obs</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c?.individualSessionCount}i / {c?.groupSessionCount}g</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Compliance View ─────────────────────────────────────────────────

function ComplianceView({
  profiles,
  compliance,
  month,
}: {
  profiles: RBTProfile[];
  compliance: Record<string, SupervisionPeriod>;
  month: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[#3A4A57]">Compliance Tracker — {month}</h2>
      {profiles.map((rbt) => {
        const c = compliance[rbt.id];
        if (!c) return null;
        const pctColor = c.compliancePercent >= 5 ? 'text-emerald-600' : c.compliancePercent >= 3 ? 'text-amber-600' : 'text-red-600';
        const barWidth = Math.min(100, (c.compliancePercent / 5) * 100);
        const barColor = c.compliancePercent >= 5 ? 'bg-emerald-500' : c.compliancePercent >= 3 ? 'bg-amber-500' : 'bg-red-500';

        return (
          <div key={rbt.id} className="bg-white rounded-xl p-3 border border-[#E8E4DF]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-[#132F43]">{rbt.name}</span>
              <span className={`text-sm font-bold ${pctColor}`}>{c.compliancePercent.toFixed(1)}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-[#EDF4F7] rounded-full mb-3 overflow-hidden">
              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${barWidth}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Direct hours</span>
                <span className="font-medium text-[#3A4A57]">{c.directServiceHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Supervision</span>
                <span className="font-medium text-[#3A4A57]">{c.supervisionHoursReceived}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Individual</span>
                <span className={`font-medium ${c.individualSessionCount >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {c.individualSessionCount} {c.individualSessionCount >= 1 ? <CheckCircle2 className="w-3 h-3 inline" /> : '(need 1)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Group</span>
                <span className="font-medium text-[#3A4A57]">{c.groupSessionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Observation</span>
                <span className={`font-medium ${c.directObservationCount >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {c.directObservationCount >= 1 ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B7A]">Contacts</span>
                <span className={`font-medium ${(c.individualSessionCount + c.groupSessionCount) >= 2 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {c.individualSessionCount + c.groupSessionCount}/2
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Calendar View ───────────────────────────────────────────────────

function CalendarView({
  sessions,
  month,
  profiles,
}: {
  sessions: SupervisionSession[];
  month: string;
  profiles: RBTProfile[];
}) {
  const monthSessions = sessions.filter((s) => s.date.startsWith(month));
  const year = parseInt(month.split('-')[0]);
  const mo = parseInt(month.split('-')[1]) - 1;
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, mo, 1).getDay();

  const sessionsByDay: Record<number, SupervisionSession[]> = {};
  for (const s of monthSessions) {
    const day = parseInt(s.date.split('-')[2]);
    if (!sessionsByDay[day]) sessionsByDay[day] = [];
    sessionsByDay[day].push(s);
  }

  const nameMap: Record<string, string> = {};
  for (const p of profiles) nameMap[p.id] = p.name.split(' ')[0];

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const today = new Date().getDate();

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[#3A4A57]">
        {new Date(year, mo).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </h2>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-sm font-medium text-slate-400 py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          const daySessions = day ? sessionsByDay[day] : undefined;
          const isToday = day === today;
          return (
            <div
              key={i}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative ${
                isToday ? 'bg-indigo-50 ring-1 ring-indigo-300' : ''
              } ${day ? '' : ''}`}
            >
              {day && (
                <>
                  <span className={`${isToday ? 'font-bold text-indigo-700' : 'text-[#5A6B7A]'}`}>{day}</span>
                  {daySessions && daySessions.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {daySessions.map((s, j) => (
                        <span
                          key={j}
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.type === 'individual' ? 'bg-indigo-500' : 'bg-purple-400'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Session list */}
      <div className="space-y-2 mt-4">
        <h3 className="text-xs font-semibold text-[#5A6B7A] uppercase">Sessions This Month</h3>
        {monthSessions.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No sessions logged yet</p>
        )}
        {monthSessions
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((s) => (
            <div key={s.id} className="bg-white rounded-lg p-3 border border-[#E8E4DF] flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                s.type === 'individual' ? 'bg-indigo-100' : 'bg-purple-100'
              }`}>
                {s.type === 'individual' ? (
                  <User className="w-4 h-4 text-[#6B9080]" />
                ) : (
                  <Users className="w-4 h-4 text-purple-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#132F43]">{nameMap[s.rbtId] ?? 'Unknown'}</div>
                <div className="text-sm text-[#5A6B7A]">
                  {s.date} &middot; {s.durationMinutes}min &middot; {s.type}
                  {s.includesDirectObservation && ' + observation'}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                s.status === 'pending-signatures' ? 'bg-amber-100 text-amber-700' :
                s.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                'bg-[#EDF4F7] text-[#5A6B7A]'
              }`}>
                {s.status === 'pending-signatures' ? 'Pending Sig' : s.status}
              </span>
            </div>
          ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center text-sm text-[#5A6B7A] mt-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" />Individual</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" />Group</span>
      </div>
    </div>
  );
}

// ── Competency Heatmap ──────────────────────────────────────────────

function CompetencyHeatmap({ profiles }: { profiles: RBTProfile[] }) {
  const assessmentData = useMemo(() => {
    const result: Record<string, Record<number, number>> = {};
    for (const p of profiles) {
      const assessments = getCompetencyAssessments(p.id);
      if (assessments.length > 0) {
        const latest = assessments.sort((a, b) => b.date.localeCompare(a.date))[0];
        result[p.id] = {};
        for (const r of latest.ratings) {
          result[p.id][r.areaId] = r.rating;
        }
      }
    }
    return result;
  }, [profiles]);

  const ratingColor = (rating: number): string => {
    if (rating >= 5) return 'bg-emerald-500 text-white';
    if (rating >= 4) return 'bg-emerald-300 text-emerald-900';
    if (rating >= 3) return 'bg-amber-300 text-amber-900';
    if (rating >= 2) return 'bg-orange-300 text-orange-900';
    return 'bg-red-400 text-white';
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[#3A4A57]">Competency Heatmap</h2>
      <p className="text-sm text-[#5A6B7A]">BACB 5th Ed. Task List &mdash; 20 areas rated 1-5</p>

      {/* Legend */}
      <div className="flex gap-1 text-sm">
        {[1, 2, 3, 4, 5].map((r) => (
          <div key={r} className={`px-2 py-0.5 rounded ${ratingColor(r)}`}>
            {r} {RATING_LABELS[r]}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[600px]">
          {/* Header row */}
          <div className="flex gap-0.5 mb-1">
            <div className="w-28 shrink-0" />
            {profiles.map((p) => (
              <div key={p.id} className="flex-1 text-center text-sm font-medium text-[#5A6B7A] truncate px-0.5">
                {p.name.split(' ')[0]}
              </div>
            ))}
          </div>

          {/* Task list rows */}
          {BACB_TASK_LIST_AREAS.map((area) => (
            <div key={area.id} className="flex gap-0.5 mb-0.5">
              <div className="w-28 shrink-0 text-[9px] text-[#5A6B7A] truncate pr-1 leading-5" title={area.name}>
                {area.id}. {area.name.length > 22 ? area.name.slice(0, 22) + '...' : area.name}
              </div>
              {profiles.map((p) => {
                const rating = assessmentData[p.id]?.[area.id];
                return (
                  <div
                    key={p.id}
                    className={`flex-1 text-center text-sm font-medium rounded leading-5 ${
                      rating ? ratingColor(rating) : 'bg-[#EDF4F7] text-slate-400'
                    }`}
                  >
                    {rating ?? '-'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Alerts View ─────────────────────────────────────────────────────

function AlertsView({ risks }: { risks: ComplianceRisk[] }) {
  const sorted = [...risks].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return (a.daysRemaining ?? 99) - (b.daysRemaining ?? 99);
  });

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[#3A4A57]">Compliance Alerts</h2>
      {sorted.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-[#5A6B7A] font-medium">All clear</p>
          <p className="text-sm text-slate-400">No compliance risks detected</p>
        </div>
      )}
      {sorted.map((risk, i) => (
        <motion.div
          key={`${risk.rbtId}-${risk.type}-${i}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`rounded-xl p-3 border ${
            risk.severity === 'critical'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
              risk.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
            }`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#132F43]">{risk.rbtName}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  risk.severity === 'critical' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                }`}>
                  {risk.severity}
                </span>
              </div>
              <p className="text-sm text-[#5A6B7A] mt-0.5">{risk.message}</p>
              {risk.daysRemaining !== undefined && (
                <p className="text-sm text-slate-400 mt-1">
                  {risk.daysRemaining} days remaining
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Quick Log Modal ─────────────────────────────────────────────────

function QuickLogModal({
  profiles,
  onClose,
  onSave,
}: {
  profiles: RBTProfile[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [rbtId, setRbtId] = useState(profiles[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('60');
  const [type, setType] = useState<'individual' | 'group'>('individual');
  const [observation, setObservation] = useState(false);
  const [topics, setTopics] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = useCallback(() => {
    if (!rbtId || !date || !duration) {
      toast.error('Please fill in all required fields');
      return;
    }

    const session: SupervisionSession = {
      id: `ss-${Date.now()}`,
      rbtId,
      bcbaId: 'bcba-001',
      date,
      durationMinutes: parseInt(duration),
      type,
      includesDirectObservation: observation,
      topicsCovered: topics.split(',').map((t) => t.trim()).filter(Boolean),
      competenciesAssessed: [],
      bcbaNotes: notes,
      rbtSignature: false,
      bcbaSignature: true,
      bcbaSignatureDate: new Date().toISOString().split('T')[0],
      status: 'pending-signatures',
    };

    addSupervisionSession(session);
    onSave();
  }, [rbtId, date, duration, type, observation, topics, notes, onSave]);

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
        className="w-full bg-white rounded-t-2xl p-4 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#132F43]">Log Supervision Session</h3>
          <button onClick={onClose} className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="space-y-3">
          {/* RBT Select */}
          <div>
            <label className="text-sm font-medium text-[#5A6B7A] mb-1 block">RBT</label>
            <select
              value={rbtId}
              onChange={(e) => setRbtId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-[#5A6B7A] mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium text-[#5A6B7A] mb-1 block">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              min="15"
              max="240"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium text-[#5A6B7A] mb-1 block">Type</label>
            <div className="flex gap-2">
              {(['individual', 'group'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    type === t
                      ? 'bg-primary text-white border-indigo-600'
                      : 'bg-white text-[#5A6B7A] border-slate-300'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Direct Observation */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={observation}
              onChange={(e) => setObservation(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#6B9080]"
            />
            <span className="text-sm text-[#3A4A57]">Includes direct observation</span>
          </label>

          {/* Topics */}
          <div>
            <label className="text-sm font-medium text-[#5A6B7A] mb-1 block">Topics (comma-separated)</label>
            <input
              type="text"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder="DTT fidelity, Data collection, Ethics..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-[#5A6B7A] mb-1 block">BCBA Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Session observations and feedback..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-20 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm mt-2"
          >
            Log Session
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SupervisionDashboard;
