// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderBillingHelp.tsx
 *
 * Provider billing help center — category tabs with Q&A, video placeholders,
 * CPT/modifier quick reference, and AI support tab.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  HelpCircle,
  MessageSquare,
  Play,
  Search,
  Send,
  Sparkles,
} from 'lucide-react';

interface ProviderBillingHelpProps {
  onBack?: () => void;
}

type CategoryId = 'claim-submission' | 'prior-auth' | 'credentialing' | 'evv' | 'denial-appeals' | 'rate-negotiation' | 'ai-support';

interface FAQ {
  q: string;
  a: string;
  hasVideo?: boolean;
  videoTitle?: string;
  videoDuration?: string;
}

interface Category {
  id: CategoryId;
  label: string;
  icon: React.ReactNode;
  faqs: FAQ[];
}

const CATEGORIES: Category[] = [
  {
    id: 'claim-submission',
    label: 'Claim Submission',
    icon: <FileText size={15} />,
    faqs: [
      {
        q: 'What CPT codes do I use for ABA services?',
        a: `The core ABA CPT codes are:
• H2019 — Behavior Treatment by a technician (per 15 min) — used for RBT-delivered direct therapy
• H0032 — BCBA Mental Health Service Plan (per 15 min) — used for supervision
• H0031 — Mental Health Assessment by non-physician (per 15 min)
• 97151 — Behavior Identification Assessment (per 15 min)
• 97152 — Behavior Identification Supporting Assessment (per 15 min)
• 97153 — Adaptive Behavior Treatment by technician (per 15 min)
• 97155 — Adaptive Behavior Treatment by BCBA (per 15 min)
• 97156 — Family Adaptive Behavior Treatment Guidance (per 15 min)
• 97157 — Multiple-Family Group Adaptive Behavior Treatment Guidance

AHCCCS uses the H-codes; commercial payers vary — always check payer-specific guidelines.`,
        hasVideo: true,
        videoTitle: 'ABA CPT Code Guide: H-codes vs. 97xxx',
        videoDuration: '4 min',
      },
      {
        q: 'What is a place of service (POS) code and which do I use?',
        a: `POS codes tell the payer where the service was delivered:
• 02 — Telehealth (patient at home, provider at office)
• 10 — Telehealth (patient at home)
• 11 — Office
• 12 — Home
• 99 — Other/unlisted

For in-home ABA, use POS 12. For telehealth parent training, use POS 02. Mismatched POS codes are a top denial reason.`,
      },
      {
        q: 'What modifiers do I need to add to claims?',
        a: `Common modifiers for behavioral health:
• GT — Telehealth (required for all telehealth claims)
• HQ — Group setting
• HN — Bachelor's level clinician
• HO — Master's level clinician
• HP — Doctoral level clinician
• U1/U2/U3 — AHCCCS-specific level of care designators
• 95 — Synchronous Telemedicine (some payers prefer this over GT)

Always check your specific payer's modifier requirements — they differ significantly.`,
        hasVideo: true,
        videoTitle: 'Modifier Guide for Behavioral Health',
        videoDuration: '3 min',
      },
      {
        q: 'How long do I have to submit a claim?',
        a: `Timely filing limits vary by payer:
• AHCCCS — 12 months from date of service
• BCBS AZ — 180 days (6 months)
• UnitedHealthcare — 12 months
• Aetna — 180 days
• Cigna — 180 days

Always confirm timely filing windows in your provider participation agreement. After the deadline, claims are typically denied with no right to appeal.`,
      },
      {
        q: 'What is an 837P transaction?',
        a: "The 837P (Professional) is the standard HIPAA electronic transaction format for submitting professional claims to health plans. It's the digital equivalent of the CMS-1500 paper form. Aminy formats all claims as 837P for clearinghouse submission.",
      },
      {
        q: 'How many units can I bill per day?',
        a: `There's no universal limit, but payers often flag high unit counts. Common maximums:
• AHCCCS — up to 32 units (8 hours) per day for direct therapy
• Most commercial payers — flag claims over 24 units (6 hours) for review
• Supervision: typically capped at the authorized monthly hours

Units billed must match your EVV clock-in/clock-out records. Overbilling is a compliance violation.`,
      },
      {
        q: 'What does CO-97 mean and how do I fix it?',
        a: 'CO-97 is a "payment included in another service" denial — this typically means the payer thinks you already billed for this service (duplicate claim) or the service is bundled with another code. Check for: duplicate submissions, billing both H2019 and 97153 on the same date, or billing supervision on the same date as another bundled service. Verify the claim wasn\'t already paid before resubmitting.',
      },
      {
        q: 'What information is required on every claim?',
        a: `A complete ABA claim needs:
1. Provider NPI (Individual and Group/Billing)
2. Client insurance member ID
3. Authorization number
4. Date of service
5. CPT/HCPCS code + description
6. ICD-10 diagnosis code
7. Units and billed amount
8. Place of service code
9. Rendering provider name and NPI
10. Supervising BCBA name and NPI (for RBT claims)
11. Signed session note on file
12. Taxonomy code (103G00000X for ABA)`,
        hasVideo: true,
        videoTitle: 'What goes on a clean claim — 12-point checklist',
        videoDuration: '5 min',
      },
    ],
  },
  {
    id: 'prior-auth',
    label: 'Prior Auth',
    icon: <BookOpen size={15} />,
    faqs: [
      {
        q: 'When do I need prior authorization for ABA services?',
        a: 'Prior authorization (PA) is required for ABA services by almost all payers, including AHCCCS. You must have a valid authorization before treating a patient — retroactive authorizations are rarely granted. Authorization requires: a completed behavioral health assessment, a BCBA signature on the treatment plan, and a diagnosis of Autism Spectrum Disorder (F84.0) or related condition.',
        hasVideo: true,
        videoTitle: 'Prior Auth 101: How to Avoid Claim Denials',
        videoDuration: '4 min',
      },
      {
        q: 'How long does it take to get a prior auth approved?',
        a: `Processing times by payer:
• AHCCCS — 14 business days (standard) / 72 hours (urgent)
• BCBS AZ — 15 business days
• UnitedHealthcare — 7-10 business days
• Aetna — 14 business days
• Cigna — 14 business days

Always submit PA requests well before services begin. Start the process when you complete the initial assessment.`,
      },
      {
        q: 'What documents do I need for a prior auth request?',
        a: `Required documents vary but typically include:
• Completed behavioral health assessment (ADOS-2, VB-MAPP, or similar)
• BCBA-signed treatment plan with specific goals
• ASD diagnosis from a licensed clinician (MD, PhD, or BCBA)
• Parent consent form
• CPT codes requested with justification
• Units requested (hours per week)
• Treatment duration requested`,
      },
      {
        q: 'What happens when my authorization runs out?',
        a: 'You must submit a re-authorization request before the current authorization expires. Most payers require re-auth requests 30 days before expiration. Track remaining authorized units in Aminy — you\'ll get an alert when under 20% of units remain. Never exceed authorized units — overbilling is a federal compliance violation.',
      },
      {
        q: 'Can I bill for sessions during an authorization gap?',
        a: 'Generally no — services rendered outside an active authorization period cannot be billed to insurance. If you have an authorization gap, pause billable services OR contact the payer immediately to request a retro authorization (rarely granted). Document your attempts to obtain authorization in the clinical record.',
      },
    ],
  },
  {
    id: 'credentialing',
    label: 'Credentialing',
    icon: <HelpCircle size={15} />,
    faqs: [
      {
        q: 'How long does credentialing take?',
        a: `Timeline by payer (typical):
• AHCCCS — 60-90 days
• BCBS AZ — 45-60 days
• UnitedHealthcare / Optum — 30-45 days
• Aetna — 60-90 days
• Cigna / Evernorth — 45-60 days

Start all applications simultaneously. Aminy's Credentialing Orchestrator tracks each payer's status and estimated completion date.`,
      },
      {
        q: 'What is CAQH and why do I need it?',
        a: 'CAQH ProView is the universal provider credentialing repository used by ~1.4 million providers and 1,300+ health plans. Most commercial payers pull your credentialing information directly from CAQH — you fill it out once and they all use it. You must re-attest your CAQH profile every 120 days or payers will reject your applications.',
        hasVideo: true,
        videoTitle: 'CAQH ProView Setup Guide for BCBAs',
        videoDuration: '6 min',
      },
      {
        q: 'What happens if my license expires during credentialing?',
        a: 'An expired license is an automatic disqualification — payers will not credential a provider with an expired license, and if discovered after credentialing, you may be removed from the panel immediately. Set renewal reminders 90 days before expiration. Aminy alerts you when your license is within 90 days of expiry.',
      },
      {
        q: 'Can I see patients while credentialing is pending?',
        a: 'Yes, with limitations. Some payers offer "provisional credentialing" or "pending credentialing" status that allows you to treat patients for 60-90 days while your application is processed — but you cannot bill until credentialing is complete. Check with each payer. For AHCCCS, you may NOT see patients until credentialing is finalized.',
      },
      {
        q: 'What is the CAQH re-attestation requirement?',
        a: 'CAQH requires providers to re-attest (confirm all information is current and accurate) every 120 days. Failure to re-attest causes your profile to become "inactive" and payers will automatically reject credentialing applications that reference an inactive CAQH profile. Set a calendar reminder for every 3.5 months.',
      },
    ],
  },
  {
    id: 'evv',
    label: 'EVV',
    icon: <ChevronRight size={15} />,
    faqs: [
      {
        q: 'What is EVV and why is it required?',
        a: 'Electronic Visit Verification (EVV) is a federal mandate under the 21st Century Cures Act requiring states to verify home and community-based services (HCBS). In Arizona, AHCCCS requires EVV for all personal care and home health services. EVV captures: date of service, type of service, individual receiving service, service location (GPS), provider delivering service, and start/end time.',
        hasVideo: true,
        videoTitle: 'EVV Explained for ABA Providers in Arizona',
        videoDuration: '4 min',
      },
      {
        q: 'What happens if my EVV records don\'t match?',
        a: 'EVV discrepancies — time variances over 15 minutes, location mismatches, missing check-outs — must be resolved before billing. AHCCCS can deny claims with unresolved EVV discrepancies and may require repayment of claims already paid if discrepancies are found in an audit. The Aminy EVV Reconciliation tool shows all discrepancies and guides you through corrections.',
      },
      {
        q: 'Can providers correct EVV errors after the fact?',
        a: 'Yes, with attestation. Providers can retroactively correct EVV records by submitting a manual attestation explaining the discrepancy (e.g., "provider\'s phone died at check-out"). Corrections must include the corrected time/location, a written explanation, and provider signature. AHCCCS allows corrections within the current billing period.',
      },
      {
        q: 'What is a clean EVV cycle?',
        a: 'A clean EVV cycle is a session record with: valid check-in and check-out within 15 minutes of scheduled times, GPS location matching the authorized service address, units billed matching actual session duration, and all required fields completed. AHCCCS tracks your clean cycle rate — consistently low rates can trigger audits.',
      },
      {
        q: 'Does telehealth require EVV?',
        a: 'No — EVV is required only for in-person home and community-based services. Telehealth sessions (POS 02) are exempt from EVV requirements because location verification is inherent to the service model. However, you still need a complete session note documenting start/end time, service delivered, and client participation.',
      },
    ],
  },
  {
    id: 'denial-appeals',
    label: 'Denial Appeals',
    icon: <MessageSquare size={15} />,
    faqs: [
      {
        q: 'How long do I have to appeal a denial?',
        a: `Appeal windows vary by payer:
• AHCCCS — 120 days from denial date
• BCBS AZ — 180 days
• UHC — 180 days
• Aetna — 180 days
• Cigna — 180 days

Always appeal within 30 days — earlier is better. After the window closes, you have no recourse.`,
        hasVideo: true,
        videoTitle: 'How to Write a Winning Appeal Letter',
        videoDuration: '5 min',
      },
      {
        q: 'What is the difference between a reconsideration and an appeal?',
        a: 'A reconsideration (or "informal appeal") is an informal review where you ask the same claims team to re-review a denial. It\'s faster (14-30 days) and requires less documentation. A formal appeal goes to an independent review organization (IRO) and must meet specific procedural requirements. Always try reconsideration first — it succeeds ~40% of the time.',
      },
      {
        q: 'What makes a strong appeal letter?',
        a: `A winning appeal letter includes:
1. Your claim information (claim #, DOS, patient, amount)
2. The denial reason code and what it means
3. A clear, point-by-point rebuttal of the denial rationale
4. Clinical evidence that the service was medically necessary
5. Relevant regulations or coverage policies (cite the payer's own policy document)
6. Supporting documentation (session notes, assessment, authorization)
7. A specific request: "We request reversal of this denial and payment of $X."

Aminy's denial engine generates a complete appeal letter template for each denial code.`,
      },
      {
        q: 'What do I do when I get a CO-4 denial?',
        a: 'CO-4 means "inconsistent with the services rendered" — usually a modifier problem. Check: (1) Is the modifier you used approved for this CPT code and this payer? (2) Did you use GT for telehealth? (3) Is the supervision modifier (HP/HO/HN) correct for the rendering provider\'s credential? Correct the modifier and resubmit.',
      },
      {
        q: 'What is CO-16 and how do I fix it?',
        a: 'CO-16 means "claim/service lacks information which is needed for adjudication." Check the CARC/RARC code in the Explanation of Benefits (EOB) for specifics. Common causes: missing NPI, missing authorization number, missing diagnosis code, or missing taxonomy code. The EOB should include a remark code (RARC) specifying exactly what\'s missing.',
      },
      {
        q: 'What is PR-1 and does it mean I need to bill the patient?',
        a: 'PR-1 means the patient\'s deductible applies to this claim. This is a patient responsibility code — you can bill the patient for this amount. However: verify the deductible with the EOB, ensure it matches your patient\'s plan information, and check if the deductible has already been met this year before billing.',
      },
      {
        q: 'What is a CO-50 denial and how do I appeal it?',
        a: 'CO-50 means "not medically necessary." To appeal: (1) Gather your clinical assessment documenting the diagnosis and functional impairments, (2) include peer-reviewed literature supporting ABA for ASD, (3) reference the payer\'s own clinical policy (most recognize ABA as medically necessary for ASD with a documented behavioral health assessment), (4) request a peer-to-peer review between the payer\'s medical director and your supervising BCBA.',
      },
      {
        q: 'How do I track my appeal outcomes?',
        a: 'Aminy\'s Denial Workbench tracks every denial, appeal submission, and outcome. It calculates your appeal win rate by payer and denial code — this data is invaluable for identifying which payers deny most aggressively and which appeal strategies work best for your practice.',
      },
    ],
  },
  {
    id: 'rate-negotiation',
    label: 'Rate Negotiation',
    icon: <Sparkles size={15} />,
    faqs: [
      {
        q: 'Can I negotiate rates with insurance payers?',
        a: 'Yes — especially for ABA services where rates vary widely. The initial rate offer from most commercial payers is rarely their best offer. You have the most leverage before signing your first contract and during re-contracting (every 2-3 years). Key leverage points: your outcomes data, patient panel size, specialty expertise, and limited provider availability in your area.',
        hasVideo: true,
        videoTitle: 'Rate Negotiation 101 for ABA Practices',
        videoDuration: '7 min',
      },
      {
        q: 'What are typical market rates for ABA in Arizona?',
        a: `Current Arizona market rates (2026 estimates):
• H2019 (RBT direct therapy, per 15 min): $8.50-$12.00
• H0032 (BCBA supervision, per 15 min): $18-$28
• 97151 (Behavior ID Assessment, per 15 min): $15-$22
• 97155 (BCBA adaptive treatment, per 15 min): $20-$30
• Parent training (97156, per 15 min): $15-$22

AHCCCS rates are set by the state and are non-negotiable. Commercial payer rates vary by 30-50% depending on your negotiation.`,
      },
      {
        q: 'What outcomes data helps in rate negotiations?',
        a: 'Present: average goal mastery rates across your caseload, reduction in maladaptive behavior incidents, VB-MAPP or ABLLS-R score improvements over time, hospitalization avoidance (if applicable), parent satisfaction scores, and employee retention rate (lower turnover = better continuity of care). Quantified outcomes data is the strongest negotiation tool.',
      },
      {
        q: 'When is the right time to renegotiate?',
        a: 'Renegotiate: (1) At contract renewal (typically every 2-3 years), (2) When you add significantly to your panel size with that payer, (3) When the payer approaches you to join a new product or network, (4) When you add a new service or location. Avoid renegotiating during claims disputes — it signals desperation.',
      },
      {
        q: 'What happens if I reject a payer\'s rates?',
        a: 'You can decline to contract or counter-offer. Payers want you in-network if you have patients — especially for behavioral health where providers are scarce. If a payer\'s rates are below your cost to deliver the service, it\'s better to stay out-of-network and discuss rates with families directly (self-pay with superbill for reimbursement).',
      },
    ],
  },
];

const AI_QUICK_ANSWERS = [
  'What do I do for a CO-16 denial?',
  'How do I resubmit a corrected claim?',
  'What\'s the timely filing limit for BCBS AZ?',
  'How long does AHCCCS credentialing take?',
  'Can I bill GT and HQ together?',
];

const CPT_QUICK_REF = [
  { code: 'H2019', desc: 'Behavior Treatment — RBT', unit: '15 min', payers: 'AHCCCS, most commercial' },
  { code: 'H0032', desc: 'BCBA Mental Health Service Plan', unit: '15 min', payers: 'AHCCCS, some commercial' },
  { code: '97153', desc: 'Adaptive Behavior Treatment — technician', unit: '15 min', payers: 'Commercial' },
  { code: '97155', desc: 'Adaptive Behavior Treatment — BCBA', unit: '15 min', payers: 'Commercial' },
  { code: '97156', desc: 'Family Adaptive Behavior Treatment Guidance', unit: '15 min', payers: 'Commercial' },
  { code: '97151', desc: 'Behavior Identification Assessment', unit: '15 min', payers: 'All payers' },
];

export default function ProviderBillingHelp({ onBack }: ProviderBillingHelpProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('claim-submission');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCPTRef, setShowCPTRef] = useState(false);

  const category = CATEGORIES.find(c => c.id === activeCategory);

  const filteredFAQs = category?.faqs.filter(faq =>
    searchQuery === '' ||
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const handleAIQuery = (query: string) => {
    setAiQuery(query);
    setAiLoading(true);
    setAiAnswer(null);
    setTimeout(() => {
      // Mock AI responses for common questions
      const lowerQ = query.toLowerCase();
      let answer = '';
      if (lowerQ.includes('co-16') || lowerQ.includes('missing info')) {
        answer = 'CO-16 (Claim/service lacks information needed for adjudication) — Check the RARC code in your EOB for specifics. Most commonly: missing NPI, auth number, or taxonomy code. Add the missing field and resubmit as a corrected claim (frequency code 7).';
      } else if (lowerQ.includes('resubmit') || lowerQ.includes('corrected claim')) {
        answer = 'To resubmit a corrected claim: use frequency code "7" (replacement of prior claim) in loop 2300 CLM05-3. Include the original claim number in the 2300 REF*F8 segment. Most clearinghouses have a "corrected claim" option in their portal.';
      } else if (lowerQ.includes('bcbs') && lowerQ.includes('timely filing')) {
        answer = 'BCBS AZ timely filing limit is 180 days (6 months) from date of service. Commercial BCBS plans may vary — always check your specific participation agreement.';
      } else if (lowerQ.includes('ahcccs') && lowerQ.includes('credentialing')) {
        answer = 'AHCCCS credentialing typically takes 60-90 days. Key milestones: fingerprint clearance card (Day 1), CMS-855 form submission (Day 1-5), AHCCCS training completion (Day 3-8), then AHCCCS review (Days 9-90). Track your timeline in the Credentialing Orchestrator.';
      } else if (lowerQ.includes('gt') && lowerQ.includes('hq')) {
        answer = 'Yes — GT (telehealth) and HQ (group setting) can be used together for group telehealth sessions. However, not all payers recognize this combination. AHCCCS does not cover ABA in a group telehealth setting. Verify with each commercial payer before billing.';
      } else {
        answer = 'Based on your question: review the relevant FAQ section above for detailed guidance. For complex situations, use the AI Billing Support chat or contact your payer\'s provider relations line directly. Remember to document all payer contacts with date, time, and representative name.';
      }
      setAiAnswer(answer);
      setAiLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div style={{ background: '#0D1B2A' }} className="px-4 pt-12 pb-4 text-white">
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold">Billing Help Center</h1>
            <p className="text-sm text-white/60">Credentialing · Claims · EVV · Denials · Rates</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search billing questions…"
            className="w-full bg-white/10 text-white placeholder:text-white/40 pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:bg-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="bg-white border-b border-[#E8E4DF] overflow-x-auto">
        <div className="flex px-4 py-2 gap-2 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setExpandedFAQ(null); setSearchQuery(''); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF]'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* AI Support Tab */}
        {activeCategory === 'ai-support' ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} />
                <h2 className="text-base font-bold">AI Billing Support</h2>
              </div>
              <p className="text-sm text-white/80">Ask any billing, credentialing, or EVV question. Get an answer in seconds.</p>
            </div>

            {/* Quick questions */}
            <div className="flex flex-wrap gap-2">
              {AI_QUICK_ANSWERS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleAIQuery(q)}
                  className="text-xs bg-white border border-[#E8E4DF] text-[#3A4A57] px-3 py-1.5 rounded-full hover:bg-[#FAF7F2] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="bg-white rounded-2xl border border-[#E8E4DF] p-3">
              <textarea
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                placeholder="Type your billing question here…"
                className="w-full text-sm text-[#1B2733] placeholder:text-[#5A6B7A] resize-none focus:outline-none min-h-[80px]"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => aiQuery.trim() && handleAIQuery(aiQuery)}
                  disabled={!aiQuery.trim() || aiLoading}
                  className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-4 py-2 rounded-xl disabled:opacity-40 hover:bg-[#6B9080] transition-colors"
                >
                  {aiLoading ? <span className="animate-spin">⏳</span> : <Send size={13} />}
                  {aiLoading ? 'Thinking…' : 'Ask'}
                </button>
              </div>
            </div>

            {/* AI Answer */}
            <AnimatePresence>
              {aiAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-[#6B9080]/20 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-[#6B9080]" />
                    <span className="text-sm font-semibold text-[#6B9080]">AI Answer</span>
                  </div>
                  <p className="text-sm text-[#3A4A57] leading-relaxed whitespace-pre-line">{aiAnswer}</p>
                  <p className="text-sm text-[#8A9BA8] mt-2">For complex situations, always verify with your payer's provider relations team.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CPT Quick Reference */}
            <div className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3"
                onClick={() => setShowCPTRef(!showCPTRef)}
              >
                <span className="text-sm font-semibold text-[#1B2733]">CPT Quick Reference</span>
                <ChevronDown size={16} className={`text-[#8A9BA8] transition-transform ${showCPTRef ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showCPTRef && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-50">
                      {CPT_QUICK_REF.map(ref => (
                        <div key={ref.code} className="flex items-start gap-3 py-2 border-b border-gray-50">
                          <span className="text-xs font-mono font-bold text-[#6B9080] bg-[#6B9080]/10 px-2 py-0.5 rounded shrink-0">{ref.code}</span>
                          <div>
                            <p className="text-sm font-medium text-[#1B2733]">{ref.desc}</p>
                            <p className="text-sm text-[#5A6B7A]">{ref.unit} · {ref.payers}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* FAQ section */
          <div className="space-y-2">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-8">
                <Search size={28} className="text-[#8A9BA8] mx-auto mb-2" />
                <p className="text-sm text-[#5A6B7A]">No results for "{searchQuery}"</p>
              </div>
            ) : (
              filteredFAQs.map((faq, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sm overflow-hidden">
                  <button
                    className="w-full flex items-start justify-between gap-3 px-4 py-4 text-left"
                    onClick={() => setExpandedFAQ(expandedFAQ === i ? null : i)}
                  >
                    <p className="text-sm font-medium text-[#1B2733] leading-snug">{faq.q}</p>
                    <ChevronDown
                      size={16}
                      className={`text-[#8A9BA8] shrink-0 mt-0.5 transition-transform ${expandedFAQ === i ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence>
                    {expandedFAQ === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-gray-50">
                          <p className="text-sm text-[#5A6B7A] leading-relaxed mt-3 whitespace-pre-line">{faq.a}</p>
                          {faq.hasVideo && (
                            <div className="mt-3 flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E4DF]">
                              <div className="w-12 h-8 bg-[#E8E4DF] rounded-lg flex items-center justify-center shrink-0">
                                <Play size={16} className="text-[#5A6B7A]" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#1B2733]">{faq.videoTitle}</p>
                                <p className="text-sm text-[#8A9BA8]">{faq.videoDuration} explainer</p>
                              </div>
                              <button className="ml-auto text-xs text-[#6B9080] font-medium px-3 py-1.5 rounded-lg border border-[#6B9080]/20 hover:bg-[#6B9080]/10 transition-colors">
                                Watch
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        )}

        {/* AI Support entry point */}
        {activeCategory !== 'ai-support' && (
          <button
            onClick={() => setActiveCategory('ai-support')}
            className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-[#FAF7F2] to-blue-50 rounded-2xl border border-[#E8E4DF] hover:border-[#6B9080]/20 transition-colors"
          >
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#1B2733]">Can't find your answer?</p>
              <p className="text-sm text-[#5A6B7A]">Ask our AI billing assistant</p>
            </div>
            <ChevronRight size={16} className="text-[#8A9BA8] ml-auto" />
          </button>
        )}
      </div>
    </div>
  );
}
