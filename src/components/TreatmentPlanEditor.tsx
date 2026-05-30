// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * TreatmentPlanEditor.tsx
 *
 * Treatment plan creation and management for BCBAs and parents.
 * Enables structured goal setting, progress tracking, and plan reviews.
 *
 * Features:
 * - Create/edit treatment plans with multiple goals
 * - Track progress against baselines and targets
 * - Domain-based goal organization (communication, social, behavior, etc.)
 * - Progress updates with notes
 * - Review scheduling and reminders
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Plus,
  Target,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  X,
  Save,
  Loader2,
  Edit2,
  Trash2,
  Pause,
  Play,
  Archive
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { ScreenHeader } from './ui/ScreenHeader';
import { toast } from 'sonner';

// Types
interface TreatmentPlan {
  id: string;
  childId: string;
  userId: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  createdByProviderId?: string;
  providerName?: string;
  providerCredentials?: string;
  startDate?: string;
  targetEndDate?: string;
  reviewFrequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
  goals: TreatmentGoal[];
}

interface TreatmentGoal {
  id: string;
  planId: string;
  title: string;
  description?: string;
  domain: GoalDomain;
  baseline?: string;
  target?: string;
  measurementMethod?: string;
  status: 'not_started' | 'in_progress' | 'mastered' | 'on_hold' | 'discontinued';
  currentProgress: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  progressUpdates?: ProgressUpdate[];
}

interface ProgressUpdate {
  id: string;
  goalId: string;
  progressValue: number;
  notes?: string;
  loggedBy: string;
  createdAt: string;
}

type GoalDomain = 'communication' | 'social' | 'behavior' | 'daily_living' | 'motor' | 'academic' | 'play' | 'self_regulation' | 'other';

interface TreatmentPlanEditorProps {
  userId: string;
  childId: string;
  childName: string;
  onBack?: () => void;
  isProvider?: boolean;
  providerId?: string;
  providerName?: string;
  providerCredentials?: string;
}

// Domain options
const DOMAIN_OPTIONS: { value: GoalDomain; label: string; color: string; icon: string }[] = [
  { value: 'communication', label: 'Communication', color: 'bg-blue-100 text-blue-700', icon: '💬' },
  { value: 'social', label: 'Social Skills', color: 'bg-pink-100 text-pink-700', icon: '👥' },
  { value: 'behavior', label: 'Behavior', color: 'bg-amber-100 text-amber-700', icon: '🎯' },
  { value: 'daily_living', label: 'Daily Living', color: 'bg-green-100 text-green-700', icon: '🏠' },
  { value: 'motor', label: 'Motor Skills', color: 'bg-purple-100 text-purple-700', icon: '🏃' },
  { value: 'academic', label: 'Academic', color: 'bg-indigo-100 text-indigo-700', icon: '📚' },
  { value: 'play', label: 'Play Skills', color: 'bg-yellow-100 text-yellow-700', icon: '🎮' },
  { value: 'self_regulation', label: 'Self-Regulation', color: 'bg-teal-100 text-teal-700', icon: '🧘' },
  { value: 'other', label: 'Other', color: 'bg-neutral-100 text-neutral-700', icon: '📋' },
];

const STATUS_OPTIONS: { value: TreatmentGoal['status']; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'bg-neutral-100 text-neutral-600' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'mastered', label: 'Mastered', color: 'bg-green-100 text-green-700' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-amber-100 text-amber-700' },
  { value: 'discontinued', label: 'Discontinued', color: 'bg-neutral-100 text-neutral-500' },
];

export function TreatmentPlanEditor({
  userId,
  childId,
  childName,
  onBack,
  isProvider = false,
  providerId,
  providerName,
  providerCredentials
}: TreatmentPlanEditorProps) {
  // State
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<TreatmentGoal | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [showProgressForm, setShowProgressForm] = useState<string | null>(null);

  // Plan form state
  const [planForm, setPlanForm] = useState({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: '',
    reviewFrequency: 'monthly' as TreatmentPlan['reviewFrequency'],
  });

  // Goal form state
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    domain: 'behavior' as GoalDomain,
    baseline: '',
    target: '',
    measurementMethod: '',
    priority: 'medium' as TreatmentGoal['priority'],
  });

  // Progress form state
  const [progressForm, setProgressForm] = useState({
    progressValue: 0,
    notes: '',
  });

  // Load plans
  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      const plansWithGoals: TreatmentPlan[] = await Promise.all(
        (plansData || []).map(async (plan) => {
          const { data: goalsData } = await supabase
            .from('treatment_goals')
            .select('*')
            .eq('plan_id', plan.id)
            .order('priority', { ascending: false });

          const goals: TreatmentGoal[] = (goalsData || []).map(g => ({
            id: g.id,
            planId: g.plan_id,
            title: g.title,
            description: g.description,
            domain: g.domain,
            baseline: g.baseline,
            target: g.target,
            measurementMethod: g.measurement_method,
            status: g.status,
            currentProgress: g.current_progress || 0,
            priority: g.priority,
            createdAt: g.created_at,
            updatedAt: g.updated_at,
          }));

          return {
            id: plan.id,
            childId: plan.child_id,
            userId: plan.user_id,
            title: plan.title,
            description: plan.description,
            status: plan.status,
            createdByProviderId: plan.created_by_provider_id,
            providerName: plan.provider_name,
            providerCredentials: plan.provider_credentials,
            startDate: plan.start_date,
            targetEndDate: plan.target_end_date,
            reviewFrequency: plan.review_frequency,
            nextReviewDate: plan.next_review_date,
            createdAt: plan.created_at,
            updatedAt: plan.updated_at,
            goals,
          };
        })
      );

      setPlans(plansWithGoals);
      if (plansWithGoals.length > 0 && !selectedPlan) {
        setSelectedPlan(plansWithGoals[0]);
      }
    } catch (err) {
      console.error('[TreatmentPlan] Error loading plans:', err);
    } finally {
      setIsLoading(false);
    }
  }, [childId, selectedPlan]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Save plan
  const handleSavePlan = async () => {
    if (!planForm.title) return;

    setIsSaving(true);
    try {
      const nextReview = new Date();
      switch (planForm.reviewFrequency) {
        case 'weekly': nextReview.setDate(nextReview.getDate() + 7); break;
        case 'biweekly': nextReview.setDate(nextReview.getDate() + 14); break;
        case 'monthly': nextReview.setMonth(nextReview.getMonth() + 1); break;
        case 'quarterly': nextReview.setMonth(nextReview.getMonth() + 3); break;
      }

      const { data, error } = await supabase.from('treatment_plans').insert({
        child_id: childId,
        user_id: userId,
        title: planForm.title,
        description: planForm.description || null,
        status: 'draft',
        created_by_provider_id: isProvider ? providerId : null,
        provider_name: isProvider ? providerName : null,
        provider_credentials: isProvider ? providerCredentials : null,
        start_date: planForm.startDate || null,
        target_end_date: planForm.targetEndDate || null,
        review_frequency: planForm.reviewFrequency,
        next_review_date: nextReview.toISOString().split('T')[0],
      }).select().single();

      if (error) throw error;

      setPlanForm({ title: '', description: '', startDate: new Date().toISOString().split('T')[0], targetEndDate: '', reviewFrequency: 'monthly' });
      setShowPlanForm(false);
      loadPlans();
    } catch (err) {
      console.error('[TreatmentPlan] Error saving plan:', err);
      toast.error("Couldn't save — please try again");
    } finally {
      setIsSaving(false);
    }
  };

  // Save goal
  const handleSaveGoal = async () => {
    if (!goalForm.title || !selectedPlan) return;

    setIsSaving(true);
    try {
      if (editingGoal) {
        const { error } = await supabase.from('treatment_goals')
          .update({
            title: goalForm.title,
            description: goalForm.description || null,
            domain: goalForm.domain,
            baseline: goalForm.baseline || null,
            target: goalForm.target || null,
            measurement_method: goalForm.measurementMethod || null,
            priority: goalForm.priority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingGoal.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('treatment_goals').insert({
          plan_id: selectedPlan.id,
          title: goalForm.title,
          description: goalForm.description || null,
          domain: goalForm.domain,
          baseline: goalForm.baseline || null,
          target: goalForm.target || null,
          measurement_method: goalForm.measurementMethod || null,
          priority: goalForm.priority,
          status: 'not_started',
          current_progress: 0,
        });

        if (error) throw error;
      }

      setGoalForm({ title: '', description: '', domain: 'behavior', baseline: '', target: '', measurementMethod: '', priority: 'medium' });
      setShowGoalForm(false);
      setEditingGoal(null);
      loadPlans();
    } catch (err) {
      console.error('[TreatmentPlan] Error saving goal:', err);
      toast.error("Couldn't save — please try again");
    } finally {
      setIsSaving(false);
    }
  };

  // Update goal status
  const handleUpdateGoalStatus = async (goalId: string, status: TreatmentGoal['status']) => {
    try {
      const { error } = await supabase.from('treatment_goals')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', goalId);

      if (error) throw error;
      loadPlans();
    } catch (err) {
      console.error('[TreatmentPlan] Error updating goal status:', err);
      toast.error("Couldn't save — please try again");
    }
  };

  // Save progress update
  const handleSaveProgress = async (goalId: string) => {
    if (progressForm.progressValue < 0 || progressForm.progressValue > 100) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('goal_progress_updates').insert({
        goal_id: goalId,
        progress_value: progressForm.progressValue,
        notes: progressForm.notes || null,
        logged_by: isProvider ? providerId : 'parent',
      });

      if (error) throw error;

      setProgressForm({ progressValue: 0, notes: '' });
      setShowProgressForm(null);
      loadPlans();
    } catch (err) {
      console.error('[TreatmentPlan] Error saving progress:', err);
      toast.error("Couldn't save — please try again");
    } finally {
      setIsSaving(false);
    }
  };

  // Update plan status
  const handleUpdatePlanStatus = async (status: TreatmentPlan['status']) => {
    if (!selectedPlan) return;

    try {
      const { error } = await supabase.from('treatment_plans')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', selectedPlan.id);

      if (error) throw error;
      loadPlans();
    } catch (err) {
      console.error('[TreatmentPlan] Error updating plan status:', err);
      toast.error("Couldn't save — please try again");
    }
  };

  // Delete goal
  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase.from('treatment_goals').delete().eq('id', goalId);
      if (error) throw error;
      loadPlans();
    } catch (err) {
      console.error('[TreatmentPlan] Error deleting goal:', err);
      toast.error("Couldn't delete — please try again");
    }
  };

  const getDomainColor = (domain: GoalDomain) => {
    return DOMAIN_OPTIONS.find(d => d.value === domain)?.color || 'bg-neutral-100 text-neutral-700';
  };

  const getStatusColor = (status: TreatmentGoal['status']) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-neutral-100 text-neutral-600';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-teal-500';
    if (progress >= 25) return 'bg-amber-500';
    return 'bg-neutral-300';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
          <p className="text-neutral-600">Loading treatment plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Header */}
      <ScreenHeader
        title="Treatment Plans"
        subtitle={childName}
        onBack={onBack}
        sticky
        actions={
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => setShowPlanForm(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Plan
          </Button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-3 sm:gap-6">
          {/* Plan List Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="space-y-2">
              {plans.length === 0 ? (
                <Card className="p-6 text-center">
                  <Target className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
                  <p className="text-sm text-neutral-500">No plans yet</p>
                  <Button
                    size="sm"
                    className="mt-3 bg-teal-600 hover:bg-teal-700"
                    onClick={() => setShowPlanForm(true)}
                  >
                    Create First Plan
                  </Button>
                </Card>
              ) : (
                plans.map(plan => (
                  <Card
                    key={plan.id}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedPlan?.id === plan.id
                        ? 'border-teal-300 bg-teal-50'
                        : 'hover:border-neutral-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-neutral-900 line-clamp-2">{plan.title}</h3>
                      <Badge className={
                        plan.status === 'active' ? 'bg-green-100 text-green-700' :
                        plan.status === 'draft' ? 'bg-neutral-100 text-neutral-600' :
                        plan.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                        'bg-neutral-100 text-neutral-500'
                      }>
                        {plan.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {plan.goals.length} goals • {plan.goals.filter(g => g.status === 'mastered').length} mastered
                    </p>
                    {plan.providerName && (
                      <p className="text-xs text-teal-600 mt-1">
                        By {plan.providerName}
                      </p>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Plan Detail */}
          <div className="flex-1">
            {selectedPlan ? (
              <div className="space-y-3 sm:space-y-6">
                {/* Plan Header */}
                <Card className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">{selectedPlan.title}</h2>
                      {selectedPlan.description && (
                        <p className="text-neutral-600 mt-1">{selectedPlan.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedPlan.status === 'draft' && (
                        <Button size="sm" onClick={() => handleUpdatePlanStatus('active')}>
                          <Play className="w-4 h-4 mr-1" />
                          Activate
                        </Button>
                      )}
                      {selectedPlan.status === 'active' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdatePlanStatus('paused')}>
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      )}
                      {selectedPlan.status === 'paused' && (
                        <Button size="sm" onClick={() => handleUpdatePlanStatus('active')}>
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleUpdatePlanStatus('archived')} aria-label="Archive plan">
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 text-sm">
                    <div>
                      <p className="text-neutral-500">Start Date</p>
                      <p className="font-medium">{selectedPlan.startDate || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Target End</p>
                      <p className="font-medium">{selectedPlan.targetEndDate || 'Ongoing'}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Review</p>
                      <p className="font-medium capitalize">{selectedPlan.reviewFrequency}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Next Review</p>
                      <p className="font-medium">{selectedPlan.nextReviewDate || 'Not scheduled'}</p>
                    </div>
                  </div>

                  {selectedPlan.providerName && (
                    <div className="mt-4 pt-4 border-t border-neutral-100">
                      <p className="text-sm text-neutral-500">
                        Created by <span className="font-medium text-teal-600">{selectedPlan.providerName}</span>
                        {selectedPlan.providerCredentials && ` (${selectedPlan.providerCredentials})`}
                      </p>
                    </div>
                  )}
                </Card>

                {/* Progress Overview */}
                <Card className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-900">Progress Overview</h3>
                    <Badge className="bg-teal-100 text-teal-700">
                      {selectedPlan.goals.filter(g => g.status === 'mastered').length} / {selectedPlan.goals.length} Mastered
                    </Badge>
                  </div>

                  {selectedPlan.goals.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
                      <p className="text-neutral-500 mb-3">No goals added yet</p>
                      <Button onClick={() => setShowGoalForm(true)} className="bg-teal-600 hover:bg-teal-700">
                        <Plus className="w-4 h-4 mr-1" />
                        Add First Goal
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
                      {DOMAIN_OPTIONS.filter(d =>
                        selectedPlan.goals.some(g => g.domain === d.value)
                      ).map(domain => {
                        const domainGoals = selectedPlan.goals.filter(g => g.domain === domain.value);
                        const avgProgress = domainGoals.reduce((sum, g) => sum + g.currentProgress, 0) / domainGoals.length;
                        return (
                          <div key={domain.value} className="p-3 bg-neutral-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span>{domain.icon}</span>
                              <span className="text-sm font-medium text-neutral-700">{domain.label}</span>
                            </div>
                            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getProgressColor(avgProgress)} rounded-full transition-all`}
                                style={{ width: `${avgProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                              {domainGoals.length} goals • {Math.round(avgProgress)}% avg
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Goals List */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-neutral-900">Goals</h3>
                  <Button size="sm" onClick={() => setShowGoalForm(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Goal
                  </Button>
                </div>

                <div className="space-y-3">
                  {selectedPlan.goals.map(goal => (
                    <Card
                      key={goal.id}
                      className="p-4 hover:shadow-md transition-shadow"
                    >
                      <div
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getDomainColor(goal.domain)}>
                              {DOMAIN_OPTIONS.find(d => d.value === goal.domain)?.icon} {DOMAIN_OPTIONS.find(d => d.value === goal.domain)?.label}
                            </Badge>
                            <Badge className={getStatusColor(goal.status)}>
                              {STATUS_OPTIONS.find(s => s.value === goal.status)?.label}
                            </Badge>
                            {goal.priority === 'high' && (
                              <Badge className="bg-red-100 text-red-700">High Priority</Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-neutral-900">{goal.title}</h4>
                          {goal.description && (
                            <p className="text-sm text-neutral-500 mt-1 line-clamp-1">{goal.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="text-right">
                            <p className="text-xl sm:text-2xl font-bold text-neutral-900">{goal.currentProgress}%</p>
                            <div className="w-24 h-2 bg-neutral-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getProgressColor(goal.currentProgress)} rounded-full`}
                                style={{ width: `${goal.currentProgress}%` }}
                              />
                            </div>
                          </div>
                          {expandedGoal === goal.id ? (
                            <ChevronUp className="w-5 h-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                      </div>

                      {expandedGoal === goal.id && (
                        <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3 sm:space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                            <div>
                              <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Baseline</p>
                              <p className="text-sm text-neutral-700">{goal.baseline || 'Not set'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Target</p>
                              <p className="text-sm text-neutral-700">{goal.target || 'Not set'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Measurement</p>
                              <p className="text-sm text-neutral-700">{goal.measurementMethod || 'Not set'}</p>
                            </div>
                          </div>

                          {/* Status Update */}
                          <div>
                            <p className="text-xs font-medium text-neutral-500 uppercase mb-2">Update Status</p>
                            <div className="flex flex-wrap gap-2">
                              {STATUS_OPTIONS.map(status => (
                                <button
                                  key={status.value}
                                  onClick={() => handleUpdateGoalStatus(goal.id, status.value)}
                                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                    goal.status === status.value
                                      ? status.color + ' font-medium'
                                      : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                                  }`}
                                >
                                  {status.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Progress Update Form */}
                          {showProgressForm === goal.id ? (
                            <div className="p-4 bg-neutral-50 rounded-lg">
                              <h5 className="font-medium text-neutral-900 mb-3">Log Progress</h5>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm text-neutral-600 mb-1">
                                    Progress ({progressForm.progressValue}%)
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={progressForm.progressValue}
                                    onChange={(e) => setProgressForm({ ...progressForm, progressValue: parseInt(e.target.value) })}
                                    className="w-full"
                                  />
                                </div>
                                <Textarea
                                  placeholder="Notes on progress..."
                                  value={progressForm.notes}
                                  onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })}
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setShowProgressForm(null);
                                      setProgressForm({ progressValue: 0, notes: '' });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-teal-600 hover:bg-teal-700"
                                    onClick={() => handleSaveProgress(goal.id)}
                                    disabled={isSaving}
                                  >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Progress'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setShowProgressForm(goal.id);
                                  setProgressForm({ progressValue: goal.currentProgress, notes: '' });
                                }}
                              >
                                <TrendingUp className="w-4 h-4 mr-1" />
                                Log Progress
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingGoal(goal);
                                  setGoalForm({
                                    title: goal.title,
                                    description: goal.description || '',
                                    domain: goal.domain,
                                    baseline: goal.baseline || '',
                                    target: goal.target || '',
                                    measurementMethod: goal.measurementMethod || '',
                                    priority: goal.priority,
                                  });
                                  setShowGoalForm(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                aria-label="Delete goal"
                                onClick={() => {
                                  if (confirm('Delete this goal?')) handleDeleteGoal(goal.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">Select a Plan</h3>
                <p className="text-neutral-500 mb-4">
                  Choose a treatment plan from the sidebar or create a new one
                </p>
                <Button onClick={() => setShowPlanForm(true)} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Create New Plan
                </Button>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* New Plan Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <div className="p-6 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">New Treatment Plan</h2>
                <button onClick={() => setShowPlanForm(false)} aria-label="Close" className="p-2 hover:bg-neutral-100 rounded-lg">
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Plan Title *</label>
                <Input
                  placeholder="e.g., Communication Development Plan"
                  value={planForm.title}
                  onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Description</label>
                <Textarea
                  placeholder="Brief description of the plan goals..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Start Date</label>
                  <Input
                    type="date"
                    value={planForm.startDate}
                    onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Target End Date</label>
                  <Input
                    type="date"
                    value={planForm.targetEndDate}
                    onChange={(e) => setPlanForm({ ...planForm, targetEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Review Frequency</label>
                <div className="flex gap-2">
                  {(['weekly', 'biweekly', 'monthly', 'quarterly'] as const).map(freq => (
                    <button
                      key={freq}
                      onClick={() => setPlanForm({ ...planForm, reviewFrequency: freq })}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors capitalize ${
                        planForm.reviewFrequency === freq
                          ? 'bg-teal-100 border-teal-300 text-teal-700'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPlanForm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={handleSavePlan}
                disabled={isSaving || !planForm.title}
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Create Plan
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* New/Edit Goal Modal */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="max-w-lg w-full">
            <div className="p-6 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">
                  {editingGoal ? 'Edit Goal' : 'Add Goal'}
                </h2>
                <button
                  onClick={() => {
                    setShowGoalForm(false);
                    setEditingGoal(null);
                    setGoalForm({ title: '', description: '', domain: 'behavior', baseline: '', target: '', measurementMethod: '', priority: 'medium' });
                  }}
                  aria-label="Close"
                  className="p-2 hover:bg-neutral-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Goal Title *</label>
                <Input
                  placeholder="e.g., Request using 2-word phrases"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Description</label>
                <Textarea
                  placeholder="Detailed description of the goal..."
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Domain</label>
                <div className="flex flex-wrap gap-2">
                  {DOMAIN_OPTIONS.map(domain => (
                    <button
                      key={domain.value}
                      onClick={() => setGoalForm({ ...goalForm, domain: domain.value })}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        goalForm.domain === domain.value
                          ? domain.color + ' border-current'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {domain.icon} {domain.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Baseline</label>
                  <Input
                    placeholder="Current level..."
                    value={goalForm.baseline}
                    onChange={(e) => setGoalForm({ ...goalForm, baseline: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Target</label>
                  <Input
                    placeholder="Goal level..."
                    value={goalForm.target}
                    onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Measurement Method</label>
                <Input
                  placeholder="How will progress be measured?"
                  value={goalForm.measurementMethod}
                  onChange={(e) => setGoalForm({ ...goalForm, measurementMethod: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(priority => (
                    <button
                      key={priority}
                      onClick={() => setGoalForm({ ...goalForm, priority })}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors capitalize ${
                        goalForm.priority === priority
                          ? priority === 'high' ? 'bg-red-100 border-red-300 text-red-700' :
                            priority === 'medium' ? 'bg-amber-100 border-amber-300 text-amber-700' :
                            'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowGoalForm(false);
                  setEditingGoal(null);
                  setGoalForm({ title: '', description: '', domain: 'behavior', baseline: '', target: '', measurementMethod: '', priority: 'medium' });
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={handleSaveGoal}
                disabled={isSaving || !goalForm.title}
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingGoal ? 'Update Goal' : 'Add Goal'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default TreatmentPlanEditor;
