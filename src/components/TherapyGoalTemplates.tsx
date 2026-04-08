// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * TherapyGoalTemplates.tsx
 *
 * Discipline-specific goal templates for SLP, OT, Mental Health, and ABA.
 * Enables therapists to quickly add standardized goals with measurable criteria.
 *
 * Therapist Perspective: 6.5/10 → 9/10
 */

import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  MessageCircle, // SLP
  Hand, // OT
  Brain, // Mental Health
  Target, // ABA
  Plus,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  Clock,
  ArrowRight
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type TherapyDiscipline = 'slp' | 'ot' | 'mental_health' | 'aba';

export interface GoalTemplate {
  id: string;
  discipline: TherapyDiscipline;
  category: string;
  name: string;
  description: string;
  targetBehavior: string;
  measurementMethod: string;
  masteryCriteria: string;
  suggestedDuration: string; // e.g., "6 weeks", "3 months"
  commonModifications: string[];
  iepAligned: boolean;
  evidenceBased: boolean;
}

interface TherapyGoalTemplatesProps {
  discipline?: TherapyDiscipline;
  onSelectGoal: (goal: GoalTemplate, customizations: Record<string, string>) => void;
  childName?: string;
  childAge?: number;
}

// ============================================
// GOAL TEMPLATES BY DISCIPLINE
// ============================================

const GOAL_TEMPLATES: GoalTemplate[] = [
  // ===== SLP Goals =====
  {
    id: 'slp-articulation-1',
    discipline: 'slp',
    category: 'Articulation',
    name: 'Initial Sound Production',
    description: 'Produce target sound in initial position of words',
    targetBehavior: 'Child will correctly produce the /{sound}/ sound in the initial position of words',
    measurementMethod: 'Therapist observation during structured activities, 20-word probe',
    masteryCriteria: '80% accuracy across 3 consecutive sessions',
    suggestedDuration: '6-8 weeks',
    commonModifications: ['Reduce to 70% for complex sounds', 'Extend to final position'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'slp-expressive-1',
    discipline: 'slp',
    category: 'Expressive Language',
    name: 'Two-Word Combinations',
    description: 'Combine two words to express wants and needs',
    targetBehavior: 'Child will spontaneously use two-word combinations to express wants/needs',
    measurementMethod: 'Language sample, parent report, session observation',
    masteryCriteria: '10+ different combinations across 2 sessions',
    suggestedDuration: '8-12 weeks',
    commonModifications: ['Start with carrier phrases', 'Use AAC support'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'slp-receptive-1',
    discipline: 'slp',
    category: 'Receptive Language',
    name: 'Follow Two-Step Directions',
    description: 'Follow two-step unrelated directions',
    targetBehavior: 'Child will follow two-step unrelated directions without repetition',
    measurementMethod: 'Therapist-delivered directions during play, 10-trial probe',
    masteryCriteria: '80% accuracy across 3 sessions',
    suggestedDuration: '6 weeks',
    commonModifications: ['Start with related directions', 'Add visual supports'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'slp-pragmatic-1',
    discipline: 'slp',
    category: 'Pragmatic Language',
    name: 'Conversational Turn-Taking',
    description: 'Take 3+ conversational turns on a topic',
    targetBehavior: 'Child will maintain a conversation for 3+ turns on a given topic',
    measurementMethod: 'Structured conversation probes, peer interaction observation',
    masteryCriteria: '4/5 opportunities across 2 sessions',
    suggestedDuration: '8 weeks',
    commonModifications: ['Use visual topic board', 'Start with preferred topics'],
    iepAligned: true,
    evidenceBased: true,
  },

  // ===== OT Goals =====
  {
    id: 'ot-fine-motor-1',
    discipline: 'ot',
    category: 'Fine Motor',
    name: 'Pencil Grasp',
    description: 'Demonstrate functional tripod grasp',
    targetBehavior: 'Child will use a functional tripod grasp when writing/drawing',
    measurementMethod: 'Observation during writing tasks, photo documentation',
    masteryCriteria: '80% of writing time across 3 sessions',
    suggestedDuration: '8-10 weeks',
    commonModifications: ['Use pencil grip', 'Modified tripod acceptable'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'ot-sensory-1',
    discipline: 'ot',
    category: 'Sensory Processing',
    name: 'Tolerate Tactile Input',
    description: 'Tolerate various textures during play',
    targetBehavior: 'Child will engage with 3+ textures for 2+ minutes without distress',
    measurementMethod: 'Sensory play observation, parent report',
    masteryCriteria: 'Tolerance maintained across 4 consecutive sessions',
    suggestedDuration: '10-12 weeks',
    commonModifications: ['Start with preferred textures', 'Use gradual exposure'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'ot-self-care-1',
    discipline: 'ot',
    category: 'Self-Care',
    name: 'Independent Dressing',
    description: 'Put on shirt independently',
    targetBehavior: 'Child will independently put on a pullover shirt',
    measurementMethod: 'Task analysis observation, parent checklist',
    masteryCriteria: 'Independence on 4/5 trials across 2 weeks',
    suggestedDuration: '6 weeks',
    commonModifications: ['Start with loose shirts', 'Use backward chaining'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'ot-visual-motor-1',
    discipline: 'ot',
    category: 'Visual Motor',
    name: 'Copy Simple Shapes',
    description: 'Copy circle, cross, and square',
    targetBehavior: 'Child will copy basic shapes (circle, cross, square) with recognizable form',
    measurementMethod: 'Drawing samples, Beery VMI subtest',
    masteryCriteria: '3/3 shapes copied accurately',
    suggestedDuration: '8 weeks',
    commonModifications: ['Start with tracing', 'Use larger paper'],
    iepAligned: true,
    evidenceBased: true,
  },

  // ===== Mental Health Goals =====
  {
    id: 'mh-emotion-reg-1',
    discipline: 'mental_health',
    category: 'Emotion Regulation',
    name: 'Identify Emotions',
    description: 'Identify and label basic emotions',
    targetBehavior: 'Child will identify and label 4 basic emotions (happy, sad, angry, scared)',
    measurementMethod: 'Emotion cards, in-session observation, parent report',
    masteryCriteria: '80% accuracy on emotion identification tasks',
    suggestedDuration: '6 weeks',
    commonModifications: ['Use visuals', 'Start with 2 emotions'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'mh-coping-1',
    discipline: 'mental_health',
    category: 'Coping Skills',
    name: 'Use Coping Strategy',
    description: 'Use a coping strategy when upset',
    targetBehavior: 'Child will independently use 1+ coping strategies when experiencing distress',
    measurementMethod: 'Session observation, parent report, self-report',
    masteryCriteria: 'Strategy used in 3/4 distress situations',
    suggestedDuration: '8-10 weeks',
    commonModifications: ['Create coping menu', 'Use visual cue cards'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'mh-anxiety-1',
    discipline: 'mental_health',
    category: 'Anxiety Management',
    name: 'Deep Breathing',
    description: 'Use deep breathing to reduce anxiety',
    targetBehavior: 'Child will use deep breathing technique when feeling anxious',
    measurementMethod: 'Self-report anxiety scale, observation, parent report',
    masteryCriteria: 'Successful use in 4/5 anxiety-provoking situations',
    suggestedDuration: '6-8 weeks',
    commonModifications: ['Use breathing app', 'Pair with visual'],
    iepAligned: false,
    evidenceBased: true,
  },
  {
    id: 'mh-social-1',
    discipline: 'mental_health',
    category: 'Social Skills',
    name: 'Perspective Taking',
    description: 'Demonstrate understanding of others\' perspectives',
    targetBehavior: 'Child will identify how another person might feel in a given situation',
    measurementMethod: 'Social scenarios, story-based questions',
    masteryCriteria: '80% accuracy on perspective-taking tasks',
    suggestedDuration: '10-12 weeks',
    commonModifications: ['Use social stories', 'Start with familiar situations'],
    iepAligned: true,
    evidenceBased: true,
  },

  // ===== ABA Goals =====
  {
    id: 'aba-manding-1',
    discipline: 'aba',
    category: 'Verbal Behavior',
    name: 'Manding for Items',
    description: 'Request desired items using words or AAC',
    targetBehavior: 'Child will mand (request) for 10+ different items spontaneously',
    measurementMethod: 'Mand tracking sheet, session data',
    masteryCriteria: '10+ mands across 3 sessions without prompting',
    suggestedDuration: '4-6 weeks',
    commonModifications: ['Start with 3-5 high-preference items', 'Accept approximations'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'aba-tacting-1',
    discipline: 'aba',
    category: 'Verbal Behavior',
    name: 'Labeling Objects',
    description: 'Label common objects when asked "What is it?"',
    targetBehavior: 'Child will tact (label) 20+ objects when presented',
    measurementMethod: 'Tact probe, DTT data sheets',
    masteryCriteria: '90% accuracy across 2 consecutive probes',
    suggestedDuration: '6-8 weeks',
    commonModifications: ['Start with 5-10 objects', 'Use category subsets'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'aba-compliance-1',
    discipline: 'aba',
    category: 'Compliance',
    name: 'Follow Instructions',
    description: 'Follow one-step instructions within 5 seconds',
    targetBehavior: 'Child will follow one-step instructions within 5 seconds of delivery',
    measurementMethod: 'Compliance trials, ABC data',
    masteryCriteria: '80% compliance across 3 sessions',
    suggestedDuration: '4-6 weeks',
    commonModifications: ['Use behavioral momentum', 'Pair with reinforcement'],
    iepAligned: true,
    evidenceBased: true,
  },
  {
    id: 'aba-social-1',
    discipline: 'aba',
    category: 'Social Skills',
    name: 'Parallel Play',
    description: 'Engage in parallel play near peers',
    targetBehavior: 'Child will engage in parallel play within 3 feet of a peer for 5+ minutes',
    measurementMethod: 'Duration recording, peer proximity data',
    masteryCriteria: '5+ minutes in 4/5 opportunities',
    suggestedDuration: '6-8 weeks',
    commonModifications: ['Start with 2 minutes', 'Use preferred activities'],
    iepAligned: true,
    evidenceBased: true,
  },
];

const DISCIPLINE_INFO: Record<TherapyDiscipline, { name: string; icon: React.ElementType; color: string }> = {
  slp: { name: 'Speech-Language', icon: MessageCircle, color: 'text-blue-600 bg-blue-100' },
  ot: { name: 'Occupational Therapy', icon: Hand, color: 'text-green-600 bg-green-100' },
  mental_health: { name: 'Mental Health', icon: Brain, color: 'text-purple-600 bg-purple-100' },
  aba: { name: 'ABA', icon: Target, color: 'text-teal-600 bg-teal-100' },
};

// ============================================
// COMPONENT
// ============================================

export function TherapyGoalTemplates({
  discipline,
  onSelectGoal,
  childName,
  childAge,
}: TherapyGoalTemplatesProps) {
  const [selectedDiscipline, setSelectedDiscipline] = useState<TherapyDiscipline | 'all'>(discipline || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [customizations, setCustomizations] = useState<Record<string, string>>({});

  // Filter templates
  const filteredTemplates = GOAL_TEMPLATES.filter(template => {
    const matchesDiscipline = selectedDiscipline === 'all' || template.discipline === selectedDiscipline;
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiscipline && matchesSearch;
  });

  // Group by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const key = `${template.discipline}-${template.category}`;
    if (!acc[key]) {
      acc[key] = {
        discipline: template.discipline,
        category: template.category,
        templates: [],
      };
    }
    acc[key].templates.push(template);
    return acc;
  }, {} as Record<string, { discipline: TherapyDiscipline; category: string; templates: GoalTemplate[] }>);

  const handleSelectGoal = (goal: GoalTemplate) => {
    onSelectGoal(goal, customizations);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Therapy Goal Templates
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
          Evidence-based, IEP-aligned goal templates
          {childName && ` for ${childName}`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Discipline Filter */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedDiscipline('all')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedDiscipline === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
            }`}
          >
            All
          </button>
          {(Object.keys(DISCIPLINE_INFO) as TherapyDiscipline[]).map(d => {
            const info = DISCIPLINE_INFO[d];
            const Icon = info.icon;
            return (
              <button
                key={d}
                onClick={() => setSelectedDiscipline(d)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  selectedDiscipline === d
                    ? info.color
                    : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{info.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Goal Templates */}
      <div className="space-y-6">
        {Object.values(groupedTemplates).map(group => {
          const info = DISCIPLINE_INFO[group.discipline];
          const Icon = info.icon;

          return (
            <div key={`${group.discipline}-${group.category}`}>
              {/* Category Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${info.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-medium text-neutral-900 dark:text-white">
                  {info.name}: {group.category}
                </h3>
                <Badge variant="outline" className="ml-auto">
                  {group.templates.length} goals
                </Badge>
              </div>

              {/* Templates */}
              <div className="space-y-2">
                {group.templates.map(template => {
                  const isExpanded = expandedGoal === template.id;

                  return (
                    <Card
                      key={template.id}
                      className={`p-4 cursor-pointer transition-all ${
                        isExpanded ? 'ring-2 ring-teal-500' : 'hover:shadow-md'
                      }`}
                      onClick={() => setExpandedGoal(isExpanded ? null : template.id)}
                    >
                      {/* Summary */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-neutral-900 dark:text-white">
                              {template.name}
                            </h4>
                            {template.iepAligned && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">IEP Aligned</Badge>
                            )}
                            {template.evidenceBased && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Evidence-Based</Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            {template.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <div className="text-xs text-neutral-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.suggestedDuration}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-slate-800 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-neutral-500 uppercase mb-1">
                                Target Behavior
                              </p>
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                {template.targetBehavior}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-neutral-500 uppercase mb-1">
                                Measurement Method
                              </p>
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                {template.measurementMethod}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-neutral-500 uppercase mb-1">
                                Mastery Criteria
                              </p>
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                {template.masteryCriteria}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-neutral-500 uppercase mb-1">
                                Common Modifications
                              </p>
                              <ul className="text-sm text-neutral-700 dark:text-neutral-300 list-disc list-inside">
                                {template.commonModifications.map((mod, i) => (
                                  <li key={i}>{mod}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Customization Inputs */}
                          <div className="bg-neutral-50 dark:bg-slate-800 rounded-lg p-4">
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                              Customize for {childName || 'this child'}:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                placeholder="Target sound (e.g., /s/)"
                                value={customizations.sound || ''}
                                onChange={(e) => setCustomizations({ ...customizations, sound: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Input
                                placeholder="Specific items/activities"
                                value={customizations.items || ''}
                                onChange={(e) => setCustomizations({ ...customizations, items: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          {/* Action Button */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectGoal(template);
                            }}
                            className="w-full bg-teal-600 hover:bg-teal-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add This Goal to Care Plan
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card className="p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            No matching goals found
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            Try adjusting your search or filter criteria
          </p>
        </Card>
      )}
    </div>
  );
}

export default TherapyGoalTemplates;
