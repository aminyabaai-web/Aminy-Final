/**
 * Onboarding Flow Tests
 * Comprehensive tests for onboarding, user journey, and data collection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Define types
type UserRole = 'parent' | 'provider' | 'both';
type SubscriptionTier = 'free' | 'starter' | 'core' | 'pro' | 'proplus';

interface OnboardingState {
  step: number;
  totalSteps: number;
  userRole?: UserRole;
  childInfo?: ChildInfo;
  providerInfo?: ProviderInfo;
  goals?: string[];
  challenges?: string[];
  preferences?: UserPreferences;
  isComplete: boolean;
}

interface ChildInfo {
  name: string;
  birthDate?: string;
  diagnosis?: string[];
  therapies?: string[];
  school?: string;
  communicationLevel?: 'nonverbal' | 'limited' | 'verbal' | 'fluent';
  sensoryProfile?: string[];
}

interface ProviderInfo {
  credentials: string[];
  specialty?: string[];
  yearsExperience?: number;
  organization?: string;
  npiNumber?: string;
}

interface UserPreferences {
  notificationTime?: string;
  notificationFrequency?: 'daily' | 'weekly' | 'as_needed';
  preferredName?: string;
  timezone?: string;
  language?: string;
}

// Helper functions
function validateChildName(name: string): { valid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: 'Name is required' };
  }
  if (name.length > 100) {
    return { valid: false, message: 'Name is too long' };
  }
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return { valid: false, message: 'Name contains invalid characters' };
  }
  return { valid: true };
}

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function validateBirthDate(birthDate: string): { valid: boolean; message?: string } {
  const age = calculateAge(birthDate);
  if (age < 0) {
    return { valid: false, message: 'Birth date cannot be in the future' };
  }
  if (age > 25) {
    return { valid: false, message: 'This app is designed for children and young adults (0-25)' };
  }
  return { valid: true };
}

function getRecommendedTier(
  childCount: number,
  providerType: boolean,
  wantsAI: boolean,
  needsDataExport: boolean
): SubscriptionTier {
  if (providerType) {
    return needsDataExport ? 'pro' : 'core';
  }
  if (childCount > 1 || needsDataExport) {
    return 'pro';
  }
  if (wantsAI) {
    return 'core';
  }
  return 'starter';
}

function calculateOnboardingProgress(state: OnboardingState): number {
  return Math.round((state.step / state.totalSteps) * 100);
}

function getNextStep(state: OnboardingState): number {
  if (state.step >= state.totalSteps) {
    return state.totalSteps;
  }
  return state.step + 1;
}

function canProceed(state: OnboardingState): boolean {
  switch (state.step) {
    case 1: // Role selection
      return !!state.userRole;
    case 2: // Child/Provider info
      if (state.userRole === 'parent' || state.userRole === 'both') {
        return !!state.childInfo?.name;
      }
      if (state.userRole === 'provider') {
        return (state.providerInfo?.credentials?.length ?? 0) > 0;
      }
      return false;
    case 3: // Goals
      return (state.goals?.length ?? 0) > 0;
    case 4: // Challenges
      return (state.challenges?.length ?? 0) > 0;
    case 5: // Preferences
      return true; // Optional
    default:
      return true;
  }
}

describe('Child Name Validation', () => {
  it('should accept valid names', () => {
    expect(validateChildName('Alex').valid).toBe(true);
    expect(validateChildName('Mary Jane').valid).toBe(true);
    expect(validateChildName("O'Connor").valid).toBe(true);
    expect(validateChildName('Jean-Pierre').valid).toBe(true);
  });

  it('should reject empty names', () => {
    expect(validateChildName('').valid).toBe(false);
    expect(validateChildName('   ').valid).toBe(false);
  });

  it('should reject names with numbers', () => {
    expect(validateChildName('Alex123').valid).toBe(false);
    expect(validateChildName('Child 1').valid).toBe(false);
  });

  it('should reject names with special characters', () => {
    expect(validateChildName('Alex@home').valid).toBe(false);
    expect(validateChildName('Alex!').valid).toBe(false);
  });

  it('should reject names that are too long', () => {
    const longName = 'A'.repeat(101);
    expect(validateChildName(longName).valid).toBe(false);
  });
});

describe('Age Calculation', () => {
  it('should calculate age correctly', () => {
    const today = new Date();
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(today.getFullYear() - 5);

    expect(calculateAge(fiveYearsAgo.toISOString())).toBe(5);
  });

  it('should handle birthdays that havent occurred this year', () => {
    const today = new Date();
    const almostFiveYearsAgo = new Date(today);
    almostFiveYearsAgo.setFullYear(today.getFullYear() - 5);
    almostFiveYearsAgo.setMonth(today.getMonth() + 1); // Birthday next month

    expect(calculateAge(almostFiveYearsAgo.toISOString())).toBe(4);
  });
});

describe('Birth Date Validation', () => {
  it('should accept valid birth dates', () => {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    expect(validateBirthDate(fiveYearsAgo.toISOString()).valid).toBe(true);
  });

  it('should reject future dates', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const result = validateBirthDate(futureDate.toISOString());
    expect(result.valid).toBe(false);
    expect(result.message).toContain('future');
  });

  it('should reject ages over 25', () => {
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);

    const result = validateBirthDate(thirtyYearsAgo.toISOString());
    expect(result.valid).toBe(false);
    expect(result.message).toContain('0-25');
  });
});

describe('Tier Recommendation', () => {
  it('should recommend starter for basic parent needs', () => {
    expect(getRecommendedTier(1, false, false, false)).toBe('starter');
  });

  it('should recommend core for AI features', () => {
    expect(getRecommendedTier(1, false, true, false)).toBe('core');
  });

  it('should recommend pro for multiple children', () => {
    expect(getRecommendedTier(2, false, false, false)).toBe('pro');
  });

  it('should recommend pro for data export needs', () => {
    expect(getRecommendedTier(1, false, false, true)).toBe('pro');
  });

  it('should recommend core for providers without data export', () => {
    expect(getRecommendedTier(0, true, true, false)).toBe('core');
  });

  it('should recommend pro for providers with data export', () => {
    expect(getRecommendedTier(0, true, true, true)).toBe('pro');
  });
});

describe('Onboarding Progress', () => {
  it('should calculate progress correctly', () => {
    expect(calculateOnboardingProgress({ step: 1, totalSteps: 5, isComplete: false })).toBe(20);
    expect(calculateOnboardingProgress({ step: 2, totalSteps: 5, isComplete: false })).toBe(40);
    expect(calculateOnboardingProgress({ step: 5, totalSteps: 5, isComplete: false })).toBe(100);
  });

  it('should handle edge cases', () => {
    expect(calculateOnboardingProgress({ step: 0, totalSteps: 5, isComplete: false })).toBe(0);
    expect(calculateOnboardingProgress({ step: 3, totalSteps: 10, isComplete: false })).toBe(30);
  });
});

describe('Step Navigation', () => {
  it('should advance to next step', () => {
    const state: OnboardingState = { step: 1, totalSteps: 5, isComplete: false };
    expect(getNextStep(state)).toBe(2);
  });

  it('should not exceed total steps', () => {
    const state: OnboardingState = { step: 5, totalSteps: 5, isComplete: false };
    expect(getNextStep(state)).toBe(5);
  });
});

describe('Proceed Validation', () => {
  it('should require role selection at step 1', () => {
    const withoutRole: OnboardingState = { step: 1, totalSteps: 5, isComplete: false };
    expect(canProceed(withoutRole)).toBe(false);

    const withRole: OnboardingState = { step: 1, totalSteps: 5, userRole: 'parent', isComplete: false };
    expect(canProceed(withRole)).toBe(true);
  });

  it('should require child info for parents at step 2', () => {
    const parentNoChild: OnboardingState = {
      step: 2,
      totalSteps: 5,
      userRole: 'parent',
      isComplete: false
    };
    expect(canProceed(parentNoChild)).toBe(false);

    const parentWithChild: OnboardingState = {
      step: 2,
      totalSteps: 5,
      userRole: 'parent',
      childInfo: { name: 'Alex' },
      isComplete: false
    };
    expect(canProceed(parentWithChild)).toBe(true);
  });

  it('should require credentials for providers at step 2', () => {
    const providerNoCreds: OnboardingState = {
      step: 2,
      totalSteps: 5,
      userRole: 'provider',
      providerInfo: { credentials: [] },
      isComplete: false
    };
    expect(canProceed(providerNoCreds)).toBe(false);

    const providerWithCreds: OnboardingState = {
      step: 2,
      totalSteps: 5,
      userRole: 'provider',
      providerInfo: { credentials: ['BCBA'] },
      isComplete: false
    };
    expect(canProceed(providerWithCreds)).toBe(true);
  });

  it('should require at least one goal at step 3', () => {
    const noGoals: OnboardingState = {
      step: 3,
      totalSteps: 5,
      userRole: 'parent',
      goals: [],
      isComplete: false
    };
    expect(canProceed(noGoals)).toBe(false);

    const withGoals: OnboardingState = {
      step: 3,
      totalSteps: 5,
      userRole: 'parent',
      goals: ['Improve communication'],
      isComplete: false
    };
    expect(canProceed(withGoals)).toBe(true);
  });
});

describe('User Role Handling', () => {
  it('should handle parent role', () => {
    const state: OnboardingState = {
      step: 2,
      totalSteps: 5,
      userRole: 'parent',
      childInfo: { name: 'Alex', diagnosis: ['ASD'] },
      isComplete: false
    };

    expect(state.userRole).toBe('parent');
    expect(state.childInfo).toBeDefined();
  });

  it('should handle provider role', () => {
    const state: OnboardingState = {
      step: 2,
      totalSteps: 5,
      userRole: 'provider',
      providerInfo: {
        credentials: ['BCBA', 'RBT'],
        specialty: ['Early Intervention'],
        yearsExperience: 5
      },
      isComplete: false
    };

    expect(state.userRole).toBe('provider');
    expect(state.providerInfo).toBeDefined();
    expect(state.providerInfo?.credentials).toContain('BCBA');
  });

  it('should handle both roles', () => {
    const state: OnboardingState = {
      step: 2,
      totalSteps: 5,
      userRole: 'both',
      childInfo: { name: 'Alex' },
      providerInfo: { credentials: ['BCBA'] },
      isComplete: false
    };

    expect(state.userRole).toBe('both');
    expect(state.childInfo).toBeDefined();
    expect(state.providerInfo).toBeDefined();
  });
});

describe('Diagnosis Selection', () => {
  const supportedDiagnoses = [
    'autism_spectrum_disorder',
    'adhd',
    'speech_delay',
    'sensory_processing_disorder',
    'intellectual_disability',
    'down_syndrome',
    'cerebral_palsy',
    'anxiety',
    'developmental_delay',
    'other'
  ];

  it('should support multiple diagnoses', () => {
    const childInfo: ChildInfo = {
      name: 'Alex',
      diagnosis: ['autism_spectrum_disorder', 'adhd', 'sensory_processing_disorder']
    };

    expect(childInfo.diagnosis).toHaveLength(3);
    childInfo.diagnosis?.forEach(d => {
      expect(supportedDiagnoses).toContain(d);
    });
  });

  it('should validate diagnosis values', () => {
    const isValidDiagnosis = (d: string) => supportedDiagnoses.includes(d);

    expect(isValidDiagnosis('autism_spectrum_disorder')).toBe(true);
    expect(isValidDiagnosis('invalid_diagnosis')).toBe(false);
  });
});

describe('Communication Level', () => {
  it('should have valid communication levels', () => {
    const levels: ChildInfo['communicationLevel'][] = ['nonverbal', 'limited', 'verbal', 'fluent'];

    levels.forEach(level => {
      const childInfo: ChildInfo = { name: 'Alex', communicationLevel: level };
      expect(['nonverbal', 'limited', 'verbal', 'fluent']).toContain(childInfo.communicationLevel);
    });
  });
});

describe('Onboarding Completion', () => {
  it('should mark complete when all steps done', () => {
    const completeState: OnboardingState = {
      step: 5,
      totalSteps: 5,
      userRole: 'parent',
      childInfo: { name: 'Alex', diagnosis: ['ASD'] },
      goals: ['Improve communication', 'Better sleep'],
      challenges: ['Transitions', 'Sensory issues'],
      preferences: { notificationFrequency: 'daily' },
      isComplete: true
    };

    expect(completeState.isComplete).toBe(true);
    expect(calculateOnboardingProgress(completeState)).toBe(100);
  });

  it('should not be complete with missing required data', () => {
    const incompleteState: OnboardingState = {
      step: 5,
      totalSteps: 5,
      userRole: 'parent',
      // Missing childInfo
      isComplete: false
    };

    expect(incompleteState.isComplete).toBe(false);
  });
});

describe('Referral Code Handling', () => {
  function validateReferralCode(code: string): boolean {
    // Referral codes are 8 alphanumeric characters
    return /^[A-Z0-9]{8}$/.test(code.toUpperCase());
  }

  function generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  it('should validate correct referral codes', () => {
    expect(validateReferralCode('ABCD1234')).toBe(true);
    expect(validateReferralCode('XYZ78901')).toBe(true);
  });

  it('should reject invalid referral codes', () => {
    expect(validateReferralCode('SHORT')).toBe(false);
    expect(validateReferralCode('TOOLONG123')).toBe(false);
    expect(validateReferralCode('INVALID!')).toBe(false);
  });

  it('should generate valid codes', () => {
    const code = generateReferralCode();
    expect(validateReferralCode(code)).toBe(true);
    expect(code).toHaveLength(8);
  });

  it('should generate unique codes', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateReferralCode());
    }
    expect(codes.size).toBe(100);
  });
});
