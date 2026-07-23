// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Parent Check-In ("How are you holding up?")
 *
 * A friend asking, not a screener. Four tap options + an optional one-line
 * note, done in under ten seconds, skippable forever without guilt.
 *
 * NOT a clinical instrument — PHQ/GAD/CaregiverBurdenScale stay unwired
 * (owner decision, clinical-advisor gate). This is the gentle loop only.
 *
 * Persists to `stress_logs` (RLS: user reads/writes own rows) so the AI
 * context layer and the parent-wellbeing aggregates can feel the answer.
 */

import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  X,
  Heart,
  Sun,
  CloudSun,
  CloudRain,
  BatteryLow,
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface StressCheckInProps {
  isOpen: boolean;
  onClose: () => void;
  context: 'morning' | 'evening';
  onComplete?: (stressLevel: number) => void;
}

/** localStorage mirror so the AI can feel the latest answer immediately
 *  (and offline / before the Supabase row is readable). */
export const PARENT_CHECKIN_LATEST_KEY = 'aminy_parent_checkin_latest';
/** "Please stop asking" — honored forever by the proactive cadence. */
export const PARENT_CHECKIN_OPTOUT_KEY = 'aminy_parent_checkin_optout';

interface CheckInOption {
  label: string;
  sub: string;
  level: number; // maps onto stress_logs.stress_level (1-10)
  icon: React.ElementType;
}

const CHECKIN_OPTIONS: CheckInOption[] = [
  { label: 'Doing okay', sub: 'Steady enough today', level: 2, icon: Sun },
  { label: 'Managing', sub: 'Busy, but holding it together', level: 4, icon: CloudSun },
  { label: 'Stretched thin', sub: 'Today is asking a lot of you', level: 7, icon: CloudRain },
  { label: 'Running on empty', sub: 'Not much left in the tank', level: 9, icon: BatteryLow },
];

/** Word the AI/aggregates use for a stored 1-10 level. */
export function describeCheckInLevel(level: number): string {
  if (level <= 3) return 'doing okay';
  if (level <= 5) return 'managing';
  if (level <= 7) return 'stretched thin';
  return 'running on empty';
}

export function StressCheckIn({
  isOpen,
  onClose,
  context,
  onComplete,
}: StressCheckInProps) {
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Display wording follows the clock; `context` stays the stored DB value.
  const timeWord = new Date().getHours() >= 17 ? 'tonight' : 'today';

  const getEncouragementMessage = (level: number): string => {
    if (level <= 3) return 'Glad to hear it. Steady days count double around here.';
    if (level <= 5) return 'Holding it together is real work. Noted, gently.';
    if (level <= 7) return "That's a lot to carry. I'll keep things light today.";
    return "Thank you for being honest. You don't have to refill the tank alone.";
  };

  const handleSubmit = async () => {
    if (stressLevel === null) return;

    setIsSubmitting(true);
    const trimmedNote = note.trim().slice(0, 200);

    // Mirror locally first — the AI should feel this even if the network doesn't.
    try {
      localStorage.setItem(
        PARENT_CHECKIN_LATEST_KEY,
        JSON.stringify({
          level: stressLevel,
          feeling: describeCheckInLevel(stressLevel),
          note: trimmedNote || undefined,
          at: new Date().toISOString(),
        })
      );
    } catch {
      // localStorage unavailable — fine
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('stress_logs').insert({
          user_id: user.id,
          stress_level: stressLevel,
          context: context,
          notes: trimmedNote || null,
        });
        if (error) throw error;
      }
      toast.success(getEncouragementMessage(stressLevel));
      onComplete?.(stressLevel);
      onClose();
    } catch (error) {
      console.error('Error saving check-in:', error);
      // The local mirror already has it — never make the parent retry a feeling.
      toast.success(getEncouragementMessage(stressLevel));
      onComplete?.(stressLevel);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptOut = () => {
    try {
      localStorage.setItem(PARENT_CHECKIN_OPTOUT_KEY, 'true');
    } catch {
      // ignore
    }
    toast.success("Okay — I won't ask again. I'm always in chat if you want to talk.");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="p-5 bg-[#F6FBFB] border-b border-[#E8E4DF]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#132F43]">
                How are you holding up {timeWord}?
              </h2>
              <p className="text-sm text-[#5A6B7A] mt-1">
                Just you, for a second — not the to-do list. One tap is plenty.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close check-in"
              className="flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tap options */}
        <div className="p-4 sm:p-5">
          <div className="space-y-2 mb-4" role="radiogroup" aria-label="How are you holding up?">
            {CHECKIN_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = stressLevel === option.level;
              return (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setStressLevel(option.level)}
                  className={`parent-checkin-option ${selected ? 'is-selected' : ''}`}
                >
                  <Icon className="w-5 h-5 checkin-option-icon" aria-hidden="true" />
                  <span className="flex-1">
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-sm text-[#5A6B7A]">{option.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Optional one-line note */}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder={'Add a line if you want — "rough school morning"'}
            aria-label="Optional note"
            className="parent-checkin-note mb-4"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={stressLevel === null || isSubmitting}
              className="flex-1 bg-[#2A7D99] hover:bg-[#376E80] text-white gap-2 min-h-[44px]"
            >
              <Heart className="w-4 h-4" aria-hidden="true" />
              {isSubmitting ? 'One sec...' : 'Share with Aminy'}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-[#5A6B7A] min-h-[44px]"
            >
              Not today
            </Button>
          </div>

          {/* Gentle line when they're carrying a lot */}
          {stressLevel !== null && stressLevel >= 7 && (
            <div className="mt-4 p-3 bg-[#EEF4F8] rounded-lg">
              <p className="text-sm text-[#3A4A57]">
                Hard days are allowed. If you want to talk anything through, I&apos;m right here — no fixing required.
              </p>
            </div>
          )}

          {/* Skippable forever, no guilt */}
          <button
            type="button"
            onClick={handleOptOut}
            className="mt-3 w-full text-center text-xs text-[#8A9BA8] underline underline-offset-2 min-h-[44px]"
          >
            Prefer I didn&apos;t ask? Tap here and I&apos;ll stop.
          </button>
        </div>
      </Card>
    </div>
  );
}

/**
 * Stress Check-In Trigger Hook
 * Determines when to show check-in prompts (time-window + once per
 * context per day). The proactive cadence in ProactiveCheckIn.tsx is the
 * primary surfacing rail; this hook remains for direct use.
 */
export function useStressCheckIn() {
  const [shouldShowMorning, setShouldShowMorning] = useState(false);
  const [shouldShowEvening, setShouldShowEvening] = useState(false);

  React.useEffect(() => {
    const checkTiming = async () => {
      const now = new Date();
      const hour = now.getHours();

      // Morning window: 6am - 10am
      const isMorningWindow = hour >= 6 && hour < 10;
      // Evening window: 6pm - 10pm
      const isEveningWindow = hour >= 18 && hour < 22;

      if (!isMorningWindow && !isEveningWindow) return;

      try {
        if (localStorage.getItem(PARENT_CHECKIN_OPTOUT_KEY) === 'true') return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = now.toISOString().split('T')[0];
        const context = isMorningWindow ? 'morning' : 'evening';

        // Check if already logged today for this context
        const { data } = await supabase
          .from('stress_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('context', context)
          .gte('created_at', `${today}T00:00:00`)
          .limit(1);

        if (data && data.length === 0) {
          if (isMorningWindow) {
            setShouldShowMorning(true);
          } else {
            setShouldShowEvening(true);
          }
        }
      } catch (error) {
        console.error('Error checking check-in status:', error);
      }
    };

    checkTiming();
  }, []);

  return {
    shouldShowMorning,
    shouldShowEvening,
    dismissMorning: () => setShouldShowMorning(false),
    dismissEvening: () => setShouldShowEvening(false),
  };
}

export default StressCheckIn;
