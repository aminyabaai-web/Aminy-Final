/**
 * AI Memory Engine
 * Persistent memory system that learns from conversations and vault documents
 *
 * This engine:
 * - Extracts facts from conversations automatically
 * - Learns from uploaded documents (IEPs, evaluations, etc.)
 * - Builds rich context for AI conversations
 * - Provides personalized insights based on history
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type FactCategory =
  | 'child_info'      // Name, age, diagnosis, school
  | 'preference'      // Likes, dislikes, interests
  | 'trigger'         // Things that cause distress
  | 'strength'        // Skills, talents, positive traits
  | 'challenge'       // Areas of difficulty
  | 'milestone'       // Achievements, progress
  | 'strategy'        // What works, interventions
  | 'medical'         // Medications, allergies, conditions
  | 'educational'     // School info, IEP goals, accommodations
  | 'family'          // Siblings, caregivers, living situation
  | 'therapy'         // Providers, schedules, approaches
  | 'sensory'         // Sensory preferences and needs
  | 'communication'   // Communication style, AAC use
  | 'behavior'        // Behavioral patterns, functions
  | 'routine';        // Daily structure, timing

export interface MemoryFact {
  id: string;
  userId: string;
  childId?: string;
  category: FactCategory;
  key: string;           // Short identifier e.g., "favorite_food"
  value: string;         // The fact itself
  confidence: number;    // 0-1 how confident we are
  source: 'conversation' | 'document' | 'user_input' | 'observation';
  sourceId?: string;     // Conversation or document ID
  extractedAt: string;
  lastVerified?: string;
  isActive: boolean;
}

export interface ConversationMemory {
  id: string;
  userId: string;
  childId?: string;
  conversationId: string;
  summary: string;
  keyTopics: string[];
  emotionalTone: 'positive' | 'neutral' | 'concerned' | 'crisis';
  actionItems: string[];
  factsExtracted: string[]; // IDs of extracted facts
  createdAt: string;
}

export interface DocumentInsight {
  id: string;
  userId: string;
  childId?: string;
  documentId: string;
  documentType: string;
  summary: string;
  keyFindings: string[];
  goals: string[];
  recommendations: string[];
  factsExtracted: string[];
  processedAt: string;
}

export interface MemoryContext {
  childProfile: {
    name?: string;
    age?: number;
    diagnoses?: string[];
    communicationStyle?: string;
  };
  recentTopics: string[];
  activeGoals: string[];
  effectiveStrategies: string[];
  currentChallenges: string[];
  preferences: Record<string, string>;
  triggers: string[];
  strengths: string[];
}

// ============================================================================
// Fact Extraction
// ============================================================================

interface ExtractFactsParams {
  userId: string;
  childId?: string;
  text: string;
  source: 'conversation' | 'document' | 'user_input';
  sourceId?: string;
}

/**
 * Extract facts from text using AI
 */
export async function extractFacts(params: ExtractFactsParams): Promise<MemoryFact[]> {
  const { userId, childId, text, source, sourceId } = params;

  try {
    // Call AI to extract facts
    const response = await fetch('/api/ai/extract-facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      // Fallback to pattern-based extraction
      return extractFactsWithPatterns(text, userId, childId, source, sourceId);
    }

    const extracted = await response.json();
    const facts: MemoryFact[] = [];

    for (const item of extracted.facts || []) {
      const fact: MemoryFact = {
        id: `fact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        childId,
        category: item.category || 'child_info',
        key: item.key || item.category,
        value: item.value,
        confidence: item.confidence || 0.8,
        source,
        sourceId,
        extractedAt: new Date().toISOString(),
        isActive: true,
      };

      facts.push(fact);
    }

    // Save facts to database
    if (facts.length > 0) {
      await saveFacts(facts);
    }

    return facts;
  } catch (error) {
    console.error('Failed to extract facts:', error);
    return [];
  }
}

/**
 * Pattern-based fact extraction (fallback)
 */
function extractFactsWithPatterns(
  text: string,
  userId: string,
  childId?: string,
  source: 'conversation' | 'document' | 'user_input' = 'conversation',
  sourceId?: string
): MemoryFact[] {
  const facts: MemoryFact[] = [];
  const now = new Date().toISOString();

  // Age patterns
  const ageMatch = text.match(/(?:is|he's|she's|they're)\s+(\d+)\s+(?:years?\s+old|yo)/i);
  if (ageMatch) {
    facts.push({
      id: `fact-${Date.now()}-age`,
      userId, childId,
      category: 'child_info',
      key: 'age',
      value: ageMatch[1],
      confidence: 0.9,
      source, sourceId,
      extractedAt: now,
      isActive: true,
    });
  }

  // Diagnosis patterns
  const diagnosisPatterns = [
    /diagnosed\s+with\s+([^.]+)/i,
    /has\s+(autism|ASD|ADHD|SPD|sensory processing disorder)/i,
    /on\s+the\s+(autism\s+spectrum)/i,
  ];
  for (const pattern of diagnosisPatterns) {
    const match = text.match(pattern);
    if (match) {
      facts.push({
        id: `fact-${Date.now()}-dx`,
        userId, childId,
        category: 'child_info',
        key: 'diagnosis',
        value: match[1],
        confidence: 0.85,
        source, sourceId,
        extractedAt: now,
        isActive: true,
      });
    }
  }

  // Likes/preferences
  const likesMatch = text.match(/(?:loves?|really likes?|enjoys?|favorite)\s+([^.]+)/gi);
  if (likesMatch) {
    for (const match of likesMatch) {
      const cleaned = match.replace(/^(loves?|really likes?|enjoys?|favorite)\s+/i, '');
      facts.push({
        id: `fact-${Date.now()}-like-${Math.random()}`,
        userId, childId,
        category: 'preference',
        key: 'likes',
        value: cleaned.trim(),
        confidence: 0.75,
        source, sourceId,
        extractedAt: now,
        isActive: true,
      });
    }
  }

  // Triggers
  const triggerPatterns = [
    /(?:triggered\s+by|struggles?\s+with|has\s+trouble\s+with|meltdown\s+when)\s+([^.]+)/i,
    /(?:can't\s+stand|hates?|avoids?)\s+([^.]+)/i,
  ];
  for (const pattern of triggerPatterns) {
    const match = text.match(pattern);
    if (match) {
      facts.push({
        id: `fact-${Date.now()}-trigger`,
        userId, childId,
        category: 'trigger',
        key: 'trigger',
        value: match[1].trim(),
        confidence: 0.8,
        source, sourceId,
        extractedAt: now,
        isActive: true,
      });
    }
  }

  // Strategies that work
  const strategyMatch = text.match(/(?:what\s+works|helps?\s+when|we\s+use|try\s+to)\s+([^.]+)/gi);
  if (strategyMatch) {
    for (const match of strategyMatch) {
      facts.push({
        id: `fact-${Date.now()}-strategy-${Math.random()}`,
        userId, childId,
        category: 'strategy',
        key: 'effective_strategy',
        value: match.trim(),
        confidence: 0.7,
        source, sourceId,
        extractedAt: now,
        isActive: true,
      });
    }
  }

  // School info
  const schoolMatch = text.match(/(?:goes\s+to|attends?|at)\s+([^.]+(?:school|academy|elementary|middle|high))/i);
  if (schoolMatch) {
    facts.push({
      id: `fact-${Date.now()}-school`,
      userId, childId,
      category: 'educational',
      key: 'school',
      value: schoolMatch[1].trim(),
      confidence: 0.85,
      source, sourceId,
      extractedAt: now,
      isActive: true,
    });
  }

  // IEP mention
  if (/\bIEP\b|individualized education/i.test(text)) {
    facts.push({
      id: `fact-${Date.now()}-iep`,
      userId, childId,
      category: 'educational',
      key: 'has_iep',
      value: 'true',
      confidence: 0.9,
      source, sourceId,
      extractedAt: now,
      isActive: true,
    });
  }

  return facts;
}

// ============================================================================
// Fact Management
// ============================================================================

/**
 * Save facts to database
 */
async function saveFacts(facts: MemoryFact[]): Promise<void> {
  const rows = facts.map(f => ({
    id: f.id,
    user_id: f.userId,
    child_id: f.childId,
    category: f.category,
    key: f.key,
    value: f.value,
    confidence: f.confidence,
    source: f.source,
    source_id: f.sourceId,
    extracted_at: f.extractedAt,
    is_active: f.isActive,
  }));

  const { error } = await supabase.from('memory_facts').upsert(rows, {
    onConflict: 'user_id,child_id,key',
    ignoreDuplicates: false,
  });

  if (error) {
    console.error('Failed to save facts:', error);
  }
}

/**
 * Get all facts for a user/child
 */
export async function getFacts(
  userId: string,
  childId?: string,
  category?: FactCategory
): Promise<MemoryFact[]> {
  let query = supabase
    .from('memory_facts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('confidence', { ascending: false });

  if (childId) {
    query = query.eq('child_id', childId);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch facts:', error);
    return [];
  }

  return (data || []).map(mapDbFact);
}

/**
 * Update a fact
 */
export async function updateFact(
  factId: string,
  updates: Partial<Pick<MemoryFact, 'value' | 'confidence' | 'isActive'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('memory_facts')
    .update({
      value: updates.value,
      confidence: updates.confidence,
      is_active: updates.isActive,
      last_verified: new Date().toISOString(),
    })
    .eq('id', factId);

  return !error;
}

/**
 * Delete (deactivate) a fact
 */
export async function deleteFact(factId: string): Promise<boolean> {
  const { error } = await supabase
    .from('memory_facts')
    .update({ is_active: false })
    .eq('id', factId);

  return !error;
}

/**
 * Manually add a fact
 */
export async function addFact(
  userId: string,
  fact: Omit<MemoryFact, 'id' | 'userId' | 'extractedAt' | 'isActive' | 'source'>
): Promise<MemoryFact> {
  const newFact: MemoryFact = {
    ...fact,
    id: `fact-${Date.now()}`,
    userId,
    source: 'user_input',
    extractedAt: new Date().toISOString(),
    isActive: true,
  };

  await saveFacts([newFact]);
  return newFact;
}

// ============================================================================
// Document Processing
// ============================================================================

/**
 * Process an uploaded document and extract insights
 */
export async function processDocument(
  userId: string,
  documentId: string,
  documentType: string,
  content: string,
  childId?: string
): Promise<DocumentInsight> {
  // Call AI to analyze document
  let analysis;
  try {
    const response = await fetch('/api/ai/analyze-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, documentType }),
    });

    if (response.ok) {
      analysis = await response.json();
    }
  } catch (error) {
    console.error('Failed to analyze document:', error);
  }

  // Extract facts from document
  const facts = await extractFacts({
    userId,
    childId,
    text: content,
    source: 'document',
    sourceId: documentId,
  });

  const insight: DocumentInsight = {
    id: `insight-${Date.now()}`,
    userId,
    childId,
    documentId,
    documentType,
    summary: analysis?.summary || 'Document processed',
    keyFindings: analysis?.keyFindings || [],
    goals: analysis?.goals || [],
    recommendations: analysis?.recommendations || [],
    factsExtracted: facts.map(f => f.id),
    processedAt: new Date().toISOString(),
  };

  // Save insight
  await supabase.from('document_insights').insert({
    id: insight.id,
    user_id: insight.userId,
    child_id: insight.childId,
    document_id: insight.documentId,
    document_type: insight.documentType,
    summary: insight.summary,
    key_findings: insight.keyFindings,
    goals: insight.goals,
    recommendations: insight.recommendations,
    facts_extracted: insight.factsExtracted,
    processed_at: insight.processedAt,
  });

  return insight;
}

/**
 * Get document insights
 */
export async function getDocumentInsights(
  userId: string,
  childId?: string
): Promise<DocumentInsight[]> {
  let query = supabase
    .from('document_insights')
    .select('*')
    .eq('user_id', userId)
    .order('processed_at', { ascending: false });

  if (childId) {
    query = query.eq('child_id', childId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch document insights:', error);
    return [];
  }

  return (data || []).map(mapDbInsight);
}

// ============================================================================
// Conversation Memory
// ============================================================================

/**
 * Save conversation summary
 */
export async function saveConversationMemory(
  userId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  childId?: string
): Promise<ConversationMemory> {
  // Generate summary using last few messages
  const recentMessages = messages.slice(-10);
  const conversationText = recentMessages.map(m => m.content).join('\n');

  // Extract facts from conversation
  const facts = await extractFacts({
    userId,
    childId,
    text: conversationText,
    source: 'conversation',
    sourceId: conversationId,
  });

  // Determine emotional tone
  const concernKeywords = ['worried', 'struggling', 'frustrated', 'hard time', 'meltdown', 'crisis'];
  const positiveKeywords = ['progress', 'improvement', 'worked', 'success', 'proud', 'better'];

  let emotionalTone: ConversationMemory['emotionalTone'] = 'neutral';
  const lowerText = conversationText.toLowerCase();

  if (concernKeywords.some(k => lowerText.includes(k))) {
    emotionalTone = 'concerned';
  } else if (positiveKeywords.some(k => lowerText.includes(k))) {
    emotionalTone = 'positive';
  }

  // Extract key topics
  const topicPatterns = [
    /(?:about|regarding|concerning)\s+([^.]+)/gi,
    /(?:help with|advice on|question about)\s+([^.]+)/gi,
  ];
  const keyTopics: string[] = [];
  for (const pattern of topicPatterns) {
    const matches = conversationText.matchAll(pattern);
    for (const match of matches) {
      keyTopics.push(match[1].trim().substring(0, 50));
    }
  }

  const memory: ConversationMemory = {
    id: `memory-${Date.now()}`,
    userId,
    childId,
    conversationId,
    summary: `Conversation with ${recentMessages.length} messages`,
    keyTopics: keyTopics.slice(0, 5),
    emotionalTone,
    actionItems: [],
    factsExtracted: facts.map(f => f.id),
    createdAt: new Date().toISOString(),
  };

  await supabase.from('conversation_memories').insert({
    id: memory.id,
    user_id: memory.userId,
    child_id: memory.childId,
    conversation_id: memory.conversationId,
    summary: memory.summary,
    key_topics: memory.keyTopics,
    emotional_tone: memory.emotionalTone,
    action_items: memory.actionItems,
    facts_extracted: memory.factsExtracted,
    created_at: memory.createdAt,
  });

  return memory;
}

/**
 * Get recent conversation memories
 */
export async function getRecentConversations(
  userId: string,
  limit: number = 10
): Promise<ConversationMemory[]> {
  const { data, error } = await supabase
    .from('conversation_memories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch conversation memories:', error);
    return [];
  }

  return (data || []).map(mapDbMemory);
}

// ============================================================================
// Context Building
// ============================================================================

/**
 * Build rich context for AI conversation
 */
export async function buildContext(
  userId: string,
  childId?: string
): Promise<MemoryContext> {
  const facts = await getFacts(userId, childId);
  const recentConversations = await getRecentConversations(userId, 5);

  // Build child profile
  const childProfile: MemoryContext['childProfile'] = {};

  const nameFact = facts.find(f => f.key === 'name' || f.key === 'child_name');
  if (nameFact) childProfile.name = nameFact.value;

  const ageFact = facts.find(f => f.key === 'age');
  if (ageFact) childProfile.age = parseInt(ageFact.value);

  const diagnosisFacts = facts.filter(f => f.key === 'diagnosis');
  if (diagnosisFacts.length > 0) {
    childProfile.diagnoses = diagnosisFacts.map(f => f.value);
  }

  const commFact = facts.find(f => f.category === 'communication');
  if (commFact) childProfile.communicationStyle = commFact.value;

  // Build other context
  const context: MemoryContext = {
    childProfile,
    recentTopics: recentConversations.flatMap(c => c.keyTopics).slice(0, 10),
    activeGoals: facts.filter(f => f.category === 'educational' && f.key.includes('goal')).map(f => f.value),
    effectiveStrategies: facts.filter(f => f.category === 'strategy').map(f => f.value),
    currentChallenges: facts.filter(f => f.category === 'challenge').map(f => f.value),
    preferences: Object.fromEntries(
      facts.filter(f => f.category === 'preference').map(f => [f.key, f.value])
    ),
    triggers: facts.filter(f => f.category === 'trigger').map(f => f.value),
    strengths: facts.filter(f => f.category === 'strength').map(f => f.value),
  };

  return context;
}

/**
 * Format context for AI prompt
 */
export function formatContextForPrompt(context: MemoryContext): string {
  const lines: string[] = [];

  if (context.childProfile.name) {
    lines.push(`Child's name: ${context.childProfile.name}`);
  }
  if (context.childProfile.age) {
    lines.push(`Age: ${context.childProfile.age}`);
  }
  if (context.childProfile.diagnoses?.length) {
    lines.push(`Diagnoses: ${context.childProfile.diagnoses.join(', ')}`);
  }

  if (context.strengths.length > 0) {
    lines.push(`Strengths: ${context.strengths.slice(0, 5).join(', ')}`);
  }

  if (context.triggers.length > 0) {
    lines.push(`Known triggers: ${context.triggers.slice(0, 5).join(', ')}`);
  }

  if (context.effectiveStrategies.length > 0) {
    lines.push(`Strategies that work: ${context.effectiveStrategies.slice(0, 5).join(', ')}`);
  }

  if (context.currentChallenges.length > 0) {
    lines.push(`Current challenges: ${context.currentChallenges.slice(0, 3).join(', ')}`);
  }

  if (context.activeGoals.length > 0) {
    lines.push(`Active goals: ${context.activeGoals.slice(0, 3).join(', ')}`);
  }

  if (context.recentTopics.length > 0) {
    lines.push(`Recent conversation topics: ${context.recentTopics.slice(0, 5).join(', ')}`);
  }

  return lines.join('\n');
}

// ============================================================================
// Memory Management
// ============================================================================

/**
 * Get memory usage stats
 */
export async function getMemoryStats(userId: string): Promise<{
  totalFacts: number;
  factsByCategory: Record<string, number>;
  documentsProcessed: number;
  conversationsRemembered: number;
}> {
  const [facts, insights, memories] = await Promise.all([
    getFacts(userId),
    getDocumentInsights(userId),
    getRecentConversations(userId, 100),
  ]);

  const factsByCategory: Record<string, number> = {};
  for (const fact of facts) {
    factsByCategory[fact.category] = (factsByCategory[fact.category] || 0) + 1;
  }

  return {
    totalFacts: facts.length,
    factsByCategory,
    documentsProcessed: insights.length,
    conversationsRemembered: memories.length,
  };
}

/**
 * Clear all memory for a user
 */
export async function clearMemory(userId: string, childId?: string): Promise<void> {
  const deleteQueries = [
    supabase.from('memory_facts').delete().eq('user_id', userId),
    supabase.from('conversation_memories').delete().eq('user_id', userId),
    supabase.from('document_insights').delete().eq('user_id', userId),
  ];

  if (childId) {
    // Only delete for specific child
    for (let i = 0; i < deleteQueries.length; i++) {
      deleteQueries[i] = deleteQueries[i].eq('child_id', childId);
    }
  }

  await Promise.all(deleteQueries);
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapDbFact(data: Record<string, unknown>): MemoryFact {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    childId: data.child_id as string | undefined,
    category: data.category as MemoryFact['category'],
    key: data.key as string,
    value: data.value as string,
    confidence: data.confidence as number,
    source: data.source as MemoryFact['source'],
    sourceId: data.source_id as string | undefined,
    extractedAt: data.extracted_at as string,
    lastVerified: data.last_verified as string | undefined,
    isActive: data.is_active as boolean,
  };
}

function mapDbMemory(data: Record<string, unknown>): ConversationMemory {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    childId: data.child_id as string | undefined,
    conversationId: data.conversation_id as string,
    summary: data.summary as string,
    keyTopics: (data.key_topics || []) as string[],
    emotionalTone: data.emotional_tone as ConversationMemory['emotionalTone'],
    actionItems: (data.action_items || []) as string[],
    factsExtracted: (data.facts_extracted || []) as string[],
    createdAt: data.created_at as string,
  };
}

function mapDbInsight(data: Record<string, unknown>): DocumentInsight {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    childId: data.child_id as string | undefined,
    documentId: data.document_id as string,
    documentType: data.document_type as string,
    summary: data.summary as string,
    keyFindings: (data.key_findings || []) as string[],
    goals: (data.goals || []) as string[],
    recommendations: (data.recommendations || []) as string[],
    factsExtracted: (data.facts_extracted || []) as string[],
    processedAt: data.processed_at as string,
  };
}

// ============================================================================
// Export
// ============================================================================

export const aiMemoryEngine = {
  // Fact Extraction
  extractFacts,

  // Fact Management
  getFacts,
  updateFact,
  deleteFact,
  addFact,

  // Document Processing
  processDocument,
  getDocumentInsights,

  // Conversation Memory
  saveConversationMemory,
  getRecentConversations,

  // Context Building
  buildContext,
  formatContextForPrompt,

  // Memory Management
  getMemoryStats,
  clearMemory,
};

export default aiMemoryEngine;
