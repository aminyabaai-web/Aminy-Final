/**
 * Vector Embeddings Service
 *
 * Provides semantic search capabilities using vector embeddings.
 * Uses Supabase pgvector for storage and similarity search.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface Embedding {
  id: string;
  userId: string;
  content: string;
  contentType: 'fact' | 'memory' | 'document' | 'message';
  embedding: number[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SimilarityResult {
  id: string;
  content: string;
  contentType: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingConfig {
  model: 'text-embedding-3-small' | 'text-embedding-3-large';
  dimensions: 256 | 512 | 1024 | 1536 | 3072;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: EmbeddingConfig = {
  model: 'text-embedding-3-small',
  dimensions: 512, // Good balance of performance and accuracy
};

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generate embedding for text using backend API
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig = DEFAULT_CONFIG
): Promise<number[] | null> {
  if (!text || text.trim().length === 0) {
    return null;
  }

  try {
    // Call backend edge function for embedding generation
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: {
        text: text.trim(),
        model: config.model,
        dimensions: config.dimensions,
      },
    });

    if (error) throw error;
    return data.embedding;
  } catch (error) {
    console.error('[VectorEmbeddings] Failed to generate embedding:', error);
    return null;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig = DEFAULT_CONFIG
): Promise<(number[] | null)[]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: {
        texts: texts.map(t => t.trim()).filter(Boolean),
        model: config.model,
        dimensions: config.dimensions,
        batch: true,
      },
    });

    if (error) throw error;
    return data.embeddings;
  } catch (error) {
    console.error('[VectorEmbeddings] Failed to generate batch embeddings:', error);
    return texts.map(() => null);
  }
}

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Store an embedding in the database
 */
export async function storeEmbedding(
  userId: string,
  content: string,
  contentType: Embedding['contentType'],
  embedding: number[],
  metadata?: Record<string, unknown>
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('embeddings')
      .insert({
        user_id: userId,
        content,
        content_type: contentType,
        embedding,
        metadata,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('[VectorEmbeddings] Failed to store embedding:', error);
    return null;
  }
}

/**
 * Store content with auto-generated embedding
 */
export async function storeWithEmbedding(
  userId: string,
  content: string,
  contentType: Embedding['contentType'],
  metadata?: Record<string, unknown>
): Promise<string | null> {
  const embedding = await generateEmbedding(content);
  if (!embedding) {
    console.warn('[VectorEmbeddings] Could not generate embedding for content');
    return null;
  }

  return storeEmbedding(userId, content, contentType, embedding, metadata);
}

/**
 * Delete an embedding
 */
export async function deleteEmbedding(embeddingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('embeddings')
      .delete()
      .eq('id', embeddingId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[VectorEmbeddings] Failed to delete embedding:', error);
    return false;
  }
}

/**
 * Delete all embeddings for a user
 */
export async function deleteUserEmbeddings(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('embeddings')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[VectorEmbeddings] Failed to delete user embeddings:', error);
    return false;
  }
}

// ============================================================================
// Similarity Search
// ============================================================================

/**
 * Search for similar content using vector similarity
 */
export async function searchSimilar(
  userId: string,
  query: string,
  options: {
    limit?: number;
    threshold?: number;
    contentTypes?: Embedding['contentType'][];
  } = {}
): Promise<SimilarityResult[]> {
  const { limit = 10, threshold = 0.7, contentTypes } = options;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    console.warn('[VectorEmbeddings] Could not generate query embedding');
    return [];
  }

  return searchByEmbedding(userId, queryEmbedding, { limit, threshold, contentTypes });
}

/**
 * Search by pre-computed embedding vector
 */
export async function searchByEmbedding(
  userId: string,
  embedding: number[],
  options: {
    limit?: number;
    threshold?: number;
    contentTypes?: Embedding['contentType'][];
  } = {}
): Promise<SimilarityResult[]> {
  const { limit = 10, threshold = 0.7, contentTypes } = options;

  try {
    // Use Supabase RPC function for vector similarity search
    const { data, error } = await supabase.rpc('search_embeddings', {
      p_user_id: userId,
      p_query_embedding: embedding,
      p_match_threshold: threshold,
      p_match_count: limit,
      p_content_types: contentTypes || null,
    });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      content: row.content,
      contentType: row.content_type,
      similarity: row.similarity,
      metadata: row.metadata,
    }));
  } catch (error) {
    console.error('[VectorEmbeddings] Similarity search failed:', error);
    return [];
  }
}

// ============================================================================
// Hybrid Search (Keyword + Semantic)
// ============================================================================

/**
 * Perform hybrid search combining keyword and semantic search
 */
export async function hybridSearch(
  userId: string,
  query: string,
  options: {
    limit?: number;
    semanticWeight?: number; // 0-1, weight for semantic results
    contentTypes?: Embedding['contentType'][];
  } = {}
): Promise<SimilarityResult[]> {
  const { limit = 10, semanticWeight = 0.7, contentTypes } = options;

  // Perform both searches in parallel
  const [semanticResults, keywordResults] = await Promise.all([
    searchSimilar(userId, query, { limit: limit * 2, threshold: 0.5, contentTypes }),
    keywordSearch(userId, query, { limit: limit * 2, contentTypes }),
  ]);

  // Merge results with weighted scoring
  const resultMap = new Map<string, SimilarityResult & { score: number }>();

  // Add semantic results
  for (const result of semanticResults) {
    resultMap.set(result.id, {
      ...result,
      score: result.similarity * semanticWeight,
    });
  }

  // Add/merge keyword results
  const keywordWeight = 1 - semanticWeight;
  for (const result of keywordResults) {
    const existing = resultMap.get(result.id);
    if (existing) {
      existing.score += result.similarity * keywordWeight;
    } else {
      resultMap.set(result.id, {
        ...result,
        score: result.similarity * keywordWeight,
      });
    }
  }

  // Sort by combined score and return top results
  return Array.from(resultMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...result }) => ({
      ...result,
      similarity: score,
    }));
}

/**
 * Keyword-based search using full-text search
 */
async function keywordSearch(
  userId: string,
  query: string,
  options: {
    limit?: number;
    contentTypes?: Embedding['contentType'][];
  } = {}
): Promise<SimilarityResult[]> {
  const { limit = 10, contentTypes } = options;

  try {
    // Build the query
    let queryBuilder = supabase
      .from('embeddings')
      .select('id, content, content_type, metadata')
      .eq('user_id', userId)
      .textSearch('content', query, { type: 'websearch' })
      .limit(limit);

    if (contentTypes && contentTypes.length > 0) {
      queryBuilder = queryBuilder.in('content_type', contentTypes);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    // Assign decreasing similarity scores based on rank
    return (data || []).map((row: any, index: number) => ({
      id: row.id,
      content: row.content,
      contentType: row.content_type,
      similarity: 1 - (index / limit) * 0.5, // Scores from 1.0 to 0.5
      metadata: row.metadata,
    }));
  } catch (error) {
    console.error('[VectorEmbeddings] Keyword search failed:', error);
    return [];
  }
}

// ============================================================================
// Memory Integration
// ============================================================================

/**
 * Store a memory fact with embedding
 */
export async function storeMemoryFact(
  userId: string,
  fact: string,
  category: string,
  confidence?: number
): Promise<string | null> {
  return storeWithEmbedding(userId, fact, 'fact', {
    category,
    confidence: confidence ?? 1.0,
    storedAt: new Date().toISOString(),
  });
}

/**
 * Store a conversation message with embedding
 */
export async function storeMessage(
  userId: string,
  message: string,
  role: 'user' | 'assistant',
  conversationId?: string
): Promise<string | null> {
  return storeWithEmbedding(userId, message, 'message', {
    role,
    conversationId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Find relevant memories for context
 */
export async function findRelevantMemories(
  userId: string,
  query: string,
  maxResults: number = 5
): Promise<SimilarityResult[]> {
  return searchSimilar(userId, query, {
    limit: maxResults,
    threshold: 0.6,
    contentTypes: ['fact', 'memory'],
  });
}

/**
 * Find relevant conversation context
 */
export async function findRelevantContext(
  userId: string,
  query: string,
  maxResults: number = 3
): Promise<SimilarityResult[]> {
  return hybridSearch(userId, query, {
    limit: maxResults,
    semanticWeight: 0.8,
  });
}

// ============================================================================
// Maintenance
// ============================================================================

/**
 * Re-embed content that may have outdated embeddings
 */
export async function reembedContent(
  userId: string,
  contentType?: Embedding['contentType']
): Promise<number> {
  try {
    // Fetch content to re-embed
    let queryBuilder = supabase
      .from('embeddings')
      .select('id, content')
      .eq('user_id', userId)
      .limit(100);

    if (contentType) {
      queryBuilder = queryBuilder.eq('content_type', contentType);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    if (!data || data.length === 0) return 0;

    // Generate new embeddings in batch
    const contents = data.map(row => row.content);
    const newEmbeddings = await generateEmbeddingsBatch(contents);

    // Update records with new embeddings
    let updated = 0;
    for (let i = 0; i < data.length; i++) {
      if (newEmbeddings[i]) {
        const { error: updateError } = await supabase
          .from('embeddings')
          .update({ embedding: newEmbeddings[i] })
          .eq('id', data[i].id);

        if (!updateError) updated++;
      }
    }

    return updated;
  } catch (error) {
    console.error('[VectorEmbeddings] Re-embedding failed:', error);
    return 0;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  generateEmbedding,
  generateEmbeddingsBatch,
  storeEmbedding,
  storeWithEmbedding,
  deleteEmbedding,
  deleteUserEmbeddings,
  searchSimilar,
  searchByEmbedding,
  hybridSearch,
  storeMemoryFact,
  storeMessage,
  findRelevantMemories,
  findRelevantContext,
  reembedContent,
};
