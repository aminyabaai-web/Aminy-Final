/**
 * Vector Embedding System for Semantic Search
 *
 * Enables semantic similarity search across conversation history
 * using lightweight client-side embeddings with optional server-side
 * integration for more accurate results.
 */

// ============================================
// TYPES
// ============================================

export interface EmbeddingVector {
  id: string;
  childId: string;
  type: 'message' | 'fact' | 'document' | 'summary';
  content: string;
  embedding: number[];
  metadata: {
    timestamp: string;
    source?: string;
    category?: string;
    emotionalContext?: string;
  };
}

export interface SemanticSearchResult {
  id: string;
  content: string;
  score: number;
  type: EmbeddingVector['type'];
  metadata: EmbeddingVector['metadata'];
}

// ============================================
// SIMPLE CLIENT-SIDE EMBEDDINGS
// Using TF-IDF-like approach for lightweight semantic search
// ============================================

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can',
  'just', 'don', 'now', 'i', 'me', 'my', 'myself', 'we', 'our',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its',
  'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'this',
  'that', 'these', 'those', 'am', 'up', 'down', 'out', 'off', 'over',
]);

// Domain-specific important words (weighted higher)
const DOMAIN_KEYWORDS: Record<string, number> = {
  // Behaviors
  'meltdown': 2.0,
  'tantrum': 1.8,
  'aggression': 1.8,
  'aggressive': 1.8,
  'hitting': 1.7,
  'biting': 1.7,
  'screaming': 1.6,
  'crying': 1.5,
  'calm': 1.5,
  'regulated': 1.6,
  'dysregulated': 1.8,
  'overstimulated': 1.7,
  'overwhelmed': 1.6,
  'anxious': 1.6,
  'anxiety': 1.6,
  'stimming': 1.7,
  'elopement': 1.9,
  'wandering': 1.7,
  'escape': 1.5,

  // Sensory
  'sensory': 1.8,
  'noise': 1.5,
  'loud': 1.4,
  'texture': 1.5,
  'touch': 1.4,
  'light': 1.4,
  'bright': 1.3,
  'smell': 1.4,
  'taste': 1.4,
  'proprioceptive': 1.8,
  'vestibular': 1.8,

  // Strategies
  'visual': 1.5,
  'schedule': 1.5,
  'timer': 1.5,
  'countdown': 1.5,
  'transition': 1.6,
  'warning': 1.4,
  'routine': 1.6,
  'predictable': 1.5,
  'consistent': 1.5,
  'reinforcement': 1.7,
  'reward': 1.5,
  'token': 1.5,
  'break': 1.4,
  'calm-down': 1.6,
  'deep-pressure': 1.7,
  'weighted': 1.6,
  'fidget': 1.5,

  // Communication
  'nonverbal': 1.7,
  'verbal': 1.5,
  'pecs': 1.8,
  'aac': 1.8,
  'sign': 1.5,
  'language': 1.4,
  'speech': 1.5,
  'words': 1.3,
  'communicate': 1.5,
  'express': 1.4,

  // Diagnoses
  'autism': 1.9,
  'autistic': 1.9,
  'asd': 1.9,
  'adhd': 1.8,
  'add': 1.7,
  'spd': 1.8,
  'odd': 1.7,
  'pda': 1.8,

  // Therapy
  'aba': 1.9,
  'therapy': 1.5,
  'therapist': 1.5,
  'bcba': 1.8,
  'rbt': 1.7,
  'ot': 1.6,
  'occupational': 1.5,
  'speech-therapy': 1.6,
  'iep': 1.8,
  'school': 1.4,
  'teacher': 1.4,

  // Activities
  'sleep': 1.6,
  'bedtime': 1.5,
  'morning': 1.4,
  'routine': 1.5,
  'meal': 1.4,
  'eating': 1.5,
  'food': 1.4,
  'picky': 1.5,
  'bath': 1.4,
  'homework': 1.4,
  'play': 1.3,
  'social': 1.5,
  'friend': 1.4,
};

/**
 * Tokenize and normalize text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Calculate term frequency for a document
 */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  tokens.forEach(token => {
    tf.set(token, (tf.get(token) || 0) + 1);
  });

  // Normalize by document length
  const maxFreq = Math.max(...tf.values());
  tf.forEach((freq, token) => {
    // Apply domain keyword weighting
    const weight = DOMAIN_KEYWORDS[token] || 1.0;
    tf.set(token, (freq / maxFreq) * weight);
  });

  return tf;
}

/**
 * Build vocabulary from corpus
 */
function buildVocabulary(documents: string[]): Map<string, number> {
  const vocab = new Map<string, number>();
  let index = 0;

  documents.forEach(doc => {
    tokenize(doc).forEach(token => {
      if (!vocab.has(token)) {
        vocab.set(token, index++);
      }
    });
  });

  return vocab;
}

/**
 * Create a simple embedding vector using TF-IDF-like weighting
 */
function createEmbedding(text: string, vocabulary: Map<string, number>): number[] {
  const tokens = tokenize(text);
  const tf = termFrequency(tokens);
  const vector = new Array(vocabulary.size).fill(0);

  tf.forEach((freq, token) => {
    const idx = vocabulary.get(token);
    if (idx !== undefined) {
      vector[idx] = freq;
    }
  });

  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return vector.map(v => v / magnitude);
  }
  return vector;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// ============================================
// EMBEDDING STORE
// ============================================

class EmbeddingStore {
  private embeddings: Map<string, EmbeddingVector[]> = new Map();
  private vocabulary: Map<string, number> = new Map();
  private needsRebuild = true;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem('aminy-embeddings');
      if (data) {
        const parsed = JSON.parse(data);
        Object.entries(parsed.embeddings || {}).forEach(([key, value]) => {
          this.embeddings.set(key, value as EmbeddingVector[]);
        });
        this.vocabulary = new Map(Object.entries(parsed.vocabulary || {}));
        this.needsRebuild = false;
      }
    } catch (e) {
      console.error('Failed to load embeddings from storage:', e);
    }
  }

  private saveToStorage() {
    try {
      const embeddingsObj: Record<string, EmbeddingVector[]> = {};
      this.embeddings.forEach((value, key) => {
        embeddingsObj[key] = value;
      });

      const vocabularyObj: Record<string, number> = {};
      this.vocabulary.forEach((value, key) => {
        vocabularyObj[key] = value;
      });

      localStorage.setItem('aminy-embeddings', JSON.stringify({
        embeddings: embeddingsObj,
        vocabulary: vocabularyObj,
      }));
    } catch (e) {
      console.error('Failed to save embeddings to storage:', e);
    }
  }

  /**
   * Rebuild vocabulary from all stored content
   */
  rebuildVocabulary() {
    const allContent: string[] = [];
    this.embeddings.forEach(vectors => {
      vectors.forEach(v => allContent.push(v.content));
    });

    this.vocabulary = buildVocabulary(allContent);

    // Re-embed all content with new vocabulary
    this.embeddings.forEach((vectors, childId) => {
      vectors.forEach(v => {
        v.embedding = createEmbedding(v.content, this.vocabulary);
      });
    });

    this.needsRebuild = false;
    this.saveToStorage();
  }

  /**
   * Add content and create embedding
   */
  addContent(
    childId: string,
    type: EmbeddingVector['type'],
    content: string,
    metadata: EmbeddingVector['metadata']
  ): EmbeddingVector {
    // Update vocabulary with new terms
    const newTokens = tokenize(content);
    newTokens.forEach(token => {
      if (!this.vocabulary.has(token)) {
        this.vocabulary.set(token, this.vocabulary.size);
        this.needsRebuild = true;
      }
    });

    const embedding = createEmbedding(content, this.vocabulary);

    const vector: EmbeddingVector = {
      id: `emb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      childId,
      type,
      content,
      embedding,
      metadata,
    };

    const childEmbeddings = this.embeddings.get(childId) || [];
    childEmbeddings.push(vector);
    this.embeddings.set(childId, childEmbeddings);

    this.saveToStorage();
    return vector;
  }

  /**
   * Search for semantically similar content
   */
  search(
    childId: string,
    query: string,
    options: {
      type?: EmbeddingVector['type'];
      limit?: number;
      minScore?: number;
    } = {}
  ): SemanticSearchResult[] {
    const { type, limit = 5, minScore = 0.1 } = options;

    if (this.needsRebuild) {
      this.rebuildVocabulary();
    }

    const queryEmbedding = createEmbedding(query, this.vocabulary);
    const childEmbeddings = this.embeddings.get(childId) || [];

    const results: SemanticSearchResult[] = [];

    childEmbeddings.forEach(vector => {
      if (type && vector.type !== type) return;

      const score = cosineSimilarity(queryEmbedding, vector.embedding);
      if (score >= minScore) {
        results.push({
          id: vector.id,
          content: vector.content,
          score,
          type: vector.type,
          metadata: vector.metadata,
        });
      }
    });

    // Sort by score descending and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Find related content based on a given content ID
   */
  findRelated(
    childId: string,
    contentId: string,
    limit: number = 5
  ): SemanticSearchResult[] {
    const childEmbeddings = this.embeddings.get(childId) || [];
    const sourceVector = childEmbeddings.find(v => v.id === contentId);

    if (!sourceVector) return [];

    const results: SemanticSearchResult[] = [];

    childEmbeddings.forEach(vector => {
      if (vector.id === contentId) return;

      const score = cosineSimilarity(sourceVector.embedding, vector.embedding);
      if (score > 0.1) {
        results.push({
          id: vector.id,
          content: vector.content,
          score,
          type: vector.type,
          metadata: vector.metadata,
        });
      }
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get statistics about embeddings
   */
  getStats(childId: string): {
    totalEmbeddings: number;
    byType: Record<string, number>;
    vocabularySize: number;
  } {
    const childEmbeddings = this.embeddings.get(childId) || [];
    const byType: Record<string, number> = {};

    childEmbeddings.forEach(v => {
      byType[v.type] = (byType[v.type] || 0) + 1;
    });

    return {
      totalEmbeddings: childEmbeddings.length,
      byType,
      vocabularySize: this.vocabulary.size,
    };
  }

  /**
   * Clean up old embeddings
   */
  cleanup(childId: string, maxAge: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const childEmbeddings = this.embeddings.get(childId) || [];
    const validEmbeddings = childEmbeddings.filter(v =>
      new Date(v.metadata.timestamp) >= cutoffDate
    );

    this.embeddings.set(childId, validEmbeddings);
    this.needsRebuild = true;
    this.saveToStorage();
  }

  /**
   * Clear all embeddings for a child
   */
  clear(childId: string) {
    this.embeddings.delete(childId);
    this.saveToStorage();
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const embeddingStore = new EmbeddingStore();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Index a conversation message for semantic search
 */
export function indexMessage(
  childId: string,
  content: string,
  author: 'user' | 'assistant',
  emotionalContext?: string
): EmbeddingVector {
  return embeddingStore.addContent(childId, 'message', content, {
    timestamp: new Date().toISOString(),
    source: author,
    emotionalContext,
  });
}

/**
 * Index a fact for semantic search
 */
export function indexFact(
  childId: string,
  content: string,
  category: string
): EmbeddingVector {
  return embeddingStore.addContent(childId, 'fact', content, {
    timestamp: new Date().toISOString(),
    category,
  });
}

/**
 * Search for relevant context given a user query
 */
export function searchRelevantContext(
  childId: string,
  query: string,
  limit: number = 5
): SemanticSearchResult[] {
  return embeddingStore.search(childId, query, { limit, minScore: 0.15 });
}

/**
 * Get context summary from semantic search results
 */
export function buildSemanticContext(
  results: SemanticSearchResult[],
  maxLength: number = 2000
): string {
  if (results.length === 0) return '';

  let context = '**Relevant past context:**\n';
  let currentLength = context.length;

  for (const result of results) {
    const entry = `- ${result.content} (${result.type}, relevance: ${(result.score * 100).toFixed(0)}%)\n`;

    if (currentLength + entry.length > maxLength) break;

    context += entry;
    currentLength += entry.length;
  }

  return context;
}
