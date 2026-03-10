/**
 * Junior Activities — Speech & Language (20 activities)
 *
 * Clinically informed for neurodivergent children (ASD, ADHD, sensory processing).
 * Uses ABA principles: discrete trial format, natural environment teaching,
 * visual supports, and systematic prompt hierarchies.
 *
 * Tracks:
 *   Articulation — phoneme-level production (/s/, /r/, /l/, /th/)
 *   Receptive Language — following directions, identifying objects
 *   Expressive Language — sentence building, story sequencing
 *   Pragmatic Language — greetings, turn-taking, asking questions
 *   Phonological Awareness — rhyming, segmenting, blending
 */

import type { JuniorActivity } from '../lib/junior-content-service';

export const SPEECH_ACTIVITIES: JuniorActivity[] = [
  // ---------------------------------------------------------------------------
  // ARTICULATION (5 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'speech-s-sound-safari',
    title: 'S-Sound Safari',
    description:
      'Hunt for /s/ sounds in words, phrases, and sentences. Start with initial position (sun, soup), move to medial (basket, missing), then final (bus, grass). Visual mouth placement cues guide each trial.',
    icon: 'volume-2',
    duration: '3-5 min',
    skillType: 'speech',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Articulation',
  },
  {
    id: 'speech-r-rocket-launch',
    title: 'R-Rocket Launch',
    description:
      'Master the tricky /r/ sound across all positions. Animated tongue placement shows where your tongue goes. Practice prevocalic R (run), vocalic R (car, bird), and R-blends (green, tree) with visual feedback.',
    icon: 'zap',
    duration: '4-6 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Articulation',
  },
  {
    id: 'speech-l-light-explorer',
    title: 'L-Light Explorer',
    description:
      'Explore the /l/ sound with a flashlight adventure theme. Practice initial L (lamp, lake), medial L (balloon, pillow), and final L (ball, school). Tongue-tip-up visual cues with discrete trial repetition.',
    icon: 'lightbulb',
    duration: '3-5 min',
    skillType: 'speech',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Articulation',
  },
  {
    id: 'speech-th-treasure-hunt',
    title: 'TH Treasure Hunt',
    description:
      'Find the treasure by mastering voiced (/th/ in "the", "this") and voiceless (/th/ in "think", "three") sounds. Animated tongue-between-teeth placement guide with errorless learning scaffolds.',
    icon: 'compass',
    duration: '4-6 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Articulation',
  },
  {
    id: 'speech-blend-builder',
    title: 'Blend Builder Workshop',
    description:
      'Construct consonant blends step by step: /st/, /bl/, /gr/, /spl/, /str/. Break blends into component sounds, then combine. Uses systematic chaining from simple to complex clusters with visual block stacking.',
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

  // ---------------------------------------------------------------------------
  // RECEPTIVE LANGUAGE (5 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'speech-follow-the-leader',
    title: 'Follow the Leader',
    description:
      'Listen to 1-step, 2-step, and 3-step directions and follow them on screen. Tap the red circle, then drag the star to the box. Builds auditory comprehension with visual verification at each step.',
    icon: 'list-ordered',
    duration: '4-6 min',
    skillType: 'speech',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Receptive Language',
  },
  {
    id: 'speech-object-identifier',
    title: 'Object Identifier',
    description:
      'Identify objects by category, function, and attributes. "Show me something you wear on your feet." "Find the animal that lives in water." Builds vocabulary depth through feature, function, and class sorting.',
    icon: 'eye',
    duration: '3-5 min',
    skillType: 'speech',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Receptive Language',
  },
  {
    id: 'speech-concept-explorer',
    title: 'Concept Explorer',
    description:
      'Master spatial concepts (in, on, under, between), temporal concepts (first, last, before, after), and quantitative concepts (more, less, same). Interactive scenes with drag-and-drop verification.',
    icon: 'compass',
    duration: '5-7 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Receptive Language',
  },
  {
    id: 'speech-story-comprehension',
    title: 'Story Comprehension',
    description:
      'Listen to short narratives and answer who, what, where, when, and why questions. Stories feature relatable scenarios for neurodivergent children. Progressive complexity from concrete to inferential questions.',
    icon: 'book-open',
    duration: '6-10 min',
    skillType: 'speech',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Receptive Language',
  },
  {
    id: 'speech-multi-step-missions',
    title: 'Multi-Step Missions',
    description:
      'Complete complex 3-4 step directions with conditional elements: "If the star is blue, put it in the box. If it is red, put it on the shelf." Builds working memory and conditional reasoning in language.',
    icon: 'brain',
    duration: '6-10 min',
    skillType: 'speech',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'Receptive Language',
  },

  // ---------------------------------------------------------------------------
  // EXPRESSIVE LANGUAGE (5 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'speech-word-builder',
    title: 'Word Builder',
    description:
      'Expand vocabulary by naming items in categories (animals, foods, clothing), describing attributes (color, size, shape), and using new words in simple sentences. Visual word banks support retrieval.',
    icon: 'lightbulb',
    duration: '4-6 min',
    skillType: 'speech',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Expressive Language',
  },
  {
    id: 'speech-sentence-architect',
    title: 'Sentence Architect',
    description:
      'Build grammatically correct sentences by arranging word tiles. Start with subject-verb (dog runs), add objects (dog chases ball), then modifiers (big brown dog chases red ball). Color-coded parts of speech.',
    icon: 'text',
    duration: '5-8 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Expressive Language',
  },
  {
    id: 'speech-story-sequencer',
    title: 'Story Sequencer',
    description:
      'Arrange picture cards in the right order to tell a story. Practice beginning-middle-end structure with visual scene cards. Record yourself narrating the sequence for playback and self-monitoring.',
    icon: 'book-open',
    duration: '6-10 min',
    skillType: 'speech',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Expressive Language',
  },
  {
    id: 'speech-describe-it',
    title: 'Describe It!',
    description:
      'Describe mystery objects using feature analysis: category, function, parts, location, appearance. Build rich descriptions that help listeners identify what you mean. Supports circumlocution strategies.',
    icon: 'message-square',
    duration: '5-8 min',
    skillType: 'speech',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Expressive Language',
  },
  {
    id: 'speech-personal-narrative',
    title: 'Personal Narrative Builder',
    description:
      'Tell stories about your own experiences using visual scaffolds: Who was there? Where were you? What happened? How did you feel? Builds autobiographical narrative skills with structured prompts.',
    icon: 'message-circle',
    duration: '8-12 min',
    skillType: 'speech',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'Expressive Language',
  },

  // ---------------------------------------------------------------------------
  // PRAGMATIC LANGUAGE (5 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'speech-greeting-garden',
    title: 'Greeting Garden',
    description:
      'Practice greetings for different people and situations: waving hello to a friend, saying "good morning" to a teacher, introducing yourself to someone new. Visual social scripts with role-play practice.',
    icon: 'hand',
    duration: '3-5 min',
    skillType: 'speech',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Pragmatic Language',
  },
  {
    id: 'speech-conversation-coach',
    title: 'Conversation Coach',
    description:
      'Learn the back-and-forth of conversation with visual turn indicators. Practice topic initiation (starting a chat), topic maintenance (staying on subject), and topic closure (ending politely).',
    icon: 'message-circle',
    duration: '5-8 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Pragmatic Language',
  },
  {
    id: 'speech-question-quest',
    title: 'Question Quest',
    description:
      'Master asking and answering WH-questions in conversation. Learn when to ask who/what/where/when/why/how questions. Practice responding to questions with relevant information rather than tangential details.',
    icon: 'help-circle',
    duration: '5-8 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Pragmatic Language',
  },
  {
    id: 'speech-context-clue-detective',
    title: 'Context Clue Detective',
    description:
      'Read social situations and figure out what to say and do. Practice recognizing non-literal language (sarcasm, idioms, jokes), reading the room, and adjusting communication style for different audiences.',
    icon: 'eye',
    duration: '6-10 min',
    skillType: 'speech',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Pragmatic Language',
  },
  {
    id: 'speech-social-problem-solver',
    title: 'Social Problem Solver',
    description:
      'Navigate tricky social scenarios: someone cuts in line, a friend is upset, you need to join a group. Generate multiple solutions, evaluate consequences, and choose the best response with guided practice.',
    icon: 'scale',
    duration: '8-12 min',
    skillType: 'speech',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'Pragmatic Language',
  },
];

export default SPEECH_ACTIVITIES;
