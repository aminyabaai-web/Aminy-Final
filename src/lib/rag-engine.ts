// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * RAG Engine — pgvector-Powered Retrieval-Augmented Generation
 *
 * Provides the full pipeline for:
 * 1. Embedding generation via Supabase edge function (OpenAI text-embedding-3-small)
 * 2. Document chunking with sliding-window overlap
 * 3. Vector similarity search using pgvector <=> operator
 * 4. Context augmentation for AI prompts
 *
 * Architecture:
 *   EmbeddingService  — generate / store / search embeddings
 *   DocumentProcessor — chunk text, process vault documents
 *   RAGContext         — build context strings for system prompts
 *
 * Database table: document_embeddings (see migration 20260310_rag_engine.sql)
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// Types
// ============================================================================

export interface DocumentEmbedding {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  metadata: EmbeddingMetadata;
  created_at: string;
}

export interface EmbeddingMetadata {
  source: 'vault' | 'conversation' | 'care_plan' | 'behavior_log' | 'manual';
  document_title?: string;
  document_type?: string;
  child_id?: string;
  user_id?: string;
  total_chunks?: number;
  token_count?: number;
  [key: string]: unknown;
}

export interface SimilarityResult {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  metadata: EmbeddingMetadata;
}

export interface RAGSearchOptions {
  topK?: number;
  minSimilarity?: number;
  sourceFilter?: EmbeddingMetadata['source'][];
  childId?: string;
}

// ============================================================================
// EmbeddingService
// ============================================================================

export class EmbeddingService {
  private cache = new Map<string, { embedding: number[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate an embedding vector for text.
   * Uses the existing Supabase edge function `embed` which proxies to OpenAI.
   * Returns a 1536-dimensional vector (text-embedding-3-small at full dims).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = text.slice(0, 200); // Use first 200 chars as key
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.embedding;
    }

    // Trim text to embedding model limits
    const trimmed = text.slice(0, 8000);

    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/embed`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: trimmed,
          model: 'text-embedding-3-small',
          dimensions: 1536,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding generation failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const embedding = data.embedding as number[];

    // Cache the result
    this.cache.set(cacheKey, { embedding, timestamp: Date.now() });

    return embedding;
  }

  /**
   * Store an embedding in the document_embeddings table.
   */
  async storeEmbedding(
    documentId: string,
    chunkIndex: number,
    content: string,
    embedding: number[],
    metadata: EmbeddingMetadata
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('document_embeddings')
        .insert({
          document_id: documentId,
          chunk_index: chunkIndex,
          content,
          embedding: JSON.stringify(embedding),
          metadata,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (err) {
      console.error('[RAG] Failed to store embedding:', err);
      return null;
    }
  }

  /**
   * Search for similar documents using pgvector cosine distance (<=> operator).
   * Calls a Supabase RPC function that does the vector search server-side.
   */
  async searchSimilar(
    query: string,
    userId: string,
    options: RAGSearchOptions = {}
  ): Promise<SimilarityResult[]> {
    const {
      topK = 5,
      minSimilarity = 0.6,
      sourceFilter,
      childId,
    } = options;

    try {
      const queryEmbedding = await this.generateEmbedding(query);

      const { data, error } = await supabase.rpc('search_document_embeddings', {
        p_query_embedding: JSON.stringify(queryEmbedding),
        p_user_id: userId,
        p_match_threshold: minSimilarity,
        p_match_count: topK,
        p_source_filter: sourceFilter || null,
        p_child_id: childId || null,
      });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        document_id: row.document_id as string,
        chunk_index: row.chunk_index as number,
        content: row.content as string,
        similarity: row.similarity as number,
        metadata: (row.metadata || {}) as EmbeddingMetadata,
      }));
    } catch (err) {
      console.error('[RAG] Similarity search failed:', err);
      return [];
    }
  }

  /**
   * Remove all embeddings for a document.
   */
  async removeDocumentEmbeddings(documentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId);

    return !error;
  }

  private async getAccessToken(): Promise<string> {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || publicAnonKey;
    } catch {
      return publicAnonKey;
    }
  }
}

// ============================================================================
// DocumentProcessor
// ============================================================================

export class DocumentProcessor {
  private embeddingService: EmbeddingService;

  constructor(embeddingService?: EmbeddingService) {
    this.embeddingService = embeddingService || new EmbeddingService();
  }

  /**
   * Process a document: chunk it, generate embeddings, store in database.
   * Returns number of chunks successfully stored.
   */
  async processDocument(
    content: string,
    source: EmbeddingMetadata['source'],
    metadata: Partial<EmbeddingMetadata> = {}
  ): Promise<{ chunksStored: number; totalChunks: number; documentId: string }> {
    const documentId = metadata.document_id as string || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const chunks = this.chunkText(content, 500, 50);

    let stored = 0;

    // Process in batches of 5 to avoid rate limits on the embedding API
    for (let i = 0; i < chunks.length; i += 5) {
      const batch = chunks.slice(i, i + 5);

      const results = await Promise.allSettled(
        batch.map(async (chunk, batchIdx) => {
          const chunkIndex = i + batchIdx;
          const embedding = await this.embeddingService.generateEmbedding(chunk);

          return this.embeddingService.storeEmbedding(
            documentId,
            chunkIndex,
            chunk,
            embedding,
            {
              ...metadata,
              source,
              total_chunks: chunks.length,
              token_count: this.estimateTokens(chunk),
            }
          );
        })
      );

      stored += results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
    }

    return { chunksStored: stored, totalChunks: chunks.length, documentId };
  }

  /**
   * Chunk text into segments with sliding window overlap.
   * Uses token-aware splitting: approximately 500 tokens per chunk, 50 token overlap.
   */
  chunkText(text: string, maxTokens: number = 500, overlapTokens: number = 50): string[] {
    if (!text || text.trim().length === 0) return [];

    // Approximate: 1 token ~ 4 characters for English text
    const charsPerToken = 4;
    const maxChars = maxTokens * charsPerToken;
    const overlapChars = overlapTokens * charsPerToken;

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + maxChars, text.length);

      // Try to break at natural boundaries (sentence end, paragraph break)
      if (end < text.length) {
        // Prefer paragraph break
        const paragraphBreak = text.lastIndexOf('\n\n', end);
        if (paragraphBreak > start + maxChars * 0.5) {
          end = paragraphBreak + 2;
        } else {
          // Fallback to sentence boundary
          const sentenceEnd = this.findSentenceBoundary(text, start, end);
          if (sentenceEnd > start + maxChars * 0.3) {
            end = sentenceEnd;
          }
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk.length > 20) {
        chunks.push(chunk);
      }

      // Move forward by (chunk size - overlap)
      start = end - overlapChars;

      // Prevent infinite loop
      if (start >= end) {
        start = end;
      }
    }

    return chunks;
  }

  /**
   * Process a vault document by fetching from Supabase, chunking, and embedding.
   */
  async processVaultDocument(
    documentId: string,
    userId: string,
    childId?: string
  ): Promise<{ chunksStored: number; totalChunks: number }> {
    try {
      // Fetch document content from vault
      const { data: doc, error } = await supabase
        .from('vault_documents')
        .select('id, title, document_type, content, extracted_text, ai_summary')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (error || !doc) {
        throw new Error(`Vault document not found: ${documentId}`);
      }

      // Use extracted text, falling back to AI summary
      const content = doc.extracted_text || doc.ai_summary || doc.content || '';
      if (!content || content.length < 50) {
        return { chunksStored: 0, totalChunks: 0 };
      }

      // Remove old embeddings for this document before reprocessing
      await this.embeddingService.removeDocumentEmbeddings(documentId);

      return this.processDocument(content, 'vault', {
        document_title: doc.title,
        document_type: doc.document_type,
        user_id: userId,
        child_id: childId,
      });
    } catch (err) {
      console.error('[RAG] Failed to process vault document:', err);
      return { chunksStored: 0, totalChunks: 0 };
    }
  }

  /**
   * Process a conversation for RAG indexing.
   * Extracts key exchanges and stores as searchable chunks.
   */
  async processConversation(
    messages: Array<{ role: string; content: string }>,
    conversationId: string,
    userId: string,
    childId?: string
  ): Promise<{ chunksStored: number }> {
    // Build conversation text with role labels
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'Parent' : 'Aminy'}: ${m.content}`)
      .join('\n\n');

    if (conversationText.length < 50) return { chunksStored: 0 };

    const result = await this.processDocument(conversationText, 'conversation', {
      user_id: userId,
      child_id: childId,
      document_title: `Conversation ${conversationId}`,
    });

    return { chunksStored: result.chunksStored };
  }

  private findSentenceBoundary(text: string, start: number, maxEnd: number): number {
    // Look for sentence-ending punctuation followed by whitespace
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    let bestEnd = start;

    for (const ender of sentenceEnders) {
      let idx = text.lastIndexOf(ender, maxEnd);
      while (idx > start && idx > bestEnd) {
        bestEnd = idx + ender.length;
        idx = text.lastIndexOf(ender, idx - 1);
      }
    }

    return bestEnd;
  }

  private estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }
}

// ============================================================================
// RAGContext
// ============================================================================

export class RAGContext {
  private embeddingService: EmbeddingService;

  constructor(embeddingService?: EmbeddingService) {
    this.embeddingService = embeddingService || new EmbeddingService();
  }

  /**
   * Search for relevant context based on user query.
   * Returns formatted context string ready for injection into AI prompts.
   */
  async getRelevantContext(
    userQuery: string,
    userId: string,
    options: RAGSearchOptions = {}
  ): Promise<{ contextString: string; results: SimilarityResult[]; resultCount: number }> {
    const results = await this.embeddingService.searchSimilar(userQuery, userId, {
      topK: options.topK || 5,
      minSimilarity: options.minSimilarity || 0.6,
      sourceFilter: options.sourceFilter,
      childId: options.childId,
    });

    if (results.length === 0) {
      return { contextString: '', results: [], resultCount: 0 };
    }

    const contextString = this.formatResults(results);
    return { contextString, results, resultCount: results.length };
  }

  /**
   * Augment an AI system prompt with RAG-retrieved context.
   * Prepends relevant document chunks as grounding information.
   */
  async augmentPrompt(
    systemPrompt: string,
    userQuery: string,
    userId: string,
    options: RAGSearchOptions = {}
  ): Promise<{ augmentedPrompt: string; ragResultCount: number }> {
    const { contextString, resultCount } = await this.getRelevantContext(
      userQuery,
      userId,
      options
    );

    if (!contextString) {
      return { augmentedPrompt: systemPrompt, ragResultCount: 0 };
    }

    const augmentedPrompt = `${systemPrompt}

═══════════════════════════════════════════════════════════════
RELEVANT KNOWLEDGE (Retrieved from family's documents & history)
═══════════════════════════════════════════════════════════════
${contextString}

Use this information naturally when relevant. Reference specific details from documents, past conversations, or care plans to provide personalized guidance. Do not repeat this information verbatim — synthesize it into helpful, actionable advice.`;

    return { augmentedPrompt, ragResultCount: resultCount };
  }

  private formatResults(results: SimilarityResult[]): string {
    // Group by source type for organized context
    const grouped: Record<string, SimilarityResult[]> = {};
    for (const result of results) {
      const source = result.metadata.source || 'unknown';
      if (!grouped[source]) grouped[source] = [];
      grouped[source].push(result);
    }

    const sections: string[] = [];

    if (grouped.vault?.length) {
      const docs = grouped.vault
        .map(r => {
          const title = r.metadata.document_title || 'Document';
          return `[${title}]: ${r.content.slice(0, 300)}${r.content.length > 300 ? '...' : ''}`;
        })
        .join('\n\n');
      sections.push(`FROM DOCUMENTS:\n${docs}`);
    }

    if (grouped.conversation?.length) {
      const convos = grouped.conversation
        .map(r => r.content.slice(0, 250))
        .join('\n---\n');
      sections.push(`FROM PAST CONVERSATIONS:\n${convos}`);
    }

    if (grouped.care_plan?.length) {
      const plans = grouped.care_plan
        .map(r => r.content.slice(0, 250))
        .join('\n');
      sections.push(`FROM CARE PLAN:\n${plans}`);
    }

    if (grouped.behavior_log?.length) {
      const logs = grouped.behavior_log
        .map(r => r.content.slice(0, 200))
        .join('\n');
      sections.push(`FROM BEHAVIOR LOGS:\n${logs}`);
    }

    return sections.join('\n\n');
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

let _embeddingService: EmbeddingService | null = null;
let _documentProcessor: DocumentProcessor | null = null;
let _ragContext: RAGContext | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!_embeddingService) _embeddingService = new EmbeddingService();
  return _embeddingService;
}

export function getDocumentProcessor(): DocumentProcessor {
  if (!_documentProcessor) _documentProcessor = new DocumentProcessor(getEmbeddingService());
  return _documentProcessor;
}

export function getRAGContext(): RAGContext {
  if (!_ragContext) _ragContext = new RAGContext(getEmbeddingService());
  return _ragContext;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick RAG search — one-liner for common use case.
 */
export async function ragSearch(
  query: string,
  userId: string,
  options?: RAGSearchOptions
): Promise<string> {
  const ctx = getRAGContext();
  const { contextString } = await ctx.getRelevantContext(query, userId, options);
  return contextString;
}

/**
 * Index a vault document for RAG search.
 */
export async function indexVaultDocument(
  documentId: string,
  userId: string,
  childId?: string
): Promise<number> {
  const processor = getDocumentProcessor();
  const result = await processor.processVaultDocument(documentId, userId, childId);
  return result.chunksStored;
}

/**
 * Index a conversation for RAG search.
 */
export async function indexConversation(
  messages: Array<{ role: string; content: string }>,
  conversationId: string,
  userId: string,
  childId?: string
): Promise<number> {
  const processor = getDocumentProcessor();
  const result = await processor.processConversation(messages, conversationId, userId, childId);
  return result.chunksStored;
}

export default {
  EmbeddingService,
  DocumentProcessor,
  RAGContext,
  getEmbeddingService,
  getDocumentProcessor,
  getRAGContext,
  ragSearch,
  indexVaultDocument,
  indexConversation,
};
