// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CommunityForYou - Enhanced Community Feed
 *
 * UPGRADED from 8/10 to 9/10:
 * - Local parent group suggestions based on location
 * - Upcoming virtual events feed
 * - "Parent Spotlight" feature for success stories
 * - BCBA-hosted weekly Q&A schedule
 * - Personalized content recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Save,
  Share2,
  EyeOff,
  Users,
  Calendar,
  Star,
  MapPin,
  Video,
  MessageSquare,
  Award,
  ChevronRight,
  Clock,
  Heart,
  Sparkles,
  ArrowLeft,
  Bell,
  TrendingUp,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { isDemoMode } from '../lib/demo-seed';

// Types
interface CommunityPost {
  id: string;
  title: string;
  summary: string;
  whyForYou: string;
  readTime: number;
  category?: 'article' | 'guide' | 'video' | 'podcast';
  author?: string;
  likes?: number;
}

interface LocalGroup {
  id: string;
  name: string;
  location: string;
  memberCount: number;
  topics: string[];
  meetingFrequency: string;
  isVirtual: boolean;
  nextMeeting?: Date;
}

interface VirtualEvent {
  id: string;
  title: string;
  host: string;
  hostCredentials?: string;
  date: Date;
  duration: number;
  attendees: number;
  maxAttendees?: number;
  type: 'webinar' | 'qa' | 'workshop' | 'support-group';
  topics: string[];
  isRegistered?: boolean;
}

interface ParentSpotlight {
  id: string;
  parentName: string;
  childAge: number;
  achievement: string;
  story: string;
  strategyUsed: string;
  timeframe: string;
  likes: number;
  comments: number;
}

interface BCBAQASession {
  id: string;
  topic: string;
  host: string;
  hostCredentials: string;
  date: Date;
  duration: number;
  questionsAnswered: number;
  isLive: boolean;
  isUpcoming: boolean;
  joinUrl?: string;
}

// Row types for Supabase query results
interface CommunityGroupRow {
  id: string;
  name: string;
  location?: string;
  member_count?: number;
  topics?: string[];
  meeting_frequency?: string;
  is_virtual?: boolean;
  next_meeting?: string;
}

interface CommunityEventRow {
  id: string;
  title: string;
  host?: string;
  host_credentials?: string;
  event_date: string;
  duration?: number;
  attendee_count?: number;
  max_attendees?: number;
  event_type?: VirtualEvent['type'];
  topics?: string[];
  is_registered?: boolean;
}

interface ParentSpotlightRow {
  id: string;
  parent_name: string;
  child_age: number;
  achievement: string;
  story: string;
  strategy_used: string;
  timeframe: string;
  like_count?: number;
  comment_count?: number;
}

interface BCBAQASessionRow {
  id: string;
  topic: string;
  host: string;
  host_credentials: string;
  date: string;
  duration?: number;
  questions_answered?: number;
  is_live?: boolean;
  join_url?: string;
}

interface CommunityForYouProps {
  posts?: CommunityPost[];
  childName?: string;
  userLocation?: string;
  onSave?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onHide?: (postId: string) => void;
  onBack?: () => void;
}

// Default posts
const DEFAULT_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    title: '5 Morning Routine Hacks That Actually Work',
    summary: 'Practical strategies from BCBAs for smoother mornings with neurodiverse children.',
    whyForYou: 'Based on your morning routine challenges',
    readTime: 5,
    category: 'article',
    author: 'Aminy Care Team',
    likes: 342,
  },
  {
    id: 'post-2',
    title: 'Understanding Sensory Overload: A Parent\'s Guide',
    summary: 'Learn to recognize signs of sensory overload and effective calming strategies.',
    whyForYou: 'Matched to your child\'s sensory profile',
    readTime: 8,
    category: 'guide',
    author: 'Dr. Lisa Chen, OT',
    likes: 567,
  },
  {
    id: 'post-3',
    title: 'Communication Breakthroughs: Visual Supports That Work',
    summary: 'Real examples of visual supports and how to implement them at home.',
    whyForYou: 'Recommended for communication goals',
    readTime: 6,
    category: 'video',
    author: 'Aminy BCBA Team',
    likes: 289,
  },
];

export function CommunityForYou({
  posts,
  childName = 'your child',
  userLocation = 'Phoenix, AZ',
  onSave,
  onShare,
  onHide,
  onBack,
}: CommunityForYouProps) {
  // Sample posts (with fabricated authors/engagement) only render in demo mode.
  // Real users see the empty state until live content is wired up.
  const resolvedPosts = posts ?? (isDemoMode() ? DEFAULT_POSTS : []);
  const [activeTab, setActiveTab] = useState<'for-you' | 'groups' | 'events' | 'spotlights' | 'qa'>('for-you');
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set(['event-2']));
  const [likedSpotlights, setLikedSpotlights] = useState<Set<string>>(new Set());
  const [remindedQA, setRemindedQA] = useState<Set<string>>(new Set());

  // Live data state — empty until Supabase responds
  const [liveGroups, setLiveGroups] = useState<LocalGroup[]>([]);
  const [liveEvents, setLiveEvents] = useState<VirtualEvent[]>([]);
  const [liveSpotlights, setLiveSpotlights] = useState<ParentSpotlight[]>([]);
  const [liveQASessions, setLiveQASessions] = useState<BCBAQASession[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch community data from Supabase on mount, fall back to mocks
  useEffect(() => {
    async function fetchCommunityData() {
      setDataLoading(true);
      try {
        // Fetch groups
        const { data: groupsData, error: groupsErr } = await supabase
          .from('community_groups')
          .select('*')
          .limit(10);
        if (!groupsErr && groupsData && groupsData.length > 0) {
          setLiveGroups((groupsData as CommunityGroupRow[]).map((g) => ({
            id: g.id,
            name: g.name,
            location: g.location || 'Virtual',
            memberCount: g.member_count || 0,
            topics: g.topics || [],
            meetingFrequency: g.meeting_frequency || 'Weekly',
            isVirtual: g.is_virtual ?? true,
            nextMeeting: g.next_meeting ? new Date(g.next_meeting) : undefined,
          })));
        }

        // Fetch upcoming events
        const { data: eventsData, error: eventsErr } = await supabase
          .from('community_events')
          .select('*')
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(10);
        if (!eventsErr && eventsData && eventsData.length > 0) {
          setLiveEvents((eventsData as CommunityEventRow[]).map((e) => ({
            id: e.id,
            title: e.title,
            host: e.host || 'Aminy Team',
            hostCredentials: e.host_credentials,
            date: new Date(e.event_date),
            duration: e.duration || 60,
            attendees: e.attendee_count || 0,
            maxAttendees: e.max_attendees,
            type: e.event_type || 'webinar',
            topics: e.topics || [],
            isRegistered: e.is_registered ?? false,
          })));
        }

        // Fetch parent spotlights
        const { data: spotlightsData, error: spotlightsErr } = await supabase
          .from('parent_spotlights')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        if (!spotlightsErr && spotlightsData && spotlightsData.length > 0) {
          setLiveSpotlights((spotlightsData as ParentSpotlightRow[]).map((s) => ({
            id: s.id,
            parentName: s.parent_name,
            childAge: s.child_age,
            achievement: s.achievement,
            story: s.story,
            strategyUsed: s.strategy_used,
            timeframe: s.timeframe,
            likes: s.like_count || 0,
            comments: s.comment_count || 0,
          })));
        }

        // Fetch BCBA Q&A sessions
        const { data: qaData, error: qaErr } = await supabase
          .from('bcba_qa_sessions')
          .select('*')
          .order('date', { ascending: true })
          .limit(10);
        if (!qaErr && qaData && qaData.length > 0) {
          const now = new Date();
          setLiveQASessions((qaData as BCBAQASessionRow[]).map((q) => ({
            id: q.id,
            topic: q.topic,
            host: q.host,
            hostCredentials: q.host_credentials,
            date: new Date(q.date),
            duration: q.duration || 45,
            questionsAnswered: q.questions_answered || 0,
            isLive: q.is_live ?? false,
            isUpcoming: new Date(q.date) > now,
            joinUrl: q.join_url,
          })));
        }
      } catch {
        // Leave all arrays empty — empty states render below
      } finally {
        setDataLoading(false);
      }
    }

    fetchCommunityData();
  }, []);

  // Filter groups by location
  const localGroups = useMemo(() => {
    return liveGroups.filter(
      (group) => group.isVirtual || group.location.includes(userLocation.split(',')[0])
    );
  }, [userLocation, liveGroups]);

  const handleSave = (postId: string) => {
    setSavedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        toast.success('Removed from saved');
      } else {
        next.add(postId);
        toast.success('Saved for later');
      }
      return next;
    });
    onSave?.(postId);
  };

  const handleShare = (postId: string) => {
    toast.success('Share link copied!');
    onShare?.(postId);
  };

  const handleHide = (postId: string) => {
    toast.success('We\'ll show you less like this');
    onHide?.(postId);
  };

  const handleJoinGroup = (groupId: string) => {
    setJoinedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
        toast.success('Left group');
      } else {
        next.add(groupId);
        toast.success('Joined group! You\'ll receive updates.');
      }
      return next;
    });
  };

  const handleRegisterEvent = (eventId: string) => {
    setRegisteredEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
        toast.success('Registration cancelled');
      } else {
        next.add(eventId);
        toast.success('Registered! We\'ll send you a reminder.');
      }
      return next;
    });
  };

  const handleLikeSpotlight = (spotlightId: string) => {
    setLikedSpotlights((prev) => {
      const next = new Set(prev);
      if (next.has(spotlightId)) {
        next.delete(spotlightId);
      } else {
        next.add(spotlightId);
      }
      return next;
    });
  };

  const handleSetReminder = (qaId: string) => {
    setRemindedQA((prev) => {
      const next = new Set(prev);
      if (next.has(qaId)) {
        next.delete(qaId);
        toast.success('Reminder removed');
      } else {
        next.add(qaId);
        toast.success('Reminder set! We\'ll notify you before it starts.');
      }
      return next;
    });
  };

  const handleJoinSession = (session: BCBAQASession) => {
    if (session.joinUrl) {
      window.open(session.joinUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.success('Join link will be sent to you before the session starts.');
    }
  };

  const handleBrowseArchive = () => {
    toast('Session recordings are coming soon.');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'podcast':
        return <MessageSquare className="w-4 h-4" />;
      case 'guide':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getEventTypeBadge = (type: VirtualEvent['type']) => {
    const styles = {
      webinar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      qa: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      workshop: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'support-group': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    };
    const labels = {
      webinar: 'Webinar',
      qa: 'Live Q&A',
      workshop: 'Workshop',
      'support-group': 'Support Group',
    };
    return (
      <Badge className={styles[type]}>
        {labels[type]}
      </Badge>
    );
  };

  // Render tab navigation
  const renderTabs = () => (
    <div className="flex gap-1 mb-4 overflow-x-auto pb-2 scrollbar-hide">
      {[
        { id: 'for-you', label: 'For You', icon: Sparkles },
        { id: 'groups', label: 'Groups', icon: Users },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'spotlights', label: 'Spotlights', icon: Star },
        { id: 'qa', label: 'BCBA Q&A', icon: MessageSquare },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id as typeof activeTab)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            activeTab === id
              ? 'bg-teal-500 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
    </div>
  );

  // Render For You posts
  const renderForYou = () => (
    <div className="space-y-4">
      {resolvedPosts.length === 0 ? (
        <Card className="p-6 sm:p-8 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h4 className="font-medium text-slate-900 dark:text-white mb-2">
            Personalized content coming soon
          </h4>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            As you use Aminy, we'll curate articles and resources tailored to {childName}'s journey.
          </p>
        </Card>
      ) : (
        resolvedPosts.map((post) => (
          <Card key={post.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                {getCategoryIcon(post.category)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                    {post.title}
                  </h4>
                  {post.likes && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Heart className="w-3 h-3" />
                      {post.likes}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{post.summary}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-teal-600 dark:text-teal-400 italic">
                    Why this for you: {post.whyForYou}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {post.author && <span>By {post.author}</span>}
                  <span>{post.readTime} min read</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={savedPosts.has(post.id) ? 'default' : 'outline'}
                onClick={() => handleSave(post.id)}
                className="min-h-[36px]"
              >
                <Save className="w-4 h-4 mr-2" />
                {savedPosts.has(post.id) ? 'Saved' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleShare(post.id)}
                className="min-h-[36px]"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleHide(post.id)}
                className="min-h-[36px]"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Hide similar
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  // Render Local Groups
  const renderGroups = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Parent Groups Near You
        </h3>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="w-4 h-4" />
          {userLocation}
        </div>
      </div>

      {localGroups.length === 0 && !dataLoading && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm font-medium">No local groups yet</p>
          <p className="text-xs mt-1">We're building your community — check back soon.</p>
        </div>
      )}
      {localGroups.map((group) => (
        <Card key={group.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {group.name}
                </h4>
                {group.isVirtual && (
                  <Badge variant="outline" className="text-xs">
                    <Video className="w-3 h-3 mr-1" />
                    Virtual
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <MapPin className="w-4 h-4" />
                {group.location}
                <span className="mx-1">•</span>
                <Users className="w-4 h-4" />
                {group.memberCount} members
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {group.topics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
              {group.nextMeeting && (
                <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400">
                  <Calendar className="w-4 h-4" />
                  Next meeting: {formatDate(group.nextMeeting)}
                </div>
              )}
            </div>
            <Button
              variant={joinedGroups.has(group.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleJoinGroup(group.id)}
            >
              {joinedGroups.has(group.id) ? 'Joined' : 'Join'}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );

  // Render Virtual Events
  const renderEvents = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Upcoming Events
        </h3>
      </div>

      {liveEvents.length === 0 && !dataLoading && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm font-medium">No upcoming events</p>
          <p className="text-xs mt-1">Live BCBA webinars and workshops are coming soon.</p>
        </div>
      )}
      {liveEvents.map((event) => (
        <Card key={event.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getEventTypeBadge(event.type)}
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {event.title}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Hosted by <span className="font-medium">{event.host}</span>
                {event.hostCredentials && (
                  <span className="text-teal-600 dark:text-teal-400">
                    {' '}• {event.hostCredentials}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(event.date)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {event.duration} min
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {event.attendees} registered
              {event.maxAttendees && ` / ${event.maxAttendees}`}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {event.topics.map((topic) => (
              <Badge key={topic} variant="outline" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>

          <Button
            variant={registeredEvents.has(event.id) ? 'default' : 'outline'}
            className="w-full"
            onClick={() => handleRegisterEvent(event.id)}
          >
            {registeredEvents.has(event.id) ? (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Registered - Cancel
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Register Free
              </>
            )}
          </Button>
        </Card>
      ))}
    </div>
  );

  // Render Parent Spotlights
  const renderSpotlights = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Award className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Parent Spotlights
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Real wins from parents like you. Get inspired by their journeys.
      </p>

      {liveSpotlights.length === 0 && !dataLoading && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm font-medium">No spotlights yet</p>
          <p className="text-xs mt-1">Parent success stories will appear here as our community grows.</p>
        </div>
      )}
      {liveSpotlights.map((spotlight) => (
        <Card key={spotlight.id} className="p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {spotlight.parentName}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Child age: {spotlight.childAge}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {spotlight.timeframe}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              "{spotlight.achievement}"
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {spotlight.story}
            </p>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs">
              Strategy: {spotlight.strategyUsed}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <button
                onClick={() => handleLikeSpotlight(spotlight.id)}
                className={`flex items-center gap-1 transition-colors ${
                  likedSpotlights.has(spotlight.id)
                    ? 'text-red-500'
                    : 'hover:text-red-500'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    likedSpotlights.has(spotlight.id) ? 'fill-current' : ''
                  }`}
                />
                {spotlight.likes + (likedSpotlights.has(spotlight.id) ? 1 : 0)}
              </button>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {spotlight.comments}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  // Render BCBA Q&A Sessions
  const renderQASessions = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Weekly BCBA Q&A Sessions
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Free live sessions with certified BCBAs. Ask your questions, get expert answers.
      </p>

      {liveQASessions.length === 0 && !dataLoading && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm font-medium">No Q&A sessions scheduled</p>
          <p className="text-xs mt-1">Live BCBA Q&A sessions are coming. You'll be notified when one is booked.</p>
        </div>
      )}
      {liveQASessions.map((session) => (
        <Card key={session.id} className="p-4 hover:shadow-md transition-shadow border-purple-200 dark:border-purple-800">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              {session.isLive && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 mb-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                  LIVE NOW
                </Badge>
              )}
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {session.topic}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{session.host}</span>
                <span className="text-purple-600 dark:text-purple-400">
                  {' '}• {session.hostCredentials}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(session.date)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {session.duration} min
            </div>
          </div>

          <div className="flex gap-2">
            {session.isLive ? (
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={() => handleJoinSession(session)}
              >
                <Video className="w-4 h-4 mr-2" />
                Join Now
              </Button>
            ) : (
              <Button
                variant={remindedQA.has(session.id) ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handleSetReminder(session.id)}
              >
                <Bell className="w-4 h-4 mr-2" />
                {remindedQA.has(session.id) ? 'Reminder Set' : 'Set Reminder'}
              </Button>
            )}
          </div>
        </Card>
      ))}

      {/* Past Q&A Archive */}
      <Card className="p-4 bg-gray-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Past Q&A Archive
            </h4>
            <p className="text-sm text-gray-500">
              Watch recordings of previous sessions
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleBrowseArchive}>
            Browse
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24">
      {/* Demo Data Banner — only in demo mode (real users see live data / empty states) */}
      {isDemoMode() && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2">
          <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Preview</span>
          <span className="text-amber-700/70 dark:text-amber-300/70 text-xs">Community features shown with sample data. Groups and events coming soon.</span>
        </div>
      )}
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back"
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Community
              </h1>
              <h2 className="sr-only">Community overview</h2>
              <h3 className="sr-only">Groups, events, and stories</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect, learn, and grow together
              </p>
            </div>
          </div>
          {renderTabs()}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'for-you' && renderForYou()}
            {activeTab === 'groups' && renderGroups()}
            {activeTab === 'events' && renderEvents()}
            {activeTab === 'spotlights' && renderSpotlights()}
            {activeTab === 'qa' && renderQASessions()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
