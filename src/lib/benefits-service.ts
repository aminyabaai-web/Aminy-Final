// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { STATE_BENEFITS, StateBenefitProgram } from './benefits-database';

// ── Lookup ───────────────────────────────────────────────────────────

export function getStateBenefits(stateAbbr: string): StateBenefitProgram | null {
  return STATE_BENEFITS[stateAbbr.toUpperCase()] || null;
}

// ── Eligibility Check ────────────────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean;
  programs: {
    name: string;
    type: 'medicaid_waiver' | 'epsdt' | 'insurance_mandate';
    summary: string;
    nextSteps: string[];
    waitlistWarning?: string;
  }[];
  coveredServices: { name: string; covered: boolean; notes: string }[];
  contactInfo: { agency: string; phone: string; website: string };
}

export function checkEligibility(
  stateAbbr: string,
  childAge: number,
  diagnoses: string[] = ['autism']
): EligibilityResult | null {
  const state = getStateBenefits(stateAbbr);
  if (!state) return null;

  const programs: EligibilityResult['programs'] = [];
  const hasAutism = diagnoses.some(d =>
    d.toLowerCase().includes('autism') || d.toLowerCase().includes('asd') || d === 'F84.0'
  );

  // Check EPSDT eligibility (all children under 21 on Medicaid)
  if (childAge < 21) {
    programs.push({
      name: 'Medicaid EPSDT',
      type: 'epsdt',
      summary: `All children under 21 on Medicaid are entitled to Early and Periodic Screening, Diagnostic, and Treatment (EPSDT) services. This includes ABA, speech, and OT with NO dollar caps.`,
      nextSteps: [
        'Verify Medicaid enrollment or apply if not enrolled',
        'Request ABA/therapy referral through your managed care plan',
        'Cite federal EPSDT mandate (42 U.S.C. § 1396d(r)) if denied',
      ],
    });
  }

  // Check autism insurance mandate
  if (hasAutism && state.autismMandate.exists) {
    const mandate = state.autismMandate;
    const withinAgeCap = !mandate.ageCap || childAge <= mandate.ageCap;
    if (withinAgeCap) {
      programs.push({
        name: `${state.state} Autism Insurance Mandate`,
        type: 'insurance_mandate',
        summary: mandate.summary,
        nextSteps: [
          'Contact your health insurer to request ABA prior authorization',
          `Cite ${state.keyLegalCitations[0]}`,
          mandate.dollarCap ? `Note: annual cap of ${mandate.dollarCap}` : 'No dollar cap — medical necessity standard applies',
          'If denied, request written denial letter for appeal',
        ],
      });
    }
  }

  // Check waiver programs
  for (const waiver of state.medicaidWaivers) {
    const ageOk = waiver.ageRange === 'All ages' ||
      (waiver.ageRange.includes('Under') && childAge < parseInt(waiver.ageRange.replace(/\D/g, ''))) ||
      (waiver.ageRange.includes('+') && childAge >= parseInt(waiver.ageRange.replace(/\D/g, '')));

    if (ageOk) {
      programs.push({
        name: waiver.name,
        type: 'medicaid_waiver',
        summary: waiver.description,
        nextSteps: state.applicationSteps.slice(0, 3),
        waitlistWarning: waiver.waitlistInfo,
      });
    }
  }

  return {
    eligible: programs.length > 0,
    programs,
    coveredServices: state.coveredServices.map(s => ({
      name: s.name,
      covered: s.typicallyCovered,
      notes: s.coverageNotes,
    })),
    contactInfo: state.contactInfo,
  };
}

// ── Recommended Programs ─────────────────────────────────────────────

export function getRecommendedPrograms(
  stateAbbr: string,
  concerns: string[]
): { name: string; relevance: string; coveredServices: string[] }[] {
  const state = getStateBenefits(stateAbbr);
  if (!state) return [];

  const normalizedConcerns = concerns.map(c => c.toLowerCase());
  const results: { name: string; relevance: string; coveredServices: string[] }[] = [];

  for (const waiver of state.medicaidWaivers) {
    const matchingServices = waiver.coveredServices.filter(svc =>
      normalizedConcerns.some(c =>
        svc.toLowerCase().includes(c) ||
        c.includes(svc.toLowerCase().split(' ')[0])
      )
    );
    if (matchingServices.length > 0 || normalizedConcerns.length === 0) {
      results.push({
        name: waiver.name,
        relevance: matchingServices.length > 0
          ? `Covers: ${matchingServices.join(', ')}`
          : 'Comprehensive DD services available',
        coveredServices: waiver.coveredServices,
      });
    }
  }

  return results;
}

// ── Appeal Letter Generation ─────────────────────────────────────────

export interface AppealLetterParams {
  childName: string;
  childAge: number;
  parentName: string;
  insuranceCompany: string;
  serviceRequested: string[];
  providerName?: string;
  diagnosisCodes?: string[];
  state: string;
  denialDate?: string;
  denialReason?: string;
}

export function generateAppealLetter(params: AppealLetterParams): string {
  const stateData = getStateBenefits(params.state);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const serviceList = params.serviceRequested.join(', ');
  const diagCodes = params.diagnosisCodes?.length
    ? params.diagnosisCodes.join(', ')
    : 'F84.0 (Autism Spectrum Disorder)';

  const mandate = stateData?.autismMandate;
  const citations = stateData?.keyLegalCitations || [];

  let letter = `${today}

${params.insuranceCompany}
Appeals Department

RE: Appeal of Denial — ${serviceList}
Patient: ${params.childName} (Age ${params.childAge})
Diagnosis: ${diagCodes}

Dear Appeals Review Committee,

I am writing to formally appeal the denial of ${serviceList} for my child, ${params.childName}, age ${params.childAge}. ${params.childName} has been diagnosed with ${diagCodes} and requires these services as medically necessary treatment.`;

  if (params.denialDate) {
    letter += `\n\nThe denial was issued on ${params.denialDate}.`;
    if (params.denialReason) {
      letter += ` The stated reason was: "${params.denialReason}."`;
    }
  }

  letter += `\n\nMEDICAL NECESSITY
${params.childName}'s treating ${params.providerName ? `provider, ${params.providerName},` : 'healthcare provider'} has determined that ${serviceList} ${params.serviceRequested.length > 1 ? 'are' : 'is'} medically necessary for ${params.childName}'s continued development and wellbeing. Applied Behavior Analysis (ABA) therapy and related services are the gold-standard, evidence-based treatments recommended by the American Academy of Pediatrics, the U.S. Surgeon General, and the National Institutes of Health for individuals with autism spectrum disorder.`;

  if (mandate?.exists) {
    letter += `\n\nSTATE LAW REQUIREMENTS
Under ${citations[0] || `${stateData?.state} state law`}, health insurers are required to cover diagnosis and treatment of autism spectrum disorder, including ABA therapy. ${mandate.summary}`;
  }

  letter += `\n\nFEDERAL PROTECTIONS
Under the Mental Health Parity and Addiction Equity Act (MHPAEA), health plans cannot impose more restrictive limitations on behavioral health benefits than on medical/surgical benefits. Additionally, for Medicaid-enrolled children under 21, the Early and Periodic Screening, Diagnostic, and Treatment (EPSDT) mandate (42 U.S.C. § 1396d(r)) requires coverage of all medically necessary services.`;

  letter += `\n\nREQUEST
I respectfully request that you reverse the denial and authorize ${serviceList} for ${params.childName}. If this appeal is denied, please provide a detailed written explanation of the medical criteria used in making this determination, as required by law.

I reserve the right to pursue an external appeal and/or file a complaint with the ${stateData?.state || 'state'} Department of Insurance if this matter is not resolved.

Sincerely,
${params.parentName}

cc: ${params.providerName || '[Treating Provider]'}
    ${stateData?.state || ''} Department of Insurance`;

  if (citations.length > 0) {
    letter += `\n\nLEGAL CITATIONS:
${citations.map(c => `• ${c}`).join('\n')}`;
  }

  return letter;
}
