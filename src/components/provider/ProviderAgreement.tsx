// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderAgreement — Click-to-accept legal agreement
 *
 * Providers must accept this agreement during registration.
 * Professional, serious design with section-by-section acknowledgment.
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Check,
  Printer,
  Download,
  Shield,
  Scale,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lock,
  Clock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgreementAcceptance {
  acceptedAt: string; // ISO timestamp
  providerName: string;
  providerEmail: string;
  ipAddress?: string;
  sections: {
    nonSolicitation: boolean;
    payment: boolean;
    liability: boolean;
  };
}

interface ProviderAgreementProps {
  providerName: string;
  providerEmail: string;
  onAccept: (acceptance: AgreementAcceptance) => void;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Agreement Sections
// ---------------------------------------------------------------------------

interface AgreementSection {
  id: string;
  title: string;
  requiresCheckbox?: 'nonSolicitation' | 'payment' | 'liability';
  content: string;
}

const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    id: 'platform-services',
    title: '1. Platform Services',
    content: `Aminy, Inc. ("Aminy" or "Platform") provides a technology platform that facilitates the delivery of behavioral health services between licensed providers ("Provider") and families ("Clients"). Platform services include, but are not limited to: appointment scheduling, secure telehealth video infrastructure, family engagement tools, clinical documentation support, electronic visit verification (EVV), claims processing, and payment processing.

Aminy is a technology platform and does not provide healthcare services. Provider acknowledges that all clinical decisions, treatment plans, and client care are the sole responsibility of the Provider.`,
  },
  {
    id: 'referral-attribution',
    title: '2. Client Referral & Attribution',
    content: `Aminy invests significant resources in client acquisition, marketing, and community engagement to connect families with qualified providers. When a Client is referred to Provider through the Aminy Platform ("Aminy-Referred Client"), such referral is tracked and attributed to Aminy.

Provider acknowledges and agrees that:
(a) Aminy-Referred Clients are acquired through Aminy's marketing, technology, and community efforts;
(b) Aminy maintains a legitimate business interest in the ongoing relationship between Aminy-Referred Clients and the Platform;
(c) Provider shall facilitate all scheduling, communication, and payment for Aminy-Referred Clients through the Platform.`,
  },
  {
    id: 'non-solicitation',
    title: '3. Non-Solicitation',
    requiresCheckbox: 'nonSolicitation',
    content: `Provider shall not, directly or indirectly, solicit, contact, encourage, or accept any Aminy-Referred Client for the provision of services outside the Aminy Platform for a period of twenty-four (24) months from the date of the last session conducted through the Platform with such Client (the "Restricted Period").

This restriction applies to all forms of solicitation, including but not limited to: direct outreach, providing personal contact information, suggesting off-platform booking, or accepting client-initiated requests for off-platform services.

LIQUIDATED DAMAGES: In the event of a breach of this Section 3, Provider agrees to pay Aminy liquidated damages in the amount of TWENTY-FIVE THOUSAND DOLLARS ($25,000) per Client OR twenty-four (24) months of projected Platform Fees attributable to such Client, whichever is greater. The parties acknowledge that actual damages from such breach would be difficult to calculate and that this liquidated damages amount represents a reasonable estimate of Aminy's anticipated losses.`,
  },
  {
    id: 'non-circumvention',
    title: '4. Non-Circumvention',
    content: `Provider shall not engage in any conduct intended to circumvent the Platform or reduce Platform Fees owed to Aminy, including but not limited to:
(a) Encouraging Clients to schedule, communicate, or pay for services outside the Platform;
(b) Providing Clients with alternative scheduling links, personal phone numbers, or direct billing options for services that would otherwise be conducted through the Platform;
(c) Referring Aminy-Referred Clients to other providers outside the Platform;
(d) Creating or using a separate business entity to provide services to Aminy-Referred Clients outside the Platform.`,
  },
  {
    id: 'payment-terms',
    title: '5. Payment Terms',
    requiresCheckbox: 'payment',
    content: `All payments for services rendered through the Aminy Platform shall be processed by Aminy. Aminy shall collect payment from Clients and distribute Provider compensation as follows:

(a) Provider shall be paid bi-weekly via direct deposit (ACH transfer) to the bank account designated by Provider;
(b) Payment shall be made within five (5) business days following the end of each bi-weekly pay period;
(c) Aminy shall provide an itemized statement with each payment showing sessions completed, fees collected, Platform Fees retained, and net Provider compensation;
(d) Provider is responsible for all applicable taxes on compensation received.

Aminy retains a Platform Fee (as defined in the applicable Service Schedule) from each session. The Platform Fee percentage varies by service type and is specified in the Service Schedule attached hereto.`,
  },
  {
    id: 'fee-structure',
    title: '6. Platform Fee Structure',
    content: `The Platform Fee structure depends on the source of the Client relationship:

AMINY-REFERRED PATIENTS: Aminy retains a percentage of each session fee as specified in the Service Schedule. This fee compensates Aminy for client acquisition, technology infrastructure, billing, and payment processing.

PROVIDER'S OWN PATIENTS: For Clients brought to the Platform by Provider ("Provider-Sourced Clients"), Provider may use the Platform on a Software-as-a-Service (SaaS) basis for a flat monthly fee of $49 to $99 per month (based on feature tier selected). No per-session Platform Fee applies to Provider-Sourced Clients.

Provider may have both Aminy-Referred and Provider-Sourced Clients on the Platform simultaneously, with different fee structures applying to each.`,
  },
  {
    id: 'in-clinic-transition',
    title: '7. In-Clinic Transition',
    content: `If an Aminy-Referred Client transitions from telehealth services to in-clinic services with Provider, the following terms apply:

(a) A one-time transition fee of TWO THOUSAND FIVE HUNDRED DOLLARS ($2,500) is due to Aminy within thirty (30) days of the first in-clinic visit;
(b) A Platform Access Fee of five percent (5%) of all fees collected from such Client shall be paid to Aminy for a period of twelve (12) months following the transition;
(c) Provider shall continue to use the Platform for scheduling, documentation, and family engagement features for transitioned Clients during the 12-month period;
(d) All non-solicitation provisions remain in effect regardless of transition.`,
  },
  {
    id: 'liability-insurance',
    title: '8. Liability & Insurance',
    requiresCheckbox: 'liability',
    content: `Provider shall maintain, at Provider's sole expense, professional liability (malpractice) insurance with minimum coverage of $1,000,000 per occurrence and $3,000,000 aggregate throughout the term of this Agreement.

Provider shall provide proof of insurance to Aminy upon request and shall notify Aminy within five (5) business days of any material change to coverage.

DISCLAIMER: Aminy is a technology platform and is not a healthcare provider, employer, or agent of Provider. Aminy does not control, direct, or supervise Provider's clinical judgment, treatment decisions, or client care. Provider is solely responsible for all clinical services rendered and for compliance with all applicable laws, regulations, and professional standards.

Aminy disclaims all liability for clinical outcomes, treatment decisions, or malpractice arising from services rendered by Provider through the Platform.`,
  },
  {
    id: 'ip-content',
    title: '9. Intellectual Property & Content',
    content: `CLINICAL DOCUMENTATION: All clinical notes, treatment plans, assessments, and other clinical documentation created by Provider belong to Provider and are subject to applicable healthcare regulations regarding client records.

PLATFORM DATA: All data generated through the Platform's technology features, including but not limited to family engagement metrics, Ease scores, session analytics, Client satisfaction data, and usage patterns ("Platform Data"), is the property of Aminy.

PROVIDER CONTENT: Provider grants Aminy a non-exclusive, royalty-free license to use Provider's name, likeness, credentials, and biography for marketing and promotional purposes on the Platform. Provider may revoke this license upon written notice with thirty (30) days' effect.`,
  },
  {
    id: 'termination',
    title: '10. Termination',
    content: `Either party may terminate this Agreement with thirty (30) days' written notice to the other party.

Upon termination:
(a) Provider's access to the Platform shall be deactivated at the end of the notice period;
(b) Aminy-Referred Clients shall be reassigned to other providers on the Platform, with reasonable transition support;
(c) Provider shall complete all pending sessions and documentation within the notice period;
(d) Aminy shall make final payment to Provider within thirty (30) days of termination;
(e) The Non-Solicitation provisions of Section 3 shall survive termination for the full Restricted Period;
(f) The Non-Circumvention provisions of Section 4 shall survive termination for twenty-four (24) months.

Aminy may terminate this Agreement immediately for cause, including but not limited to: breach of non-solicitation provisions, loss of licensure, malpractice, fraud, or conduct detrimental to the Platform or its Clients.`,
  },
  {
    id: 'governing-law',
    title: '11. Governing Law',
    content: `This Agreement shall be governed by and construed in accordance with the laws of the State of Arizona, without regard to conflict of law principles.

Any dispute arising under or in connection with this Agreement shall be resolved exclusively in the state or federal courts located in Maricopa County, Arizona. Each party consents to the personal jurisdiction of such courts.

The prevailing party in any legal action arising from this Agreement shall be entitled to recover reasonable attorneys' fees and costs from the non-prevailing party.`,
  },
  {
    id: 'intellectual-property',
    title: '12. Intellectual Property',
    content: `12.1 Provider Content License. Provider grants Aminy a non-exclusive, worldwide, royalty-free license to use, display, and distribute de-identified clinical insights, aggregate outcome data, and platform usage patterns generated through Provider's use of the Platform for purposes of platform improvement, research, and marketing (in aggregated, non-identifiable form only).

12.2 Platform IP. All technology, algorithms, AI models, and platform infrastructure are and remain the sole property of Aminy. Provider acquires no intellectual property rights by using the Platform.

12.3 Work Product. Clinical notes, session recordings, and client-specific documentation remain the property of Provider and/or Client, subject to Platform's license to store and process such data per the BAA.

12.4 Feedback License. Any suggestions, ideas, or feedback Provider provides to Aminy regarding the Platform are hereby assigned to Aminy without restriction or compensation.`,
  },
];

// ---------------------------------------------------------------------------
// Section Component
// ---------------------------------------------------------------------------

interface SectionBlockProps {
  section: AgreementSection;
  index: number;
  checked: boolean;
  onCheck?: (checked: boolean) => void;
}

function SectionBlock({ section, index, checked, onCheck }: SectionBlockProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="border border-[#E8E4DF] rounded-xl overflow-hidden"
    >
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[#FAF7F2] hover:bg-[#F0EDE8] transition-colors text-left"
      >
        <span className="font-semibold text-[#1B2733] text-sm">{section.title}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {/* Section Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4">
              <div className="text-sm text-[#5A6B7A] leading-relaxed whitespace-pre-line font-[system-ui]">
                {section.content}
              </div>

              {/* Checkbox for key sections */}
              {section.requiresCheckbox && onCheck && (
                <label className="flex items-start gap-3 mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onCheck(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#6B9080] focus:ring-teal-500 accent-teal-600"
                  />
                  <span className="text-sm text-amber-800 font-medium">
                    I have read and understand{' '}
                    {section.requiresCheckbox === 'nonSolicitation' &&
                      'the Non-Solicitation terms, including the $25,000 liquidated damages provision'}
                    {section.requiresCheckbox === 'payment' &&
                      'the Payment Terms and Platform Fee structure'}
                    {section.requiresCheckbox === 'liability' &&
                      'the Liability and Insurance requirements'}
                  </span>
                </label>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProviderAgreement({
  providerName,
  providerEmail,
  onAccept,
  onBack,
}: ProviderAgreementProps) {
  const [checks, setChecks] = useState({
    nonSolicitation: false,
    payment: false,
    liability: false,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const allChecked = checks.nonSolicitation && checks.payment && checks.liability;

  const handleCheck = useCallback(
    (key: 'nonSolicitation' | 'payment' | 'liability', value: boolean) => {
      setChecks((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleAccept = useCallback(() => {
    if (!allChecked) return;

    const acceptance: AgreementAcceptance = {
      acceptedAt: new Date().toISOString(),
      providerName,
      providerEmail,
      sections: { ...checks },
    };
    onAccept(acceptance);
  }, [allChecked, checks, providerName, providerEmail, onAccept]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-5 border-b border-[#E8E4DF]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1B2733]">Provider Services Agreement</h1>
            <p className="text-xs text-[#5A6B7A]">Aminy, Inc. — Effective Date: Upon Acceptance</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            11 Sections
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            ~10 min read
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 text-[#5A6B7A] hover:text-[#3A4A57] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Download
          </button>
        </div>
      </div>

      {/* Preamble */}
      <div className="px-5 py-4 bg-[#FAF7F2] border-b border-[#E8E4DF]">
        <p className="text-sm text-[#5A6B7A] leading-relaxed">
          This Provider Services Agreement ("Agreement") is entered into between{' '}
          <strong>Aminy, Inc.</strong>, an Arizona corporation ("Aminy"), and{' '}
          <strong>{providerName || '[Provider Name]'}</strong> ("Provider"), effective as of the
          date of electronic acceptance below.
        </p>
      </div>

      {/* Sections */}
      <div ref={scrollRef} className="px-5 py-5 space-y-3">
        {AGREEMENT_SECTIONS.map((section, i) => (
          <SectionBlock
            key={section.id}
            section={section}
            index={i}
            checked={section.requiresCheckbox ? checks[section.requiresCheckbox] : false}
            onCheck={
              section.requiresCheckbox
                ? (val) => handleCheck(section.requiresCheckbox!, val)
                : undefined
            }
          />
        ))}
      </div>

      {/* Acceptance Footer */}
      <div className="px-5 pt-4 pb-6 border-t border-[#E8E4DF] bg-white sticky bottom-0">
        {/* Checklist status */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          {(['nonSolicitation', 'payment', 'liability'] as const).map((key) => (
            <span
              key={key}
              className={`flex items-center gap-1 ${
                checks[key] ? 'text-[#6B9080]' : 'text-slate-400'
              }`}
            >
              {checks[key] ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {key === 'nonSolicitation' && 'Non-Solicitation'}
              {key === 'payment' && 'Payment'}
              {key === 'liability' && 'Liability'}
            </span>
          ))}
        </div>

        {/* E-Signature notice */}
        <div className="flex items-start gap-2 mb-4 p-3 bg-[#FAF7F2] rounded-lg text-xs text-[#5A6B7A]">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            By clicking "Accept Agreement," you are signing this agreement electronically.
            Your name, email, and timestamp will be recorded as your e-signature:{' '}
            <strong className="text-[#3A4A57]">{providerName}</strong> ({providerEmail})
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="py-3 px-5 text-sm text-[#5A6B7A] hover:text-[#3A4A57] font-medium rounded-xl hover:bg-[#FAF7F2] transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleAccept}
            disabled={!allChecked}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              allChecked
                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                : 'bg-[#E8E4DF] text-slate-400 cursor-not-allowed'
            }`}
          >
            <Shield className="w-4 h-4" />
            Accept Agreement
          </button>
        </div>
      </div>
    </div>
  );
}
