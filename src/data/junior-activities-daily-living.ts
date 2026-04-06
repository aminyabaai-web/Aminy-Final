// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Junior Activities — Daily Living Skills (15 activities)
 *
 * Clinically informed for neurodivergent children (ASD, ADHD, intellectual disability).
 * Based on ABA task analysis, video modeling, visual supports,
 * and functional skill acquisition research.
 *
 * Each activity uses systematic task analysis with forward or backward
 * chaining, visual step sequences, and embedded reinforcement.
 *
 * Tracks:
 *   Self-Care Routines — tooth brushing, hand washing, getting dressed, toileting
 *   Kitchen Skills — simple cooking, setting table, meal prep, cleanup
 *   Safety Awareness — traffic, stranger, fire, water, internet safety
 *   Community Skills — grocery store, library, playground, public transport
 */

import type { ExtendedJuniorActivity } from './junior-activity-types';

export const DAILY_LIVING_ACTIVITIES: ExtendedJuniorActivity[] = [
  // ---------------------------------------------------------------------------
  // SELF-CARE ROUTINES (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'daily-tooth-brushing',
    title: 'Tooth Brushing Champion',
    description:
      'Follow a step-by-step visual guide to brush teeth: wet brush, add toothpaste, brush top-right, top-left, bottom-right, bottom-left, front, tongue, rinse, spit. Built-in 2-minute timer with quadrant highlighting. Task analysis with forward chaining.',
    icon: 'star',
    duration: '3-5 min',
    skillType: 'daily-living',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Self-Care Routines',
  },
  {
    id: 'daily-hand-washing',
    title: 'Hand Washing Hero',
    description:
      'Master the 7-step hand washing routine: turn on water, wet hands, add soap, scrub palms, scrub backs, between fingers, under nails, rinse, dry. 20-second singing timer. Sensory-friendly tips for children who dislike the sensation.',
    icon: 'hand',
    duration: '2-4 min',
    skillType: 'daily-living',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Self-Care Routines',
  },
  {
    id: 'daily-getting-dressed',
    title: 'Getting Dressed Guide',
    description:
      'Learn the sequence for getting dressed: underwear first, then pants, shirt, socks, shoes. Choose weather-appropriate outfits (cold = jacket, hot = shorts). Visual first-then boards for each step. Accommodates different fastener types (buttons, zippers, velcro).',
    icon: 'layers',
    duration: '4-6 min',
    skillType: 'daily-living',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Self-Care Routines',
  },
  {
    id: 'daily-morning-routine',
    title: 'Morning Routine Builder',
    description:
      'Create and practice your personalized morning routine: wake up, use bathroom, wash face, brush teeth, get dressed, eat breakfast, pack backpack. Drag steps into your preferred order, then follow along each morning with a visual checklist.',
    icon: 'list-ordered',
    duration: '5-8 min',
    skillType: 'daily-living',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Self-Care Routines',
  },

  // ---------------------------------------------------------------------------
  // KITCHEN SKILLS (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'daily-simple-snack',
    title: 'Simple Snack Maker',
    description:
      'Learn to make simple snacks step by step: spread peanut butter on bread, pour cereal and milk, cut a banana with a butter knife, make a trail mix. Safety-first approach with visual cues for knife safety, pouring, and cleanup.',
    icon: 'star',
    duration: '5-8 min',
    skillType: 'daily-living',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Kitchen Skills',
  },
  {
    id: 'daily-table-setter',
    title: 'Table Setter',
    description:
      'Set the table correctly: placemat, plate in center, fork on left, knife and spoon on right, cup above the knife, napkin under the fork. Visual template overlay guides placement. Builds spatial reasoning and household responsibility.',
    icon: 'layers',
    duration: '3-5 min',
    skillType: 'daily-living',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Kitchen Skills',
  },
  {
    id: 'daily-cleanup-crew',
    title: 'Cleanup Crew',
    description:
      'Practice cleaning up after activities: clear plate after eating, wipe table, put toys in bins, put books on shelf. Sorting items by where they belong. "Everything has a home" organization principle with visual labels.',
    icon: 'list-ordered',
    duration: '4-6 min',
    skillType: 'daily-living',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Kitchen Skills',
  },
  {
    id: 'daily-recipe-follower',
    title: 'Recipe Follower',
    description:
      'Follow visual recipes with picture-based instructions: making a smoothie (add banana, add yogurt, add berries, blend), making a sandwich (bread, cheese, lettuce, bread). Builds sequencing and independent living skills for older children.',
    icon: 'list-ordered',
    duration: '6-10 min',
    skillType: 'daily-living',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Kitchen Skills',
  },

  // ---------------------------------------------------------------------------
  // SAFETY AWARENESS (4 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'daily-traffic-safety',
    title: 'Traffic Safety School',
    description:
      'Learn traffic safety rules: stop at red lights, look both ways before crossing, walk on sidewalks, hold an adult hand in parking lots. Interactive street scenes where you make safe choices. Real-world generalizable safety rules.',
    icon: 'shield',
    duration: '4-6 min',
    skillType: 'daily-living',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Safety Awareness',
  },
  {
    id: 'daily-stranger-safety',
    title: 'Stranger Safety',
    description:
      'Practice identifying safe vs. unsafe situations with strangers. Know your safe adults, learn to say "no" firmly, practice walking away and telling a trusted adult. Social stories with clear rules that do not cause unnecessary fear.',
    icon: 'shield',
    duration: '5-8 min',
    skillType: 'daily-living',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Safety Awareness',
  },
  {
    id: 'daily-fire-safety',
    title: 'Fire Safety Hero',
    description:
      'Learn fire safety: stop-drop-roll, crawl under smoke, find exits, meeting spot outside, call 911. Practice a fire escape plan for your home. Uses visual social narratives to build safety knowledge without causing anxiety.',
    icon: 'shield',
    duration: '4-6 min',
    skillType: 'daily-living',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Safety Awareness',
  },
  {
    id: 'daily-personal-info',
    title: 'Personal Info Card',
    description:
      'Learn and practice reciting essential personal information: full name, parent names, phone number, home address. Practice saying this information to trusted adults in emergency scenarios. Discrete trial format with mastery criteria.',
    icon: 'shield',
    duration: '4-6 min',
    skillType: 'daily-living',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Safety Awareness',
  },

  // ---------------------------------------------------------------------------
  // COMMUNITY SKILLS (3 activities)
  // ---------------------------------------------------------------------------
  {
    id: 'daily-grocery-store',
    title: 'Grocery Store Adventure',
    description:
      'Navigate a virtual grocery store: follow a picture shopping list, find items on shelves, put them in the cart, wait in line, pay (with visual money). Builds community independence and functional math skills.',
    icon: 'compass',
    duration: '6-10 min',
    skillType: 'daily-living',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'core',
    voiceReady: true,
    track: 'Community Skills',
  },
  {
    id: 'daily-library-visit',
    title: 'Library Visit',
    description:
      'Practice library social skills and routines: use a quiet voice, find books on shelves, use the self-checkout, return books on time, ask the librarian for help. Interactive social story with embedded skill practice.',
    icon: 'book-open',
    duration: '5-8 min',
    skillType: 'daily-living',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Community Skills',
  },
  {
    id: 'daily-playground-rules',
    title: 'Playground Rules',
    description:
      'Learn playground safety and social rules: take turns on equipment, go down the slide feet first, keep hands to yourself, include others in play. Scenario-based decision making with visual rule cards for playground success.',
    icon: 'users',
    duration: '4-6 min',
    skillType: 'daily-living',
    level: 0,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Community Skills',
  },
];

export default DAILY_LIVING_ACTIVITIES;
