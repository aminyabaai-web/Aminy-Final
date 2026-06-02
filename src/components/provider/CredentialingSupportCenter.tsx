// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CredentialingSupportCenter.tsx
 *
 * Headway-quality credentialing support center for providers.
 * Tabs: CAQH, Enrollment, Roster, AI Playbooks, Claim Queue, Denial Ops, Status, Help.
 *
 * Enhanced with:
 * - AI Enrollment Workflow (step-by-step wizard per payer)
 * - AI QA Checklist (NPI, TaxID, malpractice, license, DEA, CAQH completeness)
 * - AI Denial Ops (auto-categorize, appeal letter gen, deadline tracking, success probability)
 * - Smart Status Dashboard (per-payer status, days since submission, missing docs, re-cred calendar)
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  FileCheck,
  Building2,
  Bot,
  Receipt,
  HelpCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Send,
  ArrowLeft,
  Calendar,
  Upload,
  Zap,
  BookOpen,
  Users,
  FileText,
  ArrowRight,
  Sparkles,
  MessageSquare,
  BarChart3,
  Copy,
  TrendingUp,
  ClipboardCheck,
  Gauge,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { ScreenHeader } from '../ui/ScreenHeader';
import { isDemoMode } from '../../lib/demo-seed';
import { useOpenAI } from '../../lib/ai-sparkle-context';

// ============================================================================
// Types
// ============================================================================

type TabId = 'caqh' | 'enrollment' | 'roster' | 'playbooks' | 'claims' | 'denial-ops' | 'status' | 'help';

export interface CredentialingSupportCenterProps {
  providerId?: string;
  providerName?: string;
  onBack?: () => void;
}

export interface CAQHDocument {
  id: string;
  name: string;
  required: boolean;
  uploaded: boolean;
  expiresAt?: string;
  status: 'valid' | 'expiring' | 'expired' | 'missing';
}

export interface EnrollmentApplication {
  id: string;
  payerName: string;
  payerLogo?: string;
  submittedAt: string;
  stage: 'application' | 'processing' | 'credentialing' | 'active' | 'denied';
  estimatedCompletion?: string;
  notes?: string;
}

export interface RosterEntry {
  id: string;
  payerName: string;
  effectiveDate: string;
  recredentialingDate: string;
  status: 'active' | 'pending' | 'expiring' | 'expired';
  contractType: string;
}

export interface ClaimQueueItem {
  id: string;
  patientName: string;
  dateOfService: string;
  cptCode: string;
  payer: string;
  amount: number;
  validationStatus: 'ready' | 'warning' | 'error';
  validationMessage?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

/** Payer enrollment workflow step */
export interface EnrollmentWizardStep {
  id: string;
  title: string;
  description: string;
  estimatedDays: number;
  requiredDocs: string[];
  commonPitfalls: string[];
  completed: boolean;
}

/** Payer-specific enrollment workflow */
export interface PayerEnrollmentWorkflow {
  payerId: string;
  payerName: string;
  totalEstimatedDays: number;
  steps: EnrollmentWizardStep[];
}

/** QA checklist item */
export interface QAChecklistItem {
  id: string;
  label: string;
  category: 'identity' | 'license' | 'insurance' | 'compliance' | 'profile';
  status: 'pass' | 'fail' | 'warning' | 'pending';
  detail: string;
  actionRequired?: string;
}

/** Denial record */
export interface DenialRecord {
  id: string;
  claimId: string;
  patientName: string;
  dateOfService: string;
  payer: string;
  denialCode: string;
  denialCategory: DenialCategory;
  amount: number;
  deniedAt: string;
  appealDeadline: string;
  daysUntilDeadline: number;
  successProbability: number;
  status: 'new' | 'appealing' | 'won' | 'lost' | 'expired';
  appealLetter?: string;
}

export type DenialCategory =
  | 'auth-expired'
  | 'wrong-cpt'
  | 'timely-filing'
  | 'medical-necessity'
  | 'missing-info'
  | 'coding-error'
  | 'duplicate-claim'
  | 'patient-eligibility'
  | 'out-of-network'
  | 'other';

/** Smart status entry */
export interface CredentialingStatusEntry {
  id: string;
  payerName: string;
  enrollmentStatus: 'pending' | 'approved' | 'rejected' | 're-credentialing-due';
  daysSinceSubmission: number;
  missingDocuments: string[];
  reCredentialingDate?: string;
  lastUpdated: string;
  nextAction?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_CAQH_DOCS: CAQHDocument[] = [
  { id: '1', name: 'Medical License', required: true, uploaded: true, expiresAt: '2027-03-15', status: 'valid' },
  { id: '2', name: 'DEA Certificate', required: true, uploaded: true, expiresAt: '2026-06-30', status: 'expiring' },
  { id: '3', name: 'Board Certification', required: true, uploaded: true, expiresAt: '2028-12-01', status: 'valid' },
  { id: '4', name: 'Malpractice Insurance', required: true, uploaded: true, expiresAt: '2026-09-01', status: 'valid' },
  { id: '5', name: 'CV/Resume', required: true, uploaded: true, status: 'valid' },
  { id: '6', name: 'Professional References', required: true, uploaded: false, status: 'missing' },
  { id: '7', name: 'ECFMG Certificate', required: false, uploaded: false, status: 'missing' },
  { id: '8', name: 'W-9 Form', required: true, uploaded: true, status: 'valid' },
  { id: '9', name: 'Disclosure Attestation', required: true, uploaded: true, status: 'valid' },
  { id: '10', name: 'Work History', required: true, uploaded: false, status: 'missing' },
];

const MOCK_ENROLLMENTS: EnrollmentApplication[] = [
  { id: '1', payerName: 'Aetna', submittedAt: '2026-01-15', stage: 'active', notes: 'Fully credentialed' },
  { id: '2', payerName: 'BCBS Arizona', submittedAt: '2026-02-01', stage: 'credentialing', estimatedCompletion: '2026-05-01', notes: 'Committee review scheduled' },
  { id: '3', payerName: 'UnitedHealthcare', submittedAt: '2026-02-20', stage: 'processing', estimatedCompletion: '2026-06-15' },
  { id: '4', payerName: 'Cigna', submittedAt: '2026-03-01', stage: 'application', estimatedCompletion: '2026-07-01' },
  { id: '5', payerName: 'Humana', submittedAt: '2026-03-10', stage: 'denied', notes: 'Network at capacity — appeal submitted' },
];

const MOCK_ROSTER: RosterEntry[] = [
  { id: '1', payerName: 'Aetna', effectiveDate: '2025-06-01', recredentialingDate: '2027-06-01', status: 'active', contractType: 'In-Network' },
  { id: '2', payerName: 'Medicare', effectiveDate: '2024-01-15', recredentialingDate: '2026-07-15', status: 'expiring', contractType: 'Par Provider' },
  { id: '3', payerName: 'AHCCCS', effectiveDate: '2025-09-01', recredentialingDate: '2027-09-01', status: 'active', contractType: 'Medicaid' },
  { id: '4', payerName: 'Tricare', effectiveDate: '2025-03-01', recredentialingDate: '2026-04-20', status: 'expiring', contractType: 'Network' },
];

const MOCK_CLAIM_QUEUE: ClaimQueueItem[] = [
  { id: '1', patientName: 'Alex M.', dateOfService: '2026-03-28', cptCode: '90834', payer: 'Aetna', amount: 150, validationStatus: 'ready' },
  { id: '2', patientName: 'Jordan K.', dateOfService: '2026-03-28', cptCode: '90837', payer: 'BCBS Arizona', amount: 185, validationStatus: 'warning', validationMessage: 'Prior auth expires in 3 days' },
  { id: '3', patientName: 'Sam R.', dateOfService: '2026-03-27', cptCode: '97153', payer: 'AHCCCS', amount: 240, validationStatus: 'ready' },
  { id: '4', patientName: 'Taylor P.', dateOfService: '2026-03-27', cptCode: '90791', payer: 'Aetna', amount: 200, validationStatus: 'error', validationMessage: 'Missing diagnosis code' },
  { id: '5', patientName: 'Riley C.', dateOfService: '2026-03-26', cptCode: '90834', payer: 'UnitedHealthcare', amount: 150, validationStatus: 'warning', validationMessage: 'Out-of-network — superbill recommended' },
];

const MOCK_DENIALS: DenialRecord[] = [
  {
    id: 'd1', claimId: 'CLM-1042', patientName: 'Alex M.', dateOfService: '2026-02-15',
    payer: 'BCBS Arizona', denialCode: 'CO-197', denialCategory: 'auth-expired',
    amount: 185, deniedAt: '2026-03-10', appealDeadline: '2026-06-10',
    daysUntilDeadline: 69, successProbability: 72, status: 'new',
  },
  {
    id: 'd2', claimId: 'CLM-1058', patientName: 'Jordan K.', dateOfService: '2026-02-20',
    payer: 'Aetna', denialCode: 'CO-50', denialCategory: 'medical-necessity',
    amount: 240, deniedAt: '2026-03-15', appealDeadline: '2026-06-15',
    daysUntilDeadline: 74, successProbability: 45, status: 'appealing',
    appealLetter: 'Appeal letter submitted 03/20/2026 with updated treatment plan and progress notes.',
  },
  {
    id: 'd3', claimId: 'CLM-1071', patientName: 'Sam R.', dateOfService: '2026-01-10',
    payer: 'AHCCCS', denialCode: 'CO-29', denialCategory: 'timely-filing',
    amount: 150, deniedAt: '2026-03-25', appealDeadline: '2026-04-25',
    daysUntilDeadline: 23, successProbability: 35, status: 'new',
  },
  {
    id: 'd4', claimId: 'CLM-1085', patientName: 'Taylor P.', dateOfService: '2026-03-01',
    payer: 'UnitedHealthcare', denialCode: 'CO-16', denialCategory: 'missing-info',
    amount: 200, deniedAt: '2026-03-28', appealDeadline: '2026-06-28',
    daysUntilDeadline: 87, successProbability: 88, status: 'new',
  },
  {
    id: 'd5', claimId: 'CLM-0998', patientName: 'Riley C.', dateOfService: '2025-12-15',
    payer: 'Cigna', denialCode: 'CO-97', denialCategory: 'coding-error',
    amount: 175, deniedAt: '2026-02-01', appealDeadline: '2026-05-01',
    daysUntilDeadline: 29, successProbability: 65, status: 'appealing',
  },
];

const MOCK_QA_CHECKLIST: QAChecklistItem[] = [
  { id: 'q1', label: 'NPI Verification (Type 1)', category: 'identity', status: 'pass', detail: 'NPI 1234567890 verified via NPPES. Type 1 (individual) confirmed.' },
  { id: 'q2', label: 'NPI Verification (Type 2)', category: 'identity', status: 'warning', detail: 'Type 2 NPI (organizational) not on file. Required if billing under a group.', actionRequired: 'Add Type 2 NPI if applicable' },
  { id: 'q3', label: 'Tax ID / EIN Validation', category: 'identity', status: 'pass', detail: 'EIN 82-1234567 validated. Matches IRS records.' },
  { id: 'q4', label: 'Malpractice Insurance', category: 'insurance', status: 'pass', detail: 'Professional liability policy active through 09/01/2026. Coverage: $1M/$3M.' },
  { id: 'q5', label: 'State License Expiry', category: 'license', status: 'pass', detail: 'AZ license #PSY-12345 valid through 03/15/2027.' },
  { id: 'q6', label: 'DEA Number', category: 'license', status: 'warning', detail: 'DEA certificate expires 06/30/2026 (89 days). Renewal recommended.', actionRequired: 'Renew DEA certificate' },
  { id: 'q7', label: 'CAQH Profile Completeness', category: 'profile', status: 'fail', detail: 'CAQH profile 75% complete. Missing: Professional References, Work History.', actionRequired: 'Upload missing documents to CAQH' },
  { id: 'q8', label: 'Background Check', category: 'compliance', status: 'pass', detail: 'OIG/SAM exclusion check passed. Last run: 03/01/2026.' },
  { id: 'q9', label: 'Board Certification', category: 'license', status: 'pass', detail: 'Board certified in Clinical Psychology. Valid through 12/01/2028.' },
  { id: 'q10', label: 'Disclosure Attestation', category: 'compliance', status: 'pass', detail: 'Disclosure form signed 01/15/2026. No adverse actions reported.' },
];

const MOCK_STATUS_ENTRIES: CredentialingStatusEntry[] = [
  { id: 's1', payerName: 'Aetna', enrollmentStatus: 'approved', daysSinceSubmission: 77, missingDocuments: [], reCredentialingDate: '2028-01-15', lastUpdated: '2026-01-15', nextAction: 'No action needed until re-credentialing' },
  { id: 's2', payerName: 'BCBS Arizona', enrollmentStatus: 'pending', daysSinceSubmission: 60, missingDocuments: [], reCredentialingDate: undefined, lastUpdated: '2026-03-20', nextAction: 'Committee review scheduled for April 15' },
  { id: 's3', payerName: 'UnitedHealthcare', enrollmentStatus: 'pending', daysSinceSubmission: 41, missingDocuments: ['Work History'], reCredentialingDate: undefined, lastUpdated: '2026-03-10', nextAction: 'Upload Work History to complete application' },
  { id: 's4', payerName: 'Cigna', enrollmentStatus: 'pending', daysSinceSubmission: 32, missingDocuments: ['Professional References', 'Work History'], reCredentialingDate: undefined, lastUpdated: '2026-03-28', nextAction: 'Upload 2 missing documents' },
  { id: 's5', payerName: 'Humana', enrollmentStatus: 'rejected', daysSinceSubmission: 23, missingDocuments: [], reCredentialingDate: undefined, lastUpdated: '2026-03-25', nextAction: 'Appeal submitted — awaiting payer response' },
  { id: 's6', payerName: 'Medicare', enrollmentStatus: 're-credentialing-due', daysSinceSubmission: 440, missingDocuments: [], reCredentialingDate: '2026-07-15', lastUpdated: '2026-03-01', nextAction: 'Begin re-credentialing process (due in 105 days)' },
  { id: 's7', payerName: 'AHCCCS', enrollmentStatus: 'approved', daysSinceSubmission: 213, missingDocuments: [], reCredentialingDate: '2027-09-01', lastUpdated: '2025-09-01', nextAction: 'No action needed until re-credentialing' },
  { id: 's8', payerName: 'Tricare', enrollmentStatus: 're-credentialing-due', daysSinceSubmission: 397, missingDocuments: [], reCredentialingDate: '2026-04-20', lastUpdated: '2026-03-15', nextAction: 'Re-credentialing due in 18 days — urgent' },
];

const FAQS: FAQ[] = [
  { question: 'How long does credentialing typically take?', answer: 'Initial credentialing with most commercial payers takes 60-120 days from application submission. Medicare can take 60-90 days. Medicaid varies by state but typically 30-90 days. Aminy tracks each timeline and alerts you to delays.' },
  { question: 'What is CAQH and do I need it?', answer: 'CAQH ProView is a universal credentialing database used by most payers. Keeping your CAQH profile current (re-attested every 120 days) dramatically speeds up enrollment with new payers. Aminy monitors your attestation status automatically.' },
  { question: 'How do I add a new insurance payer?', answer: 'Open the AI Playbooks tab and choose "I need a new payer," or ask the AI Credentialing Assistant. Aminy walks you through the payer-specific steps, what to verify on your CAQH profile, and the documents each payer requires.' },
  { question: 'What happens when my credentials expire?', answer: 'Aminy sends alerts at 90, 60, and 30 days before expiration. Expired credentials can result in claim denials and payer disenrollment. Use the CAQH tab to see all upcoming expirations.' },
  { question: 'Can Aminy help with claim denials?', answer: 'Yes. The Denial Ops tab auto-categorizes denials, suggests corrections, generates payer-specific appeal letters, and tracks appeal deadlines with success probability estimates.' },
  { question: 'How do I submit claims through Aminy?', answer: 'The Claim Queue tab shows all sessions ready for billing. Aminy validates claims before submission, checking for missing info, expired auths, and coding issues. You can submit individually or batch-submit.' },
];

// ============================================================================
// Payer Playbooks — step-by-step enrollment guides per payer
// ============================================================================

export interface PayerPlaybook {
  payerId: string;
  payerName: string;
  enrollmentUrl: string;
  requiredDocuments: string[];
  estimatedProcessingTime: string;
  callScript: string;
  commonRejectionReasons: string[];
  tips: string[];
}

export const PAYER_PLAYBOOKS: PayerPlaybook[] = [
  {
    payerId: 'ahcccs',
    payerName: 'AHCCCS (Arizona Medicaid)',
    enrollmentUrl: 'https://azahcccs.gov/PlansProviders/NewProviders/EnrollmentProcess.html',
    requiredDocuments: [
      'NPI Confirmation Letter',
      'Tax ID/EIN Letter (IRS CP-575 or 147C)',
      'Arizona Fingerprint Clearance Card (Level 1)',
      'OIG/SAM Exclusion Check (current month)',
      'Professional License (AZ Board verified)',
      'Malpractice Insurance COI ($1M/$3M minimum)',
      'W-9 Form',
      'Practice Address Verification',
      'CAQH ProView Attestation (within 120 days)',
    ],
    estimatedProcessingTime: '60-90 days from complete application',
    callScript:
      'Hello, I am calling to check on the status of a provider enrollment application for [Provider Name], NPI [NPI Number]. The application was submitted on [Date] through the AHCCCS Provider Enrollment Portal. Can you confirm it has been received and advise on the current status and any outstanding items? My provider ID reference is [AHCCCS ID if issued].',
    commonRejectionReasons: [
      'Expired fingerprint clearance card',
      'NPI/Tax ID mismatch between application and NPPES',
      'Wrong provider category selected (must be Behavioral Health)',
      'Missing OIG exclusion check documentation',
      'Incomplete practice address (must match NPI registry)',
      'Failed to respond to Request for Information (RFI) within 30 days',
    ],
    tips: [
      'Check the AHCCCS Provider Enrollment Portal weekly for RFI notices — they have a 30-day response window.',
      'Ensure your Level 1 fingerprint card is current before applying; renewals take 2-4 weeks.',
      'Link your AHCCCS Provider ID to your NPI in NPPES as soon as it is issued.',
      'Use taxonomy code 103T00000X for Psychologist or 106H00000X for Marriage & Family Therapist.',
      'If you serve DDD/HCBS members, a separate DDD provider enrollment is also required.',
    ],
  },
  {
    payerId: 'bcbs-az',
    payerName: 'BCBS Arizona',
    enrollmentUrl: 'https://www.azblue.com/providers/join-our-network',
    requiredDocuments: [
      'CAQH ProView Profile (100% complete, attested within 120 days)',
      'NPI Confirmation Letter (Type 1 and Type 2 if applicable)',
      'Arizona Professional License',
      'Board Certification (if applicable)',
      'Malpractice Insurance COI (current)',
      'DEA Certificate (if applicable)',
      'W-9 Form',
      'CV/Resume with complete work history',
      'Professional References (3 minimum)',
      'Disclosure Attestation',
    ],
    estimatedProcessingTime: '90-120 days from complete application',
    callScript:
      'Hello, I am calling to follow up on a provider credentialing application for [Provider Name], NPI [NPI Number], CAQH ID [CAQH ID]. The application was submitted on [Date]. Can you confirm the current stage of review and whether any additional documentation is needed? I would also like to confirm the next credentialing committee meeting date.',
    commonRejectionReasons: [
      'CAQH profile not attested within 120 days',
      'Panel closed in the provider geographic area',
      'Applied to wrong specialty panel',
      'Missing malpractice COI in CAQH profile',
      'Gaps in work history not explained',
      'Education verification delays from institutions',
      'Failed to respond to committee RFI within 14 days',
    ],
    tips: [
      'BCBS pulls directly from CAQH — ensure your CAQH profile is 100% complete before applying.',
      'Credentialing committee meets monthly; missing a cycle adds 30+ days.',
      'The effective date is typically the committee approval date, NOT retroactive to application date.',
      'Call Provider Relations to confirm your specialty panel is open before applying.',
      'Keep your CAQH re-attested every 90 days during the credentialing process.',
    ],
  },
  {
    payerId: 'uhc',
    payerName: 'UnitedHealthcare',
    enrollmentUrl: 'https://www.uhcprovider.com/en/resource-library/join-our-network.html',
    requiredDocuments: [
      'CAQH ProView Profile (complete and attested)',
      'NPI Confirmation Letter',
      'State Professional License',
      'Board Certification',
      'Malpractice Insurance COI',
      'DEA Certificate (if prescribing)',
      'W-9 Form',
      'Practice Information (TIN, address, phone)',
    ],
    estimatedProcessingTime: '90-120 days from complete application',
    callScript:
      'Hello, I am calling UnitedHealthcare Provider Services to check on a credentialing application for [Provider Name], NPI [NPI Number]. The application was submitted on [Date] via [portal/CAQH]. Can you provide the current status, any pending items, and an estimated completion date?',
    commonRejectionReasons: [
      'Network at capacity in the provider service area',
      'Incomplete CAQH profile',
      'Malpractice insurance limits below UHC minimum requirements',
      'Specialty not currently being credentialed',
      'Application submitted for wrong UHC product line (Commercial vs Optum Behavioral)',
    ],
    tips: [
      'UHC has separate credentialing for Commercial, Medicare Advantage, and Optum Behavioral Health.',
      'Apply through both UHC and Optum if you want to see behavioral health members.',
      'Use the UHC Provider Portal to track application status — phone hold times can exceed 45 minutes.',
      'UHC allows 180 days for appeals if your application is denied.',
      'Modifier validation is strict for therapy services — verify payer-specific modifier requirements.',
    ],
  },
  {
    payerId: 'aetna',
    payerName: 'Aetna',
    enrollmentUrl: 'https://www.aetna.com/health-care-professionals/join-aetna-network.html',
    requiredDocuments: [
      'CAQH ProView Profile (complete and attested)',
      'NPI Confirmation Letter',
      'State Professional License',
      'Board Certification',
      'Malpractice Insurance COI ($1M/$3M)',
      'DEA Certificate (if applicable)',
      'W-9 Form',
      'Signed Aetna Provider Agreement',
    ],
    estimatedProcessingTime: '60-90 days from complete application',
    callScript:
      'Hello, I am calling Aetna Provider Relations to follow up on a credentialing application for [Provider Name], NPI [NPI Number], CAQH ID [CAQH ID]. The application was submitted on [Date]. Can you confirm it is in process and advise on any outstanding requirements or the expected credentialing timeline?',
    commonRejectionReasons: [
      'Network at capacity for the provider specialty and geography',
      'CAQH profile incomplete or attestation expired',
      'Malpractice insurance does not meet minimum requirements',
      'Missing autism mandate documentation for ABA providers',
      'Incorrect taxonomy code on NPPES',
    ],
    tips: [
      'Aetna typically processes faster than BCBS or UHC — 60-90 days is common.',
      'Check the autism mandate routing for your state before applying for ABA services.',
      'Aetna allows 180 days for first-level appeals on credentialing denials.',
      'Ensure your medical necessity packet is ready if providing autism/behavioral services.',
      'Aetna shares credentialing with CVS Health — one application may cover multiple products.',
    ],
  },
  {
    payerId: 'cigna',
    payerName: 'Cigna',
    enrollmentUrl: 'https://www.cigna.com/health-care-providers/coverage-and-claims/join-our-network',
    requiredDocuments: [
      'CAQH ProView Profile (complete and attested)',
      'NPI Confirmation Letter',
      'State Professional License',
      'Board Certification (if applicable)',
      'Malpractice Insurance COI',
      'DEA Certificate (if applicable)',
      'W-9 Form',
      'Treatment Plan Template (for behavioral health)',
      'Provider Attestation Form',
    ],
    estimatedProcessingTime: '90-120 days from complete application',
    callScript:
      'Hello, I am calling Cigna Provider Services to check on a credentialing application for [Provider Name], NPI [NPI Number]. The application was submitted on [Date]. Can you provide the current review status, any pending document requests, and the expected timeline to completion?',
    commonRejectionReasons: [
      'Network adequacy met for the provider specialty and area',
      'Incomplete prior-authorization packet',
      'Missing treatment plan documentation',
      'Provider attestation form not signed',
      'CAQH profile not fully verified',
    ],
    tips: [
      'Cigna requires a treatment plan and provider attestation for behavioral health credentialing.',
      'Prior-auth packets should include the treatment plan AND progress notes.',
      'Cigna Behavioral Health is separate from Cigna Medical — apply to both if needed.',
      'Cigna allows 180 days for appeal of credentialing decisions.',
      'Evernorth (Cigna behavioral) may have different network availability than Cigna Medical.',
    ],
  },
];

// ============================================================================
// AI QA Checklist — NPI, Tax ID, license, malpractice, CAQH, DEA validation
// ============================================================================

export interface ProviderQAInput {
  npi?: string;
  taxId?: string;
  licenseExpirationDate?: string; // ISO date
  malpracticeCoverageStart?: string; // ISO date
  malpracticeCoverageEnd?: string; // ISO date
  caqhCompletenessPercent?: number;
  deaNumber?: string;
  deaExpirationDate?: string; // ISO date
}

export interface ProviderQAResult {
  overallStatus: 'pass' | 'warning' | 'fail';
  checks: QAChecklistItem[];
  passCount: number;
  failCount: number;
  warningCount: number;
}

/**
 * Validates NPI using the Luhn algorithm (10-digit NPI check).
 * NPI is prefixed with "80840" for the Luhn check per CMS spec.
 */
function validateNPILuhn(npi: string): boolean {
  if (!/^\d{10}$/.test(npi)) return false;
  const prefixed = '80840' + npi;
  let sum = 0;
  let alternate = false;
  for (let i = prefixed.length - 1; i >= 0; i--) {
    let n = parseInt(prefixed[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/**
 * Validates Tax ID format (XX-XXXXXXX) and basic structure.
 */
function validateTaxIdFormat(taxId: string): boolean {
  return /^\d{2}-\d{7}$/.test(taxId);
}

/**
 * Runs a comprehensive QA validation on provider credentialing data.
 * Returns pass/fail/warning for each check with actionable details.
 */
export function validateProviderQA(input: ProviderQAInput): ProviderQAResult {
  const checks: QAChecklistItem[] = [];
  const today = new Date();

  // 1. NPI Format (10-digit Luhn)
  if (input.npi) {
    const isValidFormat = /^\d{10}$/.test(input.npi);
    const isValidLuhn = validateNPILuhn(input.npi);
    checks.push({
      id: 'qa-npi',
      label: 'NPI Validation (Luhn Check)',
      category: 'identity',
      status: isValidFormat && isValidLuhn ? 'pass' : 'fail',
      detail: isValidFormat && isValidLuhn
        ? `NPI ${input.npi} passes 10-digit Luhn validation.`
        : !isValidFormat
          ? `NPI "${input.npi}" is not a valid 10-digit number.`
          : `NPI ${input.npi} fails Luhn check digit validation.`,
      actionRequired: !(isValidFormat && isValidLuhn) ? 'Verify NPI at https://npiregistry.cms.hhs.gov/' : undefined,
    });
  } else {
    checks.push({
      id: 'qa-npi',
      label: 'NPI Validation (Luhn Check)',
      category: 'identity',
      status: 'fail',
      detail: 'NPI number is not provided.',
      actionRequired: 'Enter NPI number for validation.',
    });
  }

  // 2. Tax ID Format (XX-XXXXXXX)
  if (input.taxId) {
    const isValid = validateTaxIdFormat(input.taxId);
    checks.push({
      id: 'qa-taxid',
      label: 'Tax ID / EIN Format',
      category: 'identity',
      status: isValid ? 'pass' : 'fail',
      detail: isValid
        ? `Tax ID ${input.taxId} matches expected format (XX-XXXXXXX).`
        : `Tax ID "${input.taxId}" does not match format XX-XXXXXXX.`,
      actionRequired: !isValid ? 'Correct Tax ID to format XX-XXXXXXX (e.g., 82-1234567).' : undefined,
    });
  } else {
    checks.push({
      id: 'qa-taxid',
      label: 'Tax ID / EIN Format',
      category: 'identity',
      status: 'fail',
      detail: 'Tax ID / EIN is not provided.',
      actionRequired: 'Enter Tax ID for validation.',
    });
  }

  // 3. License expiration (flag if < 90 days)
  if (input.licenseExpirationDate) {
    const expDate = new Date(input.licenseExpirationDate);
    const daysUntilExp = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let status: QAChecklistItem['status'] = 'pass';
    let detail = `License expires ${input.licenseExpirationDate} (${daysUntilExp} days from today).`;
    let actionRequired: string | undefined;
    if (daysUntilExp < 0) {
      status = 'fail';
      detail = `License EXPIRED on ${input.licenseExpirationDate} (${Math.abs(daysUntilExp)} days ago).`;
      actionRequired = 'License is expired. Renew immediately — claims will be denied.';
    } else if (daysUntilExp < 90) {
      status = 'warning';
      detail = `License expires in ${daysUntilExp} days (${input.licenseExpirationDate}). Less than 90-day threshold.`;
      actionRequired = 'Begin license renewal process now to avoid lapse.';
    }
    checks.push({ id: 'qa-license', label: 'State License Expiration', category: 'license', status, detail, actionRequired });
  } else {
    checks.push({
      id: 'qa-license',
      label: 'State License Expiration',
      category: 'license',
      status: 'fail',
      detail: 'License expiration date not provided.',
      actionRequired: 'Enter license expiration date for validation.',
    });
  }

  // 4. Malpractice coverage dates
  if (input.malpracticeCoverageStart && input.malpracticeCoverageEnd) {
    const startDate = new Date(input.malpracticeCoverageStart);
    const endDate = new Date(input.malpracticeCoverageEnd);
    const daysUntilEnd = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isCurrentlyCovered = startDate <= today && endDate >= today;
    let status: QAChecklistItem['status'] = isCurrentlyCovered ? 'pass' : 'fail';
    let detail = isCurrentlyCovered
      ? `Malpractice coverage active: ${input.malpracticeCoverageStart} to ${input.malpracticeCoverageEnd} (${daysUntilEnd} days remaining).`
      : `Malpractice coverage gap detected. Coverage: ${input.malpracticeCoverageStart} to ${input.malpracticeCoverageEnd}.`;
    let actionRequired: string | undefined;
    if (!isCurrentlyCovered) {
      actionRequired = 'Malpractice coverage is not active for today. Update policy immediately.';
    } else if (daysUntilEnd < 90) {
      status = 'warning';
      detail = `Malpractice coverage expires in ${daysUntilEnd} days (${input.malpracticeCoverageEnd}).`;
      actionRequired = 'Renew malpractice policy before expiration to avoid credentialing disruption.';
    }
    checks.push({ id: 'qa-malpractice', label: 'Malpractice Coverage Dates', category: 'insurance', status, detail, actionRequired });
  } else {
    checks.push({
      id: 'qa-malpractice',
      label: 'Malpractice Coverage Dates',
      category: 'insurance',
      status: 'fail',
      detail: 'Malpractice coverage dates not provided.',
      actionRequired: 'Enter malpractice coverage start and end dates.',
    });
  }

  // 5. CAQH completeness percentage
  if (input.caqhCompletenessPercent != null) {
    const pct = input.caqhCompletenessPercent;
    let status: QAChecklistItem['status'] = 'pass';
    let actionRequired: string | undefined;
    if (pct < 80) {
      status = 'fail';
      actionRequired = `CAQH profile is only ${pct}% complete. Most payers require 100% to begin credentialing.`;
    } else if (pct < 100) {
      status = 'warning';
      actionRequired = `CAQH profile is ${pct}% complete. Upload remaining documents to reach 100%.`;
    }
    checks.push({
      id: 'qa-caqh',
      label: 'CAQH Profile Completeness',
      category: 'profile',
      status,
      detail: `CAQH profile is ${pct}% complete.`,
      actionRequired,
    });
  } else {
    checks.push({
      id: 'qa-caqh',
      label: 'CAQH Profile Completeness',
      category: 'profile',
      status: 'pending',
      detail: 'CAQH completeness percentage not available.',
      actionRequired: 'Check your CAQH ProView profile and enter completeness percentage.',
    });
  }

  // 6. DEA registration (if applicable)
  if (input.deaNumber) {
    const deaValid = /^[A-Z]{2}\d{7}$/.test(input.deaNumber);
    let status: QAChecklistItem['status'] = deaValid ? 'pass' : 'fail';
    let detail = deaValid
      ? `DEA number ${input.deaNumber} matches expected format.`
      : `DEA number "${input.deaNumber}" does not match format (2 letters + 7 digits).`;
    let actionRequired: string | undefined;
    if (!deaValid) {
      actionRequired = 'Verify DEA registration number format.';
    }
    // Check DEA expiration if provided
    if (deaValid && input.deaExpirationDate) {
      const deaExpDate = new Date(input.deaExpirationDate);
      const daysUntilDeaExp = Math.floor((deaExpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDeaExp < 0) {
        status = 'fail';
        detail = `DEA certificate EXPIRED on ${input.deaExpirationDate}.`;
        actionRequired = 'DEA certificate is expired. Renew via DEA online portal immediately.';
      } else if (daysUntilDeaExp < 90) {
        status = 'warning';
        detail = `DEA certificate expires in ${daysUntilDeaExp} days (${input.deaExpirationDate}).`;
        actionRequired = 'Begin DEA renewal — processing takes 4-6 weeks.';
      }
    }
    checks.push({ id: 'qa-dea', label: 'DEA Registration', category: 'license', status, detail, actionRequired });
  }

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;

  let overallStatus: ProviderQAResult['overallStatus'] = 'pass';
  if (failCount > 0) overallStatus = 'fail';
  else if (warningCount > 0) overallStatus = 'warning';

  return { overallStatus, checks, passCount, failCount, warningCount };
}

// ============================================================================
// Enrollment Status Tracker
// ============================================================================

export type EnrollmentStatusPhase =
  | 'not-started'
  | 'application-submitted'
  | 'under-review'
  | 'credentialed'
  | 'effective';

export interface EnrollmentStatusRecord {
  payerId: string;
  payerName: string;
  phase: EnrollmentStatusPhase;
  submittedDate?: string;
  estimatedDaysRemaining: number;
  nextAction: string;
  notes?: string;
}

export const ENROLLMENT_STATUS_PHASES: { phase: EnrollmentStatusPhase; label: string; description: string }[] = [
  { phase: 'not-started', label: 'Not Started', description: 'Application has not been submitted yet.' },
  { phase: 'application-submitted', label: 'Application Submitted', description: 'Application received by payer; awaiting initial review.' },
  { phase: 'under-review', label: 'Under Review', description: 'Payer is conducting primary source verification and committee review.' },
  { phase: 'credentialed', label: 'Credentialed', description: 'Provider has been approved; contract pending.' },
  { phase: 'effective', label: 'Effective', description: 'Provider is active on payer panel and can submit claims.' },
];

export const MOCK_ENROLLMENT_STATUS_TRACKER: EnrollmentStatusRecord[] = [
  { payerId: 'ahcccs', payerName: 'AHCCCS (Arizona Medicaid)', phase: 'effective', estimatedDaysRemaining: 0, nextAction: 'No action needed. Active on AHCCCS panel.', submittedDate: '2025-06-15' },
  { payerId: 'bcbs-az', payerName: 'BCBS Arizona', phase: 'under-review', estimatedDaysRemaining: 45, nextAction: 'Credentialing committee review scheduled April 15. No action required unless RFI received.', submittedDate: '2026-02-01' },
  { payerId: 'uhc', payerName: 'UnitedHealthcare', phase: 'application-submitted', estimatedDaysRemaining: 75, nextAction: 'Upload Work History to CAQH to complete application.', submittedDate: '2026-02-20' },
  { payerId: 'aetna', payerName: 'Aetna', phase: 'effective', estimatedDaysRemaining: 0, nextAction: 'No action needed. Active on Aetna panel.', submittedDate: '2025-10-01' },
  { payerId: 'cigna', payerName: 'Cigna', phase: 'not-started', estimatedDaysRemaining: 120, nextAction: 'Begin application: upload Professional References and Work History to CAQH first.' },
];

// ============================================================================
// Payer Enrollment Workflows
// ============================================================================

const PAYER_WORKFLOWS: PayerEnrollmentWorkflow[] = [
  {
    payerId: 'ahcccs',
    payerName: 'AHCCCS (Arizona Medicaid)',
    totalEstimatedDays: 90,
    steps: [
      {
        id: 'ahcccs-1', title: 'Submit DDD Provider Application', description: 'Complete the AHCCCS Provider Enrollment Portal application. Select "Behavioral Health" category. You will need your NPI, Tax ID, and practice information.',
        estimatedDays: 1, requiredDocs: ['NPI Confirmation', 'Tax ID/EIN Letter', 'Practice Address Verification'], commonPitfalls: ['Selecting wrong provider category', 'Mismatched NPI/Tax ID', 'Incomplete practice address'], completed: false,
      },
      {
        id: 'ahcccs-2', title: 'Background Check & Fingerprinting', description: 'Schedule Level 1 fingerprint clearance through AZ DPS. AHCCCS requires all providers to pass OIG/SAM exclusion screening.',
        estimatedDays: 14, requiredDocs: ['Fingerprint Clearance Card', 'OIG Exclusion Check', 'SAM Registration'], commonPitfalls: ['Expired fingerprint card', 'Name mismatch on clearance card', 'Not checking OIG monthly'], completed: false,
      },
      {
        id: 'ahcccs-3', title: 'Obtain AHCCCS Provider ID', description: 'Once background check clears, AHCCCS issues a provider ID. This can take 30-45 days. Check the Provider Enrollment Portal weekly for status updates.',
        estimatedDays: 45, requiredDocs: [], commonPitfalls: ['Not checking portal for requests for additional info', 'Missing the 30-day response window for RFIs'], completed: false,
      },
      {
        id: 'ahcccs-4', title: 'NPI Linkage & Taxonomy Update', description: 'Link your AHCCCS Provider ID to your NPI via NPPES. Update your taxonomy code to match AHCCCS requirements (e.g., 103T00000X for Psychologist).',
        estimatedDays: 7, requiredDocs: ['NPPES Login Credentials', 'Taxonomy Code Reference'], commonPitfalls: ['Wrong taxonomy code for specialty', 'Not linking both Type 1 and Type 2 NPI'], completed: false,
      },
      {
        id: 'ahcccs-5', title: 'Contract Execution & Rate Sheet', description: 'Review and sign the AHCCCS provider agreement. Confirm your rate schedule matches the AHCCCS fee-for-service rates for your CPT codes.',
        estimatedDays: 14, requiredDocs: ['Signed Provider Agreement', 'Rate Schedule Acknowledgment'], commonPitfalls: ['Not reviewing rate sheet before signing', 'Missing effective date requirements'], completed: false,
      },
    ],
  },
  {
    payerId: 'bcbs-az',
    payerName: 'BCBS of Arizona',
    totalEstimatedDays: 120,
    steps: [
      {
        id: 'bcbs-1', title: 'Verify CAQH Profile', description: 'Ensure your CAQH ProView profile is 100% complete and attested within the last 120 days. BCBS pulls directly from CAQH.',
        estimatedDays: 3, requiredDocs: ['CAQH ProView Login', 'Current Attestation'], commonPitfalls: ['Stale attestation (>120 days)', 'Missing malpractice COI in CAQH', 'Incorrect practice addresses'], completed: false,
      },
      {
        id: 'bcbs-2', title: 'Submit Panel Application', description: 'Apply via the BCBS Arizona provider portal. Select "New Provider Application" and choose your specialty panel. BCBS may not be accepting new providers in all panels.',
        estimatedDays: 1, requiredDocs: ['CAQH Provider ID', 'NPI Number', 'Practice W-9'], commonPitfalls: ['Panel may be closed in your area', 'Applying to wrong specialty panel', 'Not including group NPI if applicable'], completed: false,
      },
      {
        id: 'bcbs-3', title: 'Primary Source Verification', description: 'BCBS verifies your licenses, certifications, education, and malpractice history directly with issuing organizations. This is the longest phase.',
        estimatedDays: 60, requiredDocs: [], commonPitfalls: ['Outdated information on state licensing board', 'Education institution slow to respond', 'Gaps in work history not explained'], completed: false,
      },
      {
        id: 'bcbs-4', title: 'Credentialing Committee Review', description: 'Your application goes before the credentialing committee. They meet monthly. If additional info is needed, this can add 30+ days.',
        estimatedDays: 30, requiredDocs: [], commonPitfalls: ['Missing the committee cycle', 'Not responding to RFI within 14 days'], completed: false,
      },
      {
        id: 'bcbs-5', title: 'Contract & Effective Date', description: 'Upon approval, review and sign the provider agreement. Your effective date is typically the committee approval date (not retroactive to application).',
        estimatedDays: 14, requiredDocs: ['Signed Provider Agreement'], commonPitfalls: ['Expecting retroactive effective date', 'Not confirming rates before signing', 'Missing the contract return deadline'], completed: false,
      },
    ],
  },
  {
    payerId: 'uhc',
    payerName: 'UnitedHealthcare',
    totalEstimatedDays: 120,
    steps: [
      {
        id: 'uhc-1', title: 'Complete CAQH ProView Profile', description: 'Ensure CAQH profile is 100% complete and attested. UHC pulls credentialing data from CAQH.',
        estimatedDays: 3, requiredDocs: ['CAQH ProView Login', 'Current Attestation', 'All supporting documents uploaded'], commonPitfalls: ['Stale attestation', 'Missing malpractice COI', 'Incomplete work history'], completed: false,
      },
      {
        id: 'uhc-2', title: 'Submit Network Application', description: 'Apply via the UHC Provider Portal or through Optum Behavioral Health for behavioral services. Specify your specialty panel and geographic service area.',
        estimatedDays: 1, requiredDocs: ['NPI Number', 'CAQH Provider ID', 'Practice W-9', 'Specialty Panel Selection'], commonPitfalls: ['Applying to wrong product line (Commercial vs Optum)', 'Not specifying telehealth capability', 'Missing group NPI'], completed: false,
      },
      {
        id: 'uhc-3', title: 'Primary Source Verification', description: 'UHC verifies licenses, board certifications, education, and malpractice history. This is automated through CAQH but may require manual follow-up.',
        estimatedDays: 60, requiredDocs: [], commonPitfalls: ['Outdated info on licensing board website', 'Education institution unresponsive', 'Malpractice carrier slow to verify'], completed: false,
      },
      {
        id: 'uhc-4', title: 'Network Adequacy Review', description: 'UHC evaluates whether your specialty and geographic area need additional providers. If the network is adequate, your application may be waitlisted.',
        estimatedDays: 30, requiredDocs: [], commonPitfalls: ['Network at capacity in your area', 'Not following up on waitlist status', 'Missing the opportunity to appeal a capacity denial'], completed: false,
      },
      {
        id: 'uhc-5', title: 'Contract Execution & Go-Live', description: 'Review and sign the provider agreement. Confirm rates, effective date, and panel listing. Update your Aminy profile with the effective date.',
        estimatedDays: 14, requiredDocs: ['Signed Provider Agreement'], commonPitfalls: ['Not verifying rate schedule before signing', 'Expecting retroactive effective date', 'Not updating NPI registry with new payer'], completed: false,
      },
    ],
  },
  {
    payerId: 'aetna',
    payerName: 'Aetna',
    totalEstimatedDays: 90,
    steps: [
      {
        id: 'aetna-1', title: 'Verify CAQH & Gather Documents', description: 'Ensure CAQH profile is 100% complete. Gather Arizona-specific documents including autism mandate documentation if providing ABA services.',
        estimatedDays: 3, requiredDocs: ['CAQH ProView (attested)', 'AZ Professional License', 'Malpractice COI ($1M/$3M)', 'Board Certification'], commonPitfalls: ['CAQH not attested recently', 'Malpractice limits below Aetna minimum', 'Missing board certification documentation'], completed: false,
      },
      {
        id: 'aetna-2', title: 'Submit Application via Aetna Portal', description: 'Complete the Aetna provider application online. Select behavioral health specialty and specify service types (individual therapy, ABA, assessment, etc.).',
        estimatedDays: 1, requiredDocs: ['NPI Number', 'CAQH Provider ID', 'W-9'], commonPitfalls: ['Wrong specialty selection', 'Not specifying telehealth modality', 'Incomplete service type selection'], completed: false,
      },
      {
        id: 'aetna-3', title: 'Credentialing Review', description: 'Aetna conducts primary source verification and credentialing review. Aetna is typically faster than BCBS or UHC, but monitor for RFI notices.',
        estimatedDays: 60, requiredDocs: [], commonPitfalls: ['Missing RFI email notifications', 'Not responding within 14-day RFI window', 'Outdated licensing board records'], completed: false,
      },
      {
        id: 'aetna-4', title: 'Contract & Effective Date', description: 'Upon approval, review the Aetna provider agreement. Confirm fee schedule and effective date. Aetna effective dates are typically the approval date.',
        estimatedDays: 14, requiredDocs: ['Signed Provider Agreement'], commonPitfalls: ['Not reviewing fee schedule thoroughly', 'Missing contract return deadline', 'Not confirming autism mandate coverage'], completed: false,
      },
    ],
  },
  {
    payerId: 'cigna',
    payerName: 'Cigna',
    totalEstimatedDays: 120,
    steps: [
      {
        id: 'cigna-1', title: 'Prepare CAQH & Required Documents', description: 'Complete CAQH profile and prepare Cigna-specific documents including treatment plan template and provider attestation form.',
        estimatedDays: 5, requiredDocs: ['CAQH ProView (attested)', 'Treatment Plan Template', 'Provider Attestation Form', 'AZ Professional License'], commonPitfalls: ['Missing treatment plan template', 'Provider attestation not signed', 'CAQH incomplete'], completed: false,
      },
      {
        id: 'cigna-2', title: 'Submit Network Application', description: 'Apply through Cigna Provider Portal. Note: Cigna Behavioral Health (Evernorth) is separate from Cigna Medical. Apply to both if needed.',
        estimatedDays: 1, requiredDocs: ['NPI Number', 'CAQH Provider ID', 'W-9', 'Specialty Panel Selection'], commonPitfalls: ['Only applying to Cigna Medical (missing Evernorth/Behavioral)', 'Wrong specialty panel', 'Not specifying telehealth services'], completed: false,
      },
      {
        id: 'cigna-3', title: 'Primary Source Verification', description: 'Cigna verifies all credentials, licenses, and certifications. Treatment plan documentation is reviewed for behavioral health providers.',
        estimatedDays: 60, requiredDocs: [], commonPitfalls: ['Treatment plan not meeting Cigna standards', 'Education verification delays', 'Board certification lapse during verification'], completed: false,
      },
      {
        id: 'cigna-4', title: 'Committee Review & Network Decision', description: 'Cigna credentialing committee reviews the application. Network adequacy is assessed for your specialty and geography.',
        estimatedDays: 30, requiredDocs: [], commonPitfalls: ['Network at capacity', 'Committee meeting delay', 'RFI not addressed in time'], completed: false,
      },
      {
        id: 'cigna-5', title: 'Contract Execution & Panel Listing', description: 'Sign the Cigna provider agreement. Confirm rates and effective date. Verify you appear in the Cigna provider directory.',
        estimatedDays: 14, requiredDocs: ['Signed Provider Agreement'], commonPitfalls: ['Not verifying directory listing', 'Rate schedule discrepancies', 'Missing effective date on claims'], completed: false,
      },
    ],
  },
];

// ============================================================================
// Denial Category Metadata
// ============================================================================

// Hex values for category dot colors — inline style avoids dynamic Tailwind
// classes (e.g. bg-slate-500 / bg-violet-500 are not in the precompiled CSS).
const CATEGORY_DOT_HEX: Record<string, string> = {
  amber: '#f59e0b',
  blue: '#3b82f6',
  red: '#ef4444',
  violet: '#8b5cf6',
  slate: '#64748b',
};

const DENIAL_CATEGORY_META: Record<DenialCategory, { label: string; icon: string; color: string; avgSuccessRate: number }> = {
  'auth-expired': { label: 'Authorization Expired', icon: 'clock', color: 'amber', avgSuccessRate: 70 },
  'wrong-cpt': { label: 'Wrong CPT Code', icon: 'code', color: 'blue', avgSuccessRate: 75 },
  'timely-filing': { label: 'Timely Filing', icon: 'calendar', color: 'red', avgSuccessRate: 30 },
  'medical-necessity': { label: 'Medical Necessity', icon: 'stethoscope', color: 'violet', avgSuccessRate: 45 },
  'missing-info': { label: 'Missing Information', icon: 'file', color: 'slate', avgSuccessRate: 85 },
  'coding-error': { label: 'Coding Error', icon: 'hash', color: 'blue', avgSuccessRate: 70 },
  'duplicate-claim': { label: 'Duplicate Claim', icon: 'copy', color: 'slate', avgSuccessRate: 60 },
  'patient-eligibility': { label: 'Patient Eligibility', icon: 'user', color: 'red', avgSuccessRate: 40 },
  'out-of-network': { label: 'Out of Network', icon: 'globe', color: 'amber', avgSuccessRate: 25 },
  'other': { label: 'Other', icon: 'help', color: 'slate', avgSuccessRate: 50 },
};

// ============================================================================
// Tab Config
// ============================================================================

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'caqh', label: 'CAQH', icon: <Shield className="w-4 h-4" /> },
  { id: 'enrollment', label: 'Enrollment', icon: <Building2 className="w-4 h-4" /> },
  { id: 'roster', label: 'Roster', icon: <Users className="w-4 h-4" /> },
  { id: 'playbooks', label: 'AI Playbooks', icon: <Bot className="w-4 h-4" /> },
  { id: 'claims', label: 'Claims', icon: <Receipt className="w-4 h-4" /> },
  { id: 'denial-ops', label: 'Denial Ops', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'status', label: 'Status', icon: <Gauge className="w-4 h-4" /> },
  { id: 'help', label: 'Help', icon: <HelpCircle className="w-4 h-4" /> },
];

// ============================================================================
// Status Helpers
// ============================================================================

function statusIcon(status: string) {
  switch (status) {
    case 'valid':
    case 'active':
    case 'ready':
    case 'pass':
    case 'approved':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'expiring':
    case 'warning':
    case 're-credentialing-due':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'expired':
    case 'error':
    case 'denied':
    case 'fail':
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'missing':
    case 'pending':
      return <Clock className="w-4 h-4 text-slate-400" />;
    default:
      return <Clock className="w-4 h-4 text-slate-400" />;
  }
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    valid: 'bg-emerald-100 text-emerald-700',
    active: 'bg-emerald-100 text-emerald-700',
    ready: 'bg-emerald-100 text-emerald-700',
    pass: 'bg-emerald-100 text-emerald-700',
    approved: 'bg-emerald-100 text-emerald-700',
    expiring: 'bg-amber-100 text-amber-700',
    warning: 'bg-amber-100 text-amber-700',
    're-credentialing-due': 'bg-amber-100 text-amber-700',
    expired: 'bg-red-100 text-red-700',
    error: 'bg-red-100 text-red-700',
    denied: 'bg-red-100 text-red-700',
    fail: 'bg-red-100 text-red-700',
    rejected: 'bg-red-100 text-red-700',
    missing: 'bg-slate-100 text-slate-500',
    pending: 'bg-blue-100 text-blue-700',
    application: 'bg-slate-100 text-slate-600',
    processing: 'bg-blue-100 text-blue-700',
    credentialing: 'bg-violet-100 text-violet-700',
    new: 'bg-blue-100 text-blue-700',
    appealing: 'bg-violet-100 text-violet-700',
    won: 'bg-emerald-100 text-emerald-700',
    lost: 'bg-red-100 text-red-700',
  };
  const cls = colors[status] || 'bg-slate-100 text-slate-500';
  const label = status.replace(/-/g, ' ');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}

// ============================================================================
// CAQH Tab
// ============================================================================

function CAQHTab() {
  const docs = isDemoMode() ? MOCK_CAQH_DOCS : [];
  const qaChecklist = isDemoMode() ? MOCK_QA_CHECKLIST : [];
  const requiredDocs = docs.filter((d) => d.required);
  const uploadedRequired = requiredDocs.filter((d) => d.uploaded).length;
  const completionPct = requiredDocs.length > 0
    ? Math.round((uploadedRequired / requiredDocs.length) * 100)
    : 0;
  const expiringDocs = docs.filter((d) => d.status === 'expiring');
  const missingDocs = docs.filter((d) => d.status === 'missing' && d.required);

  if (docs.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700">No CAQH documents yet</p>
        <p className="text-xs text-slate-500 mt-1">
          Connect your CAQH ProView profile to track documents, expirations, and re-attestation here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Profile Completion */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-800">CAQH Profile Completion</h3>
          <span className="text-sm font-bold text-slate-700">{completionPct}%</span>
        </div>
        <Progress value={completionPct} className="h-2 mb-3" />
        <p className="text-xs text-slate-500">
          {uploadedRequired} of {requiredDocs.length} required documents uploaded.
          {completionPct === 100
            ? ' Your profile is complete.'
            : ` Upload ${requiredDocs.length - uploadedRequired} more to finish.`}
        </p>
      </Card>

      {/* AI QA Pre-Check */}
      <Card className="p-4 border-violet-200 bg-violet-50">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="w-4 h-4 text-violet-600" />
          <h3 className="text-sm font-semibold text-violet-800">AI QA Pre-Submission Checklist</h3>
        </div>
        <div className="space-y-2">
          {qaChecklist.map((item) => (
            <div key={item.id} className="flex items-start gap-2 py-1.5">
              {statusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-slate-700">{item.label}</p>
                  {statusBadge(item.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                {item.actionRequired && (
                  <p className="text-xs text-violet-600 font-medium mt-0.5">Action: {item.actionRequired}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-violet-200 flex items-center justify-between">
          <div className="text-xs text-violet-700">
            {qaChecklist.filter(i => i.status === 'pass').length}/{qaChecklist.length} checks passing
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs border-violet-300 text-violet-700 opacity-60" disabled title="Coming soon">
            Re-run QA Check <span className="ml-1 text-[10px] text-slate-400 font-normal">Soon</span>
          </Button>
        </div>
      </Card>

      {/* Alerts */}
      {(expiringDocs.length > 0 || missingDocs.length > 0) && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Action Required
          </h3>
          <div className="space-y-2">
            {expiringDocs.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <span className="text-amber-700">{d.name} expires {d.expiresAt}</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-amber-700 opacity-60" disabled title="Coming soon">
                  Renew <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
            {missingDocs.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <span className="text-amber-700">{d.name} — required, not uploaded</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-amber-700 opacity-60" disabled title="Coming soon">
                  Upload <Upload className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Document Checklist */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Document Checklist</h3>
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                {statusIcon(doc.status)}
                <div>
                  <p className="text-sm text-slate-700">{doc.name}</p>
                  {doc.expiresAt && (
                    <p className="text-xs text-slate-400">Expires: {doc.expiresAt}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.required && (
                  <span className="text-xs text-slate-400 font-medium">Required</span>
                )}
                {statusBadge(doc.status)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Re-attestation Reminder */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-800">CAQH Re-Attestation</h3>
            <p className="text-xs text-blue-600 mt-1">
              CAQH requires re-attestation every 120 days. Your next attestation is due
              around <span className="font-semibold">June 15, 2026</span>. Aminy will remind
              you 30 days in advance.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Enrollment Tab (Enhanced with AI Wizard)
// ============================================================================

const ENROLLMENT_STAGES = ['application', 'processing', 'credentialing', 'active'] as const;

function EnrollmentTab() {
  const openAI = useOpenAI();
  const enrollments = isDemoMode() ? MOCK_ENROLLMENTS : [];
  const [wizardPayer, setWizardPayer] = useState<string | null>(null);

  function stageIndex(stage: string): number {
    const idx = ENROLLMENT_STAGES.indexOf(stage as (typeof ENROLLMENT_STAGES)[number]);
    return idx >= 0 ? idx : -1;
  }

  const activeWorkflow = wizardPayer ? PAYER_WORKFLOWS.find(w => w.payerId === wizardPayer) : null;

  if (activeWorkflow) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWizardPayer(null)}
          className="text-xs text-slate-500"
        >
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to Enrollment
        </Button>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-800">{activeWorkflow.payerName} Enrollment</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Estimated timeline: {activeWorkflow.totalEstimatedDays} days total
          </p>

          <div className="space-y-4">
            {activeWorkflow.steps.map((step, i) => (
              <div key={step.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                      <span className="text-xs text-slate-400">~{step.estimatedDays}d</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{step.description}</p>

                    {step.requiredDocs.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-slate-500 mb-1">Required Documents:</p>
                        <div className="flex flex-wrap gap-1">
                          {step.requiredDocs.map((doc, di) => (
                            <span key={di} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                              <FileCheck className="w-3 h-3 mr-1" />{doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {step.commonPitfalls.length > 0 && (
                      <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-100">
                        <p className="text-xs font-medium text-amber-700 mb-1">Common Pitfalls:</p>
                        <ul className="text-xs text-amber-600 space-y-0.5">
                          {step.commonPitfalls.map((pitfall, pi) => (
                            <li key={pi} className="flex items-start gap-1">
                              <span className="shrink-0">-</span>
                              <span>{pitfall}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button size="sm" className="mt-4 w-full opacity-60" disabled title="Coming soon">
            <Plus className="w-3 h-3 mr-1" /> Begin {activeWorkflow.payerName} Application
            <span className="ml-auto text-[10px] text-white/80 font-normal">Coming soon</span>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Payer Enrollment Pipeline</h3>
        <Button variant="outline" size="sm" className="h-7 text-xs opacity-60" disabled title="Coming soon">
          <Plus className="w-3 h-3 mr-1" /> Start New Enrollment
        </Button>
      </div>

      {/* AI Enrollment Wizard Links */}
      <Card className="p-3 bg-blue-50 border-blue-200">
        <p className="text-xs font-semibold text-blue-800 mb-2">AI-Guided Enrollment Wizards</p>
        <div className="flex flex-wrap gap-2">
          {PAYER_WORKFLOWS.map((wf) => (
            <Button
              key={wf.payerId}
              variant="outline"
              size="sm"
              className="h-7 text-xs border-blue-300 text-blue-700"
              onClick={() => setWizardPayer(wf.payerId)}
            >
              <Sparkles className="w-3 h-3 mr-1" /> {wf.payerName}
            </Button>
          ))}
        </div>
      </Card>

      {enrollments.length === 0 && (
        <Card className="p-6 text-center">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">No active enrollments</p>
          <p className="text-xs text-slate-500 mt-1">
            Start a payer application above and Aminy will track it through completion here.
          </p>
        </Card>
      )}

      {enrollments.map((enrollment) => {
        const currentStage = stageIndex(enrollment.stage);
        const isDenied = enrollment.stage === 'denied';

        return (
          <Card key={enrollment.id} className={`p-4 ${isDenied ? 'border-red-200 bg-red-50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-800">{enrollment.payerName}</span>
              </div>
              {statusBadge(enrollment.stage)}
            </div>

            {!isDenied && (
              <div className="flex items-center gap-1 mb-3">
                {ENROLLMENT_STAGES.map((stage, i) => {
                  const isComplete = i <= currentStage;
                  const isCurrent = i === currentStage;
                  return (
                    <React.Fragment key={stage}>
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                          ${isComplete
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                          }
                          ${isCurrent ? 'ring-2 ring-emerald-300' : ''}`}
                      >
                        {isComplete ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      {i < ENROLLMENT_STAGES.length - 1 && (
                        <div
                          className={`flex-1 h-1 rounded ${
                            i < currentStage ? 'bg-emerald-400' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {!isDenied && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex gap-4">
                  {ENROLLMENT_STAGES.map((stage) => (
                    <span key={stage} className="capitalize">{stage}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
              <span>Submitted: {enrollment.submittedAt}</span>
              {enrollment.estimatedCompletion && (
                <span>Est. completion: {enrollment.estimatedCompletion}</span>
              )}
            </div>
            {enrollment.notes && (
              <p className="text-xs text-slate-500 mt-1 italic">{enrollment.notes}</p>
            )}
            {isDenied && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 text-xs text-red-700 border-red-300"
                onClick={() =>
                  openAI(
                    `My ${enrollment.payerName} provider enrollment was denied` +
                    `${enrollment.notes ? ` (reason: ${enrollment.notes})` : ''}. ` +
                    `Help me draft an appeal and outline the next steps.`
                  )
                }
              >
                File Appeal <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// Roster Tab
// ============================================================================

function RosterTab() {
  const roster = isDemoMode() ? MOCK_ROSTER : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Active Payer Roster</h3>
        <Button variant="outline" size="sm" className="h-7 text-xs opacity-60" disabled title="Coming soon">
          <Plus className="w-3 h-3 mr-1" /> Add Payer
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Payer</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Type</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Effective</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Re-Cred</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 px-3 text-center text-slate-500">
                    No active payer contracts yet. Add a payer to build your roster.
                  </td>
                </tr>
              ) : (
                roster.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 px-3 font-medium text-slate-700">{entry.payerName}</td>
                    <td className="py-2.5 px-3 text-slate-500">{entry.contractType}</td>
                    <td className="py-2.5 px-3 text-slate-500">{entry.effectiveDate}</td>
                    <td className="py-2.5 px-3 text-slate-500">{entry.recredentialingDate}</td>
                    <td className="py-2.5 px-3">{statusBadge(entry.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Re-credentialing schedule */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-500" />
          Upcoming Re-Credentialing
        </h3>
        <div className="space-y-2">
          {roster
            .filter((e) => e.status === 'expiring')
            .map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50 border border-amber-200"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">{entry.payerName}</p>
                    <p className="text-xs text-amber-600">Due: {entry.recredentialingDate}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs border-amber-300 text-amber-700 opacity-60" disabled title="Coming soon">
                  Start Renewal
                </Button>
              </div>
            ))}
          {roster.filter((e) => e.status === 'expiring').length === 0 && (
            <p className="text-xs text-slate-500">No upcoming re-credentialing deadlines.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// AI Playbooks Tab
// ============================================================================

interface PlaybookNode {
  id: string;
  text: string;
  options?: { label: string; nextId: string }[];
  guidance?: string;
  action?: string;
}

const DENIAL_PLAYBOOK: PlaybookNode[] = [
  {
    id: 'start',
    text: 'What type of denial did you receive?',
    options: [
      { label: 'Missing/Invalid Information', nextId: 'missing-info' },
      { label: 'Authorization Issue', nextId: 'auth-issue' },
      { label: 'Coding Error', nextId: 'coding-error' },
      { label: 'Not Medically Necessary', nextId: 'medical-necessity' },
      { label: 'Timely Filing', nextId: 'timely-filing' },
      { label: 'Other / Not Sure', nextId: 'other' },
    ],
  },
  {
    id: 'missing-info',
    text: 'Missing or invalid information denials (CO-16, CO-4)',
    guidance:
      'These are the most correctable denials. Check the remittance advice for the specific field that is missing or incorrect. Common causes: wrong patient DOB, missing NPI, incorrect subscriber ID, missing modifier.',
    action: 'Open Correction Form',
  },
  {
    id: 'auth-issue',
    text: 'Authorization denials (CO-197, CO-15)',
    guidance:
      'If the auth expired before the service date, you can request a retro-auth from the payer. If no auth was obtained, check whether the service type requires prior auth under the patient plan. Some plans exempt telehealth from auth requirements.',
    action: 'Request Auth Extension',
  },
  {
    id: 'coding-error',
    text: 'Coding error denials (CO-97, CO-11)',
    guidance:
      'Review the CPT/ICD-10 pairing. Common issues: bundled codes billed separately, wrong place of service (use 02 for telehealth), incorrect modifier. Aminy can suggest the correct code based on session notes.',
    action: 'Review Suggested Codes',
  },
  {
    id: 'medical-necessity',
    text: 'Medical necessity denials (CO-50, PR-96)',
    guidance:
      'These require a clinical appeal. You will need: treatment plan, progress notes showing medical necessity, and peer-reviewed literature if available. Aminy can generate an appeal letter template.',
    action: 'Generate Appeal Letter',
  },
  {
    id: 'timely-filing',
    text: 'Timely filing denials (CO-29)',
    guidance:
      'Check the payer contract for filing deadlines (typically 90-180 days). If you can prove the claim was submitted on time (submission receipt, clearinghouse confirmation), you can appeal. If it was genuinely late, this is usually not recoverable.',
    action: 'Check Filing Receipt',
  },
  {
    id: 'other',
    text: 'Enter your denial code for specific guidance',
    guidance:
      'Enter the CARC (Claim Adjustment Reason Code) from your remittance advice. Aminy will look up the code and provide specific next steps.',
    action: 'Look Up Denial Code',
  },
];

function AIPlaybooksTab() {
  const openAI = useOpenAI();
  const [activePlaybook, setActivePlaybook] = useState<string | null>(null);
  const [currentNode, setCurrentNode] = useState<string>('start');
  const [denialCode, setDenialCode] = useState('');

  const playbooks = [
    { id: 'denial', title: 'I got a denial', icon: <XCircle className="w-5 h-5 text-red-500" />, description: 'Walk through denial resolution step by step' },
    { id: 'new-payer', title: 'I need a new payer', icon: <Plus className="w-5 h-5 text-blue-500" />, description: 'Guided enrollment wizard for new payer applications' },
    { id: 'expiring', title: 'Credential expiring', icon: <Clock className="w-5 h-5 text-amber-500" />, description: 'Renewal checklist and timeline for expiring credentials' },
  ];

  const node = DENIAL_PLAYBOOK.find((n) => n.id === currentNode);

  if (activePlaybook === 'denial' && node) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setActivePlaybook(null);
            setCurrentNode('start');
          }}
          className="text-xs text-slate-500"
        >
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to Playbooks
        </Button>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-800">Denial Resolution Guide</h3>
          </div>

          <motion.div
            key={currentNode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-sm text-slate-700 mb-4">{node.text}</p>

            {node.options && (
              <div className="space-y-2">
                {node.options.map((opt) => (
                  <button
                    key={opt.nextId}
                    onClick={() => setCurrentNode(opt.nextId)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-violet-50 hover:border-violet-300 transition-colors flex items-center justify-between"
                  >
                    {opt.label}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            {node.guidance && (
              <div className="mt-3 p-3 rounded-lg bg-violet-50 border border-violet-200">
                <p className="text-xs text-violet-800 leading-relaxed">{node.guidance}</p>
              </div>
            )}

            {node.id === 'other' && (
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Enter CARC code (e.g., CO-16)"
                  value={denialCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDenialCode(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() =>
                    openAI(
                      `Explain insurance denial code ${denialCode.trim() || '[code]'} ` +
                      `and give me the specific next steps to resolve or appeal it.`
                    )
                  }
                  disabled={!denialCode.trim()}
                >
                  <Search className="w-3 h-3 mr-1" /> Look Up
                </Button>
              </div>
            )}

            {node.action && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() =>
                  openAI(
                    `Help me with this credentialing/billing scenario: ${node.text}. ` +
                    `${node.guidance ? `Context: ${node.guidance} ` : ''}` +
                    `Specifically, I want to: ${node.action}.`
                  )
                }
              >
                <Zap className="w-3 h-3 mr-1" /> {node.action}
              </Button>
            )}

            {currentNode !== 'start' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentNode('start')}
                className="mt-2 text-xs text-slate-400"
              >
                <ArrowLeft className="w-3 h-3 mr-1" /> Start Over
              </Button>
            )}
          </motion.div>
        </Card>
      </div>
    );
  }

  if (activePlaybook === 'new-payer') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActivePlaybook(null)}
          className="text-xs text-slate-500"
        >
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to Playbooks
        </Button>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-800">New Payer Enrollment Wizard</h3>
          </div>
          <div className="space-y-3">
            {['Verify CAQH profile is current', 'Check payer network availability in your state', 'Gather required documents (license, DEA, malpractice)', 'Complete payer-specific application', 'Submit via payer portal or clearinghouse', 'Track application status in Enrollment tab'].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-700 pt-0.5">{step}</p>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            className="mt-4 w-full"
            onClick={() =>
              openAI(
                'Walk me through enrolling with a new insurance payer step by step, ' +
                'starting with what I need to verify on my CAQH profile.'
              )
            }
          >
            <Sparkles className="w-3 h-3 mr-1" /> Start with AI Assistant
          </Button>
        </Card>
      </div>
    );
  }

  if (activePlaybook === 'expiring') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActivePlaybook(null)}
          className="text-xs text-slate-500"
        >
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to Playbooks
        </Button>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-800">Credential Renewal Checklist</h3>
          </div>
          <div className="space-y-2">
            {[
              { task: 'Check expiration dates for all licenses and certifications', timeline: '90 days before' },
              { task: 'Gather renewal applications from licensing boards', timeline: '60 days before' },
              { task: 'Complete CME/CE requirements if needed', timeline: '60 days before' },
              { task: 'Submit renewal applications and fees', timeline: '45 days before' },
              { task: 'Update CAQH profile with new expiration dates', timeline: 'Upon receipt' },
              { task: 'Upload renewed documents to Aminy', timeline: 'Upon receipt' },
              { task: 'Notify payers of updated credentials', timeline: 'Within 30 days' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border-2 border-slate-300" />
                  <span className="text-sm text-slate-700">{item.task}</span>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{item.timeline}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Playbook selection
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-5 h-5 text-violet-500" />
        <h3 className="text-sm font-semibold text-slate-800">AI-Guided Playbooks</h3>
      </div>
      <p className="text-xs text-slate-500">
        Interactive decision trees to help you navigate common credentialing and billing scenarios.
      </p>
      <div className="space-y-3">
        {playbooks.map((pb) => (
          <button
            key={pb.id}
            onClick={() => {
              setActivePlaybook(pb.id);
              setCurrentNode('start');
            }}
            className="w-full text-left"
          >
            <Card className="p-4 hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                {pb.icon}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{pb.title}</p>
                  <p className="text-xs text-slate-500">{pb.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Claim Queue Tab
// ============================================================================

function ClaimQueueTab() {
  const claims = isDemoMode() ? MOCK_CLAIM_QUEUE : [];
  const readyCount = claims.filter((c) => c.validationStatus === 'ready').length;
  const warningCount = claims.filter((c) => c.validationStatus === 'warning').length;
  const errorCount = claims.filter((c) => c.validationStatus === 'error').length;
  const totalAmount = claims.reduce((s, c) => s + c.amount, 0);
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());

  function toggleClaim(id: string) {
    setSelectedClaims((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllReady() {
    setSelectedClaims(new Set(claims.filter((c) => c.validationStatus === 'ready').map((c) => c.id)));
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{readyCount}</p>
          <p className="text-xs text-slate-500">Ready</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{warningCount}</p>
          <p className="text-xs text-slate-500">Warnings</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-red-600">{errorCount}</p>
          <p className="text-xs text-slate-500">Errors</p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">
            Total pending: <span className="font-semibold text-slate-700">${totalAmount.toLocaleString()}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllReady}>
            Select Ready
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs opacity-60"
            disabled
            title="Claim submission coming soon"
          >
            <Send className="w-3 h-3 mr-1" /> Submit ({selectedClaims.size})
          </Button>
        </div>
      </div>

      {/* Claims List */}
      <div className="space-y-2">
        {claims.length === 0 && (
          <Card className="p-6 text-center">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No claims in the queue</p>
            <p className="text-xs text-slate-500 mt-1">
              Completed sessions ready for billing will appear here for validation and submission.
            </p>
          </Card>
        )}
        {claims.map((claim) => (
          <Card
            key={claim.id}
            className={`p-3 cursor-pointer transition-all ${
              selectedClaims.has(claim.id)
                ? 'border-violet-300 bg-violet-50'
                : ''
            } ${
              claim.validationStatus === 'error'
                ? 'border-red-200'
                : ''
            }`}
            onClick={() => claim.validationStatus !== 'error' && toggleClaim(claim.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {statusIcon(claim.validationStatus)}
                <div>
                  <p className="text-sm font-medium text-slate-700">{claim.patientName}</p>
                  <p className="text-xs text-slate-400">
                    {claim.dateOfService} &middot; {claim.cptCode} &middot; {claim.payer}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">${claim.amount}</p>
                {claim.validationMessage && (
                  <p className={`text-xs ${claim.validationStatus === 'error' ? 'text-red-500' : 'text-amber-500'}`}>
                    {claim.validationMessage}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Denial Ops Tab (NEW)
// ============================================================================

function DenialOpsTab() {
  const openAI = useOpenAI();
  const denials = isDemoMode() ? MOCK_DENIALS : [];
  const [expandedDenial, setExpandedDenial] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  function copyDenialCode(code: string) {
    void navigator.clipboard?.writeText(code).then(
      () => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500);
      },
      () => {}
    );
  }

  const totalDenied = denials.reduce((s, d) => s + d.amount, 0);
  const recoverable = denials.filter(d => d.status !== 'lost' && d.status !== 'expired');
  const recoverableAmount = recoverable.reduce((s, d) => s + d.amount, 0);
  const urgentAppeals = denials.filter(d => d.daysUntilDeadline <= 30 && d.status !== 'won' && d.status !== 'lost');

  // Group by category
  const categoryBreakdown = useMemo(() => {
    const groups: Record<string, { count: number; amount: number }> = {};
    for (const d of denials) {
      if (!groups[d.denialCategory]) {
        groups[d.denialCategory] = { count: 0, amount: 0 };
      }
      groups[d.denialCategory].count++;
      groups[d.denialCategory].amount += d.amount;
    }
    return groups;
  }, [denials]);

  if (denials.length === 0) {
    return (
      <Card className="p-6 text-center">
        <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700">No denials to work</p>
        <p className="text-xs text-slate-500 mt-1">
          When a claim is denied, Aminy categorizes it here and helps you appeal before the deadline.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-red-600">${totalDenied.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Total Denied</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-violet-600">${recoverableAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Recoverable</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{urgentAppeals.length}</p>
          <p className="text-xs text-slate-500">Urgent Appeals</p>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          Denial Categories
        </h3>
        <div className="space-y-2">
          {Object.entries(categoryBreakdown).map(([cat, data]) => {
            const meta = DENIAL_CATEGORY_META[cat as DenialCategory] || DENIAL_CATEGORY_META['other'];
            return (
              <div key={cat} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_DOT_HEX[meta.color] || '#64748b' }}
                  />
                  <span className="text-xs text-slate-700">{meta.label}</span>
                  <span className="text-xs text-slate-400">({data.count})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-700">${data.amount}</span>
                  <span className="text-xs text-emerald-600">{meta.avgSuccessRate}% win rate</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Individual Denials */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Active Denials</h3>
        {denials.map((denial) => {
          const meta = DENIAL_CATEGORY_META[denial.denialCategory] || DENIAL_CATEGORY_META['other'];
          const isExpanded = expandedDenial === denial.id;
          const isUrgent = denial.daysUntilDeadline <= 30;

          return (
            <Card
              key={denial.id}
              className={`overflow-hidden ${isUrgent ? 'border-amber-200' : ''}`}
            >
              <button
                onClick={() => setExpandedDenial(isExpanded ? null : denial.id)}
                className="w-full text-left p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(denial.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-700">{denial.patientName}</p>
                        {statusBadge(denial.status)}
                      </div>
                      <p className="text-xs text-slate-400">
                        {denial.denialCode} &middot; {meta.label} &middot; {denial.payer}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">${denial.amount}</p>
                      <p className={`text-xs ${isUrgent ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                        {denial.daysUntilDeadline}d to appeal
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 border-t border-slate-100 pt-3 space-y-3">
                      {/* Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400">Claim ID</p>
                          <p className="text-slate-700 font-medium">{denial.claimId}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Date of Service</p>
                          <p className="text-slate-700 font-medium">{denial.dateOfService}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Denied On</p>
                          <p className="text-slate-700 font-medium">{denial.deniedAt}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Appeal Deadline</p>
                          <p className={`font-medium ${isUrgent ? 'text-amber-700' : 'text-slate-700'}`}>{denial.appealDeadline}</p>
                        </div>
                      </div>

                      {/* Success Probability */}
                      <div className="p-2 rounded bg-slate-50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">AI Appeal Success Estimate</span>
                          <span className={`text-xs font-bold ${
                            denial.successProbability >= 70 ? 'text-emerald-600' :
                            denial.successProbability >= 40 ? 'text-amber-600' : 'text-red-600'
                          }`}>{denial.successProbability}%</span>
                        </div>
                        <Progress value={denial.successProbability} className="h-1.5" />
                      </div>

                      {/* Appeal Status */}
                      {denial.appealLetter && (
                        <div className="p-2 rounded bg-violet-50 border border-violet-100">
                          <p className="text-xs text-violet-700">{denial.appealLetter}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {denial.status === 'new' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() =>
                              openAI(
                                `Draft an insurance appeal letter for a denied behavioral health claim. ` +
                                `Payer: ${denial.payer}. Denial code: ${denial.denialCode} (${meta.label}). ` +
                                `Claim ID: ${denial.claimId}. Date of service: ${denial.dateOfService}. ` +
                                `Billed amount: $${denial.amount}. Write a professional, payer-ready appeal.`
                              )
                            }
                          >
                            <Sparkles className="w-3 h-3 mr-1" /> Generate Appeal Letter
                          </Button>
                        )}
                        {denial.status === 'new' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => copyDenialCode(denial.denialCode)}
                          >
                            {copiedCode === denial.denialCode ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3 mr-1" /> Copy Denial Code</>
                            )}
                          </Button>
                        )}
                        {denial.status === 'appealing' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex-1 opacity-60"
                            disabled
                            title="Coming soon"
                          >
                            <TrendingUp className="w-3 h-3 mr-1" /> Check Appeal Status
                            <span className="ml-auto text-[10px] text-slate-400 font-normal">Soon</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Smart Status Dashboard Tab (NEW)
// ============================================================================

function StatusDashboardTab() {
  const entries = isDemoMode() ? MOCK_STATUS_ENTRIES : [];

  const approved = entries.filter(e => e.enrollmentStatus === 'approved').length;
  const pending = entries.filter(e => e.enrollmentStatus === 'pending').length;
  const rejected = entries.filter(e => e.enrollmentStatus === 'rejected').length;
  const reCredDue = entries.filter(e => e.enrollmentStatus === 're-credentialing-due').length;
  const totalMissing = entries.reduce((s, e) => s + e.missingDocuments.length, 0);

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2.5 text-center">
          <p className="text-lg font-bold text-emerald-600">{approved}</p>
          <p className="text-xs text-slate-500">Active</p>
        </Card>
        <Card className="p-2.5 text-center">
          <p className="text-lg font-bold text-blue-600">{pending}</p>
          <p className="text-xs text-slate-500">Pending</p>
        </Card>
        <Card className="p-2.5 text-center">
          <p className="text-lg font-bold text-red-600">{rejected}</p>
          <p className="text-xs text-slate-500">Rejected</p>
        </Card>
        <Card className="p-2.5 text-center">
          <p className="text-lg font-bold text-amber-600">{reCredDue}</p>
          <p className="text-xs text-slate-500">Re-Cred</p>
        </Card>
      </div>

      {/* Missing Documents Alert */}
      {totalMissing > 0 && (
        <Card className="p-3 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-semibold text-amber-800">{totalMissing} Missing Document{totalMissing > 1 ? 's' : ''} Blocking Enrollment</p>
          </div>
          <div className="space-y-1">
            {entries
              .filter(e => e.missingDocuments.length > 0)
              .map(e => (
                <div key={e.id} className="flex items-center justify-between text-xs">
                  <span className="text-amber-700">{e.payerName}: {e.missingDocuments.join(', ')}</span>
                  <Button variant="ghost" size="sm" className="h-5 text-xs text-amber-700 px-2 opacity-60" disabled title="Coming soon">
                    Fix
                  </Button>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Per-Payer Status */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Enrollment Status by Payer</h3>
        {entries.length === 0 && (
          <Card className="p-6 text-center">
            <Gauge className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No enrollments to track yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Once you submit payer applications, their status and re-credentialing dates show up here.
            </p>
          </Card>
        )}
        {entries.map((entry) => (
          <Card key={entry.id} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {statusIcon(entry.enrollmentStatus)}
                <span className="text-sm font-medium text-slate-700">{entry.payerName}</span>
              </div>
              {statusBadge(entry.enrollmentStatus)}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Days since submission:</span>
                <span className="text-slate-700 font-medium">{entry.daysSinceSubmission}d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last updated:</span>
                <span className="text-slate-700 font-medium">{entry.lastUpdated}</span>
              </div>
              {entry.reCredentialingDate && (
                <div className="flex justify-between col-span-2">
                  <span className="text-slate-400">Re-credentialing due:</span>
                  <span className={`font-medium ${entry.enrollmentStatus === 're-credentialing-due' ? 'text-amber-700' : 'text-slate-700'}`}>
                    {entry.reCredentialingDate}
                  </span>
                </div>
              )}
            </div>

            {entry.nextAction && (
              <div className="mt-2 p-2 rounded bg-slate-50 text-xs text-slate-600">
                <span className="font-medium">Next action:</span> {entry.nextAction}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Re-Credentialing Calendar */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-500" />
          Re-Credentialing Calendar
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Most payers require re-credentialing every 3 years. Start the process 90 days before the due date.
        </p>
        <div className="space-y-2">
          {entries
            .filter(e => e.reCredentialingDate)
            .sort((a, b) => (a.reCredentialingDate || '').localeCompare(b.reCredentialingDate || ''))
            .map(entry => (
              <div
                key={entry.id}
                className={`flex items-center justify-between py-2 px-3 rounded-lg border ${
                  entry.enrollmentStatus === 're-credentialing-due'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {entry.enrollmentStatus === 're-credentialing-due' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Calendar className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-700">{entry.payerName}</p>
                    <p className="text-xs text-slate-500">Due: {entry.reCredentialingDate}</p>
                  </div>
                </div>
                {entry.enrollmentStatus === 're-credentialing-due' && (
                  <Button variant="outline" size="sm" className="h-7 text-xs border-amber-300 text-amber-700 opacity-60" disabled title="Coming soon">
                    Start Renewal
                  </Button>
                )}
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Help Tab
// ============================================================================

function HelpTab() {
  const openAI = useOpenAI();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [faqSearch, setFaqSearch] = useState('');

  function askAI() {
    const q = aiQuestion.trim();
    if (!q) return;
    openAI(
      `I'm a provider with a credentialing, billing, or enrollment question: ${q}`
    );
    setAiQuestion('');
  }

  const filteredFaqs = faqSearch
    ? FAQS.filter(
        (f) =>
          f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
          f.answer.toLowerCase().includes(faqSearch.toLowerCase())
      )
    : FAQS;

  return (
    <div className="space-y-4">
      {/* AI Assistant — opens the live Aminy AI chat seeded with the question */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-800">AI Credentialing Assistant</h3>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Ask anything about credentialing, billing, or enrollment..."
            value={aiQuestion}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiQuestion(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') askAI();
            }}
            className="text-sm"
          />
          <Button size="sm" className="shrink-0" onClick={askAI} disabled={!aiQuestion.trim()}>
            <Send className="w-3 h-3" />
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Opens the Aminy AI chat with your question — answers in real time.
        </p>
      </Card>

      {/* FAQ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <h3 className="text-sm font-semibold text-slate-800">Frequently Asked Questions</h3>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Search FAQs..."
            value={faqSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFaqSearch(e.target.value)}
            className="text-sm pl-9"
          />
        </div>
        {filteredFaqs.map((faq, i) => (
          <Card key={i} className="overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              className="w-full text-left p-3 flex items-center justify-between"
            >
              <span className="text-sm text-slate-700 pr-4">{faq.question}</span>
              {expandedFaq === i ? (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
            <AnimatePresence>
              {expandedFaq === i && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}
        {filteredFaqs.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-slate-400">No matching FAQs found.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-7 text-xs text-violet-600"
              onClick={() => {
                openAI(
                  `I'm a provider with a credentialing, billing, or enrollment question: ${faqSearch}`
                );
              }}
            >
              <Sparkles className="w-3 h-3 mr-1" /> Ask the AI assistant
            </Button>
          </div>
        )}
      </div>

      {/* Contact Support */}
      <Card className="p-4 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Need More Help?</h3>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-8"
            onClick={() =>
              openAI(
                'I need help from the Aminy credentialing support team. Can you assist or connect me?'
              )
            }
          >
            <MessageSquare className="w-3 h-3 mr-2" /> Chat with Support Team
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-8 opacity-60"
            disabled
            title="Coming soon"
          >
            <BookOpen className="w-3 h-3 mr-2" /> Credentialing Knowledge Base
            <span className="ml-auto text-[10px] text-slate-400 font-normal">Coming soon</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-8 opacity-60"
            disabled
            title="Coming soon"
          >
            <FileText className="w-3 h-3 mr-2" /> Download Payer Requirements Guide
            <span className="ml-auto text-[10px] text-slate-400 font-normal">Coming soon</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CredentialingSupportCenter({
  providerId = 'demo-provider',
  providerName = 'Dr. Provider',
  onBack,
}: CredentialingSupportCenterProps) {
  const [activeTab, setActiveTab] = useState<TabId>('caqh');
  const demo = isDemoMode();

  // Badge counts — sample-driven in demo; real providers start with no alerts.
  const caqhAlerts = demo ? MOCK_CAQH_DOCS.filter(
    (d) => d.required && (d.status === 'expiring' || d.status === 'missing')
  ).length : 0;
  const enrollmentPending = demo ? MOCK_ENROLLMENTS.filter(
    (e) => e.stage !== 'active' && e.stage !== 'denied'
  ).length : 0;
  const rosterExpiring = demo ? MOCK_ROSTER.filter((r) => r.status === 'expiring').length : 0;
  const claimErrors = demo ? MOCK_CLAIM_QUEUE.filter((c) => c.validationStatus === 'error').length : 0;
  const denialCount = demo ? MOCK_DENIALS.filter(d => d.status === 'new').length : 0;
  const reCredCount = demo ? MOCK_STATUS_ENTRIES.filter(e => e.enrollmentStatus === 're-credentialing-due').length : 0;

  const tabBadges: Partial<Record<TabId, number>> = {
    caqh: caqhAlerts || undefined,
    enrollment: enrollmentPending || undefined,
    roster: rosterExpiring || undefined,
    claims: claimErrors || undefined,
    'denial-ops': denialCount || undefined,
    status: reCredCount || undefined,
  };

  // Suppress unused variable warnings for props used in future Supabase integration
  void providerId;
  void providerName;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <ScreenHeader
        title="Credentialing Center"
        subtitle="Manage enrollments, credentials, denials, and claims"
        icon={<Shield className="w-5 h-5" />}
        onBack={onBack}
      />

      {/* Tab Bar */}
      <div className="bg-white border-b border-slate-200 px-4 pb-3">
        <div className="flex overflow-x-auto gap-1 -mx-1 px-1 pb-1 scrollbar-hide">
          {TABS.map((tab) => {
            const badge = tabBadges[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.icon}
                {tab.label}
                {badge != null && badge > 0 && (
                  <span
                    className={`ml-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isActive ? 'bg-white text-slate-900' : 'bg-red-500 text-white'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'caqh' && <CAQHTab />}
            {activeTab === 'enrollment' && <EnrollmentTab />}
            {activeTab === 'roster' && <RosterTab />}
            {activeTab === 'playbooks' && <AIPlaybooksTab />}
            {activeTab === 'claims' && <ClaimQueueTab />}
            {activeTab === 'denial-ops' && <DenialOpsTab />}
            {activeTab === 'status' && <StatusDashboardTab />}
            {activeTab === 'help' && <HelpTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
