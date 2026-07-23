// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FAMILY_HANGOUT_CATEGORY,
  HANGOUT_MAX_FAMILIES,
  HANGOUT_INTERESTS,
  HANGOUT_GROUND_RULES,
  HANGOUT_SAFETY_BADGE,
  getHangoutInterest,
  isFamilyHangout,
  encodeHangoutDescription,
  decodeHangoutDescription,
  buildHangoutTopic,
  buildHangoutDescriptionTemplate,
  getHangoutInterestVotes,
  toggleHangoutInterestVote,
  HANGOUT_VOTES_STORAGE_KEY,
} from './family-hangouts';

describe('family-hangouts', () => {
  it('marks hangouts via the existing topic_category column (no new column)', () => {
    expect(isFamilyHangout({ topic_category: FAMILY_HANGOUT_CATEGORY })).toBe(true);
    expect(isFamilyHangout({ topic_category: 'sleep' })).toBe(false);
    expect(isFamilyHangout({ topic_category: null })).toBe(false);
    expect(isFamilyHangout({})).toBe(false);
  });

  it('keeps the group small (≤6 families)', () => {
    expect(HANGOUT_MAX_FAMILIES).toBeLessThanOrEqual(6);
  });

  it('encodes and decodes the interest tag round-trip', () => {
    const encoded = encodeHangoutDescription('building', 'Bring your favorite creation.');
    expect(encoded.startsWith('[interest:building]')).toBe(true);
    const decoded = decodeHangoutDescription(encoded);
    expect(decoded.interestId).toBe('building');
    expect(decoded.body).toBe('Bring your favorite creation.');
    // The tag never leaks into the display body
    expect(decoded.body).not.toContain('[interest:');
  });

  it('decodes untagged descriptions safely', () => {
    expect(decodeHangoutDescription('Plain description')).toEqual({
      interestId: null,
      body: 'Plain description',
    });
    expect(decodeHangoutDescription(null)).toEqual({ interestId: null, body: '' });
    expect(decodeHangoutDescription(undefined)).toEqual({ interestId: null, body: '' });
  });

  it('encodes without a tag when no interest is chosen', () => {
    expect(encodeHangoutDescription(null, ' hello ')).toBe('hello');
  });

  it('every interest resolves and yields a topic + template stating the ground rules', () => {
    for (const interest of HANGOUT_INTERESTS) {
      expect(getHangoutInterest(interest.id)).toBe(interest);
      expect(buildHangoutTopic(interest).toLowerCase()).toContain('hangout');
      const template = buildHangoutDescriptionTemplate(interest);
      expect(template).toContain(interest.kidPhrase);
      expect(template).toContain('facilitator');
      expect(template).toContain('parent stays nearby');
      expect(template).toContain('cameras are optional');
      expect(template).toContain('showing up is enough');
    }
    expect(getHangoutInterest('not-a-thing')).toBeNull();
    expect(getHangoutInterest(null)).toBeNull();
  });

  it('safety copy is exact', () => {
    expect(HANGOUT_SAFETY_BADGE).toBe('Facilitated · Parents present · Small group');
    expect(HANGOUT_GROUND_RULES).toContain('No pressure to speak — showing up is enough');
  });

  describe('interest votes (localStorage)', () => {
    beforeEach(() => {
      localStorage.removeItem(HANGOUT_VOTES_STORAGE_KEY);
    });

    it('toggles votes on and off, persisting to localStorage', () => {
      expect(getHangoutInterestVotes()).toEqual([]);
      expect(toggleHangoutInterestVote('trains')).toEqual(['trains']);
      expect(toggleHangoutInterestVote('animals')).toEqual(['trains', 'animals']);
      expect(getHangoutInterestVotes()).toEqual(['trains', 'animals']);
      expect(toggleHangoutInterestVote('trains')).toEqual(['animals']);
      expect(JSON.parse(localStorage.getItem(HANGOUT_VOTES_STORAGE_KEY) || '[]')).toEqual([
        'animals',
      ]);
    });

    it('survives corrupted storage', () => {
      localStorage.setItem(HANGOUT_VOTES_STORAGE_KEY, '{not json');
      expect(getHangoutInterestVotes()).toEqual([]);
      localStorage.setItem(HANGOUT_VOTES_STORAGE_KEY, '{"a":1}');
      expect(getHangoutInterestVotes()).toEqual([]);
    });
  });
});
