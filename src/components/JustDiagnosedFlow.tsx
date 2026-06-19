// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * JustDiagnosedFlow — "You just got the news. We're here."
 *
 * Entry point for families the moment they receive an autism diagnosis.
 * This is the most emotionally critical touchpoint in the entire funnel.
 *
 * Flow:
 * 1. welcome      — Empathy landing. No information overload.
 * 2. state-select — Pick state (drives every subsequent recommendation)
 * 3. child-info   — Child name + age (optional, builds AI context)
 * 4. overwhelms   — Multi-select what's most overwhelming right now
 * 5. action-plan  — Personalized First 30 Days plan, state-specific
 * 6. cta          — Soft wall → signup or open AI companion
 *
 * All data persists to localStorage pre-signup. Migrated to Supabase post-signup.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Shield,
  BookOpen,
  Sparkles,
  CheckCircle,
  ChevronRight,
  Phone,
  Globe,
  Clock,
  Users,
  Star,
  Brain,
  Home,
  DollarSign,
  GraduationCap,
  HandHeart,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import {
  US_STATES,
  getStateConfig,
  generateFirst30DaysActionPlan,
  type ActionStep,
} from '../lib/state-configs';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type FlowPhase =
  | 'welcome'
  | 'state-select'
  | 'child-info'
  | 'overwhelms'
  | 'action-plan'
  | 'cta';

interface ChildInfo {
  name: string;
  ageYears: string;
}

interface JustDiagnosedFlowProps {
  onBack: () => void;
  onSignUp: () => void;
  onOpenAI?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERWHELM OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

interface OverwhelmOption {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}

const OVERWHELM_OPTIONS: OverwhelmOption[] = [
  {
    id: 'insurance',
    label: 'Insurance & Medicaid',
    subtitle: "What do we qualify for? What's covered?",
    icon: Shield,
    color: '#7BA7BC',
  },
  {
    id: 'therapy',
    label: 'Finding therapy',
    subtitle: 'ABA, OT, speech — where do we start?',
    icon: Brain,
    color: '#6B9080',
  },
  {
    id: 'school',
    label: 'School & IEP',
    subtitle: 'Special ed, ABA school, private vs. public',
    icon: GraduationCap,
    color: '#E07A5F',
  },
  {
    id: 'paying',
    label: "How we'll pay",
    subtitle: 'Waivers, grants, out-of-pocket costs',
    icon: DollarSign,
    color: '#43AA8B',
  },
  {
    id: 'understanding',
    label: 'Understanding the diagnosis',
    subtitle: 'What does autism actually mean for my child?',
    icon: BookOpen,
    color: '#7BA7BC',
  },
  {
    id: 'home',
    label: 'Supporting my child at home',
    subtitle: 'Behaviors, communication, daily routines',
    icon: Home,
    color: '#6B9080',
  },
  {
    id: 'self',
    label: 'Supporting myself',
    subtitle: "Grief, stress, guilt — it's okay to say it",
    icon: Heart,
    color: '#E07A5F',
  },
  {
    id: 'agency',
    label: 'DD agency & waivers',
    subtitle: 'DDD/DDS, HCBS waivers, waiver funding',
    icon: HandHeart,
    color: '#43AA8B',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY STYLING
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  insurance: { icon: Shield, color: '#7BA7BC', label: 'Benefits & Coverage' },
  therapy:   { icon: Brain,  color: '#6B9080', label: 'Therapy' },
  school:    { icon: GraduationCap, color: '#E07A5F', label: 'School & IEP' },
  financial: { icon: DollarSign, color: '#43AA8B', label: 'Financial' },
  'self-care': { icon: Heart, color: '#E07A5F', label: 'Take care of yourself' },
  community: { icon: Users, color: '#7BA7BC', label: 'Community & AI' },
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'This week',
  2: 'This month',
  3: 'Next 3 months',
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

const PHASES: FlowPhase[] = ['welcome', 'state-select', 'child-info', 'overwhelms', 'action-plan', 'cta'];

function ProgressBar({ phase }: { phase: FlowPhase }) {
  const idx = PHASES.indexOf(phase);
  const pct = Math.round(((idx + 1) / PHASES.length) * 100);

  return (
    <div style={{ position: 'relative', height: 3, background: '#E8E4DF', borderRadius: 99 }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #6B9080, #7BA7BC)',
          borderRadius: 99,
          transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function JustDiagnosedFlow({ onBack, onSignUp, onOpenAI }: JustDiagnosedFlowProps) {
  const [phase, setPhase] = useState<FlowPhase>('welcome');
  const [selectedState, setSelectedState] = useState('');
  const [childInfo, setChildInfo] = useState<ChildInfo>({ name: '', ageYears: '' });
  const [overwhelms, setOverwhelms] = useState<string[]>([]);
  const [actionPlan, setActionPlan] = useState<ActionStep[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [stateSearch, setStateSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top on phase change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [phase]);

  const goTo = useCallback((next: FlowPhase) => {
    setPhase(next);
    // Track funnel completion per step for analytics
    try {
      const key = 'aminy_jd_funnel';
      const prev = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(key, JSON.stringify({ ...prev, [next]: Date.now() }));
    } catch { /* ignore */ }
  }, []);

  const handleStateSelect = useCallback((abbr: string) => {
    setSelectedState(abbr);
    setStateSearch('');
    // Persist state immediately so AI chat picks it up in same session
    try { localStorage.setItem('aminy_user_state', abbr); } catch { /* ignore */ }
  }, []);

  const toggleOverwhelm = useCallback((id: string) => {
    setOverwhelms(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleGeneratePlan = useCallback(() => {
    const ageNum = childInfo.ageYears ? parseFloat(childInfo.ageYears) : undefined;
    const plan = generateFirst30DaysActionPlan(
      selectedState || 'AZ',
      overwhelms.length > 0 ? overwhelms : ['insurance', 'therapy', 'school'],
      ageNum,
    );
    setActionPlan(plan);
    goTo('action-plan');
  }, [selectedState, overwhelms, childInfo.ageYears, goTo]);

  // Persist to localStorage for post-signup migration
  const handleContinue = useCallback(() => {
    const data = {
      state: selectedState,
      childName: childInfo.name,
      childAge: childInfo.ageYears,
      overwhelms,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem('aminy_just_diagnosed', JSON.stringify(data));
    } catch { /* ignore */ }
    onSignUp();
  }, [selectedState, childInfo, overwhelms, onSignUp]);

  const stateConfig = selectedState ? getStateConfig(selectedState) : undefined;
  const filteredStates = stateSearch.trim()
    ? US_STATES.filter(s =>
        s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
        s.abbreviation.toLowerCase().includes(stateSearch.toLowerCase())
      )
    : US_STATES;

  // ── Shared container ──────────────────────────────────────────────────────

  return (
    <div
      ref={scrollRef}
      style={{
        minHeight: '100dvh',
        background: '#FAF7F2',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(250,247,242,0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '12px 20px 10px',
          borderBottom: phase === 'welcome' ? 'none' : '1px solid #E8E4DF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button
            onClick={phase === 'welcome' ? onBack : () => {
              const idx = PHASES.indexOf(phase);
              if (idx > 0) goTo(PHASES[idx - 1]);
              else onBack();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              color: '#5A6B7A',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6B9080', letterSpacing: '0.04em' }}>
              AMINY
            </div>
            <div style={{ fontSize: 12, color: '#8A9BA8', marginTop: 1 }}>
              {phase === 'welcome' && 'Here for you'}
              {phase === 'state-select' && 'Step 1 of 4 — Your state'}
              {phase === 'child-info' && 'Step 2 of 4 — About your child'}
              {phase === 'overwhelms' && 'Step 3 of 4 — What\'s overwhelming'}
              {phase === 'action-plan' && 'Your First 30 Days'}
              {phase === 'cta' && 'Ready to start'}
            </div>
          </div>
          {phase === 'action-plan' && stateConfig && (
            <div
              style={{
                background: 'rgba(107,144,128,0.10)',
                borderRadius: 100,
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: '#6B9080',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MapPin size={11} />
              {stateConfig.abbreviation}
            </div>
          )}
        </div>
        {phase !== 'welcome' && <ProgressBar phase={phase} />}
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '0 20px 32px' }}>

        {/* ── WELCOME ───────────────────────────────────────────────────── */}
        {phase === 'welcome' && (
          <div style={{ paddingTop: 32 }}>
            {/* Illustration mark */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 28,
                  background: 'linear-gradient(135deg, rgba(107,144,128,0.15), rgba(123,167,188,0.15))',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  boxShadow: '0 4px 24px rgba(107,144,128,0.12)',
                }}
              >
                <Heart size={36} color="#6B9080" strokeWidth={1.5} />
              </div>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#1B2733',
                  lineHeight: 1.25,
                  margin: '0 0 12px',
                  letterSpacing: '-0.5px',
                }}
              >
                You just got the news.
                <br />
                <span style={{ color: '#6B9080' }}>We're here.</span>
              </h1>
              <p style={{ fontSize: 16, color: '#5A6B7A', lineHeight: 1.6, margin: 0 }}>
                An autism diagnosis changes everything — and nothing. Your child is the
                same child they were yesterday. But now you have a name for it,
                and a path forward.
              </p>
            </div>

            {/* Three pillars */}
            {[
              {
                icon: Shield,
                title: 'Know exactly what you qualify for',
                body: 'State Medicaid, DD agency, HCBS waivers, paid parent caregiving — Aminy knows every program in your state.',
                color: '#7BA7BC',
              },
              {
                icon: Brain,
                title: 'A clear first-steps plan',
                body: 'No jargon. No overwhelm. A prioritized list of what to do this week, this month, and in the next 90 days.',
                color: '#6B9080',
              },
              {
                icon: Sparkles,
                title: 'AI that knows autism services',
                body: 'Ask anything at 2am. Insurance denials, IEP rights, what ABA actually looks like — Aminy has answers.',
                color: '#43AA8B',
              },
            ].map(({ icon: Icon, title, body, color }) => (
              <div
                key={title}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E8E4DF',
                  borderRadius: 16,
                  padding: '16px 18px',
                  marginBottom: 12,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `${color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1B2733', marginBottom: 4 }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 13, color: '#5A6B7A', lineHeight: 1.55 }}>
                    {body}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <p
                style={{
                  fontSize: 13,
                  color: '#8A9BA8',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Takes 2 minutes. Free. No account required to get your plan.
              </p>
            </div>

            <button
              onClick={() => goTo('state-select')}
              style={{
                width: '100%',
                padding: '15px 20px',
                background: 'linear-gradient(135deg, #6B9080, #7BA7BC)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
                boxShadow: '0 4px 20px rgba(107,144,128,0.30)',
                letterSpacing: '-0.2px',
              }}
            >
              Build my First 30 Days plan
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── STATE SELECT ──────────────────────────────────────────────── */}
        {phase === 'state-select' && (
          <div style={{ paddingTop: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1B2733', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              Which state are you in?
            </h2>
            <p style={{ fontSize: 14, color: '#5A6B7A', margin: '0 0 20px', lineHeight: 1.55 }}>
              Every state has different program names, agencies, waitlists, and coverage rules.
              We'll use this to make your plan specific to where you live.
            </p>

            {/* Search */}
            <div
              style={{
                background: '#fff',
                border: `1.5px solid ${stateSearch ? '#6B9080' : '#E8E4DF'}`,
                borderRadius: 12,
                padding: '11px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
                transition: 'border-color 0.2s',
              }}
            >
              <MapPin size={16} color="#8A9BA8" />
              <input
                value={stateSearch}
                onChange={e => setStateSearch(e.target.value)}
                placeholder="Search states…"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  color: '#1B2733',
                  background: 'transparent',
                }}
              />
            </div>

            {/* State list */}
            <div
              style={{
                maxHeight: 380,
                overflowY: 'auto',
                borderRadius: 14,
                border: '1px solid #E8E4DF',
                background: '#fff',
                marginBottom: 20,
              }}
            >
              {filteredStates.map((state, idx) => (
                <button
                  key={state.abbreviation}
                  onClick={() => handleStateSelect(state.abbreviation)}
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    background: selectedState === state.abbreviation ? 'rgba(107,144,128,0.08)' : 'transparent',
                    border: 'none',
                    borderBottom: idx < filteredStates.length - 1 ? '1px solid #F0EDE8' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#1B2733' }}>
                      {state.name}
                    </span>
                    <span style={{ fontSize: 12, color: '#8A9BA8', marginLeft: 8 }}>
                      {state.abbreviation}
                    </span>
                  </div>
                  {selectedState === state.abbreviation && (
                    <CheckCircle size={18} color="#6B9080" />
                  )}
                </button>
              ))}
              {filteredStates.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#8A9BA8', fontSize: 14 }}>
                  No states match "{stateSearch}"
                </div>
              )}
            </div>

            {/* Selected state preview */}
            {selectedState && stateConfig && (
              <div
                style={{
                  background: 'rgba(107,144,128,0.08)',
                  border: '1px solid rgba(107,144,128,0.20)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#6B9080', marginBottom: 8, letterSpacing: '0.04em' }}>
                  {stateConfig.name.toUpperCase()} AT A GLANCE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <StateInfoRow icon={Shield} label="Medicaid" value={stateConfig.medicaid.name} />
                  <StateInfoRow icon={HandHeart} label="DD Agency" value={`${stateConfig.ddAgency.name} (${stateConfig.ddAgency.abbreviation})`} />
                  <StateInfoRow
                    icon={Clock}
                    label="Waiver wait"
                    value={
                      stateConfig.waiver.estimatedWaitMonths === 0
                        ? 'No waitlist ✓'
                        : stateConfig.waiver.estimatedWaitMonths
                          ? `~${stateConfig.waiver.estimatedWaitMonths} months — apply now`
                          : stateConfig.waiver.name
                    }
                    accent={stateConfig.waiver.estimatedWaitMonths === 0}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => goTo('child-info')}
              disabled={!selectedState}
              style={{
                width: '100%',
                padding: '15px 20px',
                background: selectedState
                  ? 'linear-gradient(135deg, #6B9080, #7BA7BC)'
                  : '#E8E4DF',
                color: selectedState ? '#fff' : '#8A9BA8',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: selectedState ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: selectedState ? '0 4px 20px rgba(107,144,128,0.25)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── CHILD INFO ────────────────────────────────────────────────── */}
        {phase === 'child-info' && (
          <div style={{ paddingTop: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1B2733', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              Tell us about your child
            </h2>
            <p style={{ fontSize: 14, color: '#5A6B7A', margin: '0 0 24px', lineHeight: 1.55 }}>
              Optional — helps us personalize your plan (e.g., Early Intervention applies under age 3).
              You can skip this step.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5A6B7A', marginBottom: 8, letterSpacing: '0.03em' }}>
                CHILD'S FIRST NAME (optional)
              </label>
              <input
                value={childInfo.name}
                onChange={e => setChildInfo(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Liam"
                style={{
                  width: '100%',
                  padding: '13px 14px',
                  fontSize: 16,
                  border: '1.5px solid #E8E4DF',
                  borderRadius: 12,
                  background: '#fff',
                  color: '#1B2733',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#6B9080'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E8E4DF'; }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5A6B7A', marginBottom: 8, letterSpacing: '0.03em' }}>
                CHILD'S AGE
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {['Under 2', '2–3', '3–5', '5–8', '8–12', '12–17', '18–21', '21+'].map(label => {
                  const ageMap: Record<string, string> = {
                    'Under 2': '1', '2–3': '2.5', '3–5': '4', '5–8': '6',
                    '8–12': '10', '12–17': '14', '18–21': '19', '21+': '22',
                  };
                  const val = ageMap[label];
                  const sel = childInfo.ageYears === val;
                  return (
                    <button
                      key={label}
                      onClick={() => setChildInfo(p => ({ ...p, ageYears: p.ageYears === val ? '' : val }))}
                      style={{
                        padding: '10px 8px',
                        border: `1.5px solid ${sel ? '#6B9080' : '#E8E4DF'}`,
                        borderRadius: 10,
                        background: sel ? 'rgba(107,144,128,0.10)' : '#fff',
                        color: sel ? '#6B9080' : '#5A6B7A',
                        fontSize: 13,
                        fontWeight: sel ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Early intervention note */}
            {childInfo.ageYears && parseFloat(childInfo.ageYears) <= 3 && (
              <div
                style={{
                  background: 'rgba(123,167,188,0.10)',
                  border: '1px solid rgba(123,167,188,0.25)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 20,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <Star size={16} color="#7BA7BC" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, color: '#4A6478', lineHeight: 1.55, margin: 0 }}>
                  <strong>Early Intervention (Part C of IDEA)</strong> — For children under 3,
                  the state must provide free developmental services. Contact your {selectedState
                    ? `${getStateConfig(selectedState)?.ddAgency.abbreviation} or` : ''} local
                  Early Intervention program immediately.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => goTo('overwhelms')}
                style={{
                  flex: 1,
                  padding: '15px 20px',
                  background: 'transparent',
                  color: '#5A6B7A',
                  border: '1.5px solid #E8E4DF',
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
              <button
                onClick={() => goTo('overwhelms')}
                style={{
                  flex: 2,
                  padding: '15px 20px',
                  background: 'linear-gradient(135deg, #6B9080, #7BA7BC)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 20px rgba(107,144,128,0.25)',
                }}
              >
                Continue
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── OVERWHELMS ────────────────────────────────────────────────── */}
        {phase === 'overwhelms' && (
          <div style={{ paddingTop: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1B2733', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              {childInfo.name
                ? `What are you most overwhelmed about for ${childInfo.name}?`
                : 'What are you most overwhelmed about right now?'}
            </h2>
            <p style={{ fontSize: 14, color: '#5A6B7A', margin: '0 0 20px', lineHeight: 1.55 }}>
              Select everything that applies. Your plan will prioritize based on what matters
              most to you. There's no wrong answer.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {OVERWHELM_OPTIONS.map(opt => {
                const sel = overwhelms.includes(opt.id);
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleOverwhelm(opt.id)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: sel ? `${opt.color}12` : '#fff',
                      border: `1.5px solid ${sel ? opt.color : '#E8E4DF'}`,
                      borderRadius: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 11,
                        background: sel ? `${opt.color}22` : '#F5F2EC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}
                    >
                      <Icon size={20} color={sel ? opt.color : '#8A9BA8'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: sel ? '#1B2733' : '#3A4A57',
                          marginBottom: 2,
                        }}
                      >
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 12, color: '#8A9BA8', lineHeight: 1.4 }}>
                        {opt.subtitle}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: `2px solid ${sel ? opt.color : '#D8D4CF'}`,
                        background: sel ? opt.color : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}
                    >
                      {sel && <CheckCircle size={13} color="#fff" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {overwhelms.length > 0 && (
              <p style={{ fontSize: 13, textAlign: 'center', color: '#8A9BA8', marginBottom: 12 }}>
                {overwhelms.length} selected — your plan will prioritize these
              </p>
            )}

            <button
              onClick={handleGeneratePlan}
              style={{
                width: '100%',
                padding: '15px 20px',
                background: 'linear-gradient(135deg, #6B9080, #7BA7BC)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 20px rgba(107,144,128,0.25)',
              }}
            >
              Build my plan
              <Sparkles size={18} />
            </button>
          </div>
        )}

        {/* ── ACTION PLAN ───────────────────────────────────────────────── */}
        {phase === 'action-plan' && (
          <div style={{ paddingTop: 24 }}>
            {/* Hero */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(107,144,128,0.12), rgba(123,167,188,0.12))',
                border: '1px solid rgba(107,144,128,0.20)',
                borderRadius: 18,
                padding: '20px 18px',
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #6B9080, #7BA7BC)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  boxShadow: '0 4px 16px rgba(107,144,128,0.25)',
                }}
              >
                <Star size={24} color="#fff" />
              </div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#1B2733',
                  margin: '0 0 6px',
                  letterSpacing: '-0.3px',
                }}
              >
                Your First 30 Days
                {childInfo.name ? ` for ${childInfo.name}` : ''}
              </h2>
              <p style={{ fontSize: 14, color: '#5A6B7A', margin: '0 0 12px', lineHeight: 1.5 }}>
                {stateConfig ? (
                  <>Personalized for <strong style={{ color: '#6B9080' }}>{stateConfig.name}</strong> — {stateConfig.ddAgency.abbreviation}, {stateConfig.medicaid.name}, {stateConfig.waiver.abbreviation}</>
                ) : (
                  'Personalized for your situation'
                )}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                <span
                  style={{
                    background: 'rgba(107,144,128,0.15)',
                    color: '#6B9080',
                    borderRadius: 100,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {actionPlan.length} action steps
                </span>
                <span
                  style={{
                    background: 'rgba(123,167,188,0.15)',
                    color: '#4A8A9C',
                    borderRadius: 100,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {actionPlan.filter(s => s.stateSpecific).length} state-specific
                </span>
              </div>
            </div>

            {/* Group by priority */}
            {([1, 2, 3] as const).map(pri => {
              const steps = actionPlan.filter(s => s.priority === pri);
              if (steps.length === 0) return null;
              return (
                <div key={pri} style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: pri === 1 ? '#E07A5F' : pri === 2 ? '#6B9080' : '#8A9BA8',
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 99,
                        background: pri === 1 ? '#E07A5F' : pri === 2 ? '#6B9080' : '#8A9BA8',
                      }}
                    />
                    {PRIORITY_LABELS[pri].toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {steps.map((step, idx) => {
                      const globalIdx = actionPlan.indexOf(step);
                      const isExpanded = expandedStep === globalIdx;
                      const catConf = CATEGORY_CONFIG[step.category] || CATEGORY_CONFIG.community;
                      const CatIcon = catConf.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => setExpandedStep(isExpanded ? null : globalIdx)}
                          style={{
                            width: '100%',
                            background: '#fff',
                            border: `1.5px solid ${isExpanded ? catConf.color : '#E8E4DF'}`,
                            borderRadius: 14,
                            padding: '14px 16px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: `${catConf.color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <CatIcon size={18} color={catConf.color} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: '#1B2733',
                                  lineHeight: 1.4,
                                  marginBottom: 2,
                                }}
                              >
                                {step.title}
                              </div>
                              {step.stateSpecific && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    background: 'rgba(107,144,128,0.10)',
                                    color: '#6B9080',
                                    borderRadius: 100,
                                    padding: '1px 7px',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    letterSpacing: '0.04em',
                                    marginTop: 2,
                                  }}
                                >
                                  {selectedState} SPECIFIC
                                </span>
                              )}
                            </div>
                            <ChevronRight
                              size={16}
                              color="#8A9BA8"
                              style={{
                                flexShrink: 0,
                                marginTop: 2,
                                transform: isExpanded ? 'rotate(90deg)' : 'none',
                                transition: 'transform 0.2s',
                              }}
                            />
                          </div>
                          {isExpanded && (
                            <div style={{ marginTop: 12, paddingLeft: 48 }}>
                              <p
                                style={{
                                  fontSize: 13,
                                  color: '#5A6B7A',
                                  lineHeight: 1.6,
                                  margin: '0 0 10px',
                                }}
                              >
                                {step.description}
                              </p>
                              {step.url && (
                                <a
                                  href={step.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#7BA7BC',
                                    textDecoration: 'none',
                                  }}
                                >
                                  <Globe size={12} />
                                  Official resource
                                </a>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* State agency quick card */}
            {stateConfig && (
              <div
                style={{
                  background: 'rgba(107,144,128,0.07)',
                  border: '1px solid rgba(107,144,128,0.18)',
                  borderRadius: 16,
                  padding: '16px 18px',
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#6B9080',
                    letterSpacing: '0.05em',
                    marginBottom: 10,
                  }}
                >
                  {stateConfig.ddAgency.abbreviation} QUICK CONTACT
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1B2733', marginBottom: 4 }}>
                  {stateConfig.ddAgency.name}
                </div>
                {stateConfig.ddAgency.phone && (
                  <a
                    href={`tel:${stateConfig.ddAgency.phone.replace(/\D/g, '')}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#6B9080',
                      textDecoration: 'none',
                      marginBottom: 8,
                    }}
                  >
                    <Phone size={14} />
                    {stateConfig.ddAgency.phone}
                  </a>
                )}
                <p style={{ fontSize: 12, color: '#5A6B7A', lineHeight: 1.5, margin: 0 }}>
                  {stateConfig.ddAgency.intakeProcess}
                </p>
              </div>
            )}

            <button
              onClick={() => goTo('cta')}
              style={{
                width: '100%',
                padding: '15px 20px',
                background: 'linear-gradient(135deg, #6B9080, #7BA7BC)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 20px rgba(107,144,128,0.25)',
              }}
            >
              Save my plan & get started
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        {phase === 'cta' && (
          <div style={{ paddingTop: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  background: 'linear-gradient(135deg, #6B9080, #7BA7BC)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                  boxShadow: '0 8px 32px rgba(107,144,128,0.30)',
                }}
              >
                <Sparkles size={32} color="#fff" />
              </div>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#1B2733',
                  margin: '0 0 10px',
                  letterSpacing: '-0.4px',
                  lineHeight: 1.25,
                }}
              >
                Your plan is ready.
                <br />
                <span style={{ color: '#6B9080' }}>Let's put it to work.</span>
              </h2>
              <p style={{ fontSize: 15, color: '#5A6B7A', margin: 0, lineHeight: 1.6 }}>
                Create a free Aminy account to save your plan, unlock the AI companion,
                and never start from scratch again.
              </p>
            </div>

            {/* Feature bullets */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #E8E4DF',
                borderRadius: 18,
                padding: '18px 18px',
                marginBottom: 24,
              }}
            >
              {[
                {
                  icon: Brain,
                  color: '#6B9080',
                  title: 'Aminy AI — always on',
                  body: 'Ask anything about your plan, your rights, your insurance. 24/7, no appointment needed.',
                },
                {
                  icon: Shield,
                  color: '#7BA7BC',
                  title: 'Benefits Navigator',
                  body: stateConfig
                    ? `Track your ${stateConfig.ddAgency.abbreviation} application, ${stateConfig.medicaid.name} coverage, and waiver status.`
                    : 'Track your DD agency application, Medicaid coverage, and waiver status.',
                },
                {
                  icon: Users,
                  color: '#43AA8B',
                  title: 'Provider matching',
                  body: 'Find BCBAs, OTs, and SLPs who accept your insurance and are taking new families.',
                },
                {
                  icon: Heart,
                  color: '#E07A5F',
                  title: 'Parent community',
                  body: 'Connect with families who have been exactly where you are right now.',
                },
              ].map(({ icon: Icon, color, title, body }) => (
                <div
                  key={title}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    paddingBottom: 14,
                    marginBottom: 14,
                    borderBottom: '1px solid #F0EDE8',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1B2733', marginBottom: 2 }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 12, color: '#5A6B7A', lineHeight: 1.5 }}>
                      {body}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} color="#6B9080" />
                <span style={{ fontSize: 13, color: '#5A6B7A' }}>
                  Free to start — no credit card required
                </span>
              </div>
            </div>

            {/* Journey Roadmap */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #E8E4DF',
                borderRadius: 18,
                padding: '18px 18px',
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2733', marginBottom: 14, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Your Journey — 6 Steps
              </div>
              {[
                { step: 1, label: 'Get a formal evaluation', screen: 'developmental-screener', icon: '🔍' },
                { step: 2, label: 'Request school IEP evaluation', screen: 'resource-library', icon: '🏫' },
                { step: 3, label: 'Start ABA therapy', screen: 'booking', icon: '🎯' },
                { step: 4, label: 'Set up medication tracking', screen: 'medications', icon: '💊' },
                { step: 5, label: 'Understand your coverage', screen: 'benefits', icon: '🛡️' },
                { step: 6, label: 'Connect with other families', screen: 'community-hub', icon: '👨‍👩‍👧' },
              ].map(({ step, label, screen: _screen, icon }) => (
                <div
                  key={step}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    paddingBottom: step < 6 ? 12 : 0,
                    marginBottom: step < 6 ? 12 : 0,
                    borderBottom: step < 6 ? '1px solid #F0EDE8' : 'none',
                  }}
                >
                  <div style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#8A9BA8', fontWeight: 600 }}>Step {step}</div>
                    <div style={{ fontSize: 14, color: '#1B2733', fontWeight: 500 }}>{label}</div>
                  </div>
                  <ChevronRight size={16} color="#C0CDD4" />
                </div>
              ))}
            </div>

            <button
              onClick={handleContinue}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #6B9080, #7BA7BC)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 17,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 6px 24px rgba(107,144,128,0.35)',
                marginBottom: 12,
                letterSpacing: '-0.2px',
              }}
            >
              Create free account
              <ArrowRight size={18} />
            </button>

            {onOpenAI && (
              <button
                onClick={onOpenAI}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: 'transparent',
                  color: '#6B9080',
                  border: '1.5px solid rgba(107,144,128,0.30)',
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <Brain size={16} />
                Ask Aminy AI a question first
              </button>
            )}

            <p
              style={{
                fontSize: 12,
                color: '#8A9BA8',
                textAlign: 'center',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Your plan and selections are saved. By creating an account you agree to
              our Privacy Policy and Terms of Service — your data is HIPAA-protected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER SUBCOMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StateInfoRow({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <Icon size={14} color={accent ? '#43AA8B' : '#8A9BA8'} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 12, color: '#8A9BA8' }}>{label}: </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: accent ? '#43AA8B' : '#3A4A57',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
