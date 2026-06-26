// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * PHQ-9 Depression Screener
 *
 * Validated 9-item depression screening tool.
 * Scores: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe
 */

import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import {
  Heart,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Phone,
  MessageCircle,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PHQ9_QUESTIONS = [
  {
    id: 1,
    text: 'Little interest or pleasure in doing things',
    shortText: 'Loss of interest',
  },
  {
    id: 2,
    text: 'Feeling down, depressed, or hopeless',
    shortText: 'Feeling down',
  },
  {
    id: 3,
    text: 'Trouble falling or staying asleep, or sleeping too much',
    shortText: 'Sleep problems',
  },
  {
    id: 4,
    text: 'Feeling tired or having little energy',
    shortText: 'Fatigue',
  },
  {
    id: 5,
    text: 'Poor appetite or overeating',
    shortText: 'Appetite changes',
  },
  {
    id: 6,
    text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
    shortText: 'Self-criticism',
  },
  {
    id: 7,
    text: 'Trouble concentrating on things, such as reading the newspaper or watching television',
    shortText: 'Concentration',
  },
  {
    id: 8,
    text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
    shortText: 'Psychomotor changes',
  },
  {
    id: 9,
    text: 'Thoughts that you would be better off dead or of hurting yourself in some way',
    shortText: 'Self-harm thoughts',
    isCritical: true,
  },
];

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'not_difficult', label: 'Not difficult at all' },
  { value: 'somewhat_difficult', label: 'Somewhat difficult' },
  { value: 'very_difficult', label: 'Very difficult' },
  { value: 'extremely_difficult', label: 'Extremely difficult' },
];

interface PHQ9Result {
  totalScore: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  severityLabel: string;
  responses: number[];
  hasCriticalResponse: boolean;
  difficulty: string;
  completedAt: string;
  recommendations: string[];
}

interface PHQ9ScreenerProps {
  onComplete: (result: PHQ9Result) => void;
  onCancel?: () => void;
  userName?: string;
}

function getSeverity(score: number): { severity: PHQ9Result['severity']; label: string; color: string } {
  if (score <= 4) return { severity: 'minimal', label: 'Minimal depression', color: 'green' };
  if (score <= 9) return { severity: 'mild', label: 'Mild depression', color: 'yellow' };
  if (score <= 14) return { severity: 'moderate', label: 'Moderate depression', color: 'orange' };
  if (score <= 19) return { severity: 'moderately_severe', label: 'Moderately severe depression', color: 'red' };
  return { severity: 'severe', label: 'Severe depression', color: 'red' };
}

function getRecommendations(score: number, hasCritical: boolean): string[] {
  const recs: string[] = [];

  if (hasCritical) {
    recs.push('Please reach out to a mental health professional or crisis line immediately');
    recs.push('National Suicide Prevention Lifeline: 988');
    recs.push('Crisis Text Line: Text HOME to 741741');
  }

  if (score >= 20) {
    recs.push('Consider seeing a mental health professional as soon as possible');
    recs.push('Discuss medication options with your healthcare provider');
    recs.push('Prioritize rest and self-care while seeking help');
  } else if (score >= 15) {
    recs.push('Schedule an appointment with a therapist or counselor');
    recs.push('Talk to your primary care provider about your symptoms');
    recs.push('Lean on your support system during this time');
  } else if (score >= 10) {
    recs.push('Consider talking to a therapist or counselor');
    recs.push('Practice self-care activities that bring you joy');
    recs.push('Monitor your symptoms and seek help if they worsen');
  } else if (score >= 5) {
    recs.push('Practice regular self-care and stress management');
    recs.push('Stay connected with friends and family');
    recs.push('Consider reaching out to a counselor if symptoms persist');
  } else {
    recs.push('Continue practicing healthy habits');
    recs.push('Maintain your support network');
    recs.push('Remember that caregiving can be stressful - it\'s okay to ask for help');
  }

  return recs;
}

export function PHQ9Screener({ onComplete, onCancel, userName }: PHQ9ScreenerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<(number | null)[]>(Array(9).fill(null));
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);

  const progress = ((currentQuestion + 1) / 10) * 100; // 9 questions + 1 difficulty question

  const handleResponse = (value: number) => {
    const newResponses = [...responses];
    newResponses[currentQuestion] = value;
    setResponses(newResponses);

    // Check for critical response (question 9 about self-harm)
    if (currentQuestion === 8 && value > 0) {
      setShowCrisisAlert(true);
    }

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentQuestion < 8) {
        setCurrentQuestion(currentQuestion + 1);
      } else if (currentQuestion === 8) {
        setCurrentQuestion(9); // Move to difficulty question
      }
    }, 300);
  };

  const handleDifficulty = (value: string) => {
    setDifficulty(value);
    calculateResult();
  };

  const calculateResult = () => {
    const totalScore = responses.reduce<number>((sum, val) => sum + (val || 0), 0);
    const { severity, label } = getSeverity(totalScore);
    const hasCriticalResponse = (responses[8] || 0) > 0;

    const result: PHQ9Result = {
      totalScore,
      severity,
      severityLabel: label,
      responses: responses as number[],
      hasCriticalResponse,
      difficulty: difficulty || 'not_answered',
      completedAt: new Date().toISOString(),
      recommendations: getRecommendations(totalScore, hasCriticalResponse),
    };

    setShowResult(true);
    setTimeout(() => onComplete(result), 100);
  };

  const goBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const question = currentQuestion < 9 ? PHQ9_QUESTIONS[currentQuestion] : null;
  const answeredCount = responses.filter(r => r !== null).length;

  return (
    <Card className="max-w-lg mx-auto overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            <span className="font-medium">Wellbeing Check-In</span>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-white/70 hover:text-white text-sm">
              Save for later
            </button>
          )}
        </div>
        <Progress value={progress} className="h-1.5 bg-white/20" />
        <p className="text-sm text-white/70 mt-2">
          {currentQuestion < 9
            ? `Question ${currentQuestion + 1} of 9`
            : 'Final question'}
        </p>
      </div>

      {/* Crisis Alert Modal */}
      <AnimatePresence>
        {showCrisisAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-[#132F43]">We're Here for You</h3>
              </div>
              <p className="text-[#5A6B7A] mb-4">
                We noticed you're having some difficult thoughts. You're not alone, and help is available right now.
              </p>
              <div className="space-y-2 mb-4">
                <a
                  href="tel:988"
                  className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Phone className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-700">Call 988</p>
                    <p className="text-sm text-red-600">Suicide & Crisis Lifeline</p>
                  </div>
                </a>
                <a
                  href="sms:741741&body=HOME"
                  className="flex items-center gap-3 p-3 bg-[#EEF4F8] rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-700">Text HOME to 741741</p>
                    <p className="text-sm text-blue-600">Crisis Text Line</p>
                  </div>
                </a>
              </div>
              <Button
                onClick={() => setShowCrisisAlert(false)}
                className="w-full"
                variant="outline"
              >
                Continue with check-in
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="p-5">
        {/* Introduction */}
        {currentQuestion === 0 && answeredCount === 0 && (
          <div className="mb-6 p-4 bg-violet-50 rounded-xl">
            <p className="text-sm text-[#3A4A57]">
              {userName ? `${userName}, t` : 'T'}his quick check-in helps us understand how you've been feeling over the past 2 weeks.
              Your responses are private and help us support you better.
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentQuestion < 9 && question ? (
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Question */}
              <div className="mb-6">
                <p className="text-sm text-violet-600 font-medium mb-2">
                  Over the past 2 weeks, how often have you been bothered by:
                </p>
                <p className="text-lg text-[#132F43] font-medium leading-relaxed">
                  {question.text}
                </p>
                {question.isCritical && (
                  <p className="text-sm text-[#5A6B7A] mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    This is an important question - please answer honestly
                  </p>
                )}
              </div>

              {/* Response Options */}
              <div className="space-y-2">
                {RESPONSE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleResponse(option.value)}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                      responses[currentQuestion] === option.value
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-[#E8E4DF] hover:border-violet-300 hover:bg-[#F6FBFB]'
                    }`}
                  >
                    <span className="font-medium text-[#132F43]">{option.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : currentQuestion === 9 ? (
            <motion.div
              key="difficulty"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6">
                <p className="text-lg text-[#132F43] font-medium leading-relaxed">
                  If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?
                </p>
              </div>

              <div className="space-y-2">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleDifficulty(option.value)}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                      difficulty === option.value
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-[#E8E4DF] hover:border-violet-300 hover:bg-[#F6FBFB]'
                    }`}
                  >
                    <span className="font-medium text-[#132F43]">{option.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="px-5 pb-5 flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={currentQuestion === 0}
          className="text-[#5A6B7A]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {currentQuestion < 9 && responses[currentQuestion] !== null && (
          <Button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            className="bg-violet-600 hover:bg-violet-700"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </Card>
  );
}

// Results display component
interface PHQ9ResultsProps {
  result: PHQ9Result;
  onClose?: () => void;
  onBookTherapist?: () => void;
}

export function PHQ9Results({ result, onClose, onBookTherapist }: PHQ9ResultsProps) {
  const severityColors: Record<string, string> = {
    minimal: 'bg-green-100 text-green-700 border-green-200',
    mild: 'bg-yellow-100 text-yellow-700 border-[#EDF4F7]',
    moderate: 'bg-orange-100 text-orange-700 border-orange-200',
    moderately_severe: 'bg-red-100 text-red-700 border-red-200',
    severe: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <Card className="max-w-lg mx-auto p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-violet-600" />
        </div>
        <h2 className="text-xl font-semibold text-[#132F43] mb-2">Your Results</h2>
        <p className="text-[#5A6B7A]">Thank you for completing this check-in</p>
      </div>

      {/* Score Display */}
      <div className="mb-6">
        <div className={`p-4 rounded-xl border ${severityColors[result.severity]}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{result.severityLabel}</p>
              <p className="text-sm opacity-75">Score: {result.totalScore}/27</p>
            </div>
            <Badge variant="outline" className={severityColors[result.severity]}>
              PHQ-9
            </Badge>
          </div>
        </div>
      </div>

      {/* Critical Alert */}
      {result.hasCriticalResponse && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Important</p>
              <p className="text-sm text-red-600">
                Based on your responses, we encourage you to speak with a mental health professional.
                You're not alone, and support is available.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="mb-6">
        <h3 className="font-medium text-[#132F43] mb-3">Recommendations</h3>
        <div className="space-y-2">
          {result.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[#5A6B7A]">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {result.totalScore >= 10 && onBookTherapist && (
          <Button
            onClick={onBookTherapist}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            Book a Therapist Session
          </Button>
        )}
        {onClose && (
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        )}
      </div>

      <p className="text-sm text-[#8A9BA8] text-center mt-4">
        This screening tool is not a diagnosis. Please consult a healthcare provider for professional advice.
      </p>
    </Card>
  );
}

export type { PHQ9Result };
