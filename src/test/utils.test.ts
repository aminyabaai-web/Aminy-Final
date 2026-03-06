import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cn, formatRelativeTime, generateId } from '../lib/utils';

describe('cn (className merge utility)', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates conflicting Tailwind classes', () => {
    // twMerge should resolve p-4 vs p-2 to p-2 (last wins)
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('handles empty string input', () => {
    expect(cn('')).toBe('');
  });

  it('handles arrays of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('merges Tailwind color variants correctly', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  it('returns "Just now" for dates less than 1 minute ago', () => {
    const date = new Date('2025-06-15T11:59:30Z');
    expect(formatRelativeTime(date)).toBe('Just now');
  });

  it('returns minutes ago for dates under 1 hour', () => {
    const date = new Date('2025-06-15T11:45:00Z');
    expect(formatRelativeTime(date)).toBe('15m ago');
  });

  it('returns hours ago for dates under 24 hours', () => {
    const date = new Date('2025-06-15T06:00:00Z');
    expect(formatRelativeTime(date)).toBe('6h ago');
  });

  it('returns days ago for dates under 7 days', () => {
    const date = new Date('2025-06-12T12:00:00Z');
    expect(formatRelativeTime(date)).toBe('3d ago');
  });

  it('returns formatted date for dates older than 7 days', () => {
    const date = new Date('2025-06-01T12:00:00Z');
    const result = formatRelativeTime(date);
    // Should be a locale date string, not relative
    expect(result).not.toContain('ago');
    expect(result).not.toBe('Just now');
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('returns a non-empty string', () => {
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('returns unique IDs on consecutive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    // With 100 calls, we should get at least 95 unique IDs
    expect(ids.size).toBeGreaterThan(95);
  });

  it('returns alphanumeric characters only', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});
