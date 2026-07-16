/**
 * Caregiver Enrollment Wizard
 * Guided flow: "I want to become a paid caregiver for my child"
 * Steps: state → eligibility → program → fiscal agent → documents → training → submit
 * Feeds into PaidCaregiverMode + EVV once approved
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, ClipboardCheck, Building2, FileText, GraduationCap,
  Send, CheckCircle2, ArrowRight, ArrowLeft, Loader2,
  Shield, Heart, DollarSign, AlertTriangle,
  ChevronDown, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';

// ── Types ────────────────────────────────────────────────────────────

type WizardStep =
  | 'state-select'
  | 'eligibility'
  | 'program-select'
  | 'fiscal-agent'
  | 'documents'
  | 'training'
  | 'review-submit'
  | 'submitted';

interface EnrollmentData {
  state: string;
  childAge: number;
  childDiagnosis: string;
  hasMedicaid: boolean;
  medicaidId: string;
  programType: 'self-directed' | 'agency-directed' | '';
  selectedProgram: string;
  fiscalAgent: string;
  documents: Record<string, DocumentStatus>;
  trainingComplete: boolean;
  agreedToTerms: boolean;
}

interface DocumentStatus {
  label: string;
  required: boolean;
  uploaded: boolean;
  capturedAt?: string;
}

interface CaregiverEnrollmentWizardProps {
  onComplete: () => void;
  onBack: () => void;
}

// ── State Program Data ───────────────────────────────────────────────

const STATE_PROGRAMS: Record<string, {
  name: string;
  programs: { id: string; name: string; type: 'self-directed' | 'agency-directed'; description: string; payRange: string }[];
  fiscalAgents: { id: string; name: string; phone: string; website: string }[];
  trainingRequirements: string[];
  estimatedProcessingDays: number;
}> = {
  AZ: {
    name: 'Arizona',
    programs: [
      { id: 'az-ddd-attendant', name: 'DDD Attendant Care', type: 'self-directed', description: 'Parent/family member provides attendant care under DDD', payRange: '$14-18/hr' },
      { id: 'az-ddd-habilitation', name: 'DDD Habilitation', type: 'agency-directed', description: 'Habilitation services through qualified agency', payRange: '$15-22/hr' },
    ],
    fiscalAgents: [
      { id: 'acumen-az', name: 'Acumen Fiscal Agent', phone: '1-866-376-0950', website: 'https://acumenfiscalagent.com' },
      { id: 'ppl-az', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
    ],
    trainingRequirements: ['Complete DDD provider orientation (online)', 'First Aid/CPR certification', 'Background check clearance'],
    estimatedProcessingDays: 30,
  },
  CA: {
    name: 'California',
    programs: [
      { id: 'ca-ihss', name: 'In-Home Supportive Services (IHSS)', type: 'self-directed', description: 'State-funded program for in-home care by family members', payRange: '$16-20/hr' },
      { id: 'ca-sdp', name: 'Self-Determination Program (SDP)', type: 'self-directed', description: 'Flexible budget for services including parent-provided care', payRange: '$15-25/hr' },
      { id: 'ca-rc-vendored', name: 'Regional Center Vendored Services', type: 'agency-directed', description: 'Services through Regional Center vendor agencies', payRange: '$18-28/hr' },
    ],
    fiscalAgents: [
      { id: 'acumen-ca', name: 'Acumen Fiscal Agent', phone: '1-866-376-0950', website: 'https://acumenfiscalagent.com' },
      { id: 'gt-ca', name: 'GT Independence', phone: '1-877-659-4500', website: 'https://gtindependence.com' },
      { id: 'ppl-ca', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
    ],
    trainingRequirements: ['Complete IHSS provider enrollment', 'TB test (within last 4 years)', 'Background check (Live Scan fingerprinting)'],
    estimatedProcessingDays: 45,
  },
  CO: {
    name: 'Colorado',
    programs: [
      { id: 'co-ces', name: "Children's Extensive Support (CES)", type: 'self-directed', description: 'HCBS waiver for children with extensive support needs', payRange: '$15-20/hr' },
      { id: 'co-sls', name: 'Supported Living Services (SLS)', type: 'self-directed', description: 'Community-based services for daily living support', payRange: '$14-19/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-co', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'acumen-co', name: 'Acumen Fiscal Agent', phone: '1-866-376-0950', website: 'https://acumenfiscalagent.com' },
    ],
    trainingRequirements: ['Complete CES/SLS provider training', 'Background check', 'First Aid certification'],
    estimatedProcessingDays: 30,
  },
  CT: {
    name: 'Connecticut',
    programs: [
      { id: 'ct-ifs', name: 'Individual & Family Support Waiver', type: 'self-directed', description: 'Family-directed supports including respite and personal care', payRange: '$16-21/hr' },
      { id: 'ct-asd', name: 'ASD Waiver', type: 'self-directed', description: 'Autism-specific waiver for children and adults', payRange: '$17-23/hr' },
    ],
    fiscalAgents: [
      { id: 'dci-ct', name: 'Disability Connections Inc (DCI)', phone: '1-800-232-8809', website: 'https://dciinc.org' },
    ],
    trainingRequirements: ['DDS provider orientation', 'CPR/First Aid', 'Background check (CORI)'],
    estimatedProcessingDays: 45,
  },
  FL: {
    name: 'Florida',
    programs: [
      { id: 'fl-cdc', name: 'Consumer Directed Care Plus (CDC+)', type: 'self-directed', description: 'Self-directed Medicaid program for DD waiver recipients', payRange: '$12-16/hr' },
      { id: 'fl-ibudget', name: 'iBudget Florida', type: 'self-directed', description: 'Individual budget for home and community-based services', payRange: '$12-18/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-fl', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'conduent-fl', name: 'Conduent', phone: '1-866-762-2237', website: 'https://conduent.com' },
    ],
    trainingRequirements: ['APD provider enrollment', 'Level 2 background screening', 'Zero Tolerance training'],
    estimatedProcessingDays: 60,
  },
  GA: {
    name: 'Georgia',
    programs: [
      { id: 'ga-comp', name: 'Comprehensive Supports Waiver', type: 'self-directed', description: 'Comprehensive HCBS for individuals with DD', payRange: '$10-15/hr' },
      { id: 'ga-now', name: 'New Options Waiver (NOW)', type: 'self-directed', description: 'Community-based supports for independent living', payRange: '$10-14/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-ga', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
    ],
    trainingRequirements: ['DBHDD provider enrollment', 'Background check', 'Annual training requirements'],
    estimatedProcessingDays: 45,
  },
  IL: {
    name: 'Illinois',
    programs: [
      { id: 'il-hbs', name: 'Home-Based Support Services', type: 'self-directed', description: 'Self-directed services for individuals with DD', payRange: '$15-19/hr' },
      { id: 'il-cila', name: 'CILA (Community Integrated Living)', type: 'agency-directed', description: 'Agency-directed residential and support services', payRange: '$16-22/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-il', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'gt-il', name: 'GT Independence', phone: '1-877-659-4500', website: 'https://gtindependence.com' },
    ],
    trainingRequirements: ['DHS/DDD provider orientation', 'Background check (BICE)', 'DSP certification within 120 days'],
    estimatedProcessingDays: 45,
  },
  IN: {
    name: 'Indiana',
    programs: [
      { id: 'in-fsw', name: 'Family Supports Waiver (FSW)', type: 'self-directed', description: 'Family-directed services for children with DD', payRange: '$12-17/hr' },
      { id: 'in-cih', name: 'Community Integration & Habilitation (CIH)', type: 'self-directed', description: 'Comprehensive community-based services', payRange: '$14-20/hr' },
    ],
    fiscalAgents: [
      { id: 'acumen-in', name: 'Acumen Fiscal Agent', phone: '1-866-376-0950', website: 'https://acumenfiscalagent.com' },
    ],
    trainingRequirements: ['BDDS provider enrollment', 'Background check', 'Mandatory reporter training'],
    estimatedProcessingDays: 30,
  },
  MA: {
    name: 'Massachusetts',
    programs: [
      { id: 'ma-asd-waiver', name: 'ASD Waiver', type: 'self-directed', description: 'Autism-specific waiver for intensive in-home supports', payRange: '$18-25/hr' },
      { id: 'ma-iffs', name: 'Intensive Flexible Family Supports', type: 'self-directed', description: 'Flexible family-directed support services', payRange: '$17-23/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-ma', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'tempus-ma', name: 'Tempus Unlimited', phone: '1-877-479-7577', website: 'https://tempusunlimited.org' },
    ],
    trainingRequirements: ['DDS provider enrollment', 'CORI background check', 'First Aid/CPR', 'MAP training if administering medication'],
    estimatedProcessingDays: 30,
  },
  MD: {
    name: 'Maryland',
    programs: [
      { id: 'md-cp', name: 'Community Pathways Waiver', type: 'self-directed', description: 'Self-directed supports for community living', payRange: '$15-20/hr' },
      { id: 'md-fs', name: 'Family Supports Waiver', type: 'self-directed', description: 'Family-directed in-home support services', payRange: '$14-18/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-md', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
    ],
    trainingRequirements: ['DDA provider application', 'Background check (CJIS)', 'CPR/First Aid certification'],
    estimatedProcessingDays: 45,
  },
  MI: {
    name: 'Michigan',
    programs: [
      { id: 'mi-cw', name: "Children's Waiver", type: 'self-directed', description: 'HCBS waiver for children with DD under 18', payRange: '$14-19/hr' },
      { id: 'mi-hsw', name: 'Habilitation Supports Waiver', type: 'self-directed', description: 'Community supports for adults with DD', payRange: '$15-21/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-mi', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'gt-mi', name: 'GT Independence', phone: '1-877-659-4500', website: 'https://gtindependence.com' },
    ],
    trainingRequirements: ['MDHHS provider enrollment', 'Background check (ICHAT)', 'Recipient rights training'],
    estimatedProcessingDays: 30,
  },
  MN: {
    name: 'Minnesota',
    programs: [
      { id: 'mn-cdcs', name: 'Consumer Directed Community Supports (CDCS)', type: 'self-directed', description: 'Budget-based self-directed services', payRange: '$16-22/hr' },
      { id: 'mn-dd-waiver', name: 'DD Waiver', type: 'agency-directed', description: 'Comprehensive DD waiver through qualified agencies', payRange: '$17-24/hr' },
    ],
    fiscalAgents: [
      { id: 'acumen-mn', name: 'Acumen Fiscal Agent', phone: '1-866-376-0950', website: 'https://acumenfiscalagent.com' },
      { id: 'gt-mn', name: 'GT Independence', phone: '1-877-659-4500', website: 'https://gtindependence.com' },
    ],
    trainingRequirements: ['DHS provider enrollment', 'Background study (NETStudy 2.0)', '245D licensing training'],
    estimatedProcessingDays: 30,
  },
  MO: {
    name: 'Missouri',
    programs: [
      { id: 'mo-pfh', name: 'Partnership for Hope', type: 'self-directed', description: 'Home and community-based supports for DD', payRange: '$12-17/hr' },
      { id: 'mo-cs', name: 'Community Support', type: 'self-directed', description: 'Community-based services and employment supports', payRange: '$13-18/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-mo', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
    ],
    trainingRequirements: ['DMH provider enrollment', 'Background screening (FCSR)', 'Medication administration training'],
    estimatedProcessingDays: 45,
  },
  NC: {
    name: 'North Carolina',
    programs: [
      { id: 'nc-innovations', name: 'Innovations Waiver', type: 'self-directed', description: 'Community-based supports for individuals with IDD', payRange: '$12-18/hr' },
      { id: 'nc-tailored', name: 'Tailored Plan', type: 'agency-directed', description: 'Managed care for behavioral health and IDD services', payRange: '$13-19/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-nc', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
    ],
    trainingRequirements: ['LME/MCO provider enrollment', 'Background check', 'First Aid/CPR'],
    estimatedProcessingDays: 60,
  },
  NJ: {
    name: 'New Jersey',
    programs: [
      { id: 'nj-sp', name: 'Supports Program', type: 'self-directed', description: 'Self-directed community supports', payRange: '$16-22/hr' },
      { id: 'nj-ccp', name: 'Community Care Program', type: 'agency-directed', description: 'Agency-directed residential and community services', payRange: '$17-24/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-nj', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'gt-nj', name: 'GT Independence', phone: '1-877-659-4500', website: 'https://gtindependence.com' },
    ],
    trainingRequirements: ['DDD provider application', 'Background check (CHRC)', 'Danielle\'s Law training'],
    estimatedProcessingDays: 45,
  },
  NY: {
    name: 'New York',
    programs: [
      { id: 'ny-cdpap', name: 'Consumer Directed Personal Assistance Program (CDPAP)', type: 'self-directed', description: 'Allows family members to be paid caregivers through Medicaid', payRange: '$18-22/hr' },
      { id: 'ny-sdss', name: 'Self-Direction (OPWDD)', type: 'self-directed', description: 'Self-directed services through OPWDD for DD', payRange: '$17-25/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-ny', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'cdcn-ny', name: 'Concepts of Independence (CDCN)', phone: '1-212-293-9999', website: 'https://coinyc.org' },
    ],
    trainingRequirements: ['CDPAP enrollment via fiscal intermediary', 'No formal certification required for CDPAP', 'Background check through FI'],
    estimatedProcessingDays: 30,
  },
  OH: {
    name: 'Ohio',
    programs: [
      { id: 'oh-io', name: 'Individual Options Waiver', type: 'self-directed', description: 'Self-directed HCBS for individuals with DD', payRange: '$12-17/hr' },
      { id: 'oh-level1', name: 'Level 1 Waiver', type: 'self-directed', description: 'Community supports for individuals with lower support needs', payRange: '$11-15/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-oh', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'acumen-oh', name: 'Acumen Fiscal Agent', phone: '1-866-376-0950', website: 'https://acumenfiscalagent.com' },
    ],
    trainingRequirements: ['DODD provider certification', 'BCI background check', 'First Aid/CPR', 'Rights training'],
    estimatedProcessingDays: 45,
  },
  OR: {
    name: 'Oregon',
    programs: [
      { id: 'or-k-plan', name: 'K Plan (Community First Choice)', type: 'self-directed', description: 'State plan option for personal care by family', payRange: '$17-22/hr' },
      { id: 'or-ciihs', name: "Children's Intensive In-Home Services", type: 'self-directed', description: 'Intensive behavioral support in the home', payRange: '$18-25/hr' },
    ],
    fiscalAgents: [
      { id: 'acumen-or', name: 'Acumen Fiscal Agent', phone: '1-866-376-0950', website: 'https://acumenfiscalagent.com' },
    ],
    trainingRequirements: ['ODDS provider enrollment', 'Background check (ORCHIDS)', 'Mandatory abuse reporter training'],
    estimatedProcessingDays: 30,
  },
  PA: {
    name: 'Pennsylvania',
    programs: [
      { id: 'pa-cds', name: 'Consolidated & Person/Family Directed Support', type: 'self-directed', description: 'Self-directed waiver services through ODP', payRange: '$13-18/hr' },
      { id: 'pa-obra', name: 'OBRA Waiver', type: 'agency-directed', description: 'Home and community-based services for DD', payRange: '$14-20/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-pa', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'gt-pa', name: 'GT Independence', phone: '1-877-659-4500', website: 'https://gtindependence.com' },
    ],
    trainingRequirements: ['ODP provider qualification', 'Background checks (Act 33/34/73/169)', 'Medication administration training'],
    estimatedProcessingDays: 60,
  },
  SC: {
    name: 'South Carolina',
    programs: [
      { id: 'sc-idrd', name: 'ID/RD Waiver', type: 'self-directed', description: 'HCBS for individuals with intellectual/related disabilities', payRange: '$10-15/hr' },
      { id: 'sc-hasci', name: 'Head & Spinal Cord Injury Waiver', type: 'self-directed', description: 'Services for individuals with brain/spinal injuries', payRange: '$11-16/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-sc', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
    ],
    trainingRequirements: ['DDSN provider enrollment', 'SLED background check', 'First Aid/CPR'],
    estimatedProcessingDays: 45,
  },
  TN: {
    name: 'Tennessee',
    programs: [
      { id: 'tn-choices', name: 'CHOICES', type: 'self-directed', description: 'Self-directed long-term services and supports', payRange: '$12-17/hr' },
      { id: 'tn-ecf', name: 'Employment and Community First CHOICES', type: 'self-directed', description: 'Community employment and inclusion supports for IDD', payRange: '$13-19/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-tn', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
    ],
    trainingRequirements: ['DIDD provider enrollment', 'TBI background check', 'Person-centered thinking training'],
    estimatedProcessingDays: 45,
  },
  TX: {
    name: 'Texas',
    programs: [
      { id: 'tx-cds', name: 'Consumer Directed Services (CDS)', type: 'self-directed', description: 'Self-directed option across multiple Texas waivers', payRange: '$10-15/hr' },
      { id: 'tx-class', name: 'CLASS Waiver', type: 'agency-directed', description: 'Community Living Assistance for individuals with DD', payRange: '$12-18/hr' },
      { id: 'tx-hcs', name: 'Home & Community-Based Services (HCS)', type: 'self-directed', description: 'Services for individuals with IDD as alternative to institutions', payRange: '$11-17/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-tx', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'conduent-tx', name: 'Conduent', phone: '1-866-762-2237', website: 'https://conduent.com' },
    ],
    trainingRequirements: ['HHSC CDS employer registration', 'Background check', 'Employer management training'],
    estimatedProcessingDays: 45,
  },
  VA: {
    name: 'Virginia',
    programs: [
      { id: 'va-dd-waiver', name: 'DD Waiver', type: 'self-directed', description: 'Consumer-directed option for DD waiver services', payRange: '$13-18/hr' },
      { id: 'va-bi-waiver', name: 'Building Independence Waiver', type: 'self-directed', description: 'Services promoting independence for individuals with DD', payRange: '$12-17/hr' },
      { id: 'va-fis', name: 'Family & Individual Support Waiver', type: 'self-directed', description: 'Family-directed supports including respite and personal care', payRange: '$12-16/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-va', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
    ],
    trainingRequirements: ['DBHDS provider enrollment', 'Background check (VSP)', 'First Aid/CPR', 'Human Rights training'],
    estimatedProcessingDays: 60,
  },
  WA: {
    name: 'Washington',
    programs: [
      { id: 'wa-bp', name: 'Basic Plus Waiver', type: 'self-directed', description: 'Self-directed personal care and community supports', payRange: '$18-23/hr' },
      { id: 'wa-ciibs', name: "Children's Intensive In-Home Behavioral Support", type: 'self-directed', description: 'Intensive ABA and behavioral support at home', payRange: '$20-28/hr' },
    ],
    fiscalAgents: [
      { id: 'cdwa', name: 'Consumer Direct Care Network WA', phone: '1-866-214-9899', website: 'https://consumerdirectwa.com' },
    ],
    trainingRequirements: ['DDA provider application', 'Background check (BCCU)', 'Basic training (70 hours)', 'Continuing education (12 hrs/year)'],
    estimatedProcessingDays: 30,
  },
  WI: {
    name: 'Wisconsin',
    programs: [
      { id: 'wi-clts', name: "Children's Long-Term Support (CLTS)", type: 'self-directed', description: 'Self-directed supports for children with DD', payRange: '$14-19/hr' },
      { id: 'wi-fc', name: 'Family Care', type: 'self-directed', description: 'Managed long-term care with self-directed option', payRange: '$15-21/hr' },
    ],
    fiscalAgents: [
      { id: 'ppl-wi', name: 'Public Partnerships LLC (PPL)', phone: '1-877-908-1750', website: 'https://publicpartnerships.com' },
      { id: 'gt-wi', name: 'GT Independence', phone: '1-877-659-4500', website: 'https://gtindependence.com' },
    ],
    trainingRequirements: ['DHS provider certification', 'Caregiver background check', 'Standard precautions training'],
    estimatedProcessingDays: 30,
  },
};

const REQUIRED_DOCUMENTS: Record<string, { label: string; required: boolean }> = {
  gov_id_front: { label: 'Government ID (Front)', required: true },
  gov_id_back: { label: 'Government ID (Back)', required: true },
  medicaid_card: { label: "Child's Medicaid Card", required: true },
  medical_necessity: { label: 'Letter of Medical Necessity', required: true },
  service_auth: { label: 'Service Authorization Letter', required: false },
  background_clearance: { label: 'Background Check Clearance', required: false },
};

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'state-select', label: 'State', icon: MapPin },
  { id: 'eligibility', label: 'Eligibility', icon: ClipboardCheck },
  { id: 'program-select', label: 'Program', icon: Heart },
  { id: 'fiscal-agent', label: 'Fiscal Agent', icon: Building2 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'review-submit', label: 'Submit', icon: Send },
];

// ── Component ────────────────────────────────────────────────────────

export function CaregiverEnrollmentWizard({ onComplete, onBack }: CaregiverEnrollmentWizardProps) {
  const [step, setStep] = useState<WizardStep>('state-select');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<EnrollmentData>({
    state: '',
    childAge: 0,
    childDiagnosis: '',
    hasMedicaid: false,
    medicaidId: '',
    programType: '',
    selectedProgram: '',
    fiscalAgent: '',
    documents: Object.fromEntries(
      Object.entries(REQUIRED_DOCUMENTS).map(([k, v]) => [k, { ...v, uploaded: false }])
    ),
    trainingComplete: false,
    agreedToTerms: false,
  });

  const stateData = data.state ? STATE_PROGRAMS[data.state] : null;
  const stepIndex = STEPS.findIndex(s => s.id === step);

  const update = (changes: Partial<EnrollmentData>) =>
    setData(prev => ({ ...prev, ...changes }));

  const availableStates = useMemo(
    () => Object.entries(STATE_PROGRAMS)
      .map(([abbr, info]) => ({ abbr, name: info.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const filteredPrograms = useMemo(() => {
    if (!stateData || !data.programType) return stateData?.programs || [];
    return stateData.programs.filter(p => p.type === data.programType);
  }, [stateData, data.programType]);

  const uploadedCount = Object.values(data.documents).filter(d => d.uploaded).length;
  const requiredDocs = Object.values(data.documents).filter(d => d.required);
  const requiredUploaded = requiredDocs.filter(d => d.uploaded).length;

  const handleDocCapture = (docId: string) => {
    // Marks the document as ready to provide. Actual file capture/upload happens
    // during enrollment with your fiscal agent — this step records which documents
    // you have on hand so the application can be submitted.
    update({
      documents: {
        ...data.documents,
        [docId]: { ...data.documents[docId], uploaded: true, capturedAt: new Date().toISOString() },
      },
    });
    toast.success(`${data.documents[docId].label} marked ready`);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('caregiver_enrollments').insert({
          user_id: user.id,
          state: data.state,
          program_id: data.selectedProgram,
          fiscal_agent_id: data.fiscalAgent,
          child_age: data.childAge,
          child_diagnosis: data.childDiagnosis,
          medicaid_id: data.medicaidId,
          documents_uploaded: uploadedCount,
          training_complete: data.trainingComplete,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        });
      }
    } catch {
      // Demo fallback
    }

    localStorage.setItem('aminy-caregiver-enrollment', JSON.stringify({
      ...data,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    }));

    setIsSubmitting(false);
    setStep('submitted');
    toast.success('Enrollment application submitted!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F6FBFB] to-white">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={onBack} aria-label="Go back" className="p-2 hover:bg-[#EDF4F7] rounded-lg">
            <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-[#132F43]">Become a Paid Caregiver</h1>
            <p className="text-sm text-[#5A6B7A]">Get paid through Medicaid waiver programs</p>
          </div>
          <DollarSign className="w-6 h-6 text-[#2A7D99]" />
        </div>

        {/* Progress */}
        {step !== 'submitted' && (
          <div className="max-w-2xl mx-auto mt-3 flex gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= stepIndex ? 'bg-[#2A7D99]' : 'bg-[#E8E4DF]'
              }`} />
            ))}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1: State Selection */}
          {step === 'state-select' && (
            <motion.div key="state" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <MapPin className="w-12 h-12 text-[#2A7D99] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-[#132F43]">What state do you live in?</h2>
                <p className="text-[#5A6B7A] text-sm">We'll find programs available in your state</p>
              </div>

              <select
                value={data.state}
                onChange={(e) => update({ state: e.target.value, selectedProgram: '', fiscalAgent: '' })}
                aria-label="Select your state"
                className="w-full px-4 py-3 border border-[#E8E4DF] rounded-xl text-lg focus:ring-2 focus:ring-[#2A7D99] focus:border-transparent"
              >
                <option value="">Select your state...</option>
                {availableStates.map(s => (
                  <option key={s.abbr} value={s.abbr}>{s.name}</option>
                ))}
              </select>

              {data.state && stateData && (
                <div className="bg-[#2A7D99]/10 border border-[#2A7D99]/25 rounded-xl p-4">
                  <p className="font-medium text-[#132F43]">
                    {stateData.programs.length} program{stateData.programs.length > 1 ? 's' : ''} available in {stateData.name}
                  </p>
                  <p className="text-sm text-[#2A7D99] mt-1">
                    Estimated processing: ~{stateData.estimatedProcessingDays} days
                  </p>
                </div>
              )}

              <button
                onClick={() => setStep('eligibility')}
                disabled={!data.state}
                className="w-full py-3 bg-[#2A7D99] text-white font-semibold rounded-xl hover:bg-[#376E80] disabled:bg-slate-400 flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Eligibility Check */}
          {step === 'eligibility' && (
            <motion.div key="eligibility" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <ClipboardCheck className="w-12 h-12 text-[#2A7D99] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-[#132F43]">Eligibility Check</h2>
                <p className="text-[#5A6B7A] text-sm">Let's verify your child qualifies</p>
              </div>

              <div>
                <label htmlFor="enroll-child-age" className="block text-sm font-medium text-[#3A4A57] mb-1">Child's Age</label>
                <input
                  id="enroll-child-age"
                  type="number"
                  value={data.childAge || ''}
                  onChange={(e) => update({ childAge: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 5"
                  min={0} max={21}
                  className="w-full px-4 py-3 border border-[#E8E4DF] rounded-xl focus:ring-2 focus:ring-[#2A7D99]"
                />
              </div>

              <div>
                <label htmlFor="enroll-diagnosis" className="block text-sm font-medium text-[#3A4A57] mb-1">Child's Diagnosis</label>
                <select
                  id="enroll-diagnosis"
                  value={data.childDiagnosis}
                  onChange={(e) => update({ childDiagnosis: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E8E4DF] rounded-xl focus:ring-2 focus:ring-[#2A7D99]"
                >
                  <option value="">Select diagnosis...</option>
                  <option value="asd">Autism Spectrum Disorder (ASD)</option>
                  <option value="idd">Intellectual/Developmental Disability</option>
                  <option value="cerebral-palsy">Cerebral Palsy</option>
                  <option value="down-syndrome">Down Syndrome</option>
                  <option value="other-dd">Other Developmental Disability</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 p-4 bg-[#F6FBFB] rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.hasMedicaid}
                    onChange={(e) => update({ hasMedicaid: e.target.checked })}
                    className="w-5 h-5 text-[#2A7D99] rounded border-[#E8E4DF] focus:ring-[#2A7D99]"
                  />
                  <div>
                    <p className="font-medium text-[#132F43]">Child has active Medicaid</p>
                    <p className="text-sm text-[#5A6B7A]">Required for waiver programs</p>
                  </div>
                </label>
              </div>

              {data.hasMedicaid && (
                <div>
                  <label className="block text-sm font-medium text-[#3A4A57] mb-1">Medicaid ID (optional now)</label>
                  <input
                    type="text"
                    value={data.medicaidId}
                    onChange={(e) => update({ medicaidId: e.target.value })}
                    placeholder="e.g., 12345678"
                    className="w-full px-4 py-3 border border-[#E8E4DF] rounded-xl focus:ring-2 focus:ring-[#2A7D99]"
                  />
                </div>
              )}

              {!data.hasMedicaid && data.childDiagnosis && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Medicaid may be required</p>
                    <p className="text-sm text-amber-600">
                      Most waiver programs require active Medicaid. Your child may qualify based on
                      disability alone (Katie Beckett / TEFRA pathway) regardless of income.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('state-select')} className="flex-1 py-3 border border-[#E8E4DF] text-[#3A4A57] rounded-xl hover:bg-[#F6FBFB]">
                  Back
                </button>
                <button
                  onClick={() => setStep('program-select')}
                  disabled={!data.childDiagnosis || data.childAge === 0}
                  className="flex-1 py-3 bg-[#2A7D99] text-white font-semibold rounded-xl hover:bg-[#376E80] disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Program Selection */}
          {step === 'program-select' && stateData && (
            <motion.div key="program" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <Heart className="w-12 h-12 text-[#2A7D99] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-[#132F43]">Choose Your Program</h2>
                <p className="text-[#5A6B7A] text-sm">Select how you'd like to provide care</p>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => update({ programType: 'self-directed', selectedProgram: '' })}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors ${
                    data.programType === 'self-directed'
                      ? 'bg-[#2A7D99] text-white'
                      : 'bg-[#EDF4F7] text-[#5A6B7A] hover:bg-[#E8E4DF]'
                  }`}
                >
                  Self-Directed
                </button>
                <button
                  onClick={() => update({ programType: 'agency-directed', selectedProgram: '' })}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors ${
                    data.programType === 'agency-directed'
                      ? 'bg-[#2A7D99] text-white'
                      : 'bg-[#EDF4F7] text-[#5A6B7A] hover:bg-[#E8E4DF]'
                  }`}
                >
                  Agency-Directed
                </button>
              </div>

              {data.programType === '' && (
                <div className="bg-[#EEF4F8] border border-[#C8DDE8] rounded-xl p-4 flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Self-Directed</p>
                    <p>You manage your own schedule and care. More flexibility, you handle timesheets.</p>
                    <p className="font-medium mt-2">Agency-Directed</p>
                    <p>An agency manages scheduling and billing. Less paperwork, less flexibility.</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {filteredPrograms.map(program => (
                  <button
                    key={program.id}
                    onClick={() => update({ selectedProgram: program.id })}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      data.selectedProgram === program.id
                        ? 'border-[#2A7D99] bg-[#2A7D99]/10'
                        : 'border-[#E8E4DF] bg-white hover:border-[#2A7D99]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-[#132F43]">{program.name}</p>
                        <p className="text-sm text-[#5A6B7A] mt-1">{program.description}</p>
                      </div>
                      <span className="text-sm font-semibold text-[#2A7D99] whitespace-nowrap ml-3">
                        {program.payRange}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('eligibility')} className="flex-1 py-3 border border-[#E8E4DF] text-[#3A4A57] rounded-xl hover:bg-[#F6FBFB]">
                  Back
                </button>
                <button
                  onClick={() => setStep('fiscal-agent')}
                  disabled={!data.selectedProgram}
                  className="flex-1 py-3 bg-[#2A7D99] text-white font-semibold rounded-xl hover:bg-[#376E80] disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Fiscal Agent */}
          {step === 'fiscal-agent' && stateData && (
            <motion.div key="fiscal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <Building2 className="w-12 h-12 text-[#2A7D99] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-[#132F43]">Select Fiscal Agent</h2>
                <p className="text-[#5A6B7A] text-sm">They handle your payroll and taxes</p>
              </div>

              <div className="space-y-3">
                {stateData.fiscalAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => update({ fiscalAgent: agent.id })}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      data.fiscalAgent === agent.id
                        ? 'border-[#2A7D99] bg-[#2A7D99]/10'
                        : 'border-[#E8E4DF] bg-white hover:border-[#2A7D99]'
                    }`}
                  >
                    <p className="font-medium text-[#132F43]">{agent.name}</p>
                    <p className="text-sm text-[#5A6B7A] mt-1">{agent.phone}</p>
                  </button>
                ))}
              </div>

              <div className="bg-[#F6FBFB] rounded-xl p-3 flex gap-2">
                <Info className="w-4 h-4 text-[#8A9BA8] shrink-0 mt-0.5" />
                <p className="text-sm text-[#5A6B7A]">
                  A fiscal agent (also called fiscal intermediary) processes your payroll,
                  handles tax withholding, and ensures Medicaid compliance. They're required
                  for self-directed programs.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('program-select')} className="flex-1 py-3 border border-[#E8E4DF] text-[#3A4A57] rounded-xl hover:bg-[#F6FBFB]">
                  Back
                </button>
                <button
                  onClick={() => setStep('documents')}
                  disabled={!data.fiscalAgent}
                  className="flex-1 py-3 bg-[#2A7D99] text-white font-semibold rounded-xl hover:bg-[#376E80] disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Documents */}
          {step === 'documents' && (
            <motion.div key="docs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <FileText className="w-12 h-12 text-[#2A7D99] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-[#132F43]">Required Documents</h2>
                <p className="text-[#5A6B7A] text-sm">{requiredUploaded}/{requiredDocs.length} required docs uploaded</p>
              </div>

              <div className="space-y-3">
                {Object.entries(data.documents).map(([id, doc]) => (
                  <div key={id} className={`p-4 rounded-xl border ${
                    doc.uploaded ? 'border-green-200 bg-green-50' : 'border-[#E8E4DF] bg-white'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {doc.uploaded ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-[#E8E4DF]" />
                        )}
                        <div>
                          <p className="font-medium text-[#132F43] text-sm">{doc.label}</p>
                          {doc.required && !doc.uploaded && (
                            <span className="text-sm text-red-500">Required</span>
                          )}
                          {doc.uploaded && doc.capturedAt && (
                            <span className="text-sm text-green-600">
                              Marked ready {new Date(doc.capturedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {!doc.uploaded ? (
                        <button
                          onClick={() => handleDocCapture(id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A7D99] text-white text-sm font-medium rounded-lg hover:bg-[#376E80]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark ready
                        </button>
                      ) : (
                        <span className="text-sm font-medium text-[#2A7D99]">Ready</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('fiscal-agent')} className="flex-1 py-3 border border-[#E8E4DF] text-[#3A4A57] rounded-xl hover:bg-[#F6FBFB]">
                  Back
                </button>
                <button
                  onClick={() => setStep('training')}
                  disabled={requiredUploaded < requiredDocs.length}
                  className="flex-1 py-3 bg-[#2A7D99] text-white font-semibold rounded-xl hover:bg-[#376E80] disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 6: Training */}
          {step === 'training' && stateData && (
            <motion.div key="training" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <GraduationCap className="w-12 h-12 text-[#2A7D99] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-[#132F43]">Training Requirements</h2>
                <p className="text-[#5A6B7A] text-sm">Complete these before you can start providing services</p>
              </div>

              <div className="bg-white rounded-xl border border-[#E8E4DF] divide-y divide-gray-100">
                {stateData.trainingRequirements.map((req, i) => (
                  <div key={i} className="p-4 flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#2A7D99]/15 text-[#376E80] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-sm text-[#3A4A57]">{req}</p>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-3 p-4 bg-[#2A7D99]/10 rounded-xl border border-[#2A7D99]/25 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.trainingComplete}
                  onChange={(e) => update({ trainingComplete: e.target.checked })}
                  className="mt-0.5 w-5 h-5 text-[#2A7D99] rounded border-[#E8E4DF] focus:ring-[#2A7D99]"
                />
                <div>
                  <p className="font-medium text-[#132F43]">I acknowledge these training requirements</p>
                  <p className="text-sm text-[#5A6B7A]">I will complete all required training before providing services</p>
                </div>
              </label>

              <div className="flex gap-3">
                <button onClick={() => setStep('documents')} className="flex-1 py-3 border border-[#E8E4DF] text-[#3A4A57] rounded-xl hover:bg-[#F6FBFB]">
                  Back
                </button>
                <button
                  onClick={() => setStep('review-submit')}
                  disabled={!data.trainingComplete}
                  className="flex-1 py-3 bg-[#2A7D99] text-white font-semibold rounded-xl hover:bg-[#376E80] disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 7: Review & Submit */}
          {step === 'review-submit' && stateData && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <Send className="w-12 h-12 text-[#2A7D99] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-[#132F43]">Review & Submit</h2>
                <p className="text-[#5A6B7A] text-sm">Double-check your information</p>
              </div>

              <div className="bg-white rounded-xl border border-[#E8E4DF] divide-y divide-gray-100">
                <div className="p-4">
                  <p className="text-xs text-[#5A6B7A] uppercase tracking-wide mb-1">State</p>
                  <p className="font-semibold text-[#132F43]">{stateData.name}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-[#5A6B7A] uppercase tracking-wide mb-1">Child</p>
                  <p className="font-semibold text-[#132F43]">Age {data.childAge} · {data.childDiagnosis}</p>
                  {data.medicaidId && <p className="text-sm text-[#5A6B7A]">Medicaid: {data.medicaidId}</p>}
                </div>
                <div className="p-4">
                  <p className="text-xs text-[#5A6B7A] uppercase tracking-wide mb-1">Program</p>
                  <p className="font-semibold text-[#132F43]">
                    {stateData.programs.find(p => p.id === data.selectedProgram)?.name || data.selectedProgram}
                  </p>
                  <p className="text-sm text-[#2A7D99]">
                    {stateData.programs.find(p => p.id === data.selectedProgram)?.payRange}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-[#5A6B7A] uppercase tracking-wide mb-1">Fiscal Agent</p>
                  <p className="font-semibold text-[#132F43]">
                    {stateData.fiscalAgents.find(a => a.id === data.fiscalAgent)?.name || data.fiscalAgent}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-[#5A6B7A] uppercase tracking-wide mb-1">Documents</p>
                  <p className="font-semibold text-[#132F43]">{uploadedCount} uploaded</p>
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 bg-[#F6FBFB] rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.agreedToTerms}
                  onChange={(e) => update({ agreedToTerms: e.target.checked })}
                  className="mt-0.5 w-5 h-5 text-[#2A7D99] rounded border-[#E8E4DF] focus:ring-[#2A7D99]"
                />
                <p className="text-sm text-[#5A6B7A]">
                  I certify that all information is accurate and I authorize Aminy to process
                  my caregiver enrollment application.
                </p>
              </label>

              <div className="flex gap-3">
                <button onClick={() => setStep('training')} className="flex-1 py-3 border border-[#E8E4DF] text-[#3A4A57] rounded-xl hover:bg-[#F6FBFB]">
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!data.agreedToTerms || isSubmitting}
                  className="flex-1 py-3 bg-[#2A7D99] text-white font-semibold rounded-xl hover:bg-[#376E80] disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit Application
                </button>
              </div>
            </motion.div>
          )}

          {/* Submitted */}
          {step === 'submitted' && stateData && (
            <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center py-8">
              <div className="w-20 h-20 bg-[#2A7D99]/15 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-[#2A7D99]" />
              </div>
              <h2 className="text-2xl font-bold text-[#132F43]">Application Submitted!</h2>
              <p className="text-[#5A6B7A] max-w-md mx-auto">
                Your caregiver enrollment application has been submitted. Processing typically
                takes {stateData.estimatedProcessingDays} days in {stateData.name}.
              </p>

              <div className="bg-[#2A7D99]/10 border border-[#2A7D99]/25 rounded-xl p-4 text-left">
                <p className="font-medium text-[#132F43] mb-2">What happens next:</p>
                <ol className="text-sm text-[#376E80] space-y-1.5">
                  <li>1. Your fiscal agent will contact you to complete enrollment</li>
                  <li>2. Complete any remaining training requirements</li>
                  <li>3. Once approved, you can start tracking time in Aminy</li>
                  <li>4. Submit timesheets through the app for payment</li>
                </ol>
              </div>

              <button
                onClick={onComplete}
                className="w-full py-3 bg-[#2A7D99] text-white font-semibold rounded-xl hover:bg-[#376E80]"
              >
                Go to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CaregiverEnrollmentWizard;
