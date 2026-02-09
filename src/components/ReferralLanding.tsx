/**
 * Referral Landing Page
 * Handles /join?ref=CODE URLs for referral program
 * Captures referral code and redirects to signup
 */

import React, { useEffect, useState } from 'react';
import { Gift, ArrowRight, Sparkles, Heart, Bot, BarChart3, UserCircle, ClipboardList } from 'lucide-react';
import { trackReferral } from '../lib/referral-program';

interface ReferralLandingProps {
  onNavigateToSignup: () => void;
  onNavigateToLogin: () => void;
}

const REFERRAL_CODE_KEY = 'aminy_referral_code';

/**
 * Store referral code for attribution after signup
 */
export function storeReferralCode(code: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFERRAL_CODE_KEY, code);
    localStorage.setItem('aminy_referral_timestamp', new Date().toISOString());
  }
}

/**
 * Get stored referral code (for post-signup attribution)
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;

  const code = localStorage.getItem(REFERRAL_CODE_KEY);
  const timestamp = localStorage.getItem('aminy_referral_timestamp');

  // Expire after 30 days
  if (code && timestamp) {
    const storedDate = new Date(timestamp);
    const now = new Date();
    const daysDiff = (now.getTime() - storedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 30) {
      clearStoredReferralCode();
      return null;
    }
  }

  return code;
}

/**
 * Clear stored referral code after attribution
 */
export function clearStoredReferralCode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFERRAL_CODE_KEY);
    localStorage.removeItem('aminy_referral_timestamp');
  }
}

/**
 * Apply referral after user signup (call this after user creates account)
 */
export async function applyReferralAfterSignup(newUserId: string): Promise<boolean> {
  const code = getStoredReferralCode();
  if (!code) return false;

  try {
    const referral = await trackReferral(code, newUserId);
    if (referral) {
      clearStoredReferralCode();
      return true;
    }
  } catch (error) {
    console.error('Failed to apply referral:', error);
  }

  return false;
}

export function ReferralLanding({ onNavigateToSignup, onNavigateToLogin }: ReferralLandingProps) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string>('A friend');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Parse referral code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');

    if (code) {
      setReferralCode(code);
      storeReferralCode(code);

      // Try to extract a friendly name from the code (e.g., AMINY-JOHN-ABC123)
      const parts = code.split('-');
      if (parts.length >= 2 && parts[1].length >= 2) {
        // Capitalize first letter of the extracted name portion
        const namePart = parts[1].charAt(0) + parts[1].slice(1).toLowerCase();
        setReferrerName(namePart);
      }
    }

    setIsProcessing(false);
  }, []);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F5F5F5] to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0891b2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F5F5] to-white">
      {/* Header */}
      <div className="px-6 py-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#43AA8B] to-[#0891b2] rounded-2xl mb-4">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D1B2A] mb-2">
            You've Been Invited!
          </h1>
          <p className="text-gray-600">
            {referrerName} thinks Aminy can help your family
          </p>
        </div>
      </div>

      {/* Gift Card */}
      <div className="px-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#43AA8B] to-[#0891b2] p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-6 h-6" />
              <span className="text-lg font-semibold">Your Welcome Gift</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold mb-1">$25 Credit</div>
            <p className="text-white/80 text-sm">
              Toward your first expert session
            </p>
          </div>

          <div className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3 text-gray-600 mb-4">
              <Heart className="w-5 h-5 text-[#E07A5F]" />
              <span className="text-sm">
                Plus, {referrerName} gets a free month when you join!
              </span>
            </div>

            {referralCode && (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Your referral code</p>
                <p className="font-mono font-semibold text-[#0891b2]">{referralCode}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What is Aminy */}
      <div className="px-6 mb-8">
        <h2 className="text-lg font-semibold text-[#0D1B2A] mb-4">
          What is Aminy?
        </h2>
        <div className="space-y-3">
          {[
            {
              Icon: Bot,
              title: 'AI Companion',
              desc: '24/7 support that remembers your child',
              color: 'text-teal-500',
            },
            {
              Icon: BarChart3,
              title: 'Progress Tracking',
              desc: 'See real improvement over time',
              color: 'text-blue-500',
            },
            {
              Icon: UserCircle,
              title: 'Expert Access',
              desc: 'Connect with BCBAs, SLPs, and more',
              color: 'text-purple-500',
            },
            {
              Icon: ClipboardList,
              title: 'Clinical Reports',
              desc: 'Share with schools and providers',
              color: 'text-amber-500',
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center`}>
                <item.Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="font-medium text-[#0D1B2A]">{item.title}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="px-6 pb-8 space-y-3">
        <button
          onClick={onNavigateToSignup}
          className="w-full bg-gradient-to-r from-[#43AA8B] to-[#0891b2] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          Claim Your $25 Credit
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={onNavigateToLogin}
          className="w-full bg-white text-[#0891b2] py-4 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          I Already Have an Account
        </button>
      </div>

      {/* Footer Note */}
      <div className="px-6 pb-8">
        <p className="text-xs text-center text-gray-500">
          Credit applies to marketplace sessions. Referral rewards subject to{' '}
          <span className="text-[#0891b2]">program terms</span>.
        </p>
      </div>
    </div>
  );
}

export default ReferralLanding;
