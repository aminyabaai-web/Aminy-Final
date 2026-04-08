// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Aminy Brand Guide - Phase 1: ABA-Based Behavioral Wellness
 * 
 * This file contains all brand messaging, positioning, and tone guidelines
 * to ensure consistent ABA + AI wellness messaging across the entire app.
 */

// ============================================================================
// BRAND IDENTITY
// ============================================================================

export const BRAND_IDENTITY = {
  name: 'Aminy',
  tagline: 'Guided by AI. Grounded in ABA. Built for Family Life.',
  alternateTaglines: [
    'Calm that learns with you.',
    'Behavioral Science for Everyday Calm.',
    'Small wins. Big calm.',
    'Parent + Child. Progress, Together.'
  ],
  category: 'AI Behavioral Wellness',
  subcategory: 'AI Family Coaching',
  promise: 'Calm that learns with you — small wins, real progress.'
};

// ============================================================================
// POSITIONING STATEMENT
// ============================================================================

export const POSITIONING_STATEMENT = `Aminy is an AI-powered behavioral wellness app that uses the proven principles of Applied Behavior Analysis (ABA) to help families create calm routines, improve communication, and celebrate progress—without clinical complexity.`;

// ============================================================================
// VALUE PILLARS
// ============================================================================

export const VALUE_PILLARS = {
  calmAndPredictability: {
    title: 'Calm & Predictability',
    description: 'Reduce stress through daily structure using gentle ABA-based routines.'
  },
  connectionAndConfidence: {
    title: 'Connection & Confidence',
    description: 'Empower parents and celebrate every bit of progress with your child.'
  },
  scienceAndSimplicity: {
    title: 'Science & Simplicity',
    description: 'Behavioral insights grounded in proven ABA principles, no clinical jargon.'
  }
};

// ============================================================================
// LANGUAGE FRAMEWORK
// ============================================================================

export const LANGUAGE_FRAMEWORK = {
  // Words to USE frequently
  preferred: [
    'calm', 'connect', 'cue', 'progress', 'gentle', 'science-backed',
    'everyday', 'together', 'support', 'growth', 'celebration',
    'routine', 'structure', 'reinforcement', 'consistency',
    'guidance', 'adaptive', 'personalized', 'predictable', 'safe'
  ],
  
  // Words to AVOID
  prohibited: [
    'therapy', 'diagnosis', 'disorder', 'prescription', 'patient',
    'treatment', 'intervention', 'clinical', 'cure', 'fix'
  ],
  
  // ABA-specific phrases (use in educational/proof contexts)
  abaTerms: [
    'Applied Behavior Analysis (ABA)',
    'ABA principles',
    'behavioral science',
    'positive reinforcement',
    'gentle cues',
    'predictable routines',
    'evidence-informed'
  ]
};

// ============================================================================
// MESSAGING FRAMEWORK
// ============================================================================

export const MESSAGING_FRAMEWORK = {
  // Hero Headlines (Empathy Hook)
  heroHeadlines: [
    'Finally, Calm That Works',
    'Mornings Are Hard. Aminy Can Help.',
    'Behavioral Science for Everyday Calm',
    'Small Wins. Real Progress.',
    'Turn Overwhelm Into Calm'
  ],
  
  // Science Proof (ABA credibility)
  scienceProof: [
    'Built on the principles of Applied Behavior Analysis (ABA).',
    'Powered by adaptive AI and grounded in ABA behavioral science.',
    'Based on ABA science trusted by clinicians worldwide.',
    'Inspired by ABA, personalized by AI.',
    'Everyday ABA: calm routines, connection, consistency.'
  ],
  
  // Empowerment CTAs
  ctas: [
    'Start Your Calm Plan',
    'Build My Calm Routine',
    'Start Free 7-Day Trial',
    'See How It Works',
    'Experience ABA-Based Calm'
  ],
  
  // Microcopy variations
  microcopy: {
    affirmation: [
      "You're already doing your best. Aminy just makes it work better.",
      "You're doing enough. Let's make it easier.",
      "You've got this — Aminy helps it work."
    ],
    progress: [
      "That's positive reinforcement — and it's working.",
      "Small wins add up to big calm.",
      "Celebrating progress, one cue at a time."
    ],
    education: [
      "ABA calls it reinforcement. We call it celebrating progress.",
      "ABA science shows consistency builds comfort.",
      "One calm cue at a time helps your child feel safe."
    ],
    nudge: [
      "Aminy noticed mornings have been smoother — great job!",
      "I noticed bedtime is calmer when you use the 2-step cue.",
      "Based on last week's patterns, mornings improved by 23%."
    ]
  }
};

// ============================================================================
// TONE & VOICE SYSTEM
// ============================================================================

export const TONE_VOICE = {
  voice: 'Warm-expert — 60% compassionate coach, 40% intelligent assistant',
  tone: 'Calm, confident, non-clinical',
  energy: 'Empowering but soft',
  readingLevel: '6th grade clarity',
  sentenceStyle: 'Short sentences. Easy breathing pace.',
  
  examples: {
    good: [
      "Let's make mornings smoother together.",
      "Small steps. Big calm.",
      "You've got this — Aminy helps it work.",
      "Five minutes a day, real change by next week."
    ],
    bad: [
      "Great! To start, please provide your child's first name.",
      "We will now commence your treatment plan.",
      "Your patient requires clinical intervention.",
      "Please complete the diagnostic assessment."
    ]
  }
};

// ============================================================================
// LEGAL & PRIVACY
// ============================================================================

export const LEGAL_PRIVACY = {
  disclaimer: "Aminy provides educational and behavioral wellness tools based on the principles of Applied Behavior Analysis (ABA) and adaptive AI personalization. It is not a medical device or provider of clinical therapy.",
  
  privacyPromise: "Your data supports your family's progress — never sold, always private.",
  
  emergencyNotice: "Aminy isn't for crises. For immediate danger call 911. For mental health crises call/text 988 (US)."
};

// ============================================================================
// AI INTEGRATION GUIDELINES
// ============================================================================

export const AI_GUIDELINES = {
  // Always make AI visible and comforting
  aiLanguage: [
    'AI-guided',
    'AI-personalized',
    'adaptive AI',
    'smart guidance',
    'Aminy learns',
    'Your plan adapts',
    'powered by intelligence',
    'AI that feels like care'
  ],
  
  // Pair ABA with AI in key messages
  abaPlusAi: [
    'Powered by adaptive AI and grounded in ABA behavioral science.',
    'Aminy\'s AI turns ABA strategies into daily guidance.',
    "Using ABA principles, Aminy learns your family's rhythm.",
    'AI-guided plans based on proven ABA methods.'
  ],
  
  // Visual cues for AI moments
  visualCues: {
    colors: ['mint', 'amber', 'lavender'],
    effects: ['subtle glow', 'breathing pulse', 'gentle shimmer'],
    icons: ['sparkle', 'orb', 'light trails']
  }
};

// ============================================================================
// SCREEN-SPECIFIC MESSAGING
// ============================================================================

export const SCREEN_MESSAGING = {
  onboarding: {
    welcome: "You're already doing more than enough. Aminy just helps it work better.",
    insightNavigator: "We'll build your starter plan in 3 minutes — guided by behavioral science, personalized by AI.",
    confirmation: "Your family's calm plan is ready. Let's start with two simple wins."
  },
  
  dashboard: {
    headline: "Today's Calm Plan",
    aiNote: "Aminy noticed mornings have been smoother — great job!",
    cta: "Add a new goal"
  },
  
  reports: {
    headline: "Progress You Can See",
    subtitle: "Generated by AI, backed by ABA science.",
    cta: "Share with teacher or therapist (7-day link)"
  },
  
  pricing: {
    guarantee: "Noticeably calmer routines in 7 days — or cancel anytime.",
    trialCta: "Start Free 7-Day Core Trial"
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a word should be avoided based on brand guidelines
 */
export function shouldAvoidWord(word: string): boolean {
  return LANGUAGE_FRAMEWORK.prohibited.some(
    prohibited => word.toLowerCase().includes(prohibited.toLowerCase())
  );
}

/**
 * Get a random item from an array (for varied messaging)
 */
export function getRandomMessage<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get ABA + AI paired messaging
 */
export function getABAPlusAIMessage(): string {
  return getRandomMessage(AI_GUIDELINES.abaPlusAi);
}

/**
 * Get empathy hook + science proof + CTA combo
 */
export function getFullMessagingCombo() {
  return {
    hook: getRandomMessage(MESSAGING_FRAMEWORK.heroHeadlines),
    proof: getRandomMessage(MESSAGING_FRAMEWORK.scienceProof),
    cta: getRandomMessage(MESSAGING_FRAMEWORK.ctas)
  };
}
