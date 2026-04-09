// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Sparkles,
  Brain,
  Target,
  Clock,
  BarChart3,
  Calendar,
  FileText,
  CheckCircle,
  Users,
  Heart,
  Star,
  Activity,
  Clipboard,
  Download,
  Share,
  ExternalLink,
  TrendingUp,
  Play,
  Pause,
  RefreshCw,
  Lightbulb,
  Shield,
  UserCheck,
  Zap,
  Pencil,
  Check,
  X,
  MessageSquare
} from "lucide-react";
import { supabase } from '../utils/supabase/client';
import { useAminyStore } from '../lib/store';

interface CarePlanFormData {
  childName?: string;
  needsDomains?: string[];
  goals?: string[];
  tonePreference?: string;
  [key: string]: unknown;
}

interface CarePlanGeneratorStepProps {
  formData: CarePlanFormData;
  onComplete: () => void;
}

// Editable goal structure — extends template with user customizations + progress
interface EditableGoal {
  dbId?: string;              // UUID from Supabase treatment_goals table
  domain: string;
  goal: string;
  baseline: string;
  target: string;
  timeline: string;
  strategies: string[];
  // Progress tracking fields
  progressPercent: number;    // 0-100
  lastUpdated: string | null; // ISO date string
  notes: string;              // Parent notes on progress
  status: 'not_started' | 'in_progress' | 'on_track' | 'needs_attention' | 'achieved';
}

// ============================================================================
// Supabase persistence helpers
// ============================================================================

/** Map UI domain labels to treatment_goals DB domain enum values */
const DOMAIN_TO_DB: Record<string, string> = {
  'Speech & Communication': 'communication',
  'Social Skills': 'social',
  'Daily Routines': 'daily_living',
  'Focus & Attention': 'academic',
  'Sensory Processing': 'self_regulation',
  'Emotional Regulation': 'self_regulation',
  'Sleep & Rest': 'daily_living',
  'General Development Support': 'other',
};

/** Reverse map: DB domain -> UI domain label (best-effort) */
const DB_TO_DOMAIN: Record<string, string> = {
  communication: 'Speech & Communication',
  social: 'Social Skills',
  daily_living: 'Daily Routines',
  academic: 'Focus & Attention',
  self_regulation: 'Sensory Processing',
  other: 'General Development Support',
  behavior: 'Emotional Regulation',
  motor: 'General Development Support',
  play: 'Social Skills',
};

/** Map EditableGoal status -> treatment_goals DB status */
function statusToDb(s: EditableGoal['status']): string {
  switch (s) {
    case 'achieved': return 'mastered';
    case 'on_track': return 'in_progress';
    case 'needs_attention': return 'on_hold';
    case 'in_progress': return 'in_progress';
    case 'not_started':
    default: return 'not_started';
  }
}

/** Map treatment_goals DB status -> EditableGoal status */
function statusFromDb(s: string): EditableGoal['status'] {
  switch (s) {
    case 'mastered': return 'achieved';
    case 'in_progress': return 'in_progress';
    case 'on_hold': return 'needs_attention';
    case 'discontinued': return 'needs_attention';
    case 'not_started':
    default: return 'not_started';
  }
}

/** Convert an EditableGoal to a treatment_goals row payload */
function goalToDbRow(goal: EditableGoal, planId: string) {
  return {
    ...(goal.dbId ? { id: goal.dbId } : {}),
    plan_id: planId,
    title: goal.goal,
    description: JSON.stringify({ strategies: goal.strategies, notes: goal.notes }),
    domain: DOMAIN_TO_DB[goal.domain] || 'other',
    baseline: goal.baseline,
    target: goal.target,
    measurement_method: goal.timeline,
    status: statusToDb(goal.status),
    current_progress: goal.progressPercent,
  };
}

/** Convert a treatment_goals DB row back to an EditableGoal */
function goalFromDbRow(row: Record<string, unknown>): EditableGoal {
  let strategies: string[] = [];
  let notes = '';
  try {
    const desc = typeof row.description === 'string' ? JSON.parse(row.description) : null;
    if (desc && Array.isArray(desc.strategies)) strategies = desc.strategies;
    if (desc && typeof desc.notes === 'string') notes = desc.notes;
  } catch {
    // description wasn't JSON — treat as plain text
    if (typeof row.description === 'string') notes = row.description;
  }

  return {
    dbId: row.id as string,
    domain: DB_TO_DOMAIN[row.domain as string] || (row.domain as string) || 'General Development Support',
    goal: row.title as string,
    baseline: (row.baseline as string) || '',
    target: (row.target as string) || '',
    timeline: (row.measurement_method as string) || '12 weeks',
    strategies,
    progressPercent: (row.current_progress as number) || 0,
    lastUpdated: (row.updated_at as string) || null,
    notes,
    status: statusFromDb((row.status as string) || 'not_started'),
  };
}

export function CarePlanGeneratorStep({ formData, onComplete }: CarePlanGeneratorStepProps) {
  const [generationPhase, setGenerationPhase] = useState<'initial' | 'analyzing' | 'generating' | 'complete'>('initial');
  const [currentGoal, setCurrentGoal] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Editable goals state — populated when generation completes
  const [editableGoals, setEditableGoals] = useState<EditableGoal[]>([]);
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null);
  const [editField, setEditField] = useState<'baseline' | 'target' | 'goal' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showProgressFor, setShowProgressFor] = useState<number | null>(null);

  // ---- Supabase persistence state ----
  const user = useAminyStore((s) => s.user);
  const [planId, setPlanId] = useState<string | null>(null);
  const [loadedFromDb, setLoadedFromDb] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Load or create treatment plan + existing goals on mount ----
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function loadPlan() {
      try {
        // 1. Try to find an existing active treatment plan for this user
        const { data: existingPlan, error: planError } = await supabase
          .from('treatment_plans')
          .select('id')
          .eq('user_id', user!.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (planError) {
          console.warn('[CarePlan] Error loading treatment plan:', planError.message);
          return;
        }

        if (existingPlan) {
          setPlanId(existingPlan.id);

          // 2. Load existing goals for this plan
          const { data: existingGoals, error: goalsError } = await supabase
            .from('treatment_goals')
            .select('*')
            .eq('plan_id', existingPlan.id)
            .order('created_at', { ascending: true });

          if (cancelled) return;

          if (goalsError) {
            console.warn('[CarePlan] Error loading goals:', goalsError.message);
            return;
          }

          if (existingGoals && existingGoals.length > 0) {
            // Restore goals from DB — skip the generation animation
            const restored = existingGoals.map(goalFromDbRow);
            setEditableGoals(restored);
            setGenerationPhase('complete');
            setLoadedFromDb(true);
          }
        }
      } catch (err) {
        // Graceful fallback: Supabase unavailable — continue with local-only state
        console.warn('[CarePlan] Supabase unavailable, using local state only:', err);
      }
    }

    loadPlan();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ---- Ensure a treatment plan row exists (called when goals are first generated) ----
  const ensurePlanExists = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;
    if (planId) return planId;

    try {
      const childName = formData.childName || 'Care Plan';

      // Insert a new active plan
      const { data, error } = await supabase
        .from('treatment_plans')
        .insert({
          user_id: user.id,
          child_id: user.id, // Use user_id as child_id fallback; update when child profiles are wired
          title: `${childName}'s Care Plan`,
          description: `AI-generated care plan for ${childName}`,
          status: 'active',
          review_frequency: 'monthly',
          start_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (error) {
        console.warn('[CarePlan] Error creating treatment plan:', error.message);
        return null;
      }

      setPlanId(data.id);
      return data.id;
    } catch (err) {
      console.warn('[CarePlan] Supabase unavailable for plan creation:', err);
      return null;
    }
  }, [user?.id, planId, formData.childName]);

  // ---- Save goals to Supabase ----
  const saveGoalsToDb = useCallback(async (goals: EditableGoal[]) => {
    if (!user?.id || goals.length === 0) return;

    try {
      const currentPlanId = planId || await ensurePlanExists();
      if (!currentPlanId) return;

      const rows = goals.map((g) => goalToDbRow(g, currentPlanId));

      const { data, error } = await supabase
        .from('treatment_goals')
        .upsert(rows, { onConflict: 'id' })
        .select('id');

      if (error) {
        console.warn('[CarePlan] Error saving goals:', error.message);
        return;
      }

      // Update local state with DB IDs (for new goals that didn't have dbId yet)
      if (data && data.length === goals.length) {
        setEditableGoals((prev) => {
          // Only update if lengths still match (no concurrent changes)
          if (prev.length !== data.length) return prev;
          return prev.map((g, i) => (g.dbId ? g : { ...g, dbId: data[i].id }));
        });
      }
    } catch (err) {
      console.warn('[CarePlan] Supabase unavailable for goal save:', err);
    }
  }, [user?.id, planId, ensurePlanExists]);

  // ---- Debounced auto-save: triggers 1.5s after last edit ----
  const debouncedSave = useCallback((goals: EditableGoal[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveGoalsToDb(goals);
    }, 1500);
  }, [saveGoalsToDb]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ---- Watch editableGoals for changes and auto-save ----
  const prevGoalsRef = useRef<EditableGoal[]>([]);
  useEffect(() => {
    // Skip the initial empty state and skip if goals haven't actually changed
    if (editableGoals.length === 0) return;
    if (editableGoals === prevGoalsRef.current) return;
    prevGoalsRef.current = editableGoals;

    // Only auto-save once we have a user and goals have DB IDs (i.e., after first save)
    // or when generation just completed (goals are new)
    if (generationPhase === 'complete' && user?.id) {
      debouncedSave(editableGoals);
    }
  }, [editableGoals, generationPhase, user?.id, debouncedSave]);

  // Build editable goals from domain templates
  const buildGoalsFromDomains = useCallback((): EditableGoal[] => {
    const goalTemplates: Record<string, Omit<EditableGoal, 'dbId' | 'progressPercent' | 'lastUpdated' | 'notes' | 'status'>> = {
      speech: {
        domain: "Speech & Communication",
        goal: "Increase functional communication requests",
        baseline: "Currently uses 5-10 single words consistently",
        target: "Use 2-3 word phrases for 80% of daily requests",
        timeline: "12 weeks",
        strategies: ["Visual supports", "Modeling", "Natural environment teaching"]
      },
      social: {
        domain: "Social Skills",
        goal: "Improve parallel and interactive play skills",
        baseline: "Engages in solitary play for 90% of structured time",
        target: "Initiate or respond to peer interaction 3+ times per play session",
        timeline: "16 weeks",
        strategies: ["Structured play activities", "Peer modeling", "Social stories"]
      },
      routines: {
        domain: "Daily Routines",
        goal: "Complete morning routine independently",
        baseline: "Requires physical prompts for 4/6 routine steps",
        target: "Complete routine with visual cues only (90% accuracy)",
        timeline: "8 weeks",
        strategies: ["Visual schedule", "Task analysis", "Reinforcement system"]
      },
      focus: {
        domain: "Focus & Attention",
        goal: "Increase sustained attention during activities",
        baseline: "Maintains focus for 2-3 minutes on preferred tasks",
        target: "Sustain attention for 10+ minutes during structured activities",
        timeline: "10 weeks",
        strategies: ["Break tasks into chunks", "Visual timers", "Preferred activity choices"]
      },
      sensory: {
        domain: "Sensory Processing",
        goal: "Develop self-regulation strategies for sensory needs",
        baseline: "Shows overwhelm signs in 70% of transitions",
        target: "Use coping strategies independently in 80% of situations",
        timeline: "14 weeks",
        strategies: ["Sensory break cards", "Deep pressure tools", "Environmental modifications"]
      },
      emotional: {
        domain: "Emotional Regulation",
        goal: "Use calming strategies during emotional moments",
        baseline: "Requires adult support for emotional regulation 90% of time",
        target: "Independently use calming strategies in 70% of situations",
        timeline: "12 weeks",
        strategies: ["Emotion cards", "Breathing techniques", "Safe space access"]
      },
      sleep: {
        domain: "Sleep & Rest",
        goal: "Establish consistent bedtime routine",
        baseline: "Takes 45-60 minutes to fall asleep with multiple wake-ups",
        target: "Fall asleep within 20 minutes with minimal wake-ups",
        timeline: "6 weeks",
        strategies: ["Visual bedtime schedule", "Calming activities", "Environment optimization"]
      }
    };

    const selectedDomains = formData.needsDomains || ['speech', 'social', 'routines'];
    return selectedDomains.slice(0, 3).map((domain: string) => {
      const template = goalTemplates[domain] || goalTemplates.speech;
      return {
        ...template,
        progressPercent: 0,
        lastUpdated: null,
        notes: '',
        status: 'not_started' as const,
      };
    });
  }, [formData.needsDomains]);

  // Start AI generation process
  useEffect(() => {
    if (generationPhase === 'initial') {
      const timer = setTimeout(() => {
        setGenerationPhase('analyzing');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [generationPhase]);

  useEffect(() => {
    if (generationPhase === 'analyzing') {
      const timer = setTimeout(() => {
        setGenerationPhase('generating');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [generationPhase]);

  useEffect(() => {
    if (generationPhase === 'generating') {
      const timer = setTimeout(() => {
        // Populate editable goals from templates when generation completes
        const newGoals = buildGoalsFromDomains();
        setEditableGoals(newGoals);
        setGenerationPhase('complete');
        // Immediately persist newly generated goals to Supabase
        saveGoalsToDb(newGoals);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [generationPhase, buildGoalsFromDomains, saveGoalsToDb]);

  // Helper functions
  const getChildName = () => formData.childName || "your child";
  const getSelectedDomains = () => {
    const domains = formData.needsDomains || [];
    const domainLabels: { [key: string]: string } = {
      speech: "Speech & Communication",
      focus: "Focus & Attention", 
      social: "Social Skills",
      sensory: "Sensory Processing",
      routines: "Daily Routines",
      emotional: "Emotional Regulation",
      sleep: "Sleep & Rest"
    };
    
    return domains.length > 0 
      ? domains.map((id: string) => domainLabels[id] || id)
      : ["General Development Support"];
  };

  const getToneStyle = () => {
    const tone = formData.tonePreference || "Supportive";
    const toneDescriptions: { [key: string]: string } = {
      "Supportive": "gentle encouragement",
      "Direct": "clear, step-by-step guidance",
      "Playful": "lighthearted + fun approach"
    };
    return toneDescriptions[tone] || "supportive guidance";
  };

  // --- Inline editing helpers ---
  const startEditing = (goalIndex: number, field: 'baseline' | 'target' | 'goal') => {
    setEditingGoalIndex(goalIndex);
    setEditField(field);
    setEditValue(editableGoals[goalIndex]?.[field] || '');
  };

  const saveEdit = () => {
    if (editingGoalIndex === null || editField === null) return;
    setEditableGoals(prev => prev.map((g, i) =>
      i === editingGoalIndex ? { ...g, [editField!]: editValue } : g
    ));
    setEditingGoalIndex(null);
    setEditField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingGoalIndex(null);
    setEditField(null);
    setEditValue('');
  };

  // --- Progress tracking helpers ---
  const updateProgress = (goalIndex: number, percent: number) => {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    setEditableGoals(prev => prev.map((g, i) => {
      if (i !== goalIndex) return g;
      const updated = {
        ...g,
        progressPercent: clampedPercent,
        lastUpdated: new Date().toISOString(),
        status: (clampedPercent >= 100 ? 'achieved' :
                 clampedPercent >= 60  ? 'on_track' :
                 clampedPercent > 0    ? 'in_progress' : 'not_started') as EditableGoal['status'],
      };

      // Persist progress update to goal_progress_updates table
      if (g.dbId && user?.id) {
        supabase.from('goal_progress_updates').insert({
          goal_id: g.dbId,
          progress_value: clampedPercent,
          notes: `Progress set to ${clampedPercent}%`,
          logged_by: 'parent',
        }).then(({ error }) => {
          if (error) console.warn('[CarePlan] Error saving progress update:', error.message);
        });
      }

      return updated;
    }));
  };

  const addProgressNote = (goalIndex: number, note: string) => {
    setEditableGoals(prev => prev.map((g, i) => {
      if (i !== goalIndex) return g;
      const updated = {
        ...g,
        notes: g.notes ? `${g.notes}\n${new Date().toLocaleDateString()}: ${note}` : `${new Date().toLocaleDateString()}: ${note}`,
        lastUpdated: new Date().toISOString(),
      };

      // Also persist the progress note to goal_progress_updates table
      if (g.dbId && user?.id) {
        supabase.from('goal_progress_updates').insert({
          goal_id: g.dbId,
          progress_value: g.progressPercent,
          notes: note,
          logged_by: 'parent',
        }).then(({ error }) => {
          if (error) console.warn('[CarePlan] Error saving progress note:', error.message);
        });
      }

      return updated;
    }));
  };

  const getStatusColor = (status: EditableGoal['status']) => {
    switch (status) {
      case 'achieved': return 'bg-green-500';
      case 'on_track': return 'bg-teal-500';
      case 'in_progress': return 'bg-blue-500';
      case 'needs_attention': return 'bg-amber-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: EditableGoal['status']) => {
    switch (status) {
      case 'achieved': return 'Achieved';
      case 'on_track': return 'On Track';
      case 'in_progress': return 'In Progress';
      case 'needs_attention': return 'Needs Attention';
      default: return 'Not Started';
    }
  };

  // AI Analysis Phase Component
  const AnalyzingPhase = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6 plan-populate-animation">
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="care-plan-icon w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
          <Brain aria-hidden="true" className="w-7 h-7 text-accent animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg text-primary font-semibold mb-2">Getting to Know Your Family</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We're taking a moment to understand {getChildName()}'s strengths and your family's needs...
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
          <CheckCircle aria-hidden="true" className="w-4 h-4 text-green-600" />
          <span className="text-sm">Learning about {getChildName()}'s strengths</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
          <CheckCircle aria-hidden="true" className="w-4 h-4 text-green-600" />
          <span className="text-sm">Understanding your family's priorities</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Tailoring to how you like to communicate</span>
        </div>
      </div>
    </div>
  );

  // AI Generation Phase Component
  const GeneratingPhase = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6 plan-populate-animation">
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="care-plan-icon w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
          <Sparkles aria-hidden="true" className="w-7 h-7 text-accent animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg text-primary font-semibold mb-2">Crafting Your Plan</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We're building something special just for {getChildName()} and your family...
          </p>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="p-4 bg-white rounded-xl border border-accent/20">
          <div className="flex items-center gap-3 mb-3">
            <Target aria-hidden="true" className="w-5 h-5 text-accent" />
            <span className="font-semibold text-primary">SMART Goals</span>
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs text-muted-foreground">
            Creating specific, measurable goals with baseline data and target milestones
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-accent/20">
          <div className="flex items-center gap-3 mb-3">
            <Activity aria-hidden="true" className="w-5 h-5 text-accent" />
            <span className="font-semibold text-primary">Daily Strategies</span>
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs text-muted-foreground">
            Designing practical activities aligned with ABA principles and developmental milestones
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-accent/20">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 aria-hidden="true" className="w-5 h-5 text-accent" />
            <span className="font-semibold text-primary">Progress Tracking</span>
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs text-muted-foreground">
            Setting up data collection methods and success metrics for ongoing assessment
          </p>
        </div>
      </div>
    </div>
  );

  // Complete Care Plan Component
  const CompletePlan = () => {
    const goals = editableGoals;

    return (
      <div className="space-y-3 sm:space-y-4 sm:space-y-6">
        {/* AI Attribution Badge */}
        <div className="ai-attribution-badge">
          <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200/50 rounded-xl">
            <Sparkles aria-hidden="true" className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Generated by Aminy AI</span>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">v1.0</Badge>
            <span className="text-xs text-blue-600">•</span>
            <span className="text-xs text-blue-600">{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Care Plan Overview — reframed as collaborative starting points */}
        <div className="plan-populate-animation">
          <div className="p-6 bg-white rounded-2xl aminy-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="care-plan-icon w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <Clipboard aria-hidden="true" className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-base text-primary font-semibold">Suggested Care Plan</h3>
                <p className="text-sm text-muted-foreground">
                  Starting points for {getChildName()} — customize with your care team
                </p>
              </div>
              <div className="version-badge">
                v1.0
              </div>
            </div>

            {/* Collaborative framing banner */}
            <div className="flex items-start gap-2 p-3 mb-3 bg-teal-50/60 border border-teal-200/50 rounded-lg">
              <MessageSquare aria-hidden="true" className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-teal-800 leading-relaxed">
                These goals are AI-suggested starting points based on your input. Tap any baseline or target to customize it. We recommend reviewing this plan with your child's BCBA, therapist, or pediatrician.
              </p>
            </div>

            <div className="clinical-components-grid grid gap-3">
              <div className="clinical-baseline p-3 rounded-lg border border-orange-200 bg-orange-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Activity aria-hidden="true" className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-semibold text-orange-800">Baseline Data</span>
                </div>
                <p className="text-xs text-orange-700">Current skill levels — editable</p>
              </div>

              <div className="clinical-measurable p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Target aria-hidden="true" className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800">Measurable Outcomes</span>
                </div>
                <p className="text-xs text-blue-700">SMART goals — tap to adjust targets</p>
              </div>

              <div className="clinical-strategies p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb aria-hidden="true" className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-800">Evidence-Based Strategies</span>
                </div>
                <p className="text-xs text-purple-700">ABA-informed intervention methods</p>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Goal Cards — editable with progress tracking */}
        {goals.map((goal, index) => (
          <div key={index} className="plan-populate-animation" style={{ animationDelay: `${0.4 + index * 0.2}s` }}>
            <div className="p-6 bg-white rounded-2xl aminy-card">
              <div className="clinical-goal-main">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="timeline-badge text-xs">
                        {goal.timeline}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Goal {index + 1}</span>
                      {/* Progress status badge */}
                      {goal.status !== 'not_started' && (
                        <Badge className={`text-xs text-white ${getStatusColor(goal.status)}`}>
                          {getStatusLabel(goal.status)}
                        </Badge>
                      )}
                    </div>
                    {/* Editable goal title */}
                    {editingGoalIndex === index && editField === 'goal' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 text-sm border border-accent/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent/40"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        />
                        <button onClick={saveEdit} className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-green-600 hover:bg-green-50 rounded" aria-label="Save goal name">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded" aria-label="Cancel editing goal name">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <h4 className="text-base font-semibold text-primary">{goal.goal}</h4>
                        <button
                          onClick={() => startEditing(index, 'goal')}
                          className="opacity-0 group-hover:opacity-100 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-accent transition-opacity"
                          aria-label="Edit goal"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">{goal.domain}</p>
                  </div>
                </div>

                {/* Progress bar — always visible once tracking starts */}
                {goal.progressPercent > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-medium text-primary">{goal.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getStatusColor(goal.status)}`}
                        style={{ width: `${goal.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="clinical-components-grid grid gap-2">
                  {/* Editable Baseline */}
                  <div
                    className="clinical-baseline p-3 rounded-lg border border-orange-200 bg-orange-50/30 cursor-pointer hover:border-orange-300 transition-colors"
                    onClick={() => !(editingGoalIndex === index && editField === 'baseline') && startEditing(index, 'baseline')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium text-orange-800">Baseline</div>
                      <Pencil aria-hidden="true" className="w-3 h-3 text-orange-400" />
                    </div>
                    {editingGoalIndex === index && editField === 'baseline' ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 text-xs border border-orange-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-300/40 resize-none"
                          rows={2}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') cancelEdit(); }}
                        />
                        <div className="flex flex-col gap-1">
                          <button onClick={saveEdit} className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-green-600 hover:bg-green-50 rounded" aria-label="Save baseline"><Check className="w-3 h-3" /></button>
                          <button onClick={cancelEdit} className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded" aria-label="Cancel editing baseline"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-orange-700">{goal.baseline}</div>
                    )}
                  </div>

                  {/* Editable Target */}
                  <div
                    className="clinical-measurable p-3 rounded-lg border border-blue-200 bg-blue-50/30 cursor-pointer hover:border-blue-300 transition-colors"
                    onClick={() => !(editingGoalIndex === index && editField === 'target') && startEditing(index, 'target')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium text-blue-800">Target</div>
                      <Pencil aria-hidden="true" className="w-3 h-3 text-blue-400" />
                    </div>
                    {editingGoalIndex === index && editField === 'target' ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300/40 resize-none"
                          rows={2}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') cancelEdit(); }}
                        />
                        <div className="flex flex-col gap-1">
                          <button onClick={saveEdit} className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-green-600 hover:bg-green-50 rounded" aria-label="Save target"><Check className="w-3 h-3" /></button>
                          <button onClick={cancelEdit} className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded" aria-label="Cancel editing target"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-blue-700">{goal.target}</div>
                    )}
                  </div>

                  <div className="clinical-strategies p-3 rounded-lg border border-purple-200 bg-purple-50/30">
                    <div className="text-xs font-medium text-purple-800 mb-1">Key Strategies</div>
                    <div className="flex flex-wrap gap-1">
                      {goal.strategies.map((strategy, idx) => (
                        <Badge key={idx} variant="secondary" className="care-plan-badge strategy-badge-teaching">
                          {strategy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Progress tracking toggle */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setShowProgressFor(showProgressFor === index ? null : index)}
                    className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 transition-colors"
                  >
                    <TrendingUp aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>{showProgressFor === index ? 'Hide' : 'Track'} Progress</span>
                  </button>

                  {showProgressFor === index && (
                    <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {/* Quick progress buttons */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">Progress:</span>
                        <div className="flex gap-1 flex-1">
                          {[0, 25, 50, 75, 100].map((pct) => (
                            <button
                              key={pct}
                              onClick={() => updateProgress(index, pct)}
                              className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                                goal.progressPercent === pct
                                  ? 'bg-accent text-white border-accent'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-accent/40'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Progress notes */}
                      {goal.notes && (
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <div className="text-xs font-medium text-gray-600 mb-1">Notes</div>
                          <div className="text-xs text-gray-500 whitespace-pre-line">{goal.notes}</div>
                        </div>
                      )}

                      {/* Add note */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add a progress note..."
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              addProgressNote(index, e.currentTarget.value.trim());
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>

                      {goal.lastUpdated && (
                        <div className="text-xs text-muted-foreground">
                          Last updated: {new Date(goal.lastUpdated).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Plan Actions - iOS Toolbar Style */}
        <div className="plan-populate-animation">
          <div className="p-5 bg-white rounded-2xl aminy-card">
            <h4 className="text-base font-semibold text-primary mb-4 text-center">Your Living Plan</h4>
            
            <div className="segmented-control-container">
              <div className="segmented-control-pill">
                <button 
                  className="segmented-control-button ios-toolbar-button"
                  onClick={() => setShowDetails(!showDetails)}
                  aria-label="View detailed reports and analytics"
                >
                  <BarChart3 className="segmented-control-icon" />
                  <span className="segmented-control-label">Reports</span>
                </button>
                
                <button 
                  className="segmented-control-button ios-toolbar-button"
                  aria-label="Export care plan as PDF document"
                >
                  <Download className="segmented-control-icon" />
                  <span className="segmented-control-label">Export PDF</span>
                </button>
                
                <button 
                  className="segmented-control-button ios-toolbar-button"
                  aria-label="Share plan with care team and providers"
                >
                  <Share className="segmented-control-icon" />
                  <span className="segmented-control-label">Share Plan</span>
                </button>
              </div>
            </div>

            <div className="clinical-microcopy p-3 mt-4 bg-gray-50/80 border border-gray-200/60 rounded-lg">
              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                This plan evolves with your progress. Track milestones, add notes, and share updates with teachers, therapists, and family members.
              </p>
            </div>
          </div>
        </div>

        {/* Encouraging Completion Message */}
        <div className="plan-populate-animation care-plan-encouragement p-5 rounded-xl">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Heart aria-hidden="true" className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-primary">You're all set!</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your suggested care plan is ready. Customize baselines and targets to match {getChildName()}'s actual abilities, then track progress over time. Share with your care team for expert refinement.
            </p>
            <div className="flex items-center justify-center gap-3 sm:gap-4 pt-2">
              <div className="flex items-center gap-1">
                <UserCheck aria-hidden="true" className="w-3 h-3 text-accent" />
                <span className="text-xs text-muted-foreground">Expert-Backed</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield aria-hidden="true" className="w-3 h-3 text-accent" />
                <span className="text-xs text-muted-foreground">Privacy-First</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap aria-hidden="true" className="w-3 h-3 text-accent" />
                <span className="text-xs text-muted-foreground">Always Learning</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="care-plan-final-divider premium-divider"></div>

        {/* Final Actions */}
        <div className="final-actions-layout space-y-3 sm:space-y-4">
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={async () => {
                // Delete existing goals from Supabase before regenerating
                if (planId) {
                  try {
                    await supabase
                      .from('treatment_goals')
                      .delete()
                      .eq('plan_id', planId);
                  } catch (err) {
                    console.warn('[CarePlan] Error deleting old goals:', err);
                  }
                }
                setEditableGoals([]);
                setEditingGoalIndex(null);
                setShowProgressFor(null);
                setLoadedFromDb(false);
                setGenerationPhase('initial');
              }}
              className="make-change-tertiary-button"
            >
              <RefreshCw aria-hidden="true" className="w-4 h-4 mr-2" />
              Regenerate plan
            </Button>
          </div>
          
          <div className="text-center">
            <Button
              onClick={onComplete}
              className="complete-setup-button aminy-gentle-shimmer"
            >
              <CheckCircle aria-hidden="true" className="w-4 h-4 mr-2" />
              Continue to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Clinical Disclaimer */}
      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
        <span className="text-amber-600 flex-shrink-0">⚕️</span>
        <span className="text-amber-800">
          AI-generated care plans are for educational guidance only and do not replace professional treatment plans from licensed BCBAs, therapists, or physicians.
        </span>
      </div>

      {/* Phase-based rendering */}
      {generationPhase === 'initial' && (
        <div className="text-center space-y-3 sm:space-y-4 plan-populate-animation">
          <div className="care-plan-icon w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
            <Sparkles aria-hidden="true" className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h3 className="text-lg text-primary font-semibold mb-2">Ready to Create Your Care Plan</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Aminy AI will now create a personalized, evidence-based care plan for {getChildName()} using professional ABA/IEP standards.
            </p>
          </div>
          
          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Users aria-hidden="true" className="w-4 h-4 text-accent" />
              <span>Child profile: {getChildName()}, {(formData.childAge as string) || 'age not specified'}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Target aria-hidden="true" className="w-4 h-4 text-accent" />
              <span>Focus areas: {getSelectedDomains().slice(0, 2).join(', ')}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Heart aria-hidden="true" className="w-4 h-4 text-accent" />
              <span>Style: {getToneStyle()}</span>
            </div>
          </div>
        </div>
      )}

      {generationPhase === 'analyzing' && <AnalyzingPhase />}
      {generationPhase === 'generating' && <GeneratingPhase />}
      {generationPhase === 'complete' && <CompletePlan />}
    </div>
  );
}