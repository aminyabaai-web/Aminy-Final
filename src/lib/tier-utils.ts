/**
 * Tier utilities for consistent naming and feature gating across the app
 *
 * Pricing Strategy (Simplified per McKinsey 10/10 recommendation):
 * - Free: $0 (discovery tier, hooks users with 7-day trial of Core)
 * - Core: $14.99/mo or $129/year (full companion - recommended, 7-day free trial)
 * - Pro: $29.99/mo or $279/year (premium with BCBA access)
 * - Pro+ Family Plan: $49.99/mo or $479/year (unlimited children, enterprise features)
 *
 * NOTE: Starter tier removed for conversion clarity. Free → Core → Pro path is cleaner.
 * Legacy 'starter' type maintained for backward compatibility but maps to 'core'.
 */

export type TierType = 'free' | 'starter' | 'core' | 'pro' | 'proplus';

// Map internal tier names to UI-friendly display names
export const tierDisplayNames: Record<TierType, string> = {
  free: 'Free',
  starter: 'Core', // Legacy: Starter now maps to Core
  core: 'Core',
  pro: 'Pro',
  proplus: 'Family Plan', // Rebranded from Pro+ to Family Plan
};

// Trial configuration
export const TRIAL_CONFIG = {
  durationDays: 7,
  trialTier: 'core' as TierType,
  requiresCreditCard: false,
  features: [
    'Full Core tier access',
    'Unlimited AI chat',
    'Adaptive daily plans',
    'Document analysis',
    'No credit card required',
  ],
};

// Pricing configuration (simplified - Starter removed)
export const tierPricing: Record<TierType, { monthly: number; yearly: number; savings?: number; hasTrial?: boolean }> = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 14.99, yearly: 129, savings: 28, hasTrial: true }, // Legacy: same as Core
  core: { monthly: 14.99, yearly: 129, savings: 28, hasTrial: true },
  pro: { monthly: 29.99, yearly: 279, savings: 22, hasTrial: true },
  proplus: { monthly: 49.99, yearly: 479, savings: 20, hasTrial: true },
};

// HSA/FSA eligibility configuration
export const HSA_FSA_CONFIG = {
  eligible: true,
  eligibleTiers: ['core', 'pro', 'proplus'] as TierType[],
  eligibilityNote: 'Aminy may be eligible for HSA/FSA reimbursement as a health-related expense. Consult your plan administrator.',
  letterOfMedicalNecessityAvailable: true,
};

// Professional/Organization tier configuration (for schools, clinics, etc.)
export type ProfessionalAccountType = 'school' | 'clinic' | 'practice' | 'agency';

export interface ProfessionalTierConfig {
  type: ProfessionalAccountType;
  displayName: string;
  description: string;
  minSeats: number;
  pricePerSeatMonthly: number;
  pricePerSeatYearly: number;
  features: string[];
  includesProviderPortal: boolean;
  includesStudentMode: boolean;
  includesCarePlanSharing: boolean;
  supportsMultipleLocations: boolean;
}

export const PROFESSIONAL_TIERS: Record<ProfessionalAccountType, ProfessionalTierConfig> = {
  school: {
    type: 'school',
    displayName: 'School Edition',
    description: 'For teachers and school support staff',
    minSeats: 5,
    pricePerSeatMonthly: 9.99,
    pricePerSeatYearly: 89,
    features: [
      'Classroom mode for multiple students',
      'Teacher dashboard with progress views',
      'IEP goal tracking',
      'Parent communication portal',
      'Behavior incident logging',
      'Progress reports for IEP meetings',
      'Admin console for school-wide analytics',
    ],
    includesProviderPortal: false,
    includesStudentMode: true,
    includesCarePlanSharing: true,
    supportsMultipleLocations: true,
  },
  clinic: {
    type: 'clinic',
    displayName: 'Clinic Edition',
    description: 'For ABA clinics and therapy centers',
    minSeats: 3,
    pricePerSeatMonthly: 19.99,
    pricePerSeatYearly: 179,
    features: [
      'Provider portal with caseload management',
      'Client progress dashboards',
      'Session notes integration',
      'Care plan templates',
      'Family communication portal',
      'Outcome tracking and reporting',
      'Billing code suggestions',
      'Multi-location support',
    ],
    includesProviderPortal: true,
    includesStudentMode: false,
    includesCarePlanSharing: true,
    supportsMultipleLocations: true,
  },
  practice: {
    type: 'practice',
    displayName: 'Private Practice',
    description: 'For independent BCBAs and therapists',
    minSeats: 1,
    pricePerSeatMonthly: 24.99,
    pricePerSeatYearly: 229,
    features: [
      'Provider portal',
      'Client caseload management',
      'Care plan creation and sharing',
      'Progress tracking for families',
      'Session preparation with AI',
      'Outcome reports for insurance',
      'Superbill generation',
    ],
    includesProviderPortal: true,
    includesStudentMode: false,
    includesCarePlanSharing: true,
    supportsMultipleLocations: false,
  },
  agency: {
    type: 'agency',
    displayName: 'Agency/Enterprise',
    description: 'For large organizations and state agencies',
    minSeats: 25,
    pricePerSeatMonthly: 7.99,
    pricePerSeatYearly: 69,
    features: [
      'All Clinic Edition features',
      'Custom branding',
      'SSO integration',
      'Dedicated success manager',
      'Custom reporting',
      'API access',
      'SLA guarantee',
      'HIPAA BAA included',
    ],
    includesProviderPortal: true,
    includesStudentMode: true,
    includesCarePlanSharing: true,
    supportsMultipleLocations: true,
  },
};

/**
 * Check if a tier supports classroom/school mode
 */
export function hasSchoolMode(tier: TierType | undefined): boolean {
  // Only Pro+ (Family Plan) has multi-child which could support school mode
  // Professional accounts have dedicated school mode
  return tier === 'proplus';
}

// ============================================================================
// PAID PARENT CAREGIVER / MEDICAID WAIVER SUPPORT
// ============================================================================

/**
 * Configuration for paid parent caregiver features
 * Supports CDPAP, self-directed Medicaid waivers, and fiscal agent integration
 */
export interface PaidCaregiverConfig {
  enabled: boolean;
  fiscalAgentId?: string;
  participantId?: string;
  serviceAuthorizationNumber?: string;
  approvedServices: string[];
  weeklyAuthorizedHours: number;
  evvRequired: boolean;
}

export const WAIVER_SERVICE_CODES: Record<string, { code: string; description: string; hourlyRange: [number, number] }> = {
  'respite': { code: 'S5150', description: 'Respite care services', hourlyRange: [15, 35] },
  'parent-training': { code: 'T1027', description: 'Family training and counseling', hourlyRange: [20, 50] },
  'community-living': { code: 'T2025', description: 'Community living supports', hourlyRange: [15, 30] },
  'habilitation': { code: 'T2017', description: 'Habilitation - residential', hourlyRange: [12, 25] },
  'companion': { code: 'S5135', description: 'Companion services', hourlyRange: [12, 20] },
  'personal-care': { code: 'T1019', description: 'Personal care services', hourlyRange: [15, 30] },
};

export const FISCAL_AGENTS = [
  { id: 'acumen', name: 'Acumen Fiscal Agent', states: ['AZ', 'CO', 'FL', 'GA', 'IN', 'KS', 'MI', 'NC', 'NV', 'OH', 'OR', 'PA', 'SC', 'TN', 'TX', 'VA', 'WI'] },
  { id: 'dci', name: 'Direct Care Innovations (DCI)', states: ['AZ', 'CA', 'CO', 'FL', 'GA', 'IN', 'MI', 'NC', 'NJ', 'NY', 'OH', 'PA', 'TN', 'TX', 'VA', 'WA'] },
  { id: 'spokchoice', name: 'SpokChoice', states: ['AZ', 'CA', 'CO', 'FL', 'GA', 'IL', 'IN', 'MI', 'NC', 'NJ', 'NY', 'OH', 'OR', 'PA', 'TN', 'TX', 'VA', 'WA', 'WI'] },
  { id: 'ppl', name: 'Public Partnerships LLC (PPL)', states: ['CA', 'CT', 'DC', 'FL', 'IL', 'KY', 'LA', 'MA', 'MD', 'MN', 'NJ', 'NY', 'OH', 'PA', 'RI', 'TX', 'WA'] },
  { id: 'gt-independence', name: 'GT Independence', states: ['AZ', 'CO', 'MI', 'MO', 'NJ', 'OH', 'PA', 'TX'] },
  { id: 'palco', name: 'Palco', states: ['AL', 'AR', 'CA', 'CO', 'GA', 'IA', 'ID', 'IN', 'KY', 'LA', 'MI', 'MO', 'MS', 'NC', 'NM', 'OK', 'OR', 'SC', 'TN', 'WA'] },
  { id: 'consumer-direct', name: 'Consumer Direct Care Network', states: ['AK', 'CO', 'MT', 'NV', 'SD', 'WA', 'WY'] },
  // Additional high-priority fiscal agents
  { id: 'conduent', name: 'Conduent', states: ['AL', 'AZ', 'AR', 'CA', 'CO', 'FL', 'GA', 'IL', 'IN', 'KS', 'KY', 'LA', 'MI', 'MO', 'NC', 'OH', 'OK', 'PA', 'SC', 'TN', 'TX', 'VA', 'WI'] },
  { id: 'maximus', name: 'Maximus', states: ['AZ', 'CA', 'CO', 'FL', 'GA', 'IL', 'IN', 'KY', 'MA', 'MI', 'NC', 'NY', 'OH', 'PA', 'TX', 'VA', 'WA'] },
  { id: 'cdpap', name: 'CDPAP (Consumer Directed Personal Assistance)', states: ['NY'] }, // NY-specific large market
  { id: 'ihss', name: 'IHSS (In-Home Supportive Services)', states: ['CA'] }, // CA-specific - largest US market
  { id: 'tempus', name: 'Tempus Unlimited', states: ['MA', 'PA', 'NH', 'NJ'] },
  { id: 'first-data', name: 'First Data Government Solutions', states: ['FL', 'GA', 'IL', 'KY', 'LA', 'MI', 'NC', 'OH', 'PA', 'TX'] },
];

/**
 * Check if state has self-directed waiver programs
 */
export function getAvailableFiscalAgents(state: string): typeof FISCAL_AGENTS {
  return FISCAL_AGENTS.filter(agent => agent.states.includes(state));
}

// ============================================================================
// STATE-SPECIFIC WAIVER CONFIGURATIONS
// ============================================================================

/**
 * Comprehensive state waiver configuration
 * Includes program names, EVV requirements, self-direction availability
 */
export interface StateWaiverConfig {
  state: string;
  stateName: string;
  waiverPrograms: WaiverProgram[];
  evvRequired: boolean;
  evvProvider?: string;
  selfDirectionAvailable: boolean;
  parentAsProviderAllowed: boolean;
  respiteServicesAvailable: boolean;
  habilitationServicesAvailable: boolean;
  medicaidExpansion: boolean;
  applicationUrl?: string;
  contactPhone?: string;
  notes?: string;
}

export interface WaiverProgram {
  id: string;
  name: string;
  shortName: string;
  description: string;
  ageRange?: { min: number; max?: number };
  diagnosisRequired?: string[];
  waitlistMonths?: number;
  annualCap?: number;
  selfDirectionOption: boolean;
  parentPaidOption: boolean;
  services: string[];
}

/**
 * State waiver configurations - comprehensive list
 * Priority states first (largest populations, most Aminy users)
 */
export const STATE_WAIVER_CONFIGS: Record<string, StateWaiverConfig> = {
  AZ: {
    state: 'AZ',
    stateName: 'Arizona',
    waiverPrograms: [
      {
        id: 'az-ddd',
        name: 'Division of Developmental Disabilities',
        shortName: 'DDD',
        description: 'Serves individuals with developmental disabilities including autism, cerebral palsy, epilepsy, and intellectual disabilities',
        ageRange: { min: 0 },
        diagnosisRequired: ['autism', 'intellectual-disability', 'cerebral-palsy', 'epilepsy'],
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'habilitation', 'therapies', 'attendant-care', 'day-programs'],
      },
      {
        id: 'az-altcs',
        name: 'Arizona Long Term Care System',
        shortName: 'ALTCS',
        description: 'For individuals needing nursing home level of care',
        diagnosisRequired: ['medical-necessity'],
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['personal-care', 'respite', 'home-modifications', 'habilitation'],
      },
    ],
    evvRequired: true,
    evvProvider: 'Sandata',
    selfDirectionAvailable: true,
    parentAsProviderAllowed: true,
    respiteServicesAvailable: true,
    habilitationServicesAvailable: true,
    medicaidExpansion: true,
    applicationUrl: 'https://des.az.gov/services/disabilities/developmental-disabilities',
    contactPhone: '1-844-770-9500',
  },
  CA: {
    state: 'CA',
    stateName: 'California',
    waiverPrograms: [
      {
        id: 'ca-regional-center',
        name: 'Regional Center Services',
        shortName: 'RC',
        description: 'Comprehensive services through 21 Regional Centers for developmental disabilities',
        ageRange: { min: 0 },
        diagnosisRequired: ['autism', 'intellectual-disability', 'cerebral-palsy', 'epilepsy', 'developmental-delay'],
        waitlistMonths: 0,
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'behavior-services', 'therapies', 'supported-living', 'day-programs'],
      },
      {
        id: 'ca-ihss',
        name: 'In-Home Supportive Services',
        shortName: 'IHSS',
        description: 'Personal care and domestic services for Medi-Cal recipients',
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['personal-care', 'domestic', 'meal-prep', 'accompaniment'],
      },
      {
        id: 'ca-self-determination',
        name: 'Self-Determination Program',
        shortName: 'SDP',
        description: 'Participant-directed services with individual budget',
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'habilitation', 'therapies', 'community-living'],
      },
    ],
    evvRequired: true,
    evvProvider: 'Multiple (county-based)',
    selfDirectionAvailable: true,
    parentAsProviderAllowed: true,
    respiteServicesAvailable: true,
    habilitationServicesAvailable: true,
    medicaidExpansion: true,
    applicationUrl: 'https://www.dds.ca.gov/rc/',
    contactPhone: '1-916-654-1690',
  },
  TX: {
    state: 'TX',
    stateName: 'Texas',
    waiverPrograms: [
      {
        id: 'tx-class',
        name: 'Community Living Assistance and Support Services',
        shortName: 'CLASS',
        description: 'For individuals with related conditions including autism',
        ageRange: { min: 0 },
        diagnosisRequired: ['related-condition'],
        waitlistMonths: 120, // 10+ year waitlist
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'habilitation', 'therapies', 'supported-employment'],
      },
      {
        id: 'tx-mdcp',
        name: 'Medically Dependent Children Program',
        shortName: 'MDCP',
        description: 'For children who qualify for nursing facility care',
        ageRange: { min: 0, max: 20 },
        diagnosisRequired: ['medical-necessity'],
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'nursing', 'adaptive-aids', 'minor-home-mods'],
      },
      {
        id: 'tx-hcs',
        name: 'Home and Community-based Services',
        shortName: 'HCS',
        description: 'For individuals with intellectual disabilities',
        diagnosisRequired: ['intellectual-disability'],
        waitlistMonths: 180, // 15+ year waitlist
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'day-habilitation', 'residential', 'supported-employment'],
      },
    ],
    evvRequired: true,
    evvProvider: 'HHSC EVV System',
    selfDirectionAvailable: true,
    parentAsProviderAllowed: true,
    respiteServicesAvailable: true,
    habilitationServicesAvailable: true,
    medicaidExpansion: false,
    applicationUrl: 'https://www.hhs.texas.gov/services/disability',
    contactPhone: '1-877-438-5658',
    notes: 'Long waitlists for most waiver programs. Interest lists available.',
  },
  FL: {
    state: 'FL',
    stateName: 'Florida',
    waiverPrograms: [
      {
        id: 'fl-apd',
        name: 'Agency for Persons with Disabilities Waiver',
        shortName: 'APD',
        description: 'For individuals with developmental disabilities',
        diagnosisRequired: ['autism', 'intellectual-disability', 'cerebral-palsy', 'spina-bifida', 'prader-willi'],
        waitlistMonths: 84, // 7+ years
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'behavior-services', 'companion', 'supported-living', 'supported-employment'],
      },
      {
        id: 'fl-cdc-plus',
        name: 'Consumer Directed Care Plus',
        shortName: 'CDC+',
        description: 'Self-directed option for APD waiver recipients',
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'personal-care', 'companion', 'therapies'],
      },
    ],
    evvRequired: true,
    evvProvider: 'Sandata',
    selfDirectionAvailable: true,
    parentAsProviderAllowed: true,
    respiteServicesAvailable: true,
    habilitationServicesAvailable: true,
    medicaidExpansion: false,
    applicationUrl: 'https://apd.myflorida.com/',
    contactPhone: '1-866-273-2273',
  },
  NY: {
    state: 'NY',
    stateName: 'New York',
    waiverPrograms: [
      {
        id: 'ny-opwdd',
        name: 'Office for People With Developmental Disabilities Waiver',
        shortName: 'OPWDD',
        description: 'Comprehensive services for developmental disabilities',
        diagnosisRequired: ['developmental-disability'],
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'habilitation', 'day-services', 'supported-employment', 'community-habilitation'],
      },
      {
        id: 'ny-self-direction',
        name: 'Self-Direction',
        shortName: 'SD',
        description: 'Participant-directed budget for OPWDD services',
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'community-habilitation', 'environmental-mods', 'vehicle-mods'],
      },
      {
        id: 'ny-cdpap',
        name: 'Consumer Directed Personal Assistance Program',
        shortName: 'CDPAP',
        description: 'Allows family members to be paid caregivers',
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['personal-care', 'home-health-aide', 'nursing'],
      },
    ],
    evvRequired: true,
    evvProvider: 'HHAeXchange',
    selfDirectionAvailable: true,
    parentAsProviderAllowed: true,
    respiteServicesAvailable: true,
    habilitationServicesAvailable: true,
    medicaidExpansion: true,
    applicationUrl: 'https://opwdd.ny.gov/',
    contactPhone: '1-866-946-9733',
  },
  PA: {
    state: 'PA',
    stateName: 'Pennsylvania',
    waiverPrograms: [
      {
        id: 'pa-autism-waiver',
        name: 'Adult Autism Waiver',
        shortName: 'AAW',
        description: 'For adults 21+ with autism spectrum disorder',
        ageRange: { min: 21 },
        diagnosisRequired: ['autism'],
        selfDirectionOption: true,
        parentPaidOption: false,
        services: ['respite', 'habilitation', 'behavioral-support', 'community-integration'],
      },
      {
        id: 'pa-consolidated',
        name: 'Consolidated Waiver',
        shortName: 'CW',
        description: 'For individuals with intellectual disabilities',
        diagnosisRequired: ['intellectual-disability'],
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'residential', 'day-services', 'supported-employment'],
      },
      {
        id: 'pa-pfds',
        name: 'Person/Family Directed Support Waiver',
        shortName: 'PFDS',
        description: 'Self-directed supports for intellectual disabilities',
        diagnosisRequired: ['intellectual-disability'],
        selfDirectionOption: true,
        parentPaidOption: true,
        annualCap: 35000,
        services: ['respite', 'habilitation', 'supports-coordination', 'unlicensed-home-care'],
      },
    ],
    evvRequired: true,
    evvProvider: 'Sandata',
    selfDirectionAvailable: true,
    parentAsProviderAllowed: true,
    respiteServicesAvailable: true,
    habilitationServicesAvailable: true,
    medicaidExpansion: true,
    applicationUrl: 'https://www.dhs.pa.gov/Services/Disabilities-Aging/',
    contactPhone: '1-800-692-7462',
  },
  OH: {
    state: 'OH',
    stateName: 'Ohio',
    waiverPrograms: [
      {
        id: 'oh-self-empowered',
        name: 'Self-Empowered Life Funding Waiver',
        shortName: 'SELF',
        description: 'Self-directed waiver for developmental disabilities',
        diagnosisRequired: ['developmental-disability'],
        selfDirectionOption: true,
        parentPaidOption: true,
        annualCap: 50000,
        services: ['respite', 'remote-support', 'vocational', 'transportation', 'adult-day'],
      },
      {
        id: 'oh-io',
        name: 'Individual Options Waiver',
        shortName: 'IO',
        description: 'Comprehensive services for developmental disabilities',
        diagnosisRequired: ['developmental-disability'],
        selfDirectionOption: false,
        parentPaidOption: false,
        services: ['residential', 'day-services', 'vocational', 'adult-day'],
      },
      {
        id: 'oh-level-one',
        name: 'Level One Waiver',
        shortName: 'L1',
        description: 'Lower-cost option for developmental disabilities',
        diagnosisRequired: ['developmental-disability'],
        selfDirectionOption: true,
        parentPaidOption: true,
        annualCap: 10000,
        services: ['respite', 'transportation', 'adult-day'],
      },
    ],
    evvRequired: true,
    evvProvider: 'Sandata',
    selfDirectionAvailable: true,
    parentAsProviderAllowed: true,
    respiteServicesAvailable: true,
    habilitationServicesAvailable: true,
    medicaidExpansion: true,
    applicationUrl: 'https://dodd.ohio.gov/',
    contactPhone: '1-800-617-6733',
  },
  CO: {
    state: 'CO',
    stateName: 'Colorado',
    waiverPrograms: [
      {
        id: 'co-cwd',
        name: 'Children with Autism Waiver',
        shortName: 'CWA',
        description: 'For children under 6 with autism',
        ageRange: { min: 0, max: 5 },
        diagnosisRequired: ['autism'],
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['behavior-services', 'respite', 'therapies', 'parent-training'],
      },
      {
        id: 'co-sus',
        name: 'Supported Living Services',
        shortName: 'SLS',
        description: 'For individuals with developmental disabilities',
        diagnosisRequired: ['developmental-disability'],
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'habilitation', 'day-services', 'job-coaching'],
      },
      {
        id: 'co-cwd-dd',
        name: 'Children with Developmental Disabilities',
        shortName: 'CWD-DD',
        description: 'For children with developmental disabilities or delays',
        ageRange: { min: 0, max: 17 },
        diagnosisRequired: ['developmental-disability', 'developmental-delay'],
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'habilitation', 'therapies'],
      },
    ],
    evvRequired: true,
    evvProvider: 'Sandata',
    selfDirectionAvailable: true,
    parentAsProviderAllowed: true,
    respiteServicesAvailable: true,
    habilitationServicesAvailable: true,
    medicaidExpansion: true,
    applicationUrl: 'https://hcpf.colorado.gov/',
    contactPhone: '1-303-866-3513',
  },
  GA: {
    state: 'GA',
    stateName: 'Georgia',
    waiverPrograms: [
      {
        id: 'ga-now-comp',
        name: 'New Options Waiver - Comprehensive',
        shortName: 'NOW/COMP',
        description: 'For individuals with developmental disabilities',
        diagnosisRequired: ['developmental-disability'],
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'community-living', 'supported-employment', 'behavioral-supports'],
      },
      {
        id: 'ga-icwp',
        name: 'Independent Care Waiver Program',
        shortName: 'ICWP',
        description: 'For adults with physical disabilities',
        ageRange: { min: 21 },
        selfDirectionOption: true,
        parentPaidOption: false,
        services: ['personal-care', 'respite', 'home-modifications'],
      },
    ],
    evvRequired: true,
    evvProvider: 'Sandata',
    selfDirectionAvailable: true,
    parentAsProviderAllowed: true,
    respiteServicesAvailable: true,
    habilitationServicesAvailable: true,
    medicaidExpansion: true,
    applicationUrl: 'https://dbhdd.georgia.gov/',
    contactPhone: '1-404-657-2252',
  },
  NC: {
    state: 'NC',
    stateName: 'North Carolina',
    waiverPrograms: [
      {
        id: 'nc-innovations',
        name: 'Innovations Waiver',
        shortName: 'Innovations',
        description: 'For individuals with intellectual/developmental disabilities',
        diagnosisRequired: ['intellectual-disability', 'developmental-disability'],
        selfDirectionOption: true,
        parentPaidOption: true,
        services: ['respite', 'community-living', 'supported-employment', 'residential'],
      },
      {
        id: 'nc-cap-c',
        name: 'Community Alternatives Program for Children',
        shortName: 'CAP/C',
        description: 'For children who would otherwise require nursing facility care',
        ageRange: { min: 0, max: 20 },
        selfDirectionOption: false,
        parentPaidOption: false,
        services: ['respite', 'personal-care', 'home-modifications'],
      },
    ],
    evvRequired: true,
    evvProvider: 'HHAeXchange',
    selfDirectionAvailable: true,
    parentAsProviderAllowed: true,
    respiteServicesAvailable: true,
    habilitationServicesAvailable: true,
    medicaidExpansion: true,
    applicationUrl: 'https://www.ncdhhs.gov/divisions/mental-health-developmental-disabilities-and-substance-abuse',
    contactPhone: '1-800-662-7030',
  },
  // Additional states can be added as needed
};

/**
 * Get waiver configuration for a state
 */
export function getStateWaiverConfig(state: string): StateWaiverConfig | undefined {
  return STATE_WAIVER_CONFIGS[state.toUpperCase()];
}

/**
 * Get all states with self-direction options
 */
export function getStatesWithSelfDirection(): string[] {
  return Object.keys(STATE_WAIVER_CONFIGS).filter(
    state => STATE_WAIVER_CONFIGS[state].selfDirectionAvailable
  );
}

/**
 * Get all states where parent can be paid provider
 */
export function getStatesWithParentAsPaidProvider(): string[] {
  return Object.keys(STATE_WAIVER_CONFIGS).filter(
    state => STATE_WAIVER_CONFIGS[state].parentAsProviderAllowed
  );
}

/**
 * Get waiver programs for a state filtered by eligibility
 */
export function getEligibleWaiverPrograms(
  state: string,
  options: {
    age?: number;
    diagnosis?: string[];
    needsSelfDirection?: boolean;
    needsParentPaid?: boolean;
  } = {}
): WaiverProgram[] {
  const config = STATE_WAIVER_CONFIGS[state.toUpperCase()];
  if (!config) return [];

  return config.waiverPrograms.filter(program => {
    // Check age range
    if (options.age !== undefined && program.ageRange) {
      if (options.age < program.ageRange.min) return false;
      if (program.ageRange.max !== undefined && options.age > program.ageRange.max) return false;
    }

    // Check self-direction requirement
    if (options.needsSelfDirection && !program.selfDirectionOption) return false;

    // Check parent-paid requirement
    if (options.needsParentPaid && !program.parentPaidOption) return false;

    return true;
  });
}

/**
 * Check if EVV is required for a state
 */
export function isEVVRequired(state: string): boolean {
  const config = STATE_WAIVER_CONFIGS[state.toUpperCase()];
  return config?.evvRequired ?? true; // Default to true (federal mandate)
}

/**
 * Get EVV provider for a state
 */
export function getEVVProvider(state: string): string | undefined {
  return STATE_WAIVER_CONFIGS[state.toUpperCase()]?.evvProvider;
}

/**
 * Feature flag for paid caregiver mode
 */
export function hasPaidCaregiverFeatures(tier: TierType | undefined): boolean {
  // Available to Core and above
  return tier === 'core' || tier === 'pro' || tier === 'proplus';
}

/**
 * Get caregiver auto-report frequency options based on tier
 */
export function getCaregiverReportOptions(tier: TierType | undefined): {
  frequencies: ('daily' | 'weekly' | 'monthly')[];
  maxRecipients: number;
  includesCustomization: boolean;
} {
  const normalized = normalizeTierName(tier || 'free');

  switch (normalized) {
    case 'proplus':
      return {
        frequencies: ['daily', 'weekly', 'monthly'],
        maxRecipients: 10,
        includesCustomization: true,
      };
    case 'pro':
      return {
        frequencies: ['weekly', 'monthly'],
        maxRecipients: 5,
        includesCustomization: true,
      };
    case 'core':
      return {
        frequencies: ['weekly'],
        maxRecipients: 3,
        includesCustomization: false,
      };
    default:
      return {
        frequencies: [],
        maxRecipients: 0,
        includesCustomization: false,
      };
  }
}

// Map UI names back to internal tier types
export function normalizeTierName(tier: string): TierType {
  const normalized = tier.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');

  const mapping: Record<string, TierType> = {
    'free': 'free',
    'starter': 'core',    // Legacy: Starter maps to Core
    'basic': 'core',      // Legacy: Basic maps to Core
    'core': 'core',
    'pro': 'pro',
    'proplus': 'proplus',
    'pro+': 'proplus',
    'familyplan': 'proplus',
    'family': 'proplus',
    'premium': 'proplus',
    'enterprise': 'proplus',
  };

  return mapping[normalized] || 'free';
}

// Get display name for a tier
export function getTierDisplayName(tier?: TierType | string): string {
  if (!tier) return tierDisplayNames.free;

  if (tier in tierDisplayNames) {
    return tierDisplayNames[tier as TierType];
  }

  const normalized = normalizeTierName(tier);
  return tierDisplayNames[normalized];
}

// Get tier pricing (monthly by default)
export function getTierPrice(tier: TierType, billing: 'monthly' | 'yearly' = 'monthly'): number {
  return tierPricing[tier][billing];
}

// Get yearly savings
export function getTierYearlySavings(tier: TierType): number {
  return tierPricing[tier].savings || 0;
}

// Feature definitions for each tier
const tierFeatureMap: Record<TierType, string[]> = {
  free: [
    'limited-ai-chat',        // 5 messages/day
    'basic-daily-plan',       // Pre-set activities only
    'basic-calm-tools',       // 5 calm tools
    'basic-tracking',         // Simple completion tracking
    'community-read-only',    // View community, can't post
  ],
  starter: [
    'limited-ai-chat',        // 20 messages/day
    'basic-daily-plan',
    'custom-tasks',           // Add custom tasks
    'full-calm-tools',        // All calm tools
    'basic-tracking',
    'favorites',              // Save favorites
    'reminders',              // Push notifications
    'community-participate',  // Can post in community
    'basic-reports',          // Weekly summaries
  ],
  core: [
    'unlimited-ai-chat',      // No limits
    'adaptive-daily-plan',    // AI-suggested activities
    'custom-tasks',
    'full-calm-tools',
    'advanced-tracking',      // Detailed progress
    'favorites',
    'reminders',
    'community-participate',
    'full-reports',           // Monthly analytics
    'vault-access',           // Document storage
    'ai-document-analysis',   // AI reads IEPs, medical records
    'multi-child',            // Up to 3 children
    'marketplace-access',     // Book sessions (pay per use)
    'care-plan-export',       // Export for providers
  ],
  pro: [
    'unlimited-ai-chat',
    'adaptive-daily-plan',
    'custom-tasks',
    'full-calm-tools',
    'advanced-tracking',
    'favorites',
    'reminders',
    'community-participate',
    'full-reports',
    'vault-access',
    'ai-document-analysis',
    'multi-child',            // Up to 3 children
    'marketplace-access',
    'care-plan-export',
    'bcba-consult',           // Monthly BCBA session included
    'clinical-reports',       // IEP-ready reports
    'priority-support',       // Faster response
    'early-access',           // Beta features
    'discounted-sessions',    // 20% off marketplace
    'live-ai-video-30',       // 30 min/month Live AI Video
  ],
  proplus: [
    'unlimited-ai-chat',
    'adaptive-daily-plan',
    'custom-tasks',
    'full-calm-tools',
    'advanced-tracking',
    'favorites',
    'reminders',
    'community-participate',
    'full-reports',
    'vault-access',
    'ai-document-analysis',
    'multi-child-unlimited',  // Unlimited children
    'marketplace-access',
    'care-plan-export',
    'bcba-consult',           // Monthly BCBA session included
    'clinical-reports',       // IEP-ready reports
    'priority-support',       // Faster response
    'early-access',           // Beta features
    'discounted-sessions',    // 30% off marketplace
    'live-ai-video-unlimited',// Unlimited Live AI Video
    'human-credit-monthly',   // Monthly human consultation credit
    'expiring-share-links',   // Time-limited secure sharing
    'advanced-analytics',     // Detailed progress analytics
    'api-access',             // API access for integrations
    'dedicated-support',      // Dedicated support channel
  ],
};

// Check if tier has specific feature
export function hasTierFeature(tier: TierType | undefined, feature: string): boolean {
  if (!tier) return false;
  return tierFeatureMap[tier]?.includes(feature) || false;
}

// Get all features for a tier
export function getTierFeatureList(tier: TierType): string[] {
  return tierFeatureMap[tier] || [];
}

// Compare tiers (returns true if tier1 >= tier2)
export function compareTiers(tier1: TierType | undefined, tier2: TierType): boolean {
  const tierLevels: Record<TierType, number> = {
    free: 0,
    starter: 1,
    core: 2,
    pro: 3,
    proplus: 4,
  };

  if (!tier1) return false;
  return tierLevels[tier1] >= tierLevels[tier2];
}

// Get tier level as number (for comparisons)
export function getTierLevel(tier: TierType | undefined): number {
  const tierLevels: Record<TierType, number> = {
    free: 0,
    starter: 1,
    core: 2,
    pro: 3,
    proplus: 4,
  };
  return tier ? tierLevels[tier] : 0;
}

// Get human-readable feature descriptions for paywall/marketing
// Updated: Simplified tier structure (no Starter), Family Plan branding
export function getTierFeatureDescriptions(tier: TierType): string[] {
  const descriptions: Record<TierType, string[]> = {
    free: [
      'Daily plan with curated activities',
      '5 AI chat messages per day',
      'Basic calm tools for stressful moments',
      'Track daily progress',
      '7-day free trial of Core included',
    ],
    starter: [ // Legacy: Same as Core
      '7-day free trial included',
      'Unlimited AI chat (text & voice)',
      'AI reads your IEPs & medical records',
      'Adaptive plans that learn what works',
      'Book BCBA/RBT sessions (pay per use)',
      'Support up to 3 children',
      'Export care plans for providers',
      'HSA/FSA eligible',
    ],
    core: [
      '7-day free trial included',
      'Unlimited AI chat (text & voice)',
      'AI reads your IEPs & medical records',
      'Adaptive plans that learn what works',
      'Book BCBA/RBT sessions (pay per use)',
      'Support up to 3 children',
      'Export care plans for providers',
      'HSA/FSA eligible',
    ],
    pro: [
      'Everything in Core, plus:',
      'One monthly BCBA consultation included',
      'Live Expert Video Sessions (with AI notes)',
      'Provider-ready clinical reports',
      '20% off all marketplace sessions',
      'Priority support',
      'HSA/FSA eligible',
    ],
    proplus: [
      'Everything in Pro, plus:',
      'Unlimited children profiles',
      'Unlimited expert video sessions',
      'Monthly human consultation credit',
      '30% off all marketplace sessions',
      'Time-limited secure sharing links',
      'Advanced analytics dashboard',
      'Dedicated support channel',
      'Perfect for families with multiple children',
    ],
  };

  return descriptions[tier] || descriptions.free;
}

// Check if tier has free trial available
export function hasFreeTrialAvailable(tier: TierType): boolean {
  return tierPricing[tier]?.hasTrial === true;
}

// Get trial duration in days
export function getTrialDurationDays(): number {
  return TRIAL_CONFIG.durationDays;
}

// Check if tier is HSA/FSA eligible
export function isHSAFSAEligible(tier: TierType | undefined): boolean {
  if (!tier) return false;
  return HSA_FSA_CONFIG.eligibleTiers.includes(tier);
}

// Get HSA/FSA eligibility note
export function getHSAFSANote(): string {
  return HSA_FSA_CONFIG.eligibilityNote;
}

// Get AI message limits per tier
export function getAIMessageLimit(tier: TierType | undefined): number | null {
  const limits: Record<TierType, number | null> = {
    free: 5,
    starter: 20,
    core: null,    // unlimited
    pro: null,     // unlimited
    proplus: null, // unlimited
  };
  return tier ? limits[tier] : 5;
}

// Check if tier has unlimited AI
export function hasUnlimitedAI(tier: TierType | undefined): boolean {
  return tier === 'core' || tier === 'pro' || tier === 'proplus';
}

// Get Live AI Video limits per tier (minutes per month)
export function getLiveAIVideoLimit(tier: TierType | undefined): number | null {
  const limits: Record<TierType, number | null> = {
    free: 0,       // No Live AI Video
    starter: 0,    // No Live AI Video
    core: 0,       // No Live AI Video (pay per use via marketplace)
    pro: 30,       // 30 minutes/month included
    proplus: null, // unlimited
  };
  return tier ? limits[tier] : 0;
}

// Check if tier has Live AI Video access
export function hasLiveAIVideo(tier: TierType | undefined): boolean {
  return tier === 'pro' || tier === 'proplus';
}

// Get the recommended tier (for highlighting in UI)
export function getRecommendedTier(): TierType {
  return 'core';
}

// Get upgrade path from current tier (simplified: Free → Core → Pro → Family Plan)
export function getUpgradePath(currentTier: TierType): TierType | null {
  const upgradePaths: Record<TierType, TierType | null> = {
    free: 'core',      // Skip Starter, go directly to Core
    starter: 'core',   // Legacy: Starter → Core (effectively same tier now)
    core: 'pro',
    pro: 'proplus',
    proplus: null,
  };
  return upgradePaths[currentTier];
}

// Get marketplace discount percentage by tier
export function getMarketplaceDiscount(tier: TierType | undefined): number {
  const discounts: Record<TierType, number> = {
    free: 0,
    starter: 0,
    core: 0,
    pro: 20,     // 20% off
    proplus: 30, // 30% off
  };
  return tier ? discounts[tier] : 0;
}

// Check if tier includes BCBA consultation
export function includesBCBAConsult(tier: TierType | undefined): boolean {
  return tier === 'pro' || tier === 'proplus';
}

// Get max children allowed per tier
export function getMaxChildren(tier: TierType | undefined): number | null {
  const limits: Record<TierType, number | null> = {
    free: 1,
    starter: 3,    // Legacy: same as Core
    core: 3,
    pro: 3,
    proplus: null, // unlimited (Family Plan)
  };
  return tier ? limits[tier] : 1;
}

// Alias for hasTierFeature (used in many components)
export function hasFeature(tier: TierType | undefined, feature: string): boolean {
  return hasTierFeature(tier, feature);
}

// Get active tiers for pricing display (excludes deprecated Starter)
export function getActiveTiers(): TierType[] {
  return ['free', 'core', 'pro', 'proplus'];
}

// Get tier marketing tagline
export function getTierTagline(tier: TierType): string {
  const taglines: Record<TierType, string> = {
    free: 'Get started free',
    starter: 'Start your journey', // Legacy
    core: 'Most popular',
    pro: 'For serious progress',
    proplus: 'Perfect for families',
  };
  return taglines[tier] || '';
}

// Check if tier qualifies for trial
export function qualifiesForTrial(tier: TierType | undefined): boolean {
  // Only Free tier users qualify for the 7-day trial
  return tier === 'free' || !tier;
}
