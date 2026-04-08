// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Discipline-Specific Treatment Goal Banks
 *
 * Pre-defined, evidence-based treatment goals organized by discipline.
 * Goals follow SMART criteria and include measurement specifications.
 */

export type Discipline = 'aba' | 'speech' | 'ot' | 'pt' | 'psychology' | 'developmental';

export type GoalDomain =
  | 'communication'
  | 'social'
  | 'behavior'
  | 'adaptive'
  | 'motor'
  | 'cognitive'
  | 'sensory'
  | 'emotional'
  | 'academic'
  | 'play';

export type AgeRange = 'early_childhood' | 'school_age' | 'adolescent' | 'all';

export interface TreatmentGoal {
  id: string;
  discipline: Discipline;
  domain: GoalDomain;
  ageRange: AgeRange;
  title: string;
  description: string;
  targetBehavior: string;
  baseline: string;
  criterion: string;
  measurementMethod: string;
  timeframe: string;
  shortTermObjectives: string[];
  materials?: string[];
  parentInvolvement?: string;
  tags: string[];
}

// ABA Goals - Applied Behavior Analysis
export const ABA_GOALS: TreatmentGoal[] = [
  // Communication
  {
    id: 'aba-comm-mand-001',
    discipline: 'aba',
    domain: 'communication',
    ageRange: 'early_childhood',
    title: 'Functional Manding',
    description: 'Child will independently request preferred items and activities using functional communication.',
    targetBehavior: 'Independently mand (request) for preferred items/activities using vocalization, sign, or AAC device',
    baseline: 'Current number of independent mands per session',
    criterion: '80% of opportunities across 3 consecutive sessions',
    measurementMethod: 'Frequency count during structured and natural environment sessions',
    timeframe: '3-6 months',
    shortTermObjectives: [
      'Child will mand for 5 different items when presented with a choice array with 80% accuracy',
      'Child will mand for attention using appropriate words/signs with 70% accuracy',
      'Child will mand for breaks during non-preferred activities with 80% accuracy'
    ],
    materials: ['Preferred items', 'AAC device if applicable', 'Reinforcer inventory'],
    parentInvolvement: 'Practice manding opportunities during daily routines (meals, play, transitions)',
    tags: ['manding', 'requests', 'functional communication', 'verbal behavior']
  },
  {
    id: 'aba-comm-tact-001',
    discipline: 'aba',
    domain: 'communication',
    ageRange: 'early_childhood',
    title: 'Tacting (Labeling)',
    description: 'Child will label items, actions, and attributes in their environment.',
    targetBehavior: 'Tact (label) objects, people, actions, and descriptors when asked "What is it?" or similar',
    baseline: 'Current number of items child can tact',
    criterion: 'Tact 50+ items/actions with 90% accuracy across settings',
    measurementMethod: 'Discrete trial data collection',
    timeframe: '6 months',
    shortTermObjectives: [
      'Tact 10 common objects with 80% accuracy',
      'Tact 5 actions (running, eating, sleeping) with 80% accuracy',
      'Tact 5 attributes (colors, sizes) with 80% accuracy',
      'Spontaneously tact items in natural environment'
    ],
    tags: ['tacting', 'labeling', 'receptive language', 'verbal behavior']
  },
  // Behavior Reduction
  {
    id: 'aba-beh-aggression-001',
    discipline: 'aba',
    domain: 'behavior',
    ageRange: 'all',
    title: 'Reduce Physical Aggression',
    description: 'Reduce instances of physical aggression through replacement behaviors and environmental modifications.',
    targetBehavior: 'Physical aggression defined as hitting, kicking, biting, scratching, or throwing objects at others',
    baseline: 'Average daily frequency of aggressive incidents',
    criterion: '80% reduction from baseline maintained for 4 consecutive weeks',
    measurementMethod: 'Frequency count with ABC data collection',
    timeframe: '3-6 months',
    shortTermObjectives: [
      'Identify and document maintaining function through FBA',
      'Teach and reinforce functionally equivalent replacement behavior',
      'Reduce aggression by 25% in first month',
      'Reduce aggression by 50% in second month',
      'Maintain at 80% reduction with fading of prompts'
    ],
    parentInvolvement: 'Implement behavior intervention plan consistently across home settings',
    tags: ['aggression', 'behavior reduction', 'FBA', 'replacement behavior']
  },
  {
    id: 'aba-beh-elopement-001',
    discipline: 'aba',
    domain: 'behavior',
    ageRange: 'all',
    title: 'Reduce Elopement',
    description: 'Decrease instances of elopement (leaving designated area without permission).',
    targetBehavior: 'Elopement defined as leaving designated safe area without adult permission or supervision',
    baseline: 'Weekly frequency of elopement attempts',
    criterion: 'Zero instances of successful elopement for 8 consecutive weeks',
    measurementMethod: 'Incident documentation with antecedent analysis',
    timeframe: '3-6 months',
    shortTermObjectives: [
      'Respond to "stop" command with 90% compliance',
      'Request to leave area appropriately using words/signs',
      'Demonstrate safe boundaries awareness',
      'Remain in designated area during transitions'
    ],
    parentInvolvement: 'Implement safety protocols and practice boundary awareness at home',
    tags: ['elopement', 'safety', 'compliance', 'boundaries']
  },
  // Social Skills
  {
    id: 'aba-social-play-001',
    discipline: 'aba',
    domain: 'social',
    ageRange: 'early_childhood',
    title: 'Cooperative Play Skills',
    description: 'Develop ability to engage in cooperative play with peers.',
    targetBehavior: 'Engage in turn-taking, sharing, and cooperative play activities with peers for extended periods',
    baseline: 'Current duration and quality of peer play interactions',
    criterion: 'Engage in cooperative play for 10+ minutes with 80% appropriate interactions',
    measurementMethod: 'Interval recording during peer play opportunities',
    timeframe: '6 months',
    shortTermObjectives: [
      'Tolerate proximity of peers during parallel play',
      'Share materials when prompted with 80% compliance',
      'Initiate play interactions with peers 3x per session',
      'Respond appropriately to peer initiations 80% of the time',
      'Take turns during structured games without aggression'
    ],
    tags: ['social skills', 'play skills', 'peer interaction', 'cooperation']
  },
  // Adaptive/Daily Living
  {
    id: 'aba-adaptive-toilet-001',
    discipline: 'aba',
    domain: 'adaptive',
    ageRange: 'early_childhood',
    title: 'Toilet Training',
    description: 'Achieve independent toileting for urination and bowel movements.',
    targetBehavior: 'Independently initiate going to bathroom, complete toileting routine, and return to activity',
    baseline: 'Current continence patterns and skill levels',
    criterion: '90% daytime continence with independent initiation for 4 consecutive weeks',
    measurementMethod: 'Hourly check data, accident log, independence level tracking',
    timeframe: '3-6 months',
    shortTermObjectives: [
      'Sit on toilet for 1-2 minutes without resistance',
      'Void in toilet when placed on schedule',
      'Signal need to use bathroom (verbal, sign, or PECS)',
      'Complete toileting sequence with minimal prompts',
      'Remain dry for 2-hour intervals'
    ],
    parentInvolvement: 'Consistent implementation of toileting schedule at home',
    tags: ['toilet training', 'adaptive skills', 'self-care', 'independence']
  }
];

// Speech-Language Therapy Goals
export const SPEECH_GOALS: TreatmentGoal[] = [
  {
    id: 'slp-artic-sounds-001',
    discipline: 'speech',
    domain: 'communication',
    ageRange: 'early_childhood',
    title: 'Articulation - Initial Consonants',
    description: 'Improve production of targeted speech sounds in initial word position.',
    targetBehavior: 'Correctly produce target sounds (/s/, /r/, /l/) in initial position of words',
    baseline: 'Percent correct production of target sounds',
    criterion: '80% accuracy in conversation across 3 sessions',
    measurementMethod: 'Articulation probe with structured word lists',
    timeframe: '6-12 months',
    shortTermObjectives: [
      'Produce target sound in isolation with 90% accuracy',
      'Produce target sound in CV and CVC syllables with 80% accuracy',
      'Produce target sound in single words with 80% accuracy',
      'Produce target sound in phrases with 70% accuracy',
      'Produce target sound in sentences with 70% accuracy'
    ],
    tags: ['articulation', 'speech sounds', 'phonology']
  },
  {
    id: 'slp-receptive-following-001',
    discipline: 'speech',
    domain: 'communication',
    ageRange: 'early_childhood',
    title: 'Following Directions',
    description: 'Improve ability to follow multi-step verbal directions.',
    targetBehavior: 'Follow 2-3 step directions containing basic concepts without repetition',
    baseline: 'Number of steps child can follow independently',
    criterion: '80% accuracy following 2-3 step directions across settings',
    measurementMethod: 'Task analysis during structured activities',
    timeframe: '3-6 months',
    shortTermObjectives: [
      'Follow 1-step novel directions with 90% accuracy',
      'Follow 2-step related directions with 80% accuracy',
      'Follow 2-step unrelated directions with 80% accuracy',
      'Follow directions with basic concepts (in, on, under) with 80% accuracy'
    ],
    parentInvolvement: 'Practice following directions during daily routines',
    tags: ['receptive language', 'following directions', 'auditory processing']
  },
  {
    id: 'slp-expressive-sentences-001',
    discipline: 'speech',
    domain: 'communication',
    ageRange: 'school_age',
    title: 'Sentence Formulation',
    description: 'Improve ability to formulate grammatically correct sentences.',
    targetBehavior: 'Produce grammatically correct sentences with subject-verb agreement and appropriate morphology',
    baseline: 'Mean Length of Utterance (MLU) and grammatical accuracy',
    criterion: 'Age-appropriate sentence structures with 80% grammatical accuracy',
    measurementMethod: 'Language sample analysis',
    timeframe: '6-12 months',
    shortTermObjectives: [
      'Use present progressive tense (-ing) with 80% accuracy',
      'Use regular past tense (-ed) with 80% accuracy',
      'Use plural forms (-s) with 80% accuracy',
      'Produce compound sentences using "and" with 70% accuracy',
      'Use appropriate pronouns with 80% accuracy'
    ],
    tags: ['expressive language', 'grammar', 'syntax', 'morphology']
  },
  {
    id: 'slp-social-conversation-001',
    discipline: 'speech',
    domain: 'social',
    ageRange: 'school_age',
    title: 'Conversational Skills',
    description: 'Improve pragmatic language skills for maintaining conversations.',
    targetBehavior: 'Initiate, maintain, and appropriately end conversations with peers and adults',
    baseline: 'Current conversational turn-taking and topic maintenance abilities',
    criterion: 'Maintain conversation for 5+ exchanges with appropriate topic maintenance 80% of opportunities',
    measurementMethod: 'Structured conversation probes and naturalistic observation',
    timeframe: '6 months',
    shortTermObjectives: [
      'Make eye contact during conversation 80% of the time',
      'Take conversational turns without interrupting with 80% success',
      'Stay on topic for 3+ exchanges with 80% success',
      'Ask relevant questions to maintain conversation',
      'Recognize and respond to conversation ending cues'
    ],
    tags: ['pragmatics', 'social communication', 'conversation', 'social skills']
  }
];

// Occupational Therapy Goals
export const OT_GOALS: TreatmentGoal[] = [
  {
    id: 'ot-fine-motor-grasp-001',
    discipline: 'ot',
    domain: 'motor',
    ageRange: 'early_childhood',
    title: 'Pencil Grasp Development',
    description: 'Develop age-appropriate pencil grasp for pre-writing and writing tasks.',
    targetBehavior: 'Demonstrate tripod or quadrupod grasp during writing tasks',
    baseline: 'Current grasp pattern and endurance',
    criterion: 'Maintain functional grasp for 5+ minutes of writing with 80% consistency',
    measurementMethod: 'Observation during writing tasks, grasp checklist',
    timeframe: '3-6 months',
    shortTermObjectives: [
      'Demonstrate appropriate grasp on thick writing tools',
      'Transfer grasp to standard pencil with adaptive grip',
      'Maintain grasp during short writing tasks (1-2 minutes)',
      'Produce legible letters with appropriate grasp'
    ],
    materials: ['Adaptive grips', 'Various writing tools', 'Writing worksheets'],
    tags: ['fine motor', 'handwriting', 'grasp', 'pre-writing']
  },
  {
    id: 'ot-sensory-regulation-001',
    discipline: 'ot',
    domain: 'sensory',
    ageRange: 'all',
    title: 'Sensory Self-Regulation',
    description: 'Develop strategies to maintain optimal arousal level throughout daily activities.',
    targetBehavior: 'Independently identify and use sensory strategies to achieve appropriate arousal level',
    baseline: 'Current sensory profile and regulation strategies',
    criterion: 'Independently implement sensory strategies with 80% effectiveness',
    measurementMethod: 'Sensory diet tracking, behavior observation',
    timeframe: '6 months',
    shortTermObjectives: [
      'Identify 3 calming strategies that are effective',
      'Identify 3 alerting strategies that are effective',
      'Request sensory breaks when needed with 70% independence',
      'Complete sensory diet activities with minimal prompting',
      'Generalize strategies across settings'
    ],
    parentInvolvement: 'Implement sensory diet activities throughout daily routines',
    tags: ['sensory processing', 'self-regulation', 'arousal', 'sensory diet']
  },
  {
    id: 'ot-adaptive-dressing-001',
    discipline: 'ot',
    domain: 'adaptive',
    ageRange: 'early_childhood',
    title: 'Independent Dressing',
    description: 'Achieve independence in dressing and undressing.',
    targetBehavior: 'Independently complete dressing routine including all fasteners',
    baseline: 'Current level of assistance needed for dressing tasks',
    criterion: 'Complete dressing independently with 90% accuracy within age-appropriate timeframe',
    measurementMethod: 'Task analysis with percentage independence',
    timeframe: '6 months',
    shortTermObjectives: [
      'Remove pull-on pants independently',
      'Put on pull-on pants independently',
      'Manage buttons on shirts with 80% accuracy',
      'Zip zippers after started by adult',
      'Tie shoes using adapted or traditional method'
    ],
    tags: ['dressing', 'adaptive skills', 'self-care', 'independence']
  },
  {
    id: 'ot-visual-motor-cutting-001',
    discipline: 'ot',
    domain: 'motor',
    ageRange: 'early_childhood',
    title: 'Scissor Skills',
    description: 'Develop functional scissor skills for classroom activities.',
    targetBehavior: 'Use scissors to cut along lines and shapes with accuracy',
    baseline: 'Current scissor skill level',
    criterion: 'Cut along curved and straight lines within 1/4 inch with 80% accuracy',
    measurementMethod: 'Work samples, task analysis',
    timeframe: '6 months',
    shortTermObjectives: [
      'Demonstrate correct scissor grasp',
      'Snip paper with control',
      'Cut fringe along paper edge',
      'Cut along straight lines within 1/2 inch',
      'Cut along curved lines within 1/4 inch',
      'Cut out basic shapes'
    ],
    materials: ['Training scissors', 'Various paper weights', 'Cutting worksheets'],
    tags: ['scissors', 'fine motor', 'visual motor', 'school readiness']
  }
];

// Psychology/Behavioral Health Goals
export const PSYCHOLOGY_GOALS: TreatmentGoal[] = [
  {
    id: 'psych-anxiety-coping-001',
    discipline: 'psychology',
    domain: 'emotional',
    ageRange: 'school_age',
    title: 'Anxiety Coping Strategies',
    description: 'Develop and utilize coping strategies for managing anxiety.',
    targetBehavior: 'Independently identify anxiety triggers and implement appropriate coping strategies',
    baseline: 'Current anxiety level (GAD-7) and coping strategy use',
    criterion: 'Demonstrate use of 3+ coping strategies with self-reported anxiety reduction',
    measurementMethod: 'GAD-7 scores, self-monitoring logs, behavioral observation',
    timeframe: '3-6 months',
    shortTermObjectives: [
      'Identify physical signs of anxiety in self',
      'Learn and practice deep breathing techniques',
      'Create personal coping toolkit',
      'Apply coping strategies in session with support',
      'Generalize coping strategies to home and school settings'
    ],
    parentInvolvement: 'Support practice of coping strategies at home, model calm responses',
    tags: ['anxiety', 'coping skills', 'emotional regulation', 'CBT']
  },
  {
    id: 'psych-emotion-id-001',
    discipline: 'psychology',
    domain: 'emotional',
    ageRange: 'early_childhood',
    title: 'Emotion Identification',
    description: 'Develop ability to identify and label emotions in self and others.',
    targetBehavior: 'Accurately identify and label basic and complex emotions',
    baseline: 'Number of emotions child can identify and label',
    criterion: 'Identify 8+ emotions in self and others with 80% accuracy',
    measurementMethod: 'Emotion identification tasks, naturalistic observation',
    timeframe: '3-6 months',
    shortTermObjectives: [
      'Identify happy, sad, angry, scared in pictures with 90% accuracy',
      'Label own emotions when asked with 80% accuracy',
      'Identify emotions in others based on facial expressions',
      'Connect emotions to situations (cause and effect)',
      'Identify complex emotions (frustrated, excited, worried)'
    ],
    tags: ['emotions', 'emotional intelligence', 'social emotional learning']
  },
  {
    id: 'psych-social-problem-001',
    discipline: 'psychology',
    domain: 'social',
    ageRange: 'school_age',
    title: 'Social Problem Solving',
    description: 'Develop skills to navigate social conflicts and challenges.',
    targetBehavior: 'Use structured problem-solving approach to resolve peer conflicts',
    baseline: 'Current social problem-solving skills assessment',
    criterion: 'Generate and implement appropriate solutions with 75% success rate',
    measurementMethod: 'Role-play assessments, real-world observation',
    timeframe: '6 months',
    shortTermObjectives: [
      'Identify the problem clearly',
      'Generate 2-3 possible solutions',
      'Evaluate consequences of each solution',
      'Select and implement best solution',
      'Evaluate outcome and adjust if needed'
    ],
    tags: ['social skills', 'problem solving', 'conflict resolution', 'peer relationships']
  }
];

// All goals combined for easy access
export const ALL_TREATMENT_GOALS: TreatmentGoal[] = [
  ...ABA_GOALS,
  ...SPEECH_GOALS,
  ...OT_GOALS,
  ...PSYCHOLOGY_GOALS
];

// Helper functions
export function getGoalsByDiscipline(discipline: Discipline): TreatmentGoal[] {
  return ALL_TREATMENT_GOALS.filter(g => g.discipline === discipline);
}

export function getGoalsByDomain(domain: GoalDomain): TreatmentGoal[] {
  return ALL_TREATMENT_GOALS.filter(g => g.domain === domain);
}

export function getGoalsByAgeRange(ageRange: AgeRange): TreatmentGoal[] {
  return ALL_TREATMENT_GOALS.filter(g => g.ageRange === ageRange || g.ageRange === 'all');
}

export function searchGoals(query: string): TreatmentGoal[] {
  const lowerQuery = query.toLowerCase();
  return ALL_TREATMENT_GOALS.filter(g =>
    g.title.toLowerCase().includes(lowerQuery) ||
    g.description.toLowerCase().includes(lowerQuery) ||
    g.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getGoalById(id: string): TreatmentGoal | undefined {
  return ALL_TREATMENT_GOALS.find(g => g.id === id);
}

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  aba: 'Applied Behavior Analysis (ABA)',
  speech: 'Speech-Language Therapy',
  ot: 'Occupational Therapy',
  pt: 'Physical Therapy',
  psychology: 'Psychology/Behavioral Health',
  developmental: 'Developmental Therapy'
};

export const DOMAIN_LABELS: Record<GoalDomain, string> = {
  communication: 'Communication',
  social: 'Social Skills',
  behavior: 'Behavior',
  adaptive: 'Adaptive/Daily Living',
  motor: 'Motor Skills',
  cognitive: 'Cognitive',
  sensory: 'Sensory Processing',
  emotional: 'Emotional Regulation',
  academic: 'Academic',
  play: 'Play Skills'
};

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  early_childhood: 'Early Childhood (0-5)',
  school_age: 'School Age (6-12)',
  adolescent: 'Adolescent (13-18)',
  all: 'All Ages'
};

export default {
  ALL_TREATMENT_GOALS,
  ABA_GOALS,
  SPEECH_GOALS,
  OT_GOALS,
  PSYCHOLOGY_GOALS,
  getGoalsByDiscipline,
  getGoalsByDomain,
  getGoalsByAgeRange,
  searchGoals,
  getGoalById,
  DISCIPLINE_LABELS,
  DOMAIN_LABELS,
  AGE_RANGE_LABELS
};
