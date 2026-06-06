// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CommunityHub - Parent Groups & Forums
 *
 * Features:
 * - Topic-based discussion groups
 * - Anonymous posting option for sensitive topics
 * - Moderated Q&A with BCBAs
 * - Win sharing & celebrations
 * - Local parent meetup coordination
 * - Resource sharing between parents
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  MessageCircle,
  Heart,
  Share2,
  Plus,
  Search,
  Filter,
  Crown,
  Shield,
  Award,
  MapPin,
  Calendar,
  Clock,
  ThumbsUp,
  MessageSquare,
  Eye,
  EyeOff,
  Flag,
  MoreHorizontal,
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Sparkles,
  Star,
  CheckCircle,
  AlertCircle,
  Bookmark,
  TrendingUp,
  Hash,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { TierType } from '../lib/tier-utils';
import { getPosts as getSupabasePosts, createPost as createSupabasePost, likePost as likeSupabasePost, unlikePost as unlikeSupabasePost, bookmarkPost as bookmarkSupabasePost, unbookmarkPost as unbookmarkSupabasePost, getComments as getSupabaseComments, addComment as addSupabaseComment, type CommunityComment } from '../lib/community-service';
import { checkAndAwardBadges } from '../lib/badge-service';
import { supabase } from '../utils/supabase/client';
import { isDemoMode } from '../lib/demo-seed';

// Types
interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isAnonymous: boolean;
  isBCBA: boolean;
  title: string;
  content: string;
  category: PostCategory;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: Date;
  isPinned: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: GroupCategory;
  isPrivate: boolean;
  isJoined: boolean;
  recentActivity: Date;
  icon: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: Date;
  attendeeCount: number;
  isVirtual: boolean;
  isAttending: boolean;
}

type PostCategory = 'wins' | 'questions' | 'tips' | 'support' | 'resources' | 'bcba-qa';
type GroupCategory = 'diagnosis' | 'age-group' | 'topic' | 'local';
type CommunityView = 'feed' | 'groups' | 'events' | 'bcba-qa';

interface CommunityHubProps {
  userId: string;
  userName: string;
  userTier?: TierType;
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
  onUpgrade?: () => void;
}

// Mock data
const MOCK_POSTS: Post[] = [
  {
    id: '1',
    authorId: 'user1',
    authorName: 'Sarah M.',
    isAnonymous: false,
    isBCBA: false,
    title: 'First successful dentist visit!',
    content: 'After months of social stories and practice visits, my son (6, ASD) made it through his entire cleaning today! The hygienist was so patient. Just wanted to share this win with people who understand how big this is.',
    category: 'wins',
    tags: ['milestone', 'medical', 'success'],
    likes: 47,
    comments: 12,
    shares: 3,
    views: 234,
    isLiked: false,
    isBookmarked: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isPinned: false,
  },
  {
    id: '2',
    authorId: 'bcba1',
    authorName: 'Dr. Emily Chen, BCBA',
    isAnonymous: false,
    isBCBA: true,
    title: 'AMA: Managing mealtime challenges',
    content: 'Hi everyone! I specialize in feeding therapy and will be answering questions about mealtime challenges today. Drop your questions below and I\'ll respond throughout the week. Remember, every child is different - these are general strategies, not personalized advice.',
    category: 'bcba-qa',
    tags: ['feeding', 'ama', 'bcba'],
    likes: 89,
    comments: 45,
    shares: 12,
    views: 567,
    isLiked: true,
    isBookmarked: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    isPinned: true,
  },
  {
    id: '3',
    authorId: 'user2',
    authorName: 'Anonymous',
    isAnonymous: true,
    isBCBA: false,
    title: 'Struggling with burnout',
    content: 'I love my child more than anything, but I\'m exhausted. Between therapy appointments, school meetings, and managing daily challenges, I feel like I\'m running on empty. How do other parents cope? Any self-care tips that actually work?',
    category: 'support',
    tags: ['burnout', 'self-care', 'support'],
    likes: 156,
    comments: 67,
    shares: 8,
    views: 892,
    isLiked: false,
    isBookmarked: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    isPinned: false,
  },
  {
    id: '4',
    authorId: 'user3',
    authorName: 'Mike R.',
    isAnonymous: false,
    isBCBA: false,
    title: 'Visual schedule app recommendations?',
    content: 'Looking for a good visual schedule app for my 8-year-old with ADHD. We\'ve tried a few but nothing has stuck. What works for your kids? Bonus if it works on both iPad and Android.',
    category: 'questions',
    tags: ['apps', 'visual-schedules', 'recommendations'],
    likes: 23,
    comments: 31,
    shares: 5,
    views: 178,
    isLiked: false,
    isBookmarked: true,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    isPinned: false,
  },
];

const MOCK_GROUPS: Group[] = [
  {
    id: '1',
    name: 'Autism Parents',
    description: 'Support and resources for parents of children on the autism spectrum.',
    memberCount: 2345,
    category: 'diagnosis',
    isPrivate: false,
    isJoined: true,
    recentActivity: new Date(),
    icon: 'puzzle',
  },
  {
    id: '2',
    name: 'Toddlers (2-4 years)',
    description: 'Early intervention strategies and milestones for the toddler years.',
    memberCount: 1567,
    category: 'age-group',
    isPrivate: false,
    isJoined: true,
    recentActivity: new Date(Date.now() - 30 * 60 * 1000),
    icon: 'baby',
  },
  {
    id: '3',
    name: 'School Advocacy',
    description: 'Navigating IEPs, 504 plans, and school accommodations.',
    memberCount: 890,
    category: 'topic',
    isPrivate: false,
    isJoined: false,
    recentActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    icon: 'school',
  },
  {
    id: '4',
    name: 'Bay Area Parents',
    description: 'Local meetups and resources for San Francisco Bay Area families.',
    memberCount: 234,
    category: 'local',
    isPrivate: true,
    isJoined: false,
    recentActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    icon: 'map',
  },
];

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Sensory-Friendly Movie Morning',
    description: 'Join us for a sensory-friendly screening of the latest animated film. Lights up, sound down, movement OK!',
    location: 'AMC Bay Street, San Francisco',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    attendeeCount: 12,
    isVirtual: false,
    isAttending: false,
  },
  {
    id: '2',
    title: 'Virtual Parent Support Circle',
    description: 'Weekly virtual meetup for parents to share, vent, and support each other. Led by a licensed therapist.',
    location: 'Zoom',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    attendeeCount: 28,
    isVirtual: true,
    isAttending: true,
  },
  {
    id: '3',
    title: 'IEP Workshop',
    description: 'Learn how to effectively advocate for your child in school meetings. Bring your questions!',
    location: 'Community Center, Oakland',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    attendeeCount: 45,
    isVirtual: false,
    isAttending: false,
  },
];

// Category config
const POST_CATEGORIES: { id: PostCategory; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'wins', name: 'Wins', icon: <Star className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
  { id: 'questions', name: 'Questions', icon: <MessageCircle className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
  { id: 'tips', name: 'Tips', icon: <Sparkles className="w-4 h-4" />, color: 'bg-green-100 text-green-700' },
  { id: 'support', name: 'Support', icon: <Heart className="w-4 h-4" />, color: 'bg-pink-100 text-pink-700' },
  { id: 'resources', name: 'Resources', icon: <Bookmark className="w-4 h-4" />, color: 'bg-violet-100 text-violet-700' },
  { id: 'bcba-qa', name: 'BCBA Q&A', icon: <Award className="w-4 h-4" />, color: 'bg-[#6B9080]/10 text-[#6B9080]' },
];

export function CommunityHub({
  userId,
  userName,
  userTier = 'free',
  onBack,
  onNavigate,
}: CommunityHubProps) {
  // Real accounts start empty and fill from their own Supabase data. Demo mode
  // seeds the sample dataset so prospect/partner walkthroughs look complete.
  const demo = isDemoMode();
  const [view, setView] = useState<CommunityView>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>(demo ? MOCK_GROUPS : []);
  const [events, setEvents] = useState<Event[]>(demo ? MOCK_EVENTS : []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | 'all'>('all');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'questions' as PostCategory,
    isAnonymous: false,
  });
  // Comment thread state — opening a post loads its comments and lets the user add one.
  const [activeThread, setActiveThread] = useState<Post | null>(null);
  const [threadComments, setThreadComments] = useState<CommunityComment[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Load posts from Supabase; seed MOCK_POSTS only in demo mode when empty
  useEffect(() => {
    async function loadPosts() {
      if (!userId) return;
      const dbPosts = await getSupabasePosts(userId);
      if (dbPosts.length > 0) {
        setPosts(dbPosts.map(p => ({
          id: p.id,
          authorId: p.userId,
          authorName: p.displayName,
          isAnonymous: p.isAnonymous,
          isBCBA: false,
          title: p.title,
          content: p.body,
          category: p.category as PostCategory,
          tags: [],
          likes: p.likeCount,
          comments: p.commentCount,
          shares: 0,
          views: 0,
          isLiked: p.isLikedByUser,
          isBookmarked: p.isBookmarkedByUser,
          createdAt: new Date(p.createdAt),
          isPinned: p.isPinned,
        })));
      } else if (demo) {
        // Demo mode only: seed sample posts so walkthroughs look complete.
        setPosts(MOCK_POSTS);
      } else {
        // Real accounts with no posts get an honest empty state.
        setPosts([]);
      }
    }
    loadPosts();
  }, [userId, demo]);

  // Load groups from Supabase; seed MOCK_GROUPS only in demo mode when empty
  useEffect(() => {
    async function loadGroups() {
      try {
        const { data, error } = await supabase
          .from('community_groups')
          .select('*')
          .order('member_count', { ascending: false })
          .limit(20);

        if (error) throw error;

        if (data && data.length > 0) {
          // Hydrate which groups this user has joined (persisted membership).
          let joinedIds = new Set<string>();
          if (userId) {
            const { data: memberships } = await supabase
              .from('group_members')
              .select('group_id')
              .eq('user_id', userId);
            joinedIds = new Set((memberships || []).map((m: { group_id: string }) => m.group_id));
          }
          setGroups(data.map((g: { id: string; name: string; description?: string; member_count?: number; category?: string; is_private?: boolean; recent_activity?: string; icon?: string }) => ({
            id: g.id,
            name: g.name,
            description: g.description || '',
            memberCount: g.member_count || 0,
            category: (g.category || 'topic') as GroupCategory,
            isPrivate: g.is_private ?? false,
            isJoined: joinedIds.has(g.id),
            recentActivity: g.recent_activity ? new Date(g.recent_activity) : new Date(),
            icon: g.icon || 'users',
          })));
        } else if (demo) {
          setGroups(MOCK_GROUPS);
        }
        // Real accounts with no groups keep the empty initial state.
      } catch (err) {
        console.warn('CommunityHub: Failed to load groups from Supabase', err);
        if (demo) setGroups(MOCK_GROUPS);
      }
    }
    loadGroups();
  }, [demo, userId]);

  // Load events from Supabase; seed MOCK_EVENTS only in demo mode when empty
  useEffect(() => {
    async function loadEvents() {
      try {
        const { data, error } = await supabase
          .from('community_events')
          .select('*')
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(20);

        if (error) throw error;

        if (data && data.length > 0) {
          // Hydrate which events this user has RSVP'd to (persisted attendance).
          let attendingIds = new Set<string>();
          if (userId) {
            const { data: attendance } = await supabase
              .from('event_attendees')
              .select('event_id')
              .eq('user_id', userId);
            attendingIds = new Set((attendance || []).map((a: { event_id: string }) => a.event_id));
          }
          setEvents(data.map((e: { id: string; title: string; description?: string; location?: string; event_date: string; attendee_count?: number; is_virtual?: boolean }) => ({
            id: e.id,
            title: e.title,
            description: e.description || '',
            location: e.location || 'Virtual',
            date: new Date(e.event_date),
            attendeeCount: e.attendee_count || 0,
            isVirtual: e.is_virtual ?? false,
            isAttending: attendingIds.has(e.id),
          })));
        } else if (demo) {
          setEvents(MOCK_EVENTS);
        }
        // Real accounts with no events keep the empty initial state.
      } catch (err) {
        console.warn('CommunityHub: Failed to load events from Supabase', err);
        if (demo) setEvents(MOCK_EVENTS);
      }
    }
    loadEvents();
  }, [demo, userId]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query) ||
          post.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      if (selectedCategory !== 'all' && post.category !== selectedCategory) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [posts, searchQuery, selectedCategory]);

  // Handle like
  const handleLike = useCallback((postId: string) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
          : post
      )
    );
    // Persist to Supabase (non-blocking)
    const post = posts.find(p => p.id === postId);
    if (userId && post) {
      if (post.isLiked) {
        unlikeSupabasePost(userId, postId).catch(() => {});
      } else {
        likeSupabasePost(userId, postId).catch(() => {});
      }
    }
  }, [posts, userId]);

  // Handle bookmark
  const handleBookmark = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId);
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, isBookmarked: !p.isBookmarked }
          : p
      )
    );
    if (userId && post) {
      if (post.isBookmarked) {
        unbookmarkSupabasePost(userId, postId).catch(() => {});
      } else {
        bookmarkSupabasePost(userId, postId).catch(() => {});
      }
    }
    toast.success(post?.isBookmarked ? 'Bookmark removed' : 'Post bookmarked');
  }, [posts, userId]);

  // Handle join group — optimistic local update + non-blocking Supabase persistence
  // (mirrors the like/bookmark pattern so membership survives reload).
  const handleJoinGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const willJoin = !group?.isJoined;
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? { ...g, isJoined: !g.isJoined, memberCount: g.isJoined ? g.memberCount - 1 : g.memberCount + 1 }
          : g
      )
    );
    toast.success(willJoin ? 'Group joined!' : 'Left group');
    // Only persist real (UUID) groups; demo/sample groups have no Supabase rows.
    const isPersistedGroup = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(groupId);
    if (userId && isPersistedGroup) {
      if (willJoin) {
        Promise.resolve(
          supabase.from('group_members').upsert(
            { group_id: groupId, user_id: userId },
            { onConflict: 'group_id,user_id' }
          )
        ).then(() => {}).catch(() => {});
      } else {
        Promise.resolve(
          supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
        ).then(() => {}).catch(() => {});
      }
    }
  }, [groups, userId]);

  // Handle attend event — optimistic local update + non-blocking Supabase persistence.
  const handleAttendEvent = useCallback((eventId: string) => {
    const event = events.find(e => e.id === eventId);
    const willAttend = !event?.isAttending;
    setEvents(prev =>
      prev.map(e =>
        e.id === eventId
          ? { ...e, isAttending: !e.isAttending, attendeeCount: e.isAttending ? e.attendeeCount - 1 : e.attendeeCount + 1 }
          : e
      )
    );
    toast.success(willAttend ? "You're going!" : 'RSVP cancelled');
    const isPersistedEvent = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(eventId);
    if (userId && isPersistedEvent) {
      if (willAttend) {
        Promise.resolve(
          supabase.from('event_attendees').upsert(
            { event_id: eventId, user_id: userId, rsvp_status: 'attending' },
            { onConflict: 'event_id,user_id' }
          )
        ).then(() => {}).catch(() => {});
      } else {
        Promise.resolve(
          supabase.from('event_attendees').delete().eq('event_id', eventId).eq('user_id', userId)
        ).then(() => {}).catch(() => {});
      }
    }
  }, [events, userId]);

  // Submit new post
  const handleSubmitPost = useCallback(() => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const post: Post = {
      id: Date.now().toString(),
      authorId: userId,
      authorName: newPost.isAnonymous ? 'Anonymous' : userName,
      isAnonymous: newPost.isAnonymous,
      isBCBA: false,
      title: newPost.title,
      content: newPost.content,
      category: newPost.category,
      tags: [],
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      isLiked: false,
      isBookmarked: false,
      createdAt: new Date(),
      isPinned: false,
    };

    setPosts(prev => [post, ...prev]);
    setNewPost({ title: '', content: '', category: 'questions', isAnonymous: false });
    setShowNewPost(false);
    toast.success('Post published!');

    // Persist to Supabase (non-blocking)
    if (userId) {
      createSupabasePost(
        userId,
        newPost.title,
        newPost.content,
        newPost.category,
        newPost.isAnonymous,
        userName
      ).catch(() => {});
      checkAndAwardBadges(userId, 'community_post').catch(() => {});
    }
  }, [newPost, userId, userName]);

  // Open a post's comment thread and load its comments from Supabase.
  const handleOpenThread = useCallback(async (post: Post) => {
    setActiveThread(post);
    setThreadComments([]);
    setNewComment('');
    // Demo/sample posts use non-UUID ids and have no rows in Supabase — skip the fetch.
    const isPersistedPost = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(post.id);
    if (!isPersistedPost) return;
    setThreadLoading(true);
    try {
      const comments = await getSupabaseComments(post.id);
      setThreadComments(comments);
    } catch {
      // Non-fatal — thread still opens with an empty state.
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // Add a comment to the open thread; persists to Supabase and bumps the post's count.
  const handleAddComment = useCallback(async () => {
    const body = newComment.trim();
    if (!activeThread || !body) return;
    if (!userId) {
      toast.error('Sign in to comment');
      return;
    }
    setPostingComment(true);
    const optimistic: CommunityComment = {
      id: `temp-${Date.now()}`,
      postId: activeThread.id,
      userId,
      displayName: userName || 'You',
      body,
      createdAt: new Date().toISOString(),
    };
    setThreadComments(prev => [...prev, optimistic]);
    setNewComment('');
    // Reflect the new count on the post card immediately.
    setPosts(prev => prev.map(p => p.id === activeThread.id ? { ...p, comments: p.comments + 1 } : p));
    setActiveThread(prev => prev ? { ...prev, comments: prev.comments + 1 } : prev);
    try {
      const saved = await addSupabaseComment(userId, activeThread.id, body, userName || 'Parent');
      if (saved) {
        setThreadComments(prev => prev.map(c => c.id === optimistic.id ? saved : c));
      }
    } catch {
      // Keep the optimistic comment visible; surfacing an error mid-demo is worse than a silent retry-later.
    } finally {
      setPostingComment(false);
    }
  }, [activeThread, newComment, userId, userName]);

  // Share a post via the Web Share API, falling back to clipboard.
  const handleShare = useCallback(async (post: Post) => {
    const shareText = `${post.title}\n\n${post.content}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: post.title, text: shareText, url: 'https://aminy.ai' });
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, shares: p.shares + 1 } : p));
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        toast.success('Post copied to clipboard');
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, shares: p.shares + 1 } : p));
      } else {
        toast('Sharing is not supported on this device');
      }
    } catch {
      // User cancelled the share sheet, or permission denied — no-op.
    }
  }, []);

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Render post card
  const renderPost = (post: Post) => (
    <Card key={post.id} className="p-4 hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8E4DF] dark:bg-slate-700 flex items-center justify-center">
            {post.isAnonymous ? (
              <EyeOff className="w-5 h-5 text-slate-400" />
            ) : (
              <span className="font-medium text-[#5A6B7A]">{post.authorName.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#1B2733] dark:text-white">
                {post.authorName}
              </span>
              {post.isBCBA && (
                <Badge className="bg-[#6B9080]/10 text-[#6B9080] text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  BCBA
                </Badge>
              )}
            </div>
            <span className="text-xs text-[#5A6B7A]">{formatRelativeTime(post.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.isPinned && (
            <Badge className="bg-amber-100 text-amber-700 text-xs">Pinned</Badge>
          )}
          <Badge className={POST_CATEGORIES.find(c => c.id === post.category)?.color || ''}>
            {POST_CATEGORIES.find(c => c.id === post.category)?.name}
          </Badge>
        </div>
      </div>

      {/* Post Content */}
      <h3 className="font-semibold text-[#1B2733] dark:text-white mb-2">{post.title}</h3>
      {/* line-clamp-3 is not in the precompiled Tailwind build, so clamp via inline style */}
      <p
        className="text-[#5A6B7A] dark:text-slate-300 text-sm mb-4"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {post.content}
      </p>

      {/* Post Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs text-[#5A6B7A] hover:text-[#6B9080] cursor-pointer">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E8E4DF] dark:border-slate-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleLike(post.id)}
            className={`flex items-center gap-1.5 text-sm ${
              post.isLiked ? 'text-red-500' : 'text-[#5A6B7A] hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
            {post.likes}
          </button>
          <button
            onClick={() => handleOpenThread(post)}
            className="flex items-center gap-1.5 text-sm text-[#5A6B7A] hover:text-[#6B9080]"
            aria-label={`View ${post.comments} comments`}
          >
            <MessageSquare className="w-4 h-4" />
            {post.comments}
          </button>
          <button
            onClick={() => handleShare(post)}
            className="flex items-center gap-1.5 text-sm text-[#5A6B7A] hover:text-[#6B9080]"
            aria-label="Share post"
          >
            <Share2 className="w-4 h-4" />
            {post.shares}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {post.views}
          </span>
          <button
            onClick={() => handleBookmark(post.id)}
            className={`p-1.5 rounded-full hover:bg-[#F0EDE8] ${
              post.isBookmarked ? 'text-[#6B9080]' : 'text-slate-400'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-[#E8E4DF] dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <h1 className="text-xl font-bold text-[#1B2733] dark:text-white">Community</h1>
                <p className="text-sm text-[#5A6B7A]">Connect with other parents</p>
              </div>
            </div>
            <Button onClick={() => setShowNewPost(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </div>

          {/* View Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'feed', name: 'Feed', icon: <MessageCircle className="w-4 h-4" /> },
              { id: 'groups', name: 'Groups', icon: <Users className="w-4 h-4" /> },
              { id: 'events', name: 'Events', icon: <Calendar className="w-4 h-4" /> },
              { id: 'bcba-qa', name: 'BCBA Q&A', icon: <Award className="w-4 h-4" /> },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={view === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView(tab.id as CommunityView)}
                className="flex items-center gap-1.5 shrink-0"
              >
                {tab.icon}
                {tab.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Feed View */}
        {view === 'feed' && (
          <>
            {/* Search & Filters */}
            <div className="mb-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  All
                </Button>
                {POST_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="flex items-center gap-1.5 shrink-0"
                  >
                    {cat.icon}
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Posts */}
            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <Card className="p-12 text-center">
                  <MessageCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No posts found</h3>
                  <p className="text-[#5A6B7A] mb-4">Be the first to start a conversation!</p>
                  <Button onClick={() => setShowNewPost(true)}>Create Post</Button>
                </Card>
              ) : (
                filteredPosts.map(renderPost)
              )}
            </div>
          </>
        )}

        {/* Groups View */}
        {view === 'groups' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-4">
              Your Groups
            </h2>
            {groups.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No groups yet</h3>
                <p className="text-[#5A6B7A]">Parent groups will appear here as communities form. Check back soon.</p>
              </Card>
            ) : (
              groups.map((group) => (
              <Card key={group.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#6B9080]/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#6B9080]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#1B2733] dark:text-white">{group.name}</h3>
                        {group.isPrivate && (
                          <Badge className="bg-[#F0EDE8] text-[#5A6B7A] text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Private
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[#5A6B7A] mt-1">{group.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {group.memberCount.toLocaleString()} members
                        </span>
                        <span>Active {formatRelativeTime(group.recentActivity)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={group.isJoined ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleJoinGroup(group.id)}
                  >
                    {group.isJoined ? 'Joined' : 'Join'}
                  </Button>
                </div>
              </Card>
              ))
            )}
          </div>
        )}

        {/* Events View */}
        {view === 'events' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-4">
              Upcoming Events
            </h2>
            {events.length === 0 ? (
              <Card className="p-12 text-center">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No upcoming events</h3>
                <p className="text-[#5A6B7A]">Local meetups and virtual support circles will show up here when they're scheduled.</p>
              </Card>
            ) : (
              events.map((event) => (
              <Card key={event.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-[#1B2733] dark:text-white">{event.title}</h3>
                      {event.isVirtual && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">Virtual</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#5A6B7A] mb-3">{event.description}</p>
                    <div className="flex items-center gap-4 text-sm text-[#5A6B7A]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {event.date.toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.attendeeCount} attending
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={event.isAttending ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleAttendEvent(event.id)}
                  >
                    {event.isAttending ? 'Going' : 'RSVP'}
                  </Button>
                </div>
              </Card>
              ))
            )}
          </div>
        )}

        {/* BCBA Q&A View */}
        {view === 'bcba-qa' && (
          <div className="space-y-4">
            <Card className="p-4 bg-[#6B9080]/10 dark:bg-[#6B9080]/10 border-[#6B9080]/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Award className="w-6 h-6 text-[#6B9080] shrink-0" />
                  <div>
                    <h3 className="font-semibold text-[#6B9080] dark:text-teal-100">
                      Ask a BCBA
                    </h3>
                    <p className="text-sm text-[#6B9080] dark:text-teal-200 mt-1">
                      {onNavigate
                        ? 'Send a question to a Board Certified Behavior Analyst and get a written reply, typically within 48-72 hours.'
                        : 'Read answers to questions other parents have asked Board Certified Behavior Analysts below.'}
                    </p>
                  </div>
                </div>
                {onNavigate && (
                  <Button
                    size="sm"
                    onClick={() => onNavigate('ask-bcba')}
                    className="shrink-0 flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Ask
                  </Button>
                )}
              </div>
            </Card>
            {filteredPosts
              .filter(p => p.category === 'bcba-qa')
              .map(renderPost)}
          </div>
        )}
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewPost(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-[#E8E4DF] dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Create Post</h2>
                <button onClick={() => setShowNewPost(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {POST_CATEGORIES.filter(c => c.id !== 'bcba-qa').map((cat) => (
                      <Button
                        key={cat.id}
                        variant={newPost.category === cat.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewPost(prev => ({ ...prev, category: cat.id }))}
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input
                    placeholder="What's on your mind?"
                    value={newPost.title}
                    onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Content</label>
                  <Textarea
                    placeholder="Share your thoughts, questions, or wins..."
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    rows={5}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPost.isAnonymous}
                    onChange={(e) => setNewPost(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <EyeOff className="w-4 h-4" />
                    Post anonymously
                  </span>
                </label>
              </div>
              <div className="p-4 border-t border-[#E8E4DF] dark:border-slate-700 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewPost(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitPost}>
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment Thread Modal */}
      <AnimatePresence>
        {activeThread && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setActiveThread(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-[#E8E4DF] dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold truncate pr-2">{activeThread.title}</h2>
                <button onClick={() => setActiveThread(null)} aria-label="Close comments">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-300">{activeThread.content}</p>
                <div className="border-t border-[#E8E4DF] dark:border-slate-700 pt-4">
                  <h3 className="text-sm font-medium text-[#3A4A57] dark:text-slate-200 mb-3">
                    Comments {threadComments.length > 0 && `(${threadComments.length})`}
                  </h3>
                  {threadLoading ? (
                    <p className="text-sm text-slate-400 text-center py-6">Loading comments…</p>
                  ) : threadComments.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">
                      No comments yet. Be the first to reply.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {threadComments.map((c) => (
                        <div key={c.id} className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#E8E4DF] dark:bg-slate-700 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-[#5A6B7A]">{c.displayName.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#1B2733] dark:text-white">{c.displayName}</span>
                              <span className="text-xs text-slate-400">{formatRelativeTime(new Date(c.createdAt))}</span>
                            </div>
                            <p className="text-sm text-[#5A6B7A] dark:text-slate-300 break-words">{c.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-[#E8E4DF] dark:border-slate-700 flex items-center gap-2">
                <Input
                  placeholder="Add a comment…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={postingComment || !newComment.trim()}
                  size="sm"
                  className="shrink-0"
                  aria-label="Send comment"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CommunityHub;
