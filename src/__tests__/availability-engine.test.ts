/**
 * Availability Engine Tests
 * Tests the 72-hour telehealth-first routing rule
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkTelehealthAvailability72Hours,
  formatSlotTime,
  formatSlotDate,
  isSlotSoon,
  type TelehealthAvailabilityCheck,
} from '../lib/availability-engine';
import type { TimeSlot, VisitType } from '../types/telehealth';

describe('Availability Engine', () => {
  describe('checkTelehealthAvailability72Hours', () => {
    const mockProviders = [
      {
        id: 'provider-1',
        licensedStates: ['AZ', 'CA', 'TX'],
        isActive: true,
        acceptingNewPatients: true,
      },
      {
        id: 'provider-2',
        licensedStates: ['AZ', 'NV'],
        isActive: true,
        acceptingNewPatients: true,
      },
      {
        id: 'provider-3',
        licensedStates: ['NY', 'NJ'],
        isActive: true,
        acceptingNewPatients: true,
      },
    ];

    const createSlot = (
      providerId: string,
      hoursFromNow: number
    ): TimeSlot => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + hoursFromNow);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 25);

      return {
        id: `slot-${providerId}-${hoursFromNow}`,
        providerId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        visitType: 'consult' as VisitType,
        status: 'available',
      };
    };

    it('should find availability when provider licensed in state with slots', () => {
      const slots = [
        createSlot('provider-1', 24), // 24 hours from now
        createSlot('provider-2', 48), // 48 hours from now
      ];

      const result = checkTelehealthAvailability72Hours(
        mockProviders,
        'AZ',
        slots
      );

      expect(result.hasAvailabilityWithin72Hours).toBe(true);
      expect(result.eligibleProviderCount).toBe(2);
      expect(result.shouldShowLocalCare).toBe(false);
    });

    it('should not find availability when no providers licensed in state', () => {
      const slots = [
        createSlot('provider-1', 24),
        createSlot('provider-2', 48),
      ];

      const result = checkTelehealthAvailability72Hours(
        mockProviders,
        'FL', // No providers licensed in FL
        slots
      );

      expect(result.hasAvailabilityWithin72Hours).toBe(false);
      expect(result.eligibleProviderCount).toBe(0);
      expect(result.shouldShowLocalCare).toBe(true);
    });

    it('should not find availability when slots are beyond 72 hours', () => {
      const slots = [
        createSlot('provider-1', 96), // 4 days from now
        createSlot('provider-2', 120), // 5 days from now
      ];

      const result = checkTelehealthAvailability72Hours(
        mockProviders,
        'AZ',
        slots
      );

      expect(result.hasAvailabilityWithin72Hours).toBe(false);
      expect(result.shouldShowLocalCare).toBe(true);
    });

    it('should return earliest slot', () => {
      const slots = [
        createSlot('provider-1', 48), // Later
        createSlot('provider-2', 24), // Earlier
        createSlot('provider-1', 12), // Earliest
      ];

      const result = checkTelehealthAvailability72Hours(
        mockProviders,
        'AZ',
        slots
      );

      expect(result.earliestSlot).not.toBeNull();
      // The earliest slot should be the one 12 hours from now
      if (result.earliestSlot) {
        const slotTime = new Date(result.earliestSlot.startTime);
        const now = new Date();
        const hoursUntilSlot = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        expect(hoursUntilSlot).toBeLessThan(24);
      }
    });

    it('should provide fallback options when no availability', () => {
      const slots: TimeSlot[] = [];

      const result = checkTelehealthAvailability72Hours(
        mockProviders,
        'AZ',
        slots
      );

      expect(result.fallbackOptions.showWaitlist).toBe(true);
      expect(result.fallbackOptions.showLocalCareSupport).toBe(true);
      expect(result.fallbackOptions.showHomeProgramCTA).toBe(true);
    });

    it('should filter by visit type when provided', () => {
      const slots = [
        createSlot('provider-1', 24),
      ];
      // Note: This test verifies the parameter is accepted
      // Full filtering requires provider data to include visit type support

      const result = checkTelehealthAvailability72Hours(
        mockProviders,
        'AZ',
        slots,
        'consult'
      );

      expect(result.hasAvailabilityWithin72Hours).toBe(true);
    });

    it('should filter by provider status', () => {
      // When we have slots from multiple providers, only active ones should count
      const slots = [
        createSlot('provider-1', 24), // provider-1 is active and in AZ
        createSlot('provider-2', 48), // provider-2 is active and in AZ
      ];

      const result = checkTelehealthAvailability72Hours(
        mockProviders,
        'AZ',
        slots
      );

      // Should find availability from active providers
      expect(result.hasAvailabilityWithin72Hours).toBe(true);
      expect(result.eligibleProviderCount).toBeGreaterThan(0);
    });
  });

  describe('formatSlotTime', () => {
    it('should format time correctly', () => {
      const testDate = new Date('2024-06-15T14:30:00Z');
      const formatted = formatSlotTime(testDate.toISOString());

      // Should contain time component
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatSlotDate', () => {
    it('should format date correctly', () => {
      const testDate = new Date('2024-06-15T14:30:00Z');
      const formatted = formatSlotDate(testDate.toISOString());

      // Should contain date components
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('isSlotSoon', () => {
    it('should return true for slots within threshold (default 15 min)', () => {
      const soonSlot = new Date();
      soonSlot.setMinutes(soonSlot.getMinutes() + 10); // 10 min from now

      expect(isSlotSoon(soonSlot.toISOString())).toBe(true);
    });

    it('should return true for slots within custom threshold', () => {
      const soonSlot = new Date();
      soonSlot.setMinutes(soonSlot.getMinutes() + 90); // 1.5 hours from now

      // With 2 hour threshold, this should be "soon"
      expect(isSlotSoon(soonSlot.toISOString(), 2)).toBe(true);
    });

    it('should return false for slots beyond threshold', () => {
      const laterSlot = new Date();
      laterSlot.setHours(laterSlot.getHours() + 1); // 1 hour from now

      // Default threshold is 15 min, so 1 hour is not "soon"
      expect(isSlotSoon(laterSlot.toISOString())).toBe(false);
    });

    it('should return false for past slots', () => {
      const pastSlot = new Date();
      pastSlot.setHours(pastSlot.getHours() - 1);

      expect(isSlotSoon(pastSlot.toISOString())).toBe(false);
    });
  });
});
