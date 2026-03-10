/**
 * Junior Activities — Cognitive Skills (20 activities)
 *
 * Clinically informed for neurodivergent children (ASD, ADHD, intellectual disability).
 * Based on ABA discrete trial teaching, incidental teaching, and
 * cognitive developmental milestones (Piaget's stages adapted for
 * neurodivergent learning trajectories).
 *
 * Tracks:
 *   Matching — visual matching, auditory matching, concept matching
 *   Sorting & Categorizing — by attribute, function, class membership
 *   Pattern Recognition — visual patterns, number patterns, rule discovery
 *   Problem Solving — cause-and-effect, means-end, analogical reasoning
 *   Early Academics — letters, numbers, colors, shapes, basic math concepts
 */

import type { ExtendedJuniorActivity } from './junior-activity-types';

export const COGNITIVE_ACTIVITIES: ExtendedJuniorActivity[] = [
  // ---------------------------------------------------------------------------
  // MATCHING (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'cognitive-visual-match',
    title: 'Visual Match Master',
    description:
      'Match identical pictures, then progress to matching objects that look different but are the same thing (a photo of a dog to a drawing of a dog). Builds visual discrimination and abstract matching — a foundational ABA skill.',
    icon: 'eye',
    duration: '3-5 min',
    skillType: 'cognitive',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Matching',
  },
  {
    id: 'cognitive-sound-match',
    title: 'Sound Match',
    description:
      'Listen to two sounds and decide if they are the same or different. Environmental sounds (doorbell, dog bark), speech sounds (ba vs. pa), and musical tones. Builds auditory discrimination and phonological processing.',
    icon: 'headphones',
    duration: '3-5 min',
    skillType: 'cognitive',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Matching',
  },
  {
    id: 'cognitive-concept-match',
    title: 'Concept Match',
    description:
      'Match items by concept rather than appearance: a key matches a lock (function), a sun matches a light bulb (both give light), winter matches a coat (association). Builds relational thinking beyond surface features.',
    icon: 'puzzle',
    duration: '4-6 min',
    skillType: 'cognitive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Matching',
  },
  {
    id: 'cognitive-memory-match',
    title: 'Memory Match',
    description:
      'Classic card-flip memory game. Start with 4 pairs, progress to 12+. Themes include animals, foods, vehicles, and emotions. Timed mode for extra challenge. Builds visual memory and sustained attention.',
    icon: 'brain',
    duration: '3-6 min',
    skillType: 'cognitive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Matching',
  },

  // ---------------------------------------------------------------------------
  // SORTING & CATEGORIZING (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'cognitive-color-shape-sort',
    title: 'Color & Shape Sorter',
    description:
      'Sort objects by one attribute at a time: first by color (all reds together), then by shape (all circles together), then by size. Introduces systematic sorting as a foundation for classification skills.',
    icon: 'layers',
    duration: '3-5 min',
    skillType: 'cognitive',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Sorting & Categorizing',
  },
  {
    id: 'cognitive-category-kingdom',
    title: 'Category Kingdom',
    description:
      'Sort items into categories: animals vs. vehicles, foods vs. clothes, indoor vs. outdoor. Progress to subcategories: farm animals vs. zoo animals, fruits vs. vegetables. Builds hierarchical classification — critical for language and academics.',
    icon: 'layers',
    duration: '4-6 min',
    skillType: 'cognitive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Sorting & Categorizing',
  },
  {
    id: 'cognitive-odd-one-out',
    title: 'Odd One Out',
    description:
      'Find the item that does not belong and explain why. Apple, banana, car — the car is odd because it is not a fruit. Increases in subtlety: apple, banana, carrot — carrot is odd because it is a vegetable, not a fruit.',
    icon: 'eye',
    duration: '4-6 min',
    skillType: 'cognitive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Sorting & Categorizing',
  },
  {
    id: 'cognitive-multi-attribute-sort',
    title: 'Multi-Attribute Sorter',
    description:
      'Sort objects by two attributes simultaneously: big blue shapes in one box, small red shapes in another. Requires holding two rules in mind — a Venn diagram challenge for advanced categorization and working memory.',
    icon: 'layers',
    duration: '5-8 min',
    skillType: 'cognitive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Sorting & Categorizing',
  },

  // ---------------------------------------------------------------------------
  // PATTERN RECOGNITION (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'cognitive-ab-patterns',
    title: 'AB Patterns',
    description:
      'Create and extend simple repeating patterns: red-blue-red-blue, circle-square-circle-square. Then progress to ABB, ABC, and AABB patterns. Drag-and-drop interface with immediate feedback. Foundation for math patterning.',
    icon: 'puzzle',
    duration: '3-5 min',
    skillType: 'cognitive',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Pattern Recognition',
  },
  {
    id: 'cognitive-growing-patterns',
    title: 'Growing Patterns',
    description:
      'Patterns that change: 1-2-3 or 2-4-6 or getting bigger each time. Figure out the rule and predict the next item. Introduces mathematical growth patterns in a visual, accessible format for early learners.',
    icon: 'puzzle',
    duration: '4-6 min',
    skillType: 'cognitive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Pattern Recognition',
  },
  {
    id: 'cognitive-rule-detective',
    title: 'Rule Detective',
    description:
      'Discover the hidden rule sorting items. Why did these go together? Observe examples, form a hypothesis, test it. Builds inductive reasoning — the ability to derive general rules from specific examples.',
    icon: 'lightbulb',
    duration: '5-8 min',
    skillType: 'cognitive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Pattern Recognition',
  },
  {
    id: 'cognitive-matrix-puzzles',
    title: 'Matrix Puzzles',
    description:
      'Complete visual matrices where rows and columns follow rules. What goes in the missing cell? Simplified Raven-style progressive matrices for developing fluid reasoning — a core intelligence component.',
    icon: 'puzzle',
    duration: '5-8 min',
    skillType: 'cognitive',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: false,
    track: 'Pattern Recognition',
  },

  // ---------------------------------------------------------------------------
  // PROBLEM SOLVING (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'cognitive-cause-effect',
    title: 'Cause & Effect Lab',
    description:
      'Tap, press, drag to make things happen. Push the ball, it rolls. Turn the faucet, water flows. Builds understanding of cause-and-effect relationships through interactive experimentation with immediate visual feedback.',
    icon: 'zap',
    duration: '3-5 min',
    skillType: 'cognitive',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Problem Solving',
  },
  {
    id: 'cognitive-what-happens-next',
    title: 'What Happens Next?',
    description:
      'Predict outcomes from scenarios: What happens if you leave ice cream in the sun? What happens if you water a plant? Choose from multiple outcomes and see the result. Builds predictive reasoning and logical thinking.',
    icon: 'lightbulb',
    duration: '4-6 min',
    skillType: 'cognitive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Problem Solving',
  },
  {
    id: 'cognitive-tool-finder',
    title: 'Tool Finder',
    description:
      'Choose the right tool for the job: need to cut paper (scissors), need to eat soup (spoon), need to see far away (binoculars). Builds means-end reasoning and functional knowledge about objects and their uses.',
    icon: 'lightbulb',
    duration: '4-6 min',
    skillType: 'cognitive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Problem Solving',
  },
  {
    id: 'cognitive-logic-chains',
    title: 'Logic Chains',
    description:
      'If A leads to B, and B leads to C, then A leads to C. Build logical chains of reasoning with visual connectors. Start with 2-step chains, progress to 4-step. Develops deductive reasoning for academic readiness.',
    icon: 'brain',
    duration: '6-10 min',
    skillType: 'cognitive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Problem Solving',
  },

  // ---------------------------------------------------------------------------
  // EARLY ACADEMICS (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'cognitive-letter-land',
    title: 'Letter Land',
    description:
      'Explore the alphabet through multi-sensory activities: see the letter, hear its sound, trace its shape, find objects that start with it. Uppercase and lowercase pairing. Systematic phonics approach with visual supports.',
    icon: 'text',
    duration: '4-6 min',
    skillType: 'cognitive',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Early Academics',
  },
  {
    id: 'cognitive-number-neighborhood',
    title: 'Number Neighborhood',
    description:
      'Learn numbers 1-20 through counting, quantity matching, and number recognition. Count objects, match number to quantity, put numbers in order. Uses one-to-one correspondence with touchable objects for concrete understanding.',
    icon: 'star',
    duration: '4-6 min',
    skillType: 'cognitive',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Early Academics',
  },
  {
    id: 'cognitive-color-lab',
    title: 'Color Lab',
    description:
      'Identify, name, and sort colors. Start with primary colors (red, blue, yellow), then secondary (green, orange, purple), then extended palette. Mix virtual paints to discover new colors. Builds color vocabulary and visual discrimination.',
    icon: 'sparkles',
    duration: '3-5 min',
    skillType: 'cognitive',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Early Academics',
  },
  {
    id: 'cognitive-shape-world',
    title: 'Shape World',
    description:
      'Identify shapes in the real world: circles (wheels, clocks), squares (windows, books), triangles (rooftops, pizza slices). Build pictures using shapes. Progress to 3D shapes (sphere, cube, cylinder) and shape attributes (sides, corners).',
    icon: 'puzzle',
    duration: '4-6 min',
    skillType: 'cognitive',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Early Academics',
  },
];

export default COGNITIVE_ACTIVITIES;
