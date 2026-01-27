/**
 * IntervalRecording.tsx
 *
 * Professional interval recording for BCBAs and behavior analysts.
 * Implements partial interval, whole interval, and momentary time sampling methods.
 *
 * Features:
 * - Configurable interval duration (5, 10, 15, 30 seconds)
 * - Multiple recording methods (partial, whole, momentary)
 * - Multi-behavior tracking
 * - Visual/audio cues for interval boundaries
 * - Session summary with IOA calculations
 * - Export to professional format
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Volume2,
  VolumeX,
  Settings,
  Download,
  ArrowLeft,
  Plus,
  Trash2,
  BarChart3,
  Timer,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export type RecordingMethod = 'partial' | 'whole' | 'momentary';

export interface BehaviorDefinition {
  id: string;
  name: string;
  operationalDefinition: string;
  examples: string[];
  nonExamples: string[];
  color: string;
}

export interface IntervalData {
  intervalNumber: number;
  startTime: number; // ms from session start
  endTime: number;
  behaviors: Record<string, boolean>; // behaviorId -> occurred
  notes?: string;
}

export interface IntervalSession {
  id: string;
  childId: string;
  childName: string;
  observerId: string;
  observerName: string;
  recordingMethod: RecordingMethod;
  intervalDuration: number; // seconds
  behaviors: BehaviorDefinition[];
  intervals: IntervalData[];
  totalDuration: number; // ms
  startedAt: string;
  completedAt?: string;
  notes?: string;
  setting?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INTERVAL_DURATIONS = [
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
];

const RECORDING_METHODS: { value: RecordingMethod; label: string; description: string }[] = [
  {
    value: 'partial',
    label: 'Partial Interval',
    description: 'Record YES if behavior occurs at any point during the interval',
  },
  {
    value: 'whole',
    label: 'Whole Interval',
    description: 'Record YES only if behavior occurs throughout the entire interval',
  },
  {
    value: 'momentary',
    label: 'Momentary Time Sampling',
    description: 'Record YES only if behavior is occurring at the exact moment the interval ends',
  },
];

const BEHAVIOR_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

// ============================================================================
// COMPONENT
// ============================================================================

interface IntervalRecordingProps {
  childId: string;
  childName: string;
  observerId: string;
  observerName: string;
  onBack?: () => void;
  onSessionComplete?: (session: IntervalSession) => void;
}

export function IntervalRecording({
  childId,
  childName,
  observerId,
  observerName,
  onBack,
  onSessionComplete,
}: IntervalRecordingProps) {
  // Session configuration
  const [recordingMethod, setRecordingMethod] = useState<RecordingMethod>('partial');
  const [intervalDuration, setIntervalDuration] = useState(10);
  const [behaviors, setBehaviors] = useState<BehaviorDefinition[]>([]);
  const [showSettings, setShowSettings] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Session state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [intervalProgress, setIntervalProgress] = useState(0);
  const [intervals, setIntervals] = useState<IntervalData[]>([]);
  const [currentBehaviors, setCurrentBehaviors] = useState<Record<string, boolean>>({});

  // New behavior form
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [newBehaviorDefinition, setNewBehaviorDefinition] = useState('');

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/interval-end.mp3');
      // Fallback: use Web Audio API beep
      if (!audioRef.current.canPlayType('audio/mpeg')) {
        audioRef.current = null;
      }
    }
  }, []);

  // Play beep sound
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;

    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    } else {
      // Web Audio API fallback
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 880; // A5
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (e) {
        // Audio not supported
      }
    }
  }, [soundEnabled]);

  // Timer effect
  useEffect(() => {
    if (!isRunning || isPaused || !sessionStartTime) {
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - sessionStartTime;
      const intervalMs = intervalDuration * 1000;
      const currentIntervalNumber = Math.floor(elapsed / intervalMs) + 1;
      const progressInInterval = (elapsed % intervalMs) / intervalMs;

      setIntervalProgress(progressInInterval * 100);

      // Check if we've moved to a new interval
      if (currentIntervalNumber > currentInterval && currentInterval > 0) {
        // Record the completed interval
        completeInterval();
        playBeep();
      }

      setCurrentInterval(currentIntervalNumber);
    };

    timerRef.current = setInterval(updateTimer, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isPaused, sessionStartTime, intervalDuration, currentInterval, playBeep]);

  // Complete current interval
  const completeInterval = useCallback(() => {
    const now = Date.now();
    const intervalMs = intervalDuration * 1000;
    const intervalNumber = currentInterval;

    const intervalData: IntervalData = {
      intervalNumber,
      startTime: (intervalNumber - 1) * intervalMs,
      endTime: intervalNumber * intervalMs,
      behaviors: { ...currentBehaviors },
    };

    setIntervals(prev => [...prev, intervalData]);
    setCurrentBehaviors({}); // Reset for next interval
  }, [currentInterval, currentBehaviors, intervalDuration]);

  // Add a new behavior to track
  const addBehavior = () => {
    if (!newBehaviorName.trim()) {
      toast.error('Please enter a behavior name');
      return;
    }

    const newBehavior: BehaviorDefinition = {
      id: `behavior-${Date.now()}`,
      name: newBehaviorName.trim(),
      operationalDefinition: newBehaviorDefinition.trim() || 'No definition provided',
      examples: [],
      nonExamples: [],
      color: BEHAVIOR_COLORS[behaviors.length % BEHAVIOR_COLORS.length],
    };

    setBehaviors(prev => [...prev, newBehavior]);
    setNewBehaviorName('');
    setNewBehaviorDefinition('');
  };

  // Remove a behavior
  const removeBehavior = (behaviorId: string) => {
    setBehaviors(prev => prev.filter(b => b.id !== behaviorId));
  };

  // Start the session
  const startSession = () => {
    if (behaviors.length === 0) {
      toast.error('Please add at least one behavior to track');
      return;
    }

    setShowSettings(false);
    setSessionStartTime(Date.now());
    setCurrentInterval(1);
    setIntervalProgress(0);
    setIntervals([]);
    setCurrentBehaviors({});
    setIsRunning(true);
    setIsPaused(false);
  };

  // Pause/resume
  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused && sessionStartTime) {
      // Adjust start time to account for pause duration
      // (simplified - in production would track pause duration)
    }
  };

  // Stop and complete session
  const stopSession = () => {
    // Complete the current interval if in progress
    if (currentInterval > 0 && Object.values(currentBehaviors).some(v => v)) {
      completeInterval();
    }

    setIsRunning(false);
    setIsPaused(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Build session object
    const session: IntervalSession = {
      id: `interval-${Date.now()}`,
      childId,
      childName,
      observerId,
      observerName,
      recordingMethod,
      intervalDuration,
      behaviors,
      intervals,
      totalDuration: Date.now() - (sessionStartTime || Date.now()),
      startedAt: new Date(sessionStartTime || Date.now()).toISOString(),
      completedAt: new Date().toISOString(),
    };

    onSessionComplete?.(session);
    toast.success('Session completed!');
  };

  // Reset session
  const resetSession = () => {
    setIsRunning(false);
    setIsPaused(false);
    setSessionStartTime(null);
    setCurrentInterval(0);
    setIntervalProgress(0);
    setIntervals([]);
    setCurrentBehaviors({});
    setShowSettings(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Toggle behavior occurrence in current interval
  const toggleBehavior = (behaviorId: string) => {
    setCurrentBehaviors(prev => ({
      ...prev,
      [behaviorId]: !prev[behaviorId],
    }));
  };

  // Calculate behavior percentages
  const calculatePercentages = (): Record<string, number> => {
    if (intervals.length === 0) return {};

    const percentages: Record<string, number> = {};

    for (const behavior of behaviors) {
      const occurrences = intervals.filter(i => i.behaviors[behavior.id]).length;
      percentages[behavior.id] = Math.round((occurrences / intervals.length) * 100);
    }

    return percentages;
  };

  // Export session data
  const exportSession = () => {
    const percentages = calculatePercentages();
    const session: IntervalSession = {
      id: `interval-${Date.now()}`,
      childId,
      childName,
      observerId,
      observerName,
      recordingMethod,
      intervalDuration,
      behaviors,
      intervals,
      totalDuration: Date.now() - (sessionStartTime || Date.now()),
      startedAt: new Date(sessionStartTime || Date.now()).toISOString(),
    };

    const report = {
      session,
      summary: {
        totalIntervals: intervals.length,
        methodUsed: RECORDING_METHODS.find(m => m.value === recordingMethod)?.label,
        intervalDuration: `${intervalDuration} seconds`,
        behaviorPercentages: behaviors.map(b => ({
          name: b.name,
          definition: b.operationalDefinition,
          percentage: `${percentages[b.id]}%`,
          occurrences: intervals.filter(i => i.behaviors[b.id]).length,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interval-recording-${childName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format time display
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const percentages = calculatePercentages();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Timer className="w-6 h-6 text-teal-600" />
              Interval Recording
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tracking for {childName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {!showSettings && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="p-5 mb-6 dark:bg-slate-800 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-600" />
            Session Configuration
          </h2>

          {/* Recording Method */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recording Method
            </label>
            <div className="grid grid-cols-1 gap-2">
              {RECORDING_METHODS.map(method => (
                <button
                  key={method.value}
                  onClick={() => setRecordingMethod(method.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    recordingMethod === method.value
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">{method.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{method.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Interval Duration */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Interval Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERVAL_DURATIONS.map(duration => (
                <button
                  key={duration.value}
                  onClick={() => setIntervalDuration(duration.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    intervalDuration === duration.value
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                      : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {duration.label}
                </button>
              ))}
            </div>
          </div>

          {/* Behaviors */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Behaviors to Track
            </label>

            {behaviors.length > 0 && (
              <div className="space-y-2 mb-3">
                {behaviors.map(behavior => (
                  <div
                    key={behavior.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: behavior.color }}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{behavior.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {behavior.operationalDefinition}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBehavior(behavior.id)}
                      className="p-2 text-gray-400 hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={`Remove ${behavior.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Behavior Form */}
            <div className="p-3 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
              <Input
                placeholder="Behavior name (e.g., Hand flapping)"
                value={newBehaviorName}
                onChange={(e) => setNewBehaviorName(e.target.value)}
                className="mb-2"
              />
              <Input
                placeholder="Operational definition (optional)"
                value={newBehaviorDefinition}
                onChange={(e) => setNewBehaviorDefinition(e.target.value)}
                className="mb-2"
              />
              <Button
                onClick={addBehavior}
                variant="outline"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Behavior
              </Button>
            </div>
          </div>

          {/* Start Button */}
          <Button
            onClick={startSession}
            disabled={behaviors.length === 0}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Recording Session
          </Button>
        </Card>
      )}

      {/* Active Recording Session */}
      {!showSettings && (
        <>
          {/* Timer Display */}
          <Card className="p-6 mb-6 dark:bg-slate-800 dark:border-slate-700">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-gray-900 dark:text-white font-mono">
                {formatTime(sessionStartTime ? Date.now() - sessionStartTime : 0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Interval {currentInterval} • {RECORDING_METHODS.find(m => m.value === recordingMethod)?.label}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
              <motion.div
                className="absolute left-0 top-0 h-full bg-teal-500"
                style={{ width: `${intervalProgress}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={togglePause}
                variant="outline"
                className="h-12 px-6"
              >
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                onClick={stopSession}
                variant="destructive"
                className="h-12 px-6"
              >
                <Square className="w-5 h-5 mr-2" />
                End Session
              </Button>
            </div>
          </Card>

          {/* Behavior Buttons */}
          <Card className="p-5 mb-6 dark:bg-slate-800 dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-teal-600" />
              Record Behaviors
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {recordingMethod === 'partial' && 'Tap if behavior occurred at any point during this interval'}
              {recordingMethod === 'whole' && 'Tap if behavior occurred throughout the entire interval'}
              {recordingMethod === 'momentary' && 'At the beep, tap if behavior is currently occurring'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {behaviors.map(behavior => (
                <button
                  key={behavior.id}
                  onClick={() => toggleBehavior(behavior.id)}
                  disabled={isPaused}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    currentBehaviors[behavior.id]
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: currentBehaviors[behavior.id] ? behavior.color : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: behavior.color }}
                    />
                    {currentBehaviors[behavior.id] ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {behavior.name}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Live Summary */}
          {intervals.length > 0 && (
            <Card className="p-5 dark:bg-slate-800 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                Session Summary
              </h3>

              <div className="space-y-3">
                {behaviors.map(behavior => {
                  const percentage = percentages[behavior.id] || 0;
                  const occurrences = intervals.filter(i => i.behaviors[behavior.id]).length;

                  return (
                    <div key={behavior.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {behavior.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {occurrences}/{intervals.length} intervals ({percentage}%)
                        </span>
                      </div>
                      <div className="relative h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: behavior.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <Button
                  onClick={exportSession}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Session Data
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Help Modal */}
      <div className="fixed bottom-20 right-4">
        <button
          className="p-3 bg-teal-600 text-white rounded-full shadow-lg hover:bg-teal-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => toast.info(
            'Tap behavior buttons when you observe the behavior. ' +
            'The timer will beep at each interval boundary. ' +
            'Data is recorded automatically.',
            { duration: 5000 }
          )}
          aria-label="Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// IOA CALCULATOR
// ============================================================================

/**
 * Calculate Inter-Observer Agreement (IOA) between two recordings
 */
export function calculateIOA(
  session1: IntervalSession,
  session2: IntervalSession
): {
  overallAgreement: number;
  behaviorAgreements: Record<string, number>;
  agreements: number;
  disagreements: number;
} {
  if (session1.intervals.length !== session2.intervals.length) {
    throw new Error('Sessions must have the same number of intervals');
  }

  let agreements = 0;
  let disagreements = 0;
  const behaviorAgreements: Record<string, { agree: number; total: number }> = {};

  // Initialize behavior tracking
  for (const behavior of session1.behaviors) {
    behaviorAgreements[behavior.id] = { agree: 0, total: 0 };
  }

  // Compare each interval
  for (let i = 0; i < session1.intervals.length; i++) {
    const int1 = session1.intervals[i];
    const int2 = session2.intervals[i];

    for (const behavior of session1.behaviors) {
      const val1 = int1.behaviors[behavior.id] || false;
      const val2 = int2.behaviors[behavior.id] || false;

      behaviorAgreements[behavior.id].total++;

      if (val1 === val2) {
        agreements++;
        behaviorAgreements[behavior.id].agree++;
      } else {
        disagreements++;
      }
    }
  }

  const total = agreements + disagreements;
  const overallAgreement = total > 0 ? Math.round((agreements / total) * 100) : 0;

  const behaviorPercentages: Record<string, number> = {};
  for (const [behaviorId, data] of Object.entries(behaviorAgreements)) {
    behaviorPercentages[behaviorId] = data.total > 0
      ? Math.round((data.agree / data.total) * 100)
      : 0;
  }

  return {
    overallAgreement,
    behaviorAgreements: behaviorPercentages,
    agreements,
    disagreements,
  };
}

export default IntervalRecording;
