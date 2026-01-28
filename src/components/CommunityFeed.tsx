/**
 * Community Feed Component
 * Social feed for parent community with wins, tips, questions
 *
 * Features:
 * - Post categories (Wins, Struggles, Tips, Questions, Resources)
 * - Like/comment functionality
 * - Anonymization option
 * - Badge display
 * - Tier-gated features
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Plus,
  Filter,
  Trophy,
  HelpCircle,
  Lightbulb,
  Frown,
  BookOpen,
  Eye,
  EyeOff,
  Send,
  Image as ImageIcon,
  X,
  Pin,
  Flag,
  Bookmark,
  CheckCircle,
  Users,
  Sparkles,
  Award,
  TrendingUp,
  Trash2,
  AlertTriangle,
  UserPlus,
  UserMinus,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { EmptyCommunityPosts } from './ui/empty-state';
import {
  CommunityPost,
  PostCategory,
  POST_CATEGORIES,
  UserBadge,
  COMMUNITY_BADGES,
  createPost,
  likePost,
  addComment,
  generateMockPosts,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowingFeed,
  getSuggestedUsersToFollow,
} from '../lib/community';

interface CommunityFeedProps {
  userId: string;
  userName: string;
  userTier: string;
  childAge?: number;
  onViewProfile?: (userId: string) => void;
}

export function CommunityFeed({
  userId,
  userName,
  userTier,
  childAge,
  onViewProfile,
}: CommunityFeedProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeFilter, setActiveFilter] = useState<PostCategory | 'all'>('all');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Follow system state
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [followingUserIds, setFollowingUserIds] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
  const [suggestedUsers, setSuggestedUsers] = useState<{ userId: string; displayName: string; reason: string }[]>([]);

  // Load posts
  useEffect(() => {
    setLoading(true);
    // In production, this would fetch from API
    const mockPosts = generateMockPosts(10);
    setPosts(mockPosts);
    setLoading(false);
  }, []);

  // Filter posts
  const filteredPosts = activeFilter === 'all'
    ? posts
    : posts.filter((p) => p.category === activeFilter);

  // Check if user can pin posts (Pro+ only)
  const canPinPosts = userTier === 'pro-plus' || userTier === 'family';

  const handleLike = async (postId: string) => {
    const updatedPost = await likePost(postId, userId, userName);
    setPosts(posts.map((p) => (p.id === postId ? updatedPost : p)));
  };

  const toggleComments = (postId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedComments(newExpanded);
  };

  // Handle follow/unfollow
  const handleFollow = async (targetUserId: string) => {
    if (targetUserId === userId) return; // Can't follow yourself

    setFollowLoading(prev => new Set(prev).add(targetUserId));
    try {
      if (followingUserIds.has(targetUserId)) {
        await unfollowUser(userId, targetUserId);
        setFollowingUserIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetUserId);
          return newSet;
        });
        toast.success('Unfollowed');
      } else {
        await followUser(userId, targetUserId);
        setFollowingUserIds(prev => new Set(prev).add(targetUserId));
        toast.success('Following');
      }
    } catch (error) {
      console.error('Follow error:', error);
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  // Load following feed when switching modes
  useEffect(() => {
    if (feedMode === 'following') {
      setLoading(true);
      getFollowingFeed(userId)
        .then(followedPosts => {
          setPosts(followedPosts);
        })
        .catch(err => {
          console.error('Error loading following feed:', err);
          toast.error('Failed to load followed posts');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      const mockPosts = generateMockPosts(10);
      setPosts(mockPosts);
      setLoading(false);
    }
  }, [feedMode, userId]);

  // Load suggested users to follow
  useEffect(() => {
    getSuggestedUsersToFollow(userId, 3)
      .then(setSuggestedUsers)
      .catch(console.error);
  }, [userId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            Parent Community
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Connect with families on similar journeys
          </p>
        </div>
        <Button
          onClick={() => setShowCreatePost(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <Trophy className="w-5 h-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
          <div className="text-lg font-bold text-green-700 dark:text-green-400">
            {posts.filter((p) => p.category === 'wins').length}
          </div>
          <div className="text-xs text-green-600 dark:text-green-500">Wins Shared</div>
        </Card>
        <Card className="p-3 text-center bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
          <Lightbulb className="w-5 h-5 mx-auto mb-1 text-amber-600 dark:text-amber-400" />
          <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
            {posts.filter((p) => p.category === 'tips').length}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-500">Tips Posted</div>
        </Card>
        <Card className="p-3 text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <HelpCircle className="w-5 h-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
          <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
            {posts.filter((p) => p.category === 'questions').length}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-500">Questions</div>
        </Card>
      </div>

      {/* Feed Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setFeedMode('all')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            feedMode === 'all'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />
          All Posts
        </button>
        <button
          onClick={() => setFeedMode('following')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            feedMode === 'following'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          <UserCheck className="w-4 h-4 inline mr-1.5" />
          Following
        </button>
      </div>

      {/* Suggested Users to Follow (shown when following feed is empty or on all) */}
      {suggestedUsers.length > 0 && feedMode === 'all' && (
        <Card className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 border-teal-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-600" />
            People to Follow
          </h3>
          <div className="space-y-2">
            {suggestedUsers.slice(0, 3).map((user) => (
              <div key={user.userId} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{user.reason}</p>
                </div>
                <Button
                  size="sm"
                  variant={followingUserIds.has(user.userId) ? 'outline' : 'default'}
                  onClick={() => handleFollow(user.userId)}
                  disabled={followLoading.has(user.userId)}
                  className="h-7 text-xs"
                >
                  {followLoading.has(user.userId) ? (
                    '...'
                  ) : followingUserIds.has(user.userId) ? (
                    <>
                      <UserMinus className="w-3 h-3 mr-1" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            activeFilter === 'all'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          All Posts
        </button>
        {(Object.entries(POST_CATEGORIES) as [PostCategory, typeof POST_CATEGORIES[PostCategory]][]).map(
          ([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeFilter === key
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{category.icon}</span>
              {category.label}
            </button>
          )
        )}
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-8 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
            </div>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card className="overflow-hidden">
            <EmptyCommunityPosts
              category={activeFilter !== 'all' ? POST_CATEGORIES[activeFilter]?.label : undefined}
              onCreate={() => setShowCreatePost(true)}
            />
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={userId}
              onLike={() => handleLike(post.id)}
              onToggleComments={() => toggleComments(post.id)}
              showComments={expandedComments.has(post.id)}
              canPin={canPinPosts}
              onViewProfile={onViewProfile}
              onDelete={(postId) => {
                setPosts(posts.filter(p => p.id !== postId));
              }}
              onReport={(postId, reason) => {
                // In production, this would call flagForModeration from community.ts
                console.log('Report submitted:', { postId, reason });
              }}
              onBookmark={(postId) => {
                // In production, this would call bookmarkPost from community.ts
                console.log('Bookmark toggled:', postId);
              }}
              onFollow={handleFollow}
              isFollowing={followingUserIds.has(post.userId)}
              isFollowLoading={followLoading.has(post.userId)}
            />
          ))
        )}
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && (
          <CreatePostModal
            userId={userId}
            userName={userName}
            childAge={childAge}
            onClose={() => setShowCreatePost(false)}
            onSubmit={async (post) => {
              const newPost = await createPost(post);
              setPosts([newPost, ...posts]);
              setShowCreatePost(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Individual Post Card
 */
interface PostCardProps {
  post: CommunityPost;
  currentUserId: string;
  onLike: () => void;
  onToggleComments: () => void;
  showComments: boolean;
  canPin: boolean;
  onViewProfile?: (userId: string) => void;
  onDelete?: (postId: string) => void;
  onReport?: (postId: string, reason: string) => void;
  onBookmark?: (postId: string) => void;
  isBookmarked?: boolean;
  onFollow?: (userId: string) => void;
  isFollowing?: boolean;
  isFollowLoading?: boolean;
}

function PostCard({
  post,
  currentUserId,
  onLike,
  onToggleComments,
  showComments,
  canPin,
  onViewProfile,
  onDelete,
  onReport,
  onBookmark,
  isBookmarked = false,
  onFollow,
  isFollowing = false,
  isFollowLoading = false,
}: PostCardProps) {
  const [newComment, setNewComment] = useState('');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const isLiked = post.likedBy.includes(currentUserId);
  const isOwnPost = post.userId === currentUserId;
  const category = POST_CATEGORIES[post.category];

  const handleShare = async () => {
    const shareText = `Check out this post from Aminy Community: "${post.content.slice(0, 100)}${post.content.length > 100 ? '...' : ''}"`;
    const shareUrl = `${window.location.origin}/community/post/${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.userName}'s ${category.label}`,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          // Fallback to clipboard
          await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
          toast.success('Link copied to clipboard!');
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post? This cannot be undone.')) {
      onDelete?.(post.id);
      toast.success('Post deleted');
    }
  };

  const handleReport = (reason: string) => {
    onReport?.(post.id, reason);
    setShowReportDialog(false);
    toast.success('Report submitted. Thank you for helping keep our community safe.');
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    onBookmark?.(post.id);
    toast.success(bookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
  };

  const getCategoryIcon = () => {
    switch (post.category) {
      case 'wins':
        return <Trophy className="w-4 h-4" />;
      case 'struggles':
        return <Frown className="w-4 h-4" />;
      case 'tips':
        return <Lightbulb className="w-4 h-4" />;
      case 'questions':
        return <HelpCircle className="w-4 h-4" />;
      case 'resources':
        return <BookOpen className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    await addComment(post.id, {
      userId: currentUserId,
      userName: 'You',
      content: newComment,
    });
    setNewComment('');
    // In production, would refresh comments
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`p-4 ${post.isPinned ? 'border-amber-300 bg-amber-50/50' : ''}`}>
        {/* Pinned indicator */}
        {post.isPinned && (
          <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
            <Pin className="w-3 h-3" />
            <span>Pinned by moderator</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-medium cursor-pointer"
              onClick={() => !post.isAnonymous && onViewProfile?.(post.userId)}
            >
              {post.isAnonymous ? '?' : post.userName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {post.isAnonymous ? 'Anonymous Parent' : post.userName}
                </span>
                {/* Badges */}
                {post.userBadges.slice(0, 2).map((badge) => {
                  const badgeInfo = COMMUNITY_BADGES[badge];
                  return (
                    <Badge
                      key={badge}
                      variant="outline"
                      className="text-xs py-0"
                      title={badgeInfo?.description}
                    >
                      {badgeInfo?.icon} {badgeInfo?.label}
                    </Badge>
                  );
                })}
                {/* Follow button - only show for other users */}
                {!isOwnPost && !post.isAnonymous && onFollow && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFollow(post.userId);
                    }}
                    disabled={isFollowLoading}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors min-h-[24px] flex items-center gap-1 ${
                      isFollowing
                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600'
                        : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-900/50'
                    }`}
                    title={isFollowing ? 'Unfollow' : 'Follow'}
                  >
                    {isFollowLoading ? (
                      '...'
                    ) : isFollowing ? (
                      <>
                        <UserCheck className="w-3 h-3" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        Follow
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatTimeAgo(new Date(post.createdAt))}</span>
                <span>•</span>
                <Badge className={`${category.color} text-xs py-0 flex items-center gap-1`}>
                  {getCategoryIcon()}
                  {category.label}
                </Badge>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwnPost && (
                <>
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                <Flag className="w-4 h-4 mr-2" />
                Report post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Report Dialog */}
          {showReportDialog && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReportDialog(false)}>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Report this post</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">Why are you reporting this post?</p>
                <div className="space-y-2">
                  {[
                    'Inappropriate content',
                    'Spam or advertising',
                    'Harassment or bullying',
                    'Medical misinformation',
                    'Other concern',
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => handleReport(reason)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="w-full mt-4 py-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs text-teal-600 hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4">
            <button
              onClick={onLike}
              className={`flex items-center gap-1 text-sm ${
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{post.likes}</span>
            </button>

            <button
              onClick={onToggleComments}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{post.commentCount}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-500 min-h-[44px] px-2"
              aria-label="Share post"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleBookmark}
            className={`min-h-[44px] px-2 ${bookmarked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
            aria-label={bookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
          >
            <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t"
            >
              {/* Existing comments */}
              {post.comments.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {post.comments.slice(0, 3).map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 text-sm font-medium flex-shrink-0">
                        {comment.userName.charAt(0)}
                      </div>
                      <div className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {comment.userName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {formatTimeAgo(new Date(comment.createdAt))}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-slate-300">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {post.comments.length > 3 && (
                    <button className="text-sm text-teal-600 hover:underline">
                      View all {post.comments.length} comments
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">No comments yet. Be the first!</p>
              )}

              {/* Add comment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a supportive comment..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                />
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

/**
 * Create Post Modal
 */
interface CreatePostModalProps {
  userId: string;
  userName: string;
  childAge?: number;
  onClose: () => void;
  onSubmit: (post: Partial<CommunityPost>) => Promise<void>;
}

function CreatePostModal({
  userId,
  userName,
  childAge,
  onClose,
  onSubmit,
}: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('wins');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        userId,
        userName: isAnonymous ? 'Anonymous' : userName,
        content,
        category,
        tags,
        isAnonymous,
        childAgeRange: childAge
          ? childAge < 3
            ? '0-2'
            : childAge < 6
            ? '3-5'
            : childAge < 10
            ? '6-9'
            : childAge < 13
            ? '10-12'
            : '13+'
          : undefined,
      });
    } catch (error) {
      console.error('Error creating post:', error);
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Share with Community</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              What are you sharing?
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(POST_CATEGORIES) as [PostCategory, typeof POST_CATEGORIES[PostCategory]][]).map(
                ([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      category === key
                        ? `${cat.color} border-2`
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Content */}
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                category === 'wins'
                  ? "Share a win, big or small! What progress are you celebrating?"
                  : category === 'struggles'
                  ? "What's been challenging? You're not alone."
                  : category === 'tips'
                  ? "Share a strategy that's worked for your family..."
                  : category === 'questions'
                  ? "What would you like help with?"
                  : "Share a helpful resource..."
              }
              rows={5}
              className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
            />
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2">
              {isAnonymous ? (
                <EyeOff className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              )}
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Post anonymously</span>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Your name won't be shown on this post
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-12 h-6 rounded-full transition-colors ${
                isAnonymous ? 'bg-teal-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isAnonymous ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Community Guidelines */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
            <strong>Community Guidelines:</strong> Be supportive and respectful. Share experiences,
            not medical advice. Protect privacy—avoid sharing identifying details about your child.
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 p-4 border-t border-gray-200 dark:border-slate-700 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper function
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export default CommunityFeed;
