// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Memory Viewer — full-page "What Aminy knows about your family."
 *
 * Inspired by Bevel's transparency UX and ChatGPT's "Manage memory" panel.
 * Parents see every fact Aminy has stored, grouped by category, with the
 * ability to delete individual memories or wipe the slate.
 *
 * Why this matters:
 *   - Trust: HIPAA, parents need to see what's being stored
 *   - Quality: parents catch wrong inferences early ("Liam loves peanuts" → no, allergy)
 *   - Privacy lever: one-tap "forget everything" before sharing the phone
 */

import React, { useEffect, useState } from 'react';
import {
  ChevronLeft, Brain, Trash2, Heart, AlertTriangle, Award, Target, Pill, GraduationCap,
  Sparkles, X, RefreshCw, Loader2, Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { memoryManager, type MemoryFact } from '../lib/memory-system';
import type { TierType } from '../lib/tier-utils';

interface MemoryViewerProps {
  onBack?: () => void;
  childId: string;
  childName?: string;
  tier: TierType;
}

const CATEGORY_META: Record<MemoryFact['category'], { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  preference:  { label: 'Preferences',  icon: Heart,          color: '#E07A5F' },
  trigger:     { label: 'Triggers',     icon: AlertTriangle,  color: '#F8B400' },
  strength:    { label: 'Strengths',    icon: Award,          color: '#2A7D99' },
  challenge:   { label: 'Challenges',   icon: Target,         color: '#9B5DE5' },
  milestone:   { label: 'Milestones',   icon: Sparkles,       color: '#2A7D99' },
  strategy:    { label: 'Strategies',   icon: Lightbulb,      color: '#577590' },
  medical:     { label: 'Medical',      icon: Pill,           color: '#1a3a5c' },
  educational: { label: 'Educational',  icon: GraduationCap,  color: '#577590' },
};

const CATEGORY_ORDER: MemoryFact['category'][] = ['strength', 'preference', 'milestone', 'challenge', 'trigger', 'strategy', 'medical', 'educational'];

export function MemoryViewer({ onBack, childId, childName, tier }: MemoryViewerProps) {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [filter, setFilter] = useState<MemoryFact['category'] | 'all'>('all');
  const [isWiping, setIsWiping] = useState(false);

  function refresh() {
    setFacts(memoryManager.getFacts(childId, tier));
  }

  useEffect(() => { refresh(); }, [childId, tier]);

  const filtered = filter === 'all' ? facts : facts.filter(f => f.category === filter);
  const byCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    count: facts.filter(f => f.category === cat).length,
  }));

  function handleDelete(fact: MemoryFact) {
    if (!confirm(`Forget "${fact.content.slice(0, 60)}…"?`)) return;
    const ok = memoryManager.deleteFact(childId, fact.id);
    if (ok) {
      toast.success('Forgotten');
      refresh();
    } else {
      toast.error('Could not delete');
    }
  }

  function handleWipe() {
    if (!confirm(`Forget EVERYTHING Aminy knows about ${childName || 'your child'}?\n\nThis cannot be undone.`)) return;
    setIsWiping(true);
    setTimeout(() => {
      memoryManager.clearFactsForChild(childId);
      toast.success(`Memory cleared for ${childName || 'your child'}`);
      refresh();
      setIsWiping(false);
    }, 400);
  }

  return (
    <div className="min-h-screen bg-mist pb-20">
      {/* Header */}
      <div className="px-4 pt-3 pb-4 bg-white border-b border-[#E8E4DF]">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#5A6B7A] mb-3">
            <ChevronLeft className="w-4 h-4" />Back
          </button>
        )}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #577590 100%)' }}>
            <Brain className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#132F43]">What Aminy knows</h1>
            <p className="text-sm text-[#5A6B7A] mt-0.5">
              {childName ? `Everything Aminy remembers about ${childName}` : 'Your family memory'}
            </p>
          </div>
          <button
            onClick={refresh}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#EDF4F7]"
            aria-label="Refresh memory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Total + filter chips */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #2A7D9912 0%, #57759012 100%)', border: '1px solid #2A7D9925' }}>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-[#132F43]">{facts.length}</p>
            <p className="text-sm text-[#5A6B7A]">things remembered</p>
          </div>
          <p className="text-sm text-[#5A6B7A] mt-1">
            Aminy builds memory from your conversations, the documents you've shared, and what you've explicitly told her to remember.
          </p>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          <FilterChip
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label={`All (${facts.length})`}
          />
          {byCategory.filter(c => c.count > 0).map(({ cat, count }) => (
            <FilterChip
              key={cat}
              active={filter === cat}
              onClick={() => setFilter(cat)}
              label={`${CATEGORY_META[cat].label} (${count})`}
              color={CATEGORY_META[cat].color}
            />
          ))}
        </div>
      </div>

      {/* Memory list */}
      <div className="px-4 mt-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-[#E8E4DF] p-8 text-center">
            <Brain className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-[#3A4A57] mb-1">
              {facts.length === 0 ? 'No memories yet' : 'No memories in this category'}
            </p>
            <p className="text-sm text-[#5A6B7A]">
              {facts.length === 0
                ? 'Chat with Aminy and she\'ll start remembering what matters to your family.'
                : 'Switch categories above or chat with Aminy to add more.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(fact => {
              const meta = CATEGORY_META[fact.category];
              const Icon = meta.icon;
              return (
                <div key={fact.id} className="rounded-2xl bg-white border border-[#E8E4DF] p-3 flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${meta.color}15` }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#132F43] leading-snug">{fact.content}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs uppercase tracking-wide font-semibold" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-sm text-slate-400 capitalize">{fact.source}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-sm text-slate-400">
                        {new Date(fact.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(fact)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 shrink-0"
                    aria-label="Forget this memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger zone */}
      {facts.length > 0 && (
        <div className="px-4 mt-6">
          <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Privacy controls</p>
          <button
            onClick={handleWipe}
            disabled={isWiping}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {isWiping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Forget everything about {childName || 'this child'}
          </button>
          <p className="text-sm text-slate-400 text-center mt-2">
            Aminy will start fresh on the next conversation. Cannot be undone.
          </p>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors shrink-0"
      style={active
        ? { background: color || '#2A7D99', color: 'white' }
        : { background: 'white', border: '1px solid #e2e8f0', color: '#64748b' }}
    >
      {label}
    </button>
  );
}

export default MemoryViewer;
