// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * COPPAConsentGate — Parental consent gate for child profiles under 13
 *
 * Required by COPPA before collecting any info about children under 13.
 * Screen: 'coppa-consent'
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface COPPAConsentRecord {
  childName: string;
  childAge: number;
  guardianUserId?: string;
  consentedAt: string; // ISO timestamp
  consentVersion: string;
}

interface COPPAConsentGateProps {
  childName: string;
  childAge: number;
  guardianUserId?: string;
  onConsentGranted: (record: COPPAConsentRecord) => void;
  onDecline: () => void;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONSENT_VERSION = '1.0-2026-04';

async function saveConsentRecord(record: COPPAConsentRecord): Promise<void> {
  // Try Supabase first, fall back to localStorage
  try {
    const { error } = await supabase
      .from('coppa_consents')
      .insert({
        child_name: record.childName,
        child_age: record.childAge,
        guardian_user_id: record.guardianUserId ?? null,
        consented_at: record.consentedAt,
        consent_version: record.consentVersion,
      });
    if (error) throw error;
  } catch {
    // Supabase not available — persist locally
    const existing = JSON.parse(localStorage.getItem('aminy_coppa_consents') ?? '[]');
    existing.push(record);
    localStorage.setItem('aminy_coppa_consents', JSON.stringify(existing));
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function COPPAConsentGate({
  childName,
  childAge,
  guardianUserId,
  onConsentGranted,
  onDecline,
  onBack,
}: COPPAConsentGateProps) {
  const [isGuardian, setIsGuardian] = useState(false);
  const [consentInfo, setConsentInfo] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = isGuardian && consentInfo && consentPrivacy;

  const handleGrant = async () => {
    if (!allChecked) return;
    setLoading(true);
    setError(null);

    const record: COPPAConsentRecord = {
      childName,
      childAge,
      guardianUserId,
      consentedAt: new Date().toISOString(),
      consentVersion: CONSENT_VERSION,
    };

    try {
      await saveConsentRecord(record);
      onConsentGranted(record);
    } catch (err) {
      setError('Could not save consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-4 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-[#F0EDE8] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
          </button>
        )}
        <Shield className="w-6 h-6 text-[#6B9080] flex-shrink-0" />
        <h1 className="text-lg font-bold text-[#1B2733]">Parent Permission Required</h1>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Info banner */}
          <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-relaxed">
              Because <strong>{childName}</strong> is {childAge} years old, federal law (COPPA) requires
              us to get your explicit consent before collecting any information about your child.
            </p>
          </div>

          {/* Explanation */}
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-5">
            <h2 className="text-base font-semibold text-[#1B2733] mb-3">
              What Aminy collects for {childName}
            </h2>
            <p className="text-sm text-[#3A4A57] leading-relaxed">
              Aminy collects limited information about your child to personalize their therapy tools,
              track developmental progress, and coordinate care with their providers. This includes:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-[#3A4A57] ml-4 list-disc">
              <li>First name and age range</li>
              <li>Developmental diagnoses you share with us</li>
              <li>Activity participation and engagement data in Junior Mode</li>
              <li>Session progress notes from licensed providers</li>
            </ul>
            <p className="mt-3 text-sm text-[#3A4A57] leading-relaxed">
              We do <strong>not</strong> collect your child&apos;s last name, school information,
              photos, or location without additional explicit consent. We never sell this data.
            </p>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <CheckboxItem
              checked={isGuardian}
              onChange={setIsGuardian}
              label={
                <>
                  I am the parent or legal guardian of{' '}
                  <strong>{childName}</strong>, age {childAge}
                </>
              }
            />
            <CheckboxItem
              checked={consentInfo}
              onChange={setConsentInfo}
              label={
                <>
                  I consent to Aminy collecting limited profile information for this child as
                  described above and in compliance with{' '}
                  <abbr title="Children's Online Privacy Protection Act">COPPA</abbr>
                </>
              }
            />
            <CheckboxItem
              checked={consentPrivacy}
              onChange={setConsentPrivacy}
              label={
                <>
                  I have read and agree to Aminy&apos;s{' '}
                  <a
                    href="#privacy-policy"
                    className="text-[#6B9080] underline"
                    onClick={e => {
                      e.preventDefault();
                      // In a real app, navigate to privacy policy
                    }}
                  >
                    Privacy Policy
                  </a>
                </>
              }
            />
          </div>

          {/* COPPA rights reminder */}
          <div className="bg-[#6B9080]/10 border border-[#6B9080]/20 rounded-xl p-4">
            <p className="text-xs text-[#6B9080] leading-relaxed">
              <strong>Your rights under COPPA:</strong> You may review, update, or request deletion of your
              child&apos;s information at any time by contacting us at{' '}
              <a href="mailto:privacy@aminy.com" className="underline">
                privacy@aminy.com
              </a>
              . You can also withdraw this consent at any time from your account settings.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
        </motion.div>
      </div>

      {/* Footer actions */}
      <div className="bg-white border-t border-[#E8E4DF] px-4 py-4 space-y-3">
        <button
          onClick={handleGrant}
          disabled={!allChecked || loading}
          className={`w-full rounded-xl py-4 font-semibold text-base transition-all ${
            allChecked && !loading
              ? 'bg-primary text-white hover:bg-[#6B9080] active:scale-[0.98]'
              : 'bg-[#E8E4DF] text-[#8A9BA8] cursor-not-allowed'
          }`}
          style={{ minHeight: 56 }}
        >
          {loading ? 'Saving...' : 'Grant Consent & Continue'}
        </button>
        <button
          onClick={onDecline}
          className="w-full py-3 text-base text-[#5A6B7A] hover:text-[#3A4A57] transition-colors"
        >
          Not Now — Go Back
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checkbox helper
// ---------------------------------------------------------------------------

function CheckboxItem({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer rounded-xl border-2 border-[#E8E4DF] bg-white p-4 transition-colors hover:border-[#6B9080]/30 has-[:checked]:border-[#6B9080] has-[:checked]:bg-[#6B9080]/10">
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
            checked ? 'bg-primary border-[#6B9080]' : 'border-[#E8E4DF] bg-white'
          }`}
          style={{ minWidth: 24, minHeight: 24 }}
        >
          {checked && <CheckCircle className="w-4 h-4 text-white" />}
        </div>
      </div>
      <p className="text-sm text-[#3A4A57] leading-relaxed flex-1">{label}</p>
    </label>
  );
}
