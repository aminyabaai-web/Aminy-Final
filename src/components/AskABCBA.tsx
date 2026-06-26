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
 * Tier access rules:
 *   - Pro+ Family ($49.99/mo): 10 questions/month, no session required
 *   - Core / Pro: questions included ONLY within the 7-day post-telehealth window (CPT 98970-98972 aligned)
 *   - Free: no access (hard paywall)
 *   If no recent session AND tier is not proplus → show upgrade prompt with
 *   "Book a session to unlock" path. CPT 98970-98972 require established relationship.
 */

import React, { useEffect, useState } from 'react';
import { Plus, Clock, Check, Sparkles, ShieldCheck, MessageCircle, Star, Loader2, X, Lock, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ScreenHeader } from './ui/ScreenHeader';
import { routeAskBcbaQuestion, ASK_BCBA_PROPLUS_MONTHLY_QUOTA, POST_SESSION_WINDOW_DAYS } from '../lib/ask-bcba-economics';

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
  /**
   * True when a 1:1 telehealth session occurred within the past 7 days (group sessions don't count).
   * Pro+ ignores this flag — they have a monthly pool regardless.
   * Core/Pro/free: access is gated to this post-session window.
   */
  hasEstablishedSession?: boolean;
  /** 'proplus' | 'pro' | 'core' | 'free' — controls eligibility */
  tier?: string;
  /** Partner org slug (e.g. 'aact') — org BCBA teams answer their own families at no platform cost */
  pilotOrganization?: string | null;
  onNavigate?: (screen: string) => void;
}

export function AskABCBA({ onBack, userId, childName, parentName, hasEstablishedSession, tier = 'core', pilotOrganization = null, onNavigate }: AskABCBAProps) {
  // Pro+ has a monthly question pool — no session required.
  // Partner-org families (AACT / Rise) route to their org's own BCBA team — always included.
  // Core/Pro must be within the 7-day post-session window (1:1 telehealth only).
  const isProPlus = tier === 'proplus' || tier === 'pro_plus';
  const isPartnerOrg = !!pilotOrganization;
  const isFree = tier === 'free';

  // Check whether a 1:1 telehealth session occurred in the past 7 days.
  // If hasEstablishedSession is explicitly passed, trust the caller; otherwise load from DB.
  const [recentSessionChecked, setRecentSessionChecked] = useState(hasEstablishedSession !== undefined);
  const [recentSessionBcbaId, setRecentSessionBcbaId] = useState<string | null>(null);
  const [hasRecentSession, setHasRecentSession] = useState<boolean>(hasEstablishedSession ?? false);

  const canAccess = isProPlus || isPartnerOrg || hasRecentSession;
  const routing = routeAskBcbaQuestion({ tier, pilotOrganization, withinPostSessionWindow: hasRecentSession });
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAsk, setShowAsk] = useState(false);
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);

  useEffect(() => {
    loadThreads();
    if (!isProPlus && hasEstablishedSession === undefined) {
      checkRecentSession();
    }
  }, []);

  async function checkRecentSession() {
    try {
      // session_notes links to the parent via `user_id` (the convention used by
      // contextLayer + OutcomesTracking). There is no `parent_id` column — querying
      // it errors and the gate would silently lock out every eligible user.
      // 7-day window mirrors CPT digital E/M (98970-98972) cumulative-period
      // expectations — see POST_SESSION_WINDOW_DAYS in ask-bcba-economics.ts.
      // Only 1:1 telehealth sessions (session_notes) open the window; group
      // sessions live in group_session_enrollments and intentionally do NOT.
      const windowStart = new Date(Date.now() - POST_SESSION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('session_notes')
        .select('id, provider_id, session_date')
        .eq('user_id', userId)
        .gte('session_date', windowStart)
        .order('session_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      const found = !!(data && data.length > 0);
      setHasRecentSession(found);
      if (found && data[0].provider_id) setRecentSessionBcbaId(data[0].provider_id);
    } catch {
      // Conservative default: no confirmed recent session. Pro+ access is
      // unaffected (it never depends on this check).
      setHasRecentSession(false);
    } finally {
      setRecentSessionChecked(true);
    }
  }

  async function loadThreads() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ask_bcba_threads')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setThreads((data || []) as Thread[]);
    } catch {
      toast.error("Couldn't load your questions. Pull to refresh or try again.");
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitQuestion() {
    if (!question.trim()) return;
    setIsSubmitting(true);

    try {
      // 0. Enforce the Pro+ monthly quota (partner-org and session-window
      // questions are exempt — their volume is governed elsewhere). Without
      // this check the displayed "10/mo" was never enforced, leaving
      // unbounded behaviorist staffing exposure.
      if (isProPlus && !isPartnerOrg && !recentSessionBcbaId) {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from('ask_bcba_threads')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', userId)
          .eq('source', 'pro_plus_pool')
          .gte('created_at', monthStart.toISOString());
        if ((count ?? 0) >= ASK_BCBA_PROPLUS_MONTHLY_QUOTA) {
          toast.error(`You've used all ${ASK_BCBA_PROPLUS_MONTHLY_QUOTA} questions this month. They reset on the 1st — or book a telehealth session for anything urgent.`);
          setIsSubmitting(false);
          return;
        }
      }

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
          // Route session-bundled questions to the BCBA who did the session.
          // `bcba_id` + `auto_routed` are real columns on ask_bcba_threads;
          // when bcba_id is null (Pro+ pool) any contracted BCBA can pick it up.
          // Partner-org questions route to the org's BCBA queue via `source`
          // (rail definitions + payout math in ask-bcba-economics.ts).
          bcba_id: recentSessionBcbaId || null,
          auto_routed: !!recentSessionBcbaId,
          source: routing?.rail === 'partner_org'
            ? `partner_org:${routing.partnerOrg}`
            : recentSessionBcbaId ? 'session_bundled' : 'pro_plus_pool',
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

      toast.success('Question sent. AI is drafting an instant response — a behaviorist reviews within 24h (3 business days max).');
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

  // Show loading skeleton while we check session eligibility (non-Pro+)
  // Partner-org families never depend on the session-window check — don't
  // make them wait on it.
  if (!isProPlus && !isPartnerOrg && !recentSessionChecked) {
    return (
      <div className="min-h-screen bg-mist pb-20">
        <ScreenHeader title="Ask Your BCBA Team" onBack={onBack} variant="flat" />
        <div className="px-4 mt-4 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-[#E8E4DF]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist pb-20">
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
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #4E93A8 0%, #577590 100%)' }}>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1B2733]">Your behaviorist team, on demand</p>
              <p className="text-sm text-[#5A6B7A] mt-0.5">
                {isProPlus ? '10 questions/month included with Pro+' : 'Included for 7 days after each 1:1 session · Unlimited on Pro+'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#6B9080] mt-0.5 shrink-0" />
              <p className="text-sm text-[#3A4A57]"><span className="font-medium">Instant AI draft</span> — Aminy gives you an answer right away, informed by your family's context</p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6B9080] mt-0.5 shrink-0" />
              <p className="text-sm text-[#3A4A57]"><span className="font-medium">Clinician-reviewed</span> — a behaviorist (RBT, BCBA-supervised) edits and signs the response, typically within 24 hours — clinical-plan questions escalate to a BCBA or a telehealth session</p>
            </div>
            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-[#6B9080] mt-0.5 shrink-0" />
              <p className="text-sm text-slate-400">Other services make you wait up to 24h for any answer. Aminy gives you an instant AI answer, then a clinician confirms it.</p>
            </div>
          </div>
        </div>
      )}

      {/* Compose CTA — gated by tier + session window */}
      {!showAsk && (
        <div className="px-4 mt-4">
          {!canAccess ? (
            /* Hard gate: Core/Pro user with no recent session */
            <div className="rounded-2xl border border-[#E8E4DF] bg-white p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1B2733]">Requires a recent telehealth session</p>
                <p className="text-sm text-[#5A6B7A] mt-1">
                  Behaviorist messaging is included for 7 days after each 1:1 telehealth session — or any time on Pro+ Family. Group sessions don't open the window.
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => onNavigate?.('booking')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg, #4E93A8 0%, #577590 100%)' }}
                >
                  <CalendarDays className="w-4 h-4" />
                  Book a telehealth session
                </button>
                <button
                  onClick={() => onNavigate?.('paywall')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#4E93A8] text-[#4E93A8] font-semibold text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Upgrade to Pro+ for unlimited access
                </button>
              </div>
              <p className="text-sm text-slate-400">
                Pro+ Family ($49.99/mo) includes {ASK_BCBA_PROPLUS_MONTHLY_QUOTA} behaviorist questions/month, no session required — with instant AI drafts while you wait. Want a BCBA? Book a telehealth session.
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowAsk(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white font-semibold"
              style={{ background: 'linear-gradient(135deg, #4E93A8 0%, #577590 100%)', boxShadow: '0 4px 12px rgba(78,147,168,0.3)' }}
            >
              <Plus className="w-5 h-5" />
              Ask your behaviorist team
              {isProPlus && <span className="ml-auto text-sm font-normal opacity-80">Pro+ · 10/mo</span>}
            </button>
          )}
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

          {isPartnerOrg && (
            <div className="rounded-xl bg-[#F0EDE8] px-3 py-2">
              <p className="text-sm text-[#3A4A57]">
                Your question goes to <span className="font-semibold">your care team</span> — included with your organization's program at no charge.
              </p>
            </div>
          )}

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
            <p className="text-sm text-[#5A6B7A] mb-2">Category (helps the BCBA route)</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(category === c.id ? null : c.id)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all"
                  style={category === c.id
                    ? { background: '#4E93A815', borderColor: '#4E93A8', color: '#4E93A8', fontWeight: 600 }
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
            style={{ background: 'linear-gradient(135deg, #4E93A8 0%, #577590 100%)' }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isSubmitting ? 'Sending…' : 'Send to your behaviorist'}
          </button>

          <p className="text-sm text-slate-400 text-center">AI drafts instantly · behaviorist review, typically within 24 hours (3 business days max)</p>
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
            <p className="text-sm text-[#5A6B7A]">No questions yet. Ask anything — instant AI draft, behaviorist review typically within 24 hours.</p>
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
                <div className="flex items-center gap-3 text-sm text-slate-400">
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
    <div className="min-h-screen bg-mist pb-20">
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
        <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #4E93A812 0%, #57759012 100%)', border: '1px solid #4E93A830' }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#6B9080]" />
            <p className="text-xs font-semibold text-[#6B9080] uppercase tracking-wide">AI Draft — instant response</p>
          </div>
          <p className="text-sm text-[#1B2733] whitespace-pre-wrap">{thread.ai_draft}</p>
        </div>
      ) : aiDrafting ? (
        <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #4E93A812 0%, #57759012 100%)', border: '1px solid #4E93A830' }}>
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
            <p className="text-sm text-[#5A6B7A]">— {thread.bcba_name}{thread.bcba_credentials ? `, ${thread.bcba_credentials}` : ''}</p>
          )}
          {thread.bcba_responded_at && (
            <p className="text-sm text-slate-400 mt-1">{new Date(thread.bcba_responded_at).toLocaleString()}</p>
          )}
        </div>
      ) : (
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#1B2733]">Awaiting behaviorist review</p>
            {thread.target_response_at && (
              <p className="text-sm text-[#5A6B7A]">By {new Date(thread.target_response_at).toLocaleString()}</p>
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
