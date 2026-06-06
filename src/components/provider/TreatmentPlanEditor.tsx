// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * TreatmentPlanEditor — Clinical authoring tool for BCBAs
 * Writable treatment plan editor (read-only parent view is TreatmentPlanSummary)
 * Supports auto-save, versioning, finalize/lock, and print/PDF export
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Lock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Printer,
  CheckCircle,
  History,
  X,
  AlertCircle,
  FileText,
  User,
  Target,
  Brain,
  Shield,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export type GoalDomain =
  | 'communication'
  | 'self_care'
  | 'social'
  | 'behavior_reduction'
  | 'motor'
  | 'academic'
  | 'daily_living';

export type MasteryStatus = 'not_started' | 'in_progress' | 'mastered' | 'discontinued';

export type BehaviorFunction = 'escape' | 'attention' | 'tangible' | 'sensory';

export interface Objective {
  id: string;
  description: string;
  baseline: string;
  targetCriteria: string;
  masteryStatus: MasteryStatus;
}

export interface Goal {
  id: string;
  goalId: string; // G001, G002, etc.
  domain: GoalDomain;
  description: string;
  baseline: string;
  baselineUnit: string;
  targetCriteria: string;
  masteryStatus: MasteryStatus;
  objectives: Objective[];
  objectivesExpanded: boolean;
}

export interface BehaviorPlan {
  id: string;
  behaviorDefinition: string;
  hypothesizedFunction: BehaviorFunction;
  antecedentStrategies: string;
  replacementBehavior: string;
  consequenceStrategies: string;
  crisisPlan: string;
}

export interface ReinforcerItem {
  id: string;
  item: string;
  category: 'edible' | 'tangible' | 'activity' | 'social';
}

export interface PlanVersion {
  versionId: string;
  createdAt: string;
  createdBy: string;
  snapshot: TreatmentPlanData;
}

export type CobOrder = 'medicaid_secondary' | 'commercial_secondary' | 'other';

export interface SecondaryPayer {
  hasSecondary: boolean;
  payerName: string;
  payerId: string;
  memberId: string;
  cobOrder: CobOrder;
  notes: string;
}

export interface TreatmentPlanData {
  planId: string;
  clientId?: string;
  clientName: string;
  clientDOB: string;
  diagnosis: string;
  fundingSource: 'medicaid' | 'private_pay' | 'insurance' | 'other';
  bcbaOfRecord: string;
  rbtAssigned: string;
  authNumber: string;
  authStartDate: string;
  authEndDate: string;
  authorizedHours: string;
  payer: string;
  secondaryPayer: SecondaryPayer;
  assessmentSummary: string;
  skillAssessmentResults: string;
  behaviorAssessmentResults: string;
  goals: Goal[];
  behaviorPlans: BehaviorPlan[];
  reinforcers: ReinforcerItem[];
  reinforcementSchedule: string;
  bcbaSignatureDate: string;
  bcbaAttestation: boolean;
  isFinalized: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface TreatmentPlanEditorProps {
  clientId?: string;
  planId?: string;
  onBack: () => void;
  onFinalize?: (planId: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DOMAIN_LABELS: Record<GoalDomain, string> = {
  communication: 'Communication',
  self_care: 'Self-Care',
  social: 'Social',
  behavior_reduction: 'Behavior Reduction',
  motor: 'Motor',
  academic: 'Academic',
  daily_living: 'Daily Living',
};

const MASTERY_CONFIG: Record<MasteryStatus, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-[#F0EDE8] text-[#5A6B7A]' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  mastered: { label: 'Mastered', color: 'bg-green-100 text-green-700' },
  discontinued: { label: 'Discontinued', color: 'bg-red-100 text-red-600' },
};

const BEHAVIOR_FUNCTIONS: { value: BehaviorFunction; label: string }[] = [
  { value: 'escape', label: 'Escape / Avoidance' },
  { value: 'attention', label: 'Attention' },
  { value: 'tangible', label: 'Tangible / Access' },
  { value: 'sensory', label: 'Sensory / Automatic' },
];

const AUTO_SAVE_INTERVAL_MS = 30_000;

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeGoalId(index: number): string {
  return `G${String(index + 1).padStart(3, '0')}`;
}

function makeBlankGoal(index: number): Goal {
  return {
    id: generateId(),
    goalId: makeGoalId(index),
    domain: 'communication',
    description: '',
    baseline: '',
    baselineUnit: '',
    targetCriteria: '80% across 3 consecutive sessions',
    masteryStatus: 'not_started',
    objectives: [],
    objectivesExpanded: false,
  };
}

function makeBlankObjective(): Objective {
  return {
    id: generateId(),
    description: '',
    baseline: '',
    targetCriteria: '',
    masteryStatus: 'not_started',
  };
}

function makeBlankBehaviorPlan(): BehaviorPlan {
  return {
    id: generateId(),
    behaviorDefinition: '',
    hypothesizedFunction: 'escape',
    antecedentStrategies: '',
    replacementBehavior: '',
    consequenceStrategies: '',
    crisisPlan: '',
  };
}

function makeBlankPlan(clientId?: string): TreatmentPlanData {
  return {
    planId: generateId(),
    clientId,
    clientName: '',
    clientDOB: '',
    diagnosis: '',
    fundingSource: 'medicaid',
    bcbaOfRecord: '',
    rbtAssigned: '',
    authNumber: '',
    authStartDate: '',
    authEndDate: '',
    authorizedHours: '',
    payer: '',
    secondaryPayer: {
      hasSecondary: false,
      payerName: '',
      payerId: '',
      memberId: '',
      cobOrder: 'medicaid_secondary',
      notes: '',
    },
    assessmentSummary: '',
    skillAssessmentResults: '',
    behaviorAssessmentResults: '',
    goals: [],
    behaviorPlans: [],
    reinforcers: [],
    reinforcementSchedule: '',
    bcbaSignatureDate: '',
    bcbaAttestation: false,
    isFinalized: false,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// Section wrapper
// ============================================================================

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="tpe-section bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left no-print"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-emerald-500">{icon}</span>}
          <span className="font-bold text-[#1B2733] text-base">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {/* tpe-section-body: print stylesheet forces this open so collapsed sections still appear in PDF/print */}
      <div className={`tpe-section-body ${open ? 'block' : 'hidden'}`}>
        <div className="px-5 pb-5 space-y-3">
          {/* Print-only section title (the interactive toggle header is no-print) */}
          <p className="tpe-print-title hidden font-bold text-[#1B2733] text-base">{title}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-[#5A6B7A] uppercase tracking-wide font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputCls =
  'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 disabled:bg-[#FAF7F2] disabled:text-[#5A6B7A] transition-colors';
const textareaCls =
  'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 disabled:bg-[#FAF7F2] disabled:text-[#5A6B7A] resize-none transition-colors';
const selectCls =
  'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 disabled:bg-[#FAF7F2] bg-white transition-colors';

// ============================================================================
// Goal Card
// ============================================================================

function GoalCard({
  goal,
  goalIndex,
  isFinalized,
  onChange,
  onRemove,
}: {
  goal: Goal;
  goalIndex: number;
  isFinalized: boolean;
  onChange: (updated: Goal) => void;
  onRemove: () => void;
}) {
  const update = (patch: Partial<Goal>) => onChange({ ...goal, ...patch });
  const updateObjective = (objId: string, patch: Partial<Objective>) => {
    onChange({
      ...goal,
      objectives: goal.objectives.map(o => o.id === objId ? { ...o, ...patch } : o),
    });
  };
  const addObjective = () => onChange({ ...goal, objectives: [...goal.objectives, makeBlankObjective()] });
  const removeObjective = (objId: string) => onChange({ ...goal, objectives: goal.objectives.filter(o => o.id !== objId) });

  return (
    <div className="border border-[#E8E4DF] rounded-xl overflow-hidden">
      {/* Goal header */}
      <div className="bg-[#FAF7F2] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded">
            {goal.goalId}
          </span>
          <select
            value={goal.domain}
            onChange={e => update({ domain: e.target.value as GoalDomain })}
            disabled={isFinalized}
            className="text-xs border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-emerald-500 bg-white disabled:bg-[#FAF7F2]"
          >
            {Object.entries(DOMAIN_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select
            value={goal.masteryStatus}
            onChange={e => update({ masteryStatus: e.target.value as MasteryStatus })}
            disabled={isFinalized}
            className={`text-xs border rounded-lg px-2 py-1 outline-none focus:border-emerald-500 disabled:opacity-60 ${MASTERY_CONFIG[goal.masteryStatus].color}`}
          >
            {Object.entries(MASTERY_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>
        {!isFinalized && (
          <button
            onClick={onRemove}
            style={{ minWidth: 44, minHeight: 44 }}
            className="text-red-400 hover:text-red-600 p-1 flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        <Field label="Goal Description" required>
          <textarea
            value={goal.description}
            onChange={e => update({ description: e.target.value })}
            disabled={isFinalized}
            placeholder="e.g., Client will independently request preferred items using 2-word phrases..."
            rows={2}
            className={textareaCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Baseline">
            <div className="flex gap-2">
              <input
                type="text"
                value={goal.baseline}
                onChange={e => update({ baseline: e.target.value })}
                disabled={isFinalized}
                placeholder="0"
                className={`${inputCls} flex-1`}
              />
              <input
                type="text"
                value={goal.baselineUnit}
                onChange={e => update({ baselineUnit: e.target.value })}
                disabled={isFinalized}
                placeholder="unit"
                className={`${inputCls} w-20`}
              />
            </div>
          </Field>
          <Field label="Target Criteria">
            <input
              type="text"
              value={goal.targetCriteria}
              onChange={e => update({ targetCriteria: e.target.value })}
              disabled={isFinalized}
              placeholder="80% across 3 consecutive sessions"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Short-term objectives */}
        <div>
          <button
            onClick={() => update({ objectivesExpanded: !goal.objectivesExpanded })}
            className="flex items-center gap-1 text-xs text-emerald-500 font-medium"
          >
            {goal.objectivesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Short-term Objectives ({goal.objectives.length})
          </button>

          {goal.objectivesExpanded && (
            <div className="mt-3 space-y-3 pl-3 border-l-2 border-[#E8E4DF]">
              {goal.objectives.map((obj, oi) => (
                <div key={obj.id} className="bg-[#FAF7F2] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#5A6B7A]">Objective {oi + 1}</span>
                    {!isFinalized && (
                      <button onClick={() => removeObjective(obj.id)} className="text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={obj.description}
                    onChange={e => updateObjective(obj.id, { description: e.target.value })}
                    disabled={isFinalized}
                    placeholder="Objective description..."
                    rows={2}
                    className={`${textareaCls} bg-white`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={obj.baseline}
                      onChange={e => updateObjective(obj.id, { baseline: e.target.value })}
                      disabled={isFinalized}
                      placeholder="Baseline"
                      className={`${inputCls} bg-white`}
                    />
                    <input
                      type="text"
                      value={obj.targetCriteria}
                      onChange={e => updateObjective(obj.id, { targetCriteria: e.target.value })}
                      disabled={isFinalized}
                      placeholder="Target criteria"
                      className={`${inputCls} bg-white`}
                    />
                  </div>
                  <select
                    value={obj.masteryStatus}
                    onChange={e => updateObjective(obj.id, { masteryStatus: e.target.value as MasteryStatus })}
                    disabled={isFinalized}
                    className={`${selectCls} bg-white text-xs`}
                  >
                    {Object.entries(MASTERY_CONFIG).map(([val, cfg]) => (
                      <option key={val} value={val}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              ))}
              {!isFinalized && (
                <button
                  onClick={addObjective}
                  className="flex items-center gap-1 text-xs text-emerald-500 font-medium mt-2"
                >
                  <Plus className="w-3 h-3" />
                  Add Objective
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Behavior Plan Card
// ============================================================================

function BehaviorPlanCard({
  plan,
  planIndex,
  isFinalized,
  onChange,
  onRemove,
}: {
  plan: BehaviorPlan;
  planIndex: number;
  isFinalized: boolean;
  onChange: (updated: BehaviorPlan) => void;
  onRemove: () => void;
}) {
  const update = (patch: Partial<BehaviorPlan>) => onChange({ ...plan, ...patch });
  return (
    <div className="border border-[#E8E4DF] rounded-xl overflow-hidden">
      <div className="bg-[#FAF7F2] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
            BX{String(planIndex + 1).padStart(2, '0')}
          </span>
          <select
            value={plan.hypothesizedFunction}
            onChange={e => update({ hypothesizedFunction: e.target.value as BehaviorFunction })}
            disabled={isFinalized}
            className="text-xs border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-emerald-500 bg-white disabled:bg-[#FAF7F2]"
          >
            {BEHAVIOR_FUNCTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        {!isFinalized && (
          <button
            onClick={onRemove}
            style={{ minWidth: 44, minHeight: 44 }}
            className="text-red-400 hover:text-red-600 p-1 flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-4 space-y-3">
        <Field label="Behavior Definition (operational)" required>
          <textarea
            value={plan.behaviorDefinition}
            onChange={e => update({ behaviorDefinition: e.target.value })}
            disabled={isFinalized}
            placeholder="Operationally define the target behavior..."
            rows={2}
            className={textareaCls}
          />
        </Field>
        <Field label="Antecedent Strategies">
          <textarea
            value={plan.antecedentStrategies}
            onChange={e => update({ antecedentStrategies: e.target.value })}
            disabled={isFinalized}
            placeholder="Environmental modifications, pre-teaching, choice-giving..."
            rows={2}
            className={textareaCls}
          />
        </Field>
        <Field label="Replacement Behavior">
          <textarea
            value={plan.replacementBehavior}
            onChange={e => update({ replacementBehavior: e.target.value })}
            disabled={isFinalized}
            placeholder="Functionally equivalent replacement behavior to teach..."
            rows={2}
            className={textareaCls}
          />
        </Field>
        <Field label="Consequence Strategies (Reinforcement / Extinction)">
          <textarea
            value={plan.consequenceStrategies}
            onChange={e => update({ consequenceStrategies: e.target.value })}
            disabled={isFinalized}
            placeholder="Differential reinforcement, extinction procedures..."
            rows={2}
            className={textareaCls}
          />
        </Field>
        <Field label="Crisis Plan (if applicable)">
          <textarea
            value={plan.crisisPlan}
            onChange={e => update({ crisisPlan: e.target.value })}
            disabled={isFinalized}
            placeholder="Safety protocols, de-escalation steps, who to contact..."
            rows={2}
            className={textareaCls}
          />
        </Field>
      </div>
    </div>
  );
}

// ============================================================================
// Version History Modal
// ============================================================================

function VersionHistoryModal({
  versions,
  onRestore,
  onClose,
}: {
  versions: PlanVersion[];
  onRestore: (v: PlanVersion) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4DF]">
          <h3 className="font-bold text-[#1B2733]">Version History</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-[#5A6B7A]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {versions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No previous versions</p>
          ) : (
            versions.map(v => (
              <div key={v.versionId} className="border border-[#E8E4DF] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#1B2733]">
                    {new Date(v.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#5A6B7A]">{v.createdBy || 'Unknown author'}</p>
                </div>
                <button
                  onClick={() => { onRestore(v); onClose(); }}
                  className="text-xs text-emerald-500 font-medium px-3 py-1.5 border border-emerald-500 rounded-lg"
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TreatmentPlanEditor({
  clientId,
  planId,
  onBack,
  onFinalize,
}: TreatmentPlanEditorProps) {
  const [plan, setPlan] = useState<TreatmentPlanData>(() => makeBlankPlan(clientId));
  const [isLoading, setIsLoading] = useState(!!planId);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planRef = useRef(plan);
  planRef.current = plan;

  // Load existing plan
  useEffect(() => {
    if (!planId) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('treatment_plans')
          .select('*')
          .eq('plan_id', planId)
          .single();
        if (!error && data) {
          setPlan(data.data as TreatmentPlanData);
          setLastSaved(new Date(data.updated_at));
        }
      } catch {
        // fallback to localStorage
        const saved = localStorage.getItem(`aminy_treatment_plan_${planId}`);
        if (saved) setPlan(JSON.parse(saved) as TreatmentPlanData);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [planId]);

  // Load localStorage profile
  useEffect(() => {
    try {
      const child = localStorage.getItem('aminy_child_profile');
      if (child) {
        const parsed = JSON.parse(child);
        setPlan(p => ({
          ...p,
          clientName: p.clientName || parsed.name || parsed.firstName || '',
          clientDOB: p.clientDOB || parsed.dob || '',
        }));
      }
      const user = localStorage.getItem('aminy_user_profile');
      if (user) {
        const parsed = JSON.parse(user);
        setPlan(p => ({
          ...p,
          bcbaOfRecord: p.bcbaOfRecord || parsed.name || parsed.displayName || '',
        }));
      }
    } catch {
      // ignore
    }
  }, []);

  const updatePlan = useCallback((patch: Partial<TreatmentPlanData>) => {
    if (planRef.current.isFinalized) return;
    setPlan(prev => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
    setIsDirty(true);
  }, []);

  // Auto-save debounce
  useEffect(() => {
    if (!isDirty || !autoSaveEnabled || plan.isFinalized) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      savePlan(false);
    }, AUTO_SAVE_INTERVAL_MS);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isDirty, plan, autoSaveEnabled]);

  const savePlan = useCallback(async (showToast = true) => {
    if (isSaving) return;
    setIsSaving(true);
    const currentPlan = { ...planRef.current, updatedAt: new Date().toISOString() };

    // Add version before save
    const newVersion: PlanVersion = {
      versionId: generateId(),
      createdAt: new Date().toISOString(),
      createdBy: currentPlan.bcbaOfRecord || 'BCBA',
      snapshot: { ...currentPlan },
    };

    try {
      const { error } = await supabase
        .from('treatment_plans')
        .upsert({
          plan_id: currentPlan.planId,
          client_id: currentPlan.clientId || null,
          client_name: currentPlan.clientName,
          is_finalized: currentPlan.isFinalized,
          data: currentPlan,
          updated_at: currentPlan.updatedAt,
          created_at: currentPlan.createdAt,
        });

      if (error) throw error;
      if (showToast) toast.success('Plan saved');
    } catch {
      // Fallback to localStorage
      try {
        localStorage.setItem(`aminy_treatment_plan_${currentPlan.planId}`, JSON.stringify(currentPlan));
        if (showToast) toast.success('Plan saved locally');
      } catch {
        if (showToast) toast.error('Failed to save — please export');
      }
    } finally {
      setVersions(prev => [newVersion, ...prev].slice(0, 20));
      setLastSaved(new Date());
      setIsDirty(false);
      setIsSaving(false);
    }
  }, [isSaving]);

  const handleFinalize = async () => {
    updatePlan({ isFinalized: true });
    await savePlan(false);
    toast.success('Treatment plan finalized and locked');
    setShowFinalizeConfirm(false);
    onFinalize?.(plan.planId);
  };

  const handleRestoreVersion = (v: PlanVersion) => {
    setPlan({ ...v.snapshot, updatedAt: new Date().toISOString() });
    setIsDirty(true);
    toast.success('Version restored — save to confirm');
  };

  const handlePrint = () => {
    window.print();
  };

  const addGoal = () => {
    const newGoal = makeBlankGoal(plan.goals.length);
    updatePlan({ goals: [...plan.goals, newGoal] });
  };

  const updateGoal = (goalId: string, updated: Goal) => {
    updatePlan({ goals: plan.goals.map(g => g.id === goalId ? updated : g) });
  };

  const removeGoal = (goalId: string) => {
    const filtered = plan.goals.filter(g => g.id !== goalId);
    // Re-index goal IDs
    const reindexed = filtered.map((g, i) => ({ ...g, goalId: makeGoalId(i) }));
    updatePlan({ goals: reindexed });
  };

  const addBehaviorPlan = () => {
    updatePlan({ behaviorPlans: [...plan.behaviorPlans, makeBlankBehaviorPlan()] });
  };

  const updateBehaviorPlan = (bpId: string, updated: BehaviorPlan) => {
    updatePlan({ behaviorPlans: plan.behaviorPlans.map(bp => bp.id === bpId ? updated : bp) });
  };

  const removeBehaviorPlan = (bpId: string) => {
    updatePlan({ behaviorPlans: plan.behaviorPlans.filter(bp => bp.id !== bpId) });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#5A6B7A] text-sm">Loading treatment plan...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print styles.
          NOTE: Tailwind `print:` variants are NOT compiled into index.css here, so
          all print behavior is driven by these explicit rules. Critically, collapsed
          sections must be forced open so they still appear in the printed/exported PDF. */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
          .print-break { page-break-before: always; }
          /* Force every collapsible section body open in print/PDF, even when collapsed on screen */
          .tpe-section-body { display: block !important; }
          /* The interactive toggle header is no-print; show a static title in its place */
          .tpe-print-title { display: block !important; }
          /* Keep each section from splitting across pages */
          .tpe-section { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-[#FAF7F2]">
        {/* Header */}
        <div className="bg-slate-900 sticky top-0 z-20 no-print">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>

            <div className="text-center">
              <p className="text-white font-semibold text-sm">Treatment Plan</p>
              {plan.isFinalized ? (
                <div className="flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-amber-400">Finalized</span>
                </div>
              ) : lastSaved ? (
                <p className="text-xs text-slate-400">
                  {isSaving ? 'Saving...' : `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  {isDirty && !isSaving && ' · Unsaved changes'}
                </p>
              ) : (
                <p className="text-xs text-slate-400">Draft</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowVersionHistory(true)}
                className="p-2 text-slate-400 hover:text-white"
                title="Version history"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={handlePrint}
                className="p-2 text-slate-400 hover:text-white"
                title="Print / PDF"
              >
                <Printer className="w-4 h-4" />
              </button>
              {!plan.isFinalized && (
                <button
                  onClick={() => savePlan(true)}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Finalized banner */}
        {plan.isFinalized && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-2 no-print">
            <Lock className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-800 font-medium">
              This plan is finalized and locked. View only.
            </p>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">

          {/* 1. Client Header */}
          <Section title="Client Information" icon={<User className="w-5 h-5" />}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client Name" required>
                <input type="text" value={plan.clientName} onChange={e => updatePlan({ clientName: e.target.value })} disabled={plan.isFinalized} placeholder="Full name" className={inputCls} />
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={plan.clientDOB} onChange={e => updatePlan({ clientDOB: e.target.value })} disabled={plan.isFinalized} className={inputCls} />
              </Field>
              <Field label="Diagnosis (ICD-10)" required>
                <input type="text" value={plan.diagnosis} onChange={e => updatePlan({ diagnosis: e.target.value })} disabled={plan.isFinalized} placeholder="e.g., F84.0 — Autistic Disorder" className={inputCls} />
              </Field>
              <Field label="Funding Source">
                <select value={plan.fundingSource} onChange={e => updatePlan({ fundingSource: e.target.value as TreatmentPlanData['fundingSource'] })} disabled={plan.isFinalized} className={selectCls}>
                  <option value="medicaid">Medicaid / AHCCCS</option>
                  <option value="private_pay">Private Pay</option>
                  <option value="insurance">Private Insurance</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="BCBA of Record">
                <input type="text" value={plan.bcbaOfRecord} onChange={e => updatePlan({ bcbaOfRecord: e.target.value })} disabled={plan.isFinalized} placeholder="BCBA name" className={inputCls} />
              </Field>
              <Field label="RBT Assigned">
                <input type="text" value={plan.rbtAssigned} onChange={e => updatePlan({ rbtAssigned: e.target.value })} disabled={plan.isFinalized} placeholder="RBT name" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* 2. Assessment Summary */}
          <Section title="Assessment Summary" icon={<Brain className="w-5 h-5" />}>
            <Field label="Assessment Overview">
              <textarea value={plan.assessmentSummary} onChange={e => updatePlan({ assessmentSummary: e.target.value })} disabled={plan.isFinalized} placeholder="Provide an overview of assessment findings, relevant history, and current functioning levels..." rows={4} className={textareaCls} />
            </Field>
            <Field label="Skill Assessment Results">
              <textarea value={plan.skillAssessmentResults} onChange={e => updatePlan({ skillAssessmentResults: e.target.value })} disabled={plan.isFinalized} placeholder="VB-MAPP, ABLLS-R, AFLS results and current skill levels across domains..." rows={3} className={textareaCls} />
            </Field>
            <Field label="Behavior Assessment Results">
              <textarea value={plan.behaviorAssessmentResults} onChange={e => updatePlan({ behaviorAssessmentResults: e.target.value })} disabled={plan.isFinalized} placeholder="FBA/FA results, function(s) identified, baseline rates..." rows={3} className={textareaCls} />
            </Field>
          </Section>

          {/* 3. Goals */}
          <Section title="Treatment Goals" icon={<Target className="w-5 h-5" />}>
            {plan.goals.length === 0 ? (
              <div className="text-center py-6 bg-[#FAF7F2] rounded-xl">
                <Target className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No goals yet. Add your first goal below.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {plan.goals.map((goal, idx) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    goalIndex={idx}
                    isFinalized={plan.isFinalized}
                    onChange={updated => updateGoal(goal.id, updated)}
                    onRemove={() => removeGoal(goal.id)}
                  />
                ))}
              </div>
            )}
            {!plan.isFinalized && (
              <button
                onClick={addGoal}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-emerald-500 text-emerald-500 rounded-xl font-medium text-sm hover:bg-green-50 transition-colors mt-2"
              >
                <Plus className="w-4 h-4" />
                Add Goal
              </button>
            )}
          </Section>

          {/* 4. Behavior Intervention Plan */}
          <Section title="Behavior Intervention Plan" icon={<Shield className="w-5 h-5" />} defaultOpen={false}>
            {plan.behaviorPlans.length === 0 ? (
              <div className="text-center py-6 bg-[#FAF7F2] rounded-xl">
                <Shield className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No behavior plans. Add one below if needed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {plan.behaviorPlans.map((bp, idx) => (
                  <BehaviorPlanCard
                    key={bp.id}
                    plan={bp}
                    planIndex={idx}
                    isFinalized={plan.isFinalized}
                    onChange={updated => updateBehaviorPlan(bp.id, updated)}
                    onRemove={() => removeBehaviorPlan(bp.id)}
                  />
                ))}
              </div>
            )}
            {!plan.isFinalized && (
              <button
                onClick={addBehaviorPlan}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-red-300 text-red-500 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors mt-2"
              >
                <Plus className="w-4 h-4" />
                Add Behavior Plan
              </button>
            )}
          </Section>

          {/* 5. Reinforcement Profile */}
          <Section title="Reinforcement Profile" defaultOpen={false}>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#5A6B7A] uppercase tracking-wide">Preferred Items / Activities</label>
                  {!plan.isFinalized && (
                    <button
                      onClick={() => updatePlan({ reinforcers: [...plan.reinforcers, { id: generateId(), item: '', category: 'tangible' }] })}
                      className="flex items-center gap-1 text-xs text-emerald-500 font-medium"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
                {plan.reinforcers.length === 0 ? (
                  <p className="text-sm text-slate-400">No reinforcers added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {plan.reinforcers.map(r => (
                      <div key={r.id} className="flex gap-2 items-center">
                        <select
                          value={r.category}
                          onChange={e => updatePlan({ reinforcers: plan.reinforcers.map(ri => ri.id === r.id ? { ...ri, category: e.target.value as ReinforcerItem['category'] } : ri) })}
                          disabled={plan.isFinalized}
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 outline-none bg-white disabled:bg-[#FAF7F2]"
                        >
                          <option value="edible">Edible</option>
                          <option value="tangible">Tangible</option>
                          <option value="activity">Activity</option>
                          <option value="social">Social</option>
                        </select>
                        <input
                          type="text"
                          value={r.item}
                          onChange={e => updatePlan({ reinforcers: plan.reinforcers.map(ri => ri.id === r.id ? { ...ri, item: e.target.value } : ri) })}
                          disabled={plan.isFinalized}
                          placeholder="Item or activity name"
                          className={`${inputCls} flex-1`}
                        />
                        {!plan.isFinalized && (
                          <button onClick={() => updatePlan({ reinforcers: plan.reinforcers.filter(ri => ri.id !== r.id) })} className="text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Field label="Reinforcement Schedule">
                <textarea value={plan.reinforcementSchedule} onChange={e => updatePlan({ reinforcementSchedule: e.target.value })} disabled={plan.isFinalized} placeholder="e.g., Fixed ratio FR-3 for manding; variable interval VI-2 for sustained attention..." rows={2} className={textareaCls} />
              </Field>
            </div>
          </Section>

          {/* 6. Authorization Info */}
          <Section title="Authorization Information" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Authorization Number">
                <input type="text" value={plan.authNumber} onChange={e => updatePlan({ authNumber: e.target.value })} disabled={plan.isFinalized} placeholder="Auth #" className={inputCls} />
              </Field>
              <Field label="Payer">
                <input type="text" value={plan.payer} onChange={e => updatePlan({ payer: e.target.value })} disabled={plan.isFinalized} placeholder="Insurance / MCO name" className={inputCls} />
              </Field>
              <Field label="Auth Start Date">
                <input type="date" value={plan.authStartDate} onChange={e => updatePlan({ authStartDate: e.target.value })} disabled={plan.isFinalized} className={inputCls} />
              </Field>
              <Field label="Auth End Date">
                <input type="date" value={plan.authEndDate} onChange={e => updatePlan({ authEndDate: e.target.value })} disabled={plan.isFinalized} className={inputCls} />
              </Field>
              <Field label="Authorized Hours / Units">
                <input type="text" value={plan.authorizedHours} onChange={e => updatePlan({ authorizedHours: e.target.value })} disabled={plan.isFinalized} placeholder="e.g., 120 hrs / 480 units" className={inputCls} />
              </Field>
            </div>

            {/* Secondary Payer (COB) */}
            <div className="mt-4 border-t border-[#E8E4DF] pt-4">
              <p className="text-sm font-semibold text-[#3A4A57] mb-3">Secondary Payer (COB)</p>
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={plan.secondaryPayer.hasSecondary}
                  disabled={plan.isFinalized}
                  onChange={e =>
                    updatePlan({
                      secondaryPayer: { ...plan.secondaryPayer, hasSecondary: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-sm text-[#5A6B7A]">Has secondary insurance?</span>
              </label>

              {plan.secondaryPayer.hasSecondary && (
                <div className="grid grid-cols-2 gap-3 bg-[#FAF7F2] rounded-xl p-3">
                  <Field label="Secondary Payer Name">
                    <input
                      type="text"
                      value={plan.secondaryPayer.payerName}
                      onChange={e =>
                        updatePlan({ secondaryPayer: { ...plan.secondaryPayer, payerName: e.target.value } })
                      }
                      disabled={plan.isFinalized}
                      placeholder="e.g., Blue Cross Blue Shield"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Secondary Payer ID">
                    <input
                      type="text"
                      value={plan.secondaryPayer.payerId}
                      onChange={e =>
                        updatePlan({ secondaryPayer: { ...plan.secondaryPayer, payerId: e.target.value } })
                      }
                      disabled={plan.isFinalized}
                      placeholder="e.g., BCBS-IL"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Secondary Member ID">
                    <input
                      type="text"
                      value={plan.secondaryPayer.memberId}
                      onChange={e =>
                        updatePlan({ secondaryPayer: { ...plan.secondaryPayer, memberId: e.target.value } })
                      }
                      disabled={plan.isFinalized}
                      placeholder="Member ID"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="COB Order">
                    <select
                      value={plan.secondaryPayer.cobOrder}
                      onChange={e =>
                        updatePlan({
                          secondaryPayer: {
                            ...plan.secondaryPayer,
                            cobOrder: e.target.value as CobOrder,
                          },
                        })
                      }
                      disabled={plan.isFinalized}
                      className={selectCls}
                    >
                      <option value="medicaid_secondary">Medicaid Secondary</option>
                      <option value="commercial_secondary">Commercial Secondary</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <div className="col-span-2">
                    <Field label="COB Notes">
                      <textarea
                        value={plan.secondaryPayer.notes}
                        onChange={e =>
                          updatePlan({ secondaryPayer: { ...plan.secondaryPayer, notes: e.target.value } })
                        }
                        disabled={plan.isFinalized}
                        placeholder="e.g., Medicaid as secondary to commercial — submit EOB with crossover claim"
                        rows={2}
                        className={textareaCls}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* 7. Signatures */}
          <Section title="Signatures & Attestation" icon={<FileText className="w-5 h-5" />} defaultOpen={false}>
            <div className="space-y-4">
              <div className="bg-[#FAF7F2] rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.bcbaAttestation}
                    onChange={e => updatePlan({ bcbaAttestation: e.target.checked })}
                    disabled={plan.isFinalized}
                    className="mt-0.5 w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-sm text-[#3A4A57]">
                    I, the BCBA of record, attest that this treatment plan is medically necessary, based on assessment data, and meets applicable professional and regulatory standards. I am licensed/certified and authorized to provide or supervise ABA services for this client.
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="BCBA Signature Date">
                  <input type="date" value={plan.bcbaSignatureDate} onChange={e => updatePlan({ bcbaSignatureDate: e.target.value })} disabled={plan.isFinalized} className={inputCls} />
                </Field>
              </div>
              {!plan.bcbaAttestation && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs">Attestation checkbox required before finalizing</p>
                </div>
              )}
            </div>
          </Section>

          {/* Finalize button */}
          {!plan.isFinalized && (
            <div className="no-print">
              <button
                onClick={() => setShowFinalizeConfirm(true)}
                disabled={!plan.bcbaAttestation || plan.goals.length === 0}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Lock className="w-5 h-5" />
                Finalize Plan
              </button>
              {(!plan.bcbaAttestation || plan.goals.length === 0) && (
                <p className="text-xs text-slate-400 text-center mt-2">
                  {plan.goals.length === 0 ? 'Add at least one goal to finalize' : 'Complete attestation to finalize'}
                </p>
              )}
            </div>
          )}

          {/* Finalized state */}
          {plan.isFinalized && (
            <div className="bg-green-50 border border-green-300 rounded-2xl p-5 flex items-center gap-4">
              <CheckCircle className="w-10 h-10 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-800">Plan Finalized</p>
                <p className="text-sm text-green-700 mt-0.5">
                  This treatment plan is locked. The parent review flow can be initiated from the BCBA portal.
                </p>
              </div>
            </div>
          )}

          <div className="h-6" />
        </div>
      </div>

      {/* Version history modal */}
      {showVersionHistory && (
        <VersionHistoryModal
          versions={versions}
          onRestore={handleRestoreVersion}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {/* Finalize confirm modal */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-amber-600" />
              <h3 className="font-bold text-[#1B2733] text-lg">Finalize Plan?</h3>
            </div>
            <p className="text-sm text-[#5A6B7A] mb-6">
              Finalizing will lock this plan for editing. You will be able to view and print it, but cannot make changes. This action triggers the parent review flow.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                className="flex-1 py-3 border border-slate-300 rounded-xl text-[#5A6B7A] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-medium"
              >
                Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TreatmentPlanEditor;
