import { getPayerConfig, type PayerConfig } from './payer-configs';

export type SupportedProviderState = 'AZ' | 'MT' | 'TX';
export type MarketLaunchState = 'pilot' | 'limited_launch' | 'live';

export interface PayerProduct {
  id: string;
  state: SupportedProviderState;
  displayName: string;
  payerType: PayerConfig['payerType'];
  claimsReady: boolean;
  eligibilityReady: boolean;
  priorAuthReady: boolean;
  submissionPath: 'clearinghouse' | 'portal' | 'hybrid';
}

export interface PayerNetworkCatalog {
  state: SupportedProviderState;
  label: string;
  coverageTargetPct: number;
  launchState: MarketLaunchState;
  cashPayTelehealth: boolean;
  coverageCoach: boolean;
  insuredPartnerBilled: boolean;
  payerProducts: PayerProduct[];
  notes: string[];
}

export const SUPPORTED_PROVIDER_STATES: SupportedProviderState[] = ['AZ', 'MT', 'TX'];
export const SUPPORTED_PROVIDER_STATE_LABEL = SUPPORTED_PROVIDER_STATES.join(' · ');

function createPayerProduct(state: SupportedProviderState, payerId: string, overrides?: Partial<PayerProduct>): PayerProduct {
  const payer = getPayerConfig(payerId);
  if (!payer) {
    throw new Error(`Missing payer config for ${payerId}`);
  }

  return {
    id: payer.id,
    state,
    displayName: payer.name,
    payerType: payer.payerType,
    claimsReady: true,
    eligibilityReady: true,
    priorAuthReady: Boolean(payer.priorAuthRequired),
    submissionPath: payer.submissionFormat.portalUrl ? 'hybrid' : 'clearinghouse',
    ...overrides,
  };
}

export const STATE_MARKET_COVERAGE: Record<SupportedProviderState, PayerNetworkCatalog> = {
  AZ: {
    state: 'AZ',
    label: 'Arizona',
    coverageTargetPct: 80,
    launchState: 'limited_launch',
    cashPayTelehealth: true,
    coverageCoach: true,
    insuredPartnerBilled: true,
    payerProducts: [
      createPayerProduct('AZ', 'bcbs-az'),
      createPayerProduct('AZ', 'ahcccs'),
      createPayerProduct('AZ', 'mercy-care'),
      createPayerProduct('AZ', 'uhc'),
      createPayerProduct('AZ', 'aetna'),
      createPayerProduct('AZ', 'cigna'),
    ],
    notes: [
      'AACT is the first deep operational proof market.',
      'BCBA of AZ and MercyCare stay as the first Arizona depth lanes, but the state matrix is broader than those two payers.',
    ],
  },
  MT: {
    state: 'MT',
    label: 'Montana',
    coverageTargetPct: 80,
    launchState: 'limited_launch',
    cashPayTelehealth: true,
    coverageCoach: true,
    insuredPartnerBilled: true,
    payerProducts: [
      createPayerProduct('MT', 'mt-medicaid'),
      createPayerProduct('MT', 'bcbs-il'),
      createPayerProduct('MT', 'uhc'),
      createPayerProduct('MT', 'aetna'),
      createPayerProduct('MT', 'cigna'),
      createPayerProduct('MT', 'tricare', { submissionPath: 'hybrid' }),
    ],
    notes: [
      'Montana launch prioritizes rural-friendly telehealth and broad commercial plus Medicaid routing.',
      'Claims operations should favor clearinghouse submission with portal fallback when payer-specific auth or status workflows require it.',
    ],
  },
  TX: {
    state: 'TX',
    label: 'Texas',
    coverageTargetPct: 80,
    launchState: 'limited_launch',
    cashPayTelehealth: true,
    coverageCoach: true,
    insuredPartnerBilled: true,
    payerProducts: [
      createPayerProduct('TX', 'tx-medicaid'),
      createPayerProduct('TX', 'bcbs-il'),
      createPayerProduct('TX', 'uhc'),
      createPayerProduct('TX', 'aetna'),
      createPayerProduct('TX', 'cigna'),
      createPayerProduct('TX', 'tricare', { submissionPath: 'hybrid' }),
    ],
    notes: [
      'Texas launch supports cash-pay telehealth now and insured routing through the top commercial and Medicaid products used in the live provider footprint.',
      'Broad payer readiness does not mean universal in-network booking for every regional plan on day 1.',
    ],
  },
};

export function isSupportedProviderState(state?: string | null): state is SupportedProviderState {
  return Boolean(state && SUPPORTED_PROVIDER_STATES.includes(state.toUpperCase() as SupportedProviderState));
}

export function getStateMarketCoverage(state?: string | null): PayerNetworkCatalog | null {
  if (!state) return null;
  const normalized = state.toUpperCase();
  if (!isSupportedProviderState(normalized)) return null;
  return STATE_MARKET_COVERAGE[normalized];
}

export function getSupportedClaimsMessage(): string {
  return `Coverage Coach and claim-ready workflows support the top payer products needed to cover at least 80% of target volume in ${SUPPORTED_PROVIDER_STATE_LABEL}. Arizona remains the first depth market while the broader state matrix comes online.`;
}

export function getSupportedTelehealthMessage(): string {
  return `Cash-pay telehealth is live in ${SUPPORTED_PROVIDER_STATE_LABEL} where Aminy has licensed providers. Insurance routing and partner-billed claims follow the supported-state payer matrix; unsupported states stay on the national AI companion until supply expands.`;
}
