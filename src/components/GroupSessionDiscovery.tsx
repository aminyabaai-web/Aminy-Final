// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * GroupSessionDiscovery — family-facing group session browser.
 * Shown in the marketplace as a "Group Training" tab.
 * ClassPass-style: browse upcoming sessions by topic, see spots remaining, book with 1 tap.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Calendar, Clock, DollarSign, Star, Sparkles,
  BookOpen, ChevronRight, Search, Filter, Loader2, CheckCircle
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';

const TOPIC_CATEGORIES = [
  { id: 'all', label: 'All topics', emoji: '✨' },
  { id: 'meltdowns', label: 'Meltdowns', emoji: '🌊' },
  { id: 'sleep', label: 'Sleep', emoji: '😴' },
  { id: 'school', label: 'School & IEP', emoji: '🏫' },
  { id: 'transitions', label: 'Transitions', emoji: '🔄' },
  { id: 'feeding', label: 'Feeding', emoji: '🍴' },
  { id: 'sensory', label: 'Sensory', emoji: '✨' },
  { id: 'social', label: 'Social', emoji: '👥' },
  { id: 'communication', label: 'AAC & Communication', emoji: '💬' },
];

interface GroupSession {
  id: string;
  topic: string;
  topic_category: string | null;
  description: string | null;
  session_date: string;
  duration_minutes: number;
  price_per_family_cents: number;
  max_families: number;
  min_families: number;
  enrolled_count: number;
  status: 'open' | 'confirmed';
  provider_name: string | null;
  provider_credentials: string | null;
  provider_photo_url: string | null;
}

interface GroupSessionDiscoveryProps {
  userId?: string;
  childName?: string;
  parentName?: string;
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
}

export function GroupSessionDiscovery({
  userId,
  childName,
  parentName,
  onBack,
  onNavigate,
}: GroupSessionDiscoveryProps) {
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingSession, setBookingSession] = useState<GroupSession | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('group_sessions')
      .select('*')
      .in('status', ['open', 'confirmed'])
      .gt('session_date', new Date().toISOString())
      .order('session_date', { ascending: true })
      .limit(50);

    if (selectedCategory !== 'all') {
      query = query.eq('topic_category', selectedCategory);
    }

    const { data } = await query;

    let results = (data || []) as GroupSession[];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(s =>
        s.topic.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.provider_name || '').toLowerCase().includes(q)
      );
    }

    setSessions(results);
    setIsLoading(false);
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(loadSessions, 250);
    return () => clearTimeout(timer);
  }, [loadSessions]);

  const handleBook = async (session: GroupSession) => {
    if (!userId) {
      onNavigate?.('create-account');
      return;
    }
    setIsBooking(true);
    try {
      // Create pending enrollment
      const { error } = await supabase.from('group_session_enrollments').insert({
        group_session_id: session.id,
        family_id: userId,
        parent_name: parentName || null,
        child_name: childName || null,
        payment_status: 'pending',
        amount_paid_cents: session.price_per_family_cents,
        platform_fee_cents: Math.round(session.price_per_family_cents * 0.20),
        provider_payout_cents: Math.round(session.price_per_family_cents * 0.80),
      });
      if (error) throw error;

      // Increment enrolled count
      await supabase.rpc('increment_group_enrollment', { session_id: session.id }).maybeSingle();

      toast.success(`Enrolled in "${session.topic}"! Calendar invite sent.`);
      setBookingSession(null);
      loadSessions();
    } catch (e: any) {
      toast.error(e?.message || 'Could not complete booking — try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const spotsLeft = (s: GroupSession) => s.max_families - s.enrolled_count;
  const spotsLabel = (s: GroupSession) => {
    const left = spotsLeft(s);
    if (left === 0) return 'Full';
    if (left === 1) return '1 spot left!';
    return `${left} spots left`;
  };

  return (
    <div className="min-h-screen bg-mist pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E4DF]">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="mb-3">
            <h1 className="text-xl font-bold text-[#1B2733]">Group BCBA Sessions</h1>
            <p className="text-sm text-[#5A6B7A]">
              Expert-led parent training with up to 4 families · $50/family · cash pay
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by topic, strategy, or BCBA name…"
              className="pl-9 bg-[#FAF7F2] border-[#E8E4DF]"
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {TOPIC_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-all shrink-0"
                style={selectedCategory === cat.id
                  ? { background: '#43AA8B', borderColor: '#43AA8B', color: 'white', fontWeight: 600 }
                  : { background: 'white', borderColor: '#E8E4DF', color: '#5A6B7A' }}
              >
                <span>{cat.emoji}</span>{cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Why group sessions callout */}
        <Card className="p-4 mb-4 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-100 rounded-lg shrink-0">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-900">Why families love group sessions</p>
              <p className="text-sm text-violet-800 mt-0.5">
                Same BCBA expertise as 1:1 at 60% less cost. Small groups (max 4 families) mean your questions get answered, and hearing from other parents going through similar challenges is genuinely helpful.
              </p>
            </div>
          </div>
        </Card>

        {/* Sessions grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6B9080] animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <Card className="p-10 text-center border-dashed border-[#E8E4DF]">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-[#1B2733] font-medium mb-1">No sessions found</p>
            <p className="text-sm text-[#5A6B7A]">
              {selectedCategory !== 'all' || searchQuery
                ? 'Try a different topic or search term.'
                : 'New group sessions are added regularly. Check back soon.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <GroupSessionListCard
                key={session.id}
                session={session}
                onBook={() => setBookingSession(session)}
                spotsLabel={spotsLabel(session)}
                spotsLeft={spotsLeft(session)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Booking confirmation modal */}
      {bookingSession && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-5 rounded-2xl">
            <h3 className="text-lg font-semibold text-[#1B2733] mb-1">{bookingSession.topic}</h3>
            <p className="text-sm text-[#5A6B7A] mb-4">
              {new Date(bookingSession.session_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
              {new Date(bookingSession.session_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              {' '}· with {bookingSession.provider_name}, {bookingSession.provider_credentials}
            </p>

            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E4DF] mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#3A4A57]">Group session fee</span>
                <span className="font-semibold text-[#1B2733]">${bookingSession.price_per_family_cents / 100}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                <span>Cash pay · Secure Stripe checkout</span>
                <span>Calendar invite included</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBookingSession(null)}
                disabled={isBooking}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#6B9080] hover:bg-[#5A7A6E] text-white"
                onClick={() => handleBook(bookingSession)}
                disabled={isBooking}
              >
                {isBooking ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Booking…</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" />Confirm & Pay ${bookingSession.price_per_family_cents / 100}</>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function GroupSessionListCard({
  session,
  onBook,
  spotsLabel,
  spotsLeft,
}: {
  session: GroupSession;
  onBook: () => void;
  spotsLabel: string;
  spotsLeft: number;
}) {
  const sessionDate = new Date(session.session_date);
  const isFull = spotsLeft === 0;
  const isAlmostFull = spotsLeft === 1;
  const categoryInfo = TOPIC_CATEGORIES.find(c => c.id === session.topic_category);

  return (
    <Card className="p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        {/* Provider avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6B9080] to-[#577590] flex items-center justify-center shrink-0 text-white font-semibold">
          {(session.provider_name || 'B').split(' ').map(n => n[0]).join('')}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-[#1B2733] leading-tight">
                {categoryInfo && <span className="mr-1">{categoryInfo.emoji}</span>}
                {session.topic}
              </p>
              <p className="text-xs text-[#5A6B7A] mt-0.5">
                {session.provider_name}{session.provider_credentials ? `, ${session.provider_credentials}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-[#1B2733]">${session.price_per_family_cents / 100}</p>
              <p className="text-xs text-[#5A6B7A]">per family</p>
            </div>
          </div>

          {session.description && (
            <p className="text-sm text-[#3A4A57] mt-2 line-clamp-2">{session.description}</p>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-[#5A6B7A]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {sessionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {sessionDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
              <span className={`flex items-center gap-1 font-medium ${
                isFull ? 'text-red-500' : isAlmostFull ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                <Users className="w-3.5 h-3.5" />
                {spotsLabel}
              </span>
            </div>

            <Button
              size="sm"
              className={isFull
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#6B9080] hover:bg-[#5A7A6E] text-white'
              }
              disabled={isFull}
              onClick={onBook}
            >
              {isFull ? 'Full' : 'Book — $' + (session.price_per_family_cents / 100)}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
