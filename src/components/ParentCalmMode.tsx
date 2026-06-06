// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Parent Calm Mode
 * 
 * Fast path to relief when parent is overwhelmed.
 * 30-90 second flow:
 * - 1 breath animation
 * - 1 grounding prompt
 * - 1 "what's hardest right now?" quick choice
 * - Optional "Talk to Aminy" handoff
 * 
 * Available on:
 * - Home (top section)
 * - Today's Plan (sticky footer)
 * - AI-triggered when overwhelm detected
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Cloud, Heart, MessageCircle, X } from 'lucide-react';
import { HAPTICS, ANIMATIONS } from '../lib/mobile-experience-enhancer';

interface ParentCalmModeProps {
  isOpen: boolean;
  onClose: () => void;
  onTalkToAminy?: () => void;
  parentName?: string;
  /** When true, renders as a full-screen page instead of a dialog overlay */
  fullScreen?: boolean;
}

export function ParentCalmMode({ isOpen, onClose, onTalkToAminy, parentName = 'Parent', fullScreen = false }: ParentCalmModeProps) {
  const [step, setStep] = useState<'breath' | 'ground' | 'identify' | 'next'>('breath');
  const [overwhelmBefore, setOverwhelmBefore] = useState<number | null>(null);
  const [overwhelmAfter, setOverwhelmAfter] = useState<number | null>(null);
  const [hardestThing, setHardestThing] = useState<string | null>(null);

  const handleStart = () => {
    HAPTICS.light();
    setStep('breath');
  };

  const handleBreathComplete = () => {
    HAPTICS.success();
    setStep('ground');
  };

  const handleGroundComplete = () => {
    HAPTICS.light();
    setStep('identify');
  };

  const handleIdentifyComplete = (choice: string) => {
    HAPTICS.light();
    setHardestThing(choice);
    setStep('next');
  };

  const handleComplete = () => {
    // Log calm mode usage
    logCalmModeSession({
      overwhelmBefore,
      overwhelmAfter,
      hardestThing,
      duration: 90 // Would calculate actual
    });

    onClose();

    // Reset for next time
    setTimeout(() => {
      setStep('breath');
      setOverwhelmBefore(null);
      setOverwhelmAfter(null);
      setHardestThing(null);
    }, 500);
  };

  const stepContent = (
    <AnimatePresence mode="wait">
      {step === 'breath' && (
        <BreathStep
          key="breath"
          onComplete={handleBreathComplete}
          parentName={parentName}
          onSetBefore={setOverwhelmBefore}
        />
      )}

      {step === 'ground' && (
        <GroundStep
          key="ground"
          onComplete={handleGroundComplete}
          parentName={parentName}
        />
      )}

      {step === 'identify' && (
        <IdentifyStep
          key="identify"
          onComplete={handleIdentifyComplete}
          parentName={parentName}
        />
      )}

      {step === 'next' && (
        <NextStepsStep
          key="next"
          parentName={parentName}
          hardestThing={hardestThing}
          onTalkToAminy={onTalkToAminy}
          onComplete={handleComplete}
          onSetAfter={setOverwhelmAfter}
        />
      )}
    </AnimatePresence>
  );

  // Full-screen mode: render as a page with a close button, not a dialog overlay
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] to-[#F0EDE8] flex flex-col">
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/50 transition-colors"
            aria-label="Close calm mode"
          >
            <X className="w-5 h-5 text-[#5A6B7A]" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full px-4">
            {stepContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-b from-[#FAF7F2] to-[#F0EDE8] border-none">
        {stepContent}
      </DialogContent>
    </Dialog>
  );
}

// ===================================
// STEP 1: BREATH (30 seconds)
// ===================================

function BreathStep({
  onComplete,
  parentName,
  onSetBefore
}: {
  onComplete: () => void;
  parentName: string;
  onSetBefore: (val: number) => void;
}) {
  const [breathPhase, setBreathPhase] = useState<'prompt' | 'inhale' | 'hold' | 'exhale' | 'done'>('prompt');
  const [cycles, setCycles] = useState(0);

  const startBreathing = (overwhelm: number) => {
    HAPTICS.medium();
    onSetBefore(overwhelm);
    setBreathPhase('inhale');
    runBreathCycle();
  };

  const runBreathCycle = () => {
    // Inhale 4 seconds
    setTimeout(() => setBreathPhase('hold'), 4000);

    // Hold 4 seconds
    setTimeout(() => setBreathPhase('exhale'), 8000);

    // Exhale 6 seconds
    setTimeout(() => {
      setCycles(prev => {
        const newCycles = prev + 1;
        if (newCycles >= 3) {
          setBreathPhase('done');
          setTimeout(onComplete, 1000);
        } else {
          setBreathPhase('inhale');
          runBreathCycle();
        }
        return newCycles;
      });
    }, 14000);
  };

  if (breathPhase === 'prompt') {
    return (
      <motion.div {...ANIMATIONS.fadeIn} className="text-center p-6">
        <Cloud className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl text-[#1B2733] mb-4">
          Let's breathe, {parentName}
        </h2>
        <p className="text-sm text-[#5A6B7A] mb-6">
          Before we start, how overwhelmed do you feel right now?
        </p>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-[#5A6B7A] mb-2">
            <span>Calm</span>
            <span>Very overwhelmed</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <button
                key={num}
                onClick={() => startBreathing(num)}
                className="flex-1 h-12 rounded bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center justify-center text-[#3A4A57] dark:text-blue-100 font-medium"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (breathPhase === 'done') {
    return (
      <motion.div {...ANIMATIONS.fadeIn} className="text-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <Heart className="w-16 h-16 text-green-500 mx-auto mb-4" />
        </motion.div>
        <p className="text-lg text-[#1B2733]">Nice work</p>
      </motion.div>
    );
  }

  return (
    <motion.div {...ANIMATIONS.fadeIn} className="text-center p-6 flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
      <BreathingCircle phase={breathPhase as 'inhale' | 'hold' | 'exhale'} />

      <div className="mt-8">
        <p className="text-xs text-[#5A6B7A] mb-2">Cycle {cycles + 1} of 3</p>
      </div>
    </motion.div>
  );
}

function BreathingCircle({ phase }: { phase: 'inhale' | 'hold' | 'exhale' }) {
  const phaseConfig = {
    inhale: { scale: 1.5, color: '#3b82f6', text: 'Breathe in...', duration: 4 },
    hold: { scale: 1.5, color: '#8b5cf6', text: 'Hold...', duration: 4 },
    exhale: { scale: 1, color: '#7BA7BC', text: 'Breathe out...', duration: 6 }
  };

  const config = phaseConfig[phase];

  return (
    <div className="relative">
      <motion.div
        className="w-32 h-32 rounded-full"
        style={{ backgroundColor: config.color, opacity: 0.3 }}
        animate={{ scale: config.scale }}
        transition={{ duration: config.duration, ease: 'easeInOut' }}
      />
      <motion.p
        className="absolute inset-0 flex items-center justify-center text-lg font-medium"
        style={{ color: config.color }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {config.text}
      </motion.p>
    </div>
  );
}

// ===================================
// STEP 2: GROUND (20 seconds)
// ===================================

function GroundStep({
  onComplete,
  parentName
}: {
  onComplete: () => void;
  parentName: string;
}) {
  React.useEffect(() => {
    const timer = setTimeout(onComplete, 20000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div {...ANIMATIONS.fadeIn} className="text-center p-6">
      <h3 className="text-xl text-[#1B2733] mb-6">
        Ground yourself, {parentName}
      </h3>

      <div className="space-y-4 text-left max-w-sm mx-auto">
        <GroundingPrompt delay={0} text="Notice 5 things you can see" />
        <GroundingPrompt delay={4} text="Notice 4 things you can touch" />
        <GroundingPrompt delay={8} text="Notice 3 things you can hear" />
        <GroundingPrompt delay={12} text="Notice 2 things you can smell" />
        <GroundingPrompt delay={16} text="Notice 1 thing you can taste" />
      </div>
    </motion.div>
  );
}

function GroundingPrompt({ delay, text }: { delay: number; text: string }) {
  const [visible, setVisible] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E8E4DF]"
    >
      <div className="w-2 h-2 rounded-full bg-[#7BA7BC]" />
      <p className="text-sm text-[#3A4A57]">{text}</p>
    </motion.div>
  );
}

// ===================================
// STEP 3: IDENTIFY (20 seconds)
// ===================================

function IdentifyStep({
  onComplete,
  parentName
}: {
  onComplete: (choice: string) => void;
  parentName: string;
}) {
  const challenges = [
    { id: 'behavior', label: 'Challenging behavior', emoji: '😤' },
    { id: 'transitions', label: 'Transitions', emoji: '🔄' },
    { id: 'meltdown', label: 'Meltdown happening', emoji: '😭' },
    { id: 'exhausted', label: 'I\'m exhausted', emoji: '😮‍💨' },
    { id: 'overwhelmed', label: 'Just overwhelmed', emoji: '🌊' },
    { id: 'alone', label: 'Feeling alone', emoji: '💙' }
  ];

  return (
    <motion.div {...ANIMATIONS.fadeIn} className="p-6">
      <h3 className="text-xl text-[#1B2733] mb-2 text-center">
        What's hardest right now?
      </h3>
      <p className="text-sm text-[#5A6B7A] mb-6 text-center">
        So I can help, {parentName}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {challenges.map((challenge) => (
          <button
            key={challenge.id}
            onClick={() => onComplete(challenge.label)}
            className="p-4 bg-white border-2 border-[#E8E4DF] rounded-lg hover:border-blue-500 hover:bg-[#EEF4F8] transition-all text-left"
          >
            <div className="text-2xl mb-2">{challenge.emoji}</div>
            <div className="text-sm text-[#1B2733]">{challenge.label}</div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ===================================
// STEP 4: NEXT STEPS (20 seconds)
// ===================================

function NextStepsStep({
  parentName,
  hardestThing,
  onTalkToAminy,
  onComplete,
  onSetAfter
}: {
  parentName: string;
  hardestThing: string | null;
  onTalkToAminy?: () => void;
  onComplete: () => void;
  onSetAfter: (val: number) => void;
}) {
  const [overwhelm, setOverwhelm] = useState<number | null>(null);

  const handleFinish = () => {
    if (overwhelm !== null) {
      onSetAfter(overwhelm);
    }
    onComplete();
  };

  return (
    <motion.div {...ANIMATIONS.fadeIn} className="p-6">
      <h3 className="text-xl text-[#1B2733] mb-4 text-center">
        How do you feel now?
      </h3>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-[#5A6B7A] mb-2">
          <span>Much better</span>
          <span>Still overwhelmed</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
            <button
              key={num}
              onClick={() => setOverwhelm(num)}
              className={`flex-1 h-12 rounded transition-all flex items-center justify-center text-[#3A4A57] font-medium ${overwhelm === num
                ? 'bg-green-500 text-white'
                : 'bg-[#F0EDE8] hover:bg-[#E8E4DF]'
                }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {onTalkToAminy && (
          <Button
            onClick={() => {
              handleFinish();
              onTalkToAminy();
            }}
            className="w-full bg-blue-600 text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Talk to Aminy about "{hardestThing}"
          </Button>
        )}

        <Button
          onClick={handleFinish}
          variant="outline"
          className="w-full"
          disabled={overwhelm === null}
        >
          I'm okay for now
        </Button>
      </div>

      {overwhelm !== null && overwhelm <= 4 && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-green-600 text-center mt-4"
        >
          Good. You did great taking a moment for yourself. 💙
        </motion.p>
      )}
    </motion.div>
  );
}

// ===================================
// CALM MODE BUTTON (Always Visible)
// ===================================

export function CalmModeButton({
  parentName,
  variant = 'default',
  onTalkToAminy
}: {
  parentName?: string;
  variant?: 'default' | 'minimal';
  onTalkToAminy?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'minimal') {
    return (
      <>
        <button
          onClick={() => {
            HAPTICS.medium();
            setIsOpen(true);
          }}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          <Cloud className="w-4 h-4" />
          Need calm?
        </button>

        <ParentCalmMode
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onTalkToAminy={onTalkToAminy}
          parentName={parentName}
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => {
          HAPTICS.medium();
          setIsOpen(true);
        }}
        variant="outline"
        className="w-full bg-white border border-[#E8E4DF] shadow-sm hover:shadow-md hover:bg-[#FAF7F2] text-[#3A4A57] font-medium transition-all duration-200 rounded-xl py-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-[#6B9080] rounded-lg">
            <Cloud className="w-5 h-5" />
          </div>
          <span className="text-base tracking-tight">I need calm now</span>
        </div>
      </Button>

      <ParentCalmMode
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onTalkToAminy={onTalkToAminy}
        parentName={parentName}
      />
    </>
  );
}

// ===================================
// LOGGING
// ===================================

function logCalmModeSession(data: {
  overwhelmBefore: number | null;
  overwhelmAfter: number | null;
  hardestThing: string | null;
  duration: number;
}): void {
  const sessions = JSON.parse(localStorage.getItem('calm_mode_sessions') || '[]');
  sessions.push({
    ...data,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('calm_mode_sessions', JSON.stringify(sessions));
}
