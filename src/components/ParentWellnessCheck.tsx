// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Parent Wellness Check Component
 * PHQ-2/PHQ-9 based screening with crisis resources
 * Validates the parent, not just the child
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Shield,
  Phone,
  MessageCircle,
  ChevronRight,
  X,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  HandHeart,
  Brain,
  Sun,
  Moon,
  Coffee,
  Users,
  CheckCircle,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';

// PHQ-2 Questions (Initial Screening)
const PHQ2_QUESTIONS = [
  {
    id: 'interest',
    text: "Over the past 2 weeks, how often have you had little interest or pleasure in doing things?",
  },
  {
    id: 'depressed',
    text: "Over the past 2 weeks, how often have you been feeling down, depressed, or hopeless?",
  },
];

// Additional PHQ-9 Questions (if PHQ-2 score >= 3)
const PHQ9_ADDITIONAL = [
  {
    id: 'sleep',
    text: "Trouble falling or staying asleep, or sleeping too much?",
  },
  {
    id: 'energy',
    text: "Feeling tired or having little energy?",
  },
  {
    id: 'appetite',
    text: "Poor appetite or overeating?",
  },
  {
    id: 'failure',
    text: "Feeling bad about yourself—or that you are a failure or have let yourself or your family down?",
  },
  {
    id: 'concentration',
    text: "Trouble concentrating on things, such as reading or watching TV?",
  },
  {
    id: 'movement',
    text: "Moving or speaking so slowly that other people could have noticed? Or the opposite—being so fidgety or restless?",
  },
  {
    id: 'selfharm',
    text: "Thoughts that you would be better off dead or of hurting yourself in some way?",
  },
];

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all', sublabel: '0 days' },
  { value: 1, label: 'Several days', sublabel: '1-6 days' },
  { value: 2, label: 'More than half', sublabel: '7-11 days' },
  { value: 3, label: 'Nearly every day', sublabel: '12-14 days' },
];

// Crisis Resources
const CRISIS_RESOURCES = [
  {
    name: '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential support 24/7',
    phone: '988',
    text: '988',
    type: 'crisis',
  },
  {
    name: 'Crisis Text Line',
    description: 'Text HOME for free crisis support',
    text: 'HOME to 741741',
    type: 'crisis',
  },
  {
    name: 'SAMHSA National Helpline',
    description: 'Treatment referrals & support',
    phone: '1-800-662-4357',
    type: 'support',
  },
  {
    name: 'Postpartum Support International',
    description: 'For new and expecting parents',
    phone: '1-800-944-4773',
    text: 'HELP to 988',
    type: 'parenting',
  },
];

interface WellnessCheckResult {
  phq2Score: number;
  phq9Score?: number;
  severity: 'none' | 'mild' | 'moderate' | 'moderately-severe' | 'severe';
  needsSupport: boolean;
  crisisRisk: boolean;
  completedAt: string;
}

interface ParentWellnessCheckProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: WellnessCheckResult) => void;
  parentName?: string;
  isOnboarding?: boolean;
}

export function ParentWellnessCheck({
  isOpen,
  onClose,
  onComplete,
  parentName = 'there',
  isOnboarding = false,
}: ParentWellnessCheckProps) {
  const [step, setStep] = useState<'intro' | 'phq2' | 'phq9' | 'result' | 'crisis'>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [showResources, setShowResources] = useState(false);

  // Calculate scores
  const phq2Score = (responses['interest'] || 0) + (responses['depressed'] || 0);
  const phq9Score = PHQ9_ADDITIONAL.reduce(
    (sum, q) => sum + (responses[q.id] || 0),
    phq2Score
  );

  // Check for crisis (self-harm question answered > 0)
  const crisisRisk = (responses['selfharm'] || 0) > 0;

  // Determine severity
  const getSeverity = (): WellnessCheckResult['severity'] => {
    if (phq2Score < 3) return 'none';
    if (phq9Score < 5) return 'none';
    if (phq9Score < 10) return 'mild';
    if (phq9Score < 15) return 'moderate';
    if (phq9Score < 20) return 'moderately-severe';
    return 'severe';
  };

  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setCurrentQuestion(0);
      setResponses({});
      setShowResources(false);
    }
  }, [isOpen]);

  // Handle crisis detection immediately
  useEffect(() => {
    if (crisisRisk && step !== 'crisis') {
      setStep('crisis');
      triggerHaptic('warning');
    }
  }, [crisisRisk, step]);

  const handleResponse = (questionId: string, value: number) => {
    triggerHaptic('selection');
    setResponses(prev => ({ ...prev, [questionId]: value }));

    // Move to next question or step
    if (step === 'phq2') {
      if (currentQuestion < PHQ2_QUESTIONS.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        // PHQ-2 complete - check if we need full PHQ-9
        const newPhq2Score = (responses['interest'] || 0) + (questionId === 'depressed' ? value : responses['depressed'] || 0);
        if (questionId === 'interest') {
          const score = value + (responses['depressed'] || 0);
          if (score >= 3) {
            setStep('phq9');
            setCurrentQuestion(0);
          } else {
            setStep('result');
          }
        } else {
          if (newPhq2Score >= 3) {
            setStep('phq9');
            setCurrentQuestion(0);
          } else {
            setStep('result');
          }
        }
      }
    } else if (step === 'phq9') {
      if (currentQuestion < PHQ9_ADDITIONAL.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        setStep('result');
      }
    }
  };

  const handleComplete = () => {
    const result: WellnessCheckResult = {
      phq2Score,
      phq9Score: phq2Score >= 3 ? phq9Score : undefined,
      severity: getSeverity(),
      needsSupport: phq2Score >= 3 || getSeverity() !== 'none',
      crisisRisk,
      completedAt: new Date().toISOString(),
    };

    triggerHaptic('success');
    onComplete(result);
  };

  const currentQuestions = step === 'phq2' ? PHQ2_QUESTIONS : PHQ9_ADDITIONAL;
  const currentQ = currentQuestions[currentQuestion];
  const totalQuestions = step === 'phq2' ? 2 : 9;
  const currentQuestionNumber = step === 'phq2' ? currentQuestion + 1 : currentQuestion + 3;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Intro Step */}
            {step === 'intro' && (
              <div className="p-4 sm:p-5 md:p-6">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 mb-4">
                    <HandHeart className="w-8 h-8 text-rose-500" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
                    How are YOU doing, {parentName}?
                  </h2>
                  <p className="text-muted-foreground">
                    Caring for a child with special needs is hard. Your mental health matters too.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 mb-4 sm:mb-6">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-rose-700 mb-1">100% Private & Confidential</p>
                      <p className="text-rose-600/80">
                        This quick check helps us support YOU better. Your responses are never shared.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4 sm:mb-6">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Takes less than 2 minutes</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Clinically validated screening</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Personalized support resources</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Not now
                  </Button>
                  <Button
                    onClick={() => {
                      triggerHaptic('medium');
                      setStep('phq2');
                    }}
                    className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                  >
                    Check in
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Question Steps (PHQ-2 and PHQ-9) */}
            {(step === 'phq2' || step === 'phq9') && currentQ && (
              <div className="p-4 sm:p-5 md:p-6">
                {/* Progress */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Question {currentQuestionNumber} of {totalQuestions}
                    </span>
                    <button
                      onClick={onClose}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-rose-400 to-pink-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentQuestionNumber / totalQuestions) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question */}
                <motion.div
                  key={currentQ.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="text-lg font-semibold text-primary mb-4 sm:mb-6">
                    {currentQ.text}
                  </h3>

                  <div className="space-y-3">
                    {RESPONSE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleResponse(currentQ.id, option.value)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all",
                          responses[currentQ.id] === option.value
                            ? "border-rose-400 bg-rose-50"
                            : "border-gray-200 hover:border-rose-200 hover:bg-rose-50/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-primary">{option.label}</p>
                            <p className="text-sm text-muted-foreground">{option.sublabel}</p>
                          </div>
                          {responses[currentQ.id] === option.value && (
                            <CheckCircle className="w-5 h-5 text-rose-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            {/* Crisis Step */}
            {step === 'crisis' && (
              <div className="p-4 sm:p-5 md:p-6">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <Heart className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
                    We're here for you
                  </h2>
                  <p className="text-muted-foreground">
                    It sounds like you're going through a really difficult time. You don't have to face this alone.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 sm:mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-700 mb-1">
                        If you're in immediate danger, please call 911
                      </p>
                      <p className="text-sm text-red-600">
                        Or reach out to these free, confidential resources:
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4 sm:mb-6">
                  {CRISIS_RESOURCES.filter(r => r.type === 'crisis').map((resource) => (
                    <Card key={resource.name} className="p-4 border-2 border-red-200">
                      <h4 className="font-semibold text-primary mb-1">{resource.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
                      <div className="flex gap-2">
                        {resource.phone && (
                          <a
                            href={`tel:${resource.phone}`}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            Call {resource.phone}
                          </a>
                        )}
                        {resource.text && (
                          <a
                            href={`sms:${resource.text.split(' to ')[1] || resource.text}`}
                            className="flex-1 flex items-center justify-center gap-2 bg-rose-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-rose-600 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Text
                          </a>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                <Button
                  onClick={() => {
                    setStep('result');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Continue to results
                </Button>
              </div>
            )}

            {/* Result Step */}
            {step === 'result' && (
              <div className="p-4 sm:p-5 md:p-6">
                <div className="text-center mb-4 sm:mb-6">
                  <div className={cn(
                    "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
                    getSeverity() === 'none'
                      ? "bg-green-100"
                      : getSeverity() === 'mild'
                        ? "bg-yellow-100"
                        : "bg-rose-100"
                  )}>
                    {getSeverity() === 'none' ? (
                      <Sun className="w-8 h-8 text-green-500" />
                    ) : getSeverity() === 'mild' ? (
                      <Coffee className="w-8 h-8 text-yellow-600" />
                    ) : (
                      <Heart className="w-8 h-8 text-rose-500" />
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
                    {getSeverity() === 'none'
                      ? "You're doing great!"
                      : getSeverity() === 'mild'
                        ? "Taking care of yourself matters"
                        : "We're here to support you"}
                  </h2>

                  <p className="text-muted-foreground">
                    {getSeverity() === 'none'
                      ? "Keep up the self-care! Being a parent is hard work."
                      : getSeverity() === 'mild'
                        ? "You might benefit from some extra support. That's completely normal."
                        : "Many parents of children with special needs experience this. You're not alone."}
                  </p>
                </div>

                {getSeverity() !== 'none' && (
                  <>
                    <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 mb-4 sm:mb-6">
                      <h4 className="font-semibold text-rose-700 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        What Aminy can do for you
                      </h4>
                      <ul className="space-y-2 text-sm text-rose-600">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Talk through parenting challenges anytime</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Daily encouragement and stress-relief tips</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Connect you with professional resources</span>
                        </li>
                      </ul>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setShowResources(!showResources)}
                      className="w-full mb-4"
                    >
                      {showResources ? 'Hide' : 'Show'} Support Resources
                      <ChevronRight className={cn(
                        "w-4 h-4 ml-1 transition-transform",
                        showResources && "rotate-90"
                      )} />
                    </Button>

                    <AnimatePresence>
                      {showResources && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mb-4"
                        >
                          <div className="space-y-3">
                            {CRISIS_RESOURCES.map((resource) => (
                              <Card key={resource.name} className="p-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h5 className="font-medium text-primary text-sm">{resource.name}</h5>
                                    <p className="text-xs text-muted-foreground">{resource.description}</p>
                                  </div>
                                  {resource.phone && (
                                    <a
                                      href={`tel:${resource.phone}`}
                                      className="text-rose-500 hover:text-rose-600"
                                    >
                                      <Phone className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

                <Button
                  onClick={handleComplete}
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                >
                  {isOnboarding ? 'Continue Setup' : 'Done'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Crisis Support Banner - Always visible when needed
 */
export function CrisisSupportBanner({
  isVisible,
  onDismiss,
}: {
  isVisible: boolean;
  onDismiss?: () => void;
}) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-rose-500 to-red-500 text-white py-3 px-4 shadow-lg"
    >
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5" />
          <div>
            <p className="font-medium text-sm">Need someone to talk to?</p>
            <p className="text-xs text-white/80">988 Lifeline is free & confidential 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="tel:988"
            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            Call 988
          </a>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Quick Wellness Check Widget for Dashboard
 */
export function WellnessCheckWidget({
  lastCheckDate,
  severity,
  onStartCheck,
}: {
  lastCheckDate?: string;
  severity?: WellnessCheckResult['severity'];
  onStartCheck: () => void;
}) {
  const daysSinceCheck = lastCheckDate
    ? Math.floor((Date.now() - new Date(lastCheckDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const shouldPrompt = !lastCheckDate || daysSinceCheck! >= 14;

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md",
        shouldPrompt
          ? "bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200"
          : "bg-white"
      )}
      onClick={onStartCheck}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={cn(
          "p-3 rounded-xl",
          shouldPrompt ? "bg-rose-100" : "bg-[#F0EDE8]"
        )}>
          <HandHeart className={cn(
            "w-6 h-6",
            shouldPrompt ? "text-rose-500" : "text-gray-500"
          )} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-primary">Parent Wellness Check</h4>
          <p className="text-sm text-muted-foreground">
            {shouldPrompt
              ? "Time for a quick self-check"
              : `Last check: ${daysSinceCheck} days ago`}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </Card>
  );
}

export default ParentWellnessCheck;
