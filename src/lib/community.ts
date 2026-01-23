/**
 * Community Features
 * Parent community infrastructure for launch
 * Addresses: "Parent community at launch"
 */

// Community post types
export type PostCategory =
  | 'wins'
  | 'questions'
  | 'strategies'
  | 'resources'
  | 'support'
  | 'introductions';

export interface CommunityPost {
  id: string;
  userId: string;
  userDisplayName: string;
  userTier: string;
  userBadge?: string; // e.g., "5-month member", "Ambassador"
  // Content
  category: PostCategory;
  title: string;
  body: string;
  imageUrls?: string[];
  // Tags
  tags: string[];
  ageGroup?: 'toddler' | 'preschool' | 'school-age' | 'teen';
  concernTags?: string[];
  // Engagement
  likeCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;
  // Moderation
  isModerated: boolean;
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'removed';
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  userDisplayName: string;
  body: string;
  likeCount: number;
  isFromProvider?: boolean;
  providerCredentials?: string;
  createdAt: string;
}

export interface CommunityMember {
  userId: string;
  displayName: string;
  bio?: string;
  joinedAt: string;
  tier: string;
  badges: CommunityBadge[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
  helpfulVotes: number;
  isVerifiedParent: boolean;
  childAgeGroups: string[];
}

export interface CommunityBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: string;
}

// Community configuration
export interface CommunityConfig {
  isEnabled: boolean;
  requiresVerification: boolean;
  minTierToPost: 'free' | 'core' | 'pro';
  minTierToComment: 'free' | 'core' | 'pro';
  moderationEnabled: boolean;
  aiModerationEnabled: boolean;
  maxPostsPerDay: number;
  maxCommentsPerDay: number;
}

export const COMMUNITY_CONFIG: CommunityConfig = {
  isEnabled: true,
  requiresVerification: false, // No verification required to participate
  minTierToPost: 'free', // Anyone can post
  minTierToComment: 'free', // Anyone can comment
  moderationEnabled: true,
  aiModerationEnabled: true, // AI pre-screens for harmful content
  maxPostsPerDay: 10,
  maxCommentsPerDay: 50,
};

// Post categories with display info
export const POST_CATEGORIES: Record<PostCategory, {
  displayName: string;
  description: string;
  icon: string;
  color: string;
}> = {
  wins: {
    displayName: 'Wins & Celebrations',
    description: 'Share your victories, big or small',
    icon: '🎉',
    color: '#F59E0B',
  },
  questions: {
    displayName: 'Questions',
    description: 'Ask the community for advice',
    icon: '❓',
    color: '#3B82F6',
  },
  strategies: {
    displayName: 'Strategies That Work',
    description: 'Share what works for your family',
    icon: '💡',
    color: '#10B981',
  },
  resources: {
    displayName: 'Resources',
    description: 'Share helpful resources and tools',
    icon: '📚',
    color: '#8B5CF6',
  },
  support: {
    displayName: 'Support Needed',
    description: 'Reach out when you need encouragement',
    icon: '💙',
    color: '#EC4899',
  },
  introductions: {
    displayName: 'Introductions',
    description: 'Introduce yourself to the community',
    icon: '👋',
    color: '#577590',
  },
};

// Badges that can be earned
export const COMMUNITY_BADGES: CommunityBadge[] = [
  {
    id: 'first-post',
    name: 'First Steps',
    description: 'Made your first post',
    icon: '🌱',
    color: '#10B981',
    earnedAt: '',
  },
  {
    id: 'helpful',
    name: 'Helpful Heart',
    description: 'Received 10 helpful votes',
    icon: '❤️',
    color: '#EC4899',
    earnedAt: '',
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    description: 'Shared 5 wins',
    icon: '✨',
    color: '#F59E0B',
    earnedAt: '',
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Helped 20 parents with advice',
    icon: '🌟',
    color: '#8B5CF6',
    earnedAt: '',
  },
  {
    id: 'veteran',
    name: 'Aminy Veteran',
    description: 'Member for 6+ months',
    icon: '🏅',
    color: '#577590',
    earnedAt: '',
  },
];

/**
 * Get community guidelines
 */
export function getCommunityGuidelines(): string[] {
  return [
    'Be kind and supportive - we\'re all on this journey together',
    'Respect privacy - never share identifying information about children',
    'No medical advice - share experiences, but always consult professionals',
    'Keep it constructive - focus on what helps',
    'Report concerns - flag inappropriate content for review',
    'Celebrate diversity - every family\'s journey is unique',
  ];
}

/**
 * Check if content might need moderation
 */
export function flagForModeration(content: string): boolean {
  const sensitivePatterns = [
    /\b(suicide|self.?harm|abuse)\b/i,
    /\b(medication|dosage|prescription)\b/i,
    /\b(private.?message|dm.?me|contact.?me)\b/i,
    /\b(sell|buy|money|payment)\b/i,
  ];

  return sensitivePatterns.some(pattern => pattern.test(content));
}
