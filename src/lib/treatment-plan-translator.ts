/**
 * Treatment Plan Translator
 * Converts clinical SMART goals into parent-friendly language
 */

// ============================================================================
// Types
// ============================================================================

export interface ClinicalGoal {
  id: string;
  smartGoalText: string;          // e.g. "Manding for preferred items using 1-word approximations..."
  targetBehavior: string;         // e.g. "Manding (requesting)"
  measurementMethod: string;      // e.g. "Frequency count per 30-min session"
  baselineData: string;           // e.g. "0 spontaneous mands per session (Jan 2026)"
  masteryCriterion: string;       // e.g. "80% across 3 consecutive sessions with 2 therapists"
  responsibleProvider: string;    // e.g. "Dr. Sarah Chen, BCBA-D"
  domain: GoalDomain;
  currentProgressPercent: number; // 0–100
  lastUpdated: string;            // ISO date string
}

export type GoalDomain =
  | 'communication'
  | 'social-skills'
  | 'daily-living'
  | 'behavior-reduction'
  | 'academic'
  | 'motor'
  | 'sensory'
  | 'executive-function';

export interface ParentFriendlyGoal {
  id: string;
  plainEnglishTitle: string;       // e.g. "Learning to ask for help"
  whatItLooksLike: string;         // Concrete behavioral description for parents
  whyItMatters: string;            // Motivation / functional impact
  howToHelpAtHome: string[];       // 2–3 specific parent tips
  howWeMeasureIt: string;          // Plain-English measurement description
  currentProgressPercent: number;
  progressDescription: string;     // e.g. "Just getting started", "Making great strides"
  domain: GoalDomain;
  responsibleProvider: string;
  lastUpdated: string;
}

export interface TreatmentPlanSummaryData {
  childName: string;
  period: 'weekly' | 'monthly';
  periodLabel: string;             // e.g. "Week of March 31" or "March 2026"
  goals: ParentFriendlyGoal[];
  overallProgressPercent: number;
  providerNote: string;            // Short narrative from provider
  nextSessionDate?: string;
  recentUpdates: {
    date: string;
    provider: string;
    note: string;
  }[];
}

// ============================================================================
// Domain labels
// ============================================================================

const DOMAIN_LABELS: Record<GoalDomain, string> = {
  'communication': 'Communication',
  'social-skills': 'Social Skills',
  'daily-living': 'Daily Living',
  'behavior-reduction': 'Behavior Support',
  'academic': 'Learning & School',
  'motor': 'Motor Skills',
  'sensory': 'Sensory Processing',
  'executive-function': 'Focus & Flexibility',
};

// ============================================================================
// Progress descriptions
// ============================================================================

function describeProgress(percent: number): string {
  if (percent === 0) return 'Just getting started';
  if (percent < 20) return 'Early steps — building the foundation';
  if (percent < 40) return 'Making progress — keep it up!';
  if (percent < 60) return 'Good momentum — halfway there';
  if (percent < 75) return 'Making great strides';
  if (percent < 90) return 'Almost there — nearly mastered!';
  return 'Goal mastered! 🎉';
}

// ============================================================================
// Translator — maps clinical language to parent-friendly language
// ============================================================================

const DOMAIN_TITLE_TEMPLATES: Record<GoalDomain, (behavior: string) => string> = {
  'communication': (b) => b.toLowerCase().includes('mand') ? 'Learning to ask for things using words' :
    b.toLowerCase().includes('tact') ? 'Labeling and describing the world around them' :
    b.toLowerCase().includes('echoic') ? 'Repeating sounds and words' :
    'Building communication skills',
  'social-skills': (_b) => 'Making friends and playing with others',
  'daily-living': (b) => b.toLowerCase().includes('toilet') ? 'Learning bathroom independence' :
    b.toLowerCase().includes('dress') ? 'Getting dressed independently' :
    b.toLowerCase().includes('eat') || b.toLowerCase().includes('feed') ? 'Building mealtime skills' :
    'Building everyday independence',
  'behavior-reduction': (_b) => 'Finding better ways to handle big feelings',
  'academic': (_b) => 'Learning and school readiness skills',
  'motor': (b) => b.toLowerCase().includes('fine') ? 'Building hand and finger skills' : 'Building movement and coordination',
  'sensory': (_b) => 'Managing sensory sensitivities',
  'executive-function': (_b) => 'Staying focused and handling change',
};

const DOMAIN_WHY_TEMPLATES: Record<GoalDomain, string> = {
  'communication': 'Communication is the #1 way children express needs, build relationships, and participate in the world. Every word gained opens new doors.',
  'social-skills': 'Social connection is central to happiness and quality of life. These skills help your child build friendships and navigate social situations with confidence.',
  'daily-living': 'Independence in daily routines builds confidence, reduces stress for the whole family, and prepares your child for a fuller life.',
  'behavior-reduction': 'When children have better tools for managing emotions and needs, everyone is happier. This reduces frustration and builds real coping skills.',
  'academic': 'School skills open up learning and life opportunities. These goals help your child participate more fully in classroom and academic settings.',
  'motor': 'Motor skills underpin everything from writing to sports to self-care. Building these skills increases independence and confidence.',
  'sensory': 'Sensory processing affects how your child experiences the world. These goals help them feel more comfortable and regulated throughout the day.',
  'executive-function': 'Focus and flexibility are the invisible skills that make school, friendships, and daily life work smoothly.',
};

const DOMAIN_HOME_TIPS: Record<GoalDomain, string[]> = {
  'communication': [
    'When your child reaches for something, pause and wait a moment — give them a chance to use words or a gesture first',
    'Celebrate every attempt to communicate, even if it\'s not perfect',
    'Narrate your day: "I\'m opening the fridge. Do you want milk?"',
  ],
  'social-skills': [
    'Arrange brief, structured playdates with one friend at a time',
    'Practice turn-taking during games and activities at home',
    'Role-play social scenarios before they happen (e.g., greetings, asking to play)',
  ],
  'daily-living': [
    'Use a visual checklist or picture schedule for the routine',
    'Break the task into small steps and celebrate each one',
    'Give consistent, calm prompts — then fade your help as they get it',
  ],
  'behavior-reduction': [
    'Notice what happens right before the behavior — that\'s the trigger',
    'Teach a replacement behavior before you need it (e.g., asking for a break)',
    'Stay calm and regulated yourself — it helps your child regulate too',
  ],
  'academic': [
    'Read together daily, even just 10 minutes',
    'Make learning concrete and hands-on (blocks, puzzles, real objects)',
    'Use your child\'s interests to make skills relevant and engaging',
  ],
  'motor': [
    'Practice fine motor skills through play: playdough, beading, puzzles',
    'Make gross motor movement fun: obstacle courses, dancing, playground time',
    'Cheerlead effort, not just outcome',
  ],
  'sensory': [
    'Create a calm-down corner with sensory tools your child likes',
    'Offer movement breaks before transitions or challenging tasks',
    'Notice patterns in what helps them feel regulated',
  ],
  'executive-function': [
    'Use visual timers for transitions: "5 more minutes, then we switch"',
    'Keep routines predictable — warn about changes in advance',
    'Break big tasks into tiny steps with clear start/finish points',
  ],
};

/**
 * Translate a single clinical goal into parent-friendly language.
 */
export function translateGoalToParent(clinicalGoal: ClinicalGoal): ParentFriendlyGoal {
  const domain = clinicalGoal.domain;

  // Generate plain English title
  const titleFn = DOMAIN_TITLE_TEMPLATES[domain];
  const plainEnglishTitle = titleFn(clinicalGoal.targetBehavior);

  // What it looks like: derive from measurement + target behavior
  const whatItLooksLike = deriveWhatItLooksLike(clinicalGoal);

  // Why it matters
  const whyItMatters = DOMAIN_WHY_TEMPLATES[domain];

  // Home tips
  const howToHelpAtHome = DOMAIN_HOME_TIPS[domain].slice(0, 3);

  // Plain English measurement
  const howWeMeasureIt = plainEnglishMeasurement(clinicalGoal);

  // Progress description
  const progressDescription = describeProgress(clinicalGoal.currentProgressPercent);

  return {
    id: clinicalGoal.id,
    plainEnglishTitle,
    whatItLooksLike,
    whyItMatters,
    howToHelpAtHome,
    howWeMeasureIt,
    currentProgressPercent: clinicalGoal.currentProgressPercent,
    progressDescription,
    domain,
    responsibleProvider: clinicalGoal.responsibleProvider,
    lastUpdated: clinicalGoal.lastUpdated,
  };
}

function deriveWhatItLooksLike(goal: ClinicalGoal): string {
  const domain = goal.domain;
  switch (domain) {
    case 'communication':
      return 'When your child wants something, they\'ll use words, pictures, or gestures instead of crying or grabbing — even if just one syllable at first.';
    case 'social-skills':
      return 'Your child will initiate play, take turns, and show awareness of friends\' feelings during structured activities.';
    case 'daily-living':
      return 'Your child will complete steps of this routine with less prompting from you — building toward doing it independently.';
    case 'behavior-reduction':
      return 'When frustrated or overwhelmed, your child will use an agreed-on calming strategy instead of the challenging behavior.';
    case 'academic':
      return 'Your child will demonstrate this skill consistently in both therapy and natural settings like home and school.';
    case 'motor':
      return 'Your child will perform this motor skill with increasing accuracy and less physical assistance.';
    case 'sensory':
      return 'Your child will tolerate or engage with sensory input that previously caused distress, staying regulated longer.';
    case 'executive-function':
      return 'Your child will transition between activities and follow multi-step directions with fewer reminders or meltdowns.';
    default:
      return 'Your child will demonstrate consistent progress on this skill across different settings.';
  }
}

function plainEnglishMeasurement(goal: ClinicalGoal): string {
  const method = goal.measurementMethod.toLowerCase();
  const criterion = goal.masteryCriterion;

  if (method.includes('frequency') || method.includes('count')) {
    return `We count how many times the behavior happens during a therapy session. We'll know the goal is mastered when: ${criterion}`;
  }
  if (method.includes('percent') || method.includes('%')) {
    return `We track what percentage of opportunities your child responds correctly. Target: ${criterion}`;
  }
  if (method.includes('duration')) {
    return `We time how long your child can maintain the skill. Target: ${criterion}`;
  }
  if (method.includes('trial')) {
    return `We give your child chances to practice (called "trials") and record how often they succeed. Target: ${criterion}`;
  }
  return `We observe and record your child\'s performance during sessions. Target for mastery: ${criterion}`;
}

/**
 * Generate a parent-friendly summary of all goals for a given period.
 */
export function generateParentSummary(
  goals: ClinicalGoal[],
  period: 'weekly' | 'monthly',
  childName: string,
  providerNote: string,
  nextSessionDate?: string,
  recentUpdates?: TreatmentPlanSummaryData['recentUpdates']
): TreatmentPlanSummaryData {
  const parentGoals = goals.map(translateGoalToParent);

  const overall = Math.round(
    parentGoals.reduce((sum, g) => sum + g.currentProgressPercent, 0) / parentGoals.length
  );

  const now = new Date();
  let periodLabel: string;
  if (period === 'weekly') {
    periodLabel = `Week of ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  } else {
    periodLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return {
    childName,
    period,
    periodLabel,
    goals: parentGoals,
    overallProgressPercent: overall,
    providerNote,
    nextSessionDate,
    recentUpdates: recentUpdates || [],
  };
}

// ============================================================================
// Demo data
// ============================================================================

export const DEMO_CLINICAL_GOALS: ClinicalGoal[] = [
  {
    id: 'g1',
    smartGoalText: 'Tommy will mand for 5 preferred items using 1-word approximations in 80% of opportunities across 3 consecutive sessions with 2 therapists.',
    targetBehavior: 'Manding (requesting preferred items)',
    measurementMethod: 'Frequency count per 30-minute session',
    baselineData: '0 spontaneous mands per session (January 2026)',
    masteryCriterion: '80% across 3 consecutive sessions with 2 therapists',
    responsibleProvider: 'Dr. Sarah Chen, BCBA-D',
    domain: 'communication',
    currentProgressPercent: 45,
    lastUpdated: '2026-04-01',
  },
  {
    id: 'g2',
    smartGoalText: 'Tommy will independently wash hands following the 5-step task analysis in 90% of trials across 3 consecutive sessions.',
    targetBehavior: 'Hand washing (task analysis)',
    measurementMethod: 'Task analysis percentage correct',
    baselineData: '20% independence (January 2026)',
    masteryCriterion: '90% across 3 consecutive sessions',
    responsibleProvider: 'Dr. Sarah Chen, BCBA-D',
    domain: 'daily-living',
    currentProgressPercent: 68,
    lastUpdated: '2026-04-01',
  },
  {
    id: 'g3',
    smartGoalText: 'Tommy will engage in cooperative play with a peer for 5 continuous minutes without adult prompting in 3 of 4 opportunities per week.',
    targetBehavior: 'Cooperative peer play',
    measurementMethod: 'Duration and frequency recording',
    baselineData: '30 seconds average (February 2026)',
    masteryCriterion: '3 of 4 opportunities per week for 3 consecutive weeks',
    responsibleProvider: 'Katie Wilson, BCBA',
    domain: 'social-skills',
    currentProgressPercent: 30,
    lastUpdated: '2026-03-28',
  },
];

export const DOMAIN_LABEL = DOMAIN_LABELS;
