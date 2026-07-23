// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Card } from './ui/card';

interface MicroAffirmationBannerProps {
  parentName?: string;
}

const AFFIRMATION_KEY = 'aminy-daily-affirmation';
const DISMISSED_KEY = 'aminy-daily-affirmation-dismissed';

const affirmations = [
  "You're doing great — small steps. Big calm.",
  "Three calm mornings in a row — your consistency is quietly working.",
  "Every small step matters. You're making real progress.",
  "You showed up today. That's everything.",
  "This is hard work, and you're handling it with grace.",
  "Your child is lucky to have you in their corner.",
  "Progress isn't always visible, but it's happening — little by little.",
  "You're learning alongside them — building connection every day.",
  "Small wins today = big calm tomorrow.",
  "You're doing better than you think — and Aminy's tracking the wins.",
  "Take a moment to breathe. Gentle cues work for you too.",
  "Every day you're showing up is a celebration.",
  "You're exactly the parent your child needs.",
  "Consistency builds comfort — and you're building both.",
  "You're creating predictable routines that last.",
];

/** Dismissal is remembered for the day — the banner stays quiet until tomorrow. */
function isDismissedToday(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === new Date().toDateString();
  } catch {
    return false;
  }
}

export function MicroAffirmationBanner({ parentName: _parentName }: MicroAffirmationBannerProps) {
  const [dismissed, setDismissed] = useState(() => isDismissedToday());
  const [currentAffirmation, setCurrentAffirmation] = useState('');

  useEffect(() => {
    // Get a consistent affirmation for the day based on date
    const today = new Date().toDateString();
    try {
      const savedData = localStorage.getItem(AFFIRMATION_KEY);
      if (savedData) {
        const { date, affirmation } = JSON.parse(savedData);
        if (date === today && affirmation) {
          setCurrentAffirmation(affirmation);
          return;
        }
      }
    } catch { /* fall through to a fresh pick */ }

    // New day - pick a random affirmation
    const randomIndex = Math.floor(Math.random() * affirmations.length);
    const newAffirmation = affirmations[randomIndex];
    setCurrentAffirmation(newAffirmation);
    try {
      localStorage.setItem(AFFIRMATION_KEY, JSON.stringify({
        date: today,
        affirmation: newAffirmation,
      }));
    } catch { /* non-critical */ }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, new Date().toDateString());
    } catch { /* non-critical */ }
  };

  if (dismissed || !currentAffirmation) return null;

  return (
    <Card className="relative overflow-hidden border-[#E8E4DF] bg-gradient-to-r from-[#F6FBFB]/50 to-white">
      <div className="p-3 sm:p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[#6B9080]/10 transition-colors"
          aria-label="Dismiss affirmation for today"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center" aria-hidden="true">
            <Sparkles className="w-4 h-4 text-white" />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <p className="aminy-affirm leading-relaxed" style={{ fontSize: '0.95rem' }}>
              {currentAffirmation}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
