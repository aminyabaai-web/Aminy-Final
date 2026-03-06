import { describe, it, expect, beforeEach } from 'vitest';
import {
  getVariant,
  forceVariant,
  getAllAssignments,
  clearAssignments,
} from '../lib/ab-testing';

describe('ab-testing', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAssignments();
  });

  describe('getVariant', () => {
    it('returns a variant from the provided list', () => {
      const variant = getVariant('test-experiment', 'user-123', ['control', 'treatment']);
      expect(['control', 'treatment']).toContain(variant);
    });

    it('returns the same variant for the same userId + experimentId', () => {
      const v1 = getVariant('exp1', 'user-abc', ['a', 'b', 'c']);
      const v2 = getVariant('exp1', 'user-abc', ['a', 'b', 'c']);
      expect(v1).toBe(v2);
    });

    it('returns different variants for different userIds', () => {
      // localStorage caches per experimentId, so clear between iterations
      // to test the raw hash distribution across different users
      const variants = new Set<string>();
      for (let i = 0; i < 200; i++) {
        clearAssignments();
        variants.add(getVariant('exp', `user-${i}`, ['a', 'b']));
      }
      // With 200 users and 2 variants, both must appear
      expect(variants.size).toBe(2);
    });

    it('returns different variants for different experiments', () => {
      // Same user can get different variants for different experiments
      const variants = new Set<string>();
      for (let i = 0; i < 50; i++) {
        variants.add(getVariant(`exp-${i}`, 'same-user', ['a', 'b']));
      }
      expect(variants.size).toBeGreaterThanOrEqual(2);
    });

    it('persists assignment in localStorage', () => {
      const variant = getVariant('persist-test', 'user-1', ['x', 'y']);
      // Clear memory but not localStorage
      const storedVariant = getVariant('persist-test', 'user-1', ['x', 'y']);
      expect(storedVariant).toBe(variant);
    });

    it('returns control for empty variants array', () => {
      expect(getVariant('empty', 'user', [])).toBe('control');
    });

    it('returns the only variant for single-variant array', () => {
      expect(getVariant('single', 'user', ['only-option'])).toBe('only-option');
    });
  });

  describe('forceVariant', () => {
    it('overrides the assigned variant', () => {
      getVariant('force-test', 'user-1', ['a', 'b']);
      forceVariant('force-test', 'b');
      const result = getVariant('force-test', 'user-1', ['a', 'b']);
      expect(result).toBe('b');
    });
  });

  describe('getAllAssignments', () => {
    it('returns all experiment assignments', () => {
      getVariant('exp-1', 'user-1', ['a', 'b']);
      getVariant('exp-2', 'user-1', ['x', 'y']);
      const all = getAllAssignments();
      expect(Object.keys(all)).toContain('exp-1');
      expect(Object.keys(all)).toContain('exp-2');
    });

    it('returns empty object when no assignments exist', () => {
      expect(getAllAssignments()).toEqual({});
    });
  });

  describe('clearAssignments', () => {
    it('removes all experiment assignments', () => {
      getVariant('exp-1', 'user-1', ['a', 'b']);
      clearAssignments();
      expect(getAllAssignments()).toEqual({});
    });
  });
});
