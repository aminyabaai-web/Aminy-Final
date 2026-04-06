// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * BAA (Business Associate Agreement) Template Generator
 *
 * Generates HIPAA Business Associate Agreements from structured templates.
 * Outputs a structured JSON representation suitable for PDF generation via
 * the existing jsPDF patterns used elsewhere in the app.
 *
 * References:
 * - HIPAA §164.502(e) — BAA requirement
 * - HIPAA §164.504(e) — BAA content requirements
 * - 45 CFR Part 164, Subpart C — Security Standards
 *
 * Usage:
 *   import { generateBAA } from '../lib/baa-generator';
 *
 *   const baa = generateBAA({
 *     coveredEntityName: 'Aminy Health Inc.',
 *     businessAssociateName: 'TherapyWorks LLC',
 *     effectiveDate: '2026-03-01',
 *     servicesDescription: 'Cloud-based therapy session management...',
 *     permittedUses: ['Treatment', 'Payment', 'Healthcare Operations'],
 *   });
 *
 *   // baa.sections => structured content for PDF rendering
 *   // baa.metadata => agreement metadata
 */

// ============================================================================
// Types
// ============================================================================

export interface BAAInput {
  /** Name of the Covered Entity (e.g., the healthcare provider org) */
  coveredEntityName: string;
  /** Name of the Business Associate (e.g., the vendor) */
  businessAssociateName: string;
  /** Effective date of the agreement (ISO date string YYYY-MM-DD) */
  effectiveDate: string;
  /** Description of services the BA provides to the CE */
  servicesDescription: string;
  /** Permitted uses and disclosures of PHI */
  permittedUses: string[];
  /** Contact name for the Covered Entity (optional) */
  coveredEntityContact?: string;
  /** Contact name for the Business Associate (optional) */
  businessAssociateContact?: string;
  /** State governing law (default: 'Arizona') */
  governingState?: string;
  /** Agreement term in months (default: 12) */
  termMonths?: number;
  /** Whether BA is permitted to de-identify data (default: false) */
  permitDeIdentification?: boolean;
  /** Whether BA is permitted to use aggregate data (default: false) */
  permitAggregateUse?: boolean;
  /** Breach notification timeline in hours (default: 72) */
  breachNotificationHours?: number;
}

export interface BAASection {
  /** Section number (e.g., "1", "2.a") */
  number: string;
  /** Section title */
  title: string;
  /** Section body content (may contain multiple paragraphs) */
  content: string[];
}

export interface BAADocument {
  /** Document title */
  title: string;
  /** Generation metadata */
  metadata: {
    generatedAt: string;
    coveredEntity: string;
    businessAssociate: string;
    effectiveDate: string;
    expirationDate: string;
    governingState: string;
    templateVersion: string;
  };
  /** Preamble text (before numbered sections) */
  preamble: string[];
  /** Numbered sections of the BAA */
  sections: BAASection[];
  /** Signature block */
  signatureBlock: {
    coveredEntity: {
      name: string;
      contact: string;
      signatureLine: string;
      dateLine: string;
    };
    businessAssociate: {
      name: string;
      contact: string;
      signatureLine: string;
      dateLine: string;
    };
  };
}

// ============================================================================
// Constants
// ============================================================================

const TEMPLATE_VERSION = '1.0.0';

// ============================================================================
// Generator
// ============================================================================

/**
 * Generate a complete HIPAA Business Associate Agreement document.
 */
export function generateBAA(input: BAAInput): BAADocument {
  const {
    coveredEntityName,
    businessAssociateName,
    effectiveDate,
    servicesDescription,
    permittedUses,
    coveredEntityContact = 'Authorized Representative',
    businessAssociateContact = 'Authorized Representative',
    governingState = 'Arizona',
    termMonths = 12,
    permitDeIdentification = false,
    permitAggregateUse = false,
    breachNotificationHours = 72,
  } = input;

  // Calculate expiration date
  const effDate = new Date(effectiveDate);
  const expDate = new Date(effDate);
  expDate.setMonth(expDate.getMonth() + termMonths);
  const expirationDate = expDate.toISOString().split('T')[0];

  const formattedEffDate = formatDate(effectiveDate);
  const formattedExpDate = formatDate(expirationDate);

  const ce = coveredEntityName;
  const ba = businessAssociateName;

  return {
    title: 'HIPAA BUSINESS ASSOCIATE AGREEMENT',
    metadata: {
      generatedAt: new Date().toISOString(),
      coveredEntity: ce,
      businessAssociate: ba,
      effectiveDate,
      expirationDate,
      governingState,
      templateVersion: TEMPLATE_VERSION,
    },
    preamble: [
      `This Business Associate Agreement ("Agreement") is entered into as of ${formattedEffDate} ("Effective Date") by and between:`,
      `${ce} ("Covered Entity"), and`,
      `${ba} ("Business Associate").`,
      '',
      `This Agreement is entered into in compliance with the Health Insurance Portability and Accountability Act of 1996 ("HIPAA"), the Health Information Technology for Economic and Clinical Health Act ("HITECH"), and their implementing regulations at 45 CFR Parts 160 and 164 (collectively, the "HIPAA Rules").`,
      '',
      `WHEREAS, Covered Entity and Business Associate have entered into or intend to enter into an arrangement whereby Business Associate will provide the following services: ${servicesDescription}`,
      '',
      'WHEREAS, the provision of such services may involve Business Associate\'s use or disclosure of Protected Health Information ("PHI") as defined by the HIPAA Rules;',
      '',
      'NOW, THEREFORE, in consideration of the mutual promises and covenants herein, the parties agree as follows:',
    ],
    sections: [
      // --- Section 1: Definitions ---
      {
        number: '1',
        title: 'DEFINITIONS',
        content: [
          'Terms used but not otherwise defined in this Agreement shall have the same meaning as those terms in the HIPAA Rules. The following definitions apply:',
          `(a) "Breach" means the acquisition, access, use, or disclosure of PHI in a manner not permitted under the HIPAA Privacy Rule which compromises the security or privacy of the PHI, as defined in 45 CFR 164.402.`,
          `(b) "Protected Health Information" or "PHI" means individually identifiable health information transmitted or maintained in any form or medium, as defined in 45 CFR 160.103.`,
          `(c) "Electronic Protected Health Information" or "ePHI" means PHI that is transmitted or maintained in electronic media, as defined in 45 CFR 160.103.`,
          `(d) "Security Incident" means the attempted or successful unauthorized access, use, disclosure, modification, or destruction of information or interference with system operations in an information system, as defined in 45 CFR 164.304.`,
          `(e) "Subcontractor" means a person to whom Business Associate delegates a function, activity, or service, other than in the capacity of a member of the workforce of such Business Associate.`,
        ],
      },

      // --- Section 2: Obligations of Business Associate ---
      {
        number: '2',
        title: 'OBLIGATIONS OF BUSINESS ASSOCIATE',
        content: [
          'Business Associate agrees to:',
          '(a) Not use or disclose PHI other than as permitted or required by this Agreement or as required by law.',
          '(b) Use appropriate administrative, physical, and technical safeguards, and comply with the Security Rule with respect to ePHI, to prevent use or disclosure of PHI other than as provided for by this Agreement.',
          '(c) Report to Covered Entity any use or disclosure of PHI not provided for by this Agreement of which it becomes aware, including any Security Incident or Breach.',
          '(d) In accordance with 45 CFR 164.502(e)(1)(ii) and 164.308(b)(2), ensure that any Subcontractors that create, receive, maintain, or transmit PHI on behalf of Business Associate agree to the same restrictions, conditions, and requirements that apply to Business Associate under this Agreement.',
          '(e) Make available PHI in a Designated Record Set to Covered Entity or, as directed by Covered Entity, to an Individual, as necessary to satisfy Covered Entity\'s obligations under 45 CFR 164.524.',
          '(f) Make PHI available for amendment and incorporate any amendments to PHI as directed by Covered Entity, as necessary to satisfy Covered Entity\'s obligations under 45 CFR 164.526.',
          '(g) Maintain and make available the information required to provide an accounting of disclosures to Covered Entity as necessary to satisfy Covered Entity\'s obligations under 45 CFR 164.528.',
          '(h) To the extent Business Associate carries out Covered Entity\'s obligation(s) under the HIPAA Privacy Rule, comply with the requirements of the HIPAA Privacy Rule that apply to Covered Entity in the performance of such obligation(s).',
          '(i) Make its internal practices, books, and records available to the Secretary of the U.S. Department of Health and Human Services for purposes of determining compliance with the HIPAA Rules.',
          '(j) Implement and maintain encryption of ePHI at rest and in transit using AES-256 or equivalent encryption standards.',
          '(k) Implement access controls ensuring only authorized personnel can access PHI, including unique user identification, emergency access procedures, automatic logoff, and encryption/decryption mechanisms.',
        ],
      },

      // --- Section 3: Permitted Uses and Disclosures ---
      {
        number: '3',
        title: 'PERMITTED USES AND DISCLOSURES',
        content: [
          `Business Associate may use or disclose PHI only for the following purposes:`,
          ...permittedUses.map((use, i) => `(${String.fromCharCode(97 + i)}) ${use}.`),
          '',
          'Business Associate may use PHI for the proper management and administration of Business Associate or to carry out the legal responsibilities of Business Associate.',
          'Business Associate may disclose PHI for the proper management and administration of Business Associate, provided that (i) the disclosures are required by law, or (ii) Business Associate obtains reasonable assurances from the person to whom the information is disclosed that the information will remain confidential and be used or further disclosed only as required by law or for the purposes for which it was disclosed.',
          permitDeIdentification
            ? 'Business Associate may de-identify PHI in accordance with 45 CFR 164.514(a)-(c), provided that such de-identified data shall not be considered PHI under this Agreement.'
            : 'Business Associate shall NOT de-identify PHI without prior written consent from Covered Entity.',
          permitAggregateUse
            ? 'Business Associate may use PHI to provide Data Aggregation services to Covered Entity as permitted by 45 CFR 164.504(e)(2)(i)(B).'
            : 'Business Associate shall NOT create aggregate data from PHI without prior written consent from Covered Entity.',
        ],
      },

      // --- Section 4: Breach Notification ---
      {
        number: '4',
        title: 'BREACH NOTIFICATION',
        content: [
          `(a) Business Associate shall report to Covered Entity any Breach of Unsecured PHI without unreasonable delay and in no case later than ${breachNotificationHours} hours after discovery of such Breach.`,
          '(b) The notification shall include, to the extent possible:',
          '    (i) Identification of each Individual whose Unsecured PHI has been, or is reasonably believed to have been, accessed, acquired, used, or disclosed during the Breach;',
          '    (ii) A brief description of what happened, including the date of the Breach and the date of discovery;',
          '    (iii) A description of the types of Unsecured PHI involved (e.g., full name, Social Security number, date of birth, home address, diagnosis);',
          '    (iv) Steps Business Associate has taken or will take to investigate, mitigate harm, and prevent future Breaches;',
          '    (v) Contact information for the Business Associate representative who can provide additional information.',
          '(c) Business Associate shall cooperate with Covered Entity in providing notification to affected Individuals, the Secretary of HHS, and the media (if required) in accordance with 45 CFR Part 164, Subpart D.',
          '(d) Business Associate shall mitigate, to the extent practicable, any harmful effect known to Business Associate of a use or disclosure of PHI by Business Associate in violation of this Agreement.',
        ],
      },

      // --- Section 5: Term and Termination ---
      {
        number: '5',
        title: 'TERM AND TERMINATION',
        content: [
          `(a) Term. This Agreement shall be effective as of ${formattedEffDate} and shall terminate on ${formattedExpDate}, or when all PHI provided by Covered Entity to Business Associate is destroyed or returned to Covered Entity, whichever occurs later.`,
          '(b) Termination for Cause. Either party may terminate this Agreement upon thirty (30) days\' written notice if the other party materially breaches this Agreement and fails to cure the breach within the notice period.',
          '(c) Covered Entity may immediately terminate this Agreement if Business Associate has breached a material term of this Agreement and cure is not possible.',
          '(d) Effect of Termination. Upon termination, Business Associate shall:',
          '    (i) Return or destroy all PHI received from Covered Entity, or created or received on behalf of Covered Entity, if feasible;',
          '    (ii) If return or destruction is not feasible, extend the protections of this Agreement to the PHI retained and limit further uses and disclosures to those purposes that make return or destruction infeasible;',
          '    (iii) Continue to use appropriate safeguards to prevent unauthorized use or disclosure of PHI for as long as Business Associate retains PHI.',
        ],
      },

      // --- Section 6: General Provisions ---
      {
        number: '6',
        title: 'GENERAL PROVISIONS',
        content: [
          `(a) Governing Law. This Agreement shall be governed by the laws of the State of ${governingState} and applicable federal law.`,
          '(b) Amendment. This Agreement may be amended only by mutual written agreement of the parties. The parties agree to negotiate in good faith any amendments necessary to ensure compliance with changes in HIPAA Rules.',
          '(c) Survival. The obligations of Business Associate under Section 5(d) shall survive the termination of this Agreement.',
          '(d) Interpretation. Any ambiguity in this Agreement shall be resolved in favor of a meaning that permits Covered Entity to comply with the HIPAA Rules.',
          '(e) Indemnification. Business Associate shall indemnify, defend, and hold harmless Covered Entity from and against any claims, losses, or damages arising from Business Associate\'s breach of this Agreement.',
          '(f) Entire Agreement. This Agreement, together with any underlying service agreement, constitutes the entire agreement between the parties with respect to the subject matter hereof.',
          '(g) Notices. All notices required under this Agreement shall be in writing and delivered to the respective parties at the addresses set forth in the signature block below.',
        ],
      },
    ],
    signatureBlock: {
      coveredEntity: {
        name: ce,
        contact: coveredEntityContact,
        signatureLine: '________________________________________',
        dateLine: 'Date: ___________________',
      },
      businessAssociate: {
        name: ba,
        contact: businessAssociateContact,
        signatureLine: '________________________________________',
        dateLine: 'Date: ___________________',
      },
    },
  };
}

/**
 * Convert a BAA document to a flat text representation.
 * Useful for preview or when PDF generation is not available.
 */
export function baaToText(doc: BAADocument): string {
  const lines: string[] = [];

  lines.push(doc.title);
  lines.push('='.repeat(doc.title.length));
  lines.push('');

  for (const p of doc.preamble) {
    lines.push(p);
  }
  lines.push('');

  for (const section of doc.sections) {
    lines.push(`${section.number}. ${section.title}`);
    lines.push('-'.repeat(section.title.length + section.number.length + 2));
    for (const line of section.content) {
      lines.push(line);
    }
    lines.push('');
  }

  lines.push('SIGNATURE BLOCK');
  lines.push('');
  lines.push(`COVERED ENTITY: ${doc.signatureBlock.coveredEntity.name}`);
  lines.push(`By: ${doc.signatureBlock.coveredEntity.contact}`);
  lines.push(doc.signatureBlock.coveredEntity.signatureLine);
  lines.push(doc.signatureBlock.coveredEntity.dateLine);
  lines.push('');
  lines.push(`BUSINESS ASSOCIATE: ${doc.signatureBlock.businessAssociate.name}`);
  lines.push(`By: ${doc.signatureBlock.businessAssociate.contact}`);
  lines.push(doc.signatureBlock.businessAssociate.signatureLine);
  lines.push(doc.signatureBlock.businessAssociate.dateLine);

  return lines.join('\n');
}

/**
 * Convert a BAA document to a structured JSON payload suitable for
 * PDF generation via jsPDF (matching the existing pattern used in
 * WeeklyOutcomesPDF and clinical reports).
 */
export function baaToJSON(doc: BAADocument): Record<string, unknown> {
  return {
    type: 'baa-document',
    version: TEMPLATE_VERSION,
    metadata: doc.metadata,
    content: {
      title: doc.title,
      preamble: doc.preamble,
      sections: doc.sections.map(s => ({
        number: s.number,
        title: s.title,
        paragraphs: s.content,
      })),
      signatures: doc.signatureBlock,
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default {
  generateBAA,
  baaToText,
  baaToJSON,
};
