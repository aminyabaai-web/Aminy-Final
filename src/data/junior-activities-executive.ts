/**
 * Junior Activities — Executive Function (20 activities)
 *
 * Clinically informed for neurodivergent children (ASD, ADHD, sensory processing).
 * Based on Barkley's model of executive function, Smart but Scattered approach,
 * and ABA-based task analysis with visual supports.
 *
 * Tracks:
 *   Working Memory — sequence recall, pattern matching, mental manipulation
 *   Impulse Control — wait games, stop-and-think, response inhibition
 *   Flexible Thinking — multiple solutions, perspective-taking, cognitive flexibility
 *   Planning & Organization — step-by-step tasks, time management, prioritization
 *   Attention & Focus — sustained attention, selective attention, shifting attention
 */

import type { JuniorActivity } from '../lib/junior-content-service';

export const EXECUTIVE_ACTIVITIES: JuniorActivity[] = [
  // ---------------------------------------------------------------------------
  // WORKING MEMORY (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'exec-sequence-recall',
    title: 'Sequence Recall',
    description:
      'Remember and reproduce sequences that grow longer: colors (red, blue, green...), numbers (3, 7, 1...), and actions (clap, stomp, spin...). Start with 2-item sequences, progress to 6+. Visual and auditory modes available.',
    icon: 'brain',
    duration: '4-6 min',
    skillType: 'executive',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Working Memory',
  },
  {
    id: 'exec-pattern-matcher',
    title: 'Pattern Matcher',
    description:
      'Spot the pattern and predict what comes next. Shapes, colors, numbers, and mixed patterns with increasing complexity. Builds pattern recognition and working memory for holding sequences in mind.',
    icon: 'puzzle',
    duration: '4-6 min',
    skillType: 'executive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Working Memory',
  },
  {
    id: 'exec-backwards-challenge',
    title: 'Backwards Challenge',
    description:
      'Hear a sequence and repeat it backwards. Start with 2 numbers (hear 3-7, say 7-3), build to longer chains. This is the gold standard working memory exercise used in cognitive assessments, made into a game.',
    icon: 'brain',
    duration: '5-8 min',
    skillType: 'executive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Working Memory',
  },
  {
    id: 'exec-dual-task-juggler',
    title: 'Dual Task Juggler',
    description:
      'Hold one task in mind while doing another: remember the secret word while sorting shapes, or count the blue items while finding the hidden star. Builds the ability to manage competing cognitive demands.',
    icon: 'brain',
    duration: '6-10 min',
    skillType: 'executive',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: false,
    track: 'Working Memory',
  },

  // ---------------------------------------------------------------------------
  // IMPULSE CONTROL (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'exec-red-light-green-light',
    title: 'Red Light, Green Light',
    description:
      'Practice stop and go with increasing speed. Green means tap fast, red means freeze. Yellow means go slow. Builds response inhibition — the ability to stop a prepotent response. Timer tracks how long you can wait.',
    icon: 'activity',
    duration: '3-5 min',
    skillType: 'executive',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Impulse Control',
  },
  {
    id: 'exec-stop-and-think',
    title: 'Stop & Think Station',
    description:
      'Before you act, STOP (recognize the urge), THINK (what are my choices?), PLAN (pick the best one), DO (act on your plan). Practice the 4-step process with real-life scenarios: someone takes your toy, you want to shout in class.',
    icon: 'shield',
    duration: '4-6 min',
    skillType: 'executive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Impulse Control',
  },
  {
    id: 'exec-wait-warrior',
    title: 'Wait Warrior',
    description:
      'Build your waiting muscles! Start with 10-second waits, progress to 30, 60, and 120 seconds. Use strategies while waiting: count silently, think about something fun, take deep breaths. Visual timer with celebration at each milestone.',
    icon: 'timer',
    duration: '3-6 min',
    skillType: 'executive',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Impulse Control',
  },
  {
    id: 'exec-simon-says-pro',
    title: 'Simon Says Pro',
    description:
      'The classic impulse control game, enhanced with visual and auditory cues. Only do the action when Simon says. Advanced levels add distractors, speed changes, and conflicting instructions (Simon says touch your nose while touching your ear).',
    icon: 'gamepad-2',
    duration: '5-8 min',
    skillType: 'executive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Impulse Control',
  },

  // ---------------------------------------------------------------------------
  // FLEXIBLE THINKING (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'exec-multiple-solutions',
    title: 'Multiple Solutions Lab',
    description:
      'Every problem has more than one answer! Given a challenge (how to reach a high shelf, what to do when it rains), brainstorm 3+ solutions. Rate each for safety, kindness, and effectiveness. Builds cognitive flexibility.',
    icon: 'lightbulb',
    duration: '5-8 min',
    skillType: 'executive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Flexible Thinking',
  },
  {
    id: 'exec-plan-b-practice',
    title: 'Plan B Practice',
    description:
      'When Plan A does not work, you need a Plan B. Scenarios where the first plan fails: the store is closed, your friend is busy, it starts raining during a picnic. Practice shifting to backup plans without frustration.',
    icon: 'compass',
    duration: '5-8 min',
    skillType: 'executive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Flexible Thinking',
  },
  {
    id: 'exec-perspective-switch',
    title: 'Perspective Switch',
    description:
      'See the same situation from different viewpoints. How does the teacher see it? How does your friend see it? How does the new student see it? Practice theory of mind by literally switching seats in the scenario.',
    icon: 'eye',
    duration: '6-10 min',
    skillType: 'executive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Flexible Thinking',
  },
  {
    id: 'exec-rule-change-game',
    title: 'Rule Change Game',
    description:
      'Play a game where the rules change mid-game. Sorting by color? Now sort by shape! Going left to right? Now go right to left! Builds set-shifting ability — a core executive function deficit in ADHD and ASD.',
    icon: 'gamepad-2',
    duration: '5-8 min',
    skillType: 'executive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Flexible Thinking',
  },

  // ---------------------------------------------------------------------------
  // PLANNING & ORGANIZATION (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'exec-step-by-step',
    title: 'Step-by-Step Builder',
    description:
      'Break big tasks into small steps. Making a sandwich: get bread, spread peanut butter, add jelly, close it, cut it. Practice creating visual checklists for morning routine, homework, and chores. ABA task analysis format.',
    icon: 'list-ordered',
    duration: '5-8 min',
    skillType: 'executive',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Planning & Organization',
  },
  {
    id: 'exec-time-estimator',
    title: 'Time Estimator',
    description:
      'Guess how long tasks take, then check with a timer. Brushing teeth: 1 minute or 5 minutes? Walking to the mailbox: 30 seconds or 3 minutes? Builds time perception, which is often impaired in ADHD.',
    icon: 'timer',
    duration: '4-6 min',
    skillType: 'executive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Planning & Organization',
  },
  {
    id: 'exec-priority-picker',
    title: 'Priority Picker',
    description:
      'Given a list of tasks, decide which to do first, second, and third. Consider deadlines, importance, and difficulty. Use the "eat the frog" (hard first) and "quick win" (easy first) strategies and compare results.',
    icon: 'list-ordered',
    duration: '5-8 min',
    skillType: 'executive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Planning & Organization',
  },
  {
    id: 'exec-project-planner',
    title: 'Project Planner',
    description:
      'Plan a multi-day project: a science fair project, planning a birthday party, or packing for a trip. Break it into phases, assign time estimates, identify what you need, and create a visual timeline. Executive function capstone activity.',
    icon: 'puzzle',
    duration: '8-15 min',
    skillType: 'executive',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: false,
    track: 'Planning & Organization',
  },

  // ---------------------------------------------------------------------------
  // ATTENTION & FOCUS (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'exec-focus-finder',
    title: 'Focus Finder',
    description:
      'Find hidden objects in increasingly busy scenes. Start with 3 objects in a simple picture, progress to finding subtle details in complex environments. Builds sustained visual attention with natural reinforcement.',
    icon: 'eye',
    duration: '3-5 min',
    skillType: 'executive',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Attention & Focus',
  },
  {
    id: 'exec-listen-and-do',
    title: 'Listen & Do',
    description:
      'Follow auditory instructions while ignoring distractors. Tap the blue star — but background sounds try to distract you. Builds selective attention and the ability to filter out irrelevant information.',
    icon: 'headphones',
    duration: '4-6 min',
    skillType: 'executive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Attention & Focus',
  },
  {
    id: 'exec-attention-stretcher',
    title: 'Attention Stretcher',
    description:
      'Track a target that moves slowly across the screen. Start with 30-second sustained attention tasks, build to 2 minutes, then 5 minutes. Visual timers show progress. Celebrates focus duration milestones.',
    icon: 'timer',
    duration: '3-6 min',
    skillType: 'executive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Attention & Focus',
  },
  {
    id: 'exec-task-switcher',
    title: 'Task Switcher',
    description:
      'Practice switching between two tasks on command: sort shapes, then switch to counting dots, then back to shapes. Measures switch cost (the time you lose when changing tasks) and helps reduce it through practice.',
    icon: 'brain',
    duration: '5-8 min',
    skillType: 'executive',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Attention & Focus',
  },
];

export default EXECUTIVE_ACTIVITIES;
