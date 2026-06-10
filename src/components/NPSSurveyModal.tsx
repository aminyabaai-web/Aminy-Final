// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * NPS Survey Modal
 *
 * Collects Net Promoter Score feedback from users.
 * Triggered after 7 days of usage or after completing key actions.
 * Stores responses in Supabase for admin dashboard analytics.
 */

import React, { useState } from 'react';
import { X, Heart, Send, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface NPSSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  userId: string;
  childName?: string;
  trigger?: 'day_7' | 'post_session' | 'monthly' | 'manual';
}

export function NPSSurveyModal({
  isOpen,
  onClose,
  onSubmit,
  userId,
  childName = 'your child',
  trigger = 'manual'
}: NPSSurveyModalProps) {
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [step, setStep] = useState<'score' | 'feedback' | 'thanks'>('score');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScoreSelect = (selectedScore: number) => {
    setScore(selectedScore);
    // Auto-advance to feedback for detractors/passives, show thanks for promoters
    setTimeout(() => {
      if (selectedScore <= 6) {
        setStep('feedback');
      } else if (selectedScore <= 8) {
        setStep('feedback');
      } else {
        // Promoters (9-10) - still offer feedback but optional
        setStep('feedback');
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (score === null) return;

    setIsSubmitting(true);
    try {
      // Store in Supabase
      const { error } = await supabase.from('nps_responses').insert({
        user_id: userId,
        score,
        feedback: feedback.trim() || null,
        trigger,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('[NPS] Error saving response:', error);
        // Still show thanks even if save fails
      }

      setStep('thanks');
      onSubmit?.();

      // Auto-close after thanks message
      setTimeout(() => {
        onClose();
        // Reset state for next time
        setScore(null);
        setFeedback('');
        setStep('score');
      }, 2500);

    } catch (error) {
      console.error('[NPS] Submit error:', error);
      toast.error('Failed to save feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    handleSubmit();
  };

  const getScoreLabel = (value: number): string => {
    if (value <= 6) return 'Could be better';
    if (value <= 8) return 'It\'s good';
    return 'Love it!';
  };

  const getScoreColor = (value: number): string => {
    if (value <= 6) return 'bg-red-500 hover:bg-red-600';
    if (value <= 8) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1B2733] dark:text-white">Quick Feedback</h2>
                  <p className="text-xs text-[#5A6B7A] dark:text-slate-400">Help us improve Aminy</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close survey"
                className="p-2 hover:bg-[#F0EDE8] dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#8A9BA8]" />
              </button>
            </div>

            {/* Step 1: Score Selection */}
            {step === 'score' && (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-center text-[#3A4A57] dark:text-slate-300">
                  How likely are you to recommend Aminy to a friend with a child like {childName}?
                </p>

                {/* Score buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleScoreSelect(value)}
                      className={`w-10 h-10 rounded-full font-semibold transition-all ${
                        score === value
                          ? getScoreColor(value) + ' text-white scale-110'
                          : 'bg-[#F0EDE8] dark:bg-slate-800 text-[#3A4A57] dark:text-slate-300 hover:bg-[#E8E4DF] dark:hover:bg-slate-700'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>

                {/* Scale labels */}
                <div className="flex justify-between text-xs text-[#5A6B7A] dark:text-slate-400 px-2">
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>

                {/* Selected score feedback */}
                {score !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      score <= 6 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      score <= 8 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {getScoreLabel(score)}
                    </span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 2: Feedback */}
            {step === 'feedback' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                    score !== null && score <= 6 ? 'bg-red-100 text-red-700' :
                    score !== null && score <= 8 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    You selected {score}/10
                  </span>
                </div>

                <p className="text-center text-[#3A4A57] dark:text-slate-300">
                  {score !== null && score <= 6
                    ? "What could we do better to help your family?"
                    : score !== null && score <= 8
                    ? "What would make Aminy even better for you?"
                    : "We're so glad! What do you love most about Aminy?"
                  }
                </p>

                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Your feedback helps us improve..."
                  rows={3}
                  className="resize-none"
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-primary hover:bg-[#216982]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Thank You */}
            {step === 'thanks' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">
                  Thank you!
                </h3>
                <p className="text-[#5A6B7A] dark:text-slate-400">
                  Your feedback helps us support families like yours better.
                </p>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to manage NPS survey display logic
 */
export function useNPSSurvey(userId: string | null) {
  const [showSurvey, setShowSurvey] = useState(false);

  const checkShouldShowSurvey = async () => {
    if (!userId) return false;

    try {
      // Check if user has already responded recently (within 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentResponse } = await supabase
        .from('nps_responses')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1);

      if (recentResponse && recentResponse.length > 0) {
        return false; // Already responded recently
      }

      // Check if user has been active for 7+ days
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userId)
        .single();

      if (profile) {
        const accountAge = Date.now() - new Date(profile.created_at).getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        if (accountAge >= sevenDays) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[NPS] Error checking survey eligibility:', error);
      return false;
    }
  };

  const triggerSurvey = () => {
    setShowSurvey(true);
  };

  const closeSurvey = () => {
    setShowSurvey(false);
  };

  return {
    showSurvey,
    triggerSurvey,
    closeSurvey,
    checkShouldShowSurvey
  };
}

export default NPSSurveyModal;
