// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import { describe, expect, it } from 'vitest';
import { getMonetizationMode, isInsuredMode } from './monetization-mode';

describe('getMonetizationMode', () => {
  it('returns insured when hasInsurance === true', () => {
    expect(getMonetizationMode({ hasInsurance: true })).toBe('insured');
  });

  it('returns insured when pilot_payers (snake_case) is a non-empty array', () => {
    expect(getMonetizationMode({ pilot_payers: ['AHCCCS', 'Aetna'] })).toBe('insured');
  });

  it('returns insured when pilotPayers (camelCase) is a non-empty array', () => {
    expect(getMonetizationMode({ pilotPayers: ['mercycare'] })).toBe('insured');
  });

  it('returns insured when pilot_organization (snake_case) is set', () => {
    expect(getMonetizationMode({ pilot_organization: 'aact' })).toBe('insured');
  });

  it('returns insured when pilotOrganization (camelCase) is set', () => {
    expect(getMonetizationMode({ pilotOrganization: 'rise' })).toBe('insured');
  });

  it('defaults to cash for a profile with no insurance signals', () => {
    expect(getMonetizationMode({ hasInsurance: false })).toBe('cash');
    expect(getMonetizationMode({})).toBe('cash');
  });

  it('treats empty payer arrays and empty-string orgs as cash', () => {
    expect(getMonetizationMode({ pilot_payers: [], pilotPayers: [] })).toBe('cash');
    expect(getMonetizationMode({ pilot_organization: '', pilotOrganization: '   ' })).toBe('cash');
  });

  it('returns cash for null / undefined profile', () => {
    expect(getMonetizationMode(null)).toBe('cash');
    expect(getMonetizationMode(undefined)).toBe('cash');
  });

  it('is robust to non-object / malformed input', () => {
    // @ts-expect-error — exercising the runtime null-safety guard
    expect(getMonetizationMode('nope')).toBe('cash');
    // @ts-expect-error — exercising the runtime null-safety guard
    expect(getMonetizationMode(42)).toBe('cash');
  });

  it('honors null hasInsurance without throwing', () => {
    expect(getMonetizationMode({ hasInsurance: null })).toBe('cash');
  });
});

describe('isInsuredMode', () => {
  it('mirrors getMonetizationMode', () => {
    expect(isInsuredMode({ pilotOrganization: 'aact' })).toBe(true);
    expect(isInsuredMode(null)).toBe(false);
    expect(isInsuredMode({})).toBe(false);
  });
});
