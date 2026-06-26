// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * FeedbackInbox — admin inbox for customer feedback with AI-drafted replies.
 *
 * Reads from the user_feedback table (RLS: admin select/update). For each
 * item the admin can generate an AI draft response (via /ai/brain), edit it,
 * and send — which stores admin_response on the row, where the user's own
 * RLS select policy lets them see the reply in-app.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Sparkles,
  Send,
  X,
  Check,
  Loader2,
  Smile,
  Meh,
  Frown,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface FeedbackItem {
  id: string;
  user_id: string | null;
  mood: 'easy' | 'okay' | 'hard' | null;
  context: string | null;
  message: string | null;
  what_felt_easiest: string | null;
  what_could_be_calmer: string | null;
  status: 'new' | 'responded' | 'dismissed';
  admin_response: string | null;
  created_at: string;
}

const MOOD_META: Record<string, { icon: typeof Smile; color: string; label: string }> = {
  easy: { icon: Smile, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30', label: 'Felt easy' },
  okay: { icon: Meh, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', label: 'Felt okay' },
  hard: { icon: Frown, color: 'text-red-600 bg-red-50 dark:bg-red-900/30', label: 'Felt hard' },
};

export function FeedbackInbox() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'new' | 'responded' | 'all'>('new');
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('user_feedback')
      .select('id, user_id, mood, context, message, what_felt_easiest, what_could_be_calmer, status, admin_response, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data, error } = await query;
    if (error) {
      toast.error('Could not load feedback');
    } else {
      setItems((data as FeedbackItem[]) || []);
    }
    setIsLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const summarize = (item: FeedbackItem): string =>
    [item.message, item.what_felt_easiest && `Easiest: ${item.what_felt_easiest}`, item.what_could_be_calmer && `Could be calmer: ${item.what_could_be_calmer}`]
      .filter(Boolean)
      .join(' · ');

  const generateDraft = async (item: FeedbackItem) => {
    setDraftFor(item.id);
    setDraftText('');
    setIsDrafting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? publicAnonKey}`,
          },
          body: JSON.stringify({
            userMessage: `Draft a warm, brief (2-4 sentence) response to this parent's app feedback. Thank them genuinely, acknowledge the specific thing they raised, and if they flagged friction, tell them we're on it. No corporate-speak, no emoji overload (one max). Their feedback — mood: ${item.mood || 'unknown'}, screen: ${item.context || 'general'}, said: "${summarize(item) || '(no text, mood only)'}"`,
            systemPrompt: 'You are the founder of Aminy, a behavioral wellness app for families of neurodivergent children, personally replying to user feedback. You are warm, specific, and brief. Validate first.',
          }),
        }
      );
      if (!resp.ok) throw new Error('draft failed');
      const data = await resp.json();
      setDraftText((data.message || data.content || '').trim());
    } catch {
      toast.error('AI draft failed — write your reply manually');
    } finally {
      setIsDrafting(false);
    }
  };

  const sendResponse = async (item: FeedbackItem) => {
    if (!draftText.trim()) return;
    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('user_feedback')
        .update({
          admin_response: draftText.trim(),
          status: 'responded',
          responded_at: new Date().toISOString(),
          responded_by: user?.id ?? null,
        })
        .eq('id', item.id);
      if (error) throw error;
      toast.success('Response saved — the user will see it in-app');
      setDraftFor(null);
      setDraftText('');
      load();
    } catch {
      toast.error('Failed to save response');
    } finally {
      setIsSending(false);
    }
  };

  const dismiss = async (item: FeedbackItem) => {
    const { error } = await supabase
      .from('user_feedback')
      .update({ status: 'dismissed' })
      .eq('id', item.id);
    if (error) toast.error('Failed to dismiss');
    else load();
  };

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-[#132F43] dark:text-white">Feedback Inbox</h2>
        </div>
        <div className="flex items-center gap-2">
          {(['new', 'responded', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-accent text-white'
                  : 'bg-[#F0EDE8] dark:bg-slate-800 text-[#5A6B7A] dark:text-slate-400 hover:bg-[#E8E4DF]'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={load}
            className="p-1.5 rounded-full text-[#5A6B7A] hover:bg-[#F0EDE8] dark:hover:bg-slate-800 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-[#E8E4DF] dark:border-slate-700">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
            {filter === 'new' ? 'No new feedback — inbox zero 🎉' : 'Nothing here yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const mood = item.mood ? MOOD_META[item.mood] : null;
            const MoodIcon = mood?.icon;
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E8E4DF] dark:border-slate-700 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {mood && MoodIcon && (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${mood.color}`}>
                        <MoodIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {mood && <span className="text-sm font-semibold text-[#132F43] dark:text-white">{mood.label}</span>}
                        {item.context && (
                          <span className="text-xs px-2 py-0.5 bg-[#F0EDE8] dark:bg-slate-800 text-[#5A6B7A] dark:text-slate-400 rounded-full">
                            {item.context}
                          </span>
                        )}
                        <span className="text-sm text-slate-400">
                          {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      {item.message && <p className="mt-1 text-sm text-[#3A4A57] dark:text-slate-300">{item.message}</p>}
                      {item.what_felt_easiest && (
                        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">😌 Easiest: {item.what_felt_easiest}</p>
                      )}
                      {item.what_could_be_calmer && (
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">🌊 Could be calmer: {item.what_could_be_calmer}</p>
                      )}
                      {item.admin_response && (
                        <div className="mt-2 px-3 py-2 bg-[#EDF6FA] dark:bg-slate-800 rounded-xl">
                          <p className="text-xs font-semibold text-[#2A7D99] uppercase tracking-wide mb-0.5">Your reply</p>
                          <p className="text-sm text-[#3A4A57] dark:text-slate-300">{item.admin_response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.status === 'new' && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => generateDraft(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-semibold hover:bg-accent/20 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI draft
                      </button>
                      <button
                        onClick={() => dismiss(item)}
                        className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {item.status === 'responded' && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600 flex-shrink-0">
                      <Check className="w-3.5 h-3.5" /> Responded
                    </span>
                  )}
                </div>

                {/* Draft editor */}
                {draftFor === item.id && (
                  <div className="mt-3 pt-3 border-t border-[#F0EDE8] dark:border-slate-800">
                    {isDrafting ? (
                      <div className="flex items-center gap-2 text-sm text-[#5A6B7A] py-3">
                        <Loader2 className="w-4 h-4 animate-spin" /> Aminy is drafting…
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={draftText}
                          onChange={e => setDraftText(e.target.value)}
                          rows={3}
                          className="w-full text-sm text-[#132F43] dark:text-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
                          placeholder="Your reply to this parent…"
                        />
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <button
                            onClick={() => { setDraftFor(null); setDraftText(''); }}
                            className="px-3 py-1.5 text-sm text-[#5A6B7A] hover:text-[#3A4A57] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => generateDraft(item)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-accent font-medium hover:bg-accent/10 rounded-full transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" /> Redraft
                          </button>
                          <button
                            onClick={() => sendResponse(item)}
                            disabled={!draftText.trim() || isSending}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white rounded-full text-xs font-semibold disabled:opacity-40 transition-opacity"
                          >
                            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Send
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
