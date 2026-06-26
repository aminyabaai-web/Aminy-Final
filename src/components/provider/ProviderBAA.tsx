// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * ProviderBAA — HIPAA Business Associate Agreement
 * Providers must sign this BAA before accessing PHI through the platform.
 */

import React, { useState, useMemo } from 'react';
import { Shield, Lock, Check, AlertTriangle, FileText } from 'lucide-react';
import { generateBAA, baaToText } from '../../lib/baa-generator';

export interface BAAAcceptance {
  acceptedAt: string;
  providerName: string;
  providerEmail: string;
  signedName: string;
  documentVersion: string;
}

interface ProviderBAAProps {
  providerName: string;
  providerEmail: string;
  onAccept: (acceptance: BAAAcceptance) => void;
  onBack?: () => void;
}

export default function ProviderBAA({ providerName, providerEmail, onAccept, onBack }: ProviderBAAProps) {
  const [signedName, setSignedName] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const baaDoc = useMemo(() => generateBAA({
    coveredEntityName: 'Aminy, LLC',
    businessAssociateName: providerName || 'Provider',
    effectiveDate: today,
    servicesDescription: 'Behavioral health telehealth platform services including appointment scheduling, secure video sessions, clinical documentation, family engagement tools, and payment processing',
    permittedUses: [
      'Providing telehealth behavioral health services to Clients of Covered Entity',
      'Clinical documentation and session notes storage',
      'Payment processing and billing for services rendered',
      'Care coordination between Provider and Client families',
    ],
    permitDeIdentification: false,
    permitAggregateUse: true,
    breachNotificationHours: 72,
    governingState: 'Arizona',
  }), [providerName, today]);

  const baaText = useMemo(() => baaToText(baaDoc), [baaDoc]);

  const nameMatches = signedName.trim().toLowerCase() === providerName.trim().toLowerCase();
  const canAccept = acknowledged && nameMatches;

  const handleAccept = () => {
    if (!canAccept) return;
    onAccept({
      acceptedAt: new Date().toISOString(),
      providerName,
      providerEmail,
      signedName: signedName.trim(),
      documentVersion: '1.0.0',
    });
  };

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-5 border-b border-[#E8E4DF]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1B2733]">HIPAA Business Associate Agreement</h1>
            <p className="text-sm text-[#5A6B7A]">Required before accessing protected health information</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <Shield className="w-4 h-4 shrink-0" />
          <span>This BAA is required by HIPAA §164.502(e) before you can use Aminy to store or transmit client health information.</span>
        </div>
      </div>

      {/* Parties */}
      <div className="px-5 py-4 bg-[#FAF7F2] border-b border-[#E8E4DF]">
        <p className="text-sm text-[#5A6B7A] leading-relaxed">
          This HIPAA Business Associate Agreement is entered into between{' '}
          <strong>Aminy, LLC</strong> ("Covered Entity") and{' '}
          <strong>{providerName || '[Provider Name]'}</strong> ("Business Associate"),
          effective {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
        </p>
      </div>

      {/* Summary of Key Points */}
      <div className="px-5 py-5 space-y-3">
        <h2 className="text-base font-semibold text-[#1B2733]">Key Obligations</h2>
        {[
          'You may only use client PHI to provide services through the Aminy platform',
          'You must implement appropriate safeguards for all electronic PHI (ePHI)',
          'You must report any data breach to Aminy within 72 hours of discovery',
          'Any subcontractors you use must agree to the same PHI protections',
          'Upon termination, you must return or destroy all PHI',
          'You must comply with all applicable HIPAA Security and Privacy Rules',
        ].map((point, i) => (
          <div key={i} className="flex items-start gap-3 text-sm text-[#5A6B7A]">
            <Check className="w-4 h-4 text-[#2A7D99] mt-0.5 shrink-0" />
            <span>{point}</span>
          </div>
        ))}
      </div>

      {/* Full Text Toggle */}
      <div className="px-5">
        <button
          onClick={() => setShowFull(!showFull)}
          className="flex items-center gap-2 text-sm text-[#376E80] font-medium hover:underline mb-3"
        >
          <FileText className="w-4 h-4" />
          {showFull ? 'Hide full agreement text' : 'View full agreement text'}
        </button>
        {showFull && (
          <pre className="text-xs text-[#5A6B7A] bg-[#FAF7F2] border border-[#E8E4DF] rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
            {baaText}
          </pre>
        )}
      </div>

      {/* Acknowledgment */}
      <div className="px-5 py-4">
        <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-teal-600"
          />
          <span className="text-sm text-amber-800 font-medium">
            I have read and understand this Business Associate Agreement and agree to comply with all
            HIPAA obligations it imposes, including safeguarding PHI and reporting breaches within 72 hours.
          </span>
        </label>
      </div>

      {/* E-Signature */}
      <div className="px-5 pb-6 border-t border-[#E8E4DF] pt-4 bg-white sticky bottom-0">
        <div className="flex items-start gap-2 mb-4 p-3 bg-[#FAF7F2] rounded-lg text-sm text-[#5A6B7A]">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Type your full legal name below to sign electronically. Name must match exactly: <strong>{providerName}</strong></span>
        </div>
        <input
          type="text"
          value={signedName}
          onChange={(e) => setSignedName(e.target.value)}
          placeholder="Type your full legal name to sign"
          className="w-full px-4 py-3 border rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#2A7D99]"
          style={{ borderColor: nameMatches && signedName ? '#2A7D99' : '#E8E4DF' }}
        />
        {signedName && !nameMatches && (
          <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Name must match your registered name exactly: {providerName}
          </p>
        )}
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="py-3 px-5 text-sm text-[#5A6B7A] hover:text-[#3A4A57] font-medium rounded-xl hover:bg-[#FAF7F2] transition-colors">
              Back
            </button>
          )}
          <button
            onClick={handleAccept}
            disabled={!canAccept}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              canAccept ? 'bg-blue-700 text-white hover:bg-blue-800 shadow-md' : 'bg-[#E8E4DF] text-slate-400 cursor-not-allowed'
            }`}
          >
            <Shield className="w-4 h-4" />
            Sign BAA Electronically
          </button>
        </div>
        <p className="text-xs text-[#5A6B7A] text-center mt-3">
          Your signature, email ({providerEmail}), and IP address will be logged as your e-signature.
        </p>
      </div>
    </div>
  );
}
