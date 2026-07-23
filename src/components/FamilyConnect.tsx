// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * FamilyConnect — "Families who get it" (Wave 3, the village)
 *
 * Parent-mediated family matching: parents connect with parents; kids never
 * contact each other through this surface. Privacy-first by construction:
 * first names only, child AGE BANDS only (never exact ages or DOB), location
 * at state level only.
 *
 * Decline is silent — a requester only ever sees "Hello sent". There are no
 * rejection notifications, ever.
 *
 * Messaging note: SecureMessaging is provider↔parent only (message_threads has
 * provider_id/parent_id/credentials), so accepted connections get honest
 * contact-exchange guidance pointing at the community feed instead of a fake
 * DM button.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Users,
  Heart,
  Shield,
  Flag,
  MoreHorizontal,
  Sparkles,
  MapPin,
  Send,
  X,
  Check,
  MessageCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { isDemoMode } from '../lib/demo-seed';
import {
  getBlockedUserIds,
  blockUser as blockUserService,
  unblockUser as unblockUserService,
} from '../lib/community-service';
import { flagContent, type FlagCategory } from '../lib/moderation-service';
import {
  AGE_BANDS,
  ageToBand,
  toFirstNameOnly,
  rankConnectMatches,
  getMyConnectProfile,
  upsertConnectProfile,
  optOutOfConnect,
  getCandidateProfiles,
  getMyConnections,
  sendConnectionRequest,
  respondToConnection,
  type ConnectProfile,
  type FamilyConnection,
  type ScoredMatch,
} from '../lib/family-connect-service';

// ── Props & local types ──────────────────────────────────────────────────────

interface FamilyConnectProps {
  userId: string;
  userName?: string;
  userState?: string;
  childAge?: number;
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
}

type ConnectView = 'matches' | 'requests' | 'connected';

// Target of a report/block action — another family's connect card.
interface ProfileTarget {
  userId: string;
  name: string;
  content: string;
}

// Same user-facing reasons vocabulary as CommunityHub, mapped to
// moderation_queue flag categories (own copy — CommunityHub's stays untouched).
const REPORT_REASONS: { id: string; label: string; description: string; category: FlagCategory }[] = [
  { id: 'harmful', label: 'Harmful or unsafe', description: 'Bullying, dangerous advice, or upsetting content', category: 'inappropriate' },
  { id: 'spam', label: 'Spam', description: 'Ads, scams, or repetitive self-promotion', category: 'spam' },
  { id: 'private-info', label: 'Shares private information', description: 'Personal details about someone without consent', category: 'privacy' },
  { id: 'impersonation', label: 'Fake or misleading profile', description: 'Not who they say they are', category: 'other' },
  { id: 'other', label: 'Something else', description: 'Anything that does not feel right', category: 'other' },
];

const FOCUS_AREA_OPTIONS = [
  'Autism', 'ADHD', 'Sensory processing', 'Speech & language', 'Sleep',
  'Big feelings', 'School & IEPs', 'Feeding', 'Anxiety', 'New diagnosis',
];

const INTEREST_OPTIONS = [
  'Dinosaurs', 'Trains', 'Minecraft', 'Lego', 'Swimming', 'Art & drawing',
  'Music', 'Animals', 'Outdoors', 'Video games', 'Books', 'Cooking',
];

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

const bandLabel = (band: string | null) =>
  band ? (band === '18+' ? 'Ages 18+' : `Ages ${band}`) : null;

// ── Demo/sample data (walkthroughs + partner demos only) ─────────────────────

const MOCK_CANDIDATES: ConnectProfile[] = [
  {
    userId: 'demo-fc-maya', optedIn: true, displayName: 'Maya', state: 'AZ',
    childAgeBand: '7-9', focusAreas: ['Autism', 'Sleep'], interests: ['Dinosaurs', 'Swimming'],
    bioLine: 'Weekend hikers and dinosaur experts, learning as we go.',
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    userId: 'demo-fc-jess', optedIn: true, displayName: 'Jess', state: 'AZ',
    childAgeBand: '7-9', focusAreas: ['ADHD', 'Big feelings'], interests: ['Minecraft', 'Swimming'],
    bioLine: 'Two kids, one very busy house. Coffee is a food group.',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    userId: 'demo-fc-dan', optedIn: true, displayName: 'Dan', state: 'CO',
    childAgeBand: '4-6', focusAreas: ['Autism', 'Speech & language'], interests: ['Trains', 'Music'],
    bioLine: 'Train-table dad. Happy to connect online.',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    userId: 'demo-fc-priya', optedIn: true, displayName: 'Priya', state: 'AZ',
    childAgeBand: '10-12', focusAreas: ['Sensory processing', 'School & IEPs'], interests: ['Art & drawing', 'Animals'],
    bioLine: 'Navigating middle school one day at a time.',
    createdAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_INCOMING: FamilyConnection = {
  id: 'demo-conn-1',
  requesterId: 'demo-fc-jess',
  recipientId: 'demo-me',
  status: 'pending',
  message: 'Hi! Our kids sound so similar — would love to say hello.',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

// ── Component ────────────────────────────────────────────────────────────────

export function FamilyConnect({
  userId,
  userName,
  userState,
  childAge,
  onBack,
  onNavigate,
}: FamilyConnectProps) {
  const demo = isDemoMode();

  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<ConnectProfile | null>(null);
  const [candidates, setCandidates] = useState<ConnectProfile[]>([]);
  const [connections, setConnections] = useState<FamilyConnection[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ConnectView>('matches');

  // Opt-in form
  const [formName, setFormName] = useState('');
  const [formState, setFormState] = useState('');
  const [formBand, setFormBand] = useState<string | null>(null);
  const [formFocus, setFormFocus] = useState<Set<string>>(new Set());
  const [formInterests, setFormInterests] = useState<Set<string>>(new Set());
  const [formBio, setFormBio] = useState('');
  const [saving, setSaving] = useState(false);

  // Say-hello sheet
  const [helloTarget, setHelloTarget] = useState<ConnectProfile | null>(null);
  const [helloMessage, setHelloMessage] = useState('');
  const [helloSending, setHelloSending] = useState(false);

  // Report/block sheets
  const [actionTarget, setActionTarget] = useState<ProfileTarget | null>(null);
  const [reportTarget, setReportTarget] = useState<ProfileTarget | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reportSending, setReportSending] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const blocked = await getBlockedUserIds(userId).catch(() => new Set<string>());
      if (cancelled) return;
      setBlockedIds(blocked);

      if (demo) {
        // Demo walkthrough: opted-in profile + sample village, no DB reads.
        setMyProfile({
          userId: userId || 'demo-me',
          optedIn: true,
          displayName: toFirstNameOnly(userName || 'Sarah') || 'Sarah',
          state: userState || 'AZ',
          childAgeBand: ageToBand(childAge) || '7-9',
          focusAreas: ['Autism', 'Sleep'],
          interests: ['Dinosaurs', 'Swimming'],
          bioLine: null,
          createdAt: new Date().toISOString(),
        });
        setCandidates(MOCK_CANDIDATES);
        setConnections([{ ...MOCK_INCOMING, recipientId: userId || 'demo-me' }]);
        setLoading(false);
        return;
      }

      if (!userId || !isUuid(userId)) {
        // Dev bypass / no real account — show the opt-in card.
        setLoading(false);
        return;
      }

      const mine = await getMyConnectProfile(userId);
      if (cancelled) return;
      setMyProfile(mine);
      if (mine?.optedIn) {
        const [cands, conns] = await Promise.all([
          getCandidateProfiles(userId),
          getMyConnections(userId),
        ]);
        if (cancelled) return;
        setCandidates(cands);
        setConnections(conns);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [userId, demo, userName, userState, childAge]);

  // Prefill the opt-in form from real profile fields (first name, state, the
  // primary child's age band, and their logged concerns → focus-area chips).
  useEffect(() => {
    if (myProfile?.optedIn) return;
    setFormName(prev => prev || toFirstNameOnly(userName || ''));
    setFormState(prev => prev || (userState || ''));
    setFormBand(prev => prev || ageToBand(childAge));
    if (!userId || !isUuid(userId) || demo) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('children')
          .select('age_years, concerns, diagnoses')
          .eq('parent_id', userId)
          .order('is_primary', { ascending: false })
          .limit(1);
        if (cancelled || !data?.[0]) return;
        const child = data[0] as { age_years?: number; concerns?: string[]; diagnoses?: string[] };
        if (child.age_years != null) setFormBand(prev => prev || ageToBand(child.age_years));
        const signals = [...(child.concerns || []), ...(child.diagnoses || [])].map(s => s.toLowerCase());
        if (signals.length > 0) {
          setFormFocus(prev => {
            if (prev.size > 0) return prev;
            const next = new Set<string>();
            for (const opt of FOCUS_AREA_OPTIONS) {
              const key = opt.toLowerCase().split(' ')[0];
              if (signals.some(s => s.includes(key) || key.includes(s))) next.add(opt);
            }
            return next;
          });
        }
      } catch { /* prefill is best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [userId, demo, myProfile?.optedIn, userName, userState, childAge]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const connectionByUser = useMemo(() => {
    const map = new Map<string, FamilyConnection>();
    for (const c of connections) {
      const other = c.requesterId === userId ? c.recipientId : c.requesterId;
      map.set(other, c);
    }
    return map;
  }, [connections, userId]);

  const matches: ScoredMatch[] = useMemo(() => {
    if (!myProfile?.optedIn) return [];
    const exclude = new Set(blockedIds);
    // Accepted connections live in the Connected tab, not the matches list.
    for (const [other, conn] of connectionByUser) {
      if (conn.status === 'accepted') exclude.add(other);
    }
    return rankConnectMatches(myProfile, candidates, exclude);
  }, [myProfile, candidates, blockedIds, connectionByUser]);

  // Incoming hellos awaiting my answer.
  const incomingRequests = useMemo(
    () =>
      connections.filter(
        c => c.recipientId === userId && c.status === 'pending' && !blockedIds.has(c.requesterId)
      ),
    [connections, userId, blockedIds]
  );

  // Accepted, either direction.
  const acceptedConnections = useMemo(
    () => connections.filter(c => c.status === 'accepted'),
    [connections]
  );

  const profileFor = useCallback(
    (uid: string): ConnectProfile | null => candidates.find(c => c.userId === uid) || null,
    [candidates]
  );

  // The requester's view of an outgoing hello: pending AND declined both read
  // as "Hello sent" — a decline is silent by design.
  const outgoingStatusFor = useCallback(
    (uid: string): 'none' | 'sent' => {
      const conn = connectionByUser.get(uid);
      if (!conn) return 'none';
      if (conn.requesterId === userId && (conn.status === 'pending' || conn.status === 'declined')) return 'sent';
      return 'none';
    },
    [connectionByUser, userId]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleOptIn = useCallback(async () => {
    const name = toFirstNameOnly(formName);
    if (!name) {
      toast.error('Add a first name so families know what to call you');
      return;
    }
    setSaving(true);
    const profile: ConnectProfile = {
      userId,
      optedIn: true,
      displayName: name,
      state: formState.trim() || null,
      childAgeBand: formBand,
      focusAreas: [...formFocus],
      interests: [...formInterests],
      bioLine: formBio.trim() || null,
      createdAt: new Date().toISOString(),
    };
    let ok = true;
    if (userId && isUuid(userId) && !demo) {
      ok = await upsertConnectProfile(profile);
    }
    setSaving(false);
    if (!ok) {
      toast.error("Couldn't save just yet — please try again");
      return;
    }
    setMyProfile(profile);
    if (userId && isUuid(userId) && !demo) {
      const [cands, conns] = await Promise.all([
        getCandidateProfiles(userId),
        getMyConnections(userId),
      ]);
      setCandidates(cands);
      setConnections(conns);
    }
    toast.success("You're in — welcome to the village");
  }, [userId, demo, formName, formState, formBand, formFocus, formInterests, formBio]);

  const handleLeave = useCallback(async () => {
    if (userId && isUuid(userId) && !demo) {
      await optOutOfConnect(userId);
    }
    setMyProfile(prev => (prev ? { ...prev, optedIn: false } : prev));
    setCandidates([]);
    setConnections([]);
    toast.success('Family Connect is off. Your card is no longer visible.');
  }, [userId, demo]);

  const handleSendHello = useCallback(async () => {
    if (!helloTarget || helloSending) return;
    setHelloSending(true);
    let ok = true;
    if (userId && isUuid(userId) && isUuid(helloTarget.userId) && !demo) {
      ok = await sendConnectionRequest(userId, helloTarget.userId, helloMessage);
    }
    setHelloSending(false);
    if (!ok) {
      toast.error("Couldn't send your hello — please try again");
      return;
    }
    setConnections(prev => [
      {
        id: `local-${Date.now()}`,
        requesterId: userId,
        recipientId: helloTarget.userId,
        status: 'pending',
        message: helloMessage.trim() || null,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    toast.success(`Hello sent to ${helloTarget.displayName}`);
    setHelloTarget(null);
    setHelloMessage('');
  }, [helloTarget, helloSending, helloMessage, userId, demo]);

  const handleRespond = useCallback(
    async (conn: FamilyConnection, status: 'accepted' | 'declined') => {
      if (isUuid(conn.id) && !demo) {
        const ok = await respondToConnection(conn.id, status);
        if (!ok) {
          toast.error("That didn't go through — please try again");
          return;
        }
      }
      setConnections(prev => prev.map(c => (c.id === conn.id ? { ...c, status } : c)));
      if (status === 'accepted') {
        const p = profileFor(conn.requesterId);
        toast.success(`You're connected${p ? ` with ${p.displayName}` : ''}`);
        setView('connected');
      }
      // Declines are silent — no toast fanfare, no notification to the requester.
    },
    [demo, profileFor]
  );

  const handleBlockUser = useCallback(
    (target: ProfileTarget) => {
      setBlockedIds(prev => new Set(prev).add(target.userId));
      setActionTarget(null);
      setReportTarget(null);
      blockUserService(userId, target.userId).catch(() => {});
      toast.success(`You won't see ${target.name} anymore`, {
        action: {
          label: 'Undo',
          onClick: () => {
            setBlockedIds(prev => {
              const next = new Set(prev);
              next.delete(target.userId);
              return next;
            });
            unblockUserService(userId, target.userId).catch(() => {});
          },
        },
      });
    },
    [userId]
  );

  const handleSubmitReport = useCallback(
    async (reason: (typeof REPORT_REASONS)[number]) => {
      if (!reportTarget || reportSending) return;
      setReportSending(true);
      try {
        if (isUuid(reportTarget.userId)) {
          const note = reportNote.trim();
          const result = await flagContent(
            'profile',
            reportTarget.userId,
            reportTarget.content,
            reportTarget.userId,
            reportTarget.name,
            {
              category: reason.category,
              reason: note ? `${reason.label} — ${note}` : reason.label,
              flaggedBy: userId && isUuid(userId) ? userId : undefined,
            }
          );
          if (!result.success) {
            toast.error("Couldn't send the report — please try again");
            return;
          }
        }
        toast.success('Thanks — our team will review');
        setReportTarget(null);
        setReportNote('');
      } finally {
        setReportSending(false);
      }
    },
    [reportTarget, reportSending, reportNote, userId]
  );

  const toggleSet = (set: Set<string>, value: string): Set<string> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  // ── Small render helpers ───────────────────────────────────────────────────

  const chipButton = (
    label: string,
    selected: boolean,
    onClick: () => void
  ) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
        selected
          ? 'border-[#2A7D99]/30 bg-[#2A7D99]/10 text-[#2A7D99] dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {label}
    </button>
  );

  const profileMeta = (p: ConnectProfile) => {
    const parts = [bandLabel(p.childAgeBand), p.state].filter(Boolean);
    return parts.join(' · ');
  };

  const avatarCircle = (p: ConnectProfile) => (
    <div
      className="w-11 h-11 rounded-full bg-[#6B9080]/10 flex items-center justify-center shrink-0"
      aria-hidden="true"
    >
      <span className="text-base font-semibold text-[#6B9080]">
        {p.displayName.charAt(0).toUpperCase()}
      </span>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-app dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="bg-white/90 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0" aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#132F43] dark:text-slate-100 truncate">
                Family Connect
              </h1>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 truncate">
                Families who get it — nearby or online
              </p>
            </div>
          </div>

          {myProfile?.optedIn && (
            <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide pt-3 pb-1 -mx-4 px-4">
              {(
                [
                  { id: 'matches', name: 'Matches', icon: <Users className="w-4 h-4" /> },
                  { id: 'requests', name: 'Hellos', icon: <Heart className="w-4 h-4" /> },
                  { id: 'connected', name: 'Connected', icon: <Check className="w-4 h-4" /> },
                ] as { id: ConnectView; name: string; icon: React.ReactNode }[]
              ).map(tab => (
                <Button
                  key={tab.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setView(tab.id)}
                  className={`inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                    view === tab.id
                      ? 'border-[#2A7D99]/30 bg-[#2A7D99]/10 text-[#2A7D99] hover:bg-[#2A7D99]/20 dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                      : ''
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                  {tab.id === 'requests' && incomingRequests.length > 0 && (
                    <Badge className="bg-[#E07A5F] text-white text-sm px-1.5">{incomingRequests.length}</Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-[#5A6B7A] dark:text-slate-400">Finding families like yours...</p>
          </Card>
        ) : !myProfile?.optedIn ? (
          /* ── Opt-in onboarding card ─────────────────────────────────────── */
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-[#6B9080]/10 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-[#6B9080]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#132F43] dark:text-slate-100">
                    Families who get it
                  </h2>
                  <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1 leading-relaxed">
                    Meet other Aminy families walking a similar road — nearby or online.
                    Parents connect with parents; you decide if the kids ever meet.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-[#EDF4F7] dark:bg-slate-800 p-3 flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#2A7D99] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-[#466379] dark:text-slate-300 leading-relaxed">
                  Share only what you choose. First names and age bands only — never
                  exact ages, last names, or your address. You can leave anytime.
                </p>
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              <div>
                <label htmlFor="fc-name" className="block text-sm font-medium text-[#132F43] dark:text-slate-100 mb-1">
                  Your first name
                </label>
                <Input
                  id="fc-name"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Sarah"
                  maxLength={30}
                  aria-describedby="fc-name-hint"
                />
                <p id="fc-name-hint" className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
                  First name only — that's all other families see.
                </p>
              </div>

              <div>
                <label htmlFor="fc-state" className="block text-sm font-medium text-[#132F43] dark:text-slate-100 mb-1">
                  State
                </label>
                <Input
                  id="fc-state"
                  value={formState}
                  onChange={e => setFormState(e.target.value)}
                  placeholder="e.g. AZ"
                  maxLength={20}
                  aria-describedby="fc-state-hint"
                />
                <p id="fc-state-hint" className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
                  State level only — never your city or address.
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-[#132F43] dark:text-slate-100 mb-2">
                  Your child's age range
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Child age range">
                  {AGE_BANDS.map(band =>
                    chipButton(band, formBand === band, () => setFormBand(prev => (prev === band ? null : band)))
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-[#132F43] dark:text-slate-100 mb-2">
                  What you're navigating
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Focus areas">
                  {FOCUS_AREA_OPTIONS.map(opt =>
                    chipButton(opt, formFocus.has(opt), () => setFormFocus(prev => toggleSet(prev, opt)))
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-[#132F43] dark:text-slate-100 mb-2">
                  What your child loves
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Child interests">
                  {INTEREST_OPTIONS.map(opt =>
                    chipButton(opt, formInterests.has(opt), () => setFormInterests(prev => toggleSet(prev, opt)))
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="fc-bio" className="block text-sm font-medium text-[#132F43] dark:text-slate-100 mb-1">
                  One line about your family <span className="font-normal text-[#5A6B7A]">(optional)</span>
                </label>
                <Input
                  id="fc-bio"
                  value={formBio}
                  onChange={e => setFormBio(e.target.value)}
                  placeholder="e.g. Weekend hikers, dinosaur experts"
                  maxLength={80}
                />
              </div>

              <Button className="w-full" onClick={handleOptIn} disabled={saving}>
                {saving ? 'Saving...' : 'Turn on Family Connect'}
              </Button>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 text-center">
                Only other opted-in families can see your card. Turn it off anytime.
              </p>
            </Card>
          </div>
        ) : (
          /* ── Opted-in: matches / requests / connected ───────────────────── */
          <>
            {view === 'matches' && (
              <div className="space-y-4">
                {matches.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[#132F43] dark:text-slate-100 mb-2">
                      The village is just getting started
                    </h3>
                    <p className="text-[#5A6B7A] dark:text-slate-400">
                      As more families join, the ones most like yours will show up here.
                      Your card is visible, so a hello may find you first.
                    </p>
                  </Card>
                ) : (
                  matches.map(match => {
                    const p = match.profile;
                    const sent = outgoingStatusFor(p.userId) === 'sent';
                    const shared = new Set([
                      ...match.sharedFocusAreas.map(s => s.toLowerCase()),
                      ...match.sharedInterests.map(s => s.toLowerCase()),
                    ]);
                    const chips = [...p.focusAreas, ...p.interests];
                    return (
                      <Card key={p.userId} className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            {avatarCircle(p)}
                            <div className="min-w-0">
                              <h3 className="font-semibold text-[#132F43] dark:text-slate-100 truncate">
                                {p.displayName}
                              </h3>
                              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                                {profileMeta(p) || 'Aminy family'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setActionTarget({
                                userId: p.userId,
                                name: p.displayName,
                                content: `${p.displayName} · ${profileMeta(p)} · ${p.bioLine || ''} · ${chips.join(', ')}`,
                              })
                            }
                            className="p-2 rounded-full text-slate-400 hover:bg-[#EDF4F7] dark:hover:bg-slate-700 shrink-0"
                            aria-label={`More options for ${p.displayName}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>

                        {p.bioLine && (
                          <p className="text-sm text-[#466379] dark:text-slate-300 mt-2 leading-relaxed">
                            {p.bioLine}
                          </p>
                        )}

                        {chips.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {chips.slice(0, 6).map(chip => (
                              <Badge
                                key={chip}
                                className={
                                  shared.has(chip.toLowerCase())
                                    ? 'bg-[#2A7D99]/10 text-[#2A7D99] dark:bg-teal-900/30 dark:text-teal-300 text-sm'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm'
                                }
                              >
                                {chip}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {match.reasons.length > 0 && (
                          <p className="text-sm text-[#6B9080] dark:text-teal-200 mt-3 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                            {match.reasons[0]}
                          </p>
                        )}

                        <div className="mt-3">
                          {sent ? (
                            <Button variant="outline" size="sm" disabled className="w-full" aria-label={`Hello sent to ${p.displayName}`}>
                              <Check className="w-4 h-4 mr-1.5" />
                              Hello sent
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => setHelloTarget(p)}
                              aria-label={`Say hello to ${p.displayName}`}
                            >
                              <Heart className="w-4 h-4 mr-1.5" />
                              Say hello
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}

                {/* Leave — quiet, always reachable */}
                <div className="text-center pt-2">
                  <button
                    onClick={handleLeave}
                    className="text-sm text-[#5A6B7A] dark:text-slate-400 underline"
                  >
                    Take a break from Family Connect
                  </button>
                </div>
              </div>
            )}

            {view === 'requests' && (
              <div className="space-y-4">
                {incomingRequests.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Heart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[#132F43] dark:text-slate-100 mb-2">
                      No hellos yet
                    </h3>
                    <p className="text-[#5A6B7A] dark:text-slate-400">
                      When another family reaches out, it lands here — and you decide.
                    </p>
                  </Card>
                ) : (
                  incomingRequests.map(conn => {
                    const p = profileFor(conn.requesterId);
                    return (
                      <Card key={conn.id} className="p-4">
                        <div className="flex items-start gap-3">
                          {p ? (
                            avatarCircle(p)
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-[#6B9080]/10 flex items-center justify-center shrink-0" aria-hidden="true">
                              <Users className="w-5 h-5 text-[#6B9080]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold text-[#132F43] dark:text-slate-100">
                              {p?.displayName || 'An Aminy family'} said hello
                            </h3>
                            {p && (
                              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                                {profileMeta(p)}
                              </p>
                            )}
                          </div>
                        </div>
                        {conn.message && (
                          <p className="text-sm text-[#466379] dark:text-slate-300 mt-3 rounded-xl bg-[#EDF4F7] dark:bg-slate-800 p-3 leading-relaxed">
                            “{conn.message}”
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleRespond(conn, 'accepted')}
                            aria-label={`Accept hello from ${p?.displayName || 'this family'}`}
                          >
                            <Check className="w-4 h-4 mr-1.5" />
                            Connect
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleRespond(conn, 'declined')}
                            aria-label={`Quietly pass on the hello from ${p?.displayName || 'this family'}`}
                          >
                            Not right now
                          </Button>
                        </div>
                        <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-2">
                          “Not right now” is quiet — they're never told you passed.
                        </p>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {view === 'connected' && (
              <div className="space-y-4">
                {acceptedConnections.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[#132F43] dark:text-slate-100 mb-2">
                      No connections yet
                    </h3>
                    <p className="text-[#5A6B7A] dark:text-slate-400">
                      When a hello is accepted — yours or theirs — the family shows up here.
                    </p>
                  </Card>
                ) : (
                  acceptedConnections.map(conn => {
                    const otherId = conn.requesterId === userId ? conn.recipientId : conn.requesterId;
                    const p = profileFor(otherId);
                    return (
                      <Card key={conn.id} className="p-4">
                        <div className="flex items-start gap-3">
                          {p ? (
                            avatarCircle(p)
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-[#6B9080]/10 flex items-center justify-center shrink-0" aria-hidden="true">
                              <Users className="w-5 h-5 text-[#6B9080]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold text-[#132F43] dark:text-slate-100">
                              {p?.displayName || 'An Aminy family'}
                            </h3>
                            <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                              {p ? profileMeta(p) : 'Connected family'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-[#466379] dark:text-slate-300 mt-3 leading-relaxed">
                          You're connected — say hello in the community feed and take it from
                          there. Direct family-to-family messaging is on our roadmap.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-3"
                          onClick={() => onNavigate?.('community-hub')}
                          aria-label={`Open the community feed to talk with ${p?.displayName || 'this family'}`}
                        >
                          <MessageCircle className="w-4 h-4 mr-1.5" />
                          Open community feed
                        </Button>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Say-hello sheet */}
      <AnimatePresence>
        {helloTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center"
            onClick={() => { if (!helloSending) { setHelloTarget(null); setHelloMessage(''); } }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-t-2xl w-full max-w-lg p-4 pb-6"
              onClick={e => e.stopPropagation()}
              aria-label={`Say hello to ${helloTarget.displayName}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="text-base font-semibold text-[#132F43] dark:text-slate-100">
                  Say hello to {helloTarget.displayName}
                </h2>
                <button
                  onClick={() => { setHelloTarget(null); setHelloMessage(''); }}
                  className="p-1 rounded-full text-slate-400 hover:bg-[#EDF4F7] dark:hover:bg-slate-700"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-3 leading-relaxed">
                They'll see your card and your note. If they'd like to connect too,
                you'll both hear about it.
              </p>
              <Textarea
                placeholder="A short note, if you like — what made their family feel familiar?"
                value={helloMessage}
                onChange={e => setHelloMessage(e.target.value)}
                maxLength={280}
                rows={3}
                className="mb-3"
                aria-label="Optional note with your hello"
              />
              <Button className="w-full" onClick={handleSendHello} disabled={helloSending}>
                <Send className="w-4 h-4 mr-1.5" />
                {helloSending ? 'Sending...' : 'Send hello'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report / block action sheet */}
      <AnimatePresence>
        {actionTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center"
            onClick={() => setActionTarget(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-t-2xl w-full max-w-lg p-4 pb-6"
              onClick={e => e.stopPropagation()}
              aria-label={`Options for ${actionTarget.name}`}
            >
              <button
                onClick={() => {
                  setReportTarget(actionTarget);
                  setActionTarget(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#EDF4F7] dark:hover:bg-slate-700 text-left"
              >
                <Flag className="w-5 h-5 text-[#5A6B7A] shrink-0" />
                <span>
                  <span className="block text-sm font-medium text-[#132F43] dark:text-slate-100">
                    Report this profile
                  </span>
                  <span className="block text-sm text-[#5A6B7A] dark:text-slate-400">
                    Let our team take a look
                  </span>
                </span>
              </button>
              <button
                onClick={() => handleBlockUser(actionTarget)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#EDF4F7] dark:hover:bg-slate-700 text-left"
              >
                <Shield className="w-5 h-5 text-[#5A6B7A] shrink-0" />
                <span>
                  <span className="block text-sm font-medium text-[#132F43] dark:text-slate-100">
                    Block {actionTarget.name}
                  </span>
                  <span className="block text-sm text-[#5A6B7A] dark:text-slate-400">
                    They won't appear in your matches, and you won't appear in theirs
                  </span>
                </span>
              </button>
              <Button variant="outline" className="w-full mt-2" onClick={() => setActionTarget(null)}>
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report reason sheet */}
      <AnimatePresence>
        {reportTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center"
            onClick={() => { if (!reportSending) { setReportTarget(null); setReportNote(''); } }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-t-2xl w-full max-w-lg p-4 pb-6"
              onClick={e => e.stopPropagation()}
              aria-label="Report this profile"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="text-base font-semibold text-[#132F43] dark:text-slate-100">
                  Report this profile
                </h2>
                <button
                  onClick={() => { setReportTarget(null); setReportNote(''); }}
                  className="p-1 rounded-full text-slate-400 hover:bg-[#EDF4F7] dark:hover:bg-slate-700"
                  aria-label="Close report"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-3">
                Our team reviews every report. They won't know it came from you.
              </p>
              <Input
                placeholder="Anything we should know? (optional)"
                value={reportNote}
                onChange={e => setReportNote(e.target.value)}
                className="mb-3"
                aria-label="Optional note for the moderation team"
              />
              <div className="space-y-2">
                {REPORT_REASONS.map(reason => (
                  <button
                    key={reason.id}
                    onClick={() => handleSubmitReport(reason)}
                    disabled={reportSending}
                    className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl border border-[#E8E4DF] dark:border-slate-700 hover:bg-[#EDF4F7] dark:hover:bg-slate-700 text-left disabled:opacity-50"
                  >
                    <span>
                      <span className="block text-sm font-medium text-[#132F43] dark:text-slate-100">
                        {reason.label}
                      </span>
                      <span className="block text-sm text-[#5A6B7A] dark:text-slate-400">
                        {reason.description}
                      </span>
                    </span>
                    <Flag className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FamilyConnect;
