/**
 * Speech-Language Pathology (SLP) Goal Tracking System
 *
 * Comprehensive tracking for:
 * - Articulation development
 * - Language (receptive/expressive)
 * - AAC (Augmentative and Alternative Communication) use
 * - Feeding therapy notes
 * - Fluency/stuttering
 * - Voice therapy
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SLPDomain =
  | 'articulation'
  | 'expressive-language'
  | 'receptive-language'
  | 'pragmatics'
  | 'aac'
  | 'fluency'
  | 'voice'
  | 'feeding'
  | 'phonological-awareness';

export type AccuracyLevel = 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;

export type PromptLevel =
  | 'independent'
  | 'verbal-cue'
  | 'gesture'
  | 'visual-model'
  | 'tactile'
  | 'full-physical';

export type CueingHierarchy =
  | 'independent'
  | 'indirect-model'
  | 'direct-model'
  | 'simultaneous'
  | 'delayed-imitation'
  | 'immediate-imitation';

// ============================================================================
// ARTICULATION TRACKING
// ============================================================================

export interface ArticulationSound {
  sound: string; // e.g., 's', 'r', 'th', 'l'
  position: 'initial' | 'medial' | 'final' | 'blends';
  currentAccuracy: AccuracyLevel;
  targetAccuracy: AccuracyLevel;
  level: 'isolation' | 'syllable' | 'word' | 'phrase' | 'sentence' | 'conversation';
  promptLevel: PromptLevel;
  notes?: string;
  lastPracticed?: string;
  masteryDate?: string;
}

export interface ArticulationProfile {
  childId: string;
  sounds: ArticulationSound[];
  primaryFocus: string[]; // Current target sounds
  secondaryFocus: string[]; // Sounds to generalize
  phonologicalProcesses?: string[]; // e.g., 'fronting', 'cluster reduction'
  stimulability: Record<string, boolean>;
  lastUpdated: string;
}

export const COMMON_SOUNDS = [
  // Early developing sounds (2-3 years)
  { sound: 'p', ageOfMastery: 3, category: 'early' },
  { sound: 'b', ageOfMastery: 3, category: 'early' },
  { sound: 'm', ageOfMastery: 3, category: 'early' },
  { sound: 'n', ageOfMastery: 3, category: 'early' },
  { sound: 'w', ageOfMastery: 3, category: 'early' },
  { sound: 'h', ageOfMastery: 3, category: 'early' },

  // Middle developing sounds (4-5 years)
  { sound: 't', ageOfMastery: 4, category: 'middle' },
  { sound: 'd', ageOfMastery: 4, category: 'middle' },
  { sound: 'k', ageOfMastery: 4, category: 'middle' },
  { sound: 'g', ageOfMastery: 4, category: 'middle' },
  { sound: 'f', ageOfMastery: 4, category: 'middle' },
  { sound: 'ng', ageOfMastery: 4, category: 'middle' },

  // Later developing sounds (5-7 years)
  { sound: 's', ageOfMastery: 5, category: 'later' },
  { sound: 'z', ageOfMastery: 5, category: 'later' },
  { sound: 'l', ageOfMastery: 6, category: 'later' },
  { sound: 'sh', ageOfMastery: 6, category: 'later' },
  { sound: 'ch', ageOfMastery: 6, category: 'later' },
  { sound: 'j', ageOfMastery: 6, category: 'later' },
  { sound: 'v', ageOfMastery: 6, category: 'later' },
  { sound: 'th (voiced)', ageOfMastery: 7, category: 'later' },
  { sound: 'th (voiceless)', ageOfMastery: 7, category: 'later' },
  { sound: 'r', ageOfMastery: 7, category: 'later' },
];

export const PHONOLOGICAL_PROCESSES = [
  { id: 'fronting', name: 'Fronting', description: 'Replacing back sounds (k, g) with front sounds (t, d)', typicalElimination: 3.5 },
  { id: 'stopping', name: 'Stopping', description: 'Replacing fricatives/affricates with stops', typicalElimination: 3.5 },
  { id: 'cluster-reduction', name: 'Cluster Reduction', description: 'Reducing consonant clusters to single consonant', typicalElimination: 4 },
  { id: 'final-consonant-deletion', name: 'Final Consonant Deletion', description: 'Omitting final consonant in words', typicalElimination: 3.5 },
  { id: 'weak-syllable-deletion', name: 'Weak Syllable Deletion', description: 'Omitting unstressed syllables', typicalElimination: 4 },
  { id: 'gliding', name: 'Gliding', description: 'Replacing liquids (l, r) with glides (w, y)', typicalElimination: 6 },
  { id: 'deaffrication', name: 'Deaffrication', description: 'Replacing affricates with fricatives', typicalElimination: 4 },
  { id: 'backing', name: 'Backing', description: 'Replacing front sounds with back sounds', typicalElimination: 3 },
];

// ============================================================================
// LANGUAGE TRACKING
// ============================================================================

export interface LanguageGoal {
  id: string;
  childId: string;
  domain: 'expressive' | 'receptive';
  skill: string; // e.g., 'following 2-step directions'
  baseline: AccuracyLevel;
  current: AccuracyLevel;
  target: AccuracyLevel;
  promptLevel: PromptLevel;
  context: 'structured' | 'semi-structured' | 'spontaneous';
  criterion: string; // e.g., '80% accuracy across 3 sessions'
  createdAt: string;
  updatedAt: string;
  notes: string[];
}

export const RECEPTIVE_LANGUAGE_SKILLS = [
  // Understanding - Early
  { id: 'follow-1step', name: 'Following 1-step directions', ageRange: '12-18mo', category: 'comprehension' },
  { id: 'follow-2step', name: 'Following 2-step directions', ageRange: '24-30mo', category: 'comprehension' },
  { id: 'follow-3step', name: 'Following 3-step directions', ageRange: '36-42mo', category: 'comprehension' },
  { id: 'identify-objects', name: 'Identifying common objects', ageRange: '12-18mo', category: 'vocabulary' },
  { id: 'identify-actions', name: 'Identifying action words', ageRange: '18-24mo', category: 'vocabulary' },
  { id: 'identify-categories', name: 'Identifying by category', ageRange: '30-36mo', category: 'vocabulary' },

  // Understanding - Complex
  { id: 'wh-questions', name: 'Answering WH questions', ageRange: '24-48mo', category: 'comprehension' },
  { id: 'temporal-concepts', name: 'Understanding time concepts', ageRange: '36-48mo', category: 'concepts' },
  { id: 'spatial-concepts', name: 'Understanding spatial concepts', ageRange: '24-36mo', category: 'concepts' },
  { id: 'sequencing', name: 'Understanding sequences/stories', ageRange: '42-60mo', category: 'narrative' },
  { id: 'inferencing', name: 'Making inferences', ageRange: '48-72mo', category: 'higher-order' },
];

export const EXPRESSIVE_LANGUAGE_SKILLS = [
  // Expression - Early
  { id: 'first-words', name: 'Using first words', ageRange: '12-18mo', category: 'vocabulary' },
  { id: 'word-combinations', name: 'Using 2-word combinations', ageRange: '18-24mo', category: 'syntax' },
  { id: '3-word-phrases', name: 'Using 3-word phrases', ageRange: '24-30mo', category: 'syntax' },
  { id: 'simple-sentences', name: 'Using simple sentences', ageRange: '30-36mo', category: 'syntax' },

  // Expression - Complex
  { id: 'complex-sentences', name: 'Using complex sentences', ageRange: '42-60mo', category: 'syntax' },
  { id: 'narratives', name: 'Telling simple narratives', ageRange: '42-60mo', category: 'narrative' },
  { id: 'describing', name: 'Describing objects/events', ageRange: '36-48mo', category: 'vocabulary' },
  { id: 'explaining', name: 'Explaining cause-effect', ageRange: '48-60mo', category: 'higher-order' },
  { id: 'conversation-turns', name: 'Maintaining conversation', ageRange: '36-48mo', category: 'pragmatics' },
];

// ============================================================================
// AAC TRACKING
// ============================================================================

export type AACSystem =
  | 'no-tech' // gestures, sign language
  | 'low-tech' // PECS, communication boards
  | 'mid-tech' // simple SGD
  | 'high-tech'; // tablet-based AAC

export type AACDevice =
  | 'proloquo2go'
  | 'lamp-words-for-life'
  | 'touch-chat'
  | 'speak-for-yourself'
  | 'td-snap'
  | 'coughdrop'
  | 'pecs'
  | 'manual-sign'
  | 'communication-board'
  | 'other';

export interface AACGoal {
  id: string;
  childId: string;
  device: AACDevice;
  systemLevel: AACSystem;

  // Core vocabulary tracking
  coreWordsTargeted: string[];
  coreWordsMastered: string[];
  fringeWordsAdded: string[];

  // Communicative functions
  functions: Array<{
    type: 'requesting' | 'commenting' | 'protesting' | 'greeting' | 'answering' | 'asking' | 'directing';
    currentLevel: AccuracyLevel;
    promptLevel: PromptLevel;
  }>;

  // Motor access
  motorAccessMethod: 'direct-touch' | 'keyguard' | 'eye-gaze' | 'switch-scanning' | 'head-tracking';
  motorAccuracyPercent: number;

  // Usage data
  averageUtterancesPerDay?: number;
  averageWordsPerUtterance?: number;

  lastUpdated: string;
  notes: string[];
}

export const CORE_VOCABULARY_STARTER = [
  // Most frequent words that work across contexts
  'more', 'help', 'stop', 'go', 'want', 'like', 'not', 'all done',
  'yes', 'no', 'I', 'you', 'it', 'that', 'what', 'where',
  'up', 'down', 'in', 'out', 'on', 'off', 'open', 'close',
  'eat', 'drink', 'play', 'look', 'get', 'make', 'put', 'turn',
  'big', 'little', 'hot', 'cold', 'good', 'bad', 'funny', 'different',
];

// ============================================================================
// FEEDING THERAPY
// ============================================================================

export type FeedingCategory =
  | 'oral-motor'
  | 'sensory'
  | 'behavioral'
  | 'swallowing'
  | 'self-feeding';

export interface FeedingGoal {
  id: string;
  childId: string;
  category: FeedingCategory;
  skill: string;
  currentLevel: AccuracyLevel;
  targetLevel: AccuracyLevel;

  // Texture progression
  currentTexture?: 'pureed' | 'mashed' | 'soft-mechanical' | 'soft' | 'regular';
  targetTexture?: 'pureed' | 'mashed' | 'soft-mechanical' | 'soft' | 'regular';

  // Tracking
  foodsAccepted: string[];
  foodsRefused: string[];
  newFoodsIntroduced: string[];

  lastUpdated: string;
  notes: string[];
}

export const FEEDING_SKILLS = [
  // Oral Motor
  { id: 'lip-closure', name: 'Lip closure during eating', category: 'oral-motor' },
  { id: 'lateral-tongue', name: 'Lateral tongue movement', category: 'oral-motor' },
  { id: 'chewing', name: 'Rotary chewing pattern', category: 'oral-motor' },

  // Sensory
  { id: 'texture-tolerance', name: 'Tolerating new textures', category: 'sensory' },
  { id: 'oral-exploration', name: 'Oral exploration of foods', category: 'sensory' },
  { id: 'temperature-variety', name: 'Accepting temperature variety', category: 'sensory' },

  // Behavioral
  { id: 'sitting-for-meals', name: 'Sitting for duration of meal', category: 'behavioral' },
  { id: 'accepting-new-foods', name: 'Accepting new foods on plate', category: 'behavioral' },
  { id: 'tasting-new-foods', name: 'Tasting new foods', category: 'behavioral' },

  // Self-Feeding
  { id: 'finger-feeding', name: 'Finger feeding', category: 'self-feeding' },
  { id: 'spoon-use', name: 'Using a spoon', category: 'self-feeding' },
  { id: 'fork-use', name: 'Using a fork', category: 'self-feeding' },
  { id: 'cup-drinking', name: 'Drinking from open cup', category: 'self-feeding' },
];

// ============================================================================
// FLUENCY (STUTTERING) TRACKING
// ============================================================================

export interface FluencyGoal {
  id: string;
  childId: string;

  // Fluency data
  stutteringTypes: Array<{
    type: 'sound-repetition' | 'syllable-repetition' | 'word-repetition' | 'prolongation' | 'block' | 'revision' | 'interjection';
    frequencyPerMinute: number;
    averageDuration?: number; // for prolongations/blocks
  }>;

  // Secondary behaviors
  secondaryBehaviors: string[];

  // Strategies
  strategiesTargeted: Array<{
    strategy: 'easy-onset' | 'light-contact' | 'slow-rate' | 'cancellation' | 'pullout' | 'breathing';
    usagePercent: AccuracyLevel;
    promptLevel: PromptLevel;
  }>;

  // Attitude
  communicationConfidence: 1 | 2 | 3 | 4 | 5;

  lastUpdated: string;
  notes: string[];
}

// ============================================================================
// SESSION DATA COLLECTION
// ============================================================================

export interface SLPSessionData {
  id: string;
  childId: string;
  sessionDate: string;
  duration: number; // minutes
  domains: SLPDomain[];

  // Articulation data
  articulationTrials?: Array<{
    sound: string;
    position: 'initial' | 'medial' | 'final' | 'blends';
    level: 'isolation' | 'syllable' | 'word' | 'phrase' | 'sentence' | 'conversation';
    trials: number;
    correct: number;
    promptLevel: PromptLevel;
  }>;

  // Language data
  languageTrials?: Array<{
    skill: string;
    domain: 'expressive' | 'receptive';
    trials: number;
    correct: number;
    promptLevel: PromptLevel;
    context: 'structured' | 'semi-structured' | 'spontaneous';
  }>;

  // AAC data
  aacData?: {
    totalUtterances: number;
    spontaneousUtterances: number;
    coreWordsUsed: string[];
    newWordsIntroduced: string[];
    communicativeFunctions: string[];
  };

  // Feeding data
  feedingData?: {
    foodsPresented: string[];
    foodsAccepted: string[];
    texturesTolerated: string[];
    selfFeedingAttempts: number;
    duration: number;
  };

  // General notes
  sessionNotes: string;
  parentCarryover: string[];
  nextSessionPlan: string;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate accuracy from trials
 */
export function calculateAccuracy(correct: number, total: number): AccuracyLevel {
  if (total === 0) return 0;
  const percent = Math.round((correct / total) * 100);
  return (Math.round(percent / 10) * 10) as AccuracyLevel;
}

/**
 * Get prompt level description
 */
export function getPromptLevelDescription(level: PromptLevel): string {
  const descriptions: Record<PromptLevel, string> = {
    'independent': 'No cues needed',
    'verbal-cue': 'Verbal reminder or hint',
    'gesture': 'Pointing or gestural cue',
    'visual-model': 'Visual demonstration',
    'tactile': 'Touch cue or physical prompt',
    'full-physical': 'Hand-over-hand assistance',
  };
  return descriptions[level];
}

/**
 * Get sounds appropriate for child's age
 */
export function getSoundsForAge(ageYears: number): typeof COMMON_SOUNDS {
  return COMMON_SOUNDS.filter((sound) => ageYears >= sound.ageOfMastery - 1);
}

/**
 * Generate progress summary for a domain
 */
export function generateDomainSummary(
  domain: SLPDomain,
  sessions: SLPSessionData[]
): {
  averageAccuracy: number;
  trend: 'improving' | 'stable' | 'declining';
  sessionCount: number;
} {
  const domainSessions = sessions.filter((s) => s.domains.includes(domain));

  if (domainSessions.length === 0) {
    return { averageAccuracy: 0, trend: 'stable', sessionCount: 0 };
  }

  // Calculate average accuracy based on domain
  let totalAccuracy = 0;
  let count = 0;

  domainSessions.forEach((session) => {
    if (domain === 'articulation' && session.articulationTrials) {
      session.articulationTrials.forEach((trial) => {
        totalAccuracy += calculateAccuracy(trial.correct, trial.trials);
        count++;
      });
    } else if (
      (domain === 'expressive-language' || domain === 'receptive-language') &&
      session.languageTrials
    ) {
      session.languageTrials.forEach((trial) => {
        if (
          (domain === 'expressive-language' && trial.domain === 'expressive') ||
          (domain === 'receptive-language' && trial.domain === 'receptive')
        ) {
          totalAccuracy += calculateAccuracy(trial.correct, trial.trials);
          count++;
        }
      });
    }
  });

  const averageAccuracy = count > 0 ? Math.round(totalAccuracy / count) : 0;

  // Calculate trend from last 5 sessions
  const recentSessions = domainSessions.slice(-5);
  let trend: 'improving' | 'stable' | 'declining' = 'stable';

  if (recentSessions.length >= 3) {
    // Simple trend calculation
    const firstHalf = recentSessions.slice(0, Math.floor(recentSessions.length / 2));
    const secondHalf = recentSessions.slice(Math.floor(recentSessions.length / 2));

    // This is simplified - would need more sophisticated trend analysis
    const diff = secondHalf.length - firstHalf.length;
    if (diff > 0) trend = 'improving';
    else if (diff < 0) trend = 'declining';
  }

  return {
    averageAccuracy,
    trend,
    sessionCount: domainSessions.length,
  };
}

// ============================================================================
// LOCAL STORAGE PERSISTENCE
// ============================================================================

const SLP_STORAGE_KEYS = {
  ARTICULATION: 'aminy_slp_articulation',
  LANGUAGE: 'aminy_slp_language',
  AAC: 'aminy_slp_aac',
  FEEDING: 'aminy_slp_feeding',
  FLUENCY: 'aminy_slp_fluency',
  SESSIONS: 'aminy_slp_sessions',
};

/**
 * Save articulation profile
 */
export function saveArticulationProfile(profile: ArticulationProfile): void {
  const profiles = JSON.parse(localStorage.getItem(SLP_STORAGE_KEYS.ARTICULATION) || '{}');
  profiles[profile.childId] = profile;
  localStorage.setItem(SLP_STORAGE_KEYS.ARTICULATION, JSON.stringify(profiles));
}

/**
 * Get articulation profile for a child
 */
export function getArticulationProfile(childId: string): ArticulationProfile | null {
  const profiles = JSON.parse(localStorage.getItem(SLP_STORAGE_KEYS.ARTICULATION) || '{}');
  return profiles[childId] || null;
}

/**
 * Save session data
 */
export function saveSLPSession(session: SLPSessionData): void {
  const sessions = JSON.parse(localStorage.getItem(SLP_STORAGE_KEYS.SESSIONS) || '[]');
  const index = sessions.findIndex((s: SLPSessionData) => s.id === session.id);

  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }

  localStorage.setItem(SLP_STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

/**
 * Get sessions for a child
 */
export function getSLPSessions(childId: string): SLPSessionData[] {
  const sessions = JSON.parse(localStorage.getItem(SLP_STORAGE_KEYS.SESSIONS) || '[]');
  return sessions.filter((s: SLPSessionData) => s.childId === childId);
}
