/**
 * Component Utility Tests
 * Tests for component utilities (avoiding import resolution issues)
 */

import { describe, it, expect } from 'vitest';
import { cn } from '../components/ui/utils';

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', true && 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });

  it('should handle undefined values', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('should merge Tailwind classes correctly', () => {
    const result = cn('px-4', 'px-8');
    // tailwind-merge should keep only the last conflicting class
    expect(result).toBe('px-8');
  });
});
