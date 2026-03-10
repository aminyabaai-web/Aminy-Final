/**
 * Extended Junior Activities — 20 new activities across 4 tracks
 *
 * Speech (7): Consonant Clusters, Vowel Valley, Sentence Builder,
 *             Question Quest, Narrative Navigator, Articulation Arcade, Phoneme Phun
 * Social (5): Conversation Cards, Perspective Puzzle, Group Game Guide,
 *             Compliment Creator, Conflict Resolver
 * Sensory (4): Texture Explorer, Sound Sorting, Movement Maze, Sensory Story
 * Executive (4): Task Sequencer, Time Timer, Planning Puzzle, Working Memory Gym
 *
 * These are imported by junior-content-service.ts as the extended fallback set.
 */

import type { JuniorActivity } from '../lib/junior-content-service';

export const EXTENDED_ACTIVITIES: JuniorActivity[] = [
  // ===========================================================================
  // SPEECH TRACK (7 activities)
  // ===========================================================================
  {
    id: 'consonant-clusters',
    title: 'Consonant Clusters',
    description:
      'Tackle tricky consonant combos like "bl", "str", and "spl" with animated mouth guides. Each level adds harder clusters so you grow at your own pace.',
    icon: 'combine',
    duration: '5-8 min',
    skillType: 'speech',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Articulation',
  },
  {
    id: 'vowel-valley',
    title: 'Vowel Valley',
    description:
      'Explore the land of long and short vowels with silly characters. Match sounds, practice minimal pairs, and earn stars for clear pronunciation.',
    icon: 'mountain',
    duration: '5-7 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Phonological Awareness',
  },
  {
    id: 'sentence-builder',
    title: 'Sentence Builder',
    description:
      'Drag words into the right order to build sentences that make sense. Practices grammar, word order, and expressive language in a game format.',
    icon: 'text',
    duration: '6-10 min',
    skillType: 'speech',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Expressive Language',
  },
  {
    id: 'question-quest',
    title: 'Question Quest',
    description:
      'Learn to ask and answer who, what, where, when, and why questions. Adventure scenarios make each question type feel like a quest to solve.',
    icon: 'help-circle',
    duration: '7-10 min',
    skillType: 'speech',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Expressive Language',
  },
  {
    id: 'narrative-navigator',
    title: 'Narrative Navigator',
    description:
      'Build stories with a beginning, middle, and end using picture prompts. Strengthens sequencing, narrative structure, and creative language.',
    icon: 'book-open',
    duration: '8-12 min',
    skillType: 'speech',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'Narrative Skills',
  },
  {
    id: 'articulation-arcade',
    title: 'Articulation Arcade',
    description:
      'Earn points by clearly pronouncing target sounds in words, phrases, and sentences. Difficulty adapts as you play through arcade-style levels.',
    icon: 'gamepad-2',
    duration: '5-8 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Articulation',
  },
  {
    id: 'phoneme-phun',
    title: 'Phoneme Phun',
    description:
      'Isolate individual speech sounds with interactive games. Tap, trace, and say each phoneme while colorful feedback shows how close you are.',
    icon: 'mic',
    duration: '5-7 min',
    skillType: 'speech',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Articulation',
  },

  // ===========================================================================
  // SOCIAL TRACK (5 activities)
  // ===========================================================================
  {
    id: 'conversation-cards',
    title: 'Conversation Cards',
    description:
      'Practice starting, maintaining, and ending conversations with visual prompt cards. Real-world scenarios build confidence for school and play.',
    icon: 'message-circle',
    duration: '6-10 min',
    skillType: 'social',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Social Communication',
  },
  {
    id: 'perspective-puzzle',
    title: 'Perspective Puzzle',
    description:
      'Figure out what others might be thinking or feeling using story clues. Builds theory of mind and empathy through interactive puzzle scenes.',
    icon: 'eye',
    duration: '7-10 min',
    skillType: 'social',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: false,
    track: 'Social Problem-Solving',
  },
  {
    id: 'group-game-guide',
    title: 'Group Game Guide',
    description:
      'Learn turn-taking, sharing, and teamwork through simulated group play. Practice negotiation and cooperation in a safe, guided environment.',
    icon: 'users',
    duration: '8-12 min',
    skillType: 'social',
    level: 2,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Social Communication',
  },
  {
    id: 'compliment-creator',
    title: 'Compliment Creator',
    description:
      'Learn to give genuine compliments that make others feel good. Pick the right words and tone for different people and situations.',
    icon: 'heart',
    duration: '5-7 min',
    skillType: 'social',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Social Communication',
  },
  {
    id: 'conflict-resolver',
    title: 'Conflict Resolver',
    description:
      'Work through disagreements step by step with guided scenarios. Learn to stay calm, express feelings, and find fair solutions together.',
    icon: 'scale',
    duration: '8-12 min',
    skillType: 'social',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'Social Problem-Solving',
  },

  // ===========================================================================
  // SENSORY TRACK (4 activities)
  // ===========================================================================
  {
    id: 'texture-explorer',
    title: 'Texture Explorer',
    description:
      'Discover different textures through guided sensory play descriptions. Builds vocabulary for body sensations and sensory tolerance at your pace.',
    icon: 'hand',
    duration: '5-8 min',
    skillType: 'sensory',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Sensory Processing',
  },
  {
    id: 'sound-sorting',
    title: 'Sound Sorting',
    description:
      'Listen to everyday sounds and sort them by category, volume, or feeling. Builds auditory processing and helps manage sound sensitivity.',
    icon: 'headphones',
    duration: '5-7 min',
    skillType: 'sensory',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Sensory Processing',
  },
  {
    id: 'movement-maze',
    title: 'Movement Maze',
    description:
      'Follow movement prompts through a virtual maze: jump, stretch, spin, and balance. Combines proprioceptive input with cognitive planning.',
    icon: 'move',
    duration: '6-10 min',
    skillType: 'sensory',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Sensory Processing',
  },
  {
    id: 'sensory-story',
    title: 'Sensory Story',
    description:
      'Experience calming stories with built-in sensory breaks: deep breaths, gentle stretches, and mindful pauses woven into the narrative.',
    icon: 'wind',
    duration: '8-15 min',
    skillType: 'sensory',
    level: 0,
    sessionSize: 'extended',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Calm',
  },

  // ===========================================================================
  // EXECUTIVE FUNCTION TRACK (4 activities)
  // ===========================================================================
  {
    id: 'task-sequencer',
    title: 'Task Sequencer',
    description:
      'Put steps in the right order to complete everyday tasks like getting dressed or making a snack. Builds planning and sequential reasoning.',
    icon: 'list-ordered',
    duration: '5-8 min',
    skillType: 'executive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Executive Function',
  },
  {
    id: 'time-timer',
    title: 'Time Timer',
    description:
      'Practice estimating how long activities take using visual timers. Builds time awareness and helps with transitions between activities.',
    icon: 'timer',
    duration: '5-7 min',
    skillType: 'executive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Executive Function',
  },
  {
    id: 'planning-puzzle',
    title: 'Planning Puzzle',
    description:
      'Plan ahead to solve multi-step puzzles. Decide what to do first, second, and third before you start. Strengthens forward-thinking skills.',
    icon: 'puzzle',
    duration: '7-10 min',
    skillType: 'executive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Executive Function',
  },
  {
    id: 'working-memory-gym',
    title: 'Working Memory Gym',
    description:
      'Exercise your brain with memory matching, sequence recall, and pattern games. Each round gets slightly harder to stretch your working memory.',
    icon: 'brain',
    duration: '6-10 min',
    skillType: 'executive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Executive Function',
  },
];

export default EXTENDED_ACTIVITIES;
