// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Ask Your BCBA Team — async question-to-care-team messaging product.
 *
 * Compete with Answers Now ($55/mo) by:
 *   1. AI drafts a response instantly (Claude with full family context)
 *   2. Parent sees AI draft + "Awaiting team review (within 24h)"
 *   3. BCBA or supervised RBT reviews + edits + signs within 24h
 *   4. Parent sees final signed response
 *
 * "BCBA Team" means BCBA + their supervised RBTs can respond — wider coverage,
 * faster responses, same clinical accountability.
 *
 * Prior session requirement: For billing (CPT 98970-98972) the client must have
 * an established relationship (≥1 session). Cash-pay clients: same expectation
 * for quality, 3-business-day standard response time.
 *
 * Pricing: $30/mo add-on, or included free with Pro+ Family tier.
 */

import React, { useEffect, useState } from 'react';
import { Plus, Clock, Check, Sparkles, ShieldCheck, MessageCircle, Star, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ScreenHeader } from './ui/ScreenHeader';

const CATEGORIES = [
  { id: 'behavior', label: 'Behavior', emoji: '🎯' },
  { id: 'sleep', label: 'Sleep', emoji: '😴' },
  { id: 'feeding', label: 'Feeding', emoji: '🍴' },
  { id: 'transitions', label: 'Transitions', emoji: '🔄' },
  { id: 'sensory', label: 'Sensory', emoji: '✨' },
  { id: 'communication', label: 'Communication', emoji: '💬' },
  { id: 'school', label: 'School', emoji: '🏫' },
  { id: 'social', label: 'Social', emoji: '👥' },
  { id: 'self-care', label: 'Self-care', emoji: '🧼' },
  { id: 'other', label: 'Other', emoji: '💭' },
] as const;

type Category = typeof CATEGORIES[number]['id'];

interface Thread {
  id: string;
  created_at: string;
  question: string;
  category: Category | null;
  status: 'pending' | 'ai_drafted' | 'awaiting_bcba' | 'completed' | 'closed';
  ai_draft: string | null;
  bcba_response: string | null;
  bcba_name: string | null;
  bcba_credentials: string | null;
  bcba_responded_at: string | null;
  target_response_at: string | null;
  parent_rating: number | null;
}

interface AskABCBAProps {
  onBack?: () => void;
  userId: string;
  childName?: string;
  parentName?: string;
  hasEstablishedSession?: boolean;
}

export function AskABCBA({ onBack, userId, childName, parentName, hasEstablishedSession = true }: AskABCBAProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAsk, setShowAsk] = useState(false);
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);

  useEffect(() => {
    loadThreads();
  }, []);

  async function loadThreads() {
    setIsLoading(true);
    const { data } = await supabase
      .from('ask_bcba_threads')
      .select('*')
      .eq('parent_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    setThreads((data || []) as Thread[]);
    setIsLoading(false);
  }

  async function submitQuestion() {
    if (!question.trim()) return;
    setIsSubmitting(true);

    try {
      // 1. Insert the thread
      const targetResponseAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data: thread, error } = await supabase
        .from('ask_bcba_threads')
        .insert({
          parent_id: userId,
          parent_name: parentName,
          child_name: childName,
          question: question.trim(),
          category,
          status: 'pending',
          target_response_at: targetResponseAt,
        })
        .select()
        .single();

      if (error || !thread) throw new Error(error?.message || 'Failed to submit');

      // 2. Kick off AI draft in background (don't block UI)
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/draft-bcba-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ threadId: thread.id }),
      }).catch(() => {});

      toast.success('Question sent. AI is drafting an instant response — BCBA team review within 24h (3 business days max).');
      setQuestion('');
      setCategory(null);
      setShowAsk(false);
      await loadThreads();
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit question');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (activeThread) {
    return <ThreadDetail thread={activeThread} onBack={() => { setActiveThread(null); loadThreads(); }} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-20">
      {/* Header */}
      <ScreenHeader
        title="Ask Your BCBA Team"
        subtitle="Instant AI draft · BCBA or RBT review, typically within 24 hours"
        icon={<ShieldCheck className="w-6 h-6" />}
        onBack={onBack}
        variant="flat"
      />

      {/* Value prop — shown before first question is asked */}
      {!showAsk && !isLoading && threads.length === 0 && (
        <div className="mx-4 mt-4 rounded-2xl border border-[#E8E4DF] bg-white p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)' }}>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1B2733]">Your BCBA team, on demand</p>
              <p className="text-xs text-[#5A6B7A] mt-0.5">$30/mo add-on · Free with Pro+ Family</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#6B9080] mt-0.5 shrink-0" />
              <p className="text-xs text-[#3A4A57]"><span className="font-medium">Instant AI draft</span> — Aminy gives you an answer right away, informed by your family's context</p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6B9080] mt-0.5 shrink-0" />
              <p className="text-xs text-[#3A4A57]"><span className="font-medium">Clinician-reviewed</span> — your BCBA or supervised RBT edits and signs the response, typically within 24 hours</p>
            </div>
            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-[#6B9080] mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400">Answers Now charges $55/mo for 24h responses only. We give you an instant answer + clinician sign-off for less.</p>
            </div>
          </div>
        </div>
      )}

      {/* Compose CTA */}
      {!showAsk && (
        <div className="px-4 mt-4">
          {!hasEstablishedSession && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">First session recommended.</span>{' '}
                For the best guidance, book a telehealth session first so your BCBA team knows your child's context before answering.{' '}
                Questions are still welcome — the team will reply within 24h.
              </p>
            </div>
          )}
          <button
            onClick={() => setShowAsk(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white font-semibold"
            style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)', boxShadow: '0 4px 12px rgba(67,170,139,0.3)' }}
          >
            <Plus className="w-5 h-5" />
            Ask your BCBA team
          </button>
        </div>
      )}

      {/* Compose form */}
      {showAsk && (
        <div className="mx-4 mt-4 rounded-2xl bg-white border border-[#E8E4DF] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#1B2733]">Ask anything</p>
            <button onClick={() => { setShowAsk(false); setQuestion(''); }} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#F0EDE8]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder={childName
              ? `What's happening with ${childName}? Be specific — when, where, what triggers it…`
              : "What's on your mind? Be specific — when, where, what triggers it…"
            }
            rows={5}
            className="w-full text-sm border border-[#E8E4DF] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-[#6B9080]"
          />

          <div>
            <p className="text-xs text-[#5A6B7A] mb-2">Category (helps the BCBA route)</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(category === c.id ? null : c.id)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all"
                  style={category === c.id
                    ? { background: '#43AA8B15', borderColor: '#43AA8B', color: '#43AA8B', fontWeight: 600 }
                    : { background: 'white', borderColor: '#e2e8f0', color: '#64748b' }}
                >
                  <span>{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={submitQuestion}
            disabled={!question.trim() || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)' }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isSubmitting ? 'Sending…' : 'Send to BCBA team'}
          </button>

          <p className="text-xs text-slate-400 text-center">AI drafts instantly · BCBA team review, typically within 24 hours (3 business days max)</p>
        </div>
      )}

      {/* Thread list */}
      <div className="px-4 mt-5">
        <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Your questions</p>

        {isLoading ? (
          <div className="text-center py-6"><Loader2 className="w-5 h-5 text-slate-400 animate-spin mx-auto" /></div>
        ) : threads.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-[#E8E4DF] p-6 text-center">
            <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-[#5A6B7A]">No questions yet. Ask anything — instant AI draft, BCBA team review typically within 24 hours.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveThread(t)}
                className="w-full text-left bg-white border border-[#E8E4DF] rounded-2xl p-3 hover:border-[#6B9080]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm text-[#1B2733] line-clamp-2 flex-1">{t.question}</p>
                  <StatusPill status={t.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{relativeTime(t.created_at)}</span>
                  {t.category && <span className="capitalize">· {t.category}</span>}
                  {t.parent_rating && (
                    <span className="flex items-center gap-0.5">
                      · <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{t.parent_rating}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadDetail({ thread: initialThread, onBack }: { thread: Thread; onBack: () => void }) {
  // Keep a live copy of the thread. The parent passes a static snapshot taken at
  // open time — but a freshly-submitted question has `ai_draft === null` because
  // the AI-draft edge function runs in the background. Poll the single row so the
  // instant AI draft (and later the BCBA response) appears without leaving the screen.
  const [thread, setThread] = useState<Thread>(initialThread);

  // Re-sync if the parent hands us a different thread.
  useEffect(() => {
    setThread(initialThread);
  }, [initialThread]);

  // Poll the row while the response is still being produced — `pending` means the
  // AI is still drafting; `ai_drafted`/`awaiting_bcba` means we're waiting on the
  // BCBA. Stop once the thread is completed/closed (nothing left to arrive).
  const isLive = thread.status === 'pending' || thread.status === 'ai_drafted' || thread.status === 'awaiting_bcba';
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('ask_bcba_threads')
        .select('*')
        .eq('id', thread.id)
        .single();
      if (data) setThread(data as Thread);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLive, thread.id]);

  // The AI draft is the core promise ("instant"), so show an explicit drafting
  // state until it lands instead of a blank gap.
  const aiDrafting = !thread.ai_draft && thread.status === 'pending';

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-20">
      <ScreenHeader
        title="Question detail"
        onBack={onBack}
        backLabel="Back to all questions"
        variant="flat"
      />
      <div className="px-4 pt-3 pb-4 bg-white border-b border-[#E8E4DF]">
        <div className="flex items-center gap-2 mb-1">
          {thread.category && <span className="text-xs bg-[#F0EDE8] text-[#5A6B7A] px-2 py-0.5 rounded-full capitalize">{thread.category}</span>}
          <StatusPill status={thread.status} />
        </div>
        <p className="text-sm text-[#5A6B7A]">{relativeTime(thread.created_at)}</p>
      </div>

      {/* Question */}
      <div className="mx-4 mt-4 rounded-2xl bg-white border border-[#E8E4DF] p-4">
        <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Your question</p>
        <p className="text-sm text-[#1B2733] whitespace-pre-wrap">{thread.question}</p>
      </div>

      {/* AI draft — show the live draft, or a drafting indicator while it's being generated */}
      {thread.ai_draft ? (
        <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #43AA8B12 0%, #57759012 100%)', border: '1px solid #43AA8B30' }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#6B9080]" />
            <p className="text-xs font-semibold text-[#6B9080] uppercase tracking-wide">AI Draft — instant response</p>
          </div>
          <p className="text-sm text-[#1B2733] whitespace-pre-wrap">{thread.ai_draft}</p>
        </div>
      ) : aiDrafting ? (
        <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #43AA8B12 0%, #57759012 100%)', border: '1px solid #43AA8B30' }}>
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 text-[#6B9080] animate-spin" />
            <p className="text-xs font-semibold text-[#6B9080] uppercase tracking-wide">AI Draft — instant response</p>
          </div>
          <p className="text-sm text-[#3A4A57]">Aminy is drafting an instant response…</p>
        </div>
      ) : null}

      {/* BCBA response */}
      {thread.bcba_response ? (
        <div className="mx-4 mt-3 rounded-2xl bg-white border-2 border-[#6B9080] p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-[#6B9080]" />
            <p className="text-xs font-semibold text-[#6B9080] uppercase tracking-wide">BCBA Reviewed & Signed</p>
          </div>
          <p className="text-sm text-[#1B2733] whitespace-pre-wrap mb-3">{thread.bcba_response}</p>
          {thread.bcba_name && (
            <p className="text-xs text-[#5A6B7A]">— {thread.bcba_name}{thread.bcba_credentials ? `, ${thread.bcba_credentials}` : ''}</p>
          )}
          {thread.bcba_responded_at && (
            <p className="text-xs text-slate-400 mt-1">{new Date(thread.bcba_responded_at).toLocaleString()}</p>
          )}
        </div>
      ) : (
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#1B2733]">Awaiting BCBA team review</p>
            {thread.target_response_at && (
              <p className="text-xs text-[#5A6B7A]">By {new Date(thread.target_response_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Thread['status'] }) {
  const styles: Record<Thread['status'], { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    pending:        { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Drafting…',  icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    ai_drafted:    { bg: 'bg-[#6B9080]/10',   text: 'text-[#6B9080]',   label: 'AI ready',   icon: <Sparkles className="w-3 h-3" /> },
    awaiting_bcba: { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Team queue', icon: <Clock className="w-3 h-3" /> },
    completed:     { bg: 'bg-emerald-50',text: 'text-emerald-700',label: 'Reviewed',   icon: <Check className="w-3 h-3" /> },
    closed:        { bg: 'bg-[#F0EDE8]', text: 'text-[#5A6B7A]',  label: 'Closed',     icon: <Check className="w-3 h-3" /> },
  };
  const s = styles[status];
  return (
    <span className={`flex items-center gap-1 text-xs ${s.bg} ${s.text} px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap`}>
      {s.icon}{s.label}
    </span>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default AskABCBA;
