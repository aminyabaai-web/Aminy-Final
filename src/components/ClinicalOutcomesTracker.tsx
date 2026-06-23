// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ClinicalOutcomesTracker.tsx
 *
 * Clinical outcomes tracking for measuring treatment effectiveness.
 * Supports standardized assessments, custom checklists, and trend analysis.
 *
 * Features:
 * - Multiple assessment types (behavioral, skills, parent stress, quality of life)
 * - Score tracking with historical comparison
 * - Visual trend analysis
 * - Report generation for insurance/providers
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  FileText,
  Download,
  Plus,
  ChevronRight,
  ChevronDown,
  Clock,
  Target,
  Brain,
  Heart,
  Activity,
  BarChart3,
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuditedAction } from '../hooks/useAuditedAction';

// Types
interface ClinicalOutcome {
  id: string;
  childId: string;
  userId: string;
  assessmentType: AssessmentType;
  assessmentName: string;
  rawScore?: number;
  standardizedScore?: number;
  percentile?: number;
  severityLevel?: 'minimal' | 'mild' | 'moderate' | 'severe';
  interpretation?: string;
  previousScore?: number;
  changeFromPrevious?: number;
  administeredBy: string;
  createdAt: string;
}

type AssessmentType = 'behavioral_checklist' | 'skills_inventory' | 'parent_stress' | 'quality_of_life' | 'goal_attainment' | 'custom';

interface ClinicalOutcomesTrackerProps {
  userId: string;
  childId: string;
  childName: string;
  onBack?: () => void;
}

// Assessment configurations
const ASSESSMENT_CONFIGS: {
  type: AssessmentType;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  scales: { name: string; minScore: number; maxScore: number; interpretation: (score: number) => string }[];
}[] = [
  {
    type: 'behavioral_checklist',
    name: 'Behavior Checklist',
    description: 'Track challenging behaviors and their frequency/intensity',
    icon: Activity,
    color: 'text-amber-600 bg-amber-100',
    scales: [
      {
        name: 'Challenging Behaviors',
        minScore: 0,
        maxScore: 100,
        interpretation: (score) => {
          if (score <= 20) return 'Minimal concerns';
          if (score <= 40) return 'Mild concerns';
          if (score <= 60) return 'Moderate concerns';
          if (score <= 80) return 'Significant concerns';
          return 'Severe concerns';
        }
      }
    ]
  },
  {
    type: 'skills_inventory',
    name: 'Skills Inventory',
    description: 'Assess developmental skills across domains',
    icon: Brain,
    color: 'text-blue-600 bg-blue-100',
    scales: [
      {
        name: 'Communication',
        minScore: 0,
        maxScore: 100,
        interpretation: (score) => `${score}% of age-appropriate skills`
      },
      {
        name: 'Social',
        minScore: 0,
        maxScore: 100,
        interpretation: (score) => `${score}% of age-appropriate skills`
      },
      {
        name: 'Daily Living',
        minScore: 0,
        maxScore: 100,
        interpretation: (score) => `${score}% of age-appropriate skills`
      },
      {
        name: 'Motor',
        minScore: 0,
        maxScore: 100,
        interpretation: (score) => `${score}% of age-appropriate skills`
      }
    ]
  },
  {
    type: 'parent_stress',
    name: 'Caregiver Wellness',
    description: 'Monitor parent/caregiver stress and wellbeing',
    icon: Heart,
    color: 'text-rose-600 bg-rose-100',
    scales: [
      {
        name: 'Stress Level',
        minScore: 0,
        maxScore: 10,
        interpretation: (score) => {
          if (score <= 2) return 'Low stress';
          if (score <= 4) return 'Manageable stress';
          if (score <= 6) return 'Moderate stress';
          if (score <= 8) return 'High stress';
          return 'Severe stress';
        }
      }
    ]
  },
  {
    type: 'quality_of_life',
    name: 'Quality of Life',
    description: 'Assess overall family quality of life',
    icon: Target,
    color: 'text-green-600 bg-green-100',
    scales: [
      {
        name: 'Family Quality of Life',
        minScore: 0,
        maxScore: 100,
        interpretation: (score) => {
          if (score >= 80) return 'Excellent';
          if (score >= 60) return 'Good';
          if (score >= 40) return 'Fair';
          if (score >= 20) return 'Poor';
          return 'Very poor';
        }
      }
    ]
  },
  {
    type: 'goal_attainment',
    name: 'Goal Attainment',
    description: 'Measure progress toward treatment goals',
    icon: CheckCircle,
    color: 'text-[#6B9080] bg-[#6B9080]/10',
    scales: [
      {
        name: 'Goal Progress',
        minScore: -2,
        maxScore: 2,
        interpretation: (score) => {
          if (score <= -2) return 'Much less than expected';
          if (score <= -1) return 'Less than expected';
          if (score <= 0) return 'As expected';
          if (score <= 1) return 'Better than expected';
          return 'Much better than expected';
        }
      }
    ]
  }
];

export function ClinicalOutcomesTracker({
  userId,
  childId,
  childName,
  onBack
}: ClinicalOutcomesTrackerProps) {
  useAuditedAction('child_data');
  const [outcomes, setOutcomes] = useState<ClinicalOutcome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<AssessmentType | 'all'>('all');
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    type: 'behavioral_checklist' as AssessmentType,
    name: '',
    score: 0,
    interpretation: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load outcomes
  const loadOutcomes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinical_outcomes')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ClinicalOutcome[] = (data || []).map(row => ({
        id: row.id,
        childId: row.child_id,
        userId: row.user_id,
        assessmentType: row.assessment_type,
        assessmentName: row.assessment_name,
        rawScore: row.raw_score,
        standardizedScore: row.standardized_score,
        percentile: row.percentile,
        severityLevel: row.severity_level,
        interpretation: row.interpretation,
        previousScore: row.previous_score,
        changeFromPrevious: row.change_from_previous,
        administeredBy: row.administered_by,
        createdAt: row.created_at,
      }));

      setOutcomes(mapped);
    } catch (err) {
      console.error('[ClinicalOutcomes] Error loading:', err);
    } finally {
      setIsLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    loadOutcomes();
  }, [loadOutcomes]);

  // Save new assessment
  const handleSaveAssessment = async () => {
    if (!newAssessment.name) return;

    setIsSaving(true);
    try {
      // Find previous score for this assessment type
      const previousOutcome = outcomes.find(
        o => o.assessmentType === newAssessment.type && o.assessmentName === newAssessment.name
      );

      const config = ASSESSMENT_CONFIGS.find(c => c.type === newAssessment.type);
      const scale = config?.scales[0];
      const interpretation = scale?.interpretation(newAssessment.score) || '';

      // Determine severity level
      let severityLevel: ClinicalOutcome['severityLevel'];
      if (newAssessment.type === 'behavioral_checklist') {
        if (newAssessment.score <= 20) severityLevel = 'minimal';
        else if (newAssessment.score <= 40) severityLevel = 'mild';
        else if (newAssessment.score <= 60) severityLevel = 'moderate';
        else severityLevel = 'severe';
      }

      const { error } = await supabase.from('clinical_outcomes').insert({
        child_id: childId,
        user_id: userId,
        assessment_type: newAssessment.type,
        assessment_name: newAssessment.name,
        raw_score: newAssessment.score,
        interpretation: interpretation || newAssessment.interpretation,
        severity_level: severityLevel,
        previous_score: previousOutcome?.rawScore,
        change_from_previous: previousOutcome?.rawScore
          ? newAssessment.score - previousOutcome.rawScore
          : null,
        administered_by: 'parent',
      });

      if (error) throw error;

      setNewAssessment({ type: 'behavioral_checklist', name: '', score: 0, interpretation: '' });
      setShowNewAssessment(false);
      loadOutcomes();
    } catch (err) {
      console.error('[ClinicalOutcomes] Error saving:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter outcomes
  const filteredOutcomes = useMemo(() => {
    if (selectedType === 'all') return outcomes;
    return outcomes.filter(o => o.assessmentType === selectedType);
  }, [outcomes, selectedType]);

  // Group by assessment type for trends
  const trendsByType = useMemo(() => {
    const groups: Record<string, ClinicalOutcome[]> = {};
    outcomes.forEach(o => {
      const key = `${o.assessmentType}:${o.assessmentName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });

    return Object.entries(groups).map(([key, items]) => {
      const [type, name] = key.split(':');
      const sorted = items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const latest = sorted[sorted.length - 1];
      const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
      const change = latest && previous ? (latest.rawScore || 0) - (previous.rawScore || 0) : 0;

      return {
        type: type as AssessmentType,
        name,
        items: sorted,
        latest,
        change,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      };
    });
  }, [outcomes]);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date', 'Assessment Type', 'Name', 'Score', 'Interpretation', 'Change'];
    const rows = outcomes.map(o => [
      new Date(o.createdAt).toLocaleDateString(),
      o.assessmentType,
      o.assessmentName,
      o.rawScore?.toString() || '',
      o.interpretation || '',
      o.changeFromPrevious?.toString() || '',
    ].map(v => `"${v}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-outcomes-${childName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getTrendColor = (trend: string, type: AssessmentType) => {
    // For stress/behavioral scores, down is good; for skills, up is good
    const invertedTypes: AssessmentType[] = ['behavioral_checklist', 'parent_stress'];
    const isInverted = invertedTypes.includes(type);

    if (trend === 'up') return isInverted ? 'text-red-600' : 'text-green-600';
    if (trend === 'down') return isInverted ? 'text-green-600' : 'text-red-600';
    return 'text-[#5A6B7A]';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#6B9080] animate-spin mx-auto mb-3" />
          <p className="text-neutral-600">Loading clinical outcomes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button onClick={onBack} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-neutral-600" />
                </button>
              )}
              <div>
                <h1 className="text-lg font-semibold text-[#1B2733]">Clinical Outcomes</h1>
                <p className="text-sm text-[#5A6B7A]">{childName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button
                size="sm"
                className="bg-primary hover:bg-[#216982]"
                onClick={() => setShowNewAssessment(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Assessment
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Type Filter */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedType === 'all'
                  ? 'bg-[#6B9080]/10 text-[#6B9080]'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              All
            </button>
            {ASSESSMENT_CONFIGS.map(config => {
              const Icon = config.icon;
              return (
                <button
                  key={config.type}
                  onClick={() => setSelectedType(config.type)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    selectedType === config.type
                      ? 'bg-[#6B9080]/10 text-[#6B9080]'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {config.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-[#1B2733]">{outcomes.length}</p>
            <p className="text-sm text-[#5A6B7A]">Total Assessments</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              {trendsByType.filter(t => {
                const isInverted = ['behavioral_checklist', 'parent_stress'].includes(t.type);
                return isInverted ? t.trend === 'down' : t.trend === 'up';
              }).length}
            </p>
            <p className="text-sm text-[#5A6B7A]">Improving</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-amber-600">
              {trendsByType.filter(t => t.trend === 'stable').length}
            </p>
            <p className="text-sm text-[#5A6B7A]">Stable</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-red-600">
              {trendsByType.filter(t => {
                const isInverted = ['behavioral_checklist', 'parent_stress'].includes(t.type);
                return isInverted ? t.trend === 'up' : t.trend === 'down';
              }).length}
            </p>
            <p className="text-sm text-[#5A6B7A]">Needs Attention</p>
          </Card>
        </div>

        {/* Trend Cards */}
        {trendsByType.length > 0 && (
          <div>
            <h3 className="font-semibold text-[#1B2733] mb-3">Trends</h3>
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
              {trendsByType.map((trend, i) => {
                const config = ASSESSMENT_CONFIGS.find(c => c.type === trend.type);
                const Icon = config?.icon || Activity;

                return (
                  <Card key={i} className="p-3 sm:p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config?.color || 'bg-neutral-100 text-neutral-600'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-[#1B2733]">{trend.name || config?.name}</p>
                          <p className="text-sm text-[#5A6B7A]">{trend.items.length} assessments</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`flex items-center gap-1 ${getTrendColor(trend.trend, trend.type)}`}>
                          {getTrendIcon(trend.trend)}
                          <span className="font-semibold">
                            {trend.change > 0 ? '+' : ''}{trend.change}
                          </span>
                        </div>
                        <p className="text-sm text-[#5A6B7A]">
                          Current: {trend.latest?.rawScore}
                        </p>
                      </div>
                    </div>

                    {/* Mini trend visualization */}
                    <div className="mt-4 flex items-end gap-1 h-12">
                      {trend.items.slice(-10).map((item, j) => {
                        const maxScore = config?.scales[0]?.maxScore || 100;
                        const height = ((item.rawScore || 0) / maxScore) * 100;
                        return (
                          <div
                            key={j}
                            className="flex-1 bg-[#6B9080]/20 rounded-t"
                            style={{ height: `${Math.max(10, height)}%` }}
                            title={`${item.rawScore} - ${new Date(item.createdAt).toLocaleDateString()}`}
                          />
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Assessments */}
        <div>
          <h3 className="font-semibold text-[#1B2733] mb-3">Recent Assessments</h3>
          {filteredOutcomes.length === 0 ? (
            <Card className="p-12 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-medium text-[#1B2733] mb-2">No assessments yet</h3>
              <p className="text-[#5A6B7A] mb-4">
                Start tracking clinical outcomes to measure progress
              </p>
              <Button onClick={() => setShowNewAssessment(true)} className="bg-primary hover:bg-[#216982]">
                <Plus className="w-4 h-4 mr-1" />
                Add First Assessment
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredOutcomes.map(outcome => {
                const config = ASSESSMENT_CONFIGS.find(c => c.type === outcome.assessmentType);
                const Icon = config?.icon || Activity;

                return (
                  <Card key={outcome.id} className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config?.color || 'bg-neutral-100 text-neutral-600'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-[#1B2733]">
                            {outcome.assessmentName || config?.name}
                          </p>
                          <p className="text-sm text-[#5A6B7A]">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(outcome.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl font-bold text-[#1B2733]">
                            {outcome.rawScore}
                          </span>
                          {outcome.changeFromPrevious !== null && outcome.changeFromPrevious !== undefined && (
                            <Badge className={
                              outcome.changeFromPrevious > 0
                                ? 'bg-green-100 text-green-700'
                                : outcome.changeFromPrevious < 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-neutral-100 text-neutral-600'
                            }>
                              {outcome.changeFromPrevious > 0 ? '+' : ''}{outcome.changeFromPrevious}
                            </Badge>
                          )}
                        </div>
                        {outcome.interpretation && (
                          <p className="text-sm text-[#5A6B7A]">{outcome.interpretation}</p>
                        )}
                        {outcome.severityLevel && (
                          <Badge className={
                            outcome.severityLevel === 'minimal' ? 'bg-green-100 text-green-700' :
                            outcome.severityLevel === 'mild' ? 'bg-blue-100 text-blue-700' :
                            outcome.severityLevel === 'moderate' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {outcome.severityLevel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* New Assessment Modal */}
      {showNewAssessment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <div className="p-6 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1B2733]">New Assessment</h2>
                <button onClick={() => setShowNewAssessment(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <ChevronDown className="w-5 h-5 text-[#5A6B7A] rotate-45" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3 sm:space-y-4">
              {/* Assessment Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Assessment Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ASSESSMENT_CONFIGS.map(config => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={config.type}
                        onClick={() => setNewAssessment({
                          ...newAssessment,
                          type: config.type,
                          name: config.name
                        })}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors text-left ${
                          newAssessment.type === config.type
                            ? 'bg-[#6B9080]/10 border-[#6B9080]/30'
                            : 'bg-white border-neutral-200 hover:border-[#6B9080]/20'
                        }`}
                      >
                        <div className={`p-1.5 rounded ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1B2733]">{config.name}</p>
                          <p className="text-sm text-[#5A6B7A] line-clamp-1">{config.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assessment Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Assessment Name
                </label>
                <Input
                  placeholder="e.g., Daily Behavior Rating"
                  value={newAssessment.name}
                  onChange={(e) => setNewAssessment({ ...newAssessment, name: e.target.value })}
                />
              </div>

              {/* Score */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Score
                </label>
                <div className="flex items-center gap-3 sm:gap-4">
                  <Input
                    type="number"
                    value={newAssessment.score}
                    onChange={(e) => setNewAssessment({ ...newAssessment, score: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <input
                    type="range"
                    min={ASSESSMENT_CONFIGS.find(c => c.type === newAssessment.type)?.scales[0]?.minScore || 0}
                    max={ASSESSMENT_CONFIGS.find(c => c.type === newAssessment.type)?.scales[0]?.maxScore || 100}
                    value={newAssessment.score}
                    onChange={(e) => setNewAssessment({ ...newAssessment, score: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                </div>
                <p className="text-sm text-[#5A6B7A] mt-2">
                  <Info className="w-3.5 h-3.5 inline mr-1" />
                  {ASSESSMENT_CONFIGS.find(c => c.type === newAssessment.type)?.scales[0]?.interpretation(newAssessment.score)}
                </p>
              </div>

              {/* Interpretation (optional) */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Notes (optional)
                </label>
                <Input
                  placeholder="Any additional notes about this assessment..."
                  value={newAssessment.interpretation}
                  onChange={(e) => setNewAssessment({ ...newAssessment, interpretation: e.target.value })}
                />
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewAssessment(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-[#216982]"
                onClick={handleSaveAssessment}
                disabled={isSaving || !newAssessment.name}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Assessment
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ClinicalOutcomesTracker;
