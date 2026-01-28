/**
 * Provider Routing System
 *
 * Automatic detection of complex issues that would benefit from professional support.
 * Features:
 * - Issue complexity scoring
 * - Provider type recommendation
 * - Warm handoff to marketplace
 * - Outcome tracking
 * - Urgency-based routing
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type ProviderType =
  | 'bcba'              // Board Certified Behavior Analyst
  | 'slp'               // Speech-Language Pathologist
  | 'ot'                // Occupational Therapist
  | 'psychologist'      // Clinical Psychologist
  | 'developmental_ped' // Developmental Pediatrician
  | 'psychiatrist'      // Child Psychiatrist
  | 'counselor'         // Licensed Counselor/Therapist
  | 'special_ed'        // Special Education Advocate
  | 'parent_coach';     // Parent Coach/Support

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface RoutingRecommendation {
  shouldRoute: boolean;
  confidence: number;           // 0-1
  recommendedProviders: ProviderType[];
  primaryProvider: ProviderType;
  urgency: UrgencyLevel;
  reasoning: string;
  suggestedApproach: string;
  relatedTopics: string[];
  estimatedCost?: {
    min: number;
    max: number;
    typical: number;
  };
}

export interface RoutingContext {
  message: string;
  conversationHistory?: string[];
  childAge?: number;
  diagnoses?: string[];
  currentConcerns?: string[];
  previousProviders?: string[];
  tier?: string;
}

export interface RoutingOutcome {
  id: string;
  userId: string;
  recommendationId: string;
  providerType: ProviderType;
  action: 'viewed' | 'clicked' | 'booked' | 'completed' | 'dismissed';
  timestamp: string;
  satisfaction?: number;
  feedback?: string;
}

// ============================================================================
// COMPLEXITY INDICATORS
// ============================================================================

/**
 * Patterns that indicate need for professional support
 */
const COMPLEXITY_INDICATORS: Array<{
  pattern: RegExp;
  weight: number;
  providers: ProviderType[];
  urgency: UrgencyLevel;
  topic: string;
}> = [
  // Behavioral concerns - high complexity
  {
    pattern: /\b(aggressive|hits|bites|self.?injur|head.?bang|self.?harm|violent|attack)\b/i,
    weight: 0.9,
    providers: ['bcba', 'psychologist'],
    urgency: 'high',
    topic: 'behavioral-safety',
  },
  {
    pattern: /\b(elopement|runs away|escape|bolts|wander)\b/i,
    weight: 0.85,
    providers: ['bcba', 'psychologist'],
    urgency: 'high',
    topic: 'safety-elopement',
  },
  {
    pattern: /\b(severe|extreme|constant|daily).*(meltdown|tantrum|outburst)/i,
    weight: 0.8,
    providers: ['bcba', 'psychologist', 'counselor'],
    urgency: 'medium',
    topic: 'behavioral-regulation',
  },

  // Speech and communication
  {
    pattern: /\b(non.?verbal|no words|can'?t speak|doesn'?t talk|speech delay|not talking)\b/i,
    weight: 0.85,
    providers: ['slp', 'developmental_ped'],
    urgency: 'medium',
    topic: 'speech-delay',
  },
  {
    pattern: /\b(stuttering|stutter|stammering|fluency|apraxia)\b/i,
    weight: 0.75,
    providers: ['slp'],
    urgency: 'low',
    topic: 'speech-fluency',
  },
  {
    pattern: /\b(aac|communication device|alternative communication)\b/i,
    weight: 0.8,
    providers: ['slp'],
    urgency: 'medium',
    topic: 'aac',
  },

  // Sensory and motor
  {
    pattern: /\b(sensory|overstimulat|understimulat|sensory.?(seeking|avoid))\b/i,
    weight: 0.7,
    providers: ['ot'],
    urgency: 'low',
    topic: 'sensory-processing',
  },
  {
    pattern: /\b(fine motor|gross motor|coordination|handwriting|motor delay)\b/i,
    weight: 0.65,
    providers: ['ot'],
    urgency: 'low',
    topic: 'motor-skills',
  },
  {
    pattern: /\b(feeding|eating|picky eater|food aversion|swallow|choking)\b/i,
    weight: 0.7,
    providers: ['ot', 'slp'],
    urgency: 'medium',
    topic: 'feeding',
  },

  // Medical and diagnostic
  {
    pattern: /\b(diagnosis|evaluation|assessment|screening|testing)\b/i,
    weight: 0.75,
    providers: ['developmental_ped', 'psychologist'],
    urgency: 'medium',
    topic: 'diagnosis',
  },
  {
    pattern: /\b(medication|medicate|prescri|stimulant|ADHD med|antipsychotic)\b/i,
    weight: 0.8,
    providers: ['psychiatrist', 'developmental_ped'],
    urgency: 'medium',
    topic: 'medication',
  },
  {
    pattern: /\b(sleep|insomnia|won'?t sleep|night waking|melatonin)\b/i,
    weight: 0.6,
    providers: ['developmental_ped', 'bcba'],
    urgency: 'low',
    topic: 'sleep',
  },

  // Educational and advocacy
  {
    pattern: /\b(iep|504|special education|placement|school district|advocate)\b/i,
    weight: 0.7,
    providers: ['special_ed'],
    urgency: 'medium',
    topic: 'educational-advocacy',
  },
  {
    pattern: /\b(denied|refused|school won'?t|fighting the school)\b/i,
    weight: 0.85,
    providers: ['special_ed'],
    urgency: 'high',
    topic: 'educational-advocacy',
  },

  // Mental health
  {
    pattern: /\b(anxiety|anxious|worried|panic|fears|phobia)\b/i,
    weight: 0.65,
    providers: ['psychologist', 'counselor'],
    urgency: 'low',
    topic: 'anxiety',
  },
  {
    pattern: /\b(depressed|depression|sad|hopeless|withdrawal|isolated)\b/i,
    weight: 0.75,
    providers: ['psychologist', 'counselor', 'psychiatrist'],
    urgency: 'medium',
    topic: 'mood',
  },
  {
    pattern: /\b(trauma|ptsd|abuse|neglect|foster)\b/i,
    weight: 0.85,
    providers: ['psychologist', 'counselor'],
    urgency: 'high',
    topic: 'trauma',
  },

  // Parent support
  {
    pattern: /\b(overwhelmed|burnout|can'?t cope|exhausted|giving up|at.?wit'?s.?end)\b/i,
    weight: 0.7,
    providers: ['parent_coach', 'counselor'],
    urgency: 'medium',
    topic: 'caregiver-support',
  },
  {
    pattern: /\b(marriage|relationship|divorce|co.?parent|partner disagrees)\b/i,
    weight: 0.6,
    providers: ['counselor', 'parent_coach'],
    urgency: 'low',
    topic: 'family-dynamics',
  },

  // Toilet training
  {
    pattern: /\b(potty train|toilet train|not potty trained|still in diapers|accidents)\b/i,
    weight: 0.5,
    providers: ['bcba', 'ot'],
    urgency: 'low',
    topic: 'toilet-training',
  },
];

// ============================================================================
// PROVIDER INFO
// ============================================================================

export const PROVIDER_INFO: Record<ProviderType, {
  title: string;
  description: string;
  typicalCost: { min: number; max: number; typical: number };
  credentials: string[];
  commonApproaches: string[];
}> = {
  bcba: {
    title: 'Board Certified Behavior Analyst (BCBA)',
    description: 'Specializes in behavior assessment and intervention using Applied Behavior Analysis (ABA)',
    typicalCost: { min: 75, max: 200, typical: 125 },
    credentials: ['BCBA', 'BCBA-D', 'LBA'],
    commonApproaches: ['ABA therapy', 'Behavior intervention plans', 'Parent training', 'Functional behavior assessment'],
  },
  slp: {
    title: 'Speech-Language Pathologist (SLP)',
    description: 'Addresses speech, language, communication, and feeding/swallowing difficulties',
    typicalCost: { min: 100, max: 250, typical: 150 },
    credentials: ['CCC-SLP', 'CF-SLP'],
    commonApproaches: ['Speech therapy', 'AAC evaluation', 'Language intervention', 'Social communication groups'],
  },
  ot: {
    title: 'Occupational Therapist (OT)',
    description: 'Helps with sensory processing, fine motor skills, daily living activities',
    typicalCost: { min: 100, max: 200, typical: 140 },
    credentials: ['OTR/L', 'COTA'],
    commonApproaches: ['Sensory integration', 'Fine motor development', 'Self-care skills', 'Handwriting'],
  },
  psychologist: {
    title: 'Clinical Psychologist',
    description: 'Provides psychological evaluation, diagnosis, and therapeutic intervention',
    typicalCost: { min: 150, max: 350, typical: 200 },
    credentials: ['PhD', 'PsyD', 'Licensed Psychologist'],
    commonApproaches: ['Psychological testing', 'CBT', 'Play therapy', 'Family therapy'],
  },
  developmental_ped: {
    title: 'Developmental Pediatrician',
    description: 'Medical doctor specializing in developmental and behavioral issues in children',
    typicalCost: { min: 200, max: 500, typical: 350 },
    credentials: ['MD', 'DO', 'Board Certified in Developmental-Behavioral Pediatrics'],
    commonApproaches: ['Diagnostic evaluation', 'Medication management', 'Care coordination'],
  },
  psychiatrist: {
    title: 'Child Psychiatrist',
    description: 'Medical doctor specializing in mental health medication and treatment',
    typicalCost: { min: 200, max: 400, typical: 275 },
    credentials: ['MD', 'DO', 'Board Certified in Child Psychiatry'],
    commonApproaches: ['Medication management', 'Psychiatric evaluation', 'Treatment planning'],
  },
  counselor: {
    title: 'Licensed Counselor/Therapist',
    description: 'Provides individual, family, and group therapy for mental health concerns',
    typicalCost: { min: 75, max: 175, typical: 125 },
    credentials: ['LCSW', 'LPC', 'LMFT', 'LCPC'],
    commonApproaches: ['Individual therapy', 'Family therapy', 'Play therapy', 'Support groups'],
  },
  special_ed: {
    title: 'Special Education Advocate',
    description: 'Helps families navigate the special education system and IEP process',
    typicalCost: { min: 100, max: 300, typical: 175 },
    credentials: ['Educational Advocate', 'Special Education Law expertise'],
    commonApproaches: ['IEP preparation', 'Meeting attendance', 'Dispute resolution', 'School communication'],
  },
  parent_coach: {
    title: 'Parent Coach',
    description: 'Provides practical strategies and emotional support for parents',
    typicalCost: { min: 50, max: 150, typical: 85 },
    credentials: ['Certified Parent Coach', 'Family support specialist'],
    commonApproaches: ['Parent training', 'Behavior strategies', 'Stress management', 'Goal setting'],
  },
};

// ============================================================================
// ROUTING FUNCTIONS
// ============================================================================

/**
 * Analyze a message/conversation for routing needs
 */
export function analyzeForRouting(context: RoutingContext): RoutingRecommendation {
  const { message, conversationHistory = [], childAge, diagnoses = [] } = context;

  // Combine message with recent history for better context
  const fullText = [message, ...conversationHistory.slice(0, 5)].join(' ');

  // Find matching indicators
  const matches: Array<{
    weight: number;
    providers: ProviderType[];
    urgency: UrgencyLevel;
    topic: string;
  }> = [];

  for (const indicator of COMPLEXITY_INDICATORS) {
    if (indicator.pattern.test(fullText)) {
      matches.push({
        weight: indicator.weight,
        providers: indicator.providers,
        urgency: indicator.urgency,
        topic: indicator.topic,
      });
    }
  }

  // No matches = no routing needed
  if (matches.length === 0) {
    return {
      shouldRoute: false,
      confidence: 0,
      recommendedProviders: [],
      primaryProvider: 'parent_coach',
      urgency: 'low',
      reasoning: 'No complex issues detected that require professional intervention.',
      suggestedApproach: 'Continue with AI-guided support.',
      relatedTopics: [],
    };
  }

  // Calculate overall confidence
  const maxWeight = Math.max(...matches.map(m => m.weight));
  const avgWeight = matches.reduce((sum, m) => sum + m.weight, 0) / matches.length;
  const confidence = Math.min(1, (maxWeight * 0.7 + avgWeight * 0.3) + (matches.length > 2 ? 0.1 : 0));

  // Aggregate providers with frequency weighting
  const providerCounts = new Map<ProviderType, number>();
  for (const match of matches) {
    for (const provider of match.providers) {
      providerCounts.set(provider, (providerCounts.get(provider) || 0) + match.weight);
    }
  }

  // Sort providers by score
  const sortedProviders = Array.from(providerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([provider]) => provider);

  // Determine urgency (highest from matches)
  const urgencyOrder: UrgencyLevel[] = ['urgent', 'high', 'medium', 'low'];
  const urgency = urgencyOrder.find(u => matches.some(m => m.urgency === u)) || 'low';

  // Collect unique topics
  const topics = [...new Set(matches.map(m => m.topic))];

  // Get primary provider info
  const primaryProvider = sortedProviders[0] || 'parent_coach';
  const providerInfo = PROVIDER_INFO[primaryProvider];

  // Generate reasoning
  const reasoning = generateReasoning(matches, primaryProvider, childAge);

  // Generate suggested approach
  const suggestedApproach = generateApproach(primaryProvider, topics);

  return {
    shouldRoute: confidence >= 0.5,
    confidence,
    recommendedProviders: sortedProviders.slice(0, 3),
    primaryProvider,
    urgency,
    reasoning,
    suggestedApproach,
    relatedTopics: topics,
    estimatedCost: providerInfo.typicalCost,
  };
}

/**
 * Generate human-readable reasoning for the recommendation
 */
function generateReasoning(
  matches: Array<{ topic: string; weight: number }>,
  primaryProvider: ProviderType,
  childAge?: number
): string {
  const providerInfo = PROVIDER_INFO[primaryProvider];
  const topicSummary = matches.map(m => m.topic.replace(/-/g, ' ')).slice(0, 3).join(', ');

  let reasoning = `Based on concerns about ${topicSummary}, a ${providerInfo.title} could provide specialized support. `;

  if (childAge && childAge < 5) {
    reasoning += 'Early intervention is especially important at this age. ';
  }

  reasoning += `They typically help with ${providerInfo.commonApproaches.slice(0, 2).join(' and ')}.`;

  return reasoning;
}

/**
 * Generate suggested approach text
 */
function generateApproach(primaryProvider: ProviderType, topics: string[]): string {
  const providerInfo = PROVIDER_INFO[primaryProvider];

  const approaches: Record<string, string> = {
    'behavioral-safety': 'Start with a functional behavior assessment to understand the root causes and develop a safety plan.',
    'speech-delay': 'A comprehensive speech-language evaluation can identify specific areas of need and guide therapy.',
    'sensory-processing': 'An occupational therapy evaluation can assess sensory needs and create a sensory diet.',
    'diagnosis': 'A comprehensive developmental evaluation can provide clarity and guide treatment planning.',
    'educational-advocacy': 'Review your rights under IDEA and prepare documentation for your next IEP meeting.',
    'caregiver-support': 'Self-care is essential. Consider support groups and respite care options.',
    'medication': 'Discuss concerns with a prescribing provider who can review options and monitor effects.',
  };

  const matchedApproach = topics.find(t => approaches[t]);
  if (matchedApproach) {
    return approaches[matchedApproach];
  }

  return `Consider scheduling an initial consultation with a ${providerInfo.title} to discuss your specific concerns and develop a plan.`;
}

/**
 * Generate warm handoff message for transitioning to provider
 */
export function generateWarmHandoffMessage(
  recommendation: RoutingRecommendation,
  userName?: string
): string {
  const providerInfo = PROVIDER_INFO[recommendation.primaryProvider];

  let message = '';

  if (userName) {
    message += `${userName}, `;
  }

  message += `I've noticed some things in our conversation that might benefit from professional support. `;

  switch (recommendation.urgency) {
    case 'urgent':
      message += 'This seems important to address soon. ';
      break;
    case 'high':
      message += 'I\'d recommend connecting with a professional when you can. ';
      break;
    default:
      message += 'When you\'re ready, talking to a specialist could be really helpful. ';
  }

  message += `\n\nA ${providerInfo.title} could help with what you're describing. `;
  message += recommendation.suggestedApproach;

  message += '\n\nWould you like me to help you find providers in your area?';

  return message;
}

// ============================================================================
// OUTCOME TRACKING
// ============================================================================

/**
 * Track when a routing recommendation is shown
 */
export async function trackRoutingShown(
  userId: string,
  recommendation: RoutingRecommendation
): Promise<string> {
  const id = `routing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    await supabase.from('provider_routing_outcomes').insert({
      id,
      user_id: userId,
      provider_type: recommendation.primaryProvider,
      recommended_providers: recommendation.recommendedProviders,
      confidence: recommendation.confidence,
      urgency: recommendation.urgency,
      topics: recommendation.relatedTopics,
      action: 'viewed',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[ProviderRouting] Failed to track:', error);
  }

  return id;
}

/**
 * Track user action on a routing recommendation
 */
export async function trackRoutingAction(
  routingId: string,
  action: RoutingOutcome['action'],
  details?: { satisfaction?: number; feedback?: string }
): Promise<void> {
  try {
    await supabase
      .from('provider_routing_outcomes')
      .update({
        action,
        satisfaction: details?.satisfaction,
        feedback: details?.feedback,
        action_at: new Date().toISOString(),
      })
      .eq('id', routingId);
  } catch (error) {
    console.warn('[ProviderRouting] Failed to track action:', error);
  }
}

/**
 * Get routing analytics for admin dashboard
 */
export async function getRoutingAnalytics(): Promise<{
  totalRecommendations: number;
  conversionRate: number;
  byProviderType: Record<string, { shown: number; booked: number }>;
  byUrgency: Record<UrgencyLevel, { shown: number; acted: number }>;
  topTopics: Array<{ topic: string; count: number }>;
}> {
  try {
    const { data } = await supabase
      .from('provider_routing_outcomes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!data || data.length === 0) {
      return {
        totalRecommendations: 0,
        conversionRate: 0,
        byProviderType: {},
        byUrgency: { low: { shown: 0, acted: 0 }, medium: { shown: 0, acted: 0 }, high: { shown: 0, acted: 0 }, urgent: { shown: 0, acted: 0 } },
        topTopics: [],
      };
    }

    const totalRecommendations = data.length;
    const bookings = data.filter(d => d.action === 'booked').length;
    const conversionRate = bookings / totalRecommendations;

    // By provider type
    const byProviderType: Record<string, { shown: number; booked: number }> = {};
    for (const row of data) {
      const provider = row.provider_type;
      if (!byProviderType[provider]) {
        byProviderType[provider] = { shown: 0, booked: 0 };
      }
      byProviderType[provider].shown++;
      if (row.action === 'booked') {
        byProviderType[provider].booked++;
      }
    }

    // By urgency
    const byUrgency: Record<UrgencyLevel, { shown: number; acted: number }> = {
      low: { shown: 0, acted: 0 },
      medium: { shown: 0, acted: 0 },
      high: { shown: 0, acted: 0 },
      urgent: { shown: 0, acted: 0 },
    };
    for (const row of data) {
      const urgency = row.urgency as UrgencyLevel;
      if (byUrgency[urgency]) {
        byUrgency[urgency].shown++;
        if (['clicked', 'booked', 'completed'].includes(row.action)) {
          byUrgency[urgency].acted++;
        }
      }
    }

    // Top topics
    const topicCounts = new Map<string, number>();
    for (const row of data) {
      for (const topic of row.topics || []) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }
    const topTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    return {
      totalRecommendations,
      conversionRate,
      byProviderType,
      byUrgency,
      topTopics,
    };
  } catch (error) {
    console.error('[ProviderRouting] Analytics error:', error);
    return {
      totalRecommendations: 0,
      conversionRate: 0,
      byProviderType: {},
      byUrgency: { low: { shown: 0, acted: 0 }, medium: { shown: 0, acted: 0 }, high: { shown: 0, acted: 0 }, urgent: { shown: 0, acted: 0 } },
      topTopics: [],
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  analyzeForRouting,
  generateWarmHandoffMessage,
  trackRoutingShown,
  trackRoutingAction,
  getRoutingAnalytics,
  PROVIDER_INFO,
};
