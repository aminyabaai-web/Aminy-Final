// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// State-by-state benefits database for autism/neurodivergent services
// Covers top 10 US states by population with autism-specific programs

export interface WaiverProgram {
  name: string;
  description: string;
  coveredServices: string[];
  ageRange: string;
  waitlistInfo?: string;
}

export interface StateBenefitProgram {
  state: string;
  stateAbbr: string;
  medicaidWaivers: WaiverProgram[];
  epsdtServices: string[];
  autismMandate: {
    exists: boolean;
    summary: string;
    ageCap?: number;
    dollarCap?: string;
  };
  coveredServices: {
    id: string;
    name: string;
    typicallyCovered: boolean;
    coverageNotes: string;
  }[];
  eligibilityCriteria: {
    ageRequirements: string;
    diagnosisRequirements: string[];
    incomeRequirements: string;
  };
  applicationSteps: string[];
  contactInfo: {
    agency: string;
    phone: string;
    website: string;
    email?: string;
  };
  keyLegalCitations: string[];
}

export const STATE_BENEFITS: Record<string, StateBenefitProgram> = {
  AZ: {
    state: 'Arizona',
    stateAbbr: 'AZ',
    medicaidWaivers: [
      {
        name: 'Arizona Long Term Care System (ALTCS)',
        description: 'Home and community-based services for individuals with developmental disabilities',
        coveredServices: ['ABA Therapy', 'Speech Therapy', 'Occupational Therapy', 'Respite Care', 'Habilitation', 'Day Programs'],
        ageRange: 'All ages',
        waitlistInfo: 'No formal waitlist; enrollment upon eligibility determination',
      },
      {
        name: 'Division of Developmental Disabilities (DDD)',
        description: 'Comprehensive services for qualifying developmental disabilities including autism',
        coveredServices: ['ABA Therapy', 'Behavioral Health', 'Therapy Services', 'Respite', 'Attendant Care'],
        ageRange: 'All ages',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'Arizona requires commercial insurers to cover autism diagnosis and treatment including ABA. Coverage must include behavioral therapy for children.',
      ageCap: 16,
      dollarCap: '$50,000/year until age 9, $25,000/year ages 9-16',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under autism mandate and Medicaid EPSDT' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through DDD waiver program' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: birth to 16. DDD: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Developmental Disability diagnosis'],
      incomeRequirements: 'Medicaid: up to 138% FPL. DDD: based on functional eligibility, not income.',
    },
    applicationSteps: [
      'Contact Arizona DDD at 1-844-770-9500 for eligibility screening',
      'Submit application with medical documentation and diagnosis',
      'Complete functional assessment (POMS or DES assessment)',
      'Receive eligibility determination (typically 30-60 days)',
      'Choose a qualified provider from DDD provider network',
      'Develop Individual Service Plan (ISP) with support coordinator',
    ],
    contactInfo: {
      agency: 'Arizona Division of Developmental Disabilities',
      phone: '1-844-770-9500',
      website: 'https://des.az.gov/services/disabilities/developmental-disabilities',
    },
    keyLegalCitations: ['A.R.S. § 20-826.04 (Autism Insurance Mandate)', 'A.R.S. § 36-568 (DDD Eligibility)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  CA: {
    state: 'California',
    stateAbbr: 'CA',
    medicaidWaivers: [
      {
        name: 'Regional Center System',
        description: 'California\'s 21 Regional Centers provide lifelong services for developmental disabilities',
        coveredServices: ['ABA Therapy', 'Speech Therapy', 'OT', 'Respite', 'Day Programs', 'Supported Living', 'Early Start (0-3)'],
        ageRange: 'All ages',
        waitlistInfo: 'No waitlist for Regional Center intake; some services may have provider capacity delays',
      },
      {
        name: 'Medi-Cal Behavioral Health Treatment (BHT)',
        description: 'ABA and behavioral services covered under Medi-Cal managed care',
        coveredServices: ['ABA Therapy', 'Behavioral Assessment', 'Treatment Planning', 'Caregiver Training'],
        ageRange: 'Under 21',
      },
    ],
    epsdtServices: ['ABA therapy', 'Speech therapy', 'Occupational therapy', 'Psychological evaluation', 'Applied behavioral analysis', 'Adaptive behavior treatment'],
    autismMandate: {
      exists: true,
      summary: 'SB 946 requires health plans to cover behavioral health treatment for autism with no age cap or dollar limit. Includes ABA when medically necessary.',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'No age or dollar cap under SB 946; medically necessary standard' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered; Regional Centers can also provide diagnostic services' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through Regional Center IPP' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'Regional Center: all ages. EPSDT: birth to 21. SB 946: no age limit.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability', 'Cerebral Palsy', 'Epilepsy', 'Other developmental disability manifesting before age 18'],
      incomeRequirements: 'Regional Center: no income requirement. Medi-Cal: up to 138% FPL (expanded under ACA).',
    },
    applicationSteps: [
      'Contact your local Regional Center (find at dds.ca.gov)',
      'Request intake appointment — Regional Center must respond within 15 days',
      'Complete diagnostic evaluation (within 60 days of intake)',
      'If eligible, develop Individual Program Plan (IPP)',
      'For Medi-Cal BHT: request referral through your managed care plan',
      'Choose qualified ABA provider from Regional Center or plan network',
    ],
    contactInfo: {
      agency: 'California Department of Developmental Services',
      phone: '1-916-654-1690',
      website: 'https://www.dds.ca.gov/',
    },
    keyLegalCitations: ['SB 946 — California Autism Insurance Mandate', 'Welfare & Institutions Code § 4512 (Regional Center eligibility)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  TX: {
    state: 'Texas',
    stateAbbr: 'TX',
    medicaidWaivers: [
      {
        name: 'STAR+PLUS Home and Community-Based Services',
        description: 'Managed care waiver for adults and children with disabilities',
        coveredServices: ['ABA Therapy', 'Respite', 'Adaptive Aids', 'Minor Home Modifications', 'Nursing'],
        ageRange: 'All ages',
        waitlistInfo: 'Interest list may apply — estimated 10+ year wait for some waivers',
      },
      {
        name: 'Medically Dependent Children Program (MDCP)',
        description: 'Community-based alternative to institutional care for children',
        coveredServices: ['Respite', 'Adaptive Aids', 'Minor Home Modifications', 'Transition Assistance'],
        ageRange: 'Under 21',
        waitlistInfo: 'Interest list applies',
      },
    ],
    epsdtServices: ['ABA therapy', 'Speech therapy', 'Occupational therapy', 'Physical therapy', 'Behavioral assessment', 'Psychological evaluation'],
    autismMandate: {
      exists: true,
      summary: 'Texas SB 1484 requires state-regulated health plans to cover ABA for autism. Applies to fully insured group plans.',
      ageCap: 10,
      dollarCap: 'Follows medical necessity — no explicit dollar cap for state-regulated plans',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under Medicaid EPSDT and state autism mandate (ages 2-10 for commercial)' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for diagnosis' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: false, coverageNotes: 'Available only through waiver programs (interest list may apply)' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 20. Mandate: ages 2-10.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)'],
      incomeRequirements: 'Medicaid: varies by category. CHIP: up to 201% FPL.',
    },
    applicationSteps: [
      'Apply for Medicaid/CHIP at YourTexasBenefits.com or call 2-1-1',
      'For autism services, request ABA referral through your Medicaid managed care plan',
      'For waiver services, contact Texas HHS at 1-877-438-5658',
      'Complete Level of Care assessment',
      'For interest list waivers, submit interest list application',
      'Choose qualified provider from managed care network',
    ],
    contactInfo: {
      agency: 'Texas Health and Human Services Commission',
      phone: '1-877-438-5658',
      website: 'https://www.hhs.texas.gov/',
    },
    keyLegalCitations: ['Texas Insurance Code § 1355.015 (Autism Mandate)', 'Texas Government Code § 533.00253 (Medicaid managed care ABA)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  FL: {
    state: 'Florida',
    stateAbbr: 'FL',
    medicaidWaivers: [
      {
        name: 'iBudget Florida Waiver',
        description: 'Individual budget-based waiver for developmental disabilities',
        coveredServices: ['ABA Therapy', 'Residential Habilitation', 'Supported Employment', 'Respite', 'Behavioral Services', 'Adult Day Training'],
        ageRange: 'All ages (3+)',
        waitlistInfo: 'Significant waitlist — 20,000+ individuals currently waiting',
      },
    ],
    epsdtServices: ['ABA therapy', 'Speech therapy', 'Occupational therapy', 'Behavioral analysis', 'Psychological testing', 'Developmental screening'],
    autismMandate: {
      exists: true,
      summary: 'Steven A. Geller Autism Coverage Act requires health insurers to cover screening, diagnosis, and treatment of ASD including ABA.',
      ageCap: 18,
      dollarCap: '$36,000/year for ABA (individuals), $200,000 lifetime',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under mandate ($36K/yr cap) and Medicaid EPSDT (no cap)' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for ASD screening and diagnosis' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: false, coverageNotes: 'Available through iBudget waiver only (significant waitlist)' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 20. Mandate: birth to 18. iBudget: 3+.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Developmental Disability (for iBudget)'],
      incomeRequirements: 'Medicaid: varies by category. iBudget: functional eligibility, not income-based.',
    },
    applicationSteps: [
      'Apply for Medicaid at myflfamilies.com or call 1-866-762-2237',
      'Contact Agency for Persons with Disabilities (APD) at 1-866-273-2273',
      'Complete application for iBudget waiver (waitlist applies)',
      'For Medicaid ABA: request referral through managed care plan',
      'Obtain diagnostic evaluation from qualified provider',
      'Develop support plan with APD support coordinator',
    ],
    contactInfo: {
      agency: 'Agency for Persons with Disabilities (APD)',
      phone: '1-866-273-2273',
      website: 'https://apd.myflorida.com/',
    },
    keyLegalCitations: ['Florida Statute § 627.6686 (Steven A. Geller Autism Coverage Act)', 'Florida Statute § 393.063 (Developmental Disabilities)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  NY: {
    state: 'New York',
    stateAbbr: 'NY',
    medicaidWaivers: [
      {
        name: 'Home and Community Based Services (HCBS) Waiver',
        description: 'Services for individuals with developmental disabilities to live in the community',
        coveredServices: ['Residential Habilitation', 'Day Habilitation', 'Respite', 'Community Habilitation', 'Supported Employment', 'Adaptive Equipment'],
        ageRange: 'All ages',
      },
      {
        name: 'Children\'s Waiver',
        description: 'Community-based services for children at risk of institutional placement',
        coveredServices: ['Respite', 'Community Habilitation', 'Family Support', 'Adaptive Equipment', 'Environmental Modifications'],
        ageRange: 'Under 18',
      },
    ],
    epsdtServices: ['ABA therapy', 'Speech therapy', 'Occupational therapy', 'Physical therapy', 'Behavioral assessment', 'Early intervention (0-3)'],
    autismMandate: {
      exists: true,
      summary: 'New York\'s autism insurance law (Chapter 594 of 2011) requires coverage for ASD screening, diagnosis, and treatment including ABA with no age or dollar limits.',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'No age or dollar cap; medical necessity standard applies' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered; Early Intervention provides evaluations for 0-3' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through OPWDD waiver programs' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Insurance mandate: no age limit. Early Intervention: 0-3.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Developmental Disability (for OPWDD services)'],
      incomeRequirements: 'Medicaid: up to 138% FPL (expanded). OPWDD: functional eligibility.',
    },
    applicationSteps: [
      'Apply for Medicaid at mybenefits.ny.gov or call 1-800-541-2831',
      'Contact OPWDD Front Door at 1-866-946-9733 for DD services',
      'For children 0-3: contact Early Intervention Program through county health dept',
      'Complete eligibility determination with OPWDD',
      'For commercial insurance ABA: request authorization from your health plan',
      'Develop Individualized Service Plan or Life Plan',
    ],
    contactInfo: {
      agency: 'Office for People With Developmental Disabilities (OPWDD)',
      phone: '1-866-946-9733',
      website: 'https://opwdd.ny.gov/',
    },
    keyLegalCitations: ['NY Insurance Law § 3216(i)(35), § 3221(l)(17), § 4303(y) (Autism Mandate)', 'NY Mental Hygiene Law Article 16 (OPWDD)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  PA: {
    state: 'Pennsylvania',
    stateAbbr: 'PA',
    medicaidWaivers: [
      {
        name: 'Adult Autism Waiver',
        description: 'Services specifically for adults with autism spectrum disorder',
        coveredServices: ['Community Participation', 'Supported Employment', 'Respite', 'Behavioral Support', 'Community Transition', 'Environmental Adaptations'],
        ageRange: '21+',
        waitlistInfo: 'Waitlist applies — contact local county MH/ID office',
      },
      {
        name: 'Consolidated and Person/Family Directed Support Waivers',
        description: 'Comprehensive community-based services for intellectual disabilities',
        coveredServices: ['Behavioral Support', 'Respite', 'Habilitation', 'Therapies', 'Supported Employment', 'Nursing'],
        ageRange: 'All ages',
        waitlistInfo: 'Significant waitlist for Consolidated waiver',
      },
    ],
    epsdtServices: ['ABA therapy', 'Speech therapy', 'Occupational therapy', 'Behavioral health services', 'Developmental evaluation', 'Early intervention'],
    autismMandate: {
      exists: true,
      summary: 'Act 62 of 2008 requires health insurers to cover diagnostic assessment and treatment for ASD including ABA. Coverage for individuals under 21.',
      ageCap: 21,
      dollarCap: '$36,000/year for ABA',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under Act 62 ($36K/yr cap for commercial; no cap for Medicaid EPSDT)' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for ASD assessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: false, coverageNotes: 'Available through waiver programs (waitlist may apply)' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Act 62: under 21. Adult Autism Waiver: 21+.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)'],
      incomeRequirements: 'Medicaid: up to 138% FPL. Waivers: functional eligibility varies.',
    },
    applicationSteps: [
      'Apply for Medicaid at compass.state.pa.us or call 1-866-550-4355',
      'Contact county MH/ID office for waiver services',
      'For Act 62 commercial coverage: request ABA authorization from insurer',
      'Complete diagnostic evaluation with qualified provider',
      'For Early Intervention (0-3): contact CONNECT helpline at 1-800-692-7288',
      'Develop Individual Support Plan with support coordinator',
    ],
    contactInfo: {
      agency: 'Pennsylvania Office of Developmental Programs',
      phone: '1-866-539-7689',
      website: 'https://www.dhs.pa.gov/Services/Disabilities-Aging/Pages/default.aspx',
    },
    keyLegalCitations: ['Act 62 of 2008 (PA Autism Insurance Act)', '40 P.S. § 764h (Coverage requirements)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  OH: {
    state: 'Ohio',
    stateAbbr: 'OH',
    medicaidWaivers: [
      {
        name: 'Individual Options (IO) Waiver',
        description: 'Comprehensive HCBS services for individuals with developmental disabilities',
        coveredServices: ['Residential Services', 'Day Services', 'Respite', 'Transportation', 'Behavioral Support', 'Homemaker/Personal Care'],
        ageRange: 'All ages',
        waitlistInfo: 'Waitlist applies — contact county board of DD',
      },
      {
        name: 'Level One Waiver',
        description: 'Lower-intensity services for individuals living with family',
        coveredServices: ['Respite', 'Adult Day Support', 'Transportation', 'Social Work', 'Adaptive Equipment'],
        ageRange: 'All ages',
      },
    ],
    epsdtServices: ['ABA therapy', 'Speech therapy', 'Occupational therapy', 'Behavioral health services', 'Diagnostic evaluation', 'Early intervention'],
    autismMandate: {
      exists: true,
      summary: 'Ohio HB 159 (Autism Coverage Act) requires coverage for ASD diagnosis and treatment including ABA therapy.',
      ageCap: 14,
      dollarCap: 'No explicit dollar cap; medical necessity standard',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under HB 159 and Medicaid EPSDT' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for diagnosis' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: false, coverageNotes: 'Available through DD waiver programs' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. HB 159: under 14.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Developmental Disability (for county board services)'],
      incomeRequirements: 'Medicaid: up to 138% FPL. DD waivers: functional eligibility.',
    },
    applicationSteps: [
      'Apply for Medicaid at benefits.ohio.gov or call 1-800-324-8680',
      'Contact county Board of Developmental Disabilities for DD services',
      'For ABA under commercial insurance: request authorization citing HB 159',
      'Complete eligibility determination with county board',
      'For Early Intervention (0-3): contact Help Me Grow at 1-800-755-4769',
      'Develop Individual Service Plan',
    ],
    contactInfo: {
      agency: 'Ohio Department of Developmental Disabilities',
      phone: '1-800-617-6733',
      website: 'https://dodd.ohio.gov/',
    },
    keyLegalCitations: ['Ohio Revised Code § 3922.44-.49 (HB 159, Autism Coverage)', 'Ohio Revised Code § 5123 (DD Services)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  IL: {
    state: 'Illinois',
    stateAbbr: 'IL',
    medicaidWaivers: [
      {
        name: 'Home-Based Support Services Waiver',
        description: 'Community-based services for individuals with developmental disabilities',
        coveredServices: ['Personal Support', 'Respite', 'Behavioral Services', 'Adaptive Equipment', 'Training'],
        ageRange: 'All ages (18+ primarily)',
      },
      {
        name: 'Children\'s Support Waiver',
        description: 'Services for children with developmental disabilities to remain at home',
        coveredServices: ['Respite', 'Behavioral Intervention', 'Adaptive Equipment', 'Home Modifications'],
        ageRange: 'Under 18',
        waitlistInfo: 'Contact Prioritization of Urgency of Need for Services (PUNS)',
      },
    ],
    epsdtServices: ['ABA therapy', 'Speech therapy', 'Occupational therapy', 'Behavioral health treatment', 'Developmental screening', 'Early intervention'],
    autismMandate: {
      exists: true,
      summary: 'Illinois Insurance Code requires coverage for ASD diagnosis and treatment including ABA therapy. No age or dollar limit for state-regulated plans.',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'No age or dollar cap; medical necessity standard' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for ASD assessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: false, coverageNotes: 'Available through DD waivers; apply through PUNS system' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Insurance mandate: no age limit.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)'],
      incomeRequirements: 'Medicaid: up to 138% FPL.',
    },
    applicationSteps: [
      'Apply for Medicaid at abe.illinois.gov or call 1-800-843-6154',
      'Contact local Independent Service Coordination (ISC) agency for DD services',
      'Register on PUNS database for waiver services',
      'For commercial insurance ABA: request prior authorization from plan',
      'For Early Intervention (0-3): contact Child & Family Connections at local CFC office',
      'Develop Individual Service Plan with ISC',
    ],
    contactInfo: {
      agency: 'Illinois Division of Developmental Disabilities',
      phone: '1-888-337-5267',
      website: 'https://www.dhs.state.il.us/page.aspx?item=29761',
    },
    keyLegalCitations: ['215 ILCS 5/356z.14 (Autism Coverage Mandate)', 'Mental Health and Developmental Disabilities Code', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  GA: {
    state: 'Georgia',
    stateAbbr: 'GA',
    medicaidWaivers: [
      {
        name: 'New Options Waiver (NOW)',
        description: 'Community-based services for individuals with intellectual/developmental disabilities',
        coveredServices: ['Community Living Support', 'Community Access', 'Respite', 'Behavioral Support', 'Supported Employment', 'Transportation'],
        ageRange: 'All ages',
        waitlistInfo: 'Planning list of 7,000+ individuals',
      },
      {
        name: 'Comprehensive Supports Waiver (COMP)',
        description: 'Comprehensive services for individuals with more intensive needs',
        coveredServices: ['Residential Services', 'Day Services', 'Respite', 'Behavioral Support', 'Nursing', 'Therapies'],
        ageRange: 'All ages',
        waitlistInfo: 'Planning list of 7,000+ individuals',
      },
    ],
    epsdtServices: ['ABA therapy', 'Speech therapy', 'Occupational therapy', 'Behavioral health assessment', 'Developmental evaluation'],
    autismMandate: {
      exists: true,
      summary: 'Georgia\'s Ava\'s Law requires health insurers to cover ASD treatment including ABA for children aged 6 and under.',
      ageCap: 6,
      dollarCap: '$35,000/year for ABA',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Commercial: Ava\'s Law covers ages 0-6 ($35K cap). Medicaid EPSDT: no age/dollar cap.' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for ASD screening and diagnosis' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: false, coverageNotes: 'Available through NOW/COMP waivers (long planning list)' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Ava\'s Law: 0-6.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)'],
      incomeRequirements: 'Medicaid: varies by category. Katie Beckett option available.',
    },
    applicationSteps: [
      'Apply for Medicaid at gateway.ga.gov or call 1-877-423-4746',
      'Contact Georgia Division of DD at 1-404-657-2680',
      'For EPSDT ABA: request referral through Medicaid managed care (CMO)',
      'For waiver services: complete application and join planning list',
      'For Early Intervention (0-3): contact Babies Can\'t Wait at local health department',
      'For commercial ABA: file prior authorization citing Ava\'s Law',
    ],
    contactInfo: {
      agency: 'Georgia Department of Behavioral Health and Developmental Disabilities',
      phone: '1-404-657-2680',
      website: 'https://dbhdd.georgia.gov/',
    },
    keyLegalCitations: ['O.C.G.A. § 33-24-59.20 (Ava\'s Law)', 'O.C.G.A. § 37-4 (DD Services)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  NC: {
    state: 'North Carolina',
    stateAbbr: 'NC',
    medicaidWaivers: [
      {
        name: 'Innovations Waiver',
        description: 'HCBS for individuals with intellectual/developmental disabilities',
        coveredServices: ['Residential Supports', 'Day Supports', 'Respite', 'Supported Employment', 'Community Networking', 'Behavioral Support'],
        ageRange: 'All ages',
        waitlistInfo: 'Registry of Unmet Needs — waitlist of 15,000+ individuals',
      },
    ],
    epsdtServices: ['ABA therapy', 'Speech therapy', 'Occupational therapy', 'Behavioral health services', 'Developmental evaluation', 'Early intervention'],
    autismMandate: {
      exists: true,
      summary: 'HB 489 (2015) requires health insurers to cover ASD treatment including ABA. Applies to fully insured plans.',
      ageCap: 18,
      dollarCap: '$40,000/year for ABA',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under HB 489 ($40K/yr cap) and Medicaid EPSDT (no cap)' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for ASD screening and diagnosis' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: false, coverageNotes: 'Available through Innovations waiver (long waitlist)' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. HB 489: under 18.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)'],
      incomeRequirements: 'Medicaid: up to 138% FPL (Medicaid expansion). Innovations: functional eligibility.',
    },
    applicationSteps: [
      'Apply for Medicaid at epass.nc.gov or call 1-800-662-7030',
      'Contact local Management Entity/Managed Care Organization (LME/MCO)',
      'For EPSDT ABA: request through NC Medicaid Direct or Tailored Plan',
      'For Innovations waiver: apply through LME/MCO, join Registry of Unmet Needs',
      'For Early Intervention (0-3): contact NC Infant-Toddler Program',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
    ],
    contactInfo: {
      agency: 'NC Division of Mental Health, Developmental Disabilities and Substance Abuse Services',
      phone: '1-800-662-7030',
      website: 'https://www.ncdhhs.gov/divisions/mental-health-developmental-disabilities-and-substance-abuse',
    },
    keyLegalCitations: ['NC General Statute § 58-3-190 (HB 489 Autism Coverage)', 'NC General Statute § 122C (MH/DD/SAS Act)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  CO: {
    state: 'Colorado',
    stateAbbr: 'CO',
    medicaidWaivers: [
      {
        name: 'Children\'s Extensive Support (CES) Waiver',
        description: 'Provides extensive home and community-based services for children with intellectual and developmental disabilities',
        coveredServices: ['ABA Therapy', 'Speech Therapy', 'Occupational Therapy', 'Respite Care', 'Behavioral Services', 'Habilitation'],
        ageRange: 'Birth to 17',
        waitlistInfo: 'Significant waitlist; apply early through Community Centered Board',
      },
      {
        name: 'Children\'s Habilitation Residential Program (CHRP) Waiver',
        description: 'Residential habilitation services for children with developmental disabilities who need out-of-home placement',
        coveredServices: ['Residential Habilitation', 'Behavioral Services', 'Therapy Services', 'Day Services'],
        ageRange: 'Birth to 17',
      },
      {
        name: 'Supported Living Services (SLS) Waiver',
        description: 'Community-based supports for adults with developmental disabilities living independently',
        coveredServices: ['Supported Living', 'Day Habilitation', 'Behavioral Services', 'Respite Care', 'Mentorship'],
        ageRange: '18 and older',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'SB 09-244 requires insurers to cover diagnosis and treatment of autism spectrum disorders including ABA therapy for all ages with no dollar cap.',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under autism mandate SB 09-244 and Medicaid EPSDT; no age or dollar cap' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through CES and SLS waivers' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. CES: birth to 17. SLS: 18+. Mandate: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Developmental Disability diagnosis'],
      incomeRequirements: 'Medicaid: up to 138% FPL (Medicaid expansion). Waivers: functional eligibility through Community Centered Board.',
    },
    applicationSteps: [
      'Apply for Health First Colorado (Medicaid) at colorado.gov/PEAK or call 1-800-221-3943',
      'Contact your local Community Centered Board (CCB) for developmental disability services',
      'Complete functional eligibility assessment through the CCB',
      'For CES waiver: apply through CCB and join waitlist if applicable',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Service Plan with case manager',
    ],
    contactInfo: {
      agency: 'Colorado Department of Health Care Policy & Financing',
      phone: '1-800-221-3943',
      website: 'https://hcpf.colorado.gov',
    },
    keyLegalCitations: ['CO SB 09-244 (Autism Insurance Mandate)', 'C.R.S. § 10-16-104(1.4) (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  CT: {
    state: 'Connecticut',
    stateAbbr: 'CT',
    medicaidWaivers: [
      {
        name: 'Individual and Family Support Waiver',
        description: 'Community-based services for individuals with intellectual disabilities living with family or independently',
        coveredServices: ['ABA Therapy', 'Respite Care', 'Individual Supports', 'Family Training', 'Behavioral Services'],
        ageRange: 'All ages',
        waitlistInfo: 'Waitlist managed by DDS; priority based on need',
      },
      {
        name: 'Autism Spectrum Disorder Waiver',
        description: 'Targeted services specifically for individuals diagnosed with autism spectrum disorder',
        coveredServices: ['ABA Therapy', 'Speech Therapy', 'Occupational Therapy', 'Behavioral Consultation', 'Family Training', 'Respite'],
        ageRange: 'All ages',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'Public Act 09-115 requires insurers to cover autism diagnosis and treatment including ABA therapy with no age cap and no dollar cap.',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under Public Act 09-115 and Medicaid EPSDT; no age or dollar cap' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through DDS waivers and Birth to Three program' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. DDS waivers: all ages. Mandate: no age cap.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability'],
      incomeRequirements: 'Medicaid: up to 138% FPL (Medicaid expansion). DDS: functional eligibility, not income-based.',
    },
    applicationSteps: [
      'Apply for HUSKY Health (Medicaid) at ct.gov/dss or call 1-877-284-8759',
      'Contact CT Department of Developmental Services at 860-418-6000',
      'Request eligibility determination from DDS regional office',
      'For Birth to Three (ages 0-3): call Child Development Infoline at 1-800-505-7000',
      'Obtain diagnostic evaluation from licensed provider',
      'Develop Individual Plan with DDS case manager',
    ],
    contactInfo: {
      agency: 'Connecticut Department of Developmental Services',
      phone: '860-418-6000',
      website: 'https://portal.ct.gov/dds',
    },
    keyLegalCitations: ['CT Public Act 09-115 (Autism Insurance Mandate)', 'C.G.S. § 38a-514b (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  IN: {
    state: 'Indiana',
    stateAbbr: 'IN',
    medicaidWaivers: [
      {
        name: 'Community Integration and Habilitation (CIH) Waiver',
        description: 'Comprehensive home and community-based services for individuals with intellectual and developmental disabilities',
        coveredServices: ['ABA Therapy', 'Respite Care', 'Day Services', 'Residential Habilitation', 'Behavioral Support', 'Occupational Therapy'],
        ageRange: 'All ages',
        waitlistInfo: 'Waitlist varies by region; contact DDRS for current status',
      },
      {
        name: 'Family Supports Waiver (FSW)',
        description: 'Supports for individuals with developmental disabilities living with their families',
        coveredServices: ['Respite Care', 'Family Training', 'Behavioral Support', 'Adaptive Equipment', 'Community Integration'],
        ageRange: 'All ages',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'HB 1340 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under age 22 with no dollar cap.',
      ageCap: 22,
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under HB 1340 for ages under 22 and Medicaid EPSDT; no dollar cap' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through CIH and FSW waivers' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: under 22. CIH/FSW waivers: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability', 'Developmental Disability'],
      incomeRequirements: 'Medicaid: up to 138% FPL (HIP 2.0). Waivers: functional eligibility through DDRS.',
    },
    applicationSteps: [
      'Apply for Indiana Medicaid (HIP) at in.gov/fssa or call 1-800-403-0864',
      'Contact Division of Disability & Rehabilitative Services (DDRS) at 1-800-545-7763',
      'Request eligibility assessment for developmental disability services',
      'For First Steps (ages 0-3): call 1-800-441-7837',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Support Plan with case manager',
    ],
    contactInfo: {
      agency: 'Indiana Division of Disability & Rehabilitative Services',
      phone: '1-800-545-7763',
      website: 'https://www.in.gov/fssa/ddrs/',
    },
    keyLegalCitations: ['IN HB 1340 (Autism Insurance Mandate)', 'IC § 27-8-14.2 (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  MA: {
    state: 'Massachusetts',
    stateAbbr: 'MA',
    medicaidWaivers: [
      {
        name: 'Autism Spectrum Disorder Waiver',
        description: 'Targeted waiver providing specialized services for individuals with autism spectrum disorder',
        coveredServices: ['ABA Therapy', 'Behavioral Consultation', 'Speech Therapy', 'Occupational Therapy', 'Respite Care', 'Family Training'],
        ageRange: 'All ages',
        waitlistInfo: 'Apply through DDS; waitlist varies based on funding availability',
      },
      {
        name: 'Intensive Flexible Family Supports',
        description: 'Flexible community-based supports for families of individuals with developmental disabilities',
        coveredServices: ['Family Support', 'Respite Care', 'Behavioral Support', 'Community Integration', 'Skill Building'],
        ageRange: 'All ages',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'Chapter 207 of the Acts of 2010 (ARICA) requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA therapy with no age cap and no dollar cap.',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under ARICA with no age or dollar cap; medically necessary standard' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through DDS waivers and family support programs' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. ARICA mandate: no age cap. DDS waivers: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability', 'Developmental Disability'],
      incomeRequirements: 'MassHealth: up to 138% FPL (Medicaid expansion). DDS: functional eligibility, not income-based.',
    },
    applicationSteps: [
      'Apply for MassHealth at mass.gov/masshealth or call 1-800-841-2900',
      'Contact MA Department of Developmental Services at 617-727-5608',
      'Request eligibility determination from DDS regional office',
      'For Early Intervention (ages 0-3): contact local EI program through mass.gov/ei',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Service Plan (ISP) with DDS service coordinator',
    ],
    contactInfo: {
      agency: 'Massachusetts Department of Developmental Services',
      phone: '617-727-5608',
      website: 'https://www.mass.gov/orgs/department-of-developmental-services',
    },
    keyLegalCitations: ['MA Chapter 207 Acts of 2010 (ARICA)', 'M.G.L. c. 175 § 47AA (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  MD: {
    state: 'Maryland',
    stateAbbr: 'MD',
    medicaidWaivers: [
      {
        name: 'Community Pathways Waiver',
        description: 'Comprehensive home and community-based services for individuals with developmental disabilities',
        coveredServices: ['ABA Therapy', 'Residential Services', 'Day Habilitation', 'Supported Employment', 'Respite Care', 'Behavioral Support'],
        ageRange: 'All ages',
        waitlistInfo: 'Significant waitlist managed by DDA; crisis placements prioritized',
      },
      {
        name: 'Family Supports Waiver',
        description: 'Supports for individuals with developmental disabilities living with their families in the community',
        coveredServices: ['Respite Care', 'Family Training', 'Adaptive Equipment', 'Individual Support Services', 'Environmental Accessibility'],
        ageRange: 'All ages',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'SB 262 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under 21, with a $50,000 annual cap.',
      ageCap: 21,
      dollarCap: '$50,000/year',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under SB 262 for under 21 with $50k/year cap; Medicaid EPSDT has no cap' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through DDA waivers and Autism Waiver' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: under 21. DDA waivers: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Developmental Disability'],
      incomeRequirements: 'Medicaid: up to 138% FPL (Medicaid expansion). DDA: functional eligibility, not income-based.',
    },
    applicationSteps: [
      'Apply for Maryland Medicaid at myMDTHINK.maryland.gov or call 1-800-332-6347',
      'Contact the Developmental Disabilities Administration (DDA) at 410-767-5600',
      'Request eligibility determination from DDA regional office',
      'For Infants & Toddlers Program (ages 0-3): call 1-800-535-0182',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Plan with DDA coordinator',
    ],
    contactInfo: {
      agency: 'Maryland Developmental Disabilities Administration',
      phone: '410-767-5600',
      website: 'https://dda.health.maryland.gov',
    },
    keyLegalCitations: ['MD SB 262 (Autism Insurance Mandate)', 'MD Insurance Article § 15-835 (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  MI: {
    state: 'Michigan',
    stateAbbr: 'MI',
    medicaidWaivers: [
      {
        name: 'Habilitation Supports Waiver',
        description: 'Home and community-based services for adults with developmental disabilities',
        coveredServices: ['ABA Therapy', 'Supported Living', 'Day Programs', 'Respite Care', 'Behavioral Support', 'Skill Building'],
        ageRange: '18 and older',
        waitlistInfo: 'Managed by local Community Mental Health Services Program (CMHSP)',
      },
      {
        name: 'Children\'s Waiver',
        description: 'Home and community-based services for children with developmental disabilities to remain in their family home',
        coveredServices: ['ABA Therapy', 'Respite Care', 'Family Training', 'Behavioral Support', 'Occupational Therapy', 'Speech Therapy'],
        ageRange: 'Birth to 17',
        waitlistInfo: 'Waitlist varies by county; contact local CMHSP',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'PA 400-401 of 2012 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA therapy with no age cap and no dollar cap.',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under PA 400-401 with no age or dollar cap; medically necessary standard' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through Children\'s Waiver and HSW' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: no age cap. Children\'s Waiver: birth to 17. HSW: 18+.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability', 'Developmental Disability'],
      incomeRequirements: 'Medicaid: up to 138% FPL (Healthy Michigan Plan). Waivers: functional eligibility through CMHSP.',
    },
    applicationSteps: [
      'Apply for Michigan Medicaid at michigan.gov/mibridges or call 1-844-799-9876',
      'Contact your local Community Mental Health Services Program (CMHSP)',
      'Request eligibility assessment for developmental disability services',
      'For Early On (ages 0-3): call 1-800-327-5966',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Plan of Service (IPOS) with case manager',
    ],
    contactInfo: {
      agency: 'Michigan Department of Health & Human Services',
      phone: '517-241-3740',
      website: 'https://www.michigan.gov/mdhhs',
    },
    keyLegalCitations: ['MI PA 400-401 of 2012 (Autism Insurance Mandate)', 'MCL § 550.1416d (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  MN: {
    state: 'Minnesota',
    stateAbbr: 'MN',
    medicaidWaivers: [
      {
        name: 'DD Waiver',
        description: 'Comprehensive home and community-based services for individuals with developmental disabilities',
        coveredServices: ['ABA Therapy', 'Day Services', 'Residential Support', 'Respite Care', 'Behavioral Support', 'In-Home Support'],
        ageRange: 'All ages',
        waitlistInfo: 'Contact county social services for current availability',
      },
      {
        name: 'Brain Injury (BI) Waiver',
        description: 'Services for individuals with brain injuries including those with co-occurring autism',
        coveredServices: ['Behavioral Programming', 'Day Services', 'Residential Support', 'Respite Care'],
        ageRange: 'All ages',
      },
      {
        name: 'Community Access for Disability Inclusion (CADI) Waiver',
        description: 'Community-based alternatives to institutional care for individuals with disabilities',
        coveredServices: ['Behavioral Support', 'In-Home Support', 'Respite Care', 'Day Services', 'Customized Living'],
        ageRange: 'All ages',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'MN Statute 62A.3094 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under 18 with no dollar cap.',
      ageCap: 18,
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under MN Statute 62A.3094 for under 18; Medicaid EPSDT covers to 21' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through DD Waiver and CADI Waiver' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: under 18. DD Waiver: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Developmental Disability', 'Intellectual Disability'],
      incomeRequirements: 'Medical Assistance: up to 138% FPL (Medicaid expansion). Waivers: functional eligibility through county.',
    },
    applicationSteps: [
      'Apply for Minnesota Medical Assistance at mnbenefits.mn.gov or call 651-431-2670',
      'Contact your county social services for developmental disability waiver access',
      'Request eligibility assessment through county case management',
      'For Help Me Grow (ages 0-3): call 1-866-693-4769',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Community Support Plan (CSP) with county case manager',
    ],
    contactInfo: {
      agency: 'Minnesota Department of Human Services',
      phone: '651-431-2000',
      website: 'https://mn.gov/dhs/',
    },
    keyLegalCitations: ['MN Statute § 62A.3094 (Autism Insurance Mandate)', 'MN Statute § 256B.0943 (EIDBI Benefit)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  MO: {
    state: 'Missouri',
    stateAbbr: 'MO',
    medicaidWaivers: [
      {
        name: 'Partnership for Hope Waiver',
        description: 'Community-based services for individuals with developmental disabilities with lower support needs',
        coveredServices: ['ABA Therapy', 'Respite Care', 'Person-Centered Supports', 'Community Integration', 'Family Training'],
        ageRange: 'All ages',
        waitlistInfo: 'Rolling enrollment; apply through regional office',
      },
      {
        name: 'Community Support Waiver',
        description: 'Comprehensive home and community-based services for individuals with developmental disabilities',
        coveredServices: ['ABA Therapy', 'Day Habilitation', 'Residential Services', 'Respite Care', 'Behavioral Support', 'Supported Employment'],
        ageRange: 'All ages',
        waitlistInfo: 'Significant waitlist; contact Division of DD for current status',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'SB 53 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under 18 with a $40,000 annual cap.',
      ageCap: 18,
      dollarCap: '$40,000/year',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under SB 53 for under 18 with $40k/year cap; Medicaid EPSDT has no cap' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through Partnership for Hope and Community Support waivers' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: under 18. DD waivers: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Developmental Disability', 'Intellectual Disability'],
      incomeRequirements: 'MO HealthNet: up to 138% FPL (Medicaid expansion). Waivers: functional eligibility through Division of DD.',
    },
    applicationSteps: [
      'Apply for MO HealthNet (Medicaid) at mydss.mo.gov or call 1-855-373-4636',
      'Contact Missouri Division of Developmental Disabilities at 573-751-8611',
      'Request eligibility determination from regional office',
      'For First Steps (ages 0-3): call 1-866-583-2392',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Support Plan with service coordinator',
    ],
    contactInfo: {
      agency: 'Missouri Division of Developmental Disabilities',
      phone: '573-751-8611',
      website: 'https://dmh.mo.gov/dd',
    },
    keyLegalCitations: ['MO SB 53 (Autism Insurance Mandate)', 'RSMo § 376.1224 (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  NJ: {
    state: 'New Jersey',
    stateAbbr: 'NJ',
    medicaidWaivers: [
      {
        name: 'Supports Program',
        description: 'Community-based supports for individuals with intellectual and developmental disabilities',
        coveredServices: ['ABA Therapy', 'Respite Care', 'Individual Supports', 'Day Habilitation', 'Behavioral Support', 'Supported Employment'],
        ageRange: '21 and older',
        waitlistInfo: 'Waitlist managed by DDD; priority based on urgency of need',
      },
      {
        name: 'Community Care Program',
        description: 'Comprehensive home and community-based services as alternative to institutional care',
        coveredServices: ['ABA Therapy', 'Residential Services', 'Day Programs', 'Respite Care', 'Behavioral Support', 'Therapy Services'],
        ageRange: '21 and older',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'S2238 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under 21 with no dollar cap.',
      ageCap: 21,
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under S2238 for under 21 with no dollar cap; medically necessary standard' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through DDD programs and SPAN parent advocacy' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: under 21. DDD programs: 21+.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability', 'Developmental Disability'],
      incomeRequirements: 'NJ FamilyCare: up to 138% FPL (Medicaid expansion). DDD: functional eligibility, not income-based.',
    },
    applicationSteps: [
      'Apply for NJ FamilyCare (Medicaid) at njfamilycare.org or call 1-800-701-0710',
      'Contact NJ Division of Developmental Disabilities at 1-800-832-9173',
      'Request eligibility determination from DDD',
      'For Early Intervention (ages 0-3): call 1-888-653-4463',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Habilitation Plan (IHP) with case manager',
    ],
    contactInfo: {
      agency: 'New Jersey Division of Developmental Disabilities',
      phone: '1-800-832-9173',
      website: 'https://www.nj.gov/humanservices/ddd/',
    },
    keyLegalCitations: ['NJ S2238 (Autism Insurance Mandate)', 'N.J.S.A. § 17B:27A-19.31 (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  OR: {
    state: 'Oregon',
    stateAbbr: 'OR',
    medicaidWaivers: [
      {
        name: 'K Plan (Community First Choice)',
        description: 'Person-centered home and community-based services under Medicaid state plan option',
        coveredServices: ['ABA Therapy', 'In-Home Support', 'Community Living Support', 'Behavioral Support', 'Skill Building', 'Assistive Technology'],
        ageRange: 'All ages',
        waitlistInfo: 'No waitlist for K Plan services; enrollment upon eligibility determination',
      },
      {
        name: 'Children\'s Intensive In-Home Services',
        description: 'Intensive behavioral and therapeutic services for children with developmental disabilities in the home setting',
        coveredServices: ['ABA Therapy', 'Behavioral Consultation', 'Family Training', 'Crisis Support', 'Respite Care'],
        ageRange: 'Birth to 17',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'ORS 743A.190 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under 25 with no dollar cap.',
      ageCap: 25,
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under ORS 743A.190 for under 25 with no dollar cap; medically necessary standard' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through ODDS K Plan and children\'s services' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: under 25. K Plan: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability', 'Developmental Disability'],
      incomeRequirements: 'Oregon Health Plan: up to 138% FPL (Medicaid expansion). ODDS: functional eligibility, not income-based.',
    },
    applicationSteps: [
      'Apply for Oregon Health Plan at one.oregon.gov or call 1-800-699-9075',
      'Contact Office of Developmental Disabilities Services (ODDS) at 503-945-5600',
      'Request eligibility determination from local Community Developmental Disability Program (CDDP)',
      'For Early Intervention (ages 0-3): contact local EI/ECSE program through oregon.gov/ode',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Support Plan (ISP) with services coordinator',
    ],
    contactInfo: {
      agency: 'Oregon Office of Developmental Disabilities Services',
      phone: '503-945-5600',
      website: 'https://www.oregon.gov/odhs/developmental-disabilities',
    },
    keyLegalCitations: ['ORS § 743A.190 (Autism Insurance Mandate)', 'ORS § 427 (Developmental Disability Services)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  SC: {
    state: 'South Carolina',
    stateAbbr: 'SC',
    medicaidWaivers: [
      {
        name: 'Intellectual Disability/Related Disabilities (ID/RD) Waiver',
        description: 'Home and community-based services for individuals with intellectual and related disabilities',
        coveredServices: ['ABA Therapy', 'Day Services', 'Residential Habilitation', 'Respite Care', 'Behavioral Support', 'Employment Services'],
        ageRange: 'All ages',
        waitlistInfo: 'Critical needs waitlist managed by DDSN; significant wait times common',
      },
      {
        name: 'Head and Spinal Cord Injury (HASCI) Waiver',
        description: 'Services for individuals with traumatic brain or spinal cord injuries, including co-occurring developmental disabilities',
        coveredServices: ['Behavioral Programming', 'Day Services', 'Residential Support', 'Respite Care', 'Therapy Services'],
        ageRange: 'All ages',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'Ryan\'s Law (SB 31) requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under 16 with a $50,000 annual cap.',
      ageCap: 16,
      dollarCap: '$50,000/year',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under Ryan\'s Law for under 16 with $50k/year cap; Medicaid EPSDT has no cap' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through DDSN waivers and family support services' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Ryan\'s Law: under 16. DDSN waivers: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability', 'Related Disability'],
      incomeRequirements: 'SC Healthy Connections Medicaid: up to 138% FPL. DDSN: functional eligibility through county board.',
    },
    applicationSteps: [
      'Apply for SC Healthy Connections Medicaid at apply.scdhhs.gov or call 1-888-549-0820',
      'Contact SC Department of Disabilities and Special Needs (DDSN) at 803-898-9600',
      'Request eligibility determination through local county DSN board',
      'For BabyNet Early Intervention (ages 0-3): call 1-877-621-0865',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Support Plan with DDSN case manager',
    ],
    contactInfo: {
      agency: 'South Carolina Department of Disabilities and Special Needs',
      phone: '803-898-9600',
      website: 'https://ddsn.sc.gov',
    },
    keyLegalCitations: ['SC Ryan\'s Law SB 31 (Autism Insurance Mandate)', 'SC Code § 38-71-280 (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  TN: {
    state: 'Tennessee',
    stateAbbr: 'TN',
    medicaidWaivers: [
      {
        name: 'TennCare CHOICES',
        description: 'Long-term services and supports program for elderly and individuals with physical disabilities',
        coveredServices: ['ABA Therapy', 'Personal Care', 'Respite Care', 'Home Modifications', 'Assistive Technology'],
        ageRange: 'All ages',
        waitlistInfo: 'Rolling enrollment for eligible individuals',
      },
      {
        name: 'Employment and Community First CHOICES',
        description: 'Home and community-based services for individuals with intellectual and developmental disabilities emphasizing employment and community living',
        coveredServices: ['ABA Therapy', 'Supported Employment', 'Community Living', 'Respite Care', 'Behavioral Support', 'Family Training'],
        ageRange: 'All ages',
        waitlistInfo: 'Managed by DIDD; waitlist varies by service group',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'SB 1880 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under 12 with a $36,000 annual cap.',
      ageCap: 12,
      dollarCap: '$36,000/year',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under SB 1880 for under 12 with $36k/year cap; Medicaid EPSDT has no cap' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through ECF CHOICES and DIDD services' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: under 12. ECF CHOICES: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability', 'Developmental Disability'],
      incomeRequirements: 'TennCare: up to 138% FPL (Medicaid expansion). ECF CHOICES: functional eligibility through DIDD.',
    },
    applicationSteps: [
      'Apply for TennCare at tenncareconnect.tn.gov or call 1-855-259-0701',
      'Contact TN Division of Intellectual & Developmental Disabilities (DIDD) at 615-532-6530',
      'Request eligibility determination from DIDD regional office',
      'For TEIS Early Intervention (ages 0-3): call 1-800-852-7157',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Support Plan (ISP) with DIDD case manager',
    ],
    contactInfo: {
      agency: 'Tennessee Division of Intellectual & Developmental Disabilities',
      phone: '615-532-6530',
      website: 'https://www.tn.gov/didd',
    },
    keyLegalCitations: ['TN SB 1880 (Autism Insurance Mandate)', 'TCA § 56-7-2360 (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  VA: {
    state: 'Virginia',
    stateAbbr: 'VA',
    medicaidWaivers: [
      {
        name: 'DD Waiver',
        description: 'Comprehensive home and community-based services for individuals with developmental disabilities',
        coveredServices: ['ABA Therapy', 'Residential Services', 'Day Support', 'Respite Care', 'Behavioral Support', 'Supported Employment'],
        ageRange: 'All ages',
        waitlistInfo: 'Significant waitlist; priority based on urgency of need',
      },
      {
        name: 'Building Independence (BI) Waiver',
        description: 'Community-based supports for individuals with developmental disabilities who need moderate levels of support',
        coveredServices: ['Community Engagement', 'Supported Living', 'Respite Care', 'Behavioral Consultation'],
        ageRange: 'All ages',
      },
      {
        name: 'Family and Individual Support (FIS) Waiver',
        description: 'Supports for individuals with developmental disabilities living with family members',
        coveredServices: ['Respite Care', 'Family Training', 'Companion Services', 'Assistive Technology', 'Environmental Modifications'],
        ageRange: 'All ages',
      },
      {
        name: 'Commonwealth Coordinated Care Plus (CCC Plus)',
        description: 'Managed long-term services and supports for Medicaid members with complex care needs',
        coveredServices: ['ABA Therapy', 'Personal Care', 'Respite Care', 'Skilled Nursing', 'Therapy Services'],
        ageRange: 'All ages',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'HB 2467 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under 10 with a $36,000 annual cap.',
      ageCap: 10,
      dollarCap: '$36,000/year',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under HB 2467 for under 10 with $36k/year cap; Medicaid EPSDT has no cap' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through DD, BI, and FIS waivers' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: under 10. DD/BI/FIS waivers: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability', 'Developmental Disability'],
      incomeRequirements: 'Medicaid: up to 138% FPL (Medicaid expansion). Waivers: functional eligibility through CSB.',
    },
    applicationSteps: [
      'Apply for Virginia Medicaid at commonhelp.virginia.gov or call 1-855-242-8282',
      'Contact VA Department of Behavioral Health & Developmental Services (DBHDS) at 804-786-3921',
      'Connect with your local Community Services Board (CSB) for developmental disability services',
      'For Early Intervention (ages 0-3): contact the Infant & Toddler Connection at 1-800-234-1448',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Apply for DD waiver through CSB and develop Individual Support Plan',
    ],
    contactInfo: {
      agency: 'Virginia Department of Behavioral Health & Developmental Services',
      phone: '804-786-3921',
      website: 'https://dbhds.virginia.gov',
    },
    keyLegalCitations: ['VA HB 2467 (Autism Insurance Mandate)', 'VA Code § 38.2-3418.17 (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  WA: {
    state: 'Washington',
    stateAbbr: 'WA',
    medicaidWaivers: [
      {
        name: 'Basic Plus Waiver',
        description: 'Home and community-based services for individuals with developmental disabilities needing moderate supports',
        coveredServices: ['ABA Therapy', 'Respite Care', 'Personal Care', 'Behavioral Support', 'Community Inclusion', 'Employment Services'],
        ageRange: 'All ages',
        waitlistInfo: 'No formal waitlist; services based on assessed need and available funding',
      },
      {
        name: 'Core Waiver',
        description: 'Comprehensive home and community-based services for individuals with developmental disabilities',
        coveredServices: ['ABA Therapy', 'Residential Services', 'Day Programs', 'Respite Care', 'Behavioral Support', 'Supported Living'],
        ageRange: 'All ages',
      },
      {
        name: 'Community Protection Waiver',
        description: 'Specialized services for individuals with developmental disabilities who have community protection needs',
        coveredServices: ['Behavioral Support', 'Residential Services', 'Crisis Services', 'Specialized Treatment'],
        ageRange: 'All ages',
      },
      {
        name: 'Children\'s Intensive In-Home Behavioral Support (CIBS)',
        description: 'Intensive behavioral support services for children with developmental disabilities in the home setting',
        coveredServices: ['ABA Therapy', 'Behavioral Consultation', 'Family Training', 'Crisis Support', 'Positive Behavior Support'],
        ageRange: 'Birth to 17',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: 'SB 5946 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under 21 with no dollar cap.',
      ageCap: 21,
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under SB 5946 for under 21 with no dollar cap; medically necessary standard' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT and commercial plans' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through DDA waivers and CIBS program' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: under 21. DDA waivers: all ages.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Intellectual Disability', 'Developmental Disability'],
      incomeRequirements: 'Apple Health (Medicaid): up to 138% FPL (Medicaid expansion). DDA: functional eligibility, not income-based.',
    },
    applicationSteps: [
      'Apply for Apple Health (Medicaid) at wahealthplanfinder.org or call 1-855-923-4633',
      'Contact WA Developmental Disabilities Administration (DDA) at 360-407-1500',
      'Request eligibility determination from DDA regional office',
      'For Early Support for Infants and Toddlers (ages 0-3): call 1-800-322-2588',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Support Plan (ISP) with DDA case resource manager',
    ],
    contactInfo: {
      agency: 'Washington Developmental Disabilities Administration',
      phone: '360-407-1500',
      website: 'https://www.dshs.wa.gov/dda',
    },
    keyLegalCitations: ['WA SB 5946 (Autism Insurance Mandate)', 'RCW § 48.44.450 (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },

  WI: {
    state: 'Wisconsin',
    stateAbbr: 'WI',
    medicaidWaivers: [
      {
        name: 'Children\'s Long-Term Support (CLTS) Waiver',
        description: 'Home and community-based services for children with developmental disabilities, physical disabilities, or severe emotional disturbance',
        coveredServices: ['ABA Therapy', 'Respite Care', 'Daily Living Skills Training', 'Behavioral Support', 'Communication Aids', 'Family Training'],
        ageRange: 'Birth to 21',
        waitlistInfo: 'Waitlist managed by county; contact county human services for current status',
      },
      {
        name: 'Family Care',
        description: 'Managed long-term care program for adults with disabilities providing comprehensive community-based services',
        coveredServices: ['ABA Therapy', 'Supported Living', 'Day Services', 'Respite Care', 'Behavioral Support', 'Supported Employment'],
        ageRange: '18 and older',
        waitlistInfo: 'Contact local Aging and Disability Resource Center (ADRC) for enrollment',
      },
    ],
    epsdtServices: ['Behavioral health screening', 'ABA therapy', 'Speech-language therapy', 'Occupational therapy', 'Psychological evaluation', 'Family training'],
    autismMandate: {
      exists: true,
      summary: '2009 Wisconsin Act 218 requires insurers to cover diagnosis and treatment of autism spectrum disorder including ABA for individuals under 19 with a $50,000 annual cap.',
      ageCap: 19,
      dollarCap: '$50,000/year',
    },
    coveredServices: [
      { id: 'aba', name: 'ABA Therapy', typicallyCovered: true, coverageNotes: 'Covered under Act 218 for under 19 with $50k/year cap; Medicaid EPSDT has no cap' },
      { id: 'speech', name: 'Speech Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'ot', name: 'Occupational Therapy', typicallyCovered: true, coverageNotes: 'Covered under EPSDT for children under 21' },
      { id: 'eval', name: 'Diagnostic Evaluation', typicallyCovered: true, coverageNotes: 'Covered for initial diagnosis and periodic reassessment' },
      { id: 'respite', name: 'Respite Care', typicallyCovered: true, coverageNotes: 'Available through CLTS Waiver and Family Care' },
    ],
    eligibilityCriteria: {
      ageRequirements: 'EPSDT: birth to 21. Mandate: under 19. CLTS: birth to 21. Family Care: 18+.',
      diagnosisRequirements: ['Autism Spectrum Disorder (F84.0)', 'Developmental Disability', 'Intellectual Disability'],
      incomeRequirements: 'BadgerCare Plus: up to 138% FPL (Medicaid expansion). CLTS/Family Care: functional eligibility through county.',
    },
    applicationSteps: [
      'Apply for BadgerCare Plus (Medicaid) at access.wisconsin.gov or call 1-800-362-3002',
      'Contact WI Bureau of Children\'s Services at 608-266-7469 for CLTS Waiver',
      'For adults: contact your local Aging and Disability Resource Center (ADRC) for Family Care',
      'For Birth to 3 Early Intervention: contact county Birth to 3 program or call 1-800-642-7837',
      'Obtain diagnostic evaluation from licensed psychologist or developmental pediatrician',
      'Develop Individual Service Plan with county case manager',
    ],
    contactInfo: {
      agency: 'Wisconsin Bureau of Children\'s Services',
      phone: '608-266-7469',
      website: 'https://www.dhs.wisconsin.gov/clts/',
    },
    keyLegalCitations: ['2009 Wisconsin Act 218 (Autism Insurance Mandate)', 'WI Stat. § 632.895(12m) (Autism Coverage)', '42 U.S.C. § 1396d(r) (Federal EPSDT)'],
  },
};

// Helper: get all state abbreviations with data
export function getAvailableStates(): { abbr: string; name: string }[] {
  return Object.entries(STATE_BENEFITS).map(([abbr, data]) => ({
    abbr,
    name: data.state,
  }));
}

// Helper: check if state has detailed data
export function hasDetailedStateData(stateAbbr: string): boolean {
  return stateAbbr in STATE_BENEFITS;
}

// AI-powered fallback guidance for unlisted states
// Instead of manually adding all 50 states, generate guidance on-the-fly
const ALL_US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AR: 'Arkansas', DE: 'Delaware',
  HI: 'Hawaii', ID: 'Idaho', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MS: 'Mississippi',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NM: 'New Mexico', ND: 'North Dakota', OK: 'Oklahoma', RI: 'Rhode Island',
  SD: 'South Dakota', UT: 'Utah', VT: 'Vermont', WV: 'West Virginia',
  WY: 'Wyoming', DC: 'District of Columbia',
};

export interface AIStateGuidance {
  state: string;
  stateAbbr: string;
  isAIGenerated: true;
  generalGuidance: string[];
  federalProtections: string[];
  suggestedNextSteps: string[];
  contactSuggestion: string;
}

/**
 * Get general guidance for states without detailed data.
 * Uses federal EPSDT guarantees that apply everywhere.
 */
export function getAIStateGuidance(stateAbbr: string): AIStateGuidance | null {
  const stateName = ALL_US_STATES[stateAbbr];
  if (!stateName) return null;
  // If we have real data, don't return AI guidance
  if (stateAbbr in STATE_BENEFITS) return null;

  return {
    state: stateName,
    stateAbbr,
    isAIGenerated: true,
    generalGuidance: [
      `${stateName} participates in federal Medicaid, which includes EPSDT (Early and Periodic Screening, Diagnostic, and Treatment) for children under 21.`,
      'Under EPSDT, states MUST cover any medically necessary service for Medicaid-eligible children — including ABA therapy, speech therapy, and occupational therapy.',
      `Most states have autism insurance mandates requiring commercial insurers to cover ASD treatment. Check ${stateName}'s specific mandate details.`,
      'Many states offer Home and Community-Based Services (HCBS) waivers that can fund parent-as-caregiver programs.',
      `Contact ${stateName}'s Medicaid agency or Department of Developmental Disabilities for waiver program details.`,
    ],
    federalProtections: [
      'EPSDT (42 U.S.C. § 1396d(r)) — Requires states to cover all medically necessary services for children under 21 on Medicaid',
      'ADA / Section 504 — Requires reasonable accommodations in education and public services',
      'IDEA Part B (ages 3-21) — Free Appropriate Public Education including related services',
      'IDEA Part C (ages 0-3) — Early intervention services for infants and toddlers',
      'Olmstead v. L.C. (1999) — Right to receive services in the community rather than institutions',
    ],
    suggestedNextSteps: [
      `Call ${stateName}'s Medicaid hotline and ask about HCBS waiver programs for children with autism/developmental disabilities`,
      'Request an EPSDT screening for your child if they have Medicaid',
      `Search for "${stateName} developmental disabilities waiver" for your state's specific programs`,
      'Contact your local Arc chapter (thearc.org) for free advocacy support',
      'Ask Aminy AI for personalized guidance — say "help me find services in ' + stateName + '"',
    ],
    contactSuggestion: `Search "${stateName} Department of Developmental Disabilities" or call your state Medicaid office. The Arc (thearc.org) has chapters in every state that offer free advocacy.`,
  };
}

/**
 * Get all 50 states + DC (with or without detailed data)
 */
export function getAllStates(): { abbr: string; name: string; hasDetailedData: boolean }[] {
  const detailed = Object.entries(STATE_BENEFITS).map(([abbr, data]) => ({
    abbr,
    name: data.state,
    hasDetailedData: true,
  }));
  const aiOnly = Object.entries(ALL_US_STATES).map(([abbr, name]) => ({
    abbr,
    name,
    hasDetailedData: false,
  }));
  const allStates = [...detailed, ...aiOnly];
  // Deduplicate and sort
  const seen = new Set<string>();
  return allStates
    .filter(s => { if (seen.has(s.abbr)) return false; seen.add(s.abbr); return true; })
    .sort((a, b) => a.name.localeCompare(b.name));
}
