// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AI Care Plan Engine
 *
 * Generates personalized care plans by pulling from all data sources:
 * Ease activity data, provider session notes, treatment goals, insurance
 * coverage, and child profile.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface CarePlanSources {
  // From Ease activity data
  easeData?: {
    activitiesByDomain: Record<string, number>;
    calmCornerSessions: number;
    regulationAvgSecs: number;
    streakDays: number;
    moodTrend: number[]; // last 7 days, 1-5
    habitCompletionRate: number;
  };

  // From provider session notes (Rethink sync or Aminy AI notes)
  sessionNotes?: {
    date: string;
    providerName: string;
    sessionType: string;
    highlights: string[];
    recommendations: string[];
    goalsWorkedOn: { goalTitle: string; progressPct: number }[];
  }[];

  // From treatment goals
  goals?: {
    title: string;
    domain: string;
    currentPct: number;
    targetPct: number;
    status: 'improving' | 'steady' | 'needs-focus';
  }[];

  // From insurance/coverage
  coverage?: {
    authUnitsRemaining: number;
    authExpiresDate: string;
    coverageAlerts: string[];
  };

  // Child profile
  child?: {
    name: string;
    age: number;
    diagnoses: string[];
    currentServices: string[];
  };
}

export interface AICarePlan {
  generatedAt: string;
  childName: string;

  // This Week's Focus
  weeklyFocus: {
    title: string;
    description: string;
    domain: string;
    easeActivities: string[]; // recommended Ease activities
    homeTask: string;
  }[];

  // From Provider Notes
  providerUpdates: {
    date: string;
    provider: string;
    summary: string; // parent-friendly
    wins: string[];
    focusAreas: string[];
  }[];

  // Goal Progress
  goalProgress: {
    title: string;
    currentPct: number;
    change: number; // vs last week
    recommendation: string;
  }[];

  // Coverage Alerts
  coverageAlerts: string[];

  // AI Recommendations
  aiRecommendations: string[];

  // Next Actions
  nextActions: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    dueDate?: string;
  }[];
}

// ─── Domain → Ease Activity Mapping ─────────────────────────────────────

const DOMAIN_ACTIVITIES: Record<string, string[]> = {
  speech: [
    'Sound Safari',
    'Word Builder',
    'Story Time Read-Along',
    'Silly Sounds Game',
    'Rhyme Detective',
  ],
  social: [
    'Emotion Charades',
    'Friendship Scenario Cards',
    'Turn-Taking Game',
    'Conversation Starters',
    'Social Story Builder',
  ],
  sensory: [
    'Calm Corner Breathing',
    'Fidget Spinner Focus',
    'Sound Escape',
    'Bubble Wrap Pop',
    'Color Wheel Meditation',
  ],
  executive: [
    'Pattern Memory',
    'Task Sequencer',
    'Timer Challenge',
    'Planning Puzzle',
    'Focus Sprint',
  ],
  routines: [
    'Morning Routine Builder',
    'Visual Schedule Practice',
    'Transition Timer',
    'First-Then Board',
    'Daily Loop Check-in',
  ],
  motor: [
    'Drawing Pad Trace',
    'Finger Maze',
    'Tap Rhythm Game',
    'Squeeze and Release',
    'Balance Challenge',
  ],
  emotional: [
    'Mood Journal',
    'Feelings Thermometer',
    'Calm Down Toolkit',
    'Happy Memory Jar',
    'Worry Monster',
  ],
  behavioral: [
    'Token Board',
    'Reward Tracker',
    'Behavior Chart',
    'Calm Choice Cards',
    'Self-Regulation Timer',
  ],
};

const DOMAIN_EMOJIS: Record<string, string> = {
  speech: '🗣️',
  social: '🤝',
  sensory: '🌈',
  executive: '🧩',
  routines: '📋',
  motor: '✋',
  emotional: '💛',
  behavioral: '⭐',
};

const DOMAIN_HOME_TASKS: Record<string, string[]> = {
  speech: [
    'Practice naming 3 items during snack time',
    'Read a short book together and pause for your child to fill in words',
    'Play a rhyming game during car rides',
  ],
  social: [
    'Practice greetings with a family member',
    'Take turns choosing a game to play',
    'Role-play a simple conversation scenario',
  ],
  sensory: [
    'Try 3 deep breaths before a transition',
    'Set up a calm-down corner at home',
    'Use a fidget tool during quiet time',
  ],
  executive: [
    'Use a visual checklist for morning routine',
    'Practice waiting with a timer (start with 30 seconds)',
    'Play a simple planning game together',
  ],
  routines: [
    'Follow the morning routine chart together',
    'Practice a first-then transition at home',
    'Use a visual timer for screen time',
  ],
  motor: [
    'Do finger exercises before writing practice',
    'Practice cutting with safety scissors',
    'Play with playdough for 10 minutes',
  ],
  emotional: [
    'Check in about feelings at bedtime',
    'Use a feelings chart to name emotions during the day',
    'Practice one calm-down strategy together',
  ],
  behavioral: [
    'Celebrate one specific positive behavior today',
    'Use the token board for one daily task',
    'Practice a calm-down choice when frustrated',
  ],
};

// ─── Utility Helpers ────────────────────────────────────────────────────

function identifyWeakDomains(
  activitiesByDomain: Record<string, number>,
): string[] {
  const entries = Object.entries(activitiesByDomain);
  if (entries.length === 0) return ['speech', 'social', 'sensory'];

  const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
  const weak = entries
    .filter(([, v]) => v < avg * 0.7)
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => k);

  // If no clear weak areas, return the lowest 2
  if (weak.length === 0) {
    return entries
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .map(([k]) => k);
  }

  return weak.slice(0, 3);
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function summarizeSessionForParent(
  note: CarePlanSources['sessionNotes'] extends (infer U)[] | undefined ? U : never,
): string {
  if (!note) return '';
  const highlights = note.highlights.slice(0, 2).join('; ');
  const goals = note.goalsWorkedOn
    .map((g) => `${g.goalTitle} (${g.progressPct}%)`)
    .join(', ');

  return `${note.providerName} worked on ${goals || 'treatment goals'}. ${highlights ? `Highlights: ${highlights}.` : ''}`;
}

function getMoodTrend(moodTrend: number[]): 'improving' | 'steady' | 'declining' {
  if (moodTrend.length < 3) return 'steady';
  const first = moodTrend.slice(0, Math.ceil(moodTrend.length / 2));
  const second = moodTrend.slice(Math.ceil(moodTrend.length / 2));
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;

  if (avgSecond - avgFirst > 0.3) return 'improving';
  if (avgFirst - avgSecond > 0.3) return 'declining';
  return 'steady';
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getNextWeekday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

// ─── Main Generator ─────────────────────────────────────────────────────

export function generateCarePlan(sources: CarePlanSources): AICarePlan {
  const childName = sources.child?.name || 'Your child';
  const now = new Date().toISOString();

  // 1. Identify weak domains from Ease data
  const weakDomains = sources.easeData
    ? identifyWeakDomains(sources.easeData.activitiesByDomain)
    : ['speech', 'social', 'sensory'];

  // Also identify strong domains
  const allDomains = sources.easeData
    ? Object.entries(sources.easeData.activitiesByDomain)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k)
    : [];
  const strongDomains = allDomains.filter((d) => !weakDomains.includes(d)).slice(0, 2);

  // 2. Generate weekly focus (prioritize weak domains + goals with needs-focus)
  const focusDomains = new Set<string>(weakDomains);

  // Add domains from goals that need focus
  if (sources.goals) {
    sources.goals
      .filter((g) => g.status === 'needs-focus')
      .forEach((g) => focusDomains.add(g.domain.toLowerCase()));
  }

  const weeklyFocus = Array.from(focusDomains)
    .slice(0, 3)
    .map((domain) => {
      const domainKey = domain.toLowerCase();
      const activities = DOMAIN_ACTIVITIES[domainKey] || DOMAIN_ACTIVITIES.speech;
      const homeTasks = DOMAIN_HOME_TASKS[domainKey] || DOMAIN_HOME_TASKS.speech;

      // Find matching goal for description
      const matchingGoal = sources.goals?.find(
        (g) => g.domain.toLowerCase() === domainKey,
      );

      return {
        title: `${DOMAIN_EMOJIS[domainKey] || '📌'} ${domain.charAt(0).toUpperCase() + domain.slice(1)} Focus`,
        description: matchingGoal
          ? `${childName} is at ${matchingGoal.currentPct}% toward the ${matchingGoal.targetPct}% target. ${matchingGoal.status === 'needs-focus' ? 'This area needs extra attention this week.' : 'Keep up the great progress!'}`
          : `Let's strengthen ${childName}'s ${domain} skills with targeted activities.`,
        domain: domainKey,
        easeActivities: pickRandom(activities, 3),
        homeTask: pickRandom(homeTasks, 1)[0],
      };
    });

  // 3. Process provider notes into parent-friendly updates
  const providerUpdates = (sources.sessionNotes || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((note) => ({
      date: note.date,
      provider: note.providerName,
      summary: summarizeSessionForParent(note),
      wins: note.highlights.slice(0, 3),
      focusAreas: note.recommendations.slice(0, 3),
    }));

  // 4. Goal progress with change estimation
  const goalProgress = (sources.goals || []).map((goal) => {
    // Estimate change: improving = +5, steady = +1, needs-focus = -2
    const change =
      goal.status === 'improving' ? 5 : goal.status === 'steady' ? 1 : -2;

    let recommendation = '';
    if (goal.status === 'needs-focus') {
      recommendation = `Focus more Ease time on ${goal.domain.toLowerCase()} activities this week. Try shorter, more frequent sessions.`;
    } else if (goal.status === 'improving') {
      recommendation = `Great momentum! Keep reinforcing with daily practice in ${goal.domain.toLowerCase()}.`;
    } else {
      recommendation = `Steady progress. Consider increasing session frequency or trying new activities in this domain.`;
    }

    return {
      title: goal.title,
      currentPct: goal.currentPct,
      change,
      recommendation,
    };
  });

  // 5. Coverage alerts
  const coverageAlerts: string[] = [];
  if (sources.coverage) {
    // Always include existing alerts
    coverageAlerts.push(...sources.coverage.coverageAlerts);

    // Add auth expiry warning
    const daysLeft = daysUntil(sources.coverage.authExpiresDate);
    if (daysLeft <= 30 && daysLeft > 0) {
      coverageAlerts.push(
        `Authorization expires in ${daysLeft} days (${sources.coverage.authExpiresDate}). Contact your provider to request re-authorization.`,
      );
    } else if (daysLeft <= 0) {
      coverageAlerts.push(
        `Authorization has expired! Contact your provider immediately to renew.`,
      );
    }

    // Add units remaining warning
    if (sources.coverage.authUnitsRemaining <= 5) {
      coverageAlerts.push(
        `Only ${sources.coverage.authUnitsRemaining} authorized units remaining. Request additional units soon.`,
      );
    }
  }

  // 6. AI Recommendations — synthesize across all data
  const aiRecommendations: string[] = [];

  if (sources.easeData) {
    const { moodTrend, calmCornerSessions, habitCompletionRate, streakDays } =
      sources.easeData;

    // Mood trend recommendation
    const trend = getMoodTrend(moodTrend);
    if (trend === 'improving') {
      aiRecommendations.push(
        `${childName}'s mood has been trending upward this week. Keep the positive momentum going with their favorite activities.`,
      );
    } else if (trend === 'declining') {
      aiRecommendations.push(
        `${childName}'s mood has dipped this week. Consider adding extra Calm Corner time and checking in about what might be different.`,
      );
    }

    // Strong domains celebration
    if (strongDomains.length > 0) {
      aiRecommendations.push(
        `${childName} is excelling in ${strongDomains.join(' and ')} activities. Celebrate this strength while building on weaker areas.`,
      );
    }

    // Calm corner usage
    if (calmCornerSessions < 2) {
      aiRecommendations.push(
        `${childName} has used the Calm Corner ${calmCornerSessions} time${calmCornerSessions !== 1 ? 's' : ''} this week. Try introducing it before transitions for better regulation.`,
      );
    } else if (calmCornerSessions >= 5) {
      aiRecommendations.push(
        `${childName} is actively using the Calm Corner (${calmCornerSessions} sessions). This is a great self-regulation habit.`,
      );
    }

    // Habit completion
    if (habitCompletionRate < 0.5) {
      aiRecommendations.push(
        `Habit completion is at ${Math.round(habitCompletionRate * 100)}%. Try simplifying the daily routine to 2-3 core habits.`,
      );
    }

    // Streak celebration
    if (streakDays >= 7) {
      aiRecommendations.push(
        `${childName} has a ${streakDays}-day streak. This consistency is building strong habits.`,
      );
    }
  }

  // Provider-based recommendations
  if (sources.sessionNotes && sources.sessionNotes.length > 0) {
    const latestNote = sources.sessionNotes.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];

    if (latestNote.recommendations.length > 0) {
      aiRecommendations.push(
        `${latestNote.providerName} recommends: "${latestNote.recommendations[0]}"`,
      );
    }
  }

  // Ensure at least 2 recommendations
  if (aiRecommendations.length === 0) {
    aiRecommendations.push(
      `Start building a daily routine with Ease — even 5 minutes a day can make a meaningful difference.`,
      `Try the Calm Corner before challenging transitions to help ${childName} build self-regulation skills.`,
    );
  }

  // 7. Next Actions
  const nextActions: AICarePlan['nextActions'] = [];

  // High priority: coverage issues
  if (coverageAlerts.length > 0) {
    nextActions.push({
      action: 'Review and address coverage alerts',
      priority: 'high',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    });
  }

  // High priority: goals needing focus
  const needsFocusGoals = (sources.goals || []).filter(
    (g) => g.status === 'needs-focus',
  );
  if (needsFocusGoals.length > 0) {
    nextActions.push({
      action: `Increase practice time for: ${needsFocusGoals.map((g) => g.title).join(', ')}`,
      priority: 'high',
      dueDate: getNextWeekday(),
    });
  }

  // Medium priority: complete weekly focus activities
  nextActions.push({
    action: `Complete this week's Ease activities in ${weeklyFocus.map((f) => f.domain).join(', ')}`,
    priority: 'medium',
    dueDate: getNextWeekday(),
  });

  // Medium priority: home tasks
  weeklyFocus.forEach((focus) => {
    nextActions.push({
      action: focus.homeTask,
      priority: 'medium',
    });
  });

  // Low priority: schedule check-in
  if (
    !sources.sessionNotes ||
    sources.sessionNotes.length === 0
  ) {
    nextActions.push({
      action: 'Schedule your next provider session',
      priority: 'high',
    });
  } else {
    nextActions.push({
      action: 'Review provider notes and prepare questions for next session',
      priority: 'low',
    });
  }

  return {
    generatedAt: now,
    childName,
    weeklyFocus,
    providerUpdates,
    goalProgress,
    coverageAlerts,
    aiRecommendations,
    nextActions,
  };
}

// ─── Treatment Plan Translation for Parents ─────────────────────────────

export interface TranslatedGoal {
  clinicalGoal: string;
  parentFriendlyGoal: string;
  whyItMatters: string;
  whatYouCanDo: string[];
  progressDescription: string;
  celebrationSuggestion: string;
}

const CLINICAL_TRANSLATIONS: Record<string, { friendly: string; why: string }> = {
  'independent transitions': {
    friendly: 'Moving from one activity to another without a meltdown',
    why: 'Transitions are one of the hardest parts of the day for many kids. When your child can handle transitions calmly, it means less stress for the whole family — and more independence at school.',
  },
  'peer social engagement': {
    friendly: 'Playing and interacting with other kids',
    why: 'Social skills are the foundation of friendships, teamwork at school, and feeling confident in group settings. Every small interaction builds this muscle.',
  },
  'expressive language': {
    friendly: 'Using longer sentences to tell you what they want and need',
    why: 'When kids can express themselves clearly, frustration goes down and connection goes up. More words = fewer meltdowns.',
  },
  'narrative retell': {
    friendly: 'Telling you about something that happened in order',
    why: 'This skill helps at school (following stories, answering questions) and in daily life (telling you about their day, explaining what happened).',
  },
  'sensory self-regulation': {
    friendly: 'Calming themselves down when things feel overwhelming',
    why: 'Self-regulation is a superpower. When your child can recognize "I feel overwhelmed" and use a strategy to calm down, it changes everything.',
  },
  'on-task behavior': {
    friendly: 'Staying focused on an activity without constant reminders',
    why: 'Focus and attention are crucial for learning at school and completing daily tasks. Building this skill now pays off for years.',
  },
  'joint attention': {
    friendly: 'Looking at and sharing interest in something with another person',
    why: 'Joint attention is the building block of communication. When your child shares a moment with you — pointing at something cool, looking at you to share excitement — that\'s connection.',
  },
  'functional communication': {
    friendly: 'Asking for what they need instead of acting out',
    why: 'Many challenging behaviors happen because a child can\'t tell you what they want. Teaching alternative ways to communicate reduces frustration for everyone.',
  },
  'daily living skills': {
    friendly: 'Taking care of themselves (dressing, teeth brushing, eating)',
    why: 'Independence in daily tasks builds confidence and reduces the load on parents. Every small step toward independence is a win.',
  },
  'following directions': {
    friendly: 'Understanding and doing what\'s asked the first time',
    why: 'This skill is essential for school, safety, and daily routines. It\'s not about obedience — it\'s about comprehension and cooperation.',
  },
};

/**
 * Translate a clinical treatment goal into parent-friendly language
 * with actionable "what you can do at home" suggestions
 */
export function translateGoalForParent(goal: {
  title: string;
  domain: string;
  currentPct: number;
  targetPct: number;
  status: string;
}, childName: string = 'your child'): TranslatedGoal {
  // Find best matching translation
  const titleLower = goal.title.toLowerCase();
  let translation = { friendly: goal.title, why: 'This skill helps your child grow and become more independent.' };

  for (const [key, value] of Object.entries(CLINICAL_TRANSLATIONS)) {
    if (titleLower.includes(key)) {
      translation = value;
      break;
    }
  }

  // Generate "what you can do" based on domain
  const domainTasks = DOMAIN_HOME_TASKS[goal.domain.toLowerCase()] || DOMAIN_HOME_TASKS.behavioral;
  const whatYouCanDo = pickRandom(domainTasks, 3);

  // Progress description
  let progressDescription: string;
  if (goal.currentPct >= goal.targetPct) {
    progressDescription = `${childName} has reached the target! Time to celebrate and set a new goal.`;
  } else if (goal.currentPct >= goal.targetPct * 0.8) {
    progressDescription = `${childName} is SO close — ${goal.currentPct}% of the way to ${goal.targetPct}%. Keep going!`;
  } else if (goal.currentPct >= goal.targetPct * 0.5) {
    progressDescription = `${childName} is making solid progress — ${goal.currentPct}% of the way there. This is where consistency really matters.`;
  } else {
    progressDescription = `${childName} is at ${goal.currentPct}% — still early in the journey, but every session builds on the last.`;
  }

  // Celebration suggestion
  const celebrations = [
    `When ${childName} reaches ${Math.min(goal.currentPct + 10, goal.targetPct)}%, plan a special activity they love.`,
    `Catch ${childName} using this skill in daily life and make a big deal about it — specific praise works best.`,
    `Take a photo or video of ${childName} showing this skill to share with family — it makes progress tangible.`,
    `Create a "win wall" at home where you post notes about ${childName}'s progress. Kids love seeing their growth.`,
  ];

  return {
    clinicalGoal: goal.title,
    parentFriendlyGoal: translation.friendly,
    whyItMatters: translation.why,
    whatYouCanDo,
    progressDescription,
    celebrationSuggestion: pickRandom(celebrations, 1)[0],
  };
}

/**
 * Generate a complete parent empowerment report from a care plan
 */
export function generateParentEmpowermentReport(plan: AICarePlan): {
  translatedGoals: TranslatedGoal[];
  weeklyMessage: string;
  topPriority: string;
  encouragement: string;
} {
  const translatedGoals = plan.goalProgress.map(g =>
    translateGoalForParent({
      title: g.title,
      domain: 'behavioral', // default
      currentPct: g.currentPct,
      targetPct: 100,
      status: g.change > 0 ? 'improving' : g.change < 0 ? 'needs-focus' : 'steady',
    }, plan.childName)
  );

  const improvingGoals = plan.goalProgress.filter(g => g.change > 0);
  const needsFocusGoals = plan.goalProgress.filter(g => g.change < 0);

  let weeklyMessage: string;
  if (improvingGoals.length >= needsFocusGoals.length) {
    weeklyMessage = `Great week! ${plan.childName} showed improvement in ${improvingGoals.length} area${improvingGoals.length > 1 ? 's' : ''}. Your consistency is paying off.`;
  } else {
    weeklyMessage = `This week had some challenges, and that's completely normal. ${plan.childName} is still making progress overall. Focus on the wins, no matter how small.`;
  }

  const topPriority = plan.weeklyFocus.length > 0
    ? `This week's #1 focus: ${plan.weeklyFocus[0].title}. ${plan.weeklyFocus[0].description}`
    : `Keep up your daily routine with ${plan.childName}. Consistency is the most powerful tool you have.`;

  const encouragements = [
    `Remember: you are ${plan.childName}'s biggest advocate and most important teacher. What you do at home matters just as much as therapy.`,
    `Progress isn't always linear. Some weeks are harder than others. What matters is that you keep showing up.`,
    `You're doing an incredible job. The fact that you're tracking ${plan.childName}'s progress shows how much you care.`,
    `Every small win adds up. A year from now, you'll look back and be amazed at how far ${plan.childName} has come.`,
  ];

  return {
    translatedGoals,
    weeklyMessage,
    topPriority,
    encouragement: pickRandom(encouragements, 1)[0],
  };
}

// ─── Demo Data Generator ────────────────────────────────────────────────

export function generateDemoCarePlan(childName = 'Aiden'): AICarePlan {
  return generateCarePlan({
    child: {
      name: childName,
      age: 6,
      diagnoses: ['Autism Spectrum Disorder (Level 1)', 'ADHD — Combined Type'],
      currentServices: ['ABA Therapy', 'Speech Therapy', 'Occupational Therapy'],
    },
    easeData: {
      activitiesByDomain: {
        speech: 6,
        social: 14,
        sensory: 5,
        behavioral: 9,
        executive: 3,
        routines: 11,
        emotional: 4,
      },
      calmCornerSessions: 6,
      regulationAvgSecs: 38,
      streakDays: 8,
      moodTrend: [3, 2, 3, 4, 3, 4, 4],
      habitCompletionRate: 0.68,
    },
    sessionNotes: [
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        providerName: 'Dr. Lauren Mitchell, BCBA',
        sessionType: 'ABA',
        highlights: [
          'Transitioned between 3 activities without verbal prompts for the first time',
          'Used token board independently to self-monitor during table work',
          'Showed emerging joint attention during peer play station',
        ],
        recommendations: [
          'Practice 2-step transitions at home using visual timer (start with 5 min warning)',
          'Reinforce independent task completion with specific praise ("I love how you finished that on your own")',
        ],
        goalsWorkedOn: [
          { goalTitle: 'Independent Transitions', progressPct: 78 },
          { goalTitle: 'Peer Social Engagement', progressPct: 62 },
          { goalTitle: 'On-Task Behavior', progressPct: 80 },
        ],
      },
      {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        providerName: 'Ms. Angela Reyes, CCC-SLP',
        sessionType: 'Speech',
        highlights: [
          'Produced 4-word sentences with correct syntax 7 out of 10 trials',
          'Initiated a conversational turn with a peer unprompted during group activity',
          'Improved narrative retell — correctly sequenced 3 out of 4 story events',
        ],
        recommendations: [
          'Read a short story at bedtime and ask "what happened first / next / last"',
          'Model 4-5 word sentences during mealtimes and pause for Aiden to fill in',
        ],
        goalsWorkedOn: [
          { goalTitle: 'Expressive Language (sentence length)', progressPct: 72 },
          { goalTitle: 'Narrative / Retell Skills', progressPct: 45 },
        ],
      },
    ],
    goals: [
      {
        title: 'Independent Transitions',
        domain: 'behavioral',
        currentPct: 78,
        targetPct: 90,
        status: 'improving',
      },
      {
        title: 'Expressive Language (4+ word sentences)',
        domain: 'speech',
        currentPct: 72,
        targetPct: 90,
        status: 'improving',
      },
      {
        title: 'Narrative / Retell Skills',
        domain: 'speech',
        currentPct: 45,
        targetPct: 80,
        status: 'needs-focus',
      },
      {
        title: 'Peer Social Engagement',
        domain: 'social',
        currentPct: 62,
        targetPct: 85,
        status: 'steady',
      },
      {
        title: 'Sensory Self-Regulation',
        domain: 'sensory',
        currentPct: 40,
        targetPct: 75,
        status: 'needs-focus',
      },
    ],
    coverage: {
      authUnitsRemaining: 4,
      authExpiresDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      coverageAlerts: [
        'ABA authorization expires in 22 days — contact BCBA to submit re-auth request to United Healthcare.',
      ],
    },
  });
}
