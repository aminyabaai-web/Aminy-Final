// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CarePackageCheckoutScreen
 *
 * Full-screen checkout UI for care package purchases.
 * Mobile-first (375px). Connects to Stripe via the stripe-checkout edge function.
 *
 * Dark navy header (#0D1B2A), white body, teal accents.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Lock,
  Check,
  ChevronDown,
  ChevronUp,
  Brain,
  MessageCircle,
  Heart,
  Star,
  Shield,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase/client';
import { createCarePackageCheckoutSession } from '../../lib/stripe-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectedCarePackage {
  id: string;
  name: string;
  serviceType: 'aba' | 'speech' | 'mh' | 'subscription';
  amount: number;
  recurring: boolean;
  description: string;
  highlights: string[];
  billingNote?: string;
}

interface CarePackageCheckoutScreenProps {
  selectedPackage: SelectedCarePackage | null;
  onBack: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SERVICE_TYPE_LABELS: Record<SelectedCarePackage['serviceType'], string> = {
  aba: 'ABA Therapy',
  speech: 'Speech Therapy',
  mh: 'Mental Health',
  subscription: 'Subscription',
};

const SERVICE_TYPE_ICONS: Record<SelectedCarePackage['serviceType'], React.ReactNode> = {
  aba: <Brain className="w-4 h-4" />,
  speech: <MessageCircle className="w-4 h-4" />,
  mh: <Heart className="w-4 h-4" />,
  subscription: <Star className="w-4 h-4" />,
};

function getChildName(): string {
  try {
    const raw = localStorage.getItem('aminy_child_profile');
    if (!raw) return 'Your child';
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const name = parsed?.childName;
    if (typeof name === 'string' && name.trim()) return name.trim();
  } catch {
    // ignore
  }
  return 'Your child';
}

function hasCancelledPayment(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('payment') === 'cancelled';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StripeBadge() {
  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1">
      <Lock className="w-3 h-3 text-white" />
      <span className="text-white text-xs font-medium">Stripe Secure</span>
    </div>
  );
}

interface HighlightsListProps {
  highlights: string[];
}

function HighlightsList({ highlights }: HighlightsListProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="font-semibold text-slate-800 text-sm">What's included</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {expanded && (
        <ul className="px-5 pb-4 space-y-2 border-t border-slate-100 pt-3">
          {highlights.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CarePackageCheckoutScreen({
  selectedPackage,
  onBack,
  onSuccess,
}: CarePackageCheckoutScreenProps) {
  const [loading, setLoading] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const childName = getChildName();

  useEffect(() => {
    if (hasCancelledPayment()) {
      setShowCancelled(true);
    }
  }, []);

  const handleCheckout = async () => {
    if (!selectedPackage) {
      toast.error('No package selected. Please go back and choose a plan.');
      return;
    }

    setLoading(true);

    try {
      // Get current user session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error('Please sign in to continue.');
        setLoading(false);
        return;
      }

      const { url } = await createCarePackageCheckoutSession({
        userId: session.user.id,
        email: session.user.email ?? '',
        carePackage: {
          id: selectedPackage.id,
          name: selectedPackage.name,
          description: selectedPackage.description,
          amount: selectedPackage.amount,
          recurring: selectedPackage.recurring,
          serviceType: selectedPackage.serviceType,
        },
      });

      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      toast.error(`Checkout failed: ${message}`);
      setLoading(false);
    }
  };

  // Fallback package when none passed (demo/dev guard)
  const pkg = selectedPackage ?? {
    id: 'default',
    name: 'Care Package',
    serviceType: 'aba' as const,
    amount: 0,
    recurring: false,
    description: 'No package selected.',
    highlights: [],
    billingNote: undefined,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Payment Cancelled Banner */}
      {showCancelled && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Payment was cancelled. Your care plan is still saved.
          </p>
          <button
            onClick={() => setShowCancelled(false)}
            className="ml-auto text-amber-500 hover:text-amber-700 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 px-4 pt-12 pb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-white font-semibold text-base">Secure Checkout</h1>
        <StripeBadge />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-28 space-y-4">

        {/* Package Summary Card */}
        <div className="bg-white rounded-2xl border-2 border-[#6B9080]/30 shadow-sm p-5">
          {/* Service type badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="inline-flex items-center gap-1.5 bg-[#6B9080]/10 text-[#6B9080] text-xs font-semibold px-3 py-1 rounded-full border border-[#6B9080]/20">
              {SERVICE_TYPE_ICONS[pkg.serviceType]}
              {SERVICE_TYPE_LABELS[pkg.serviceType]}
            </span>
          </div>

          {/* Package name */}
          <h2 className="text-xl font-bold text-slate-900 mb-2">{pkg.name}</h2>

          {/* Price */}
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-extrabold text-slate-900">
              ${pkg.amount.toLocaleString()}
            </span>
            <span className="text-slate-500 text-sm font-medium">
              {pkg.recurring ? '/month' : 'one-time'}
            </span>
          </div>

          {/* Highlights */}
          <ul className="space-y-2">
            {pkg.highlights.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What's included — expandable */}
        {pkg.highlights.length > 0 && <HighlightsList highlights={pkg.highlights} />}

        {/* Billing details */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm mb-1">Billing details</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Your first charge</span>
            <span className="font-semibold text-slate-900">${pkg.amount.toLocaleString()} today</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Billing</span>
            <span className="font-medium text-slate-700">
              {pkg.recurring ? 'Billed monthly. Cancel anytime.' : 'One-time payment. No subscription.'}
            </span>
          </div>
          {pkg.billingNote && (
            <p className="text-xs text-slate-400 mt-1">{pkg.billingNote}</p>
          )}
        </div>

        {/* Family info */}
        <div className="bg-[#6B9080]/10 rounded-2xl border border-teal-100 px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#6B9080]/10 flex items-center justify-center text-[#6B9080] font-bold text-sm shrink-0">
            {childName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-800">
              Setting up care for {childName}
            </p>
            <p className="text-xs text-[#6B9080]">Your care team will reach out within 24 hours.</p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-around py-3">
          <div className="flex flex-col items-center gap-1 text-center">
            <Lock className="w-5 h-5 text-slate-400" />
            <span className="text-xs text-slate-500 leading-tight">256-bit<br />encrypted</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Shield className="w-5 h-5 text-slate-400" />
            <span className="text-xs text-slate-500 leading-tight">HIPAA<br />compliant</span>
          </div>
          {pkg.recurring && (
            <div className="flex flex-col items-center gap-1 text-center">
              <RefreshCw className="w-5 h-5 text-slate-400" />
              <span className="text-xs text-slate-500 leading-tight">Cancel<br />anytime</span>
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 pt-4 pb-8 shadow-lg">
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-primary hover:bg-[#6B9080] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin w-5 h-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Preparing secure checkout...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Proceed to Secure Payment &rarr;
            </>
          )}
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">
          Secured by Stripe. Your payment info is never stored on our servers.
        </p>
      </div>
    </div>
  );
}
