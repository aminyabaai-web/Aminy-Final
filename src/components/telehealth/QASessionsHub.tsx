// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Q&A Sessions Hub
 *
 * Monthly live Q&A sessions with providers - MVP implementation
 *
 * Features:
 * - Upcoming sessions list with registration
 * - Past session replay library
 * - Calendar integration
 * - Email/SMS reminders
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  Play,
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Users,
  Star,
  Download,
  Share,
  CalendarPlus,
  Mail
} from 'lucide-react';
import { isDemoMode } from '../../lib/demo-seed';

// ============================================================================
// Types
// ============================================================================

export interface QASession {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
  status: 'upcoming' | 'live' | 'completed';
  // Hosts
  hosts: {
    name: string;
    credentials: string;
    role: string;
    avatarUrl?: string;
  }[];
  // Topics
  topics: string[];
  // Registration
  registeredCount: number;
  maxCapacity?: number;
  // Replay (for completed sessions)
  replayUrl?: string;
  replayDuration?: number; // minutes
  replayViews?: number;
  // User state
  isRegistered?: boolean;
  hasReminder?: boolean;
}

interface QASessionsHubProps {
  onBack: () => void;
  onRegister?: (sessionId: string) => void;
  onUnregister?: (sessionId: string) => void;
  onSetReminder?: (sessionId: string, enabled: boolean) => void;
  onAddToCalendar?: (session: QASession) => void;
  onWatchReplay?: (sessionId: string) => void;
  userEmail?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_SESSIONS: QASession[] = [
  {
    id: 'qa-1',
    title: 'Managing Meltdowns: Proactive Strategies',
    description: 'Join our panel of BCBAs and parent coaches as we discuss evidence-based approaches to preventing and managing meltdowns. Bring your questions!',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '12:00',
    endTime: '13:00',
    timezone: 'America/Phoenix',
    status: 'upcoming',
    hosts: [
      { name: 'Sarah Chen', credentials: 'BCBA, LBA', role: 'Behavior Analyst', avatarUrl: '/avatars/sarah-chen.jpg' },
      { name: 'Lisa Park', credentials: 'Certified Parent Coach', role: 'Parent Coach' }
    ],
    topics: ['Antecedent strategies', 'Visual supports', 'Regulation techniques', 'Parent self-care'],
    registeredCount: 47,
    maxCapacity: 100,
    isRegistered: false,
    hasReminder: false
  },
  {
    id: 'qa-2',
    title: 'Speech & Communication: AAC and Beyond',
    description: 'Our SLP expert discusses augmentative communication tools, language development milestones, and practical strategies for building communication skills at home.',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '19:00',
    timezone: 'America/Phoenix',
    status: 'upcoming',
    hosts: [
      { name: 'James Wilson', credentials: 'MS, CCC-SLP', role: 'Speech-Language Pathologist' }
    ],
    topics: ['AAC introduction', 'Language modeling', 'Communication temptations', 'Device selection'],
    registeredCount: 32,
    maxCapacity: 75,
    isRegistered: true,
    hasReminder: true
  },
  {
    id: 'qa-3',
    title: 'Navigating the IEP Process',
    description: 'Everything you need to know about IEPs: your rights, what to ask for, and how to advocate effectively for your child.',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '12:00',
    endTime: '13:00',
    timezone: 'America/Phoenix',
    status: 'completed',
    hosts: [
      { name: 'Maria Rodriguez', credentials: 'Special Education Advocate', role: 'Education Advocate' },
      { name: 'Emily Thompson', credentials: 'LCSW', role: 'Family Therapist' }
    ],
    topics: ['IEP basics', 'Parent rights', 'Goal writing', 'Meeting preparation'],
    registeredCount: 89,
    replayUrl: 'https://replay.aminy.com/qa-3',
    replayDuration: 58,
    replayViews: 234
  },
  {
    id: 'qa-4',
    title: 'Sensory Processing: Understanding & Supporting',
    description: 'Our OT expert breaks down sensory processing differences and shares practical strategies for creating sensory-friendly environments.',
    date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '19:00',
    timezone: 'America/Phoenix',
    status: 'completed',
    hosts: [
      { name: 'David Kim', credentials: 'OTR/L', role: 'Occupational Therapist' }
    ],
    topics: ['Sensory systems', 'Sensory diets', 'Environment modifications', 'Calming strategies'],
    registeredCount: 67,
    replayUrl: 'https://replay.aminy.com/qa-4',
    replayDuration: 52,
    replayViews: 189
  },
  {
    id: 'qa-5',
    title: 'Sleep Solutions for Families',
    description: 'Comprehensive discussion on sleep challenges, bedtime routines, and evidence-based approaches to improving sleep for the whole family.',
    date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '12:00',
    endTime: '13:00',
    timezone: 'America/Phoenix',
    status: 'completed',
    hosts: [
      { name: 'Sarah Chen', credentials: 'BCBA, LBA', role: 'Behavior Analyst' },
      { name: 'Lisa Park', credentials: 'Certified Parent Coach', role: 'Parent Coach' }
    ],
    topics: ['Sleep hygiene', 'Bedtime routines', 'Night wakings', 'Melatonin considerations'],
    registeredCount: 112,
    replayUrl: 'https://replay.aminy.com/qa-5',
    replayDuration: 61,
    replayViews: 456
  }
];

// ============================================================================
// Main Component
// ============================================================================

export function QASessionsHub({
  onBack,
  onRegister,
  onUnregister,
  onSetReminder,
  onAddToCalendar,
  onWatchReplay,
  userEmail
}: QASessionsHubProps) {
  // Real users see only genuinely-scheduled sessions (empty until the live Q&A
  // program launches and real sessions/replays are published). The sample roster —
  // with its illustrative host names, registration counts, and replay view totals —
  // is DEMO MODE ONLY so prospect walkthroughs look complete.
  const demo = isDemoMode();
  const [sessions, setSessions] = useState<QASession[]>(demo ? MOCK_SESSIONS : []);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'replays'>('upcoming');

  const upcomingSessions = useMemo(
    () => sessions.filter(s => s.status === 'upcoming' || s.status === 'live'),
    [sessions]
  );

  const completedSessions = useMemo(
    () => sessions.filter(s => s.status === 'completed'),
    [sessions]
  );

  const handleRegister = (sessionId: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, isRegistered: true, registeredCount: s.registeredCount + 1 }
        : s
    ));
    onRegister?.(sessionId);
  };

  const handleUnregister = (sessionId: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, isRegistered: false, hasReminder: false, registeredCount: s.registeredCount - 1 }
        : s
    ));
    onUnregister?.(sessionId);
  };

  const handleToggleReminder = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, hasReminder: !s.hasReminder } : s
      ));
      onSetReminder?.(sessionId, !session.hasReminder);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string, timezone: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E8E4DF] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-[#F0EDE8] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[#3A4A57]" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[#1B2733]">Monthly Q&A Sessions</h1>
            <p className="text-sm text-[#5A6B7A]">Live sessions with our provider team</p>
          </div>
        </div>
      </header>

      {/* Demo Data Banner — sample sessions only render in demo mode */}
      {demo && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-xs font-medium">Preview</span>
            <span className="text-amber-700/70 text-xs">Sample sessions shown. Live Q&A sessions coming soon.</span>
          </div>
        </div>
      )}

      {/* Included Badge */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-current" />
          <span className="text-sm font-medium text-amber-800">Included with your membership</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-2">
        <div className="flex gap-3 sm:gap-4">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upcoming'
                ? 'border-cyan-600 text-[#6B9080]'
                : 'border-transparent text-[#5A6B7A] hover:text-[#3A4A57]'
            }`}
          >
            Upcoming ({upcomingSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('replays')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'replays'
                ? 'border-cyan-600 text-[#6B9080]'
                : 'border-transparent text-[#5A6B7A] hover:text-[#3A4A57]'
            }`}
          >
            Replay Library ({completedSessions.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24 space-y-3 sm:space-y-4">
        {activeTab === 'upcoming' ? (
          upcomingSessions.length > 0 ? (
            upcomingSessions.map(session => (
              <UpcomingSessionCard
                key={session.id}
                session={session}
                onRegister={() => handleRegister(session.id)}
                onUnregister={() => handleUnregister(session.id)}
                onToggleReminder={() => handleToggleReminder(session.id)}
                onAddToCalendar={() => onAddToCalendar?.(session)}
                formatDate={formatDate}
                formatTime={formatTime}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-[#8A9BA8] mx-auto mb-4" />
              <p className="text-[#5A6B7A]">No upcoming sessions scheduled</p>
              <p className="text-sm text-[#8A9BA8] mt-1">Check back soon for new sessions!</p>
            </div>
          )
        ) : (
          completedSessions.length > 0 ? (
            completedSessions.map(session => (
              <ReplayCard
                key={session.id}
                session={session}
                onWatch={() => onWatchReplay?.(session.id)}
                formatDate={formatDate}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <Video className="w-12 h-12 text-[#8A9BA8] mx-auto mb-4" />
              <p className="text-[#5A6B7A]">No replays available yet</p>
              <p className="text-sm text-[#8A9BA8] mt-1">Past sessions will appear here</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Upcoming Session Card
// ============================================================================

interface UpcomingSessionCardProps {
  session: QASession;
  onRegister: () => void;
  onUnregister: () => void;
  onToggleReminder: () => void;
  onAddToCalendar: () => void;
  formatDate: (date: string) => string;
  formatTime: (time: string, timezone: string) => string;
}

function UpcomingSessionCard({
  session,
  onRegister,
  onUnregister,
  onToggleReminder,
  onAddToCalendar,
  formatDate,
  formatTime
}: UpcomingSessionCardProps) {
  const spotsLeft = session.maxCapacity ? session.maxCapacity - session.registeredCount : null;
  const isAlmostFull = spotsLeft !== null && spotsLeft < 20;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
      {/* Date Banner */}
      <div className="bg-[#6B9080] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium">{formatDate(session.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            {formatTime(session.startTime, session.timezone)} - {formatTime(session.endTime, session.timezone)} MST
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-[#1B2733] text-lg mb-2">{session.title}</h3>
        <p className="text-sm text-[#5A6B7A] mb-4">{session.description}</p>

        {/* Hosts */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex -space-x-2">
            {session.hosts.map((host, idx) => (
              <div
                key={idx}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-[#466379] flex items-center justify-center text-white text-xs font-medium border-2 border-white"
              >
                {host.name.split(' ').map(n => n[0]).join('')}
              </div>
            ))}
          </div>
          <div className="text-sm text-[#5A6B7A]">
            {session.hosts.map(h => `${h.name}, ${h.credentials}`).join(' & ')}
          </div>
        </div>

        {/* Topics */}
        <div className="flex flex-wrap gap-2 mb-4">
          {session.topics.map((topic, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-[#F0EDE8] text-[#5A6B7A] text-xs rounded-full"
            >
              {topic}
            </span>
          ))}
        </div>

        {/* Registration Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
            <Users className="w-4 h-4" />
            <span>{session.registeredCount} registered</span>
            {isAlmostFull && (
              <span className="text-amber-600 font-medium">• Only {spotsLeft} spots left!</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {session.isRegistered ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">You're registered!</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onToggleReminder}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  session.hasReminder
                    ? 'bg-[#6B9080] text-white'
                    : 'border border-[#E8E4DF] text-[#3A4A57] hover:bg-[#FAF7F2]'
                }`}
              >
                {session.hasReminder ? (
                  <>
                    <Bell className="w-4 h-4" />
                    Reminder Set
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4" />
                    Add Reminder
                  </>
                )}
              </button>

              <button
                onClick={onAddToCalendar}
                className="flex-1 py-2 px-4 border border-[#E8E4DF] rounded-xl text-sm font-medium text-[#3A4A57] hover:bg-[#FAF7F2] transition-colors flex items-center justify-center gap-2"
              >
                <CalendarPlus className="w-4 h-4" />
                Add to Calendar
              </button>
            </div>

            <button
              onClick={onUnregister}
              className="w-full py-2 text-sm text-[#5A6B7A] hover:text-[#3A4A57] transition-colors"
            >
              Cancel registration
            </button>
          </div>
        ) : (
          <button
            onClick={onRegister}
            className="w-full py-3 bg-[#6B9080] text-white font-medium rounded-xl hover:bg-[#466379] transition-colors flex items-center justify-center gap-2"
          >
            <Video className="w-4 h-4" />
            Register for Free
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Replay Card
// ============================================================================

interface ReplayCardProps {
  session: QASession;
  onWatch: () => void;
  formatDate: (date: string) => string;
}

function ReplayCard({ session, onWatch, formatDate }: ReplayCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
      {/* Thumbnail Area */}
      <div className="relative bg-gradient-to-br from-cyan-600 to-emerald-500 h-32 flex items-center justify-center">
        <button
          onClick={onWatch}
          className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <Play className="w-6 h-6 text-white fill-current ml-1" />
        </button>
        {session.replayDuration && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
            {session.replayDuration} min
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2 text-xs text-[#5A6B7A] mb-2">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(session.date)}</span>
          {session.replayViews && (
            <>
              <span>•</span>
              <span>{session.replayViews} views</span>
            </>
          )}
        </div>

        <h3 className="font-semibold text-[#1B2733] mb-2">{session.title}</h3>

        {/* Hosts */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex -space-x-2">
            {session.hosts.map((host, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-600 to-[#466379] flex items-center justify-center text-white text-[10px] font-medium border-2 border-white"
              >
                {host.name.split(' ').map(n => n[0]).join('')}
              </div>
            ))}
          </div>
          <div className="text-xs text-[#5A6B7A]">
            {session.hosts.map(h => h.name).join(' & ')}
          </div>
        </div>

        {/* Topics */}
        <div className="flex flex-wrap gap-1 mb-4">
          {session.topics.slice(0, 3).map((topic, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-[#F0EDE8] text-[#5A6B7A] text-xs rounded-full"
            >
              {topic}
            </span>
          ))}
          {session.topics.length > 3 && (
            <span className="px-2 py-0.5 text-[#8A9BA8] text-xs">
              +{session.topics.length - 3} more
            </span>
          )}
        </div>

        {/* Watch Button */}
        <button
          onClick={onWatch}
          className="w-full py-2.5 bg-[#6B9080] text-white font-medium rounded-xl hover:bg-[#466379] transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          Watch Replay
        </button>
      </div>
    </div>
  );
}

export default QASessionsHub;
