import { describe, expect, it } from 'vitest';
import {
  calculateAppointmentFinancials,
  createProviderSettlement,
  getDisplayPricingForProvider,
  getStripeVisitPrices,
  PARTNER_OPERATIONS_FEES_CENTS,
} from './telehealth-economics';

describe('telehealth economics', () => {
  it('uses the AACT white-label cash-pay menu for partner providers', () => {
    const pricing = getDisplayPricingForProvider('aact', 99, 199);

    expect(pricing.consultPrice).toBe(79);
    expect(pricing.deepReviewPrice).toBe(149);
  });

  it('preserves independent provider pricing when no white-label override exists', () => {
    const pricing = getDisplayPricingForProvider('independent', 110, 190);

    expect(pricing.consultPrice).toBe(110);
    expect(pricing.deepReviewPrice).toBe(190);
  });

  it('builds cash-pay appointment financials from the canonical menu', () => {
    const financials = calculateAppointmentFinancials({
      rail: 'cash_pay_direct',
      visitClass: 'standard_session',
      applyMemberDiscount: true,
      promoDiscountCents: 500,
    });

    expect(financials.subtotalCents).toBe(14900);
    expect(financials.memberDiscountCents).toBe(1500);
    expect(financials.totalCents).toBe(12900);
    expect(financials.providerPayoutCents).toBe(9500);
  });

  it('uses partner visit fees for insured partner-billed visits', () => {
    const financials = calculateAppointmentFinancials({
      rail: 'insured_partner_billed',
      visitClass: 'quick_consult',
    });

    expect(financials.totalCents).toBe(0);
    expect(financials.partnerVisitFeeCents).toBe(1800);
    expect(financials.settlementTerms).toBe('net_15_ach');
  });

  it('creates provider settlements from the same canonical financials', () => {
    const settlement = createProviderSettlement({
      providerId: 'provider-1',
      organization: 'aact',
      visitClass: 'quick_consult',
      rail: 'cash_pay_direct',
    });

    expect(settlement.grossPayoutCents).toBe(4500);
    expect(settlement.settlementTerms).toBe('weekly_arrears');
  });

  it('exports Stripe-facing price options from the same source', () => {
    const prices = getStripeVisitPrices();

    expect(prices.consult.basePrice).toBe(7900);
    expect(prices.extended.basePrice).toBe(14900);
    expect(prices['follow-up'].basePrice).toBeGreaterThan(0);
  });

  it('keeps partner operations fees explicit', () => {
    expect(PARTNER_OPERATIONS_FEES_CENTS.priorAuthPacket).toBe(4500);
    expect(PARTNER_OPERATIONS_FEES_CENTS.claimReadyValidatedVisit).toBe(1200);
  });
});
