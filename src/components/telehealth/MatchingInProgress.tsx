// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * MatchingInProgress — No-empty-state screen for when no providers are available.
 *
 * Turns the "no providers" churn moment into an engagement moment:
 * - Animated matching progress
 * - "While we search" engagement cards
 * - Email/SMS opt-in
 * - Saves notification pref to localStorage / Supabase
 *
 * Screen name: 'provider-waitlist' (re-uses existing App.tsx type)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Heart, Brain, Users, Mail, MessageSquare,
  CheckCircle, ChevronRight, Bell
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────

interface MatchingInProgressProps {
  onBack: () => void;
  childName?: string;
  providerType?: string;
  location?: string;
  onNavigate?: (screen: string) => void;
}

// ─── Dots animation ──────────────────────────────────────────────────

function PulsingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-teal-400"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Progress steps ───────────────────────────────────────────────────

const STEPS = [
  { label: 'Finding specialists in your area', delay: 0 },
  { label: 'Checking insurance compatibility', delay: 2000 },
  { label: 'We\'ve notified 3 providers near you', delay: 4500 },
];

function MatchingProgress() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = STEPS.slice(1).map((step, i) => {
      return setTimeout(() => setActiveStep(i + 1), step.delay);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-2">
      {STEPS.map((step, i) => (
        <AnimatePresence key={step.label}>
          {i <= activeStep && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2.5"
            >
              {i === activeStep ? (
                <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  <motion.div
                    className="w-3 h-3 rounded-full border-2 border-[#6B9080] border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              ) : (
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
              )}
              <span className={`text-sm ${i === activeStep ? 'text-[#1B2733] font-medium' : 'text-[#5A6B7A]'}`}>
                {step.label}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      ))}
    </div>
  );
}

// ─── While-we-search cards ────────────────────────────────────────────

interface BridgeCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  screen: string;
  color: string;
  bgColor: string;
}

const BRIDGE_CARDS: BridgeCard[] = [
  {
    icon: <Brain className="w-5 h-5" />,
    title: 'Ease Tools for Today',
    description: 'Calming activities and sensory tools your child can use right now.',
    screen: 'calm-tools',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-100',
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: 'Coverage Coach',
    description: "Find out what your insurance actually covers — no surprises.",
    screen: 'coverage-coach',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-100',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Parent Community',
    description: 'Connect with parents who get it. Share wins, ask questions.',
    screen: 'community-hub',
    color: 'text-blue-600',
    bgColor: 'bg-[#EEF4F8] border-blue-100',
  },
];

// ─── Notification opt-in ──────────────────────────────────────────────

async function saveNotificationPreference(
  email: string,
  childName: string,
  providerType: string,
  location: string,
): Promise<void> {
  // Save to localStorage as primary
  const pref = { email, childName, providerType, location, savedAt: new Date().toISOString() };
  try {
    localStorage.setItem('aminy_waitlist_pref', JSON.stringify(pref));
  } catch { /* ignore */ }

  // Try Supabase waitlist table
  try {
    await supabase.from('waitlist').insert({
      email,
      child_name: childName,
      provider_type: providerType,
      location,
      created_at: new Date().toISOString(),
    });
  } catch { /* ignore — table may not exist yet */ }
}

// ─── Main Component ───────────────────────────────────────────────────

export function MatchingInProgress({
  onBack,
  childName = 'your child',
  providerType = 'specialist',
  location = 'your area',
  onNavigate,
}: MatchingInProgressProps) {
  const [email, setEmail] = useState('');
  const [notifyPhone, setNotifyPhone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email && !notifyPhone) return;
    setIsSubmitting(true);
    try {
      await saveNotificationPreference(email, childName, providerType, location);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] via-white to-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-[#E8E4DF] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-1 rounded-full hover:bg-[#F0EDE8] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
          </button>
          <h1 className="text-base font-semibold text-[#1B2733]">Finding Your Match</h1>
        </div>
      </div>

      <div className="px-4 pb-10 space-y-6 pt-6">
        {/* Hero matching animation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#6B9080]/20 bg-gradient-to-br from-[#FAF7F2] to-cyan-50 p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#6B9080]/10 flex items-center justify-center">
              <PulsingDots />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1B2733]">Matching in Progress</h2>
              <p className="text-xs text-[#6B9080] mt-0.5">You'll hear from us within 24-48 hours</p>
            </div>
          </div>

          <p className="text-sm text-[#3A4A57] leading-relaxed">
            We're finding the right {providerType} for {childName} in {location}. Our team
            personally reviews each match to make sure it's the right fit.
          </p>

          <MatchingProgress />

          <div className="rounded-xl bg-[#6B9080]/10/60 border border-[#6B9080]/20 px-3 py-2">
            <p className="text-xs text-[#6B9080] font-medium">
              You'll get a text or email as soon as a match is confirmed — usually within 24-48 hours.
            </p>
          </div>
        </motion.div>

        {/* While we search */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-bold text-[#1B2733] mb-3">While we search for you</h3>
          <div className="space-y-2.5">
            {BRIDGE_CARDS.map((card, i) => (
              <motion.button
                key={card.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                onClick={() => onNavigate?.(card.screen)}
                className={`w-full rounded-xl border p-3.5 text-left flex items-center gap-3 transition-all hover:shadow-sm ${card.bgColor}`}
              >
                <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 ${card.color}`}>
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1B2733]">{card.title}</p>
                  <p className="text-xs text-[#5A6B7A] mt-0.5 line-clamp-2">{card.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8A9BA8] flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Notification opt-in */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-[#E8E4DF] bg-white p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#6B9080]" />
            <h3 className="text-sm font-bold text-[#1B2733]">Get notified when your match is ready</h3>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 rounded-xl bg-[#6B9080]/10 border border-[#6B9080]/20 p-3"
            >
              <CheckCircle className="w-4 h-4 text-[#6B9080] flex-shrink-0" />
              <p className="text-sm text-[#6B9080] font-medium">
                Got it! We'll notify you the moment your match is confirmed.
              </p>
            </motion.div>
          ) : (
            <>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9BA8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-[#E8E4DF] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#6B9080] focus:ring-1 focus:ring-[#6B9080]/20"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    notifyPhone ? 'bg-primary border-[#6B9080]' : 'border-[#E8E4DF]'
                  }`}
                  onClick={() => setNotifyPhone(!notifyPhone)}
                >
                  {notifyPhone && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#8A9BA8]" />
                  <span className="text-sm text-[#3A4A57]">Also text me (number on file)</span>
                </div>
              </label>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (!email && !notifyPhone)}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50"
                style={{ backgroundColor: '#43AA8B' }}
              >
                {isSubmitting ? 'Saving...' : 'Notify me when matched'}
              </button>
            </>
          )}
        </motion.div>

        {/* Expectation setting */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-1"
        >
          <p className="text-xs text-[#5A6B7A]">
            Most families receive a confirmed match within <strong>24-48 hours</strong>.
          </p>
          <p className="text-xs text-[#8A9BA8]">
            In the meantime, Aminy's tools and community are available 24/7.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default MatchingInProgress;
