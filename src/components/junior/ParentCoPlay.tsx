// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Parent Co-Play Mode — Split/Overlay View for Guided Activities
 *
 * Provides a side-by-side or overlay interface where the parent:
 *   1. Sees the current activity instructions and prompting hierarchy
 *   2. Follows evidence-based ABA prompting: Independent → Gestural → Verbal → Model → Physical
 *   3. Marks child responses (correct, prompted, independent) in real time
 *   4. Gets real-time progress feedback and adaptive suggestions
 *   5. Feeds all data back to the insights bridge for AI consumption
 *
 * Layout modes:
 *   - 'split'   — Top half: activity preview. Bottom half: parent controls.
 *   - 'overlay'  — Activity full screen with floating parent panel.
 *
 * Navigation:
 *   This is a subview within the Junior screen, controlled by an `isCoPlayActive`
 *   prop toggle. It does NOT use React Router (per project architecture rules).
 *
 * Usage:
 *   <ParentCoPlay
 *     childId="uuid"
 *     childName="Eddie"
 *     activityId="speech-mirror-me"
 *     activityTitle="Mirror Me Sounds"
 *     skillDomain="speech"
 *     onComplete={(results) => handleActivityComplete(results)}
 *     onExit={() => setCoPlayActive(false)}
 *   />
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  Hand,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
  TrendingUp,
  Pause,
  Play,
  Eye,
  MessageSquare,
  ThumbsUp,
  RotateCw,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import type { FocusDomain } from '../../lib/parent-junior-bridge';

// ============================================================================
// Types
// ============================================================================

/** ABA-standard prompting hierarchy (least-to-most support) */
export type PromptLevel =
  | 'independent'  // Child does it alone
  | 'gestural'     // Point, nod, or visual cue
  | 'verbal'       // Verbal instruction or hint
  | 'model'        // Demonstrate the expected response
  | 'physical';    // Hand-over-hand or physical guidance

export interface TrialResult {
  trialNumber: number;
  promptLevel: PromptLevel;
  response: 'correct' | 'incorrect' | 'no_response';
  reactionTimeMs: number | null;
  timestamp: string;
  notes: string;
}

export interface CoPlaySessionResult {
  activityId: string;
  childId: string;
  childName: string;
  domain: FocusDomain;
  startedAt: string;
  completedAt: string;
  totalTrials: number;
  correctTrials: number;
  independentTrials: number;
  promptedTrials: number;
  averagePromptLevel: number; // 0 = independent, 4 = physical
  trials: TrialResult[];
  sessionDurationMinutes: number;
  parentNotes: string;
}

export interface ParentCoPlayProps {
  childId: string;
  childName: string;
  activityId: string;
  activityTitle: string;
  activityDescription?: string;
  skillDomain: FocusDomain;
  /** Number of trials (repetitions) in this activity */
  totalTrials?: number;
  /** Layout mode: split (top/bottom) or overlay (floating panel) */
  layoutMode?: 'split' | 'overlay';
  /** Called when all trials are completed */
  onComplete: (results: CoPlaySessionResult) => void;
  /** Called when parent exits early */
  onExit: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const PROMPT_LEVELS: { level: PromptLevel; label: string; description: string; icon: React.ReactNode }[] = [
  { level: 'independent', label: 'Independent', description: 'Child responds without help', icon: <Star className="w-4 h-4" /> },
  { level: 'gestural', label: 'Gestural', description: 'Point, nod, or visual cue', icon: <Hand className="w-4 h-4" /> },
  { level: 'verbal', label: 'Verbal', description: 'Verbal hint or instruction', icon: <MessageSquare className="w-4 h-4" /> },
  { level: 'model', label: 'Model', description: 'Demonstrate the expected response', icon: <Eye className="w-4 h-4" /> },
  { level: 'physical', label: 'Physical', description: 'Hand-over-hand guidance', icon: <HelpCircle className="w-4 h-4" /> },
];

const PROMPT_LEVEL_INDEX: Record<PromptLevel, number> = {
  independent: 0,
  gestural: 1,
  verbal: 2,
  model: 3,
  physical: 4,
};

const DOMAIN_TIPS: Partial<Record<FocusDomain, string[]>> = {
  speech: [
    'Wait 3-5 seconds for the child to respond before prompting',
    'Model the sound clearly at the child\'s eye level',
    'Celebrate approximations — close enough counts!',
    'If frustrated, switch to a preferred sound or word',
  ],
  social: [
    'Use natural opportunities — don\'t force eye contact',
    'Narrate social cues: "Look, she\'s smiling — she likes that!"',
    'Practice turn-taking with a preferred toy first',
    'Social scripts work best when rehearsed in calm moments',
  ],
  regulation: [
    'Name the emotion before asking to regulate: "I see you\'re frustrated"',
    'Offer two calming strategy choices, not just one',
    'Deep breathing works best when you model it together',
    'Time visual timers to show "calm time" duration',
  ],
  sensory: [
    'Follow the child\'s lead — never force sensory input',
    'Heavy work (pushing, pulling, carrying) is naturally calming',
    'Watch for signs of overload: covering ears, turning away',
    'End on a calm note, even if cutting the activity short',
  ],
  executive: [
    'Break multi-step tasks into single visible steps',
    'Use a "first-then" board: "First puzzle, then play"',
    'Celebrate completing each step, not just the final result',
    'Keep transitions predictable with consistent cues',
  ],
  routines: [
    'Use the same language every time for routine steps',
    'Visual schedules reduce verbal prompting over time',
    'Practice routines when calm, not during real transitions',
    'Fade prompts gradually — don\'t go cold turkey',
  ],
  aac: [
    'Always model on the AAC device before expecting the child to use it',
    'Pause and wait — give processing time before offering help',
    'Honor ALL communication attempts, even if not on the device',
    'Keep the device accessible at all times',
  ],
};

// ============================================================================
// Component
// ============================================================================

export function ParentCoPlay({
  childId,
  childName,
  activityId,
  activityTitle,
  activityDescription,
  skillDomain,
  totalTrials = 10,
  layoutMode = 'split',
  onComplete,
  onExit,
}: ParentCoPlayProps) {
  // Session state
  const [currentTrial, setCurrentTrial] = useState(1);
  const [trials, setTrials] = useState<TrialResult[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPromptLevel, setSelectedPromptLevel] = useState<PromptLevel>('independent');
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [parentNotes, setParentNotes] = useState('');
  const [trialStartTime, setTrialStartTime] = useState<number>(Date.now());

  // Session timing
  const sessionStartRef = useRef(new Date().toISOString());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Reset trial start time when trial changes
  useEffect(() => {
    setTrialStartTime(Date.now());
  }, [currentTrial]);

  // Domain-specific tips
  const tips = useMemo(() => DOMAIN_TIPS[skillDomain] || [], [skillDomain]);
  const currentTip = useMemo(() => {
    if (tips.length === 0) return null;
    return tips[(currentTrial - 1) % tips.length];
  }, [tips, currentTrial]);

  // Stats
  const correctCount = trials.filter(t => t.response === 'correct').length;
  const independentCount = trials.filter(t => t.response === 'correct' && t.promptLevel === 'independent').length;
  const accuracy = trials.length > 0 ? Math.round((correctCount / trials.length) * 100) : 0;

  const isComplete = currentTrial > totalTrials;

  // ========================================================================
  // Record a trial
  // ========================================================================

  const recordTrial = useCallback((response: 'correct' | 'incorrect' | 'no_response') => {
    const now = Date.now();
    const reactionTimeMs = now - trialStartTime;

    const result: TrialResult = {
      trialNumber: currentTrial,
      promptLevel: selectedPromptLevel,
      response,
      reactionTimeMs,
      timestamp: new Date().toISOString(),
      notes: '',
    };

    setTrials(prev => [...prev, result]);
    setCurrentTrial(prev => prev + 1);
    setSelectedPromptLevel('independent'); // Reset for next trial
  }, [currentTrial, selectedPromptLevel, trialStartTime]);

  // ========================================================================
  // Complete session
  // ========================================================================

  const handleComplete = useCallback(() => {
    const completedTrials = trials;
    const avgPromptLevel = completedTrials.length > 0
      ? completedTrials.reduce((sum, t) => sum + PROMPT_LEVEL_INDEX[t.promptLevel], 0) / completedTrials.length
      : 0;

    const result: CoPlaySessionResult = {
      activityId,
      childId,
      childName,
      domain: skillDomain,
      startedAt: sessionStartRef.current,
      completedAt: new Date().toISOString(),
      totalTrials: completedTrials.length,
      correctTrials: completedTrials.filter(t => t.response === 'correct').length,
      independentTrials: completedTrials.filter(t => t.response === 'correct' && t.promptLevel === 'independent').length,
      promptedTrials: completedTrials.filter(t => t.response === 'correct' && t.promptLevel !== 'independent').length,
      averagePromptLevel: Math.round(avgPromptLevel * 10) / 10,
      trials: completedTrials,
      sessionDurationMinutes: Math.round(elapsedSeconds / 60 * 10) / 10,
      parentNotes,
    };

    onComplete(result);
  }, [trials, activityId, childId, childName, skillDomain, elapsedSeconds, parentNotes, onComplete]);

  // ========================================================================
  // Format time
  // ========================================================================

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ========================================================================
  // Render: Completion Screen
  // ========================================================================

  if (isComplete) {
    const avgPrompt = trials.length > 0
      ? trials.reduce((sum, t) => sum + PROMPT_LEVEL_INDEX[t.promptLevel], 0) / trials.length
      : 0;
    const avgPromptLabel = PROMPT_LEVELS[Math.round(avgPrompt)]?.label || 'N/A';

    return (
      <div className="flex flex-col h-full bg-[#F8F8F6] p-4">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, type: 'spring' }}
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <h2 className="text-xl font-bold text-[#0D1B2A] mb-1">Session Complete!</h2>
          <p className="text-sm text-slate-500 mb-6">Great work with {childName}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-bold text-[#43AA8B]">{accuracy}%</div>
              <div className="text-xs text-slate-500">Accuracy</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-bold text-[#43AA8B]">{independentCount}/{trials.length}</div>
              <div className="text-xs text-slate-500">Independent</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-bold text-slate-500">{avgPromptLabel}</div>
              <div className="text-xs text-slate-500">Avg Prompt</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-bold text-slate-500">{formatTime(elapsedSeconds)}</div>
              <div className="text-xs text-slate-500">Duration</div>
            </div>
          </div>

          {/* Per-trial breakdown */}
          <div className="w-full max-w-xs mb-6">
            <h3 className="text-sm font-semibold text-[#0D1B2A] mb-2 text-left">Trial Breakdown</h3>
            <div className="flex flex-wrap gap-1.5">
              {trials.map((trial, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium ${
                    trial.response === 'correct' && trial.promptLevel === 'independent'
                      ? 'bg-green-100 text-green-700'
                      : trial.response === 'correct'
                        ? 'bg-blue-100 text-blue-700'
                        : trial.response === 'no_response'
                          ? 'bg-[#F0EDE8] text-gray-500'
                          : 'bg-red-100 text-red-700'
                  }`}
                  title={`Trial ${trial.trialNumber}: ${trial.response} (${trial.promptLevel})`}
                >
                  {trial.response === 'correct' ? (trial.promptLevel === 'independent' ? '\u2605' : '\u2713') : trial.response === 'no_response' ? '-' : '\u2717'}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400" /> Independent</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400" /> Prompted</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400" /> Incorrect</span>
            </div>
          </div>

          {/* Parent Notes */}
          <div className="w-full max-w-xs mb-4">
            <label className="text-sm font-semibold text-[#0D1B2A] mb-1 block text-left">Session Notes (optional)</label>
            <textarea
              value={parentNotes}
              onChange={(e) => setParentNotes(e.target.value)}
              placeholder="Any observations about today's session..."
              className="w-full p-3 rounded-xl border border-gray-200 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#43AA8B]/30"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={handleComplete}
              className="flex-1 py-3 bg-[#43AA8B] text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
            >
              Save & Finish
            </button>
            <button
              onClick={onExit}
              className="px-4 py-3 bg-[#F0EDE8] text-slate-500 rounded-xl font-medium text-sm active:scale-95 transition-transform"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // Render: Active Session
  // ========================================================================

  const isSplitMode = layoutMode === 'split';

  return (
    <div className={`flex flex-col h-full bg-[#F8F8F6] ${isSplitMode ? '' : 'relative'}`}>

      {/* ================================================================ */}
      {/* Header Bar */}
      {/* ================================================================ */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button
          onClick={onExit}
          className="flex items-center gap-1 text-sm text-slate-500 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit
        </button>

        <div className="text-center">
          <div className="text-sm font-semibold text-[#0D1B2A]">{activityTitle}</div>
          <div className="text-xs text-slate-500">
            Trial {currentTrial} of {totalTrials} &middot; {formatTime(elapsedSeconds)}
          </div>
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-1.5 rounded-lg bg-[#F0EDE8] active:scale-95 transition-transform"
        >
          {isPaused ? <Play className="w-4 h-4 text-[#43AA8B]" /> : <Pause className="w-4 h-4 text-slate-500" />}
        </button>
      </div>

      {/* Paused overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#0D1B2A]/70 flex items-center justify-center"
          >
            <div className="bg-white rounded-2xl p-6 text-center max-w-[280px]">
              <Pause className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <h3 className="font-bold text-[#0D1B2A] mb-1">Session Paused</h3>
              <p className="text-sm text-slate-500 mb-4">Take a break. {childName} is doing great!</p>
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-2.5 bg-[#43AA8B] text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              >
                Resume
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* Progress Bar */}
      {/* ================================================================ */}
      <div className="px-4 py-2 bg-white">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#43AA8B] rounded-full"
              initial={false}
              animate={{ width: `${((currentTrial - 1) / totalTrials) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500">{accuracy}%</span>
        </div>

        {/* Mini stats */}
        <div className="flex justify-between mt-1.5 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" /> {correctCount} correct
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500" /> {independentCount} independent
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-500" /> {trials.length} done
          </span>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Activity Preview Area (top half in split mode) */}
      {/* ================================================================ */}
      {isSplitMode && (
        <div className="flex-1 min-h-0 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-sm w-full max-w-xs text-center">
            <div className="text-3xl mb-3">{getDomainEmoji(skillDomain)}</div>
            <h3 className="font-bold text-[#0D1B2A] text-lg mb-1">{activityTitle}</h3>
            {activityDescription && (
              <p className="text-sm text-slate-500 mb-3">{activityDescription}</p>
            )}
            <div className="text-4xl font-bold text-[#43AA8B]">{currentTrial}</div>
            <div className="text-xs text-slate-500 mt-1">Current Trial</div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Parent Controls Panel */}
      {/* ================================================================ */}
      <div className={`${isSplitMode ? '' : 'flex-1'} bg-white rounded-t-2xl shadow-lg border-t border-gray-100 p-4`}>

        {/* Domain Tip */}
        <AnimatePresence>
          {showTips && currentTip && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-amber-800">{currentTip}</div>
                </div>
                <button onClick={() => setShowTips(false)} className="text-amber-400 text-xs">hide</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prompt Level Selector */}
        <div className="mb-3">
          <button
            onClick={() => setShowPromptDetails(!showPromptDetails)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-xs font-semibold text-[#0D1B2A] uppercase tracking-wide">Prompt Level</span>
            {showPromptDetails ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
          </button>

          <div className="flex gap-1.5 mt-2">
            {PROMPT_LEVELS.map(({ level, label, icon }) => (
              <button
                key={level}
                onClick={() => setSelectedPromptLevel(level)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-all active:scale-95 ${
                  selectedPromptLevel === level
                    ? 'bg-[#43AA8B] text-white shadow-sm'
                    : 'bg-[#FAF7F2] text-slate-500'
                }`}
              >
                {icon}
                <span className="font-medium leading-tight">{label.slice(0, 6)}</span>
              </button>
            ))}
          </div>

          {/* Prompt details (expandable) */}
          <AnimatePresence>
            {showPromptDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-3 bg-[#FAF7F2] rounded-xl">
                  {PROMPT_LEVELS.map(({ level, label, description, icon }) => (
                    <div
                      key={level}
                      className={`flex items-center gap-2 py-1.5 ${level === selectedPromptLevel ? 'text-[#43AA8B] font-medium' : 'text-slate-500'}`}
                    >
                      {icon}
                      <div>
                        <div className="text-xs font-medium">{label}</div>
                        <div className="text-xs opacity-70">{description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Response Buttons */}
        <div className="mb-3">
          <div className="text-xs font-semibold text-[#0D1B2A] uppercase tracking-wide mb-2">
            {childName}&apos;s Response
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => recordTrial('correct')}
              className="flex flex-col items-center gap-1.5 py-3 bg-green-50 rounded-xl text-green-700 active:scale-95 active:bg-green-100 transition-all"
            >
              <CheckCircle className="w-6 h-6" />
              <span className="text-xs font-semibold">Correct</span>
            </button>
            <button
              onClick={() => recordTrial('incorrect')}
              className="flex flex-col items-center gap-1.5 py-3 bg-red-50 rounded-xl text-red-600 active:scale-95 active:bg-red-100 transition-all"
            >
              <XCircle className="w-6 h-6" />
              <span className="text-xs font-semibold">Incorrect</span>
            </button>
            <button
              onClick={() => recordTrial('no_response')}
              className="flex flex-col items-center gap-1.5 py-3 bg-[#FAF7F2] rounded-xl text-gray-500 active:scale-95 active:bg-[#F0EDE8] transition-all"
            >
              <Clock className="w-6 h-6" />
              <span className="text-xs font-semibold">No Response</span>
            </button>
          </div>
        </div>

        {/* Quick action row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowTips(!showTips)}
            className="flex items-center gap-1 text-xs text-slate-500 active:scale-95"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {showTips ? 'Hide tips' : 'Show tips'}
          </button>

          {trials.length > 0 && (
            <button
              onClick={() => {
                setTrials(prev => prev.slice(0, -1));
                setCurrentTrial(prev => prev - 1);
              }}
              className="flex items-center gap-1 text-xs text-[#E07A5F] active:scale-95"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Undo last
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper
// ============================================================================

function getDomainEmoji(domain: FocusDomain): string {
  const map: Partial<Record<FocusDomain, string>> = {
    speech: '\uD83D\uDDE3\uFE0F',
    social: '\uD83E\uDD1D',
    regulation: '\uD83E\uDDD8',
    routines: '\uD83D\uDCC5',
    sensory: '\uD83C\uDF08',
    executive: '\uD83E\uDDE9',
    aac: '\uD83D\uDCAC',
  };
  return map[domain] || '\u2B50';
}

// ============================================================================
// Exports
// ============================================================================

export default ParentCoPlay;
