/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * Implements vector-based semantic search for Ask Aminy.
 * Uses pgvector in Supabase with OpenAI text-embedding-3-small (512 dims).
 *
 * Flow:
 * 1. User asks question → embed query → search similar content
 * 2. Inject top-K results into AI prompt context
 * 3. AI generates answer grounded in user's actual data
 *
 * Content sources: vault documents, conversation facts, care plan data
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================
// Types
// ============================================

export interface EmbeddingResult {
  id: string;
  content: string;
  content_type: 'fact' | 'memory' | 'document' | 'message';
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RAGContext {
  results: EmbeddingResult[];
  contextString: string;
  queryEmbedding: number[];
}

// ============================================
// Embedding Generation
// ============================================

/**
 * Generate embedding for text via edge function.
 * Uses OpenAI text-embedding-3-small with 512 dimensions.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const accessToken = localStorage.getItem('access_token') || publicAnonKey;

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/embed`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, model: 'text-embedding-3-small', dimensions: 512 }),
    }
  );

  if (!response.ok) {
    throw new Error(`Embedding generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.embedding;
}

// ============================================
// Content Indexing (Store embeddings)
// ============================================

/**
 * Index content for semantic search.
 * Call this when user adds vault documents, completes conversations, etc.
 */
export async function indexContent(
  userId: string,
  content: string,
  contentType: 'fact' | 'memory' | 'document' | 'message',
  metadata: Record<string, unknown> = {}
): Promise<string | null> {
  try {
    // Generate embedding
    const embedding = await generateEmbedding(content);

    // Store in Supabase
    const { data, error } = await supabase
      .from('embeddings')
      .insert({
        user_id: userId,
        content,
        content_type: contentType,
        embedding: JSON.stringify(embedding), // pgvector accepts JSON array
        metadata,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (err) {
    console.error('Failed to index content:', err);
    return null;
  }
}

/**
 * Batch index multiple content items.
 * More efficient than individual calls for bulk operations.
 */
export async function batchIndexContent(
  userId: string,
  items: Array<{
    content: string;
    contentType: 'fact' | 'memory' | 'document' | 'message';
    metadata?: Record<string, unknown>;
  }>
): Promise<number> {
  let indexed = 0;

  // Process in batches of 10 to avoid rate limits
  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10);

    const results = await Promise.allSettled(
      batch.map(item =>
        indexContent(userId, item.content, item.contentType, item.metadata || {})
      )
    );

    indexed += results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
  }

  return indexed;
}

// ============================================
// Semantic Search (RAG Retrieval)
// ============================================

/**
 * Search for semantically similar content.
 * This is the core RAG retrieval function.
 */
export async function searchSimilar(
  userId: string,
  query: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
    contentTypes?: Array<'fact' | 'memory' | 'document' | 'message'>;
  } = {}
): Promise<EmbeddingResult[]> {
  const {
    matchThreshold = 0.6,
    matchCount = 5,
    contentTypes,
  } = options;

  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Call Supabase RPC (uses the search_embeddings function from migration 021)
    const { data, error } = await supabase.rpc('search_embeddings', {
      p_user_id: userId,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_match_threshold: matchThreshold,
      p_match_count: matchCount,
      p_content_types: contentTypes || null,
    });

    if (error) throw error;
    return (data || []) as EmbeddingResult[];
  } catch (err) {
    console.error('Semantic search failed:', err);
    return [];
  }
}

// ============================================
// RAG Context Builder
// ============================================

/**
 * Build RAG context for AI prompt.
 * Searches user's indexed content and formats results for injection.
 */
export async function buildRAGContext(
  userId: string,
  query: string,
  options?: {
    matchThreshold?: number;
    matchCount?: number;
    contentTypes?: Array<'fact' | 'memory' | 'document' | 'message'>;
  }
): Promise<RAGContext> {
  const results = await searchSimilar(userId, query, options);

  // Format results into context string for AI prompt
  const contextString = results.length > 0
    ? formatRAGResults(results)
    : '';

  return {
    results,
    contextString,
    queryEmbedding: [], // Not needed after search
  };
}

/**
 * Format RAG results into a structured context string for the AI prompt.
 */
function formatRAGResults(results: EmbeddingResult[]): string {
  if (results.length === 0) return '';

  const sections: Record<string, string[]> = {
    fact: [],
    memory: [],
    document: [],
    message: [],
  };

  for (const result of results) {
    sections[result.content_type]?.push(result.content);
  }

  const parts: string[] = [];

  if (sections.document.length > 0) {
    parts.push(`RELEVANT DOCUMENTS:\n${sections.document.map((d, i) => `${i + 1}. ${d}`).join('\n')}`);
  }
  if (sections.fact.length > 0) {
    parts.push(`KNOWN FACTS:\n${sections.fact.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
  }
  if (sections.memory.length > 0) {
    parts.push(`RELEVANT MEMORIES:\n${sections.memory.map((m, i) => `${i + 1}. ${m}`).join('\n')}`);
  }
  if (sections.message.length > 0) {
    parts.push(`RELATED CONVERSATIONS:\n${sections.message.map((m, i) => `${i + 1}. ${m}`).join('\n')}`);
  }

  return parts.join('\n\n');
}

// ============================================
// Conversation Fact Extraction & Indexing
// ============================================

/**
 * Extract and index facts from a completed conversation.
 * Call after each AI conversation ends or on idle.
 */
export async function extractAndIndexFacts(
  userId: string,
  messages: Array<{ role: string; content: string }>,
  childId?: string
): Promise<number> {
  // Combine user messages for fact extraction
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ');

  if (!userMessages.trim()) return 0;

  // Index the conversation summary as a message embedding
  const summary = messages
    .slice(-6) // Last 3 exchanges
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const items: Array<{
    content: string;
    contentType: 'fact' | 'memory' | 'document' | 'message';
    metadata: Record<string, unknown>;
  }> = [
    {
      content: summary,
      contentType: 'message',
      metadata: { childId, messageCount: messages.length, date: new Date().toISOString() },
    },
  ];

  // Also extract individual key statements from user messages
  // (Simple heuristic: sentences containing behavioral/clinical keywords)
  const clinicalKeywords = [
    'meltdown', 'tantrum', 'sleep', 'eat', 'school', 'therapy', 'speech',
    'sensory', 'calm', 'anxious', 'stim', 'routine', 'trigger', 'strategy',
    'medication', 'diagnosis', 'IEP', 'BIP', 'progress', 'regression',
  ];

  const sentences = userMessages.split(/[.!?]+/).filter(s => s.trim().length > 20);
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (clinicalKeywords.some(kw => lower.includes(kw))) {
      items.push({
        content: sentence.trim(),
        contentType: 'fact',
        metadata: { childId, source: 'conversation', date: new Date().toISOString() },
      });
    }
  }

  return batchIndexContent(userId, items);
}

// ============================================
// Vault Document Indexing
// ============================================

/**
 * Index a vault document for RAG search.
 * Chunks long documents into ~500 char segments with overlap.
 */
export async function indexVaultDocument(
  userId: string,
  documentText: string,
  documentTitle: string,
  documentId?: string
): Promise<number> {
  const chunks = chunkText(documentText, 500, 50);

  const items = chunks.map((chunk, index) => ({
    content: chunk,
    contentType: 'document' as const,
    metadata: {
      documentTitle,
      documentId,
      chunkIndex: index,
      totalChunks: chunks.length,
    },
  }));

  return batchIndexContent(userId, items);
}

/**
 * Chunk text into segments with overlap for better semantic search.
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      if (lastPeriod > start + chunkSize / 2) {
        end = lastPeriod + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter(c => c.length > 20);
}

export default {
  generateEmbedding,
  indexContent,
  batchIndexContent,
  searchSimilar,
  buildRAGContext,
  extractAndIndexFacts,
  indexVaultDocument,
};
