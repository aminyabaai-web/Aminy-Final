import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getCaregiverName,
  getChildName,
  setCaregiverName,
  setChildName,
  broadcastNamesUpdated,
  useDisplayNames,
  CAREGIVER_KEY,
  CHILD_KEY,
  NAMES_UPDATED_EVENT,
} from '../lib/name-store';

describe('name-store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getCaregiverName', () => {
    it('returns empty string when no caregiver is stored', () => {
      expect(getCaregiverName()).toBe('');
    });

    it('returns first name from stored full name', () => {
      localStorage.setItem(CAREGIVER_KEY, JSON.stringify({ name: 'Jane Smith' }));
      expect(getCaregiverName()).toBe('Jane');
    });

    it('returns single name when no space in name', () => {
      localStorage.setItem(CAREGIVER_KEY, JSON.stringify({ name: 'Jane' }));
      expect(getCaregiverName()).toBe('Jane');
    });

    it('handles invalid JSON gracefully', () => {
      localStorage.setItem(CAREGIVER_KEY, 'not-json');
      expect(getCaregiverName()).toBe('');
    });

    it('handles empty name field', () => {
      localStorage.setItem(CAREGIVER_KEY, JSON.stringify({ name: '' }));
      expect(getCaregiverName()).toBe('');
    });
  });

  describe('getChildName', () => {
    it('returns empty string when no child is stored', () => {
      expect(getChildName()).toBe('');
    });

    it('returns first name from stored full name', () => {
      localStorage.setItem(CHILD_KEY, JSON.stringify({ name: 'Alex Johnson' }));
      expect(getChildName()).toBe('Alex');
    });

    it('handles invalid JSON gracefully', () => {
      localStorage.setItem(CHILD_KEY, 'broken{json');
      expect(getChildName()).toBe('');
    });
  });

  describe('setCaregiverName', () => {
    it('stores caregiver name in localStorage', () => {
      setCaregiverName('Jane Smith');
      const stored = JSON.parse(localStorage.getItem(CAREGIVER_KEY) || '{}');
      expect(stored.name).toBe('Jane Smith');
    });

    it('broadcasts names:updated event', () => {
      const handler = vi.fn();
      window.addEventListener(NAMES_UPDATED_EVENT, handler);
      setCaregiverName('Jane Smith');
      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener(NAMES_UPDATED_EVENT, handler);
    });
  });

  describe('setChildName', () => {
    it('stores child name in localStorage', () => {
      setChildName('Alex Johnson');
      const stored = JSON.parse(localStorage.getItem(CHILD_KEY) || '{}');
      expect(stored.name).toBe('Alex Johnson');
    });

    it('broadcasts names:updated event', () => {
      const handler = vi.fn();
      window.addEventListener(NAMES_UPDATED_EVENT, handler);
      setChildName('Alex Johnson');
      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener(NAMES_UPDATED_EVENT, handler);
    });
  });

  describe('broadcastNamesUpdated', () => {
    it('dispatches a CustomEvent on window', () => {
      const handler = vi.fn();
      window.addEventListener(NAMES_UPDATED_EVENT, handler);
      broadcastNamesUpdated();
      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener(NAMES_UPDATED_EVENT, handler);
    });
  });

  describe('constants', () => {
    it('exports correct localStorage keys', () => {
      expect(CAREGIVER_KEY).toBe('caregiver');
      expect(CHILD_KEY).toBe('child');
    });

    it('exports correct event name', () => {
      expect(NAMES_UPDATED_EVENT).toBe('names:updated');
    });
  });
});
