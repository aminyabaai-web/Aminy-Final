// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * STATE_CONFIGS — National coverage for the Just Diagnosed flow and Benefits Navigator.
 *
 * Every US state + DC is represented. Depth varies:
 *   - Priority states (AZ, CA, TX, FL, NY, IL, PA, OH, GA, NC, MI, WA, CO): full detail
 *   - All other states: Medicaid name + DD agency + ABA coverage flag
 *
 * When adding a new state partner, extend the statePartners array in the state's entry.
 */

export type EVVSystem =
  | 'dci'           // Direct Care Innovations (AZ primary)
  | 'sandata'       // Sandata Technologies (many states)
  | 'hhaexchange'   // HHAeXchange (TX, FL, NY, IL...)
  | 'spokchoice'    // SpokChoice (AZ self-directed)
  | 'ppl'           // Public Partnerships LLC (fiscal intermediary, many states)
  | 'acumen'        // Acumen Fiscal Agent (self-directed, many states)
  | 'kalea'         // Kalea (CA, some western states)
  | 'pointclickcare'// PointClickCare (many states)
  | 'tellus'        // Tellus (some states)
  | 'conduent'      // Conduent (some states)
  | 'netsmart'      // Netsmart (behavioral health)
  | 'hchb'          // HomeCareBadge
  | 'authenticare'  // AuthentiCare (some states)
  | 'other';

export interface StateWaiverProgram {
  name: string;
  abbreviation: string;
  description: string;
  selfDirected?: string;        // name of self-directed option if available
  selfDirectedFI?: string;      // fiscal intermediary for self-direction
  estimatedWaitMonths?: number; // realistic wait time
  ageLimit?: number;            // age cap for services (null = no limit)
  url?: string;
}

export interface StateMedicaid {
  name: string;                 // e.g., "AHCCCS" not "Arizona Medicaid"
  abbreviation?: string;
  abaCovered: boolean;          // covered for children under 21
  abaAgeLimit?: number;         // age cap for ABA specifically
  mcoPayers?: string[];         // managed care organizations
  url?: string;
}

export interface StateDDAgency {
  name: string;
  abbreviation: string;
  phone?: string;
  url?: string;
  intakeProcess: string;        // brief description of how to get started
}

export interface StateConfig {
  name: string;
  abbreviation: string;
  medicaid: StateMedicaid;
  ddAgency: StateDDAgency;
  waiver: StateWaiverProgram;
  evvSystems: EVVSystem[];       // systems in use in this state
  selfDirectedEVV?: EVVSystem;   // EVV for self-directed specifically
  schoolSystemNote?: string;     // state-specific IEP/special ed note
  abaMandateLaw?: string;        // commercial insurance mandate reference
  keyResources?: Array<{ label: string; url: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE CONFIGS
// ─────────────────────────────────────────────────────────────────────────────

export const STATE_CONFIGS: Record<string, StateConfig> = {

  AZ: {
    name: 'Arizona',
    abbreviation: 'AZ',
    medicaid: {
      name: 'AHCCCS',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Mercy Care', 'Banner University Health Plans', 'UnitedHealthcare Community Plan', 'Magellan/Optum', 'Health Net', 'Blue Cross Blue Shield of AZ', 'Cigna', 'Aetna', 'Centene/Ambetter'],
      url: 'https://www.azahcccs.gov',
    },
    ddAgency: {
      name: 'Division of Developmental Disabilities',
      abbreviation: 'DDD',
      phone: '602-542-6853',
      url: 'https://des.az.gov/services/disability/developmental-disabilities',
      intakeProcess: 'Call DDD to request an eligibility determination. If eligible, DDD assigns a Support Coordinator who helps access ALTCS waiver services.',
    },
    waiver: {
      name: 'Arizona Long Term Care System',
      abbreviation: 'ALTCS',
      description: 'Arizona\'s HCBS Medicaid waiver for individuals with developmental disabilities. Covers ABA, respite, attendant care, transportation, and more.',
      selfDirected: 'Self-Directed Attendant Care (SDAC)',
      selfDirectedFI: 'SpokChoice or DCI',
      estimatedWaitMonths: 0,   // AZ has no ALTCS waitlist (mandatory income-eligible)
      ageLimit: undefined,
      url: 'https://des.az.gov/services/disability/developmental-disabilities/home-community-based-services',
    },
    evvSystems: ['dci', 'spokchoice'],
    selfDirectedEVV: 'spokchoice',
    schoolSystemNote: 'Arizona Department of Education ensures FAPE under IDEA. Private day programs (ABA schools like SEED) can be an IEP placement. Request an IEP evaluation in writing within 60 days of request.',
    abaMandateLaw: 'ARS § 20-826.03 — ABA covered by most commercial plans. AHCCCS covers ABA for ALTCS enrollees under 21.',
    keyResources: [
      { label: 'AHCCCS Member Portal', url: 'https://www.healthearizonaplus.gov' },
      { label: 'DDD Apply', url: 'https://des.az.gov/apply-services' },
      { label: 'AZ Dept of Education Special Ed', url: 'https://www.azed.gov/specialeducation' },
    ],
  },

  CA: {
    name: 'California',
    abbreviation: 'CA',
    medicaid: {
      name: 'Medi-Cal',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['L.A. Care Health Plan', 'Blue Shield of CA Promise', 'Anthem Blue Cross', 'Health Net', 'Molina', 'IEHP', 'Alameda Alliance', 'CalOptima'],
      url: 'https://www.dhcs.ca.gov/individuals/Pages/MMCDAppealsAndGrievances.aspx',
    },
    ddAgency: {
      name: 'Department of Developmental Services / Regional Centers',
      abbreviation: 'DDS / RC',
      phone: '916-654-1987',
      url: 'https://www.dds.ca.gov',
      intakeProcess: 'Contact your local Regional Center (21 centers across CA). Regional Centers provide services BEFORE and independent of Medi-Cal — call immediately after diagnosis regardless of income.',
    },
    waiver: {
      name: 'Home and Community Based Alternatives / ID-DD Waiver',
      abbreviation: 'HCBA',
      description: 'California\'s HCBS waiver operated through Regional Centers. Regional Center services are primarily funded through the Lanterman Act, a state-specific entitlement separate from Medicaid.',
      selfDirected: 'Self-Determination Program (SDP)',
      selfDirectedFI: 'Fiscal Management Services agency (FMS)',
      estimatedWaitMonths: 0,   // Regional Centers have no waitlist — it\'s an entitlement
      url: 'https://www.dds.ca.gov/consumers/self-determination-program',
    },
    evvSystems: ['sandata', 'hhaexchange', 'kalea'],
    selfDirectedEVV: 'kalea',
    schoolSystemNote: 'California has among the strongest special ed protections. Families can request an IEP evaluation at any time. Private ABA schools can be an IEP placement paid by the school district.',
    abaMandateLaw: 'CA Insurance Code § 10144.51 — ABA covered by commercial plans with no age limit. Medi-Cal covers ABA for children under 21.',
    keyResources: [
      { label: 'Regional Center Locator', url: 'https://www.dds.ca.gov/rc/listings' },
      { label: 'Self-Determination Program', url: 'https://www.dds.ca.gov/consumers/self-determination-program' },
      { label: 'CA Dept of Ed Special Ed', url: 'https://www.cde.ca.gov/sp/se' },
    ],
  },

  TX: {
    name: 'Texas',
    abbreviation: 'TX',
    medicaid: {
      name: 'Texas Medicaid (STAR / STAR+PLUS)',
      abaCovered: true,
      abaAgeLimit: 20,
      mcoPayers: ['Molina Healthcare of Texas', 'UnitedHealthcare', 'BCBS of Texas', 'Driscoll Health Plan', 'Cook Children\'s Health Plan', 'Community First Health Plans'],
      url: 'https://hhs.texas.gov/medicaid',
    },
    ddAgency: {
      name: 'Texas Health and Human Services (IDD Services)',
      abbreviation: 'HHSC / LIDDA',
      phone: '2-1-1',
      url: 'https://hhs.texas.gov/intellectual-developmental-disabilities',
      intakeProcess: 'Contact your local LIDDA (Local IDD Authority) to start the eligibility process. Texas HCS waiver has a long waitlist — apply immediately after diagnosis.',
    },
    waiver: {
      name: 'Home and Community-based Services (HCS) Waiver',
      abbreviation: 'HCS',
      description: 'Texas\'s primary HCBS waiver for individuals with intellectual/developmental disabilities. Includes ABA, day programs, respite.',
      selfDirected: 'Consumer Directed Services (CDS)',
      selfDirectedFI: 'Acumen or PPL (Public Partnerships)',
      estimatedWaitMonths: 120, // TX HCS waitlist is notoriously long — 10+ years
      url: 'https://hhs.texas.gov/providers/long-term-care-providers/home-community-based-services-hcs',
    },
    evvSystems: ['hhaexchange', 'sandata'],
    selfDirectedEVV: 'hhaexchange',
    schoolSystemNote: 'Apply for special ed evaluation in writing to the school district. Texas has 60-day timeline from consent. ARD (Admission, Review, Dismissal) committee = IEP team in Texas terminology.',
    abaMandateLaw: 'TX Insurance Code § 1355 — ABA covered by most commercial plans.',
    keyResources: [
      { label: 'LIDDA Locator', url: 'https://hhs.texas.gov/providers/intellectual-developmental-disability-services/local-idd-authority-lidda' },
      { label: 'TX Medicaid Apply', url: 'https://yourtexasbenefits.com' },
    ],
  },

  FL: {
    name: 'Florida',
    abbreviation: 'FL',
    medicaid: {
      name: 'Florida Medicaid',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['WellCare', 'Humana', 'Sunshine Health', 'Simply Healthcare', 'Molina', 'Staywell'],
      url: 'https://www.flmedicaidmanagedcare.com',
    },
    ddAgency: {
      name: 'Agency for Persons with Disabilities',
      abbreviation: 'APD',
      phone: '1-866-APD-CARES',
      url: 'https://apd.myflorida.com',
      intakeProcess: 'Apply for APD services at apd.myflorida.com. Waitlist can be long — apply as early as possible.',
    },
    waiver: {
      name: 'iBudget Waiver (Individualized Budget)',
      abbreviation: 'iBudget',
      description: 'Florida\'s HCBS waiver with individualized budgets for each enrolled person. Covers behavioral services, respite, ADL support.',
      selfDirected: 'Consumer-Directed Care Plus (CDC+)',
      selfDirectedFI: 'Public Partnerships LLC (PPL)',
      estimatedWaitMonths: 36,
      url: 'https://apd.myflorida.com/waiver',
    },
    evvSystems: ['sandata'],
    selfDirectedEVV: 'sandata',
    schoolSystemNote: 'Florida has a Gardiner (now Family Empowerment) scholarship for private school tuition. Worth exploring as an IEP alternative.',
    abaMandateLaw: 'FL Statute § 627.6686 — ABA covered by most commercial plans.',
    keyResources: [
      { label: 'APD Services Apply', url: 'https://apd.myflorida.com/apply' },
      { label: 'FL Medicaid Apply', url: 'https://www.myflorida.com/accessflorida' },
    ],
  },

  NY: {
    name: 'New York',
    abbreviation: 'NY',
    medicaid: {
      name: 'New York Medicaid',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['MetroPlus', 'Fidelis Care', 'Molina', 'WellCare', 'Healthfirst', 'EmblemHealth'],
      url: 'https://www.health.ny.gov/health_care/medicaid',
    },
    ddAgency: {
      name: 'Office for People with Developmental Disabilities',
      abbreviation: 'OPWDD',
      phone: '518-473-1997',
      url: 'https://opwdd.ny.gov',
      intakeProcess: 'Contact OPWDD for eligibility determination. NYS also has Early Intervention (birth–3) and CPSE/CSE (3+) processes through the school system.',
    },
    waiver: {
      name: 'OPWDD HCBS Waiver',
      abbreviation: 'OPWDD Waiver',
      description: 'NY\'s Medicaid HCBS waiver for individuals with developmental disabilities. Includes community habilitation, respite, supported employment.',
      selfDirected: 'Self-Directed Supports (SDS)',
      selfDirectedFI: 'Fiscal Intermediary (FI) — various approved agencies',
      estimatedWaitMonths: 24,
      url: 'https://opwdd.ny.gov/services-supports/self-direction',
    },
    evvSystems: ['hhaexchange', 'sandata'],
    schoolSystemNote: 'NY has Early Intervention (birth–3) and CPSE (3–5). IEP timeline is 60 days from consent. New York City has specialized programs through DOE.',
    abaMandateLaw: 'NY Insurance Law § 3235-a — ABA covered by commercial plans.',
    keyResources: [
      { label: 'OPWDD Self-Direction', url: 'https://opwdd.ny.gov/services-supports/self-direction' },
      { label: 'NY Early Intervention', url: 'https://www.health.ny.gov/community/infants_children/early_intervention' },
    ],
  },

  IL: {
    name: 'Illinois',
    abbreviation: 'IL',
    medicaid: {
      name: 'Illinois Medicaid',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Blue Cross Community Health Plans', 'CountyCare', 'Meridian Health Plan', 'Molina', 'NextLevel Health'],
      url: 'https://www.illinoismedicaid.com',
    },
    ddAgency: {
      name: 'Division of Developmental Disabilities (DHS/DDD)',
      abbreviation: 'DHS/DDD',
      phone: '1-800-843-6154',
      url: 'https://www.dhs.state.il.us/page.aspx?item=29868',
      intakeProcess: 'Contact DHS/DDD for eligibility. Illinois has multiple waivers (CILA, PUNS) — apply early as PUNS waitlist can be long.',
    },
    waiver: {
      name: 'Home Services Program / PUNS Waiver',
      abbreviation: 'HSP / PUNS',
      description: 'Illinois\'s HCBS program includes Home Services Program (HSP) and Portfolio of Unduplicated Needs and Services (PUNS) for DD individuals.',
      selfDirected: 'Self-Directed Option',
      estimatedWaitMonths: 48,
    },
    evvSystems: ['hhaexchange', 'sandata'],
    schoolSystemNote: 'Illinois uses IEP process under IDEA. Chicago Public Schools has specialized autism programs.',
    abaMandateLaw: 'IL Insurance Code 215 ILCS 5/370c.1 — ABA covered by commercial plans.',
  },

  PA: {
    name: 'Pennsylvania',
    abbreviation: 'PA',
    medicaid: {
      name: 'Pennsylvania Medicaid (Medical Assistance)',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Amerihealth Caritas', 'Geisinger', 'Highmark Wholecare', 'UPMC for You', 'Molina', 'Vista'],
      url: 'https://www.dhs.pa.gov/Services/Assistance/Pages/Medical-Assistance.aspx',
    },
    ddAgency: {
      name: 'Office of Developmental Programs',
      abbreviation: 'ODP',
      phone: '1-888-565-9559',
      url: 'https://www.dhs.pa.gov/Services/Disabilities-Special-Needs/Pages/Intellectual-Disabilities.aspx',
      intakeProcess: 'Contact ODP or your County MH/IDD office to request eligibility. PA has multiple waivers with waitlists.',
    },
    waiver: {
      name: 'Consolidated / P/FDS Waiver',
      abbreviation: 'P/FDS',
      description: 'Pennsylvania\'s Person/Family Directed Support waiver for IDD individuals.',
      selfDirected: 'Participant Directed Services (PDS)',
      selfDirectedFI: 'PPL (Public Partnerships LLC)',
      estimatedWaitMonths: 60,
    },
    evvSystems: ['sandata'],
    selfDirectedEVV: 'sandata',
    abaMandateLaw: 'PA Insurance Code — ABA covered for children with autism.',
  },

  OH: {
    name: 'Ohio',
    abbreviation: 'OH',
    medicaid: {
      name: 'Ohio Medicaid',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Buckeye Health Plan', 'CareSource', 'Molina', 'UnitedHealthcare Community Plan', 'Paramount', 'AultCare'],
      url: 'https://medicaid.ohio.gov',
    },
    ddAgency: {
      name: 'County Board of Developmental Disabilities',
      abbreviation: 'County DD Board',
      url: 'https://dodd.ohio.gov',
      intakeProcess: 'Contact your county DD Board (88 counties each have a board). County boards provide services locally and determine eligibility for state waivers.',
    },
    waiver: {
      name: 'Individual Options Waiver (IO) / Level 1 Waiver',
      abbreviation: 'IO Waiver',
      description: 'Ohio\'s HCBS waivers provide support for individuals with IDD to live in the community.',
      selfDirected: 'Individual Options Self-Directed',
      selfDirectedFI: 'Acumen or PPL',
      estimatedWaitMonths: 36,
    },
    evvSystems: ['sandata', 'hhaexchange'],
    abaMandateLaw: 'ORC § 3923.28 — ABA covered by commercial plans.',
  },

  GA: {
    name: 'Georgia',
    abbreviation: 'GA',
    medicaid: {
      name: 'Georgia Medicaid (Georgia Gateway)',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Amerigroup', 'Wellcare', 'Peach State Health Management (Centene)', 'CareSource', 'Molina'],
    },
    ddAgency: {
      name: 'Division of Developmental Disabilities (DBHDD)',
      abbreviation: 'DBHDD/DDD',
      phone: '404-657-2252',
      url: 'https://dbhdd.georgia.gov/i-have-intellectual-or-developmental-disability',
      intakeProcess: 'Contact DBHDD to request a Support Coordination agency. Georgia has a NEW Option and a Comprehensive Support Waiver.',
    },
    waiver: {
      name: 'NOW/COMP Waivers',
      abbreviation: 'NOW/COMP',
      description: 'Georgia\'s New Options Waiver (NOW) and Comprehensive Supports Waiver (COMP) provide community-based services for IDD individuals.',
      selfDirected: 'Self-Directed Supports',
      estimatedWaitMonths: 60,
    },
    evvSystems: ['sandata', 'hhaexchange'],
    abaMandateLaw: 'GA Code § 33-24-59.2 — ABA covered.',
  },

  NC: {
    name: 'North Carolina',
    abbreviation: 'NC',
    medicaid: {
      name: 'NC Medicaid / NC Medicaid Managed Care',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Aetna Better Health', 'AmeriHealth Caritas', 'Carolina Complete Health', 'Healthy Blue (BCBS)', 'United Healthcare Community'],
    },
    ddAgency: {
      name: 'NC DHHS Division of Mental Health/DD/SAS',
      abbreviation: 'NCDHHS/DMH',
      url: 'https://www.ncdhhs.gov/divisions/mental-health-developmental-disabilities-and-substance-abuse-services',
      intakeProcess: 'Contact your Local Management Entity/Managed Care Organization (LME/MCO) for IDD services.',
    },
    waiver: {
      name: 'Innovations Waiver',
      abbreviation: 'Innovations',
      description: 'NC\'s Innovations Waiver provides community-based support for individuals with IDD.',
      selfDirected: 'Supported Employment/Self-Directed Supports',
      estimatedWaitMonths: 72,
    },
    evvSystems: ['sandata'],
    abaMandateLaw: 'NC Gen. Stat. § 58-51-57 — ABA covered.',
  },

  MI: {
    name: 'Michigan',
    abbreviation: 'MI',
    medicaid: {
      name: 'Michigan Medicaid (Healthy Michigan Plan)',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Aetna Better Health', 'Blue Cross Complete', 'Meridian', 'Molina', 'UnitedHealthcare Community', 'McLaren', 'Priority Health'],
    },
    ddAgency: {
      name: 'Community Mental Health (CMH) / Prepaid Inpatient Health Plans',
      abbreviation: 'CMH / PIHP',
      url: 'https://www.michigan.gov/mdhhs/adult-child-serv/disability-services/idd',
      intakeProcess: 'Contact your local Community Mental Health agency. Michigan operates through PIHPs/CMHSPs for IDD services.',
    },
    waiver: {
      name: 'MI Choice Waiver',
      abbreviation: 'MI Choice',
      description: 'Michigan\'s HCBS waiver provides in-home supports to prevent institutionalization.',
      selfDirected: 'Self-Determination Supports',
      estimatedWaitMonths: 24,
    },
    evvSystems: ['hhaexchange', 'sandata'],
    abaMandateLaw: 'MI Insurance Code — ABA covered by commercial plans.',
  },

  WA: {
    name: 'Washington',
    abbreviation: 'WA',
    medicaid: {
      name: 'Apple Health (Washington Medicaid)',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Molina Healthcare of Washington', 'Community Health Plan', 'Coordinated Care', 'Premera BlueCross', 'UnitedHealthcare'],
    },
    ddAgency: {
      name: 'Developmental Disabilities Administration',
      abbreviation: 'DDA',
      phone: '1-800-737-0617',
      url: 'https://www.dshs.wa.gov/altsa/developmental-disabilities-administration',
      intakeProcess: 'Contact DDA for eligibility determination. Washington has a Core Waiver and Community Protection Waiver.',
    },
    waiver: {
      name: 'Core Waiver / Community Protection Waiver',
      abbreviation: 'Core Waiver',
      description: 'Washington State\'s HCBS waivers for individuals with developmental disabilities.',
      selfDirected: 'Individual Provider (IP) Model',
      estimatedWaitMonths: 12,
    },
    evvSystems: ['sandata'],
    abaMandateLaw: 'RCW 48.43.045 — ABA covered by commercial plans.',
  },

  CO: {
    name: 'Colorado',
    abbreviation: 'CO',
    medicaid: {
      name: 'Health First Colorado (Colorado Medicaid)',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Rocky Mountain Health Plans', 'Colorado Access', 'Community Health Plan of the Rockies', 'Denver Health Medical Plan'],
    },
    ddAgency: {
      name: 'Office of Community Living (OCL) / Regional Centers',
      abbreviation: 'OCL',
      url: 'https://hcpf.colorado.gov/long-term-services-and-supports',
      intakeProcess: 'Contact your county Community Centered Board (CCB). CCBs enroll individuals for DD waivers and connect to services.',
    },
    waiver: {
      name: 'Supported Living Services (SLS) / Children\'s Extensive Support (CES) Waiver',
      abbreviation: 'SLS / CES',
      description: 'Colorado\'s HCBS waivers — CES is specifically for children under 18 with significant support needs.',
      selfDirected: 'Participant Directed Program (PDP)',
      selfDirectedFI: 'PPL Colorado',
      estimatedWaitMonths: 18,
    },
    evvSystems: ['hhaexchange'],
    selfDirectedEVV: 'hhaexchange',
    abaMandateLaw: 'CRS § 10-16-104 — ABA covered.',
  },

  MN: {
    name: 'Minnesota',
    abbreviation: 'MN',
    medicaid: {
      name: 'Minnesota Medicaid (MA)',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Blue Plus (BCBS)', 'HealthPartners', 'Medica', 'UCare', 'Hennepin Health'],
    },
    ddAgency: {
      name: 'Disability Services Division (DHS)',
      abbreviation: 'DHS/DSD',
      url: 'https://mn.gov/dhs/people-we-serve/adults/services/developmental-disabilities',
      intakeProcess: 'Contact county social services for waiver enrollment. Minnesota uses Lead Agencies (counties or tribes) for DD services.',
    },
    waiver: {
      name: 'Developmental Disabilities (DD) Waiver / CADI Waiver',
      abbreviation: 'DD/CADI',
      description: 'Minnesota\'s DD Waiver provides community living supports; CADI covers disabilities without DD diagnosis.',
      selfDirected: 'Consumer Directed Community Supports (CDCS)',
      selfDirectedFI: 'Fiscal Support Entity (FSE)',
      estimatedWaitMonths: 12,
    },
    evvSystems: ['sandata'],
    abaMandateLaw: 'MN Statute § 62Q.53 — ABA covered.',
  },

  MA: {
    name: 'Massachusetts',
    abbreviation: 'MA',
    medicaid: {
      name: 'MassHealth',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['BMCHP (Boston Medical)', 'Fallon Health', 'Health New England', 'Tufts Health Together', 'UnitedHealthcare Community'],
    },
    ddAgency: {
      name: 'Department of Developmental Services',
      abbreviation: 'DDS',
      phone: '617-727-5608',
      url: 'https://www.mass.gov/orgs/department-of-developmental-services',
      intakeProcess: 'Apply online at DDS. Massachusetts has Autism Specialist Teams and has no DD waiver waitlist for children in many cases.',
    },
    waiver: {
      name: 'DDS Residential / Day Habilitation Waiver',
      abbreviation: 'DDS Waiver',
      description: 'Massachusetts DDS waivers cover residential support, day programs, respite, and family support.',
      selfDirected: 'Individual Supports (IS) Waiver — self-direction option',
      estimatedWaitMonths: 6,
    },
    evvSystems: ['sandata', 'hhaexchange'],
    abaMandateLaw: 'MGL Chapter 32A/175 — ABA covered.',
  },

  NJ: {
    name: 'New Jersey',
    abbreviation: 'NJ',
    medicaid: {
      name: 'New Jersey Medicaid / NJ FamilyCare',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Aetna Better Health of NJ', 'Amerigroup NJ', 'Horizon NJ Health', 'UnitedHealthcare Community NJ', 'WellCare NJ'],
    },
    ddAgency: {
      name: 'Division of Developmental Disabilities',
      abbreviation: 'NJDHS/DDD',
      url: 'https://www.nj.gov/humanservices/ddd/home',
      intakeProcess: 'Register with NJ DDD as early as possible. NJ operates a fee-for-service system and a Supports Program waiver.',
    },
    waiver: {
      name: 'NJ Supports Program / Comprehensive Supports Waiver',
      abbreviation: 'Supports Program',
      description: 'NJ\'s HCBS waiver options for individuals with IDD.',
      selfDirected: 'Self-Directed Supports',
      estimatedWaitMonths: 36,
    },
    evvSystems: ['hhaexchange', 'sandata'],
    abaMandateLaw: 'NJSA 17B:27-46.1x — ABA covered.',
  },

  VA: {
    name: 'Virginia',
    abbreviation: 'VA',
    medicaid: {
      name: 'Virginia Medicaid / DMAS',
      abaCovered: true,
      abaAgeLimit: 21,
      mcoPayers: ['Aetna Better Health', 'Anthem HealthKeepers Plus', 'CareSource', 'Molina', 'Optima Family Care', 'United Community'],
    },
    ddAgency: {
      name: 'Department of Behavioral Health and Developmental Services',
      abbreviation: 'DBHDS',
      url: 'https://dbhds.virginia.gov/developmental-services',
      intakeProcess: 'Contact your Community Services Board (CSB). CSBs are the local entry points for DD services in Virginia.',
    },
    waiver: {
      name: 'Building Independence / Family and Individual Supports Waiver',
      abbreviation: 'BI/FIS',
      description: 'Virginia\'s HCBS waivers for individuals with IDD — Building Independence and Family and Individual Supports.',
      selfDirected: 'Consumer Direction Option',
      selfDirectedFI: 'Public Partnerships LLC (PPL)',
      estimatedWaitMonths: 60,
    },
    evvSystems: ['sandata'],
    abaMandateLaw: 'VA Code § 38.2-3418.7 — ABA covered.',
  },

  // ─── Remaining states with core data ───────────────────────────────────────

  AL: { name: 'Alabama', abbreviation: 'AL', medicaid: { name: 'Alabama Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Medicaid Home and Community Based Waiver / ADMH', abbreviation: 'ADMH', url: 'https://mh.alabama.gov', intakeProcess: 'Contact Alabama DMH for IDD waiver services.' }, waiver: { name: 'Alabama Home and Community Based Waiver', abbreviation: 'HCBW', description: 'Alabama\'s HCBS waiver for IDD.', estimatedWaitMonths: 60 }, evvSystems: ['sandata'] },
  AK: { name: 'Alaska', abbreviation: 'AK', medicaid: { name: 'Alaska Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Senior and Disabilities Services', abbreviation: 'DSDS', url: 'https://health.alaska.gov/dsds', intakeProcess: 'Contact DSDS for DD waiver services.' }, waiver: { name: 'Alaska HCBS Waiver', abbreviation: 'HCBW', description: 'Alaska\'s HCBS waiver.', estimatedWaitMonths: 24 }, evvSystems: ['sandata'] },
  AR: { name: 'Arkansas', abbreviation: 'AR', medicaid: { name: 'Arkansas Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Developmental Disabilities Services', abbreviation: 'DDS', url: 'https://humanservices.arkansas.gov/about-dhs/dds', intakeProcess: 'Contact DDS for waiver enrollment.' }, waiver: { name: 'Alternative Community Services Waiver', abbreviation: 'ACS', description: 'Arkansas HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  CT: { name: 'Connecticut', abbreviation: 'CT', medicaid: { name: 'HUSKY Health (CT Medicaid)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Department of Developmental Services', abbreviation: 'DDS', url: 'https://portal.ct.gov/dds', intakeProcess: 'Apply with CT DDS. CT has a wait list for adult services; children\'s services are more accessible.' }, waiver: { name: 'Home and Community Based Support Services Waiver', abbreviation: 'HCBSS', description: 'CT\'s HCBS waiver.', estimatedWaitMonths: 48 }, evvSystems: ['sandata'] },
  DC: { name: 'Washington D.C.', abbreviation: 'DC', medicaid: { name: 'DC Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Department on Disability Services (DDA)', abbreviation: 'DDS/DDA', url: 'https://dds.dc.gov', intakeProcess: 'Apply with DC DDA for Home and Community Based waiver.' }, waiver: { name: 'Home and Community Based Waiver', abbreviation: 'HCBW', description: 'DC\'s HCBS waiver for IDD.', estimatedWaitMonths: 24 }, evvSystems: ['sandata'] },
  DE: { name: 'Delaware', abbreviation: 'DE', medicaid: { name: 'Delaware Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Developmental Disabilities Services', abbreviation: 'DDDS', url: 'https://dhss.delaware.gov/dhss/ddds', intakeProcess: 'Apply with DDDS. Delaware has a wait list.' }, waiver: { name: 'Community-Based Long Term Services and Supports Waiver', abbreviation: 'CBLTS', description: 'Delaware\'s HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  HI: { name: 'Hawaii', abbreviation: 'HI', medicaid: { name: 'QUEST Integration (Hawaii Medicaid)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Department of Health / DDDMH', abbreviation: 'DOH/DDDMH', url: 'https://health.hawaii.gov/ddd', intakeProcess: 'Contact DOH Division on Developmental Disabilities.' }, waiver: { name: 'Community Care Services Waiver', abbreviation: 'CCS', description: 'Hawaii\'s HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  IA: { name: 'Iowa', abbreviation: 'IA', medicaid: { name: 'Iowa Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Iowa Medicaid Enterprise / HCBS', abbreviation: 'IME', url: 'https://hhs.iowa.gov/programs/programs-and-services/disability-services', intakeProcess: 'Contact Iowa HHS for HCBS waiver.' }, waiver: { name: 'HCBS Intellectual Disability Waiver', abbreviation: 'ID Waiver', description: 'Iowa\'s HCBS waiver for ID/DD.', estimatedWaitMonths: 24 }, evvSystems: ['hhaexchange'] },
  ID: { name: 'Idaho', abbreviation: 'ID', medicaid: { name: 'Idaho Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Developmental Disabilities (IDHW)', abbreviation: 'IDHW/DDD', url: 'https://healthandwelfare.idaho.gov/services-programs/developmental-disability-services', intakeProcess: 'Apply with Idaho DDD.' }, waiver: { name: 'HCBS Developmental Disabilities Waiver', abbreviation: 'DD Waiver', description: 'Idaho HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  IN: { name: 'Indiana', abbreviation: 'IN', medicaid: { name: 'Indiana Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Bureau of Developmental Disabilities Services', abbreviation: 'BDDS', url: 'https://www.in.gov/fssa/bdds', intakeProcess: 'Apply online with BDDS. Indiana has a wait list for adult waiver services.' }, waiver: { name: 'Community Integration and Habilitation Waiver', abbreviation: 'CIH', description: 'Indiana\'s HCBS waiver.', estimatedWaitMonths: 48 }, evvSystems: ['hhaexchange'] },
  KS: { name: 'Kansas', abbreviation: 'KS', medicaid: { name: 'KanCare (Kansas Medicaid)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Kansas Department for Aging and Disability Services / IDD', abbreviation: 'KDADS', url: 'https://www.kdads.ks.gov/commissions/IDD', intakeProcess: 'Apply with KDADS.' }, waiver: { name: 'HCBS Intellectual Developmental Disability Waiver', abbreviation: 'IDD Waiver', description: 'Kansas HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  KY: { name: 'Kentucky', abbreviation: 'KY', medicaid: { name: 'Kentucky Medicaid (Passport / KYNECT)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Department for Behavioral Health, Developmental and Intellectual Disabilities', abbreviation: 'DBHDID', url: 'https://dbhdid.ky.gov', intakeProcess: 'Contact DBHDID for IDD services.' }, waiver: { name: 'Supports for Community Living Waiver', abbreviation: 'SCL', description: 'Kentucky\'s HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  LA: { name: 'Louisiana', abbreviation: 'LA', medicaid: { name: 'Louisiana Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Office for Citizens with Developmental Disabilities', abbreviation: 'OCDD', url: 'https://ldh.la.gov/page/ocdd', intakeProcess: 'Apply with OCDD at your local Human Services Office.' }, waiver: { name: 'New Opportunities Waiver', abbreviation: 'NOW', description: 'Louisiana\'s HCBS waiver.', estimatedWaitMonths: 48 }, evvSystems: ['sandata'] },
  ME: { name: 'Maine', abbreviation: 'ME', medicaid: { name: 'MaineCare', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Office of Aging and Disability Services', abbreviation: 'OADS', url: 'https://www.maine.gov/dhhs/oads', intakeProcess: 'Contact OADS for adult DD services; OCFS for children.' }, waiver: { name: 'Home and Community Benefits Waiver', abbreviation: 'HCB', description: 'Maine\'s HCBS waiver.', estimatedWaitMonths: 24 }, evvSystems: ['sandata'] },
  MD: { name: 'Maryland', abbreviation: 'MD', medicaid: { name: 'Maryland Medicaid (HealthChoice)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Developmental Disabilities Administration', abbreviation: 'DDA', url: 'https://dda.health.maryland.gov', intakeProcess: 'Apply for DDA services. Maryland has a wait list for adult services.' }, waiver: { name: 'Community Supports Waiver / Family Support Waiver', abbreviation: 'CS/FS', description: 'Maryland\'s HCBS waivers.', estimatedWaitMonths: 48 }, evvSystems: ['sandata'] },
  MO: { name: 'Missouri', abbreviation: 'MO', medicaid: { name: 'Missouri Medicaid (MO HealthNet)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Developmental Disabilities (DMH)', abbreviation: 'DMH/DD', url: 'https://dmh.mo.gov/dd', intakeProcess: 'Contact DMH Division of DD.' }, waiver: { name: 'Individual Supports Waiver / Comprehensive Supports Waiver', abbreviation: 'ISW/CSW', description: 'Missouri\'s HCBS waivers.', estimatedWaitMonths: 48 }, evvSystems: ['sandata'] },
  MS: { name: 'Mississippi', abbreviation: 'MS', medicaid: { name: 'Mississippi Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Bureau of Intellectual and Developmental Disabilities', abbreviation: 'BIDD', url: 'https://www.dmh.ms.gov/service-area/intellectual-developmental-disability', intakeProcess: 'Apply with MS DMH BIDD.' }, waiver: { name: 'Home and Community Based Waiver', abbreviation: 'HCBW', description: 'Mississippi\'s HCBS waiver.', estimatedWaitMonths: 60 }, evvSystems: ['sandata'] },
  MT: { name: 'Montana', abbreviation: 'MT', medicaid: { name: 'Montana Medicaid (Healthy Montana Kids/HELP Act)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Developmental Services Division (DPHHS)', abbreviation: 'DSD', url: 'https://dphhs.mt.gov/dsd', intakeProcess: 'Contact MT DSD.' }, waiver: { name: 'Developmental Disabilities Program Waiver', abbreviation: 'DDP', description: 'Montana\'s HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  NE: { name: 'Nebraska', abbreviation: 'NE', medicaid: { name: 'Nebraska Medicaid (Heritage Health)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Developmental Disabilities (DHHS)', abbreviation: 'DHHS/DDD', url: 'https://dhhs.ne.gov/Pages/Developmental-Disabilities.aspx', intakeProcess: 'Apply with NE DHHS DD division.' }, waiver: { name: 'Community-Based Developmental Disability Services Waiver', abbreviation: 'CDDS', description: 'Nebraska\'s HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  NH: { name: 'New Hampshire', abbreviation: 'NH', medicaid: { name: 'New Hampshire Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Bureau of Developmental Services (DHHS)', abbreviation: 'BDS', url: 'https://www.dhhs.nh.gov/programs-services/developmental-disabilities', intakeProcess: 'Contact your Area Agency for DD services.' }, waiver: { name: 'HCBS Waiver', abbreviation: 'HCBW', description: 'NH\'s HCBS waiver.', estimatedWaitMonths: 24 }, evvSystems: ['sandata'] },
  NM: { name: 'New Mexico', abbreviation: 'NM', medicaid: { name: 'Centennial Care (NM Medicaid)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Developmental Disabilities Supports Division (DDSD)', abbreviation: 'DDSD', url: 'https://www.nmhealth.org/about/ddsd', intakeProcess: 'Contact DDSD for DD waiver. Medically Fragile waiver is also available.' }, waiver: { name: 'DD Waiver / Mi Via (Self-Directed)', abbreviation: 'DD/Mi Via', description: 'NM\'s HCBS waiver with robust self-directed Mi Via option.', selfDirected: 'Mi Via Self-Directed Waiver', estimatedWaitMonths: 24 }, evvSystems: ['hhaexchange'], selfDirectedEVV: 'hhaexchange' },
  NV: { name: 'Nevada', abbreviation: 'NV', medicaid: { name: 'Nevada Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Public and Behavioral Health (IDD Program)', abbreviation: 'DPBH/IDD', url: 'https://dpbh.nv.gov/Programs/ClinicalSAMH/Developmental_Disabilities_Services', intakeProcess: 'Contact DPBH IDD unit.' }, waiver: { name: 'HCBS Intellectual Disabilities Waiver', abbreviation: 'HCBW', description: 'Nevada\'s HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  ND: { name: 'North Dakota', abbreviation: 'ND', medicaid: { name: 'North Dakota Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Developmental Disabilities (DHS)', abbreviation: 'DHS/DD', url: 'https://www.hhs.nd.gov/disability-services/developmental-disabilities', intakeProcess: 'Apply with ND DHS.' }, waiver: { name: 'Medicaid HCBS Waiver', abbreviation: 'HCBW', description: 'ND\'s HCBS waiver.', estimatedWaitMonths: 12 }, evvSystems: ['sandata'] },
  OK: { name: 'Oklahoma', abbreviation: 'OK', medicaid: { name: 'Oklahoma Medicaid (SoonerCare)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Developmental Disabilities Services (DDS)', abbreviation: 'DDS', url: 'https://oklahoma.gov/ohca/programs/sooner-care.html', intakeProcess: 'Apply with OK DDS.' }, waiver: { name: 'DD Services Waiver', abbreviation: 'DD Waiver', description: 'Oklahoma\'s HCBS waiver.', estimatedWaitMonths: 48 }, evvSystems: ['sandata'] },
  OR: { name: 'Oregon', abbreviation: 'OR', medicaid: { name: 'Oregon Health Plan (OHP)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Office of Developmental Disabilities (ODD)', abbreviation: 'ODD/DHS', url: 'https://www.oregon.gov/odhs/dd', intakeProcess: 'Apply for DD services through Oregon DHS. Oregon has a robust self-directed brokerage model.' }, waiver: { name: 'K Plan / ODDS Waiver', abbreviation: 'K Plan', description: 'Oregon\'s HCBS waiver via K Plan.', selfDirected: 'Support Services Brokerage', estimatedWaitMonths: 12 }, evvSystems: ['sandata'] },
  RI: { name: 'Rhode Island', abbreviation: 'RI', medicaid: { name: 'Rhode Island Medicaid (Medicaid)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Developmental Disabilities (BHDDH)', abbreviation: 'BHDDH/DDD', url: 'https://bhddh.ri.gov', intakeProcess: 'Apply with RI BHDDH.' }, waiver: { name: 'Community Supports Waiver', abbreviation: 'CS Waiver', description: 'RI\'s HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  SC: { name: 'South Carolina', abbreviation: 'SC', medicaid: { name: 'South Carolina Medicaid (Healthy Connections)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'SC Dept of Disabilities and Special Needs', abbreviation: 'DDSN', url: 'https://ddsn.sc.gov', intakeProcess: 'Apply with DDSN for eligibility.' }, waiver: { name: 'Intellectual Disability / Related Disabilities Waiver', abbreviation: 'ID/RD', description: 'SC\'s HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  SD: { name: 'South Dakota', abbreviation: 'SD', medicaid: { name: 'South Dakota Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Developmental Disabilities (DSS)', abbreviation: 'DSS/DDD', url: 'https://dss.sd.gov/developmentaldisabilities', intakeProcess: 'Apply with SD DSS.' }, waiver: { name: 'Developmental Disabilities Waiver', abbreviation: 'DD Waiver', description: 'SD\'s HCBS waiver.', estimatedWaitMonths: 12 }, evvSystems: ['sandata'] },
  TN: { name: 'Tennessee', abbreviation: 'TN', medicaid: { name: 'TennCare', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Intellectual Disabilities (DIDD)', abbreviation: 'DIDD', url: 'https://www.tn.gov/didd.html', intakeProcess: 'Apply with DIDD.' }, waiver: { name: 'DIDD Comprehensive Waiver / Supported Living Waiver', abbreviation: 'DIDD', description: 'Tennessee\'s HCBS waiver.', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  UT: { name: 'Utah', abbreviation: 'UT', medicaid: { name: 'Utah Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Services for People with Disabilities (DSPD)', abbreviation: 'DSPD', url: 'https://dspd.utah.gov', intakeProcess: 'Apply with DSPD.' }, waiver: { name: 'Community Supports Waiver', abbreviation: 'CS', description: 'Utah\'s HCBS waiver.', selfDirected: 'Self-Directed Supports', estimatedWaitMonths: 36 }, evvSystems: ['sandata'] },
  VT: { name: 'Vermont', abbreviation: 'VT', medicaid: { name: 'Vermont Medicaid (Green Mountain Care)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Developmental Services (DAIL)', abbreviation: 'DAIL/DS', url: 'https://dail.vermont.gov/programs-services/developmental-services', intakeProcess: 'Designated Agency system — contact your regional DA.' }, waiver: { name: 'Developmental Services HCBS Waiver', abbreviation: 'DS Waiver', description: 'Vermont\'s waiver via Designated Agencies.', selfDirected: 'Flexible Family Funding', estimatedWaitMonths: 12 }, evvSystems: ['sandata'] },
  WI: { name: 'Wisconsin', abbreviation: 'WI', medicaid: { name: 'Wisconsin Medicaid (ForwardHealth)', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Medicaid Services / IRIS Program', abbreviation: 'DMS/IRIS', url: 'https://www.dhs.wisconsin.gov/iris/index.htm', intakeProcess: 'Enroll in Wisconsin\'s Family Care or IRIS self-directed program.' }, waiver: { name: 'Family Care / IRIS (Self-Directed)', abbreviation: 'Family Care / IRIS', description: 'Wisconsin\'s HCBS waivers — IRIS is fully self-directed.', selfDirected: 'IRIS (Include, Respect, I Self-Direct)', selfDirectedFI: 'Fiscal Employer Agent (FEA)', estimatedWaitMonths: 6 }, evvSystems: ['hhaexchange'], selfDirectedEVV: 'hhaexchange' },
  WV: { name: 'West Virginia', abbreviation: 'WV', medicaid: { name: 'West Virginia Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Division of Developmental and Intellectual Disabilities (BMS)', abbreviation: 'DDID/BMS', url: 'https://dhhr.wv.gov/bms/Pages/Intellectual-Developmental-Disability.aspx', intakeProcess: 'Apply with WV BMS.' }, waiver: { name: 'Intellectual/Developmental Disability Waiver', abbreviation: 'IDD', description: 'WV\'s HCBS waiver.', estimatedWaitMonths: 48 }, evvSystems: ['sandata'] },
  WY: { name: 'Wyoming', abbreviation: 'WY', medicaid: { name: 'Wyoming Medicaid', abaCovered: true, abaAgeLimit: 21 }, ddAgency: { name: 'Developmental Disabilities Division (WYDDD)', abbreviation: 'WYDDD', url: 'https://health.wyo.gov/publichealth/cpan/programs/wyoming-developmental-disability-division', intakeProcess: 'Apply with WYDDD.' }, waiver: { name: 'Comprehensive Supports Waiver', abbreviation: 'CS', description: 'Wyoming\'s HCBS waiver.', estimatedWaitMonths: 12 }, evvSystems: ['sandata'] },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** All US state abbreviations (50 states + DC), sorted. */
export const US_STATES: Array<{ abbreviation: string; name: string }> = Object.values(STATE_CONFIGS)
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(s => ({ abbreviation: s.abbreviation, name: s.name }));

/** Get state config by abbreviation (e.g., 'AZ'). Returns undefined for unknown. */
export function getStateConfig(stateAbbr: string): StateConfig | undefined {
  return STATE_CONFIGS[stateAbbr.toUpperCase()];
}

/** First 30 Days action plan — personalized by state, diagnosis type, and what's overwhelming. */
export interface ActionStep {
  priority: 1 | 2 | 3;       // 1 = do this week, 2 = this month, 3 = next 3 months
  category: 'insurance' | 'therapy' | 'school' | 'financial' | 'self-care' | 'community';
  title: string;
  description: string;
  url?: string;
  stateSpecific?: boolean;
}

export function generateFirst30DaysActionPlan(
  stateAbbr: string,
  overwhelms: string[],
  diagnosisAge?: number,  // child's age in years
): ActionStep[] {
  const state = getStateConfig(stateAbbr) || STATE_CONFIGS['AZ']; // fallback
  const steps: ActionStep[] = [];

  // Always-first: contact the DD agency
  steps.push({
    priority: 1,
    category: 'insurance',
    title: `Contact ${state.ddAgency.abbreviation} to start eligibility`,
    description: `${state.ddAgency.intakeProcess} Applying early matters — some states have waitlists. Your Aminy AI can help you prepare what to say.`,
    url: state.ddAgency.url,
    stateSpecific: true,
  });

  // Insurance / Medicaid
  if (overwhelms.includes('insurance') || overwhelms.includes('paying')) {
    steps.push({
      priority: 1,
      category: 'insurance',
      title: `Apply for ${state.medicaid.name} if not already enrolled`,
      description: `${state.medicaid.name} covers ABA therapy${state.medicaid.abaAgeLimit ? ` for children under ${state.medicaid.abaAgeLimit}` : ''}. If you have private insurance, Medicaid can be secondary.`,
      url: state.medicaid.url,
      stateSpecific: true,
    });

    if (state.waiver.selfDirected) {
      steps.push({
        priority: 2,
        category: 'insurance',
        title: `Learn about ${state.waiver.abbreviation} waiver — the "${state.waiver.selfDirected}" option`,
        description: `Self-directed waivers let your family manage care workers and how waiver dollars are spent. ${state.waiver.selfDirectedFI ? `Fiscal intermediary: ${state.waiver.selfDirectedFI}.` : ''} ${state.waiver.estimatedWaitMonths ? `Typical wait: ~${state.waiver.estimatedWaitMonths} months — apply now.` : ''}`,
        url: state.waiver.url,
        stateSpecific: true,
      });
    }
  }

  // ABA therapy
  if (overwhelms.includes('therapy') || overwhelms.includes('finding therapy')) {
    steps.push({
      priority: 1,
      category: 'therapy',
      title: 'Get a BCBA intake appointment',
      description: 'ABA therapy typically starts with a BCBA assessment (3–8 hours). Aminy\'s marketplace can match you with BCBAs who accept your insurance and have availability.',
    });

    steps.push({
      priority: 2,
      category: 'therapy',
      title: 'Request a prior authorization from your insurance',
      description: 'Most insurers require a prior auth for ABA. Your BCBA handles this, but ask them to start the process at intake. Can take 2–6 weeks.',
    });
  }

  // School / IEP
  if (overwhelms.includes('school') || overwhelms.includes('iep') || (diagnosisAge && diagnosisAge >= 2.5)) {
    steps.push({
      priority: 1,
      category: 'school',
      title: 'Request an IEP evaluation in writing from your school district',
      description: `Send a written request for a "special education evaluation" to your school district. Under IDEA (federal law), the district has 60 days to complete the evaluation. You don\'t need to wait for a formal diagnosis to request one. ${state.schoolSystemNote ? state.schoolSystemNote : ''}`,
      stateSpecific: !!state.schoolSystemNote,
    });

    steps.push({
      priority: 2,
      category: 'school',
      title: 'Compare school placement options',
      description: 'Options: public school with IEP support, ABA school (separate day program), private school with district funding. Aminy can help you understand what to ask for at your IEP meeting.',
    });
  }

  // Financial support
  if (overwhelms.includes('paying') || overwhelms.includes('financial')) {
    steps.push({
      priority: 2,
      category: 'financial',
      title: 'Explore ABLE accounts and other financial tools',
      description: 'ABLE accounts let you save up to $18K/year tax-free for disability expenses without affecting Medicaid eligibility. Available in all 50 states. Your Aminy Grant Navigator can find additional funding.',
    });

    steps.push({
      priority: 2,
      category: 'financial',
      title: 'Check if your employer has caregiving benefits',
      description: 'Many employers offer EAP (Employee Assistance Programs), flexible spending accounts, or caregiving stipends. Aminy can help you document your child\'s needs for employer requests.',
    });
  }

  // Understanding diagnosis
  if (overwhelms.includes('understanding') || overwhelms.includes('diagnosis')) {
    steps.push({
      priority: 1,
      category: 'community',
      title: 'Connect with other families who\'ve been here',
      description: 'The Aminy community connects you with parents who navigated the same first weeks. Isolation is common — connection helps.',
    });
  }

  // Self-care
  if (overwhelms.includes('self') || overwhelms.includes('myself')) {
    steps.push({
      priority: 2,
      category: 'self-care',
      title: 'Build in 10 minutes of your own daily reset',
      description: 'You can\'t sustain this if you\'re running on empty. Aminy\'s Calm Corner has breathing tools and short resets. This isn\'t optional — it\'s part of the care plan.',
    });
  }

  // Always add the "ask Aminy" step
  steps.push({
    priority: 1,
    category: 'community',
    title: 'Ask Aminy anything — no question is too basic',
    description: 'DDD eligibility, IEP rights, what ABA therapy actually looks like, how to talk to your child about their diagnosis — Aminy AI knows this world and is here 24/7.',
  });

  return steps.sort((a, b) => a.priority - b.priority);
}

/** Get the AI system prompt context for a given state. Injected into every chat session. */
export function getStateAIContext(stateAbbr: string): string {
  const state = getStateConfig(stateAbbr);
  if (!state) return '';

  return `USER'S STATE: ${state.name} (${state.abbreviation})
MEDICAID: ${state.medicaid.name}${state.medicaid.abaCovered ? ` — covers ABA therapy for children under ${state.medicaid.abaAgeLimit || 21}` : ''}
DD AGENCY: ${state.ddAgency.name} (${state.ddAgency.abbreviation})${state.ddAgency.phone ? ` — Phone: ${state.ddAgency.phone}` : ''}
WAIVER: ${state.waiver.name} (${state.waiver.abbreviation})${state.waiver.estimatedWaitMonths ? ` — typical wait ~${state.waiver.estimatedWaitMonths} months` : ' — no waitlist'}
${state.waiver.selfDirected ? `SELF-DIRECTED OPTION: ${state.waiver.selfDirected}${state.waiver.selfDirectedFI ? ` via ${state.waiver.selfDirectedFI}` : ''}` : ''}
EVV SYSTEMS IN USE: ${state.evvSystems.join(', ')}
${state.schoolSystemNote ? `SCHOOL SYSTEM NOTE: ${state.schoolSystemNote}` : ''}

When the user asks about benefits, insurance, therapy funding, or school services, use this state-specific context. Refer to programs by their correct local names (e.g., "AHCCCS" not "Arizona Medicaid", "DDD" not "the disability agency").`;
}
