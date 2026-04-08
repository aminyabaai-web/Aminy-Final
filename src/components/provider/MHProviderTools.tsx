// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * MHProviderTools
 * Mental health / LCSW-specific clinical tool suite:
 * PHQ-9 integration, GAD-7 integration, BRIEF-2 screener,
 * MH session note (CBT/DBT), Safety screening log.
 * Screen: 'mh-provider-tools'
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Heart, Brain, Shield, FileText, TrendingUp, TrendingDown,
  Minus, Plus, Check, AlertTriangle, Save, Download, Clock,
} from 'lucide-react';
import {
  saveScreenerResult,
  getScreenerHistory,
  getLatestScore,
  getScoreTrend,
  phq9Severity,
  gad7Severity,
  brief2Elevation,
  getDemoHistory,
  type ScreenerResult,
} from '../../lib/screener-service';

// ─── Types ────────────────────────────────────────────────────────────

interface SafetyEntry {
  date: string;
  si: 'none' | 'ideation' | 'plan';
  hi: 'none' | 'ideation' | 'plan';
  risk: 'low' | 'moderate' | 'high';
  note: string;
}

interface MHNote {
  date: string;
  presentingConcerns: string;
  interventions: string[];
  childResponse: string;
  si: 'none' | 'ideation' | 'plan';
  hi: 'none' | 'ideation' | 'plan';
  riskLevel: 'low' | 'moderate' | 'high';
  plan: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const LS_SAFETY = 'mh_safety_log';
const LS_NOTES = 'mh_session_notes';
const CHILD_ID = 'demo-child';

const INTERVENTIONS = [
  'Cognitive restructuring',
  'Behavioral activation',
  'Breathing / relaxation',
  'DBT skills (TIPP, STOP)',
  'Mindfulness',
  'Play therapy',
  'Psychoeducation',
  'Family systems',
  'Exposure / gradual hierarchy',
  'Safety planning',
];

function readLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeLS<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ─── PHQ-9 Integration ───────────────────────────────────────────────

function PHQ9Widget() {
  const [history, setHistory] = useState<ScreenerResult[]>([]);
  const [showEntry, setShowEntry] = useState(false);
  const [scoreInput, setScoreInput] = useState('');

  useEffect(() => {
    const saved = getScreenerHistory(CHILD_ID, 'PHQ-9');
    setHistory(saved.length > 0 ? saved : getDemoHistory('PHQ-9'));
  }, []);

  const latest = history[0];
  const trend = history.length >= 2
    ? (history[0].score < history[1].score ? 'improving' : history[0].score > history[1].score ? 'worsening' : 'stable')
    : 'insufficient_data';

  const trendIcon = trend === 'improving'
    ? <TrendingDown className="w-4 h-4 text-green-500" />
    : trend === 'worsening'
    ? <TrendingUp className="w-4 h-4 text-red-500" />
    : <Minus className="w-4 h-4 text-gray-400" />;

  const severityColor: Record<string, string> = {
    minimal: 'text-green-700 bg-green-50 border-green-200',
    mild: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    moderate: 'text-orange-700 bg-orange-50 border-orange-200',
    moderately_severe: 'text-red-700 bg-red-50 border-red-200',
    severe: 'text-red-800 bg-red-100 border-red-300',
  };

  const logScore = async () => {
    const score = parseInt(scoreInput);
    if (isNaN(score) || score < 0 || score > 27) return;
    const result: ScreenerResult = {
      instrument: 'PHQ-9',
      score,
      severity: phq9Severity(score),
      date: new Date().toISOString(),
      childId: CHILD_ID,
    };
    await saveScreenerResult(result);
    setHistory(prev => [result, ...prev]);
    setScoreInput('');
    setShowEntry(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">PHQ-9 Depression Screen</h4>
        <button onClick={() => setShowEntry(f => !f)} className="text-sm text-violet-600 font-medium">
          {showEntry ? 'Cancel' : '+ Log Score'}
        </button>
      </div>

      {latest && (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${severityColor[latest.severity] ?? 'bg-gray-50'}`}>
          <div>
            <p className="text-2xl font-bold">{latest.score}<span className="text-sm font-normal opacity-60">/27</span></p>
            <p className="text-sm capitalize font-medium">{String(latest.severity).replace('_', ' ')} depression</p>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            {trendIcon}
            <span className={trend === 'improving' ? 'text-green-600' : trend === 'worsening' ? 'text-red-600' : 'text-gray-500'}>
              {trend === 'insufficient_data' ? 'No trend yet' : trend.charAt(0).toUpperCase() + trend.slice(1)}
            </span>
          </div>
        </div>
      )}

      {/* Mini chart */}
      {history.length > 1 && (
        <div className="flex items-end gap-1 h-12">
          {[...history].reverse().slice(0, 6).map((h, i) => (
            <div key={i} className="flex-1 bg-violet-300 rounded-t" style={{ height: `${(h.score / 27) * 100}%`, minHeight: 3 }} title={`${h.score}`} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showEntry && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-2">
            <input type="number" min={0} max={27} value={scoreInput} onChange={e => setScoreInput(e.target.value)} placeholder="Score (0–27)" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
            <button onClick={logScore} disabled={!scoreInput} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">Log</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── GAD-7 Integration ────────────────────────────────────────────────

function GAD7Widget() {
  const [history, setHistory] = useState<ScreenerResult[]>([]);
  const [showEntry, setShowEntry] = useState(false);
  const [scoreInput, setScoreInput] = useState('');

  useEffect(() => {
    const saved = getScreenerHistory(CHILD_ID, 'GAD-7');
    setHistory(saved.length > 0 ? saved : getDemoHistory('GAD-7'));
  }, []);

  const latest = history[0];
  const trend = history.length >= 2
    ? (history[0].score < history[1].score ? 'improving' : history[0].score > history[1].score ? 'worsening' : 'stable')
    : 'insufficient_data';

  const sevColor: Record<string, string> = {
    minimal: 'text-green-700 bg-green-50 border-green-200',
    mild: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    moderate: 'text-orange-700 bg-orange-50 border-orange-200',
    severe: 'text-red-700 bg-red-50 border-red-200',
  };

  const logScore = async () => {
    const score = parseInt(scoreInput);
    if (isNaN(score) || score < 0 || score > 21) return;
    const result: ScreenerResult = {
      instrument: 'GAD-7',
      score,
      severity: gad7Severity(score),
      date: new Date().toISOString(),
      childId: CHILD_ID,
    };
    await saveScreenerResult(result);
    setHistory(prev => [result, ...prev]);
    setScoreInput('');
    setShowEntry(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">GAD-7 Anxiety Screen</h4>
        <button onClick={() => setShowEntry(f => !f)} className="text-sm text-teal-600 font-medium">
          {showEntry ? 'Cancel' : '+ Log Score'}
        </button>
      </div>

      {latest && (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${sevColor[latest.severity] ?? 'bg-gray-50'}`}>
          <div>
            <p className="text-2xl font-bold">{latest.score}<span className="text-sm font-normal opacity-60">/21</span></p>
            <p className="text-sm font-medium capitalize">{latest.severity} anxiety</p>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            {trend === 'improving' ? <TrendingDown className="w-4 h-4 text-green-500" /> : trend === 'worsening' ? <TrendingUp className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4 text-gray-400" />}
            <span className={trend === 'improving' ? 'text-green-600' : trend === 'worsening' ? 'text-red-600' : 'text-gray-500'}>
              {trend === 'insufficient_data' ? 'No trend yet' : trend.charAt(0).toUpperCase() + trend.slice(1)}
            </span>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div className="flex items-end gap-1 h-12">
          {[...history].reverse().slice(0, 6).map((h, i) => (
            <div key={i} className="flex-1 bg-teal-300 rounded-t" style={{ height: `${(h.score / 21) * 100}%`, minHeight: 3 }} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showEntry && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-2">
            <input type="number" min={0} max={21} value={scoreInput} onChange={e => setScoreInput(e.target.value)} placeholder="Score (0–21)" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
            <button onClick={logScore} disabled={!scoreInput} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">Log</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── BRIEF-2 Brief Assessment ─────────────────────────────────────────

const BRIEF2_DOMAINS = [
  { id: 'inhibit', label: 'Inhibit', desc: 'Control impulses, stop behavior' },
  { id: 'shift', label: 'Shift', desc: 'Move between tasks/situations' },
  { id: 'emotional', label: 'Emotional Control', desc: 'Regulate emotional responses' },
  { id: 'initiate', label: 'Initiate', desc: 'Begin tasks independently' },
  { id: 'working_memory', label: 'Working Memory', desc: 'Hold info while working' },
  { id: 'plan', label: 'Plan/Organize', desc: 'Manage current/future tasks' },
];

function BRIEF2Widget() {
  const [history, setHistory] = useState<ScreenerResult[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const saved = getScreenerHistory(CHILD_ID, 'BRIEF-2');
    setHistory(saved.length > 0 ? saved : getDemoHistory('BRIEF-2'));
  }, []);

  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);
  const maxScore = BRIEF2_DOMAINS.length * 3;
  const allAnswered = Object.keys(scores).length === BRIEF2_DOMAINS.length;

  const getElevation = (total: number) => {
    const pct = total / maxScore;
    if (pct >= 0.75) return { label: 'At Risk', color: 'text-red-700 bg-red-50 border-red-200' };
    if (pct >= 0.55) return { label: 'Borderline', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { label: 'Elevated', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
  };

  const logBRIEF = async () => {
    if (!allAnswered) return;
    const elevation = brief2Elevation(totalScore, maxScore);
    const result: ScreenerResult = {
      instrument: 'BRIEF-2',
      score: totalScore,
      severity: elevation,
      date: new Date().toISOString(),
      childId: CHILD_ID,
      meta: { domainScores: scores },
    };
    await saveScreenerResult(result);
    setHistory(prev => [result, ...prev]);
    setScores({});
    setShowForm(false);
  };

  const latest = history[0];
  const latestElevation = latest ? getElevation(latest.score) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">BRIEF-2 Executive Function</h4>
        <button onClick={() => setShowForm(f => !f)} className="text-sm text-indigo-600 font-medium">
          {showForm ? 'Cancel' : '+ Screen'}
        </button>
      </div>

      {latest && latestElevation && (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${latestElevation.color}`}>
          <div>
            <p className="text-2xl font-bold">{latest.score}<span className="text-sm font-normal opacity-60">/{maxScore}</span></p>
            <p className="text-sm font-medium">{latestElevation.label}</p>
          </div>
          <div className="text-xs text-right opacity-70">
            {new Date(latest.date).toLocaleDateString()}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs text-gray-600 font-medium">Rate each domain: 1 = Never, 2 = Sometimes, 3 = Often</p>
            {BRIEF2_DOMAINS.map(domain => (
              <div key={domain.id}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{domain.label}</span>
                    <span className="text-xs text-gray-500 ml-1">— {domain.desc}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map(val => (
                    <button
                      key={val}
                      onClick={() => setScores(s => ({ ...s, [domain.id]: val }))}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        scores[domain.id] === val
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      {val === 1 ? 'Never' : val === 2 ? 'Sometimes' : 'Often'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {allAnswered && (
              <div className={`p-3 rounded-lg border ${getElevation(totalScore).color}`}>
                <p className="font-medium">Score: {totalScore}/{maxScore} — {getElevation(totalScore).label}</p>
              </div>
            )}
            <button onClick={logBRIEF} disabled={!allAnswered} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              Save Assessment
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Safety Screening Log ─────────────────────────────────────────────

function SafetyLog() {
  const [log, setLog] = useState<SafetyEntry[]>(() =>
    readLS<SafetyEntry[]>(LS_SAFETY, [
      { date: '2026-04-01', si: 'none', hi: 'none', risk: 'low', note: 'No safety concerns.' },
      { date: '2026-03-15', si: 'none', hi: 'none', risk: 'low', note: 'No safety concerns.' },
    ])
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SafetyEntry>({ date: new Date().toISOString().split('T')[0], si: 'none', hi: 'none', risk: 'low', note: '' });

  const addEntry = () => {
    const updated = [form, ...log];
    setLog(updated);
    writeLS(LS_SAFETY, updated);
    setShowForm(false);
    setForm({ date: new Date().toISOString().split('T')[0], si: 'none', hi: 'none', risk: 'low', note: '' });
  };

  const riskBadge = (risk: string) => {
    if (risk === 'high') return 'bg-red-100 text-red-700';
    if (risk === 'moderate') return 'bg-orange-100 text-orange-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Session-by-session safety screen log (liability record)</p>
        <button onClick={() => setShowForm(f => !f)} className="text-sm text-red-600 font-medium">+ Log screen</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Suicidal ideation</label>
                <select value={form.si} onChange={e => setForm(f => ({ ...f, si: e.target.value as SafetyEntry['si'] }))} className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none">
                  <option value="none">None</option>
                  <option value="ideation">Ideation only</option>
                  <option value="plan">Plan present</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Homicidal ideation</label>
                <select value={form.hi} onChange={e => setForm(f => ({ ...f, hi: e.target.value as SafetyEntry['hi'] }))} className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none">
                  <option value="none">None</option>
                  <option value="ideation">Ideation only</option>
                  <option value="plan">Plan present</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Risk level</label>
                <select value={form.risk} onChange={e => setForm(f => ({ ...f, risk: e.target.value as SafetyEntry['risk'] }))} className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none">
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Note</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="No safety concerns noted." className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none" />
            </div>
            <button onClick={addEntry} className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Save Safety Screen</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {log.map((entry, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl">
            <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">{entry.date}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskBadge(entry.risk)}`}>
                  {entry.risk.charAt(0).toUpperCase() + entry.risk.slice(1)} Risk
                </span>
                {entry.si !== 'none' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">SI: {entry.si}</span>}
                {entry.hi !== 'none' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">HI: {entry.hi}</span>}
              </div>
              {entry.note && <p className="text-xs text-gray-500 mt-1">{entry.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MH Session Note ──────────────────────────────────────────────────

function MHSessionNote() {
  const today = new Date().toISOString().split('T')[0];
  const [note, setNote] = useState<Partial<MHNote>>({
    date: today,
    presentingConcerns: 'Parent reports increased school avoidance and sleep disruption this week.',
    interventions: ['Cognitive restructuring', 'Psychoeducation'],
    childResponse: 'Child was engaged, practiced identifying cognitive distortions with therapist support.',
    si: 'none', hi: 'none', riskLevel: 'low',
    plan: 'Continue cognitive restructuring. Introduce behavioral activation schedule. Parent to monitor sleep log.',
  });
  const [saved, setSaved] = useState(false);

  const toggleIntervention = (name: string) => {
    setNote(n => ({
      ...n,
      interventions: n.interventions?.includes(name)
        ? n.interventions.filter(i => i !== name)
        : [...(n.interventions ?? []), name],
    }));
  };

  const handleSave = () => {
    const notes = readLS<Partial<MHNote>[]>(LS_NOTES, []);
    notes.unshift({ ...note, date: today });
    writeLS(LS_NOTES, notes.slice(0, 50));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const siHiBadge = (val: string) => val === 'none' ? 'bg-green-100 text-green-700' : val === 'ideation' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Presenting Concerns</label>
          <textarea value={note.presentingConcerns ?? ''} onChange={e => setNote(n => ({ ...n, presentingConcerns: e.target.value }))} rows={2} className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none resize-none" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Interventions Used</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {INTERVENTIONS.map(name => (
              <button
                key={name}
                onClick={() => toggleIntervention(name)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  note.interventions?.includes(name)
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                }`}
              >
                {note.interventions?.includes(name) && <Check className="w-3 h-3 inline mr-1" />}
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Child Response</label>
          <textarea value={note.childResponse ?? ''} onChange={e => setNote(n => ({ ...n, childResponse: e.target.value }))} rows={2} className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none resize-none" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Safety Screening</label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">SI</p>
              <select value={note.si} onChange={e => setNote(n => ({ ...n, si: e.target.value as MHNote['si'] }))} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none">
                <option value="none">None noted</option>
                <option value="ideation">Ideation only</option>
                <option value="plan">Plan present</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">HI</p>
              <select value={note.hi} onChange={e => setNote(n => ({ ...n, hi: e.target.value as MHNote['hi'] }))} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none">
                <option value="none">None noted</option>
                <option value="ideation">Ideation only</option>
                <option value="plan">Plan present</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Risk Level</p>
              <select value={note.riskLevel} onChange={e => setNote(n => ({ ...n, riskLevel: e.target.value as MHNote['riskLevel'] }))} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none">
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          {note.riskLevel === 'high' && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">High risk — document safety plan and emergency contact notification.</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan for Next Session</label>
          <textarea value={note.plan ?? ''} onChange={e => setNote(n => ({ ...n, plan: e.target.value }))} rows={2} className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none resize-none" />
        </div>
      </div>

      <button onClick={handleSave} className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${saved ? 'bg-green-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Session Note</>}
      </button>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────

type Tab = 'phq9' | 'gad7' | 'brief2' | 'safety' | 'note';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'phq9', label: 'PHQ-9', icon: <Heart className="w-4 h-4" /> },
  { id: 'gad7', label: 'GAD-7', icon: <Brain className="w-4 h-4" /> },
  { id: 'brief2', label: 'BRIEF-2', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'safety', label: 'Safety Log', icon: <Shield className="w-4 h-4" /> },
  { id: 'note', label: 'Session Note', icon: <FileText className="w-4 h-4" /> },
];

// ─── Main Component ───────────────────────────────────────────────────

interface MHProviderToolsProps {
  onBack?: () => void;
}

export default function MHProviderTools({ onBack }: MHProviderToolsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('phq9');

  const renderTab = () => {
    switch (activeTab) {
      case 'phq9': return <PHQ9Widget />;
      case 'gad7': return <GAD7Widget />;
      case 'brief2': return <BRIEF2Widget />;
      case 'safety': return <SafetyLog />;
      case 'note': return <MHSessionNote />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">MH Clinical Tools</h1>
            <p className="text-xs text-gray-500">Licensed Clinical Social Work</p>
          </div>
          <div className="ml-auto px-2 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
            LCSW
          </div>
        </div>

        <div className="flex gap-0 overflow-x-auto border-t border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-700 bg-violet-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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
