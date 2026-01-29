/**
 * Embeddings Service for Aminy
 *
 * Provides vector embeddings for semantic search and memory retrieval.
 * Uses the AI backend to generate embeddings and store them in Supabase pgvector.
 *
 * Architecture:
 * 1. Client calls generateEmbedding() with text
 * 2. Backend uses OpenAI/Anthropic embeddings API
 * 3. Vector is stored in Supabase with pgvector extension
 * 4. Semantic search uses cosine similarity in pgvector
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Types
export interface EmbeddingVector {
  /** Unique ID for the embedded content */
  id: string;
  /** Raw embedding vector (typically 1536 dimensions for ada-002) */
  vector: number[];
  /** Original text that was embedded */
  text: string;
  /** Content type for filtering */
  contentType: 'memory_fact' | 'conversation' | 'document' | 'query';
  /** Additional metadata */
  metadata?: {
    childId?: string;
    userId?: string;
    category?: string;
    source?: string;
    createdAt?: string;
  };
}

export interface SemanticSearchResult {
  /** ID of the matched content */
  id: string;
  /** Original text */
  text: string;
  /** Cosine similarity score (0-1, higher is more similar) */
  similarity: number;
  /** Content type */
  contentType: string;
  /** Associated metadata */
  metadata?: Record<string, unknown>;
}

export interface EmbeddingConfig {
  /** Model to use for embeddings (default: text-embedding-ada-002) */
  model?: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large';
  /** Number of dimensions (for text-embedding-3 models) */
  dimensions?: number;
  /** Whether to cache embeddings locally */
  useCache?: boolean;
}

// Backend URL
const getBackendUrl = () => `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

// Simple in-memory cache for embeddings
const embeddingCache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 100;

/**
 * Generate a cache key for text
 */
function getCacheKey(text: string): string {
  // Simple hash for cache key
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `emb_${hash}`;
}

/**
 * Generate an embedding vector for text
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig = {}
): Promise<number[] | null> {
  const { model = 'text-embedding-3-small', useCache = true } = config;

  // Normalize text
  const normalizedText = text.trim().toLowerCase();
  if (!normalizedText) return null;

  // Check cache
  if (useCache) {
    const cacheKey = getCacheKey(normalizedText);
    const cached = embeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const response = await fetch(`${getBackendUrl()}/ai/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        text: normalizedText,
        model,
      }),
    });

    if (!response.ok) {
      console.error('[Embeddings] Failed to generate embedding:', await response.text());
      return null;
    }

    const data = await response.json();
    const embedding = data.embedding as number[];

    // Cache the result
    if (useCache && embedding) {
      const cacheKey = getCacheKey(normalizedText);
      if (embeddingCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry
        const firstKey = embeddingCache.keys().next().value;
        if (firstKey) embeddingCache.delete(firstKey);
      }
      embeddingCache.set(cacheKey, embedding);
    }

    return embedding;
  } catch (error) {
    console.error('[Embeddings] Error generating embedding:', error);
    return null;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig = {}
): Promise<(number[] | null)[]> {
  const { model = 'text-embedding-3-small' } = config;

  // Filter and normalize texts
  const normalizedTexts = texts.map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  if (normalizedTexts.length === 0) return texts.map(() => null);

  try {
    const response = await fetch(`${getBackendUrl()}/ai/embed-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        texts: normalizedTexts,
        model,
      }),
    });

    if (!response.ok) {
      console.error('[Embeddings] Batch embedding failed:', await response.text());
      // Fall back to individual requests
      return Promise.all(texts.map(t => generateEmbedding(t, config)));
    }

    const data = await response.json();
    return data.embeddings as (number[] | null)[];
  } catch (error) {
    console.error('[Embeddings] Batch error:', error);
    return Promise.all(texts.map(t => generateEmbedding(t, config)));
  }
}

/**
 * Store an embedding in the vector database
 */
export async function storeEmbedding(
  id: string,
  text: string,
  contentType: EmbeddingVector['contentType'],
  metadata: EmbeddingVector['metadata'] = {}
): Promise<boolean> {
  const embedding = await generateEmbedding(text);
  if (!embedding) return false;

  try {
    const response = await fetch(`${getBackendUrl()}/memory/store-embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'X-User-Id': metadata.userId || '',
      },
      body: JSON.stringify({
        id,
        embedding,
        text,
        contentType,
        metadata,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Embeddings] Failed to store embedding:', error);
    return false;
  }
}

/**
 * Search for similar content using semantic search
 */
export async function semanticSearch(
  query: string,
  options: {
    userId?: string;
    childId?: string;
    contentTypes?: EmbeddingVector['contentType'][];
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<SemanticSearchResult[]> {
  const {
    userId,
    childId,
    contentTypes = ['memory_fact', 'conversation', 'document'],
    limit = 10,
    minSimilarity = 0.7,
  } = options;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    console.error('[Embeddings] Failed to generate query embedding');
    return [];
  }

  try {
    const response = await fetch(`${getBackendUrl()}/memory/semantic-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'X-User-Id': userId || '',
      },
      body: JSON.stringify({
        embedding: queryEmbedding,
        contentTypes,
        childId,
        limit,
        minSimilarity,
      }),
    });

    if (!response.ok) {
      console.error('[Embeddings] Semantic search failed:', await response.text());
      return [];
    }

    const data = await response.json();
    return data.results as SemanticSearchResult[];
  } catch (error) {
    console.error('[Embeddings] Search error:', error);
    return [];
  }
}

/**
 * Find memories relevant to a query with hybrid search
 * Combines semantic search with keyword matching
 */
export async function findRelevantMemories(
  query: string,
  childId: string,
  userId: string,
  options: {
    limit?: number;
    categories?: string[];
    includeConversations?: boolean;
  } = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 10, categories, includeConversations = false } = options;

  const contentTypes: EmbeddingVector['contentType'][] = ['memory_fact'];
  if (includeConversations) {
    contentTypes.push('conversation');
  }

  try {
    // Semantic search
    const semanticResults = await semanticSearch(query, {
      userId,
      childId,
      contentTypes,
      limit,
      minSimilarity: 0.65, // Lower threshold for memories
    });

    // Filter by categories if specified
    if (categories && categories.length > 0) {
      return semanticResults.filter(
        r => r.metadata?.category && categories.includes(r.metadata.category as string)
      );
    }

    return semanticResults;
  } catch (error) {
    console.error('[Embeddings] findRelevantMemories error:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Useful for client-side similarity checks
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Compress embedding to reduce storage/transfer size
 * Uses simple quantization (lossy)
 */
export function compressEmbedding(embedding: number[], bits: 8 | 16 = 8): Uint8Array | Uint16Array {
  const max = Math.max(...embedding.map(Math.abs));
  const scale = (bits === 8 ? 127 : 32767) / max;

  if (bits === 8) {
    const compressed = new Uint8Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      compressed[i] = Math.round(embedding[i] * scale) + 128;
    }
    return compressed;
  } else {
    const compressed = new Uint16Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      compressed[i] = Math.round(embedding[i] * scale) + 32768;
    }
    return compressed;
  }
}

/**
 * Decompress embedding from quantized format
 */
export function decompressEmbedding(
  compressed: Uint8Array | Uint16Array,
  bits: 8 | 16 = 8
): number[] {
  const embedding = new Array(compressed.length);
  const scale = bits === 8 ? 127 : 32767;
  const offset = bits === 8 ? 128 : 32768;

  for (let i = 0; i < compressed.length; i++) {
    embedding[i] = (compressed[i] - offset) / scale;
  }

  return embedding;
}

/**
 * Clear the embedding cache
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: embeddingCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

export default {
  generateEmbedding,
  generateEmbeddingsBatch,
  storeEmbedding,
  semanticSearch,
  findRelevantMemories,
  cosineSimilarity,
  compressEmbedding,
  decompressEmbedding,
  clearEmbeddingCache,
  getCacheStats,
};
