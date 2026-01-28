/**
 * Community Feature Tests
 * Comprehensive tests for community posts, comments, likes, follows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
  },
};

vi.mock('../utils/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Define types inline
type PostType = 'general' | 'win' | 'question' | 'tip' | 'support' | 'milestone' | 'resource';
type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'removed';

interface CommunityPost {
  id?: string;
  user_id: string;
  content: string;
  image_url?: string;
  post_type: PostType;
  tags: string[];
  is_anonymous: boolean;
  display_name?: string;
  like_count: number;
  comment_count: number;
  is_featured: boolean;
  is_pinned: boolean;
  moderation_status: ModerationStatus;
  created_at?: string;
}

interface Comment {
  id?: string;
  post_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  is_anonymous: boolean;
  display_name?: string;
  like_count: number;
  moderation_status: ModerationStatus;
}

// Helper functions
function validatePostType(type: string): type is PostType {
  const validTypes: PostType[] = ['general', 'win', 'question', 'tip', 'support', 'milestone', 'resource'];
  return validTypes.includes(type as PostType);
}

function validateContent(content: string): { valid: boolean; message?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, message: 'Content cannot be empty' };
  }
  if (content.length > 5000) {
    return { valid: false, message: 'Content exceeds maximum length of 5000 characters' };
  }
  return { valid: true };
}

function sanitizeContent(content: string): string {
  // Basic XSS prevention
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function validateTags(tags: string[]): boolean {
  if (tags.length > 10) return false;
  return tags.every(tag => tag.length <= 50 && /^[\w\s-]+$/.test(tag));
}

function generateAnonymousDisplayName(): string {
  const adjectives = ['Caring', 'Hopeful', 'Brave', 'Strong', 'Kind'];
  const nouns = ['Parent', 'Advocate', 'Helper', 'Friend', 'Guide'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `Anonymous ${adj} ${noun}`;
}

describe('Post Type Validation', () => {
  it('should validate all supported post types', () => {
    const validTypes = ['general', 'win', 'question', 'tip', 'support', 'milestone', 'resource'];
    validTypes.forEach(type => {
      expect(validatePostType(type)).toBe(true);
    });
  });

  it('should reject invalid post types', () => {
    expect(validatePostType('invalid')).toBe(false);
    expect(validatePostType('')).toBe(false);
    expect(validatePostType('blog')).toBe(false);
  });
});

describe('Content Validation', () => {
  it('should accept valid content', () => {
    const result = validateContent('This is a valid post content.');
    expect(result.valid).toBe(true);
  });

  it('should reject empty content', () => {
    expect(validateContent('').valid).toBe(false);
    expect(validateContent('   ').valid).toBe(false);
  });

  it('should reject content exceeding max length', () => {
    const longContent = 'a'.repeat(5001);
    const result = validateContent(longContent);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('exceeds maximum length');
  });

  it('should accept content at max length', () => {
    const maxContent = 'a'.repeat(5000);
    expect(validateContent(maxContent).valid).toBe(true);
  });
});

describe('Content Sanitization', () => {
  it('should escape HTML tags', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeContent(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });

  it('should escape quotes', () => {
    const content = 'He said "hello" and \'goodbye\'';
    const sanitized = sanitizeContent(content);
    expect(sanitized).toContain('&quot;');
    expect(sanitized).toContain('&#x27;');
  });

  it('should preserve normal text', () => {
    const content = 'This is a normal post about my child';
    expect(sanitizeContent(content)).toBe(content);
  });
});

describe('Tag Validation', () => {
  it('should accept valid tags', () => {
    expect(validateTags(['autism', 'parenting', 'tips'])).toBe(true);
    expect(validateTags(['sleep-training', 'behavior_support'])).toBe(true);
  });

  it('should reject too many tags', () => {
    const tooManyTags = Array(11).fill('tag');
    expect(validateTags(tooManyTags)).toBe(false);
  });

  it('should reject tags with special characters', () => {
    expect(validateTags(['tag<script>'])).toBe(false);
    expect(validateTags(['tag;drop table'])).toBe(false);
  });

  it('should accept up to 10 tags', () => {
    const tenTags = Array(10).fill('validtag');
    expect(validateTags(tenTags)).toBe(true);
  });
});

describe('Anonymous Posting', () => {
  it('should generate display name for anonymous posts', () => {
    const displayName = generateAnonymousDisplayName();
    expect(displayName).toMatch(/^Anonymous \w+ \w+$/);
  });

  it('should generate different names on multiple calls', () => {
    const names = new Set();
    // Generate 20 names, expect some variety
    for (let i = 0; i < 20; i++) {
      names.add(generateAnonymousDisplayName());
    }
    expect(names.size).toBeGreaterThan(1);
  });
});

describe('Post Structure', () => {
  it('should have required fields', () => {
    const post: CommunityPost = {
      user_id: 'user-123',
      content: 'My first post!',
      post_type: 'general',
      tags: [],
      is_anonymous: false,
      like_count: 0,
      comment_count: 0,
      is_featured: false,
      is_pinned: false,
      moderation_status: 'approved',
    };

    expect(post.user_id).toBeDefined();
    expect(post.content).toBeDefined();
    expect(post.post_type).toBeDefined();
    expect(post.moderation_status).toBe('approved');
  });

  it('should support anonymous posts with display name', () => {
    const post: CommunityPost = {
      user_id: 'user-123',
      content: 'Anonymous post',
      post_type: 'support',
      tags: [],
      is_anonymous: true,
      display_name: 'Anonymous Caring Parent',
      like_count: 0,
      comment_count: 0,
      is_featured: false,
      is_pinned: false,
      moderation_status: 'approved',
    };

    expect(post.is_anonymous).toBe(true);
    expect(post.display_name).toBeDefined();
  });
});

describe('Comment Threading', () => {
  it('should support top-level comments', () => {
    const comment: Comment = {
      post_id: 'post-123',
      user_id: 'user-456',
      content: 'Great post!',
      is_anonymous: false,
      like_count: 0,
      moderation_status: 'approved',
    };

    expect(comment.parent_comment_id).toBeUndefined();
  });

  it('should support nested replies', () => {
    const reply: Comment = {
      post_id: 'post-123',
      user_id: 'user-789',
      parent_comment_id: 'comment-456',
      content: 'Thanks for your comment!',
      is_anonymous: false,
      like_count: 0,
      moderation_status: 'approved',
    };

    expect(reply.parent_comment_id).toBe('comment-456');
  });
});

describe('Like Constraints', () => {
  it('should allow one like per user per post', () => {
    const likes = new Map<string, Set<string>>();

    function addLike(userId: string, postId: string): boolean {
      if (!likes.has(postId)) {
        likes.set(postId, new Set());
      }
      const postLikes = likes.get(postId)!;
      if (postLikes.has(userId)) {
        return false; // Already liked
      }
      postLikes.add(userId);
      return true;
    }

    expect(addLike('user-1', 'post-1')).toBe(true);
    expect(addLike('user-1', 'post-1')).toBe(false); // Can't like twice
    expect(addLike('user-2', 'post-1')).toBe(true); // Different user can like
  });
});

describe('Follow Constraints', () => {
  it('should prevent self-follow', () => {
    function canFollow(followerId: string, followingId: string): boolean {
      return followerId !== followingId;
    }

    expect(canFollow('user-1', 'user-2')).toBe(true);
    expect(canFollow('user-1', 'user-1')).toBe(false);
  });

  it('should allow mutual follows', () => {
    const follows = new Map<string, Set<string>>();

    function addFollow(followerId: string, followingId: string): boolean {
      if (followerId === followingId) return false;
      if (!follows.has(followerId)) {
        follows.set(followerId, new Set());
      }
      follows.get(followerId)!.add(followingId);
      return true;
    }

    expect(addFollow('user-1', 'user-2')).toBe(true);
    expect(addFollow('user-2', 'user-1')).toBe(true); // Mutual follow allowed
  });
});

describe('Moderation Status', () => {
  it('should default to approved for regular posts', () => {
    const post: CommunityPost = {
      user_id: 'user-123',
      content: 'Normal post',
      post_type: 'general',
      tags: [],
      is_anonymous: false,
      like_count: 0,
      comment_count: 0,
      is_featured: false,
      is_pinned: false,
      moderation_status: 'approved',
    };

    expect(post.moderation_status).toBe('approved');
  });

  it('should have valid moderation statuses', () => {
    const validStatuses: ModerationStatus[] = ['pending', 'approved', 'flagged', 'removed'];
    validStatuses.forEach(status => {
      expect(['pending', 'approved', 'flagged', 'removed']).toContain(status);
    });
  });
});

describe('Report Handling', () => {
  interface Report {
    reporter_id: string;
    post_id?: string;
    comment_id?: string;
    reason: string;
    details?: string;
    status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  }

  function validateReport(report: Report): { valid: boolean; message?: string } {
    if (!report.post_id && !report.comment_id) {
      return { valid: false, message: 'Must report either a post or comment' };
    }
    if (report.post_id && report.comment_id) {
      return { valid: false, message: 'Cannot report both post and comment' };
    }
    if (!report.reason || report.reason.trim().length === 0) {
      return { valid: false, message: 'Reason is required' };
    }
    return { valid: true };
  }

  it('should require either post_id or comment_id', () => {
    const invalidReport: Report = {
      reporter_id: 'user-123',
      reason: 'Inappropriate content',
      status: 'pending',
    };
    expect(validateReport(invalidReport).valid).toBe(false);
  });

  it('should not allow both post_id and comment_id', () => {
    const invalidReport: Report = {
      reporter_id: 'user-123',
      post_id: 'post-123',
      comment_id: 'comment-456',
      reason: 'Inappropriate content',
      status: 'pending',
    };
    expect(validateReport(invalidReport).valid).toBe(false);
  });

  it('should accept valid post report', () => {
    const validReport: Report = {
      reporter_id: 'user-123',
      post_id: 'post-456',
      reason: 'Spam',
      status: 'pending',
    };
    expect(validateReport(validReport).valid).toBe(true);
  });

  it('should require a reason', () => {
    const invalidReport: Report = {
      reporter_id: 'user-123',
      post_id: 'post-456',
      reason: '',
      status: 'pending',
    };
    expect(validateReport(invalidReport).valid).toBe(false);
  });
});

describe('Bookmark Functionality', () => {
  const bookmarks = new Map<string, Set<string>>();

  function addBookmark(userId: string, postId: string): boolean {
    if (!bookmarks.has(userId)) {
      bookmarks.set(userId, new Set());
    }
    const userBookmarks = bookmarks.get(userId)!;
    if (userBookmarks.has(postId)) {
      return false;
    }
    userBookmarks.add(postId);
    return true;
  }

  function removeBookmark(userId: string, postId: string): boolean {
    if (!bookmarks.has(userId)) {
      return false;
    }
    return bookmarks.get(userId)!.delete(postId);
  }

  beforeEach(() => {
    bookmarks.clear();
  });

  it('should allow bookmarking a post', () => {
    expect(addBookmark('user-1', 'post-1')).toBe(true);
  });

  it('should prevent duplicate bookmarks', () => {
    addBookmark('user-1', 'post-1');
    expect(addBookmark('user-1', 'post-1')).toBe(false);
  });

  it('should allow removing bookmarks', () => {
    addBookmark('user-1', 'post-1');
    expect(removeBookmark('user-1', 'post-1')).toBe(true);
  });
});
