// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Competency Assessment Form
 * BACB 5th Edition Task List — 20 core competency areas rated 1-5.
 * Historical view, auto-generates development plan for areas rated <=2.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Save, ChevronDown, ChevronUp, TrendingUp,
  AlertTriangle, CheckCircle2, Star, FileText, Clock,
  User, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BACB_TASK_LIST_AREAS,
  RATING_LABELS,
  getRBTProfiles,
  getCompetencyAssessments,
  addCompetencyAssessment,
  type CompetencyAssessment as CompetencyAssessmentType,
  type CompetencyRating,
  type RBTProfile,
} from '../../lib/rbt-supervision';

interface CompetencyAssessmentProps {
  onBack: () => void;
  rbtId?: string;
}

type ViewMode = 'assess' | 'history' | 'plan';

export function CompetencyAssessment({ onBack, rbtId: initialRbtId }: CompetencyAssessmentProps) {
  const profiles = useMemo(() => getRBTProfiles(), []);
  const [selectedRbtId, setSelectedRbtId] = useState(initialRbtId ?? profiles[0]?.id ?? '');
  const [viewMode, setViewMode] = useState<ViewMode>('assess');
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedProfile = profiles.find((p) => p.id === selectedRbtId);
  const assessments = useMemo(
    () => getCompetencyAssessments(selectedRbtId).sort((a, b) => b.date.localeCompare(a.date)),
    [selectedRbtId, refreshKey]
  );

  const views: { id: ViewMode; label: string }[] = [
    { id: 'assess', label: 'New Assessment' },
    { id: 'history', label: 'History' },
    { id: 'plan', label: 'Dev Plan' },
  ];

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Competency Assessment</h1>
            <p className="text-sm text-white/80">BACB 5th Edition Task List</p>
          </div>
        </div>

        {/* RBT Selector */}
        <select
          value={selectedRbtId}
          onChange={(e) => setSelectedRbtId(e.target.value)}
          className="w-full bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg px-3 py-2 text-sm mt-2"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id} className="text-[#1B2733]">{p.name} — {p.rbtNumber}</option>
          ))}
        </select>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 px-3 py-2 bg-white border-b border-[#E8E4DF]">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setViewMode(v.id)}
            className={`flex-1 py-1.5 rounded-full text-xs font-medium text-center transition-colors ${
              viewMode === v.id ? 'bg-violet-100 text-violet-700' : 'text-[#5A6B7A] hover:bg-[#F0EDE8]'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-3 pb-24">
        <AnimatePresence mode="wait">
          {viewMode === 'assess' && (
            <motion.div key="assess" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AssessmentForm
                rbtId={selectedRbtId}
                rbtName={selectedProfile?.name ?? ''}
                onSaved={() => {
                  setRefreshKey((k) => k + 1);
                  setViewMode('history');
                }}
              />
            </motion.div>
          )}
          {viewMode === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <HistoryView assessments={assessments} rbtName={selectedProfile?.name ?? ''} />
            </motion.div>
          )}
          {viewMode === 'plan' && (
            <motion.div key="plan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <DevelopmentPlanView assessments={assessments} rbtName={selectedProfile?.name ?? ''} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Assessment Form ─────────────────────────────────────────────────

function AssessmentForm({
  rbtId,
  rbtName,
  onSaved,
}: {
  rbtId: string;
  rbtName: string;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [ratings, setRatings] = useState<Record<number, { rating: number; notes: string }>>(
    () => {
      const initial: Record<number, { rating: number; notes: string }> = {};
      for (const area of BACB_TASK_LIST_AREAS) {
        initial[area.id] = { rating: 3, notes: '' };
      }
      return initial;
    }
  );
  const [overallNotes, setOverallNotes] = useState('');
  const [expandedArea, setExpandedArea] = useState<number | null>(null);

  const updateRating = useCallback((areaId: number, rating: number) => {
    setRatings((prev) => ({ ...prev, [areaId]: { ...prev[areaId], rating } }));
  }, []);

  const updateNotes = useCallback((areaId: number, notes: string) => {
    setRatings((prev) => ({ ...prev, [areaId]: { ...prev[areaId], notes } }));
  }, []);

  const handleSave = useCallback(() => {
    const ratingEntries: CompetencyRating[] = BACB_TASK_LIST_AREAS.map((area) => ({
      areaId: area.id,
      areaName: area.name,
      rating: ratings[area.id].rating,
      notes: ratings[area.id].notes,
      assessedDate: today,
    }));

    const lowAreas = ratingEntries.filter((r) => r.rating <= 2);
    const developmentPlan = lowAreas.map(
      (r) => `Focus on ${r.areaName} (rated ${r.rating}/5) — schedule targeted supervision`
    );

    const assessment: CompetencyAssessmentType = {
      id: `ca-${Date.now()}`,
      rbtId,
      bcbaId: 'bcba-001',
      date: today,
      ratings: ratingEntries,
      overallNotes,
      developmentPlan,
    };

    addCompetencyAssessment(assessment);
    toast.success(`Assessment saved for ${rbtName}`);
    onSaved();
  }, [ratings, overallNotes, rbtId, rbtName, today, onSaved]);

  // Group by category
  const categories = useMemo(() => {
    const cats: Record<string, typeof BACB_TASK_LIST_AREAS[number][]> = {};
    for (const area of BACB_TASK_LIST_AREAS) {
      if (!cats[area.category]) cats[area.category] = [];
      cats[area.category].push(area);
    }
    return cats;
  }, []);

  const avgRating = useMemo(() => {
    const vals = Object.values(ratings);
    return vals.reduce((s, r) => s + r.rating, 0) / vals.length;
  }, [ratings]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl p-3 border border-[#E8E4DF] flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[#1B2733]">Assessing: {rbtName}</div>
          <div className="text-sm text-[#5A6B7A]">{today}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-violet-700">{avgRating.toFixed(1)}</div>
          <div className="text-sm text-slate-400">avg score</div>
        </div>
      </div>

      {/* Competency areas by category */}
      {Object.entries(categories).map(([category, areas]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold text-[#5A6B7A] uppercase mb-2">{category}</h3>
          <div className="space-y-1">
            {areas.map((area) => {
              const isExpanded = expandedArea === area.id;
              const r = ratings[area.id];
              const ratingColor =
                r.rating >= 4 ? 'text-emerald-600' :
                r.rating >= 3 ? 'text-amber-600' :
                'text-red-600';

              return (
                <div key={area.id} className="bg-white rounded-lg border border-[#E8E4DF] overflow-hidden">
                  <button
                    onClick={() => setExpandedArea(isExpanded ? null : area.id)}
                    className="w-full px-3 py-2.5 flex items-center gap-2 text-left"
                  >
                    <span className="text-sm text-slate-400 w-5">{area.id}.</span>
                    <span className="flex-1 text-sm text-[#3A4A57] truncate">{area.name}</span>
                    <span className={`text-sm font-bold ${ratingColor} w-6 text-center`}>{r.rating}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[#E8E4DF]">
                          {/* Rating selector */}
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                key={val}
                                onClick={() => updateRating(area.id, val)}
                                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  r.rating === val
                                    ? val >= 4 ? 'bg-emerald-600 text-white'
                                    : val >= 3 ? 'bg-amber-500 text-white'
                                    : 'bg-red-500 text-white'
                                    : 'bg-[#F0EDE8] text-[#5A6B7A]'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                          <div className="text-sm text-slate-400 text-center">
                            {RATING_LABELS[r.rating]}
                          </div>
                          {/* Notes */}
                          <textarea
                            value={r.notes}
                            onChange={(e) => updateNotes(area.id, e.target.value)}
                            placeholder="Notes for this competency..."
                            className="w-full border border-[#E8E4DF] rounded-lg px-2 py-1.5 text-sm h-16 resize-none"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Overall notes */}
      <div>
        <label className="text-sm font-semibold text-[#5A6B7A] mb-1 block">Overall Notes</label>
        <textarea
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          placeholder="Overall observations, strengths, and areas for growth..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-24 resize-none"
        />
      </div>

      {/* Low-area preview */}
      {Object.values(ratings).some((r) => r.rating <= 2) && (
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
          <div className="flex items-center gap-1 text-sm font-semibold text-amber-700 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            Development Areas Flagged
          </div>
          <div className="space-y-1">
            {BACB_TASK_LIST_AREAS
              .filter((a) => ratings[a.id].rating <= 2)
              .map((a) => (
                <div key={a.id} className="text-sm text-amber-800">
                  &bull; {a.name} (rated {ratings[a.id].rating}/5)
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        Save Assessment
      </button>
    </div>
  );
}

// ── History View ────────────────────────────────────────────────────

function HistoryView({
  assessments,
  rbtName,
}: {
  assessments: CompetencyAssessmentType[];
  rbtName: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (assessments.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-[#5A6B7A]">No assessments yet for {rbtName}</p>
        <p className="text-sm text-slate-400 mt-1">Create a new assessment to start tracking</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[#3A4A57]">Assessment History &mdash; {rbtName}</h2>

      {/* Progress chart */}
      {assessments.length >= 2 && (
        <div className="bg-white rounded-xl p-3 border border-[#E8E4DF]">
          <div className="flex items-center gap-1 text-sm font-semibold text-[#5A6B7A] mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Progress Over Time
          </div>
          <div className="flex items-end gap-2 h-20">
            {[...assessments].reverse().map((a) => {
              const avg = a.ratings.reduce((s, r) => s + r.rating, 0) / a.ratings.length;
              const height = (avg / 5) * 100;
              return (
                <div key={a.id} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-sm font-medium text-[#5A6B7A]">{avg.toFixed(1)}</div>
                  <div className="w-full bg-violet-100 rounded-t-sm overflow-hidden" style={{ height: '100%' }}>
                    <div
                      className="w-full bg-violet-500 rounded-t-sm mt-auto"
                      style={{ height: `${height}%`, marginTop: `${100 - height}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400">{a.date.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assessment cards */}
      {assessments.map((a) => {
        const avg = a.ratings.reduce((s, r) => s + r.rating, 0) / a.ratings.length;
        const lowCount = a.ratings.filter((r) => r.rating <= 2).length;
        const highCount = a.ratings.filter((r) => r.rating >= 4).length;
        const isExpanded = expandedId === a.id;

        return (
          <div key={a.id} className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
              className="w-full p-3 flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#1B2733]">{a.date}</div>
                <div className="text-sm text-[#5A6B7A]">
                  Avg: {avg.toFixed(1)} &middot; {highCount} strong &middot; {lowCount} needs work
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 border-t border-[#E8E4DF] pt-2 space-y-1">
                    {a.ratings.map((r) => {
                      const color =
                        r.rating >= 4 ? 'bg-emerald-100 text-emerald-700' :
                        r.rating >= 3 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700';
                      return (
                        <div key={r.areaId} className="flex items-center gap-2">
                          <span className="text-sm text-slate-400 w-4">{r.areaId}</span>
                          <span className="flex-1 text-sm text-[#5A6B7A] truncate">{r.areaName}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}>
                            {r.rating}/5
                          </span>
                        </div>
                      );
                    })}
                    {a.overallNotes && (
                      <div className="mt-2 p-2 bg-[#FAF7F2] rounded-lg">
                        <p className="text-sm text-[#5A6B7A]">{a.overallNotes}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── Development Plan View ───────────────────────────────────────────

function DevelopmentPlanView({
  assessments,
  rbtName,
}: {
  assessments: CompetencyAssessmentType[];
  rbtName: string;
}) {
  if (assessments.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-[#5A6B7A]">No assessments available</p>
        <p className="text-sm text-slate-400 mt-1">Complete an assessment to generate a development plan</p>
      </div>
    );
  }

  const latest = assessments[0];
  const lowAreas = latest.ratings.filter((r) => r.rating <= 2);
  const midAreas = latest.ratings.filter((r) => r.rating === 3);
  const strongAreas = latest.ratings.filter((r) => r.rating >= 4);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-[#3A4A57]">Development Plan &mdash; {rbtName}</h2>
      <p className="text-sm text-[#5A6B7A]">Based on assessment from {latest.date}</p>

      {/* Priority: Low areas */}
      {lowAreas.length > 0 && (
        <div className="bg-red-50 rounded-xl p-3 border border-red-200">
          <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Priority Development Areas ({lowAreas.length})
          </h3>
          <div className="space-y-2">
            {lowAreas.map((r) => (
              <div key={r.areaId} className="bg-white rounded-lg p-2 border border-red-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1B2733]">{r.areaName}</span>
                  <span className="text-sm font-bold text-red-600">{r.rating}/5</span>
                </div>
                <p className="text-sm text-[#5A6B7A] mt-1">
                  {RATING_LABELS[r.rating]} &mdash; Schedule targeted supervision sessions focusing on this area.
                </p>
                {r.notes && <p className="text-sm text-[#5A6B7A] mt-1 italic">Note: {r.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Developing areas */}
      {midAreas.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
          <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Developing ({midAreas.length})
          </h3>
          <div className="space-y-1">
            {midAreas.map((r) => (
              <div key={r.areaId} className="flex items-center justify-between py-1">
                <span className="text-sm text-[#3A4A57]">{r.areaName}</span>
                <span className="text-sm font-medium text-amber-600">{r.rating}/5</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strong areas */}
      {strongAreas.length > 0 && (
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
          <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Strengths ({strongAreas.length})
          </h3>
          <div className="space-y-1">
            {strongAreas.map((r) => (
              <div key={r.areaId} className="flex items-center justify-between py-1">
                <span className="text-sm text-[#3A4A57]">{r.areaName}</span>
                <span className="text-sm font-medium text-emerald-600">{r.rating}/5</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-generated plan items */}
      {latest.developmentPlan.length > 0 && (
        <div className="bg-white rounded-xl p-3 border border-violet-200">
          <h3 className="text-sm font-semibold text-violet-700 mb-2 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            Action Items
          </h3>
          <div className="space-y-2">
            {latest.developmentPlan.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-[#3A4A57]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowAreas.length === 0 && (
        <div className="text-center py-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
          <p className="text-sm text-[#5A6B7A] font-medium">No critical development areas</p>
          <p className="text-sm text-slate-400">All competencies rated 3 or above</p>
        </div>
      )}
    </div>
  );
}

export default CompetencyAssessment;
