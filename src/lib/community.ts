// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

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
  | 'introductions'
  | 'tips'
  | 'struggles';

export interface CommunityPost {
  id: string;
  userId: string;
  userDisplayName: string;
  userTier: string;
  userBadge?: string; // e.g., "5-month member", "Ambassador"
  userBadges?: CommunityBadge[];
  userName?: string;
  // Content
  category: PostCategory;
  title: string;
  body: string;
  content?: string;
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
  likes?: number;
  likedBy?: string[];
  comments?: CommunityComment[];
  // Display
  isAnonymous?: boolean;
  isPinned?: boolean;
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
  userName?: string;
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
  label?: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: string;
}

export type UserBadge = CommunityBadge;

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
  label?: string;
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
    color: '#0891b2',
  },
  tips: {
    displayName: 'Tips & Tricks',
    label: 'Tips',
    description: 'Share helpful tips with other parents',
    icon: '💡',
    color: '#10B981',
  },
  struggles: {
    displayName: 'Daily Struggles',
    label: 'Struggles',
    description: 'Share challenges and get support',
    icon: '💪',
    color: '#EF4444',
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
    color: '#0891b2',
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

// ============================================================================
// AI-POWERED MODERATION SYSTEM
// ============================================================================

export interface ModerationResult {
  approved: boolean;
  score: number; // 0-1, higher = more problematic
  flags: ModerationFlag[];
  suggestedAction: 'approve' | 'flag' | 'remove' | 'escalate';
  reason?: string;
}

export interface ModerationFlag {
  type: 'crisis' | 'medical_advice' | 'privacy' | 'spam' | 'harassment' | 'solicitation' | 'misinformation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  matchedContent: string;
  context: string;
}

// Moderation patterns with severity
const MODERATION_PATTERNS: Array<{
  pattern: RegExp;
  type: ModerationFlag['type'];
  severity: ModerationFlag['severity'];
  description: string;
}> = [
  // Crisis patterns - CRITICAL priority
  {
    pattern: /\b(suicide|suicidal|kill (myself|my child)|end (my|it all)|want to die)\b/i,
    type: 'crisis',
    severity: 'critical',
    description: 'Crisis/self-harm language detected'
  },
  {
    pattern: /\b(abuse|being abused|hitting me|violence at home)\b/i,
    type: 'crisis',
    severity: 'critical',
    description: 'Potential abuse situation'
  },
  // Medical advice - HIGH priority
  {
    pattern: /\b(prescribe|dosage|mg|milligrams|stop taking|increase|decrease).*(medication|medicine|drug)/i,
    type: 'medical_advice',
    severity: 'high',
    description: 'Specific medication advice'
  },
  {
    pattern: /\b(you should (give|try|use)|give (your|the) child).*(medication|medicine|supplement)/i,
    type: 'medical_advice',
    severity: 'high',
    description: 'Medical recommendation'
  },
  // Privacy concerns - HIGH priority
  {
    pattern: /\b(full name is|lives at|goes to .* school|phone number is|email is)\b/i,
    type: 'privacy',
    severity: 'high',
    description: 'Personal identifying information'
  },
  {
    pattern: /\b(ssn|social security|insurance number|member id)\b/i,
    type: 'privacy',
    severity: 'high',
    description: 'Sensitive information'
  },
  // Solicitation - MEDIUM priority
  {
    pattern: /\b(dm me|private message|contact me|text me at|call me at)\b/i,
    type: 'solicitation',
    severity: 'medium',
    description: 'Off-platform contact request'
  },
  {
    pattern: /\b(for sale|selling|buy|purchase|discount code|use code|affiliate)\b/i,
    type: 'solicitation',
    severity: 'medium',
    description: 'Commercial promotion'
  },
  // Spam patterns - MEDIUM priority
  {
    pattern: /\b(click (here|this)|free download|limited time|act now|urgent)\b/i,
    type: 'spam',
    severity: 'medium',
    description: 'Spam language'
  },
  {
    pattern: /(http|www\.).*(\.ru|\.cn|bit\.ly|tinyurl)/i,
    type: 'spam',
    severity: 'medium',
    description: 'Suspicious link'
  },
  // Misinformation - MEDIUM priority
  {
    pattern: /\b(vaccines? cause|cure for autism|autism is caused by|bleach|mms|chelation)\b/i,
    type: 'misinformation',
    severity: 'medium',
    description: 'Potential misinformation'
  },
  // Harassment - varies by pattern
  {
    pattern: /\b(stupid|idiot|moron|bad parent|terrible mother|worst)\b/i,
    type: 'harassment',
    severity: 'low',
    description: 'Potentially hurtful language'
  },
];

/**
 * AI-powered content moderation
 * Analyzes content for safety issues and returns moderation decision
 */
export async function moderateContent(
  content: string,
  context?: { userId?: string; postType?: string }
): Promise<ModerationResult> {
  const flags: ModerationFlag[] = [];
  let totalScore = 0;

  // Run through all patterns
  for (const pattern of MODERATION_PATTERNS) {
    const match = content.match(pattern.pattern);
    if (match) {
      const severityScore = {
        low: 0.1,
        medium: 0.3,
        high: 0.6,
        critical: 1.0
      }[pattern.severity];

      totalScore = Math.max(totalScore, severityScore);

      flags.push({
        type: pattern.type,
        severity: pattern.severity,
        matchedContent: match[0],
        context: pattern.description
      });
    }
  }

  // Determine suggested action based on flags
  let suggestedAction: ModerationResult['suggestedAction'] = 'approve';
  let reason: string | undefined;

  if (flags.some(f => f.severity === 'critical')) {
    suggestedAction = 'escalate';
    const criticalFlag = flags.find(f => f.severity === 'critical');
    reason = `Critical content detected: ${criticalFlag?.context}. Human review required.`;
  } else if (flags.some(f => f.severity === 'high')) {
    suggestedAction = 'flag';
    reason = 'High-severity content flagged for review.';
  } else if (totalScore > 0.5) {
    suggestedAction = 'flag';
    reason = 'Multiple moderate concerns detected.';
  } else if (flags.length > 0) {
    suggestedAction = 'approve';
    reason = 'Minor concerns noted but approved.';
  }

  return {
    approved: suggestedAction === 'approve',
    score: totalScore,
    flags,
    suggestedAction,
    reason
  };
}

/**
 * Get crisis resources for escalated content
 */
export function getCrisisResources(): Array<{ name: string; contact: string; description: string }> {
  return [
    {
      name: '988 Suicide & Crisis Lifeline',
      contact: 'Call or text 988',
      description: '24/7 support for emotional distress'
    },
    {
      name: 'Crisis Text Line',
      contact: 'Text HOME to 741741',
      description: 'Free, 24/7 text-based support'
    },
    {
      name: 'National Domestic Violence Hotline',
      contact: '1-800-799-7233',
      description: 'Support for abuse situations'
    },
    {
      name: 'Childhelp National Child Abuse Hotline',
      contact: '1-800-422-4453',
      description: '24/7 support for child abuse concerns'
    }
  ];
}

// ============================================================================
// FAMILY MATCHING SYSTEM
// ============================================================================

export interface FamilyProfile {
  userId: string;
  displayName: string;
  childAges: number[];
  childDiagnoses: string[];
  primaryConcerns: string[];
  location?: { city: string; state: string };
  memberSince: string;
  isDiscoverable: boolean;
  matchingPreferences: {
    wantsSimilarAge: boolean;
    wantsSimilarDiagnosis: boolean;
    wantsLocalMatches: boolean;
    maxDistance?: number; // miles
  };
}

export interface FamilyMatch {
  profileId: string;
  displayName: string;
  matchScore: number; // 0-100
  matchReasons: string[];
  anonymizedProfile: {
    childAgeRange: string;
    primaryConcerns: string[];
    memberDuration: string;
    location?: string; // "Phoenix area" not full address
  };
}

/**
 * Calculate match score between two family profiles
 */
export function calculateMatchScore(
  profile1: FamilyProfile,
  profile2: FamilyProfile
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Age matching (up to 30 points)
  const ageDiffs = profile1.childAges.flatMap(age1 =>
    profile2.childAges.map(age2 => Math.abs(age1 - age2))
  );
  const minAgeDiff = Math.min(...ageDiffs);
  if (minAgeDiff <= 1) {
    score += 30;
    reasons.push('Children are similar ages');
  } else if (minAgeDiff <= 2) {
    score += 20;
    reasons.push('Children are close in age');
  } else if (minAgeDiff <= 4) {
    score += 10;
    reasons.push('Children are within a few years of age');
  }

  // Diagnosis matching (up to 30 points)
  const sharedDiagnoses = profile1.childDiagnoses.filter(d =>
    profile2.childDiagnoses.includes(d)
  );
  if (sharedDiagnoses.length > 0) {
    score += Math.min(30, sharedDiagnoses.length * 15);
    reasons.push(`Both families navigating ${sharedDiagnoses.join(', ')}`);
  }

  // Concerns matching (up to 25 points)
  const sharedConcerns = profile1.primaryConcerns.filter(c =>
    profile2.primaryConcerns.includes(c)
  );
  if (sharedConcerns.length > 0) {
    score += Math.min(25, sharedConcerns.length * 10);
    reasons.push(`Similar concerns: ${sharedConcerns.join(', ')}`);
  }

  // Location matching (up to 15 points)
  if (profile1.location && profile2.location) {
    if (profile1.location.state === profile2.location.state) {
      score += 10;
      if (profile1.location.city === profile2.location.city) {
        score += 5;
        reasons.push('Same city');
      } else {
        reasons.push('Same state');
      }
    }
  }

  return { score: Math.min(100, score), reasons };
}

/**
 * Find matching families for a user
 */
export async function findFamilyMatches(
  userProfile: FamilyProfile,
  candidateProfiles: FamilyProfile[],
  limit: number = 5
): Promise<FamilyMatch[]> {
  // Filter to only discoverable profiles
  const discoverable = candidateProfiles.filter(
    p => p.isDiscoverable && p.userId !== userProfile.userId
  );

  // Calculate match scores
  const matches = discoverable.map(profile => {
    const { score, reasons } = calculateMatchScore(userProfile, profile);
    return {
      profileId: profile.userId,
      displayName: profile.displayName,
      matchScore: score,
      matchReasons: reasons,
      anonymizedProfile: {
        childAgeRange: getAgeRange(profile.childAges),
        primaryConcerns: profile.primaryConcerns.slice(0, 3),
        memberDuration: getMemberDuration(profile.memberSince),
        location: profile.location ? `${profile.location.city} area` : undefined
      }
    };
  });

  // Sort by score and return top matches
  return matches
    .filter(m => m.matchScore >= 20) // Minimum 20% match
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/**
 * Get age range description
 */
function getAgeRange(ages: number[]): string {
  if (ages.length === 0) return 'Unknown';
  const min = Math.min(...ages);
  const max = Math.max(...ages);
  if (min === max) {
    if (min < 3) return 'Toddler';
    if (min < 6) return 'Preschooler';
    if (min < 13) return 'School-age';
    return 'Teen';
  }
  return `${min}-${max} years old`;
}

/**
 * Get member duration string
 */
function getMemberDuration(memberSince: string): string {
  const months = Math.floor(
    (Date.now() - new Date(memberSince).getTime()) / (30 * 24 * 60 * 60 * 1000)
  );
  if (months < 1) return 'New member';
  if (months < 6) return `${months} month${months > 1 ? 's' : ''} member`;
  if (months < 12) return '6+ months member';
  return '1+ year member';
}

// ============================================================================
// LOCAL COMMUNITY GROUPS
// ============================================================================

export interface LocalCommunityGroup {
  id: string;
  name: string;
  description: string;
  location: {
    city: string;
    state: string;
    radius: number; // miles
  };
  memberCount: number;
  topics: string[];
  isPrivate: boolean;
  createdAt: string;
  admins: string[];
  rules: string[];
}

// Pre-seeded local groups for major metros
export const LOCAL_COMMUNITY_GROUPS: LocalCommunityGroup[] = [
  {
    id: 'phoenix-autism',
    name: 'Phoenix Autism Families',
    description: 'Connect with other autism families in the Phoenix metro area',
    location: { city: 'Phoenix', state: 'AZ', radius: 50 },
    memberCount: 234,
    topics: ['autism', 'local-resources', 'sensory-friendly-events'],
    isPrivate: false,
    createdAt: '2024-01-15',
    admins: ['aminy-team'],
    rules: getCommunityGuidelines()
  },
  {
    id: 'la-special-needs',
    name: 'LA Special Needs Parents',
    description: 'Support network for special needs parents in Los Angeles',
    location: { city: 'Los Angeles', state: 'CA', radius: 30 },
    memberCount: 456,
    topics: ['special-needs', 'iep-advocacy', 'local-therapists'],
    isPrivate: false,
    createdAt: '2024-01-10',
    admins: ['aminy-team'],
    rules: getCommunityGuidelines()
  },
  {
    id: 'nyc-neurodivergent',
    name: 'NYC Neurodivergent Families',
    description: 'Navigating neurodivergent parenting in NYC',
    location: { city: 'New York', state: 'NY', radius: 20 },
    memberCount: 678,
    topics: ['neurodivergent', 'city-living', 'school-advocacy'],
    isPrivate: false,
    createdAt: '2024-01-05',
    admins: ['aminy-team'],
    rules: getCommunityGuidelines()
  },
  {
    id: 'chicago-autism',
    name: 'Chicago Area Autism Support',
    description: 'Chicago-area families supporting each other',
    location: { city: 'Chicago', state: 'IL', radius: 40 },
    memberCount: 345,
    topics: ['autism', 'aba-therapy', 'sensory-activities'],
    isPrivate: false,
    createdAt: '2024-02-01',
    admins: ['aminy-team'],
    rules: getCommunityGuidelines()
  },
  {
    id: 'dallas-special-needs',
    name: 'DFW Special Needs Community',
    description: 'Dallas-Fort Worth special needs family network',
    location: { city: 'Dallas', state: 'TX', radius: 50 },
    memberCount: 289,
    topics: ['special-needs', 'texas-resources', 'family-events'],
    isPrivate: false,
    createdAt: '2024-02-15',
    admins: ['aminy-team'],
    rules: getCommunityGuidelines()
  },
];

/**
 * Find local community groups near a location
 */
export function findLocalGroups(
  userState: string,
  userCity?: string
): LocalCommunityGroup[] {
  // Filter to groups in user's state
  const stateGroups = LOCAL_COMMUNITY_GROUPS.filter(
    g => g.location.state.toLowerCase() === userState.toLowerCase()
  );

  // If city matches, prioritize those
  if (userCity) {
    return stateGroups.sort((a, b) => {
      const aMatch = a.location.city.toLowerCase() === userCity.toLowerCase();
      const bMatch = b.location.city.toLowerCase() === userCity.toLowerCase();
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return b.memberCount - a.memberCount;
    });
  }

  return stateGroups.sort((a, b) => b.memberCount - a.memberCount);
}

/**
 * Get all available local groups
 */
export function getAllLocalGroups(): LocalCommunityGroup[] {
  return LOCAL_COMMUNITY_GROUPS;
}

// ============================================================================
// CRUD OPERATIONS - Supabase-backed with localStorage fallback
// ============================================================================

import { supabase } from '../utils/supabase/client';
import { createCommunityNotification } from './notification-system';

// ── Cache helpers — shared contract with useCommunityData hook ──
// The hook writes Supabase-first + caches here; service reads from cache as fallback.
const CACHE_KEYS = {
  POSTS: 'aminy_community_posts',
  COMMENTS: 'aminy_community_comments',
  LIKES: 'aminy_community_likes',
  FOLLOWS: 'aminy_community_follows',
  BOOKMARKS_PREFIX: 'aminy_bookmarks_', // + userId
} as const;

function readCache<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or blocked */ }
}

// Helper to convert DB row to CommunityPost
function dbRowToPost(row: Record<string, unknown>): CommunityPost {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userDisplayName: row.user_display_name as string,
    userTier: (row.user_tier as string) || 'free',
    userBadge: row.user_badge as string | undefined,
    category: row.category as CommunityPost['category'],
    title: row.title as string,
    body: row.body as string,
    imageUrls: (row.image_urls || []) as string[],
    tags: (row.tags || []) as string[],
    ageGroup: row.age_group as CommunityPost['ageGroup'],
    concernTags: (row.concern_tags || []) as string[],
    likeCount: (row.like_count as number) || 0,
    commentCount: (row.comment_count as number) || 0,
    shareCount: (row.share_count as number) || 0,
    bookmarkCount: (row.bookmark_count as number) || 0,
    isModerated: (row.is_moderated as boolean) || false,
    moderationStatus: (row.moderation_status as CommunityPost['moderationStatus']) || 'approved',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Helper to convert DB row to CommunityComment
function dbRowToComment(row: Record<string, unknown>): CommunityComment {
  return {
    id: row.id as string,
    postId: row.post_id as string,
    userId: row.user_id as string,
    userDisplayName: row.user_display_name as string,
    body: row.body as string,
    likeCount: (row.like_count as number) || 0,
    isFromProvider: row.is_from_provider as boolean | undefined,
    providerCredentials: row.provider_credentials as string | undefined,
    createdAt: row.created_at as string,
  };
}

// Cache-backed fallback readers (shared keys with useCommunityData hook)
function getLocalPosts(): CommunityPost[] {
  return readCache<CommunityPost[]>(CACHE_KEYS.POSTS, SEED_POSTS);
}

function getLocalComments(): Record<string, CommunityComment[]> {
  return readCache<Record<string, CommunityComment[]>>(CACHE_KEYS.COMMENTS, {});
}

function getLocalLikes(): Record<string, string[]> {
  return readCache<Record<string, string[]>>(CACHE_KEYS.LIKES, {});
}

/**
 * Create a new community post
 * Uses Supabase with localStorage fallback
 */
export async function createPost(
  post: Omit<CommunityPost, 'id' | 'likeCount' | 'commentCount' | 'shareCount' | 'bookmarkCount' | 'isModerated' | 'moderationStatus' | 'createdAt' | 'updatedAt'>
): Promise<CommunityPost> {
  // Run AI moderation on the content
  const moderationResult = await moderateContent(`${post.title} ${post.body}`);
  const moderationStatus = moderationResult.approved ? 'approved' : 'pending';

  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: post.userId,
        user_display_name: post.userDisplayName,
        user_tier: post.userTier,
        user_badge: post.userBadge,
        category: post.category,
        title: post.title,
        body: post.body,
        image_urls: post.imageUrls || [],
        tags: post.tags || [],
        age_group: post.ageGroup,
        concern_tags: post.concernTags || [],
        is_moderated: true,
        moderation_status: moderationStatus,
      })
      .select()
      .single();

    if (error) throw error;

    if (import.meta.env.DEV) console.log('[Community] Post created in Supabase:', data.id);

    // Check for new badges in background (don't block post creation)
    checkAndAwardBadges(post.userId).catch(err =>
      console.warn('[Community] Badge check failed:', err)
    );

    return dbRowToPost(data);
  } catch (err) {
    console.warn('[Community] Supabase error, using localStorage fallback:', err);

    // Fallback to localStorage
    const newPost: CommunityPost = {
      ...post,
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      bookmarkCount: 0,
      isModerated: true,
      moderationStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const posts = getLocalPosts();
    posts.unshift(newPost);
    writeCache(CACHE_KEYS.POSTS, posts);
    return newPost;
  }
}

/**
 * Like or unlike a post
 */
export async function likePost(postId: string, userId: string, userName?: string): Promise<CommunityPost> {
  try {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('community_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    const isNewLike = !existingLike;

    if (existingLike) {
      // Unlike - remove the like
      await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
    } else {
      // Like - add new like
      await supabase
        .from('community_likes')
        .insert({ post_id: postId, user_id: userId });
    }

    // Fetch updated post
    const { data: post, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) throw error;

    const updatedPost = dbRowToPost(post);

    // Send notification to post author (only for new likes, not unlikes)
    if (isNewLike && updatedPost.userId !== userId) {
      try {
        await createCommunityNotification('like', {
          recipientUserId: updatedPost.userId,
          actorName: userName || 'Someone',
          postId: updatedPost.id,
          postTitle: updatedPost.title,
        });
      } catch (notifError) {
        console.warn('[Community] Failed to send like notification:', notifError);
      }
    }

    return updatedPost;
  } catch (err) {
    console.warn('[Community] Supabase error in likePost, using localStorage:', err);

    // Fallback to localStorage
    const posts = getLocalPosts();
    const likes = getLocalLikes();
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) throw new Error('Post not found');

    if (!likes[postId]) likes[postId] = [];

    const userLikeIndex = likes[postId].indexOf(userId);
    const isNewLike = userLikeIndex === -1;

    if (isNewLike) {
      likes[postId].push(userId);
      posts[postIndex].likeCount++;

      // Send notification for new likes (localStorage fallback)
      if (posts[postIndex].userId !== userId) {
        try {
          await createCommunityNotification('like', {
            recipientUserId: posts[postIndex].userId,
            actorName: userName || 'Someone',
            postId: posts[postIndex].id,
            postTitle: posts[postIndex].title,
          });
        } catch (notifError) {
          console.warn('[Community] Failed to send like notification:', notifError);
        }
      }
    } else {
      likes[postId].splice(userLikeIndex, 1);
      posts[postIndex].likeCount = Math.max(0, posts[postIndex].likeCount - 1);
    }

    writeCache(CACHE_KEYS.POSTS, posts);
    writeCache(CACHE_KEYS.LIKES, likes);
    return posts[postIndex];
  }
}

/**
 * Add a comment to a post
 */
export async function addComment(
  postId: string,
  comment: Omit<CommunityComment, 'id' | 'postId' | 'likeCount' | 'createdAt'>
): Promise<CommunityComment> {
  // Run moderation on comment
  const moderationResult = await moderateContent(comment.body);

  if (!moderationResult.approved && moderationResult.suggestedAction === 'escalate') {
    throw new Error('Comment flagged for review. Please revise and try again.');
  }

  try {
    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        user_id: comment.userId,
        user_display_name: comment.userDisplayName,
        body: comment.body,
        is_from_provider: comment.isFromProvider,
        provider_credentials: comment.providerCredentials,
      })
      .select()
      .single();

    if (error) throw error;

    if (import.meta.env.DEV) console.log('[Community] Comment created in Supabase:', data.id);
    const newComment = dbRowToComment(data);

    // Fetch post to get author ID for notification
    const { data: postData } = await supabase
      .from('community_posts')
      .select('user_id, title')
      .eq('id', postId)
      .single();

    // Send notification to post author (unless they're commenting on their own post)
    if (postData && postData.user_id !== comment.userId) {
      try {
        await createCommunityNotification('comment', {
          recipientUserId: postData.user_id,
          actorName: comment.userDisplayName,
          postId: postId,
          postTitle: postData.title,
          commentPreview: comment.body,
        });
      } catch (notifError) {
        console.warn('[Community] Failed to send comment notification:', notifError);
      }
    }

    return newComment;
  } catch (err) {
    console.warn('[Community] Supabase error in addComment, using localStorage:', err);

    // Fallback to localStorage
    const newComment: CommunityComment = {
      ...comment,
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      postId,
      likeCount: 0,
      createdAt: new Date().toISOString(),
    };

    const comments = getLocalComments();
    if (!comments[postId]) comments[postId] = [];
    comments[postId].push(newComment);
    writeCache(CACHE_KEYS.COMMENTS, comments);

    // Update post comment count in cache
    const posts = getLocalPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].commentCount++;
      posts[postIndex].updatedAt = new Date().toISOString();
      writeCache(CACHE_KEYS.POSTS, posts);

      // Send notification to post author (localStorage fallback)
      if (posts[postIndex].userId !== comment.userId) {
        try {
          await createCommunityNotification('comment', {
            recipientUserId: posts[postIndex].userId,
            actorName: comment.userDisplayName,
            postId: postId,
            postTitle: posts[postIndex].title,
            commentPreview: comment.body,
          });
        } catch (notifError) {
          console.warn('[Community] Failed to send comment notification:', notifError);
        }
      }
    }

    return newComment;
  }
}

/**
 * Get comments for a post
 */
export async function getComments(postId: string): Promise<CommunityComment[]> {
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(dbRowToComment);
  } catch (err) {
    console.warn('[Community] Supabase error in getComments, using localStorage:', err);
    const comments = getLocalComments();
    return comments[postId] || [];
  }
}

/**
 * Check if user has liked a post
 */
export async function hasUserLiked(postId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('community_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return !!data;
  } catch (err) {
    console.warn('[Community] Supabase error in hasUserLiked, using localStorage:', err);
    const likes = getLocalLikes();
    return likes[postId]?.includes(userId) || false;
  }
}

/**
 * Get all posts (with optional filters)
 */
export async function getPosts(options?: {
  category?: PostCategory;
  limit?: number;
  offset?: number;
}): Promise<CommunityPost[]> {
  try {
    let query = supabase
      .from('community_posts')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    if (import.meta.env.DEV) console.log(`[Community] Fetched ${data?.length || 0} posts from Supabase`);
    return (data || []).map(dbRowToPost);
  } catch (err) {
    console.warn('[Community] Supabase error in getPosts, using localStorage:', err);

    // Fallback to localStorage
    let posts = getLocalPosts();

    if (options?.category) {
      posts = posts.filter(p => p.category === options.category);
    }

    posts = posts.filter(p => p.moderationStatus === 'approved');
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    return posts.slice(offset, offset + limit);
  }
}

/**
 * Get a single post by ID
 */
export async function getPost(postId: string): Promise<CommunityPost | null> {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) throw error;
    return data ? dbRowToPost(data) : null;
  } catch (err) {
    console.warn('[Community] Supabase error in getPost, using localStorage:', err);
    const posts = getLocalPosts();
    return posts.find(p => p.id === postId) || null;
  }
}

/**
 * Delete a post (soft delete by setting status to removed)
 */
export async function deletePost(postId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('community_posts')
      .update({ moderation_status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Community] Supabase error in deletePost, using localStorage:', err);

    const posts = getLocalPosts();
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) return false;
    if (posts[postIndex].userId !== userId) {
      throw new Error('You can only delete your own posts');
    }

    posts[postIndex].moderationStatus = 'removed';
    posts[postIndex].updatedAt = new Date().toISOString();
    writeCache(CACHE_KEYS.POSTS, posts);
    return true;
  }
}

/**
 * Bookmark a post
 */
export async function bookmarkPost(postId: string, userId: string): Promise<CommunityPost> {
  try {
    // Increment bookmark count in Supabase
    const { data, error } = await supabase
      .from('community_posts')
      .update({
        bookmark_count: supabase.rpc('increment_bookmark', { row_id: postId })
      })
      .eq('id', postId)
      .select()
      .single();

    // Also store in user's local bookmarks for quick access
    const bookmarksKey = `${CACHE_KEYS.BOOKMARKS_PREFIX}${userId}`;
    const userBookmarks = readCache<string[]>(bookmarksKey, []);
    if (!userBookmarks.includes(postId)) {
      userBookmarks.push(postId);
      writeCache(bookmarksKey, userBookmarks);
    }

    if (error) throw error;
    return dbRowToPost(data);
  } catch (err) {
    console.warn('[Community] Supabase error in bookmarkPost, using cache:', err);

    const posts = getLocalPosts();
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) throw new Error('Post not found');

    posts[postIndex].bookmarkCount++;
    posts[postIndex].updatedAt = new Date().toISOString();
    writeCache(CACHE_KEYS.POSTS, posts);

    const bookmarksKey = `${CACHE_KEYS.BOOKMARKS_PREFIX}${userId}`;
    const userBookmarks = readCache<string[]>(bookmarksKey, []);
    if (!userBookmarks.includes(postId)) {
      userBookmarks.push(postId);
      writeCache(bookmarksKey, userBookmarks);
    }

    return posts[postIndex];
  }
}

/**
 * Get user's bookmarked posts
 */
export async function getUserBookmarks(userId: string): Promise<CommunityPost[]> {
  const bookmarksKey = `${CACHE_KEYS.BOOKMARKS_PREFIX}${userId}`;
  const bookmarkIds = readCache<string[]>(bookmarksKey, []);

  if (bookmarkIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .in('id', bookmarkIds);

    if (error) throw error;
    return (data || []).map(dbRowToPost);
  } catch (err) {
    console.warn('[Community] Supabase error in getUserBookmarks, using localStorage:', err);
    const posts = getLocalPosts();
    return posts.filter(p => bookmarkIds.includes(p.id));
  }
}

// ============================================================================
// FOLLOW SYSTEM
// ============================================================================

export interface FollowRelationship {
  followerId: string;
  followingId: string;
  createdAt: string;
}

/**
 * Get local follows from cache (for offline/fallback support)
 */
function getLocalFollows(): FollowRelationship[] {
  return readCache<FollowRelationship[]>(CACHE_KEYS.FOLLOWS, []);
}

/**
 * Save follows to cache
 */
function saveLocalFollows(follows: FollowRelationship[]): void {
  writeCache(CACHE_KEYS.FOLLOWS, follows);
}

/**
 * Follow a user
 */
export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) {
    throw new Error("You cannot follow yourself");
  }

  try {
    const { error } = await supabase
      .from('community_follows')
      .insert({
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date().toISOString(),
      });

    if (error) {
      // Handle unique constraint violation (already following)
      if (error.code === '23505') {
        return true; // Already following, treat as success
      }
      throw error;
    }

    // Create notification for the followed user
    try {
      const { createCommunityNotification } = await import('./notification-system');

      // Get follower's display name
      const { data: followerProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', followerId)
        .single();

      await createCommunityNotification('new_follower', {
        recipientUserId: followingId,
        actorName: followerProfile?.display_name || 'Someone',
        actorUserId: followerId,
      });
    } catch (notifError) {
      console.warn('Could not create follow notification:', notifError);
    }

    return true;
  } catch (err) {
    console.warn('[Community] Supabase error in followUser, using localStorage:', err);

    // Fallback to localStorage
    const follows = getLocalFollows();
    const existingFollow = follows.find(
      f => f.followerId === followerId && f.followingId === followingId
    );

    if (existingFollow) return true; // Already following

    follows.push({
      followerId,
      followingId,
      createdAt: new Date().toISOString(),
    });

    saveLocalFollows(follows);
    return true;
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('community_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Community] Supabase error in unfollowUser, using localStorage:', err);

    // Fallback to localStorage
    const follows = getLocalFollows();
    const filteredFollows = follows.filter(
      f => !(f.followerId === followerId && f.followingId === followingId)
    );

    saveLocalFollows(filteredFollows);
    return true;
  }
}

/**
 * Check if user A follows user B
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('community_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return !!data;
  } catch (err) {
    console.warn('[Community] Supabase error in isFollowing, using localStorage:', err);
    const follows = getLocalFollows();
    return follows.some(f => f.followerId === followerId && f.followingId === followingId);
  }
}

/**
 * Get list of users that a user follows
 */
export async function getFollowing(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('community_follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error) throw error;
    return (data || []).map(row => row.following_id);
  } catch (err) {
    console.warn('[Community] Supabase error in getFollowing, using localStorage:', err);
    const follows = getLocalFollows();
    return follows
      .filter(f => f.followerId === userId)
      .map(f => f.followingId);
  }
}

/**
 * Get list of users who follow a user
 */
export async function getFollowers(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('community_follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (error) throw error;
    return (data || []).map(row => row.follower_id);
  } catch (err) {
    console.warn('[Community] Supabase error in getFollowers, using localStorage:', err);
    const follows = getLocalFollows();
    return follows
      .filter(f => f.followingId === userId)
      .map(f => f.followerId);
  }
}

/**
 * Get follower and following counts for a user
 */
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  try {
    const [followersResult, followingResult] = await Promise.all([
      supabase
        .from('community_follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('community_follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId),
    ]);

    return {
      followers: followersResult.count || 0,
      following: followingResult.count || 0,
    };
  } catch (err) {
    console.warn('[Community] Supabase error in getFollowCounts, using localStorage:', err);
    const follows = getLocalFollows();
    return {
      followers: follows.filter(f => f.followingId === userId).length,
      following: follows.filter(f => f.followerId === userId).length,
    };
  }
}

/**
 * Get posts from users that the current user follows (feed)
 */
export async function getFollowingFeed(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<CommunityPost[]> {
  const followingIds = await getFollowing(userId);

  if (followingIds.length === 0) {
    return []; // No one followed, empty feed
  }

  try {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .in('user_id', followingIds)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []).map(dbRowToPost);
  } catch (err) {
    console.warn('[Community] Supabase error in getFollowingFeed, using localStorage:', err);

    const posts = getLocalPosts();
    return posts
      .filter(p => followingIds.includes(p.userId) && p.moderationStatus === 'approved')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(options?.offset || 0, (options?.offset || 0) + (options?.limit || 20));
  }
}

/**
 * Get suggested users to follow based on activity and shared interests
 */
export async function getSuggestedUsersToFollow(
  userId: string,
  limit: number = 5
): Promise<{ userId: string; displayName: string; reason: string }[]> {
  try {
    // Get current following
    const following = await getFollowing(userId);

    // Get users who have interacted with the same posts
    const { data: userPosts } = await supabase
      .from('community_posts')
      .select('id')
      .eq('user_id', userId);

    const postIds = (userPosts || []).map(p => p.id);

    // Get users who commented on or liked the same posts
    const { data: engagers } = await supabase
      .from('community_comments')
      .select('user_id, user_display_name')
      .in('post_id', postIds)
      .neq('user_id', userId)
      .limit(limit * 2);

    // Filter out already-followed users and dedupe
    const suggestions: { userId: string; displayName: string; reason: string }[] = [];
    const seenUserIds = new Set([userId, ...following]);

    for (const engager of engagers || []) {
      if (seenUserIds.has(engager.user_id)) continue;
      seenUserIds.add(engager.user_id);

      suggestions.push({
        userId: engager.user_id,
        displayName: engager.user_display_name,
        reason: 'Commented on posts like yours',
      });

      if (suggestions.length >= limit) break;
    }

    // If not enough, get active posters
    if (suggestions.length < limit) {
      const { data: activePosts } = await supabase
        .from('community_posts')
        .select('user_id, user_display_name')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(20);

      for (const post of activePosts || []) {
        if (seenUserIds.has(post.user_id)) continue;
        seenUserIds.add(post.user_id);

        suggestions.push({
          userId: post.user_id,
          displayName: post.user_display_name,
          reason: 'Active community member',
        });

        if (suggestions.length >= limit) break;
      }
    }

    return suggestions;
  } catch (err) {
    console.warn('[Community] Supabase error in getSuggestedUsersToFollow:', err);
    return [];
  }
}

// ============================================================================
// BADGE EARNING SYSTEM
// ============================================================================

export interface UserBadgeStats {
  totalPosts: number;
  totalComments: number;
  helpfulVotes: number;
  winsShared: number;
  memberSinceDays: number;
  badges: CommunityBadge[];
}

/**
 * Get user's community stats for badge calculation
 */
export async function getUserBadgeStats(userId: string): Promise<UserBadgeStats> {
  try {
    // Try to get from Supabase first
    const { data: posts } = await supabase
      .from('community_posts')
      .select('id, category, like_count, created_at')
      .eq('user_id', userId);

    const { data: comments } = await supabase
      .from('community_comments')
      .select('id, like_count')
      .eq('user_id', userId);

    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at, community_badges')
      .eq('id', userId)
      .single();

    const totalPosts = posts?.length || 0;
    const totalComments = comments?.length || 0;
    const helpfulVotes = (comments?.reduce((sum, c) => sum + (c.like_count || 0), 0) || 0) +
                         (posts?.reduce((sum, p) => sum + (p.like_count || 0), 0) || 0);
    const winsShared = posts?.filter(p => p.category === 'wins').length || 0;

    const memberSinceDays = profile?.created_at
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const badges = (profile?.community_badges || []) as CommunityBadge[];

    return {
      totalPosts,
      totalComments,
      helpfulVotes,
      winsShared,
      memberSinceDays,
      badges,
    };
  } catch (error) {
    console.error('Error getting badge stats:', error);
    // Fallback to localStorage
    const posts = getLocalPosts().filter(p => p.userId === userId);
    return {
      totalPosts: posts.length,
      totalComments: 0,
      helpfulVotes: posts.reduce((sum, p) => sum + p.likeCount, 0),
      winsShared: posts.filter(p => p.category === 'wins').length,
      memberSinceDays: 0,
      badges: [],
    };
  }
}

/**
 * Check which badges a user has earned
 */
export function calculateEarnedBadges(stats: UserBadgeStats): CommunityBadge[] {
  const earnedBadges: CommunityBadge[] = [];
  const now = new Date().toISOString();

  // First Steps - Made first post
  if (stats.totalPosts >= 1) {
    earnedBadges.push({
      ...COMMUNITY_BADGES.find(b => b.id === 'first-post')!,
      earnedAt: now,
    });
  }

  // Helpful Heart - 10 helpful votes
  if (stats.helpfulVotes >= 10) {
    earnedBadges.push({
      ...COMMUNITY_BADGES.find(b => b.id === 'helpful')!,
      earnedAt: now,
    });
  }

  // Storyteller - 5 wins shared
  if (stats.winsShared >= 5) {
    earnedBadges.push({
      ...COMMUNITY_BADGES.find(b => b.id === 'storyteller')!,
      earnedAt: now,
    });
  }

  // Mentor - 20 helpful responses (comments that got likes)
  if (stats.totalComments >= 20 && stats.helpfulVotes >= 20) {
    earnedBadges.push({
      ...COMMUNITY_BADGES.find(b => b.id === 'mentor')!,
      earnedAt: now,
    });
  }

  // Veteran - 6+ months member
  if (stats.memberSinceDays >= 180) {
    earnedBadges.push({
      ...COMMUNITY_BADGES.find(b => b.id === 'veteran')!,
      earnedAt: now,
    });
  }

  return earnedBadges;
}

/**
 * Check and award any new badges to a user
 * Returns newly earned badges (not previously awarded)
 */
export async function checkAndAwardBadges(userId: string): Promise<CommunityBadge[]> {
  const stats = await getUserBadgeStats(userId);
  const earnedBadges = calculateEarnedBadges(stats);

  // Find badges that are new (not in current badges)
  const currentBadgeIds = stats.badges.map(b => b.id);
  const newBadges = earnedBadges.filter(b => !currentBadgeIds.includes(b.id));

  if (newBadges.length > 0) {
    // Save new badges to user profile
    try {
      const updatedBadges = [...stats.badges, ...newBadges];
      await supabase
        .from('profiles')
        .update({ community_badges: updatedBadges })
        .eq('id', userId);

      // Create notification for each new badge
      for (const badge of newBadges) {
        try {
          const { createCommunityNotification } = await import('./notification-system');
          await createCommunityNotification('badge_earned', {
            recipientUserId: userId,
            actorName: 'Aminy',
            badgeName: badge.name,
          });
        } catch (notifError) {
          console.warn('Could not create badge notification:', notifError);
        }
      }
    } catch (error) {
      console.error('Error saving badges:', error);
    }
  }

  return newBadges;
}

/**
 * Get a user's primary badge for display
 * Returns the most prestigious badge or null if none
 */
export function getPrimaryBadge(badges: CommunityBadge[]): CommunityBadge | null {
  // Priority order: veteran > mentor > storyteller > helpful > first-post
  const priority = ['veteran', 'mentor', 'storyteller', 'helpful', 'first-post'];

  for (const badgeId of priority) {
    const badge = badges.find(b => b.id === badgeId);
    if (badge) return badge;
  }

  return null;
}

/**
 * Get display badge string for a user (shown next to name)
 */
export function getUserBadgeDisplay(badges: CommunityBadge[], memberSinceDays: number): string {
  // If they have earned badges, show the primary one
  const primary = getPrimaryBadge(badges);
  if (primary) return primary.name;

  // Otherwise show membership duration
  if (memberSinceDays >= 365) {
    const years = Math.floor(memberSinceDays / 365);
    return `${years}-year member`;
  } else if (memberSinceDays >= 30) {
    const months = Math.floor(memberSinceDays / 30);
    return `${months}-month member`;
  } else if (memberSinceDays >= 7) {
    const weeks = Math.floor(memberSinceDays / 7);
    return `${weeks}-week member`;
  }

  return 'New member';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Configuration
  COMMUNITY_CONFIG,
  POST_CATEGORIES,
  COMMUNITY_BADGES,
  getCommunityGuidelines,

  // Posts
  getSeedPosts,
  generateMockPosts,
  flagForModeration,

  // CRUD Operations
  createPost,
  likePost,
  addComment,
  getComments,
  hasUserLiked,
  getPosts,
  getPost,
  deletePost,
  bookmarkPost,
  getUserBookmarks,

  // AI Moderation
  moderateContent,
  getCrisisResources,

  // Family Matching
  calculateMatchScore,
  findFamilyMatches,

  // Local Groups
  findLocalGroups,
  getAllLocalGroups,
  LOCAL_COMMUNITY_GROUPS,

  // Follow System
  followUser,
  unfollowUser,
  isFollowing,
  getFollowing,
  getFollowers,
  getFollowCounts,
  getFollowingFeed,
  getSuggestedUsersToFollow,

  // Badge System
  getUserBadgeStats,
  calculateEarnedBadges,
  checkAndAwardBadges,
  getPrimaryBadge,
  getUserBadgeDisplay,
};
