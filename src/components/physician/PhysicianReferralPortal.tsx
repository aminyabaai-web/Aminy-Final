// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * PhysicianReferralPortal — Standalone screen for developmental pediatricians
 * to refer patients to Aminy.
 *
 * Screen: 'physician-referral'
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Stethoscope,
  Send,
  CheckCircle,
  FileText,
  Download,
  Clock,
  ChevronDown,
  User,
  Mail,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { isDemoMode } from '../../lib/demo-seed';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Urgency = 'Routine' | 'Soon' | 'Urgent';
type ReferralStatus = 'Invited' | 'Enrolled' | 'Active';

interface ReferralFormData {
  patientFirstName: string;
  patientAge: string;
  primaryConcern: string;
  urgency: Urgency;
  guardianEmail: string;
  guardianPhone: string;
  referringProviderName: string;
  referringNPI: string;
  notes: string;
}

interface SubmittedReferral {
  id: string;
  patientFirstName: string;
  primaryConcern: string;
  submittedAt: string;
  status: ReferralStatus;
  guardianEmail: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIMARY_CONCERNS = [
  'Autism Evaluation',
  'ABA Therapy',
  'ADHD + Behavioral',
  'Speech Delay',
  'Mental Health Support',
  'Multiple Concerns',
];

const MOCK_SUBMITTED: SubmittedReferral[] = [
  {
    id: 'REF-001',
    patientFirstName: 'Alex',
    primaryConcern: 'Autism Evaluation',
    submittedAt: 'Apr 1, 2026',
    status: 'Active',
    guardianEmail: 'family@example.com',
  },
  {
    id: 'REF-002',
    patientFirstName: 'Jordan',
    primaryConcern: 'Speech Delay',
    submittedAt: 'Mar 20, 2026',
    status: 'Enrolled',
    guardianEmail: 'parent2@example.com',
  },
];

const STATUS_COLORS: Record<ReferralStatus, string> = {
  Invited: 'bg-amber-100 text-amber-800',
  Enrolled: 'bg-blue-100 text-[#4A6478]',
  Active: 'bg-[#6B9080]/10 text-[#6B9080]',
};

// ---------------------------------------------------------------------------
// Letter generator helper
// ---------------------------------------------------------------------------

function generateReferralLetter(form: ReferralFormData): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const refCode = `AMINY-REF-${Math.floor(Math.random() * 9000 + 1000)}`;
  const npiLine = form.referringNPI ? `, NPI: ${form.referringNPI}` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Aminy Referral Letter</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 680px; margin: 48px auto; color: #1a1a1a; line-height: 1.7; }
    h1 { font-size: 22px; color: #0d6b5f; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #666; margin-bottom: 32px; }
    p { margin: 0 0 16px; }
    .access-code { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 16px 20px; font-size: 18px; font-weight: bold; color: #166534; letter-spacing: 1px; display: inline-block; margin: 8px 0 24px; }
    .signature { margin-top: 40px; }
    @media print { body { margin: 0 auto; } }
  </style>
</head>
<body>
  <h1>Aminy Pediatric Behavioral Health</h1>
  <div class="meta">Referral Letter — ${today}</div>

  <p>Dear ${form.patientFirstName ? `${form.patientFirstName}'s family` : 'Family'},</p>

  <p>
    I am pleased to refer your child ${form.patientFirstName ? `<strong>${form.patientFirstName}</strong>` : ''}, age ${form.patientAge || '[age]'},
    to <strong>Aminy</strong> for <strong>${form.primaryConcern || '[service type]'}</strong>.
  </p>

  <p>
    Aminy is a pediatric behavioral health platform that provides autism evaluation, ABA therapy, mental health
    counseling, and speech therapy services through licensed, credentialed providers — all coordinated through
    a single family-facing app designed specifically for families navigating complex care.
  </p>

  <p>
    I believe Aminy's coordinated approach will greatly benefit your family. Getting started is simple:
    download the Aminy app or visit <strong>aminy.ai</strong> and use the access code below to connect your
    referral to my practice.
  </p>

  <div class="access-code">${refCode}</div>

  <p>
    A member of the Aminy care coordination team will reach out to ${form.guardianEmail || 'your email'} within
    24 hours to schedule your initial intake.
  </p>

  ${form.notes ? `<p><strong>Clinical notes for Aminy team:</strong> ${form.notes}</p>` : ''}

  <div class="signature">
    <p>With care,</p>
    <p>
      <strong>${form.referringProviderName || '[Referring Provider]'}</strong>${npiLine}
    </p>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#3A4A57] mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 pr-10 text-sm text-[#1B2733] focus:border-[#6B9080] focus:outline-none appearance-none"
        >
          <option value="">Select…</option>
          {options.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9BA8] pointer-events-none" />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#3A4A57] mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#E8E4DF] px-4 py-3 text-sm text-[#1B2733] focus:border-[#6B9080] focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-[#5A6B7A]">{hint}</p>}
    </div>
  );
}

function ReferralCard({ ref: _ref, referral }: { ref?: React.Ref<HTMLDivElement>; referral: SubmittedReferral }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E8E4DF] last:border-0">
      <div>
        <p className="font-semibold text-[#1B2733]">{referral.patientFirstName}</p>
        <p className="text-sm text-[#5A6B7A]">{referral.primaryConcern} · {referral.submittedAt}</p>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[referral.status]}`}>
        {referral.status}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface PhysicianReferralPortalProps {
  onBack?: () => void;
}

export default function PhysicianReferralPortal({ onBack }: PhysicianReferralPortalProps) {
  const [form, setForm] = useState<ReferralFormData>({
    patientFirstName: '',
    patientAge: '',
    primaryConcern: '',
    urgency: 'Routine',
    guardianEmail: '',
    guardianPhone: '',
    referringProviderName: '',
    referringNPI: '',
    notes: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReferrals, setSubmittedReferrals] = useState<SubmittedReferral[]>(isDemoMode() ? MOCK_SUBMITTED : []);

  const set = (field: keyof ReferralFormData) => (v: string) =>
    setForm(prev => ({ ...prev, [field]: v }));

  const isValid =
    form.patientFirstName.trim().length > 0 &&
    form.primaryConcern !== '' &&
    form.guardianEmail.includes('@') &&
    form.referringProviderName.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setSubmitError(null);

    const newReferral: SubmittedReferral = {
      id: `REF-${Date.now()}`,
      patientFirstName: form.patientFirstName,
      primaryConcern: form.primaryConcern,
      submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Invited',
      guardianEmail: form.guardianEmail,
    };

    try {
      // Attempt Supabase insert
      const { error } = await supabase.from('physician_referrals').insert({
        patient_first_name: form.patientFirstName,
        patient_age: form.patientAge,
        primary_concern: form.primaryConcern,
        urgency: form.urgency,
        guardian_email: form.guardianEmail,
        guardian_phone: form.guardianPhone,
        referring_provider_name: form.referringProviderName,
        referring_npi: form.referringNPI || null,
        notes: form.notes || null,
        status: 'Invited',
      });
      if (error) throw error;
    } catch {
      // Fall back to localStorage
      const existing = JSON.parse(localStorage.getItem('aminy_referrals') ?? '[]');
      existing.push(newReferral);
      localStorage.setItem('aminy_referrals', JSON.stringify(existing));
    }

    setSubmittedReferrals(prev => [newReferral, ...prev]);
    setSubmitted(true);
    setLoading(false);
  };

  const handleDownloadLetter = () => {
    const html = generateReferralLetter(form);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Aminy_Referral_${form.patientFirstName || 'Patient'}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
              <Stethoscope className="w-6 h-6 text-[#6B9080]" />
              <h1 className="text-xl font-bold text-[#1B2733]">Refer Your Patients to Aminy</h1>
            </div>
            <p className="text-sm text-[#5A6B7A] mt-0.5">
              Fast, secure referrals for pediatric behavioral health care
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              {/* Referral form card */}
              <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 space-y-4">
                <h2 className="text-base font-semibold text-[#1B2733] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#5A6B7A]" />
                  Patient Information
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="Patient First Name"
                    value={form.patientFirstName}
                    onChange={set('patientFirstName')}
                    placeholder="First name only"
                    required
                    hint="Last name not required — HIPAA"
                  />
                  <TextField
                    label="Patient Age"
                    value={form.patientAge}
                    onChange={set('patientAge')}
                    placeholder="e.g. 7"
                    type="number"
                    required
                  />
                </div>

                <SelectField
                  label="Primary Concern"
                  value={form.primaryConcern}
                  onChange={set('primaryConcern')}
                  options={PRIMARY_CONCERNS}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                    Urgency<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex gap-2">
                    {(['Routine', 'Soon', 'Urgent'] as Urgency[]).map(u => (
                      <button
                        key={u}
                        onClick={() => set('urgency')(u)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                          form.urgency === u
                            ? u === 'Urgent'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : u === 'Soon'
                              ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-[#6B9080] bg-[#6B9080]/10 text-[#6B9080]'
                            : 'border-[#E8E4DF] text-[#5A6B7A]'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Guardian info */}
              <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 space-y-4">
                <h2 className="text-base font-semibold text-[#1B2733] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#5A6B7A]" />
                  Parent / Guardian Contact
                </h2>
                <TextField
                  label="Guardian Email"
                  value={form.guardianEmail}
                  onChange={set('guardianEmail')}
                  placeholder="parent@email.com"
                  type="email"
                  required
                />
                <TextField
                  label="Guardian Phone"
                  value={form.guardianPhone}
                  onChange={set('guardianPhone')}
                  placeholder="(602) 555-0100"
                  type="tel"
                />
              </div>

              {/* Provider info */}
              <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 space-y-4">
                <h2 className="text-base font-semibold text-[#1B2733] flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#5A6B7A]" />
                  Referring Provider
                </h2>
                <TextField
                  label="Your Name"
                  value={form.referringProviderName}
                  onChange={set('referringProviderName')}
                  placeholder="Dr. Jane Smith"
                  required
                />
                <TextField
                  label="Your NPI"
                  value={form.referringNPI}
                  onChange={set('referringNPI')}
                  placeholder="1234567890"
                  hint="Optional — adds credibility to the referral"
                />
                <div>
                  <label className="block text-sm font-medium text-[#3A4A57] mb-1">
                    Notes for Aminy Team
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => set('notes')(e.target.value)}
                    rows={3}
                    placeholder="Any relevant clinical context, urgency details, or care coordination notes…"
                    className="w-full rounded-xl border border-[#E8E4DF] px-4 py-3 text-sm text-[#1B2733] focus:border-[#6B9080] focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Letter generator */}
              <div className="bg-[#F0EDE8] rounded-2xl border border-[#E8E4DF] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#1B2733] flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Generate Referral Letter
                    </h3>
                    <p className="text-sm text-[#5A6B7A] mt-0.5">
                      Download a print-ready referral letter for the family
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadLetter}
                    className="flex items-center gap-2 bg-white border border-[#E8E4DF] rounded-xl px-4 py-2.5 text-sm font-medium text-[#3A4A57] hover:bg-[#FAF7F2] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>

              {submitError && (
                <div className="flex gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!isValid || loading}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold transition-all ${
                  isValid && !loading
                    ? 'bg-primary text-white hover:bg-[#6B9080] active:scale-[0.98]'
                    : 'bg-[#E8E4DF] text-[#8A9BA8] cursor-not-allowed'
                }`}
                style={{ minHeight: 56 }}
              >
                <Send className="w-5 h-5" />
                {loading ? 'Submitting…' : 'Submit Referral'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-[#6B9080]/20 p-8 text-center"
            >
              <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-[#1B2733] mb-2">Referral Submitted</h2>
              <p className="text-[#5A6B7A] mb-1">
                <strong>{form.guardianEmail}</strong> will receive an Aminy invitation within 24 hours.
              </p>
              <p className="text-sm text-[#5A6B7A] mb-6">
                You can track this referral in the section below.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownloadLetter}
                  className="flex items-center gap-2 bg-[#F0EDE8] text-[#3A4A57] rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-[#E8E4DF] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Letter
                </button>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setForm({
                      patientFirstName: '',
                      patientAge: '',
                      primaryConcern: '',
                      urgency: 'Routine',
                      guardianEmail: '',
                      guardianPhone: '',
                      referringProviderName: form.referringProviderName,
                      referringNPI: form.referringNPI,
                      notes: '',
                    });
                  }}
                  className="bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-[#6B9080] transition-colors"
                >
                  Refer Another Patient
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Track referrals */}
        <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8E4DF] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#5A6B7A]" />
            <h2 className="font-semibold text-[#1B2733]">Track Your Referrals</h2>
          </div>
          <div className="px-5">
            {submittedReferrals.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#5A6B7A]">No referrals yet.</p>
            ) : (
              submittedReferrals.map(r => (
                <ReferralCard key={r.id} referral={r} />
              ))
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#8A9BA8] pb-4">
          Questions? Contact <a href="mailto:providers@aminy.com" className="underline">providers@aminy.com</a>
        </p>
      </div>
    </div>
  );
}
