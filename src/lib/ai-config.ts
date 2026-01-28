/**
 * Aminy AI Configuration System
 *
 * Dynamic parameters for different query types to optimize response quality.
 * Configurable via Supabase for A/B testing.
 */

// ============================================
// TYPES
// ============================================

export type QueryType =
  | 'medical'       // Clinical questions (use low temperature for accuracy)
  | 'emotional'     // Parent emotional support (balanced temperature)
  | 'behavioral'    // ABA/behavior strategies (low-medium temperature)
  | 'creative'      // Activity ideas, games (higher creativity)
  | 'crisis'        // Crisis situations (very low temp, direct)
  | 'general'       // General chat (default balanced)
  | 'onboarding';   // Intake/onboarding (medium, friendly)

export interface AIConfig {
  temperature: number;        // 0.0-1.0, lower = more deterministic
  maxTokens: number;          // Response length limit
  presencePenalty: number;    // -2.0 to 2.0, positive = less repetition
  frequencyPenalty: number;   // -2.0 to 2.0, positive = more diverse vocab
  topP: number;               // Nucleus sampling threshold
}

export interface QueryClassification {
  type: QueryType;
  confidence: number;  // 0-1
  keywords: string[];  // Matched keywords
}

// ============================================
// QUERY TYPE CONFIGURATIONS
// ============================================

export const QUERY_CONFIGS: Record<QueryType, AIConfig> = {
  medical: {
    temperature: 0.3,        // Low: accurate, consistent medical info
    maxTokens: 1024,         // Medium: enough for explanation
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
    topP: 0.9,
  },

  emotional: {
    temperature: 0.7,        // Higher: warm, varied responses
    maxTokens: 512,          // Shorter: focused support
    presencePenalty: 0.3,
    frequencyPenalty: 0.2,
    topP: 0.95,
  },

  behavioral: {
    temperature: 0.5,        // Medium: balanced strategies
    maxTokens: 1024,         // Medium: detailed strategies
    presencePenalty: 0.2,
    frequencyPenalty: 0.1,
    topP: 0.9,
  },

  creative: {
    temperature: 0.85,       // High: creative activities
    maxTokens: 1024,         // Longer: detailed activity descriptions
    presencePenalty: 0.4,
    frequencyPenalty: 0.3,
    topP: 0.98,
  },

  crisis: {
    temperature: 0.2,        // Very low: precise, direct
    maxTokens: 512,          // Shorter: immediate help
    presencePenalty: 0.0,    // Allow repetition of resources
    frequencyPenalty: 0.0,
    topP: 0.85,
  },

  general: {
    temperature: 0.7,        // Default balanced
    maxTokens: 768,
    presencePenalty: 0.2,
    frequencyPenalty: 0.1,
    topP: 0.95,
  },

  onboarding: {
    temperature: 0.6,        // Friendly but consistent
    maxTokens: 512,          // Shorter: conversational
    presencePenalty: 0.3,
    frequencyPenalty: 0.2,
    topP: 0.9,
  },
};

// ============================================
// QUERY CLASSIFICATION
// ============================================

const QUERY_PATTERNS: { type: QueryType; patterns: RegExp[]; weight: number }[] = [
  // Crisis - highest priority
  {
    type: 'crisis',
    patterns: [
      /\b(suicide|suicidal|kill (myself|me)|end (my|it all))\b/i,
      /\b(self[- ]?harm|cutting|hurt myself)\b/i,
      /\b(can'?t (take|do) (this|it) anymore|give up|hopeless)\b/i,
      /\b(abuse|being hurt|violence|emergency)\b/i,
      /\b(crisis|urgent|help me now)\b/i,
    ],
    weight: 10, // Always prioritize
  },

  // Medical questions
  {
    type: 'medical',
    patterns: [
      /\b(diagnosis|diagnose|doctor|pediatrician|medication|medicine|drug)\b/i,
      /\b(symptoms|signs|condition|disorder|syndrome)\b/i,
      /\b(autism|adhd|add|asd|pdd|developmental delay)\b/i,
      /\b(speech delay|language delay|motor delay|milestone)\b/i,
      /\b(therapy|therapist|evaluation|assessment|screening)\b/i,
      /\b(genetic|brain|neural|cognitive|sensory processing)\b/i,
      /\b(should (i|we) see|what type of (doctor|specialist))\b/i,
    ],
    weight: 3,
  },

  // Behavioral/ABA
  {
    type: 'behavioral',
    patterns: [
      /\b(behavior|meltdown|tantrum|aggression|hitting|biting|screaming)\b/i,
      /\b(aba|reinforcement|reward|consequence|extinction)\b/i,
      /\b(antecedent|trigger|function|escape|attention)\b/i,
      /\b(routine|schedule|transition|visual (schedule|support))\b/i,
      /\b(token|chart|sticker|point system)\b/i,
      /\b(prompting|fading|chaining|shaping)\b/i,
      /\b(data (collection|tracking)|abc (data|chart))\b/i,
    ],
    weight: 3,
  },

  // Emotional support
  {
    type: 'emotional',
    patterns: [
      /\b(overwhelmed|exhausted|tired|stressed|burned out|burnout)\b/i,
      /\b(frustrated|frustrating|angry|upset|sad|crying)\b/i,
      /\b(guilt|guilty|bad (parent|mom|dad)|failing)\b/i,
      /\b(lonely|alone|isolated|no one understands)\b/i,
      /\b(scared|worried|anxious|afraid)\b/i,
      /\b(i (feel|am|'m)|how (do i|can i) cope)\b/i,
      /\b(support (group|me)|need (help|support|someone))\b/i,
    ],
    weight: 2,
  },

  // Creative activities
  {
    type: 'creative',
    patterns: [
      /\b(activity|activities|game|games|play|fun|idea)\b/i,
      /\b(craft|art|music|dance|sing|creative)\b/i,
      /\b(outdoor|indoor|rainy day|weekend)\b/i,
      /\b(sensory (bin|play|activity)|fidget|calming)\b/i,
      /\b(what (can|should) (we|i) do)\b/i,
      /\b(bored|entertain|engage|stimulate)\b/i,
    ],
    weight: 2,
  },

  // Onboarding (context-based, usually set programmatically)
  {
    type: 'onboarding',
    patterns: [
      /\b(just (started|joined|signed up)|new (here|to))\b/i,
      /\b(tell (me|you) about (myself|my child|us))\b/i,
    ],
    weight: 1,
  },
];

/**
 * Classify a user message to determine optimal AI parameters
 */
export function classifyQuery(message: string): QueryClassification {
  const scores: { type: QueryType; score: number; keywords: string[] }[] = [];

  for (const { type, patterns, weight } of QUERY_PATTERNS) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const pattern of patterns) {
      const matches = message.match(pattern);
      if (matches) {
        score += weight;
        matchedKeywords.push(matches[0]);
      }
    }

    if (score > 0) {
      scores.push({ type, score, keywords: matchedKeywords });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  if (scores.length > 0 && scores[0].score >= 2) {
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    return {
      type: scores[0].type,
      confidence: Math.min(scores[0].score / totalScore, 1),
      keywords: scores[0].keywords,
    };
  }

  // Default to general
  return {
    type: 'general',
    confidence: 0.5,
    keywords: [],
  };
}

/**
 * Get AI configuration for a query type
 */
export function getAIConfig(queryType: QueryType): AIConfig {
  return QUERY_CONFIGS[queryType] || QUERY_CONFIGS.general;
}

/**
 * Get AI configuration based on message content
 */
export function getConfigForMessage(message: string): { config: AIConfig; classification: QueryClassification } {
  const classification = classifyQuery(message);
  const config = getAIConfig(classification.type);
  return { config, classification };
}

/**
 * Merge custom options with query-based config
 */
export function mergeConfig(
  baseConfig: AIConfig,
  overrides: Partial<AIConfig>
): AIConfig {
  return {
    ...baseConfig,
    ...overrides,
  };
}

// ============================================
// SYSTEM PROMPT VERSIONING
// ============================================

export interface SystemPromptVersion {
  id: string;
  version: string;
  prompt: string;
  createdAt: string;
  isActive: boolean;
  metadata?: {
    author?: string;
    changes?: string;
    abTestGroup?: string;
  };
}

// Current active version - can be updated via Supabase
let activePromptVersion = 'v1.0.0';

export function getActivePromptVersion(): string {
  return activePromptVersion;
}

export function setActivePromptVersion(version: string): void {
  activePromptVersion = version;
}

// ============================================
// CONFIDENCE SCORING
// ============================================

export interface ConfidenceIndicators {
  isUncertain: boolean;
  shouldDisclaim: boolean;
  uncertaintyPhrases: string[];
}

const UNCERTAINTY_PATTERNS = [
  /\b(every child is different|varies (widely|greatly)|depends on)\b/i,
  /\b(consult (your|a) (doctor|pediatrician|specialist|professional))\b/i,
  /\b(i'?m not (sure|certain)|i don'?t know)\b/i,
  /\b(research (is|shows) (mixed|inconclusive|limited))\b/i,
];

const MEDICAL_DISCLAIMER_TRIGGERS = [
  /\b(diagnosis|diagnose|medication|dosage|prescription)\b/i,
  /\b(treatment|therapy) (plan|options|recommendations)\b/i,
  /\b(should (you|i|we) (try|start|stop|change))\b/i,
];

/**
 * Analyze a response for confidence indicators
 */
export function analyzeConfidence(
  userMessage: string,
  aiResponse: string
): ConfidenceIndicators {
  const uncertaintyPhrases: string[] = [];

  // Check for uncertainty in the response
  for (const pattern of UNCERTAINTY_PATTERNS) {
    const matches = aiResponse.match(pattern);
    if (matches) {
      uncertaintyPhrases.push(matches[0]);
    }
  }

  // Check if the query requires medical disclaimer
  const needsDisclaimer = MEDICAL_DISCLAIMER_TRIGGERS.some(p => p.test(userMessage));

  return {
    isUncertain: uncertaintyPhrases.length > 0,
    shouldDisclaim: needsDisclaimer,
    uncertaintyPhrases,
  };
}

/**
 * Add appropriate disclaimers to AI response if needed
 */
export function addDisclaimersIfNeeded(
  response: string,
  indicators: ConfidenceIndicators
): string {
  if (!indicators.shouldDisclaim) {
    return response;
  }

  // Check if response already has a disclaimer
  if (/consult (your|a) (doctor|pediatrician|healthcare|medical)/i.test(response)) {
    return response;
  }

  // Add gentle disclaimer
  return response + '\n\n*As always, please consult with your healthcare provider for personalized medical advice.*';
}

export default {
  classifyQuery,
  getAIConfig,
  getConfigForMessage,
  mergeConfig,
  analyzeConfidence,
  addDisclaimersIfNeeded,
  QUERY_CONFIGS,
};
