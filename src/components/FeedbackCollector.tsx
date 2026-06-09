// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Feedback Collector Modal - Pilot testing feedback loop
 * Warm, simple, emotionally intelligent
 */

import React, { useState } from 'react';
import { X, Send, Heart, Smile, Meh, Frown } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent } from './ui/dialog';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

interface FeedbackCollectorProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  context?: string; // Where feedback was triggered from
}

type MoodRating = 'easy' | 'okay' | 'hard';

export function FeedbackCollector({
  isOpen,
  onClose,
  userId,
  context = 'general'
}: FeedbackCollectorProps) {
  const [step, setStep] = useState<'mood' | 'questions' | 'thanks'>('mood');
  const [mood, setMood] = useState<MoodRating | null>(null);
  const [whatFeltEasiest, setWhatFeltEasiest] = useState('');
  const [whatCouldBeCalmer, setWhatCouldBeCalmer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMoodSelect = (selectedMood: MoodRating) => {
    setMood(selectedMood);
    setTimeout(() => setStep('questions'), 300);
  };

  const handleSubmit = async () => {
    if (!mood) return;

    setIsSubmitting(true);

    try {
      // Primary path: user_feedback table — feeds the admin Feedback Inbox
      // (RLS lets the user insert their own row and later read the admin's reply).
      const { error: dbError } = await supabase.from('user_feedback').insert({
        user_id: userId,
        mood,
        context,
        what_felt_easiest: whatFeltEasiest || null,
        what_could_be_calmer: whatCouldBeCalmer || null,
        status: 'new',
      });

      if (dbError) {
        // Fallback: legacy KV endpoint so feedback is never lost
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/feedback/submit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-User-Id': userId
            },
            body: JSON.stringify({
              mood,
              whatFeltEasiest,
              whatCouldBeCalmer,
              context,
              timestamp: new Date().toISOString()
            })
          }
        );
        if (!response.ok) {
          throw new Error(`Feedback submit failed with status ${response.status}`);
        }
      }

      setStep('thanks');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2500);

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error("Couldn't send feedback right now. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('mood');
    setMood(null);
    setWhatFeltEasiest('');
    setWhatCouldBeCalmer('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* Mood Selection */}
        {step === 'mood' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-4"
          >
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl text-[#1B2733] mb-2">
                How's Aminy feeling?
              </h2>
              <p className="text-sm text-[#5A6B7A]">
                Your honest thoughts help us build something calmer
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={() => handleMoodSelect('easy')}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-[#E8E4DF] hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
              >
                <Smile className="w-8 h-8 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-[#3A4A57]">Easy</span>
              </button>

              <button
                onClick={() => handleMoodSelect('okay')}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-[#E8E4DF] hover:border-amber-400 hover:bg-amber-50 transition-all group"
              >
                <Meh className="w-8 h-8 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-[#3A4A57]">Okay</span>
              </button>

              <button
                onClick={() => handleMoodSelect('hard')}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-[#E8E4DF] hover:border-rose-400 hover:bg-rose-50 transition-all group"
              >
                <Frown className="w-8 h-8 text-rose-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-[#3A4A57]">Hard</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Questions */}
        {step === 'questions' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="py-4"
          >
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl text-[#1B2733] mb-2">
                Tell us more
              </h2>
              <p className="text-sm text-[#5A6B7A]">
                Optional, but super helpful
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              {/* What felt easiest */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                  What felt easiest?
                </label>
                <Textarea
                  value={whatFeltEasiest}
                  onChange={(e) => setWhatFeltEasiest(e.target.value)}
                  placeholder="Like: 'Finding the Jr mode videos' or 'Understanding my coverage'"
                  className="resize-none"
                  rows={3}
                />
              </div>

              {/* What could be calmer */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                  What could be calmer?
                </label>
                <Textarea
                  value={whatCouldBeCalmer}
                  onChange={(e) => setWhatCouldBeCalmer(e.target.value)}
                  placeholder="Like: 'Too many clicks' or 'Hard to find X'"
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('mood')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-[#6B9080] hover:bg-[#216982]"
              >
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Thank You */}
        {step === 'thanks' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{
                duration: 1,
                ease: 'easeInOut'
              }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-violet-100 flex items-center justify-center"
            >
              <Heart className="w-8 h-8 text-emerald-600 fill-emerald-600" />
            </motion.div>

            <h2 className="text-xl text-[#1B2733] mb-2">
              Thank you 💚
            </h2>
            <p className="text-sm text-[#5A6B7A]">
              Your feedback helps us build something truly calm
            </p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage feedback collector
 */
export function useFeedbackCollector() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState('general');

  const openFeedback = (feedbackContext: string = 'general') => {
    setContext(feedbackContext);
    setIsOpen(true);
  };

  const closeFeedback = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    context,
    openFeedback,
    closeFeedback
  };
}
