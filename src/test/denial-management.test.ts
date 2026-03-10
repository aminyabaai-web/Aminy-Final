// @ts-nocheck — test file, type-check deferred
/**
 * denial-management.test.ts
 *
 * Comprehensive tests for the denial management system's pure functions:
 * - suggestCorrectiveActions: corrective action engine by denial category
 * - extractDenialsFromERA: ERA 835 denial extraction and categorization
 *
 * Mocks Supabase client and clearinghouse CARC_DESCRIPTIONS constant.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports of the module under test
// ---------------------------------------------------------------------------

vi.mock('../utils/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('../lib/clearinghouse-integration', () => ({
  CARC_DESCRIPTIONS: {
    '1': 'Deductible Amount',
    '2': 'Coinsurance Amount',
    '3': 'Co-payment Amount',
    '4': 'The procedure code is inconsistent with the modifier used',
    '5': 'The procedure code/bill type is inconsistent with the place of service',
    '16': 'Claim/service lacks information needed for adjudication',
    '18': 'Duplicate claim/service',
    '22': 'This care may be covered by another payer per coordination of benefits',
    '23': 'Payment adjusted because charges have been paid by another payer',
    '29': 'The time limit for filing has expired',
    '45': 'Charges exceed your contracted/legislated fee arrangement',
    '50': 'These are non-covered services because this is not deemed a medical necessity',
    '97': 'Payment is included in the allowance for another service/procedure',
    '252': 'An attachment/other documentation is required to adjudicate this claim',
  },
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  suggestCorrectiveActions,
  extractDenialsFromERA,
  type DenialCategory,
  type CorrectiveAction,
  type DenialRecord,
} from '../lib/denial-management';

import type {
  ERA835ParseResult,
  ERA835ClaimAdjudication,
} from '../lib/clearinghouse-integration';

// ---------------------------------------------------------------------------
// Helpers — factory functions for test data
// ---------------------------------------------------------------------------

/** Creates a minimal valid ERA835ParseResult with overrides. */
function makeERA(
  overrides: Partial<ERA835ParseResult> & { claims?: Partial<ERA835ClaimAdjudication>[] } = {}
): ERA835ParseResult {
  return {
    success: true,
    payment: {
      checkNumber: 'CHK-001',
      checkDate: '2026-02-15',
      payerName: 'Test Payer',
      payerId: 'PAYER-001',
      payeeName: 'Test Provider',
      payeeNpi: '1234567890',
      totalPaymentAmount: 500,
      creditDebitFlag: 'C',
      ...(overrides.payment ?? {}),
    },
    claims: (overrides.claims ?? []).map((c) => makeClaim(c)),
    rawSegmentCount: 100,
    ...overrides,
    // Re-apply claims after spread so the mapped version wins
    ...(overrides.claims ? { claims: overrides.claims.map((c) => makeClaim(c)) } : {}),
  } as ERA835ParseResult;
}

/** Creates a minimal valid ERA835ClaimAdjudication with overrides. */
function makeClaim(
  overrides: Partial<ERA835ClaimAdjudication> = {}
): ERA835ClaimAdjudication {
  return {
    claimControlNumber: 'CLM-001',
    patientName: 'Jane Doe',
    patientMemberId: 'MEM-12345',
    claimStatus: 'denied',
    totalChargedAmount: 500,
    totalPaidAmount: 0,
    patientResponsibility: 0,
    serviceDateFrom: '2026-01-15',
    serviceDateTo: '2026-01-15',
    serviceLines: [
      {
        procedureCode: '97153',
        modifiers: [],
        chargedAmount: 500,
        paidAmount: 0,
        adjustments: [{ groupCode: 'CO', reasonCode: '4', amount: 500 }],
        units: 4,
        serviceDate: '2026-01-15',
      },
    ],
    adjustmentReasons: [
      { groupCode: 'CO', reasonCode: '4', amount: 500, description: '' },
    ],
    remarkCodes: ['N56'],
    ...overrides,
  } as ERA835ClaimAdjudication;
}

/** Shorthand for simple adjustment reasons arrays. */
function adj(groupCode: string, reasonCode: string, amount: number) {
  return { groupCode, reasonCode, amount };
}

// ---------------------------------------------------------------------------
// suggestCorrectiveActions
// ---------------------------------------------------------------------------

describe('suggestCorrectiveActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- Eligibility ----

  it('suggests verify-eligibility and resubmit-corrected for eligibility denials', () => {
    const actions = suggestCorrectiveActions(
      'eligibility',
      [adj('CO', '1', 200)],
      200
    );

    expect(actions).toHaveLength(2);
    expect(actions[0].actionType).toBe('verify-eligibility');
    expect(actions[1].actionType).toBe('resubmit-corrected');
  });

  it('assigns correct priority and estimatedRecovery for eligibility actions', () => {
    const actions = suggestCorrectiveActions(
      'eligibility',
      [adj('CO', '1', 150)],
      150
    );

    expect(actions[0].priority).toBe('high');
    expect(actions[0].estimatedRecovery).toBe('medium');
    expect(actions[1].priority).toBe('high');
    expect(actions[1].estimatedRecovery).toBe('high');
  });

  // ---- Authorization ----

  it('suggests obtain-authorization with 14-day deadline for authorization denials', () => {
    const actions = suggestCorrectiveActions(
      'authorization',
      [adj('CO', '15', 300)],
      300
    );

    expect(actions).toHaveLength(2);
    expect(actions[0].actionType).toBe('obtain-authorization');
    expect(actions[0].priority).toBe('critical');
    // 14 days from 2026-03-01
    expect(actions[0].deadline).toBe('2026-03-15');
  });

  it('suggests appeal with 60-day deadline as second authorization action', () => {
    const actions = suggestCorrectiveActions(
      'authorization',
      [adj('CO', '15', 300)],
      300
    );

    expect(actions[1].actionType).toBe('appeal');
    expect(actions[1].priority).toBe('high');
    expect(actions[1].estimatedRecovery).toBe('medium');
    // 60 days from 2026-03-01 = 2026-04-30
    expect(actions[1].deadline).toBe('2026-04-30');
  });

  // ---- Coding ----

  it('suggests recode and resubmit-corrected for coding denials', () => {
    const actions = suggestCorrectiveActions(
      'coding',
      [adj('CO', '4', 250)],
      250
    );

    expect(actions).toHaveLength(2);
    expect(actions[0].actionType).toBe('recode');
    expect(actions[0].estimatedRecovery).toBe('high');
    expect(actions[1].actionType).toBe('resubmit-corrected');
    expect(actions[1].estimatedRecovery).toBe('high');
  });

  // ---- Timely-filing ----

  it('suggests appeal with 30-day deadline for timely-filing denials >= $100', () => {
    const actions = suggestCorrectiveActions(
      'timely-filing',
      [adj('CO', '29', 150)],
      150
    );

    const appealAction = actions.find((a) => a.actionType === 'appeal');
    expect(appealAction).toBeDefined();
    expect(appealAction!.priority).toBe('critical');
    // 30 days from 2026-03-01 = 2026-03-31
    expect(appealAction!.deadline).toBe('2026-03-31');
  });

  it('does not suggest appeal for timely-filing denials under $100', () => {
    const actions = suggestCorrectiveActions(
      'timely-filing',
      [adj('CO', '29', 50)],
      50
    );

    const appealAction = actions.find((a) => a.actionType === 'appeal');
    expect(appealAction).toBeUndefined();
    // Should still suggest contact-payer
    expect(actions.some((a) => a.actionType === 'contact-payer')).toBe(true);
  });

  it('always suggests contact-payer for timely-filing denials', () => {
    const actionsHigh = suggestCorrectiveActions('timely-filing', [adj('CO', '29', 500)], 500);
    const actionsLow = suggestCorrectiveActions('timely-filing', [adj('CO', '29', 25)], 25);

    expect(actionsHigh.some((a) => a.actionType === 'contact-payer')).toBe(true);
    expect(actionsLow.some((a) => a.actionType === 'contact-payer')).toBe(true);
  });

  // ---- Duplicate ----

  it('suggests contact-payer for duplicate denials', () => {
    const actions = suggestCorrectiveActions(
      'duplicate',
      [adj('CO', '18', 200)],
      200
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('contact-payer');
    expect(actions[0].priority).toBe('medium');
    expect(actions[0].estimatedRecovery).toBe('medium');
  });

  // ---- Medical-necessity ----

  it('suggests appeal and provide-documentation for medical-necessity denials', () => {
    const actions = suggestCorrectiveActions(
      'medical-necessity',
      [adj('CO', '50', 400)],
      400
    );

    expect(actions).toHaveLength(2);
    expect(actions[0].actionType).toBe('appeal');
    expect(actions[0].priority).toBe('critical');
    // 60 days from 2026-03-01 = 2026-04-30
    expect(actions[0].deadline).toBe('2026-04-30');
    expect(actions[1].actionType).toBe('provide-documentation');
    expect(actions[1].priority).toBe('high');
  });

  // ---- Bundling ----

  it('suggests recode and resubmit-corrected for bundling denials', () => {
    const actions = suggestCorrectiveActions(
      'bundling',
      [adj('CO', '97', 350)],
      350
    );

    expect(actions).toHaveLength(2);
    expect(actions[0].actionType).toBe('recode');
    expect(actions[0].priority).toBe('high');
    expect(actions[1].actionType).toBe('resubmit-corrected');
    expect(actions[1].priority).toBe('medium');
    expect(actions[1].estimatedRecovery).toBe('high');
  });

  // ---- Coordination-of-benefits ----

  it('suggests contact-payer and resubmit-corrected for COB denials', () => {
    const actions = suggestCorrectiveActions(
      'coordination-of-benefits',
      [adj('CO', '22', 300)],
      300
    );

    expect(actions).toHaveLength(2);
    expect(actions[0].actionType).toBe('contact-payer');
    expect(actions[0].priority).toBe('high');
    expect(actions[0].estimatedRecovery).toBe('high');
    expect(actions[1].actionType).toBe('resubmit-corrected');
  });

  // ---- Missing-info ----

  it('suggests provide-documentation and resubmit-corrected for missing-info denials', () => {
    const actions = suggestCorrectiveActions(
      'missing-info',
      [adj('CO', '16', 200)],
      200
    );

    expect(actions).toHaveLength(2);
    expect(actions[0].actionType).toBe('provide-documentation');
    expect(actions[0].priority).toBe('high');
    expect(actions[0].estimatedRecovery).toBe('high');
    expect(actions[1].actionType).toBe('resubmit-corrected');
    expect(actions[1].priority).toBe('high');
  });

  // ---- Contractual ----

  it('suggests write-off for contractual denials', () => {
    const actions = suggestCorrectiveActions(
      'contractual',
      [adj('CO', '45', 30)],
      30
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('write-off');
    expect(actions[0].priority).toBe('low');
    expect(actions[0].estimatedRecovery).toBe('low');
  });

  it('suggests contact-payer in addition to write-off for contractual denials > $50', () => {
    const actions = suggestCorrectiveActions(
      'contractual',
      [adj('CO', '45', 100)],
      100
    );

    expect(actions).toHaveLength(2);
    expect(actions[0].actionType).toBe('contact-payer');
    expect(actions[0].priority).toBe('low');
    expect(actions[1].actionType).toBe('write-off');
  });

  it('does NOT suggest contact-payer for contractual denials at exactly $50', () => {
    const actions = suggestCorrectiveActions(
      'contractual',
      [adj('CO', '45', 50)],
      50
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('write-off');
  });

  // ---- Patient-responsibility ----

  it('suggests patient-billing for patient-responsibility denials', () => {
    const actions = suggestCorrectiveActions(
      'patient-responsibility',
      [adj('PR', '1', 75)],
      75
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('patient-billing');
    expect(actions[0].priority).toBe('medium');
    expect(actions[0].estimatedRecovery).toBe('high');
  });

  // ---- Other / default ----

  it('suggests contact-payer for "other" category denials', () => {
    const actions = suggestCorrectiveActions(
      'other',
      [adj('CO', '999', 100)],
      100
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('contact-payer');
    expect(actions[0].priority).toBe('medium');
    expect(actions[0].estimatedRecovery).toBe('medium');
  });

  // ---- Cross-cutting: all actions include required fields ----

  it('returns actions that all include priority and estimatedRecovery', () => {
    const categories: DenialCategory[] = [
      'eligibility',
      'authorization',
      'coding',
      'timely-filing',
      'duplicate',
      'medical-necessity',
      'bundling',
      'coordination-of-benefits',
      'missing-info',
      'contractual',
      'patient-responsibility',
      'other',
    ];

    for (const category of categories) {
      const actions = suggestCorrectiveActions(
        category,
        [adj('CO', '4', 200)],
        200
      );

      for (const action of actions) {
        expect(action.priority).toBeDefined();
        expect(['critical', 'high', 'medium', 'low']).toContain(action.priority);
        expect(action.estimatedRecovery).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(action.estimatedRecovery);
        expect(action.actionType).toBeDefined();
        expect(action.description).toBeTruthy();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// extractDenialsFromERA
// ---------------------------------------------------------------------------

describe('extractDenialsFromERA', () => {
  const PROVIDER_ID = 'prov-001';
  const PROVIDER_NAME = 'Test Practice LLC';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- Empty / failure cases ----

  it('returns empty array when ERA result has success: false', () => {
    const era = makeERA({ success: false });
    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials).toEqual([]);
  });

  it('returns empty array when ERA result has no claims', () => {
    const era = makeERA({ claims: [] });
    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials).toEqual([]);
  });

  it('returns empty array for fully paid claims (paid >= charged)', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'paid',
          totalChargedAmount: 500,
          totalPaidAmount: 500,
          adjustmentReasons: [],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 500,
              paidAmount: 500,
              adjustments: [],
              units: 4,
              serviceDate: '2026-01-15',
            },
          ],
          remarkCodes: [],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials).toEqual([]);
  });

  // ---- Partially paid claims ----

  it('extracts a denial record from a partially paid claim', () => {
    const era = makeERA({
      claims: [
        {
          claimControlNumber: 'CLM-PARTIAL-001',
          claimStatus: 'partial',
          totalChargedAmount: 1000,
          totalPaidAmount: 600,
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '4', amount: 400, description: 'Coding error' },
          ],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 600,
              paidAmount: 600,
              adjustments: [],
              units: 4,
              serviceDate: '2026-01-15',
            },
            {
              procedureCode: '97155',
              modifiers: [],
              chargedAmount: 400,
              paidAmount: 0,
              adjustments: [{ groupCode: 'CO', reasonCode: '4', amount: 400 }],
              units: 2,
              serviceDate: '2026-01-15',
            },
          ],
          remarkCodes: ['N56'],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials).toHaveLength(1);

    const d = denials[0];
    expect(d.claimControlNumber).toBe('CLM-PARTIAL-001');
    expect(d.deniedAmount).toBe(400);
    expect(d.totalChargedAmount).toBe(1000);
    expect(d.totalPaidAmount).toBe(600);
    expect(d.status).toBe('new');
    expect(d.providerId).toBe(PROVIDER_ID);
    expect(d.providerName).toBe(PROVIDER_NAME);
  });

  // ---- Category mapping by CARC code ----

  it('categorizes CARC code 1-3 (eligibility range) correctly', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '1', amount: 200, description: '' },
          ],
        },
      ],
    });

    // CARC 1 with group CO goes to eligibility (not patient-responsibility)
    // Actually, looking at the code: categorizeByCARC(1) returns 'eligibility'
    // but determineDenialCategory filters non-PR first, then uses categorizeByCARC
    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials).toHaveLength(1);
    expect(denials[0].category).toBe('eligibility');
  });

  it('categorizes CARC codes 4/5 as coding', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '4', amount: 300, description: '' },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].category).toBe('coding');
  });

  it('categorizes CARC code 15 as authorization', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '15', amount: 600, description: '' },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].category).toBe('authorization');
  });

  it('categorizes CARC code 29 as timely-filing', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '29', amount: 250, description: '' },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].category).toBe('timely-filing');
  });

  it('categorizes CARC code 18 as duplicate', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '18', amount: 300, description: '' },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].category).toBe('duplicate');
  });

  it('categorizes CARC codes 50-57 as medical-necessity', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '50', amount: 450, description: '' },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].category).toBe('medical-necessity');
  });

  it('categorizes CARC code 97 as bundling', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '97', amount: 200, description: '' },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].category).toBe('bundling');
  });

  it('categorizes CARC codes 22-24 as coordination-of-benefits', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '22', amount: 300, description: '' },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].category).toBe('coordination-of-benefits');
  });

  it('categorizes CARC code 16 and 252 as missing-info', () => {
    const era16 = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '16', amount: 200, description: '' },
          ],
        },
      ],
    });

    const era252 = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '252', amount: 200, description: '' },
          ],
        },
      ],
    });

    expect(extractDenialsFromERA(era16, PROVIDER_ID, PROVIDER_NAME)[0].category).toBe('missing-info');
    expect(extractDenialsFromERA(era252, PROVIDER_ID, PROVIDER_NAME)[0].category).toBe('missing-info');
  });

  it('categorizes claims with only PR group adjustments as patient-responsibility', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          totalChargedAmount: 200,
          totalPaidAmount: 0,
          adjustmentReasons: [
            { groupCode: 'PR', reasonCode: '1', amount: 200, description: 'Deductible' },
          ],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 200,
              paidAmount: 0,
              adjustments: [{ groupCode: 'PR', reasonCode: '1', amount: 200 }],
              units: 2,
              serviceDate: '2026-01-15',
            },
          ],
        },
      ],
    });

    // PR-only adjustments have insuranceDeniedAmount = 0, but claimStatus = 'denied' still creates a record
    // because the code checks: if (insuranceDeniedAmount <= 0 && claim.claimStatus === 'paid') continue;
    // 'denied' status passes through
    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials).toHaveLength(1);
    expect(denials[0].category).toBe('patient-responsibility');
  });

  // ---- Priority assignment ----

  it('assigns "critical" priority for high-value authorization denials (>= $500)', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          totalChargedAmount: 800,
          totalPaidAmount: 0,
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '15', amount: 800, description: '' },
          ],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 800,
              paidAmount: 0,
              adjustments: [{ groupCode: 'CO', reasonCode: '15', amount: 800 }],
              units: 8,
              serviceDate: '2026-01-15',
            },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].priority).toBe('critical');
  });

  it('assigns "high" priority for moderate-value denials (>= $200)', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          totalChargedAmount: 250,
          totalPaidAmount: 0,
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '50', amount: 250, description: '' },
          ],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 250,
              paidAmount: 0,
              adjustments: [{ groupCode: 'CO', reasonCode: '50', amount: 250 }],
              units: 2,
              serviceDate: '2026-01-15',
            },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].priority).toBe('high');
  });

  it('assigns "medium" priority for low-value coding denials', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          totalChargedAmount: 100,
          totalPaidAmount: 0,
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '4', amount: 100, description: '' },
          ],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 100,
              paidAmount: 0,
              adjustments: [{ groupCode: 'CO', reasonCode: '4', amount: 100 }],
              units: 1,
              serviceDate: '2026-01-15',
            },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].priority).toBe('medium');
  });

  // ---- Appeal deadline ----

  it('calculates appeal deadline (default 90 days from date received)', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '4', amount: 300, description: '' },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].appealDeadline).toBeDefined();
    // 90 days from 2026-03-01 = 2026-05-30
    expect(denials[0].appealDeadline).toBe('2026-05-30');
  });

  // ---- Service line mapping ----

  it('maps denied service lines correctly with adjustment reason codes', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'partial',
          totalChargedAmount: 800,
          totalPaidAmount: 300,
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '4', amount: 500, description: '' },
          ],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 500,
              paidAmount: 300,
              adjustments: [{ groupCode: 'CO', reasonCode: '4', amount: 200 }],
              units: 4,
              serviceDate: '2026-01-15',
            },
            {
              procedureCode: '97155',
              modifiers: [],
              chargedAmount: 300,
              paidAmount: 0,
              adjustments: [{ groupCode: 'CO', reasonCode: '4', amount: 300 }],
              units: 2,
              serviceDate: '2026-01-15',
            },
          ],
          remarkCodes: ['N56'],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    const d = denials[0];

    // Both service lines have paidAmount < chargedAmount
    expect(d.deniedServiceLines).toHaveLength(2);

    expect(d.deniedServiceLines[0].procedureCode).toBe('97153');
    expect(d.deniedServiceLines[0].chargedAmount).toBe(500);
    expect(d.deniedServiceLines[0].paidAmount).toBe(300);
    expect(d.deniedServiceLines[0].deniedAmount).toBe(200);
    expect(d.deniedServiceLines[0].adjustmentReasonCodes).toEqual(['CO-4']);

    expect(d.deniedServiceLines[1].procedureCode).toBe('97155');
    expect(d.deniedServiceLines[1].deniedAmount).toBe(300);
  });

  it('excludes fully paid service lines from denied service lines', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'partial',
          totalChargedAmount: 600,
          totalPaidAmount: 300,
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '4', amount: 300, description: '' },
          ],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 300,
              paidAmount: 300, // fully paid
              adjustments: [],
              units: 2,
              serviceDate: '2026-01-15',
            },
            {
              procedureCode: '97155',
              modifiers: [],
              chargedAmount: 300,
              paidAmount: 0, // denied
              adjustments: [{ groupCode: 'CO', reasonCode: '4', amount: 300 }],
              units: 2,
              serviceDate: '2026-01-15',
            },
          ],
          remarkCodes: [],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].deniedServiceLines).toHaveLength(1);
    expect(denials[0].deniedServiceLines[0].procedureCode).toBe('97155');
  });

  // ---- Multiple claims ----

  it('handles multiple claims in one ERA and extracts denials from each', () => {
    const era = makeERA({
      claims: [
        {
          claimControlNumber: 'CLM-A',
          claimStatus: 'denied',
          totalChargedAmount: 400,
          totalPaidAmount: 0,
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '29', amount: 400, description: '' },
          ],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 400,
              paidAmount: 0,
              adjustments: [{ groupCode: 'CO', reasonCode: '29', amount: 400 }],
              units: 4,
              serviceDate: '2026-01-10',
            },
          ],
          remarkCodes: [],
        },
        {
          claimControlNumber: 'CLM-B',
          claimStatus: 'partial',
          totalChargedAmount: 600,
          totalPaidAmount: 400,
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '50', amount: 200, description: '' },
          ],
          serviceLines: [
            {
              procedureCode: '97155',
              modifiers: [],
              chargedAmount: 600,
              paidAmount: 400,
              adjustments: [{ groupCode: 'CO', reasonCode: '50', amount: 200 }],
              units: 4,
              serviceDate: '2026-01-12',
            },
          ],
          remarkCodes: [],
        },
        {
          // This one is fully paid — should be skipped
          claimControlNumber: 'CLM-C',
          claimStatus: 'paid',
          totalChargedAmount: 300,
          totalPaidAmount: 300,
          adjustmentReasons: [],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 300,
              paidAmount: 300,
              adjustments: [],
              units: 2,
              serviceDate: '2026-01-14',
            },
          ],
          remarkCodes: [],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);

    expect(denials).toHaveLength(2);
    expect(denials[0].claimControlNumber).toBe('CLM-A');
    expect(denials[0].category).toBe('timely-filing');
    expect(denials[1].claimControlNumber).toBe('CLM-B');
    expect(denials[1].category).toBe('medical-necessity');
  });

  // ---- Field mapping integrity ----

  it('populates all required DenialRecord fields from ERA data', () => {
    const era = makeERA({
      payment: {
        checkNumber: 'CHK-999',
        checkDate: '2026-02-20',
        payerName: 'BlueCross AZ',
        payerId: 'bcbs-az-001',
        payeeName: 'Test Practice',
        payeeNpi: '9876543210',
        totalPaymentAmount: 100,
        creditDebitFlag: 'C',
      },
      claims: [
        {
          claimControlNumber: 'CLM-FULL',
          patientName: 'John Smith',
          patientMemberId: 'MEM-FULL-001',
          claimStatus: 'denied',
          totalChargedAmount: 750,
          totalPaidAmount: 0,
          serviceDateFrom: '2026-01-20',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '50', amount: 750, description: 'Not medically necessary' },
          ],
          remarkCodes: ['N20', 'N115'],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: ['HN'],
              chargedAmount: 750,
              paidAmount: 0,
              adjustments: [{ groupCode: 'CO', reasonCode: '50', amount: 750 }],
              units: 6,
              serviceDate: '2026-01-20',
            },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials).toHaveLength(1);

    const d = denials[0];
    // ID format
    expect(d.id).toMatch(/^den-/);
    // Patient info
    expect(d.patientName).toBe('John Smith');
    expect(d.patientMemberId).toBe('MEM-FULL-001');
    // Payer info
    expect(d.payerName).toBe('BlueCross AZ');
    expect(d.payerId).toBe('bcbs-az-001');
    // Provider info
    expect(d.providerId).toBe(PROVIDER_ID);
    expect(d.providerName).toBe(PROVIDER_NAME);
    // Dates
    expect(d.dateOfService).toBe('2026-01-20');
    expect(d.dateReceived).toBe('2026-03-01');
    // Denial details
    expect(d.category).toBe('medical-necessity');
    expect(d.status).toBe('new');
    expect(d.deniedAmount).toBe(750);
    // Adjustment reasons get descriptions
    expect(d.adjustmentReasons).toHaveLength(1);
    expect(d.adjustmentReasons[0].description).toBe('Not medically necessary');
    // Remark codes
    expect(d.remarkCodes).toEqual(['N20', 'N115']);
    // Suggested actions populated
    expect(d.suggestedActions.length).toBeGreaterThan(0);
    // Appeal deadline populated (BCBS = 180 days)
    expect(d.appealDeadline).toBeDefined();
    // Timestamps
    expect(d.createdAt).toBeTruthy();
    expect(d.updatedAt).toBeTruthy();
  });

  it('falls back to CARC_DESCRIPTIONS when adjustment has no description', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '18', amount: 300, description: '' },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    // Empty string is falsy, so should fall through to CARC_DESCRIPTIONS lookup
    expect(denials[0].adjustmentReasons[0].description).toBe('Duplicate claim/service');
  });

  it('uses generic fallback description for unknown CARC codes', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '999', amount: 100, description: '' },
          ],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    expect(denials[0].adjustmentReasons[0].description).toBe('Reason code 999');
  });

  // ---- Uses highest-amount CO adjustment for category when multiple adjustments ----

  it('uses highest-amount non-PR adjustment to determine category', () => {
    const era = makeERA({
      claims: [
        {
          claimStatus: 'denied',
          totalChargedAmount: 500,
          totalPaidAmount: 0,
          adjustmentReasons: [
            { groupCode: 'CO', reasonCode: '4', amount: 100, description: '' },   // coding
            { groupCode: 'CO', reasonCode: '50', amount: 400, description: '' },  // medical-necessity (higher)
          ],
          serviceLines: [
            {
              procedureCode: '97153',
              modifiers: [],
              chargedAmount: 500,
              paidAmount: 0,
              adjustments: [
                { groupCode: 'CO', reasonCode: '4', amount: 100 },
                { groupCode: 'CO', reasonCode: '50', amount: 400 },
              ],
              units: 4,
              serviceDate: '2026-01-15',
            },
          ],
          remarkCodes: [],
        },
      ],
    });

    const denials = extractDenialsFromERA(era, PROVIDER_ID, PROVIDER_NAME);
    // $400 CO-50 beats $100 CO-4, so category should be medical-necessity
    expect(denials[0].category).toBe('medical-necessity');
  });
});
