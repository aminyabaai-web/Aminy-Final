// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CarePackageSuccess
 *
 * Celebration screen shown after Stripe redirects back with ?payment=success.
 * Pure CSS animations only (no framer-motion) to avoid WAAPI opacity bug.
 */

import React, { useMemo, useEffect } from 'react';
import { CheckCircle, ArrowRight, Clock, Phone, FileText, Star, Users } from 'lucide-react';
import { fireConfetti } from '../../lib/confetti';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function getPackageIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('package');
}

type ServiceType = 'aba' | 'speech' | 'mh' | 'subscription' | 'unknown';

function inferServiceType(packageId: string | null): ServiceType {
  if (!packageId) return 'unknown';
  const id = packageId.toLowerCase();
  if (id.includes('aba')) return 'aba';
  if (id.includes('speech')) return 'speech';
  if (id.includes('mh') || id.includes('mental')) return 'mh';
  if (id.includes('sub')) return 'subscription';
  return 'unknown';
}

interface NextStep {
  icon: React.ReactNode;
  text: string;
}

function getNextSteps(serviceType: ServiceType): NextStep[] {
  switch (serviceType) {
    case 'aba':
      return [
        { icon: <Phone className="w-4 h-4 text-primary" />, text: 'A BCBA will call you within 24 hours to schedule your assessment.' },
        { icon: <FileText className="w-4 h-4 text-primary" />, text: "Complete your child's intake form in the app so we can personalize the plan." },
        { icon: <Star className="w-4 h-4 text-primary" />, text: 'Your first ABA session will be scheduled within 5 business days.' },
      ];
    case 'speech':
      return [
        { icon: <Phone className="w-4 h-4 text-primary" />, text: 'A licensed SLP will contact you within 24 hours to discuss goals.' },
        { icon: <FileText className="w-4 h-4 text-primary" />, text: "Fill in your child's communication history in the app to get started." },
        { icon: <Clock className="w-4 h-4 text-primary" />, text: 'Your first speech session will be booked at a time that works for you.' },
      ];
    case 'mh':
      return [
        { icon: <Phone className="w-4 h-4 text-primary" />, text: 'A mental health clinician will reach out within 24 hours.' },
        { icon: <FileText className="w-4 h-4 text-primary" />, text: 'Complete the wellbeing questionnaire inside the app to personalize care.' },
        { icon: <Clock className="w-4 h-4 text-primary" />, text: 'Your first session will be available to schedule immediately.' },
      ];
    case 'subscription':
      return [
        { icon: <Star className="w-4 h-4 text-primary" />, text: 'Your Aminy subscription is now active — all features unlocked.' },
        { icon: <Users className="w-4 h-4 text-primary" />, text: 'Add family members and caregivers to your care team.' },
        { icon: <Clock className="w-4 h-4 text-primary" />, text: 'You can cancel or pause anytime from Settings → Subscription.' },
      ];
    default:
      return [
        { icon: <Phone className="w-4 h-4 text-primary" />, text: 'Your care team will be in touch within 24 hours.' },
        { icon: <FileText className="w-4 h-4 text-primary" />, text: 'Check your email for a confirmation receipt from Stripe.' },
        { icon: <Star className="w-4 h-4 text-primary" />, text: 'Head to your dashboard to track progress and upcoming sessions.' },
      ];
  }
}

// ---------------------------------------------------------------------------
// CSS-only confetti dots (pure CSS, no framer-motion)
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = [
  '#2A7D99', '#E07A5F', '#3D5A80', '#F9C74F',
  '#90BE6D', '#F8961E', '#577590', '#F94144',
];

function ConfettiDots() {
  const dots = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      key: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${(i * 4.2) % 100}%`,
      delay: `${(i * 0.12) % 2}s`,
      duration: `${1.2 + (i % 5) * 0.3}s`,
      size: i % 3 === 0 ? 10 : i % 2 === 0 ? 7 : 5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
        }
        .confetti-dot {
          position: absolute;
          top: 0;
          border-radius: 2px;
          animation: confetti-fall linear infinite;
        }
      `}</style>
      {dots.map((d) => (
        <span
          key={d.key}
          className="confetti-dot"
          style={{
            left: d.left,
            width: d.size,
            height: d.size,
            backgroundColor: d.color,
            animationDelay: d.delay,
            animationDuration: d.duration,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated checkmark (CSS only)
// ---------------------------------------------------------------------------

function AnimatedCheckmark() {
  return (
    <>
      <style>{`
        @keyframes check-scale-in {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .check-animate {
          animation: check-scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
      <div className="check-animate">
        <CheckCircle className="w-20 h-20 text-primary" strokeWidth={1.5} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface CarePackageSuccessProps {
  onContinue: () => void;
}

export function CarePackageSuccess({ onContinue }: CarePackageSuccessProps) {
  const packageId = getPackageIdFromUrl();
  const serviceType = inferServiceType(packageId);
  const childName = getChildName();
  const nextSteps = getNextSteps(serviceType);

  useEffect(() => {
    // Slight delay so the page renders first
    const timer = setTimeout(() => fireConfetti('upgrade'), 400);
    return () => clearTimeout(timer);
  }, []);

  // Derive a readable package name from the URL param
  const packageDisplayName = packageId
    ? packageId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Care Package';

  return (
    <div className="min-h-screen bg-mist flex flex-col items-center">
      {/* Hero section */}
      <div className="relative w-full bg-gradient-to-b from-teal-600 to-teal-700 flex flex-col items-center pt-16 pb-12 overflow-hidden">
        <ConfettiDots />
        <AnimatedCheckmark />
        <h1 className="text-white text-2xl font-bold mt-5 text-center px-6">You're all set!</h1>
        <p className="text-teal-100 text-sm text-center mt-2 px-8 leading-relaxed">
          Your <span className="font-semibold text-white">{packageDisplayName}</span> care package is being set up.
          You'll hear from your care team within 24 hours.
        </p>
        {childName !== 'Your child' && (
          <div className="mt-4 bg-white/15 rounded-full px-5 py-2">
            <p className="text-teal-50 text-sm font-medium">
              Care for {childName} is on its way.
            </p>
          </div>
        )}
      </div>

      {/* What happens next */}
      <div className="w-full max-w-lg px-4 py-6 space-y-4">
        <h2 className="text-[#3A4A57] font-semibold text-base">What happens next</h2>
        <div className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sm divide-y divide-slate-100">
          {nextSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-4">
              <div className="mt-0.5 shrink-0">{step.icon}</div>
              <p className="text-sm text-[#5A6B7A] leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>

        {/* Confirmation note */}
        <p className="text-sm text-slate-400 text-center px-4">
          A payment receipt was sent to your email by Stripe. Keep it for your records.
        </p>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full bg-primary hover:bg-primary text-white font-semibold py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2 mt-2"
        >
          Go to My Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
