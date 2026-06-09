// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * GroupSessionCreator — lets BCBAs create, manage, and cancel group office hours.
 *
 * Economics:
 *   $50/family · Aminy 20% ($10) · BCBA keeps 80% ($40)
 *   4 families = $200 guaranteed.
 *   Min 2 families required — auto-cancel if not met by 24h before session.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Calendar, Clock, DollarSign, Plus, X, CheckCircle,
  AlertCircle, Trash2, Edit2, Eye, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase/client';

const TOPIC_CATEGORIES = [
  { id: 'meltdowns', label: 'Meltdowns & Big Emotions', emoji: '🌊' },
  { id: 'sleep', label: 'Sleep Strategies', emoji: '😴' },
  { id: 'school', label: 'School & IEP Support', emoji: '🏫' },
  { id: 'transitions', label: 'Transitions & Routines', emoji: '🔄' },
  { id: 'feeding', label: 'Feeding & Mealtime', emoji: '🍴' },
  { id: 'sensory', label: 'Sensory Needs', emoji: '✨' },
  { id: 'social', label: 'Social Skills', emoji: '👥' },
  { id: 'communication', label: 'AAC & Communication', emoji: '💬' },
  { id: 'other', label: 'Other Topic', emoji: '💡' },
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
  status: 'open' | 'confirmed' | 'cancelled' | 'completed';
  cancellation_deadline: string | null;
}

interface GroupSessionCreatorProps {
  providerId: string;
  providerName: string;
  providerCredentials?: string;
  providerPhotoUrl?: string;
}

const PLATFORM_FEE_PCT = 0.20;
const DEFAULT_PRICE_CENTS = 5000; // $50/family
const DEFAULT_MAX_FAMILIES = 4;
const DEFAULT_MIN_FAMILIES = 2;

export function GroupSessionCreator({
  providerId,
  providerName,
  providerCredentials,
  providerPhotoUrl,
}: GroupSessionCreatorProps) {
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [pricePerFamily, setPricePerFamily] = useState(50);
  const [maxFamilies, setMaxFamilies] = useState(DEFAULT_MAX_FAMILIES);
  const [minFamilies, setMinFamilies] = useState(DEFAULT_MIN_FAMILIES);

  const providerEarnsPerSession = Math.round(pricePerFamily * (1 - PLATFORM_FEE_PCT)) * maxFamilies;
  const guaranteedMin = Math.round(pricePerFamily * (1 - PLATFORM_FEE_PCT)) * minFamilies;

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('group_sessions')
      .select('*')
      .eq('provider_id', providerId)
      .order('session_date', { ascending: true });
    setSessions((data || []) as GroupSession[]);
    setIsLoading(false);
  }, [providerId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleCreate = async () => {
    if (!topic.trim() || !sessionDate || !sessionTime) {
      toast.error('Topic, date, and time are required.');
      return;
    }
    if (minFamilies > maxFamilies) {
      toast.error('Minimum families cannot exceed maximum families.');
      return;
    }
    setIsSaving(true);
    try {
      const sessionDatetime = new Date(`${sessionDate}T${sessionTime}`).toISOString();
      const cancellationDeadline = new Date(new Date(`${sessionDate}T${sessionTime}`).getTime() - 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('group_sessions').insert({
        provider_id: providerId,
        provider_name: providerName,
        provider_credentials: providerCredentials || '',
        provider_photo_url: providerPhotoUrl || null,
        topic: topic.trim(),
        topic_category: category || null,
        description: description.trim() || null,
        session_date: sessionDatetime,
        duration_minutes: durationMinutes,
        price_per_family_cents: pricePerFamily * 100,
        max_families: maxFamilies,
        min_families: minFamilies,
        cancellation_deadline: cancellationDeadline,
        status: 'open',
      });

      if (error) throw error;

      toast.success(`Group session created! Families can now find and book "${topic}".`);
      setShowCreator(false);
      resetForm();
      loadSessions();
    } catch (e: any) {
      toast.error(e?.message || 'Could not create session');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async (sessionId: string, reason?: string) => {
    const { error } = await supabase
      .from('group_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId)
      .eq('provider_id', providerId);

    if (error) {
      toast.error('Could not cancel session');
      return;
    }
    toast.success('Session cancelled. Enrolled families will be notified and refunded.');
    loadSessions();
  };

  const resetForm = () => {
    setTopic(''); setCategory(''); setDescription('');
    setSessionDate(''); setSessionTime('');
    setDurationMinutes(60); setPricePerFamily(50);
    setMaxFamilies(DEFAULT_MAX_FAMILIES); setMinFamilies(DEFAULT_MIN_FAMILIES);
  };

  const upcomingSessions = sessions.filter(s => s.status === 'open' || s.status === 'confirmed');
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

  return (
    <div className="space-y-4">
      {/* Header + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">Group Sessions</h3>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
            $50/family · up to 4 families · Aminy takes 20% · you keep $160–$200/session
          </p>
        </div>
        <Button
          className="bg-[#6B9080] hover:bg-[#216982] text-white"
          onClick={() => setShowCreator(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create session
        </Button>
      </div>

      {/* Economics callout */}
      <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-emerald-700">$50</p>
            <p className="text-xs text-emerald-600 mt-0.5">per family</p>
          </div>
          <div className="border-x border-emerald-200">
            <p className="text-xl font-bold text-emerald-700">$160</p>
            <p className="text-xs text-emerald-600 mt-0.5">guaranteed min (4 families)</p>
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-700">$200</p>
            <p className="text-xs text-emerald-600 mt-0.5">full room (4 families)</p>
          </div>
        </div>
        <p className="text-xs text-emerald-600 mt-3 text-center">
          Auto-cancelled with full refunds if minimum families not enrolled 24h before session
        </p>
      </Card>

      {/* Creator form */}
      {showCreator && (
        <Card className="p-5 border-[#6B9080]/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-[#1B2733] dark:text-white">New group session</h4>
            <button onClick={() => { setShowCreator(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Topic */}
            <div>
              <label className="text-sm font-medium text-[#1B2733] dark:text-white mb-1 block">
                Session topic <span className="text-red-500">*</span>
              </label>
              <Input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Calming meltdowns in public places"
                maxLength={100}
              />
            </div>

            {/* Category chips */}
            <div>
              <label className="text-sm font-medium text-[#1B2733] dark:text-white mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {TOPIC_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(category === cat.id ? '' : cat.id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all"
                    style={category === cat.id
                      ? { background: '#43AA8B20', borderColor: '#43AA8B', color: '#2D7A5E', fontWeight: 600 }
                      : { background: 'white', borderColor: '#E8E4DF', color: '#5A6B7A' }}
                  >
                    <span>{cat.emoji}</span>{cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-[#1B2733] dark:text-white mb-1 block">
                What will families learn? (shown in marketplace)
              </label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="In this session we'll cover: specific triggers, practical de-escalation steps families can use at home, and how to prevent the cycle from repeating..."
                rows={3}
              />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[#1B2733] dark:text-white mb-1 block">
                  Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1B2733] dark:text-white mb-1 block">
                  Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  value={sessionTime}
                  onChange={e => setSessionTime(e.target.value)}
                />
              </div>
            </div>

            {/* Capacity + pricing */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-[#1B2733] dark:text-white mb-1 block">Price/family ($)</label>
                <Input
                  type="number"
                  min={25}
                  max={150}
                  value={pricePerFamily}
                  onChange={e => setPricePerFamily(parseInt(e.target.value) || 50)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1B2733] dark:text-white mb-1 block">Max families</label>
                <Input
                  type="number"
                  min={2}
                  max={8}
                  value={maxFamilies}
                  onChange={e => setMaxFamilies(parseInt(e.target.value) || 4)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1B2733] dark:text-white mb-1 block">Min to run</label>
                <Input
                  type="number"
                  min={1}
                  max={maxFamilies}
                  value={minFamilies}
                  onChange={e => setMinFamilies(parseInt(e.target.value) || 2)}
                />
              </div>
            </div>

            {/* Earnings preview */}
            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E4DF]">
              <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Your earnings preview</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#3A4A57]">Minimum ({minFamilies} families)</span>
                <span className="font-semibold text-[#1B2733]">${Math.round(pricePerFamily * (1 - PLATFORM_FEE_PCT)) * minFamilies}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-[#3A4A57]">Full room ({maxFamilies} families)</span>
                <span className="font-bold text-[#6B9080]">${Math.round(pricePerFamily * (1 - PLATFORM_FEE_PCT)) * maxFamilies}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Aminy takes 20% platform fee · cash pay only</p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={isSaving || !topic.trim() || !sessionDate || !sessionTime}
              className="w-full bg-[#6B9080] hover:bg-[#216982] text-white"
            >
              {isSaving ? 'Creating…' : 'Create & publish to marketplace'}
            </Button>
          </div>
        </Card>
      )}

      {/* Upcoming sessions */}
      {isLoading ? (
        <div className="text-center py-6 text-slate-400">Loading…</div>
      ) : upcomingSessions.length === 0 && !showCreator ? (
        <Card className="p-8 text-center border-dashed border-[#E8E4DF]">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-[#1B2733] font-medium mb-1">No group sessions yet</p>
          <p className="text-sm text-[#5A6B7A] mb-4">
            Create your first group session — it'll appear in the marketplace for families to find and book.
          </p>
          <Button
            variant="outline"
            className="border-[#6B9080] text-[#6B9080]"
            onClick={() => setShowCreator(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create first session
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {upcomingSessions.map(session => (
            <GroupSessionCard
              key={session.id}
              session={session}
              onCancel={() => handleCancel(session.id)}
            />
          ))}
        </div>
      )}

      {/* Past sessions */}
      {pastSessions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Past sessions</p>
          <div className="space-y-2">
            {pastSessions.map(session => (
              <GroupSessionCard key={session.id} session={session} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupSessionCard({
  session,
  onCancel,
  isPast = false,
}: {
  session: GroupSession;
  onCancel?: () => void;
  isPast?: boolean;
}) {
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const sessionDate = new Date(session.session_date);
  const spotsLeft = session.max_families - session.enrolled_count;
  const enrollmentPct = session.enrolled_count / session.max_families;
  const meetsMinimum = session.enrolled_count >= session.min_families;
  const pricePerFamily = session.price_per_family_cents / 100;
  const bcbaEarns = Math.round(pricePerFamily * 0.8) * session.enrolled_count;

  const categoryInfo = TOPIC_CATEGORIES.find(c => c.id === session.topic_category);

  return (
    <Card className={`p-4 ${isPast ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {categoryInfo && <span className="text-lg">{categoryInfo.emoji}</span>}
            <p className="font-semibold text-[#1B2733] dark:text-white truncate">{session.topic}</p>
            <Badge className={
              session.status === 'open' ? 'bg-emerald-100 text-emerald-700' :
              session.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
              session.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-600'
            }>
              {session.status === 'open' ? 'Open' :
               session.status === 'confirmed' ? 'Confirmed' :
               session.status === 'cancelled' ? 'Cancelled' : 'Completed'}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#5A6B7A] mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {sessionDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {sessionDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              ${pricePerFamily}/family
            </span>
          </div>

          {/* Enrollment bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={meetsMinimum ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                {session.enrolled_count}/{session.max_families} enrolled
                {!meetsMinimum && session.status === 'open' && ` · needs ${session.min_families - session.enrolled_count} more to run`}
                {meetsMinimum && ' · will run ✓'}
              </span>
              <span className="text-[#5A6B7A]">You earn: <strong>${bcbaEarns}</strong></span>
            </div>
            <div className="w-full h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${meetsMinimum ? 'bg-emerald-500' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(100, enrollmentPct * 100)}%` }}
              />
            </div>
            {/* Minimum line indicator */}
            <div className="relative h-0" style={{ marginTop: -4 }}>
              <div
                className="absolute top-0 w-0.5 h-4 bg-[#5A6B7A] opacity-40"
                style={{ left: `${(session.min_families / session.max_families) * 100}%`, marginTop: -8 }}
                title={`Minimum: ${session.min_families} families`}
              />
            </div>
          </div>
        </div>

        {!isPast && session.status === 'open' && (
          <div className="shrink-0">
            {showConfirmCancel ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-red-600 font-medium">Cancel and refund all?</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs h-7"
                    onClick={() => { onCancel?.(); setShowConfirmCancel(false); }}
                  >
                    Yes, cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => setShowConfirmCancel(false)}
                  >
                    Keep
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowConfirmCancel(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
