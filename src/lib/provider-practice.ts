import type { CareRail } from './telehealth-economics';
import { isSupportedProviderState } from './insurance/state-market-coverage';

export type ProviderBusinessModel = 'independent_network' | 'partner_clinic' | 'hybrid';
export type ProviderGoLiveStatus = 'pending_verification' | 'verified_not_live' | 'verified_live';

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
  verificationStatus?: 'pending' | 'verified' | 'manual_review' | 'expired' | 'failed';
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
  goLiveStatus: ProviderGoLiveStatus;
  liveMarketStates: string[];
}

export function buildPracticeChecklist(
  profile: ProviderPracticeProfile,
  availabilitySlots: number,
): PracticeChecklistItem[] {
  const liveMarketStates = profile.licensedStates.filter((state) => isSupportedProviderState(state));
  const verificationStatus = profile.verificationStatus || 'pending';
  const isVerified = verificationStatus === 'verified';

  return [
    {
      id: 'profile',
      label: 'Provider profile and credentials',
      completed: Boolean(profile.providerName && profile.organization),
      description: 'Families need a credible public profile before booking.',
    },
    {
      id: 'verification',
      label: 'Credential verification cleared',
      completed: isVerified,
      description: 'Aminy should not list a provider until primary credentials have been validated.',
    },
    {
      id: 'licensure',
      label: 'Licensed states configured',
      completed: profile.licensedStates.length > 0,
      description: 'Booking and marketplace discovery should only show licensed states.',
    },
    {
      id: 'live-market',
      label: 'Live market enabled',
      completed: isVerified && liveMarketStates.length > 0,
      description: 'Verified providers go live only in supported markets where they are actually licensed.',
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
  const liveMarketStates = profile.licensedStates.filter((state) => isSupportedProviderState(state));
  const checklist = buildPracticeChecklist(profile, availabilitySlots);
  const completedCount = checklist.filter((item) => item.completed).length;
  const readinessScore = Math.round((completedCount / checklist.length) * 100);
  const weeklySessions = Math.max(availabilitySlots, 4);
  const avgVisitValue = profile.careRails.includes('cash_pay_direct') ? 125 : 95;
  const low = weeklySessions * avgVisitValue * 4;
  const high = Math.round(low * 1.8);

  const supportsIndependentPractice =
    profile.businessModel === 'independent_network' || profile.businessModel === 'hybrid';

  const goLiveStatus: ProviderGoLiveStatus = profile.verificationStatus === 'verified'
    ? (liveMarketStates.length > 0 ? 'verified_live' : 'verified_not_live')
    : 'pending_verification';

  return {
    readinessScore,
    monthlyRevenueRange: { low, high },
    checklist,
    goLiveStatus,
    liveMarketStates,
    headline: supportsIndependentPractice
      ? 'Launch an independent telehealth practice through Aminy.'
      : 'Operate your clinic lane through Aminy with family-facing telehealth and follow-up.',
    supportingCopy: goLiveStatus === 'verified_live'
      ? 'Your verified profile can be listed in supported states now. Publish availability, accept bookings, and keep families inside Aminy from discovery through follow-up.'
      : goLiveStatus === 'verified_not_live'
        ? 'Your credentials are verified. Aminy will hold you off the marketplace until one of your licensed states is part of the live launch footprint.'
        : supportsIndependentPractice
          ? 'Complete verification, publish availability, and choose your rails before Aminy turns on live marketplace discovery.'
          : 'Use Aminy for branded booking, family messaging, provider summaries, and operational handoff while your clinic keeps the billing rail it already trusts.',
  };
}
