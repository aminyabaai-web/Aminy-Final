// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// Community service — Supabase CRUD for posts, likes, comments, bookmarks
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
        id, user_id, display_name, is_anonymous, content, category,
        is_pinned, like_count, comment_count, created_at
      `)
      .order('is_pinned', { ascending: false })
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
      // Title is first line of content, body is the rest
      const lines = (p.content || '').split('\n');
      const title = lines[0] || 'Untitled';
      const body = lines.slice(1).join('\n').trim();

      return {
        id: p.id,
        userId: p.user_id,
        displayName: p.is_anonymous ? 'Anonymous Parent' : (p.display_name || 'Parent'),
        isAnonymous: p.is_anonymous || false,
        title,
        body,
        category: p.category || 'general',
        isPinned: p.is_pinned || false,
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
    // Store title as first line of content
    const content = `${title}\n${body}`;

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        content,
        category,
        is_anonymous: isAnonymous,
        display_name: isAnonymous ? 'Anonymous' : displayName,
        like_count: 0,
        comment_count: 0,
        is_pinned: false,
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
    const { data, error } = await supabase
      .from('community_comments')
      .select('id, post_id, user_id, display_name, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map(c => ({
      id: c.id,
      postId: c.post_id,
      userId: c.user_id,
      displayName: c.display_name || 'Parent',
      body: c.content || '',
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
        content: body,
        display_name: displayName,
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
      body: data.content || body,
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
