/**
 * AI-Powered Fact Extraction
 *
 * Extracts meaningful facts from conversations to build
 * the child's profile and improve personalization.
 */

import { MemoryFact } from './memory-system';

// ============================================
// TYPES
// ============================================

export interface ExtractedFact {
  category: MemoryFact['category'];
  content: string;
  confidence: number;
  source: string;
}

export interface ExtractionPattern {
  pattern: RegExp;
  category: MemoryFact['category'];
  extractor: (match: RegExpMatchArray) => string;
  confidence: number;
}

// ============================================
// EXTRACTION PATTERNS
// ============================================

const EXTRACTION_PATTERNS: ExtractionPattern[] = [
  // PREFERENCES - What the child loves/enjoys
  {
    pattern: /(?:(?:he|she|they|my (?:son|daughter|child|kid))\s+)?(?:really\s+)?(?:loves?|adores?|enjoys?|is\s+(?:really\s+)?into)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'preference',
    extractor: (m) => m[1].trim(),
    confidence: 0.85,
  },
  {
    pattern: /(?:favorite|favourite)\s+(?:thing|activity|toy|food|show|game|place)\s+(?:is|are)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'preference',
    extractor: (m) => m[1].trim(),
    confidence: 0.9,
  },
  {
    pattern: /(?:gets?\s+(?:really\s+)?(?:excited|happy)|lights?\s+up)\s+(?:about|when|with)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'preference',
    extractor: (m) => m[1].trim(),
    confidence: 0.8,
  },
  {
    pattern: /special\s+interest(?:s)?\s+(?:is|are|in|include)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'preference',
    extractor: (m) => m[1].trim(),
    confidence: 0.9,
  },

  // TRIGGERS - What causes distress
  {
    pattern: /(?:triggers?|sets?\s+(?:him|her|them)\s+off|causes?\s+(?:a\s+)?(?:meltdown|tantrum|distress))\s+(?:is|are|when|include)?\s*(.+?)(?:\.|,|!|$)/gi,
    category: 'trigger',
    extractor: (m) => m[1].trim(),
    confidence: 0.9,
  },
  {
    pattern: /(?:can't|cannot|can\s+not)\s+(?:handle|tolerate|stand)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'trigger',
    extractor: (m) => m[1].trim(),
    confidence: 0.85,
  },
  {
    pattern: /(?:gets?\s+(?:really\s+)?(?:upset|overwhelmed|anxious|stressed))\s+(?:by|when|with|about)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'trigger',
    extractor: (m) => m[1].trim(),
    confidence: 0.85,
  },
  {
    pattern: /(?:sensory\s+)?(?:overload|overwhelm)\s+(?:from|with|when)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'trigger',
    extractor: (m) => `sensory: ${m[1].trim()}`,
    confidence: 0.9,
  },
  {
    pattern: /(?:hates?|despises?|can't\s+stand)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'trigger',
    extractor: (m) => m[1].trim(),
    confidence: 0.8,
  },
  {
    pattern: /transition(?:s|ing)?\s+(?:are|is)\s+(?:really\s+)?(?:hard|difficult|challenging)/gi,
    category: 'trigger',
    extractor: () => 'transitions between activities',
    confidence: 0.9,
  },

  // STRENGTHS - What the child is good at
  {
    pattern: /(?:really\s+)?(?:good|great|excellent|amazing)\s+at\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'strength',
    extractor: (m) => m[1].trim(),
    confidence: 0.85,
  },
  {
    pattern: /strength(?:s)?\s+(?:is|are|include)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'strength',
    extractor: (m) => m[1].trim(),
    confidence: 0.9,
  },
  {
    pattern: /(?:excels?|thrives?)\s+(?:at|in|with)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'strength',
    extractor: (m) => m[1].trim(),
    confidence: 0.85,
  },
  {
    pattern: /(?:has\s+(?:an?\s+)?)?(?:incredible|amazing|great)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'strength',
    extractor: (m) => m[1].trim(),
    confidence: 0.75,
  },

  // CHALLENGES - What the child struggles with
  {
    pattern: /(?:struggles?|has\s+(?:a\s+)?(?:hard|difficult)\s+time)\s+(?:with|when)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'challenge',
    extractor: (m) => m[1].trim(),
    confidence: 0.85,
  },
  {
    pattern: /(?:challenge|difficulty|problem)\s+(?:is|with)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'challenge',
    extractor: (m) => m[1].trim(),
    confidence: 0.85,
  },
  {
    pattern: /(?:working\s+on|needs?\s+(?:help|support)\s+with)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'challenge',
    extractor: (m) => m[1].trim(),
    confidence: 0.8,
  },
  {
    pattern: /(?:can't|cannot|doesn't|does\s+not)\s+(?:yet\s+)?(.+?)(?:\s+yet)?(?:\.|,|!|$)/gi,
    category: 'challenge',
    extractor: (m) => m[1].trim(),
    confidence: 0.7,
  },

  // STRATEGIES - What helps
  {
    pattern: /(?:what\s+)?(?:helps?|works?)\s+(?:is|are)?\s*(.+?)(?:\.|,|!|$)/gi,
    category: 'strategy',
    extractor: (m) => m[1].trim(),
    confidence: 0.85,
  },
  {
    pattern: /(?:calms?\s+(?:him|her|them)\s+down|helps?\s+(?:him|her|them)\s+calm)\s+(?:is|when|with)?\s*(.+?)(?:\.|,|!|$)/gi,
    category: 'strategy',
    extractor: (m) => `calming: ${m[1].trim()}`,
    confidence: 0.9,
  },
  {
    pattern: /(?:we\s+)?(?:use|try|found)\s+(.+?)\s+(?:and\s+it\s+)?(?:helps?|works?)/gi,
    category: 'strategy',
    extractor: (m) => m[1].trim(),
    confidence: 0.85,
  },
  {
    pattern: /(?:visual\s+)?(?:schedule|timer|countdown|first-then)\s+(?:really\s+)?(?:helps?|works?)/gi,
    category: 'strategy',
    extractor: () => 'visual supports (schedules, timers)',
    confidence: 0.9,
  },
  {
    pattern: /(?:deep\s+pressure|weighted\s+(?:blanket|vest)|compression)/gi,
    category: 'strategy',
    extractor: () => 'deep pressure / proprioceptive input',
    confidence: 0.9,
  },
  {
    pattern: /(?:needs?\s+)?(?:advance|prior)\s+warning\s+(?:before|for)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'strategy',
    extractor: (m) => `advance warning for ${m[1].trim()}`,
    confidence: 0.85,
  },

  // MILESTONES - Recent achievements
  {
    pattern: /(?:just|recently|finally)\s+(?:started|learned|began|can\s+now)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'milestone',
    extractor: (m) => m[1].trim(),
    confidence: 0.85,
  },
  {
    pattern: /(?:first\s+time)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'milestone',
    extractor: (m) => `first time: ${m[1].trim()}`,
    confidence: 0.85,
  },
  {
    pattern: /(?:big|huge|major)\s+(?:win|milestone|achievement|progress)\s+(?:was|is|today)?\s*(.+?)(?:\.|,|!|$)/gi,
    category: 'milestone',
    extractor: (m) => m[1].trim(),
    confidence: 0.9,
  },

  // MEDICAL - Health-related information
  {
    pattern: /(?:diagnosed\s+with|has\s+(?:a\s+)?diagnosis\s+of|dx(?:ed)?(?:\s+with)?)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'medical',
    extractor: (m) => `diagnosis: ${m[1].trim()}`,
    confidence: 0.95,
  },
  {
    pattern: /(?:taking|on|prescribed)\s+(.+?)\s+(?:medication|medicine|meds?)/gi,
    category: 'medical',
    extractor: (m) => `medication: ${m[1].trim()}`,
    confidence: 0.9,
  },
  {
    pattern: /(?:allergic|allergy)\s+(?:to|is|are)\s+(.+?)(?:\.|,|!|$)/gi,
    category: 'medical',
    extractor: (m) => `allergy: ${m[1].trim()}`,
    confidence: 0.95,
  },
  {
    pattern: /(?:sleep|sleeping)\s+(?:issues?|problems?|disorder|apnea)/gi,
    category: 'medical',
    extractor: () => 'sleep difficulties',
    confidence: 0.85,
  },
  {
    pattern: /(?:gi|gastrointestinal|digestive|stomach)\s+(?:issues?|problems?)/gi,
    category: 'medical',
    extractor: () => 'GI/digestive issues',
    confidence: 0.85,
  },

  // EDUCATIONAL - School/learning info
  {
    pattern: /(?:has\s+(?:an?\s+)?)?iep\s+(?:for|with|goals?)/gi,
    category: 'educational',
    extractor: () => 'has an IEP',
    confidence: 0.95,
  },
  {
    pattern: /(?:in\s+)?(?:special\s+ed|self-contained|inclusion|mainstream)\s+(?:class(?:room)?)?/gi,
    category: 'educational',
    extractor: (m) => `classroom: ${m[0].trim()}`,
    confidence: 0.85,
  },
  {
    pattern: /(?:has\s+(?:a\s+)?)?(?:1:1|one-on-one|dedicated)\s+(?:aide|para|support)/gi,
    category: 'educational',
    extractor: () => 'has 1:1 aide/support',
    confidence: 0.9,
  },
  {
    pattern: /(?:homeschool(?:ed|ing)?|virtual\s+school)/gi,
    category: 'educational',
    extractor: () => 'homeschooled/virtual',
    confidence: 0.9,
  },
];

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

/**
 * Extract facts from a single message
 */
export function extractFactsFromMessage(
  content: string,
  source: string = 'conversation'
): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const seenContent = new Set<string>();

  EXTRACTION_PATTERNS.forEach(({ pattern, category, extractor, confidence }) => {
    // Reset pattern if it's global
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      try {
        const extractedContent = extractor(match);

        // Skip if too short or already seen
        if (extractedContent.length < 3) continue;
        if (seenContent.has(extractedContent.toLowerCase())) continue;

        // Skip if it's just common words
        const words = extractedContent.split(/\s+/);
        if (words.length === 1 && words[0].length < 4) continue;

        seenContent.add(extractedContent.toLowerCase());

        facts.push({
          category,
          content: extractedContent,
          confidence,
          source,
        });
      } catch (e) {
        // Extraction failed, skip this match
      }
    }
  });

  return facts;
}

/**
 * Extract facts from a conversation (multiple messages)
 */
export function extractFactsFromConversation(
  messages: Array<{ author: string; content: string }>,
  source: string = 'conversation'
): ExtractedFact[] {
  const allFacts: ExtractedFact[] = [];

  // Only process user messages (not AI responses)
  const userMessages = messages.filter(m =>
    m.author === 'user' || m.author === 'parent'
  );

  userMessages.forEach(message => {
    const facts = extractFactsFromMessage(message.content, source);
    allFacts.push(...facts);
  });

  // Deduplicate by content similarity
  return deduplicateFacts(allFacts);
}

/**
 * Remove duplicate facts based on content similarity
 */
function deduplicateFacts(facts: ExtractedFact[]): ExtractedFact[] {
  const unique: ExtractedFact[] = [];

  facts.forEach(fact => {
    const isDuplicate = unique.some(existing =>
      isSimilar(existing.content, fact.content)
    );

    if (!isDuplicate) {
      unique.push(fact);
    }
  });

  return unique;
}

/**
 * Simple similarity check for deduplication
 */
function isSimilar(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const aNorm = normalize(a);
  const bNorm = normalize(b);

  // Exact match
  if (aNorm === bNorm) return true;

  // One contains the other
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return true;

  // Word overlap > 70%
  const aWords = new Set(aNorm.split(/\s+/));
  const bWords = new Set(bNorm.split(/\s+/));
  const intersection = [...aWords].filter(w => bWords.has(w));
  const union = new Set([...aWords, ...bWords]);

  return intersection.length / union.size > 0.7;
}

/**
 * Score a fact's importance for context building
 */
export function scoreFact(fact: ExtractedFact): number {
  let score = fact.confidence;

  // Boost certain categories
  const categoryBoosts: Record<string, number> = {
    trigger: 1.2,      // Very important for avoiding issues
    strategy: 1.15,    // Important for knowing what works
    medical: 1.1,      // Important safety info
    preference: 1.0,
    strength: 1.0,
    challenge: 1.0,
    milestone: 0.9,    // Slightly less critical for context
    educational: 0.95,
  };

  score *= categoryBoosts[fact.category] || 1.0;

  // Boost for specificity (longer content tends to be more specific)
  if (fact.content.length > 30) score *= 1.05;
  if (fact.content.length > 50) score *= 1.05;

  return Math.min(score, 1.0);
}

/**
 * Get the most important facts for context
 */
export function getTopFacts(
  facts: ExtractedFact[],
  limit: number = 10
): ExtractedFact[] {
  return facts
    .map(f => ({ ...f, score: scoreFact(f) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Format facts for AI context
 */
export function formatFactsForContext(facts: ExtractedFact[]): string {
  if (facts.length === 0) return '';

  const byCategory: Record<string, ExtractedFact[]> = {};

  facts.forEach(fact => {
    if (!byCategory[fact.category]) {
      byCategory[fact.category] = [];
    }
    byCategory[fact.category].push(fact);
  });

  const categoryLabels: Record<string, string> = {
    preference: 'What they love',
    trigger: 'Triggers to be aware of',
    strength: 'Strengths',
    challenge: 'Working on',
    strategy: 'What helps',
    milestone: 'Recent wins',
    medical: 'Health notes',
    educational: 'School/learning',
  };

  let context = '';

  Object.entries(byCategory).forEach(([category, categoryFacts]) => {
    const label = categoryLabels[category] || category;
    const items = categoryFacts.map(f => f.content).join(', ');
    context += `**${label}:** ${items}\n`;
  });

  return context.trim();
}
