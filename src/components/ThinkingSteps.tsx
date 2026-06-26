// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ThinkingSteps — Bevel-style processing indicator
 *
 * When the AI is processing, shows real-time step-by-step reasoning
 * with icons, instead of just three bouncing dots. Makes the AI feel
 * like it's actively WORKING on your problem.
 *
 * Steps are generated based on what the user asked (intent detection)
 * and update in real-time as processing progresses.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain, Search, FileText, Target, Heart, Shield,
  TrendingUp, Calendar, AlertTriangle, Sparkles, ChevronRight,
} from 'lucide-react';

export interface ThinkingStep {
  id: string;
  icon: React.ElementType;
  label: string;
  status: 'pending' | 'active' | 'complete';
}

/**
 * Generate thinking steps based on what the user asked
 */
export function generateThinkingSteps(userMessage: string): ThinkingStep[] {
  const lower = userMessage.toLowerCase();
  const steps: ThinkingStep[] = [];

  // Always start with context
  steps.push({
    id: 'context',
    icon: Brain,
    label: `Reviewing ${getChildNameFromContext()}'s profile`,
    status: 'pending',
  });

  // Intent-specific steps
  if (/meltdown|tantrum|behavior|hit|kick|scream|elop/i.test(lower)) {
    steps.push(
      { id: 'behavior', icon: AlertTriangle, label: 'Analyzing behavior patterns', status: 'pending' },
      { id: 'triggers', icon: Search, label: 'Checking known triggers', status: 'pending' },
      { id: 'strategies', icon: Target, label: 'Finding effective strategies', status: 'pending' },
    );
  } else if (/sleep|bedtime|night|wake/i.test(lower)) {
    steps.push(
      { id: 'routine', icon: Calendar, label: 'Reviewing bedtime routine', status: 'pending' },
      { id: 'patterns', icon: TrendingUp, label: 'Analyzing sleep patterns', status: 'pending' },
    );
  } else if (/insurance|coverage|denied|claim|auth/i.test(lower)) {
    steps.push(
      { id: 'coverage', icon: Shield, label: 'Checking coverage details', status: 'pending' },
      { id: 'options', icon: Search, label: 'Evaluating options', status: 'pending' },
    );
  } else if (/goal|progress|how.*doing|improve/i.test(lower)) {
    steps.push(
      { id: 'goals', icon: Target, label: 'Reviewing current goals', status: 'pending' },
      { id: 'progress', icon: TrendingUp, label: 'Analyzing progress data', status: 'pending' },
    );
  } else if (/school|iep|teacher|classroom/i.test(lower)) {
    steps.push(
      { id: 'school', icon: FileText, label: 'Reviewing school context', status: 'pending' },
      { id: 'strategies', icon: Target, label: 'Preparing recommendations', status: 'pending' },
    );
  } else if (/provider|bcba|therapist|find|book/i.test(lower)) {
    steps.push(
      { id: 'search', icon: Search, label: 'Searching providers', status: 'pending' },
      { id: 'matching', icon: Heart, label: 'Matching to your needs', status: 'pending' },
    );
  } else {
    steps.push(
      { id: 'analyze', icon: Search, label: 'Understanding your question', status: 'pending' },
      { id: 'memory', icon: Brain, label: 'Checking conversation history', status: 'pending' },
    );
  }

  // Always end with generating response
  steps.push({
    id: 'generate',
    icon: Sparkles,
    label: 'Preparing personalized response',
    status: 'pending',
  });

  return steps;
}

function getChildNameFromContext(): string {
  try {
    const stored = localStorage.getItem('aminy-user') || localStorage.getItem('enc_aminy-user');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.childName) return data.childName;
    }
  } catch { /* ignore */ }
  return 'your child';
}

interface ThinkingStepsDisplayProps {
  steps: ThinkingStep[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function ThinkingStepsDisplay({ steps, isExpanded = true, onToggle }: ThinkingStepsDisplayProps) {
  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-sm font-medium text-[#8E9BAA] mb-2 hover:text-[#5A6B7A] transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#6B9080]" />
        Thinking...
        <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-2 border-l-2 border-[#F0EDE8] space-y-1.5">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15, duration: 0.3 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${
                      step.status === 'complete' ? 'text-[#2A7D99]'
                        : step.status === 'active' ? 'text-[#6B9080] animate-pulse'
                        : 'text-[#8E9BAA]'
                    }`} />
                    <span className={
                      step.status === 'complete' ? 'text-[#5A6B7A]'
                        : step.status === 'active' ? 'text-[#132F43] font-medium'
                        : 'text-[#8E9BAA]'
                    }>
                      {step.label}
                    </span>
                    {step.status === 'active' && (
                      <ChevronRight className="w-3 h-3 text-[#6B9080]" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook that simulates step progression during AI streaming.
 * Steps advance based on elapsed time since streaming started.
 */
export function useThinkingSteps(userMessage: string, isStreaming: boolean) {
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!isStreaming || !userMessage) {
      setSteps([]);
      return;
    }

    const generated = generateThinkingSteps(userMessage);
    setSteps(generated);
    setIsExpanded(true);

    // Advance steps on a timer
    const totalSteps = generated.length;
    const stepDuration = 800; // ms per step

    const timers: ReturnType<typeof setTimeout>[] = [];

    generated.forEach((_, i) => {
      // Activate step
      timers.push(setTimeout(() => {
        setSteps(prev => prev.map((s, j) => ({
          ...s,
          status: j < i ? 'complete' : j === i ? 'active' : 'pending',
        })));
      }, i * stepDuration));

      // Complete last step
      if (i === totalSteps - 1) {
        timers.push(setTimeout(() => {
          setSteps(prev => prev.map(s => ({ ...s, status: 'complete' })));
        }, (i + 1) * stepDuration));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [isStreaming, userMessage]);

  return { steps, isExpanded, toggleExpanded: () => setIsExpanded(p => !p) };
}

/**
 * Generate context-aware follow-up suggestions based on AI response
 */
export function generateFollowUpSuggestions(
  aiResponse: string,
  userMessage: string
): string[] {
  const lower = aiResponse.toLowerCase();
  const suggestions: string[] = [];

  if (/strategy|technique|try|approach/i.test(lower)) {
    suggestions.push('What if that doesn’t work?');
  }
  if (/goal|progress|mastery/i.test(lower)) {
    suggestions.push('How does this compare to last week?');
  }
  if (/provider|bcba|therapist/i.test(lower)) {
    suggestions.push('Can you help me prepare for our next session?');
  }
  if (/transition|routine|schedule/i.test(lower)) {
    suggestions.push('Can you make a visual schedule for this?');
  }
  if (/insurance|coverage|authorization/i.test(lower)) {
    suggestions.push('What if my claim gets denied?');
  }
  if (/calm|regulation|sensory|overwhelm/i.test(lower)) {
    suggestions.push('What are some quick calm-down strategies?');
  }
  if (/school|classroom|teacher|iep/i.test(lower)) {
    suggestions.push('Help me write an email to the teacher about this');
  }
  if (/sleep|bedtime|night/i.test(lower)) {
    suggestions.push('What about melatonin — should we try it?');
  }

  // Always add a generic deepener
  if (suggestions.length < 2) {
    suggestions.push('Tell me more about this');
  }
  if (suggestions.length < 3) {
    suggestions.push('What should I focus on this week?');
  }

  return suggestions.slice(0, 3);
}
