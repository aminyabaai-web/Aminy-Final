// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Visual Timer Component
 * Child-friendly countdown timer with visual progress ring
 * For transitions, activities, and calm-down moments
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RefreshCw,
  Volume2,
  VolumeX,
  Check,
  X,
  Clock,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { triggerHaptic } from '../lib/haptics';
import confetti from 'canvas-confetti';

interface VisualTimerProps {
  initialMinutes?: number;
  label?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  autoStart?: boolean;
  showPresets?: boolean;
  rewardCoins?: number;
  childFriendly?: boolean;
  theme?: 'default' | 'calm' | 'fun' | 'focus';
}

const PRESET_TIMES = [
  { label: '1 min', minutes: 1, icon: '🧘' },
  { label: '2 min', minutes: 2, icon: '✨' },
  { label: '5 min', minutes: 5, icon: '⭐' },
  { label: '10 min', minutes: 10, icon: '🌟' },
  { label: '15 min', minutes: 15, icon: '🎯' },
];

const THEMES = {
  default: {
    primary: 'rgb(20, 184, 166)', // teal
    secondary: 'rgb(20, 184, 166, 0.1)',
    background: 'from-teal-50 to-teal-100',
  },
  calm: {
    primary: 'rgb(139, 92, 246)', // purple
    secondary: 'rgb(139, 92, 246, 0.1)',
    background: 'from-purple-50 to-indigo-100',
  },
  fun: {
    primary: 'rgb(236, 72, 153)', // pink
    secondary: 'rgb(236, 72, 153, 0.1)',
    background: 'from-pink-50 to-rose-100',
  },
  focus: {
    primary: 'rgb(59, 130, 246)', // blue
    secondary: 'rgb(59, 130, 246, 0.1)',
    background: 'from-blue-50 to-cyan-100',
  },
};

export function VisualTimer({
  initialMinutes = 5,
  label = 'Timer',
  onComplete,
  onCancel,
  autoStart = false,
  showPresets = true,
  rewardCoins = 1,
  childFriendly = true,
  theme = 'default',
}: VisualTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isComplete, setIsComplete] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const themeColors = THEMES[theme];

  // Calculate progress percentage
  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 120; // radius of 120
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle timer completion
  const handleComplete = useCallback(() => {
    setIsRunning(false);
    setIsComplete(true);
    triggerHaptic('success');

    // Play completion sound
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Audio playback blocked by browser autoplay policy - this is expected
      });
    }

    // Trigger celebration
    if (childFriendly) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#14b8a6', '#8b5cf6', '#ec4899', '#f59e0b'],
      });
    }

    onComplete?.();
  }, [soundEnabled, childFriendly, onComplete]);

  // Timer logic
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, remainingSeconds, handleComplete]);

  // Play tick sound for last 10 seconds
  useEffect(() => {
    if (isRunning && remainingSeconds <= 10 && remainingSeconds > 0 && soundEnabled) {
      triggerHaptic('light');
    }
  }, [remainingSeconds, isRunning, soundEnabled]);

  const handleStart = () => {
    setIsRunning(true);
    triggerHaptic('medium');
  };

  const handlePause = () => {
    setIsRunning(false);
    triggerHaptic('light');
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsComplete(false);
    setRemainingSeconds(totalSeconds);
    triggerHaptic('light');
  };

  const handleSetTime = (minutes: number) => {
    const seconds = minutes * 60;
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setIsRunning(false);
    setIsComplete(false);
    triggerHaptic('light');
  };

  const handleCancel = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onCancel?.();
  };

  // Completion state
  if (isComplete) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center p-8"
      >
        <div className="w-24 h-24 mx-auto mb-4 sm:mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          {childFriendly ? 'Amazing job! 🎉' : 'Time complete!'}
        </h2>
        {rewardCoins > 0 && (
          <div className="flex items-center justify-center gap-2 text-amber-600 mb-4">
            <Star className="w-5 h-5 fill-amber-400" />
            <span className="font-medium">+{rewardCoins} Calm Coins earned!</span>
          </div>
        )}
        <p className="text-gray-600 mb-4 sm:mb-6">
          {childFriendly
            ? "You did it! That wasn't so hard, was it?"
            : 'Timer finished successfully.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={handleReset} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Do again
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              All done
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl bg-gradient-to-b ${themeColors.background}`}>
      {/* Hidden audio element for completion sound */}
      <audio
        ref={audioRef}
        src="/sounds/timer-complete.mp3"
        preload="auto"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full hover:bg-white/50 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-gray-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {onCancel && (
            <button
              onClick={handleCancel}
              className="p-2 rounded-full hover:bg-white/50 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Timer Circle */}
      <div className="relative w-64 h-64 mx-auto mb-8">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="128"
            cy="128"
            r="120"
            stroke={themeColors.secondary}
            strokeWidth="12"
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx="128"
            cy="128"
            r="120"
            stroke={themeColors.primary}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            initial={false}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-5xl font-bold text-gray-900"
            key={remainingSeconds}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.1 }}
          >
            {formatTime(remainingSeconds)}
          </motion.span>
          {childFriendly && remainingSeconds > 0 && (
            <span className="text-sm text-gray-500 mt-2">
              {remainingSeconds <= 10
                ? 'Almost there! 🌟'
                : remainingSeconds <= 30
                ? 'You got this! 💪'
                : 'Keep going! ✨'}
            </span>
          )}
        </div>
      </div>

      {/* Preset times */}
      {showPresets && !isRunning && (
        <div className="flex flex-wrap justify-center gap-2 mb-4 sm:mb-6">
          {PRESET_TIMES.map((preset) => (
            <button
              key={preset.minutes}
              onClick={() => handleSetTime(preset.minutes)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                totalSeconds === preset.minutes * 60
                  ? 'bg-white shadow-md text-gray-900'
                  : 'bg-white/50 text-gray-600 hover:bg-white/80'
              }`}
            >
              {childFriendly && <span className="mr-1">{preset.icon}</span>}
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-3 sm:gap-4">
        {!isRunning ? (
          <Button
            onClick={handleStart}
            size="lg"
            className="px-8"
            style={{ backgroundColor: themeColors.primary }}
          >
            <Play className="w-5 h-5 mr-2" />
            {childFriendly ? "Let's go!" : 'Start'}
          </Button>
        ) : (
          <Button onClick={handlePause} size="lg" variant="outline" className="px-8">
            <Pause className="w-5 h-5 mr-2" />
            Pause
          </Button>
        )}

        <Button onClick={handleReset} size="lg" variant="ghost">
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>

      {/* Encouragement for kids */}
      {childFriendly && !isRunning && remainingSeconds === totalSeconds && (
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-sm text-gray-600">
            Ready to wait? You'll earn{' '}
            <span className="font-medium text-amber-600">
              {rewardCoins} Calm {rewardCoins === 1 ? 'Coin' : 'Coins'}
            </span>{' '}
            when you finish! 🪙
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Quick Timer Component for simple use cases
 */
export function QuickTimer({
  minutes,
  onComplete,
}: {
  minutes: number;
  onComplete?: () => void;
}) {
  return (
    <Card className="p-3 sm:p-4">
      <VisualTimer
        initialMinutes={minutes}
        label={`${minutes} minute timer`}
        onComplete={onComplete}
        showPresets={false}
        childFriendly={false}
        rewardCoins={0}
      />
    </Card>
  );
}

export default VisualTimer;
