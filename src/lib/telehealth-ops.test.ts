import { describe, expect, it } from 'vitest';
import {
  assertValidAppointmentTransition,
  deriveAppointmentLifecycleOutcome,
  getRoomReadyStatus,
  getStatusLabel,
  isTerminalAppointmentStatus,
  isUpcomingAppointmentStatus,
  normalizeAppointmentLifecycleStatus,
} from './telehealth-ops';
import type { AppointmentFinancials } from './telehealth-economics';

const settledFinancials: AppointmentFinancials = {
  rail: 'cash_pay_direct',
  visitClass: 'standard_session',
  subtotalCents: 14900,
  memberDiscountCents: 0,
  promoDiscountCents: 0,
  totalCents: 14900,
  providerPayoutCents: 9500,
  platformFeeCents: 5400,
  partnerVisitFeeCents: 0,
  billingOwner: 'aminy',
  settlementTerms: 'weekly_arrears',
  currency: 'usd',
};

describe('telehealth ops lifecycle', () => {
  it('normalizes legacy statuses into the canonical lifecycle', () => {
    expect(normalizeAppointmentLifecycleStatus('scheduled')).toBe('confirmed');
    expect(normalizeAppointmentLifecycleStatus('reminder-sent')).toBe('ready_to_join');
    expect(normalizeAppointmentLifecycleStatus('no-show')).toBe('no_show');
  });

  it('enforces valid transitions and rejects invalid ones', () => {
    expect(assertValidAppointmentTransition('confirmed', 'ready_to_join')).toEqual({
      from: 'confirmed',
      to: 'ready_to_join',
    });

    expect(() => assertValidAppointmentTransition('settled', 'confirmed')).toThrow(
      'Invalid appointment transition',
    );
  });

  it('derives settlement readiness for completed cash-pay visits', () => {
    const outcome = deriveAppointmentLifecycleOutcome({
      rail: 'cash_pay_direct',
      status: 'completed',
      paymentStatus: 'pending',
      financials: settledFinancials,
    });

    expect(outcome.paymentStatus).toBe('completed');
    expect(outcome.settlementStatus).toBe('ready');
  });

  it('marks verification failures and no-shows appropriately', () => {
    const failed = deriveAppointmentLifecycleOutcome({
      rail: 'insured_partner_billed',
      status: 'failed-verification',
    });
    const noShow = deriveAppointmentLifecycleOutcome({
      rail: 'insured_partner_billed',
      status: 'no-show',
      financials: {
        ...settledFinancials,
        rail: 'insured_partner_billed',
        totalCents: 0,
        providerPayoutCents: 0,
        partnerVisitFeeCents: 3200,
        billingOwner: 'partner',
        settlementTerms: 'net_15_ach',
      },
    });

    expect(failed.status).toBe('failed_verification');
    expect(failed.paymentStatus).toBe('failed');
    expect(noShow.status).toBe('no_show');
    expect(noShow.settlementStatus).toBe('ready');
  });

  it('uses canonical room-ready/upcoming labels', () => {
    expect(getRoomReadyStatus('confirmed')).toBe('ready_to_join');
    expect(isUpcomingAppointmentStatus('partner_followup_required')).toBe(true);
    expect(isTerminalAppointmentStatus('refunded')).toBe(true);
    expect(getStatusLabel('partner_followup_required')).toBe('Partner Follow-up Required');
  });
});
