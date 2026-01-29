/**
 * Aminy Crisis Detection System
 *
 * Multi-layer crisis detection with AI enhancement and escalation tiers.
 * CRITICAL: This system handles potentially life-threatening situations.
 * Always err on the side of caution.
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================
// TYPES
// ============================================

export type CrisisType =
  | 'suicidal_ideation'   // Thoughts of suicide
  | 'self_harm'           // Self-injury behavior
  | 'child_safety'        // Child in danger
  | 'domestic_violence'   // DV/abuse situations
  | 'caregiver_burnout'   // Severe caregiver distress
  | 'mental_health_crisis'// Acute mental health emergency
  | 'medical_emergency';  // Urgent medical situation

export type EscalationTier =
  | 'low'       // 0.3-0.5: Show resources subtly
  | 'medium'    // 0.5-0.7: Show resources prominently
  | 'high'      // 0.7-0.85: Modal with resources
  | 'critical'; // 0.85+: Immediate crisis protocol

export interface CrisisDetectionResult {
  isCrisis: boolean;
  type?: CrisisType;
  confidence: number;        // 0-1
  escalationTier: EscalationTier;
  matchedPatterns: string[];
  recommendedAction: string;
  resources: CrisisResource[];
}

export interface CrisisResource {
  name: string;
  description: string;
  phone?: string;
  text?: string;
  website?: string;
  available: string;  // e.g., "24/7" or "Mon-Fri 9am-5pm"
}

export interface CrisisLog {
  id?: string;
  userId?: string;
  sessionId: string;
  message: string;
  detectionResult: CrisisDetectionResult;
  timestamp: string;
  acknowledged: boolean;
  actionTaken?: string;
}

// ============================================
// CRISIS RESOURCES
// ============================================

export const CRISIS_RESOURCES: Record<CrisisType, CrisisResource[]> = {
  suicidal_ideation: [
    {
      name: '988 Suicide & Crisis Lifeline',
      description: 'Free, confidential support for people in distress',
      phone: '988',
      text: '988',
      website: 'https://988lifeline.org',
      available: '24/7',
    },
    {
      name: 'Crisis Text Line',
      description: 'Text-based crisis support',
      text: 'HOME to 741741',
      website: 'https://crisistextline.org',
      available: '24/7',
    },
    {
      name: 'International Association for Suicide Prevention',
      description: 'Find a crisis center in your country',
      website: 'https://www.iasp.info/resources/Crisis_Centres/',
      available: 'Varies by location',
    },
  ],

  self_harm: [
    {
      name: '988 Suicide & Crisis Lifeline',
      description: 'Support for self-harm thoughts or behaviors',
      phone: '988',
      text: '988',
      available: '24/7',
    },
    {
      name: 'SAMHSA National Helpline',
      description: 'Treatment referral and information',
      phone: '1-800-662-4357',
      website: 'https://www.samhsa.gov/find-help/national-helpline',
      available: '24/7',
    },
  ],

  child_safety: [
    {
      name: 'Childhelp National Child Abuse Hotline',
      description: 'Help for children and adults about child abuse',
      phone: '1-800-422-4453',
      website: 'https://www.childhelp.org/hotline/',
      available: '24/7',
    },
    {
      name: 'Local Emergency Services',
      description: 'Call if a child is in immediate danger',
      phone: '911',
      available: '24/7',
    },
  ],

  domestic_violence: [
    {
      name: 'National Domestic Violence Hotline',
      description: 'Confidential support for domestic violence',
      phone: '1-800-799-7233',
      text: 'START to 88788',
      website: 'https://www.thehotline.org',
      available: '24/7',
    },
    {
      name: 'Local Emergency Services',
      description: 'Call if you are in immediate danger',
      phone: '911',
      available: '24/7',
    },
  ],

  caregiver_burnout: [
    {
      name: 'Caregiver Action Network Helpline',
      description: 'Support for family caregivers',
      phone: '1-855-227-3640',
      website: 'https://caregiveraction.org',
      available: 'Mon-Fri 8am-7pm ET',
    },
    {
      name: '988 Suicide & Crisis Lifeline',
      description: 'If burnout feels overwhelming',
      phone: '988',
      available: '24/7',
    },
  ],

  mental_health_crisis: [
    {
      name: '988 Suicide & Crisis Lifeline',
      description: 'Mental health crisis support',
      phone: '988',
      text: '988',
      available: '24/7',
    },
    {
      name: 'NAMI Helpline',
      description: 'Mental health support and education',
      phone: '1-800-950-6264',
      text: 'NAMI to 741741',
      website: 'https://www.nami.org/help',
      available: 'Mon-Fri 10am-10pm ET',
    },
  ],

  medical_emergency: [
    {
      name: 'Emergency Services',
      description: 'Call for medical emergencies',
      phone: '911',
      available: '24/7',
    },
    {
      name: 'Poison Control Center',
      description: 'If poisoning is suspected',
      phone: '1-800-222-1222',
      website: 'https://www.poison.org',
      available: '24/7',
    },
  ],
};

// ============================================
// DETECTION PATTERNS (Layer 1: Fast Regex)
// ============================================

interface CrisisPattern {
  type: CrisisType;
  patterns: RegExp[];
  baseConfidence: number;  // Starting confidence if matched
  weight: number;          // Multiplier for multiple matches
}

const CRISIS_PATTERNS: CrisisPattern[] = [
  // Suicidal ideation - highest priority
  {
    type: 'suicidal_ideation',
    patterns: [
      /\b(want(ing)?|going) to (die|end (it|my life)|kill myself)\b/i,
      /\b(suicid(e|al)|take my (own )?life)\b/i,
      /\b(don'?t want to (live|be here|exist|wake up))\b/i,
      /\b(better off (dead|without me)|world.{0,20}better.{0,10}without me)\b/i,
      /\b(no (reason|point) (to|in) (living|life|going on))\b/i,
      /\b(end(ing)? it all|can'?t go on)\b/i,
      /\b(plan(ning)? to (kill|hurt|end)|method|pills|jump|gun)\b/i,
    ],
    baseConfidence: 0.85,
    weight: 0.05,
  },

  // Self-harm
  {
    type: 'self_harm',
    patterns: [
      /\b(cut(ting)? (myself|my (wrists?|arms?|legs?|body)))\b/i,
      /\b(self[- ]?(harm|injur|mutilat))/i,
      /\b(burn(ing)? myself|hitting myself)\b/i,
      /\b(hurt(ing)? myself (on purpose|intentionally))\b/i,
      /\b(punish(ing)? myself|deserve (pain|to hurt))\b/i,
    ],
    baseConfidence: 0.8,
    weight: 0.05,
  },

  // Child safety
  {
    type: 'child_safety',
    patterns: [
      /\b(might|going to|want to) (hurt|harm|hit|shake|kill) (my )?(child|kid|baby|son|daughter)\b/i,
      /\b(child|kid|baby).{0,20}(in danger|not safe|being (hurt|abused|neglected))\b/i,
      /\b(afraid i('ll|'m going to| will) (hurt|harm) (my )?(child|kid|baby))\b/i,
      /\b(can'?t (control|stop) myself.{0,20}(child|kid))\b/i,
    ],
    baseConfidence: 0.9,
    weight: 0.05,
  },

  // Domestic violence
  {
    type: 'domestic_violence',
    patterns: [
      /\b((spouse|partner|husband|wife|boyfriend|girlfriend).{0,20}(hit(s|ting)?|beat(s|ing)?|hurt(s|ing)?|abus(e|es|ing)))\b/i,
      /\b(being (hit|beaten|abused|hurt) (by|at home))\b/i,
      /\b(domestic (violence|abuse)|physical abuse)\b/i,
      /\b(he('s| is)?|she('s| is)?) (hitting|hurting|abusing) me\b/i,
      /\b(afraid (of|for) my (life|safety))\b/i,
    ],
    baseConfidence: 0.85,
    weight: 0.05,
  },

  // Caregiver burnout (severe)
  {
    type: 'caregiver_burnout',
    patterns: [
      /\b(can'?t (do|take|handle) this anymore)\b/i,
      /\b(completely (exhausted|overwhelmed|broken|burned out))\b/i,
      /\b(at (my )?breaking point|about to (snap|break|lose it))\b/i,
      /\b(resent(ing)?|hate) (my )?(child|kid|being a (parent|mom|dad|caregiver))\b/i,
      /\b(want to (run away|leave|escape|give up))\b/i,
      /\b(losing my mind|going crazy|can'?t cope)\b/i,
    ],
    baseConfidence: 0.6,
    weight: 0.1,
  },

  // Mental health crisis
  {
    type: 'mental_health_crisis',
    patterns: [
      /\b(having a (mental )?breakdown|panic attack|psychotic)\b/i,
      /\b(hearing (voices|things)|seeing things (that aren'?t (there|real)))\b/i,
      /\b(losing (touch|grip) (with|on) reality)\b/i,
      /\b(can'?t (breathe|think|function|stop (crying|shaking)))\b/i,
      /\b(feel(ing)? (completely )?hopeless|no hope)\b/i,
    ],
    baseConfidence: 0.7,
    weight: 0.05,
  },

  // Medical emergency
  {
    type: 'medical_emergency',
    patterns: [
      /\b(overdose|od'?d|took too (many|much) (pills|medication))\b/i,
      /\b(child.{0,20}(not breathing|unconscious|choking|seiz(ure|ing)))\b/i,
      /\b(severe (allergic|reaction)|anaphyl)/i,
      /\b(poisoned|ate something (toxic|dangerous))\b/i,
    ],
    baseConfidence: 0.9,
    weight: 0.05,
  },
];

// ============================================
// CONTEXTUAL MODIFIERS
// ============================================

interface ContextModifier {
  pattern: RegExp;
  confidenceAdjustment: number;  // Can be positive or negative
  reason: string;
}

const CONTEXT_MODIFIERS: ContextModifier[] = [
  // Indicators that increase concern
  {
    pattern: /\b(plan|method|prepared|ready|tonight|today|now)\b/i,
    confidenceAdjustment: 0.15,
    reason: 'Immediacy or planning indicated',
  },
  {
    pattern: /\b(no one (cares|would notice|would miss)|all alone|no (support|help|one to turn to))\b/i,
    confidenceAdjustment: 0.1,
    reason: 'Isolation indicated',
  },
  {
    pattern: /\b(gave away|giving away|saying goodbye|final|last)\b/i,
    confidenceAdjustment: 0.15,
    reason: 'Final acts indicated',
  },
  {
    pattern: /\b(previous(ly)?|before|again|history of|tried before)\b/i,
    confidenceAdjustment: 0.1,
    reason: 'Prior history indicated',
  },

  // Indicators that may decrease concern (but still monitor)
  {
    pattern: /\b(hypothetical(ly)?|what if|wondering|curious|asking for a friend)\b/i,
    confidenceAdjustment: -0.1,
    reason: 'May be hypothetical',
  },
  {
    pattern: /\b(movie|book|tv|show|character|story|article|news)\b/i,
    confidenceAdjustment: -0.15,
    reason: 'May be about media content',
  },
  {
    pattern: /\b(used to|in the past|years ago|when i was younger)\b/i,
    confidenceAdjustment: -0.05,
    reason: 'May be historical reference',
  },
];

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Layer 1: Fast regex-based pre-screening
 */
function regexPreScreen(message: string): {
  matches: { type: CrisisType; patterns: string[]; baseConfidence: number }[];
  hasAnyMatch: boolean;
} {
  const matches: { type: CrisisType; patterns: string[]; baseConfidence: number }[] = [];

  for (const crisisPattern of CRISIS_PATTERNS) {
    const matchedPatterns: string[] = [];

    for (const pattern of crisisPattern.patterns) {
      const match = message.match(pattern);
      if (match) {
        matchedPatterns.push(match[0]);
      }
    }

    if (matchedPatterns.length > 0) {
      // Calculate confidence based on number of matches
      const confidence = Math.min(
        crisisPattern.baseConfidence + (matchedPatterns.length - 1) * crisisPattern.weight,
        0.95
      );

      matches.push({
        type: crisisPattern.type,
        patterns: matchedPatterns,
        baseConfidence: confidence,
      });
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.baseConfidence - a.baseConfidence);

  return {
    matches,
    hasAnyMatch: matches.length > 0,
  };
}

/**
 * Apply contextual modifiers to adjust confidence
 */
function applyContextModifiers(
  message: string,
  baseConfidence: number
): { adjustedConfidence: number; appliedModifiers: string[] } {
  let adjustedConfidence = baseConfidence;
  const appliedModifiers: string[] = [];

  for (const modifier of CONTEXT_MODIFIERS) {
    if (modifier.pattern.test(message)) {
      adjustedConfidence += modifier.confidenceAdjustment;
      appliedModifiers.push(modifier.reason);
    }
  }

  // Clamp confidence between 0 and 1
  adjustedConfidence = Math.max(0, Math.min(1, adjustedConfidence));

  return { adjustedConfidence, appliedModifiers };
}

/**
 * Determine escalation tier based on confidence
 */
function determineEscalationTier(confidence: number): EscalationTier {
  if (confidence >= 0.85) return 'critical';
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

/**
 * Get recommended action based on escalation tier
 */
function getRecommendedAction(tier: EscalationTier, type?: CrisisType): string {
  const actions: Record<EscalationTier, string> = {
    critical: 'Show immediate crisis modal. Require acknowledgment before continuing. Log for review.',
    high: 'Show prominent crisis resources. Display warm handoff option. Track engagement.',
    medium: 'Include crisis resources in response. Monitor for escalation.',
    low: 'Subtly include relevant resources. Continue monitoring.',
  };

  let action = actions[tier];

  // Add type-specific guidance
  if (type === 'child_safety' && tier !== 'critical') {
    action += ' Consider mandatory reporting requirements.';
  }

  return action;
}

// ============================================
// AI-POWERED DETECTION (Layer 2)
// ============================================

const getBackendUrl = () => `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

/**
 * AI-powered crisis detection for nuanced cases
 * Called when regex detection is inconclusive (0.3-0.6 confidence)
 */
async function aiCrisisClassification(
  message: string
): Promise<{ isCrisis: boolean; type?: CrisisType; confidence: number; reasoning?: string } | null> {
  try {
    const response = await fetch(`${getBackendUrl()}/ai/crisis-detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        message,
        prompt: CRISIS_CLASSIFICATION_PROMPT,
      }),
    });

    if (!response.ok) {
      console.error('[Crisis AI] Classification failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.classification || null;
  } catch (error) {
    console.error('[Crisis AI] Error:', error);
    return null;
  }
}

const CRISIS_CLASSIFICATION_PROMPT = `You are a crisis detection system for a parenting support app.
Analyze the message for signs of crisis. Be SENSITIVE but avoid false positives.

CRISIS TYPES TO DETECT:
1. suicidal_ideation - Thoughts of suicide or ending life
2. self_harm - Self-injury thoughts or behaviors
3. child_safety - Potential harm to a child
4. domestic_violence - Abuse or violence in the home
5. caregiver_burnout - Severe parental exhaustion (only if reaching crisis level)
6. mental_health_crisis - Acute psychological distress
7. medical_emergency - Urgent medical situation

IMPORTANT:
- Normal parenting stress is NOT a crisis
- "I'm exhausted" alone is NOT a crisis
- Look for SEVERE distress indicators
- Consider context and nuance
- When uncertain, lean toward detection (safety first)

Respond with JSON:
{
  "isCrisis": boolean,
  "type": string or null,
  "confidence": number (0-1),
  "reasoning": "brief explanation"
}`;

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

/**
 * Comprehensive crisis detection with multi-layer analysis
 * Layer 1: Fast regex pre-screening
 * Layer 2: AI classification for nuanced cases
 * Layer 3: Contextual modifiers
 */
export function detectCrisis(message: string): CrisisDetectionResult {
  // Layer 1: Fast regex pre-screening
  const { matches, hasAnyMatch } = regexPreScreen(message);

  if (!hasAnyMatch) {
    return {
      isCrisis: false,
      confidence: 0,
      escalationTier: 'low',
      matchedPatterns: [],
      recommendedAction: 'No crisis indicators detected',
      resources: [],
    };
  }

  // Get highest priority match
  const primaryMatch = matches[0];

  // Apply contextual modifiers
  const { adjustedConfidence, appliedModifiers } = applyContextModifiers(
    message,
    primaryMatch.baseConfidence
  );

  // Determine escalation tier
  const escalationTier = determineEscalationTier(adjustedConfidence);

  // Get resources for this crisis type
  const resources = CRISIS_RESOURCES[primaryMatch.type] || [];

  // Get recommended action
  const recommendedAction = getRecommendedAction(escalationTier, primaryMatch.type);

  return {
    isCrisis: true,
    type: primaryMatch.type,
    confidence: adjustedConfidence,
    escalationTier,
    matchedPatterns: [
      ...primaryMatch.patterns,
      ...appliedModifiers.map(m => `[Context: ${m}]`),
    ],
    recommendedAction,
    resources,
  };
}

/**
 * Async crisis detection with AI enhancement
 * Use this for more accurate detection when async is acceptable
 */
export async function detectCrisisEnhanced(message: string): Promise<CrisisDetectionResult> {
  // Layer 1: Fast regex pre-screening
  const { matches, hasAnyMatch } = regexPreScreen(message);

  // If no regex matches, try AI for subtle signals
  if (!hasAnyMatch) {
    // Check for subtle crisis language that regex might miss
    const subtleIndicators = /\b(can'?t (cope|go on|take it)|overwhelmed|breaking|hopeless|desperate|no way out)\b/i;

    if (subtleIndicators.test(message)) {
      // Use AI for nuanced detection
      const aiResult = await aiCrisisClassification(message);

      if (aiResult && aiResult.isCrisis && aiResult.confidence >= 0.5) {
        const type = aiResult.type as CrisisType || 'caregiver_burnout';
        const escalationTier = determineEscalationTier(aiResult.confidence);

        return {
          isCrisis: true,
          type,
          confidence: aiResult.confidence,
          escalationTier,
          matchedPatterns: [`[AI Detected: ${aiResult.reasoning || 'nuanced crisis signals'}]`],
          recommendedAction: getRecommendedAction(escalationTier, type),
          resources: CRISIS_RESOURCES[type] || CRISIS_RESOURCES.caregiver_burnout,
        };
      }
    }

    return {
      isCrisis: false,
      confidence: 0,
      escalationTier: 'low',
      matchedPatterns: [],
      recommendedAction: 'No crisis indicators detected',
      resources: [],
    };
  }

  // Get highest priority match
  const primaryMatch = matches[0];

  // Apply contextual modifiers
  let { adjustedConfidence, appliedModifiers } = applyContextModifiers(
    message,
    primaryMatch.baseConfidence
  );

  // Layer 2: AI enhancement for borderline cases (0.4-0.7 confidence)
  if (adjustedConfidence >= 0.4 && adjustedConfidence <= 0.7) {
    const aiResult = await aiCrisisClassification(message);

    if (aiResult) {
      // Blend AI confidence with regex confidence
      const blendedConfidence = (adjustedConfidence * 0.4) + (aiResult.confidence * 0.6);
      adjustedConfidence = Math.min(0.95, blendedConfidence);

      if (aiResult.reasoning) {
        appliedModifiers.push(`AI: ${aiResult.reasoning}`);
      }
    }
  }

  // Determine escalation tier with final confidence
  const escalationTier = determineEscalationTier(adjustedConfidence);

  // Get resources for this crisis type
  const resources = CRISIS_RESOURCES[primaryMatch.type] || [];

  // Get recommended action
  const recommendedAction = getRecommendedAction(escalationTier, primaryMatch.type);

  return {
    isCrisis: true,
    type: primaryMatch.type,
    confidence: adjustedConfidence,
    escalationTier,
    matchedPatterns: [
      ...primaryMatch.patterns,
      ...appliedModifiers.map(m => `[Context: ${m}]`),
    ],
    recommendedAction,
    resources,
  };
}

// ============================================
// CRISIS RESPONSE GENERATION
// ============================================

/**
 * Generate appropriate crisis response based on detection result
 */
export function generateCrisisResponse(result: CrisisDetectionResult): string {
  if (!result.isCrisis || !result.type) {
    return '';
  }

  const responses: Record<CrisisType, string> = {
    suicidal_ideation: `I hear you, and I'm so grateful you shared this with me. What you're feeling is real, and you don't have to face it alone.

**Please reach out right now:**
- **988 Suicide & Crisis Lifeline**: Call or text **988** (24/7)
- **Crisis Text Line**: Text **HOME to 741741** (24/7)
- **If you're in immediate danger, please call 911**

You matter. Your child needs you. Reaching out for help is a sign of strength, not weakness.

I'm here with you. Would you like to talk about what's been building up?`,

    self_harm: `I'm so sorry you're going through something this painful. Thank you for trusting me with this.

**If you're hurting right now, please reach out:**
- **988 Suicide & Crisis Lifeline**: Call or text **988** (24/7)
- **Crisis Text Line**: Text **HOME to 741741**

Your pain is valid, and there are people who understand and can help. Would you like to talk about what's happening?`,

    child_safety: `I can hear how overwhelmed you are. It takes courage to recognize when you're struggling.

**If you're worried about your child's safety, please reach out immediately:**
- **Childhelp National Hotline**: **1-800-422-4453** (24/7)
- **If a child is in immediate danger, call 911**

There is no shame in asking for help. What support do you need right now?`,

    domestic_violence: `Your safety matters. Thank you for trusting me with this.

**Please reach out for confidential support:**
- **National Domestic Violence Hotline**: **1-800-799-7233** (24/7)
- **Text**: **START to 88788**
- **If you're in immediate danger, call 911**

You deserve to be safe. I'm here to help however I can.`,

    caregiver_burnout: `I hear how exhausted you are. What you're feeling doesn't make you a bad parent—it makes you human. Caring for a child with extra needs is incredibly hard.

**You deserve support too:**
- **Caregiver Action Network**: **1-855-227-3640**
- **988 Lifeline** if feelings become overwhelming: Call or text **988**

What would help most right now? Even a small step matters.`,

    mental_health_crisis: `What you're experiencing sounds really frightening. You don't have to go through this alone.

**Please reach out for support:**
- **988 Suicide & Crisis Lifeline**: Call or text **988** (24/7)
- **NAMI Helpline**: **1-800-950-6264**

You deserve help right now. Can you tell me more about what's happening?`,

    medical_emergency: `This sounds like it could be a medical emergency.

**Please seek immediate help:**
- **Call 911** for emergencies
- **Poison Control**: **1-800-222-1222** (if poisoning suspected)

If you can, please call for help right now. Is there someone with you who can help?`,
  };

  return responses[result.type];
}

// ============================================
// LOGGING & ANALYTICS
// ============================================

/**
 * Log crisis detection for review and quality improvement
 * Note: Logs are stored securely and reviewed by trained staff
 */
export async function logCrisisDetection(
  log: Omit<CrisisLog, 'id' | 'timestamp'>
): Promise<void> {
  try {
    const { error } = await supabase.from('crisis_logs').insert({
      ...log,
      timestamp: new Date().toISOString(),
      // Sanitize the message for storage (remove PII if needed)
      message: log.message.substring(0, 500), // Truncate for storage
    });

    if (error) {
      console.error('[Crisis Detection] Failed to log:', error);
    }
  } catch (e) {
    // Never let logging failure affect the user experience
    console.error('[Crisis Detection] Logging error:', e);
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  detectCrisis,
  detectCrisisEnhanced,
  generateCrisisResponse,
  logCrisisDetection,
  CRISIS_RESOURCES,
};
