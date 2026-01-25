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

// ============================================================================
// SEED POSTS - Initial community content for launch
// ============================================================================

/**
 * Seed posts to bootstrap community engagement
 * These appear for all users and create a welcoming environment
 */
export const SEED_POSTS: CommunityPost[] = [
  {
    id: 'seed-welcome-1',
    userId: 'aminy-team',
    userDisplayName: 'Aminy Team',
    userTier: 'admin',
    userBadge: 'Official',
    category: 'introductions',
    title: 'Welcome to the Aminy Community!',
    body: `We're so glad you're here. This is a safe space for parents and caregivers navigating the neurodivergent journey.

Here's what you can do:
- Share your wins (big or small!)
- Ask questions and get support
- Learn strategies that work for other families
- Connect with parents who truly understand

Remember: You're not alone in this. We're in it together.`,
    tags: ['welcome', 'community', 'introduction'],
    likeCount: 47,
    commentCount: 12,
    shareCount: 5,
    bookmarkCount: 23,
    isModerated: true,
    moderationStatus: 'approved',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-win-1',
    userId: 'seed-user-1',
    userDisplayName: 'Sarah M.',
    userTier: 'pro',
    userBadge: '3-month member',
    category: 'wins',
    title: 'First full sentence at age 4!',
    body: `After months of speech therapy and consistent practice at home, my son said his first full sentence today: "I want the blue car."

I cried. I'm still crying. Those four words are everything.

For anyone in the early days - keep going. Progress isn't always visible, but it's happening.`,
    tags: ['speech', 'milestone', 'progress'],
    ageGroup: 'preschool',
    concernTags: ['speech-delay', 'communication'],
    likeCount: 234,
    commentCount: 45,
    shareCount: 28,
    bookmarkCount: 67,
    isModerated: true,
    moderationStatus: 'approved',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-strategy-1',
    userId: 'seed-user-2',
    userDisplayName: 'Marcus D.',
    userTier: 'core',
    userBadge: 'Helpful Heart',
    category: 'strategies',
    title: 'Visual timer changed our morning routine',
    body: `We struggled with morning transitions for YEARS. Constant meltdowns, always late for school.

Game changer: We got a visual timer and broke the routine into 5-minute chunks with pictures.
- 5 min: Get dressed (picture of clothes)
- 5 min: Brush teeth (picture of toothbrush)
- 5 min: Eat breakfast (picture of cereal)
- 5 min: Shoes + backpack (picture of door)

Now my daughter races the timer instead of fighting us. Most mornings are tear-free.

Happy to share the visual cards I made if anyone wants them!`,
    tags: ['morning-routine', 'visual-timer', 'transitions'],
    ageGroup: 'school-age',
    concernTags: ['transitions', 'routine'],
    likeCount: 189,
    commentCount: 67,
    shareCount: 45,
    bookmarkCount: 156,
    isModerated: true,
    moderationStatus: 'approved',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-question-1',
    userId: 'seed-user-3',
    userDisplayName: 'Jennifer K.',
    userTier: 'free',
    category: 'questions',
    title: 'IEP meeting next week - what should I ask?',
    body: `We have our first IEP meeting next Tuesday. I'm nervous and don't want to miss anything important.

My son is 6, just diagnosed with autism, and struggles with:
- Social situations at recess
- Following multi-step directions
- Sensory overload in the cafeteria

What questions should I be asking? What should I push for?

Any advice from parents who've been through this would be amazing.`,
    tags: ['iep', 'school', 'first-timer'],
    ageGroup: 'school-age',
    concernTags: ['school', 'advocacy'],
    likeCount: 78,
    commentCount: 34,
    shareCount: 12,
    bookmarkCount: 89,
    isModerated: true,
    moderationStatus: 'approved',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-resource-1',
    userId: 'seed-user-4',
    userDisplayName: 'Dr. Amanda Chen',
    userTier: 'proplus',
    userBadge: 'BCBA',
    category: 'resources',
    title: 'Free visual schedule templates (printable)',
    body: `I'm a BCBA and I've been using these visual schedule templates with families for years. Finally got permission to share them for free!

Included:
- Morning routine (customizable)
- After school routine
- Bedtime routine
- Weekend activities
- First/Then boards
- Token board templates

All are editable PDFs so you can add your own photos.

Link in my profile - completely free, no email required.`,
    tags: ['visual-schedules', 'free-resource', 'printable'],
    concernTags: ['routine', 'visual-supports'],
    likeCount: 567,
    commentCount: 89,
    shareCount: 234,
    bookmarkCount: 445,
    isModerated: true,
    moderationStatus: 'approved',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-support-1',
    userId: 'seed-user-5',
    userDisplayName: 'Anonymous Parent',
    userTier: 'core',
    category: 'support',
    title: 'Having a hard day. Just need to vent.',
    body: `Some days are just hard. Today is one of those days.

The meltdown at Target. The stares from other parents. The "helpful" suggestions from strangers.

I know tomorrow will be better. I know my kid is amazing. I know I'm doing my best.

But right now I'm sitting in my car in the garage, eating cold fries, and I just needed somewhere to say: this is hard.

If you're having a hard day too - you're not alone.`,
    tags: ['hard-days', 'support', 'you-are-not-alone'],
    likeCount: 412,
    commentCount: 156,
    shareCount: 23,
    bookmarkCount: 34,
    isModerated: true,
    moderationStatus: 'approved',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-win-2',
    userId: 'seed-user-6',
    userDisplayName: 'David R.',
    userTier: 'pro',
    userBadge: 'Storyteller',
    category: 'wins',
    title: 'My son made a friend at the park today',
    body: `This might seem small to some people, but...

My 8-year-old has never approached another kid at the playground. He usually plays alone, which is fine, but I've always wondered if he was lonely.

Today, he walked up to a boy on the swings and asked "Can I swing next to you?"

The other boy said yes. They swung together for 20 minutes.

No deep conversation. No phone numbers exchanged. Just two kids, swinging side by side.

It was the best 20 minutes of my year.`,
    tags: ['friendship', 'social', 'playground'],
    ageGroup: 'school-age',
    concernTags: ['social-skills'],
    likeCount: 345,
    commentCount: 78,
    shareCount: 45,
    bookmarkCount: 56,
    isModerated: true,
    moderationStatus: 'approved',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-strategy-2',
    userId: 'seed-user-7',
    userDisplayName: 'Lisa P.',
    userTier: 'core',
    category: 'strategies',
    title: 'The "5-minute warning" hack that actually works',
    body: `Transitions used to be our biggest battle. Tried timers, didn't work. Tried counting down, made it worse.

Here's what finally clicked:

Instead of "5 more minutes", I say "5 more minutes, then we can [preferred activity]."

Examples:
- "5 more minutes of iPad, then we get to have a yummy snack"
- "5 more minutes at the park, then we get to listen to your favorite song in the car"

The transition becomes a bridge TO something good, not just away from something fun.

Obviously doesn't work 100% of the time, but went from daily meltdowns to maybe once a week.`,
    tags: ['transitions', 'behavior', 'hack'],
    ageGroup: 'preschool',
    concernTags: ['transitions', 'behavior'],
    likeCount: 267,
    commentCount: 89,
    shareCount: 123,
    bookmarkCount: 234,
    isModerated: true,
    moderationStatus: 'approved',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Get seed posts (for initial community display)
 */
export function getSeedPosts(): CommunityPost[] {
  return SEED_POSTS;
}

/**
 * Generate mock posts for demo/testing (combines seed + dynamic)
 */
export function generateMockPosts(count: number = 10): CommunityPost[] {
  // Start with seed posts
  const posts = [...SEED_POSTS];

  // Add additional mock posts if needed
  const additionalNeeded = Math.max(0, count - posts.length);

  for (let i = 0; i < additionalNeeded; i++) {
    const categories: PostCategory[] = ['wins', 'questions', 'strategies', 'resources', 'support'];
    const category = categories[i % categories.length];
    const categoryInfo = POST_CATEGORIES[category];

    posts.push({
      id: `mock-post-${i}`,
      userId: `mock-user-${i}`,
      userDisplayName: `Parent ${i + 1}`,
      userTier: i % 3 === 0 ? 'pro' : 'core',
      category,
      title: `${categoryInfo.displayName} post #${i + 1}`,
      body: `This is a sample ${category} post for the community feed.`,
      tags: [category, 'sample'],
      likeCount: Math.floor(Math.random() * 50),
      commentCount: Math.floor(Math.random() * 20),
      shareCount: Math.floor(Math.random() * 10),
      bookmarkCount: Math.floor(Math.random() * 30),
      isModerated: true,
      moderationStatus: 'approved',
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Sort by recency
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
