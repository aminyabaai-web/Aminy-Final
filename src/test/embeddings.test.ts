/**
 * Embeddings Service Tests
 * Tests for vector embeddings and semantic search functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  cosineSimilarity,
  compressEmbedding,
  decompressEmbedding,
  clearEmbeddingCache,
  getCacheStats,
} from '../lib/ai-engine/embeddings';

describe('Embeddings Service', () => {
  beforeEach(() => {
    clearEmbeddingCache();
  });

  describe('Cosine Similarity', () => {
    it('should return 1 for identical vectors', () => {
      const vector = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vector, vector)).toBeCloseTo(1, 10);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 10);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 10);
    });

    it('should handle normalized vectors', () => {
      const a = [0.5, 0.5, 0.5, 0.5];
      const b = [0.5, 0.5, 0.5, 0.5];
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 10);
    });

    it('should throw for mismatched vector lengths', () => {
      const a = [1, 2, 3];
      const b = [1, 2];
      expect(() => cosineSimilarity(a, b)).toThrow('Vectors must have the same length');
    });

    it('should handle zero vectors', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('should calculate similarity for real embedding-like vectors', () => {
      // Simulate 1536-dim embedding subset
      const a = Array(100).fill(0).map(() => Math.random() - 0.5);
      const b = a.map(x => x + (Math.random() - 0.5) * 0.1); // Similar with noise

      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeGreaterThan(0.9); // Should be very similar
    });
  });

  describe('Embedding Compression', () => {
    it('should compress to 8-bit', () => {
      const embedding = [0.5, -0.5, 0.25, -0.25, 0, 1, -1];
      const compressed = compressEmbedding(embedding, 8);

      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed.length).toBe(embedding.length);
    });

    it('should compress to 16-bit', () => {
      const embedding = [0.5, -0.5, 0.25, -0.25, 0, 1, -1];
      const compressed = compressEmbedding(embedding, 16);

      expect(compressed).toBeInstanceOf(Uint16Array);
      expect(compressed.length).toBe(embedding.length);
    });

    it('should decompress 8-bit back to approximate values', () => {
      const original = [0.5, -0.5, 0.25, -0.25, 0];
      const compressed = compressEmbedding(original, 8);
      const decompressed = decompressEmbedding(compressed, 8);

      // 8-bit compression has some precision loss
      for (let i = 0; i < original.length; i++) {
        expect(decompressed[i]).toBeCloseTo(original[i], 1);
      }
    });

    it('should decompress 16-bit with better precision', () => {
      const original = [0.5, -0.5, 0.25, -0.25, 0];
      const compressed = compressEmbedding(original, 16);
      const decompressed = decompressEmbedding(compressed, 16);

      // 16-bit compression should have better precision
      for (let i = 0; i < original.length; i++) {
        expect(decompressed[i]).toBeCloseTo(original[i], 3);
      }
    });

    it('should maintain similarity after compression/decompression', () => {
      const a = Array(100).fill(0).map(() => Math.random() - 0.5);
      const b = Array(100).fill(0).map(() => Math.random() - 0.5);

      const originalSimilarity = cosineSimilarity(a, b);

      // Compress and decompress both vectors
      const aCompressed = compressEmbedding(a, 16);
      const bCompressed = compressEmbedding(b, 16);
      const aDecompressed = decompressEmbedding(aCompressed, 16);
      const bDecompressed = decompressEmbedding(bCompressed, 16);

      const compressedSimilarity = cosineSimilarity(aDecompressed, bDecompressed);

      // Similarity should be very close
      expect(compressedSimilarity).toBeCloseTo(originalSimilarity, 2);
    });
  });

  describe('Cache Management', () => {
    it('should start with empty cache', () => {
      clearEmbeddingCache();
      const stats = getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should have maximum size limit', () => {
      const stats = getCacheStats();
      expect(stats.maxSize).toBe(100);
    });

    it('should clear cache correctly', () => {
      // Can't actually populate cache without API call, but can test clear
      clearEmbeddingCache();
      const stats = getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});

describe('Semantic Search Logic', () => {
  describe('Similarity Thresholds', () => {
    it('should identify high similarity (> 0.9) as very relevant', () => {
      const threshold = 0.9;
      const similarities = [0.95, 0.92, 0.88, 0.75, 0.5];
      const highlyRelevant = similarities.filter(s => s >= threshold);
      expect(highlyRelevant.length).toBe(2);
    });

    it('should identify medium similarity (0.7-0.9) as relevant', () => {
      const lowThreshold = 0.7;
      const highThreshold = 0.9;
      const similarities = [0.95, 0.85, 0.75, 0.65, 0.5];
      const relevant = similarities.filter(s => s >= lowThreshold && s < highThreshold);
      expect(relevant.length).toBe(2);
    });

    it('should filter out low similarity (< 0.7) as irrelevant', () => {
      const threshold = 0.7;
      const similarities = [0.95, 0.85, 0.75, 0.65, 0.5];
      const irrelevant = similarities.filter(s => s < threshold);
      expect(irrelevant.length).toBe(2);
    });
  });

  describe('Result Ranking', () => {
    it('should rank by similarity score descending', () => {
      const results = [
        { id: '1', similarity: 0.75 },
        { id: '2', similarity: 0.95 },
        { id: '3', similarity: 0.85 },
        { id: '4', similarity: 0.65 },
      ];

      const ranked = [...results].sort((a, b) => b.similarity - a.similarity);

      expect(ranked[0].id).toBe('2');
      expect(ranked[1].id).toBe('3');
      expect(ranked[2].id).toBe('1');
      expect(ranked[3].id).toBe('4');
    });

    it('should apply limit after ranking', () => {
      const results = Array(20).fill(0).map((_, i) => ({
        id: String(i),
        similarity: Math.random(),
      }));

      const limit = 5;
      const ranked = [...results]
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      expect(ranked.length).toBe(5);
      expect(ranked[0].similarity).toBeGreaterThanOrEqual(ranked[4].similarity);
    });
  });

  describe('Content Type Filtering', () => {
    it('should filter by content type', () => {
      const results = [
        { id: '1', contentType: 'memory_fact', similarity: 0.9 },
        { id: '2', contentType: 'conversation', similarity: 0.85 },
        { id: '3', contentType: 'document', similarity: 0.8 },
        { id: '4', contentType: 'memory_fact', similarity: 0.75 },
      ];

      const contentTypes = ['memory_fact'];
      const filtered = results.filter(r => contentTypes.includes(r.contentType));

      expect(filtered.length).toBe(2);
      expect(filtered.every(r => r.contentType === 'memory_fact')).toBe(true);
    });

    it('should handle multiple content types', () => {
      const results = [
        { id: '1', contentType: 'memory_fact', similarity: 0.9 },
        { id: '2', contentType: 'conversation', similarity: 0.85 },
        { id: '3', contentType: 'document', similarity: 0.8 },
        { id: '4', contentType: 'memory_fact', similarity: 0.75 },
      ];

      const contentTypes = ['memory_fact', 'conversation'];
      const filtered = results.filter(r => contentTypes.includes(r.contentType));

      expect(filtered.length).toBe(3);
    });
  });
});

describe('Memory Retrieval Scenarios', () => {
  describe('Child Preference Queries', () => {
    it('should identify preference-related queries', () => {
      const preferenceKeywords = ['likes', 'loves', 'favorite', 'enjoys', 'prefers'];
      const queries = [
        'What does Alex like to eat',
        'What are his favorite toys',
        'Does he enjoy music',
      ];

      for (const query of queries) {
        const hasPreferenceKeyword = preferenceKeywords.some(k =>
          query.toLowerCase().includes(k)
        );
        expect(hasPreferenceKeyword).toBe(true);
      }
    });
  });

  describe('Trigger Identification', () => {
    it('should identify trigger-related queries', () => {
      const triggerKeywords = ['triggers', 'upset', 'meltdown', 'avoid', 'sensitive'];
      const queries = [
        'What triggers his meltdowns',
        'What should we avoid',
        'What makes him upset',
      ];

      for (const query of queries) {
        const hasTriggerKeyword = triggerKeywords.some(k =>
          query.toLowerCase().includes(k)
        );
        expect(hasTriggerKeyword).toBe(true);
      }
    });
  });

  describe('Strategy Retrieval', () => {
    it('should identify strategy-related queries', () => {
      const strategyKeywords = ['helps', 'works', 'strategy', 'technique', 'calms'];
      const queries = [
        'What helps with transitions',
        'What works for bedtime',
        'What calms him down',
      ];

      for (const query of queries) {
        const hasStrategyKeyword = strategyKeywords.some(k =>
          query.toLowerCase().includes(k)
        );
        expect(hasStrategyKeyword).toBe(true);
      }
    });
  });
});
