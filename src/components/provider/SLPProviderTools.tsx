// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SLPProviderTools
 * SLP-specific clinical tool suite: AAC Goal Tracker, Language Sample Analysis,
 * Articulation Progress, Fluency Tracker, and Speech Note Template.
 * Screen: 'slp-provider-tools'
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Mic, BarChart3, FileText, TrendingUp, TrendingDown,
  Minus, Plus, Check, ChevronDown, ChevronUp, Download, Save,
  MessageSquare, Volume2, Activity,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────

interface AACSymbolUsage {
  symbol: string;
  count: number;
  category: string;
}

interface MLUEntry {
  date: string;
  mlu: number;
  utteranceCount: number;
  notes: string;
}

interface ArticulationTarget {
  sound: string;
  position: 'initial' | 'medial' | 'final';
  sessions: { date: string; pctCorrect: number }[];
}

interface FluencyEntry {
  date: string;
  wpm: number;
  stutteringFreqPct: number;
  avoidanceBehaviors: string[];
  notes: string;
}

interface SLPNote {
  date: string;
  clientId: string;
  articulationTargets: string;
  articulationPct: number;
  languageGoals: string;
  fluencyWpm: number;
  fluencyStutterPct: number;
  aacSymbolsUsed: number;
  caregiverProgram: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const ARTICULATION_SOUNDS = ['p', 'b', 'm', 't', 'd', 'n', 'k', 'g', 'f', 'v', 's', 'z'];

const LS_KEYS = {
  mlu: 'slp_mlu_history',
  fluency: 'slp_fluency_history',
  articulation: 'slp_articulation',
  notes: 'slp_notes',
};

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ─── AAC Goal Tracker ─────────────────────────────────────────────────

function AACGoalTracker() {
  const [usages, setUsages] = useState<AACSymbolUsage[]>([]);
  const [spontTarget, setSpontTarget] = useState(15);

  useEffect(() => {
    // Read AACBoard session data from localStorage
    try {
      const raw = localStorage.getItem('aac_session_data');
      if (raw) {
        const data = JSON.parse(raw) as Record<string, number>;
        const mapped: AACSymbolUsage[] = Object.entries(data).map(([sym, cnt]) => ({
          symbol: sym,
          count: cnt,
          category: 'General',
        }));
        setUsages(mapped.sort((a, b) => b.count - a.count));
        return;
      }
    } catch { /* ignore */ }

    // Demo fallback
    setUsages([
      { symbol: 'more', count: 12, category: 'Core' },
      { symbol: 'help', count: 9, category: 'Core' },
      { symbol: 'no', count: 8, category: 'Core' },
      { symbol: 'eat', count: 7, category: 'Wants' },
      { symbol: 'go', count: 5, category: 'Core' },
      { symbol: 'stop', count: 4, category: 'Core' },
      { symbol: 'happy', count: 3, category: 'Feelings' },
      { symbol: 'water', count: 3, category: 'Wants' },
    ]);
  }, []);

  const totalUses = usages.reduce((s, u) => s + u.count, 0);
  const topSymbols = usages.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#6B9080]/10 border border-[#6B9080]/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-[#6B9080]">{totalUses}</p>
          <p className="text-sm text-[#6B9080] mt-1">Total symbol uses (session)</p>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-violet-700">{usages.length}</p>
          <p className="text-sm text-violet-600 mt-1">Unique symbols used</p>
        </div>
      </div>

      <div className="bg-white border border-[#E8E4DF] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-[#1B2733]">Spontaneous Communication Goal</h4>
          <div className="flex items-center gap-2">
            <button onClick={() => setSpontTarget(t => Math.max(1, t - 1))} className="w-7 h-7 rounded-full bg-[#F0EDE8] flex items-center justify-center hover:bg-[#E8E4DF]">
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-bold text-[#1B2733] w-8 text-center">{spontTarget}</span>
            <button onClick={() => setSpontTarget(t => t + 1)} className="w-7 h-7 rounded-full bg-[#F0EDE8] flex items-center justify-center hover:bg-[#E8E4DF]">
              <Plus className="w-3 h-3" />
            </button>
            <span className="text-sm text-[#5A6B7A]">/ session</span>
          </div>
        </div>
        <div className="h-2.5 bg-[#F0EDE8] rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.min(100, (totalUses / spontTarget) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-[#5A6B7A] mt-1.5">
          {totalUses >= spontTarget
            ? `Goal met! ${totalUses}/${spontTarget} communications`
            : `${totalUses}/${spontTarget} — ${spontTarget - totalUses} more to goal`}
        </p>
      </div>

      <div>
        <h4 className="font-medium text-[#1B2733] mb-2">Most Used Symbols</h4>
        <div className="space-y-2">
          {topSymbols.map((u) => (
            <div key={u.symbol} className="flex items-center gap-3">
              <span className="w-16 text-sm font-medium text-[#3A4A57] capitalize">{u.symbol}</span>
              <div className="flex-1 h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-400 rounded-full"
                  style={{ width: `${(u.count / (topSymbols[0]?.count || 1)) * 100}%` }}
                />
              </div>
              <span className="w-6 text-sm text-[#5A6B7A] text-right">{u.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Language Sample Analysis ─────────────────────────────────────────

function LanguageSampleAnalysis() {
  const [history, setHistory] = useState<MLUEntry[]>(() =>
    readLS<MLUEntry[]>(LS_KEYS.mlu, [
      { date: '2026-02-01', mlu: 1.2, utteranceCount: 25, notes: 'Baseline' },
      { date: '2026-03-01', mlu: 1.6, utteranceCount: 30, notes: 'Using 2-word combos' },
      { date: '2026-04-01', mlu: 2.1, utteranceCount: 35, notes: 'Agent-action emerging' },
    ])
  );
  const [newMlu, setNewMlu] = useState('');
  const [newUtterances, setNewUtterances] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const addEntry = () => {
    const entry: MLUEntry = {
      date: new Date().toISOString().split('T')[0],
      mlu: parseFloat(newMlu) || 0,
      utteranceCount: parseInt(newUtterances) || 0,
      notes: newNotes,
    };
    const updated = [entry, ...history];
    setHistory(updated);
    writeLS(LS_KEYS.mlu, updated);
    setNewMlu(''); setNewUtterances(''); setNewNotes('');
    setShowForm(false);
  };

  const chartMax = Math.max(...history.map(h => h.mlu), 5);
  const chartData = [...history].reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#5A6B7A]">Mean Length of Utterance (morphemes)</p>
        <button
          onClick={() => setShowForm(f => !f)}
          className="text-sm text-[#6B9080] font-medium flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Log session
        </button>
      </div>

      {/* Simple CSS line chart */}
      <div className="bg-[#FAF7F2] rounded-xl p-4">
        <div className="flex items-end gap-2 h-24">
          {chartData.map((entry, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-violet-400 rounded-t-sm"
                style={{ height: `${(entry.mlu / chartMax) * 88}px` }}
                title={`MLU: ${entry.mlu}`}
              />
              <span className="text-xs text-[#8A9BA8]" style={{ fontSize: '9px' }}>
                {entry.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-[#5A6B7A] mt-2">
          <span>Baseline</span>
          <span>Current MLU: <strong className="text-violet-700">{history[0]?.mlu ?? '—'}</strong></span>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#5A6B7A]">MLU</label>
                <input
                  type="number"
                  step="0.1"
                  value={newMlu}
                  onChange={e => setNewMlu(e.target.value)}
                  placeholder="e.g. 2.4"
                  className="w-full mt-1 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5A6B7A]">Utterances sampled</label>
                <input
                  type="number"
                  value={newUtterances}
                  onChange={e => setNewUtterances(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full mt-1 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#5A6B7A]">Notes</label>
              <input
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Emerging structures, contexts..."
                className="w-full mt-1 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>
            <button
              onClick={addEntry}
              disabled={!newMlu}
              className="w-full py-2 bg-violet-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Save Entry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {history.map((entry, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-[#E8E4DF] last:border-0">
            <div>
              <span className="text-sm font-medium text-[#1B2733]">MLU {entry.mlu}</span>
              <span className="text-xs text-[#8A9BA8] ml-2">({entry.utteranceCount} utterances)</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#5A6B7A]">{entry.date}</p>
              {entry.notes && <p className="text-xs text-[#8A9BA8]">{entry.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Articulation Progress ────────────────────────────────────────────

function ArticulationProgress() {
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const saved = readLS<Record<string, number>>(LS_KEYS.articulation, {});
    return saved;
  });
  const [editingSound, setEditingSound] = useState<string | null>(null);
  const [pctInput, setPctInput] = useState('');

  const updateTarget = (sound: string, pct: number) => {
    const updated = { ...targets, [sound]: pct };
    setTargets(updated);
    writeLS(LS_KEYS.articulation, updated);
    setEditingSound(null);
  };

  const getMastery = (pct: number) => {
    if (pct >= 80) return { label: 'Mastered', cls: 'bg-green-100 text-green-700' };
    if (pct >= 50) return { label: 'Emerging', cls: 'bg-yellow-100 text-yellow-700' };
    if (pct > 0) return { label: 'Developing', cls: 'bg-orange-100 text-orange-700' };
    return { label: 'Not started', cls: 'bg-[#F0EDE8] text-[#5A6B7A]' };
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#5A6B7A]">Tap a sound to log today&apos;s % correct. Mastery = 80%.</p>
      <div className="grid grid-cols-3 gap-2">
        {ARTICULATION_SOUNDS.map((sound) => {
          const pct = targets[sound] ?? 0;
          const { label, cls } = getMastery(pct);
          return (
            <button
              key={sound}
              onClick={() => { setEditingSound(sound); setPctInput(String(pct)); }}
              className="bg-white border border-[#E8E4DF] rounded-xl p-3 text-center hover:border-[#6B9080]/30 transition-colors"
            >
              <p className="text-xl font-bold text-[#1B2733]">/{sound}/</p>
              <p className="text-sm font-medium text-[#3A4A57] mt-1">{pct}%</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {editingSound && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-[#6B9080]/10 border border-[#6B9080]/20 rounded-xl p-4"
          >
            <p className="font-medium text-[#1B2733] mb-2">/{editingSound}/ — % correct today</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={pctInput}
                onChange={e => setPctInput(e.target.value)}
                className="flex-1 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-[#6B9080] focus:outline-none"
              />
              <button
                onClick={() => updateTarget(editingSound, parseInt(pctInput) || 0)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingSound(null)}
                className="px-3 py-2 bg-[#F0EDE8] text-[#5A6B7A] rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Fluency Tracker ──────────────────────────────────────────────────

function FluencyTracker() {
  const [history, setHistory] = useState<FluencyEntry[]>(() =>
    readLS<FluencyEntry[]>(LS_KEYS.fluency, [
      { date: '2026-04-01', wpm: 95, stutteringFreqPct: 8, avoidanceBehaviors: ['word substitution'], notes: 'Better in structured reading' },
      { date: '2026-03-15', wpm: 82, stutteringFreqPct: 12, avoidanceBehaviors: ['word substitution', 'circumlocution'], notes: '' },
    ])
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ wpm: '', stutter: '', avoidance: '', notes: '' });

  const addEntry = () => {
    const entry: FluencyEntry = {
      date: new Date().toISOString().split('T')[0],
      wpm: parseInt(form.wpm) || 0,
      stutteringFreqPct: parseFloat(form.stutter) || 0,
      avoidanceBehaviors: form.avoidance ? form.avoidance.split(',').map(s => s.trim()) : [],
      notes: form.notes,
    };
    const updated = [entry, ...history];
    setHistory(updated);
    writeLS(LS_KEYS.fluency, updated);
    setForm({ wpm: '', stutter: '', avoidance: '', notes: '' });
    setShowForm(false);
  };

  const latest = history[0];
  const prev = history[1];

  return (
    <div className="space-y-4">
      {latest && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#EEF4F8] border border-[#C8DDE8] rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{latest.wpm}</p>
            <p className="text-sm text-blue-600 mt-1">Words per minute</p>
            {prev && (
              <p className={`text-xs mt-1 ${latest.wpm > prev.wpm ? 'text-green-600' : 'text-red-500'}`}>
                {latest.wpm > prev.wpm ? '+' : ''}{latest.wpm - prev.wpm} vs prior
              </p>
            )}
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-orange-700">{latest.stutteringFreqPct}%</p>
            <p className="text-sm text-orange-600 mt-1">Stuttering frequency</p>
            {prev && (
              <p className={`text-xs mt-1 ${latest.stutteringFreqPct < prev.stutteringFreqPct ? 'text-green-600' : 'text-red-500'}`}>
                {latest.stutteringFreqPct < prev.stutteringFreqPct ? '-' : '+'}{Math.abs(latest.stutteringFreqPct - prev.stutteringFreqPct)}% vs prior
              </p>
            )}
          </div>
        </div>
      )}

      {latest?.avoidanceBehaviors?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-medium text-amber-700 mb-1">Avoidance behaviors noted:</p>
          <div className="flex flex-wrap gap-1">
            {latest.avoidanceBehaviors.map(b => (
              <span key={b} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{b}</span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowForm(f => !f)}
        className="w-full py-2.5 border border-dashed border-blue-300 text-blue-600 rounded-xl text-sm font-medium hover:bg-[#EEF4F8] transition-colors"
      >
        <Plus className="w-4 h-4 inline mr-1" /> Log fluency session
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#EEF4F8] border border-[#C8DDE8] rounded-xl p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#5A6B7A]">WPM</label>
                <input type="number" value={form.wpm} onChange={e => setForm(f => ({ ...f, wpm: e.target.value }))} className="w-full mt-1 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5A6B7A]">Stutter % </label>
                <input type="number" step="0.5" value={form.stutter} onChange={e => setForm(f => ({ ...f, stutter: e.target.value }))} className="w-full mt-1 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#5A6B7A]">Avoidance behaviors (comma-separated)</label>
              <input value={form.avoidance} onChange={e => setForm(f => ({ ...f, avoidance: e.target.value }))} placeholder="word substitution, circumlocution..." className="w-full mt-1 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5A6B7A]">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full mt-1 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:outline-none" />
            </div>
            <button onClick={addEntry} disabled={!form.wpm} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">Save</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Speech Note Template ─────────────────────────────────────────────

function SpeechNoteTemplate() {
  const today = new Date().toISOString().split('T')[0];
  const [note, setNote] = useState<Partial<SLPNote>>({
    date: today,
    articulationTargets: '/s/, /z/ — word-initial position',
    articulationPct: 72,
    languageGoals: 'Increasing MLU to 3.0; agent-action-object combinations',
    fluencyWpm: 95,
    fluencyStutterPct: 7,
    aacSymbolsUsed: 14,
    caregiverProgram: 'Model target sounds during dinner conversation. Pause and wait before prompting.',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const notes = readLS<Partial<SLPNote>[]>(LS_KEYS.notes, []);
    notes.unshift({ ...note, date: today });
    writeLS(LS_KEYS.notes, notes.slice(0, 50));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCopy = () => {
    const text = `
SLP Session Note — ${note.date}
===============================
Articulation Targets: ${note.articulationTargets}
% Correct: ${note.articulationPct}%

Language Goals: ${note.languageGoals}

Fluency: ${note.fluencyWpm} WPM, ${note.fluencyStutterPct}% stuttering frequency

AAC Symbols Used This Session: ${note.aacSymbolsUsed}

Caregiver Home Program:
${note.caregiverProgram}
`.trim();
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Field label="Articulation Targets">
        <input value={note.articulationTargets ?? ''} onChange={e => setNote(n => ({ ...n, articulationTargets: e.target.value }))} className="w-full rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-[#6B9080] focus:outline-none" />
      </Field>
      <Field label="% Correct This Session">
        <div className="flex items-center gap-3">
          <input type="number" min={0} max={100} value={note.articulationPct ?? ''} onChange={e => setNote(n => ({ ...n, articulationPct: parseInt(e.target.value) || 0 }))} className="w-24 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-[#6B9080] focus:outline-none" />
          <div className="flex-1 h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${note.articulationPct ?? 0}%` }} />
          </div>
          <span className="text-sm font-medium text-[#6B9080]">{note.articulationPct}%</span>
        </div>
      </Field>
      <Field label="Language Goals & Data">
        <textarea value={note.languageGoals ?? ''} onChange={e => setNote(n => ({ ...n, languageGoals: e.target.value }))} rows={2} className="w-full rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-[#6B9080] focus:outline-none resize-none" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fluency WPM">
          <input type="number" value={note.fluencyWpm ?? ''} onChange={e => setNote(n => ({ ...n, fluencyWpm: parseInt(e.target.value) || 0 }))} className="w-full rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:outline-none" />
        </Field>
        <Field label="Stutter %">
          <input type="number" step="0.5" value={note.fluencyStutterPct ?? ''} onChange={e => setNote(n => ({ ...n, fluencyStutterPct: parseFloat(e.target.value) || 0 }))} className="w-full rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:outline-none" />
        </Field>
      </div>
      <Field label="AAC Symbol Set Used (count)">
        <input type="number" value={note.aacSymbolsUsed ?? ''} onChange={e => setNote(n => ({ ...n, aacSymbolsUsed: parseInt(e.target.value) || 0 }))} className="w-full rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:outline-none" />
      </Field>
      <Field label="Caregiver Home Program Recommendations">
        <textarea value={note.caregiverProgram ?? ''} onChange={e => setNote(n => ({ ...n, caregiverProgram: e.target.value }))} rows={3} className="w-full rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-[#6B9080] focus:outline-none resize-none" />
      </Field>

      <div className="flex gap-2">
        <button onClick={handleSave} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-[#6B9080]'}`}>
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Note</>}
        </button>
        <button onClick={handleCopy} className="px-4 py-3 border border-[#E8E4DF] rounded-xl text-sm text-[#5A6B7A] hover:bg-[#FAF7F2] flex items-center gap-1.5">
          <Download className="w-4 h-4" /> Copy
        </button>
      </div>
    </div>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────

type Tab = 'aac' | 'language' | 'articulation' | 'fluency' | 'note';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'aac', label: 'AAC Goals', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'language', label: 'Language', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'articulation', label: 'Articulation', icon: <Volume2 className="w-4 h-4" /> },
  { id: 'fluency', label: 'Fluency', icon: <Activity className="w-4 h-4" /> },
  { id: 'note', label: 'Session Note', icon: <FileText className="w-4 h-4" /> },
];

// ─── Main component ───────────────────────────────────────────────────

interface SLPProviderToolsProps {
  onBack?: () => void;
}

export default function SLPProviderTools({ onBack }: SLPProviderToolsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('aac');

  const renderTab = () => {
    switch (activeTab) {
      case 'aac': return <AACGoalTracker />;
      case 'language': return <LanguageSampleAnalysis />;
      case 'articulation': return <ArticulationProgress />;
      case 'fluency': return <FluencyTracker />;
      case 'note': return <SpeechNoteTemplate />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#F0EDE8] text-[#5A6B7A]">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-[#1B2733]">SLP Clinical Tools</h1>
            <p className="text-xs text-[#5A6B7A]">Speech-Language Pathology</p>
          </div>
          <div className="ml-auto px-2 py-1 bg-[#6B9080]/10 text-[#6B9080] text-xs font-medium rounded-full">
            CCC-SLP
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto border-t border-[#E8E4DF]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#6B9080] text-[#6B9080] bg-[#6B9080]/10/50'
                  : 'border-transparent text-[#5A6B7A] hover:text-[#3A4A57]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
