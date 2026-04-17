// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Partner Branding — White-label configuration for Aminy partners
 *
 * Activate with ?partner=aact or window.__setPartner('aact')
 * Or set VITE_DEFAULT_PARTNER=aact in production env for a partner-specific deployment.
 */

export interface PartnerBrand {
  id: string;
  name: string;
  fullName: string;
  shortName: string;
  website: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  welcomeMessage: string;
  adminPortalTitle: string;
  providerContext?: {
    defaultFiscalAgent?: 'acumen' | 'dci' | 'ppl' | 'conduent';
    defaultState?: string;
    defaultPayers?: string[];
  };
}

export const PARTNER_BRANDS: Record<string, PartnerBrand> = {
  aminy: {
    id: 'aminy',
    name: 'Aminy',
    fullName: 'Aminy LLC',
    shortName: 'Aminy',
    website: 'https://aminy.app',
    primaryColor: '#43AA8B',
    accentColor: '#577590',
    welcomeMessage: 'Welcome to Aminy',
    adminPortalTitle: 'Aminy Admin Portal',
  },
  aact: {
    id: 'aact',
    name: 'AACT',
    fullName: 'Advanced Autism Center for Treatment',
    shortName: 'AACT',
    website: 'https://aactarizona.com',
    primaryColor: '#2563EB', // AACT blue
    accentColor: '#43AA8B',
    welcomeMessage: 'Welcome — AACT family support, powered by Aminy',
    adminPortalTitle: 'AACT Partner Dashboard',
    providerContext: {
      defaultFiscalAgent: 'acumen',
      defaultState: 'AZ',
      defaultPayers: ['AHCCCS', 'BCBS Arizona', 'UnitedHealthcare'],
    },
  },
  rise: {
    id: 'rise',
    name: 'Rise',
    fullName: 'Rise Services',
    shortName: 'Rise',
    website: 'https://riseservicesinc.org',
    primaryColor: '#DC2626', // Rise red
    accentColor: '#43AA8B',
    welcomeMessage: 'Rise family support, powered by Aminy',
    adminPortalTitle: 'Rise Partner Dashboard',
    providerContext: {
      defaultFiscalAgent: 'acumen',
      defaultState: 'AZ',
      defaultPayers: ['AHCCCS', 'BCBS Arizona'],
    },
  },
  acumen: {
    id: 'acumen',
    name: 'Acumen',
    fullName: 'Acumen Fiscal Agent',
    shortName: 'Acumen',
    website: 'https://acumenfiscalagent.com',
    primaryColor: '#059669',
    accentColor: '#577590',
    welcomeMessage: 'Self-directed Medicaid support, powered by Aminy',
    adminPortalTitle: 'Acumen Participant Dashboard',
    providerContext: {
      defaultFiscalAgent: 'acumen',
      defaultState: 'AZ',
    },
  },
  dci: {
    id: 'dci',
    name: 'DCI',
    fullName: 'Direct Care Innovations',
    shortName: 'DCI',
    website: 'https://dcisoftware.com',
    primaryColor: '#7C3AED',
    accentColor: '#577590',
    welcomeMessage: 'Direct care support, powered by Aminy',
    adminPortalTitle: 'DCI Partner Dashboard',
    providerContext: {
      defaultFiscalAgent: 'dci',
      defaultState: 'AZ',
    },
  },
};

let cachedPartner: PartnerBrand | null = null;

/**
 * Get the active partner brand. Checks (in order):
 * 1. URL query param ?partner=aact
 * 2. localStorage aminy_partner
 * 3. Environment VITE_DEFAULT_PARTNER
 * 4. Default to aminy
 */
export function getActivePartner(): PartnerBrand {
  if (cachedPartner) return cachedPartner;
  if (typeof window === 'undefined') return PARTNER_BRANDS.aminy;

  // 1. URL query param
  const params = new URLSearchParams(window.location.search);
  const urlPartner = params.get('partner');
  if (urlPartner && PARTNER_BRANDS[urlPartner.toLowerCase()]) {
    cachedPartner = PARTNER_BRANDS[urlPartner.toLowerCase()];
    try { localStorage.setItem('aminy_partner', urlPartner.toLowerCase()); } catch { /* ignore */ }
    return cachedPartner;
  }

  // 2. localStorage
  try {
    const stored = localStorage.getItem('aminy_partner');
    if (stored && PARTNER_BRANDS[stored]) {
      cachedPartner = PARTNER_BRANDS[stored];
      return cachedPartner;
    }
  } catch { /* ignore */ }

  // 3. Environment
  const envPartner = import.meta.env.VITE_DEFAULT_PARTNER;
  if (envPartner && PARTNER_BRANDS[envPartner]) {
    cachedPartner = PARTNER_BRANDS[envPartner];
    return cachedPartner;
  }

  // 4. Default
  cachedPartner = PARTNER_BRANDS.aminy;
  return cachedPartner;
}

export function setActivePartner(partnerId: string): void {
  if (PARTNER_BRANDS[partnerId]) {
    cachedPartner = PARTNER_BRANDS[partnerId];
    try { localStorage.setItem('aminy_partner', partnerId); } catch { /* ignore */ }
  }
}

export function isPartnerDeployment(): boolean {
  return getActivePartner().id !== 'aminy';
}

// Expose to window for quick testing
if (typeof window !== 'undefined') {
  (window as unknown as { __setPartner: (id: string) => void }).__setPartner = setActivePartner;
  (window as unknown as { __getPartner: () => PartnerBrand }).__getPartner = getActivePartner;
}
