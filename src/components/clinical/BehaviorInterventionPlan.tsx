/**
 * Behavior Intervention Plan (BIP) Component
 *
 * A comprehensive clinical tool for BCBAs and behavior therapists to create,
 * document, and track behavior intervention plans.
 *
 * Based on best practices from BACB and clinical ABA standards.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  Target,
  AlertTriangle,
  CheckCircle,
  FileText,
  Brain,
  Heart,
  Shield,
  Clock,
  Users,
  Sparkles,
  Save,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

interface BehaviorDefinition {
  id: string;
  name: string;
  operationalDefinition: string;
  topography: string; // Physical form of behavior
  examples: string[];
  nonExamples: string[];
}

interface FunctionHypothesis {
  function: 'escape' | 'attention' | 'tangible' | 'sensory' | 'multiple';
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}

interface ReplacementBehavior {
  id: string;
  name: string;
  description: string;
  prompt: string; // How to prompt/teach
  reinforcement: string;
}

interface PreventionStrategy {
  id: string;
  category: 'antecedent' | 'setting_event' | 'environmental';
  strategy: string;
  implementation: string;
}

interface ResponseProcedure {
  id: string;
  phase: 'precursor' | 'target' | 'crisis';
  behavior: string;
  response: string;
  doNots: string[];
}

interface CrisisProtocol {
  triggerLevel: 'escalation' | 'danger' | 'emergency';
  description: string;
  steps: string[];
  safetyConsiderations: string[];
}

interface BIPData {
  id?: string;
  childId: string;
  childName: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'active' | 'review' | 'archived';

  // Assessment Summary
  assessmentDate: string;
  assessmentMethods: string[];
  assessmentSummary: string;

  // Target Behaviors
  targetBehaviors: BehaviorDefinition[];
  functionHypotheses: FunctionHypothesis[];

  // Intervention Components
  replacementBehaviors: ReplacementBehavior[];
  preventionStrategies: PreventionStrategy[];
  responseProcedures: ResponseProcedure[];

  // Crisis Protocol
  crisisProtocols: CrisisProtocol[];

  // Data Collection
  dataCollectionMethod: 'frequency' | 'duration' | 'interval' | 'abc' | 'latency';
  dataCollectionSchedule: string;
  baselineData: string;

  // Goals
  shortTermGoal: string;
  longTermGoal: string;
  masteryDriteria: string;

  // Team
  bcbaName: string;
  supervisorName: string;
  caregiverTraining: string;
  reviewSchedule: string;
}

interface BIPProps {
  childId: string;
  childName: string;
  existingBipId?: string;
  onSave?: (bip: BIPData) => void;
  onExport?: (bip: BIPData) => void;
}

const DEFAULT_BIP: Omit<BIPData, 'childId' | 'childName'> = {
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'draft',
  assessmentDate: '',
  assessmentMethods: [],
  assessmentSummary: '',
  targetBehaviors: [],
  functionHypotheses: [],
  replacementBehaviors: [],
  preventionStrategies: [],
  responseProcedures: [],
  crisisProtocols: [],
  dataCollectionMethod: 'frequency',
  dataCollectionSchedule: '',
  baselineData: '',
  shortTermGoal: '',
  longTermGoal: '',
  masteryDriteria: '',
  bcbaName: '',
  supervisorName: '',
  caregiverTraining: '',
  reviewSchedule: ''
};

const ASSESSMENT_METHODS = [
  'Direct observation',
  'ABC data collection',
  'Functional Analysis (FA)',
  'Functional Behavior Assessment (FBA)',
  'Parent/caregiver interview',
  'Teacher interview',
  'Record review',
  'Preference assessment',
  'Rating scales'
];

const FUNCTION_DESCRIPTIONS = {
  escape: 'Behavior serves to avoid or escape demands, activities, or situations',
  attention: 'Behavior serves to gain attention from others (positive or negative)',
  tangible: 'Behavior serves to obtain preferred items or activities',
  sensory: 'Behavior provides automatic sensory stimulation or relief',
  multiple: 'Behavior serves multiple functions'
};

export function BehaviorInterventionPlan({
  childId,
  childName,
  existingBipId,
  onSave,
  onExport
}: BIPProps) {
  const [bip, setBip] = useState<BIPData>({
    ...DEFAULT_BIP,
    childId,
    childName
  });
  const [isLoading, setIsLoading] = useState(!!existingBipId);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['assessment', 'behaviors', 'intervention'])
  );
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);

  useEffect(() => {
    if (existingBipId) {
      loadExistingBip();
    }
  }, [existingBipId]);

  const loadExistingBip = async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_intervention_plans')
        .select('*')
        .eq('id', existingBipId)
        .single();

      if (error) throw error;
      if (data) {
        setBip(data as BIPData);
      }
    } catch (error) {
      console.error('[BIP] Error loading:', error);
      toast.error('Failed to load BIP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedBip = {
        ...bip,
        updatedAt: new Date().toISOString()
      };

      if (bip.id) {
        const { error } = await supabase
          .from('behavior_intervention_plans')
          .update(updatedBip)
          .eq('id', bip.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('behavior_intervention_plans')
          .insert(updatedBip)
          .select('id')
          .single();
        if (error) throw error;
        setBip(prev => ({ ...prev, id: data.id }));
      }

      toast.success('BIP saved successfully');
      onSave?.(updatedBip);
    } catch (error) {
      console.error('[BIP] Save error:', error);
      toast.error('Failed to save BIP');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const addTargetBehavior = () => {
    setBip(prev => ({
      ...prev,
      targetBehaviors: [
        ...prev.targetBehaviors,
        {
          id: crypto.randomUUID(),
          name: '',
          operationalDefinition: '',
          topography: '',
          examples: [''],
          nonExamples: ['']
        }
      ]
    }));
  };

  const removeTargetBehavior = (id: string) => {
    setBip(prev => ({
      ...prev,
      targetBehaviors: prev.targetBehaviors.filter(b => b.id !== id)
    }));
  };

  const addReplacementBehavior = () => {
    setBip(prev => ({
      ...prev,
      replacementBehaviors: [
        ...prev.replacementBehaviors,
        {
          id: crypto.randomUUID(),
          name: '',
          description: '',
          prompt: '',
          reinforcement: ''
        }
      ]
    }));
  };

  const addPreventionStrategy = () => {
    setBip(prev => ({
      ...prev,
      preventionStrategies: [
        ...prev.preventionStrategies,
        {
          id: crypto.randomUUID(),
          category: 'antecedent',
          strategy: '',
          implementation: ''
        }
      ]
    }));
  };

  const addResponseProcedure = () => {
    setBip(prev => ({
      ...prev,
      responseProcedures: [
        ...prev.responseProcedures,
        {
          id: crypto.randomUUID(),
          phase: 'precursor',
          behavior: '',
          response: '',
          doNots: ['']
        }
      ]
    }));
  };

  const generateAISuggestions = async (section: string) => {
    setAiSuggestionLoading(true);
    try {
      // In production, this would call Claude for suggestions
      // For now, provide template suggestions
      toast.info('AI suggestions would generate based on assessment data');

      if (section === 'replacement' && bip.functionHypotheses.length > 0) {
        const primaryFunction = bip.functionHypotheses[0]?.function;
        const suggestions: ReplacementBehavior[] = [];

        if (primaryFunction === 'escape') {
          suggestions.push({
            id: crypto.randomUUID(),
            name: 'Request for break',
            description: 'Child will use a break card or say "break please" to request a pause from demands',
            prompt: 'When child shows precursor behaviors, prompt "Do you need a break?"',
            reinforcement: 'Immediate 2-minute break with preferred activity'
          });
        } else if (primaryFunction === 'attention') {
          suggestions.push({
            id: crypto.randomUUID(),
            name: 'Appropriate attention-seeking',
            description: 'Child will tap shoulder or say "Excuse me" to gain attention',
            prompt: 'Ignore precursor behaviors, immediately attend to appropriate bids',
            reinforcement: 'Enthusiastic attention and praise for appropriate requests'
          });
        }

        if (suggestions.length > 0) {
          setBip(prev => ({
            ...prev,
            replacementBehaviors: [...prev.replacementBehaviors, ...suggestions]
          }));
          toast.success('AI suggestions added');
        }
      }
    } catch (error) {
      console.error('[BIP] AI error:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setAiSuggestionLoading(false);
    }
  };

  const exportBIP = () => {
    // Generate PDF-ready content
    const content = JSON.stringify(bip, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BIP_${childName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('BIP exported');
    onExport?.(bip);
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          <span className="text-gray-600 dark:text-slate-400">Loading BIP...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-teal-600" />
              Behavior Intervention Plan
            </h1>
            <p className="text-gray-600 dark:text-slate-400 mt-1">
              For {childName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={
                bip.status === 'active' ? 'bg-green-100 text-green-700 border-green-300' :
                bip.status === 'draft' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                bip.status === 'review' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                'bg-gray-100 text-gray-700 border-gray-300'
              }
            >
              {bip.status.charAt(0).toUpperCase() + bip.status.slice(1)}
            </Badge>
            <Button variant="outline" onClick={exportBIP}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Status Selection */}
        <div className="flex gap-2">
          {(['draft', 'active', 'review', 'archived'] as const).map(status => (
            <button
              key={status}
              onClick={() => setBip(prev => ({ ...prev, status }))}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                bip.status === status
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </Card>

      {/* Clinical Disclaimer */}
      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-amber-800">
          This tool supports BIP documentation. All behavior intervention plans should be developed and supervised by a Board Certified Behavior Analyst (BCBA).
        </span>
      </div>

      {/* Assessment Summary Section */}
      <CollapsibleSection
        title="Assessment Summary"
        icon={Brain}
        expanded={expandedSections.has('assessment')}
        onToggle={() => toggleSection('assessment')}
      >
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Assessment Date
            </label>
            <input
              type="date"
              value={bip.assessmentDate}
              onChange={e => setBip(prev => ({ ...prev, assessmentDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Assessment Methods Used
            </label>
            <div className="flex flex-wrap gap-2">
              {ASSESSMENT_METHODS.map(method => (
                <button
                  key={method}
                  onClick={() => {
                    setBip(prev => ({
                      ...prev,
                      assessmentMethods: prev.assessmentMethods.includes(method)
                        ? prev.assessmentMethods.filter(m => m !== method)
                        : [...prev.assessmentMethods, method]
                    }));
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    bip.assessmentMethods.includes(method)
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Assessment Summary
            </label>
            <Textarea
              value={bip.assessmentSummary}
              onChange={e => setBip(prev => ({ ...prev, assessmentSummary: e.target.value }))}
              placeholder="Summarize key findings from the functional behavior assessment..."
              rows={4}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Target Behaviors Section */}
      <CollapsibleSection
        title="Target Behaviors"
        icon={Target}
        expanded={expandedSections.has('behaviors')}
        onToggle={() => toggleSection('behaviors')}
      >
        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          {bip.targetBehaviors.map((behavior, index) => (
            <Card key={behavior.id} className="p-4 bg-gray-50 dark:bg-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Target Behavior {index + 1}
                </h4>
                <button
                  onClick={() => removeTargetBehavior(behavior.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Behavior Name
                  </label>
                  <input
                    type="text"
                    value={behavior.name}
                    onChange={e => {
                      const updated = [...bip.targetBehaviors];
                      updated[index] = { ...behavior, name: e.target.value };
                      setBip(prev => ({ ...prev, targetBehaviors: updated }));
                    }}
                    placeholder="e.g., Physical aggression"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Topography
                  </label>
                  <input
                    type="text"
                    value={behavior.topography}
                    onChange={e => {
                      const updated = [...bip.targetBehaviors];
                      updated[index] = { ...behavior, topography: e.target.value };
                      setBip(prev => ({ ...prev, targetBehaviors: updated }));
                    }}
                    placeholder="Physical form of the behavior"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Operational Definition
                  </label>
                  <Textarea
                    value={behavior.operationalDefinition}
                    onChange={e => {
                      const updated = [...bip.targetBehaviors];
                      updated[index] = { ...behavior, operationalDefinition: e.target.value };
                      setBip(prev => ({ ...prev, targetBehaviors: updated }));
                    }}
                    placeholder="Define the behavior in observable, measurable terms..."
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          ))}

          <Button variant="outline" onClick={addTargetBehavior}>
            <Plus className="w-4 h-4 mr-2" />
            Add Target Behavior
          </Button>

          {/* Function Hypotheses */}
          <div className="mt-4 sm:mt-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Function Hypotheses</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {(['escape', 'attention', 'tangible', 'sensory', 'multiple'] as const).map(func => (
                <button
                  key={func}
                  onClick={() => {
                    const exists = bip.functionHypotheses.some(h => h.function === func);
                    if (exists) {
                      setBip(prev => ({
                        ...prev,
                        functionHypotheses: prev.functionHypotheses.filter(h => h.function !== func)
                      }));
                    } else {
                      setBip(prev => ({
                        ...prev,
                        functionHypotheses: [
                          ...prev.functionHypotheses,
                          { function: func, confidence: 'medium', evidence: '' }
                        ]
                      }));
                    }
                  }}
                  className={`p-3 rounded-lg text-left transition-all border ${
                    bip.functionHypotheses.some(h => h.function === func)
                      ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white capitalize">{func}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {FUNCTION_DESCRIPTIONS[func]}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Intervention Section */}
      <CollapsibleSection
        title="Intervention Components"
        icon={Heart}
        expanded={expandedSections.has('intervention')}
        onToggle={() => toggleSection('intervention')}
      >
        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Replacement Behaviors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Replacement Behaviors</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateAISuggestions('replacement')}
                disabled={aiSuggestionLoading}
              >
                {aiSuggestionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2 text-teal-600" />
                )}
                AI Suggest
              </Button>
            </div>

            {bip.replacementBehaviors.map((rb, index) => (
              <Card key={rb.id} className="p-4 bg-green-50 dark:bg-green-900/20 mb-3">
                <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Behavior Name
                    </label>
                    <input
                      type="text"
                      value={rb.name}
                      onChange={e => {
                        const updated = [...bip.replacementBehaviors];
                        updated[index] = { ...rb, name: e.target.value };
                        setBip(prev => ({ ...prev, replacementBehaviors: updated }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Reinforcement
                    </label>
                    <input
                      type="text"
                      value={rb.reinforcement}
                      onChange={e => {
                        const updated = [...bip.replacementBehaviors];
                        updated[index] = { ...rb, reinforcement: e.target.value };
                        setBip(prev => ({ ...prev, replacementBehaviors: updated }));
                      }}
                      placeholder="How to reinforce this behavior"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <Textarea
                      value={rb.description}
                      onChange={e => {
                        const updated = [...bip.replacementBehaviors];
                        updated[index] = { ...rb, description: e.target.value };
                        setBip(prev => ({ ...prev, replacementBehaviors: updated }));
                      }}
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            ))}

            <Button variant="outline" onClick={addReplacementBehavior}>
              <Plus className="w-4 h-4 mr-2" />
              Add Replacement Behavior
            </Button>
          </div>

          {/* Prevention Strategies */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Prevention Strategies</h4>

            {bip.preventionStrategies.map((ps, index) => (
              <Card key={ps.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 mb-3">
                <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={ps.category}
                      onChange={e => {
                        const updated = [...bip.preventionStrategies];
                        updated[index] = { ...ps, category: e.target.value as any };
                        setBip(prev => ({ ...prev, preventionStrategies: updated }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    >
                      <option value="antecedent">Antecedent Modification</option>
                      <option value="setting_event">Setting Event Strategy</option>
                      <option value="environmental">Environmental Arrangement</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Strategy
                    </label>
                    <input
                      type="text"
                      value={ps.strategy}
                      onChange={e => {
                        const updated = [...bip.preventionStrategies];
                        updated[index] = { ...ps, strategy: e.target.value };
                        setBip(prev => ({ ...prev, preventionStrategies: updated }));
                      }}
                      placeholder="Describe the prevention strategy"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </Card>
            ))}

            <Button variant="outline" onClick={addPreventionStrategy}>
              <Plus className="w-4 h-4 mr-2" />
              Add Prevention Strategy
            </Button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Crisis Protocol Section */}
      <CollapsibleSection
        title="Crisis Protocol"
        icon={Shield}
        expanded={expandedSections.has('crisis')}
        onToggle={() => toggleSection('crisis')}
        variant="warning"
      >
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Safety First</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Crisis protocols should be developed in collaboration with the BCBA and reviewed
                  by all caregivers. Never implement restrictive procedures without proper training.
                </p>
              </div>
            </div>
          </div>

          {bip.responseProcedures.map((rp, index) => (
            <Card key={rp.id} className="p-3 sm:p-4">
              <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Phase
                  </label>
                  <select
                    value={rp.phase}
                    onChange={e => {
                      const updated = [...bip.responseProcedures];
                      updated[index] = { ...rp, phase: e.target.value as any };
                      setBip(prev => ({ ...prev, responseProcedures: updated }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="precursor">Precursor Behaviors</option>
                    <option value="target">Target Behavior</option>
                    <option value="crisis">Crisis Level</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Response Procedure
                  </label>
                  <input
                    type="text"
                    value={rp.response}
                    onChange={e => {
                      const updated = [...bip.responseProcedures];
                      updated[index] = { ...rp, response: e.target.value };
                      setBip(prev => ({ ...prev, responseProcedures: updated }));
                    }}
                    placeholder="How to respond when this occurs"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </Card>
          ))}

          <Button variant="outline" onClick={addResponseProcedure}>
            <Plus className="w-4 h-4 mr-2" />
            Add Response Procedure
          </Button>
        </div>
      </CollapsibleSection>

      {/* Data Collection Section */}
      <CollapsibleSection
        title="Data Collection & Goals"
        icon={Target}
        expanded={expandedSections.has('goals')}
        onToggle={() => toggleSection('goals')}
      >
        <div className="space-y-3 sm:space-y-4">
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Data Collection Method
              </label>
              <select
                value={bip.dataCollectionMethod}
                onChange={e => setBip(prev => ({ ...prev, dataCollectionMethod: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="frequency">Frequency Count</option>
                <option value="duration">Duration Recording</option>
                <option value="interval">Interval Recording</option>
                <option value="abc">ABC Data</option>
                <option value="latency">Latency Recording</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Collection Schedule
              </label>
              <input
                type="text"
                value={bip.dataCollectionSchedule}
                onChange={e => setBip(prev => ({ ...prev, dataCollectionSchedule: e.target.value }))}
                placeholder="e.g., Daily during therapy sessions"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Short-Term Goal (1-3 months)
            </label>
            <Textarea
              value={bip.shortTermGoal}
              onChange={e => setBip(prev => ({ ...prev, shortTermGoal: e.target.value }))}
              placeholder="e.g., Reduce aggression from 15 instances/day to 5 instances/day"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Long-Term Goal (6-12 months)
            </label>
            <Textarea
              value={bip.longTermGoal}
              onChange={e => setBip(prev => ({ ...prev, longTermGoal: e.target.value }))}
              placeholder="e.g., Eliminate physical aggression, using replacement behaviors consistently"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Mastery Criteria
            </label>
            <input
              type="text"
              value={bip.masteryDriteria}
              onChange={e => setBip(prev => ({ ...prev, masteryDriteria: e.target.value }))}
              placeholder="e.g., 80% reduction maintained for 4 consecutive weeks"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Team & Review Section */}
      <CollapsibleSection
        title="Team & Review Schedule"
        icon={Users}
        expanded={expandedSections.has('team')}
        onToggle={() => toggleSection('team')}
      >
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              BCBA Name
            </label>
            <input
              type="text"
              value={bip.bcbaName}
              onChange={e => setBip(prev => ({ ...prev, bcbaName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Supervisor Name
            </label>
            <input
              type="text"
              value={bip.supervisorName}
              onChange={e => setBip(prev => ({ ...prev, supervisorName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Review Schedule
            </label>
            <input
              type="text"
              value={bip.reviewSchedule}
              onChange={e => setBip(prev => ({ ...prev, reviewSchedule: e.target.value }))}
              placeholder="e.g., Monthly or as needed"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Caregiver Training Status
            </label>
            <input
              type="text"
              value={bip.caregiverTraining}
              onChange={e => setBip(prev => ({ ...prev, caregiverTraining: e.target.value }))}
              placeholder="e.g., Completed on 01/15/2026"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
  variant = 'default'
}: {
  title: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'warning';
}) {
  return (
    <Card className={`overflow-hidden ${variant === 'warning' ? 'border-yellow-300 dark:border-yellow-700' : ''}`}>
      <button
        onClick={onToggle}
        className={`w-full p-4 flex items-center justify-between ${
          variant === 'warning'
            ? 'bg-yellow-50 dark:bg-yellow-900/20'
            : 'bg-gray-50 dark:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${variant === 'warning' ? 'text-yellow-600' : 'text-teal-600'}`} />
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {expanded && <div className="p-3 sm:p-4">{children}</div>}
    </Card>
  );
}

export default BehaviorInterventionPlan;
