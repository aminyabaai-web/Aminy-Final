// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Junior Activities — Sensory Regulation (20 activities)
 *
 * Clinically informed for neurodivergent children (ASD, ADHD, sensory processing disorder).
 * Based on Sensory Integration (SI) theory, Zones of Regulation, and
 * Alert Program (How Does Your Engine Run?).
 *
 * Tracks:
 *   Calming Strategies — deep breathing, progressive muscle relaxation, body scan
 *   Alerting Activities — movement breaks, proprioceptive input, vestibular input
 *   Sensory Diet — fidget exercises, heavy work, tactile exploration
 *   Interoception — heart rate awareness, hunger/thirst, body signal detection
 */

import type { JuniorActivity } from '../lib/junior-content-service';

export const SENSORY_ACTIVITIES: JuniorActivity[] = [
  // ---------------------------------------------------------------------------
  // CALMING STRATEGIES (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'sensory-breathing-bubbles',
    title: 'Breathing Bubbles',
    description:
      'Blow virtual bubbles by breathing slowly. Inhale as the bubble grows, exhale as it floats away. Four breathing patterns: square breathing (4-4-4-4), triangle breathing (4-4-4), star breathing (5-point), and rainbow breathing. Visual pacing guide keeps rhythm steady.',
    icon: 'wind',
    duration: '2-5 min',
    skillType: 'sensory',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Calming Strategies',
  },
  {
    id: 'sensory-counting-calm',
    title: 'Counting Calm',
    description:
      'Use counting strategies to manage big feelings. Count backward from 10, count 5 things you can see, count your breaths, or count to a calm number. Multiple counting techniques paired with grounding visuals.',
    icon: 'timer',
    duration: '2-4 min',
    skillType: 'sensory',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Calming Strategies',
  },
  {
    id: 'sensory-body-scan-journey',
    title: 'Body Scan Journey',
    description:
      'Take a guided tour of your body from toes to head. Notice tension, temperature, and comfort in each area. Learn to identify where your body holds stress and practice releasing it with progressive muscle relaxation.',
    icon: 'activity',
    duration: '5-8 min',
    skillType: 'sensory',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Calming Strategies',
  },
  {
    id: 'sensory-safe-space-builder',
    title: 'Safe Space Builder',
    description:
      'Design your own virtual calm-down space. Choose lighting (dim, colorful, natural), sounds (rain, ocean, silence), textures (soft blanket, smooth stone), and objects (fidget, book, stuffy). Return to your space whenever you need to self-regulate.',
    icon: 'shield',
    duration: '5-10 min',
    skillType: 'sensory',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Calming Strategies',
  },

  // ---------------------------------------------------------------------------
  // ALERTING ACTIVITIES (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'sensory-energy-boost',
    title: 'Energy Boost Break',
    description:
      'Quick movement breaks to increase alertness: jumping jacks, arm circles, march in place, toe touches. Animated guide shows each movement with a timer. Great for low-energy moments or after long sitting periods.',
    icon: 'zap',
    duration: '2-4 min',
    skillType: 'sensory',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Alerting Activities',
  },
  {
    id: 'sensory-clap-rhythm',
    title: 'Clap & Rhythm',
    description:
      'Follow clapping patterns that increase in complexity. Start with simple clap-clap-clap, progress to syncopated rhythms, then add body percussion (knees, shoulders, stomp). Combines auditory processing with motor planning.',
    icon: 'hand',
    duration: '3-5 min',
    skillType: 'sensory',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Alerting Activities',
  },
  {
    id: 'sensory-animal-walks',
    title: 'Animal Walks',
    description:
      'Move like animals! Bear walk (heavy proprioceptive input), crab walk (core strength), frog jumps (vestibular input), penguin waddle (balance). Each animal movement targets a different sensory system with therapeutic benefit.',
    icon: 'move',
    duration: '4-6 min',
    skillType: 'sensory',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Alerting Activities',
  },
  {
    id: 'sensory-wall-pushups',
    title: 'Wall Push-Ups & Heavy Work',
    description:
      'Proprioceptive heavy work activities: wall push-ups, chair push-ups, carrying heavy books, pushing against a wall. These activities provide deep pressure input that helps organize the nervous system and improve focus.',
    icon: 'activity',
    duration: '3-5 min',
    skillType: 'sensory',
    level: 1,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Alerting Activities',
  },

  // ---------------------------------------------------------------------------
  // SENSORY DIET (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'sensory-fidget-fitness',
    title: 'Fidget Fitness',
    description:
      'Guided fidget exercises with purpose: squeeze a stress ball 10 times, roll putty between fingers, press palms together hard for 10 seconds. Teaches that fidgeting can be a tool for focus when done intentionally.',
    icon: 'hand',
    duration: '3-5 min',
    skillType: 'sensory',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Sensory Diet',
  },
  {
    id: 'sensory-texture-explorer',
    title: 'Texture Explorer',
    description:
      'Explore a virtual texture gallery: smooth, rough, bumpy, squishy, crunchy, soft. Describe how each texture feels and rate comfort level from 1 to 5. Builds tactile vocabulary and identifies sensory preferences.',
    icon: 'hand',
    duration: '4-6 min',
    skillType: 'sensory',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Sensory Diet',
  },
  {
    id: 'sensory-sound-volume-mixer',
    title: 'Sound Volume Mixer',
    description:
      'Learn to manage sound sensitivity by adjusting virtual volume sliders for different environments: classroom, cafeteria, gymnasium, library. Practice identifying which sounds are hard and build a sound comfort plan.',
    icon: 'headphones',
    duration: '4-6 min',
    skillType: 'sensory',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Sensory Diet',
  },
  {
    id: 'sensory-my-sensory-toolkit',
    title: 'My Sensory Toolkit',
    description:
      'Build your personal sensory toolkit. Choose calming tools (weighted lap pad, noise-canceling headphones), alerting tools (crunchy snack, cold water), and fidget tools (spinner, putty). Learn when to use each tool based on how your body feels.',
    icon: 'layers',
    duration: '6-10 min',
    skillType: 'sensory',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: false,
    track: 'Sensory Diet',
  },

  // ---------------------------------------------------------------------------
  // INTEROCEPTION (3 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'sensory-heartbeat-check',
    title: 'Heartbeat Check-In',
    description:
      'Find your heartbeat and count it. Is it fast or slow? Compare heart rate at rest vs. after jumping. Connect heart rate to feelings: fast heart might mean excited, nervous, or active. Builds interoceptive awareness.',
    icon: 'heart',
    duration: '3-5 min',
    skillType: 'sensory',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Interoception',
  },
  {
    id: 'sensory-hunger-thirst-detective',
    title: 'Hunger & Thirst Detective',
    description:
      'Learn to recognize body signals for hunger (tummy rumbling, feeling empty, low energy) and thirst (dry mouth, headache, feeling tired). Practice checking in with your body at regular intervals throughout the day.',
    icon: 'activity',
    duration: '3-5 min',
    skillType: 'sensory',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Interoception',
  },
  {
    id: 'sensory-body-signal-dashboard',
    title: 'Body Signal Dashboard',
    description:
      'Monitor your body signals with a visual dashboard: energy level (battery), comfort (temperature gauge), hunger (fuel tank), emotions (weather). Check each gauge and learn to respond to what your body is telling you. Builds comprehensive interoceptive literacy.',
    icon: 'activity',
    duration: '5-8 min',
    skillType: 'sensory',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'core',
    voiceReady: true,
    track: 'Interoception',
  },
];

export default SENSORY_ACTIVITIES;
