// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { useState, useEffect } from 'react';
import { syncEncryptedStorage } from './security/encrypted-storage';

// Canonical localStorage keys
const CAREGIVER_KEY = 'caregiver';
const CHILD_KEY = 'child';
const NAMES_UPDATED_EVENT = 'names:updated';

// Type definitions
interface NameRecord {
  name: string;
}

interface DisplayNames {
  caregiverShort: string;
  childShort: string;
}

// Helper functions with fallbacks and try/catch

/**
 * Get caregiver's first name from localStorage
 * @returns First word of caregiver name or empty string
 */
export function getCaregiverName(): string {
  try {
    const stored = syncEncryptedStorage.getItem(CAREGIVER_KEY);
    if (!stored) return '';
    
    const parsed: NameRecord = JSON.parse(stored);
    const fullName = parsed.name || '';
    return fullName.split(' ')[0] || '';
  } catch (error) {
    return '';
  }
}

/**
 * Get child's first name from localStorage
 * @returns First word of child name or empty string
 */
export function getChildName(): string {
  try {
    const stored = syncEncryptedStorage.getItem(CHILD_KEY);
    if (!stored) return '';
    
    const parsed: NameRecord = JSON.parse(stored);
    const fullName = parsed.name || '';
    return fullName.split(' ')[0] || '';
  } catch (error) {
    return '';
  }
}

/**
 * Set caregiver's full name in localStorage
 * @param full - Full name of caregiver
 */
export function setCaregiverName(full: string): void {
  try {
    const record: NameRecord = { name: full };
    syncEncryptedStorage.setItem(CAREGIVER_KEY, JSON.stringify(record));
    broadcastNamesUpdated();
  } catch (error) {
    console.error('Failed to set caregiver name in localStorage:', error);
  }
}

/**
 * Set child's full name in localStorage
 * @param full - Full name of child
 */
export function setChildName(full: string): void {
  try {
    const record: NameRecord = { name: full };
    syncEncryptedStorage.setItem(CHILD_KEY, JSON.stringify(record));
    broadcastNamesUpdated();
  } catch (error) {
    console.error('Failed to set child name in localStorage:', error);
  }
}

/**
 * Broadcast that names have been updated
 * Triggers the 'names:updated' CustomEvent
 */
export function broadcastNamesUpdated(): void {
  try {
    const event = new CustomEvent(NAMES_UPDATED_EVENT);
    window.dispatchEvent(event);
  } catch (error) {
    console.error('Failed to broadcast names updated event:', error);
  }
}

/**
 * Get display names with fallbacks
 * @returns Object with caregiverShort and childShort
 */
function getDisplayNames(): DisplayNames {
  const caregiverShort = getCaregiverName() || 'there';
  const childShort = getChildName() || 'your child';
  
  return {
    caregiverShort,
    childShort
  };
}

/**
 * React hook for display names
 * Computes on mount and whenever 'names:updated' CustomEvent fires
 * @returns Object with caregiverShort and childShort
 */
export function useDisplayNames(): DisplayNames {
  const [displayNames, setDisplayNames] = useState<DisplayNames>(() => getDisplayNames());

  useEffect(() => {
    // Update display names when the custom event fires
    const handleNamesUpdated = () => {
      setDisplayNames(getDisplayNames());
    };

    // Listen for the custom event
    window.addEventListener(NAMES_UPDATED_EVENT, handleNamesUpdated);

    // Also update on storage events from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CAREGIVER_KEY || event.key === CHILD_KEY) {
        setDisplayNames(getDisplayNames());
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup listeners
    return () => {
      window.removeEventListener(NAMES_UPDATED_EVENT, handleNamesUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return displayNames;
}

// Export constants for external use
export { CAREGIVER_KEY, CHILD_KEY, NAMES_UPDATED_EVENT };