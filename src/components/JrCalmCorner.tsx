// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * JrCalmCorner — Tappy-style calm experience for Aminy Junior
 *
 * Features:
 * 1. Emotion check-in at entry ("How are you feeling?")
 * 2. Activity picker: Breathing, Body Scan, Nature Sounds, Bubble Pop, Grounding
 * 3. Guided breathing with concentric rings animation
 * 4. Ambient sound player (rain, ocean, campfire, forest)
 * 5. Token reward on completion
 * 6. Mood after check ("How do you feel now?")
 * 7. Parent sync of regulation success
 *
 * Access modes (set by parent):
 * - "always" — child can open calm corner anytime
 * - "earned" — child must spend tokens to access (except auto-triggered by fatigue)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Wind,
  Music,
  Waves,
  TreePine,
  Flame,
  CloudRain,
  Heart,
  Star,
  Sparkles,
  Hand,
  Circle
} from 'lucide-react';
import { playBreath, playTap, playComplete, haptic } from './junior/activities/sounds';

// ============================================
// TYPES
// ============================================

type Emotion = 'happy' | 'calm' | 'worried' | 'frustrated' | 'sad' | 'angry' | 'overwhelmed';
type CalmActivity = 'breathing' | 'body-scan' | 'sounds' | 'grounding' | 'bubble-pop';
type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'rest';
type AmbientSound = 'rain' | 'ocean' | 'campfire' | 'forest';

interface JrCalmCornerProps {
  onBack: () => void;
  onComplete?: (data: {
    emotionBefore: Emotion;
    emotionAfter: Emotion;
    activity: CalmActivity;
    durationSeconds: number;
  }) => void;
  buddyName?: string;
  accessMode?: 'always' | 'earned';
  autoTriggered?: boolean; // true if opened by fatigue/frustration detection
}

// ============================================
// CONSTANTS
// ============================================

const EMOTIONS: { id: Emotion; emoji: string; label: string; color: string }[] = [
  { id: 'happy', emoji: '😊', label: 'Happy', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'calm', emoji: '😌', label: 'Calm', color: 'bg-green-100 border-green-300' },
  { id: 'worried', emoji: '😰', label: 'Worried', color: 'bg-blue-100 border-blue-300' },
  { id: 'frustrated', emoji: '😤', label: 'Frustrated', color: 'bg-orange-100 border-orange-300' },
  { id: 'sad', emoji: '😢', label: 'Sad', color: 'bg-indigo-100 border-indigo-300' },
  { id: 'angry', emoji: '😡', label: 'Angry', color: 'bg-red-100 border-red-300' },
  { id: 'overwhelmed', emoji: '🤯', label: 'Too Much', color: 'bg-purple-100 border-purple-300' },
];

const CALM_ACTIVITIES: { id: CalmActivity; emoji: string; label: string; desc: string; color: string }[] = [
  { id: 'breathing', emoji: '🌬️', label: 'Breathing', desc: 'Follow the circle', color: 'from-blue-100 to-cyan-100' },
  { id: 'body-scan', emoji: '🧘', label: 'Body Scan', desc: 'Relax each part', color: 'from-purple-100 to-pink-100' },
  { id: 'sounds', emoji: '🎵', label: 'Calm Sounds', desc: 'Listen & relax', color: 'from-green-100 to-[#F0EDE8]' },
  { id: 'grounding', emoji: '🌳', label: 'Grounding', desc: '5-4-3-2-1', color: 'from-emerald-100 to-lime-100' },
  { id: 'bubble-pop', emoji: '🫧', label: 'Bubbles', desc: 'Pop to relax', color: 'from-sky-100 to-indigo-100' },
];

const AMBIENT_SOUNDS: { id: AmbientSound; emoji: string; label: string; Icon: React.ElementType }[] = [
  { id: 'rain', emoji: '🌧️', label: 'Rain', Icon: CloudRain },
  { id: 'ocean', emoji: '🌊', label: 'Ocean', Icon: Waves },
  { id: 'campfire', emoji: '🔥', label: 'Fire', Icon: Flame },
  { id: 'forest', emoji: '🌲', label: 'Forest', Icon: TreePine },
];

const BODY_SCAN_STEPS = [
  { part: 'feet', instruction: 'Wiggle your toes... now let them rest', emoji: '🦶' },
  { part: 'legs', instruction: 'Squeeze your legs tight... now relax', emoji: '🦵' },
  { part: 'tummy', instruction: 'Take a big belly breath... let it out', emoji: '🫄' },
  { part: 'hands', instruction: 'Make fists... now open your hands like starfish', emoji: '🤲' },
  { part: 'shoulders', instruction: 'Lift your shoulders to your ears... drop them down', emoji: '💪' },
  { part: 'face', instruction: 'Scrunch your face tight... now smile big', emoji: '😊' },
];

const GROUNDING_STEPS = [
  { count: 5, sense: 'SEE', instruction: 'Name 5 things you can see', emoji: '👀' },
  { count: 4, sense: 'TOUCH', instruction: 'Name 4 things you can touch', emoji: '✋' },
  { count: 3, sense: 'HEAR', instruction: 'Name 3 things you can hear', emoji: '👂' },
  { count: 2, sense: 'SMELL', instruction: 'Name 2 things you can smell', emoji: '👃' },
  { count: 1, sense: 'TASTE', instruction: 'Name 1 thing you can taste', emoji: '👅' },
];

// ============================================
// COMPONENT
// ============================================

export function JrCalmCorner({
  onBack,
  onComplete,
  buddyName = 'Aminy',
  accessMode = 'always',
  autoTriggered = false,
}: JrCalmCornerProps) {
  const [phase, setPhase] = useState<'check-in' | 'pick-activity' | 'activity' | 'check-out'>('check-in');
  const [emotionBefore, setEmotionBefore] = useState<Emotion | null>(null);
  const [emotionAfter, setEmotionAfter] = useState<Emotion | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<CalmActivity | null>(null);
  const [startTime] = useState(Date.now());

  // Breathing state
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale');
  const [breathCycle, setBreathCycle] = useState(0);

  // Body scan state
  const [bodyScanStep, setBodyScanStep] = useState(0);

  // Grounding state
  const [groundingStep, setGroundingStep] = useState(0);

  // Ambient sound state
  const [activeSound, setActiveSound] = useState<AmbientSound | null>(null);

  // Bubble state
  const [bubbles, setBubbles] = useState<{ id: number; x: number; y: number; size: number; popped: boolean }[]>([]);
  const bubbleIdRef = useRef(0);

  // ── Emotion Check-in ──
  const handleEmotionSelect = (emotion: Emotion) => {
    playTap();
    haptic(25);
    setEmotionBefore(emotion);
    setPhase('pick-activity');
  };

  // ── Activity Selection ──
  const handleActivitySelect = (activity: CalmActivity) => {
    playTap();
    haptic(30);
    setSelectedActivity(activity);
    setPhase('activity');
    if (activity === 'bubble-pop') {
      spawnBubbles();
    }
  };

  // ── Breathing Timer ──
  useEffect(() => {
    if (phase !== 'activity' || selectedActivity !== 'breathing') return;

    const phases: { phase: BreathPhase; duration: number }[] = [
      { phase: 'inhale', duration: 4000 },
      { phase: 'hold', duration: 2000 },
      { phase: 'exhale', duration: 6000 },
      { phase: 'rest', duration: 2000 },
    ];

    let currentIdx = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const advance = () => {
      currentIdx = (currentIdx + 1) % phases.length;
      setBreathPhase(phases[currentIdx].phase);
      // Gentle sound + haptic on each inhale cycle
      if (phases[currentIdx].phase === 'inhale') {
        playBreath();
        haptic(15);
        setBreathCycle(c => c + 1);
      }
      timeout = setTimeout(advance, phases[currentIdx].duration);
    };

    setBreathPhase('inhale');
    playBreath();
    haptic(15);
    timeout = setTimeout(advance, phases[0].duration);

    return () => clearTimeout(timeout);
  }, [phase, selectedActivity]);

  // ── Body Scan Timer ──
  useEffect(() => {
    if (phase !== 'activity' || selectedActivity !== 'body-scan') return;

    const interval = setInterval(() => {
      setBodyScanStep(prev => {
        if (prev >= BODY_SCAN_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 8000); // 8 seconds per body part

    return () => clearInterval(interval);
  }, [phase, selectedActivity]);

  // ── Bubble Pop ──
  const spawnBubbles = useCallback(() => {
    const newBubbles = Array.from({ length: 12 }, () => ({
      id: bubbleIdRef.current++,
      x: Math.random() * 80 + 10, // 10-90%
      y: Math.random() * 60 + 20, // 20-80%
      size: Math.random() * 40 + 30, // 30-70px
      popped: false,
    }));
    setBubbles(newBubbles);
  }, []);

  const popBubble = (id: number) => {
    setBubbles(prev => prev.map(b => b.id === id ? { ...b, popped: true } : b));
    // Respawn after all popped
    setTimeout(() => {
      setBubbles(prev => {
        if (prev.every(b => b.popped)) {
          return Array.from({ length: 12 }, () => ({
            id: bubbleIdRef.current++,
            x: Math.random() * 80 + 10,
            y: Math.random() * 60 + 20,
            size: Math.random() * 40 + 30,
            popped: false,
          }));
        }
        return prev;
      });
    }, 500);
  };

  // ── Completion ──
  const handleCheckOut = (emotion: Emotion) => {
    playComplete();
    haptic([60, 30, 60, 30, 120]);
    setEmotionAfter(emotion);
    const duration = Math.round((Date.now() - startTime) / 1000);

    onComplete?.({
      emotionBefore: emotionBefore!,
      emotionAfter: emotion,
      activity: selectedActivity!,
      durationSeconds: duration,
    });

    // Brief celebration then exit
    setTimeout(() => onBack(), 2000);
  };

  const handleDone = () => {
    setPhase('check-out');
  };

  // ── Breath label helper ──
  const breathLabel = () => {
    switch (breathPhase) {
      case 'inhale': return 'Breathe in...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe out...';
      case 'rest': return 'Rest...';
    }
  };

  const breathScale = () => {
    switch (breathPhase) {
      case 'inhale': return 1.4;
      case 'hold': return 1.4;
      case 'exhale': return 1;
      case 'rest': return 1;
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-blue-50 relative overflow-hidden">
      {/* Floating background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-16 h-16 rounded-full bg-white/30"
            style={{ left: `${15 + i * 15}%`, top: `${10 + (i % 3) * 30}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 pt-4 pb-2 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-10 h-10 bg-white/60 backdrop-blur rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-[#6B9080]" />
        </motion.button>
        <div>
          <h1 className="text-lg font-bold text-indigo-800">🫧 Calm Corner</h1>
          {autoTriggered && (
            <p className="text-sm text-indigo-500">{buddyName} thinks you need a break</p>
          )}
        </div>
      </div>

      <div className="relative z-10 px-4 pb-8">
        <AnimatePresence mode="wait">
          {/* ── Phase 1: Emotion Check-in ── */}
          {phase === 'check-in' && (
            <motion.div
              key="check-in"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center pt-8"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl mb-4"
              >
                💭
              </motion.div>
              <h2 className="text-2xl font-bold text-indigo-800 mb-2">How are you feeling?</h2>
              <p className="text-[#6B9080] mb-8 text-sm">It's okay to feel any way. Tap how you feel right now.</p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-md mx-auto">
                {EMOTIONS.map(emotion => (
                  <motion.button
                    key={emotion.id}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEmotionSelect(emotion.id)}
                    className={`${emotion.color} border-2 rounded-2xl p-3 flex flex-col items-center gap-1 transition-shadow hover:shadow-md`}
                  >
                    <span className="text-3xl">{emotion.emoji}</span>
                    <span className="text-sm font-medium text-[#3A4A57]">{emotion.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Phase 2: Activity Picker ── */}
          {phase === 'pick-activity' && (
            <motion.div
              key="pick-activity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center pt-6"
            >
              <h2 className="text-xl font-bold text-indigo-800 mb-2">What would help?</h2>
              <p className="text-[#6B9080] mb-6 text-sm">Pick something that feels right</p>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                {CALM_ACTIVITIES.map(activity => (
                  <motion.button
                    key={activity.id}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleActivitySelect(activity.id)}
                    className={`bg-gradient-to-br ${activity.color} rounded-2xl p-4 text-left border border-white/50 shadow-sm`}
                  >
                    <span className="text-3xl block mb-2">{activity.emoji}</span>
                    <p className="font-semibold text-[#132F43] text-sm">{activity.label}</p>
                    <p className="text-sm text-[#5A6B7A]">{activity.desc}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Phase 3: Activities ── */}
          {phase === 'activity' && selectedActivity === 'breathing' && (
            <motion.div
              key="breathing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center pt-12"
            >
              {/* Concentric breathing rings */}
              <div className="relative w-48 h-48 mx-auto mb-8">
                {/* Outer ring */}
                <motion.div
                  animate={{ scale: breathScale(), opacity: [0.15, 0.25, 0.15] }}
                  transition={{ duration: breathPhase === 'inhale' ? 4 : breathPhase === 'exhale' ? 6 : 2, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-200 to-purple-200"
                />
                {/* Middle ring */}
                <motion.div
                  animate={{ scale: breathScale() * 0.85, opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: breathPhase === 'inhale' ? 4 : breathPhase === 'exhale' ? 6 : 2, ease: 'easeInOut', delay: 0.1 }}
                  className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-300 to-indigo-300"
                />
                {/* Inner ring */}
                <motion.div
                  animate={{ scale: breathScale() * 0.7, opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: breathPhase === 'inhale' ? 4 : breathPhase === 'exhale' ? 6 : 2, ease: 'easeInOut', delay: 0.2 }}
                  className="absolute inset-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center"
                >
                  <Wind className="w-10 h-10 text-white" />
                </motion.div>
              </div>

              <motion.p
                key={breathPhase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-medium text-indigo-700 mb-2"
              >
                {breathLabel()}
              </motion.p>
              <p className="text-indigo-400 text-sm mb-8">Cycle {breathCycle + 1}</p>

              {breathCycle >= 3 && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDone}
                  className="bg-indigo-500 text-white px-8 py-3 rounded-2xl font-medium shadow-lg"
                >
                  I feel better now 😌
                </motion.button>
              )}
            </motion.div>
          )}

          {phase === 'activity' && selectedActivity === 'body-scan' && (
            <motion.div
              key="body-scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center pt-8"
            >
              <div className="max-w-sm mx-auto">
                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-6">
                  {BODY_SCAN_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        i <= bodyScanStep ? 'bg-purple-500' : 'bg-purple-200'
                      }`}
                    />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={bodyScanStep}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white/60 backdrop-blur rounded-3xl p-8"
                  >
                    <span className="text-6xl block mb-4">{BODY_SCAN_STEPS[bodyScanStep].emoji}</span>
                    <h3 className="text-lg font-bold text-purple-800 mb-2 capitalize">
                      {BODY_SCAN_STEPS[bodyScanStep].part}
                    </h3>
                    <p className="text-purple-600">{BODY_SCAN_STEPS[bodyScanStep].instruction}</p>
                  </motion.div>
                </AnimatePresence>

                {bodyScanStep >= BODY_SCAN_STEPS.length - 1 && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDone}
                    className="mt-6 bg-purple-500 text-white px-8 py-3 rounded-2xl font-medium shadow-lg"
                  >
                    All done! 🧘
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'activity' && selectedActivity === 'sounds' && (
            <motion.div
              key="sounds"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center pt-8"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-6xl mb-6"
              >
                🎶
              </motion.div>
              <h3 className="text-xl font-bold text-[#6B9080] mb-2">Pick a sound</h3>
              <p className="text-[#6B9080] text-sm mb-6">Close your eyes and listen</p>

              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-8">
                {AMBIENT_SOUNDS.map(sound => {
                  const isActive = activeSound === sound.id;
                  return (
                    <motion.button
                      key={sound.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveSound(isActive ? null : sound.id)}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                        isActive
                          ? 'bg-[#6B9080]/10 border-[#6B9080] shadow-md'
                          : 'bg-white/50 border-white/50'
                      }`}
                    >
                      <span className="text-3xl">{sound.emoji}</span>
                      <span className="text-sm font-medium text-[#3A4A57]">{sound.label}</span>
                      {isActive && (
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="flex gap-0.5"
                        >
                          {[1, 2, 3, 4].map(i => (
                            <motion.div
                              key={i}
                              animate={{ height: [4, 12 + Math.random() * 8, 4] }}
                              transition={{ duration: 0.6 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1 bg-primary rounded-full"
                            />
                          ))}
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDone}
                className="bg-primary text-white px-8 py-3 rounded-2xl font-medium shadow-lg"
              >
                I'm ready to go back 🌟
              </motion.button>
            </motion.div>
          )}

          {phase === 'activity' && selectedActivity === 'grounding' && (
            <motion.div
              key="grounding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center pt-8"
            >
              <h3 className="text-lg font-bold text-emerald-800 mb-2">5-4-3-2-1 Grounding</h3>
              <p className="text-emerald-600 text-sm mb-6">Use your senses to feel present</p>

              <AnimatePresence mode="wait">
                <motion.div
                  key={groundingStep}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="bg-white/60 backdrop-blur rounded-3xl p-8 max-w-sm mx-auto"
                >
                  <span className="text-5xl block mb-4">{GROUNDING_STEPS[groundingStep].emoji}</span>
                  <div className="text-4xl font-black text-emerald-600 mb-2">
                    {GROUNDING_STEPS[groundingStep].count}
                  </div>
                  <p className="text-sm text-emerald-500 uppercase tracking-wide mb-2">
                    {GROUNDING_STEPS[groundingStep].sense}
                  </p>
                  <p className="text-emerald-700">{GROUNDING_STEPS[groundingStep].instruction}</p>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-3 mt-6">
                {groundingStep > 0 && (
                  <button
                    onClick={() => setGroundingStep(prev => prev - 1)}
                    className="px-6 py-2 bg-white/50 text-emerald-700 rounded-xl font-medium"
                  >
                    Back
                  </button>
                )}
                {groundingStep < GROUNDING_STEPS.length - 1 ? (
                  <button
                    onClick={() => setGroundingStep(prev => prev + 1)}
                    className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-medium shadow-md"
                  >
                    Next →
                  </button>
                ) : (
                  <motion.button
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDone}
                    className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-medium shadow-lg"
                  >
                    All done! 🌳
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'activity' && selectedActivity === 'bubble-pop' && (
            <motion.div
              key="bubble-pop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative min-h-[60vh]"
            >
              <p className="text-center text-sky-700 font-medium mb-4">Pop the bubbles! 🫧</p>

              {bubbles.map(bubble => !bubble.popped && (
                <motion.button
                  key={bubble.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 0.8,
                    y: [0, -10, 0],
                  }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{
                    y: { duration: 2 + Math.random(), repeat: Infinity, ease: 'easeInOut' },
                    scale: { duration: 0.3 },
                  }}
                  whileTap={{ scale: 0 }}
                  onClick={() => popBubble(bubble.id)}
                  className="absolute rounded-full bg-gradient-to-br from-sky-200/80 to-indigo-200/80 border-2 border-white/50 shadow-lg"
                  style={{
                    left: `${bubble.x}%`,
                    top: `${bubble.y}%`,
                    width: bubble.size,
                    height: bubble.size,
                  }}
                />
              ))}

              <div className="absolute bottom-4 left-0 right-0 text-center">
                <button
                  onClick={handleDone}
                  className="bg-sky-500 text-white px-8 py-3 rounded-2xl font-medium shadow-lg"
                >
                  I feel calmer now 😌
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Phase 4: Mood Check-out ── */}
          {phase === 'check-out' && (
            <motion.div
              key="check-out"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center pt-8"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: 2 }}
                className="text-5xl mb-4"
              >
                ⭐
              </motion.div>
              <h2 className="text-2xl font-bold text-indigo-800 mb-2">Great job!</h2>
              <p className="text-[#6B9080] mb-6 text-sm">How do you feel now?</p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-md mx-auto">
                {EMOTIONS.map(emotion => (
                  <motion.button
                    key={emotion.id}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCheckOut(emotion.id)}
                    className={`${emotion.color} border-2 rounded-2xl p-3 flex flex-col items-center gap-1 transition-shadow hover:shadow-md`}
                  >
                    <span className="text-3xl">{emotion.emoji}</span>
                    <span className="text-sm font-medium text-[#3A4A57]">{emotion.label}</span>
                  </motion.button>
                ))}
              </div>

              {emotionAfter && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 bg-white/60 backdrop-blur rounded-2xl p-6"
                >
                  <Sparkles className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="font-medium text-indigo-800">You earned a calm coin! 🪙</p>
                  <p className="text-sm text-indigo-500 mt-1">Great self-regulation!</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default JrCalmCorner;
