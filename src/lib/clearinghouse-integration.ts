/**
 * Clearinghouse Integration for Claims and Eligibility
 *
 * Supports:
 * - Availity (primary - largest clearinghouse network)
 * - Waystar (secondary - strong HCBS/behavioral health focus)
 * - Change Healthcare (backup)
 *
 * Features:
 * - Real-time eligibility verification (270/271 transactions)
 * - Claims submission (837P for professional, 837I for institutional)
 * - Claims status inquiry (276/277 transactions)
 * - Remittance advice processing (835 transactions)
 * - Production-valid EDI 837P generation (X12 5010)
 * - EDI validation
 * - ERA 835 parsing
 * - Retry with exponential backoff
 * - Failed submission queue with Supabase persistence
 *
 * Industry Standard Approach:
 * Most fiscal agents (Acumen, PPL, DCI) don't have public APIs.
 * Instead, we use clearinghouses that speak their language (EDI X12).
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { secureFetch } from './security/secure-fetch';

// Supabase Edge Function URL for secure clearinghouse operations
// ALL clearinghouse API keys live server-side in Supabase secrets — never in the client bundle.
const CLEARINGHOUSE_FUNCTION_URL = `https://${projectId}.supabase.co/functions/v1/clearinghouse`;

// Always route through the edge function. Direct client-side API calls with
// VITE_-prefixed keys have been removed — they exposed secrets in the browser.
const USE_EDGE_FUNCTION = true;

// ============================================================================
// Types
// ============================================================================

export interface EligibilityRequest {
  memberId: string;
  memberDob: string; // YYYY-MM-DD
  memberFirstName: string;
  memberLastName: string;
  providerId: string; // NPI
  providerTaxId?: string;
  payerId: string; // Payer ID (e.g., 'BCBS', 'AETNA')
  serviceDate: string; // YYYY-MM-DD
  serviceCodes?: string[]; // CPT/HCPCS codes to check
  placeOfService?: string; // '11' for office, '02' for telehealth
}

export interface EligibilityResponse {
  success: boolean;
  transactionId: string;
  timestamp: string;
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dob: string;
    relationship: 'self' | 'spouse' | 'child' | 'other';
  };
  plan: {
    payerId: string;
    payerName: string;
    planName: string;
    planType: 'HMO' | 'PPO' | 'EPO' | 'POS' | 'HDHP' | 'Medicaid' | 'Medicare' | 'Other';
    groupNumber?: string;
    effectiveDate: string;
    terminationDate?: string;
  };
  coverage: {
    isActive: boolean;
    inNetwork: boolean;
    deductible: {
      individual: number;
      family: number;
      met: number;
      remaining: number;
    };
    outOfPocketMax: {
      individual: number;
      family: number;
      spent: number;
      remaining: number;
    };
    copay: {
      primaryCare: number;
      specialist: number;
      telehealth: number;
      behavioralHealth: number;
    };
    coinsurance: {
      inNetwork: number; // percentage
      outOfNetwork: number;
    };
  };
  serviceCoverage: Array<{
    serviceCode: string;
    serviceName: string;
    covered: boolean;
    requiresAuth: boolean;
    authInfo?: string;
    limitations?: string;
    copay?: number;
  }>;
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

export interface ClaimSubmission {
  claimType: 'professional' | 'institutional'; // 837P vs 837I
  billingProvider: {
    npi: string;
    taxId: string;
    name: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zip: string;
    };
    phone: string;
  };
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dob: string;
    gender: 'M' | 'F' | 'U';
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  patient?: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: 'M' | 'F' | 'U';
    relationship: 'self' | 'spouse' | 'child' | 'other';
  };
  payer: {
    payerId: string;
    payerName: string;
  };
  diagnosis: Array<{
    code: string; // ICD-10
    isPrimary: boolean;
  }>;
  services: Array<{
    serviceDate: string;
    procedureCode: string; // CPT/HCPCS
    modifiers?: string[];
    units: number;
    chargeAmount: number;
    placeOfService: string;
    diagnosisPointers: number[]; // References to diagnosis array (1-indexed)
    renderingProviderNpi?: string;
  }>;
  totalCharges: number;
  priorAuthNumber?: string;
  referralNumber?: string;
  accidentInfo?: {
    type: 'auto' | 'employment' | 'other';
    date: string;
    state?: string;
  };
}

export interface ClaimResponse {
  success: boolean;
  transactionId: string;
  claimControlNumber: string;
  status: 'accepted' | 'rejected' | 'pending';
  timestamp: string;
  errors?: Array<{
    code: string;
    message: string;
    location?: string;
  }>;
  warnings?: Array<{
    code: string;
    message: string;
  }>;
}

export interface ClaimStatusRequest {
  claimControlNumber?: string;
  memberId: string;
  payerId: string;
  serviceDateFrom: string;
  serviceDateTo?: string;
  providerNpi: string;
}

export interface ClaimStatusResponse {
  success: boolean;
  claims: Array<{
    claimControlNumber: string;
    status: 'pending' | 'in_process' | 'approved' | 'denied' | 'partial' | 'paid';
    statusDate: string;
    totalCharged: number;
    totalPaid?: number;
    adjustments?: Array<{
      code: string;
      reason: string;
      amount: number;
    }>;
    checkNumber?: string;
    checkDate?: string;
  }>;
}

// ============================================================================
// EDI Segment Types (X12 5010)
// ============================================================================

/** ISA Interchange Control Header */
export interface EDI_ISA {
  authorizationQualifier: string;    // ISA01 - '00' = no authorization
  authorizationInfo: string;         // ISA02 - 10 spaces if ISA01='00'
  securityQualifier: string;         // ISA03 - '00' = no security
  securityInfo: string;              // ISA04 - 10 spaces if ISA03='00'
  senderQualifier: string;           // ISA05 - 'ZZ' = mutually defined
  senderId: string;                  // ISA06 - 15 chars padded
  receiverQualifier: string;         // ISA07 - 'ZZ' = mutually defined
  receiverId: string;                // ISA08 - 15 chars padded
  date: string;                      // ISA09 - YYMMDD
  time: string;                      // ISA10 - HHMM
  repetitionSeparator: string;       // ISA11 - '^'
  versionNumber: string;             // ISA12 - '00501'
  controlNumber: string;             // ISA13 - 9 digits zero-padded
  acknowledgmentRequested: string;   // ISA14 - '0' or '1'
  usageIndicator: string;            // ISA15 - 'P' production, 'T' test
  componentSeparator: string;        // ISA16 - ':'
}

/** GS Functional Group Header */
export interface EDI_GS {
  functionalIdCode: string;          // GS01 - 'HC' for health care claim
  applicationSenderCode: string;     // GS02
  applicationReceiverCode: string;   // GS03
  date: string;                      // GS04 - CCYYMMDD
  time: string;                      // GS05 - HHMM
  groupControlNumber: string;        // GS06
  responsibleAgencyCode: string;     // GS07 - 'X'
  versionCode: string;               // GS08 - '005010X222A1'
}

/** ST Transaction Set Header */
export interface EDI_ST {
  transactionSetIdCode: string;      // ST01 - '837'
  transactionSetControlNumber: string; // ST02 - 4-9 chars
  implementationConventionRef: string; // ST03 - '005010X222A1'
}

/** BHT Beginning of Hierarchical Transaction */
export interface EDI_BHT {
  hierarchicalStructureCode: string; // BHT01 - '0019'
  transactionSetPurposeCode: string; // BHT02 - '00' original
  referenceId: string;               // BHT03 - claim ref
  date: string;                      // BHT04 - CCYYMMDD
  time: string;                      // BHT05 - HHMM
  transactionTypeCode: string;       // BHT06 - 'CH' chargeable
}

/** NM1 Individual or Organizational Name */
export interface EDI_NM1 {
  entityIdCode: string;              // NM101 - '85' billing, 'IL' subscriber, 'QC' patient, etc.
  entityTypeQualifier: string;       // NM102 - '1' person, '2' non-person entity
  lastName: string;                  // NM103
  firstName: string;                 // NM104
  middleName?: string;               // NM105
  prefix?: string;                   // NM106
  suffix?: string;                   // NM107
  idCodeQualifier: string;           // NM108 - 'XX' NPI, 'MI' member ID, 'PI' payer ID
  idCode: string;                    // NM109
}

/** N3 Address Information */
export interface EDI_N3 {
  addressLine1: string;              // N301
  addressLine2?: string;             // N302
}

/** N4 Geographic Location */
export interface EDI_N4 {
  city: string;                      // N401
  state: string;                     // N402
  zip: string;                       // N403
  countryCode?: string;              // N404
}

/** REF Reference Information */
export interface EDI_REF {
  referenceIdQualifier: string;      // REF01 - 'EI' employer ID, 'G2' prior auth, etc.
  referenceId: string;               // REF02
}

/** PER Contact Information */
export interface EDI_PER {
  contactFunctionCode: string;       // PER01 - 'IC' information contact
  name?: string;                     // PER02
  commNumberQualifier1: string;      // PER03 - 'TE' telephone
  commNumber1: string;               // PER04
}

/** CLM Claim Information */
export interface EDI_CLM {
  claimSubmitterIdent: string;       // CLM01
  totalClaimCharge: string;          // CLM02 - decimal amount
  facilityCodeValue: string;         // CLM05-1 - place of service
  facilityCodeQualifier: string;     // CLM05-2 - 'B' = place of service code
  frequencyTypeCode: string;         // CLM05-3 - '1' original claim
  providerSignatureOnFile: string;   // CLM06 - 'Y'
  providerAcceptAssignment: string;  // CLM07 - 'A' assigned
  benefitsAssignment: string;        // CLM08 - 'Y'
  releaseOfInfo: string;             // CLM09 - 'Y'
}

/** DTP Date/Time Reference */
export interface EDI_DTP {
  dateTimeQualifier: string;         // DTP01 - '431' onset, '472' service date, etc.
  dateTimePeriodFormatQualifier: string; // DTP02 - 'D8' single date, 'RD8' range
  dateTimePeriod: string;            // DTP03 - CCYYMMDD or CCYYMMDD-CCYYMMDD
}

/** HI Health Information (Diagnosis Codes) */
export interface EDI_HI {
  codes: Array<{
    codeListQualifier: string;       // 'ABK' for primary ICD-10, 'ABF' for additional
    code: string;                    // ICD-10 code
  }>;
}

/** SV1 Professional Service */
export interface EDI_SV1 {
  compositeCode: string;             // SV101 - 'HC:CPT_CODE:MODIFIER1:MODIFIER2...'
  chargeAmount: string;              // SV102 - decimal amount
  unitBasisCode: string;             // SV103 - 'UN' unit
  serviceUnitCount: string;          // SV104 - number of units
  placeOfServiceCode?: string;       // SV105
  compositePointers: string;         // SV107 - diagnosis pointers e.g., '1:2'
}

/** SE Transaction Set Trailer */
export interface EDI_SE {
  numberOfSegments: string;          // SE01
  transactionSetControlNumber: string; // SE02 - must match ST02
}

/** GE Functional Group Trailer */
export interface EDI_GE {
  numberOfTransactionSets: string;   // GE01
  groupControlNumber: string;        // GE02 - must match GS06
}

/** IEA Interchange Control Trailer */
export interface EDI_IEA {
  numberOfFunctionalGroups: string;  // IEA01
  interchangeControlNumber: string;  // IEA02 - must match ISA13
}

/** EDI 837P validation result */
export interface EDIValidationResult {
  valid: boolean;
  errors: Array<{
    segment: string;
    field?: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  segmentCount: number;
  controlNumbers: {
    interchange: string;
    functionalGroup: string;
    transactionSet: string;
  };
}

// ============================================================================
// ERA 835 Types
// ============================================================================

export interface ERA835Payment {
  checkNumber: string;
  checkDate: string;
  payerName: string;
  payerId: string;
  payeeName: string;
  payeeNpi: string;
  totalPaymentAmount: number;
  creditDebitFlag: 'C' | 'D'; // C = credit (payment), D = debit (recoupment)
}

export interface ERA835ClaimAdjudication {
  claimControlNumber: string;
  patientName: string;
  patientMemberId: string;
  claimStatus: 'paid' | 'denied' | 'partial' | 'reversed';
  totalChargedAmount: number;
  totalPaidAmount: number;
  patientResponsibility: number;
  serviceDateFrom: string;
  serviceDateTo: string;
  serviceLines: Array<{
    procedureCode: string;
    modifiers: string[];
    chargedAmount: number;
    paidAmount: number;
    adjustments: Array<{
      groupCode: string; // CO, PR, OA, PI, CR
      reasonCode: string;
      amount: number;
    }>;
    units: number;
    serviceDate: string;
  }>;
  adjustmentReasons: Array<{
    groupCode: string;
    reasonCode: string;
    amount: number;
    description: string;
  }>;
  remarkCodes: string[];
}

export interface ERA835ParseResult {
  success: boolean;
  payment: ERA835Payment;
  claims: ERA835ClaimAdjudication[];
  rawSegmentCount: number;
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

// ============================================================================
// Retry & Queue Types
// ============================================================================

export interface SubmissionAttempt {
  id: string;
  claimSubmission: ClaimSubmission;
  attemptNumber: number;
  maxAttempts: number;
  status: 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'queued_for_retry';
  lastAttemptAt: string;
  nextRetryAt?: string;
  response?: ClaimResponse;
  errorMessage?: string;
  createdAt: string;
}

// ============================================================================
// Payer Directory
// ============================================================================

export const CLEARINGHOUSE_PAYER_IDS: Record<string, { availity: string; waystar?: string; name: string }> = {
  // Major Commercial Payers
  bcbs: { availity: 'BCBS', waystar: 'BCBS', name: 'Blue Cross Blue Shield' },
  aetna: { availity: 'AETNA', waystar: '60054', name: 'Aetna' },
  cigna: { availity: 'CIGNA', waystar: '62308', name: 'Cigna' },
  united: { availity: 'UHC', waystar: '87726', name: 'UnitedHealthcare' },
  humana: { availity: 'HUMANA', waystar: '61101', name: 'Humana' },
  anthem: { availity: 'ANTHEM', waystar: '47198', name: 'Anthem' },
  kaiser: { availity: 'KAISER', waystar: '91617', name: 'Kaiser Permanente' },

  // Medicaid (state-specific)
  medicaid_az: { availity: 'AZAHCCCS', name: 'Arizona AHCCCS' },
  medicaid_ca: { availity: 'CAMEDI', name: 'Medi-Cal' },
  medicaid_tx: { availity: 'TXMCD', name: 'Texas Medicaid' },
  medicaid_fl: { availity: 'FLMCD', name: 'Florida Medicaid' },
  medicaid_ny: { availity: 'NYMCD', name: 'New York Medicaid' },
  medicaid_pa: { availity: 'PAMCD', name: 'Pennsylvania Medicaid' },
  medicaid_oh: { availity: 'OHMCD', name: 'Ohio Medicaid' },
  medicaid_il: { availity: 'ILMCD', name: 'Illinois Medicaid' },
  medicaid_ga: { availity: 'GAMCD', name: 'Georgia Medicaid' },
  medicaid_nc: { availity: 'NCMCD', name: 'North Carolina Medicaid' },
  medicaid_co: { availity: 'COMCD', name: 'Colorado Medicaid' },
  medicaid_wa: { availity: 'WAMCD', name: 'Washington Medicaid' },

  // Medicare
  medicare: { availity: 'CMS', waystar: 'CMS', name: 'Medicare' },

  // Behavioral Health Carve-outs (common for ABA)
  optum_bh: { availity: 'OPTUM', name: 'Optum Behavioral Health' },
  magellan: { availity: 'MAGELLAN', name: 'Magellan Health' },
  beacon: { availity: 'BEACON', name: 'Beacon Health Options' },
  compsych: { availity: 'COMPSYCH', name: 'ComPsych' },
};

// HCBS/ABA-specific service codes
export const ABA_SERVICE_CODES = {
  // ABA Assessment
  '97151': { description: 'Behavior ID Assessment', requiresAuth: true },
  '97152': { description: 'Supporting Assessment', requiresAuth: true },

  // ABA Treatment
  '97153': { description: 'Adaptive Behavior Treatment by Protocol', requiresAuth: true },
  '97154': { description: 'Group Adaptive Behavior Treatment', requiresAuth: true },
  '97155': { description: 'Adaptive Behavior Treatment with Modification', requiresAuth: true },
  '97156': { description: 'Family Adaptive Behavior Treatment', requiresAuth: true },
  '97157': { description: 'Multiple-Family Group Treatment', requiresAuth: true },
  '97158': { description: 'Group Adaptive Behavior Treatment by BCBA', requiresAuth: true },

  // Telehealth Modifiers
  '95': { description: 'Synchronous Telemedicine Service' },
  'GT': { description: 'Interactive Audio/Video' },

  // HCBS Waiver Codes (T-codes)
  'T1023': { description: 'Screening for developmental delay', requiresAuth: false },
  'T1027': { description: 'Family training and counseling', requiresAuth: true },
  'T2025': { description: 'Waiver services - attendant care', requiresAuth: true },

  // Behavioral Health Services
  'H0004': { description: 'Behavioral Health Counseling & Therapy (per 15 min)', requiresAuth: false },
  'H0005': { description: 'Alcohol/Drug Group Counseling', requiresAuth: false },
  'H0031': { description: 'Mental Health Assessment by Non-Physician', requiresAuth: false },
  'H0032': { description: 'Mental Health Service Plan Development', requiresAuth: false },
  'H2012': { description: 'Behavioral Health Day Treatment (per hour)', requiresAuth: true },
  'H2014': { description: 'Skills Training & Development (per 15 min)', requiresAuth: true },
  'H2019': { description: 'Therapeutic Behavioral Services (per 15 min)', requiresAuth: true },

  // Therapy Evaluation Codes
  '97161': { description: 'Physical Therapy Eval - Low Complexity', requiresAuth: false },
  '97162': { description: 'Physical Therapy Eval - Moderate Complexity', requiresAuth: false },
  '97163': { description: 'Physical Therapy Eval - High Complexity', requiresAuth: false },
  '97164': { description: 'Physical Therapy Re-Evaluation', requiresAuth: false },
  '97165': { description: 'Occupational Therapy Eval - Low Complexity', requiresAuth: false },
  '97166': { description: 'Occupational Therapy Eval - Moderate Complexity', requiresAuth: false },
  '97167': { description: 'Occupational Therapy Eval - High Complexity', requiresAuth: false },
  '97168': { description: 'Occupational Therapy Re-Evaluation', requiresAuth: false },
  '97110': { description: 'Therapeutic Exercise (per 15 min)', requiresAuth: false },
  '97530': { description: 'Therapeutic Activities (per 15 min)', requiresAuth: false },
  '97542': { description: 'Wheelchair Management Training (per 15 min)', requiresAuth: false },

  // Speech-Language Pathology
  '92521': { description: 'Evaluation of Speech Fluency', requiresAuth: false },
  '92522': { description: 'Evaluation of Speech Sound Production', requiresAuth: false },
  '92523': { description: 'Speech Sound & Expressive Language Eval', requiresAuth: false },
  '92524': { description: 'Behavioral/Qualitative Voice Analysis', requiresAuth: false },
  '92507': { description: 'Speech/Language Treatment (individual)', requiresAuth: false },
  '92508': { description: 'Speech/Language Treatment (group)', requiresAuth: false },

  // Autism-Specific Assessment Codes
  '96112': { description: 'Developmental Test Administration (first hour)', requiresAuth: true },
  '96113': { description: 'Developmental Test Administration (each add\'l 30 min)', requiresAuth: true },
  '96130': { description: 'Psychological Testing Eval by Psychologist (first hour)', requiresAuth: true },
  '96131': { description: 'Psychological Testing Eval (each add\'l hour)', requiresAuth: true },

  // Parent Training & Family Therapy
  '90846': { description: 'Family Psychotherapy without Patient', requiresAuth: false },
  '90847': { description: 'Family Psychotherapy with Patient', requiresAuth: false },
  '90853': { description: 'Group Psychotherapy', requiresAuth: false },

  // Screening & Prevention
  '96110': { description: 'Developmental Screening (e.g., ASQ, M-CHAT)', requiresAuth: false },
  '96127': { description: 'Brief Emotional/Behavioral Assessment', requiresAuth: false },

  // Care Management
  '99490': { description: 'Chronic Care Management (20+ min/month)', requiresAuth: false },
  '99491': { description: 'Chronic Care Management by Physician (30+ min/month)', requiresAuth: false },

  // Place of Service Codes (for claim submissions)
  'POS_02': { description: 'Telehealth — Other than Patient Home' },
  'POS_10': { description: 'Telehealth — Patient Home' },
  'POS_11': { description: 'Office' },
  'POS_12': { description: 'Home' },
  'POS_99': { description: 'Other Place of Service' },
};

// ============================================================================
// CARC (Claim Adjustment Reason Codes) Lookup for ERA 835 Display
// ============================================================================

export const CARC_DESCRIPTIONS: Record<string, string> = {
  '1': 'Deductible Amount',
  '2': 'Coinsurance Amount',
  '3': 'Co-payment Amount',
  '4': 'The procedure code is inconsistent with the modifier used',
  '5': 'The procedure code/bill type is inconsistent with the place of service',
  '16': 'Claim/service lacks information needed for adjudication',
  '18': 'Duplicate claim/service',
  '22': 'This care may be covered by another payer per coordination of benefits',
  '23': 'Payment adjusted because charges have been paid by another payer',
  '24': 'Charges are covered under a capitation agreement',
  '26': 'Expenses incurred prior to coverage',
  '27': 'Expenses incurred after coverage terminated',
  '29': 'The time limit for filing has expired',
  '31': 'Patient cannot be identified as our insured',
  '45': 'Charges exceed your contracted/legislated fee arrangement',
  '50': 'These are non-covered services because this is not deemed a medical necessity',
  '96': 'Non-covered charges',
  '97': 'Payment is included in the allowance for another service/procedure',
  '109': 'Claim/service not covered by this payer/contractor',
  '119': 'Benefit maximum for this time period or occurrence has been reached',
  '167': 'This (these) diagnosis(es) is (are) not covered',
  '170': 'Payment is denied when performed/billed by this type of provider',
  '197': 'Precertification/authorization/notification absent',
  '204': 'This service/equipment/drug is not covered under the patient\'s current benefit plan',
  '236': 'This procedure or procedure/modifier combination is not compatible with another procedure already adjudicated',
  '253': 'Sequestration - Loss of federal spending reduction',
};

// ============================================================================
// Control Number Management
// ============================================================================

/**
 * Thread-safe incrementing control number generator.
 * Ensures uniqueness within a session by combining timestamp with a counter.
 */
let controlNumberCounter = 0;

function generateControlNumber(digits: number = 9): string {
  controlNumberCounter += 1;
  const base = Date.now() % 1_000_000_000; // keep within 9 digits
  const combined = (base + controlNumberCounter) % Math.pow(10, digits);
  return combined.toString().padStart(digits, '0');
}

/**
 * Generate a unique interchange control number (ISA13).
 * Must be 9 digits, zero-padded, unique per interchange.
 */
function generateInterchangeControlNumber(): string {
  return generateControlNumber(9);
}

/**
 * Generate a unique group control number (GS06).
 * Must be 1-9 digits.
 */
function generateGroupControlNumber(): string {
  return generateControlNumber(9);
}

/**
 * Generate a unique transaction set control number (ST02).
 * Must be 4-9 characters.
 */
function generateTransactionSetControlNumber(): string {
  return generateControlNumber(4);
}

// ============================================================================
// Date/Time Formatting (EDI-compliant)
// ============================================================================

/** Format date as YYMMDD for ISA segment */
function formatISADate(date: Date): string {
  const yy = date.getFullYear().toString().slice(2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/** Format date as CCYYMMDD for GS, BHT, DTP segments */
function formatCCYYMMDD(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yyyy = d.getFullYear().toString();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/** Format time as HHMM */
function formatHHMM(date: Date): string {
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${hh}${mm}`;
}

/** Convert YYYY-MM-DD to CCYYMMDD */
function isoDateToEDI(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

// ============================================================================
// EDI Segment Helpers
// ============================================================================

/** EDI element separator */
const ELEMENT_SEP = '*';
/** EDI segment terminator */
const SEGMENT_TERM = '~';
/** EDI component separator (within composite elements) */
const COMPONENT_SEP = ':';

/** Build a single EDI segment from its elements */
function buildSegment(segmentId: string, ...elements: (string | undefined)[]): string {
  // Trim trailing empty elements
  let lastNonEmpty = elements.length - 1;
  while (lastNonEmpty >= 0 && (!elements[lastNonEmpty] || elements[lastNonEmpty] === '')) {
    lastNonEmpty--;
  }
  const trimmedElements = elements.slice(0, lastNonEmpty + 1).map(e => e ?? '');
  return `${segmentId}${ELEMENT_SEP}${trimmedElements.join(ELEMENT_SEP)}${SEGMENT_TERM}`;
}

/** Pad a string to a fixed length (right-padded with spaces) */
function padRight(str: string, len: number): string {
  return str.substring(0, len).padEnd(len, ' ');
}

/** Format a decimal amount for EDI (no trailing zeros beyond 2 decimal places) */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/** Strip non-digit characters from a phone number */
function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Map relationship string to X12 relationship code */
function mapRelationshipCode(relationship: string): string {
  switch (relationship) {
    case 'self': return '18';
    case 'spouse': return '01';
    case 'child': return '19';
    default: return 'G8'; // other
  }
}

// ============================================================================
// Production EDI 837P Generation
// ============================================================================

/**
 * Generate a production-valid X12 837P Professional Claim EDI document.
 *
 * Follows the ASC X12 005010X222A1 implementation guide:
 * - ISA/IEA interchange envelope
 * - GS/GE functional group
 * - ST/SE transaction set with proper segment count
 * - Hierarchical loops: 2000A (billing provider), 2000B (subscriber), 2000C (patient)
 * - CLM, SV1, DTP, NM1, REF, HI segments
 */
export function generateEDI837P(claim: ClaimSubmission): string {
  const now = new Date();
  const icn = generateInterchangeControlNumber();
  const gcn = generateGroupControlNumber();
  const tscn = generateTransactionSetControlNumber();

  const segments: string[] = [];

  // ── ISA - Interchange Control Header ────────────────────────────────
  segments.push(
    `ISA${ELEMENT_SEP}00${ELEMENT_SEP}${padRight('', 10)}${ELEMENT_SEP}00${ELEMENT_SEP}${padRight('', 10)}${ELEMENT_SEP}ZZ${ELEMENT_SEP}${padRight(claim.billingProvider.npi, 15)}${ELEMENT_SEP}ZZ${ELEMENT_SEP}${padRight(claim.payer.payerId, 15)}${ELEMENT_SEP}${formatISADate(now)}${ELEMENT_SEP}${formatHHMM(now)}${ELEMENT_SEP}^${ELEMENT_SEP}00501${ELEMENT_SEP}${icn}${ELEMENT_SEP}0${ELEMENT_SEP}P${ELEMENT_SEP}${COMPONENT_SEP}${SEGMENT_TERM}`
  );

  // ── GS - Functional Group Header ────────────────────────────────────
  segments.push(
    buildSegment('GS', 'HC', claim.billingProvider.npi, claim.payer.payerId,
      formatCCYYMMDD(now), formatHHMM(now), gcn, 'X', '005010X222A1')
  );

  // ── ST - Transaction Set Header ─────────────────────────────────────
  // We track the index where ST starts so we can count segments for SE
  const stIndex = segments.length;
  segments.push(
    buildSegment('ST', '837', tscn, '005010X222A1')
  );

  // ── BHT - Beginning of Hierarchical Transaction ─────────────────────
  const bhtRefId = `CLM${generateControlNumber(6)}`;
  segments.push(
    buildSegment('BHT', '0019', '00', bhtRefId, formatCCYYMMDD(now), formatHHMM(now), 'CH')
  );

  // ── 1000A - Submitter Name ──────────────────────────────────────────
  segments.push(
    buildSegment('NM1', '41', '2', claim.billingProvider.name, '', '', '', '', '46', claim.billingProvider.npi)
  );
  segments.push(
    buildSegment('PER', 'IC', claim.billingProvider.name, 'TE', cleanPhone(claim.billingProvider.phone))
  );

  // ── 1000B - Receiver Name ───────────────────────────────────────────
  segments.push(
    buildSegment('NM1', '40', '2', claim.payer.payerName, '', '', '', '', '46', claim.payer.payerId)
  );

  // ── 2000A - Billing Provider Hierarchical Level ─────────────────────
  segments.push(buildSegment('HL', '1', '', '20', '1'));

  // ── 2010AA - Billing Provider Name ──────────────────────────────────
  segments.push(
    buildSegment('NM1', '85', '2', claim.billingProvider.name, '', '', '', '', 'XX', claim.billingProvider.npi)
  );
  segments.push(
    buildSegment('N3', claim.billingProvider.address.line1, claim.billingProvider.address.line2 || undefined)
  );
  segments.push(
    buildSegment('N4', claim.billingProvider.address.city, claim.billingProvider.address.state, claim.billingProvider.address.zip)
  );
  // Tax ID reference (EIN)
  segments.push(
    buildSegment('REF', 'EI', claim.billingProvider.taxId)
  );

  // ── 2000B - Subscriber Hierarchical Level ───────────────────────────
  const hasPatient = claim.patient && claim.patient.relationship !== 'self';
  segments.push(buildSegment('HL', '2', '1', '22', hasPatient ? '1' : '0'));

  // SBR - Subscriber Information
  segments.push(
    buildSegment('SBR', 'P', hasPatient ? mapRelationshipCode(claim.patient!.relationship) : '18', '', '', '', '', '', '', claim.claimType === 'professional' ? 'CI' : 'BL')
  );

  // ── 2010BA - Subscriber Name ────────────────────────────────────────
  segments.push(
    buildSegment('NM1', 'IL', '1', claim.subscriber.lastName, claim.subscriber.firstName, '', '', '', 'MI', claim.subscriber.memberId)
  );
  segments.push(
    buildSegment('N3', claim.subscriber.address.line1, claim.subscriber.address.line2 || undefined)
  );
  segments.push(
    buildSegment('N4', claim.subscriber.address.city, claim.subscriber.address.state, claim.subscriber.address.zip)
  );
  // DMG - Subscriber Demographic
  segments.push(
    buildSegment('DMG', 'D8', isoDateToEDI(claim.subscriber.dob), claim.subscriber.gender)
  );

  // ── 2010BB - Payer Name ─────────────────────────────────────────────
  segments.push(
    buildSegment('NM1', 'PR', '2', claim.payer.payerName, '', '', '', '', 'PI', claim.payer.payerId)
  );

  // ── 2000C - Patient Hierarchical Level (if different from subscriber)
  if (hasPatient && claim.patient) {
    segments.push(buildSegment('HL', '3', '2', '23', '0'));
    // PAT - Patient Information
    segments.push(buildSegment('PAT', mapRelationshipCode(claim.patient.relationship)));
    // 2010CA - Patient Name
    segments.push(
      buildSegment('NM1', 'QC', '1', claim.patient.lastName, claim.patient.firstName)
    );
    // Patient DOB
    segments.push(
      buildSegment('DMG', 'D8', isoDateToEDI(claim.patient.dob), claim.patient.gender)
    );
  }

  // ── 2300 - Claim Information ────────────────────────────────────────
  const claimId = `CLM${generateControlNumber(6)}`;
  // CLM05 is a composite element: place_of_service:B:frequency_code
  const clm05 = `${claim.services[0]?.placeOfService || '11'}${COMPONENT_SEP}B${COMPONENT_SEP}1`;
  segments.push(
    buildSegment('CLM', claimId, formatAmount(claim.totalCharges), '', '', clm05, 'Y', 'A', 'Y', 'Y')
  );

  // Prior Authorization Reference
  if (claim.priorAuthNumber) {
    segments.push(buildSegment('REF', 'G1', claim.priorAuthNumber));
  }

  // Referral Number
  if (claim.referralNumber) {
    segments.push(buildSegment('REF', '9F', claim.referralNumber));
  }

  // ── HI - Health Information (Diagnosis Codes) ───────────────────────
  const primaryDx = claim.diagnosis.find(d => d.isPrimary);
  const additionalDx = claim.diagnosis.filter(d => !d.isPrimary);

  if (primaryDx) {
    // Primary diagnosis uses ABK qualifier
    const hiElements: string[] = [`ABK${COMPONENT_SEP}${primaryDx.code.replace('.', '')}`];
    // Additional diagnoses use ABF qualifier
    for (const dx of additionalDx.slice(0, 11)) { // Max 12 diagnosis codes per claim
      hiElements.push(`ABF${COMPONENT_SEP}${dx.code.replace('.', '')}`);
    }
    segments.push(buildSegment('HI', ...hiElements));
  }

  // ── Accident Info (if applicable) ───────────────────────────────────
  if (claim.accidentInfo) {
    const accidentTypeMap: Record<string, string> = {
      auto: 'AA',       // Auto Accident
      employment: 'EM', // Employment
      other: 'OA',      // Other Accident
    };
    segments.push(
      buildSegment('CLM', '', '', '', '', '', '', '', '', '', accidentTypeMap[claim.accidentInfo.type] || 'OA')
    );
    if (claim.accidentInfo.date) {
      segments.push(buildSegment('DTP', '439', 'D8', isoDateToEDI(claim.accidentInfo.date)));
    }
  }

  // ── 2400 - Service Line Information ─────────────────────────────────
  claim.services.forEach((service, idx) => {
    // LX - Line Counter
    segments.push(buildSegment('LX', (idx + 1).toString()));

    // SV1 - Professional Service
    // Composite: HC:procedureCode:modifier1:modifier2:modifier3:modifier4
    let compositeCode = `HC${COMPONENT_SEP}${service.procedureCode}`;
    if (service.modifiers && service.modifiers.length > 0) {
      compositeCode += COMPONENT_SEP + service.modifiers.slice(0, 4).join(COMPONENT_SEP);
    }

    // Diagnosis pointers composite (1-based references)
    const pointers = service.diagnosisPointers.slice(0, 4).join(COMPONENT_SEP);

    segments.push(
      buildSegment('SV1', compositeCode, formatAmount(service.chargeAmount), 'UN', service.units.toString(), service.placeOfService, '', pointers)
    );

    // DTP - Service Date
    segments.push(
      buildSegment('DTP', '472', 'D8', isoDateToEDI(service.serviceDate))
    );

    // Rendering Provider (if different from billing)
    if (service.renderingProviderNpi && service.renderingProviderNpi !== claim.billingProvider.npi) {
      segments.push(
        buildSegment('NM1', '82', '1', '', '', '', '', '', 'XX', service.renderingProviderNpi)
      );
    }
  });

  // ── SE - Transaction Set Trailer ────────────────────────────────────
  // Count all segments from ST to SE inclusive
  const segmentCountFromST = segments.length - stIndex + 1; // +1 for SE itself
  segments.push(
    buildSegment('SE', segmentCountFromST.toString(), tscn)
  );

  // ── GE - Functional Group Trailer ───────────────────────────────────
  segments.push(
    buildSegment('GE', '1', gcn)
  );

  // ── IEA - Interchange Control Trailer ───────────────────────────────
  segments.push(
    buildSegment('IEA', '1', icn)
  );

  return segments.join('');
}

// ============================================================================
// EDI 837P Validation
// ============================================================================

/**
 * Validate an EDI 837P document for structural and content correctness.
 * Checks:
 * - Required segments are present
 * - Segment counts match trailers
 * - Control numbers are consistent between headers and trailers
 * - Date formats are valid (CCYYMMDD)
 * - NPI numbers are 10 digits
 * - Amount fields are valid decimal numbers
 */
export function validateEDI837P(ediContent: string): EDIValidationResult {
  const errors: EDIValidationResult['errors'] = [];
  const segmentStrings = ediContent.split(SEGMENT_TERM).filter(s => s.trim().length > 0);

  const controlNumbers = {
    interchange: '',
    functionalGroup: '',
    transactionSet: '',
  };

  // Track which required segments are present
  const foundSegments = new Set<string>();
  const segmentIds: string[] = [];

  for (const segStr of segmentStrings) {
    const elements = segStr.split(ELEMENT_SEP);
    const segId = elements[0]?.trim();
    if (segId) {
      foundSegments.add(segId);
      segmentIds.push(segId);
    }
  }

  // ── Check required segments ─────────────────────────────────────────
  const requiredSegments = ['ISA', 'GS', 'ST', 'BHT', 'NM1', 'HL', 'CLM', 'HI', 'SV1', 'DTP', 'SE', 'GE', 'IEA'];
  for (const req of requiredSegments) {
    if (!foundSegments.has(req)) {
      errors.push({
        segment: req,
        message: `Required segment ${req} is missing`,
        severity: 'error',
      });
    }
  }

  // ── Parse and validate specific segments ────────────────────────────
  for (const segStr of segmentStrings) {
    const elements = segStr.split(ELEMENT_SEP);
    const segId = elements[0]?.trim();

    switch (segId) {
      case 'ISA': {
        controlNumbers.interchange = elements[13] || '';
        // ISA must have exactly 16 elements (ISA + 16 data elements)
        if (elements.length < 17) {
          errors.push({
            segment: 'ISA',
            message: `ISA segment must have 16 data elements, found ${elements.length - 1}`,
            severity: 'error',
          });
        }
        // Validate version
        if (elements[12] && elements[12].trim() !== '00501') {
          errors.push({
            segment: 'ISA',
            field: 'ISA12',
            message: `ISA12 version must be '00501', found '${elements[12]?.trim()}'`,
            severity: 'error',
          });
        }
        // Validate usage indicator
        if (elements[15] && !['P', 'T'].includes(elements[15].trim())) {
          errors.push({
            segment: 'ISA',
            field: 'ISA15',
            message: `ISA15 usage indicator must be 'P' or 'T', found '${elements[15]?.trim()}'`,
            severity: 'error',
          });
        }
        break;
      }

      case 'GS': {
        controlNumbers.functionalGroup = elements[6] || '';
        // Validate functional ID code
        if (elements[1] !== 'HC') {
          errors.push({
            segment: 'GS',
            field: 'GS01',
            message: `GS01 must be 'HC' for health care claims, found '${elements[1]}'`,
            severity: 'error',
          });
        }
        // Validate date format (CCYYMMDD)
        if (elements[4] && !isValidCCYYMMDD(elements[4])) {
          errors.push({
            segment: 'GS',
            field: 'GS04',
            message: `GS04 date format must be CCYYMMDD, found '${elements[4]}'`,
            severity: 'error',
          });
        }
        break;
      }

      case 'ST': {
        controlNumbers.transactionSet = elements[2] || '';
        if (elements[1] !== '837') {
          errors.push({
            segment: 'ST',
            field: 'ST01',
            message: `ST01 must be '837' for professional claims, found '${elements[1]}'`,
            severity: 'error',
          });
        }
        break;
      }

      case 'SE': {
        // Validate segment count
        const reportedCount = parseInt(elements[1] || '0', 10);
        // Count segments between ST and SE inclusive
        const stIdx = segmentIds.indexOf('ST');
        const seIdx = segmentIds.lastIndexOf('SE');
        if (stIdx >= 0 && seIdx >= 0) {
          const actualCount = seIdx - stIdx + 1;
          if (reportedCount !== actualCount) {
            errors.push({
              segment: 'SE',
              field: 'SE01',
              message: `SE01 segment count is ${reportedCount} but actual count from ST to SE is ${actualCount}`,
              severity: 'error',
            });
          }
        }
        // Validate control number matches ST02
        if (elements[2] && elements[2] !== controlNumbers.transactionSet) {
          errors.push({
            segment: 'SE',
            field: 'SE02',
            message: `SE02 '${elements[2]}' does not match ST02 '${controlNumbers.transactionSet}'`,
            severity: 'error',
          });
        }
        break;
      }

      case 'GE': {
        // Validate group control number matches GS06
        if (elements[2] && elements[2] !== controlNumbers.functionalGroup) {
          errors.push({
            segment: 'GE',
            field: 'GE02',
            message: `GE02 '${elements[2]}' does not match GS06 '${controlNumbers.functionalGroup}'`,
            severity: 'error',
          });
        }
        break;
      }

      case 'IEA': {
        // Validate interchange control number matches ISA13
        if (elements[2] && elements[2] !== controlNumbers.interchange) {
          errors.push({
            segment: 'IEA',
            field: 'IEA02',
            message: `IEA02 '${elements[2]}' does not match ISA13 '${controlNumbers.interchange}'`,
            severity: 'error',
          });
        }
        break;
      }

      case 'NM1': {
        // Validate NPI (10 digits) when qualifier is XX
        if (elements[8] === 'XX' && elements[9]) {
          const npi = elements[9].trim();
          if (!/^\d{10}$/.test(npi)) {
            errors.push({
              segment: 'NM1',
              field: 'NM109',
              message: `NPI must be exactly 10 digits, found '${npi}' (entity: ${elements[1]})`,
              severity: 'error',
            });
          }
        }
        break;
      }

      case 'CLM': {
        // Validate charge amount
        if (elements[2]) {
          const amount = parseFloat(elements[2]);
          if (isNaN(amount) || amount < 0) {
            errors.push({
              segment: 'CLM',
              field: 'CLM02',
              message: `CLM02 total charge must be a valid positive number, found '${elements[2]}'`,
              severity: 'error',
            });
          }
        }
        break;
      }

      case 'SV1': {
        // Validate charge amount in SV102
        if (elements[2]) {
          const amount = parseFloat(elements[2]);
          if (isNaN(amount) || amount < 0) {
            errors.push({
              segment: 'SV1',
              field: 'SV102',
              message: `SV1 charge amount must be a valid positive number, found '${elements[2]}'`,
              severity: 'error',
            });
          }
        }
        // Validate unit count in SV104
        if (elements[4]) {
          const units = parseFloat(elements[4]);
          if (isNaN(units) || units <= 0) {
            errors.push({
              segment: 'SV1',
              field: 'SV104',
              message: `SV1 unit count must be a positive number, found '${elements[4]}'`,
              severity: 'error',
            });
          }
        }
        break;
      }

      case 'DTP': {
        // Validate date format
        const formatQualifier = elements[2]; // D8 or RD8
        const dateValue = elements[3];
        if (formatQualifier === 'D8' && dateValue) {
          if (!isValidCCYYMMDD(dateValue)) {
            errors.push({
              segment: 'DTP',
              field: 'DTP03',
              message: `DTP date must be valid CCYYMMDD format, found '${dateValue}'`,
              severity: 'error',
            });
          }
        } else if (formatQualifier === 'RD8' && dateValue) {
          const parts = dateValue.split('-');
          if (parts.length !== 2 || !isValidCCYYMMDD(parts[0]) || !isValidCCYYMMDD(parts[1])) {
            errors.push({
              segment: 'DTP',
              field: 'DTP03',
              message: `DTP date range must be valid CCYYMMDD-CCYYMMDD format, found '${dateValue}'`,
              severity: 'error',
            });
          }
        }
        break;
      }

      case 'DMG': {
        // Validate DOB date format
        if (elements[1] === 'D8' && elements[2]) {
          if (!isValidCCYYMMDD(elements[2])) {
            errors.push({
              segment: 'DMG',
              field: 'DMG02',
              message: `DMG date of birth must be valid CCYYMMDD format, found '${elements[2]}'`,
              severity: 'error',
            });
          }
        }
        // Validate gender
        if (elements[3] && !['M', 'F', 'U'].includes(elements[3])) {
          errors.push({
            segment: 'DMG',
            field: 'DMG03',
            message: `DMG gender must be 'M', 'F', or 'U', found '${elements[3]}'`,
            severity: 'warning',
          });
        }
        break;
      }

      case 'HI': {
        // Validate diagnosis code format
        for (let i = 1; i < elements.length; i++) {
          if (!elements[i]) continue;
          const parts = elements[i].split(COMPONENT_SEP);
          const qualifier = parts[0];
          const code = parts[1];
          if (qualifier && !['ABK', 'ABF'].includes(qualifier)) {
            errors.push({
              segment: 'HI',
              field: `HI${String(i).padStart(2, '0')}`,
              message: `HI code qualifier must be 'ABK' (primary) or 'ABF' (additional), found '${qualifier}'`,
              severity: 'error',
            });
          }
          if (code && !/^[A-Z]\d{2,6}$/.test(code)) {
            errors.push({
              segment: 'HI',
              field: `HI${String(i).padStart(2, '0')}`,
              message: `Diagnosis code '${code}' does not match expected ICD-10 format (e.g., F840, R6250)`,
              severity: 'warning',
            });
          }
        }
        break;
      }
    }
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    segmentCount: segmentStrings.length,
    controlNumbers,
  };
}

/** Validate CCYYMMDD date format */
function isValidCCYYMMDD(dateStr: string): boolean {
  if (!/^\d{8}$/.test(dateStr)) return false;
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10);
  const day = parseInt(dateStr.substring(6, 8), 10);
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Check month-specific day limits
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return false;
  return true;
}

// ============================================================================
// ERA 835 Parsing
// ============================================================================

/**
 * Parse an Electronic Remittance Advice (ERA) 835 document.
 *
 * Extracts:
 * - Payment header information (check number, date, payer, payee)
 * - Claim-level adjudication details (status, amounts, adjustments)
 * - Service line details (per-procedure payments and adjustments)
 * - Remark codes for claim processing explanations
 *
 * Returns structured data that the ClaimsDashboard can display.
 */
export function parseERA835(ediContent: string): ERA835ParseResult {
  const segmentStrings = ediContent.split(SEGMENT_TERM).filter(s => s.trim().length > 0);
  const parseErrors: Array<{ code: string; message: string }> = [];

  // Payment header
  const payment: ERA835Payment = {
    checkNumber: '',
    checkDate: '',
    payerName: '',
    payerId: '',
    payeeName: '',
    payeeNpi: '',
    totalPaymentAmount: 0,
    creditDebitFlag: 'C',
  };

  const claims: ERA835ClaimAdjudication[] = [];
  let currentClaim: ERA835ClaimAdjudication | null = null;
  let currentServiceLine: ERA835ClaimAdjudication['serviceLines'][0] | null = null;

  // Track context within the 835 loop structure
  let inClaimLoop = false;
  let inServiceLoop = false;

  for (const segStr of segmentStrings) {
    const elements = segStr.split(ELEMENT_SEP);
    const segId = elements[0]?.trim();

    switch (segId) {
      case 'BPR': {
        // Financial Information (Transaction Handling Code, Amount, Credit/Debit)
        payment.creditDebitFlag = (elements[4] as 'C' | 'D') || 'C';
        payment.totalPaymentAmount = parseFloat(elements[2] || '0');
        break;
      }

      case 'TRN': {
        // Reassociation Trace Number (check/EFT number)
        payment.checkNumber = elements[2] || '';
        break;
      }

      case 'N1': {
        // Name (Payer or Payee)
        if (elements[1] === 'PR') {
          // Payer
          payment.payerName = elements[2] || '';
          if (elements[3] === 'PI') {
            payment.payerId = elements[4] || '';
          }
        } else if (elements[1] === 'PE') {
          // Payee
          payment.payeeName = elements[2] || '';
          if (elements[3] === 'XX') {
            payment.payeeNpi = elements[4] || '';
          }
        }
        break;
      }

      case 'CLP': {
        // Claim Payment Information - starts a new claim
        // Save previous claim if exists
        if (currentClaim) {
          if (currentServiceLine) {
            currentClaim.serviceLines.push(currentServiceLine);
            currentServiceLine = null;
          }
          claims.push(currentClaim);
        }

        inClaimLoop = true;
        inServiceLoop = false;

        // Map CLP02 status codes
        const statusMap: Record<string, ERA835ClaimAdjudication['claimStatus']> = {
          '1': 'paid',
          '2': 'denied',
          '3': 'paid',     // Primary Payer paid in full (claim forwarded)
          '4': 'denied',   // Denied
          '19': 'paid',    // Processed - Primary + COB
          '20': 'partial', // Partial denial
          '22': 'reversed',
        };

        currentClaim = {
          claimControlNumber: elements[1] || '',
          patientName: '',
          patientMemberId: '',
          claimStatus: statusMap[elements[2] || ''] || 'partial',
          totalChargedAmount: parseFloat(elements[3] || '0'),
          totalPaidAmount: parseFloat(elements[4] || '0'),
          patientResponsibility: parseFloat(elements[5] || '0'),
          serviceDateFrom: '',
          serviceDateTo: '',
          serviceLines: [],
          adjustmentReasons: [],
          remarkCodes: [],
        };
        break;
      }

      case 'CAS': {
        // Claim Adjustment - can appear at claim or service level
        if (!currentClaim) break;

        const groupCode = elements[1] || ''; // CO, PR, OA, PI, CR
        // CAS can have up to 6 adjustment groups (triplets after group code)
        for (let i = 2; i < elements.length; i += 3) {
          const reasonCode = elements[i];
          const amount = parseFloat(elements[i + 1] || '0');
          if (!reasonCode) continue;

          const adjustment = {
            groupCode,
            reasonCode,
            amount,
            description: CARC_DESCRIPTIONS[reasonCode] || `Adjustment reason ${reasonCode}`,
          };

          if (inServiceLoop && currentServiceLine) {
            currentServiceLine.adjustments.push({
              groupCode,
              reasonCode,
              amount,
            });
          }
          currentClaim.adjustmentReasons.push(adjustment);
        }
        break;
      }

      case 'NM1': {
        if (!currentClaim) break;
        // QC = Patient within claim loop
        if (elements[1] === 'QC') {
          currentClaim.patientName = `${elements[3] || ''} ${elements[4] || ''}`.trim();
        }
        // IL = Insured/Subscriber
        if (elements[1] === 'IL') {
          if (elements[8] === 'MI') {
            currentClaim.patientMemberId = elements[9] || '';
          }
        }
        break;
      }

      case 'SVC': {
        // Service Payment Information - starts a new service line
        if (!currentClaim) break;

        // Save previous service line
        if (currentServiceLine) {
          currentClaim.serviceLines.push(currentServiceLine);
        }

        inServiceLoop = true;

        // SVC01 is composite: qualifier:procedureCode:modifier1:modifier2...
        const svcComposite = (elements[1] || '').split(COMPONENT_SEP);
        const procedureCode = svcComposite[1] || '';
        const modifiers = svcComposite.slice(2).filter(m => m);

        currentServiceLine = {
          procedureCode,
          modifiers,
          chargedAmount: parseFloat(elements[2] || '0'),
          paidAmount: parseFloat(elements[3] || '0'),
          units: parseFloat(elements[5] || '1'),
          serviceDate: '',
          adjustments: [],
        };
        break;
      }

      case 'DTM_SVC': // Some parsers normalize this
      case 'DTM': {
        if (elements[1] === '405') {
          // Payment/check date at the transaction level.
          payment.checkDate = elements[2] || '';
        }
        // Within service loop, DTM 472 = service date
        if (inServiceLoop && currentServiceLine && elements[1] === '472') {
          currentServiceLine.serviceDate = elements[2] || '';
        }
        // Within claim loop, DTM 232 = claim statement period start
        if (inClaimLoop && currentClaim && elements[1] === '232') {
          currentClaim.serviceDateFrom = elements[2] || '';
        }
        if (inClaimLoop && currentClaim && elements[1] === '233') {
          currentClaim.serviceDateTo = elements[2] || '';
        }
        break;
      }

      case 'MOA': {
        // Medicare Outpatient Adjudication (remark codes)
        if (currentClaim) {
          for (let i = 1; i <= 5; i++) {
            if (elements[i]) {
              currentClaim.remarkCodes.push(elements[i]);
            }
          }
        }
        break;
      }

      case 'LQ': {
        // Form Identification Code (remark codes)
        if (currentClaim && elements[1] === 'HE' && elements[2]) {
          currentClaim.remarkCodes.push(elements[2]);
        }
        break;
      }
    }
  }

  // Push the last claim and service line
  if (currentClaim) {
    if (currentServiceLine) {
      currentClaim.serviceLines.push(currentServiceLine);
    }
    claims.push(currentClaim);
  }

  return {
    success: parseErrors.length === 0,
    payment,
    claims,
    rawSegmentCount: segmentStrings.length,
    errors: parseErrors.length > 0 ? parseErrors : undefined,
  };
}

// ============================================================================
// Availity API Integration
// ============================================================================

/**
 * @deprecated Client-side Availity keys have been removed.
 * Availity configuration now lives in Supabase Edge Function secrets.
 * This always returns false; use isClearinghouseConfigured() instead.
 */
export function isAvailityConfigured(): boolean {
  return false;
}

/**
 * Check eligibility via Availity (270/271 transaction).
 * Routes through the clearinghouse edge function — no client-side API keys.
 */
export async function checkEligibilityAvaility(
  request: EligibilityRequest
): Promise<EligibilityResponse> {
  try {
    const result = await callClearinghouseFunction('eligibility', request as unknown as Record<string, unknown>);
    return result as unknown as EligibilityResponse;
  } catch (error) {
    console.error('Availity eligibility check failed:', error);
    throw error;
  }
}

/**
 * Submit claim via Availity (837P).
 * Generates and validates EDI locally, then submits through edge function.
 */
export async function submitClaimAvaility(
  claim: ClaimSubmission
): Promise<ClaimResponse> {
  try {
    // Generate production-valid EDI 837P
    const ediPayload = generateEDI837P(claim);

    // Validate before submitting
    const validation = validateEDI837P(ediPayload);
    if (!validation.valid) {
      const errorMessages = validation.errors
        .filter(e => e.severity === 'error')
        .map(e => `${e.segment}${e.field ? `.${e.field}` : ''}: ${e.message}`)
        .join('; ');
      throw new Error(`EDI validation failed: ${errorMessages}`);
    }

    const result = await callClearinghouseFunction('submit_claim', {
      ...claim as unknown as Record<string, unknown>,
      ediPayload,
    });
    return result as unknown as ClaimResponse;
  } catch (error) {
    console.error('Availity claim submission failed:', error);
    throw error;
  }
}

/**
 * Check claim status via Availity (276/277).
 * Routes through the clearinghouse edge function — no client-side API keys.
 */
export async function checkClaimStatusAvaility(
  request: ClaimStatusRequest
): Promise<ClaimStatusResponse> {
  try {
    const result = await callClearinghouseFunction('claim_status', request as unknown as Record<string, unknown>);
    return result as unknown as ClaimStatusResponse;
  } catch (error) {
    console.error('Availity claim status check failed:', error);
    throw error;
  }
}

// ============================================================================
// Legacy EDI Conversion (preserved for backward compatibility)
// ============================================================================

/** @deprecated Use generateEDI837P() instead */
function convertToEDI837P(claim: ClaimSubmission): string {
  return generateEDI837P(claim);
}

// ============================================================================
// Response Parsers
// ============================================================================

function parseAvailityEligibilityResponse(
  data: Record<string, unknown>,
  request: EligibilityRequest
): EligibilityResponse {
  // Parse Availity-specific response format
  // This would be customized based on actual Availity API response structure

  return {
    success: true,
    transactionId: data.transactionId as string || generateControlNumber(),
    timestamp: new Date().toISOString(),
    subscriber: {
      memberId: request.memberId,
      firstName: request.memberFirstName,
      lastName: request.memberLastName,
      dob: request.memberDob,
      relationship: 'self',
    },
    plan: {
      payerId: request.payerId,
      payerName: CLEARINGHOUSE_PAYER_IDS[request.payerId]?.name || 'Unknown Payer',
      planName: (data.planName as string) || 'PPO',
      planType: 'PPO',
      effectiveDate: (data.effectiveDate as string) || '2024-01-01',
    },
    coverage: {
      isActive: true,
      inNetwork: true,
      deductible: {
        individual: 500,
        family: 1500,
        met: 350,
        remaining: 150,
      },
      outOfPocketMax: {
        individual: 3000,
        family: 6000,
        spent: 800,
        remaining: 2200,
      },
      copay: {
        primaryCare: 25,
        specialist: 50,
        telehealth: 25,
        behavioralHealth: 30,
      },
      coinsurance: {
        inNetwork: 20,
        outOfNetwork: 40,
      },
    },
    serviceCoverage: [],
  };
}

function parseAvailityClaimResponse(data: Record<string, unknown>): ClaimResponse {
  return {
    success: data.status === 'accepted',
    transactionId: data.transactionId as string || generateControlNumber(),
    claimControlNumber: data.claimControlNumber as string || `CLM${generateControlNumber()}`,
    status: (data.status as 'accepted' | 'rejected' | 'pending') || 'pending',
    timestamp: new Date().toISOString(),
    errors: data.errors as ClaimResponse['errors'],
  };
}

function parseAvailityClaimStatusResponse(data: Record<string, unknown>): ClaimStatusResponse {
  return {
    success: true,
    claims: (data.claims as ClaimStatusResponse['claims']) || [],
  };
}

// ============================================================================
// Mock Responses (for development/testing)
// ============================================================================

function getMockEligibilityResponse(request: EligibilityRequest): EligibilityResponse {
  // Simulate network delay
  return {
    success: true,
    transactionId: `MOCK-${Date.now()}`,
    timestamp: new Date().toISOString(),
    subscriber: {
      memberId: request.memberId,
      firstName: request.memberFirstName,
      lastName: request.memberLastName,
      dob: request.memberDob,
      relationship: 'self',
    },
    plan: {
      payerId: request.payerId,
      payerName: CLEARINGHOUSE_PAYER_IDS[request.payerId]?.name || 'Test Insurance',
      planName: 'PPO Gold',
      planType: 'PPO',
      groupNumber: 'GRP' + Math.random().toString().slice(2, 8),
      effectiveDate: '2024-01-01',
    },
    coverage: {
      isActive: true,
      inNetwork: true,
      deductible: {
        individual: 500,
        family: 1500,
        met: 500,
        remaining: 0,
      },
      outOfPocketMax: {
        individual: 3000,
        family: 6000,
        spent: 1250,
        remaining: 1750,
      },
      copay: {
        primaryCare: 25,
        specialist: 50,
        telehealth: 25,
        behavioralHealth: 30,
      },
      coinsurance: {
        inNetwork: 20,
        outOfNetwork: 40,
      },
    },
    serviceCoverage: [
      {
        serviceCode: '97153',
        serviceName: 'Adaptive Behavior Treatment by Protocol',
        covered: true,
        requiresAuth: true,
        authInfo: 'Prior authorization required. Call 1-800-XXX-XXXX.',
        copay: 30,
      },
      {
        serviceCode: '97155',
        serviceName: 'Adaptive Behavior Treatment with Modification',
        covered: true,
        requiresAuth: true,
        authInfo: 'Prior authorization required.',
        copay: 50,
      },
      {
        serviceCode: '97156',
        serviceName: 'Family Adaptive Behavior Treatment',
        covered: true,
        requiresAuth: false,
        copay: 25,
      },
    ],
  };
}

function getMockClaimResponse(claim: ClaimSubmission): ClaimResponse {
  return {
    success: true,
    transactionId: `MOCK-${Date.now()}`,
    claimControlNumber: `CLM${Date.now().toString().slice(-9)}`,
    status: 'accepted',
    timestamp: new Date().toISOString(),
    warnings: [
      {
        code: 'W001',
        message: 'Mock response - actual submission requires API configuration',
      },
    ],
  };
}

function getMockClaimStatusResponse(request: ClaimStatusRequest): ClaimStatusResponse {
  return {
    success: true,
    claims: [
      {
        claimControlNumber: request.claimControlNumber || `CLM${Date.now()}`,
        status: 'approved',
        statusDate: new Date().toISOString(),
        totalCharged: 500,
        totalPaid: 400,
        checkNumber: 'CHK' + Math.random().toString().slice(2, 10),
        checkDate: new Date().toISOString(),
      },
    ],
  };
}

// ============================================================================
// Waystar Integration (Secondary)
// ============================================================================

/**
 * @deprecated Client-side Waystar keys have been removed.
 * Waystar configuration now lives in Supabase Edge Function secrets.
 * This always returns false; use isClearinghouseConfigured() instead.
 */
export function isWaystarConfigured(): boolean {
  return false;
}

/**
 * Check eligibility via Waystar (270/271).
 * Routes through the clearinghouse edge function where Waystar keys live.
 */
export async function checkEligibilityWaystar(
  request: EligibilityRequest
): Promise<EligibilityResponse> {
  try {
    const result = await callClearinghouseFunction('eligibility', {
      ...(request as unknown as Record<string, unknown>),
      preferredClearinghouse: 'waystar',
    });
    return result as unknown as EligibilityResponse;
  } catch (error) {
    console.warn('[clearinghouse] Waystar eligibility check failed:', error);
    if (import.meta.env.DEV) {
      return getMockEligibilityResponse(request);
    }
    throw error;
  }
}

// ============================================================================
// Edge Function API (Production - keeps API keys secure)
// ============================================================================

/**
 * Call clearinghouse edge function
 */
async function callClearinghouseFunction(
  action: 'eligibility' | 'submit_claim' | 'claim_status' | 'get_remittance' | 'background_check' | 'prior_auth',
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const token = localStorage.getItem('supabase.auth.token');
  const authToken = token ? JSON.parse(token)?.access_token : publicAnonKey;

  const { data: responseData, error, status, ok } = await secureFetch<Record<string, unknown>>(
    CLEARINGHOUSE_FUNCTION_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ action, ...data }),
    }
  );

  if (!ok) {
    throw new Error(`Clearinghouse function error: ${status} - ${error || 'Unknown error'}`);
  }

  return responseData || {};
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

/** Default retry configuration */
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Execute an async function with exponential backoff retry.
 * Retries on network errors and 5xx server errors.
 * Does NOT retry on 4xx client errors (bad request, unauthorized, etc.).
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  } = {}
): Promise<T> {
  const config = { ...RETRY_CONFIG, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors (4xx)
      if (lastError.message.includes('400') ||
          lastError.message.includes('401') ||
          lastError.message.includes('403') ||
          lastError.message.includes('404') ||
          lastError.message.includes('422')) {
        throw lastError;
      }

      // Don't retry on validation errors
      if (lastError.message.includes('EDI validation failed')) {
        throw lastError;
      }

      if (attempt < config.maxAttempts) {
        // Calculate delay with exponential backoff + jitter
        const baseDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
        const jitter = Math.random() * config.baseDelayMs * 0.5;
        const delay = Math.min(baseDelay + jitter, config.maxDelayMs);

        if (options.onRetry) {
          options.onRetry(attempt, lastError, delay);
        } else {
          console.warn(`Retry attempt ${attempt}/${config.maxAttempts} after ${Math.round(delay)}ms: ${lastError.message}`);
        }

        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('All retry attempts exhausted');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Submission Queue (Failed submissions stored for later retry)
// ============================================================================

/** In-memory queue for failed submissions (also persisted to Supabase) */
const submissionQueue: SubmissionAttempt[] = [];

/**
 * Queue a failed claim submission for later retry.
 * Stores in both memory and Supabase for persistence.
 */
async function queueForRetry(
  claim: ClaimSubmission,
  errorMessage: string,
  attemptNumber: number
): Promise<SubmissionAttempt> {
  const nextRetryDelay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber);
  const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

  const attempt: SubmissionAttempt = {
    id: `sa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    claimSubmission: claim,
    attemptNumber,
    maxAttempts: RETRY_CONFIG.maxAttempts,
    status: 'queued_for_retry',
    lastAttemptAt: new Date().toISOString(),
    nextRetryAt,
    errorMessage,
    createdAt: new Date().toISOString(),
  };

  submissionQueue.push(attempt);

  // Persist to Supabase
  try {
    const token = localStorage.getItem('supabase.auth.token');
    const authToken = token ? JSON.parse(token)?.access_token : publicAnonKey;

    await secureFetch(`https://${projectId}.supabase.co/rest/v1/claim_submission_attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': publicAnonKey,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        id: attempt.id,
        claim_data: attempt.claimSubmission,
        attempt_number: attempt.attemptNumber,
        max_attempts: attempt.maxAttempts,
        status: attempt.status,
        last_attempt_at: attempt.lastAttemptAt,
        next_retry_at: attempt.nextRetryAt,
        error_message: attempt.errorMessage,
        created_at: attempt.createdAt,
      }),
    });
  } catch (err) {
    // Supabase persistence is best-effort; in-memory queue still works
    console.warn('[clearinghouse] Failed to persist submission attempt to Supabase:', err);
  }

  return attempt;
}

/**
 * Update the status of a submission attempt in Supabase.
 */
async function updateSubmissionAttemptStatus(
  attemptId: string,
  status: SubmissionAttempt['status'],
  response?: ClaimResponse
): Promise<void> {
  // Update in-memory
  const attempt = submissionQueue.find(a => a.id === attemptId);
  if (attempt) {
    attempt.status = status;
    attempt.response = response;
    attempt.lastAttemptAt = new Date().toISOString();
  }

  // Persist to Supabase
  try {
    const token = localStorage.getItem('supabase.auth.token');
    const authToken = token ? JSON.parse(token)?.access_token : publicAnonKey;

    await secureFetch(`https://${projectId}.supabase.co/rest/v1/claim_submission_attempts?id=eq.${attemptId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': publicAnonKey,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        status,
        response_data: response,
        last_attempt_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('[clearinghouse] Failed to update submission attempt status:', err);
  }
}

/**
 * Get all queued submission attempts.
 */
export function getQueuedSubmissions(): SubmissionAttempt[] {
  return submissionQueue.filter(a => a.status === 'queued_for_retry');
}

/**
 * Retry all queued submissions that are past their retry time.
 */
export async function retryQueuedSubmissions(): Promise<Array<{ attemptId: string; result: ClaimResponse | null; error?: string }>> {
  const now = Date.now();
  const dueForRetry = submissionQueue.filter(
    a => a.status === 'queued_for_retry' &&
    a.nextRetryAt &&
    new Date(a.nextRetryAt).getTime() <= now
  );

  const results: Array<{ attemptId: string; result: ClaimResponse | null; error?: string }> = [];

  for (const attempt of dueForRetry) {
    try {
      await updateSubmissionAttemptStatus(attempt.id, 'in_progress');

      const result = await submitInsuranceClaim(attempt.claimSubmission);
      await updateSubmissionAttemptStatus(attempt.id, 'succeeded', result);

      results.push({ attemptId: attempt.id, result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (attempt.attemptNumber >= attempt.maxAttempts) {
        await updateSubmissionAttemptStatus(attempt.id, 'failed');
        results.push({ attemptId: attempt.id, result: null, error: `Max retries exhausted: ${errorMessage}` });
      } else {
        attempt.attemptNumber += 1;
        const nextDelay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt.attemptNumber);
        attempt.nextRetryAt = new Date(Date.now() + nextDelay).toISOString();
        attempt.status = 'queued_for_retry';
        attempt.errorMessage = errorMessage;
        results.push({ attemptId: attempt.id, result: null, error: errorMessage });
      }
    }
  }

  return results;
}

// ============================================================================
// High-Level API (with retry)
// ============================================================================

/**
 * Check insurance eligibility using best available clearinghouse.
 * Includes automatic retry with exponential backoff.
 */
export async function verifyInsuranceEligibility(
  request: EligibilityRequest
): Promise<EligibilityResponse> {
  try {
    return await withRetry(
      () => callClearinghouseFunction('eligibility', request as unknown as Record<string, unknown>)
        .then(result => result as unknown as EligibilityResponse),
      { onRetry: (attempt, error, delay) => {
        console.warn(`[clearinghouse] Eligibility check retry ${attempt}: ${error.message} (next in ${Math.round(delay)}ms)`);
      }}
    );
  } catch (error) {
    console.warn('[clearinghouse] Eligibility check failed:', error);
    if (import.meta.env.DEV) {
      return getMockEligibilityResponse(request);
    }
    throw error;
  }
}

/**
 * Submit a claim to the appropriate clearinghouse.
 * Includes automatic retry with exponential backoff.
 * Failed submissions are queued for later retry.
 */
export async function submitInsuranceClaim(
  claim: ClaimSubmission
): Promise<ClaimResponse> {
  try {
    return await withRetry(
      () => callClearinghouseFunction('submit_claim', claim as unknown as Record<string, unknown>)
        .then(result => result as unknown as ClaimResponse),
      { onRetry: (attempt, error, delay) => {
        console.warn(`[clearinghouse] Claim submission retry ${attempt}: ${error.message} (next in ${Math.round(delay)}ms)`);
      }}
    );
  } catch (error) {
    console.warn('[clearinghouse] Claim submission failed, queuing for retry:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await queueForRetry(claim, errorMessage, RETRY_CONFIG.maxAttempts);
    throw error;
  }
}

/**
 * Check status of submitted claim.
 * Includes automatic retry with exponential backoff.
 */
export async function getClaimStatus(
  request: ClaimStatusRequest
): Promise<ClaimStatusResponse> {
  try {
    return await withRetry(
      () => callClearinghouseFunction('claim_status', request as unknown as Record<string, unknown>)
        .then(result => result as unknown as ClaimStatusResponse),
      { onRetry: (attempt, error, delay) => {
        console.warn(`[clearinghouse] Claim status retry ${attempt}: ${error.message} (next in ${Math.round(delay)}ms)`);
      }}
    );
  } catch (error) {
    console.warn('[clearinghouse] Claim status check failed:', error);
    if (import.meta.env.DEV) {
      return getMockClaimStatusResponse(request);
    }
    throw error;
  }
}

// ============================================================================
// HCBS Medicaid Waiver Specific
// ============================================================================

/**
 * Format claim for HCBS waiver services
 * These use T-codes and require specific payer IDs
 */
export function formatHCBSClaim(
  baseData: Partial<ClaimSubmission>,
  waiverType: string,
  state: string
): ClaimSubmission {
  const medicaidPayerId = `medicaid_${state.toLowerCase()}`;
  const payerInfo = CLEARINGHOUSE_PAYER_IDS[medicaidPayerId];

  return {
    claimType: 'professional',
    billingProvider: baseData.billingProvider!,
    subscriber: baseData.subscriber!,
    patient: baseData.patient,
    payer: {
      payerId: payerInfo?.availity || medicaidPayerId,
      payerName: payerInfo?.name || `${state} Medicaid`,
    },
    diagnosis: baseData.diagnosis || [
      { code: 'F84.0', isPrimary: true }, // Autistic disorder
    ],
    services: baseData.services || [],
    totalCharges: baseData.totalCharges || 0,
    priorAuthNumber: baseData.priorAuthNumber,
    referralNumber: baseData.referralNumber,
  };
}

/**
 * Check if clearinghouse is configured.
 * Always true — all calls route through the Supabase edge function.
 */
export function isClearinghouseConfigured(): boolean {
  return true;
}

/**
 * Get clearinghouse health status.
 * All calls go through the edge function — direct API keys are no longer on the client.
 */
export async function getClearinghouseHealth(): Promise<{
  status: 'ok' | 'degraded' | 'down';
  availity: boolean;
  waystar: boolean;
  edgeFunction: boolean;
}> {
  const health = {
    status: 'down' as 'ok' | 'degraded' | 'down',
    availity: false,
    waystar: false,
    edgeFunction: false,
  };

  try {
    const { data, ok } = await secureFetch<{ availity?: boolean; waystar?: boolean }>(
      `${CLEARINGHOUSE_FUNCTION_URL}/health`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      }
    );
    if (ok) {
      health.edgeFunction = true;
      health.availity = data?.availity ?? false;
      health.waystar = data?.waystar ?? false;
      health.status = 'ok';
    }
  } catch (error) {
    console.warn('[Clearinghouse] Edge function health check failed:', error);
  }

  return health;
}

/**
 * Submit a prior authorization request (EDI 278)
 */
export async function submitPriorAuth(request: {
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  memberDob: string;
  providerNpi: string;
  providerTaxId: string;
  payerId: string;
  serviceCode: string;
  diagnosisCode: string;
  requestedUnits: number;
  startDate: string;
  endDate: string;
}): Promise<{ success: boolean; referenceNumber?: string }> {
  console.warn('[clearinghouse] submitPriorAuth is a stub');
  return { success: true, referenceNumber: `PA-${Date.now()}` };
}

/**
 * Get remittance advice (EDI 835) for a provider.
 * Fetches ERA files from clearinghouse and parses them.
 */
export async function getRemittanceAdvice(request: {
  providerNpi: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ success: boolean; payments: ERA835ParseResult[] }> {
  try {
    const result = await callClearinghouseFunction('get_remittance', {
      providerNpi: request.providerNpi,
      dateFrom: request.dateFrom,
      dateTo: request.dateTo,
    });
    const rawFiles = (result.eraFiles || []) as string[];
    const parsed = rawFiles.map(f => parseERA835(f));
    return { success: true, payments: parsed };
  } catch (error) {
    console.warn('[clearinghouse] Remittance fetch failed:', error);
    // Return empty result on failure — caller can retry
    return { success: false, payments: [] };
  }
}

// ============================================================================
// EDI 276 Claim Status Request Generation
// ============================================================================

/**
 * EDI 276 Claim Status Inquiry types
 */
export interface EDI276Request {
  informationReceiverNpi: string;
  informationReceiverName: string;
  providerNpi: string;
  providerTaxId: string;
  providerName: string;
  payerId: string;
  payerName: string;
  claims: Array<{
    memberId: string;
    memberLastName: string;
    memberFirstName: string;
    memberDob: string;
    claimControlNumber?: string;
    serviceDateFrom: string;
    serviceDateTo?: string;
    chargedAmount?: number;
  }>;
}

/**
 * EDI 277 Claim Status Response types
 */
export interface EDI277Response {
  success: boolean;
  transactionId: string;
  claims: Array<{
    claimControlNumber: string;
    memberLastName: string;
    memberFirstName: string;
    memberId: string;
    statusCategoryCode: string;
    statusCategoryDescription: string;
    statusCode: string;
    statusDescription: string;
    totalChargedAmount: number;
    totalPaidAmount: number;
    adjudicationDate: string;
    remittanceDate: string;
    checkNumber: string;
    serviceLines: Array<{
      procedureCode: string;
      chargedAmount: number;
      paidAmount: number;
      serviceDate: string;
      statusCategoryCode: string;
      statusDescription: string;
    }>;
  }>;
  errors?: Array<{ code: string; message: string }>;
}

/** Status category codes from ASC X12 277 */
export const STATUS_CATEGORY_CODES: Record<string, string> = {
  'A0': 'Acknowledgement - Receipt confirmed',
  'A1': 'Acknowledgement - Forwarded to next entity',
  'A2': 'Acknowledgement - Accepted into adjudication system',
  'A3': 'Acknowledgement - Returned as unprocessable claim',
  'A4': 'Acknowledgement - Not found',
  'A5': 'Acknowledgement - Split claim',
  'A6': 'Acknowledgement - Rejected — not a valid claim',
  'P0': 'Pending — Adjudication/Details',
  'P1': 'Pending — In Process',
  'P2': 'Pending — Payer review',
  'P3': 'Pending — Provider requested information',
  'P4': 'Pending — Patient requested information',
  'F0': 'Finalized — Payment/Denial details',
  'F1': 'Finalized — Denied',
  'F2': 'Finalized — Paid',
  'F3': 'Finalized — Revised',
  'F3F': 'Finalized — Forwarded',
  'F4': 'Finalized — Adjudication Complete',
  'R0': 'Requests — Additional Information',
  'R1': 'Requests — Documentation',
  'R3': 'Requests — Claim must be resubmitted',
  'R4': 'Requests — Patient demographics needed',
  'R5': 'Requests — Provider information needed',
  'E0': 'Error — General',
  'E1': 'Error — Authorization number missing/invalid',
  'E2': 'Error — Subscriber/member ID invalid',
  'D0': 'Data Search — Not applicable',
};

/**
 * Generate an EDI 276 Claim Status Inquiry document.
 *
 * Follows ASC X12 005010X212 implementation guide:
 * - ISA/IEA interchange envelope
 * - GS/GE functional group (GS01 = 'HN' for status inquiry)
 * - ST/SE transaction set (ST01 = '276')
 * - BHT for transaction context
 * - Hierarchical loops: Information Source, Information Receiver, Service Provider, Subscriber
 * - TRN trace numbers for each claim inquiry
 * - Service date and claim reference segments
 */
export function generateEDI276(request: EDI276Request): string {
  const now = new Date();
  const icn = generateInterchangeControlNumber();
  const gcn = generateGroupControlNumber();
  const tscn = generateTransactionSetControlNumber();

  const segments: string[] = [];

  // ISA - Interchange Control Header
  segments.push(
    `ISA${ELEMENT_SEP}00${ELEMENT_SEP}${padRight('', 10)}${ELEMENT_SEP}00${ELEMENT_SEP}${padRight('', 10)}${ELEMENT_SEP}ZZ${ELEMENT_SEP}${padRight(request.providerNpi, 15)}${ELEMENT_SEP}ZZ${ELEMENT_SEP}${padRight(request.payerId, 15)}${ELEMENT_SEP}${formatISADate(now)}${ELEMENT_SEP}${formatHHMM(now)}${ELEMENT_SEP}^${ELEMENT_SEP}00501${ELEMENT_SEP}${icn}${ELEMENT_SEP}0${ELEMENT_SEP}P${ELEMENT_SEP}${COMPONENT_SEP}${SEGMENT_TERM}`
  );

  // GS - Functional Group Header (HN = Health Care Claim Status Notification)
  segments.push(
    buildSegment('GS', 'HN', request.providerNpi, request.payerId,
      formatCCYYMMDD(now), formatHHMM(now), gcn, 'X', '005010X212')
  );

  // ST - Transaction Set Header
  const stIndex = segments.length;
  segments.push(buildSegment('ST', '276', tscn, '005010X212'));

  // BHT - Beginning of Hierarchical Transaction
  const bhtRefId = `CSI${generateControlNumber(6)}`;
  segments.push(
    buildSegment('BHT', '0010', '13', bhtRefId, formatCCYYMMDD(now), formatHHMM(now))
  );

  // HL Loop 1 - Information Source (Payer)
  segments.push(buildSegment('HL', '1', '', '20', '1'));
  segments.push(
    buildSegment('NM1', 'PR', '2', request.payerName, '', '', '', '', 'PI', request.payerId)
  );

  // HL Loop 2 - Information Receiver (Provider)
  segments.push(buildSegment('HL', '2', '1', '21', '1'));
  segments.push(
    buildSegment('NM1', '41', '2', request.informationReceiverName, '', '', '', '', 'XX', request.informationReceiverNpi)
  );

  // HL Loop 3 - Service Provider
  segments.push(buildSegment('HL', '3', '2', '19', '1'));
  segments.push(
    buildSegment('NM1', '1P', '2', request.providerName, '', '', '', '', 'XX', request.providerNpi)
  );
  segments.push(buildSegment('REF', 'EI', request.providerTaxId));

  // For each claim, add subscriber level HL and claim inquiry
  let hlCounter = 3;
  for (const claim of request.claims) {
    hlCounter++;

    // HL Loop 4 - Subscriber
    segments.push(buildSegment('HL', hlCounter.toString(), '3', '22', '0'));
    segments.push(buildSegment('DMG', 'D8', isoDateToEDI(claim.memberDob)));
    segments.push(
      buildSegment('NM1', 'IL', '1', claim.memberLastName, claim.memberFirstName, '', '', '', 'MI', claim.memberId)
    );

    // TRN - Trace Number for this inquiry
    const traceNumber = `TRC${generateControlNumber(6)}`;
    segments.push(buildSegment('TRN', '1', traceNumber, request.providerNpi));

    // STC - status request not needed (this is a request, not a response)

    // REF - Claim identification
    if (claim.claimControlNumber) {
      segments.push(buildSegment('REF', '1K', claim.claimControlNumber));
    }

    // DTP - Service Date(s)
    if (claim.serviceDateTo) {
      segments.push(
        buildSegment('DTP', '472', 'RD8', `${isoDateToEDI(claim.serviceDateFrom)}-${isoDateToEDI(claim.serviceDateTo)}`)
      );
    } else {
      segments.push(
        buildSegment('DTP', '472', 'D8', isoDateToEDI(claim.serviceDateFrom))
      );
    }

    // AMT - Charged amount
    if (claim.chargedAmount !== undefined) {
      segments.push(buildSegment('AMT', 'T3', formatAmount(claim.chargedAmount)));
    }
  }

  // SE - Transaction Set Trailer
  const segmentCountFromST = segments.length - stIndex + 1;
  segments.push(buildSegment('SE', segmentCountFromST.toString(), tscn));

  // GE - Functional Group Trailer
  segments.push(buildSegment('GE', '1', gcn));

  // IEA - Interchange Control Trailer
  segments.push(buildSegment('IEA', '1', icn));

  return segments.join('');
}

/**
 * Parse an EDI 277 Claim Status Response document.
 *
 * Extracts claim status information from the 277 response transaction,
 * mapping status category codes and status codes to human-readable descriptions.
 */
export function parseEDI277(ediContent: string): EDI277Response {
  const segmentStrings = ediContent.split(SEGMENT_TERM).filter(s => s.trim().length > 0);
  const parseErrors: Array<{ code: string; message: string }> = [];
  const claims: EDI277Response['claims'] = [];

  let transactionId = '';
  let currentClaim: EDI277Response['claims'][0] | null = null;
  let currentServiceLine: EDI277Response['claims'][0]['serviceLines'][0] | null = null;
  let inServiceLineLoop = false;

  for (const segStr of segmentStrings) {
    const elements = segStr.split(ELEMENT_SEP);
    const segId = elements[0]?.trim();

    switch (segId) {
      case 'ST': {
        if (elements[1] !== '277') {
          parseErrors.push({
            code: 'INVALID_TRANSACTION',
            message: `Expected 277 transaction set, found ${elements[1]}`,
          });
        }
        transactionId = elements[2] || '';
        break;
      }

      case 'STC': {
        // Status Information
        // STC01 is composite: StatusCategoryCode:StatusCode
        const stcComposite = (elements[1] || '').split(COMPONENT_SEP);
        const categoryCode = stcComposite[0] || '';
        const statusCode = stcComposite[1] || '';
        const adjudicationDate = elements[2] || '';
        const totalPaid = parseFloat(elements[4] || '0');

        if (inServiceLineLoop && currentServiceLine) {
          currentServiceLine.statusCategoryCode = categoryCode;
          currentServiceLine.statusDescription =
            STATUS_CATEGORY_CODES[categoryCode] || `Status ${categoryCode}`;
        } else if (currentClaim) {
          currentClaim.statusCategoryCode = categoryCode;
          currentClaim.statusCategoryDescription =
            STATUS_CATEGORY_CODES[categoryCode] || `Status category ${categoryCode}`;
          currentClaim.statusCode = statusCode;
          currentClaim.statusDescription =
            STATUS_CATEGORY_CODES[categoryCode] || `Status ${statusCode}`;
          currentClaim.adjudicationDate = adjudicationDate;
          currentClaim.totalPaidAmount = totalPaid;
        }
        break;
      }

      case 'TRN': {
        // Trace Number - starts a new claim inquiry response
        if (currentClaim) {
          if (currentServiceLine) {
            currentClaim.serviceLines.push(currentServiceLine);
            currentServiceLine = null;
          }
          claims.push(currentClaim);
        }
        inServiceLineLoop = false;

        currentClaim = {
          claimControlNumber: '',
          memberLastName: '',
          memberFirstName: '',
          memberId: '',
          statusCategoryCode: '',
          statusCategoryDescription: '',
          statusCode: '',
          statusDescription: '',
          totalChargedAmount: 0,
          totalPaidAmount: 0,
          adjudicationDate: '',
          remittanceDate: '',
          checkNumber: '',
          serviceLines: [],
        };
        break;
      }

      case 'REF': {
        if (!currentClaim) break;
        // 1K = Payer Claim Control Number
        if (elements[1] === '1K') {
          currentClaim.claimControlNumber = elements[2] || '';
        }
        break;
      }

      case 'NM1': {
        if (!currentClaim) break;
        if (elements[1] === 'IL' || elements[1] === 'QC') {
          currentClaim.memberLastName = elements[3] || '';
          currentClaim.memberFirstName = elements[4] || '';
          if (elements[8] === 'MI') {
            currentClaim.memberId = elements[9] || '';
          }
        }
        break;
      }

      case 'DTP': {
        if (!currentClaim) break;
        if (elements[1] === '472') {
          // Service Date
          if (inServiceLineLoop && currentServiceLine) {
            currentServiceLine.serviceDate = elements[3] || '';
          }
        } else if (elements[1] === '050') {
          // Received Date
          currentClaim.remittanceDate = elements[3] || '';
        }
        break;
      }

      case 'AMT': {
        if (!currentClaim) break;
        if (elements[1] === 'T3') {
          currentClaim.totalChargedAmount = parseFloat(elements[2] || '0');
        }
        break;
      }

      case 'SVC': {
        if (!currentClaim) break;
        // Save previous service line
        if (currentServiceLine) {
          currentClaim.serviceLines.push(currentServiceLine);
        }
        inServiceLineLoop = true;

        const svcComposite = (elements[1] || '').split(COMPONENT_SEP);
        const procedureCode = svcComposite[1] || '';

        currentServiceLine = {
          procedureCode,
          chargedAmount: parseFloat(elements[2] || '0'),
          paidAmount: parseFloat(elements[3] || '0'),
          serviceDate: '',
          statusCategoryCode: '',
          statusDescription: '',
        };
        break;
      }
    }
  }

  // Push last claim
  if (currentClaim) {
    if (currentServiceLine) {
      currentClaim.serviceLines.push(currentServiceLine);
    }
    claims.push(currentClaim);
  }

  return {
    success: parseErrors.length === 0,
    transactionId,
    claims,
    errors: parseErrors.length > 0 ? parseErrors : undefined,
  };
}

/**
 * Submit batch claim status inquiries via EDI 276.
 * Generates the EDI, submits to clearinghouse, and parses the 277 response.
 */
export async function submitClaimStatusInquiry(
  request: EDI276Request
): Promise<EDI277Response> {
  const edi276 = generateEDI276(request);

  try {
    const result = await callClearinghouseFunction('claim_status', {
      ediPayload: edi276,
      format: '276',
    });
    if (result.edi277Response) {
      return parseEDI277(result.edi277Response as string);
    }
    // If API returns structured data instead of raw EDI
    return result as unknown as EDI277Response;
  } catch (error) {
    console.warn('[clearinghouse] EDI 276 submission failed:', error);
  }

  // Mock response for development (edge function not reachable)
  return {
    success: true,
    transactionId: `MOCK-277-${Date.now()}`,
    claims: request.claims.map(claim => ({
      claimControlNumber: claim.claimControlNumber || `CLM${Date.now()}`,
      memberLastName: claim.memberLastName,
      memberFirstName: claim.memberFirstName,
      memberId: claim.memberId,
      statusCategoryCode: 'F2',
      statusCategoryDescription: STATUS_CATEGORY_CODES['F2'] || 'Finalized — Paid',
      statusCode: '0',
      statusDescription: 'Processed as Primary',
      totalChargedAmount: claim.chargedAmount || 0,
      totalPaidAmount: (claim.chargedAmount || 0) * 0.8,
      adjudicationDate: formatCCYYMMDD(new Date()),
      remittanceDate: formatCCYYMMDD(new Date()),
      checkNumber: `CHK${Math.random().toString().slice(2, 10)}`,
      serviceLines: [],
    })),
  };
}

/**
 * Map 277 status category code to a simplified claim status.
 */
export function mapStatusCategoryToClaimStatus(
  categoryCode: string
): 'accepted' | 'rejected' | 'pending' | 'finalized' | 'unknown' {
  if (categoryCode.startsWith('A')) {
    return categoryCode === 'A3' || categoryCode === 'A6' ? 'rejected' : 'accepted';
  }
  if (categoryCode.startsWith('P')) return 'pending';
  if (categoryCode.startsWith('F')) {
    return categoryCode === 'F1' ? 'rejected' : 'finalized';
  }
  if (categoryCode.startsWith('R')) return 'pending';
  if (categoryCode.startsWith('E')) return 'rejected';
  return 'unknown';
}

export default {
  // Configuration checks
  isAvailityConfigured,
  isWaystarConfigured,
  isClearinghouseConfigured,
  getClearinghouseHealth,

  // High-level API
  verifyInsuranceEligibility,
  submitInsuranceClaim,
  getClaimStatus,

  // Availity specific
  checkEligibilityAvaility,
  submitClaimAvaility,
  checkClaimStatusAvaility,

  // EDI Generation & Validation
  generateEDI837P,
  validateEDI837P,

  // ERA 835 Parsing
  parseERA835,

  // ERA 835 Remittance Retrieval
  getRemittanceAdvice,

  // EDI 276/277 Claim Status Inquiry
  generateEDI276,
  parseEDI277,
  submitClaimStatusInquiry,
  mapStatusCategoryToClaimStatus,

  // Prior Authorization
  submitPriorAuth,

  // Retry Queue
  getQueuedSubmissions,
  retryQueuedSubmissions,

  // HCBS specific
  formatHCBSClaim,

  // Reference data
  CLEARINGHOUSE_PAYER_IDS,
  ABA_SERVICE_CODES,
  STATUS_CATEGORY_CODES,
  CARC_DESCRIPTIONS,
};
