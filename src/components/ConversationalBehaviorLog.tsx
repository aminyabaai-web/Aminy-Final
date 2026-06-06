// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import React, { useState } from 'react';
import { Mic, Send, Check, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

interface ParsedBehavior {
  behavior_type: string;
  trigger: string | null;
  intensity: number | null;
  duration_minutes: number | null;
  location: string | null;
  antecedent: string | null;
  consequence: string | null;
  is_positive: boolean;
  notes: string;
}

interface ConversationalBehaviorLogProps {
  userId: string;
  childName?: string;
  onLogged?: () => void;
}

const PARSE_SYSTEM_PROMPT = `You are an ABA data specialist. A parent just described a behavior incident.
Extract the following fields into JSON. If a field isn't mentioned, use null.

JSON structure (respond ONLY with this JSON, no other text):
{
  "behavior_type": "string (e.g., 'meltdown', 'aggression', 'self-injury', 'elopement', 'tantrum', 'verbal refusal', 'non-compliance', 'positive behavior', 'skill mastery')",
  "trigger": "string or null (what caused it)",
  "intensity": number 1-5 or null (1=mild, 5=severe),
  "duration_minutes": number or null,
  "location": "string or null",
  "antecedent": "string or null (what happened right before)",
  "consequence": "string or null (what happened after / how caregiver responded)",
  "is_positive": boolean (true if celebrating a win, not a problem behavior),
  "notes": "string (clean 1-sentence summary of the incident)"
}`;

export function ConversationalBehaviorLog({ userId, childName, onLogged }: ConversationalBehaviorLogProps) {
  const [description, setDescription] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedBehavior | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const name = childName || 'your child';

  const parseDescription = async () => {
    if (!description.trim()) return;
    setIsParsing(true);
    setParsed(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userMessage: description,
            conversationHistory: [],
            systemPrompt: PARSE_SYSTEM_PROMPT,
          }),
        }
      );

      if (!response.ok) throw new Error('parse failed');

      const data = await response.json();
      const raw = data.message || data.response || '';

      // Extract JSON from response (AI may wrap it in markdown)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('no json');

      const behavior = JSON.parse(jsonMatch[0]) as ParsedBehavior;
      setParsed(behavior);
    } catch {
      toast.error('Could not parse — try describing with more detail');
    } finally {
      setIsParsing(false);
    }
  };

  const confirmAndLog = async () => {
    if (!parsed) return;
    setIsSaving(true);

    try {
      const { error } = await supabase.from('behavior_logs').insert({
        user_id: userId,
        behavior_type: parsed.behavior_type,
        trigger: parsed.trigger,
        intensity: parsed.intensity,
        duration_minutes: parsed.duration_minutes,
        location: parsed.location,
        antecedent: parsed.antecedent,
        consequence: parsed.consequence,
        is_positive: parsed.is_positive,
        notes: parsed.notes,
        logged_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success(parsed.is_positive ? `🎉 Win logged for ${name}!` : `✓ Behavior logged`);
      setDescription('');
      setParsed(null);
      onLogged?.();
    } catch {
      toast.error('Could not save — try again');
    } finally {
      setIsSaving(false);
    }
  };

  const intensityLabel = (n: number | null) => {
    if (!n) return null;
    return ['', 'Mild', 'Low', 'Moderate', 'High', 'Severe'][n];
  };

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="relative">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={`Describe what happened with ${name} — in your own words. E.g., "He had a meltdown at the grocery store after I said no to candy, lasted about 10 minutes, eventually calmed down with music"`}
          className="w-full px-4 py-3 pr-12 bg-[#FAF7F2] border border-[#E8E4DF] rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm placeholder:text-slate-400"
          style={{ minHeight: '80px', maxHeight: '140px' }}
          rows={3}
          onKeyDown={e => {
            if (e.key === 'Enter' && e.metaKey) parseDescription();
          }}
        />
        <button
          className="absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#6B9080] transition-colors"
          title="Voice input (coming soon)"
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>

      <Button
        onClick={parseDescription}
        disabled={!description.trim() || isParsing}
        className="w-full bg-primary hover:bg-[#6B9080]"
        size="sm"
      >
        {isParsing ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing…</>
        ) : (
          <><Send className="w-4 h-4 mr-2" />Parse & Review</>
        )}
      </Button>

      {/* Parsed preview card */}
      {parsed && (
        <div className={`rounded-2xl border-2 p-4 space-y-2 ${parsed.is_positive ? 'border-green-300 bg-green-50' : 'border-[#6B9080]/30 bg-[#6B9080]/10'}`}>
          <p className="text-sm font-semibold text-[#1B2733]">
            {parsed.is_positive ? '🎉' : '📋'} {parsed.behavior_type}
          </p>

          <p className="text-xs text-[#5A6B7A] leading-relaxed">{parsed.notes}</p>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {parsed.trigger && (
              <div className="bg-white rounded-lg px-2.5 py-1.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Trigger</p>
                <p className="text-xs font-medium text-[#3A4A57]">{parsed.trigger}</p>
              </div>
            )}
            {parsed.intensity && (
              <div className="bg-white rounded-lg px-2.5 py-1.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Intensity</p>
                <p className="text-xs font-medium text-[#3A4A57]">{parsed.intensity}/5 · {intensityLabel(parsed.intensity)}</p>
              </div>
            )}
            {parsed.duration_minutes && (
              <div className="bg-white rounded-lg px-2.5 py-1.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Duration</p>
                <p className="text-xs font-medium text-[#3A4A57]">{parsed.duration_minutes}m</p>
              </div>
            )}
            {parsed.location && (
              <div className="bg-white rounded-lg px-2.5 py-1.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Location</p>
                <p className="text-xs font-medium text-[#3A4A57]">{parsed.location}</p>
              </div>
            )}
            {parsed.antecedent && (
              <div className="bg-white rounded-lg px-2.5 py-1.5 col-span-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Antecedent</p>
                <p className="text-xs font-medium text-[#3A4A57]">{parsed.antecedent}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={confirmAndLog}
              disabled={isSaving}
              size="sm"
              className="flex-1 bg-primary hover:bg-[#6B9080]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Confirm & Log</>}
            </Button>
            <Button
              onClick={() => setParsed(null)}
              variant="outline"
              size="sm"
              className="px-3"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
