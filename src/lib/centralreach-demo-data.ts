/**
 * CentralReach Demo Mode — Realistic Mock Data
 *
 * Comprehensive mock data set for sales demos and development testing.
 * When demo mode is active, all CentralReach API calls return this mock
 * data instead of hitting the real API.
 *
 * Includes:
 *   - 3 mock children with realistic profiles, sessions, goals, authorizations
 *   - 2 mock providers (BCBA, RBT) with schedules
 *   - 30 days of session history with realistic patterns
 *   - Insurance/authorization data with varied statuses
 *   - Home programs with multiple activities
 *   - Toggle via: enableDemoMode(), disableDemoMode(), isDemoMode()
 *   - Admin toggle via dev tools: window.__crDemoMode = true
 *
 * Usage in centralreach-integration.ts:
 *   import { isDemoMode, getDemoSessions } from './centralreach-demo-data';
 *   if (isDemoMode()) return getDemoSessions(clientId, dateRange);
 */

import type {
  CRClient,
  CRSession,
  CRGoal,
  CRInsurance,
  CRHomeProgram,
  CRSessionType,
  CRGoalDomain,
  CRGoalData,
  CRActivity,
} from './centralreach-types';

// ============================================================================
// Demo Mode State
// ============================================================================

const DEMO_MODE_KEY = 'aminy_cr_demo_mode';

let _demoModeActive = false;

/** Enable demo mode — all CR API calls will return mock data */
export function enableDemoMode(): void {
  _demoModeActive = true;
  try {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
  } catch {
    // localStorage unavailable
  }

  // Expose to dev tools
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__crDemoMode = true;
  }

  console.log('[CRDemo] Demo mode ENABLED — using mock CentralReach data');
}

/** Disable demo mode — CR API calls will hit real endpoints */
export function disableDemoMode(): void {
  _demoModeActive = false;
  try {
    localStorage.removeItem(DEMO_MODE_KEY);
  } catch {
    // localStorage unavailable
  }

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__crDemoMode = false;
  }

  console.log('[CRDemo] Demo mode DISABLED — using live CentralReach API');
}

/** Check if demo mode is currently active */
export function isDemoMode(): boolean {
  if (_demoModeActive) return true;

  // Check localStorage for persistence across page reloads
  try {
    if (localStorage.getItem(DEMO_MODE_KEY) === 'true') {
      _demoModeActive = true;
      return true;
    }
  } catch {
    // localStorage unavailable
  }

  // Check dev tools override
  if (
    typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>).__crDemoMode === true
  ) {
    _demoModeActive = true;
    return true;
  }

  return false;
}

// ============================================================================
// Mock Providers
// ============================================================================

export interface DemoProvider {
  id: string;
  firstName: string;
  lastName: string;
  credentials: string;
  role: 'BCBA' | 'RBT' | 'BCaBA';
  email: string;
  specialty: string;
}

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    id: 'prov-bcba-001',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    credentials: 'BCBA, LBA',
    role: 'BCBA',
    email: 'smitchell@example-aba.com',
    specialty: 'Early intervention, verbal behavior',
  },
  {
    id: 'prov-rbt-001',
    firstName: 'Marcus',
    lastName: 'Rodriguez',
    credentials: 'RBT',
    role: 'RBT',
    email: 'mrodriguez@example-aba.com',
    specialty: 'Direct therapy, social skills groups',
  },
];

// ============================================================================
// Mock Children (Clients)
// ============================================================================

export const DEMO_CLIENTS: CRClient[] = [
  {
    id: 'client-001',
    firstName: 'Ethan',
    lastName: 'Parker',
    dateOfBirth: '2019-06-15',
    diagnosis: ['F84.0'], // Autism spectrum disorder
    insuranceInfo: {
      payerId: 'ins-bcbs-az',
      payerName: 'Blue Cross Blue Shield of Arizona',
      memberId: 'BCBS-AZ-99284712',
      groupNumber: 'GRP-7721',
      authorizationNumber: 'AUTH-2026-E-4491',
      authUnitsRemaining: 142,
      authUnitsUsed: 58,
      authStartDate: '2026-01-01',
      authEndDate: '2026-06-30',
      authStatus: 'active',
    },
    status: 'active',
    primaryProviderId: 'prov-bcba-001',
    createdAt: '2024-08-10T00:00:00Z',
    updatedAt: '2026-03-08T14:30:00Z',
  },
  {
    id: 'client-002',
    firstName: 'Mia',
    lastName: 'Chen',
    dateOfBirth: '2020-11-03',
    diagnosis: ['F84.0', 'F80.2'], // ASD + language disorder
    insuranceInfo: {
      payerId: 'ins-uhc',
      payerName: 'UnitedHealthcare',
      memberId: 'UHC-448829173',
      groupNumber: 'GRP-5590',
      authorizationNumber: 'AUTH-2026-M-7832',
      authUnitsRemaining: 85,
      authUnitsUsed: 115,
      authStartDate: '2025-10-01',
      authEndDate: '2026-03-31',
      authStatus: 'active',
    },
    status: 'active',
    primaryProviderId: 'prov-bcba-001',
    createdAt: '2025-02-20T00:00:00Z',
    updatedAt: '2026-03-07T09:15:00Z',
  },
  {
    id: 'client-003',
    firstName: 'Noah',
    lastName: 'Williams',
    dateOfBirth: '2018-03-22',
    diagnosis: ['F84.0'],
    insuranceInfo: {
      payerId: 'ins-aetna',
      payerName: 'Aetna',
      memberId: 'AETNA-662891004',
      groupNumber: 'GRP-3381',
      authorizationNumber: 'AUTH-2025-N-1204',
      authUnitsRemaining: 12,
      authUnitsUsed: 188,
      authStartDate: '2025-07-01',
      authEndDate: '2026-01-15',
      authStatus: 'expired',
    },
    status: 'active',
    primaryProviderId: 'prov-rbt-001',
    createdAt: '2023-11-05T00:00:00Z',
    updatedAt: '2026-03-01T16:45:00Z',
  },
];

// ============================================================================
// Mock Goals
// ============================================================================

const DEMO_GOALS: Record<string, CRGoal[]> = {
  'client-001': [
    {
      id: 'goal-001-a',
      clientId: 'client-001',
      description: 'Request preferred items using 2-3 word phrases',
      targetBehavior: 'Manding with multi-word utterances',
      baseline: 15,
      currentLevel: 62,
      target: 80,
      measurementMethod: 'trial_by_trial',
      domain: 'communication',
      status: 'active',
      targetDate: '2026-06-30',
      createdAt: '2025-09-01T00:00:00Z',
      updatedAt: '2026-03-08T14:30:00Z',
    },
    {
      id: 'goal-001-b',
      clientId: 'client-001',
      description: 'Initiate peer interaction during structured play',
      targetBehavior: 'Approach peer and make verbal or gestural initiation',
      baseline: 5,
      currentLevel: 38,
      target: 75,
      measurementMethod: 'frequency',
      domain: 'social_skills',
      status: 'active',
      targetDate: '2026-08-31',
      createdAt: '2025-09-01T00:00:00Z',
      updatedAt: '2026-03-06T10:20:00Z',
    },
    {
      id: 'goal-001-c',
      clientId: 'client-001',
      description: 'Complete morning routine with gestural prompts only',
      targetBehavior: 'Independent completion of 5-step routine (brush teeth, get dressed, eat, shoes, backpack)',
      baseline: 20,
      currentLevel: 72,
      target: 90,
      measurementMethod: 'trial_by_trial',
      domain: 'daily_living',
      status: 'active',
      targetDate: '2026-05-15',
      createdAt: '2025-06-15T00:00:00Z',
      updatedAt: '2026-03-07T11:00:00Z',
    },
    {
      id: 'goal-001-d',
      clientId: 'client-001',
      description: 'Reduce elopement behavior to near-zero',
      targetBehavior: 'Remain in designated area without running away',
      baseline: 85,
      currentLevel: 25,
      target: 5,
      measurementMethod: 'frequency',
      domain: 'behavior_reduction',
      status: 'active',
      targetDate: '2026-04-30',
      createdAt: '2025-03-01T00:00:00Z',
      updatedAt: '2026-03-08T09:45:00Z',
    },
  ],
  'client-002': [
    {
      id: 'goal-002-a',
      clientId: 'client-002',
      description: 'Use PECS to request items across 3 environments',
      targetBehavior: 'Exchange picture card independently for desired item',
      baseline: 10,
      currentLevel: 55,
      target: 90,
      measurementMethod: 'trial_by_trial',
      domain: 'communication',
      status: 'active',
      targetDate: '2026-06-30',
      createdAt: '2025-10-15T00:00:00Z',
      updatedAt: '2026-03-07T13:00:00Z',
    },
    {
      id: 'goal-002-b',
      clientId: 'client-002',
      description: 'Tolerate transitions between activities without crying',
      targetBehavior: 'Accept transition cue and move to next activity within 30 seconds',
      baseline: 30,
      currentLevel: 68,
      target: 85,
      measurementMethod: 'interval_recording',
      domain: 'self_management',
      status: 'active',
      targetDate: '2026-05-31',
      createdAt: '2025-10-15T00:00:00Z',
      updatedAt: '2026-03-08T10:30:00Z',
    },
  ],
  'client-003': [
    {
      id: 'goal-003-a',
      clientId: 'client-003',
      description: 'Engage in reciprocal conversation for 3+ exchanges',
      targetBehavior: 'Maintain topic-related back-and-forth with peer or adult',
      baseline: 25,
      currentLevel: 78,
      target: 85,
      measurementMethod: 'frequency',
      domain: 'communication',
      status: 'active',
      targetDate: '2026-04-30',
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2026-03-05T15:20:00Z',
    },
    {
      id: 'goal-003-b',
      clientId: 'client-003',
      description: 'Follow 3-step instructions with 90% accuracy',
      targetBehavior: 'Complete multi-step directions without additional prompts',
      baseline: 40,
      currentLevel: 88,
      target: 90,
      measurementMethod: 'trial_by_trial',
      domain: 'academic',
      status: 'active',
      targetDate: '2026-03-31',
      createdAt: '2025-01-10T00:00:00Z',
      updatedAt: '2026-03-08T11:45:00Z',
    },
  ],
};

// ============================================================================
// Mock Session Generator (30 days of realistic data)
// ============================================================================

function generateDemoSessions(
  clientId: string,
  daysBack = 30,
): CRSession[] {
  const sessions: CRSession[] = [];
  const client = DEMO_CLIENTS.find((c) => c.id === clientId);
  if (!client) return [];

  const goals = DEMO_GOALS[clientId] || [];
  const now = new Date();

  for (let d = 0; d < daysBack; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);

    // Skip weekends for therapy sessions
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Ethan: 5 days/week (direct + supervision Tuesdays)
    // Mia: MWF (3 days/week)
    // Noah: TTh (2 days/week)
    const shouldHaveSession =
      clientId === 'client-001'
        ? true
        : clientId === 'client-002'
          ? [1, 3, 5].includes(dayOfWeek) // MWF
          : [2, 4].includes(dayOfWeek); // TTh

    if (!shouldHaveSession) continue;

    const dateStr = date.toISOString().split('T')[0];

    // Direct therapy session (RBT)
    const directSession = createMockSession({
      clientId,
      providerId: 'prov-rbt-001',
      date: dateStr,
      startTime: '09:00',
      endTime: '12:00',
      duration: 180,
      sessionType: 'direct_therapy',
      billingCode: '97153',
      billingUnits: 12,
      goals,
      dayOffset: d,
    });
    sessions.push(directSession);

    // Supervision session (BCBA, Tuesdays only)
    if (dayOfWeek === 2) {
      const supervisionSession = createMockSession({
        clientId,
        providerId: 'prov-bcba-001',
        date: dateStr,
        startTime: '12:00',
        endTime: '13:00',
        duration: 60,
        sessionType: 'supervision',
        billingCode: '97155',
        billingUnits: 4,
        goals,
        dayOffset: d,
      });
      sessions.push(supervisionSession);
    }

    // Parent training (BCBA, every other Thursday)
    if (dayOfWeek === 4 && d % 14 < 7) {
      const parentSession = createMockSession({
        clientId,
        providerId: 'prov-bcba-001',
        date: dateStr,
        startTime: '14:00',
        endTime: '15:00',
        duration: 60,
        sessionType: 'parent_training',
        billingCode: '97156',
        billingUnits: 4,
        goals: goals.slice(0, 2),
        dayOffset: d,
      });
      sessions.push(parentSession);
    }

    // Occasional cancellation (roughly 1 in 15 sessions)
    if (d > 5 && d % 15 === 0 && sessions.length > 0) {
      const lastSession = sessions[sessions.length - 1];
      lastSession.status = 'cancelled';
      lastSession.notes = 'Cancelled — client illness';
    }
  }

  return sessions;
}

function createMockSession(params: {
  clientId: string;
  providerId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  sessionType: CRSessionType;
  billingCode: string;
  billingUnits: number;
  goals: CRGoal[];
  dayOffset: number;
}): CRSession {
  const sessionId = `sess-${params.clientId}-${params.date}-${params.sessionType}`;

  // Generate realistic goal data for each session
  const goalData: CRGoalData[] = params.goals.map((goal) => {
    // Simulate gradual improvement over time
    const progressFactor = Math.max(0, 1 - params.dayOffset / 45);
    const baseAccuracy = goal.baseline + (goal.currentLevel - goal.baseline) * progressFactor;
    const variance = Math.random() * 15 - 7; // +/- 7% variance
    const accuracy = Math.min(100, Math.max(0, Math.round(baseAccuracy + variance)));

    const trials = params.sessionType === 'direct_therapy' ? 20 : 10;
    const successes = Math.round((accuracy / 100) * trials);

    const promptLevels = [
      'independent',
      'gestural',
      'verbal',
      'model',
      'partial_physical',
      'full_physical',
    ] as const;
    const promptIndex = accuracy >= 80 ? 0 : accuracy >= 60 ? 1 : accuracy >= 40 ? 2 : 3;

    return {
      goalId: goal.id,
      trials,
      successes,
      accuracy,
      promptLevel: promptLevels[promptIndex],
      notes: accuracy >= 80
        ? 'Responding well, approaching mastery criteria'
        : accuracy >= 60
          ? 'Steady progress, continuing current intervention'
          : 'Additional support needed, consider protocol modification',
      phase:
        accuracy >= 90
          ? 'mastery'
          : accuracy >= 70
            ? 'acquisition'
            : accuracy >= 30
              ? 'acquisition'
              : 'baseline',
    };
  });

  const provider = DEMO_PROVIDERS.find((p) => p.id === params.providerId);
  const isCompleted = params.dayOffset > 0; // Past sessions are completed

  return {
    id: sessionId,
    clientId: params.clientId,
    providerId: params.providerId,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    duration: params.duration,
    sessionType: params.sessionType,
    notes: generateSessionNotes(params.sessionType, goalData, params.dayOffset),
    goals: goalData,
    billingCode: params.billingCode,
    billingUnits: params.billingUnits,
    status: isCompleted ? 'completed' : 'scheduled',
    signedOff: isCompleted && params.dayOffset > 1,
    signedOffBy: isCompleted ? provider?.id || '' : '',
    signedOffAt: isCompleted
      ? new Date(
          new Date(params.date).getTime() + 24 * 60 * 60 * 1000,
        ).toISOString()
      : '',
    createdAt: new Date(params.date).toISOString(),
    updatedAt: new Date(params.date).toISOString(),
  };
}

function generateSessionNotes(
  sessionType: CRSessionType,
  goalData: CRGoalData[],
  dayOffset: number,
): string {
  const avgAccuracy =
    goalData.length > 0
      ? Math.round(
          goalData.reduce((sum, g) => sum + g.accuracy, 0) / goalData.length,
        )
      : 0;

  if (sessionType === 'parent_training') {
    return (
      'Parent training session focused on implementing behavior strategies at home. ' +
      'Reviewed data from the past week and discussed modifications to the home routine. ' +
      'Parent demonstrated correct implementation of prompting hierarchy.'
    );
  }

  if (sessionType === 'supervision') {
    return (
      'Supervision session with RBT. Reviewed treatment plan fidelity and discussed ' +
      `goal modifications. Average accuracy across targets: ${avgAccuracy}%. ` +
      'Recommended continuing current protocol with increased opportunities for generalization.'
    );
  }

  // Direct therapy
  const mood =
    dayOffset % 7 === 0
      ? 'Client arrived in good spirits, engaged throughout session.'
      : dayOffset % 5 === 0
        ? 'Mild resistance at start of session, improved after warm-up activities.'
        : 'Client was cooperative and responsive to redirection.';

  return (
    `${mood} ` +
    `Worked on ${goalData.length} target(s) with average accuracy of ${avgAccuracy}%. ` +
    (avgAccuracy >= 80
      ? 'Strong session — client approaching mastery on multiple targets.'
      : avgAccuracy >= 60
        ? 'Steady progress observed. Will continue current intervention strategies.'
        : 'Below expected levels today. Will monitor trend over next 3 sessions.')
  );
}

// ============================================================================
// Mock Home Programs
// ============================================================================

const DEMO_HOME_PROGRAMS: Record<string, CRHomeProgram[]> = {
  'client-001': [
    {
      id: 'hp-001-a',
      clientId: 'client-001',
      providerId: 'prov-bcba-001',
      assignedDate: '2026-03-01',
      dueDate: '2026-03-15',
      status: 'in_progress',
      instructions:
        'Practice these activities 3-4 times per week during natural daily routines. Use the video guides for reference on prompting techniques.',
      frequencyPerWeek: 4,
      activities: [
        {
          id: 'act-001-1',
          name: 'Requesting Practice',
          instructions:
            'During snack time, hold preferred item and wait 3 seconds for child to make a request using 2+ words. Prompt if needed.',
          targetTrials: 10,
          targetAccuracy: 70,
          materials: ['Preferred snacks', 'Visual choice board'],
          domain: 'communication' as CRGoalDomain,
          linkedGoalId: 'goal-001-a',
          videoUrl: 'https://example.com/videos/requesting-practice',
        },
        {
          id: 'act-001-2',
          name: 'Morning Routine Chart',
          instructions:
            'Use visual schedule to guide morning routine. Provide gestural prompts only. Praise each completed step.',
          targetTrials: 1,
          targetAccuracy: 80,
          materials: ['Visual schedule (provided)', 'Timer'],
          domain: 'daily_living' as CRGoalDomain,
          linkedGoalId: 'goal-001-c',
        },
        {
          id: 'act-001-3',
          name: 'Play Date Social Skills',
          instructions:
            'During play with siblings or peers, narrate social opportunities. Prompt child to approach and say "Want to play?" or similar.',
          targetTrials: 5,
          targetAccuracy: 50,
          materials: ['Preferred toys', 'Social story card'],
          domain: 'social_skills' as CRGoalDomain,
          linkedGoalId: 'goal-001-b',
        },
      ],
      createdAt: '2026-03-01T09:00:00Z',
      updatedAt: '2026-03-08T14:00:00Z',
    },
  ],
  'client-002': [
    {
      id: 'hp-002-a',
      clientId: 'client-002',
      providerId: 'prov-bcba-001',
      assignedDate: '2026-03-03',
      dueDate: '2026-03-17',
      status: 'assigned',
      instructions:
        'Focus on PECS practice during mealtimes and play. Use the transition timer before switching activities.',
      frequencyPerWeek: 3,
      activities: [
        {
          id: 'act-002-1',
          name: 'PECS Mealtime Practice',
          instructions:
            'Place 2 picture cards on table during meals. Wait for child to hand you the card for the item they want.',
          targetTrials: 8,
          targetAccuracy: 60,
          materials: ['PECS cards (provided)', 'Communication book'],
          domain: 'communication' as CRGoalDomain,
          linkedGoalId: 'goal-002-a',
        },
        {
          id: 'act-002-2',
          name: 'Transition Timer Activity',
          instructions:
            'Set visual timer for 2 minutes before transition. When timer goes off, give transition cue and guide to next activity.',
          targetTrials: 5,
          targetAccuracy: 70,
          materials: ['Visual timer app', 'Transition schedule'],
          domain: 'self_management' as CRGoalDomain,
          linkedGoalId: 'goal-002-b',
        },
      ],
      createdAt: '2026-03-03T10:00:00Z',
      updatedAt: '2026-03-03T10:00:00Z',
    },
  ],
};

// ============================================================================
// Public API — Data Retrieval Functions
// ============================================================================

/** Get all demo clients */
export function getDemoClients(): CRClient[] {
  return DEMO_CLIENTS;
}

/** Get a specific demo client by ID */
export function getDemoClient(clientId: string): CRClient | undefined {
  return DEMO_CLIENTS.find((c) => c.id === clientId);
}

/** Get demo sessions for a client within a date range */
export function getDemoSessions(
  clientId: string,
  dateRange?: { from: string; to: string },
): CRSession[] {
  const allSessions = generateDemoSessions(clientId, 30);

  if (!dateRange) return allSessions;

  return allSessions.filter((s) => {
    return s.date >= dateRange.from && s.date <= dateRange.to;
  });
}

/** Get demo goals for a client */
export function getDemoGoals(clientId: string): CRGoal[] {
  return DEMO_GOALS[clientId] || [];
}

/** Get demo insurance info for a client */
export function getDemoInsurance(clientId: string): CRInsurance | undefined {
  const client = DEMO_CLIENTS.find((c) => c.id === clientId);
  return client?.insuranceInfo;
}

/** Get demo home programs for a client */
export function getDemoHomePrograms(clientId: string): CRHomeProgram[] {
  return DEMO_HOME_PROGRAMS[clientId] || [];
}

/** Get all demo providers */
export function getDemoProviders(): DemoProvider[] {
  return DEMO_PROVIDERS;
}

/** Get a provider by ID */
export function getDemoProvider(providerId: string): DemoProvider | undefined {
  return DEMO_PROVIDERS.find((p) => p.id === providerId);
}

/**
 * Get a complete demo data snapshot for a client.
 * Useful for populating the entire dashboard at once.
 */
export function getDemoSnapshot(clientId: string): {
  client: CRClient | undefined;
  sessions: CRSession[];
  goals: CRGoal[];
  insurance: CRInsurance | undefined;
  homePrograms: CRHomeProgram[];
  provider: DemoProvider | undefined;
} {
  const client = getDemoClient(clientId);
  return {
    client,
    sessions: getDemoSessions(clientId),
    goals: getDemoGoals(clientId),
    insurance: getDemoInsurance(clientId),
    homePrograms: getDemoHomePrograms(clientId),
    provider: client
      ? getDemoProvider(client.primaryProviderId)
      : undefined,
  };
}

// ============================================================================
// Dev Tools Integration
// ============================================================================

// Expose demo mode toggle to browser console
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__enableCRDemo = enableDemoMode;
  (window as unknown as Record<string, unknown>).__disableCRDemo = disableDemoMode;
  (window as unknown as Record<string, unknown>).__getCRDemoData = getDemoSnapshot;
  (window as unknown as Record<string, unknown>).__getCRDemoClients = getDemoClients;
}
