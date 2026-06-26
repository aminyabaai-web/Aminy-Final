// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useCallback } from 'react';
import {
  Video, Mic, Share2, UserCheck, FlaskConical,
  Check, X, ArrowLeft, Clock, AlertTriangle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────

export interface ConsentRecord {
  consentType: ConsentType;
  granted: boolean;
  timestamp: string;
  signatureName: string;
  signatureRelationship?: string;
  ipAddress?: string;
  version: string;
  withdrawnAt?: string;
}

export type ConsentType =
  | 'telehealth'
  | 'recording'
  | 'data-sharing'
  | 'minor'
  | 'research';

interface ConsentFlowProps {
  type: ConsentType;
  patientName?: string;
  childName?: string;
  onConsent: (record: ConsentRecord) => void;
  onDecline: (type: ConsentType) => void;
  onBack?: () => void;
  existingConsent?: ConsentRecord | null;
}

interface ConsentManagerProps {
  consents: ConsentRecord[];
  onWithdraw: (type: ConsentType) => void;
  onBack?: () => void;
}

// ─── Consent Content ─────────────────────────────────────────────────

const CONSENT_CONTENT: Record<ConsentType, {
  title: string;
  icon: React.ReactNode;
  version: string;
  sections: Array<{ heading: string; body: string }>;
}> = {
  telehealth: {
    title: 'Telehealth Informed Consent',
    icon: <Video className="h-6 w-6 text-[#6B9080]" />,
    version: '2.0',
    sections: [
      {
        heading: 'Nature of Telehealth',
        body: 'Telehealth involves the use of electronic communications, including video conferencing, to provide healthcare services remotely. Your provider will use encrypted, HIPAA-conscious technology to conduct sessions. Telehealth is not the same as in-person care, and some aspects of treatment may differ.',
      },
      {
        heading: 'Benefits',
        body: 'Telehealth may improve access to care, reduce travel time, allow sessions from the comfort of home, and provide scheduling flexibility. For children with autism, familiar environments may reduce anxiety and improve engagement.',
      },
      {
        heading: 'Risks & Limitations',
        body: 'Risks include: technology failures that may disrupt sessions; reduced ability to observe physical symptoms; potential privacy risks from the electronic medium; sessions may not be suitable for all clinical situations. In emergencies, telehealth is not a substitute for 911 or in-person emergency care.',
      },
      {
        heading: 'Technical Requirements',
        body: 'You need a stable internet connection, a device with camera and microphone, and a private space for sessions. You are responsible for ensuring your environment is appropriate for clinical sessions.',
      },
      {
        heading: 'Privacy & Recording',
        body: 'Sessions are encrypted end-to-end. Neither party may record sessions without separate written consent. Your provider will document sessions in accordance with clinical standards.',
      },
      {
        heading: 'Emergency Protocol',
        body: 'Before your first session, you will provide your physical location and a local emergency contact. If a crisis arises during a session, your provider may need to contact local emergency services.',
      },
      {
        heading: 'Right to Withdraw',
        body: 'You may withdraw this consent at any time. Withdrawal does not affect the legality of processing based on consent before its withdrawal. You may request in-person services as an alternative.',
      },
    ],
  },
  recording: {
    title: 'Session Recording Consent',
    icon: <Mic className="h-6 w-6 text-red-500" />,
    version: '1.0',
    sections: [
      {
        heading: 'Purpose of Recording',
        body: 'Session recordings may be used for: clinical documentation, quality assurance, provider supervision, treatment plan review, and training purposes. Recordings provide valuable data for tracking progress and ensuring treatment fidelity.',
      },
      {
        heading: 'Storage & Security',
        body: 'Recordings are encrypted (AES-256) and stored in HIPAA-conscious infrastructure with strong security controls. Access is restricted to authorized clinical personnel only. Recordings are automatically deleted after the retention period specified below.',
      },
      {
        heading: 'Retention Period',
        body: 'Recordings are retained for 3 years from the date of recording, or until the end of the treatment relationship plus 1 year, whichever is shorter. You may request earlier deletion at any time.',
      },
      {
        heading: 'Access & Sharing',
        body: 'Only your treating provider and authorized supervisors may access recordings. Recordings will not be shared with third parties without your explicit written consent, except as required by law.',
      },
      {
        heading: 'Right to Decline',
        body: 'Recording is optional. You may decline recording without affecting your access to services. You may also request that recording be stopped at any point during a session.',
      },
      {
        heading: 'Right to Withdraw',
        body: 'You may withdraw this consent at any time. Upon withdrawal, no new recordings will be made. Existing recordings will be handled per the retention policy unless you request deletion.',
      },
    ],
  },
  'data-sharing': {
    title: 'Data Sharing Consent',
    icon: <Share2 className="h-6 w-6 text-blue-600" />,
    version: '1.0',
    sections: [
      {
        heading: 'What Data May Be Shared',
        body: 'With your consent, we may share: treatment progress summaries, assessment results, care coordination notes, and referral information with other healthcare providers involved in your or your child\'s care.',
      },
      {
        heading: 'Who May Receive Data',
        body: 'Data may be shared with: referring physicians, school-based therapy teams, other treating providers (speech, OT, psychology), insurance companies for authorization purposes, and care coordinators.',
      },
      {
        heading: 'Purpose',
        body: 'Data sharing facilitates coordinated care, reduces duplicative assessments, enables accurate insurance authorization, and ensures all members of the care team have the information needed to provide effective treatment.',
      },
      {
        heading: 'Safeguards',
        body: 'All data sharing occurs through encrypted channels. Recipients must agree to confidentiality requirements. We share only the minimum necessary information for the stated purpose.',
      },
      {
        heading: 'Granular Control',
        body: 'You may specify which providers or organizations may receive your data. You may exclude specific types of information from sharing. You may revoke sharing permissions for specific recipients at any time.',
      },
      {
        heading: 'Right to Withdraw',
        body: 'You may withdraw this consent at any time. Withdrawal will stop future sharing but cannot recall information already shared in good faith.',
      },
    ],
  },
  minor: {
    title: 'Minor/Guardian Consent',
    icon: <UserCheck className="h-6 w-6 text-purple-600" />,
    version: '1.0',
    sections: [
      {
        heading: 'Parental/Guardian Authorization',
        body: 'As the parent or legal guardian, you authorize Aminy and its network of providers to deliver healthcare services to your child, including behavioral health assessments, therapy sessions (in-person and telehealth), and related care coordination.',
      },
      {
        heading: 'Scope of Services',
        body: 'Services may include: Applied Behavior Analysis (ABA), speech-language therapy, occupational therapy, psychological services, developmental evaluations, and AI-assisted progress tracking and recommendations.',
      },
      {
        heading: 'Child Data Collection',
        body: 'We collect data about your child including: name, date of birth, diagnoses, treatment progress, behavioral data, session recordings (with separate consent), and engagement metrics from Junior Mode activities.',
      },
      {
        heading: 'COPPA Compliance',
        body: 'For children under 13, we comply with COPPA requirements. We collect only information necessary for providing services. Child-facing features minimize data collection. No behavioral advertising is served to children.',
      },
      {
        heading: 'AI Features for Children',
        body: 'AI features in Junior Mode provide activity recommendations, progress insights, and adaptive content. AI processing occurs locally when possible. Cloud-processed data is not retained beyond the session. You may disable AI features at any time.',
      },
      {
        heading: 'Parental Rights',
        body: 'You have the right to: review all data collected about your child, request deletion of your child\'s data, restrict specific data processing activities, revoke consent for AI features, and withdraw your child from the platform entirely.',
      },
      {
        heading: 'Right to Withdraw',
        body: 'You may withdraw this consent at any time. Withdrawal will result in termination of services for your child. Clinical records will be retained per legal requirements.',
      },
    ],
  },
  research: {
    title: 'Research Participation Opt-In',
    icon: <FlaskConical className="h-6 w-6 text-amber-600" />,
    version: '1.0',
    sections: [
      {
        heading: 'Purpose',
        body: 'Aminy conducts and participates in research to improve autism care outcomes, develop better assessment tools, and advance understanding of effective interventions. Your participation is entirely voluntary.',
      },
      {
        heading: 'What Participation Involves',
        body: 'If you opt in, your de-identified data (with all personally identifying information removed) may be included in aggregate research datasets. You may also be invited (never required) to participate in surveys, interviews, or pilot programs.',
      },
      {
        heading: 'De-identification',
        body: 'All data used for research is de-identified per HIPAA Safe Harbor standards. This means removal of: names, dates, contact information, identifiers, and any information that could reasonably identify you or your child.',
      },
      {
        heading: 'Institutional Oversight',
        body: 'Research activities are reviewed and approved by an Institutional Review Board (IRB). All research follows ethical guidelines for human subjects research, with additional protections for minors.',
      },
      {
        heading: 'Benefits',
        body: 'While there may be no direct benefit to you, your participation helps improve care for the autism community. Research findings may lead to better tools, treatments, and access to services.',
      },
      {
        heading: 'No Effect on Services',
        body: 'Opting in or out of research has absolutely no effect on the quality, availability, or cost of your services. You will never be treated differently based on your research participation decision.',
      },
      {
        heading: 'Right to Withdraw',
        body: 'You may withdraw from research participation at any time. Withdrawal will exclude your data from future research datasets. Data already included in published or completed studies cannot be withdrawn.',
      },
    ],
  },
};

// ─── Single Consent Flow ─────────────────────────────────────────────

export function ConsentFlow({
  type,
  patientName,
  childName,
  onConsent,
  onDecline,
  onBack,
  existingConsent,
}: ConsentFlowProps) {
  const [signatureName, setSignatureName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [hasRead, setHasRead] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  const content = CONSENT_CONTENT[type];
  const needsRelationship = type === 'minor';
  const isWithdrawn = existingConsent?.withdrawnAt;

  const canSign = hasRead && signatureName.trim().length >= 2 && (!needsRelationship || relationship.trim().length >= 2);

  const handleSign = useCallback(() => {
    if (!canSign) return;
    const record: ConsentRecord = {
      consentType: type,
      granted: true,
      timestamp: new Date().toISOString(),
      signatureName: signatureName.trim(),
      signatureRelationship: relationship.trim() || undefined,
      version: content.version,
    };
    onConsent(record);
  }, [canSign, type, signatureName, relationship, content.version, onConsent]);

  const handleDecline = useCallback(() => {
    setShowDeclineConfirm(false);
    onDecline(type);
  }, [type, onDecline]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[#E8E4DF] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-[#EDF4F7]">
              <ArrowLeft className="h-5 w-5 text-[#5A6B7A]" />
            </button>
          )}
          {content.icon}
          <div>
            <h1 className="text-lg font-bold text-[#132F43]">{content.title}</h1>
            <p className="text-sm text-[#5A6B7A]">Version {content.version}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Existing consent banner */}
        {existingConsent && !isWithdrawn && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            <Check className="h-4 w-4" />
            <span>
              Consent granted on {new Date(existingConsent.timestamp).toLocaleDateString()} by{' '}
              {existingConsent.signatureName}
            </span>
          </div>
        )}
        {isWithdrawn && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Consent was withdrawn on {new Date(existingConsent!.withdrawnAt!).toLocaleDateString()}.
              You may re-consent below.
            </span>
          </div>
        )}

        {/* Patient/child info */}
        {(patientName || childName) && (
          <div className="mb-4 rounded-lg bg-[#F6FBFB] p-3 text-sm">
            {patientName && <p><strong>Patient:</strong> {patientName}</p>}
            {childName && <p><strong>Child:</strong> {childName}</p>}
          </div>
        )}

        {/* Consent sections */}
        <div className="space-y-4">
          {content.sections.map((section, i) => (
            <div key={i}>
              <h3 className="text-sm font-semibold text-[#132F43]">{section.heading}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#3A4A57]">{section.body}</p>
            </div>
          ))}
        </div>

        {/* Acknowledgment checkbox */}
        <div className="mt-6 border-t border-[#E8E4DF] pt-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={hasRead}
              onChange={e => setHasRead(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-[#E8E4DF] text-[#6B9080] focus:ring-teal-500"
            />
            <span className="text-sm text-[#3A4A57]">
              I have read and understand the above information. I voluntarily consent to the terms described.
            </span>
          </label>
        </div>

        {/* E-signature */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#3A4A57]">
              Full Legal Name (e-signature)
            </label>
            <input
              type="text"
              value={signatureName}
              onChange={e => setSignatureName(e.target.value)}
              placeholder="Type your full legal name"
              className="mt-1 w-full rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-[#6B9080] focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {needsRelationship && (
            <div>
              <label className="block text-sm font-medium text-[#3A4A57]">
                Relationship to Child
              </label>
              <select
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm focus:border-[#6B9080] focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">Select relationship</option>
                <option value="Parent">Parent</option>
                <option value="Legal Guardian">Legal Guardian</option>
                <option value="Foster Parent">Foster Parent</option>
                <option value="Authorized Representative">Authorized Representative</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
            <Clock className="h-3.5 w-3.5" />
            <span>Timestamp will be recorded: {new Date().toLocaleString()}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSign}
            disabled={!canSign}
            className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6B9080] disabled:cursor-not-allowed disabled:opacity-40"
          >
            I Consent
          </button>
          <button
            onClick={() => setShowDeclineConfirm(true)}
            className="flex-1 rounded-lg border border-[#E8E4DF] px-4 py-3 text-sm font-semibold text-[#3A4A57] transition-colors hover:bg-[#F6FBFB]"
          >
            Decline
          </button>
        </div>

        {/* Decline confirmation */}
        {showDeclineConfirm && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Are you sure you want to decline?</p>
                <p className="mt-1 text-sm text-amber-800">
                  {type === 'telehealth' && 'Declining telehealth consent means you will not be able to use video sessions.'}
                  {type === 'recording' && 'Declining is fine - sessions will proceed without recording.'}
                  {type === 'data-sharing' && 'Declining may limit care coordination between your providers.'}
                  {type === 'minor' && 'Declining means services cannot be provided to the child.'}
                  {type === 'research' && 'Declining has no effect on your services whatsoever.'}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleDecline}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
                  >
                    Yes, Decline
                  </button>
                  <button
                    onClick={() => setShowDeclineConfirm(false)}
                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Consent Manager (view/withdraw existing consents) ───────────────

export function ConsentManager({ consents, onWithdraw, onBack }: ConsentManagerProps) {
  const [withdrawTarget, setWithdrawTarget] = useState<ConsentType | null>(null);

  const activeConsents = consents.filter(c => c.granted && !c.withdrawnAt);
  const withdrawnConsents = consents.filter(c => c.withdrawnAt);
  const declinedConsents = consents.filter(c => !c.granted && !c.withdrawnAt);

  const labelMap: Record<ConsentType, string> = {
    telehealth: 'Telehealth',
    recording: 'Session Recording',
    'data-sharing': 'Data Sharing',
    minor: 'Minor/Guardian',
    research: 'Research Participation',
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-[#E8E4DF] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-[#EDF4F7]">
              <ArrowLeft className="h-5 w-5 text-[#5A6B7A]" />
            </button>
          )}
          <h1 className="text-xl font-bold text-[#132F43]">Manage Consents</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Active */}
        {activeConsents.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[#5A6B7A] uppercase tracking-wide">Active Consents</h2>
            <div className="space-y-2">
              {activeConsents.map(c => (
                <div key={c.consentType} className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                  <div>
                    <p className="text-sm font-semibold text-green-900">{labelMap[c.consentType]}</p>
                    <p className="text-sm text-green-700">
                      Signed by {c.signatureName} on {new Date(c.timestamp).toLocaleDateString()} (v{c.version})
                    </p>
                  </div>
                  <button
                    onClick={() => setWithdrawTarget(c.consentType)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Withdraw
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdrawn */}
        {withdrawnConsents.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[#5A6B7A] uppercase tracking-wide">Withdrawn</h2>
            <div className="space-y-2">
              {withdrawnConsents.map(c => (
                <div key={c.consentType} className="flex items-center justify-between rounded-lg border border-[#E8E4DF] bg-[#F6FBFB] p-3">
                  <div>
                    <p className="text-sm font-semibold text-[#5A6B7A]">{labelMap[c.consentType]}</p>
                    <p className="text-sm text-[#5A6B7A]">
                      Withdrawn on {new Date(c.withdrawnAt!).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm text-[#8A9BA8]">Withdrawn</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Declined */}
        {declinedConsents.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[#5A6B7A] uppercase tracking-wide">Declined</h2>
            <div className="space-y-2">
              {declinedConsents.map(c => (
                <div key={c.consentType} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">{labelMap[c.consentType]}</p>
                  <p className="text-sm text-amber-700">Declined on {new Date(c.timestamp).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {consents.length === 0 && (
          <p className="text-center text-sm text-[#5A6B7A] py-8">No consent records found.</p>
        )}

        {/* Withdraw confirmation */}
        {withdrawTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                  <h3 className="text-base font-semibold text-[#132F43]">Withdraw Consent</h3>
                  <p className="mt-2 text-sm text-[#5A6B7A]">
                    Are you sure you want to withdraw your {labelMap[withdrawTarget]} consent?
                    This action will be timestamped and may affect available services.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => { onWithdraw(withdrawTarget); setWithdrawTarget(null); }}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Withdraw
                    </button>
                    <button
                      onClick={() => setWithdrawTarget(null)}
                      className="rounded-lg border border-[#E8E4DF] px-4 py-2 text-sm font-semibold text-[#3A4A57] hover:bg-[#F6FBFB]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConsentFlow;
