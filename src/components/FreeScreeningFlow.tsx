// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * FreeScreeningFlow — The "Slow Lure" Acquisition Funnel
 *
 * This is Aminy's best salesperson. A panicked parent Googles "does my kid have autism?"
 * and lands here. The flow:
 *
 * 1. Concern Selection — "What are you worried about?" (empathy first)
 * 2. Child Info — Age + name (minimal, builds context)
 * 3. Screening Questions — Validated clinical instrument, 1 at a time
 *    - Interleaved with "Aminy Insights" that educate about features
 * 4. Results — Plain-language scoring with empathy
 * 5. CTA — "Save results & get matched with a provider" → signup
 *
 * All data persists to localStorage pre-signup, migrates to Supabase post-signup.
 * Zero friction to start. Signup wall only appears AFTER they have results worth saving.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Brain,
  Heart,
  Shield,
  Sparkles,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Activity,
  Volume2,
  Users,
  BookOpen,
  Star,
  X,
} from 'lucide-react';
import {
  SCREENING_INSTRUMENTS,
  routeConcernToScreener,
  saveScreeningResult,
  type ScreeningType,
  type ScreeningResult,
  type RiskLevel,
  type ScreeningInstrument,
} from '../lib/screening-instruments';

// ============================================
// TYPES
// ============================================

type FlowPhase =
  | 'concern'      // What are you worried about?
  | 'child-info'   // Child's name + age
  | 'screening'    // Questions one at a time
  | 'results';     // Scored results + next steps + CTA

interface ChildInfo {
  name: string;
  ageMonths: number;
}

interface FreeScreeningFlowProps {
  onBack: () => void;
  onSignUp: () => void;
  onBookEvaluation?: () => void;
  onJustDiagnosed?: () => void;
  initialConcern?: string;
}

// ============================================
// EDUCATIONAL INSIGHTS (interleaved between questions)
// ============================================

interface AminyInsight {
  icon: React.ElementType;
  title: string;
  body: string;
  afterQuestion: number;
}

function getInsightsForScreener(screenerId: ScreeningType): AminyInsight[] {
  const common: AminyInsight[] = [
    {
      icon: Brain,
      title: 'You know your child best',
      body: "These questions come from a clinically validated screening tool used by pediatricians worldwide. Your observations matter — parents are often the first to notice something.",
      afterQuestion: 2,
    },
    {
      icon: Sparkles,
      title: 'Aminy remembers everything',
      body: "Every concern, observation, and milestone you share with Aminy builds a living profile of your child. When you meet with a provider, they'll already have the full picture — no repeating yourself.",
      afterQuestion: 5,
    },
    {
      icon: Users,
      title: "You don't have to figure this out alone",
      body: "Aminy connects you with BCBAs, speech therapists, OTs, and psychologists who specialize in exactly what you're concerned about — and we check if your insurance covers it.",
      afterQuestion: 9,
    },
    {
      icon: Heart,
      title: 'Early action makes a real difference',
      body: "Research shows early intervention dramatically improves outcomes. Whatever your results, Aminy helps you take the right next step — whether that's monitoring at home or connecting with a specialist.",
      afterQuestion: 13,
    },
    {
      icon: Shield,
      title: 'Your data stays yours',
      body: "Everything you share is encrypted and handled with HIPAA-conscious privacy practices. You control who sees it. When you're ready to share with a provider, it happens with one tap — on your terms.",
      afterQuestion: 17,
    },
  ];

  if (screenerId === 'mchat') {
    common.splice(2, 0, {
      icon: Activity,
      title: 'Aminy Ease supports calm, transitions, and motivation',
      body: "If your family needs calmer transitions, reward momentum, or a sensory reset, Aminy Ease gives you premium calm tools, visual wins, and routines that help at home between sessions.",
      afterQuestion: 7,
    });
  } else if (screenerId === 'psc') {
    common.splice(2, 0, {
      icon: Star,
      title: 'Track what actually changes',
      body: "Aminy tracks daily behaviors, moods, and milestones so you can see what's working. Generate clinical-ready reports to share with your child's care team.",
      afterQuestion: 10,
    });
    common.splice(4, 0, {
      icon: BookOpen,
      title: 'Benefits you might not know about',
      body: "Many families qualify for additional coverage, respite hours, or caregiver pay programs based on their child's needs. Aminy checks your eligibility automatically.",
      afterQuestion: 20,
    });
  }

  return common;
}

// ============================================
// CONCERN OPTIONS
// ============================================

const CONCERN_OPTIONS = [
  { id: 'autism', label: 'Autism / Development', description: 'Not talking, limited eye contact, repetitive behaviors', icon: Brain, color: '#8B5CF6', keywords: 'autism spectrum' },
  { id: 'adhd', label: 'ADHD / Attention', description: "Can't sit still, easily distracted, impulsive", icon: Activity, color: '#F59E0B', keywords: 'adhd attention' },
  { id: 'anxiety', label: 'Anxiety / Fears', description: 'Excessive worry, separation anxiety, avoidance', icon: AlertCircle, color: '#3B82F6', keywords: 'anxiety worried' },
  { id: 'speech', label: 'Speech / Communication', description: 'Not talking yet, hard to understand, limited words', icon: Volume2, color: '#10B981', keywords: 'speech not talking' },
  { id: 'behavior', label: 'Behavior / Meltdowns', description: 'Aggression, tantrums, defiance, emotional outbursts', icon: AlertTriangle, color: '#EF4444', keywords: 'behavior meltdown' },
  { id: 'mood', label: 'Depression / Mood', description: 'Sadness, withdrawal, loss of interest, hopelessness', icon: Heart, color: '#6366F1', keywords: 'depression sad mood' },
];

const AGE_PRESETS = [
  { label: '12-18 months', months: 15 },
  { label: '18-24 months', months: 21 },
  { label: '2-3 years', months: 30 },
  { label: '3-5 years', months: 48 },
  { label: '5-8 years', months: 78 },
  { label: '8-12 years', months: 120 },
  { label: '12-17 years', months: 168 },
];

// ============================================
// SHARED STYLES
// ============================================

const S = {
  // Layout
  // Use min-height + relative positioning — position:fixed breaks when parents have transform
  fullScreen: { minHeight: '100dvh', backgroundColor: 'var(--color-bg-screen)', display: 'flex', flexDirection: 'column' as const },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border-soft)' },
  topBarBtn: { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 22, border: 'none', background: 'none', cursor: 'pointer' },
  contentArea: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const },
  padded: { padding: '28px 20px' },

  // Typography
  h1: { fontSize: 26, fontWeight: 700, color: 'var(--color-text-deep)', lineHeight: 1.25, letterSpacing: '-0.025em', margin: 0 },
  h2: { fontSize: 20, fontWeight: 700, color: 'var(--color-text-deep)', lineHeight: 1.3, letterSpacing: '-0.02em', margin: 0 },
  h3: { fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 12px 0' },
  body: { fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '10px 0 0' },
  caption: { fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 },
  label: { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8, display: 'block' as const },

  // Cards / Buttons
  concernCard: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px', borderRadius: 18, border: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-surface)', cursor: 'pointer', width: '100%', textAlign: 'left' as const, transition: 'border-color 0.15s, box-shadow 0.15s', marginBottom: 10, boxShadow: '0 1px 3px rgba(27,39,51,0.04)' },
  iconBox: (color: string) => ({ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: `${color}18` }),
  primaryBtn: (enabled: boolean) => ({ width: '100%', padding: '15px 24px', borderRadius: 14, border: 'none', backgroundColor: enabled ? '#6B9080' : 'var(--color-border-light)', color: enabled ? '#fff' : 'var(--color-text-secondary)', fontSize: 15, fontWeight: 600, cursor: enabled ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background-color 0.15s, opacity 0.15s', boxShadow: enabled ? '0 4px 14px rgba(107,144,128,0.3)' : 'none' }),
  ageBtn: (selected: boolean) => ({ padding: '12px 16px', borderRadius: 12, border: selected ? '2px solid #6B9080' : `1px solid var(--color-border-light)`, backgroundColor: selected ? 'rgba(107,144,128,0.08)' : 'var(--color-surface)', color: selected ? '#4A7A6A' : 'var(--color-text-primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }),
  yesNoBtn: (variant: 'yes' | 'no') => ({ flex: 1, padding: '16px 24px', borderRadius: 18, border: variant === 'yes' ? '2px solid rgba(107,144,128,0.5)' : `2px solid var(--color-border-light)`, backgroundColor: variant === 'yes' ? 'rgba(107,144,128,0.06)' : 'var(--color-surface)', color: variant === 'yes' ? '#4A7A6A' : 'var(--color-text-primary)', fontSize: 16, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }),

  // Progress
  progressTrack: { height: 4, backgroundColor: 'var(--color-border-light)' },
  progressBar: (pct: number) => ({ height: '100%', width: `${pct}%`, background: 'linear-gradient(to right, #6B9080, #7BA7BC)', transition: 'width 0.5s ease', borderRadius: 4 }),

  // Results
  riskBadge: (level: RiskLevel) => {
    const colors = { low: { bg: '#F0F8F5', border: '#C5DDD6', text: '#3A7A65' }, moderate: { bg: '#FFFBF0', border: '#F5E0A0', text: '#8A6820' }, high: { bg: '#FDF2F0', border: '#F2C4BB', text: '#C05A3E' } };
    const c = colors[level];
    return { padding: 16, borderRadius: 14, backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.text };
  },
  stepItem: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-soft)' },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(107,144,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  providerTag: { display: 'inline-block', padding: '6px 12px', borderRadius: 10, backgroundColor: 'rgba(107,144,128,0.08)', color: '#4A7A6A', fontSize: 12, fontWeight: 500, border: '1px solid rgba(107,144,128,0.18)' },
  lureBanner: { padding: 18, borderRadius: 18, background: 'linear-gradient(135deg, rgba(107,144,128,0.06), rgba(123,167,188,0.06))', border: '1px solid rgba(107,144,128,0.14)' },
  lureItem: { display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8 },

  // Insight interlude
  insightWrap: { flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 24px' },
  insightIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(107,144,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },

  // Reassurance
  reassurance: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', marginTop: 18, borderRadius: 14, backgroundColor: 'rgba(107,144,128,0.06)', border: '1px solid rgba(107,144,128,0.12)' },
  disclaimer: { marginTop: 24, padding: 14, borderRadius: 12, backgroundColor: 'var(--color-surface-soft)', border: '1px solid var(--color-border-light)' },
};

// ============================================
// COMPONENT
// ============================================

export function FreeScreeningFlow({ onBack, onSignUp, onBookEvaluation, onJustDiagnosed, initialConcern }: FreeScreeningFlowProps) {
  const [phase, setPhase] = useState<FlowPhase>(initialConcern ? 'child-info' : 'concern');
  const [selectedConcern, setSelectedConcern] = useState<string | null>(initialConcern || null);
  const [childInfo, setChildInfo] = useState<ChildInfo>({ name: '', ageMonths: 0 });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [showInsight, setShowInsight] = useState<AminyInsight | null>(null);

  const selectedInstrument = useMemo((): ScreeningInstrument | null => {
    if (!selectedConcern) return null;
    const concern = CONCERN_OPTIONS.find(c => c.id === selectedConcern);
    if (!concern) return null;
    const route = routeConcernToScreener(concern.keywords);
    if (!route || route.recommendedScreeners.length === 0) return null;
    for (const screenerId of route.recommendedScreeners) {
      const instrument = SCREENING_INSTRUMENTS[screenerId];
      if (instrument && instrument.questions.length > 0) return instrument;
    }
    return SCREENING_INSTRUMENTS.psc;
  }, [selectedConcern]);

  const insights = useMemo(() => {
    if (!selectedInstrument) return [];
    return getInsightsForScreener(selectedInstrument.id);
  }, [selectedInstrument]);

  const totalQuestions = selectedInstrument?.questions.length || 0;
  const currentQuestion = selectedInstrument?.questions[currentQuestionIndex];
  const progress = totalQuestions > 0 ? ((currentQuestionIndex) / totalQuestions) * 100 : 0;

  // ---- HANDLERS ----

  const handleConcernSelect = useCallback((id: string) => {
    setSelectedConcern(id);
    setPhase('child-info');
  }, []);

  const handleChildInfoSubmit = useCallback(() => {
    if (childInfo.ageMonths > 0) { setPhase('screening'); setCurrentQuestionIndex(0); setAnswers({}); }
  }, [childInfo]);

  const finishScreening = useCallback((finalAnswers: Record<string, boolean>) => {
    if (!selectedInstrument) return;
    const { total, risk } = selectedInstrument.score(finalAnswers);
    const interpretation = selectedInstrument.interpret(total, risk);
    const sr: ScreeningResult = {
      instrumentId: selectedInstrument.id,
      instrumentName: selectedInstrument.name,
      completedAt: new Date().toISOString(),
      childAgeMonths: childInfo.ageMonths,
      answers: finalAnswers,
      totalScore: total,
      riskLevel: risk,
      summary: interpretation.summary,
      nextSteps: interpretation.nextSteps,
      recommendedProviders: interpretation.providers,
    };
    saveScreeningResult(sr);
    setResult(sr);
    setPhase('results');
  }, [selectedInstrument, childInfo]);

  const handleAnswer = useCallback((questionId: string, answer: boolean) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    const insight = insights.find(i => i.afterQuestion === currentQuestionIndex);
    if (insight) { setShowInsight(insight); return; }
    if (currentQuestionIndex + 1 < totalQuestions) setCurrentQuestionIndex(p => p + 1);
    else finishScreening(newAnswers);
  }, [answers, currentQuestionIndex, totalQuestions, insights, finishScreening]);

  const handleInsightDismiss = useCallback(() => {
    setShowInsight(null);
    if (currentQuestionIndex + 1 < totalQuestions) setCurrentQuestionIndex(p => p + 1);
    else finishScreening(answers);
  }, [currentQuestionIndex, totalQuestions, answers, finishScreening]);

  const handleBack = useCallback(() => {
    if (phase === 'concern') onBack();
    else if (phase === 'child-info') setPhase('concern');
    else if (phase === 'screening') {
      if (showInsight) setShowInsight(null);
      else if (currentQuestionIndex > 0) setCurrentQuestionIndex(p => p - 1);
      else setPhase('child-info');
    }
  }, [phase, currentQuestionIndex, showInsight, onBack]);

  // ---- PHASE: Concern Selection ----

  const renderConcern = () => (
    <div style={S.contentArea}>
      <div style={S.padded}>
        <h1 style={S.h1}>What's on your mind?</h1>
        <p style={S.body}>No judgment, no rush. Let's figure this out together. Select what best describes your concern.</p>
      </div>
      <div style={{ padding: '0 20px 24px' }}>
        {CONCERN_OPTIONS.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.id} onClick={() => handleConcernSelect(c.id)} style={S.concernCard}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(107,144,128,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
            >
              <div style={S.iconBox(c.color)}>
                <Icon style={{ width: 24, height: 24, color: c.color }} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 2 }}>{c.description}</div>
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: '#d1d5db', flexShrink: 0 }} />
            </button>
          );
        })}
        <div style={S.reassurance}>
          <Shield style={{ width: 16, height: 16, color: '#6B9080', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12, color: '#5A6B7A', lineHeight: 1.6, margin: 0 }}>
            This screening is <strong>free</strong>, <strong>private</strong>, and based on the same validated tools your pediatrician uses. No account required.
          </p>
        </div>
      </div>
    </div>
  );

  // ---- PHASE: Child Info ----

  const renderChildInfo = () => {
    const cl = CONCERN_OPTIONS.find(c => c.id === selectedConcern)?.label || 'your concern';
    return (
      <div style={S.contentArea}>
        <div style={S.padded}>
          <h1 style={S.h1}>Tell us a little about your child</h1>
          <p style={S.body}>This helps us pick the right screening for <strong>{cl.toLowerCase()}</strong> concerns.</p>
        </div>
        <div style={{ padding: '0 20px 24px' }}>
          {/* Name */}
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>Child's first name <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Liam"
              value={childInfo.name}
              onChange={(e) => setChildInfo(p => ({ ...p, name: e.target.value }))}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-input-border)', backgroundColor: 'var(--color-surface)', fontSize: 14, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {/* Age */}
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>Child's age</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {AGE_PRESETS.map(p => (
                <button key={p.months} onClick={() => setChildInfo(prev => ({ ...prev, ageMonths: p.months }))} style={S.ageBtn(childInfo.ageMonths === p.months)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {/* Instrument preview */}
          {selectedInstrument && childInfo.ageMonths > 0 && (
            <div style={{ padding: 16, borderRadius: 12, backgroundColor: 'var(--color-surface-soft)', border: '1px solid var(--color-border-light)', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <CheckCircle style={{ width: 16, height: 16, color: '#6B9080' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedInstrument.shortName}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0, lineHeight: 1.5 }}>
                {selectedInstrument.questions.length} questions · About {selectedInstrument.estimatedMinutes} minutes · Used by pediatricians worldwide
              </p>
            </div>
          )}
          <button onClick={handleChildInfoSubmit} style={S.primaryBtn(childInfo.ageMonths > 0)}>
            Start Screening <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    );
  };

  // ---- PHASE: Screening Questions ----

  const renderScreening = () => {
    // Insight interlude
    if (showInsight) {
      const IIcon = showInsight.icon;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={S.progressTrack}><div style={S.progressBar(progress)} /></div>
          <div style={S.insightWrap}>
            <div style={S.insightIcon}>
              <IIcon style={{ width: 32, height: 32, color: '#6B9080' }} />
            </div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ ...S.h2, marginBottom: 12 }}>{showInsight.title}</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7, maxWidth: 340, margin: '0 auto' }}>{showInsight.body}</p>
            </div>
            <button onClick={handleInsightDismiss} style={{ ...S.primaryBtn(true), width: 'auto', padding: '12px 32px' }}>
              Continue <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
            <p style={{ ...S.caption, marginTop: 16 }}>{currentQuestionIndex + 1} of {totalQuestions} questions</p>
          </div>
        </div>
      );
    }

    if (!currentQuestion) return null;
    const qText = childInfo.name ? currentQuestion.text.replace(/your child/gi, childInfo.name) : currentQuestion.text;
    const hText = currentQuestion.helpText ? (childInfo.name ? currentQuestion.helpText.replace(/your child/gi, childInfo.name) : currentQuestion.helpText) : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={S.progressTrack}><div style={S.progressBar(progress)} /></div>
        {/* Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
          <span style={S.caption}>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span style={S.caption}>{selectedInstrument?.shortName}</span>
        </div>
        {/* Question */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px 32px' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-deep)', lineHeight: 1.5, margin: 0 }}>{qText}</h2>
            {hText && <p style={{ fontSize: 14, color: 'var(--color-text-dim)', lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>{hText}</p>}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => handleAnswer(currentQuestion.id, true)} style={S.yesNoBtn('yes')}>Yes</button>
            <button onClick={() => handleAnswer(currentQuestion.id, false)} style={S.yesNoBtn('no')}>No</button>
          </div>
        </div>
      </div>
    );
  };

  // ---- PHASE: Results ----

  const renderResults = () => {
    if (!result) return null;
    const riskIcons: Record<RiskLevel, React.ElementType> = { low: CheckCircle, moderate: AlertCircle, high: AlertTriangle };
    const RIcon = riskIcons[result.riskLevel];
    const rColors = { low: '#15803d', moderate: '#b45309', high: '#dc2626' };
    const rc = rColors[result.riskLevel];

    return (
      <div style={S.contentArea}>
        <div style={S.padded}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: S.riskBadge(result.riskLevel).backgroundColor, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <RIcon style={{ width: 32, height: 32, color: rc }} />
            </div>
            <h1 style={{ ...S.h1, fontSize: 20, marginBottom: 4 }}>Your Results Are Ready</h1>
            <p style={S.caption}>{result.instrumentName} · Completed just now</p>
          </div>

          {/* Risk badge */}
          <div style={{ ...S.riskBadge(result.riskLevel), marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' as const, marginBottom: 4 }}>{result.riskLevel} Risk</div>
            <p style={{ fontSize: 14, color: 'var(--color-text-body)', lineHeight: 1.6, margin: 0 }}>{result.summary}</p>
          </div>

          {/* Next steps */}
          <h3 style={S.h3}>Recommended Next Steps</h3>
          <div style={{ marginBottom: 24 }}>
            {result.nextSteps.map((step, i) => (
              <div key={i} style={{ ...S.stepItem, marginBottom: 8 }}>
                <div style={S.stepNum}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6B9080' }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--color-text-body)', lineHeight: 1.6, margin: 0 }}>{step}</p>
              </div>
            ))}
          </div>

          {/* Providers */}
          {result.recommendedProviders.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={S.h3}>Specialists Who Can Help</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.recommendedProviders.map((p, i) => (
                  <span key={i} style={S.providerTag}>{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Just Diagnosed bridge — for moderate/high risk families who have a diagnosis */}
          {result.riskLevel !== 'low' && onJustDiagnosed && (
            <div style={{
              padding: 16, borderRadius: 12, marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(107,144,128,0.10), rgba(123,167,188,0.10))',
              border: '1.5px solid rgba(107,144,128,0.25)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#6B9080', letterSpacing: '0.04em', marginBottom: 6 }}>
                IF YOUR CHILD ALREADY HAS A DIAGNOSIS
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: '0 0 12px' }}>
                Get your personalized First 30 Days plan — state-specific steps for DD agencies,
                Medicaid waivers, IEP requests, and therapy access.
              </p>
              <button
                onClick={onJustDiagnosed}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #6B9080, #7BA7BC)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(107,144,128,0.25)',
                }}
              >
                Get my First 30 Days plan →
              </button>
            </div>
          )}

          {/* Book Evaluation CTA — shown for moderate/high risk only */}
          {result.riskLevel !== 'low' && onBookEvaluation && (
            <div style={{ padding: 16, borderRadius: 12, backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Activity style={{ width: 18, height: 18, color: '#059669' }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: '#065f46' }}>Ready for a Professional Evaluation?</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                Based on your screening results, a diagnostic evaluation can provide a clear picture
                of your child's needs and unlock access to services and support.
              </p>
              <button
                onClick={onBookEvaluation}
                style={{ ...S.primaryBtn(true), backgroundColor: '#059669' }}
              >
                Book Diagnostic Evaluation <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          )}

          {/* THE LURE */}
          <div style={S.lureBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Sparkles style={{ width: 16, height: 16, color: '#6B9080' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>What Aminy does next</span>
            </div>
            {[
              result.riskLevel !== 'low' && `Match you with ${result.recommendedProviders[0]?.toLowerCase() || 'specialist'}s who accept your insurance`,
              "Save these results to share with your child's doctor",
              'Track daily behaviors and see what\'s changing over time',
              'Generate clinical-ready reports for evaluations',
              result.riskLevel === 'low' && 'Monitor milestones and re-screen when it\'s time',
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={S.lureItem}>
                <CheckCircle style={{ width: 14, height: 14, color: '#6B9080', flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ marginTop: 24 }}>
            <button onClick={onSignUp} style={S.primaryBtn(true)}>
              Save Results & Get Started Free <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
            <p style={{ textAlign: 'center', ...S.caption, marginTop: 12 }}>
              7-day free trial · No credit card required · Results saved automatically
            </p>
          </div>

          {/* Disclaimer */}
          <div style={S.disclaimer}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
              This screening is not a diagnosis. Results indicate risk level only. A qualified healthcare
              professional should be consulted for evaluation and diagnosis. If you are concerned about
              your child's immediate safety, call 911 or the 988 Suicide & Crisis Lifeline.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ---- MAIN RENDER ----

  return (
    <div style={S.fullScreen}>
      {/* Top bar */}
      <div style={S.topBar}>
        {phase !== 'results' ? (
          <button onClick={handleBack} style={S.topBarBtn} aria-label="Go back">
            <ArrowLeft style={{ width: 20, height: 20, color: 'var(--color-text-dim)' }} />
          </button>
        ) : <div style={{ width: 44 }} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles style={{ width: 16, height: 16, color: '#6B9080' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {phase === 'results' ? 'Screening Results' : 'Free Screening'}
          </span>
        </div>

        <button onClick={onBack} style={S.topBarBtn} aria-label="Close">
          <X style={{ width: 20, height: 20, color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* Phase content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {phase === 'concern' && renderConcern()}
        {phase === 'child-info' && renderChildInfo()}
        {phase === 'screening' && renderScreening()}
        {phase === 'results' && renderResults()}
      </div>
    </div>
  );
}

export default FreeScreeningFlow;
