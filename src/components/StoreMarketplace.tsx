// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * StoreMarketplace - Curated Resources & Tools Store
 *
 * Features:
 * - Curated resources for parents (books, tools, toys)
 * - Partner product recommendations
 * - Digital downloads (guides, templates, checklists)
 * - Affiliate integration ready
 * - Category filtering and search
 * - Favorites/wishlist functionality
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Heart,
  ShoppingCart,
  ExternalLink,
  Star,
  BookOpen,
  Puzzle,
  Headphones,
  FileText,
  Video,
  Package,
  Tag,
  ChevronDown,
  X,
  Check,
  Download,
  Crown,
  Sparkles,
  ArrowLeft,
  MessageCircle,
  Wind,
  Gift,
  Zap,
  Shield,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { TierType } from '../lib/tier-utils';
import { supabase } from '../utils/supabase/client';
import { isDemoMode } from '../lib/demo-seed';

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number | 'free' | 'included';
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  affiliateUrl?: string;
  downloadUrl?: string;
  isDigital: boolean;
  isPremium: boolean;
  isNew: boolean;
  isFeatured: boolean;
  bcbaRecommended: boolean;
  hsaFsaEligible?: boolean;
  recommendedAgeRange?: string;
  matchesChildNeeds?: boolean;
}

interface ChildProfile {
  name: string;
  age: number;
  diagnoses: string[];
  treatmentGoals?: string[];
}

const WISHLIST_STORAGE_KEY = 'aminy.store.wishlist';

type ProductCategory =
  | 'books'
  | 'toys'
  | 'tools'
  | 'digital-guides'
  | 'templates'
  | 'courses'
  | 'sensory'
  | 'visual-aids'
  | 'communication-aids'
  | 'calm-kits'
  | 'reward-items';

interface StoreMarketplaceProps {
  userTier?: TierType;
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
  onUpgrade?: () => void;
  childProfile?: ChildProfile;
}

// Category definitions
const CATEGORIES: { id: ProductCategory; name: string; icon: React.ReactNode }[] = [
  { id: 'sensory', name: 'Sensory Tools', icon: <Headphones className="w-4 h-4" /> },
  { id: 'visual-aids', name: 'Visual Supports', icon: <Package className="w-4 h-4" /> },
  { id: 'communication-aids', name: 'Communication Aids', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'calm-kits', name: 'Calm Kits', icon: <Wind className="w-4 h-4" /> },
  { id: 'books', name: 'Books & Guides', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'reward-items', name: 'Reward Items', icon: <Gift className="w-4 h-4" /> },
  { id: 'toys', name: 'Toys & Games', icon: <Puzzle className="w-4 h-4" /> },
  { id: 'digital-guides', name: 'Digital Guides', icon: <FileText className="w-4 h-4" /> },
  { id: 'templates', name: 'Templates', icon: <Download className="w-4 h-4" /> },
  { id: 'courses', name: 'Courses', icon: <Video className="w-4 h-4" /> },
  { id: 'tools', name: 'Parent Tools', icon: <Tag className="w-4 h-4" /> },
];

// Curated affiliate catalog — shown when no store_products found in Supabase
const CURATED_PRODUCTS: Product[] = [
  // ---- Sensory Tools ----
  {
    id: 'sensory-1',
    name: 'Weighted Compression Vest',
    description: 'Adjustable weighted vest providing deep pressure input. Helps with body awareness and self-regulation during transitions and focused tasks.',
    category: 'sensory',
    price: 42.99,
    originalPrice: 54.99,
    image: '/images/products/weighted-vest.jpg',
    rating: 4.8,
    reviewCount: 1245,
    tags: ['sensory', 'deep-pressure', 'regulation', 'vestibular'],
    affiliateUrl: 'https://amazon.com/dp/B09SENSORY1',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: true,
    bcbaRecommended: true,
    hsaFsaEligible: true,
    recommendedAgeRange: '3-12',
    matchesChildNeeds: false,
  },
  {
    id: 'sensory-2',
    name: 'Noise-Canceling Kids Headphones',
    description: 'Over-ear noise-canceling headphones sized for children. Reduces auditory overstimulation in loud environments like stores and classrooms.',
    category: 'sensory',
    price: 34.95,
    image: '/images/products/noise-canceling-headphones.jpg',
    rating: 4.7,
    reviewCount: 2890,
    tags: ['sensory', 'auditory', 'noise-reduction', 'school'],
    affiliateUrl: 'https://amazon.com/dp/B09SENSORY2',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: true,
    recommendedAgeRange: '3-15',
    matchesChildNeeds: false,
  },
  {
    id: 'sensory-3',
    name: 'Tactile Sensory Bin Kit',
    description: 'Complete sensory bin with kinetic sand, water beads, textured balls, and scoops. Supports fine motor development and tactile exploration.',
    category: 'sensory',
    price: 29.99,
    image: '/images/products/sensory-bin.jpg',
    rating: 4.6,
    reviewCount: 678,
    tags: ['sensory', 'tactile', 'fine-motor', 'play'],
    affiliateUrl: 'https://amazon.com/dp/B09SENSORY3',
    isDigital: false,
    isPremium: false,
    isNew: true,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '2-8',
    matchesChildNeeds: false,
  },
  {
    id: 'sensory-4',
    name: 'Chewable Sensory Necklace (6-Pack)',
    description: 'Food-grade silicone chew necklaces in assorted shapes. Safe oral sensory input for children who chew on clothing or non-food items.',
    category: 'sensory',
    price: 14.99,
    image: '/images/products/chew-necklace.jpg',
    rating: 4.5,
    reviewCount: 1567,
    tags: ['sensory', 'oral', 'chewing', 'safe'],
    affiliateUrl: 'https://amazon.com/dp/B09SENSORY4',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: true,
    recommendedAgeRange: '3-12',
    matchesChildNeeds: false,
  },
  {
    id: 'sensory-5',
    name: 'Vibrating Sensory Pillow',
    description: 'Soft, vibrating pillow that provides soothing proprioceptive input. Battery-operated with variable intensity settings.',
    category: 'sensory',
    price: 27.99,
    image: '/images/products/vibrating-pillow.jpg',
    rating: 4.4,
    reviewCount: 412,
    tags: ['sensory', 'proprioceptive', 'calming', 'vibration'],
    affiliateUrl: 'https://amazon.com/dp/B09SENSORY5',
    isDigital: false,
    isPremium: false,
    isNew: true,
    isFeatured: false,
    bcbaRecommended: false,
    hsaFsaEligible: true,
    recommendedAgeRange: '2-10',
    matchesChildNeeds: false,
  },

  // ---- Visual Supports ----
  {
    id: 'visual-1',
    name: 'Visual Schedule Cards (Printable)',
    description: '50+ visual schedule cards for daily routines. Includes morning, bedtime, school, and therapy activities.',
    category: 'visual-aids',
    price: 'included',
    image: '/images/products/visual-cards.jpg',
    rating: 4.9,
    reviewCount: 156,
    tags: ['visual-supports', 'routine', 'printable'],
    downloadUrl: '/downloads/visual-schedule-cards.pdf',
    isDigital: true,
    isPremium: false,
    isNew: false,
    isFeatured: true,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '2-12',
    matchesChildNeeds: false,
  },
  {
    id: 'visual-2',
    name: 'Emotion Flashcards (Printable)',
    description: '40 emotion flashcards with real photos. Helps children identify and label feelings across different situations.',
    category: 'visual-aids',
    price: 'included',
    image: '/images/products/emotion-cards.jpg',
    rating: 4.8,
    reviewCount: 234,
    tags: ['emotions', 'feelings', 'flashcards', 'social-emotional'],
    downloadUrl: '/downloads/emotion-flashcards.pdf',
    isDigital: true,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '3-10',
    matchesChildNeeds: false,
  },
  {
    id: 'visual-3',
    name: 'First-Then Board (Magnetic)',
    description: 'Portable magnetic first-then board with 30 interchangeable picture cards. Helps with transitions and building expectations.',
    category: 'visual-aids',
    price: 19.99,
    image: '/images/products/first-then-board.jpg',
    rating: 4.7,
    reviewCount: 890,
    tags: ['visual-supports', 'transitions', 'first-then', 'magnetic'],
    affiliateUrl: 'https://amazon.com/dp/B09VISUAL3',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '2-8',
    matchesChildNeeds: false,
  },
  {
    id: 'visual-4',
    name: 'Social Stories Collection',
    description: '25 customizable social stories covering common scenarios: going to the doctor, making friends, handling changes.',
    category: 'visual-aids',
    price: 'included',
    image: '/images/products/social-stories.jpg',
    rating: 4.7,
    reviewCount: 445,
    tags: ['social-stories', 'customizable', 'scenarios'],
    downloadUrl: '/downloads/social-stories-collection.pdf',
    isDigital: true,
    isPremium: true,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '3-12',
    matchesChildNeeds: false,
  },
  {
    id: 'visual-5',
    name: 'Token Board Starter Kit',
    description: 'Reusable token board system with stars, smiley faces, and custom tokens. Velcro-backed for easy use during sessions and at home.',
    category: 'visual-aids',
    price: 12.99,
    image: '/images/products/token-board.jpg',
    rating: 4.6,
    reviewCount: 723,
    tags: ['token-board', 'reinforcement', 'visual-supports'],
    affiliateUrl: 'https://amazon.com/dp/B09VISUAL5',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '2-10',
    matchesChildNeeds: false,
  },

  // ---- Communication Aids ----
  {
    id: 'comm-1',
    name: 'AAC Communication Board (Printable)',
    description: 'Core vocabulary AAC board with 60 high-frequency words. Designed for beginning communicators using picture exchange.',
    category: 'communication-aids',
    price: 'included',
    image: '/images/products/aac-board.jpg',
    rating: 4.9,
    reviewCount: 567,
    tags: ['AAC', 'communication', 'PECS', 'core-vocabulary'],
    downloadUrl: '/downloads/aac-communication-board.pdf',
    isDigital: true,
    isPremium: false,
    isNew: false,
    isFeatured: true,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '2-10',
    matchesChildNeeds: false,
  },
  {
    id: 'comm-2',
    name: 'Recordable Answer Buzzers (4-Pack)',
    description: 'Record custom messages up to 30 seconds each. Great for choice-making, requesting, and turn-taking activities.',
    category: 'communication-aids',
    price: 22.99,
    image: '/images/products/answer-buzzers.jpg',
    rating: 4.6,
    reviewCount: 1234,
    tags: ['communication', 'requesting', 'choice-making', 'recordable'],
    affiliateUrl: 'https://amazon.com/dp/B09COMM2',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: true,
    recommendedAgeRange: '2-12',
    matchesChildNeeds: false,
  },
  {
    id: 'comm-3',
    name: 'Picture Exchange Communication Cards',
    description: '200+ laminated PECS-style cards with velcro strips. Covers food, activities, feelings, places, and people categories.',
    category: 'communication-aids',
    price: 34.99,
    originalPrice: 44.99,
    image: '/images/products/pecs-cards.jpg',
    rating: 4.8,
    reviewCount: 892,
    tags: ['PECS', 'communication', 'requesting', 'laminated'],
    affiliateUrl: 'https://amazon.com/dp/B09COMM3',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: true,
    recommendedAgeRange: '2-8',
    matchesChildNeeds: false,
  },
  {
    id: 'comm-4',
    name: 'Conversation Starter Cards for Kids',
    description: '80 illustrated prompt cards for practicing conversational skills. Includes topics, questions, and role-play scenarios.',
    category: 'communication-aids',
    price: 15.99,
    image: '/images/products/conversation-cards.jpg',
    rating: 4.5,
    reviewCount: 345,
    tags: ['social-skills', 'conversation', 'pragmatic-language'],
    affiliateUrl: 'https://amazon.com/dp/B09COMM4',
    isDigital: false,
    isPremium: false,
    isNew: true,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '5-14',
    matchesChildNeeds: false,
  },

  // ---- Calm Kits ----
  {
    id: 'calm-1',
    name: 'Calm Down Kit - Complete',
    description: 'Curated sensory kit with fidget toys, weighted lap pad, noise-canceling headphones, breathing cards, and calm-down strategy posters.',
    category: 'calm-kits',
    price: 49.99,
    originalPrice: 65.99,
    image: '/images/products/calm-kit.jpg',
    rating: 4.7,
    reviewCount: 892,
    tags: ['sensory', 'calming', 'kit', 'regulation'],
    affiliateUrl: 'https://amazon.com/dp/B09CALM1',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: true,
    bcbaRecommended: true,
    hsaFsaEligible: true,
    recommendedAgeRange: '3-12',
    matchesChildNeeds: false,
  },
  {
    id: 'calm-2',
    name: 'Portable Travel Calm Kit',
    description: 'Compact calm-down kit for on-the-go. Includes mini fidgets, breathing exercise cards, noise-reducing ear plugs, and a comfort item.',
    category: 'calm-kits',
    price: 24.99,
    image: '/images/products/travel-calm-kit.jpg',
    rating: 4.6,
    reviewCount: 567,
    tags: ['calming', 'travel', 'portable', 'kit'],
    affiliateUrl: 'https://amazon.com/dp/B09CALM2',
    isDigital: false,
    isPremium: false,
    isNew: true,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '3-10',
    matchesChildNeeds: false,
  },
  {
    id: 'calm-3',
    name: 'Weighted Lap Pad (5 lbs)',
    description: 'Soft weighted lap pad providing calming deep pressure. Great for circle time, homework, meals, and car rides.',
    category: 'calm-kits',
    price: 29.99,
    image: '/images/products/lap-pad.jpg',
    rating: 4.8,
    reviewCount: 1456,
    tags: ['weighted', 'calming', 'deep-pressure', 'lap-pad'],
    affiliateUrl: 'https://amazon.com/dp/B09CALM3',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: true,
    recommendedAgeRange: '4-12',
    matchesChildNeeds: false,
  },
  {
    id: 'calm-4',
    name: 'Breathing Exercise Cards (Printable)',
    description: '20 illustrated breathing technique cards for children. Includes belly breathing, square breathing, star breathing, and more.',
    category: 'calm-kits',
    price: 'free',
    image: '/images/products/breathing-cards.jpg',
    rating: 4.9,
    reviewCount: 345,
    tags: ['breathing', 'calming', 'regulation', 'printable'],
    downloadUrl: '/downloads/breathing-exercise-cards.pdf',
    isDigital: true,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '3-14',
    matchesChildNeeds: false,
  },
  {
    id: 'calm-5',
    name: 'Calm Corner Setup Guide & Poster',
    description: 'Step-by-step guide to creating a calm corner at home or school. Includes printable posters, zone charts, and strategy cards.',
    category: 'calm-kits',
    price: 'included',
    image: '/images/products/calm-corner-guide.jpg',
    rating: 4.7,
    reviewCount: 234,
    tags: ['calm-corner', 'regulation', 'setup-guide', 'zones'],
    downloadUrl: '/downloads/calm-corner-setup-guide.pdf',
    isDigital: true,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '3-12',
    matchesChildNeeds: false,
  },

  // ---- Books & Guides ----
  {
    id: 'book-1',
    name: 'The Explosive Child',
    description: 'A new approach for understanding and parenting easily frustrated, chronically inflexible children by Dr. Ross Greene.',
    category: 'books',
    price: 16.99,
    originalPrice: 18.99,
    image: '/images/products/explosive-child.jpg',
    rating: 4.8,
    reviewCount: 2340,
    tags: ['behavior', 'parenting', 'bestseller'],
    affiliateUrl: 'https://amazon.com/dp/B000SEH47C',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: true,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: 'Parents',
    matchesChildNeeds: false,
  },
  {
    id: 'book-2',
    name: 'Uniquely Human: A Different Way of Seeing Autism',
    description: 'Dr. Barry Prizant reframes autism as a different way of being rather than a deficit. Essential reading for families.',
    category: 'books',
    price: 14.99,
    image: '/images/products/uniquely-human.jpg',
    rating: 4.9,
    reviewCount: 1890,
    tags: ['autism', 'parenting', 'understanding', 'bestseller'],
    affiliateUrl: 'https://amazon.com/dp/B09BOOK2',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: 'Parents',
    matchesChildNeeds: false,
  },
  {
    id: 'book-3',
    name: 'IEP Meeting Preparation Guide',
    description: 'Comprehensive guide to preparing for IEP meetings. Includes checklists, question templates, and rights overview.',
    category: 'books',
    price: 'free',
    image: '/images/products/iep-guide.jpg',
    rating: 4.9,
    reviewCount: 678,
    tags: ['IEP', 'advocacy', 'school'],
    downloadUrl: '/downloads/iep-preparation-guide.pdf',
    isDigital: true,
    isPremium: false,
    isNew: false,
    isFeatured: true,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: 'Parents',
    matchesChildNeeds: false,
  },
  {
    id: 'book-4',
    name: 'ABA Fundamentals for Parents (Video Course)',
    description: 'Self-paced video course covering ABA basics, reinforcement strategies, and behavior management techniques.',
    category: 'books',
    price: 'included',
    image: '/images/products/aba-course.jpg',
    rating: 4.9,
    reviewCount: 1203,
    tags: ['ABA', 'course', 'video', 'parent-training'],
    downloadUrl: '/courses/aba-fundamentals',
    isDigital: true,
    isPremium: true,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: 'Parents',
    matchesChildNeeds: false,
  },
  {
    id: 'book-5',
    name: 'The Out-of-Sync Child',
    description: 'Recognizing and coping with sensory processing differences. Practical strategies for parents and educators.',
    category: 'books',
    price: 15.99,
    image: '/images/products/out-of-sync-child.jpg',
    rating: 4.7,
    reviewCount: 3456,
    tags: ['sensory', 'SPD', 'parenting', 'classic'],
    affiliateUrl: 'https://amazon.com/dp/B09BOOK5',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: 'Parents',
    matchesChildNeeds: false,
  },

  // ---- Reward Items ----
  {
    id: 'reward-1',
    name: 'Token Reward Treasure Chest (50 Prizes)',
    description: '50 small prize items for token economy systems. Includes stickers, mini toys, stamps, and trinkets appropriate for all ages.',
    category: 'reward-items',
    price: 19.99,
    image: '/images/products/treasure-chest.jpg',
    rating: 4.5,
    reviewCount: 890,
    tags: ['rewards', 'token-economy', 'prizes', 'reinforcement'],
    affiliateUrl: 'https://amazon.com/dp/B09REWARD1',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '3-12',
    matchesChildNeeds: false,
  },
  {
    id: 'reward-2',
    name: 'Motivational Sticker Chart Bundle',
    description: '10 themed sticker charts with 500+ reward stickers. Themes include space, animals, superheroes, and nature.',
    category: 'reward-items',
    price: 9.99,
    image: '/images/products/sticker-charts.jpg',
    rating: 4.6,
    reviewCount: 2345,
    tags: ['stickers', 'charts', 'motivation', 'reinforcement'],
    affiliateUrl: 'https://amazon.com/dp/B09REWARD2',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '2-10',
    matchesChildNeeds: false,
  },
  {
    id: 'reward-3',
    name: 'Printable Reward Coupons for Kids',
    description: '30 customizable reward coupons: extra screen time, pick the dinner, stay up late, choose a game, and more.',
    category: 'reward-items',
    price: 'free',
    image: '/images/products/reward-coupons.jpg',
    rating: 4.8,
    reviewCount: 456,
    tags: ['rewards', 'coupons', 'printable', 'customizable'],
    downloadUrl: '/downloads/reward-coupons.pdf',
    isDigital: true,
    isPremium: false,
    isNew: true,
    isFeatured: false,
    bcbaRecommended: false,
    hsaFsaEligible: false,
    recommendedAgeRange: '3-14',
    matchesChildNeeds: false,
  },
  {
    id: 'reward-4',
    name: 'Marble Maze Fidget Board',
    description: 'Wooden marble maze for focus and calm. Great for waiting rooms, car rides, and quiet time. Works well as an earned reward.',
    category: 'reward-items',
    price: 24.99,
    image: '/images/products/marble-maze.jpg',
    rating: 4.5,
    reviewCount: 312,
    tags: ['fidget', 'focus', 'toy', 'reward'],
    affiliateUrl: 'https://amazon.com/dp/B08XYZ789',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: false,
    hsaFsaEligible: false,
    recommendedAgeRange: '4-12',
    matchesChildNeeds: false,
  },

  // ---- Remaining original products (other categories) ----
  {
    id: 'template-1',
    name: 'Behavior Tracking Template Bundle',
    description: 'Complete bundle of behavior tracking sheets, ABC data forms, and progress monitoring templates.',
    category: 'templates',
    price: 'free',
    image: '/images/products/behavior-templates.jpg',
    rating: 4.6,
    reviewCount: 234,
    tags: ['tracking', 'data', 'templates'],
    downloadUrl: '/downloads/behavior-tracking-bundle.zip',
    isDigital: true,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: 'Parents',
    matchesChildNeeds: false,
  },
  {
    id: 'tool-1',
    name: 'Time Timer MOD',
    description: 'Visual timer that shows the passage of time. Perfect for transitions, tasks, and building time awareness.',
    category: 'tools',
    price: 36.95,
    image: '/images/products/time-timer.jpg',
    rating: 4.8,
    reviewCount: 5678,
    tags: ['timer', 'visual', 'transitions'],
    affiliateUrl: 'https://amazon.com/dp/B000J5OFW0',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
    hsaFsaEligible: false,
    recommendedAgeRange: '3-Adult',
    matchesChildNeeds: false,
  },
];

// ============================================================================
// Production affiliate fallback — honest version of the curated catalog
// ============================================================================
//
// The full CURATED_PRODUCTS above carries illustrative ratings/review counts
// and placeholder ASIN links, so real users must never see it verbatim (demo
// mode only). But an empty store is worse: when store_products has no rows,
// production falls back to these same behaviorist picks with the illustrative
// data stripped — no ratings/review counts (the cards hide the rating row when
// reviewCount is 0), no fake "was" prices, and generic Amazon *search* links
// instead of placeholder ASINs. Digital items are excluded (their download
// files don't ship with the app yet).
//
// When the Amazon Associates account is approved, append the tag here.
const AMAZON_AFFILIATE_TAG = ''; // e.g. 'aminy-20'

function amazonSearchUrl(productName: string): string {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(productName)}`;
  return AMAZON_AFFILIATE_TAG ? `${base}&tag=${encodeURIComponent(AMAZON_AFFILIATE_TAG)}` : base;
}

const CURATED_AFFILIATE_FALLBACK: Product[] = CURATED_PRODUCTS
  .filter((p) => p.affiliateUrl && !p.isDigital)
  .map((p) => ({
    ...p,
    rating: 0,
    reviewCount: 0,
    originalPrice: undefined,
    affiliateUrl: amazonSearchUrl(p.name),
  }));

// ============================================================================
// AI-Recommended Products Logic
// ============================================================================

/**
 * Generate AI-recommended products based on a child profile.
 * Matches products by diagnosis, age range, and treatment goal relevance.
 */
function getAIRecommendedProducts(
  products: Product[],
  childProfile: ChildProfile | null,
): Product[] {
  if (!childProfile) return [];

  const diagnosisKeywordMap: Record<string, string[]> = {
    autism: ['sensory', 'communication', 'social-skills', 'visual-supports', 'AAC', 'PECS', 'social-stories'],
    asd: ['sensory', 'communication', 'social-skills', 'visual-supports', 'AAC', 'PECS', 'social-stories'],
    adhd: ['fidget', 'focus', 'timer', 'transitions', 'visual', 'regulation'],
    'sensory processing': ['sensory', 'deep-pressure', 'weighted', 'calming', 'noise-reduction', 'tactile'],
    'speech delay': ['communication', 'AAC', 'PECS', 'requesting', 'conversation', 'pragmatic-language'],
    'language delay': ['communication', 'AAC', 'PECS', 'requesting', 'core-vocabulary'],
    anxiety: ['calming', 'breathing', 'regulation', 'calm-corner', 'weighted', 'deep-pressure'],
    odd: ['behavior', 'parenting', 'regulation', 'token-economy', 'reinforcement'],
  };

  const relevantTags = new Set<string>();
  for (const diagnosis of childProfile.diagnoses) {
    const lower = diagnosis.toLowerCase();
    for (const [key, tags] of Object.entries(diagnosisKeywordMap)) {
      if (lower.includes(key)) {
        tags.forEach((tag) => relevantTags.add(tag));
      }
    }
  }

  if (childProfile.treatmentGoals) {
    for (const goal of childProfile.treatmentGoals) {
      const lower = goal.toLowerCase();
      if (lower.includes('communicat') || lower.includes('mand') || lower.includes('request')) {
        relevantTags.add('communication');
        relevantTags.add('AAC');
        relevantTags.add('requesting');
      }
      if (lower.includes('social') || lower.includes('peer') || lower.includes('play')) {
        relevantTags.add('social-skills');
        relevantTags.add('social-stories');
      }
      if (lower.includes('sensory') || lower.includes('regulation') || lower.includes('calm')) {
        relevantTags.add('sensory');
        relevantTags.add('calming');
        relevantTags.add('regulation');
      }
      if (lower.includes('routine') || lower.includes('daily living') || lower.includes('independence')) {
        relevantTags.add('visual-supports');
        relevantTags.add('routine');
        relevantTags.add('transitions');
      }
    }
  }

  if (relevantTags.size === 0) return [];

  const scored = products
    .map((product) => {
      let score = 0;
      for (const tag of product.tags) {
        if (relevantTags.has(tag)) score += 2;
      }
      if (product.bcbaRecommended) score += 1;

      // Check age range match
      if (product.recommendedAgeRange && product.recommendedAgeRange !== 'Parents') {
        const ageParts = product.recommendedAgeRange.split('-').map((s) => parseInt(s.replace(/\D/g, ''), 10));
        if (ageParts.length === 2 && !isNaN(ageParts[0]) && !isNaN(ageParts[1])) {
          if (childProfile.age >= ageParts[0] && childProfile.age <= ageParts[1]) {
            score += 1;
          }
        }
      }

      return { product: { ...product, matchesChildNeeds: score > 0 }, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return scored.map((s) => s.product);
}

// Helper: load wishlist from localStorage
function loadWishlist(): Set<string> {
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

// Helper: save wishlist to localStorage
function saveWishlist(ids: Set<string>): void {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage errors
  }
}

export function StoreMarketplace({
  userTier = 'free',
  onBack,
  onNavigate,
  childProfile,
}: StoreMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadWishlist());
  // Demo mode shows the rich curated catalog (illustrative ratings/prices).
  // Production users get real store_products from Supabase when rows exist;
  // otherwise the honest CURATED_AFFILIATE_FALLBACK — the store must never
  // render empty for a parent.
  const [products, setProducts] = useState<Product[]>(() => (isDemoMode() ? CURATED_PRODUCTS : CURATED_AFFILIATE_FALLBACK));
  const [usingCuratedFallback, setUsingCuratedFallback] = useState(true);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [filters, setFilters] = useState({
    freeOnly: false,
    bcbaRecommended: false,
    digitalOnly: false,
    newOnly: false,
    hsaFsaOnly: false,
  });

  // Attempt to fetch real products from Supabase store_products table
  useEffect(() => {
    async function loadProducts() {
      try {
        const { data, error } = await supabase
          .from('store_products')
          .select('*')
          .eq('active', true)
          .order('featured', { ascending: false });

        if (!error && data && data.length > 0) {
          setProducts(data as Product[]);
          setUsingCuratedFallback(false);
        } else if (isDemoMode()) {
          // Demo walk-throughs show the rich curated catalog
          setProducts(CURATED_PRODUCTS);
          setUsingCuratedFallback(true);
        } else {
          // Real users with no store_products get the honest curated
          // affiliate picks (no illustrative ratings, generic Amazon
          // search links) — never an empty store.
          setProducts(CURATED_AFFILIATE_FALLBACK);
          setUsingCuratedFallback(true);
        }
      } catch {
        // On fetch failure, fall back to the curated catalog too
        setProducts(isDemoMode() ? CURATED_PRODUCTS : CURATED_AFFILIATE_FALLBACK);
        setUsingCuratedFallback(true);
      }
    }
    loadProducts();
  }, []);

  // Check if user has premium access
  const hasPremiumAccess = useMemo(() =>
    ['core', 'pro', 'proplus'].includes(userTier),
  [userTier]);

  // AI-recommended products
  const aiRecommendedProducts = useMemo(
    () => getAIRecommendedProducts(products, childProfile ?? null),
    [products, childProfile],
  );

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Wishlist filter
    if (showWishlistOnly) {
      filtered = filtered.filter((p) => favorites.has(p.id));
    }

    return filtered.filter((product) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Additional filters
      if (filters.freeOnly && product.price !== 'free' && product.price !== 'included') {
        return false;
      }
      if (filters.bcbaRecommended && !product.bcbaRecommended) {
        return false;
      }
      if (filters.digitalOnly && !product.isDigital) {
        return false;
      }
      if (filters.newOnly && !product.isNew) {
        return false;
      }
      if (filters.hsaFsaOnly && !product.hsaFsaEligible) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, filters, showWishlistOnly, favorites]);

  // Featured products
  const featuredProducts = useMemo(() =>
    products.filter(p => p.isFeatured).slice(0, 4),
  [products]);

  // Toggle favorite (persists to localStorage as wishlist)
  const toggleFavorite = useCallback((productId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
        toast.success('Removed from wishlist');
      } else {
        next.add(productId);
        toast.success('Added to wishlist');
      }
      saveWishlist(next);
      return next;
    });
  }, []);

  // Tier discount percentage
  const tierDiscount = useMemo(() => {
    switch (userTier) {
      case 'proplus': return 0.30;  // Pro+ 30% off
      case 'pro': return 0.20;     // Pro 20% off
      case 'core': return 0.10;    // Core 10% off
      default: return 0;
    }
  }, [userTier]);

  const tierLabel = useMemo(() => {
    switch (userTier) {
      case 'proplus': return 'Pro+ 30% off';
      case 'pro': return 'Pro 20% off';
      case 'core': return 'Core 10% off';
      default: return null;
    }
  }, [userTier]);

  // Calculate discounted price
  const getDiscountedPrice = useCallback((price: number | 'free' | 'included') => {
    if (typeof price !== 'number' || tierDiscount === 0) return null;
    return Math.round(price * (1 - tierDiscount) * 100) / 100;
  }, [tierDiscount]);

  // Handle product action
  const handleProductAction = useCallback((product: Product) => {
    if (product.isPremium && !hasPremiumAccess) {
      toast.error('Upgrade to access this resource');
      onNavigate?.('paywall');
      return;
    }

    if (product.downloadUrl) {
      // Generate a pseudo signed URL (in production, fetch from Supabase Storage)
      const signedUrl = product.downloadUrl.startsWith('http')
        ? product.downloadUrl
        : `${window.location.origin}/api/downloads${product.downloadUrl}?token=${Date.now()}`;
      toast.success(`Downloading ${product.name}...`);
      window.open(signedUrl, '_blank');
    } else if (product.affiliateUrl) {
      window.open(product.affiliateUrl, '_blank');
    }
  }, [hasPremiumAccess, onNavigate]);

  // Render price with tier discount
  const renderPrice = (product: Product) => {
    if (product.price === 'free') {
      return <Badge className="bg-green-100 text-green-700">Free</Badge>;
    }
    if (product.price === 'included') {
      return (
        <Badge className="bg-[#2A7D99]/10 text-[#2A7D99]">
          <Crown className="w-3 h-3 mr-1" />
          Included
        </Badge>
      );
    }
    // Affiliate items are bought on Amazon at Amazon's price — member
    // discounts don't apply there, so show an approximate price instead.
    const isAffiliate = Boolean(product.affiliateUrl);
    const discounted = isAffiliate ? null : getDiscountedPrice(product.price);
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#132F43]">
            {isAffiliate ? '~' : ''}${discounted ?? product.price}
          </span>
          {(discounted || product.originalPrice) && (
            <span className="text-sm text-slate-400 line-through">
              ${discounted ? product.price : product.originalPrice}
            </span>
          )}
        </div>
        {discounted && tierLabel && (
          <span className="text-sm text-[#2A7D99] font-medium">{tierLabel}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-mist dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-[#E8E4DF] dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack} aria-label="Go back">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[#132F43] dark:text-white">Resource Store</h1>
                  {usingCuratedFallback && isDemoMode() && (
                    <span
                      className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300/70 font-medium px-2 py-0.5 shrink-0"
                      style={{ fontSize: '10px' }}
                      title="Ratings, review counts, and prices shown here are illustrative sample data"
                    >
                      Sample catalog
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#5A6B7A]">
                  {usingCuratedFallback ? 'Curated affiliate recommendations' : 'Behaviorist-curated tools and resources'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showWishlistOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowWishlistOnly(!showWishlistOnly)}
                className="flex items-center gap-1.5"
                aria-label={showWishlistOnly ? 'Show all resources' : 'Show wishlist only'}
                aria-pressed={showWishlistOnly}
              >
                <Heart className={`w-4 h-4 ${showWishlistOnly ? 'fill-white' : ''}`} />
                {favorites.size > 0 && (
                  <span className="text-sm">{favorites.size}</span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {Object.values(filters).some(Boolean) && (
                  <Badge className="bg-primary text-white text-sm px-1.5">
                    {Object.values(filters).filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="shrink-0"
            >
              All
            </Button>
            {CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="shrink-0 flex items-center gap-1.5"
              >
                {category.icon}
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-[#E8E4DF] dark:border-slate-700 overflow-hidden"
            >
              <div className="max-w-6xl mx-auto px-4 py-4">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.freeOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, freeOnly: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">Free only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.bcbaRecommended}
                      onChange={(e) => setFilters(prev => ({ ...prev, bcbaRecommended: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">Behaviorist recommended</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.digitalOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, digitalOnly: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">Digital only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.newOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, newOnly: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">New arrivals</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hsaFsaOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, hsaFsaOnly: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">HSA/FSA eligible</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* AI-Recommended Section (when child profile is available) */}
        {selectedCategory === 'all' && !searchQuery && !showWishlistOnly && aiRecommendedProducts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#132F43] dark:text-white mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Recommended for {childProfile?.name || 'Your Child'}
            </h2>
            <p className="text-sm text-[#5A6B7A] mb-4">
              Based on {childProfile?.diagnoses?.join(', ')} profile, age {childProfile?.age}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiRecommendedProducts.map((product) => (
                <Card
                  key={`ai-${product.id}`}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-[#2A7D99]/20 dark:border-[#2A7D99]/30"
                  onClick={() => handleProductAction(product)}
                >
                  <div className="aspect-video bg-[#2A7D99]/10 dark:bg-[#2A7D99]/15 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-[#6AA9BC]">
                      {CATEGORIES.find(c => c.id === product.category)?.icon}
                    </div>
                    <Badge className="absolute top-2 left-2 bg-primary text-white">
                      <Zap className="w-3 h-3 mr-1" />
                      AI Pick
                    </Badge>
                    {product.hsaFsaEligible && (
                      <Badge className="absolute bottom-2 left-2 bg-emerald-100 text-emerald-700 text-sm">
                        <Shield className="w-3 h-3 mr-1" />
                        HSA/FSA
                      </Badge>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      aria-label={favorites.has(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                      aria-pressed={favorites.has(product.id)}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites.has(product.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-[#132F43] dark:text-white line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-[#5A6B7A] line-clamp-2 mt-1">{product.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {product.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-sm text-[#5A6B7A]">{product.rating}</span>
                        </div>
                      )}
                      {product.recommendedAgeRange && (
                        <span className="text-sm text-slate-400">Ages {product.recommendedAgeRange}</span>
                      )}
                    </div>
                    <div className="mt-2">{renderPrice(product)}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Featured Section (only on "all" category) */}
        {selectedCategory === 'all' && !searchQuery && !showWishlistOnly && featuredProducts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Featured Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleProductAction(product)}
                >
                  <div className="aspect-video bg-[#EDF4F7] dark:bg-slate-700 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      {CATEGORIES.find(c => c.id === product.category)?.icon}
                    </div>
                    {product.isNew && (
                      <Badge className="absolute top-2 left-2 bg-blue-500 text-white">New</Badge>
                    )}
                    {product.bcbaRecommended && (
                      <Badge className="absolute top-2 right-2 bg-violet-500 text-white">
                        <Check className="w-3 h-3 mr-1" />
                        Behaviorist pick
                      </Badge>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-[#132F43] dark:text-white line-clamp-1">
                      {product.name}
                    </h3>
                    {product.reviewCount > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-sm text-[#5A6B7A]">{product.rating}</span>
                        <span className="text-sm text-slate-400">({product.reviewCount})</span>
                      </div>
                    )}
                    <div className="mt-2">{renderPrice(product)}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#132F43] dark:text-white">
              {selectedCategory === 'all' ? 'All Resources' : CATEGORIES.find(c => c.id === selectedCategory)?.name}
            </h2>
            <span className="text-sm text-[#5A6B7A]">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            products.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#132F43] dark:text-white mb-2">
                  No resources yet
                </h3>
                <p className="text-[#5A6B7A]">
                  Our team is curating behaviorist-reviewed tools and resources. Check back soon.
                </p>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#132F43] dark:text-white mb-2">
                  No resources found
                </h3>
                <p className="text-[#5A6B7A] mb-4">
                  Try adjusting your filters or search terms.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setShowWishlistOnly(false);
                    setFilters({ freeOnly: false, bcbaRecommended: false, digitalOnly: false, newOnly: false, hsaFsaOnly: false });
                  }}
                >
                  Clear all filters
                </Button>
              </Card>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-[#EDF4F7] dark:bg-slate-700 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      {CATEGORIES.find(c => c.id === product.category)?.icon}
                    </div>
                    {product.isNew && (
                      <Badge className="absolute top-2 left-2 bg-blue-500 text-white">New</Badge>
                    )}
                    {product.isPremium && !hasPremiumAccess && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge className="bg-amber-500 text-white">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      aria-label={favorites.has(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                      aria-pressed={favorites.has(product.id)}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites.has(product.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-[#132F43] dark:text-white line-clamp-2">
                        {product.name}
                      </h3>
                      {product.bcbaRecommended && (
                        <Badge className="shrink-0 bg-violet-100 text-violet-700 text-sm">
                          Behaviorist pick
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#5A6B7A] line-clamp-2 mb-2">
                      {product.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {product.hsaFsaEligible && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-sm">
                          <Shield className="w-3 h-3 mr-0.5" />
                          HSA/FSA
                        </Badge>
                      )}
                      {product.recommendedAgeRange && (
                        <Badge className="bg-[#EDF4F7] text-[#5A6B7A] text-sm">
                          Ages {product.recommendedAgeRange}
                        </Badge>
                      )}
                      {product.matchesChildNeeds && (
                        <Badge className="bg-[#2A7D99]/10 text-[#2A7D99] text-sm">
                          <Zap className="w-3 h-3 mr-0.5" />
                          Matches needs
                        </Badge>
                      )}
                    </div>
                    {product.reviewCount > 0 && (
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-sm text-[#5A6B7A]">{product.rating}</span>
                        <span className="text-sm text-slate-400">({product.reviewCount} reviews)</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {renderPrice(product)}
                      <Button
                        size="sm"
                        onClick={() => handleProductAction(product)}
                        className="flex items-center gap-1"
                      >
                        {product.isDigital ? (
                          <>
                            <Download className="w-4 h-4" />
                            Get
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" />
                            View
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StoreMarketplace;
