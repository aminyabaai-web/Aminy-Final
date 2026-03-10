/**
 * Junior Activities — Social Skills (20 activities)
 *
 * Clinically informed for neurodivergent children (ASD, ADHD, sensory processing).
 * Uses ABA principles: discrete trial format, natural environment teaching,
 * visual supports, Social Thinking methodology, and video modeling concepts.
 *
 * Tracks:
 *   Emotion Recognition — facial expressions, body language, tone of voice
 *   Social Stories — playground, classroom, restaurant, community scenarios
 *   Conversation Skills — topic maintenance, reciprocity, active listening
 *   Friendship Skills — sharing, cooperating, compromising, conflict resolution
 *   Perspective Taking — theory of mind, empathy, point-of-view awareness
 */

import type { JuniorActivity } from '../lib/junior-content-service';

export const SOCIAL_ACTIVITIES: JuniorActivity[] = [
  // ---------------------------------------------------------------------------
  // EMOTION RECOGNITION (5 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'social-face-detective',
    title: 'Face Detective',
    description:
      'Identify emotions from facial expressions: happy, sad, angry, scared, surprised, disgusted, confused. Match faces to feelings with increasing subtlety. Includes real-photo and illustrated faces for generalization.',
    icon: 'eye',
    duration: '3-5 min',
    skillType: 'social',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Emotion Recognition',
  },
  {
    id: 'social-body-language-reader',
    title: 'Body Language Reader',
    description:
      'Read body language clues to figure out how someone feels: crossed arms, slouching, bouncing, clenched fists. Connect postures to emotions and learn that bodies give signals before words do.',
    icon: 'activity',
    duration: '4-6 min',
    skillType: 'social',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Emotion Recognition',
  },
  {
    id: 'social-tone-decoder',
    title: 'Tone Decoder',
    description:
      'Listen to the same sentence said in different tones: happy, sarcastic, angry, questioning, excited. Match the tone to the intended meaning. Builds prosody comprehension for children who miss tonal cues.',
    icon: 'headphones',
    duration: '4-6 min',
    skillType: 'social',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Emotion Recognition',
  },
  {
    id: 'social-emotion-thermometer',
    title: 'Emotion Thermometer',
    description:
      'Rate emotion intensity from 1 to 5 using a visual thermometer. A little annoyed vs. furious. Slightly nervous vs. terrified. Builds emotional granularity and helps with proportional responses.',
    icon: 'activity',
    duration: '3-5 min',
    skillType: 'social',
    level: 1,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Emotion Recognition',
  },
  {
    id: 'social-mixed-signals',
    title: 'Mixed Signals',
    description:
      'When someone says "I am fine" but looks sad, which message is true? Practice detecting mismatches between verbal and non-verbal communication. Advanced emotion recognition for nuanced social reading.',
    icon: 'eye',
    duration: '6-10 min',
    skillType: 'social',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'Emotion Recognition',
  },

  // ---------------------------------------------------------------------------
  // SOCIAL STORIES (5 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'social-playground-navigator',
    title: 'Playground Navigator',
    description:
      'Navigate common playground scenarios: asking to join a game, waiting for a turn on the swing, handling it when someone says no. Interactive social stories with choice points and consequence previews.',
    icon: 'users',
    duration: '5-8 min',
    skillType: 'social',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Social Stories',
  },
  {
    id: 'social-classroom-champion',
    title: 'Classroom Champion',
    description:
      'Practice classroom social skills: raising your hand, working with a partner, handling transitions, managing unexpected changes to the schedule. Structured social narratives with visual cue cards.',
    icon: 'book-open',
    duration: '5-8 min',
    skillType: 'social',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Social Stories',
  },
  {
    id: 'social-restaurant-ready',
    title: 'Restaurant Ready',
    description:
      'Prepare for restaurant visits: ordering food, using an inside voice, waiting for food to arrive, handling sensory challenges (noise, smells). Social story format with embedded coping strategies.',
    icon: 'star',
    duration: '5-8 min',
    skillType: 'social',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Social Stories',
  },
  {
    id: 'social-birthday-party-prep',
    title: 'Birthday Party Prep',
    description:
      'Navigate birthday party social expectations: giving gifts, playing group games, handling loud noises and surprises, saying thank you, managing overstimulation. Includes a pre-party checklist and calm-down plan.',
    icon: 'sparkles',
    duration: '6-10 min',
    skillType: 'social',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'core',
    voiceReady: true,
    track: 'Social Stories',
  },
  {
    id: 'social-community-explorer',
    title: 'Community Explorer',
    description:
      'Practice social skills in community settings: library (quiet voice, returning books), grocery store (staying close, waiting in line), doctor visit (answering questions, being patient). Multiple scenarios unlock progressively.',
    icon: 'compass',
    duration: '8-12 min',
    skillType: 'social',
    level: 2,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Social Stories',
  },

  // ---------------------------------------------------------------------------
  // CONVERSATION SKILLS (5 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'social-topic-train',
    title: 'Topic Train',
    description:
      'Keep the conversation on track! The topic train stays on the rails when you add related comments and questions. Learn to notice when a conversation derails and how to bring it back on topic.',
    icon: 'message-circle',
    duration: '5-8 min',
    skillType: 'social',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Conversation Skills',
  },
  {
    id: 'social-active-listener',
    title: 'Active Listener',
    description:
      'Practice the skills of a good listener: making eye contact (or looking toward the speaker), nodding, saying "mm-hmm", waiting for a pause before talking. Visual turn-indicators show whose turn it is.',
    icon: 'headphones',
    duration: '4-6 min',
    skillType: 'social',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Conversation Skills',
  },
  {
    id: 'social-question-asker',
    title: 'Question Asker',
    description:
      'Learn to show interest by asking follow-up questions. Someone says "I went to the beach" — what could you ask? Builds reciprocal conversation skills with visual question-stem cards.',
    icon: 'help-circle',
    duration: '5-7 min',
    skillType: 'social',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Conversation Skills',
  },
  {
    id: 'social-conversation-repair',
    title: 'Conversation Repair Shop',
    description:
      'Fix conversation breakdowns: what to do when someone does not understand you, when you do not understand them, when you accidentally interrupt, or when there is an awkward silence. Practical repair strategies.',
    icon: 'message-square',
    duration: '6-10 min',
    skillType: 'social',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Conversation Skills',
  },
  {
    id: 'social-group-chat-navigator',
    title: 'Group Chat Navigator',
    description:
      'Navigate group conversations with 3 or more people. Learn to find an entry point, take turns without dominating, include quieter people, and handle multiple conversation threads. Advanced social pragmatics.',
    icon: 'users',
    duration: '8-12 min',
    skillType: 'social',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'Conversation Skills',
  },

  // ---------------------------------------------------------------------------
  // FRIENDSHIP SKILLS (5 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'social-sharing-station',
    title: 'Sharing Station',
    description:
      'Practice sharing toys, materials, and space with visual timers and turn-taking boards. Learn the difference between sharing (both use it), taking turns (one at a time), and trading (swap items). Errorless learning scaffolds.',
    icon: 'heart',
    duration: '3-5 min',
    skillType: 'social',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Friendship Skills',
  },
  {
    id: 'social-cooperation-quest',
    title: 'Cooperation Quest',
    description:
      'Work together to solve challenges that need two people: one holds the bridge while the other crosses, one reads the map while the other navigates. Builds collaborative problem-solving and joint attention.',
    icon: 'users',
    duration: '6-10 min',
    skillType: 'social',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Friendship Skills',
  },
  {
    id: 'social-compromise-coach',
    title: 'Compromise Coach',
    description:
      'Two friends want different things — how do you find a solution that works for both? Practice the steps of compromise: state what you want, listen to the other person, brainstorm options, agree on a plan.',
    icon: 'scale',
    duration: '5-8 min',
    skillType: 'social',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Friendship Skills',
  },
  {
    id: 'social-kindness-challenges',
    title: 'Kindness Challenges',
    description:
      'Complete daily kindness missions: give a compliment, help someone carry something, include someone who is alone, write a thank-you note. Track your kindness streak and see how it makes others feel.',
    icon: 'heart',
    duration: '3-5 min',
    skillType: 'social',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Friendship Skills',
  },
  {
    id: 'social-boundary-builder',
    title: 'Boundary Builder',
    description:
      'Learn to set and respect personal boundaries. Practice saying "I need space right now" and respecting when others need space. Understand that good friends honor each other limits. Visual boundary zones and scripts.',
    icon: 'shield',
    duration: '6-10 min',
    skillType: 'social',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Friendship Skills',
  },
];

export default SOCIAL_ACTIVITIES;
