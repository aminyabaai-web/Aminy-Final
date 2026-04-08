// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { SUPPORTED_PROVIDER_STATES, SUPPORTED_PROVIDER_STATE_LABEL, getSupportedClaimsMessage, getSupportedTelehealthMessage } from './insurance/state-market-coverage';

export type DataProvenanceSource = 'live' | 'sample' | 'local';

export interface DataProvenance {
  source: DataProvenanceSource;
  label: string;
  lastUpdatedAt?: string | null;
  isVerified: boolean;
}

export type SyncStatus = 'synced' | 'pending_sync' | 'local_only' | 'sync_failed';

export type LaunchState = 'hidden' | 'internal' | 'pilot' | 'limited_launch' | 'live';
export type PilotOrganization = 'aact' | 'rise' | 'invite_network' | 'general_az';
export type PilotPayer = 'bcba_of_az' | 'mercycare' | 'az_ddd' | 'medicaid' | 'other';
export type EVVSystem = 'spokchoice' | 'dci' | 'acumen' | 'manual';
export type SystemOfRecord = 'external' | 'aminy_shadow' | 'aminy_primary';
export type LaunchUserRole = 'parent' | 'provider' | 'admin';

export interface AudienceScope {
  roles?: LaunchUserRole[];
  states?: string[];
  organizations?: PilotOrganization[];
  payers?: PilotPayer[];
  requiresPilotUser?: boolean;
}

export interface LaunchStateConfig {
  state: LaunchState;
  badgeLabel: string;
  message: string;
  audienceScope?: AudienceScope;
  programLabel?: string;
  pathwayLabel?: string;
  payerLabel?: string;
  evvSystem?: EVVSystem;
  systemOfRecord?: SystemOfRecord;
  showGlobalBanner?: boolean;
}

export interface PilotAccessInput {
  state?: string;
  role?: LaunchUserRole;
  email?: string;
  organization?: PilotOrganization | string | null;
  payers?: Array<PilotPayer | string>;
  pilotEligible?: boolean;
  evvSystem?: EVVSystem | string;
  systemOfRecord?: SystemOfRecord | string;
}

export interface PilotAccessContext {
  state?: string;
  role: LaunchUserRole;
  organization?: PilotOrganization | null;
  payers: PilotPayer[];
  isPilotUser: boolean;
  evvSystem?: EVVSystem;
  systemOfRecord?: SystemOfRecord;
}

export interface SurfaceAccessDecision {
  allowed: boolean;
  gateReason: 'hidden' | 'internal' | 'pilot' | 'limited_launch' | 'audience_mismatch' | null;
  title: string;
  message: string;
  config: LaunchStateConfig;
}

const STORED_PILOT_CONTEXT_KEY = 'aminy-pilot-context';
const AZ_STATES = new Set(['AZ', 'ARIZONA']);
const SUPPORTED_MARKET_STATES = [...SUPPORTED_PROVIDER_STATES];

const ORGANIZATION_ALIASES: Record<string, PilotOrganization> = {
  aact: 'aact',
  'advanced autism centers for treatment': 'aact',
  rise: 'rise',
  'rise services': 'rise',
  'rise pediatric therapy': 'rise',
  'invite network': 'invite_network',
  invite_network: 'invite_network',
  'general az': 'general_az',
  general_az: 'general_az',
};

const PAYER_ALIASES: Record<string, PilotPayer> = {
  bcba_of_az: 'bcba_of_az',
  'bcba of az': 'bcba_of_az',
  mercycare: 'mercycare',
  az_ddd: 'az_ddd',
  ddd: 'az_ddd',
  medicaid: 'medicaid',
  other: 'other',
};

const EVV_SYSTEM_ALIASES: Record<string, EVVSystem> = {
  spokchoice: 'spokchoice',
  'spok choice': 'spokchoice',
  dci: 'dci',
  acumen: 'acumen',
  manual: 'manual',
};

const SYSTEM_OF_RECORD_ALIASES: Record<string, SystemOfRecord> = {
  external: 'external',
  aminy_shadow: 'aminy_shadow',
  'aminy shadow': 'aminy_shadow',
  aminy_primary: 'aminy_primary',
  'aminy primary': 'aminy_primary',
};

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeState(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (AZ_STATES.has(normalized)) return 'AZ';
  return normalized;
}

function normalizeOrganization(value?: string | null): PilotOrganization | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return ORGANIZATION_ALIASES[normalized] || null;
}

function normalizePayers(values?: Array<PilotPayer | string> | null): PilotPayer[] {
  if (!values?.length) return [];

  return uniqueStrings(
    values
      .map((value) => PAYER_ALIASES[String(value).trim().toLowerCase()])
      .filter(Boolean) as string[],
  ) as PilotPayer[];
}

function normalizeEVVSystem(value?: string | null): EVVSystem | undefined {
  if (!value) return undefined;
  return EVV_SYSTEM_ALIASES[value.trim().toLowerCase()];
}

function normalizeSystemOfRecord(value?: string | null): SystemOfRecord | undefined {
  if (!value) return undefined;
  return SYSTEM_OF_RECORD_ALIASES[value.trim().toLowerCase()];
}

function inferOrganizationFromEmail(email?: string | null): PilotOrganization | null {
  if (!email) return null;
  const normalized = email.toLowerCase();
  if (normalized.includes('rise')) return 'rise';
  if (normalized.includes('aact')) return 'aact';
  return null;
}

function readStoredPilotContext(): Partial<PilotAccessInput> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORED_PILOT_CONTEXT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PilotAccessInput>;
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function readPilotContextFromUrl(): Partial<PilotAccessInput> {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  if (![...params.keys()].some((key) => key.startsWith('pilot') || key === 'evvSystem' || key === 'systemOfRecord')) {
    return {};
  }

  return {
    pilotEligible: params.get('pilot') === 'true' ? true : undefined,
    organization: params.get('pilotOrg') || undefined,
    payers: (params.get('pilotPayers') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    evvSystem: params.get('evvSystem') || undefined,
    systemOfRecord: params.get('systemOfRecord') || undefined,
    state: params.get('pilotState') || undefined,
    role: (params.get('pilotRole') as LaunchUserRole | null) || undefined,
  };
}

export function createDataProvenance(
  source: DataProvenanceSource,
  label: string,
  options?: {
    lastUpdatedAt?: string | null;
    isVerified?: boolean;
  },
): DataProvenance {
  return {
    source,
    label,
    lastUpdatedAt: options?.lastUpdatedAt ?? null,
    isVerified: options?.isVerified ?? source === 'live',
  };
}

export function formatTimestamp(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function buildPilotAccessContext(input: PilotAccessInput = {}): PilotAccessContext {
  const stored = readStoredPilotContext();
  const url = readPilotContextFromUrl();

  const state = normalizeState(url.state || stored.state || input.state);
  const role = (url.role || stored.role || input.role || 'parent') as LaunchUserRole;
  const organization = normalizeOrganization(
    String(url.organization || stored.organization || input.organization || inferOrganizationFromEmail(input.email) || ''),
  );
  const payers = normalizePayers([
    ...normalizePayers(url.payers),
    ...normalizePayers(stored.payers),
    ...normalizePayers(input.payers),
  ]);
  const evvSystem =
    normalizeEVVSystem(String(url.evvSystem || stored.evvSystem || input.evvSystem || ''))
    || (organization === 'aact' ? 'spokchoice' : organization === 'rise' ? 'dci' : undefined);
  const systemOfRecord =
    normalizeSystemOfRecord(String(url.systemOfRecord || stored.systemOfRecord || input.systemOfRecord || ''))
    || (evvSystem ? 'external' : undefined);
  const explicitPilotEligible = url.pilotEligible ?? stored.pilotEligible ?? input.pilotEligible;
  const isPilotUser = typeof explicitPilotEligible === 'boolean'
    ? explicitPilotEligible
    : state === 'AZ' || organization === 'aact' || organization === 'rise';

  return {
    state,
    role,
    organization,
    payers,
    isPilotUser,
    evvSystem,
    systemOfRecord,
  };
}

function describeAudience(scope?: AudienceScope): string {
  if (!scope) return 'eligible launch participants';

  const parts: string[] = [];
  if (scope.states?.length) {
    parts.push(scope.states.length === 1 && scope.states[0] === 'AZ' ? 'Arizona participants' : `${scope.states.join(', ')} participants`);
  }
  if (scope.organizations?.length) {
    const labels = scope.organizations.map((org) => {
      switch (org) {
        case 'aact': return 'AACT';
        case 'rise': return 'Rise';
        case 'invite_network': return 'invite-only network';
        case 'general_az': return 'Arizona pilot families';
        default: return org;
      }
    });
    parts.push(labels.join(' and '));
  }
  if (scope.roles?.length) {
    const roleLabels = scope.roles.map((role) => role === 'admin' ? 'admins' : role === 'provider' ? 'providers' : 'families');
    parts.push(roleLabels.join(' and '));
  }
  if (scope.payers?.length) {
    const payerLabels = scope.payers.map((payer) => {
      switch (payer) {
        case 'bcba_of_az': return 'BCBA of AZ';
        case 'mercycare': return 'MercyCare';
        case 'az_ddd': return 'DDD';
        case 'medicaid': return 'Medicaid';
        default: return 'other pilot payers';
      }
    });
    parts.push(payerLabels.join(' / '));
  }
  if (scope.requiresPilotUser) {
    parts.push('invited pilot users');
  }

  return parts.filter(Boolean).join(' · ') || 'eligible launch participants';
}

function matchesScope(scope: AudienceScope | undefined, context: PilotAccessContext): boolean {
  if (!scope) return true;
  if (scope.requiresPilotUser && !context.isPilotUser) return false;
  if (scope.roles?.length && !scope.roles.includes(context.role)) return false;
  if (scope.states?.length && (!context.state || !scope.states.includes(context.state))) return false;

  if (scope.organizations?.length) {
    if (context.organization) {
      if (!scope.organizations.includes(context.organization)) return false;
    } else if (context.role !== 'parent') {
      return false;
    }
  }

  if (scope.payers?.length && context.payers.length > 0) {
    const hasMatchingPayer = context.payers.some((payer) => scope.payers?.includes(payer));
    if (!hasMatchingPayer) return false;
  }

  return true;
}

export const SURFACE_LAUNCH_STATES: Record<string, LaunchStateConfig> = {
  telehealth: {
    state: 'limited_launch',
    badgeLabel: `Live in ${SUPPORTED_PROVIDER_STATE_LABEL}`,
    message: getSupportedTelehealthMessage(),
    audienceScope: {
      states: SUPPORTED_MARKET_STATES,
    },
    programLabel: 'Supported-state telehealth launch',
    pathwayLabel: 'Cash-pay direct + supported-state insurance routing',
    showGlobalBanner: false,
  },
  marketplace: {
    state: 'limited_launch',
    badgeLabel: `Live in ${SUPPORTED_PROVIDER_STATE_LABEL}`,
    message:
      'Provider discovery is live only in supported provider states with verified licensed supply. Aminy does not show mock provider density or fake in-network reach.',
    audienceScope: {
      states: SUPPORTED_MARKET_STATES,
    },
    programLabel: 'Supported-state telehealth launch',
    pathwayLabel: 'Cash-pay direct + supported-state insurance routing',
    showGlobalBanner: false,
  },
  'on-demand-telehealth': {
    state: 'limited_launch',
    badgeLabel: `Live in ${SUPPORTED_PROVIDER_STATE_LABEL}`,
    message:
      'Urgent telehealth is available only in supported provider states when a verified licensed clinician is actually available. Unsupported states should fall back to Aminy guidance until supply expands.',
    audienceScope: {
      states: SUPPORTED_MARKET_STATES,
    },
    programLabel: 'Supported-state telehealth launch',
    pathwayLabel: 'Cash-pay direct + supported-state insurance routing',
    showGlobalBanner: false,
  },
  'provider-portal': {
    state: 'limited_launch',
    badgeLabel: `Provider network · ${SUPPORTED_PROVIDER_STATE_LABEL}`,
    message: 'The provider portal is open to independent and partner clinicians in supported provider states. Clinic-specific CentralReach operations remain pilot-scoped.',
    audienceScope: {
      roles: ['provider', 'admin'],
      states: SUPPORTED_MARKET_STATES,
    },
    programLabel: 'Supported-state provider network',
    pathwayLabel: 'Independent practice-in-a-box + partner clinic workflow',
  },
  'provider-onboarding': {
    state: 'limited_launch',
    badgeLabel: `Provider network · ${SUPPORTED_PROVIDER_STATE_LABEL}`,
    message: 'Provider onboarding is live for licensed clinicians in supported provider states. Partner clinic staffing and CentralReach-connected operations stay separately pilot-scoped.',
    audienceScope: {
      roles: ['provider', 'admin'],
      states: SUPPORTED_MARKET_STATES,
    },
    programLabel: 'Supported-state provider network',
    pathwayLabel: 'Independent practice-in-a-box + partner clinic workflow',
  },
  'provider-analytics': {
    state: 'limited_launch',
    badgeLabel: `Provider network · ${SUPPORTED_PROVIDER_STATE_LABEL}`,
    message: 'Provider analytics are available for clinicians in supported provider states. Clinic-level financial and CentralReach operations remain pilot-gated.',
    audienceScope: {
      roles: ['provider', 'admin'],
      states: SUPPORTED_MARKET_STATES,
    },
    programLabel: 'Supported-state provider network',
    pathwayLabel: 'Independent practice-in-a-box + partner clinic workflow',
  },
  'provider-identity-verification': {
    state: 'limited_launch',
    badgeLabel: `Provider network · ${SUPPORTED_PROVIDER_STATE_LABEL}`,
    message: 'Credentialing and identity verification are open to providers in supported states so Aminy can power direct cash-pay and future insured rails.',
    audienceScope: {
      roles: ['provider', 'admin'],
      states: SUPPORTED_MARKET_STATES,
    },
    programLabel: 'Supported-state provider network',
    pathwayLabel: 'Independent practice-in-a-box + partner clinic workflow',
  },
  'admin-portal': {
    state: 'pilot',
    badgeLabel: 'AACT / Rise pilot',
    message: 'Operational admin workflows are visible only to the Arizona clinic pilot team while live processes are hardened.',
    audienceScope: {
      roles: ['admin'],
      states: ['AZ'],
      organizations: ['aact', 'rise'],
      requiresPilotUser: true,
    },
    programLabel: 'AACT / Rise clinic pilot',
    pathwayLabel: 'CentralReach-connected clinic workflow',
  },
  'clinic-dashboard': {
    state: 'pilot',
    badgeLabel: 'AACT / Rise pilot',
    message: 'Clinic operations are enabled only for the Arizona pilot while live AACT and Rise workflows are validated.',
    audienceScope: {
      roles: ['provider', 'admin'],
      states: ['AZ'],
      organizations: ['aact', 'rise'],
      requiresPilotUser: true,
    },
    programLabel: 'AACT / Rise clinic pilot',
    pathwayLabel: 'CentralReach-connected clinic workflow',
  },
  'user-management': {
    state: 'pilot',
    badgeLabel: 'AACT / Rise pilot',
    message: 'User management is limited to Arizona pilot administrators while partner operations are validated.',
    audienceScope: {
      roles: ['admin'],
      states: ['AZ'],
      organizations: ['aact', 'rise'],
      requiresPilotUser: true,
    },
    programLabel: 'AACT / Rise clinic pilot',
    pathwayLabel: 'CentralReach-connected clinic workflow',
  },
  analytics: {
    state: 'internal',
    badgeLabel: 'Internal',
    message: 'Business analytics remain internal until every visible metric is live-data backed.',
  },
  'claims-dashboard': {
    state: 'limited_launch',
    badgeLabel: `Supported payer matrix · ${SUPPORTED_PROVIDER_STATE_LABEL}`,
    message: getSupportedClaimsMessage(),
    audienceScope: {
      roles: ['parent', 'provider', 'admin'],
      states: SUPPORTED_MARKET_STATES,
    },
    programLabel: 'Supported-state payer launch',
    pathwayLabel: 'Top commercial + Medicaid products across AZ / MT / TX',
    payerLabel: 'Supported-state payer matrix',
  },
  'payer-dashboard': {
    state: 'pilot',
    badgeLabel: 'Arizona payer pilot',
    message: 'Payer outcomes stay Arizona-first while the broader supported-state payer matrix is validated through live operator workflows.',
    audienceScope: {
      roles: ['provider', 'admin'],
      states: ['AZ'],
      organizations: ['aact', 'rise'],
      requiresPilotUser: true,
    },
    programLabel: 'Arizona payer pilot',
    pathwayLabel: 'AACT depth lane feeding broader supported-state matrix',
    payerLabel: 'Arizona depth lane',
  },
  'evv-dashboard': {
    state: 'pilot',
    badgeLabel: 'Arizona DDD pilot',
    message: 'Aminy records EVV and timesheets in shadow mode for the Arizona pilot. SpokChoice remains the current system of record while DCI transition workflows are validated.',
    audienceScope: {
      roles: ['parent', 'provider', 'admin'],
      states: ['AZ'],
      requiresPilotUser: true,
    },
    programLabel: 'Arizona DDD pilot',
    pathwayLabel: 'SpokChoice current / DCI transition',
    evvSystem: 'spokchoice',
    systemOfRecord: 'external',
  },
  'caregiver-enrollment': {
    state: 'pilot',
    badgeLabel: 'Arizona DDD pilot',
    message: 'Paid caregiver enrollment is live only for Arizona pilot workflows while SpokChoice and DCI transition paths are validated.',
    audienceScope: {
      roles: ['parent', 'provider', 'admin'],
      states: ['AZ'],
      requiresPilotUser: true,
    },
    programLabel: 'Arizona DDD pilot',
    pathwayLabel: 'SpokChoice current / DCI transition',
    evvSystem: 'spokchoice',
    systemOfRecord: 'external',
  },
  'caregiver-credentialing': {
    state: 'pilot',
    badgeLabel: 'Arizona DDD pilot',
    message: 'Caregiver credentialing is limited to Arizona pilot workflows while DDD and fiscal-agent requirements are validated.',
    audienceScope: {
      roles: ['parent', 'provider', 'admin'],
      states: ['AZ'],
      requiresPilotUser: true,
    },
    programLabel: 'Arizona DDD pilot',
    pathwayLabel: 'SpokChoice current / DCI transition',
    evvSystem: 'spokchoice',
    systemOfRecord: 'external',
  },
  'caregiver-timesheet': {
    state: 'pilot',
    badgeLabel: 'Arizona DDD pilot',
    message: 'Timesheets are captured in shadow mode for Arizona pilot families. Aminy supports reconciliation and export while SpokChoice remains primary and DCI transition workflows are validated.',
    audienceScope: {
      roles: ['parent', 'provider', 'admin'],
      states: ['AZ'],
      requiresPilotUser: true,
    },
    programLabel: 'Arizona DDD pilot',
    pathwayLabel: 'SpokChoice current / DCI transition',
    evvSystem: 'spokchoice',
    systemOfRecord: 'external',
  },
};

export function getSurfaceLaunchConfig(screen: string): LaunchStateConfig {
  return (
    SURFACE_LAUNCH_STATES[screen] ?? {
      state: 'live',
      badgeLabel: 'Live',
      message: '',
      showGlobalBanner: false,
    }
  );
}

export function getSurfaceAccessDecision(screen: string, context: PilotAccessContext): SurfaceAccessDecision {
  const config = getSurfaceLaunchConfig(screen);

  if (config.state === 'hidden') {
    return {
      allowed: false,
      gateReason: 'hidden',
      title: 'Hidden surface',
      message: 'This surface is not available in the current launch configuration.',
      config,
    };
  }

  if (config.state === 'internal') {
    return {
      allowed: false,
      gateReason: 'internal',
      title: config.badgeLabel,
      message: config.message,
      config,
    };
  }

  if ((config.state === 'pilot' || config.state === 'limited_launch') && !matchesScope(config.audienceScope, context)) {
    const audienceLabel = describeAudience(config.audienceScope);
    return {
      allowed: false,
      gateReason: config.state,
      title: config.state === 'pilot' ? 'Pilot access required' : config.badgeLabel,
      message: `${config.message} Access is currently limited to ${audienceLabel}.`,
      config,
    };
  }

  return {
    allowed: true,
    gateReason: null,
    title: config.badgeLabel,
    message: config.message,
    config,
  };
}

export function isSurfaceInternal(screen: string): boolean {
  return getSurfaceLaunchConfig(screen).state === 'internal';
}

export function isSurfaceLimitedLaunch(screen: string): boolean {
  return getSurfaceLaunchConfig(screen).state === 'limited_launch';
}

export function isSurfacePilot(screen: string): boolean {
  return getSurfaceLaunchConfig(screen).state === 'pilot';
}
