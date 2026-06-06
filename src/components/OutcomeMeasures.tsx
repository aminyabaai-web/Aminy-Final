// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// OutcomeMeasures.tsx
// React component for standardized outcome measure assessments.
// Provides assessment selection, question flow, results display, and history view.

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  Save,
  Share2,
  History,
  Brain,
  Heart,
  Activity,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  type AssessmentType,
  type AssessmentResult,
  type AssessmentQuestion,
  ASSESSMENT_META,
  getAssessmentQuestions,
  scoreAssessment,
  saveAssessmentResult,
  getAssessmentHistory,
} from '../lib/outcome-measures';
import { isDemoMode } from '../lib/demo-seed';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OutcomeMeasuresProps {
  userId?: string;
  childId?: string;
  childName?: string;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// UI States
// ---------------------------------------------------------------------------

type ViewState = 'selection' | 'questions' | 'results' | 'history';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACCENT = '#6B9080'; // teal-600

function interpretationColor(interpretation: string): string {
  const lower = interpretation.toLowerCase();
  if (lower.includes('normal') || lower.includes('adequate') || lower.includes('within')) return '#16a34a';
  if (lower.includes('mild') || lower.includes('moderately low') || lower.includes('mildly')) return '#ca8a04';
  return '#dc2626';
}

function assessmentIcon(type: AssessmentType) {
  switch (type) {
    case 'brief2':
      return <Brain size={28} style={{ color: ACCENT }} />;
    case 'vineland3':
      return <Heart size={28} style={{ color: ACCENT }} />;
    case 'cars2':
      return <Activity size={28} style={{ color: ACCENT }} />;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OutcomeMeasures({ userId, childId, childName = 'Your Child', onBack }: OutcomeMeasuresProps) {
  // In demo mode, use placeholder ids so the screen is fully explorable.
  // For real users, never fabricate ids — fall back to empty and guard persistence
  // so a fake child_id can't be written to the database.
  const effectiveUserId = userId ?? (isDemoMode() ? 'demo' : '');
  const effectiveChildId = childId ?? (isDemoMode() ? 'child1' : '');
  const canPersist = effectiveUserId.length > 0 && effectiveChildId.length > 0;

  const [view, setView] = useState<ViewState>('selection');
  const [selectedType, setSelectedType] = useState<AssessmentType | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [historyData, setHistoryData] = useState<AssessmentResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const questions: AssessmentQuestion[] = useMemo(
    () => (selectedType ? getAssessmentQuestions(selectedType) : []),
    [selectedType],
  );

  const currentQuestion = questions[currentIndex] ?? null;
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // -- Handlers -------------------------------------------------------------

  const handleStartAssessment = useCallback((type: AssessmentType) => {
    setSelectedType(type);
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
    setView('questions');
  }, []);

  const handleAnswer = useCallback(
    (value: number) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    },
    [currentQuestion],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else if (selectedType) {
      // Finish — compute score
      const scored = scoreAssessment(selectedType, answers);
      const newResult: AssessmentResult = {
        type: selectedType,
        userId: effectiveUserId,
        childId: effectiveChildId,
        completedAt: new Date().toISOString(),
        answers,
        domainScores: scored.domainScores,
        compositeScore: scored.compositeScore,
        interpretation: scored.interpretation,
      };
      setResult(newResult);
      setView('results');
    }
  }, [currentIndex, questions.length, selectedType, answers, effectiveUserId, effectiveChildId]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    if (!canPersist) {
      toast.error('Sign in and select a child to save assessment results.');
      return;
    }
    setSaving(true);
    try {
      const outcome = await saveAssessmentResult(result);
      if (outcome.persisted === 'server') {
        toast.success('Assessment saved');
      } else {
        toast.warning('Saved on this device — will sync when you reconnect');
      }
    } catch {
      toast.error("Couldn't save — please try again");
    } finally {
      setSaving(false);
    }
  }, [result, canPersist]);

  const handleShare = useCallback(() => {
    if (!result) return;
    const text = `${ASSESSMENT_META[result.type].title} Assessment Results\nChild: ${childName}\nDate: ${formatDate(result.completedAt)}\nComposite Score: ${result.compositeScore}\nInterpretation: ${result.interpretation}`;
    if (navigator.share) {
      navigator.share({ title: `${ASSESSMENT_META[result.type].title} Results`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'));
    }
  }, [result, childName]);

  const handleShowHistory = useCallback(async () => {
    if (!canPersist) {
      setHistoryData([]);
      setView('history');
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await getAssessmentHistory(effectiveUserId, effectiveChildId);
      setHistoryData(data);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
      setView('history');
    }
  }, [effectiveUserId, effectiveChildId, canPersist]);

  const handleBackToSelection = useCallback(() => {
    setView('selection');
    setSelectedType(null);
    setResult(null);
    setCurrentIndex(0);
    setAnswers({});
  }, []);

  // -- Render ---------------------------------------------------------------

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={view === 'selection' ? onBack : handleBackToSelection}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 12,
            border: 'none',
            background: '#f3f4f6',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} color="#374151" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            {view === 'selection' && 'Outcome Measures'}
            {view === 'questions' && selectedType && ASSESSMENT_META[selectedType].title}
            {view === 'results' && 'Results'}
            {view === 'history' && 'Assessment History'}
          </h1>
          {view === 'selection' && (
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Track {childName}'s progress</p>
          )}
        </div>
        {view === 'selection' && (
          <button
            onClick={handleShowHistory}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 12,
              border: 'none',
              background: '#f3f4f6',
              cursor: 'pointer',
            }}
          >
            <History size={20} color="#374151" />
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          {/* ---- SELECTION VIEW ---- */}
          {view === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {(['brief2', 'vineland3', 'cars2'] as AssessmentType[]).map((type) => {
                const meta = ASSESSMENT_META[type];
                return (
                  <motion.div
                    key={type}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      background: '#ffffff',
                      borderRadius: 16,
                      border: '1px solid #e5e7eb',
                      padding: '20px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                    onClick={() => handleStartAssessment(type)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          background: '#ecfeff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {assessmentIcon(type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 2px 0' }}>
                          {meta.title}
                        </h3>
                        <p style={{ fontSize: 13, color: ACCENT, margin: '0 0 6px 0', fontWeight: 500 }}>
                          {meta.subtitle}
                        </p>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                          {meta.description}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>
                            <ClipboardList size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                            {meta.questionCount} questions
                          </span>
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>~{meta.estimatedMinutes} min</span>
                        </div>
                      </div>
                      <ChevronRight size={20} color="#d1d5db" style={{ marginTop: 4 }} />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* ---- QUESTION FLOW ---- */}
          {view === 'questions' && currentQuestion && (
            <motion.div
              key={`q-${currentIndex}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2 }}
            >
              {/* Progress bar */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{Math.round(progress)}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                  <motion.div
                    layout
                    style={{ height: '100%', borderRadius: 3, background: ACCENT }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Domain label */}
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: '#ecfeff',
                  color: ACCENT,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {currentQuestion.domain}
              </div>

              {/* Question text */}
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 24px 0', lineHeight: 1.4 }}>
                {currentQuestion.text}
              </h2>

              {/* Answer options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {currentQuestion.options.map((opt) => {
                  const selected = answers[currentQuestion.id] === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAnswer(opt.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 14,
                        border: `2px solid ${selected ? ACCENT : '#e5e7eb'}`,
                        background: selected ? '#ecfeff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        minHeight: 44,
                        textAlign: 'left',
                        width: '100%',
                        fontSize: 15,
                        fontWeight: selected ? 600 : 400,
                        color: selected ? '#0e7490' : '#374151',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          border: `2px solid ${selected ? ACCENT : '#d1d5db'}`,
                          background: selected ? ACCENT : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {selected && <CheckCircle size={14} color="#ffffff" />}
                      </div>
                      {opt.label}
                    </motion.button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '14px',
                    borderRadius: 14,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentIndex === 0 ? 0.4 : 1,
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#374151',
                    minHeight: 48,
                  }}
                >
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={answers[currentQuestion.id] === undefined}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '14px',
                    borderRadius: 14,
                    border: 'none',
                    background: answers[currentQuestion.id] !== undefined ? ACCENT : '#d1d5db',
                    cursor: answers[currentQuestion.id] !== undefined ? 'pointer' : 'not-allowed',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#ffffff',
                    minHeight: 48,
                    transition: 'background 0.15s ease',
                  }}
                >
                  {currentIndex === questions.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ---- RESULTS VIEW ---- */}
          {view === 'results' && result && selectedType && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              {/* Composite Score Card */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  border: '1px solid #e5e7eb',
                  padding: '28px 20px',
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px 0', fontWeight: 500 }}>
                  {ASSESSMENT_META[selectedType].title} Composite Score
                </p>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: interpretationColor(result.interpretation),
                    lineHeight: 1.1,
                    margin: '8px 0 12px',
                  }}
                >
                  {result.compositeScore}
                </div>
                <p
                  style={{
                    fontSize: 14,
                    color: interpretationColor(result.interpretation),
                    margin: 0,
                    fontWeight: 500,
                    lineHeight: 1.5,
                    padding: '0 8px',
                  }}
                >
                  {result.interpretation}
                </p>
              </div>

              {/* Domain Scores Bar Chart */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e5e7eb',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={18} color={ACCENT} /> Domain Scores
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(result.domainScores).map(([domain, score]) => {
                    // Determine max for bar width normalization
                    const maxScore = selectedType === 'cars2' ? 4 : 100;
                    const pct = Math.min(100, (score / maxScore) * 100);
                    const barColor =
                      pct < 40 ? '#16a34a' : pct < 65 ? '#ca8a04' : '#dc2626';
                    // For CARS-2 invert: lower is better
                    const displayColor =
                      selectedType === 'cars2'
                        ? score <= 1.5
                          ? '#16a34a'
                          : score <= 2.5
                          ? '#ca8a04'
                          : '#dc2626'
                        : barColor;

                    return (
                      <div key={domain}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{domain}</span>
                          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{score}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            style={{
                              height: '100%',
                              borderRadius: 4,
                              background: displayColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px',
                    borderRadius: 14,
                    border: 'none',
                    background: ACCENT,
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    minHeight: 48,
                  }}
                >
                  <Save size={18} /> {saving ? 'Saving...' : 'Save Results'}
                </button>
                <button
                  onClick={handleShare}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px',
                    borderRadius: 14,
                    border: `2px solid ${ACCENT}`,
                    background: '#ffffff',
                    color: ACCENT,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: 48,
                  }}
                >
                  <Share2 size={18} /> Share with Provider
                </button>
              </div>

              {/* New Assessment */}
              <button
                onClick={handleBackToSelection}
                style={{
                  padding: '14px',
                  borderRadius: 14,
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  color: '#374151',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  minHeight: 48,
                }}
              >
                Start Another Assessment
              </button>
            </motion.div>
          )}

          {/* ---- HISTORY VIEW ---- */}
          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                  Loading history...
                </div>
              ) : historyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <ClipboardList size={48} color="#d1d5db" style={{ marginBottom: 16 }} />
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 4px 0' }}>
                    No assessments yet
                  </p>
                  <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 24px 0' }}>
                    Complete an assessment to start tracking progress.
                  </p>
                  <button
                    onClick={handleBackToSelection}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 12,
                      border: 'none',
                      background: ACCENT,
                      color: '#ffffff',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    Start Assessment
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Simple score-over-time line chart (CSS-only) */}
                  {(() => {
                    const types = ['brief2', 'vineland3', 'cars2'] as AssessmentType[];
                    const grouped = types
                      .map((t) => ({
                        type: t,
                        items: historyData
                          .filter((h) => h.type === t)
                          .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()),
                      }))
                      .filter((g) => g.items.length > 0);

                    return grouped.map((group) => {
                      const meta = ASSESSMENT_META[group.type];
                      const maxScore = group.type === 'cars2' ? 60 : 100;
                      const scores = group.items.map((i) => i.compositeScore);
                      const chartHeight = 100;

                      return (
                        <div
                          key={group.type}
                          style={{
                            background: '#ffffff',
                            borderRadius: 16,
                            border: '1px solid #e5e7eb',
                            padding: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          }}
                        >
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 12px 0' }}>
                            {meta.title} — Score Trend
                          </h4>

                          {/* CSS line chart */}
                          <div
                            style={{
                              position: 'relative',
                              height: chartHeight,
                              display: 'flex',
                              alignItems: 'flex-end',
                              gap: scores.length > 1 ? `${Math.max(4, (100 / scores.length) - 8)}%` : 0,
                              padding: '0 4px',
                            }}
                          >
                            {group.items.map((item, idx) => {
                              const score = item.compositeScore;
                              const barH = Math.max(4, (score / maxScore) * chartHeight);
                              return (
                                <div
                                  key={`${item.type}-${item.completedAt}`}
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{score}</span>
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: barH }}
                                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                                    style={{
                                      width: '100%',
                                      maxWidth: 36,
                                      borderRadius: 6,
                                      background: `linear-gradient(to top, ${ACCENT}, #22d3ee)`,
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {/* Date labels */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, padding: '0 4px' }}>
                            {group.items.map((item) => (
                              <span key={`${item.type}-${item.completedAt}`} style={{ fontSize: 10, color: '#9ca3af', flex: 1, textAlign: 'center' }}>
                                {formatDate(item.completedAt)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {/* History list */}
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '4px 0 0 0' }}>All Assessments</h4>
                  {historyData.map((item) => {
                    const meta = ASSESSMENT_META[item.type];
                    return (
                      <div
                        key={`${item.type}-${item.completedAt}`}
                        style={{
                          background: '#ffffff',
                          borderRadius: 14,
                          border: '1px solid #e5e7eb',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: '#ecfeff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {assessmentIcon(item.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{meta.title}</p>
                          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{formatDate(item.completedAt)}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              color: interpretationColor(item.interpretation),
                              margin: 0,
                              lineHeight: 1,
                            }}
                          >
                            {item.compositeScore}
                          </p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>score</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
