import { describe, expect, it } from 'vitest';
import {
  calculateAppointmentFinancials,
  calculateAppointmentSettlementBreakdown,
  calculateScreenerBilling,
  cashPayPriceForProviderNet,
  cashPriceMatchingInsuredNet,
  createProviderSettlement,
  getDisplayPricingForProvider,
  getStripeVisitPrices,
  PARTNER_OPERATIONS_FEES_CENTS,
  PLATFORM_TAKE_RATE,
  SCREENER_CPT,
  SCREENER_MAX_UNITS_PER_DAY,
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

  describe('tiered marketplace discount (cash-pay only, platform-absorbed, margin-clamped)', () => {
    it('clamps the Family (30%) discount so the platform keeps its $11.92 floor', () => {
      // Standard session: base $149.00, provider payout $95.00.
      // 30% of $149 = $44.70 requested, but the platform floor = max($5, 8% of $149 = $11.92).
      // cap = 149 - 95 - 11.92 = $42.08 → discount clamped to $42.08.
      const f = calculateAppointmentFinancials({
        rail: 'cash_pay_direct',
        visitClass: 'standard_session',
        tierDiscountRate: 30, // Family / proplus, whole-number percent
      });

      expect(f.subtotalCents).toBe(14900);
      expect(f.memberDiscountCents).toBe(4208); // clamped to $42.08, not the raw $44.70
      expect(f.totalCents).toBe(10692); // family pays $106.92
      expect(f.providerPayoutCents).toBe(9500); // provider payout stays FIXED at $95
      expect(f.platformFeeCents).toBe(1192); // platform keeps exactly the $11.92 floor
      // Invariant: platform never drops below floor and total = payout + platform.
      expect(f.platformFeeCents).toBeGreaterThanOrEqual(1192);
      expect(f.totalCents).toBe(f.providerPayoutCents + f.platformFeeCents);
    });

    it('applies an unclamped percentage when it stays above the floor (Core 10%, Pro 20%)', () => {
      const core = calculateAppointmentFinancials({
        rail: 'cash_pay_direct',
        visitClass: 'standard_session',
        tierDiscountRate: 10,
      });
      expect(core.memberDiscountCents).toBe(1490); // 10% of $149 = $14.90, under the cap
      expect(core.platformFeeCents).toBe(3910);

      const pro = calculateAppointmentFinancials({
        rail: 'cash_pay_direct',
        visitClass: 'standard_session',
        tierDiscountRate: 20,
      });
      expect(pro.memberDiscountCents).toBe(2980); // 20% of $149 = $29.80, under the cap
      expect(pro.platformFeeCents).toBe(2420);
    });

    it('resolves the rate from userTier when tierDiscountRate is not given', () => {
      const fromTier = calculateAppointmentFinancials({
        rail: 'cash_pay_direct',
        visitClass: 'standard_session',
        userTier: 'pro', // getMarketplaceDiscount('pro') === 20
      });
      expect(fromTier.memberDiscountCents).toBe(2980);
    });

    it('NEVER applies the tier discount on insured rails (guaranteed-loss guard)', () => {
      const partnerBilled = calculateAppointmentFinancials({
        rail: 'insured_partner_billed',
        visitClass: 'standard_session',
        tierDiscountRate: 30,
        promoDiscountCents: 1000,
      });
      expect(partnerBilled.memberDiscountCents).toBe(0);
      expect(partnerBilled.promoDiscountCents).toBe(0);

      const aminyBilled = calculateAppointmentFinancials({
        rail: 'insured_aminy_billed',
        visitClass: 'standard_session',
        userTier: 'proplus',
      });
      expect(aminyBilled.memberDiscountCents).toBe(0);
    });

    it('stacks promo on top of the member discount but clamps the COMBINED total to the floor', () => {
      // 30% ($44.70) + $20 promo would be $64.70, but the clamp still caps the
      // combined giveaway at $42.08 so the platform keeps its $11.92 floor.
      const f = calculateAppointmentFinancials({
        rail: 'cash_pay_direct',
        visitClass: 'standard_session',
        tierDiscountRate: 30,
        promoDiscountCents: 2000,
      });
      expect(f.memberDiscountCents + f.promoDiscountCents).toBe(4208); // combined, clamped
      expect(f.totalCents).toBe(10692);
      expect(f.platformFeeCents).toBe(1192);
    });

    it('applies no discount for Free (0%) — family pays full base', () => {
      const f = calculateAppointmentFinancials({
        rail: 'cash_pay_direct',
        visitClass: 'standard_session',
        tierDiscountRate: 0,
      });
      expect(f.memberDiscountCents).toBe(0);
      expect(f.totalCents).toBe(14900);
      expect(f.platformFeeCents).toBe(5400);
    });

    it('keeps legacy flat applyMemberDiscount behavior when no tier info is supplied', () => {
      const f = calculateAppointmentFinancials({
        rail: 'cash_pay_direct',
        visitClass: 'standard_session',
        applyMemberDiscount: true,
        promoDiscountCents: 500,
      });
      // Legacy flat member discount $15.00 + $5.00 promo, both under the cap.
      expect(f.memberDiscountCents).toBe(1500);
      expect(f.promoDiscountCents).toBe(500);
      expect(f.totalCents).toBe(12900);
    });
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

  describe('canonical platform take rates', () => {
    it('pins cash 25% / insured 10% / aact 5%', () => {
      expect(PLATFORM_TAKE_RATE.cashPay).toBe(0.25);
      expect(PLATFORM_TAKE_RATE.insured).toBe(0.1);
      expect(PLATFORM_TAKE_RATE.aactPilot).toBe(0.05);
    });
  });

  describe('cash-pay pricing principle: provider nets same-or-better than insured', () => {
    it('prices cash so the provider net meets the target at the 25% take', () => {
      const r = cashPayPriceForProviderNet({ targetProviderNetCents: 12960 }); // $129.60 insured net
      expect(r.takeRate).toBe(0.25);
      // provider must net AT LEAST the target after integer-cent rounding
      expect(r.providerNetCents).toBeGreaterThanOrEqual(12960);
      // and the price = net + platform fee, exactly
      expect(r.priceCents).toBe(r.providerNetCents + r.platformFeeCents);
    });

    it('matches a 90837 ($144) insured net so cash never pays the provider less', () => {
      const r = cashPriceMatchingInsuredNet({ insuredReimbursementCents: 14400 });
      // insured net = 144 − 10% = $129.60
      expect(r.insuredProviderNetCents).toBe(12960);
      // cash provider net is same-or-better despite Aminy's higher 25% cash take
      expect(r.cashProviderNetCents).toBeGreaterThanOrEqual(r.insuredProviderNetCents);
      // and the family pays a premium (cash price > insured reimbursement)
      expect(r.cashPriceCents).toBeGreaterThan(14400);
    });

    it('handles a zero target without dividing by anything silly', () => {
      const r = cashPayPriceForProviderNet({ targetProviderNetCents: 0 });
      expect(r.priceCents).toBe(0);
      expect(r.providerNetCents).toBe(0);
    });
  });

  describe('screener billing (CPT 96127) — Aminy keeps its insured take', () => {
    it('bills the screener CPT and keeps 10% on insurance', () => {
      const r = calculateScreenerBilling({ units: 1 });
      expect(r.cptCode).toBe(SCREENER_CPT);
      expect(r.units).toBe(1);
      expect(r.platformFeeCents).toBe(Math.round(r.reimbursementCents * PLATFORM_TAKE_RATE.insured));
      expect(r.providerPayoutCents).toBe(r.reimbursementCents - r.platformFeeCents);
    });

    it('PHQ-9 + GAD-7 = 2 units, scaling the reimbursement', () => {
      const one = calculateScreenerBilling({ units: 1 });
      const two = calculateScreenerBilling({ units: 2 });
      expect(two.reimbursementCents).toBe(one.reimbursementCents * 2);
    });

    it('caps at the payer daily unit limit', () => {
      const r = calculateScreenerBilling({ units: 99 });
      expect(r.units).toBe(SCREENER_MAX_UNITS_PER_DAY);
    });
  });

  describe('provider no-show settlement — family never charged, provider earns $0', () => {
    it('zeroes every line regardless of rail', () => {
      const cashFinancials = calculateAppointmentFinancials({
        rail: 'cash_pay_direct',
        visitClass: 'standard_session',
      });
      const r = calculateAppointmentSettlementBreakdown({
        financials: cashFinancials,
        outcome: 'provider_no_show',
      });
      expect(r.appointmentStatus).toBe('provider_no_show');
      expect(r.memberChargeCents).toBe(0);
      expect(r.providerPayoutCents).toBe(0);
      expect(r.platformFeeCents).toBe(0);
    });

    it('does not bill a partner visit fee on the insured rail', () => {
      const partnerFinancials = calculateAppointmentFinancials({
        rail: 'insured_partner_billed',
        visitClass: 'standard_session',
      });
      const r = calculateAppointmentSettlementBreakdown({
        financials: partnerFinancials,
        outcome: 'provider_no_show',
      });
      expect(r.appointmentStatus).toBe('provider_no_show');
      expect(r.partnerVisitFeeCents).toBeUndefined();
      expect(r.platformFeeCents).toBe(0);
    });
  });
});
