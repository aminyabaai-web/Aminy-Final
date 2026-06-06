// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * BAAStatus — BAA (Business Associate Agreement) status tracker
 *
 * Shows confirmation status for key HIPAA-covered vendors.
 * Screen: 'baa-status'
 */

import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BAAConfirmation = 'confirmed' | 'unconfirmed' | 'not-applicable';

interface VendorBAA {
  name: string;
  role: string;
  baaStatus: BAAConfirmation;
  plan: string;
  notes: string;
  baaLink?: string;
}

// ---------------------------------------------------------------------------
// Vendor data
// ---------------------------------------------------------------------------

const VENDORS: VendorBAA[] = [
  {
    name: 'Supabase',
    role: 'Database & Auth',
    baaStatus: 'unconfirmed',
    plan: 'Pro plan required for BAA',
    notes: 'BAA available on Supabase Pro ($25/mo+). Must be requested via Supabase dashboard under Settings > Security.',
    baaLink: 'https://supabase.com/dashboard/project/_/settings/general',
  },
  {
    name: 'Daily.co',
    role: 'Telehealth Video Infrastructure',
    baaStatus: 'unconfirmed',
    plan: 'HIPAA-eligible plan required',
    notes: 'Daily.co offers a HIPAA-eligible plan with BAA. Contact sales at daily.co/hipaa to request BAA before enabling recordings.',
    baaLink: 'https://www.daily.co/hipaa',
  },
  {
    name: 'OpenAI',
    role: 'AI Features (Aminy AI)',
    baaStatus: 'unconfirmed',
    plan: 'Enterprise only — not on standard API',
    notes: 'Current plan: Standard API. OpenAI BAA only available on Enterprise tier. PHI must NOT be sent to OpenAI until Enterprise + BAA is in place. Use de-identified data for AI features.',
    baaLink: 'https://openai.com/security',
  },
  {
    name: 'Stripe',
    role: 'Payment Processing',
    baaStatus: 'not-applicable',
    plan: 'PCI DSS compliant — not a covered entity',
    notes: 'Stripe does not process PHI directly (only payment data). No BAA required. Stripe is PCI DSS Level 1 certified.',
    baaLink: 'https://stripe.com/docs/security',
  },
  {
    name: 'Vercel',
    role: 'Hosting & CDN',
    baaStatus: 'unconfirmed',
    plan: 'Enterprise plan required',
    notes: 'Vercel offers a BAA on Enterprise plans. If PHI is cached or logged at the CDN level, a BAA is required.',
    baaLink: 'https://vercel.com/docs/security/hipaa',
  },
];

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<BAAConfirmation, {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}> = {
  confirmed: {
    label: 'BAA Confirmed',
    color: 'text-[#6B9080]',
    bg: 'bg-[#6B9080]/10 border-[#6B9080]/20',
    icon: <CheckCircle className="w-5 h-5 text-[#6B9080]" />,
  },
  unconfirmed: {
    label: 'BAA Needed',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
  },
  'not-applicable': {
    label: 'Not Required',
    color: 'text-[#5A6B7A]',
    bg: 'bg-[#FAF7F2] border-[#E8E4DF]',
    icon: <Shield className="w-5 h-5 text-[#8A9BA8]" />,
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function VendorRow({ vendor, index }: { vendor: VendorBAA; index: number }) {
  const cfg = STATUS_CONFIG[vendor.baaStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-xl border p-4 ${cfg.bg}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#1B2733]">{vendor.name}</h3>
            <span className="text-xs text-[#5A6B7A]">· {vendor.role}</span>
          </div>
          <p className="text-sm text-[#5A6B7A] mt-0.5">{vendor.plan}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {cfg.icon}
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
      </div>

      <p className="text-sm text-[#3A4A57] leading-relaxed">{vendor.notes}</p>

      {vendor.baaLink && (
        <a
          href={vendor.baaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B9080] hover:text-[#6B9080] transition-colors"
        >
          {vendor.baaStatus === 'unconfirmed' ? 'Confirm BAA' : 'View Security Docs'}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface BAAStatusProps {
  onBack?: () => void;
}

export default function BAAStatus({ onBack }: BAAStatusProps) {
  const unconfirmedCount = VENDORS.filter(v => v.baaStatus === 'unconfirmed').length;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-[#F0EDE8] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
            </button>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#6B9080]" />
              <h1 className="text-xl font-bold text-[#1B2733]">BAA Status</h1>
            </div>
            <p className="text-sm text-[#5A6B7A] mt-0.5">
              Business Associate Agreement tracker — HIPAA compliance
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Summary banner */}
        {unconfirmedCount > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">
                {unconfirmedCount} BAA{unconfirmedCount > 1 ? 's' : ''} need confirmation
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                PHI must not be stored or processed by any vendor without a signed BAA.
                Confirm all BAAs before going live with real patient data.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 bg-[#6B9080]/10 border border-[#6B9080]/20 rounded-xl p-4"
          >
            <CheckCircle className="w-5 h-5 text-[#6B9080] flex-shrink-0 mt-0.5" />
            <p className="font-semibold text-[#6B9080]">All required BAAs confirmed</p>
          </motion.div>
        )}

        {/* Vendor list */}
        {VENDORS.map((vendor, i) => (
          <VendorRow key={vendor.name} vendor={vendor} index={i} />
        ))}

        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <p className="text-xs text-[#5A6B7A] leading-relaxed">
            <strong>What is a BAA?</strong> A Business Associate Agreement (BAA) is a legally required
            contract between a HIPAA-covered entity (or business associate) and a vendor that will handle
            Protected Health Information (PHI). Under HIPAA, all vendors who process, store, or transmit
            PHI on your behalf must sign a BAA. Failure to obtain BAAs is one of the most common HIPAA
            violations and can result in civil monetary penalties.
          </p>
        </div>

        <p className="text-center text-xs text-[#8A9BA8] pb-4">
          Last updated: April 3, 2026 · Aminy Compliance Team
        </p>
      </div>
    </div>
  );
}
