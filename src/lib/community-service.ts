// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// Community service — Supabase CRUD for posts, likes, comments, bookmarks, events
//
// SCHEMA NOTE (verified against the LIVE database 2026-07-23): community_posts
// uses `user_display_name`, `title`, `body` — NOT `display_name`, `content`,
// `is_anonymous`, or `is_pinned` (those columns never existed remotely, so the
// old select/insert silently failed and posts never persisted). Everything
// below is written against the live column names. Anonymity is encoded by
// storing the display name "Anonymous Parent"; pinning is not a live column.
import { supabase } from '../utils/supabase/client';

export interface CommunityPost {
  id: string;
  userId: string;
  displayName: string;
  isAnonymous: boolean;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  likeCount: number;
  commentCount: number;
  isLikedByUser: boolean;
  isBookmarkedByUser: boolean;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
}

// ── Posts ─────────────────────────────────────────────────────────────

export async function getPosts(
  userId: string,
  category?: string,
  limit: number = 20
): Promise<CommunityPost[]> {
  try {
    let query = supabase
      .from('community_posts')
      .select(`
        id, user_id, user_display_name, title, body, category,
        like_count, comment_count, created_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: posts, error } = await query;
    if (error || !posts) return [];

    // Check which posts user has liked/bookmarked
    const postIds = posts.map(p => p.id);

    const [likesRes, bookmarksRes] = await Promise.all([
      postIds.length > 0
        ? supabase
            .from('community_likes')
            .select('post_id')
            .eq('user_id', userId)
            .in('post_id', postIds)
        : { data: [] },
      postIds.length > 0
        ? supabase
            .from('community_bookmarks')
            .select('post_id')
            .eq('user_id', userId)
            .in('post_id', postIds)
        : { data: [] },
    ]);

    const likedPostIds = new Set((likesRes.data || []).map((l: { post_id: string }) => l.post_id));
    const bookmarkedPostIds = new Set((bookmarksRes.data || []).map((b: { post_id: string }) => b.post_id));

    return posts.map(p => {
      const displayName = p.user_display_name || 'Parent';
      const isAnonymous = /^anonymous/i.test(displayName);
      return {
        id: p.id,
        userId: p.user_id,
        displayName: isAnonymous ? 'Anonymous Parent' : displayName,
        isAnonymous,
        title: p.title || 'Untitled',
        body: p.body || '',
        category: p.category || 'general',
        isPinned: false, // not a live column — reserved for future moderation tooling
        likeCount: p.like_count || 0,
        commentCount: p.comment_count || 0,
        isLikedByUser: likedPostIds.has(p.id),
        isBookmarkedByUser: bookmarkedPostIds.has(p.id),
        createdAt: p.created_at,
      };
    });
  } catch (err) {
    console.error('getPosts error:', err);
    return [];
  }
}

export async function createPost(
  userId: string,
  title: string,
  body: string,
  category: string,
  isAnonymous: boolean,
  displayName: string
): Promise<CommunityPost | null> {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        user_display_name: isAnonymous ? 'Anonymous Parent' : displayName,
        title,
        body,
        category,
        like_count: 0,
        comment_count: 0,
      })
      .select()
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      displayName: isAnonymous ? 'Anonymous Parent' : displayName,
      isAnonymous,
      title,
      body,
      category,
      isPinned: false,
      likeCount: 0,
      commentCount: 0,
      isLikedByUser: false,
      isBookmarkedByUser: false,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('createPost error:', err);
    return null;
  }
}

// ── Likes ────────────────────────────────────────────────────────────

export async function likePost(userId: string, postId: string): Promise<boolean> {
  try {
    await supabase.from('community_likes').upsert({
      user_id: userId,
      post_id: postId,
    }, { onConflict: 'user_id,post_id' });

    // Increment count
    await Promise.resolve(supabase.rpc('increment_like_count', { p_post_id: postId })).then(() => {}).catch(() => {
      // Fallback: manual increment
      supabase
        .from('community_posts')
        .select('like_count')
        .eq('id', postId)
        .single()
        .then(({ data }) => {
          if (data) {
            supabase.from('community_posts').update({ like_count: (data.like_count || 0) + 1 }).eq('id', postId);
          }
        });
    });

    return true;
  } catch (error) {
    console.warn('[Community] Failed to like post:', error);
    return false;
  }
}

export async function unlikePost(userId: string, postId: string): Promise<boolean> {
  try {
    await supabase
      .from('community_likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    // Decrement count
    Promise.resolve(supabase
      .from('community_posts')
      .select('like_count')
      .eq('id', postId)
      .single()
      .then(({ data }) => {
        if (data) {
          supabase.from('community_posts').update({
            like_count: Math.max(0, (data.like_count || 0) - 1),
          }).eq('id', postId);
        }
      })).catch(() => {});

    return true;
  } catch (error) {
    console.warn('[Community] Failed to unlike post:', error);
    return false;
  }
}

// ── Comments ─────────────────────────────────────────────────────────

export async function getComments(postId: string): Promise<CommunityComment[]> {
  try {
    // Live schema: community_comments uses user_display_name + body.
    const { data, error } = await supabase
      .from('community_comments')
      .select('id, post_id, user_id, user_display_name, body, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map(c => ({
      id: c.id,
      postId: c.post_id,
      userId: c.user_id,
      displayName: c.user_display_name || 'Parent',
      body: c.body || '',
      createdAt: c.created_at,
    }));
  } catch (error) {
    console.warn('[Community] Failed to fetch comments:', error);
    return [];
  }
}

export async function addComment(
  userId: string,
  postId: string,
  body: string,
  displayName: string
): Promise<CommunityComment | null> {
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        body,
        user_display_name: displayName,
      })
      .select()
      .single();

    if (error || !data) return null;

    // Increment comment count
    Promise.resolve(supabase
      .from('community_posts')
      .select('comment_count')
      .eq('id', postId)
      .single()
      .then(({ data: post }) => {
        if (post) {
          supabase.from('community_posts').update({
            comment_count: (post.comment_count || 0) + 1,
          }).eq('id', postId);
        }
      })).catch(() => {});

    return {
      id: data.id,
      postId: data.post_id,
      userId: data.user_id,
      displayName,
      body: data.body || body,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.warn('[Community] Failed to add comment:', error);
    return null;
  }
}

// ── Blocks ───────────────────────────────────────────────────────────
// Viewer-side block list. localStorage is the source of truth for instant,
// offline-safe filtering; the `user_blocks` table (migration
// 20260719000000_user_blocks.sql) syncs it across devices best-effort.

const BLOCKED_USERS_KEY = 'aminy-blocked-users';
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

function readLocalBlocks(): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeLocalBlocks(ids: string[]) {
  try {
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify([...new Set(ids)]));
  } catch { /* storage full or blocked — in-session state still applies */ }
}

export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const blocked = new Set(readLocalBlocks());
  if (userId && isUuid(userId)) {
    try {
      const { data } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', userId);
      for (const row of data || []) blocked.add(row.blocked_id);
      writeLocalBlocks([...blocked]);
    } catch {
      // Table not deployed yet or offline — localStorage list still applies.
    }
  }
  return blocked;
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  writeLocalBlocks([...readLocalBlocks(), blockedId]);
  if (blockerId && isUuid(blockerId) && isUuid(blockedId)) {
    try {
      await supabase.from('user_blocks').upsert(
        { blocker_id: blockerId, blocked_id: blockedId },
        { onConflict: 'blocker_id,blocked_id' }
      );
    } catch { /* best-effort sync — local block already in effect */ }
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  writeLocalBlocks(readLocalBlocks().filter(id => id !== blockedId));
  if (blockerId && isUuid(blockerId) && isUuid(blockedId)) {
    try {
      await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);
    } catch { /* best-effort */ }
  }
}

// ── Bookmarks ────────────────────────────────────────────────────────

export async function bookmarkPost(userId: string, postId: string): Promise<boolean> {
  try {
    await supabase.from('community_bookmarks').upsert({
      user_id: userId,
      post_id: postId,
    }, { onConflict: 'user_id,post_id' });
    return true;
  } catch (error) {
    console.warn('[Community] Failed to bookmark post:', error);
    return false;
  }
}

export async function unbookmarkPost(userId: string, postId: string): Promise<boolean> {
  try {
    await supabase.from('community_bookmarks').delete().eq('user_id', userId).eq('post_id', postId);
    return true;
  } catch (error) {
    console.warn('[Community] Failed to unbookmark post:', error);
    return false;
  }
}

// ── Events ───────────────────────────────────────────────────────────
// LIVE SCHEMA (verified 2026-07-23): community_events uses column `date`
// (NOT `event_date` — the old queries against event_date never returned rows).
// Creator/host/geo/capacity/status columns arrive with migration
// 20260723090000_community_events_parent_hosting.sql; reads below use
// SELECT * + defensive fallbacks so they work before AND after it applies.

export type EventLocationType = 'park' | 'library' | 'virtual' | 'other';

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  /** General area / venue description — never an exact address. */
  location: string;
  date: string; // ISO timestamp
  attendeeCount: number;
  isVirtual: boolean;
  locationType: EventLocationType;
  city: string | null;
  state: string | null;
  capacity: number | null;
  hostName: string | null;
  createdBy: string | null;
  isSeed: boolean;
  status: 'active' | 'cancelled';
}

interface CommunityEventRow {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  date: string;
  attendee_count?: number | null;
  is_virtual?: boolean | null;
  location_type?: string | null;
  city?: string | null;
  state?: string | null;
  capacity?: number | null;
  host_name?: string | null;
  created_by?: string | null;
  is_seed?: boolean | null;
  status?: string | null;
}

function mapEventRow(e: CommunityEventRow): CommunityEvent {
  const locationType: EventLocationType =
    e.location_type === 'park' || e.location_type === 'library' || e.location_type === 'virtual'
      ? e.location_type
      : e.is_virtual ? 'virtual' : 'other';
  return {
    id: e.id,
    title: e.title,
    description: e.description || '',
    location: e.location || (e.is_virtual ? 'Virtual' : ''),
    date: e.date,
    attendeeCount: e.attendee_count || 0,
    isVirtual: e.is_virtual ?? locationType === 'virtual',
    locationType,
    city: e.city ?? null,
    state: e.state ?? null,
    capacity: e.capacity ?? null,
    hostName: e.host_name ?? null,
    createdBy: e.created_by ?? null,
    isSeed: e.is_seed ?? false,
    status: e.status === 'cancelled' ? 'cancelled' : 'active',
  };
}

/** Upcoming, non-cancelled events, soonest first. */
export async function getEvents(limit: number = 30): Promise<CommunityEvent[]> {
  try {
    const { data, error } = await supabase
      .from('community_events')
      .select('*')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    // status is filtered client-side so the query also works before the
    // hosting migration adds the column.
    return (data as CommunityEventRow[]).map(mapEventRow).filter(e => e.status !== 'cancelled');
  } catch (err) {
    console.warn('[Community] Failed to load events:', err);
    return [];
  }
}

export interface CreateEventInput {
  title: string;
  description: string;
  /** General area or venue description — UI asks hosts NOT to post exact addresses. */
  location: string;
  date: string; // ISO timestamp
  locationType: EventLocationType;
  city?: string;
  state?: string;
  capacity?: number | null;
  hostName?: string;
  isSeed?: boolean;
}

/**
 * Create a parent- (or partner-) hosted event. Requires the signed-in user's
 * UUID (RLS: auth.uid() = created_by) and the 20260723090000 migration.
 */
export async function createEvent(
  userId: string,
  input: CreateEventInput
): Promise<CommunityEvent | null> {
  try {
    const { data, error } = await supabase
      .from('community_events')
      .insert({
        title: input.title,
        description: input.description,
        location: input.location,
        date: input.date,
        is_virtual: input.locationType === 'virtual',
        location_type: input.locationType,
        city: input.city || null,
        state: input.state || null,
        capacity: input.capacity ?? null,
        host_name: input.hostName || null,
        created_by: userId,
        is_seed: input.isSeed ?? false,
        status: 'active',
        attendee_count: 0,
      })
      .select()
      .single();
    if (error || !data) {
      if (error) console.warn('[Community] Failed to create event:', error.message);
      return null;
    }
    return mapEventRow(data as CommunityEventRow);
  } catch (err) {
    console.warn('[Community] Failed to create event:', err);
    return null;
  }
}

/** Soft-cancel an event the user created (RLS enforces ownership). */
export async function cancelEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('community_events')
      .update({ status: 'cancelled' })
      .eq('id', eventId)
      .eq('created_by', userId);
    return !error;
  } catch (err) {
    console.warn('[Community] Failed to cancel event:', err);
    return false;
  }
}

/** RSVP to an event (idempotent upsert into event_attendees). */
export async function rsvpToEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('event_attendees').upsert(
      { event_id: eventId, user_id: userId, rsvp_status: 'attending' },
      { onConflict: 'event_id,user_id' }
    );
    return !error;
  } catch (err) {
    console.warn('[Community] Failed to RSVP:', err);
    return false;
  }
}

/** Remove an RSVP. */
export async function cancelRsvp(userId: string, eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);
    return !error;
  } catch (err) {
    console.warn('[Community] Failed to cancel RSVP:', err);
    return false;
  }
}

/** Event ids the user has RSVP'd to (for hydrating "Going" state). */
export async function getMyRsvpEventIds(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', userId)
      .eq('rsvp_status', 'attending');
    return new Set((data || []).map((a: { event_id: string }) => a.event_id));
  } catch {
    return new Set();
  }
}
