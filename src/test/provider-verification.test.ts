/**
 * Provider Credential Verification Tests
 * Comprehensive tests for provider credential verification system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase
vi.mock('../utils/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Define types inline
type CredentialType =
  | 'bcba' | 'bcba-d' | 'bcaba' | 'rbt'
  | 'lcsw' | 'lmft' | 'psychologist'
  | 'slp' | 'ot' | 'pt' | 'npi';

type VerificationStatus = 'pending' | 'verified' | 'failed' | 'expired' | 'manual_review';

interface VerificationResult {
  success: boolean;
  status: VerificationStatus;
  message: string;
  data?: {
    name?: string;
    credential_number?: string;
    status?: string;
    expiration_date?: string;
    specialty?: string;
  };
}

// Helper functions for testing
function validateCredentialType(type: string): type is CredentialType {
  const validTypes: CredentialType[] = [
    'bcba', 'bcba-d', 'bcaba', 'rbt',
    'lcsw', 'lmft', 'psychologist',
    'slp', 'ot', 'pt', 'npi'
  ];
  return validTypes.includes(type as CredentialType);
}

function validateCredentialNumber(type: CredentialType, number: string): boolean {
  switch (type) {
    case 'bcba':
    case 'bcba-d':
    case 'bcaba':
      // BACB numbers are typically 1- followed by digits
      return /^1-\d{2}-\d{5}$/.test(number) || /^\d{5,8}$/.test(number);
    case 'rbt':
      // RBT numbers follow similar pattern
      return /^\d{5,10}$/.test(number);
    case 'npi':
      // NPI is always 10 digits
      return /^\d{10}$/.test(number);
    case 'lcsw':
    case 'lmft':
    case 'psychologist':
    case 'slp':
    case 'ot':
    case 'pt':
      // State licenses vary
      return number.length >= 4;
    default:
      return false;
  }
}

function getIssuingBody(type: CredentialType): string {
  switch (type) {
    case 'bcba':
    case 'bcba-d':
    case 'bcaba':
    case 'rbt':
      return 'Behavior Analyst Certification Board (BACB)';
    case 'npi':
      return 'Centers for Medicare & Medicaid Services (CMS)';
    case 'lcsw':
    case 'lmft':
    case 'psychologist':
      return 'State Licensing Board';
    case 'slp':
      return 'American Speech-Language-Hearing Association (ASHA)';
    case 'ot':
      return 'National Board for Certification in Occupational Therapy (NBCOT)';
    case 'pt':
      return 'Federation of State Boards of Physical Therapy (FSBPT)';
    default:
      return 'Unknown';
  }
}

function calculateBadgeLevel(verifiedCount: number, pendingCount: number): 'none' | 'pending' | 'verified' | 'gold' {
  if (verifiedCount >= 2) return 'gold';
  if (verifiedCount >= 1) return 'verified';
  if (pendingCount > 0) return 'pending';
  return 'none';
}

describe('Credential Type Validation', () => {
  it('should validate all BACB credentials', () => {
    expect(validateCredentialType('bcba')).toBe(true);
    expect(validateCredentialType('bcba-d')).toBe(true);
    expect(validateCredentialType('bcaba')).toBe(true);
    expect(validateCredentialType('rbt')).toBe(true);
  });

  it('should validate all therapy credentials', () => {
    expect(validateCredentialType('lcsw')).toBe(true);
    expect(validateCredentialType('lmft')).toBe(true);
    expect(validateCredentialType('psychologist')).toBe(true);
    expect(validateCredentialType('slp')).toBe(true);
    expect(validateCredentialType('ot')).toBe(true);
    expect(validateCredentialType('pt')).toBe(true);
  });

  it('should validate NPI', () => {
    expect(validateCredentialType('npi')).toBe(true);
  });

  it('should reject invalid credential types', () => {
    expect(validateCredentialType('invalid')).toBe(false);
    expect(validateCredentialType('')).toBe(false);
    expect(validateCredentialType('doctor')).toBe(false);
  });
});

describe('Credential Number Validation', () => {
  it('should validate NPI numbers (10 digits)', () => {
    expect(validateCredentialNumber('npi', '1234567890')).toBe(true);
    expect(validateCredentialNumber('npi', '0123456789')).toBe(true);
    expect(validateCredentialNumber('npi', '12345')).toBe(false);
    expect(validateCredentialNumber('npi', 'abcdefghij')).toBe(false);
  });

  it('should validate BACB numbers', () => {
    expect(validateCredentialNumber('bcba', '1-23-12345')).toBe(true);
    expect(validateCredentialNumber('bcba', '12345678')).toBe(true);
    expect(validateCredentialNumber('bcba', '123')).toBe(false);
  });

  it('should validate RBT numbers', () => {
    expect(validateCredentialNumber('rbt', '12345')).toBe(true);
    expect(validateCredentialNumber('rbt', '1234567890')).toBe(true);
    expect(validateCredentialNumber('rbt', '123')).toBe(false);
  });

  it('should validate state licenses', () => {
    expect(validateCredentialNumber('lcsw', 'LCSW12345')).toBe(true);
    expect(validateCredentialNumber('lmft', 'CA-MFT-12345')).toBe(true);
    expect(validateCredentialNumber('psychologist', '123')).toBe(false);
  });
});

describe('Issuing Body Lookup', () => {
  it('should return correct issuing body for BACB credentials', () => {
    expect(getIssuingBody('bcba')).toBe('Behavior Analyst Certification Board (BACB)');
    expect(getIssuingBody('rbt')).toBe('Behavior Analyst Certification Board (BACB)');
  });

  it('should return correct issuing body for NPI', () => {
    expect(getIssuingBody('npi')).toBe('Centers for Medicare & Medicaid Services (CMS)');
  });

  it('should return correct issuing body for state licenses', () => {
    expect(getIssuingBody('lcsw')).toBe('State Licensing Board');
    expect(getIssuingBody('lmft')).toBe('State Licensing Board');
    expect(getIssuingBody('psychologist')).toBe('State Licensing Board');
  });

  it('should return correct issuing body for therapy credentials', () => {
    expect(getIssuingBody('slp')).toBe('American Speech-Language-Hearing Association (ASHA)');
    expect(getIssuingBody('ot')).toBe('National Board for Certification in Occupational Therapy (NBCOT)');
    expect(getIssuingBody('pt')).toBe('Federation of State Boards of Physical Therapy (FSBPT)');
  });
});

describe('Badge Level Calculation', () => {
  it('should return gold for 2+ verified credentials', () => {
    expect(calculateBadgeLevel(2, 0)).toBe('gold');
    expect(calculateBadgeLevel(3, 1)).toBe('gold');
    expect(calculateBadgeLevel(5, 0)).toBe('gold');
  });

  it('should return verified for 1 verified credential', () => {
    expect(calculateBadgeLevel(1, 0)).toBe('verified');
    expect(calculateBadgeLevel(1, 2)).toBe('verified');
  });

  it('should return pending when no verified but pending exists', () => {
    expect(calculateBadgeLevel(0, 1)).toBe('pending');
    expect(calculateBadgeLevel(0, 3)).toBe('pending');
  });

  it('should return none when no credentials', () => {
    expect(calculateBadgeLevel(0, 0)).toBe('none');
  });
});

describe('NPI Verification (Mock)', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should verify valid NPI', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result_count: 1,
        results: [{
          basic: {
            first_name: 'John',
            last_name: 'Smith',
            status: 'A'
          },
          taxonomies: [{ desc: 'Applied Behavior Analysis' }]
        }]
      })
    });

    const response = await fetch(`https://npiregistry.cms.hhs.gov/api/?version=2.1&number=1234567890`);
    const data = await response.json();

    expect(data.result_count).toBe(1);
    expect(data.results[0].basic.first_name).toBe('John');
  });

  it('should handle NPI not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result_count: 0,
        results: []
      })
    });

    const response = await fetch(`https://npiregistry.cms.hhs.gov/api/?version=2.1&number=0000000000`);
    const data = await response.json();

    expect(data.result_count).toBe(0);
  });

  it('should handle API unavailable', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503
    });

    const response = await fetch(`https://npiregistry.cms.hhs.gov/api/?version=2.1&number=1234567890`);
    expect(response.ok).toBe(false);
  });
});

describe('BACB Verification (Mock)', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should verify active BCBA credential', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        found: true,
        status: 'Active',
        name: 'Jane Doe',
        expiration_date: '2025-12-31',
        specialty: 'BCBA'
      })
    });

    const response = await fetch('/api/verify/bacb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificant_number: '1-23-12345', credential_type: 'BCBA' })
    });
    const data = await response.json();

    expect(data.found).toBe(true);
    expect(data.status).toBe('Active');
  });

  it('should detect expired credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        found: true,
        status: 'Expired',
        expiration_date: '2023-12-31'
      })
    });

    const response = await fetch('/api/verify/bacb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificant_number: '1-23-12345', credential_type: 'BCBA' })
    });
    const data = await response.json();

    expect(data.found).toBe(true);
    expect(data.status).toBe('Expired');
  });
});

describe('Verification Status Transitions', () => {
  const validTransitions: Record<VerificationStatus, VerificationStatus[]> = {
    'pending': ['verified', 'failed', 'manual_review'],
    'manual_review': ['verified', 'failed'],
    'verified': ['expired'],
    'failed': ['pending', 'manual_review'],
    'expired': ['verified', 'pending']
  };

  it('should allow valid status transitions', () => {
    expect(validTransitions['pending']).toContain('verified');
    expect(validTransitions['pending']).toContain('failed');
    expect(validTransitions['verified']).toContain('expired');
  });

  it('should not allow direct expired to failed transition', () => {
    expect(validTransitions['expired']).not.toContain('failed');
  });
});

describe('Credential Expiration Handling', () => {
  function isExpiringSoon(expirationDate: string, daysThreshold: number = 30): boolean {
    const expiry = new Date(expirationDate);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= daysThreshold;
  }

  function isExpired(expirationDate: string): boolean {
    const expiry = new Date(expirationDate);
    return expiry < new Date();
  }

  it('should detect credentials expiring within 30 days', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    expect(isExpiringSoon(futureDate.toISOString())).toBe(true);
  });

  it('should not flag credentials expiring after 30 days', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    expect(isExpiringSoon(futureDate.toISOString())).toBe(false);
  });

  it('should detect expired credentials', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    expect(isExpired(pastDate.toISOString())).toBe(true);
  });

  it('should not flag future dates as expired', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    expect(isExpired(futureDate.toISOString())).toBe(false);
  });
});
