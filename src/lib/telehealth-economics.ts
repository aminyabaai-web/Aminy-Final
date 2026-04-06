// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

export type CareRail = 'cash_pay_direct' | 'insured_partner_billed' | 'insured_aminy_billed';
export type TelehealthVisitType = 'consult' | 'deep-review';
export type TelehealthProviderOrganization = 'independent' | 'aact' | 'rise' | 'sensato';
export type TelehealthVisitClass = 'quick_consult' | 'standard_session' | 'diagnostic_deep_review' | 'follow_up';
export type PartnerInvoiceLineItemType =
  | 'insured_completed_visit'
  | 'prior_auth_case'
  | 'claim_ready_case'
  | 'claim_submission'
  | 'denial_rework'
  | 'active_caregiver_month'
  | 'pay_period_export';

export interface TelehealthVisitEconomics {
  visitClass: TelehealthVisitClass;
  label: string;
  publicLabel: string;
  durationMinutes: number;
  rail: CareRail;
  basePriceCents: number;
  memberDiscountCents: number;
  providerPayoutCents: number;
  partnerVisitFeeCents?: number;
  billingOwner: 'aminy' | 'partner' | 'future_aminy_insured';
  settlementTerms: 'weekly_arrears' | 'net_15_ach' | 'future_contracting';
  isPublicMenu: boolean;
}

export interface AppointmentFinancials {
  rail: CareRail;
  visitClass: TelehealthVisitClass;
  subtotalCents: number;
  memberDiscountCents: number;
  promoDiscountCents: number;
  totalCents: number;
  providerPayoutCents: number;
  platformFeeCents: number;
  partnerVisitFeeCents?: number;
  billingOwner: 'aminy' | 'partner' | 'future_aminy_insured';
  settlementTerms: 'weekly_arrears' | 'net_15_ach' | 'future_contracting';
  currency: 'usd';
}

export interface ProviderSettlement {
  providerId: string;
  organization: TelehealthProviderOrganization;
  rail: CareRail;
  visitClass: TelehealthVisitClass;
  grossPayoutCents: number;
  source: 'cash_pay' | 'partner_billed' | 'future_insured';
  settlementTerms: 'weekly_arrears' | 'partner_payroll';
}

export interface PartnerInvoice {
  organization: Extract<TelehealthProviderOrganization, 'aact' | 'rise'>;
  lineItemType: PartnerInvoiceLineItemType;
  amountCents: number;
  quantity: number;
  terms: 'net_15_ach';
}

export interface AppointmentSettlementBreakdown {
  appointmentStatus: 'settled' | 'cancelled' | 'refunded' | 'no_show';
  memberChargeCents: number;
  providerPayoutCents: number;
  platformFeeCents: number;
  partnerVisitFeeCents?: number;
}

export interface VisitPriceOption {
  name: string;
  basePrice: number;
  memberDiscount: number;
  duration: number;
}

const CASH_PAY_VISITS: Record<TelehealthVisitClass, TelehealthVisitEconomics> = {
  quick_consult: {
    visitClass: 'quick_consult',
    label: 'Quick Consult',
    publicLabel: 'Quick Consult',
    durationMinutes: 25,
    rail: 'cash_pay_direct',
    basePriceCents: 7900,
    memberDiscountCents: 1000,
    providerPayoutCents: 4500,
    billingOwner: 'aminy',
    settlementTerms: 'weekly_arrears',
    isPublicMenu: true,
  },
  standard_session: {
    visitClass: 'standard_session',
    label: 'Standard Session',
    publicLabel: 'Standard Session',
    durationMinutes: 50,
    rail: 'cash_pay_direct',
    basePriceCents: 14900,
    memberDiscountCents: 1500,
    providerPayoutCents: 9500,
    billingOwner: 'aminy',
    settlementTerms: 'weekly_arrears',
    isPublicMenu: true,
  },
  diagnostic_deep_review: {
    visitClass: 'diagnostic_deep_review',
    label: 'Diagnostic / Deep Review',
    publicLabel: 'Diagnostic / Deep Review',
    durationMinutes: 90,
    rail: 'cash_pay_direct',
    basePriceCents: 22900,
    memberDiscountCents: 2500,
    providerPayoutCents: 15500,
    billingOwner: 'aminy',
    settlementTerms: 'weekly_arrears',
    isPublicMenu: true,
  },
  follow_up: {
    visitClass: 'follow_up',
    label: 'Follow-up',
    publicLabel: 'Follow-up',
    durationMinutes: 15,
    rail: 'cash_pay_direct',
    basePriceCents: 5900,
    memberDiscountCents: 1000,
    providerPayoutCents: 3000,
    billingOwner: 'aminy',
    settlementTerms: 'weekly_arrears',
    isPublicMenu: false,
  },
};

export const PARTNER_VISIT_FEES_CENTS: Record<TelehealthVisitClass, number> = {
  quick_consult: 1800,
  standard_session: 3200,
  diagnostic_deep_review: 5500,
  follow_up: 1200,
};

export const PARTNER_OPERATIONS_FEES_CENTS = {
  priorAuthPacket: 4500,
  claimReadyValidatedVisit: 1200,
  clearinghouseSubmission: 600,
  denialReworkPacket: 2000,
} as const;

export const EVV_COMMERCIAL_TERMS = {
  includedActiveCaregivers: 25,
  additionalActiveCaregiverMonthCents: 800,
  primaryActiveCaregiverMonthCents: 1800,
  payPeriodExportBatchCents: 100,
} as const;

export function visitClassForVisitType(visitType: TelehealthVisitType): TelehealthVisitClass {
  return visitType === 'consult' ? 'quick_consult' : 'standard_session';
}

export function getCashPayVisitEconomics(visitClass: TelehealthVisitClass): TelehealthVisitEconomics {
  return CASH_PAY_VISITS[visitClass];
}

export function getDisplayPricingForProvider(
  organization: TelehealthProviderOrganization,
  consultPrice?: number | null,
  deepReviewPrice?: number | null,
): Pick<VisitPriceOption, 'basePrice'> & { consultPrice: number; deepReviewPrice: number } {
  if (organization === 'aact') {
    return {
      basePrice: CASH_PAY_VISITS.quick_consult.basePriceCents / 100,
      consultPrice: CASH_PAY_VISITS.quick_consult.basePriceCents / 100,
      deepReviewPrice: CASH_PAY_VISITS.standard_session.basePriceCents / 100,
    };
  }

  return {
    basePrice: consultPrice || 99,
    consultPrice: consultPrice || 99,
    deepReviewPrice: deepReviewPrice || Math.max((consultPrice || 99) * 2, 149),
  };
}

export function getStripeVisitPrices(): Record<'consult' | 'extended' | 'follow-up', VisitPriceOption> {
  return {
    consult: {
      name: CASH_PAY_VISITS.quick_consult.publicLabel,
      basePrice: CASH_PAY_VISITS.quick_consult.basePriceCents,
      memberDiscount: CASH_PAY_VISITS.quick_consult.memberDiscountCents,
      duration: CASH_PAY_VISITS.quick_consult.durationMinutes,
    },
    extended: {
      name: CASH_PAY_VISITS.standard_session.publicLabel,
      basePrice: CASH_PAY_VISITS.standard_session.basePriceCents,
      memberDiscount: CASH_PAY_VISITS.standard_session.memberDiscountCents,
      duration: CASH_PAY_VISITS.standard_session.durationMinutes,
    },
    'follow-up': {
      name: CASH_PAY_VISITS.follow_up.publicLabel,
      basePrice: CASH_PAY_VISITS.follow_up.basePriceCents,
      memberDiscount: CASH_PAY_VISITS.follow_up.memberDiscountCents,
      duration: CASH_PAY_VISITS.follow_up.durationMinutes,
    },
  };
}

export function calculateAppointmentFinancials(options: {
  rail: CareRail;
  visitClass: TelehealthVisitClass;
  promoDiscountCents?: number;
  applyMemberDiscount?: boolean;
}): AppointmentFinancials {
  const visit = getCashPayVisitEconomics(options.visitClass);
  const memberDiscountCents = options.applyMemberDiscount ? visit.memberDiscountCents : 0;
  const promoDiscountCents = options.promoDiscountCents || 0;

  if (options.rail === 'insured_partner_billed') {
    const partnerVisitFeeCents = PARTNER_VISIT_FEES_CENTS[options.visitClass];
    return {
      rail: options.rail,
      visitClass: options.visitClass,
      subtotalCents: 0,
      memberDiscountCents: 0,
      promoDiscountCents: 0,
      totalCents: 0,
      providerPayoutCents: 0,
      platformFeeCents: partnerVisitFeeCents,
      partnerVisitFeeCents,
      billingOwner: 'partner',
      settlementTerms: 'net_15_ach',
      currency: 'usd',
    };
  }

  if (options.rail === 'insured_aminy_billed') {
    return {
      rail: options.rail,
      visitClass: options.visitClass,
      subtotalCents: 0,
      memberDiscountCents: 0,
      promoDiscountCents: 0,
      totalCents: 0,
      providerPayoutCents: 0,
      platformFeeCents: 0,
      billingOwner: 'future_aminy_insured',
      settlementTerms: 'future_contracting',
      currency: 'usd',
    };
  }

  const subtotalCents = visit.basePriceCents;
  const totalCents = Math.max(0, subtotalCents - memberDiscountCents - promoDiscountCents);
  const platformFeeCents = Math.max(0, totalCents - visit.providerPayoutCents);

  return {
    rail: options.rail,
    visitClass: options.visitClass,
    subtotalCents,
    memberDiscountCents,
    promoDiscountCents,
    totalCents,
    providerPayoutCents: visit.providerPayoutCents,
    platformFeeCents,
    billingOwner: visit.billingOwner,
    settlementTerms: visit.settlementTerms,
    currency: 'usd',
  };
}

export function createProviderSettlement(options: {
  providerId: string;
  organization: TelehealthProviderOrganization;
  visitClass: TelehealthVisitClass;
  rail: CareRail;
}): ProviderSettlement {
  const financials = calculateAppointmentFinancials({
    rail: options.rail,
    visitClass: options.visitClass,
  });

  return {
    providerId: options.providerId,
    organization: options.organization,
    rail: options.rail,
    visitClass: options.visitClass,
    grossPayoutCents: financials.providerPayoutCents,
    source: options.rail === 'cash_pay_direct' ? 'cash_pay' : options.rail === 'insured_partner_billed' ? 'partner_billed' : 'future_insured',
    settlementTerms: options.rail === 'cash_pay_direct' ? 'weekly_arrears' : 'partner_payroll',
  };
}

export function createPartnerInvoice(options: {
  organization: Extract<TelehealthProviderOrganization, 'aact' | 'rise'>;
  lineItemType: PartnerInvoiceLineItemType;
  quantity?: number;
  amountCents?: number;
  visitClass?: TelehealthVisitClass;
}): PartnerInvoice {
  const quantity = options.quantity || 1;
  const amountCents = options.amountCents ?? (
    options.lineItemType === 'insured_completed_visit' && options.visitClass
      ? PARTNER_VISIT_FEES_CENTS[options.visitClass] * quantity
      : options.lineItemType === 'prior_auth_case'
        ? PARTNER_OPERATIONS_FEES_CENTS.priorAuthPacket * quantity
        : options.lineItemType === 'claim_ready_case'
          ? PARTNER_OPERATIONS_FEES_CENTS.claimReadyValidatedVisit * quantity
          : options.lineItemType === 'claim_submission'
            ? PARTNER_OPERATIONS_FEES_CENTS.clearinghouseSubmission * quantity
            : options.lineItemType === 'denial_rework'
              ? PARTNER_OPERATIONS_FEES_CENTS.denialReworkPacket * quantity
              : options.lineItemType === 'active_caregiver_month'
                ? EVV_COMMERCIAL_TERMS.additionalActiveCaregiverMonthCents * quantity
                : EVV_COMMERCIAL_TERMS.payPeriodExportBatchCents * quantity
  );

  return {
    organization: options.organization,
    lineItemType: options.lineItemType,
    amountCents,
    quantity,
    terms: 'net_15_ach',
  };
}

export function calculateAppointmentSettlementBreakdown(options: {
  financials: AppointmentFinancials;
  hoursBeforeStart?: number;
  outcome: 'completed' | 'cancelled' | 'no_show';
}): AppointmentSettlementBreakdown {
  const { financials, hoursBeforeStart = 999, outcome } = options;

  if (financials.rail === 'insured_partner_billed') {
    return {
      appointmentStatus: outcome === 'completed' ? 'settled' : outcome,
      memberChargeCents: 0,
      providerPayoutCents: 0,
      platformFeeCents: financials.platformFeeCents,
      partnerVisitFeeCents: financials.partnerVisitFeeCents,
    };
  }

  if (outcome === 'completed') {
    return {
      appointmentStatus: 'settled',
      memberChargeCents: financials.totalCents,
      providerPayoutCents: financials.providerPayoutCents,
      platformFeeCents: financials.platformFeeCents,
    };
  }

  if (outcome === 'no_show') {
    const providerPayoutCents = Math.round(financials.providerPayoutCents * 0.5);
    return {
      appointmentStatus: 'no_show',
      memberChargeCents: financials.totalCents,
      providerPayoutCents,
      platformFeeCents: Math.max(0, financials.totalCents - providerPayoutCents),
    };
  }

  if (hoursBeforeStart >= 24) {
    return {
      appointmentStatus: 'refunded',
      memberChargeCents: 0,
      providerPayoutCents: 0,
      platformFeeCents: 0,
    };
  }

  const memberChargeCents = Math.round(financials.totalCents * 0.5);
  const providerPayoutCents = Math.round(financials.providerPayoutCents * 0.25);

  return {
    appointmentStatus: 'cancelled',
    memberChargeCents,
    providerPayoutCents,
    platformFeeCents: Math.max(0, memberChargeCents - providerPayoutCents),
  };
}

// ============================================================================
// Telehealth Modifier Impact on Insured Reimbursement
// ============================================================================

/**
 * Estimated reimbursement rates per CPT code (Arizona Medicaid / commercial avg).
 * Modifier 95 (synchronous telehealth) typically reimburses at 100% of in-person
 * rate for behavioral health in AZ. GT modifier is legacy but some payers still use it.
 *
 * Source: CMS Physician Fee Schedule + AZ AHCCCS rate tables
 */
export const ESTIMATED_REIMBURSEMENT_CENTS: Record<string, { inPerson: number; modifier95: number; modifierGT: number }> = {
  '97151': { inPerson: 4800, modifier95: 4800, modifierGT: 4800 },   // ABA Assessment (per 15-min unit)
  '97153': { inPerson: 3200, modifier95: 3200, modifierGT: 3200 },   // ABA Direct RBT (per 15-min unit)
  '97155': { inPerson: 5600, modifier95: 5600, modifierGT: 5600 },   // ABA Protocol Mod BCBA (per 15-min unit)
  '97156': { inPerson: 5200, modifier95: 5200, modifierGT: 5200 },   // ABA Family Guidance (per 15-min unit)
  '90834': { inPerson: 10800, modifier95: 10800, modifierGT: 10260 }, // Psychotherapy 45 min (GT = 95% in some plans)
  '90837': { inPerson: 14400, modifier95: 14400, modifierGT: 13680 }, // Psychotherapy 60 min
  '92507': { inPerson: 7200, modifier95: 7200, modifierGT: 7200 },   // SLP Treatment
};

export interface TelehealthMarginAnalysis {
  cptCode: string;
  modifier: '95' | 'GT' | 'none';
  estimatedReimbursementCents: number;
  providerPayoutCents: number;
  platformFeeCents: number;
  netMarginCents: number;
  marginPercent: number;
}

/**
 * Calculate profitability for a telehealth session including modifier impact.
 * This is the function that answers: "Given this CPT code and telehealth modifier,
 * what is our margin after paying the provider?"
 */
export function calculateTelehealthMargin(options: {
  cptCode: string;
  modifier?: '95' | 'GT';
  units?: number;
  providerPayoutCents: number;
}): TelehealthMarginAnalysis {
  const { cptCode, modifier = '95', units = 1, providerPayoutCents } = options;
  const rates = ESTIMATED_REIMBURSEMENT_CENTS[cptCode];

  if (!rates) {
    return {
      cptCode,
      modifier,
      estimatedReimbursementCents: 0,
      providerPayoutCents,
      platformFeeCents: 0,
      netMarginCents: -providerPayoutCents,
      marginPercent: -100,
    };
  }

  const reimbursement = modifier === 'GT'
    ? rates.modifierGT * units
    : modifier === '95'
      ? rates.modifier95 * units
      : rates.inPerson * units;

  const platformFeeCents = Math.max(0, reimbursement - providerPayoutCents);
  const netMarginCents = reimbursement - providerPayoutCents;
  const marginPercent = reimbursement > 0 ? Math.round((netMarginCents / reimbursement) * 100) : 0;

  return {
    cptCode,
    modifier,
    estimatedReimbursementCents: reimbursement,
    providerPayoutCents,
    platformFeeCents,
    netMarginCents,
    marginPercent,
  };
}
