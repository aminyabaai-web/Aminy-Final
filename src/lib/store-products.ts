/**
 * store-products.ts — Aminy Digital Product Catalog
 * All digital products — no shipping, instant delivery after Stripe checkout
 */

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  category: 'template' | 'guide' | 'course' | 'tool';
  stripePriceId: string; // fill in after creating products in Stripe dashboard
  featured?: boolean;
  fileType: 'PDF' | 'Video' | 'Bundle';
  pages?: number;
  duration?: string;
}

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    id: 'aba-home-program-guide',
    name: 'ABA Home Program Guide',
    description:
      'Complete guide for parents implementing ABA strategies at home between therapy sessions. Includes 40+ evidence-based activities, data sheets, and goal tracking templates.',
    price: 1499,
    category: 'guide',
    stripePriceId: 'price_home_program_guide',
    featured: true,
    fileType: 'PDF',
    pages: 87,
  },
  {
    id: 'visual-schedule-templates',
    name: 'Visual Schedule Template Pack',
    description:
      '30 customizable visual schedule templates for home, school, and community settings. Morning routines, homework time, bedtime, and transition cards included.',
    price: 999,
    category: 'template',
    stripePriceId: 'price_visual_schedules',
    fileType: 'PDF',
    pages: 30,
  },
  {
    id: 'iep-preparation-toolkit',
    name: 'IEP Preparation Toolkit',
    description:
      "Everything you need to prepare for your child's IEP meeting. Goal bank, question list, rights summary, and note-taking worksheets.",
    price: 1999,
    category: 'guide',
    stripePriceId: 'price_iep_toolkit',
    featured: true,
    fileType: 'Bundle',
    pages: 45,
  },
  {
    id: 'behavior-basics-course',
    name: 'Behavior Basics for Parents',
    description:
      'Self-paced video course teaching ABA principles in plain language. 8 modules, 4 hours of content, completion certificate included.',
    price: 4999,
    category: 'course',
    stripePriceId: 'price_behavior_basics',
    fileType: 'Video',
    duration: '4 hours',
  },
  {
    id: 'data-collection-sheets',
    name: 'ABA Data Collection Sheets',
    description:
      '20 data sheet templates for tracking behavior, skill acquisition, and toilet training. Compatible with CentralReach and paper data systems.',
    price: 799,
    category: 'template',
    stripePriceId: 'price_data_sheets',
    fileType: 'PDF',
    pages: 20,
  },
  {
    id: 'anxiety-toolkit-kids',
    name: 'Anxiety Toolkit for Kids',
    description:
      'CBT-based workbook for children ages 5-12 experiencing anxiety. Includes feelings identification, coping skill cards, and worry worksheets.',
    price: 1299,
    category: 'tool',
    stripePriceId: 'price_anxiety_toolkit',
    fileType: 'PDF',
    pages: 52,
  },
];

/** Returns products in featured-first order */
export function getSortedProducts(): StoreProduct[] {
  return [...STORE_PRODUCTS].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });
}

/** Returns products filtered by category */
export function getProductsByCategory(
  category: StoreProduct['category'] | 'all',
): StoreProduct[] {
  if (category === 'all') return getSortedProducts();
  return getSortedProducts().filter((p) => p.category === category);
}

/** Format cents to display price string */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Pro-tier member price (20% off) */
export function memberPrice(cents: number): number {
  return Math.round(cents * 0.8);
}
