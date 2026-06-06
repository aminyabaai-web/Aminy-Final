// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Caregiver Burden Scale
 *
 * Simplified caregiver burden assessment based on Zarit Burden Interview.
 * 12-item short form for quick screening.
 */

import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import {
  Heart,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Users,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const BURDEN_QUESTIONS = [
  {
    id: 1,
    text: "Do you feel that because of the time you spend with your child, you don't have enough time for yourself?",
    category: 'time',
  },
  {
    id: 2,
    text: 'Do you feel stressed between caring for your child and trying to meet other responsibilities (work/family)?',
    category: 'stress',
  },
  {
    id: 3,
    text: 'Do you feel angry when you are around your child?',
    category: 'emotional',
  },
  {
    id: 4,
    text: 'Do you feel that your child currently affects your relationships with family members or friends in a negative way?',
    category: 'relationships',
  },
  {
    id: 5,
    text: 'Do you feel strained when you are around your child?',
    category: 'stress',
  },
  {
    id: 6,
    text: 'Do you feel your health has suffered because of your involvement with your child?',
    category: 'health',
  },
  {
    id: 7,
    text: "Do you feel you don't have as much privacy as you would like because of your child?",
    category: 'time',
  },
  {
    id: 8,
    text: 'Do you feel your social life has suffered because you are caring for your child?',
    category: 'relationships',
  },
  {
    id: 9,
    text: 'Do you feel you have lost control of your life since your child was diagnosed?',
    category: 'emotional',
  },
  {
    id: 10,
    text: 'Do you feel uncertain about what to do about your child?',
    category: 'uncertainty',
  },
  {
    id: 11,
    text: 'Do you feel you should be doing more for your child?',
    category: 'guilt',
  },
  {
    id: 12,
    text: 'Overall, how burdened do you feel in caring for your child?',
    category: 'overall',
  },
];

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Quite frequently' },
  { value: 4, label: 'Nearly always' },
];

interface CaregiverBurdenResult {
  totalScore: number;
  severity: 'low' | 'mild' | 'moderate' | 'high';
  severityLabel: string;
  responses: number[];
  categoryScores: Record<string, number>;
  completedAt: string;
  recommendations: string[];
  strengths: string[];
}

interface CaregiverBurdenScaleProps {
  onComplete: (result: CaregiverBurdenResult) => void;
  onCancel?: () => void;
  userName?: string;
}

function getSeverity(score: number): { severity: CaregiverBurdenResult['severity']; label: string } {
  if (score <= 10) return { severity: 'low', label: 'Little to no burden' };
  if (score <= 20) return { severity: 'mild', label: 'Mild to moderate burden' };
  if (score <= 30) return { severity: 'moderate', label: 'Moderate to high burden' };
  return { severity: 'high', label: 'High burden' };
}

function getRecommendations(score: number, categoryScores: Record<string, number>): string[] {
  const recs: string[] = [];

  if (score >= 30) {
    recs.push('Consider speaking with a therapist who specializes in caregiver support');
    recs.push('Look into respite care options to give yourself regular breaks');
    recs.push('Connect with local caregiver support groups');
  } else if (score >= 20) {
    recs.push('Build in regular "me time" - even 15 minutes daily helps');
    recs.push('Delegate tasks where possible to family or hired help');
    recs.push('Join the Aminy community to connect with other parents');
  } else if (score >= 10) {
    recs.push('Continue prioritizing self-care alongside caregiving');
    recs.push('Stay connected with your support network');
    recs.push('Use Aminy\'s AI companion for daily support and guidance');
  }

  // Category-specific recommendations
  if (categoryScores.time && categoryScores.time >= 4) {
    recs.push('Try time-blocking: schedule specific times for self-care that are non-negotiable');
  }
  if (categoryScores.relationships && categoryScores.relationships >= 4) {
    recs.push('Consider couples therapy or family meetings to improve communication');
  }
  if (categoryScores.health && categoryScores.health >= 2) {
    recs.push('Schedule a check-up with your doctor - your health matters too');
  }

  return recs;
}

function getStrengths(score: number, responses: number[]): string[] {
  const strengths: string[] = [];

  if (score < 15) {
    strengths.push("You're managing caregiving demands with remarkable resilience");
  }
  if (responses[2] <= 1) { // Anger question
    strengths.push('You show great patience and emotional regulation');
  }
  if (responses[9] <= 1) { // Uncertainty question
    strengths.push("You feel confident in your caregiving approach - that's powerful");
  }
  if (responses[10] <= 1) { // Guilt question
    strengths.push("You have healthy boundaries around what you can give - that's important");
  }

  if (strengths.length === 0) {
    strengths.push('You took time to check in with yourself - that shows self-awareness');
    strengths.push("You're actively seeking support - that's a sign of strength");
  }

  return strengths;
}

export function CaregiverBurdenScale({ onComplete, onCancel, userName }: CaregiverBurdenScaleProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<(number | null)[]>(Array(12).fill(null));

  const progress = ((currentQuestion + 1) / 12) * 100;

  const handleResponse = (value: number) => {
    const newResponses = [...responses];
    newResponses[currentQuestion] = value;
    setResponses(newResponses);

    // Auto-advance
    setTimeout(() => {
      if (currentQuestion < 11) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        calculateResult(newResponses);
      }
    }, 300);
  };

  const calculateResult = (finalResponses: (number | null)[]) => {
    const totalScore = finalResponses.reduce<number>((sum, val) => sum + (val || 0), 0);
    const { severity, label } = getSeverity(totalScore);

    // Calculate category scores
    const categoryScores: Record<string, number> = {};
    BURDEN_QUESTIONS.forEach((q, i) => {
      if (!categoryScores[q.category]) categoryScores[q.category] = 0;
      categoryScores[q.category] += finalResponses[i] || 0;
    });

    const result: CaregiverBurdenResult = {
      totalScore,
      severity,
      severityLabel: label,
      responses: finalResponses as number[],
      categoryScores,
      completedAt: new Date().toISOString(),
      recommendations: getRecommendations(totalScore, categoryScores),
      strengths: getStrengths(totalScore, finalResponses as number[]),
    };

    onComplete(result);
  };

  const goBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const question = BURDEN_QUESTIONS[currentQuestion];

  return (
    <Card className="max-w-lg mx-auto overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5" />
            <span className="font-medium">Caregiver Wellness Check</span>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-white/70 hover:text-white text-sm">
              Save for later
            </button>
          )}
        </div>
        <Progress value={progress} className="h-1.5 bg-white/20" />
        <p className="text-xs text-white/70 mt-2">
          Question {currentQuestion + 1} of 12
        </p>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Introduction */}
        {currentQuestion === 0 && (
          <div className="mb-6 p-4 bg-[#6B9080]/10 rounded-xl">
            <p className="text-sm text-gray-700">
              {userName ? `${userName}, ` : ''}Caring for your child is important, but so are you.
              This check-in helps us understand how you're doing so we can support you better.
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Question */}
            <div className="mb-6">
              <p className="text-lg text-gray-900 font-medium leading-relaxed">
                {question.text}
              </p>
            </div>

            {/* Response Options */}
            <div className="space-y-2">
              {RESPONSE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleResponse(option.value)}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                    responses[currentQuestion] === option.value
                      ? 'border-[#6B9080] bg-[#6B9080]/10'
                      : 'border-gray-200 hover:border-[#6B9080]/30 hover:bg-[#FAF7F2]'
                  }`}
                >
                  <span className="font-medium text-gray-900">{option.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="px-5 pb-5 flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={currentQuestion === 0}
          className="text-gray-500"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {responses[currentQuestion] !== null && currentQuestion < 11 && (
          <Button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            className="bg-primary hover:bg-[#6B9080]"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </Card>
  );
}

// Results display
interface CaregiverBurdenResultsProps {
  result: CaregiverBurdenResult;
  onClose?: () => void;
  onGetSupport?: () => void;
}

export function CaregiverBurdenResults({ result, onClose, onGetSupport }: CaregiverBurdenResultsProps) {
  const severityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-700 border-green-200',
    mild: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    moderate: 'bg-orange-100 text-orange-700 border-orange-200',
    high: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <Card className="max-w-lg mx-auto p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-[#6B9080]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-[#6B9080]" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Wellness Results</h2>
        <p className="text-gray-600">Thank you for taking time for yourself</p>
      </div>

      {/* Score Display */}
      <div className="mb-6">
        <div className={`p-4 rounded-xl border ${severityColors[result.severity]}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{result.severityLabel}</p>
              <p className="text-sm opacity-75">Score: {result.totalScore}/48</p>
            </div>
            <Badge variant="outline" className={severityColors[result.severity]}>
              Burden Level
            </Badge>
          </div>
        </div>
      </div>

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            <h3 className="font-medium text-green-700">Your Strengths</h3>
          </div>
          <ul className="space-y-1">
            {result.strengths.map((strength, i) => (
              <li key={i} className="text-sm text-green-600 flex items-start gap-2">
                <CheckCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Personalized Suggestions</h3>
        <div className="space-y-2">
          {result.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* High burden alert */}
      {result.severity === 'high' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700">You deserve support</p>
              <p className="text-sm text-amber-600">
                High caregiver burden is common but treatable. Consider connecting with a therapist who specializes in caregiver support.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {result.totalScore >= 20 && onGetSupport && (
          <Button
            onClick={onGetSupport}
            className="w-full bg-primary hover:bg-[#6B9080]"
          >
            <Users className="w-4 h-4 mr-2" />
            Get Caregiver Support
          </Button>
        )}
        {onClose && (
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        Based on the Zarit Burden Interview short form. This is a screening tool, not a diagnosis.
      </p>
    </Card>
  );
}

export type { CaregiverBurdenResult };
