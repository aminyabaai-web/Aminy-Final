/**
 * Plan Tab Utilities Tests
 * Tests for shared helper functions in the plan tab module
 */

import { describe, it, expect } from 'vitest';
import {
  getCategoryColor,
  getPriorityColor,
  getProgressColor,
  getProgressLabel,
  getSeverityColor,
  formatDate,
  formatRelativeDate,
  calculateAverageProgress,
  calculateCompletionRate,
  hasAccessToSection,
  NAV_SECTIONS,
} from '../components/plan-tab/utils';

describe('Plan Tab Utilities', () => {
  describe('getCategoryColor', () => {
    it('should return correct color for speech category', () => {
      expect(getCategoryColor('speech')).toContain('blue');
    });

    it('should return correct color for social category', () => {
      expect(getCategoryColor('social')).toContain('green');
    });

    it('should return correct color for sensory category', () => {
      expect(getCategoryColor('sensory')).toContain('purple');
    });

    it('should return correct color for routines category', () => {
      expect(getCategoryColor('routines')).toContain('orange');
    });

    it('should return gray for unknown category', () => {
      expect(getCategoryColor('unknown')).toContain('gray');
    });
  });

  describe('getPriorityColor', () => {
    it('should return red for high priority', () => {
      expect(getPriorityColor('high')).toContain('red');
    });

    it('should return amber for medium priority', () => {
      expect(getPriorityColor('medium')).toContain('amber');
    });

    it('should return green for low priority', () => {
      expect(getPriorityColor('low')).toContain('green');
    });
  });

  describe('getProgressColor', () => {
    it('should return green for excellent progress (80%+)', () => {
      expect(getProgressColor(80)).toBe('bg-green-500');
      expect(getProgressColor(100)).toBe('bg-green-500');
    });

    it('should return blue for good progress (50-79%)', () => {
      expect(getProgressColor(50)).toBe('bg-blue-500');
      expect(getProgressColor(79)).toBe('bg-blue-500');
    });

    it('should return amber for starting progress (25-49%)', () => {
      expect(getProgressColor(25)).toBe('bg-amber-500');
      expect(getProgressColor(49)).toBe('bg-amber-500');
    });

    it('should return gray for beginning progress (0-24%)', () => {
      expect(getProgressColor(0)).toBe('bg-gray-400');
      expect(getProgressColor(24)).toBe('bg-gray-400');
    });
  });

  describe('getProgressLabel', () => {
    it('should return Excellent for 80%+', () => {
      expect(getProgressLabel(80)).toBe('Excellent');
      expect(getProgressLabel(100)).toBe('Excellent');
    });

    it('should return Good Progress for 50-79%', () => {
      expect(getProgressLabel(50)).toBe('Good Progress');
    });

    it('should return Getting Started for 25-49%', () => {
      expect(getProgressLabel(25)).toBe('Getting Started');
    });

    it('should return Beginning for 0-24%', () => {
      expect(getProgressLabel(0)).toBe('Beginning');
    });
  });

  describe('getSeverityColor', () => {
    it('should return red for high severity', () => {
      expect(getSeverityColor('high')).toContain('red');
    });

    it('should return amber for medium severity', () => {
      expect(getSeverityColor('medium')).toContain('amber');
    });

    it('should return green for low severity', () => {
      expect(getSeverityColor('low')).toContain('green');
    });
  });

  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      // Use noon UTC to avoid timezone date-shift issues
      const date = new Date('2024-12-25T12:00:00');
      const result = formatDate(date);
      expect(result).toContain('Dec');
      expect(result).toContain('25');
      expect(result).toContain('2024');
    });

    it('should format date string correctly', () => {
      const result = formatDate('2024-01-15T12:00:00');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
    });
  });

  describe('formatRelativeDate', () => {
    it('should return Today for current date', () => {
      expect(formatRelativeDate(new Date())).toBe('Today');
    });

    it('should return Yesterday for previous day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatRelativeDate(yesterday)).toBe('Yesterday');
    });

    it('should return "X days ago" for recent dates', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(formatRelativeDate(threeDaysAgo)).toBe('3 days ago');
    });

    it('should return "X weeks ago" for older dates', () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      expect(formatRelativeDate(twoWeeksAgo)).toBe('2 weeks ago');
    });
  });

  describe('calculateAverageProgress', () => {
    it('should return 0 for empty array', () => {
      expect(calculateAverageProgress([])).toBe(0);
    });

    it('should calculate average correctly', () => {
      const goals = [
        { progress: 50 },
        { progress: 100 },
        { progress: 75 },
      ];
      expect(calculateAverageProgress(goals)).toBe(75);
    });

    it('should round to nearest integer', () => {
      const goals = [
        { progress: 33 },
        { progress: 33 },
        { progress: 33 },
      ];
      expect(calculateAverageProgress(goals)).toBe(33);
    });
  });

  describe('calculateCompletionRate', () => {
    it('should return 0 for empty array', () => {
      expect(calculateCompletionRate([])).toBe(0);
    });

    it('should calculate completion rate correctly', () => {
      const items = [
        { completed: true },
        { completed: true },
        { completed: false },
        { completed: false },
      ];
      expect(calculateCompletionRate(items)).toBe(50);
    });

    it('should ignore inactive items', () => {
      const items = [
        { completed: true, active: true },
        { completed: false, active: true },
        { completed: false, active: false }, // Should be ignored
      ];
      expect(calculateCompletionRate(items)).toBe(50);
    });
  });

  describe('hasAccessToSection', () => {
    it('should allow access to sections with no tier requirement', () => {
      expect(hasAccessToSection('overview', 'free')).toBe(true);
      expect(hasAccessToSection('goals', 'free')).toBe(true);
      expect(hasAccessToSection('routines', null)).toBe(true);
    });

    it('should restrict pro sections from free tier', () => {
      expect(hasAccessToSection('coaching', 'free')).toBe(false);
      expect(hasAccessToSection('insights', 'free')).toBe(false);
    });

    it('should allow pro sections for pro tier', () => {
      expect(hasAccessToSection('coaching', 'pro')).toBe(true);
      expect(hasAccessToSection('insights', 'pro')).toBe(true);
    });

    it('should restrict premium sections from pro tier', () => {
      expect(hasAccessToSection('outcomes', 'pro')).toBe(false);
    });

    it('should allow premium sections for premium tier', () => {
      expect(hasAccessToSection('outcomes', 'premium')).toBe(true);
    });

    it('should be case insensitive for tier names', () => {
      expect(hasAccessToSection('coaching', 'PRO')).toBe(true);
      expect(hasAccessToSection('outcomes', 'Premium')).toBe(true);
    });
  });

  describe('NAV_SECTIONS', () => {
    it('should have 13 navigation sections', () => {
      expect(NAV_SECTIONS.length).toBe(13);
    });

    it('should have overview as first section', () => {
      expect(NAV_SECTIONS[0].id).toBe('overview');
    });

    it('should have unique section ids', () => {
      const ids = NAV_SECTIONS.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have icons for all sections', () => {
      NAV_SECTIONS.forEach(section => {
        expect(section.icon).toBeDefined();
      });
    });

    it('should mark pro sections correctly', () => {
      const proSections = NAV_SECTIONS.filter(s => s.tierRequired === 'pro');
      expect(proSections.map(s => s.id)).toContain('coaching');
      expect(proSections.map(s => s.id)).toContain('insights');
    });

    it('should mark premium sections correctly', () => {
      const premiumSections = NAV_SECTIONS.filter(s => s.tierRequired === 'premium');
      expect(premiumSections.map(s => s.id)).toContain('outcomes');
    });
  });
});
