// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

export interface TreatmentTarget {
  name: string;
  description?: string;
  promptingLevel?: string;
  masteryGoal?: string;
}

interface HomePracticeActivity {
  time: string;
  title: string;
  steps: string[];
  reinforcer?: string;
  durationMinutes: number;
}

interface HomePracticeDay {
  day: number;
  label: string;
  activities: HomePracticeActivity[];
}

export interface HomePracticePlan {
  childName: string;
  target: string;
  generatedAt: string;
  weeklyGoal: string;
  schedule: HomePracticeDay[];
  tips: string[];
  fadingNote: string;
}

interface AIHomePracticePlanProps {
  childName: string;
  targets: TreatmentTarget[];
  onPlanGenerated?: (plan: HomePracticePlan) => void;
}

function buildPrompt(childName: string, targets: TreatmentTarget[]): string {
  return `You are a BCBA creating a home practice plan for parents. The child is ${childName}.

Treatment targets:
${targets.map((t, i) => `${i + 1}. ${t.name}${t.description ? `: ${t.description}` : ''}${t.promptingLevel ? ` (current prompting: ${t.promptingLevel})` : ''}${t.masteryGoal ? ` (mastery: ${t.masteryGoal})` : ''}`).join('\n')}

Create a realistic 2-week home practice schedule. Focus on the FIRST target if there are multiple.

Respond with ONLY valid JSON:
{
  "childName": "${childName}",
  "target": "target name",
  "generatedAt": "${new Date().toISOString()}",
  "weeklyGoal": "1-sentence goal",
  "schedule": [{"day":1,"label":"Day 1 (Monday)","activities":[{"time":"Morning","title":"Activity","steps":["Step 1","Step 2","Step 3"],"reinforcer":"specific praise","durationMinutes":10}]}],
  "tips": ["Tip 1","Tip 2","Tip 3"],
  "fadingNote": "How to fade prompts over 2 weeks"
}
Include 7 days, 1-2 activities each. Keep activities brief (5-15 min) and naturally embedded in daily routines. Fade prompts across the schedule.`;
}

export function AIHomePracticePlan({ childName, targets, onPlanGenerated }: AIHomePracticePlanProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<HomePracticePlan | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [copied, setCopied] = useState(false);

  const generatePlan = async () => {
    if (targets.length === 0) {
      toast.error('Add at least one treatment target first');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            userMessage: 'Generate home practice plan',
            conversationHistory: [],
            systemPrompt: buildPrompt(childName, targets),
          }),
        }
      );
      if (!response.ok) throw new Error('failed');
      const data = await response.json();
      const raw = data.message || data.response || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('no json');
      const generated = JSON.parse(jsonMatch[0]) as HomePracticePlan;
      setPlan(generated);
      onPlanGenerated?.(generated);
      toast.success('2-week home practice plan ready');
    } catch {
      toast.error('Could not generate plan — try again');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPlan = async () => {
    if (!plan) return;
    const text = [
      `HOME PRACTICE PLAN — ${plan.childName}`,
      `Target: ${plan.target}`,
      `Goal: ${plan.weeklyGoal}`,
      '',
      ...plan.schedule.flatMap(day => [
        day.label,
        ...day.activities.flatMap(a => [
          `  ${a.time}: ${a.title} (${a.durationMinutes}min)`,
          ...a.steps.map(s => `    • ${s}`),
          ...(a.reinforcer ? [`    → Reinforce: ${a.reinforcer}`] : []),
        ]),
        '',
      ]),
      'TIPS:', ...plan.tips.map(t => `• ${t}`),
      '', `FADING: ${plan.fadingNote}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  if (!plan) {
    return (
      <Button
        onClick={generatePlan}
        disabled={isGenerating || targets.length === 0}
        className="w-full"
        style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)' }}
      >
        {isGenerating
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating 2-week plan…</>
          : <><Sparkles className="w-4 h-4 mr-2" />Generate Home Practice Plan</>}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #43AA8B18 0%, #57759018 100%)', border: '1px solid #43AA8B35' }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[#1B2733]">✦ 2-Week Practice Plan</p>
            <p className="text-xs text-[#5A6B7A] mt-0.5">Target: {plan.target}</p>
          </div>
          <button onClick={copyPlan} className="p-1.5 rounded-lg hover:bg-white/60 transition-colors">
            {copied ? <Check className="w-4 h-4 text-[#6B9080]" /> : <Copy className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
        <p className="text-xs text-[#5A6B7A] mt-2 italic">"{plan.weeklyGoal}"</p>
      </div>

      {/* Schedule */}
      <div className="space-y-2">
        {plan.schedule.map((day) => (
          <div key={day.day} className="border border-[#E8E4DF] rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#FAF7F2] transition-colors"
              onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{day.label}</Badge>
                <span className="text-xs text-[#5A6B7A]">{day.activities.map(a => a.title).join(' · ')}</span>
              </div>
              {expandedDay === day.day ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedDay === day.day && (
              <div className="px-4 pb-4 pt-2 bg-[#FAF7F2] space-y-3">
                {day.activities.map((a, ai) => (
                  <div key={ai} className="bg-white rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#1B2733]">{a.title}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">{a.time}</span>
                        <Badge variant="outline" className="text-xs">{a.durationMinutes}m</Badge>
                      </div>
                    </div>
                    <ol className="space-y-1">
                      {a.steps.map((step, si) => (
                        <li key={si} className="flex gap-2 text-xs text-[#5A6B7A]">
                          <span className="w-4 h-4 rounded-full bg-[#6B9080]/10 text-[#6B9080] flex items-center justify-center shrink-0 font-medium text-xs">{si + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    {a.reinforcer && (
                      <p className="text-xs text-[#6B9080] bg-[#6B9080]/10 rounded-lg px-3 py-1.5">✦ Reinforce: {a.reinforcer}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      {plan.tips.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-800">Parent Tips</p>
          {plan.tips.map((tip, i) => <p key={i} className="text-xs text-amber-700">• {tip}</p>)}
        </div>
      )}
      {plan.fadingNote && (
        <p className="text-xs text-[#5A6B7A] text-center italic px-2">{plan.fadingNote}</p>
      )}

      <Button variant="outline" size="sm" className="w-full" onClick={() => setPlan(null)}>
        Regenerate Plan
      </Button>
    </div>
  );
}
