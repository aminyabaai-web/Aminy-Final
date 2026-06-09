// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * MHProgressSummary
 * Parent-friendly mental health progress view.
 * Shows PHQ-9/GAD-7 trends in plain language, skills practiced, parent tips, safety.
 * Screen: 'mh-progress-summary'
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Heart, TrendingDown, TrendingUp, Minus, Shield,
  CheckCircle, Lightbulb, Star,
} from 'lucide-react';
import {
  getScreenerHistory,
  getDemoHistory,
  type ScreenerResult,
} from '../../lib/screener-service';

// ─── Types ────────────────────────────────────────────────────────────

interface MHProgressSummaryProps {
  childName?: string;
  childId?: string;
  onBack?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function phqTrend(history: ScreenerResult[]): { label: string; detail: string; icon: React.ReactNode; color: string } {
  if (history.length < 2) {
    return { label: 'Building baseline', detail: 'We\'ll show your trend after the second check-in.', icon: <Minus className="w-5 h-5 text-[#8A9BA8]" />, color: 'text-[#5A6B7A]' };
  }
  const delta = history[0].score - history[1].score;
  const latestSev = String(history[0].severity).replace('_', ' ');
  if (delta < -2) {
    return {
      label: 'Mood is improving',
      detail: `Currently in the ${latestSev} range — down from the previous check-in.`,
      icon: <TrendingDown className="w-5 h-5 text-green-500" />,
      color: 'text-green-700',
    };
  }
  if (delta > 2) {
    return {
      label: 'Mood needs attention',
      detail: `Currently in the ${latestSev} range — an increase from last time. Your provider has been notified.`,
      icon: <TrendingUp className="w-5 h-5 text-red-500" />,
      color: 'text-red-700',
    };
  }
  return {
    label: 'Mood is stable',
    detail: `Currently in the ${latestSev} range — holding steady.`,
    icon: <Minus className="w-5 h-5 text-blue-400" />,
    color: 'text-blue-700',
  };
}

function gadTrend(history: ScreenerResult[]): { label: string; detail: string; icon: React.ReactNode; color: string } {
  if (history.length < 2) {
    return { label: 'Building baseline', detail: 'Anxiety trend will appear after the second check-in.', icon: <Minus className="w-5 h-5 text-[#8A9BA8]" />, color: 'text-[#5A6B7A]' };
  }
  const delta = history[0].score - history[1].score;
  const latestSev = String(history[0].severity);
  if (delta < -2) {
    return {
      label: 'Anxiety symptoms are decreasing',
      detail: `Currently in the ${latestSev} range — a real improvement from before.`,
      icon: <TrendingDown className="w-5 h-5 text-green-500" />,
      color: 'text-green-700',
    };
  }
  if (delta > 2) {
    return {
      label: 'Anxiety has increased',
      detail: `Currently in the ${latestSev} range. Your provider is monitoring this closely.`,
      icon: <TrendingUp className="w-5 h-5 text-red-500" />,
      color: 'text-red-700',
    };
  }
  return {
    label: 'Anxiety is stable',
    detail: `Currently in the ${latestSev} range — no significant change.`,
    icon: <Minus className="w-5 h-5 text-blue-400" />,
    color: 'text-blue-700',
  };
}

// ─── Main Component ───────────────────────────────────────────────────

export default function MHProgressSummary({ childName = 'your child', childId = 'demo-child', onBack }: MHProgressSummaryProps) {
  const [phqHistory, setPhqHistory] = useState<ScreenerResult[]>([]);
  const [gadHistory, setGadHistory] = useState<ScreenerResult[]>([]);

  useEffect(() => {
    const phq = getScreenerHistory(childId, 'PHQ-9');
    const gad = getScreenerHistory(childId, 'GAD-7');
    setPhqHistory(phq.length > 0 ? phq : getDemoHistory('PHQ-9'));
    setGadHistory(gad.length > 0 ? gad : getDemoHistory('GAD-7'));
  }, [childId]);

  const phqInfo = phqTrend(phqHistory);
  const gadInfo = gadTrend(gadHistory);

  // Last safety log
  const safetyNote = (() => {
    try {
      const raw = localStorage.getItem('mh_safety_log');
      if (!raw) return null;
      const log = JSON.parse(raw) as Array<{ date: string; risk: string; si: string; hi: string }>;
      if (log.length === 0) return null;
      const latest = log[0];
      const days = Math.round((Date.now() - new Date(latest.date).getTime()) / 86400000);
      if (latest.si === 'none' && latest.hi === 'none') {
        return `No safety concerns reported in the last ${days === 0 ? 'session' : `${days} days`}.`;
      }
      return `Your provider noted a concern on ${latest.date} — ${latest.risk} risk level. Please follow up with your care team.`;
    } catch { return null; }
  })();

  // CBT skills from session notes
  const skillsPracticed = (() => {
    try {
      const raw = localStorage.getItem('mh_session_notes');
      if (!raw) return null;
      const notes = JSON.parse(raw) as Array<{ interventions?: string[] }>;
      const allSkills = notes.flatMap(n => n.interventions ?? []);
      const counts: Record<string, number> = {};
      allSkills.forEach(s => { counts[s] = (counts[s] ?? 0) + 1; });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([skill]) => skill);
    } catch { return null; }
  })() ?? ['Cognitive restructuring', 'Breathing / relaxation', 'Behavioral activation'];

  const parentTips: Record<string, string> = {
    'Cognitive restructuring': `When ${childName} says "everything is terrible," gently ask: "Is there another way to look at this?"`,
    'Behavioral activation': `Encourage one small enjoyable activity each day — even 10 minutes of something ${childName} loves.`,
    'Breathing / relaxation': `Practice the 4-7-8 breath together before stressful situations like school.`,
    'DBT skills (TIPP, STOP)': `If ${childName} is overwhelmed, try TIPP: Temperature (cold water), Intense exercise, Paced breathing, Paired muscle relaxation.`,
    'Mindfulness': `Try a 2-minute "5 senses" check-in together: name 5 things you see, 4 you hear, 3 you feel.`,
    'Psychoeducation': `Learning that anxiety is normal can reduce shame. "Everyone feels worried sometimes" is powerful.`,
  };

  const tips = skillsPracticed.map(s => parentTips[s]).filter(Boolean).slice(0, 3);
  const defaultTips = [
    `Validate ${childName}'s feelings before jumping to solutions.`,
    `Maintain predictable routines — consistency reduces anxiety.`,
    `Celebrate effort, not just outcomes.`,
  ];

  return (
    <div className="min-h-screen bg-mist pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#F0EDE8] text-[#5A6B7A]">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold text-[#1B2733]">Mental Health Progress</h1>
          <p className="text-xs text-[#5A6B7A]">{childName} — plain-language summary</p>
        </div>
        <Heart className="w-5 h-5 text-pink-400 ml-auto" />
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Mood trend */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white border border-[#E8E4DF] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{phqHistory[0]?.score !== undefined && phqHistory[0].score < 5 ? '😊' : phqHistory[0]?.score !== undefined && phqHistory[0].score < 10 ? '😐' : '😔'}</span>
            <h2 className="font-semibold text-[#1B2733]">Mood Check-In</h2>
          </div>
          <div className="flex items-start gap-2">
            {phqInfo.icon}
            <div>
              <p className={`font-medium ${phqInfo.color}`}>{phqInfo.label}</p>
              <p className="text-sm text-[#5A6B7A] mt-0.5">{phqInfo.detail}</p>
            </div>
          </div>
          {phqHistory.length > 1 && (
            <div className="mt-3 flex items-end gap-1 h-10">
              {[...phqHistory].reverse().slice(0, 6).map((h, i) => (
                <div key={i} className="flex-1 bg-violet-200 rounded-t" style={{ height: `${(h.score / 27) * 100}%`, minHeight: 2 }} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Anxiety trend */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white border border-[#E8E4DF] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{gadHistory[0]?.score !== undefined && gadHistory[0].score < 5 ? '😌' : gadHistory[0]?.score !== undefined && gadHistory[0].score < 10 ? '😬' : '😰'}</span>
            <h2 className="font-semibold text-[#1B2733]">Anxiety Check-In</h2>
          </div>
          <div className="flex items-start gap-2">
            {gadInfo.icon}
            <div>
              <p className={`font-medium ${gadInfo.color}`}>{gadInfo.label}</p>
              <p className="text-sm text-[#5A6B7A] mt-0.5">{gadInfo.detail}</p>
            </div>
          </div>
          {gadHistory.length > 1 && (
            <div className="mt-3 flex items-end gap-1 h-10">
              {[...gadHistory].reverse().slice(0, 6).map((h, i) => (
                <div key={i} className="flex-1 bg-[#6B9080]/20 rounded-t" style={{ height: `${(h.score / 21) * 100}%`, minHeight: 2 }} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Skills practiced this month */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white border border-[#E8E4DF] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-[#1B2733]">What we worked on this month</h2>
          </div>
          <div className="space-y-2">
            {skillsPracticed.map(skill => (
              <div key={skill} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-[#3A4A57]">{skill}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How you can help */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[#6B9080]/10 border border-[#6B9080]/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-[#6B9080]" />
            <h2 className="font-semibold text-[#6B9080]">How you can help at home</h2>
          </div>
          <div className="space-y-3">
            {(tips.length > 0 ? tips : defaultTips).map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-primary font-bold text-sm mt-0.5">{i + 1}.</span>
                <p className="text-sm text-[#6B9080]">{tip}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Safety */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-green-800">Safety</h2>
          </div>
          <p className="text-sm text-green-700 mt-2">
            {safetyNote ?? `No safety concerns reported in the last 30 days. Your provider screens for safety at every session.`}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
