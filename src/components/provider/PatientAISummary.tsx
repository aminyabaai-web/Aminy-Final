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

import React, { useState, useEffect } from 'react';
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
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';

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

interface PatientAISummaryProps {
  patient: PatientData;
  onClose?: () => void;
}

export function PatientAISummary({ patient, onClose }: PatientAISummaryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'summary' | 'patterns' | 'progress' | 'feedback'>('summary');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [patterns, setPatterns] = useState<BehaviorPattern[]>([]);
  const [progress, setProgress] = useState<ProgressHighlight[]>([]);
  const [suggestions, setSuggestions] = useState<CarePlanSuggestion[]>([]);
  const [newSuggestion, setNewSuggestion] = useState({ title: '', description: '', rationale: '' });
  const [isAddingSuggestion, setIsAddingSuggestion] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  // Simulate AI analysis (would call Claude API in production)
  useEffect(() => {
    const loadAISummary = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // AI-generated insights
      setInsights([
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
      ]);

      // Behavior patterns
      setPatterns([
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
      ]);

      // Progress highlights
      setProgress([
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
      ]);

      // Care plan suggestions
      setSuggestions([
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
      ]);

      setIsLoading(false);
    };

    loadAISummary();
  }, [patient]);

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
          <p className="text-sm text-neutral-500">Analyzing conversation history, routines, and incident logs</p>
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
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                AI Summary: {patient.childName}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeSection === tab.id
                ? 'border-violet-600 text-violet-600 bg-violet-50/50 dark:bg-violet-900/20'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 dark:hover:bg-slate-700'
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
                  <Badge variant="secondary" className="text-xs">
                    {insight.category}
                  </Badge>
                  <span className="text-xs text-neutral-500">
                    {Math.round(insight.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-neutral-800 dark:text-neutral-200 mb-2">{insight.insight}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
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
                  <h4 className="font-medium text-neutral-900 dark:text-white">{pattern.behavior}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFrequencyColor(pattern.frequency)}`}>
                    {pattern.frequency}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-2 flex items-center gap-1">
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
                    <p className="text-xs font-medium text-neutral-500 mb-2 flex items-center gap-1">
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
                    <h4 className="font-medium text-neutral-900 dark:text-white">{item.area}</h4>
                  </div>
                  <span className={`text-sm font-medium ${
                    item.trend === 'positive' ? 'text-green-600' :
                    item.trend === 'negative' ? 'text-rose-600' : 'text-neutral-500'
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
                <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Add Care Plan Suggestion</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Title (e.g., 'Implement token economy system')"
                    value={newSuggestion.title}
                    onChange={e => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-neutral-900 dark:text-white"
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
              <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
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
                      <Badge variant={suggestion.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                        {suggestion.type}
                      </Badge>
                      <h5 className="font-medium text-neutral-900 dark:text-white">{suggestion.title}</h5>
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
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        <strong>Rationale:</strong> {suggestion.rationale}
                      </p>
                      {suggestion.parentResponse && (
                        <div className="bg-green-100 dark:bg-green-900/30 rounded p-2 mt-2">
                          <p className="text-xs text-green-700 dark:text-green-300">
                            <strong>Parent response:</strong> {suggestion.parentResponse}
                          </p>
                        </div>
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
