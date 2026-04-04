/**
 * era-835-parser.ts — ERA/835 Remittance Parsing
 * Parses X12 835 EDI remittance advice from Stedi or raw X12 strings.
 */

// ============================================================================
// Types
// ============================================================================

export interface ClaimLineAdjustment {
  adjustmentGroupCode: string; // CO, PR, OA, PI, CR
  reasonCode: string;          // e.g. "45", "97", "CO-45"
  adjustmentAmount: number;
  description: string;
}

export interface PaidClaimLine {
  procedureCode: string;        // e.g. "97153"
  serviceDate: string;
  billedAmount: number;
  allowedAmount: number;
  paidAmount: number;
  patientResponsibility: number;
  adjustments: ClaimLineAdjustment[];
  claimStatus: 'paid' | 'denied' | 'partial' | 'pending';
  denialReason?: string;
}

export interface ERA835Result {
  checkNumber: string;
  payerId: string;
  payerName: string;
  paymentDate: string;
  totalPayment: number;
  claimLines: PaidClaimLine[];
  claimStatus: 'paid' | 'denied' | 'partial';
  patientName: string;
  memberId: string;
  npi: string;
  raw?: unknown;
}

// ============================================================================
// Adjustment group code descriptions
// ============================================================================

const ADJUSTMENT_GROUP_DESCRIPTIONS: Record<string, string> = {
  CO: 'Contractual Obligation',
  PR: 'Patient Responsibility',
  OA: 'Other Adjustment',
  PI: 'Payer Initiated Reduction',
  CR: 'Correction / Reversal',
};

// ============================================================================
// Top 20 ABA denial reason codes
// ============================================================================

const DENIAL_REASON_CODES: Record<string, string> = {
  '4':   'Service inconsistent with coverage',
  '15':  'Coverage not in effect on date of service',
  '16':  'Claim lacks information required for processing',
  '18':  'Duplicate claim submitted',
  '22':  'This care may be covered by another payer',
  '26':  'Expenses incurred prior to coverage',
  '27':  'Expenses incurred after coverage terminated',
  '29':  'Timely filing limit expired',
  '45':  'Charge exceeds fee schedule / maximum allowed',
  '50':  'Non-covered service — not deemed medically necessary',
  '57':  'Plan benefit not available for this service',
  '97':  'Payment included in allowance for another service',
  '109': 'Claim not covered by this payer',
  '119': 'Benefit maximum for this time period has been reached',
  '167': 'This service was not prescribed by a physician',
  '170': 'Payment adjusted — procedure requires pre-authorization',
  '181': 'Procedure code not valid for date of service',
  '197': 'Precertification / authorization absent',
  '252': 'An attachment / additional information required for adjudication',
  'B7':  'Provider not certified / eligible to perform this procedure',
  'B15': 'Payment adjusted because authorization not obtained',
  'M127':'Missing patient medical record',
};

// ============================================================================
// Helpers
// ============================================================================

export function formatAdjustmentReason(code: string): string {
  const clean = code.replace(/^(CO|PR|OA|PI|CR)-/, '');
  return DENIAL_REASON_CODES[clean] ?? DENIAL_REASON_CODES[code] ?? `Reason code ${code}`;
}

function parseAmount(str: string): number {
  const n = parseFloat(str ?? '0');
  return isNaN(n) ? 0 : n;
}

function parseDateYYYYMMDD(raw: string): string {
  // 835 dates are YYYYMMDD or MMDDYYYY
  if (!raw || raw.length < 6) return raw ?? '';
  if (raw.length === 8 && raw.match(/^\d{8}$/)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

function deriveLineStatus(paid: number, billed: number, adjustments: ClaimLineAdjustment[]): PaidClaimLine['claimStatus'] {
  if (paid <= 0 && billed > 0) return 'denied';
  if (paid > 0 && paid < billed) return 'partial';
  if (paid >= billed) return 'paid';
  const hasCO97 = adjustments.some((a) => a.reasonCode === '97');
  if (hasCO97) return 'partial';
  return 'pending';
}

// ============================================================================
// X12 835 Parser
// ============================================================================

/**
 * Parse raw X12 835 string.
 * Handles both * and ~ delimiters per the ISA envelope.
 */
export function parseERA835(rawX12: string): ERA835Result {
  // Detect element separator from ISA segment (char at position 3)
  const elementSep = rawX12[3] ?? '*';
  // Detect segment terminator (char after ISA 16th element + subElementSep)
  // Per spec, ISA is always 106 chars, terminator at 106
  const segTerm = rawX12[105] ?? '~';

  const segments = rawX12
    .split(segTerm)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const seg = (s: string) => s.split(elementSep);

  // Result accumulators
  let checkNumber = '';
  let payerId = '';
  let payerName = '';
  let paymentDate = '';
  let totalPayment = 0;
  let patientName = '';
  let memberId = '';
  let npi = '';

  const claimLines: PaidClaimLine[] = [];

  // Current claim context
  let currentCLP: Partial<{
    billedAmount: number;
    paidAmount: number;
    payerClaimControlNumber: string;
    claimStatusCode: string;
  }> = {};

  // Current SVC line context
  let currentSVC: Partial<PaidClaimLine> | null = null;
  const currentAdjustments: ClaimLineAdjustment[] = [];
  let inSVC = false;

  const flushSVC = () => {
    if (currentSVC) {
      const adj = [...currentAdjustments];
      const paid = currentSVC.paidAmount ?? 0;
      const billed = currentSVC.billedAmount ?? 0;
      const prAdj = adj.filter((a) => a.adjustmentGroupCode === 'PR');
      const patResp = prAdj.reduce((sum, a) => sum + a.adjustmentAmount, 0);
      const status = deriveLineStatus(paid, billed, adj);
      const denialReason = status === 'denied' || status === 'partial'
        ? adj.find((a) => a.adjustmentGroupCode === 'CO')?.description
        : undefined;

      claimLines.push({
        procedureCode: currentSVC.procedureCode ?? '',
        serviceDate: currentSVC.serviceDate ?? '',
        billedAmount: billed,
        allowedAmount: currentSVC.allowedAmount ?? paid,
        paidAmount: paid,
        patientResponsibility: patResp,
        adjustments: adj,
        claimStatus: status,
        denialReason,
      });
    }
    currentSVC = null;
    currentAdjustments.length = 0;
    inSVC = false;
  };

  for (const rawSeg of segments) {
    const els = seg(rawSeg);
    const id = els[0];

    switch (id) {
      case 'BPR': {
        // BPR02 = payment amount, BPR16 = check/EFT number
        totalPayment = parseAmount(els[2]);
        checkNumber = els[15] ?? '';
        paymentDate = parseDateYYYYMMDD(els[16] ?? '');
        break;
      }
      case 'TRN': {
        // TRN02 = trace number (check number fallback)
        if (!checkNumber) checkNumber = els[2] ?? '';
        break;
      }
      case 'N1': {
        // N1*PR = payer, N1*PE = payee
        if (els[1] === 'PR') {
          payerName = els[2] ?? '';
          // N104 might have payer ID
          if (els[3] === 'XV' || els[3] === 'FI') payerId = els[4] ?? '';
        }
        break;
      }
      case 'REF': {
        if (els[1] === 'EV') payerId = els[2] ?? payerId; // payer ID from REF*EV
        break;
      }
      case 'CLP': {
        // Flush previous SVC
        if (inSVC) flushSVC();
        // CLP01 patient control number, CLP03 billed, CLP04 paid, CLP08 payer claim control
        currentCLP = {
          billedAmount: parseAmount(els[3]),
          paidAmount: parseAmount(els[4]),
          payerClaimControlNumber: els[7] ?? '',
          claimStatusCode: els[2] ?? '',
        };
        break;
      }
      case 'NM1': {
        // NM1*QC = patient, NM1*IL = insured, NM1*74 = corrected insured
        if (els[1] === 'QC') {
          const last = els[3] ?? '';
          const first = els[4] ?? '';
          patientName = [first, last].filter(Boolean).join(' ');
        }
        if (els[1] === 'IL') {
          memberId = els[9] ?? '';
        }
        if (els[1] === '82' || els[1] === 'SJ') {
          // Rendering provider NPI
          if (els[8] === 'XX') npi = els[9] ?? '';
        }
        break;
      }
      case 'SVC': {
        // Flush previous SVC first
        if (inSVC) flushSVC();
        inSVC = true;
        // SVC01 = procedure composite (HC:97153), SVC02 = billed, SVC03 = paid, SVC04 = revenue, SVC05 = service units
        const procedureComposite = els[1] ?? '';
        const procedureParts = procedureComposite.split(':');
        const procedureCode = procedureParts[1] ?? procedureParts[0] ?? '';
        currentSVC = {
          procedureCode,
          billedAmount: parseAmount(els[2]),
          paidAmount: parseAmount(els[3]),
          allowedAmount: parseAmount(els[3]), // default allowed = paid; CAS may adjust
          serviceDate: '',
        };
        break;
      }
      case 'DTM': {
        // DTM*472 = service date
        if (els[1] === '472' && currentSVC) {
          currentSVC.serviceDate = parseDateYYYYMMDD(els[2] ?? '');
        }
        break;
      }
      case 'CAS': {
        // CAS — claim/service adjustment
        // CAS01 = group code, then triplets of reason/amount/quantity
        const groupCode = els[1] ?? '';
        const groupDesc = ADJUSTMENT_GROUP_DESCRIPTIONS[groupCode] ?? groupCode;

        // CAS can have up to 6 triplets (els[2..19])
        for (let i = 2; i + 1 < els.length; i += 3) {
          const reasonCode = els[i];
          const amount = parseAmount(els[i + 1]);
          if (!reasonCode || isNaN(amount)) break;
          const description = formatAdjustmentReason(reasonCode);
          currentAdjustments.push({
            adjustmentGroupCode: groupCode,
            reasonCode,
            adjustmentAmount: amount,
            description: `${groupDesc}: ${description}`,
          });
          // Update allowed amount if this is CO adjustment
          if (groupCode === 'CO' && currentSVC) {
            const newAllowed = (currentSVC.allowedAmount ?? 0);
            currentSVC.allowedAmount = Math.max(0, newAllowed - amount);
          }
        }
        break;
      }
      default:
        break;
    }
  }

  // Flush last SVC
  if (inSVC) flushSVC();

  // Derive overall claim status
  let claimStatus: ERA835Result['claimStatus'] = 'paid';
  if (claimLines.every((l) => l.claimStatus === 'denied')) {
    claimStatus = 'denied';
  } else if (claimLines.some((l) => l.claimStatus === 'denied' || l.claimStatus === 'partial')) {
    claimStatus = 'partial';
  }

  return {
    checkNumber,
    payerId,
    payerName,
    paymentDate,
    totalPayment,
    claimLines,
    claimStatus,
    patientName,
    memberId,
    npi,
  };
}

// ============================================================================
// Stedi response adapter
// ============================================================================

/**
 * Parse ERA from a Stedi parsed EDI response object.
 * Stedi returns structured JSON from their EDI API — we map their schema.
 */
export function parseERA835FromStediResponse(stediResponse: unknown): ERA835Result {
  const resp = stediResponse as Record<string, unknown>;

  // If Stedi returns raw X12 string, parse it directly
  if (typeof resp['rawX12'] === 'string') {
    return parseERA835(resp['rawX12'] as string);
  }

  // Try Stedi's parsed JSON format
  const interchange = (resp['interchanges'] as unknown[])?.[0] as Record<string, unknown> | undefined;
  const group = (interchange?.['groups'] as unknown[])?.[0] as Record<string, unknown> | undefined;
  const txnSet = (group?.['transaction_sets'] as unknown[])?.[0] as Record<string, unknown> | undefined;
  const heading = txnSet?.['heading'] as Record<string, unknown> | undefined;
  const detail = txnSet?.['detail'] as Record<string, unknown> | undefined;

  const bpr = (heading?.['financial_information_BPR'] as Record<string, unknown>) ?? {};
  const payerN1 = (heading?.['payer_identification_N1_loop'] as Record<string, unknown>) ?? {};
  const trn = (heading?.['reassociation_trace_number_TRN'] as Record<string, unknown>) ?? {};

  const checkNumber = String(trn['trace_type_identifier_02'] ?? bpr['check_issue_or_EFT_effective_date_16'] ?? '');
  const paymentDate = parseDateYYYYMMDD(String(bpr['check_issue_or_EFT_effective_date_16'] ?? ''));
  const totalPayment = parseAmount(String(bpr['monetary_amount_02'] ?? '0'));
  const payerName = String((payerN1['payer_name_N1'] as Record<string, unknown>)?.['name_02'] ?? '');
  const payerId = String((payerN1['payer_name_N1'] as Record<string, unknown>)?.['identification_code_04'] ?? '');

  // Iterate claim payment info loops
  const claimLoops = (detail?.['claim_payment_information_CLP_loop'] as unknown[]) ?? [];
  const claimLines: PaidClaimLine[] = [];
  let patientName = '';
  let memberId = '';
  let npi = '';

  for (const claimLoop of claimLoops) {
    const cl = claimLoop as Record<string, unknown>;
    const clp = (cl['claim_payment_information_CLP'] as Record<string, unknown>) ?? {};

    const nm1Loops = (cl['patient_name_NM1_loop'] as unknown[]) ?? [];
    for (const nm1Loop of nm1Loops) {
      const n = nm1Loop as Record<string, unknown>;
      const nm1 = (n['patient_name_NM1'] as Record<string, unknown>) ?? {};
      const entity = String(nm1['entity_identifier_code_01'] ?? '');
      if (entity === 'QC') {
        const first = String(nm1['name_first_04'] ?? '');
        const last = String(nm1['name_last_or_organization_name_03'] ?? '');
        patientName = [first, last].filter(Boolean).join(' ');
      }
      if (entity === 'IL') {
        memberId = String(nm1['identification_code_09'] ?? '');
      }
    }

    const svcLoops = (cl['service_payment_information_SVC_loop'] as unknown[]) ?? [];
    for (const svcLoop of svcLoops) {
      const sv = svcLoop as Record<string, unknown>;
      const svc = (sv['service_payment_information_SVC'] as Record<string, unknown>) ?? {};
      const procedureComposite = (svc['composite_medical_procedure_identifier_01'] as Record<string, unknown>) ?? {};
      const procedureCode = String(procedureComposite['procedure_code_02'] ?? procedureComposite['product_or_service_id_02'] ?? '');
      const billed = parseAmount(String(svc['line_item_charge_amount_02'] ?? '0'));
      const paid = parseAmount(String(svc['line_item_provider_payment_amount_03'] ?? '0'));

      const dtms = (sv['service_date_DTM'] as unknown[]) ?? [];
      const serviceDate = dtms.length > 0
        ? parseDateYYYYMMDD(String((dtms[0] as Record<string, unknown>)['date_03'] ?? ''))
        : parseDateYYYYMMDD(String(clp['claim_status_code_02'] ?? ''));

      const casGroups = (sv['service_adjustment_CAS'] as unknown[]) ?? [];
      const adjustments: ClaimLineAdjustment[] = [];
      for (const casGroup of casGroups) {
        const cas = casGroup as Record<string, unknown>;
        const groupCode = String(cas['claim_adjustment_group_code_01'] ?? '');
        const groupDesc = ADJUSTMENT_GROUP_DESCRIPTIONS[groupCode] ?? groupCode;
        for (let i = 2; i <= 7; i++) {
          const rc = String(cas[`adjustment_reason_code_${String(i).padStart(2, '0')}${i === 2 ? '' : ''}`] ?? '');
          const amt = parseAmount(String(cas[`adjustment_amount_${String(i).padStart(2, '0')}`] ?? '0'));
          if (!rc) break;
          adjustments.push({
            adjustmentGroupCode: groupCode,
            reasonCode: rc,
            adjustmentAmount: amt,
            description: `${groupDesc}: ${formatAdjustmentReason(rc)}`,
          });
        }
      }

      const prAdj = adjustments.filter((a) => a.adjustmentGroupCode === 'PR');
      const patResp = prAdj.reduce((sum, a) => sum + a.adjustmentAmount, 0);
      const coAdj = adjustments.filter((a) => a.adjustmentGroupCode === 'CO');
      const allowedAmount = Math.max(0, billed - coAdj.reduce((s, a) => s + a.adjustmentAmount, 0));
      const status = deriveLineStatus(paid, billed, adjustments);

      claimLines.push({
        procedureCode,
        serviceDate,
        billedAmount: billed,
        allowedAmount,
        paidAmount: paid,
        patientResponsibility: patResp,
        adjustments,
        claimStatus: status,
        denialReason: status === 'denied'
          ? adjustments.find((a) => a.adjustmentGroupCode === 'CO')?.description
          : undefined,
      });
    }
  }

  let claimStatus: ERA835Result['claimStatus'] = 'paid';
  if (claimLines.length > 0) {
    if (claimLines.every((l) => l.claimStatus === 'denied')) claimStatus = 'denied';
    else if (claimLines.some((l) => l.claimStatus === 'denied' || l.claimStatus === 'partial')) claimStatus = 'partial';
  }

  return {
    checkNumber,
    payerId,
    payerName,
    paymentDate,
    totalPayment,
    claimLines,
    claimStatus,
    patientName,
    memberId,
    npi,
    raw: stediResponse,
  };
}

// ============================================================================
// Mock ERA data for dev/demo
// ============================================================================

function mockERAResult(claimId: string): ERA835Result {
  return {
    checkNumber: `CHK-${claimId.slice(0, 8).toUpperCase()}`,
    payerId: 'BCBS001',
    payerName: 'Blue Cross Blue Shield',
    paymentDate: new Date().toISOString().slice(0, 10),
    totalPayment: 312.5,
    claimStatus: 'partial',
    patientName: 'Jordan Smith',
    memberId: 'XYZ123456789',
    npi: '1234567890',
    claimLines: [
      {
        procedureCode: '97153',
        serviceDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        billedAmount: 250,
        allowedAmount: 187.5,
        paidAmount: 150,
        patientResponsibility: 37.5,
        claimStatus: 'partial',
        adjustments: [
          {
            adjustmentGroupCode: 'CO',
            reasonCode: '45',
            adjustmentAmount: 62.5,
            description: 'Contractual Obligation: Charge exceeds fee schedule / maximum allowed',
          },
          {
            adjustmentGroupCode: 'PR',
            reasonCode: '1',
            adjustmentAmount: 37.5,
            description: 'Patient Responsibility: Deductible Amount',
          },
        ],
      },
      {
        procedureCode: '97155',
        serviceDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        billedAmount: 200,
        allowedAmount: 162.5,
        paidAmount: 162.5,
        patientResponsibility: 0,
        claimStatus: 'paid',
        adjustments: [
          {
            adjustmentGroupCode: 'CO',
            reasonCode: '45',
            adjustmentAmount: 37.5,
            description: 'Contractual Obligation: Charge exceeds fee schedule / maximum allowed',
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Stedi ERA API fetch
// ============================================================================

export async function fetchERAFromStedi(claimId: string): Promise<ERA835Result | null> {
  const apiKey = import.meta.env.VITE_STEDI_API_KEY as string | undefined;

  if (!apiKey) {
    console.warn('[era-835-parser] VITE_STEDI_API_KEY not set — returning mock ERA data');
    return mockERAResult(claimId);
  }

  try {
    const response = await fetch(
      `https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/era/v2?claim_reference_number=${encodeURIComponent(claimId)}`,
      {
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[era-835-parser] Stedi ERA fetch failed:', response.status, response.statusText);
      return null;
    }

    const data: unknown = await response.json();
    return parseERA835FromStediResponse(data);
  } catch (err) {
    console.error('[era-835-parser] Stedi ERA fetch error:', err);
    return null;
  }
}

// ============================================================================
// Appeal check
// ============================================================================

/** Returns true if the ERA has at least one denial that is legally appealable. */
export function isActionableDenial(era: ERA835Result): boolean {
  // Non-appealable reason codes
  const nonAppealable = new Set(['18', '29', '26', '27', '15']);
  return era.claimLines.some((line) => {
    if (line.claimStatus !== 'denied' && line.claimStatus !== 'partial') return false;
    return line.adjustments.some((adj) => {
      const code = adj.reasonCode.replace(/^(CO|PR|OA|PI|CR)-/, '');
      return adj.adjustmentGroupCode === 'CO' && !nonAppealable.has(code);
    });
  });
}
