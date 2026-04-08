// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Junior Activities — Emotional Regulation (15 activities)
 *
 * Clinically informed for neurodivergent children (ASD, ADHD, anxiety, ODD).
 * Based on Zones of Regulation (Leah Kuypers), Dialectical Behavior Therapy
 * skills adapted for children, Cognitive Behavioral Therapy (CBT) principles,
 * and ABA-based emotional self-management training.
 *
 * Tracks:
 *   Zones of Regulation — identifying your zone, strategies per zone
 *   Coping Skills — toolkit building, strategy selection, practice
 *   Anger Management — triggers, escalation awareness, de-escalation sequences
 *   Anxiety Management — worry box, thought challenging, exposure hierarchy
 *   Self-Advocacy — asking for help, requesting breaks, communicating needs
 */

import type { ExtendedJuniorActivity } from './junior-activity-types';

export const EMOTIONAL_ACTIVITIES: ExtendedJuniorActivity[] = [
  // ---------------------------------------------------------------------------
  // ZONES OF REGULATION (3 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'emotional-zone-checker',
    title: 'Zone Checker',
    description:
      'Identify which zone you are in right now. Blue zone (low energy, sad, tired), Green zone (calm, focused, happy), Yellow zone (frustrated, worried, excited), Red zone (angry, terrified, out of control). Body clues help you identify your zone.',
    icon: 'activity',
    duration: '3-5 min',
    skillType: 'emotional',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Zones of Regulation',
  },
  {
    id: 'emotional-zone-strategies',
    title: 'Zone Strategies Toolkit',
    description:
      'Learn specific strategies for each zone. Blue zone: stretch, get a drink, talk to a friend. Green zone: keep going, you are doing great. Yellow zone: deep breaths, take a break, use a fidget. Red zone: stop, count to 10, safe space. Build your personal strategy card.',
    icon: 'layers',
    duration: '5-8 min',
    skillType: 'emotional',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Zones of Regulation',
  },
  {
    id: 'emotional-zone-scenarios',
    title: 'Zone Scenarios',
    description:
      'Watch animated scenarios and identify which zone the character is in, then suggest a strategy. Someone bumps your arm while painting (Yellow). Your best friend moves away (Blue). You win a game (Green/Yellow). Practice applying zone knowledge to real situations.',
    icon: 'eye',
    duration: '6-10 min',
    skillType: 'emotional',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Zones of Regulation',
  },

  // ---------------------------------------------------------------------------
  // COPING SKILLS (3 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'emotional-coping-toolbox',
    title: 'My Coping Toolbox',
    description:
      'Build a personal toolbox of coping strategies organized by type: body tools (deep breaths, muscle squeeze), mind tools (positive self-talk, counting), social tools (ask for help, hug), and creative tools (draw, listen to music). Rate which ones work best for you.',
    icon: 'layers',
    duration: '5-8 min',
    skillType: 'emotional',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Coping Skills',
  },
  {
    id: 'emotional-calm-down-sequence',
    title: 'Calm Down Sequence',
    description:
      'Follow a guided 5-step calm-down sequence: 1) Notice you are upset (body signals), 2) Stop what you are doing, 3) Take 3 deep breaths, 4) Choose a coping tool, 5) Try again when ready. Repeated practice builds automaticity for real-life use.',
    icon: 'wind',
    duration: '3-5 min',
    skillType: 'emotional',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Coping Skills',
  },
  {
    id: 'emotional-size-of-the-problem',
    title: 'Size of the Problem',
    description:
      'Rate problems on a 1-5 scale: tiny problem (dropped pencil), small problem (someone is using the toy I want), medium problem (got a bad grade), big problem (someone is hurt), emergency (fire, danger). Match your reaction size to the problem size.',
    icon: 'scale',
    duration: '5-8 min',
    skillType: 'emotional',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Coping Skills',
  },

  // ---------------------------------------------------------------------------
  // ANGER MANAGEMENT (3 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'emotional-anger-thermometer',
    title: 'Anger Thermometer',
    description:
      'Track your anger from 1 (calm) to 10 (exploding). Identify your personal triggers (being told no, losing a game, being interrupted). Learn to catch anger at a 3-4 before it reaches 8-9-10. Early detection is the key skill.',
    icon: 'activity',
    duration: '4-6 min',
    skillType: 'emotional',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Anger Management',
  },
  {
    id: 'emotional-cool-down-corner',
    title: 'Cool Down Corner',
    description:
      'When anger is rising, visit the Cool Down Corner. Choose activities: squeeze ice (not real ice, visual imagining), do wall push-ups, tear paper, draw your anger, listen to calming sounds. Each option targets a different regulation pathway (sensory, motor, creative).',
    icon: 'wind',
    duration: '3-5 min',
    skillType: 'emotional',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Anger Management',
  },
  {
    id: 'emotional-anger-replay',
    title: 'Anger Replay',
    description:
      'After a tough moment, replay the situation step by step. What happened? How did you feel? What did you do? What could you do differently next time? Builds reflective processing and alternative response planning. CBT thought record adapted for children.',
    icon: 'brain',
    duration: '6-10 min',
    skillType: 'emotional',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Anger Management',
  },

  // ---------------------------------------------------------------------------
  // ANXIETY MANAGEMENT (3 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'emotional-worry-box',
    title: 'Worry Box',
    description:
      'Write or draw your worries and put them in a virtual worry box. Sort worries into things you can control (study harder) vs. things you cannot control (weather). Release the uncontrollable worries and make a plan for the controllable ones.',
    icon: 'layers',
    duration: '5-8 min',
    skillType: 'emotional',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Anxiety Management',
  },
  {
    id: 'emotional-thought-challenger',
    title: 'Thought Challenger',
    description:
      'Catch "worry thoughts" and challenge them with evidence. "Everyone will laugh at me" — Is that really true? Has everyone ever laughed? What actually happened last time? Replace with balanced thoughts. Simplified CBT cognitive restructuring for children.',
    icon: 'brain',
    duration: '6-10 min',
    skillType: 'emotional',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Anxiety Management',
  },
  {
    id: 'emotional-brave-steps',
    title: 'Brave Steps Ladder',
    description:
      'Build a fear ladder for something that makes you anxious: start with the least scary step and work up. Dog fear: look at dog pictures, watch dogs from far away, stand near a calm dog, pet a friendly dog. Graduated exposure hierarchy with celebration at each step.',
    icon: 'star',
    duration: '6-10 min',
    skillType: 'emotional',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Anxiety Management',
  },

  // ---------------------------------------------------------------------------
  // SELF-ADVOCACY (3 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'emotional-ask-for-help',
    title: 'Ask for Help',
    description:
      'Practice the steps of asking for help: 1) Try on your own first, 2) Identify what you need help with, 3) Find the right person, 4) Use words: "Excuse me, I need help with..." Practice in school, home, and community settings with visual scripts.',
    icon: 'hand',
    duration: '4-6 min',
    skillType: 'emotional',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Self-Advocacy',
  },
  {
    id: 'emotional-break-requester',
    title: 'Break Requester',
    description:
      'Learn to recognize when you need a break and how to ask for one appropriately. Practice scripts: "I need a break please," "Can I have 5 minutes?" Use a break card if verbal requests are hard. Know your body signals that say "I need space."',
    icon: 'timer',
    duration: '3-5 min',
    skillType: 'emotional',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Self-Advocacy',
  },
  {
    id: 'emotional-self-advocate',
    title: 'Self-Advocate Coach',
    description:
      'Learn to communicate your needs and accommodations: "The light is too bright for me, can I wear my sunglasses?" "I understand better when I can see pictures." "I need extra time for tests." Practice self-advocacy scripts for school, doctor visits, and social settings.',
    icon: 'message-circle',
    duration: '6-10 min',
    skillType: 'emotional',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Self-Advocacy',
  },
];

export default EMOTIONAL_ACTIVITIES;
