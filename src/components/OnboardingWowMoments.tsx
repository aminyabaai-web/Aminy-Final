// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Onboarding WOW Moments
 * Emotional validation and personalization moments throughout onboarding
 * Makes parents feel SEEN and UNDERSTOOD, not just data-entered
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  Heart,
  Sparkles,
  Star,
  Brain,
  Shield,
  Users,
  Lightbulb,
  TrendingUp,
  CheckCircle,
  Gift,
  Target,
  Zap,
  MessageCircle,
} from 'lucide-react';
import { Card } from './ui/card';
import { cn } from '../lib/utils';

interface WowMomentProps {
  childName: string;
  parentName?: string;
}

/**
 * After parent selects diagnosis - validates their journey
 */
export function DiagnosisValidation({
  diagnoses,
  childName,
}: {
  diagnoses: string[];
  childName: string;
}) {
  if (diagnoses.length === 0) return null;

  const hasMutipleDiagnoses = diagnoses.length > 1;
  const hasASD = diagnoses.some(d => d.toLowerCase().includes('autism') || d.toLowerCase().includes('asd'));
  const hasADHD = diagnoses.some(d => d.toLowerCase().includes('adhd'));
  const hasAnxiety = diagnoses.some(d => d.toLowerCase().includes('anxiety'));

  let message = '';
  let insight = '';

  if (hasASD && hasADHD) {
    message = `ASD and ADHD together is more common than most people know. We understand how this combination creates unique challenges — and unique strengths.`;
    insight = `Many children with both ASD and ADHD benefit from visual supports AND movement breaks. We'll build both into ${childName}'s plan.`;
  } else if (hasASD && hasAnxiety) {
    message = `Autism and anxiety often go hand-in-hand. The world can feel overwhelming when your brain processes everything intensely.`;
    insight = `For ${childName}, we'll prioritize predictability and calming strategies alongside skill-building.`;
  } else if (hasASD) {
    message = `Every autistic child is unique. We'll learn exactly how ${childName} experiences the world and build around their strengths.`;
    insight = `Autism isn't something to "fix" — it's a different way of being. We'll help ${childName} thrive as who they are.`;
  } else if (hasADHD) {
    message = `ADHD brains are creative, energetic, and capable of incredible focus — when engaged the right way.`;
    insight = `We'll discover what captures ${childName}'s attention and use that to build skills naturally.`;
  } else if (hasAnxiety) {
    message = `Childhood anxiety is treatable. With the right support, ${childName} can learn to manage worry and build confidence.`;
    insight = `We'll include gentle exposure and coping skills that don't overwhelm ${childName}.`;
  } else if (hasMutipleDiagnoses) {
    message = `Complex profiles require nuanced support. We see the whole child, not just labels.`;
    insight = `${childName}'s unique combination means we'll create a truly personalized approach.`;
  } else {
    message = `Thank you for sharing that with us. Understanding ${childName}'s diagnosis helps us support them better.`;
    insight = `We'll tailor every recommendation to ${childName}'s specific needs.`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <Card className="p-4 bg-gradient-to-r from-accent/5 to-blue-50 border-accent/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-accent/10 rounded-lg flex-shrink-0">
            <Brain className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-primary mb-1">We understand</p>
            <p className="text-sm text-muted-foreground mb-3">{message}</p>
            <div className="flex items-start gap-2 p-3 bg-white/50 rounded-lg">
              <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-primary">{insight}</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * After selecting focus areas - shows understanding of their priorities
 */
export function FocusAreaValidation({
  focusAreas,
  childName,
}: {
  focusAreas: string[];
  childName: string;
}) {
  if (focusAreas.length === 0) return null;

  const insights: Record<string, { why: string; how: string }> = {
    'communication': {
      why: 'Communication is the foundation of everything — relationships, learning, self-expression.',
      how: `We'll use ${childName}'s interests to make communication practice feel natural and rewarding.`,
    },
    'speech': {
      why: 'Communication is the foundation of everything — relationships, learning, self-expression.',
      how: `We'll use ${childName}'s interests to make communication practice feel natural and rewarding.`,
    },
    'social': {
      why: 'Social skills open doors to friendship, belonging, and happiness.',
      how: 'We start with low-pressure social situations and build confidence gradually.',
    },
    'sensory': {
      why: 'When sensory needs are met, everything else becomes easier — focus, behavior, sleep.',
      how: `We'll identify ${childName}'s sensory preferences and build a "sensory diet" into daily routines.`,
    },
    'emotional': {
      why: 'Emotional regulation is one of the hardest challenges — and one of the most impactful to address.',
      how: 'We teach coping skills during calm moments so they\'re available during storms.',
    },
    'routine': {
      why: 'Predictable routines reduce anxiety and meltdowns — for the whole family.',
      how: `We'll create visual schedules ${childName} can understand and follow independently.`,
    },
    'focus': {
      why: 'Attention skills unlock learning and independence.',
      how: 'We use high-interest activities to build focus stamina naturally.',
    },
    'behavior': {
      why: 'Challenging behaviors are communication — we\'ll decode what they\'re saying.',
      how: 'We focus on the root cause, not just the behavior itself.',
    },
  };

  const primaryFocus = focusAreas[0]?.toLowerCase() || '';
  const matchedInsight = Object.entries(insights).find(([key]) =>
    primaryFocus.includes(key)
  )?.[1];

  if (!matchedInsight) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
            <Target className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-emerald-700 mb-1">
              Why this matters
            </p>
            <p className="text-sm text-emerald-600 mb-3">{matchedInsight.why}</p>
            <div className="flex items-start gap-2 p-3 bg-white/50 rounded-lg">
              <Zap className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-emerald-700">{matchedInsight.how}</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * After completing Insight Navigator - shows they were HEARD
 */
export function InsightSummaryWow({
  strengths,
  needs,
  childName,
}: {
  strengths: string[];
  needs: string[];
  childName: string;
}) {
  if (strengths.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-4 sm:mb-6"
    >
      <Card className="p-6 bg-gradient-to-br from-accent/5 via-purple-50 to-pink-50 border-accent/20">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 mb-3">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <h3 className="font-bold text-primary text-lg">
            We see {childName}'s potential
          </h3>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="p-4 bg-white/60 rounded-xl">
            <p className="font-medium text-accent mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" />
              {childName}'s biggest strength
            </p>
            <p className="text-primary">
              {strengths[0]}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This is the foundation we'll build on. Everything starts from strength.
            </p>
          </div>

          <div className="p-4 bg-white/60 rounded-xl">
            <p className="font-medium text-rose-500 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Our focus together
            </p>
            <p className="text-primary">
              {needs[0]}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              We'll tackle this step-by-step, at {childName}'s pace.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-accent/10 text-center">
          <p className="text-sm text-muted-foreground">
            Based on what you shared, we're creating a plan specifically for {childName} —
            not a generic template.
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * After insurance/state selection - shows value coming
 */
export function ResourcesTeaser({
  state,
  hasInsurance,
}: {
  state: string;
  hasInsurance: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <Gift className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-700 mb-1">
              Good news for {state} families
            </p>
            <p className="text-sm text-blue-600">
              We've identified potential funding sources and resources specific to your state.
              {hasInsurance && ' Your insurance may cover more than you realize.'}
              {' '}We'll show you everything after your plan is ready.
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Plan generation loading - shows what's happening
 */
export function PlanGenerationProgress({
  childName,
  step,
}: {
  childName: string;
  step: number;
}) {
  const steps = [
    { label: 'Analyzing developmental profile', done: step > 0 },
    { label: `Matching activities to ${childName}'s interests`, done: step > 1 },
    { label: 'Creating personalized daily routines', done: step > 2 },
    { label: 'Building reinforcement strategies', done: step > 3 },
    { label: 'Finalizing your Living Plan', done: step > 4 },
  ];

  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{
            opacity: s.done || i === step ? 1 : 0.5,
            x: 0,
          }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3"
        >
          {s.done ? (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : i === step ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
          )}
          <span className={cn(
            "text-sm",
            s.done ? "text-green-700" : i === step ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            {s.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Final completion - celebrates their effort
 */
export function OnboardingComplete({
  parentName,
  childName,
  dataPointsCollected,
}: {
  parentName: string;
  childName: string;
  dataPointsCollected: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <Card className="p-6 bg-gradient-to-br from-accent/10 via-purple-50 to-pink-50 border-accent/20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-4">
          <Heart className="w-8 h-8 text-accent" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
          You did it, {parentName}!
        </h2>

        <p className="text-muted-foreground mb-4">
          You just shared {dataPointsCollected}+ details about {childName}'s development.
          That's not easy — it takes courage to look at your child this closely.
        </p>

        <div className="p-4 bg-white/60 rounded-xl mb-4">
          <p className="font-medium text-primary mb-2">
            Our promise to you:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              We'll never ask for the same information twice
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              We'll use everything you shared to personalize every interaction
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              We're here for YOU too, not just {childName}
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>You're now part of a community of 10,000+ families</span>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Empathy micro-moment - for tough questions
 */
export function EmpathyMoment({
  message,
  type = 'support',
}: {
  message: string;
  type?: 'support' | 'celebration' | 'validation';
}) {
  const styles = {
    support: {
      bg: 'bg-rose-50 border-rose-200',
      icon: Heart,
      iconColor: 'text-rose-500',
      textColor: 'text-rose-700',
    },
    celebration: {
      bg: 'bg-amber-50 border-amber-200',
      icon: Star,
      iconColor: 'text-amber-500',
      textColor: 'text-amber-700',
    },
    validation: {
      bg: 'bg-accent/5 border-accent/20',
      icon: Sparkles,
      iconColor: 'text-accent',
      textColor: 'text-primary',
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("p-3 rounded-lg border", style.bg)}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", style.iconColor)} />
        <p className={cn("text-sm", style.textColor)}>{message}</p>
      </div>
    </motion.div>
  );
}

export default {
  DiagnosisValidation,
  FocusAreaValidation,
  InsightSummaryWow,
  ResourcesTeaser,
  PlanGenerationProgress,
  OnboardingComplete,
  EmpathyMoment,
};
