// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Child Mental Health Screening Component
 * Age-appropriate screening for depression, anxiety, and safety concerns
 * Based on validated tools: PHQ-A (teens), SCARED, Columbia Protocol (adapted)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Shield,
  AlertTriangle,
  Phone,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Info,
  Sun,
  Cloud,
  CloudRain,
  Frown,
  Meh,
  Smile,
  HelpCircle,
  CheckCircle,
  X,
  Brain,
  Sparkles,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';
import { useAuditedAction } from '../hooks/useAuditedAction';

// Type definitions for questions and resources
interface QuestionOption {
  value: number;
  label: string;
  emoji?: string;
}

interface ScreeningQuestion {
  id: string;
  category: string;
  question: string;
  options: QuestionOption[];
  isSafety?: boolean;
  isCritical?: boolean;
}

interface CrisisResource {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  phone?: string;
  url?: string;
  text?: string;
}

// Age-appropriate question sets
const YOUNG_CHILD_QUESTIONS: ScreeningQuestion[] = [
  // Ages 2-6: Parent observation-based
  {
    id: 'mood_young',
    category: 'mood',
    question: "Over the past 2 weeks, has {childName} seemed more sad, tearful, or withdrawn than usual?",
    options: [
      { value: 0, label: 'Not at all', emoji: '😊' },
      { value: 1, label: 'A little bit', emoji: '🙂' },
      { value: 2, label: 'Quite a bit', emoji: '😐' },
      { value: 3, label: "Yes, it's concerning", emoji: '😢' },
    ],
  },
  {
    id: 'interest_young',
    category: 'mood',
    question: "Has {childName} lost interest in activities or toys they usually enjoy?",
    options: [
      { value: 0, label: 'Still enjoys things', emoji: '⭐' },
      { value: 1, label: 'Slightly less interested', emoji: '🌟' },
      { value: 2, label: 'Much less interested', emoji: '💫' },
      { value: 3, label: "Doesn't seem to enjoy anything", emoji: '😔' },
    ],
  },
  {
    id: 'anxiety_young',
    category: 'anxiety',
    question: "Does {childName} seem worried, fearful, or anxious more than other children their age?",
    options: [
      { value: 0, label: 'Not more than usual', emoji: '😌' },
      { value: 1, label: 'Sometimes', emoji: '🤔' },
      { value: 2, label: 'Often', emoji: '😟' },
      { value: 3, label: 'Almost always worried', emoji: '😰' },
    ],
  },
  {
    id: 'separation_young',
    category: 'anxiety',
    question: "Does {childName} have extreme difficulty separating from you or their caregiver?",
    options: [
      { value: 0, label: 'Separates okay', emoji: '👋' },
      { value: 1, label: 'Some difficulty', emoji: '🥺' },
      { value: 2, label: 'Significant difficulty', emoji: '😭' },
      { value: 3, label: 'Cannot separate without extreme distress', emoji: '💔' },
    ],
  },
  {
    id: 'selfharm_young',
    category: 'safety',
    question: "Does {childName} hurt themselves when upset (head-banging, biting, hitting self, scratching)?",
    options: [
      { value: 0, label: 'Never', emoji: '✨' },
      { value: 1, label: 'Rarely (once a month or less)', emoji: '🔹' },
      { value: 2, label: 'Sometimes (weekly)', emoji: '⚠️' },
      { value: 3, label: 'Often (daily or almost daily)', emoji: '🚨' },
    ],
    isSafety: true,
  },
];

const SCHOOL_AGE_QUESTIONS: ScreeningQuestion[] = [
  // Ages 7-12: Mix of parent observation and child-like framing
  {
    id: 'mood_school',
    category: 'mood',
    question: "Over the past 2 weeks, has {childName} seemed sad, down, or hopeless?",
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' },
      { value: 3, label: 'Nearly every day' },
    ],
  },
  {
    id: 'interest_school',
    category: 'mood',
    question: "Has {childName} lost interest in activities, friends, or things they used to enjoy?",
    options: [
      { value: 0, label: 'Still interested in things' },
      { value: 1, label: 'Slightly less interested' },
      { value: 2, label: 'Much less interested' },
      { value: 3, label: 'Seems to not enjoy anything' },
    ],
  },
  {
    id: 'energy_school',
    category: 'mood',
    question: "Has {childName} seemed more tired, sluggish, or low-energy than usual?",
    options: [
      { value: 0, label: 'Normal energy' },
      { value: 1, label: 'Slightly more tired' },
      { value: 2, label: 'Noticeably low energy' },
      { value: 3, label: 'Seems exhausted or moves slowly' },
    ],
  },
  {
    id: 'worry_school',
    category: 'anxiety',
    question: "Does {childName} worry a lot about things that might happen?",
    options: [
      { value: 0, label: 'Rarely worries' },
      { value: 1, label: 'Sometimes worries' },
      { value: 2, label: 'Often worried about things' },
      { value: 3, label: 'Constant worry that interferes with daily life' },
    ],
  },
  {
    id: 'avoidance_school',
    category: 'anxiety',
    question: "Does anxiety or fear stop {childName} from doing things (school, activities, social events)?",
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Occasionally' },
      { value: 2, label: 'Often avoids things due to anxiety' },
      { value: 3, label: 'Anxiety severely limits activities' },
    ],
  },
  {
    id: 'physical_anxiety_school',
    category: 'anxiety',
    question: "Does {childName} have physical symptoms when anxious (stomachaches, headaches, racing heart)?",
    options: [
      { value: 0, label: 'Rarely or never' },
      { value: 1, label: 'Sometimes' },
      { value: 2, label: 'Often' },
      { value: 3, label: 'Frequently has physical symptoms' },
    ],
  },
  {
    id: 'selfharm_school',
    category: 'safety',
    question: "Has {childName} intentionally hurt themselves (cutting, scratching, hitting, burning)?",
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Once or twice' },
      { value: 2, label: 'Sometimes' },
      { value: 3, label: 'Often or regularly' },
    ],
    isSafety: true,
  },
  {
    id: 'death_thoughts_school',
    category: 'safety',
    question: "Has {childName} talked about death, not wanting to be alive, or wishing they were dead?",
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Once, in passing' },
      { value: 2, label: 'Multiple times' },
      { value: 3, label: 'Frequently or with a plan' },
    ],
    isSafety: true,
    isCritical: true,
  },
];

const TEEN_QUESTIONS: ScreeningQuestion[] = [
  // Ages 13-18: More direct, PHQ-A style
  {
    id: 'mood_teen',
    category: 'mood',
    question: "Over the past 2 weeks, has {childName} been feeling down, depressed, or hopeless?",
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' },
      { value: 3, label: 'Nearly every day' },
    ],
  },
  {
    id: 'interest_teen',
    category: 'mood',
    question: "Has {childName} had little interest or pleasure in doing things?",
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' },
      { value: 3, label: 'Nearly every day' },
    ],
  },
  {
    id: 'sleep_teen',
    category: 'mood',
    question: "Has {childName} had trouble sleeping or been sleeping too much?",
    options: [
      { value: 0, label: 'No sleep issues' },
      { value: 1, label: 'Mild sleep changes' },
      { value: 2, label: 'Significant sleep problems' },
      { value: 3, label: 'Severe insomnia or hypersomnia' },
    ],
  },
  {
    id: 'worthless_teen',
    category: 'mood',
    question: "Has {childName} felt bad about themselves, like they're a failure, or let the family down?",
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' },
      { value: 3, label: 'Nearly every day' },
    ],
  },
  {
    id: 'anxiety_teen',
    category: 'anxiety',
    question: "Does {childName} feel nervous, anxious, or on edge?",
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' },
      { value: 3, label: 'Nearly every day' },
    ],
  },
  {
    id: 'panic_teen',
    category: 'anxiety',
    question: "Has {childName} had sudden episodes of intense fear (panic attacks)?",
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Once or twice' },
      { value: 2, label: 'Several times' },
      { value: 3, label: 'Frequently' },
    ],
  },
  {
    id: 'social_anxiety_teen',
    category: 'anxiety',
    question: "Does {childName} avoid social situations due to fear of embarrassment or judgment?",
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Sometimes' },
      { value: 2, label: 'Often' },
      { value: 3, label: 'Almost always avoids social situations' },
    ],
  },
  {
    id: 'selfharm_teen',
    category: 'safety',
    question: "Has {childName} intentionally hurt themselves (cutting, burning, scratching, etc.)?",
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'In the past, but not recently' },
      { value: 2, label: 'Yes, within the past month' },
      { value: 3, label: 'Yes, within the past week' },
    ],
    isSafety: true,
  },
  {
    id: 'suicidal_thoughts_teen',
    category: 'safety',
    question: "Has {childName} had thoughts that they would be better off dead or of hurting themselves?",
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Passing thought, not serious' },
      { value: 2, label: 'Yes, more than once' },
      { value: 3, label: 'Yes, with a plan or intent' },
    ],
    isSafety: true,
    isCritical: true,
  },
  {
    id: 'suicide_attempt_teen',
    category: 'safety',
    question: "Has {childName} ever attempted to end their life?",
    options: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'In the distant past (over 1 year ago)' },
      { value: 2, label: 'Within the past year' },
      { value: 3, label: 'Within the past month' },
    ],
    isSafety: true,
    isCritical: true,
  },
];

// Crisis resources for children/teens
const CRISIS_RESOURCES: { child: CrisisResource[]; teen: CrisisResource[] } = {
  child: [
    {
      name: "Talk to your child's pediatrician",
      description: 'Professional evaluation for mental health concerns',
      icon: Heart,
    },
    {
      name: 'Child Mind Institute',
      description: 'Free resources and support',
      url: 'https://childmind.org',
      icon: Brain,
    },
  ],
  teen: [
    {
      name: '988 Suicide & Crisis Lifeline',
      description: 'Free, confidential support 24/7',
      phone: '988',
      icon: Phone,
    },
    {
      name: 'Crisis Text Line',
      description: 'Text HOME to 741741',
      text: 'HOME to 741741',
      icon: MessageCircle,
    },
    {
      name: 'Teen Line',
      description: 'Teens helping teens, 6pm-10pm PT',
      phone: '1-800-852-8336',
      text: 'TEEN to 839863',
      icon: Heart,
    },
  ],
};

export interface ChildMentalHealthResult {
  moodScore: number;
  anxietyScore: number;
  safetyScore: number;
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  concerns: string[];
  recommendations: string[];
  needsProfessional: boolean;
  needsImmediate: boolean;
  completedAt: string;
}

interface ChildMentalHealthScreenProps {
  childName: string;
  childAge: number;
  onComplete: (result: ChildMentalHealthResult) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

export function ChildMentalHealthScreen({
  childName,
  childAge,
  onComplete,
  onBack,
  onSkip,
}: ChildMentalHealthScreenProps) {
  useAuditedAction('child_data');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [showCrisis, setShowCrisis] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Select age-appropriate questions
  const questions = childAge <= 6
    ? YOUNG_CHILD_QUESTIONS
    : childAge <= 12
      ? SCHOOL_AGE_QUESTIONS
      : TEEN_QUESTIONS;

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Calculate scores
  const calculateResults = (): ChildMentalHealthResult => {
    const moodQuestions = questions.filter(q => q.category === 'mood');
    const anxietyQuestions = questions.filter(q => q.category === 'anxiety');
    const safetyQuestions = questions.filter(q => q.category === 'safety');

    const moodScore = moodQuestions.reduce((sum, q) => sum + (responses[q.id] || 0), 0);
    const anxietyScore = anxietyQuestions.reduce((sum, q) => sum + (responses[q.id] || 0), 0);
    const safetyScore = safetyQuestions.reduce((sum, q) => sum + (responses[q.id] || 0), 0);

    const maxMood = moodQuestions.length * 3;
    const maxAnxiety = anxietyQuestions.length * 3;

    // Determine concerns
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Mood analysis
    if (moodScore >= maxMood * 0.5) {
      concerns.push('Signs of depression or mood difficulties');
      recommendations.push('Consider mood support strategies in daily activities');
    }

    // Anxiety analysis
    if (anxietyScore >= maxAnxiety * 0.5) {
      concerns.push('Elevated anxiety symptoms');
      recommendations.push('Include anxiety coping techniques in care plan');
    }

    // Safety analysis
    let needsProfessional = false;
    let needsImmediate = false;

    safetyQuestions.forEach(q => {
      const response = responses[q.id] || 0;
      if (q.isCritical && response >= 2) {
        needsImmediate = true;
        concerns.push('URGENT: Safety concerns require immediate professional attention');
      } else if (q.isSafety && response >= 2) {
        needsProfessional = true;
        concerns.push('Self-harm behaviors detected - professional support recommended');
      }
    });

    // Overall risk
    let overallRisk: ChildMentalHealthResult['overallRisk'] = 'low';
    if (needsImmediate) {
      overallRisk = 'critical';
    } else if (needsProfessional || safetyScore >= 2) {
      overallRisk = 'high';
    } else if (moodScore >= maxMood * 0.4 || anxietyScore >= maxAnxiety * 0.4) {
      overallRisk = 'moderate';
    }

    // Add positive framing
    if (overallRisk === 'low') {
      recommendations.push(`${childName} appears to be doing well emotionally. Continue nurturing their emotional growth!`);
    }

    return {
      moodScore,
      anxietyScore,
      safetyScore,
      overallRisk,
      concerns,
      recommendations,
      needsProfessional,
      needsImmediate,
      completedAt: new Date().toISOString(),
    };
  };

  const handleResponse = (value: number) => {
    triggerHaptic('selection');
    const newResponses = { ...responses, [currentQ.id]: value };
    setResponses(newResponses);

    // Check for immediate crisis
    if (currentQ.isCritical && value >= 2) {
      setShowCrisis(true);
      return;
    }

    // Move to next question or results
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleComplete = () => {
    const result = calculateResults();
    triggerHaptic('success');
    onComplete(result);
  };

  const handleCrisisContinue = () => {
    setShowCrisis(false);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  // Crisis screen
  if (showCrisis) {
    const resources = childAge >= 13 ? CRISIS_RESOURCES.teen : CRISIS_RESOURCES.child;

    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card className="p-6 border-rose-200">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 mb-4">
                <Heart className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
                {childName} deserves support
              </h2>
              <p className="text-muted-foreground">
                What you shared tells us {childName} may be going through a difficult time.
                You're doing the right thing by recognizing this.
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4 sm:mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-rose-700 mb-1">
                    Professional support is important
                  </p>
                  <p className="text-sm text-rose-600">
                    Please reach out to a mental health professional or use these resources.
                    You don't have to navigate this alone.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4 sm:mb-6">
              {resources.map((resource, i) => (
                <Card key={i} className="p-4 border-rose-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-100 rounded-lg">
                      <resource.icon className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary">{resource.name}</h4>
                      <p className="text-sm text-muted-foreground">{resource.description}</p>
                      {resource.phone && (
                        <a
                          href={`tel:${resource.phone}`}
                          className="inline-flex items-center gap-1 mt-2 text-sm text-rose-600 font-medium"
                        >
                          <Phone className="w-3 h-3" />
                          Call {resource.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCrisisContinue}
                className="flex-1"
              >
                Continue assessment
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Result screen
  if (showResult) {
    const result = calculateResults();

    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-accent/5 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card className="p-4 sm:p-5 md:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className={cn(
                "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
                result.overallRisk === 'low' ? "bg-green-100" :
                result.overallRisk === 'moderate' ? "bg-yellow-100" :
                "bg-rose-100"
              )}>
                {result.overallRisk === 'low' ? (
                  <Smile className="w-8 h-8 text-green-500" />
                ) : result.overallRisk === 'moderate' ? (
                  <Meh className="w-8 h-8 text-yellow-600" />
                ) : (
                  <Heart className="w-8 h-8 text-rose-500" />
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
                Thank you for sharing
              </h2>
              <p className="text-muted-foreground">
                Understanding {childName}'s emotional world helps us support them better.
              </p>
            </div>

            {result.concerns.length > 0 && (
              <div className={cn(
                "rounded-xl p-4 mb-4 sm:mb-6",
                result.overallRisk === 'critical' || result.overallRisk === 'high'
                  ? "bg-rose-50 border border-rose-200"
                  : result.overallRisk === 'moderate'
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-blue-50 border border-blue-200"
              )}>
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  What we noticed
                </h4>
                <ul className="space-y-1">
                  {result.concerns.map((concern, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.needsProfessional && (
              <div className="bg-accent/10 rounded-xl p-4 mb-4 sm:mb-6">
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Our recommendation
                </h4>
                <p className="text-sm text-muted-foreground">
                  We recommend connecting with a mental health professional who specializes
                  in children. Aminy will incorporate emotional support strategies into
                  {childName}'s daily plan, but professional guidance can make a big difference.
                </p>
              </div>
            )}

            <Button
              onClick={handleComplete}
              className="w-full bg-accent hover:bg-accent/90"
            >
              Continue with {childName}'s plan
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Question screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-accent/5 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          {onBack && currentQuestion === 0 ? (
            <button
              onClick={onBack}
              className="p-2 hover:bg-[#F0EDE8] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : currentQuestion > 0 ? (
            <button
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              className="p-2 hover:bg-[#F0EDE8] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <span className="text-sm text-muted-foreground">
            {currentQuestion + 1} of {questions.length}
          </span>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Skip
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden mb-8">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Intro text on first question */}
        {currentQuestion === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 p-4 bg-accent/5 rounded-xl border border-accent/10"
          >
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-primary mb-1">
                  Understanding {childName}'s emotional world
                </p>
                <p className="text-sm text-muted-foreground">
                  These questions help us support {childName}'s whole wellbeing —
                  not just developmental skills. Your honest answers help us help them better.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-4 sm:p-5 md:p-6">
              {currentQ.isSafety && (
                <div className="flex items-center gap-2 mb-4 text-rose-500">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Safety Question</span>
                </div>
              )}

              <h3 className="text-lg font-semibold text-primary mb-4 sm:mb-6">
                {currentQ.question.replace('{childName}', childName)}
              </h3>

              <div className="space-y-3">
                {currentQ.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleResponse(option.value)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all",
                      "hover:border-accent hover:bg-accent/5",
                      responses[currentQ.id] === option.value
                        ? "border-accent bg-accent/5"
                        : "border-gray-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-primary">
                        {option.emoji && <span className="mr-2">{option.emoji}</span>}
                        {option.label}
                      </span>
                      {responses[currentQ.id] === option.value && (
                        <CheckCircle className="w-5 h-5 text-accent" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Help text */}
        <p className="text-center text-sm text-muted-foreground mt-4 sm:mt-6">
          <HelpCircle className="w-4 h-4 inline mr-1" />
          Your answers are private and help personalize {childName}'s support
        </p>
      </div>
    </div>
  );
}

export default ChildMentalHealthScreen;
