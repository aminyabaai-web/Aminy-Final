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
  BookOpen, ChevronRight, Search, Filter, Loader2, CheckCircle,
  ArrowLeft, Waves, Moon, School, RefreshCw, Utensils, Hand, MessageCircle,
  ShieldCheck, HeartHandshake, Blocks, PawPrint, TrainFront, Palette,
  Music, Bone, Puzzle, Leaf, Rocket,
  type LucideIcon,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import {
  FAMILY_HANGOUT_CATEGORY,
  HANGOUT_GROUND_RULES,
  HANGOUT_SAFETY_BADGE,
  HANGOUT_INTERESTS,
  getHangoutInterest,
  decodeHangoutDescription,
  isFamilyHangout,
  getHangoutInterestVotes,
  toggleHangoutInterestVote,
} from '../lib/family-hangouts';

/** Lucide icon per hangout interest (parent surface = Lucide, never emoji). */
const HANGOUT_INTEREST_ICONS: Record<string, LucideIcon> = {
  building: Blocks,
  animals: PawPrint,
  trains: TrainFront,
  drawing: Palette,
  music: Music,
  dinosaurs: Bone,
  games: Puzzle,
  nature: Leaf,
  space: Rocket,
};

// Lucide icons (not emoji) per design system — emoji are reserved for the Ease kids' surface.
const TOPIC_CATEGORIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All topics', icon: Sparkles },
  { id: 'meltdowns', label: 'Meltdowns', icon: Waves },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'school', label: 'School & IEP', icon: School },
  { id: 'transitions', label: 'Transitions', icon: RefreshCw },
  { id: 'feeding', label: 'Feeding', icon: Utensils },
  { id: 'sensory', label: 'Sensory', icon: Hand },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'communication', label: 'AAC & Communication', icon: MessageCircle },
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
  /** 'cohort' = multi-week BCBA-moderated program; price covers whole program */
  format?: 'single' | 'cohort';
  session_count?: number;
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
  // 'training' = clinical group sessions (existing); 'hangouts' = Family Hangouts —
  // small facilitated kids' hangouts on the same rails, parents present.
  const [view, setView] = useState<'training' | 'hangouts'>('training');
  const [interestVotes, setInterestVotes] = useState<string[]>(() => getHangoutInterestVotes());

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('group_sessions')
      .select('*')
      .in('status', ['open', 'confirmed'])
      .gt('session_date', new Date().toISOString())
      .order('session_date', { ascending: true })
      .limit(50);

    if (view === 'hangouts') {
      query = query.eq('topic_category', FAMILY_HANGOUT_CATEGORY);
    } else if (selectedCategory !== 'all') {
      query = query.eq('topic_category', selectedCategory);
    } else {
      // "All topics" in the training tab must not surface hangouts
      query = query.or(`topic_category.is.null,topic_category.neq.${FAMILY_HANGOUT_CATEGORY}`);
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
  }, [selectedCategory, searchQuery, view]);

  const handleInterestVote = (interestId: string) => {
    setInterestVotes(toggleHangoutInterestVote(interestId));
  };

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
          <div className="mb-3 flex items-start gap-3">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back"
                className="shrink-0 rounded-xl border border-[#E8E4DF] bg-white p-2.5 text-[#5A6B7A] transition-colors hover:bg-[#F6FBFB]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#132F43]">
                {view === 'hangouts' ? 'Family Hangouts' : 'Group BCBA Sessions'}
              </h1>
              <p className="text-sm text-[#5A6B7A]">
                {view === 'hangouts'
                  ? 'Small, facilitated hangouts for kids who share a love — you stay close by'
                  : 'Expert-led parent training with up to 4 families · $50/family · cash pay'}
              </p>
            </div>
          </div>

          {/* View switch: clinical training vs Family Hangouts */}
          <div className="mb-3 grid grid-cols-2 gap-2" role="group" aria-label="Session type">
            <button
              onClick={() => setView('training')}
              aria-pressed={view === 'training'}
              className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-all"
              style={view === 'training'
                ? { background: '#2A7D99', borderColor: '#2A7D99', color: 'white', fontWeight: 600 }
                : { background: 'white', borderColor: '#E8E4DF', color: '#5A6B7A' }}
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              Group training
            </button>
            <button
              onClick={() => setView('hangouts')}
              aria-pressed={view === 'hangouts'}
              className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-all"
              style={view === 'hangouts'
                ? { background: '#2A7D99', borderColor: '#2A7D99', color: 'white', fontWeight: 600 }
                : { background: 'white', borderColor: '#E8E4DF', color: '#5A6B7A' }}
            >
              <HeartHandshake className="h-4 w-4 shrink-0" aria-hidden="true" />
              Family Hangouts
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={view === 'hangouts' ? 'Search hangouts' : 'Search topics or BCBAs'}
              className="pl-9 bg-[#F6FBFB] border-[#E8E4DF]"
            />
          </div>

          {/* Category chips (clinical training only) */}
          {view === 'training' && (
            <div className="flex gap-2 overflow-x-auto pb-1 pr-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {TOPIC_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-all shrink-0"
                  style={selectedCategory === cat.id
                    ? { background: '#2A7D99', borderColor: '#2A7D99', color: 'white', fontWeight: 600 }
                    : { background: 'white', borderColor: '#E8E4DF', color: '#5A6B7A' }}
                >
                  <cat.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{cat.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Why group sessions callout */}
        {view === 'training' ? (
          <Card className="p-4 mb-4 bg-white border-[#E8E4DF]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(42, 125, 153, 0.10)' }}>
                <Sparkles className="w-4 h-4 text-[#2A7D99]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#132F43]">Why families love group sessions</p>
                <p className="text-sm text-[#5A6B7A] mt-0.5">
                  Same BCBA expertise as 1:1 at 60% less cost. Small groups (max 4 families) mean your questions get answered, and hearing from other parents going through similar challenges is genuinely helpful.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 mb-4 bg-white border-[#E8E4DF]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(42, 125, 153, 0.10)' }}>
                <HeartHandshake className="w-4 h-4 text-[#2A7D99]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#132F43]">What a hangout is like</p>
                <p className="text-sm text-[#5A6B7A] mt-0.5">
                  30 relaxed minutes on video with a few other families, built around something your child already loves.
                </p>
                <ul className="mt-2 space-y-1">
                  {HANGOUT_GROUND_RULES.map(rule => (
                    <li key={rule} className="flex items-start gap-1.5 text-sm text-[#3A4A57]">
                      <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#2A7D99]" aria-hidden="true" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Sessions grid */}
        {isLoading ? (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-2xl bg-white border border-[#E8E4DF] p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          view === 'hangouts' ? (
            <Card className="p-6 text-center border-dashed border-[#E8E4DF]">
              <HeartHandshake className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-[#132F43] font-medium mb-1">
                {searchQuery ? 'No hangouts match that search' : 'Hangouts are forming'}
              </p>
              <p className="text-sm text-[#5A6B7A]">
                {searchQuery
                  ? 'Try a different word — or tell us what your child loves below.'
                  : 'Tell us what your child loves — it helps facilitators plan the first ones.'}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="What your child loves">
                {HANGOUT_INTERESTS.map(interest => {
                  const InterestIcon = HANGOUT_INTEREST_ICONS[interest.id] ?? Puzzle;
                  const voted = interestVotes.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      onClick={() => handleInterestVote(interest.id)}
                      aria-pressed={voted}
                      aria-label={`My child loves ${interest.kidPhrase}`}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all"
                      style={voted
                        ? { background: '#2A7D99', borderColor: '#2A7D99', color: 'white', fontWeight: 600 }
                        : { background: 'white', borderColor: '#E8E4DF', color: '#5A6B7A' }}
                    >
                      {voted
                        ? <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        : <InterestIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      {interest.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-[#5A6B7A] mt-4">
                {interestVotes.length > 0
                  ? 'Noted. This shapes what gets scheduled — real hangouts will show up right here.'
                  : 'Picking a few doesn’t book anything — it just helps us plan.'}
              </p>
            </Card>
          ) : (
          <Card className="p-10 text-center border-dashed border-[#E8E4DF]">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-[#132F43] font-medium mb-1">No sessions found</p>
            <p className="text-sm text-[#5A6B7A]">
              {selectedCategory !== 'all' || searchQuery
                ? 'Try a different topic or search term.'
                : 'New group sessions are added regularly. Check back soon.'}
            </p>
            {onNavigate && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => onNavigate('resource-library')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Browse resources
              </Button>
            )}
          </Card>
          )
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              view === 'hangouts' ? (
                <FamilyHangoutCard
                  key={session.id}
                  session={session}
                  onBook={() => setBookingSession(session)}
                  spotsLeft={spotsLeft(session)}
                />
              ) : (
              <GroupSessionListCard
                key={session.id}
                session={session}
                onBook={() => setBookingSession(session)}
                spotsLabel={spotsLabel(session)}
                spotsLeft={spotsLeft(session)}
              />
              )
            ))}
          </div>
        )}
      </div>

      {/* Booking confirmation modal */}
      {bookingSession && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-5 rounded-2xl">
            <h3 className="text-lg font-semibold text-[#132F43] mb-1">{bookingSession.topic}</h3>
            <p className="text-sm text-[#5A6B7A] mb-4">
              {new Date(bookingSession.session_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
              {new Date(bookingSession.session_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              {' '}· with {bookingSession.provider_name}
              {bookingSession.provider_credentials ? `, ${bookingSession.provider_credentials}` : ''}
            </p>

            {isFamilyHangout(bookingSession) && (
              <div className="p-3 bg-[#F6FBFB] rounded-xl border border-[#E8E4DF] mb-3 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-[#2A7D99]" aria-hidden="true" />
                <p className="text-sm text-[#3A4A57]">
                  {HANGOUT_SAFETY_BADGE}. Plan to stay nearby for the whole hangout — that's part of what makes it work. Cameras optional, no pressure to speak.
                </p>
              </div>
            )}

            <div className="p-3 bg-[#F6FBFB] rounded-xl border border-[#E8E4DF] mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#3A4A57]">{isFamilyHangout(bookingSession) ? 'Hangout fee' : 'Group session fee'}</span>
                <span className="font-semibold text-[#132F43]">${bookingSession.price_per_family_cents / 100}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-400 mt-1">
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
                className="flex-1 bg-[#6B9080] hover:bg-[#216982] text-white"
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
              <p className="font-semibold text-[#132F43] leading-tight">
                {categoryInfo && (
                  <categoryInfo.icon className="mr-1 inline-block h-4 w-4 text-[#2A7D99]" aria-hidden="true" />
                )}
                {session.topic}
              </p>
              {session.format === 'cohort' && (
                <span className="inline-block mt-1 text-xs font-semibold text-[#577590] bg-[#577590]/10 rounded-full px-2 py-0.5">
                  {session.session_count ? `${session.session_count}-week` : 'Multi-week'} BCBA cohort
                </span>
              )}
              <p className="text-sm text-[#5A6B7A] mt-0.5">
                {session.provider_name}{session.provider_credentials ? `, ${session.provider_credentials}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-[#132F43]">${session.price_per_family_cents / 100}</p>
              <p className="text-sm text-[#5A6B7A]">per family</p>
            </div>
          </div>

          {session.description && (
            <p className="text-sm text-[#3A4A57] mt-2 line-clamp-2">{session.description}</p>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-sm text-[#5A6B7A]">
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
                : 'bg-[#6B9080] hover:bg-[#216982] text-white'
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

/**
 * Family Hangout card — kid-interest framing, and the safety line on every
 * card: "Facilitated · Parents present · Small group". No child names are
 * ever shown; booking stays the parent's action.
 */
function FamilyHangoutCard({
  session,
  onBook,
  spotsLeft,
}: {
  session: GroupSession;
  onBook: () => void;
  spotsLeft: number;
}) {
  const sessionDate = new Date(session.session_date);
  const isFull = spotsLeft === 0;
  const { interestId, body } = decodeHangoutDescription(session.description);
  const interest = getHangoutInterest(interestId);
  const InterestIcon = (interestId && HANGOUT_INTEREST_ICONS[interestId]) || HeartHandshake;

  return (
    <Card className="p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(42, 125, 153, 0.10)' }}
        >
          <InterestIcon className="w-6 h-6 text-[#2A7D99]" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {interest && (
                <p className="text-xs font-semibold text-[#2A7D99]">
                  For kids who love {interest.kidPhrase}
                </p>
              )}
              <p className="font-semibold text-[#132F43] leading-tight mt-0.5">{session.topic}</p>
              <p className="text-sm text-[#5A6B7A] mt-0.5">
                Hosted by {session.provider_name || 'an Aminy facilitator'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-[#132F43]">${session.price_per_family_cents / 100}</p>
              <p className="text-sm text-[#5A6B7A]">per family</p>
            </div>
          </div>

          {body && <p className="text-sm text-[#3A4A57] mt-2 line-clamp-2">{body}</p>}

          {/* Safety line — on every hangout card, verbatim */}
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#3A4A57] bg-[#F6FBFB] border border-[#E8E4DF] rounded-full px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#2A7D99]" aria-hidden="true" />
            {HANGOUT_SAFETY_BADGE}
          </p>

          <div className="flex items-center justify-between mt-3 gap-2">
            <div className="flex items-center gap-3 text-sm text-[#5A6B7A] min-w-0 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                {sessionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                {sessionDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                {' '}· {session.duration_minutes} min
              </span>
              <span className={`flex items-center gap-1 font-medium ${isFull ? 'text-slate-400' : 'text-emerald-600'}`}>
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                {isFull ? 'Full' : `${spotsLeft} of ${session.max_families} family spots open`}
              </span>
            </div>

            <Button
              size="sm"
              className={isFull
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#6B9080] hover:bg-[#216982] text-white'
              }
              disabled={isFull}
              onClick={onBook}
              aria-label={isFull ? 'Hangout is full' : `Save your family's spot — $${session.price_per_family_cents / 100}`}
            >
              {isFull ? 'Full' : 'Save your spot'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
