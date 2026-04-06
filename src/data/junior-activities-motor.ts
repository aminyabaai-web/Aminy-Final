// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Junior Activities — Motor Skills (15 activities)
 *
 * Clinically informed for neurodivergent children (ASD, ADHD, DCD/dyspraxia).
 * Based on occupational therapy principles, Sensory Integration theory,
 * and motor learning approaches (practice variability, errorless learning).
 *
 * Tracks:
 *   Fine Motor — tracing, connecting dots, pinching, grasp strengthening
 *   Gross Motor — balance poses, crossing midline, bilateral coordination
 *   Visual-Motor — mazes, copying patterns, eye-hand coordination
 *   Handwriting Prep — letter formation, sizing, spacing, line adherence
 */

import type { ExtendedJuniorActivity } from './junior-activity-types';

export const MOTOR_ACTIVITIES: ExtendedJuniorActivity[] = [
  // ---------------------------------------------------------------------------
  // FINE MOTOR (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'motor-trace-and-follow',
    title: 'Trace & Follow',
    description:
      'Trace paths with your finger on screen: straight lines, curves, zigzags, and spirals. Paths get narrower as skill improves. Builds the precise finger control needed for writing, buttoning, and using utensils.',
    icon: 'hand',
    duration: '3-5 min',
    skillType: 'motor',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Fine Motor',
  },
  {
    id: 'motor-dot-connector',
    title: 'Dot Connector',
    description:
      'Connect numbered dots to reveal pictures. Start with 5 dots close together, progress to 20+ dots spread across the screen. Practices point-to-point accuracy, number sequencing, and sustained fine motor control.',
    icon: 'sparkles',
    duration: '3-5 min',
    skillType: 'motor',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Fine Motor',
  },
  {
    id: 'motor-pinch-and-place',
    title: 'Pinch & Place',
    description:
      'Use pinch gestures to pick up virtual objects and place them precisely. Sort beads by color into jars, place stickers on marked spots, stack virtual blocks. Targets pincer grasp and in-hand manipulation skills.',
    icon: 'hand',
    duration: '4-6 min',
    skillType: 'motor',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Fine Motor',
  },
  {
    id: 'motor-scissor-skills-sim',
    title: 'Scissor Skills Simulator',
    description:
      'Practice cutting along lines using touch gestures: straight cuts, curves, and complex shapes. Visual guides show where to cut. Builds the bilateral coordination and graded control needed for real scissors.',
    icon: 'hand',
    duration: '4-6 min',
    skillType: 'motor',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Fine Motor',
  },

  // ---------------------------------------------------------------------------
  // GROSS MOTOR (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'motor-balance-poses',
    title: 'Balance Poses',
    description:
      'Hold yoga-inspired balance poses: tree pose (one foot), airplane (one leg back), flamingo (eyes closed). Visual timer and animated guide show the pose. Builds vestibular processing, core strength, and body awareness.',
    icon: 'activity',
    duration: '3-5 min',
    skillType: 'motor',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Gross Motor',
  },
  {
    id: 'motor-crossing-midline',
    title: 'Crossing Midline Quest',
    description:
      'Reach your right hand to your left side and vice versa. Touch right hand to left knee, left hand to right ear, pass objects across your body. Critical for reading, writing, and bilateral coordination development.',
    icon: 'move',
    duration: '3-5 min',
    skillType: 'motor',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Gross Motor',
  },
  {
    id: 'motor-bilateral-beats',
    title: 'Bilateral Beats',
    description:
      'Coordinate both sides of your body together: clap right-left alternating, drum patterns on knees, do jumping jacks with rhythm. Progresses from symmetrical (same on both sides) to asymmetrical (different each side) movements.',
    icon: 'activity',
    duration: '4-6 min',
    skillType: 'motor',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Gross Motor',
  },
  {
    id: 'motor-obstacle-course',
    title: 'Virtual Obstacle Course',
    description:
      'Follow a guided obstacle course: jump over (stand and jump), crawl under (crouch down), balance on (stand on one foot), climb (reach up high). Combines multiple gross motor skills in a fun, sequenced challenge.',
    icon: 'move',
    duration: '5-8 min',
    skillType: 'motor',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Gross Motor',
  },

  // ---------------------------------------------------------------------------
  // VISUAL-MOTOR (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'motor-maze-runner',
    title: 'Maze Runner',
    description:
      'Navigate through mazes of increasing complexity using touch. Start with wide, simple paths and progress to narrow, multi-turn mazes. Builds visual-motor planning and spatial reasoning. Time challenges for advanced levels.',
    icon: 'compass',
    duration: '3-5 min',
    skillType: 'motor',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Visual-Motor',
  },
  {
    id: 'motor-copy-cat-patterns',
    title: 'Copy Cat Patterns',
    description:
      'See a pattern on the left, reproduce it on the right using touch. Start with simple shapes (circle, square), progress to multi-shape designs and dot grid patterns. Builds the visual-motor integration essential for copying from the board.',
    icon: 'puzzle',
    duration: '4-6 min',
    skillType: 'motor',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Visual-Motor',
  },
  {
    id: 'motor-catch-and-tap',
    title: 'Catch & Tap',
    description:
      'Tap falling objects as they reach a target zone. Speed and object size vary. Builds reaction time, eye-hand coordination, and visual tracking — foundational skills for ball sports and classroom activities.',
    icon: 'gamepad-2',
    duration: '3-5 min',
    skillType: 'motor',
    level: 1,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Visual-Motor',
  },
  {
    id: 'motor-design-studio',
    title: 'Design Studio',
    description:
      'Create designs using shape tools, drawing lines, and color fills. Free-form creative activity that builds visual-motor skills through purposeful, self-directed creation. Export designs to share with family.',
    icon: 'sparkles',
    duration: '5-10 min',
    skillType: 'motor',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Visual-Motor',
  },

  // ---------------------------------------------------------------------------
  // HANDWRITING PREP (3 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'motor-letter-formation',
    title: 'Letter Formation',
    description:
      'Learn to form uppercase and lowercase letters with animated stroke-order guides. Touch and trace each letter following numbered arrow cues. Based on Handwriting Without Tears approach — start with big letters, shrink progressively.',
    icon: 'text',
    duration: '4-6 min',
    skillType: 'motor',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Handwriting Prep',
  },
  {
    id: 'motor-sizing-lines',
    title: 'Sizing & Lines',
    description:
      'Practice writing letters that are the right size and sit on the line. Tall letters touch the top, small letters sit in the middle, tail letters hang below. Color-coded line guides and size feedback build proper letter proportion.',
    icon: 'text',
    duration: '4-6 min',
    skillType: 'motor',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Handwriting Prep',
  },
  {
    id: 'motor-word-writer',
    title: 'Word Writer',
    description:
      'Graduate from single letters to writing whole words. Practice high-frequency words (the, and, is) with spacing guides between letters. Includes name writing practice. Builds fluency and automaticity in handwriting.',
    icon: 'text',
    duration: '5-8 min',
    skillType: 'motor',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Handwriting Prep',
  },
];

export default MOTOR_ACTIVITIES;
