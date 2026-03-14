import type { CareRail } from './telehealth-economics';

export type ProviderBusinessModel = 'independent_network' | 'partner_clinic' | 'hybrid';

export interface ProviderPracticeProfile {
  providerId: string;
  providerName: string;
  businessModel: ProviderBusinessModel;
  organization: string;
  licensedStates: string[];
  careRails: CareRail[];
  acceptedInsurance: string[];
  whiteLabelEnabled: boolean;
  telehealthEnabled: boolean;
  practiceName?: string;
}

export interface PracticeChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  description: string;
}

export interface PracticeSummary {
  readinessScore: number;
  monthlyRevenueRange: { low: number; high: number };
  checklist: PracticeChecklistItem[];
  headline: string;
  supportingCopy: string;
}

export function buildPracticeChecklist(
  profile: ProviderPracticeProfile,
  availabilitySlots: number,
): PracticeChecklistItem[] {
  return [
    {
      id: 'profile',
      label: 'Provider profile and credentials',
      completed: Boolean(profile.providerName && profile.organization),
      description: 'Families need a credible public profile before booking.',
    },
    {
      id: 'licensure',
      label: 'Licensed states configured',
      completed: profile.licensedStates.length > 0,
      description: 'Booking and marketplace discovery should only show licensed states.',
    },
    {
      id: 'availability',
      label: 'Availability published',
      completed: availabilitySlots > 0,
      description: 'Independent providers need at least one active weekly slot to accept bookings.',
    },
    {
      id: 'cash-pay',
      label: 'Cash-pay rail enabled',
      completed: profile.careRails.includes('cash_pay_direct'),
      description: 'Cash-pay should be bookable immediately in supported states.',
    },
    {
      id: 'insurance',
      label: 'Insurance lane configured',
      completed: profile.acceptedInsurance.length > 0 || profile.careRails.includes('insured_partner_billed'),
      description: 'Set contracts or partner billing lanes before advertising insured availability.',
    },
    {
      id: 'branding',
      label: 'Practice branding configured',
      completed: profile.whiteLabelEnabled || profile.businessModel === 'independent_network',
      description: 'White-label and independent practice branding should still preserve Powered by Aminy.',
    },
  ];
}

export function summarizePractice(
  profile: ProviderPracticeProfile,
  availabilitySlots: number,
): PracticeSummary {
  const checklist = buildPracticeChecklist(profile, availabilitySlots);
  const completedCount = checklist.filter((item) => item.completed).length;
  const readinessScore = Math.round((completedCount / checklist.length) * 100);
  const weeklySessions = Math.max(availabilitySlots, 4);
  const avgVisitValue = profile.careRails.includes('cash_pay_direct') ? 125 : 95;
  const low = weeklySessions * avgVisitValue * 4;
  const high = Math.round(low * 1.8);

  const supportsIndependentPractice =
    profile.businessModel === 'independent_network' || profile.businessModel === 'hybrid';

  return {
    readinessScore,
    monthlyRevenueRange: { low, high },
    checklist,
    headline: supportsIndependentPractice
      ? 'Launch an independent telehealth practice through Aminy.'
      : 'Operate your clinic lane through Aminy with family-facing telehealth and follow-up.',
    supportingCopy: supportsIndependentPractice
      ? 'Publish availability, choose your rails, accept bookings, and keep families inside Aminy from discovery through follow-up.'
      : 'Use Aminy for branded booking, family messaging, provider summaries, and operational handoff while your clinic keeps the billing rail it already trusts.',
  };
}
