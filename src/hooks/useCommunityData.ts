// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useCommunityData Hook
 * Loads community posts, comments, likes, and follows from Supabase with localStorage fallback.
 *
 * For screens: community, community-hub
 * Tables: community_posts, community_comments, community_likes, community_follows,
 *         community_bookmarks (031_community_tables)
 * Replaces localStorage keys: aminy_community_posts, aminy_community_comments,
 *         aminy_community_likes, aminy_community_follows, community-draft
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorBadge?: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  likeCount: number;
  isLiked: boolean;
  parentCommentId?: string;
  createdAt: string;
}

export interface CommunityFollow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface CommunityData {
  posts: CommunityPost[];
  feedPosts: CommunityPost[];
  myPosts: CommunityPost[];
  bookmarkedPosts: CommunityPost[];
  follows: CommunityFollow[];
  draft: { title?: string; content?: string; category?: string } | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache
// ============================================================================

const CACHE_KEYS = {
  POSTS: 'aminy_community_posts',
  COMMENTS: 'aminy_community_comments',
  LIKES: 'aminy_community_likes',
  FOLLOWS: 'aminy_community_follows',
  DRAFT: 'community-draft',
} as const;

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCommunityData(
  userId?: string,
): CommunityData & {
  refetch: () => Promise<void>;
  createPost: (post: { title: string; content: string; category: string; tags?: string[] }) => Promise<CommunityPost | null>;
  likePost: (postId: string) => Promise<boolean>;
  unlikePost: (postId: string) => Promise<boolean>;
  bookmarkPost: (postId: string) => Promise<boolean>;
  unbookmarkPost: (postId: string) => Promise<boolean>;
  addComment: (postId: string, content: string, parentCommentId?: string) => Promise<CommunityComment | null>;
  loadComments: (postId: string) => Promise<CommunityComment[]>;
  followUser: (targetUserId: string) => Promise<boolean>;
  unfollowUser: (targetUserId: string) => Promise<boolean>;
  saveDraft: (draft: { title?: string; content?: string; category?: string }) => void;
  clearDraft: () => void;
} {
  const [data, setData] = useState<CommunityData>({
    posts: [],
    feedPosts: [],
    myPosts: [],
    bookmarkedPosts: [],
    follows: [],
    draft: readCache<CommunityData['draft']>(CACHE_KEYS.DRAFT, null),
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!userId) {
      // Load cached community data for unauthenticated browsing
      const cachedPosts = readCache<CommunityPost[]>(CACHE_KEYS.POSTS, []);
      setData(prev => ({
        ...prev,
        posts: cachedPosts,
        feedPosts: cachedPosts,
        loading: false,
      }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [postsResult, likesResult, bookmarksResult, followsResult] = await Promise.all([
        supabase
          .from('community_posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
          .then(null, (err: unknown) => {
            console.warn('[Community] Posts fetch failed:', err);
            return { data: [], error: err };
          }),

        supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', userId)
          .then(null, (err: unknown) => {
            console.warn('[Community] Likes fetch failed:', err);
            return { data: [], error: err };
          }),

        supabase
          .from('community_bookmarks')
          .select('post_id')
          .eq('user_id', userId)
          .then(null, (err: unknown) => {
            console.warn('[Community] Bookmarks fetch failed:', err);
            return { data: [], error: err };
          }),

        supabase
          .from('community_follows')
          .select('*')
          .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
          .then(null, (err: unknown) => {
            console.warn('[Community] Follows fetch failed:', err);
            return { data: [], error: err };
          }),
      ]);

      const safePosts = Array.isArray(postsResult?.data) ? postsResult.data : [];
      const safeLikes = Array.isArray(likesResult?.data) ? likesResult.data : [];
      const safeBookmarks = Array.isArray(bookmarksResult?.data) ? bookmarksResult.data : [];
      const safeFollows = Array.isArray(followsResult?.data) ? followsResult.data : [];

      const likedPostIds = new Set(safeLikes.map((l: Record<string, unknown>) => l.post_id as string));
      const bookmarkedPostIds = new Set(safeBookmarks.map((b: Record<string, unknown>) => b.post_id as string));

      const posts: CommunityPost[] = safePosts.map((p: Record<string, unknown>) => ({
        id: (p.id as string) || '',
        authorId: (p.author_id as string) || (p.user_id as string) || '',
        authorName: (p.author_name as string) || 'Anonymous',
        authorAvatar: (p.author_avatar as string) || undefined,
        authorBadge: (p.author_badge as string) || undefined,
        title: (p.title as string) || '',
        content: (p.content as string) || '',
        category: (p.category as string) || 'general',
        tags: (p.tags as string[]) || [],
        likeCount: (p.like_count as number) || 0,
        commentCount: (p.comment_count as number) || 0,
        bookmarkCount: (p.bookmark_count as number) || 0,
        isLiked: likedPostIds.has(p.id as string),
        isBookmarked: bookmarkedPostIds.has(p.id as string),
        isPinned: (p.is_pinned as boolean) || false,
        createdAt: (p.created_at as string) || '',
        updatedAt: (p.updated_at as string) || '',
      }));

      const follows: CommunityFollow[] = safeFollows.map((f: Record<string, unknown>) => ({
        id: (f.id as string) || '',
        followerId: (f.follower_id as string) || '',
        followingId: (f.following_id as string) || '',
        createdAt: (f.created_at as string) || '',
      }));

      writeCache(CACHE_KEYS.POSTS, posts);
      writeCache(CACHE_KEYS.FOLLOWS, follows);

      const myPosts = posts.filter(p => p.authorId === userId);
      const bookmarkedPosts = posts.filter(p => p.isBookmarked);

      setData(prev => ({
        posts,
        feedPosts: posts,
        myPosts,
        bookmarkedPosts,
        follows,
        draft: prev.draft,
        loading: false,
        error: null,
      }));
    } catch (error: unknown) {
      console.error('[Community] Load failed:', error);
      const cachedPosts = readCache<CommunityPost[]>(CACHE_KEYS.POSTS, []);
      setData(prev => ({
        ...prev,
        posts: cachedPosts,
        feedPosts: cachedPosts,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load community data',
      }));
    }
  }, [userId]);

  const createPost = useCallback(async (post: {
    title: string;
    content: string;
    category: string;
    tags?: string[];
  }): Promise<CommunityPost | null> => {
    if (!userId) return null;
    try {
      const { data: newPost, error } = await supabase
        .from('community_posts')
        .insert({
          author_id: userId,
          title: post.title,
          content: post.content,
          category: post.category,
          tags: post.tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      localStorage.removeItem(CACHE_KEYS.DRAFT);
      await loadData();
      return newPost ? {
        id: newPost.id,
        authorId: newPost.author_id || newPost.user_id,
        authorName: 'You',
        title: newPost.title,
        content: newPost.content,
        category: newPost.category,
        tags: newPost.tags || [],
        likeCount: 0,
        commentCount: 0,
        bookmarkCount: 0,
        isLiked: false,
        isBookmarked: false,
        isPinned: false,
        createdAt: newPost.created_at,
        updatedAt: newPost.updated_at || newPost.created_at,
      } : null;
    } catch (err) {
      console.error('[Community] createPost failed:', err);
      return null;
    }
  }, [userId, loadData]);

  const likePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      await supabase.from('community_likes').insert({ user_id: userId, post_id: postId });
      setData(prev => ({
        ...prev,
        posts: prev.posts.map(p => p.id === postId ? { ...p, isLiked: true, likeCount: p.likeCount + 1 } : p),
        feedPosts: prev.feedPosts.map(p => p.id === postId ? { ...p, isLiked: true, likeCount: p.likeCount + 1 } : p),
      }));
      return true;
    } catch (err) {
      console.error('[Community] likePost failed:', err);
      return false;
    }
  }, [userId]);

  const unlikePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      await supabase.from('community_likes').delete().eq('user_id', userId).eq('post_id', postId);
      setData(prev => ({
        ...prev,
        posts: prev.posts.map(p => p.id === postId ? { ...p, isLiked: false, likeCount: Math.max(0, p.likeCount - 1) } : p),
        feedPosts: prev.feedPosts.map(p => p.id === postId ? { ...p, isLiked: false, likeCount: Math.max(0, p.likeCount - 1) } : p),
      }));
      return true;
    } catch (err) {
      console.error('[Community] unlikePost failed:', err);
      return false;
    }
  }, [userId]);

  const bookmarkPost = useCallback(async (postId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      await supabase.from('community_bookmarks').insert({ user_id: userId, post_id: postId });
      setData(prev => ({
        ...prev,
        posts: prev.posts.map(p => p.id === postId ? { ...p, isBookmarked: true, bookmarkCount: p.bookmarkCount + 1 } : p),
        feedPosts: prev.feedPosts.map(p => p.id === postId ? { ...p, isBookmarked: true, bookmarkCount: p.bookmarkCount + 1 } : p),
      }));
      return true;
    } catch (err) {
      console.error('[Community] bookmarkPost failed:', err);
      return false;
    }
  }, [userId]);

  const unbookmarkPost = useCallback(async (postId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      await supabase.from('community_bookmarks').delete().eq('user_id', userId).eq('post_id', postId);
      setData(prev => ({
        ...prev,
        posts: prev.posts.map(p => p.id === postId ? { ...p, isBookmarked: false, bookmarkCount: Math.max(0, p.bookmarkCount - 1) } : p),
        feedPosts: prev.feedPosts.map(p => p.id === postId ? { ...p, isBookmarked: false, bookmarkCount: Math.max(0, p.bookmarkCount - 1) } : p),
      }));
      return true;
    } catch (err) {
      console.error('[Community] unbookmarkPost failed:', err);
      return false;
    }
  }, [userId]);

  const addComment = useCallback(async (
    postId: string,
    content: string,
    parentCommentId?: string,
  ): Promise<CommunityComment | null> => {
    if (!userId) return null;
    try {
      const { data: newComment, error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          author_id: userId,
          content,
          parent_comment_id: parentCommentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      // Increment comment count on the post
      setData(prev => ({
        ...prev,
        posts: prev.posts.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p),
        feedPosts: prev.feedPosts.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p),
      }));
      return newComment ? {
        id: newComment.id,
        postId: newComment.post_id,
        authorId: newComment.author_id,
        authorName: 'You',
        content: newComment.content,
        likeCount: 0,
        isLiked: false,
        parentCommentId: newComment.parent_comment_id || undefined,
        createdAt: newComment.created_at,
      } : null;
    } catch (err) {
      console.error('[Community] addComment failed:', err);
      return null;
    }
  }, [userId]);

  const loadComments = useCallback(async (postId: string): Promise<CommunityComment[]> => {
    try {
      const { data: comments, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const safeComments = Array.isArray(comments) ? comments : [];
      return safeComments.map((c: Record<string, unknown>) => ({
        id: (c.id as string) || '',
        postId: (c.post_id as string) || '',
        authorId: (c.author_id as string) || '',
        authorName: (c.author_name as string) || 'Anonymous',
        authorAvatar: (c.author_avatar as string) || undefined,
        content: (c.content as string) || '',
        likeCount: (c.like_count as number) || 0,
        isLiked: false,
        parentCommentId: (c.parent_comment_id as string) || undefined,
        createdAt: (c.created_at as string) || '',
      }));
    } catch (err) {
      console.warn('[Community] loadComments failed:', err);
      return readCache<CommunityComment[]>(`${CACHE_KEYS.COMMENTS}-${postId}`, []);
    }
  }, []);

  const followUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      await supabase.from('community_follows').insert({ follower_id: userId, following_id: targetUserId });
      await loadData();
      return true;
    } catch (err) {
      console.error('[Community] followUser failed:', err);
      return false;
    }
  }, [userId, loadData]);

  const unfollowUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      await supabase.from('community_follows').delete().eq('follower_id', userId).eq('following_id', targetUserId);
      await loadData();
      return true;
    } catch (err) {
      console.error('[Community] unfollowUser failed:', err);
      return false;
    }
  }, [userId, loadData]);

  const saveDraft = useCallback((draft: { title?: string; content?: string; category?: string }) => {
    writeCache(CACHE_KEYS.DRAFT, draft);
    setData(prev => ({ ...prev, draft }));
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(CACHE_KEYS.DRAFT);
    setData(prev => ({ ...prev, draft: null }));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refetch: loadData,
    createPost,
    likePost,
    unlikePost,
    bookmarkPost,
    unbookmarkPost,
    addComment,
    loadComments,
    followUser,
    unfollowUser,
    saveDraft,
    clearDraft,
  };
}

export default useCommunityData;
