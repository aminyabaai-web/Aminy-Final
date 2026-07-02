// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * PatientAISummary - AI-generated patient summaries for providers
 *
 * Features:
 * - AI-synthesized patient overview
 * - Key behavior patterns identified
 * - Recent progress highlights
 * - Suggested focus areas
 * - Provider feedback that updates care plan (with parent approval)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  FileText,
  Clock,
  Target,
  Heart,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Info,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { sendMessageToClaude } from '../../lib/ai-engine/claude-client';
import { getCurrentContext } from '../../lib/ai-engine';
import { isDemoMode } from '../../lib/demo-seed';
import { supabase } from '../../utils/supabase/client';
import { mapCheckInRows, parseBaselineRow, formatOutcomesForAI } from '../../lib/outcome-trends';

/**
 * Returns true for ids that are obviously not real auth user ids
 * (e.g. the 'parent-123' placeholder ProviderPortal used to hardcode).
 * Real ids are Supabase auth UUIDs.
 */
function isPlaceholderId(id?: string): boolean {
  return !id || !id.trim() || id === 'unknown' || /^(parent|patient|demo|client|family)[-_]/i.test(id);
}

interface PatientData {
  id: string;
  childName: string;
  age: number;
  conditions: string[];
  parentName: string;
}

interface AIInsight {
  category: string;
  insight: string;
  confidence: number;
  source: string;
}

interface BehaviorPattern {
  behavior: string;
  frequency: 'increasing' | 'decreasing' | 'stable';
  triggers: string[];
  successfulStrategies: string[];
}

interface ProgressHighlight {
  area: string;
  change: string;
  trend: 'positive' | 'negative' | 'neutral';
  details: string;
}

interface CarePlanSuggestion {
  id: string;
  type: 'goal' | 'strategy' | 'intervention';
  title: string;
  description: string;
  rationale: string;
  status: 'pending' | 'approved' | 'rejected';
  providerNotes?: string;
  parentResponse?: string;
}

/**
 * Prop contract (for ProviderPortal wiring):
 * - `parentId` MUST be the parent/caregiver's real Supabase auth user id (uuid).
 *   goals / behavior_logs / session_notes are keyed by `user_id` = that id, and
 *   they are what grounds the AI summary in real parent-logged data.
 *   Placeholder values ('parent-123', 'unknown', empty) are detected and safely
 *   ignored — the summary then falls back to demographics-only generation.
 * - `patientId` is the child id (used for display identity only).
 */
interface PatientAISummaryProps {
  patient?: PatientData;
  patientId?: string;
  childName?: string;
  parentId?: string;
  providerId?: string;
  onClose?: () => void;
}

export function PatientAISummary({ patient: patientProp, patientId, childName, parentId, providerId, onClose }: PatientAISummaryProps) {
  // Build patient from either the patient prop or individual props.
  // Memoized: the load effect depends on it, and a fresh object literal every
  // render would re-trigger AI generation in a loop.
  const patient = useMemo(() => (patientProp ?? {
    id: patientId || 'unknown',
    childName: childName || 'Client',
    parentName: 'Parent',
    age: 0,
    conditions: [],
  }) as PatientData, [patientProp, patientId, childName]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'summary' | 'patterns' | 'progress' | 'feedback'>('summary');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [patterns, setPatterns] = useState<BehaviorPattern[]>([]);
  const [progress, setProgress] = useState<ProgressHighlight[]>([]);
  const [suggestions, setSuggestions] = useState<CarePlanSuggestion[]>([]);
  const [newSuggestion, setNewSuggestion] = useState({ title: '', description: '', rationale: '' });
  const [isAddingSuggestion, setIsAddingSuggestion] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [approvingSuggestionId, setApprovingSuggestionId] = useState<string | null>(null);

  // Mock data generators for fallback when AI is unavailable
  const generateMockInsights = (): AIInsight[] => [
    {
      category: 'Communication',
      insight: `${patient.childName} shows improved verbal requests when given processing time. Average response delay of 5-7 seconds yields 40% better outcomes than immediate prompts.`,
      confidence: 0.92,
      source: 'Based on 47 logged interactions over 3 weeks'
    },
    {
      category: 'Sensory Needs',
      insight: 'Meltdown risk increases significantly in environments with overhead fluorescent lighting. Parent reports 85% fewer incidents since switching to warm LED bulbs at home.',
      confidence: 0.88,
      source: 'Based on environment tags in incident logs'
    },
    {
      category: 'Transitions',
      insight: 'Visual timers with 5-minute warnings reduce transition resistance by approximately 60%. Audio-only warnings show no significant improvement.',
      confidence: 0.85,
      source: 'Based on routine completion data'
    },
    {
      category: 'Social Engagement',
      insight: `${patient.childName} engages more positively with peers when activities involve parallel play rather than direct interaction. Consider structured parallel activities in therapy.`,
      confidence: 0.79,
      source: 'Based on parent observations and AI chat discussions'
    }
  ];

  const generateMockPatterns = (): BehaviorPattern[] => [
    {
      behavior: 'Morning routine resistance',
      frequency: 'decreasing',
      triggers: ['Rushed mornings', 'Changes to expected sequence', 'Hunger'],
      successfulStrategies: ['Visual schedule', 'Breakfast before getting dressed', '10-minute buffer time']
    },
    {
      behavior: 'After-school meltdowns',
      frequency: 'stable',
      triggers: ['Sensory overload at school', 'Hunger', 'Transition from structured to unstructured time'],
      successfulStrategies: ['Quiet decompression time', 'Snack immediately available', 'Predictable after-school routine']
    },
    {
      behavior: 'Bedtime compliance',
      frequency: 'increasing',
      triggers: ['Overstimulation', 'Anxiety about next day', 'Screen time too close to bed'],
      successfulStrategies: ['Consistent routine', 'Dim lights 30 min before', 'Weighted blanket']
    }
  ];

  const generateMockProgress = (): ProgressHighlight[] => [
    {
      area: 'Verbal Communication',
      change: '+23% increase in spontaneous requests',
      trend: 'positive',
      details: 'Up from 12 to 15 unprompted verbal requests per day on average'
    },
    {
      area: 'Self-Regulation',
      change: 'Meltdown duration reduced by 35%',
      trend: 'positive',
      details: 'Average duration down from 20 minutes to 13 minutes'
    },
    {
      area: 'Sleep Quality',
      change: 'Consistent 8+ hours for 18 of last 21 nights',
      trend: 'positive',
      details: 'Up from 10 of 21 nights last month'
    },
    {
      area: 'Social Initiation',
      change: 'No significant change',
      trend: 'neutral',
      details: 'Consider focusing on parallel play activities to build foundation'
    }
  ];

  const generateMockSuggestions = (): CarePlanSuggestion[] => [
    {
      id: '1',
      type: 'goal',
      title: 'Increase independent self-regulation attempts',
      description: 'Child will independently use a calming strategy (deep breathing, sensory tool, or quiet space) before escalating to meltdown in 4 out of 5 opportunities.',
      rationale: 'Data shows child is responsive to calming strategies when prompted. Building independence will improve long-term outcomes.',
      status: 'pending'
    },
    {
      id: '2',
      type: 'strategy',
      title: 'Implement visual emotion check-in',
      description: 'Use a 5-point emotion scale visual at transition points throughout the day. Teach child to self-identify and communicate emotional state.',
      rationale: 'Early identification of dysregulation allows for proactive intervention before escalation.',
      status: 'pending'
    },
    {
      id: '3',
      type: 'intervention',
      title: 'Structured parallel play sessions',
      description: 'Arrange 2-3 weekly 15-minute parallel play sessions with one peer, gradually increasing interaction expectations over 6 weeks.',
      rationale: 'AI analysis indicates better social engagement with parallel activities. Gradual progression will build comfort.',
      status: 'approved',
      parentResponse: 'Love this idea! We can do this with neighbor\'s child who is understanding.'
    }
  ];

  // Load AI summary — real Claude API call with fallback to mock data
  useEffect(() => {
    const loadAISummary = async () => {
      setIsLoading(true);

      try {
        const context = getCurrentContext();
        const systemPrompt = `You are a clinical AI assistant for Aminy, generating comprehensive patient summaries for behavioral health providers. Analyze all available data and return a structured JSON response (and ONLY JSON, no markdown fences).

Return JSON with this exact structure:
{
  "insights": [
    {
      "category": "Communication|Sensory Needs|Transitions|Social Engagement|Self-Regulation|Daily Living",
      "insight": "Detailed clinical insight in 1-2 sentences",
      "confidence": 0.0 to 1.0,
      "source": "Brief description of data source"
    }
  ],
  "behaviorPatterns": [
    {
      "behavior": "Name of the behavior pattern",
      "frequency": "increasing|decreasing|stable",
      "triggers": ["trigger1", "trigger2"],
      "successfulStrategies": ["strategy1", "strategy2"]
    }
  ],
  "progressHighlights": [
    {
      "area": "Developmental area",
      "change": "Brief description of change (e.g., '+23% increase in...')",
      "trend": "positive|negative|neutral",
      "details": "More detailed explanation"
    }
  ],
  "carePlanSuggestions": [
    {
      "id": "unique-id",
      "type": "goal|strategy|intervention",
      "title": "Short title",
      "description": "Detailed description of what to implement",
      "rationale": "Clinical rationale for this suggestion",
      "status": "pending"
    }
  ]
}

Provide 3-4 insights, 2-3 behavior patterns, 3-4 progress highlights, and 2-3 care plan suggestions. Be specific and clinically grounded. Use the child's name where appropriate.`;

        const childName = patient.childName || 'the patient';
        const age = patient.age || 0;
        const conditions = patient.conditions?.length > 0 ? patient.conditions.join(', ') : 'neurodevelopmental concerns';
        const parentName = patient.parentName || 'the parent';

        // Ground the summary in real parent-logged data when we have a real
        // parent user id (same query shapes as BCBASessionBriefing). If the id
        // is a placeholder or nothing comes back, fall through to
        // demographics-only generation (previous behavior).
        let loggedDataContext = '';
        if (!isDemoMode() && !isPlaceholderId(parentId)) {
          try {
            const [goalsRes, logsRes, notesRes, outcomesRes, baselineRes] = await Promise.all([
              // NOTE: goals has no target_behavior column — selecting it 400s and drops the whole result
              supabase.from('goals').select('title, status, progress_notes, updated_at')
                .eq('user_id', parentId).eq('status', 'active').limit(8),
              supabase.from('behavior_logs').select('behavior_type, intensity, notes, is_positive, created_at')
                .eq('user_id', parentId).order('created_at', { ascending: false }).limit(10),
              supabase.from('session_notes').select('content, session_type, created_at')
                .eq('user_id', parentId).order('created_at', { ascending: false }).limit(3),
              // Weekly parent check-ins + baseline — the same collection pipeline the
              // parent app charts (src/lib/outcome-trends.ts). Flows only into the
              // existing Claude prompt path; no new third-party data flow.
              supabase.from('outcome_events').select('context, payload, recorded_at, created_at')
                .eq('user_id', parentId).eq('event_type', 'weekly_parent_checkin')
                .order('created_at', { ascending: false }).limit(12), // same-week re-dos collapse; prompt caps at 4 weeks
              supabase.from('clinical_outcomes').select('interpretation, raw_score, created_at')
                .eq('user_id', parentId).eq('assessment_name', 'parent_baseline_assessment')
                .order('created_at', { ascending: false }).limit(1).maybeSingle(),
            ]);

            const goals = goalsRes.data || [];
            const logs = logsRes.data || [];
            const notes = notesRes.data || [];
            const outcomesBlock = formatOutcomesForAI(
              mapCheckInRows(outcomesRes.data || []),
              parseBaselineRow(baselineRes.data),
            );

            const recentWins = logs
              .filter(l => l.is_positive)
              .map(l => l.behavior_type || l.notes || '')
              .filter(Boolean)
              .slice(0, 5);
            const recentChallenges = logs
              .filter(l => !l.is_positive)
              .map(l => `${l.behavior_type}${l.intensity != null ? ` (intensity ${l.intensity})` : ''}`)
              .filter(Boolean)
              .slice(0, 5);

            loggedDataContext = [
              goals.length > 0 ? `Active goals: ${goals.map(g => g.title).join('; ')}` : '',
              recentWins.length > 0 ? `Recent wins (parent-logged): ${recentWins.join('; ')}` : '',
              recentChallenges.length > 0 ? `Recent challenges (parent-logged): ${recentChallenges.join('; ')}` : '',
              notes.length > 0 ? `Latest session note excerpt: ${notes[0].content?.substring(0, 300)}` : '',
              outcomesBlock ? `WEEKLY OUTCOMES: ${outcomesBlock}` : '',
            ].filter(Boolean).join('\n');
          } catch (dataErr) {
            console.warn('[PatientAISummary] Could not load parent-logged data:', dataErr);
          }
        }

        const userMessage = [
          `Generate a comprehensive clinical AI summary for patient ${childName}, age ${age}, with ${conditions}. Parent/caregiver: ${parentName}. Include communication patterns, sensory triggers, transition strategies, social engagement patterns, behavior trends, and care plan suggestions based on available data.`,
          loggedDataContext
            ? `\nReal logged data for this patient (ground every insight, pattern, and suggestion in it — do not invent data that contradicts it):\n${loggedDataContext}`
            : '',
        ].filter(Boolean).join('\n');

        const response = await sendMessageToClaude(
          [{ role: 'user', content: userMessage }],
          context,
          { systemPrompt, maxTokens: 2500, temperature: 0.7 }
        );

        // Parse the JSON response — handle possible markdown code fences
        const jsonStr = response.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(jsonStr);

        // Map and validate insights
        if (Array.isArray(parsed.insights) && parsed.insights.length > 0) {
          setInsights(parsed.insights.map((i: Record<string, unknown>) => ({
            category: i.category || 'General',
            insight: i.insight || '',
            confidence: typeof i.confidence === 'number' ? Math.min(1, Math.max(0, i.confidence)) : 0.8,
            source: i.source || 'AI analysis',
          })));
        } else if (isDemoMode()) {
          setInsights(generateMockInsights());
        }

        // Map and validate behavior patterns
        if (Array.isArray(parsed.behaviorPatterns) && parsed.behaviorPatterns.length > 0) {
          setPatterns(parsed.behaviorPatterns.map((p: Record<string, unknown>) => ({
            behavior: p.behavior || '',
            frequency: (['increasing', 'decreasing', 'stable'].includes(p.frequency as string) ? p.frequency : 'stable') as BehaviorPattern['frequency'],
            triggers: Array.isArray(p.triggers) ? p.triggers : [],
            successfulStrategies: Array.isArray(p.successfulStrategies) ? p.successfulStrategies : [],
          })));
        } else if (isDemoMode()) {
          setPatterns(generateMockPatterns());
        }

        // Map and validate progress highlights
        if (Array.isArray(parsed.progressHighlights) && parsed.progressHighlights.length > 0) {
          setProgress(parsed.progressHighlights.map((p: Record<string, unknown>) => ({
            area: p.area || '',
            change: p.change || '',
            trend: (['positive', 'negative', 'neutral'].includes(p.trend as string) ? p.trend : 'neutral') as ProgressHighlight['trend'],
            details: p.details || '',
          })));
        } else if (isDemoMode()) {
          setProgress(generateMockProgress());
        }

        // Map and validate care plan suggestions
        if (Array.isArray(parsed.carePlanSuggestions) && parsed.carePlanSuggestions.length > 0) {
          setSuggestions(parsed.carePlanSuggestions.map((s: Record<string, unknown>, i: number) => ({
            id: s.id || String(i + 1),
            type: (['goal', 'strategy', 'intervention'].includes(s.type as string) ? s.type : 'strategy') as CarePlanSuggestion['type'],
            title: s.title || '',
            description: s.description || '',
            rationale: s.rationale || '',
            status: (['pending', 'approved', 'rejected'].includes(s.status as string) ? s.status : 'pending') as CarePlanSuggestion['status'],
          })));
        } else if (isDemoMode()) {
          setSuggestions(generateMockSuggestions());
        }
      } catch (error) {
        console.warn('AI summary generation failed:', error);
        // Only fabricate insights in demo mode — otherwise stay honest (empty state)
        if (isDemoMode()) {
          setInsights(generateMockInsights());
          setPatterns(generateMockPatterns());
          setProgress(generateMockProgress());
          setSuggestions(generateMockSuggestions());
        }
      }

      setIsLoading(false);
    };

    loadAISummary();
  }, [patient, parentId]);

  const handleAddSuggestion = () => {
    if (!newSuggestion.title || !newSuggestion.description) return;

    const suggestion: CarePlanSuggestion = {
      id: Date.now().toString(),
      type: 'strategy',
      title: newSuggestion.title,
      description: newSuggestion.description,
      rationale: newSuggestion.rationale || 'Based on clinical observation',
      status: 'pending'
    };

    setSuggestions([...suggestions, suggestion]);
    setNewSuggestion({ title: '', description: '', rationale: '' });
    setIsAddingSuggestion(false);
  };

  /**
   * Provider approval → the family's home feed. Inserts the suggestion into
   * the same `goals` table the parent app reads (Dashboard10 / care plan /
   * BCBASessionBriefing all query goals by user_id), so an approved goal shows
   * up in the parent's app immediately.
   *
   * Column shapes match the live goals table (id text default, user_id uuid,
   * title/name/area text, progress int, completed/is_active bool, status text,
   * progress_notes text). `area: 'provider_suggested'` marks provenance —
   * no new source/created_by columns needed.
   */
  const handleApproveSuggestion = async (suggestion: CarePlanSuggestion) => {
    if (approvingSuggestionId) return;
    setApprovingSuggestionId(suggestion.id);
    try {
      if (!isDemoMode() && !isPlaceholderId(parentId)) {
        const progressNotes = [
          suggestion.description,
          suggestion.rationale ? `Provider rationale: ${suggestion.rationale}` : '',
        ].filter(Boolean).join('\n\n');

        const { error } = await supabase.from('goals').insert({
          user_id: parentId,
          title: suggestion.title,
          name: suggestion.title,
          area: 'provider_suggested',
          progress: 0,
          completed: false,
          is_active: true,
          status: 'active',
          progress_notes: progressNotes,
        });

        if (error) {
          console.error('[PatientAISummary] Failed to add goal to family plan:', error.message);
          toast.error("Couldn't add this to the family's plan — please try again.");
          return;
        }
      }
      // Demo mode / placeholder parent id: reflect the approval locally only.
      setSuggestions(prev => prev.map(s => (s.id === suggestion.id ? { ...s, status: 'approved' } : s)));
      toast.success("Added to the family's plan — they'll see it in their app.");
    } finally {
      setApprovingSuggestionId(null);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'positive':
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative':
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-rose-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-neutral-300" />;
    }
  };

  const getFrequencyColor = (freq: string) => {
    switch (freq) {
      case 'increasing': return 'text-rose-600 bg-rose-50';
      case 'decreasing': return 'text-green-600 bg-green-50';
      default: return 'text-neutral-600 bg-neutral-50';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-8">
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <Brain className="w-16 h-16 text-violet-200" />
            <Sparkles className="w-6 h-6 text-violet-600 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-300 font-medium">
            Generating AI summary for {patient.childName}...
          </p>
          <p className="text-sm text-[#5A6B7A]">Analyzing conversation history, routines, and incident logs</p>
        </div>
      </div>
    );
  }

  // Honest empty state — no AI insights came back and we're not in demo mode
  const hasAnyContent = insights.length > 0 || patterns.length > 0 || progress.length > 0 || suggestions.length > 0;
  if (!hasAnyContent) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
            <Brain className="w-10 h-10 text-violet-400" />
          </div>
          <p className="mt-4 text-[#132F43] dark:text-white font-medium">
            No AI insights yet
          </p>
          <p className="mt-1 text-sm text-[#5A6B7A] dark:text-neutral-400 max-w-xs">
            AI insights for {patient.childName} appear as their data builds up — sessions, routines, and incident logs.
          </p>
          {onClose && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-4 border-b border-violet-100 dark:border-violet-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
              <Brain className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#132F43] dark:text-white">
                AI Summary: {patient.childName}
              </h2>
              <p className="text-sm text-[#5A6B7A] dark:text-neutral-400">
                {patient.age} years old • {patient.conditions.join(', ')}
              </p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-neutral-200 dark:border-slate-700">
        {[
          { id: 'summary', label: 'AI Insights', icon: Sparkles },
          { id: 'patterns', label: 'Patterns', icon: Target },
          { id: 'progress', label: 'Progress', icon: TrendingUp },
          { id: 'feedback', label: 'Care Plan Updates', icon: Edit3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as typeof activeSection)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeSection === tab.id
                ? 'border-violet-600 text-violet-600 bg-violet-50/50 dark:bg-violet-900/20'
                : 'border-transparent text-[#5A6B7A] hover:text-neutral-700 hover:bg-neutral-50 dark:hover:bg-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {activeSection === 'summary' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 dark:bg-violet-900/20 px-3 py-2 rounded-lg">
              <Info className="w-4 h-4" />
              <span>These insights are AI-generated from parent conversations, routines, and incident logs.</span>
            </div>

            {insights.map((insight, i) => (
              <div key={i} className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-sm">
                    {insight.category}
                  </Badge>
                  <span className="text-sm text-[#5A6B7A]">
                    {Math.round(insight.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-neutral-800 dark:text-neutral-200 mb-2">{insight.insight}</p>
                <p className="text-sm text-[#5A6B7A] dark:text-neutral-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {insight.source}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'patterns' && (
          <div className="space-y-4">
            {patterns.map((pattern, i) => (
              <div key={i} className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-[#132F43] dark:text-white">{pattern.behavior}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFrequencyColor(pattern.frequency)}`}>
                    {pattern.frequency}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#5A6B7A] mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      Known Triggers
                    </p>
                    <ul className="space-y-1">
                      {pattern.triggers.map((trigger, j) => (
                        <li key={j} className="text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                          {trigger}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#5A6B7A] mb-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Successful Strategies
                    </p>
                    <ul className="space-y-1">
                      {pattern.successfulStrategies.map((strategy, j) => (
                        <li key={j} className="text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                          {strategy}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'progress' && (
          <div className="space-y-3">
            {progress.map((item, i) => (
              <div key={i} className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(item.trend)}
                    <h4 className="font-medium text-[#132F43] dark:text-white">{item.area}</h4>
                  </div>
                  <span className={`text-sm font-medium ${
                    item.trend === 'positive' ? 'text-green-600' :
                    item.trend === 'negative' ? 'text-rose-600' : 'text-[#5A6B7A]'
                  }`}>
                    {item.change}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.details}</p>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'feedback' && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Provider Feedback Loop:</strong> Your suggestions will be sent to {patient.parentName} for approval before being integrated into {patient.childName}'s care plan.
              </p>
            </div>

            {/* Add new suggestion */}
            {isAddingSuggestion ? (
              <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4">
                <h4 className="font-medium text-[#132F43] dark:text-white mb-3">Add Care Plan Suggestion</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Title (e.g., 'Implement token economy system')"
                    value={newSuggestion.title}
                    onChange={e => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[#132F43] dark:text-white"
                  />
                  <Textarea
                    placeholder="Description - What should the parent do?"
                    value={newSuggestion.description}
                    onChange={e => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                    rows={3}
                  />
                  <Textarea
                    placeholder="Clinical rationale (optional) - Why is this recommended?"
                    value={newSuggestion.rationale}
                    onChange={e => setNewSuggestion({ ...newSuggestion, rationale: e.target.value })}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddSuggestion} className="gap-1">
                      <Send className="w-4 h-4" />
                      Send to Parent
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingSuggestion(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setIsAddingSuggestion(true)}
                variant="outline"
                className="w-full gap-2 border-dashed"
              >
                <Edit3 className="w-4 h-4" />
                Add Care Plan Suggestion
              </Button>
            )}

            {/* Existing suggestions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[#5A6B7A] dark:text-neutral-400">
                Care Plan Suggestions ({suggestions.length})
              </h4>

              {suggestions.map(suggestion => (
                <div
                  key={suggestion.id}
                  className={`rounded-lg border p-4 ${
                    suggestion.status === 'approved'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : suggestion.status === 'rejected'
                      ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                      : 'bg-white dark:bg-slate-700 border-neutral-200 dark:border-slate-600'
                  }`}
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedSuggestion(expandedSuggestion === suggestion.id ? null : suggestion.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={suggestion.status === 'approved' ? 'default' : 'secondary'} className="text-sm">
                        {suggestion.type}
                      </Badge>
                      <h5 className="font-medium text-[#132F43] dark:text-white">{suggestion.title}</h5>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        suggestion.status === 'approved' ? 'bg-green-100 text-green-700' :
                        suggestion.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {suggestion.status === 'pending' ? 'Awaiting parent approval' : suggestion.status}
                      </span>
                      {expandedSuggestion === suggestion.id ? (
                        <ChevronUp className="w-4 h-4 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                  </div>

                  {expandedSuggestion === suggestion.id && (
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-slate-600 space-y-2">
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">{suggestion.description}</p>
                      <p className="text-sm text-[#5A6B7A] dark:text-neutral-400">
                        <strong>Rationale:</strong> {suggestion.rationale}
                      </p>
                      {suggestion.parentResponse && (
                        <div className="bg-green-100 dark:bg-green-900/30 rounded p-2 mt-2">
                          <p className="text-sm text-green-700 dark:text-green-300">
                            <strong>Parent response:</strong> {suggestion.parentResponse}
                          </p>
                        </div>
                      )}
                      {suggestion.status === 'pending' && (
                        <Button
                          size="sm"
                          disabled={approvingSuggestionId === suggestion.id}
                          onClick={(e) => { e.stopPropagation(); handleApproveSuggestion(suggestion); }}
                          className="mt-2 gap-1 text-white"
                          style={{ backgroundColor: '#7c3aed' }}
                        >
                          {approvingSuggestionId === suggestion.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approve — add to family's plan
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientAISummary;
