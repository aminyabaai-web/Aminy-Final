/**
 * credentialing-orchestrator.ts
 *
 * AI-orchestrated credentialing system — Headway-level provider support for ABA/behavioral health.
 * Covers CAQH profile management, payer enrollment lifecycle, roster management,
 * credentialing timelines, and enrollment playbooks per payer.
 */

// ============================================================================
// Core Types
// ============================================================================

export interface CredentialingApplication {
  id: string;
  providerId: string;
  providerNPI: string;
  license: {
    number: string;
    state: string;
    type: string;
    expirationDate: string;
    status: 'active' | 'expired' | 'pending-renewal';
  };
  caqhId: string;
  specialty: string;
  targetPayers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CAQHProfileField {
  id: string;
  name: string;
  category: string;
  completed: boolean;
  required: boolean;
  value?: string;
}

export interface CAQHProfile {
  caqhId: string;
  providerId: string;
  completionPercent: number;
  lastAttestedDate: string;
  nextAttestationDue: string;
  daysUntilReAttestation: number;
  fields: CAQHProfileField[];
  categories: {
    name: string;
    totalFields: number;
    completedFields: number;
    percent: number;
  }[];
}

export type PanelApplicationStatus =
  | 'not-started'
  | 'submitted'
  | 'pending'
  | 'credentialed'
  | 'denied';

export interface PanelApplication {
  id: string;
  providerId: string;
  payer: string;
  payerId: string;
  status: PanelApplicationStatus;
  submittedDate: string | null;
  expectedApprovalDate: string | null;
  followUpDate: string | null;
  repContact: {
    name: string;
    phone: string;
    email: string;
  } | null;
  notes: string;
  lastUpdated: string;
}

export interface RosterEntry {
  id: string;
  providerId: string;
  payer: string;
  payerId: string;
  effectiveDate: string;
  terminationDate: string | null;
  contractedRates: {
    cptCode: string;
    description: string;
    rate: number;
  }[];
  coveredServices: string[];
  networkStatus: 'in-network' | 'out-of-network' | 'pending';
}

export interface CredentialingMilestone {
  id: string;
  label: string;
  plannedDate: string;
  actualDate: string | null;
  status: 'completed' | 'in-progress' | 'upcoming' | 'delayed';
  daysFromStart: number;
}

export interface CredentialingTimeline {
  providerId: string;
  payer: string;
  startDate: string;
  milestones: CredentialingMilestone[];
  estimatedCompletionDate: string;
  currentPhase: string;
}

export interface EnrollmentStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedDays: number;
  whoToCall?: string;
  whatToUpload?: string[];
  url?: string;
  completed: boolean;
}

export interface EnrollmentPlaybook {
  payerId: string;
  payerName: string;
  totalEstimatedDays: number;
  steps: EnrollmentStep[];
  tips: string[];
  commonMistakes: string[];
}

export interface CredentialingReadiness {
  providerId: string;
  overallPercent: number;
  gaps: {
    category: string;
    issue: string;
    severity: 'blocking' | 'warning' | 'info';
    action: string;
  }[];
  readyForPayers: string[];
  blockedForPayers: { payer: string; reasons: string[] }[];
}

export interface CredentialingRisk {
  type: 'license-expiry' | 'caqh-re-attestation' | 'cme-lapse' | 'insurance-expiry' | 'board-cert-expiry';
  description: string;
  daysUntilIssue: number;
  severity: 'critical' | 'high' | 'medium';
  action: string;
  link?: string;
}

export interface RosterUpdateLetter {
  letterType: 'address-change' | 'new-location' | 'add-specialty' | 'terminate-provider';
  payer: string;
  providerName: string;
  providerNPI: string;
  content: string;
  generatedAt: string;
}

// ============================================================================
// CAQH Field Definitions (47 fields across 8 categories)
// ============================================================================

const CAQH_FIELD_DEFINITIONS: CAQHProfileField[] = [
  // Personal Information (8 fields)
  { id: 'pi-1', name: 'Legal Name', category: 'Personal Information', completed: true, required: true },
  { id: 'pi-2', name: 'Date of Birth', category: 'Personal Information', completed: true, required: true },
  { id: 'pi-3', name: 'SSN', category: 'Personal Information', completed: true, required: true },
  { id: 'pi-4', name: 'Home Address', category: 'Personal Information', completed: true, required: true },
  { id: 'pi-5', name: 'Business Address', category: 'Personal Information', completed: true, required: true },
  { id: 'pi-6', name: 'Phone Numbers', category: 'Personal Information', completed: true, required: true },
  { id: 'pi-7', name: 'Email Address', category: 'Personal Information', completed: true, required: true },
  { id: 'pi-8', name: 'Gender', category: 'Personal Information', completed: true, required: false },
  // Licensure (6 fields)
  { id: 'lic-1', name: 'Primary State License', category: 'Licensure', completed: true, required: true },
  { id: 'lic-2', name: 'License Number & Expiration', category: 'Licensure', completed: true, required: true },
  { id: 'lic-3', name: 'Additional State Licenses', category: 'Licensure', completed: false, required: false },
  { id: 'lic-4', name: 'DEA Certificate', category: 'Licensure', completed: false, required: false },
  { id: 'lic-5', name: 'CDS Certificate', category: 'Licensure', completed: false, required: false },
  { id: 'lic-6', name: 'Medicare Opt-Out Status', category: 'Licensure', completed: true, required: true },
  // Education & Training (6 fields)
  { id: 'edu-1', name: 'Graduate Education', category: 'Education & Training', completed: true, required: true },
  { id: 'edu-2', name: 'Undergraduate Education', category: 'Education & Training', completed: true, required: true },
  { id: 'edu-3', name: 'Postgraduate Training', category: 'Education & Training', completed: false, required: false },
  { id: 'edu-4', name: 'Internship/Residency', category: 'Education & Training', completed: true, required: false },
  { id: 'edu-5', name: 'Fellowship Training', category: 'Education & Training', completed: false, required: false },
  { id: 'edu-6', name: 'Foreign Medical Graduates', category: 'Education & Training', completed: false, required: false },
  // Board Certifications (5 fields)
  { id: 'bc-1', name: 'Primary Board Certification', category: 'Board Certifications', completed: true, required: true },
  { id: 'bc-2', name: 'Certification Number', category: 'Board Certifications', completed: true, required: true },
  { id: 'bc-3', name: 'Expiration Date', category: 'Board Certifications', completed: true, required: true },
  { id: 'bc-4', name: 'Secondary Board Certification', category: 'Board Certifications', completed: false, required: false },
  { id: 'bc-5', name: 'CME Completion (last 2 years)', category: 'Board Certifications', completed: false, required: true },
  // Professional Liability Insurance (6 fields)
  { id: 'pli-1', name: 'Carrier Name', category: 'Professional Liability', completed: true, required: true },
  { id: 'pli-2', name: 'Policy Number', category: 'Professional Liability', completed: true, required: true },
  { id: 'pli-3', name: 'Coverage Dates', category: 'Professional Liability', completed: true, required: true },
  { id: 'pli-4', name: 'Coverage Amounts', category: 'Professional Liability', completed: true, required: true },
  { id: 'pli-5', name: 'Policy Retrodate', category: 'Professional Liability', completed: true, required: true },
  { id: 'pli-6', name: 'Tail Coverage', category: 'Professional Liability', completed: false, required: false },
  // Hospital Privileges (5 fields)
  { id: 'hp-1', name: 'Primary Hospital Affiliation', category: 'Hospital Privileges', completed: false, required: false },
  { id: 'hp-2', name: 'Privilege Type', category: 'Hospital Privileges', completed: false, required: false },
  { id: 'hp-3', name: 'Privilege Status', category: 'Hospital Privileges', completed: false, required: false },
  { id: 'hp-4', name: 'Admitting Privileges', category: 'Hospital Privileges', completed: false, required: false },
  { id: 'hp-5', name: 'Covering Physician', category: 'Hospital Privileges', completed: false, required: false },
  // Practice Information (7 fields)
  { id: 'prac-1', name: 'Practice Name & NPI', category: 'Practice Information', completed: true, required: true },
  { id: 'prac-2', name: 'Group NPI (if applicable)', category: 'Practice Information', completed: false, required: false },
  { id: 'prac-3', name: 'Tax ID / EIN', category: 'Practice Information', completed: true, required: true },
  { id: 'prac-4', name: 'Billing Address', category: 'Practice Information', completed: true, required: true },
  { id: 'prac-5', name: 'Practice Type', category: 'Practice Information', completed: true, required: true },
  { id: 'prac-6', name: 'Specialties & Subspecialties', category: 'Practice Information', completed: true, required: true },
  { id: 'prac-7', name: 'Languages Spoken', category: 'Practice Information', completed: true, required: false },
  // Disclosures (4 fields)
  { id: 'disc-1', name: 'Malpractice History', category: 'Disclosures', completed: true, required: true },
  { id: 'disc-2', name: 'License Sanctions', category: 'Disclosures', completed: true, required: true },
  { id: 'disc-3', name: 'Criminal History', category: 'Disclosures', completed: true, required: true },
  { id: 'disc-4', name: 'Medicare/Medicaid Exclusions', category: 'Disclosures', completed: true, required: true },
];

// ============================================================================
// Enrollment Playbooks (per payer)
// ============================================================================

const ENROLLMENT_PLAYBOOKS: Record<string, EnrollmentPlaybook> = {
  ahcccs: {
    payerId: 'ahcccs',
    payerName: 'AHCCCS (Arizona Medicaid)',
    totalEstimatedDays: 90,
    steps: [
      {
        stepNumber: 1,
        title: 'Create AHCCCS Online Account',
        description: 'Register at healthearizonaplus.gov and create a provider portal account using your NPI.',
        estimatedDays: 1,
        whatToUpload: ['NPI confirmation letter', 'Government-issued ID'],
        url: 'https://healthearizonaplus.gov',
        completed: false,
      },
      {
        stepNumber: 2,
        title: 'Complete AHCCCS Provider Enrollment Application',
        description: 'Fill out the CMS-855I (individual) or CMS-855B (group) form. AHCCCS also requires the AZ-specific supplemental form.',
        estimatedDays: 5,
        whoToCall: 'AHCCCS Provider Enrollment: (602) 417-7670',
        whatToUpload: ['CMS-855I or 855B', 'AZ supplemental form', 'W-9', 'Voided check for EFT'],
        completed: false,
      },
      {
        stepNumber: 3,
        title: 'Submit Fingerprint Clearance Card',
        description: 'Arizona requires a Level 1 fingerprint clearance card for all behavioral health providers.',
        estimatedDays: 14,
        whoToCall: 'AZ DPS: (602) 223-2279',
        whatToUpload: ['Fingerprint clearance card'],
        url: 'https://www.azdps.gov/services/public/fingerprint',
        completed: false,
      },
      {
        stepNumber: 4,
        title: 'Complete Training Requirements',
        description: 'Complete AHCCCS required training modules on the provider portal: HIPAA, fraud & abuse, and behavioral health standards.',
        estimatedDays: 3,
        whatToUpload: ['Training completion certificates'],
        completed: false,
      },
      {
        stepNumber: 5,
        title: 'Await AHCCCS Review & Approval',
        description: 'AHCCCS will verify your credentials, conduct site visits if needed, and assign your provider ID. Follow up every 2 weeks.',
        estimatedDays: 67,
        whoToCall: 'Provider Relations: (602) 417-7670',
        completed: false,
      },
    ],
    tips: [
      'AHCCCS processing takes 60-90 days — start immediately upon hire',
      'Missing fingerprint card is the #1 delay — submit Day 1',
      'Use CAQH ProView to pre-populate most fields',
      'Ensure your taxonomy code (Applied Behavior Analysis: 103G00000X) is on your NPI record',
    ],
    commonMistakes: [
      'Submitting CMS-855B for solo practitioners (use CMS-855I)',
      'Wrong taxonomy code on NPI',
      'Missing DDD-specific enrollment if serving DDD clients',
    ],
  },
  bcbs_az: {
    payerId: 'bcbs_az',
    payerName: 'Blue Cross Blue Shield of Arizona',
    totalEstimatedDays: 60,
    steps: [
      {
        stepNumber: 1,
        title: 'Submit CAQH ProView Application',
        description: 'Ensure your CAQH profile is 100% complete and re-attested within 120 days. BCBS AZ pulls directly from CAQH.',
        estimatedDays: 2,
        whatToUpload: ['CAQH attestation confirmation'],
        url: 'https://proview.caqh.org',
        completed: false,
      },
      {
        stepNumber: 2,
        title: 'Request BCBS AZ Participation',
        description: 'Email provider.relations@bcbsaz.com with your NPI, CAQH ID, specialty, and a brief cover letter requesting panel consideration.',
        estimatedDays: 3,
        whoToCall: 'BCBS AZ Provider Relations: (602) 864-4400',
        whatToUpload: ['Cover letter', 'NPI documentation', 'Current state license'],
        completed: false,
      },
      {
        stepNumber: 3,
        title: 'Complete BCBS AZ Credentialing Application',
        description: 'BCBS AZ will send their proprietary credentialing packet. Complete within 30 days of receipt.',
        estimatedDays: 7,
        whatToUpload: ['Malpractice insurance certificate', 'Board certification', 'CV/Resume'],
        completed: false,
      },
      {
        stepNumber: 4,
        title: 'Primary Source Verification',
        description: 'BCBS AZ verifies licenses, board certs, and education directly. No action required — monitor your email for requests.',
        estimatedDays: 21,
        whoToCall: 'Credentialing Dept: (602) 864-4400 ext. 2',
        completed: false,
      },
      {
        stepNumber: 5,
        title: 'Contract Review & Signature',
        description: 'Review the BCBS AZ participation agreement. Negotiate rates if possible — initial offer is rarely final for ABA.',
        estimatedDays: 14,
        completed: false,
      },
      {
        stepNumber: 6,
        title: 'Roster Activation',
        description: 'After contract execution, BCBS AZ activates you on their provider directory. Verify your listing at bcbsaz.com.',
        estimatedDays: 13,
        completed: false,
      },
    ],
    tips: [
      '100% CAQH completion is mandatory — incomplete profile = automatic rejection',
      'BCBS AZ has periodic enrollment freezes — ask if panels are open before applying',
      'Negotiating rates: ABA H-codes typically start 15-20% below market',
      'Get your effective date in writing before seeing any BCBS members',
    ],
    commonMistakes: [
      'CAQH not re-attested in 120 days (auto-denied)',
      'Accepting first-offer rates without negotiation',
      'Missing effective date documentation',
    ],
  },
  uhc: {
    payerId: 'uhc',
    payerName: 'UnitedHealthcare / Optum',
    totalEstimatedDays: 45,
    steps: [
      {
        stepNumber: 1,
        title: 'Apply via UnitedHealthcare Provider Portal',
        description: 'Go to uhcprovider.com → Join Our Network → Individual Provider Application. UHC uses CAQH + their own supplemental data.',
        estimatedDays: 3,
        whatToUpload: ['CAQH authorization release', 'Optum-specific supplemental form'],
        url: 'https://www.uhcprovider.com',
        completed: false,
      },
      {
        stepNumber: 2,
        title: 'Complete Optum Behavioral Health Module',
        description: 'UHC routes behavioral health credentialing through Optum BH. Complete the Optum-specific credentialing questionnaire.',
        estimatedDays: 5,
        whoToCall: 'Optum BH Credentialing: (877) 614-0484',
        completed: false,
      },
      {
        stepNumber: 3,
        title: 'Credential Committee Review',
        description: 'Optum BH credential committee meets monthly. Your application joins the next queue.',
        estimatedDays: 30,
        whoToCall: 'Follow up weekly with Optum credentialing coordinator',
        completed: false,
      },
      {
        stepNumber: 4,
        title: 'Contract Execution & Network Activation',
        description: 'Sign participation agreement. Effective date is typically the first of the following month.',
        estimatedDays: 7,
        completed: false,
      },
    ],
    tips: [
      'Optum BH credentialing is separate from medical UHC — don\'t confuse portals',
      'Monthly committee cycle: miss the cutoff, wait another 30 days',
      'ABA providers: ensure H0031, H0032, H2019 CPT codes are in your application',
    ],
    commonMistakes: [
      'Applying to UHC medical instead of Optum Behavioral Health',
      'Missing behavioral health-specific CPT codes',
    ],
  },
  aetna: {
    payerId: 'aetna',
    payerName: 'Aetna / CVS Health',
    totalEstimatedDays: 75,
    steps: [
      {
        stepNumber: 1,
        title: 'Request Network Participation',
        description: 'Complete the online network participation request at availity.com. Aetna uses Availity as their credentialing gateway.',
        estimatedDays: 2,
        url: 'https://www.availity.com',
        whatToUpload: ['Online request form', 'NPI documentation'],
        completed: false,
      },
      {
        stepNumber: 2,
        title: 'Complete Aetna Credentialing Application',
        description: 'Aetna sends their credentialing packet via DocuSign. Most data pre-fills from CAQH. Complete remaining fields within 30 days.',
        estimatedDays: 7,
        whoToCall: 'Aetna Provider Relations: (800) 624-0756',
        whatToUpload: ['Completed Aetna application', 'Malpractice certificate', 'W-9'],
        completed: false,
      },
      {
        stepNumber: 3,
        title: 'Primary Source Verification',
        description: 'Aetna verifies all credentials directly. This is the longest phase — 30-45 business days typical.',
        estimatedDays: 45,
        completed: false,
      },
      {
        stepNumber: 4,
        title: 'Contract Negotiation',
        description: 'Aetna offers standard rates. For ABA, negotiate based on your outcomes data and patient panel size.',
        estimatedDays: 14,
        completed: false,
      },
      {
        stepNumber: 5,
        title: 'Network Activation',
        description: 'Confirm your listing on Aetna\'s provider directory and verify your effective date.',
        estimatedDays: 7,
        completed: false,
      },
    ],
    tips: [
      'Aetna\'s behavioral health carve-out: some AZ plans go through Beacon Health Options',
      'Ask specifically if the patient\'s plan is Aetna-managed or Beacon-managed before treating',
    ],
    commonMistakes: [
      'Not checking if behavioral health is carved out to Beacon',
      'Missing Availity enrollment before applying',
    ],
  },
  cigna: {
    payerId: 'cigna',
    payerName: 'Cigna / Evernorth',
    totalEstimatedDays: 60,
    steps: [
      {
        stepNumber: 1,
        title: 'Submit via Cigna for Providers Portal',
        description: 'Create an account at cignaforhcp.com and complete the online network participation request.',
        estimatedDays: 2,
        url: 'https://www.cignaforhcp.com',
        completed: false,
      },
      {
        stepNumber: 2,
        title: 'Complete Evernorth Behavioral Health Application',
        description: 'Cigna routes behavioral health through Evernorth. Complete their specific credentialing packet — CAQH data pre-fills most fields.',
        estimatedDays: 5,
        whoToCall: 'Evernorth Credentialing: (800) 926-2273',
        whatToUpload: ['Evernorth application', 'Board certification docs', 'Supervision agreement (for RBTs)'],
        completed: false,
      },
      {
        stepNumber: 3,
        title: 'Credential Committee Review',
        description: 'Evernorth committee reviews your application. Typically 30 days from complete application receipt.',
        estimatedDays: 30,
        completed: false,
      },
      {
        stepNumber: 4,
        title: 'Contract & Activation',
        description: 'Sign participation agreement and verify network activation on provider directory.',
        estimatedDays: 23,
        completed: false,
      },
    ],
    tips: [
      'Cigna BH and Cigna medical are unified through Evernorth — single application',
      'Cigna often has open panels for ABA — good target for new practices',
    ],
    commonMistakes: [
      'Not specifying behavioral health specialty in initial application',
    ],
  },
};

// ============================================================================
// Demo Data
// ============================================================================

export const DEMO_PROVIDERS: {
  application: CredentialingApplication;
  caqhProfile: CAQHProfile;
  panelApplications: PanelApplication[];
  rosterEntries: RosterEntry[];
}[] = [
  {
    application: {
      id: 'prov-001',
      providerId: 'prov-001',
      providerNPI: '1234567890',
      license: {
        number: 'AZ-BCBA-4521',
        state: 'AZ',
        type: 'BCBA',
        expirationDate: '2026-11-15',
        status: 'active',
      },
      caqhId: 'CAQH-882341',
      specialty: 'Applied Behavior Analysis',
      targetPayers: ['ahcccs', 'bcbs_az', 'uhc', 'aetna'],
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2026-03-15T00:00:00Z',
    },
    caqhProfile: {
      caqhId: 'CAQH-882341',
      providerId: 'prov-001',
      completionPercent: 89,
      lastAttestedDate: '2025-12-20',
      nextAttestationDue: '2026-04-19',
      daysUntilReAttestation: 16,
      fields: CAQH_FIELD_DEFINITIONS.map(f => ({
        ...f,
        completed: ['pi-', 'lic-1', 'lic-2', 'lic-6', 'bc-1', 'bc-2', 'bc-3', 'pli-1', 'pli-2', 'pli-3', 'pli-4', 'pli-5', 'prac-', 'disc-', 'edu-1', 'edu-2', 'edu-4'].some(p => f.id.startsWith(p.replace('-', ''))) ? true : f.completed,
      })),
      categories: [
        { name: 'Personal Information', totalFields: 8, completedFields: 8, percent: 100 },
        { name: 'Licensure', totalFields: 6, completedFields: 4, percent: 67 },
        { name: 'Education & Training', totalFields: 6, completedFields: 3, percent: 50 },
        { name: 'Board Certifications', totalFields: 5, completedFields: 4, percent: 80 },
        { name: 'Professional Liability', totalFields: 6, completedFields: 5, percent: 83 },
        { name: 'Hospital Privileges', totalFields: 5, completedFields: 0, percent: 0 },
        { name: 'Practice Information', totalFields: 7, completedFields: 6, percent: 86 },
        { name: 'Disclosures', totalFields: 4, completedFields: 4, percent: 100 },
      ],
    },
    panelApplications: [
      {
        id: 'panel-001',
        providerId: 'prov-001',
        payer: 'AHCCCS',
        payerId: 'ahcccs',
        status: 'credentialed',
        submittedDate: '2024-02-01',
        expectedApprovalDate: '2024-05-01',
        followUpDate: null,
        repContact: { name: 'Maria Santos', phone: '(602) 417-7670', email: 'provider.enrollment@ahcccs.gov' },
        notes: 'Credentialed. Effective 2024-05-15.',
        lastUpdated: '2024-05-15',
      },
      {
        id: 'panel-002',
        providerId: 'prov-001',
        payer: 'BCBS AZ',
        payerId: 'bcbs_az',
        status: 'credentialed',
        submittedDate: '2024-03-01',
        expectedApprovalDate: '2024-05-01',
        followUpDate: null,
        repContact: { name: 'James Park', phone: '(602) 864-4400', email: 'provider.relations@bcbsaz.com' },
        notes: 'Credentialed. Contracted rate $18.50/unit for H2019.',
        lastUpdated: '2024-05-03',
      },
      {
        id: 'panel-003',
        providerId: 'prov-001',
        payer: 'UnitedHealthcare / Optum',
        payerId: 'uhc',
        status: 'pending',
        submittedDate: '2026-01-15',
        expectedApprovalDate: '2026-04-15',
        followUpDate: '2026-04-10',
        repContact: { name: 'Optum Credentialing Team', phone: '(877) 614-0484', email: 'credentialing@optum.com' },
        notes: 'Application under committee review. Follow up April 10.',
        lastUpdated: '2026-03-20',
      },
      {
        id: 'panel-004',
        providerId: 'prov-001',
        payer: 'Aetna',
        payerId: 'aetna',
        status: 'not-started',
        submittedDate: null,
        expectedApprovalDate: null,
        followUpDate: '2026-04-15',
        repContact: null,
        notes: 'Scheduled to start April 15.',
        lastUpdated: '2026-03-28',
      },
    ],
    rosterEntries: [
      {
        id: 'roster-001',
        providerId: 'prov-001',
        payer: 'AHCCCS',
        payerId: 'ahcccs',
        effectiveDate: '2024-05-15',
        terminationDate: null,
        contractedRates: [
          { cptCode: 'H2019', description: 'Behavior Treatment — RBT', rate: 8.50 },
          { cptCode: 'H0032', description: 'BCBA Supervision', rate: 18.50 },
          { cptCode: '97151', description: 'Behavior ID Assessment', rate: 145.00 },
        ],
        coveredServices: ['ABA Therapy', 'Behavioral Assessment', 'Parent Training', 'Supervision'],
        networkStatus: 'in-network',
      },
      {
        id: 'roster-002',
        providerId: 'prov-001',
        payer: 'BCBS AZ',
        payerId: 'bcbs_az',
        effectiveDate: '2024-05-03',
        terminationDate: null,
        contractedRates: [
          { cptCode: 'H2019', description: 'Behavior Treatment — RBT', rate: 9.25 },
          { cptCode: 'H0032', description: 'BCBA Supervision', rate: 21.00 },
          { cptCode: '97151', description: 'Behavior ID Assessment', rate: 165.00 },
        ],
        coveredServices: ['ABA Therapy', 'Behavioral Assessment', 'Parent Training'],
        networkStatus: 'in-network',
      },
    ],
  },
  {
    // Provider 2: CAQH incomplete, just starting
    application: {
      id: 'prov-002',
      providerId: 'prov-002',
      providerNPI: '9876543210',
      license: {
        number: 'AZ-BCBA-6781',
        state: 'AZ',
        type: 'BCBA',
        expirationDate: '2026-05-20',
        status: 'active',
      },
      caqhId: 'CAQH-994521',
      specialty: 'Applied Behavior Analysis',
      targetPayers: ['ahcccs', 'uhc', 'cigna'],
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-03-28T00:00:00Z',
    },
    caqhProfile: {
      caqhId: 'CAQH-994521',
      providerId: 'prov-002',
      completionPercent: 52,
      lastAttestedDate: '2025-08-10',
      nextAttestationDue: '2025-12-08',
      daysUntilReAttestation: -116, // OVERDUE
      fields: CAQH_FIELD_DEFINITIONS.map(f => ({
        ...f,
        completed: ['pi-1', 'pi-2', 'pi-3', 'pi-4', 'pi-7', 'lic-1', 'lic-2', 'prac-1', 'prac-3', 'prac-4', 'prac-5', 'disc-3', 'disc-4'].includes(f.id),
      })),
      categories: [
        { name: 'Personal Information', totalFields: 8, completedFields: 5, percent: 63 },
        { name: 'Licensure', totalFields: 6, completedFields: 2, percent: 33 },
        { name: 'Education & Training', totalFields: 6, completedFields: 0, percent: 0 },
        { name: 'Board Certifications', totalFields: 5, completedFields: 0, percent: 0 },
        { name: 'Professional Liability', totalFields: 6, completedFields: 0, percent: 0 },
        { name: 'Hospital Privileges', totalFields: 5, completedFields: 0, percent: 0 },
        { name: 'Practice Information', totalFields: 7, completedFields: 4, percent: 57 },
        { name: 'Disclosures', totalFields: 4, completedFields: 2, percent: 50 },
      ],
    },
    panelApplications: [
      {
        id: 'panel-005',
        providerId: 'prov-002',
        payer: 'AHCCCS',
        payerId: 'ahcccs',
        status: 'not-started',
        submittedDate: null,
        expectedApprovalDate: null,
        followUpDate: null,
        repContact: null,
        notes: 'Cannot start until CAQH is complete and re-attested.',
        lastUpdated: '2026-03-28',
      },
      {
        id: 'panel-006',
        providerId: 'prov-002',
        payer: 'UnitedHealthcare / Optum',
        payerId: 'uhc',
        status: 'not-started',
        submittedDate: null,
        expectedApprovalDate: null,
        followUpDate: null,
        repContact: null,
        notes: 'Blocked on CAQH completion.',
        lastUpdated: '2026-03-28',
      },
    ],
    rosterEntries: [],
  },
  {
    // Provider 3: Fully credentialed, one payer denied
    application: {
      id: 'prov-003',
      providerId: 'prov-003',
      providerNPI: '5544332211',
      license: {
        number: 'AZ-SLP-2341',
        state: 'AZ',
        type: 'SLP',
        expirationDate: '2026-06-30',
        status: 'active',
      },
      caqhId: 'CAQH-771234',
      specialty: 'Speech-Language Pathology',
      targetPayers: ['ahcccs', 'bcbs_az', 'aetna', 'cigna'],
      createdAt: '2023-06-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    },
    caqhProfile: {
      caqhId: 'CAQH-771234',
      providerId: 'prov-003',
      completionPercent: 98,
      lastAttestedDate: '2026-02-15',
      nextAttestationDue: '2026-06-15',
      daysUntilReAttestation: 73,
      fields: CAQH_FIELD_DEFINITIONS.map(f => ({ ...f, completed: f.id !== 'hp-1' && f.id !== 'hp-2' })),
      categories: [
        { name: 'Personal Information', totalFields: 8, completedFields: 8, percent: 100 },
        { name: 'Licensure', totalFields: 6, completedFields: 6, percent: 100 },
        { name: 'Education & Training', totalFields: 6, completedFields: 6, percent: 100 },
        { name: 'Board Certifications', totalFields: 5, completedFields: 5, percent: 100 },
        { name: 'Professional Liability', totalFields: 6, completedFields: 6, percent: 100 },
        { name: 'Hospital Privileges', totalFields: 5, completedFields: 3, percent: 60 },
        { name: 'Practice Information', totalFields: 7, completedFields: 7, percent: 100 },
        { name: 'Disclosures', totalFields: 4, completedFields: 4, percent: 100 },
      ],
    },
    panelApplications: [
      {
        id: 'panel-007',
        providerId: 'prov-003',
        payer: 'AHCCCS',
        payerId: 'ahcccs',
        status: 'credentialed',
        submittedDate: '2023-07-01',
        expectedApprovalDate: '2023-10-01',
        followUpDate: null,
        repContact: { name: 'Maria Santos', phone: '(602) 417-7670', email: 'provider.enrollment@ahcccs.gov' },
        notes: 'Active. Re-credentialing due 2025-10-01.',
        lastUpdated: '2023-10-05',
      },
      {
        id: 'panel-008',
        providerId: 'prov-003',
        payer: 'BCBS AZ',
        payerId: 'bcbs_az',
        status: 'credentialed',
        submittedDate: '2023-08-01',
        expectedApprovalDate: '2023-10-01',
        followUpDate: null,
        repContact: { name: 'James Park', phone: '(602) 864-4400', email: 'provider.relations@bcbsaz.com' },
        notes: 'Active.',
        lastUpdated: '2023-10-15',
      },
      {
        id: 'panel-009',
        providerId: 'prov-003',
        payer: 'Aetna',
        payerId: 'aetna',
        status: 'denied',
        submittedDate: '2025-01-10',
        expectedApprovalDate: null,
        followUpDate: '2026-06-01',
        repContact: { name: 'Aetna Provider Relations', phone: '(800) 624-0756', email: 'providerrelations@aetna.com' },
        notes: 'Denied — panels closed for SLP in Maricopa County. Re-apply June 2026 when panels reopen.',
        lastUpdated: '2025-03-20',
      },
      {
        id: 'panel-010',
        providerId: 'prov-003',
        payer: 'Cigna',
        payerId: 'cigna',
        status: 'submitted',
        submittedDate: '2026-02-20',
        expectedApprovalDate: '2026-04-20',
        followUpDate: '2026-04-15',
        repContact: { name: 'Evernorth Credentialing', phone: '(800) 926-2273', email: 'credentialing@evernorth.com' },
        notes: 'Under review.',
        lastUpdated: '2026-03-01',
      },
    ],
    rosterEntries: [
      {
        id: 'roster-003',
        providerId: 'prov-003',
        payer: 'AHCCCS',
        payerId: 'ahcccs',
        effectiveDate: '2023-10-05',
        terminationDate: null,
        contractedRates: [
          { cptCode: '92507', description: 'Speech-Language Pathology Treatment', rate: 95.00 },
          { cptCode: '92521', description: 'Fluency Evaluation', rate: 145.00 },
        ],
        coveredServices: ['Speech Therapy', 'Language Evaluation', 'AAC Assessment'],
        networkStatus: 'in-network',
      },
    ],
  },
];

// ============================================================================
// Core Functions
// ============================================================================

export function assessCredentialingReadiness(providerId: string): CredentialingReadiness {
  const provider = DEMO_PROVIDERS.find(p => p.application.providerId === providerId) ?? DEMO_PROVIDERS[0];
  const { application, caqhProfile, panelApplications } = provider;

  const gaps: CredentialingReadiness['gaps'] = [];

  // Check CAQH completion
  if (caqhProfile.completionPercent < 100) {
    gaps.push({
      category: 'CAQH Profile',
      issue: `CAQH profile is ${caqhProfile.completionPercent}% complete — missing ${100 - caqhProfile.completionPercent}% of required fields`,
      severity: caqhProfile.completionPercent < 70 ? 'blocking' : 'warning',
      action: 'Log in to CAQH ProView and complete all required fields',
    });
  }

  // Check CAQH re-attestation
  if (caqhProfile.daysUntilReAttestation < 0) {
    gaps.push({
      category: 'CAQH Re-Attestation',
      issue: `CAQH re-attestation is overdue by ${Math.abs(caqhProfile.daysUntilReAttestation)} days — payers may reject applications`,
      severity: 'blocking',
      action: 'Re-attest CAQH profile immediately at proview.caqh.org',
    });
  } else if (caqhProfile.daysUntilReAttestation < 30) {
    gaps.push({
      category: 'CAQH Re-Attestation',
      issue: `CAQH re-attestation due in ${caqhProfile.daysUntilReAttestation} days`,
      severity: 'warning',
      action: 'Re-attest CAQH profile before the deadline',
    });
  }

  // Check license expiration
  const licenseExpiry = new Date(application.license.expirationDate);
  const today = new Date();
  const daysToLicenseExpiry = Math.floor((licenseExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysToLicenseExpiry < 0) {
    gaps.push({
      category: 'State License',
      issue: 'License is expired — you cannot bill or treat patients',
      severity: 'blocking',
      action: `Renew your ${application.license.state} ${application.license.type} license immediately`,
    });
  } else if (daysToLicenseExpiry < 60) {
    gaps.push({
      category: 'State License',
      issue: `${application.license.type} license expires in ${daysToLicenseExpiry} days (${application.license.expirationDate})`,
      severity: daysToLicenseExpiry < 30 ? 'blocking' as const : 'warning' as const,
      action: 'Renew license and update CAQH with new expiration date',
    });
  }

  const blockingCount = gaps.filter(g => g.severity === 'blocking').length;
  const overallPercent = blockingCount > 0 ? Math.min(60, caqhProfile.completionPercent) : Math.round((caqhProfile.completionPercent * 0.6) + (panelApplications.filter(p => p.status === 'credentialed').length / Math.max(1, application.targetPayers.length) * 40));

  return {
    providerId,
    overallPercent,
    gaps,
    readyForPayers: panelApplications.filter(p => p.status === 'credentialed').map(p => p.payer),
    blockedForPayers: panelApplications.filter(p => p.status === 'not-started').map(p => ({
      payer: p.payer,
      reasons: gaps.filter(g => g.severity === 'blocking').map(g => g.issue),
    })),
  };
}

export function generateEnrollmentPlan(
  providerId: string,
  targetPayers: string[]
): { payer: string; playbook: EnrollmentPlaybook; estimatedStartDate: string; estimatedEndDate: string }[] {
  const provider = DEMO_PROVIDERS.find(p => p.application.providerId === providerId) ?? DEMO_PROVIDERS[0];
  const today = new Date();

  return targetPayers.map((payerId, index) => {
    const playbook = ENROLLMENT_PLAYBOOKS[payerId] ?? ENROLLMENT_PLAYBOOKS.ahcccs;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + index * 7); // stagger starts
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + playbook.totalEstimatedDays);

    return {
      payer: playbook.payerName,
      playbook: {
        ...playbook,
        steps: playbook.steps.map(s => ({
          ...s,
          completed: provider.panelApplications.find(p => p.payerId === payerId)?.status === 'credentialed',
        })),
      },
      estimatedStartDate: startDate.toISOString().split('T')[0],
      estimatedEndDate: endDate.toISOString().split('T')[0],
    };
  });
}

export function flagCredentialingRisks(providerId: string): CredentialingRisk[] {
  const provider = DEMO_PROVIDERS.find(p => p.application.providerId === providerId) ?? DEMO_PROVIDERS[0];
  const { application, caqhProfile } = provider;
  const risks: CredentialingRisk[] = [];
  const today = new Date();

  // License expiry
  const licenseExpiry = new Date(application.license.expirationDate);
  const daysToLicenseExpiry = Math.floor((licenseExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysToLicenseExpiry < 90) {
    risks.push({
      type: 'license-expiry',
      description: `Your ${application.license.state} ${application.license.type} license expires in ${daysToLicenseExpiry} days (${application.license.expirationDate})`,
      daysUntilIssue: daysToLicenseExpiry,
      severity: daysToLicenseExpiry < 30 ? 'critical' : daysToLicenseExpiry < 60 ? 'high' : 'medium',
      action: 'Renew license now and update CAQH with new expiration',
      link: 'https://azbn.gov/licensure/renewal',
    });
  }

  // CAQH re-attestation
  if (caqhProfile.daysUntilReAttestation < 30) {
    risks.push({
      type: 'caqh-re-attestation',
      description: caqhProfile.daysUntilReAttestation < 0
        ? `CAQH re-attestation OVERDUE by ${Math.abs(caqhProfile.daysUntilReAttestation)} days — payers may reject claims`
        : `CAQH re-attestation due in ${caqhProfile.daysUntilReAttestation} days`,
      daysUntilIssue: caqhProfile.daysUntilReAttestation,
      severity: caqhProfile.daysUntilReAttestation < 0 ? 'critical' : 'high',
      action: 'Re-attest at proview.caqh.org immediately',
      link: 'https://proview.caqh.org',
    });
  }

  // CME check (simplified)
  const cmeMissing = caqhProfile.fields.find(f => f.id === 'bc-5' && !f.completed);
  if (cmeMissing) {
    risks.push({
      type: 'cme-lapse',
      description: 'CME completion records not documented in CAQH — required for re-credentialing',
      daysUntilIssue: 30,
      severity: 'medium',
      action: 'Upload CME certificates to CAQH profile under Board Certifications',
    });
  }

  return risks.sort((a, b) => a.daysUntilIssue - b.daysUntilIssue);
}

export function estimateApprovalTimeline(payer: string, specialty: string): {
  payer: string;
  specialty: string;
  estimatedDays: number;
  range: { min: number; max: number };
  notes: string;
} {
  const timelines: Record<string, { days: number; min: number; max: number; notes: string }> = {
    ahcccs: { days: 90, min: 60, max: 120, notes: 'Varies by DDD vs. AHCCCS standard plan; DDD adds 2-4 weeks' },
    bcbs_az: { days: 60, min: 45, max: 90, notes: 'Panel availability affects timing; panels close periodically' },
    uhc: { days: 45, min: 30, max: 60, notes: 'Monthly committee cycle is the primary bottleneck' },
    aetna: { days: 75, min: 60, max: 90, notes: 'PSV phase is longest; Beacon carve-out adds complexity' },
    cigna: { days: 60, min: 45, max: 75, notes: 'Evernorth BH is efficient; panels generally open for ABA/SLP' },
  };

  const payerKey = payer.toLowerCase().replace(/[^a-z]/g, '_').replace(/_+/g, '_');
  const timeline = timelines[payerKey] ?? { days: 75, min: 45, max: 120, notes: 'Contact payer directly for current processing times' };

  // SLP/OT often faster than ABA for some payers
  const specialtyModifier = specialty.toLowerCase().includes('speech') ? -10 : 0;

  return {
    payer,
    specialty,
    estimatedDays: timeline.days + specialtyModifier,
    range: { min: timeline.min, max: timeline.max },
    notes: timeline.notes,
  };
}

export function generateRosterUpdateLetter(
  provider: { name: string; npi: string; specialty: string },
  payer: string,
  changeType: 'address-change' | 'new-location' | 'add-specialty' | 'terminate-provider'
): RosterUpdateLetter {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const letterContent: Record<string, string> = {
    'address-change': `${today}

To: ${payer} Provider Relations Department
Re: Provider Roster Update — Address Change

Dear Provider Relations Team,

I am writing to notify ${payer} of an address change for the following provider:

Provider Name: ${provider.name}
NPI: ${provider.npi}
Specialty: ${provider.specialty}

Effective immediately, please update our records to reflect the new practice address:
[New Address Line 1]
[City, State, ZIP]

The new phone number is: [Phone Number]
The new fax number is: [Fax Number]

Please confirm receipt of this update and provide written confirmation of the roster update. If you require additional documentation, please contact us at [Email].

Respectfully,
${provider.name}, ${provider.specialty}
NPI: ${provider.npi}`,

    'new-location': `${today}

To: ${payer} Provider Relations Department
Re: Provider Roster Update — Addition of New Service Location

Dear Provider Relations Team,

Please update the provider directory to include a new service location for:

Provider Name: ${provider.name}
NPI: ${provider.npi}
Specialty: ${provider.specialty}

New Service Location:
[Location Name]
[Address]
[City, State, ZIP]
Phone: [Phone]
Fax: [Fax]

This location is [owned/leased] and services will begin on [Effective Date].

Enclosed: [Business license, liability insurance certificate showing new location]

Please confirm roster update within 30 days per our participation agreement.

Respectfully,
${provider.name}
NPI: ${provider.npi}`,

    'add-specialty': `${today}

To: ${payer} Credentialing Department
Re: Provider Roster Update — Addition of Specialty/Service

Dear Credentialing Team,

I am requesting the addition of a new specialty/service to my participation agreement with ${payer}:

Provider Name: ${provider.name}
NPI: ${provider.npi}
Current Specialty: ${provider.specialty}
Requested Addition: [New Specialty or Service]

Supporting documentation enclosed:
- Additional licensure/certification for requested specialty
- Updated CAQH profile reference (CAQH ID: [XXXX])
- Updated liability insurance showing new specialty coverage

Effective Date Requested: [Date]

Please advise on any additional credentialing requirements for this specialty addition.

Respectfully,
${provider.name}
NPI: ${provider.npi}`,

    'terminate-provider': `${today}

To: ${payer} Provider Relations Department
Re: Provider Roster Termination — Voluntary Withdrawal

Dear Provider Relations Team,

This letter serves as formal notice of voluntary termination from the ${payer} network for:

Provider Name: ${provider.name}
NPI: ${provider.npi}
Specialty: ${provider.specialty}

Termination Effective Date: [Date — typically 90 days from notice per contract]

Reason for termination: [Practice closure / Relocating out of network area / Other]

Per our participation agreement, I will continue to see current ${payer} patients through the termination date and will ensure appropriate transitions of care.

Please confirm receipt and provide written termination confirmation for our records.

Respectfully,
${provider.name}
NPI: ${provider.npi}`,
  };

  return {
    letterType: changeType,
    payer,
    providerName: provider.name,
    providerNPI: provider.npi,
    content: letterContent[changeType] ?? letterContent['address-change'],
    generatedAt: new Date().toISOString(),
  };
}

export function getEnrollmentPlaybook(payerId: string): EnrollmentPlaybook | null {
  return ENROLLMENT_PLAYBOOKS[payerId] ?? null;
}

export function getDemoProvider(index = 0) {
  return DEMO_PROVIDERS[Math.min(index, DEMO_PROVIDERS.length - 1)];
}
