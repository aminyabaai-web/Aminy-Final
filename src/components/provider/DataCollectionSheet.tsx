// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * DataCollectionSheet — Clinical data collection for BCBAs/RBTs
 * Supports DTT, NET, and Behavior data modes
 * Optimized for tablet/phone use during live therapy sessions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  Square,
  Plus,
  Minus,
  Save,
  Download,
  Timer,
  CheckCircle,
  XCircle,
  Clock,
  BarChart2,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export type DataMode = 'dtt' | 'net' | 'behavior';

export type ResponseType = 'correct' | 'incorrect' | 'no_response' | 'prompted' | 'self_corrected';

export type PromptLevel =
  | 'full_physical'
  | 'partial_physical'
  | 'gestural'
  | 'verbal'
  | 'independent';

export type BehaviorRecordingType = 'frequency' | 'duration' | 'interval';
export type IntervalSize = 10 | 15 | 30;

export interface Trial {
  id: string;
  timestamp: string;
  response: ResponseType;
  promptLevel?: PromptLevel;
  context?: string;
}

export interface BehaviorIncident {
  id: string;
  timestamp: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  duration?: number; // seconds
}

export interface IntervalCell {
  intervalIndex: number;
  occurred: boolean | null; // null = not yet reached
}

export interface SessionData {
  sessionId: string;
  clientId?: string;
  clientName: string;
  staffName: string;
  programName: string;
  goalDescription: string;
  mode: DataMode;
  startTime: string;
  endTime?: string;
  trials: Trial[];
  behaviorRecordingType?: BehaviorRecordingType;
  frequencyCount?: number;
  durationRecords?: number[];
  intervalSize?: IntervalSize;
  intervalCells?: IntervalCell[];
  incidents?: BehaviorIncident[];
  notes?: string;
}

export interface DataCollectionSheetProps {
  clientId?: string;
  programName?: string;
  mode?: DataMode;
  onSave?: (data: SessionData) => void;
  onBack: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const RESPONSE_CONFIG: Record<ResponseType, { label: string; shortLabel: string; color: string; bgColor: string }> = {
  correct: { label: 'Correct', shortLabel: '✓', color: 'text-green-700', bgColor: 'bg-green-100 border-green-400 active:bg-green-200' },
  incorrect: { label: 'Incorrect', shortLabel: '✗', color: 'text-red-700', bgColor: 'bg-red-100 border-red-400 active:bg-red-200' },
  no_response: { label: 'No Response', shortLabel: 'NR', color: 'text-slate-600', bgColor: 'bg-slate-100 border-slate-400 active:bg-slate-200' },
  prompted: { label: 'Prompted', shortLabel: 'P', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-400 active:bg-amber-200' },
  self_corrected: { label: 'Self-Corrected', shortLabel: 'SC', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-400 active:bg-blue-200' },
};

const PROMPT_LEVELS: { value: PromptLevel; label: string }[] = [
  { value: 'full_physical', label: 'Full Physical (FP)' },
  { value: 'partial_physical', label: 'Partial Physical (PP)' },
  { value: 'gestural', label: 'Gestural (G)' },
  { value: 'verbal', label: 'Verbal (V)' },
  { value: 'independent', label: 'Independent (I)' },
];

const MASTERY_THRESHOLD = 80; // percent
const MASTERY_CONSECUTIVE_SESSIONS = 3;

// ============================================================================
// Utility helpers
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function calcPercent(trials: Trial[]): number {
  if (trials.length === 0) return 0;
  const correct = trials.filter(t => t.response === 'correct').length;
  return Math.round((correct / trials.length) * 100);
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ============================================================================
// Sub-components
// ============================================================================

function ResponseButton({
  type,
  onPress,
}: {
  type: ResponseType;
  onPress: (r: ResponseType) => void;
}) {
  const cfg = RESPONSE_CONFIG[type];
  return (
    <button
      onClick={() => onPress(type)}
      className={`flex-1 rounded-xl border-2 font-bold text-lg transition-all select-none ${cfg.bgColor} ${cfg.color}`}
      style={{ WebkitTapHighlightColor: 'transparent', minHeight: 64 }}
    >
      {cfg.shortLabel}
    </button>
  );
}

function TrialRow({ trial, index }: { trial: Trial; index: number }) {
  const cfg = RESPONSE_CONFIG[trial.response];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 w-6 text-right">{index + 1}</span>
      <span className={`font-bold text-sm px-2 py-0.5 rounded ${cfg.bgColor} ${cfg.color}`}>
        {cfg.shortLabel}
      </span>
      {trial.promptLevel && (
        <span className="text-xs text-slate-500">
          {PROMPT_LEVELS.find(p => p.value === trial.promptLevel)?.label?.split(' ')[0]}
        </span>
      )}
      {trial.context && (
        <span className="text-xs text-slate-400 truncate flex-1">{trial.context}</span>
      )}
      <span className="text-xs text-slate-400 ml-auto">
        {new Date(trial.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

// ============================================================================
// DTT Mode
// ============================================================================

function DTTMode({
  programName,
  goalDescription,
  trials,
  onAddTrial,
  selectedPromptLevel,
  onSelectPromptLevel,
  contextNote,
  onContextNoteChange,
}: {
  programName: string;
  goalDescription: string;
  trials: Trial[];
  onAddTrial: (r: ResponseType) => void;
  selectedPromptLevel: PromptLevel;
  onSelectPromptLevel: (p: PromptLevel) => void;
  contextNote: string;
  onContextNoteChange: (v: string) => void;
}) {
  const pct = calcPercent(trials);
  const masteryMet = pct >= MASTERY_THRESHOLD;

  return (
    <div className="space-y-4">
      {/* Program info */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Program / Skill</p>
        <p className="font-semibold text-slate-900">{programName || 'Untitled Program'}</p>
        {goalDescription && <p className="text-sm text-slate-600 mt-1">{goalDescription}</p>}
      </div>

      {/* Running summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{trials.length}</p>
          <p className="text-xs text-slate-500">Trials</p>
        </div>
        <div className={`border rounded-xl p-3 text-center ${masteryMet ? 'bg-green-50 border-green-300' : 'bg-white border-slate-200'}`}>
          <p className={`text-2xl font-bold ${masteryMet ? 'text-green-700' : 'text-slate-900'}`}>{pct}%</p>
          <p className="text-xs text-slate-500">% Correct</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{trials.filter(t => t.response === 'correct').length}</p>
          <p className="text-xs text-slate-500">Correct</p>
        </div>
      </div>

      {masteryMet && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">
            Session at or above {MASTERY_THRESHOLD}% — check for mastery across {MASTERY_CONSECUTIVE_SESSIONS} consecutive sessions
          </p>
        </div>
      )}

      {/* Prompt level */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Prompt Level</p>
        <div className="flex flex-wrap gap-2">
          {PROMPT_LEVELS.map(pl => (
            <button
              key={pl.value}
              onClick={() => onSelectPromptLevel(pl.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                selectedPromptLevel === pl.value
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {pl.label.split(' ').pop()?.replace('(', '').replace(')', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Optional context */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">SD / Context (optional)</p>
        <input
          type="text"
          value={contextNote}
          onChange={e => onContextNoteChange(e.target.value)}
          placeholder="e.g., Touch nose..."
          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      {/* Response buttons */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Record Response</p>
        <div className="flex gap-2">
          {(['correct', 'incorrect', 'no_response', 'prompted', 'self_corrected'] as ResponseType[]).map(r => (
            <ResponseButton key={r} type={r} onPress={onAddTrial} />
          ))}
        </div>
      </div>

      {/* Trial log */}
      {trials.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Trial Log</p>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 max-h-48 overflow-y-auto">
            {[...trials].reverse().map((t, i) => (
              <TrialRow key={t.id} trial={t} index={trials.length - 1 - i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// NET Mode
// ============================================================================

function NETMode({
  programName,
  goalDescription,
  trials,
  onAddTrial,
  selectedPromptLevel,
  onSelectPromptLevel,
  contextNote,
  onContextNoteChange,
}: {
  programName: string;
  goalDescription: string;
  trials: Trial[];
  onAddTrial: (r: ResponseType) => void;
  selectedPromptLevel: PromptLevel;
  onSelectPromptLevel: (p: PromptLevel) => void;
  contextNote: string;
  onContextNoteChange: (v: string) => void;
}) {
  const pct = calcPercent(trials);
  const correct = trials.filter(t => t.response === 'correct').length;

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Program / Skill</p>
        <p className="font-semibold text-slate-900">{programName || 'Untitled Program'}</p>
        {goalDescription && <p className="text-sm text-slate-600 mt-1">{goalDescription}</p>}
      </div>

      {/* Running tally — always visible */}
      <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-around">
        <div className="text-center">
          <p className="text-4xl font-bold text-white">{trials.length}</p>
          <p className="text-xs text-slate-400 mt-1">Opportunities</p>
        </div>
        <div className="w-px h-12 bg-slate-600" />
        <div className="text-center">
          <p className="text-4xl font-bold text-emerald-500">{correct}</p>
          <p className="text-xs text-slate-400 mt-1">Correct</p>
        </div>
        <div className="w-px h-12 bg-slate-600" />
        <div className="text-center">
          <p className="text-4xl font-bold text-white">{pct}%</p>
          <p className="text-xs text-slate-400 mt-1">Rate</p>
        </div>
      </div>

      {/* Context */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Setting / Context (optional)</p>
        <input
          type="text"
          value={contextNote}
          onChange={e => onContextNoteChange(e.target.value)}
          placeholder="e.g., During play, snack time..."
          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      {/* Prompt level */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Prompt Level</p>
        <div className="flex flex-wrap gap-2">
          {PROMPT_LEVELS.map(pl => (
            <button
              key={pl.value}
              onClick={() => onSelectPromptLevel(pl.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                selectedPromptLevel === pl.value
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {pl.label.split(' ').pop()?.replace('(', '').replace(')', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Response buttons */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Log Opportunity</p>
        <div className="flex gap-2">
          {(['correct', 'incorrect', 'no_response', 'prompted', 'self_corrected'] as ResponseType[]).map(r => (
            <ResponseButton key={r} type={r} onPress={onAddTrial} />
          ))}
        </div>
      </div>

      {trials.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Recent Opportunities</p>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 max-h-48 overflow-y-auto">
            {[...trials].reverse().slice(0, 20).map((t, i) => (
              <TrialRow key={t.id} trial={t} index={trials.length - 1 - i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Behavior Data Mode
// ============================================================================

function BehaviorMode({
  recordingType,
  onChangeRecordingType,
  frequencyCount,
  onIncrementFrequency,
  onDecrementFrequency,
  durationRecords,
  onStartDuration,
  onStopDuration,
  isDurationRunning,
  durationElapsed,
  intervalSize,
  onChangeIntervalSize,
  intervalCells,
  currentIntervalIndex,
  intervalTimeLeft,
  isIntervalRunning,
  onStartIntervals,
  onStopIntervals,
  incidents,
  onAddIncident,
  onUpdateIncident,
}: {
  recordingType: BehaviorRecordingType;
  onChangeRecordingType: (t: BehaviorRecordingType) => void;
  frequencyCount: number;
  onIncrementFrequency: () => void;
  onDecrementFrequency: () => void;
  durationRecords: number[];
  onStartDuration: () => void;
  onStopDuration: () => void;
  isDurationRunning: boolean;
  durationElapsed: number;
  intervalSize: IntervalSize;
  onChangeIntervalSize: (s: IntervalSize) => void;
  intervalCells: IntervalCell[];
  currentIntervalIndex: number;
  intervalTimeLeft: number;
  isIntervalRunning: boolean;
  onStartIntervals: () => void;
  onStopIntervals: () => void;
  incidents: BehaviorIncident[];
  onAddIncident: () => void;
  onUpdateIncident: (id: string, field: keyof BehaviorIncident, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
        {(['frequency', 'duration', 'interval'] as BehaviorRecordingType[]).map(t => (
          <button
            key={t}
            onClick={() => onChangeRecordingType(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              recordingType === t
                ? 'bg-slate-900 text-white'
                : 'text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ABC Incidents (always visible) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide">ABC Data</p>
          <button
            onClick={onAddIncident}
            className="flex items-center gap-1 text-xs text-emerald-500 font-medium"
          >
            <Plus className="w-3 h-3" />
            Add Incident
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-400">Tap "Add Incident" to log antecedent, behavior, consequence</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident, idx) => (
              <div key={incident.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Incident {idx + 1}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-amber-700 font-medium">Antecedent (A)</label>
                  <input
                    type="text"
                    value={incident.antecedent}
                    onChange={e => onUpdateIncident(incident.id, 'antecedent', e.target.value)}
                    placeholder="What happened before..."
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-red-700 font-medium">Behavior (B)</label>
                  <input
                    type="text"
                    value={incident.behavior}
                    onChange={e => onUpdateIncident(incident.id, 'behavior', e.target.value)}
                    placeholder="Describe the behavior..."
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-700 font-medium">Consequence (C)</label>
                  <input
                    type="text"
                    value={incident.consequence}
                    onChange={e => onUpdateIncident(incident.id, 'consequence', e.target.value)}
                    placeholder="What happened after..."
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Frequency */}
      {recordingType === 'frequency' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-4">Frequency Count</p>
          <p className="text-7xl font-bold text-slate-900 mb-6">{frequencyCount}</p>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={onDecrementFrequency}
              className="w-16 h-16 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-600 active:bg-slate-100"
            >
              <Minus className="w-6 h-6" />
            </button>
            <button
              onClick={onIncrementFrequency}
              className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white active:opacity-80"
            >
              <Plus className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}

      {/* Duration */}
      {recordingType === 'duration' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-4">Duration Recording</p>
          <p className="text-6xl font-mono font-bold text-slate-900 mb-2">
            {formatSeconds(isDurationRunning ? durationElapsed : 0)}
          </p>
          {isDurationRunning && (
            <div className="flex items-center justify-center gap-1 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-600">Recording</span>
            </div>
          )}
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={isDurationRunning ? onStopDuration : onStartDuration}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                isDurationRunning
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {isDurationRunning ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Start</>}
            </button>
          </div>
          {durationRecords.length > 0 && (
            <div className="mt-4 text-left">
              <p className="text-xs text-slate-500 mb-2">Recorded Episodes</p>
              <div className="space-y-1">
                {durationRecords.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Episode {i + 1}</span>
                    <span className="font-medium text-slate-900">{formatSeconds(d)}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatSeconds(durationRecords.reduce((a, b) => a + b, 0))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interval */}
      {recordingType === 'interval' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Interval Recording</p>

          {/* Interval size selector */}
          <div className="flex gap-2 mb-4">
            {([10, 15, 30] as IntervalSize[]).map(s => (
              <button
                key={s}
                onClick={() => onChangeIntervalSize(s)}
                disabled={isIntervalRunning}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  intervalSize === s
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-600 border-slate-300'
                } disabled:opacity-50`}
              >
                {s}s
              </button>
            ))}
          </div>

          {/* Timer display */}
          {isIntervalRunning && (
            <div className="text-center mb-4">
              <p className="text-3xl font-mono font-bold text-slate-900">{intervalTimeLeft}s</p>
              <p className="text-xs text-slate-500">Interval {currentIntervalIndex + 1} — tap to mark</p>
            </div>
          )}

          {/* Interval grid */}
          {intervalCells.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {intervalCells.map(cell => (
                <div
                  key={cell.intervalIndex}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold border-2 ${
                    cell.occurred === null
                      ? 'bg-slate-100 border-slate-200 text-slate-400'
                      : cell.occurred
                      ? 'bg-green-100 border-green-400 text-green-700'
                      : 'bg-red-100 border-red-400 text-red-700'
                  }`}
                >
                  {cell.occurred === null ? cell.intervalIndex + 1 : cell.occurred ? '+' : '-'}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={isIntervalRunning ? onStopIntervals : onStartIntervals}
            className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              isIntervalRunning
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-emerald-500 text-white'
            }`}
          >
            {isIntervalRunning ? <><Square className="w-4 h-4" /> Stop Intervals</> : <><Play className="w-4 h-4" /> Start Intervals</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DataCollectionSheet({
  clientId,
  programName: initialProgramName = '',
  mode: initialMode = 'dtt',
  onSave,
  onBack,
}: DataCollectionSheetProps) {
  // Session setup
  const [mode, setMode] = useState<DataMode>(initialMode);
  const [programName, setProgramName] = useState(initialProgramName);
  const [goalDescription, setGoalDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [staffName, setStaffName] = useState('');

  // Session state
  const [sessionStarted, setSessionStarted] = useState(false);
  const [startTime, setStartTime] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // DTT/NET shared
  const [trials, setTrials] = useState<Trial[]>([]);
  const [selectedPromptLevel, setSelectedPromptLevel] = useState<PromptLevel>('independent');
  const [contextNote, setContextNote] = useState('');

  // Behavior - frequency
  const [frequencyCount, setFrequencyCount] = useState(0);

  // Behavior - duration
  const [durationRecords, setDurationRecords] = useState<number[]>([]);
  const [isDurationRunning, setIsDurationRunning] = useState(false);
  const [durationElapsed, setDurationElapsed] = useState(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationStartRef = useRef<number>(0);

  // Behavior - interval
  const [behaviorRecordingType, setBehaviorRecordingType] = useState<BehaviorRecordingType>('frequency');
  const [intervalSize, setIntervalSize] = useState<IntervalSize>(10);
  const [intervalCells, setIntervalCells] = useState<IntervalCell[]>([]);
  const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
  const [intervalTimeLeft, setIntervalTimeLeft] = useState(0);
  const [isIntervalRunning, setIsIntervalRunning] = useState(false);
  const intervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ABC
  const [incidents, setIncidents] = useState<BehaviorIncident[]>([]);

  // Notes
  const [sessionNotes, setSessionNotes] = useState('');

  // Saving
  const [isSaving, setIsSaving] = useState(false);
  const [savedSessionId] = useState(() => generateId());

  // Load profiles from localStorage
  useEffect(() => {
    try {
      const child = localStorage.getItem('aminy_child_profile');
      if (child) {
        const parsed = JSON.parse(child);
        setClientName(parsed.name || parsed.firstName || '');
      }
      const user = localStorage.getItem('aminy_user_profile');
      if (user) {
        const parsed = JSON.parse(user);
        setStaffName(parsed.name || parsed.displayName || '');
      }
    } catch {
      // ignore
    }
  }, []);

  // Session elapsed timer
  useEffect(() => {
    if (sessionStarted) {
      sessionTimerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    }
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [sessionStarted]);

  // Duration timer
  useEffect(() => {
    if (isDurationRunning) {
      durationStartRef.current = Date.now();
      durationTimerRef.current = setInterval(() => {
        setDurationElapsed(Math.floor((Date.now() - durationStartRef.current) / 1000));
      }, 100);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isDurationRunning]);

  // Interval timer
  useEffect(() => {
    if (isIntervalRunning) {
      let timeLeft = intervalSize;
      setIntervalTimeLeft(timeLeft);
      intervalTimerRef.current = setInterval(() => {
        timeLeft -= 1;
        setIntervalTimeLeft(timeLeft);
        if (timeLeft <= 0) {
          // Move to next interval
          setCurrentIntervalIndex(prev => {
            const next = prev + 1;
            setIntervalCells(cells => {
              const updated = [...cells];
              if (updated[prev] && updated[prev].occurred === null) {
                updated[prev] = { ...updated[prev], occurred: false };
              }
              if (next < updated.length) {
                // keep next as null
              }
              return updated;
            });
            return next;
          });
          timeLeft = intervalSize;
          setIntervalTimeLeft(timeLeft);
        }
      }, 1000);
    } else {
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    }
    return () => {
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    };
  }, [isIntervalRunning, intervalSize]);

  const handleStartSession = () => {
    const now = new Date().toISOString();
    setStartTime(now);
    setSessionStarted(true);
    toast.success('Session started');
  };

  const handleAddTrial = useCallback((response: ResponseType) => {
    const trial: Trial = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      response,
      promptLevel: selectedPromptLevel,
      context: contextNote || undefined,
    };
    setTrials(prev => [...prev, trial]);
  }, [selectedPromptLevel, contextNote]);

  const handleStartDuration = () => {
    setDurationElapsed(0);
    setIsDurationRunning(true);
  };

  const handleStopDuration = () => {
    setIsDurationRunning(false);
    setDurationRecords(prev => [...prev, durationElapsed]);
    setDurationElapsed(0);
  };

  const handleStartIntervals = () => {
    // Create 30 interval cells (5 minutes at 10s, etc.)
    const totalIntervals = Math.ceil(300 / intervalSize);
    setIntervalCells(Array.from({ length: totalIntervals }, (_, i) => ({ intervalIndex: i, occurred: null })));
    setCurrentIntervalIndex(0);
    setIntervalTimeLeft(intervalSize);
    setIsIntervalRunning(true);
  };

  const handleStopIntervals = () => {
    setIsIntervalRunning(false);
    if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
  };

  const handleUpdateIncident = (id: string, field: keyof BehaviorIncident, value: string) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, [field]: value } : inc));
  };

  const buildSessionData = (): SessionData => ({
    sessionId: savedSessionId,
    clientId,
    clientName,
    staffName,
    programName,
    goalDescription,
    mode,
    startTime,
    endTime: new Date().toISOString(),
    trials,
    behaviorRecordingType: mode === 'behavior' ? behaviorRecordingType : undefined,
    frequencyCount: mode === 'behavior' && behaviorRecordingType === 'frequency' ? frequencyCount : undefined,
    durationRecords: mode === 'behavior' && behaviorRecordingType === 'duration' ? durationRecords : undefined,
    intervalSize: mode === 'behavior' && behaviorRecordingType === 'interval' ? intervalSize : undefined,
    intervalCells: mode === 'behavior' && behaviorRecordingType === 'interval' ? intervalCells : undefined,
    incidents: mode === 'behavior' ? incidents : undefined,
    notes: sessionNotes || undefined,
  });

  const handleSave = async () => {
    if (!sessionStarted) {
      toast.error('Start the session before saving');
      return;
    }
    setIsSaving(true);
    const data = buildSessionData();

    try {
      const { error } = await supabase
        .from('data_collection_sheets')
        .upsert({
          session_id: data.sessionId,
          client_id: data.clientId || null,
          client_name: data.clientName,
          staff_name: data.staffName,
          program_name: data.programName,
          goal_description: data.goalDescription,
          mode: data.mode,
          start_time: data.startTime,
          end_time: data.endTime,
          data: data,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Session saved to Aminy');
    } catch {
      // Fallback to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('aminy_data_collection_sheets') || '[]') as SessionData[];
        const updated = [...existing.filter(s => s.sessionId !== data.sessionId), data];
        localStorage.setItem('aminy_data_collection_sheets', JSON.stringify(updated));
        toast.success('Session saved locally');
      } catch {
        toast.error('Failed to save — please export data');
      }
    } finally {
      setIsSaving(false);
      onSave?.(data);
    }
  };

  const handleExport = () => {
    const data = buildSessionData();
    const pct = calcPercent(data.trials);
    const correct = data.trials.filter(t => t.response === 'correct').length;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Data Collection — ${data.programName}</title>
<style>
body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1e293b; }
h1 { font-size: 22px; color: #0f172a; margin-bottom: 4px; }
.meta { color: #64748b; font-size: 14px; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th { background: #0f172a; color: white; padding: 8px 12px; text-align: left; }
td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
.summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
.stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
.stat-value { font-size: 28px; font-weight: bold; color: #0f172a; }
.stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
@media print { body { padding: 12px; } }
</style>
</head>
<body>
<h1>${data.programName || 'Data Collection Sheet'}</h1>
<div class="meta">
Client: ${data.clientName || 'N/A'} &nbsp;|&nbsp;
Staff: ${data.staffName || 'N/A'} &nbsp;|&nbsp;
Date: ${new Date(data.startTime).toLocaleDateString()} &nbsp;|&nbsp;
Mode: ${data.mode.toUpperCase()} &nbsp;|&nbsp;
Duration: ${data.endTime ? formatSeconds(Math.floor((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 1000)) : 'N/A'}
</div>
${data.goalDescription ? `<p><strong>Goal:</strong> ${data.goalDescription}</p>` : ''}
<div class="summary">
<div class="stat"><div class="stat-value">${data.trials.length}</div><div class="stat-label">Total Trials</div></div>
<div class="stat"><div class="stat-value">${correct}</div><div class="stat-label">Correct</div></div>
<div class="stat"><div class="stat-value">${pct}%</div><div class="stat-label">% Correct</div></div>
</div>
${data.trials.length > 0 ? `
<table>
<thead><tr><th>#</th><th>Time</th><th>Response</th><th>Prompt Level</th><th>Context</th></tr></thead>
<tbody>
${data.trials.map((t, i) => `<tr>
<td>${i + 1}</td>
<td>${new Date(t.timestamp).toLocaleTimeString()}</td>
<td>${RESPONSE_CONFIG[t.response].label}</td>
<td>${t.promptLevel ? PROMPT_LEVELS.find(p => p.value === t.promptLevel)?.label || '' : ''}</td>
<td>${t.context || ''}</td>
</tr>`).join('')}
</tbody></table>` : ''}
${data.notes ? `<p style="margin-top:16px"><strong>Notes:</strong> ${data.notes}</p>` : ''}
<p style="margin-top:20px;font-size:12px;color:#94a3b8">Generated by Aminy &mdash; ${new Date().toLocaleString()}</p>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DataCollection_${(data.programName || 'Session').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const sessionSummary = {
    pct: calcPercent(trials),
    correct: trials.filter(t => t.response === 'correct').length,
    total: trials.length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <div className="text-center">
            <p className="text-white font-semibold text-sm">Data Collection</p>
            {sessionStarted && (
              <div className="flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-mono">{formatSeconds(elapsedSeconds)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {sessionStarted && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Setup card */}
        {!sessionStarted ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-slate-900 font-bold text-lg">Session Setup</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Client name"
                  className="w-full mt-1 border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">Staff Name</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={e => setStaffName(e.target.value)}
                  placeholder="Your name"
                  className="w-full mt-1 border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Program / Skill Name</label>
              <input
                type="text"
                value={programName}
                onChange={e => setProgramName(e.target.value)}
                placeholder="e.g., Manding for Preferred Items"
                className="w-full mt-1 border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Goal Description</label>
              <textarea
                value={goalDescription}
                onChange={e => setGoalDescription(e.target.value)}
                placeholder="e.g., Client will independently request preferred items using 2-word phrases..."
                rows={2}
                className="w-full mt-1 border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Mode selection */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Data Collection Mode</label>
              <div className="flex gap-2 mt-2">
                {(['dtt', 'net', 'behavior'] as DataMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition-all uppercase tracking-wide ${
                      mode === m
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'text-slate-600 border-slate-200 bg-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartSession}
              className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Session
            </button>
          </div>
        ) : (
          <>
            {/* Mode badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  {mode}
                </span>
                <span className="text-sm text-slate-500">
                  {clientName && `${clientName} · `}{staffName}
                </span>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg border border-slate-200"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>

            {/* Mode-specific content */}
            {mode === 'dtt' && (
              <DTTMode
                programName={programName}
                goalDescription={goalDescription}
                trials={trials}
                onAddTrial={handleAddTrial}
                selectedPromptLevel={selectedPromptLevel}
                onSelectPromptLevel={setSelectedPromptLevel}
                contextNote={contextNote}
                onContextNoteChange={setContextNote}
              />
            )}

            {mode === 'net' && (
              <NETMode
                programName={programName}
                goalDescription={goalDescription}
                trials={trials}
                onAddTrial={handleAddTrial}
                selectedPromptLevel={selectedPromptLevel}
                onSelectPromptLevel={setSelectedPromptLevel}
                contextNote={contextNote}
                onContextNoteChange={setContextNote}
              />
            )}

            {mode === 'behavior' && (
              <BehaviorMode
                recordingType={behaviorRecordingType}
                onChangeRecordingType={setBehaviorRecordingType}
                frequencyCount={frequencyCount}
                onIncrementFrequency={() => setFrequencyCount(c => c + 1)}
                onDecrementFrequency={() => setFrequencyCount(c => Math.max(0, c - 1))}
                durationRecords={durationRecords}
                onStartDuration={handleStartDuration}
                onStopDuration={handleStopDuration}
                isDurationRunning={isDurationRunning}
                durationElapsed={durationElapsed}
                intervalSize={intervalSize}
                onChangeIntervalSize={setIntervalSize}
                intervalCells={intervalCells}
                currentIntervalIndex={currentIntervalIndex}
                intervalTimeLeft={intervalTimeLeft}
                isIntervalRunning={isIntervalRunning}
                onStartIntervals={handleStartIntervals}
                onStopIntervals={handleStopIntervals}
                incidents={incidents}
                onAddIncident={() => setIncidents(prev => [...prev, {
                  id: generateId(),
                  timestamp: new Date().toISOString(),
                  antecedent: '',
                  behavior: '',
                  consequence: '',
                }])}
                onUpdateIncident={handleUpdateIncident}
              />
            )}

            {/* Session summary bar */}
            {(mode === 'dtt' || mode === 'net') && trials.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="w-4 h-4 text-emerald-500" />
                  <p className="text-white text-sm font-semibold">Session Summary</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{sessionSummary.total}</p>
                    <p className="text-xs text-slate-400">Trials</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-500">{sessionSummary.correct}</p>
                    <p className="text-xs text-slate-400">Correct</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${sessionSummary.pct >= MASTERY_THRESHOLD ? 'text-green-400' : 'text-white'}`}>
                      {sessionSummary.pct}%
                    </p>
                    <p className="text-xs text-slate-400">% Correct</p>
                  </div>
                </div>
                {sessionSummary.pct >= MASTERY_THRESHOLD && (
                  <div className="mt-3 bg-green-900/30 rounded-lg p-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-green-300">
                      Mastery threshold met — verify across {MASTERY_CONSECUTIVE_SESSIONS} sessions
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Session notes */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <label className="text-xs text-slate-500 uppercase tracking-wide">Session Notes</label>
              <textarea
                value={sessionNotes}
                onChange={e => setSessionNotes(e.target.value)}
                placeholder="Clinical observations, next steps, parent communication..."
                rows={3}
                className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Stop session */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Saving...' : 'Save Session'}
              </button>
              <button
                onClick={handleExport}
                className="px-5 py-4 rounded-xl border-2 border-slate-300 text-slate-600 flex items-center justify-center"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 justify-center pb-4">
              <Timer className="w-3.5 h-3.5" />
              Session started {new Date(startTime).toLocaleTimeString()} · {formatSeconds(elapsedSeconds)} elapsed
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DataCollectionSheet;
