// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * GAD-7 Anxiety Screener
 *
 * A validated 7-item questionnaire for screening and measuring
 * severity of generalized anxiety disorder.
 *
 * Reference: Spitzer RL, Kroenke K, Williams JB, Löwe B.
 * "A brief measure for assessing generalized anxiety disorder"
 * Arch Intern Med. 2006;166(10):1092-1097.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Heart,
  Info,
  Loader2,
  Save,
  History,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

interface GAD7Response {
  id?: string;
  userId: string;
  respondentType: 'self' | 'caregiver';
  assessmentDate: string;
  answers: number[];
  totalScore: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  createdAt: string;
}

interface GAD7Props {
  userId: string;
  childId?: string;
  childName?: string;
  isForSelf?: boolean; // If true, assessing parent's anxiety
  onComplete?: (result: GAD7Response) => void;
  showHistory?: boolean;
}

const GAD7_QUESTIONS = [
  {
    id: 1,
    text: 'Feeling nervous, anxious, or on edge',
  },
  {
    id: 2,
    text: 'Not being able to stop or control worrying',
  },
  {
    id: 3,
    text: 'Worrying too much about different things',
  },
  {
    id: 4,
    text: 'Trouble relaxing',
  },
  {
    id: 5,
    text: 'Being so restless that it\'s hard to sit still',
  },
  {
    id: 6,
    text: 'Becoming easily annoyed or irritable',
  },
  {
    id: 7,
    text: 'Feeling afraid as if something awful might happen',
  },
];

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all', days: '0 days' },
  { value: 1, label: 'Several days', days: '1-6 days' },
  { value: 2, label: 'More than half the days', days: '7-11 days' },
  { value: 3, label: 'Nearly every day', days: '12-14 days' },
];

const getSeverity = (score: number): 'minimal' | 'mild' | 'moderate' | 'severe' => {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  return 'severe';
};

const getSeverityInfo = (severity: string) => {
  switch (severity) {
    case 'minimal':
      return {
        label: 'Minimal Anxiety',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        bgColor: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        description: 'Scores in this range suggest minimal anxiety symptoms.',
        recommendation: 'Continue with healthy coping strategies and self-care practices.'
      };
    case 'mild':
      return {
        label: 'Mild Anxiety',
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        bgColor: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
        borderColor: 'border-[#F0EDE8] dark:border-yellow-800',
        description: 'Scores in this range suggest mild anxiety that may benefit from monitoring.',
        recommendation: 'Consider stress management techniques and monitor symptoms. Discuss with your healthcare provider if symptoms persist.'
      };
    case 'moderate':
      return {
        label: 'Moderate Anxiety',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        bgColor: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        description: 'Scores in this range suggest moderate anxiety that warrants clinical attention.',
        recommendation: 'We recommend discussing these results with a mental health professional for further evaluation and support options.'
      };
    case 'severe':
      return {
        label: 'Severe Anxiety',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        bgColor: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        description: 'Scores in this range suggest severe anxiety that requires clinical attention.',
        recommendation: 'We strongly recommend consulting with a mental health professional as soon as possible for evaluation and appropriate treatment options.'
      };
    default:
      return {
        label: 'Unknown',
        color: 'bg-[#F0EDE8] text-[#3A4A57]',
        bgColor: 'from-gray-50 to-gray-100',
        borderColor: 'border-[#E8E4DF]',
        description: '',
        recommendation: ''
      };
  }
};

export function GAD7Screener({
  userId,
  childId,
  childName,
  isForSelf = true,
  onComplete,
  showHistory = true
}: GAD7Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(7).fill(null));
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<GAD7Response | null>(null);
  const [history, setHistory] = useState<GAD7Response[]>([]);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory, userId]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('gad7_responses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const mapped: GAD7Response[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        respondentType: row.respondent_type,
        assessmentDate: row.assessment_date,
        answers: row.answers,
        totalScore: row.total_score,
        severity: row.severity,
        createdAt: row.created_at
      }));

      setHistory(mapped);
    } catch (error) {
      console.error('[GAD7] Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);

    // Auto-advance
    if (currentQuestion < 6) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      // All questions answered
      calculateResult(newAnswers);
    }
  };

  const calculateResult = async (finalAnswers: (number | null)[]) => {
    const totalScore = finalAnswers.reduce<number>((sum, val) => sum + (val || 0), 0);
    const severity = getSeverity(totalScore);

    const response: GAD7Response = {
      userId,
      respondentType: isForSelf ? 'self' : 'caregiver',
      assessmentDate: new Date().toISOString().split('T')[0],
      answers: finalAnswers as number[],
      totalScore,
      severity,
      createdAt: new Date().toISOString()
    };

    setResult(response);
    setIsComplete(true);

    // Auto-save
    await saveResult(response);
  };

  const saveResult = async (response: GAD7Response) => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('gad7_responses')
        .insert({
          user_id: response.userId,
          child_id: childId || null,
          respondent_type: response.respondentType,
          assessment_date: response.assessmentDate,
          answers: response.answers,
          total_score: response.totalScore,
          severity: response.severity
        })
        .select('id')
        .single();

      if (error) throw error;

      response.id = data.id;
      toast.success('Assessment saved');
      onComplete?.(response);
      loadHistory();
    } catch (error) {
      console.error('[GAD7] Error saving:', error);
      toast.error('Failed to save assessment');
    } finally {
      setIsSaving(false);
    }
  };

  const resetAssessment = () => {
    setCurrentQuestion(0);
    setAnswers(Array(7).fill(null));
    setIsComplete(false);
    setResult(null);
  };

  const progress = (answers.filter(a => a !== null).length / 7) * 100;

  // History View
  if (showHistoryView) {
    return (
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg font-semibold text-[#1B2733] dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-[#6B9080]" />
            Assessment History
          </h2>
          <Button variant="outline" onClick={() => setShowHistoryView(false)}>
            New Assessment
          </Button>
        </div>

        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#6B9080]" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-[#8A9BA8] mx-auto mb-4" />
            <p className="text-[#5A6B7A] dark:text-slate-400">No previous assessments</p>
            <Button className="mt-4" onClick={() => setShowHistoryView(false)}>
              Take Assessment
            </Button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* Trend Summary */}
            {history.length >= 2 && (
              <div className="p-4 bg-[#FAF7F2] dark:bg-slate-800 rounded-lg mb-4 sm:mb-6">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-2">Score Trend</p>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-end gap-1 h-16">
                    {history.slice(0, 5).reverse().map((h, i) => (
                      <div
                        key={h.id}
                        className="w-8 bg-primary rounded-t transition-all"
                        style={{ height: `${(h.totalScore / 21) * 100}%`, minHeight: '4px' }}
                        title={`Score: ${h.totalScore}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {history[0].totalScore < history[1].totalScore ? (
                      <>
                        <TrendingDown className="w-5 h-5 text-green-500" />
                        <span className="text-green-600 font-medium">Improving</span>
                      </>
                    ) : history[0].totalScore > history[1].totalScore ? (
                      <>
                        <TrendingUp className="w-5 h-5 text-red-500" />
                        <span className="text-red-600 font-medium">Increasing</span>
                      </>
                    ) : (
                      <>
                        <Minus className="w-5 h-5 text-[#8A9BA8]" />
                        <span className="text-[#5A6B7A] font-medium">Stable</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* History List */}
            {history.map((h) => {
              const info = getSeverityInfo(h.severity);
              return (
                <div
                  key={h.id}
                  className={`p-4 rounded-lg border ${info.borderColor} bg-gradient-to-br ${info.bgColor}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={info.color}>{info.label}</Badge>
                    <span className="text-sm text-[#5A6B7A] dark:text-slate-400">
                      {new Date(h.assessmentDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl sm:text-2xl font-bold text-[#1B2733] dark:text-white">
                      {h.totalScore}/21
                    </span>
                    <span className="text-sm text-[#5A6B7A] dark:text-slate-400">
                      {h.respondentType === 'self' ? 'Self-reported' : 'Caregiver-reported'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  // Results View
  if (isComplete && result) {
    const info = getSeverityInfo(result.severity);

    return (
      <Card className="p-4 sm:p-5 md:p-6">
        <div className={`p-6 rounded-xl bg-gradient-to-br ${info.bgColor} border ${info.borderColor} mb-4 sm:mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-1">GAD-7 Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[#1B2733] dark:text-white">
                  {result.totalScore}
                </span>
                <span className="text-lg text-[#5A6B7A] dark:text-slate-400">/21</span>
              </div>
            </div>
            <Badge className={`text-lg px-4 py-2 ${info.color}`}>
              {info.label}
            </Badge>
          </div>

          {/* Score visualization */}
          <div className="mb-4">
            <div className="h-3 bg-[#E8E4DF] dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  result.severity === 'minimal' ? 'bg-green-500' :
                  result.severity === 'mild' ? 'bg-yellow-500' :
                  result.severity === 'moderate' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${(result.totalScore / 21) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[#5A6B7A] dark:text-slate-400 mt-1">
              <span>Minimal (0-4)</span>
              <span>Mild (5-9)</span>
              <span>Moderate (10-14)</span>
              <span>Severe (15-21)</span>
            </div>
          </div>

          <p className="text-[#5A6B7A] dark:text-slate-400 text-sm mb-2">
            {info.description}
          </p>
        </div>

        {/* Recommendation */}
        <div className="p-4 bg-[#EEF4F8] dark:bg-blue-900/20 border border-[#C8DDE8] dark:border-blue-800 rounded-lg mb-4 sm:mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-[#4A6478] dark:text-blue-300 mb-1">Recommendation</p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {info.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Question breakdown */}
        <div className="mb-4 sm:mb-6">
          <h3 className="font-medium text-[#1B2733] dark:text-white mb-3">Response Summary</h3>
          <div className="space-y-2">
            {GAD7_QUESTIONS.map((q, i) => (
              <div key={q.id} className="flex items-center justify-between py-2 border-b border-[#E8E4DF] dark:border-slate-800">
                <span className="text-sm text-[#5A6B7A] dark:text-slate-400 flex-1 pr-4">
                  {q.text}
                </span>
                <Badge className={
                  result.answers[i] === 0 ? 'bg-green-100 text-green-700' :
                  result.answers[i] === 1 ? 'bg-yellow-100 text-yellow-700' :
                  result.answers[i] === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }>
                  {RESPONSE_OPTIONS[result.answers[i]].label}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={resetAssessment}>
            Take Again
          </Button>
          {showHistory && (
            <Button variant="outline" className="flex-1" onClick={() => setShowHistoryView(true)}>
              <History className="w-4 h-4 mr-2" />
              View History
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-[#5A6B7A] dark:text-slate-400 mt-4 sm:mt-6 text-center">
          The GAD-7 is a screening tool, not a diagnostic instrument. Please consult with a qualified
          healthcare provider for proper diagnosis and treatment recommendations.
        </p>
      </Card>
    );
  }

  // Assessment View
  return (
    <Card className="p-4 sm:p-5 md:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-[#1B2733] dark:text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#6B9080]" />
            GAD-7 Anxiety Screening
          </h2>
          {showHistory && history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowHistoryView(true)}>
              <History className="w-4 h-4 mr-1" />
              History
            </Button>
          )}
        </div>
        <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
          {isForSelf
            ? 'Over the last 2 weeks, how often have you been bothered by the following problems?'
            : `Over the last 2 weeks, how often has ${childName} been bothered by the following problems?`
          }
        </p>
      </div>

      {/* Progress */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between text-sm text-[#5A6B7A] dark:text-slate-400 mb-2">
          <span>Question {currentQuestion + 1} of 7</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-[#F0EDE8] dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <p className="text-xl font-medium text-[#1B2733] dark:text-white mb-4 sm:mb-6">
          {GAD7_QUESTIONS[currentQuestion].text}
        </p>

        <div className="space-y-3">
          {RESPONSE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(option.value)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                answers[currentQuestion] === option.value
                  ? 'border-[#6B9080] bg-[#6B9080]/10 dark:bg-[#6B9080]/15'
                  : 'border-[#E8E4DF] dark:border-slate-700 hover:border-[#6B9080]/30 hover:bg-[#FAF7F2] dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-[#1B2733] dark:text-white">{option.label}</span>
                  <span className="text-sm text-[#5A6B7A] dark:text-slate-400 ml-2">({option.days})</span>
                </div>
                {answers[currentQuestion] === option.value && (
                  <CheckCircle className="w-5 h-5 text-[#6B9080]" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>

        {/* Question dots */}
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestion(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === currentQuestion
                  ? 'bg-primary scale-125'
                  : answers[i] !== null
                  ? 'bg-teal-300'
                  : 'bg-[#E8E4DF] dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          onClick={() => setCurrentQuestion(Math.min(6, currentQuestion + 1))}
          disabled={currentQuestion === 6 || answers[currentQuestion] === null}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Info */}
      <div className="mt-8 p-4 bg-[#FAF7F2] dark:bg-slate-800 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#8A9BA8] mt-0.5" />
          <div>
            <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
              The GAD-7 is a validated screening tool developed by Drs. Spitzer, Kroenke, Williams, and Löwe.
              It takes approximately 2-3 minutes to complete.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default GAD7Screener;
