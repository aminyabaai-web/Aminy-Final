// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderWaitlist — Optimistic waitlist experience when no providers available
 * Screen: 'provider-waitlist'
 *
 * Turns a dead-end booking state into a conversion moment.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Users,
  Heart,
  Star,
  BookOpen,
  Shield,
  MessageCircle,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase/client';
import { isDemoMode } from '../../lib/demo-seed';

interface ProviderWaitlistProps {
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
  serviceType?: 'ABA' | 'MH' | 'Speech' | '';
  zipCode?: string;
}

type ServiceType = 'ABA' | 'MH' | 'Speech';
type Urgency = 'routine' | 'within-2-weeks' | 'urgent';
type PayType = 'insurance' | 'cash-pay' | 'unsure';

interface WaitlistForm {
  service: ServiceType | '';
  preferredDays: string[];
  preferredTimes: string[];
  payType: PayType | '';
  zip: string;
  urgency: Urgency | '';
  email: string;
  name: string;
}

const SERVICES: { id: ServiceType; label: string; desc: string }[] = [
  { id: 'ABA', label: 'ABA Therapy', desc: 'Applied Behavior Analysis for skill building' },
  { id: 'MH', label: 'Mental Health', desc: 'Therapy & counseling support' },
  { id: 'Speech', label: 'Speech Therapy', desc: 'Language, feeding & communication' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIMES = ['Morning (8am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–8pm)'];

const URGENCY_OPTIONS: { id: Urgency; label: string; color: string }[] = [
  { id: 'routine', label: 'Routine — no rush', color: 'bg-[#F0EDE8] text-[#3A4A57]' },
  { id: 'within-2-weeks', label: 'Within 2 weeks', color: 'bg-amber-50 text-amber-700' },
  { id: 'urgent', label: 'Urgent need', color: 'bg-red-50 text-red-700' },
];

const WHILE_YOU_WAIT = [
  { icon: Sparkles, label: 'Ease Activities', desc: 'ABA-backed daily activities', screen: 'junior' },
  { icon: Shield, label: 'Coverage Coach', desc: 'Understand your benefits', screen: 'coverage-coach' },
  { icon: Users, label: 'Parent Community', desc: 'Connect with other families', screen: 'community-hub' },
  { icon: ShoppingBag, label: 'Resource Store', desc: 'Guides, templates & more', screen: 'store' },
];

export function ProviderWaitlist({
  onBack,
  onNavigate,
  serviceType = '',
  zipCode = '',
}: ProviderWaitlistProps) {
  const [form, setForm] = useState<WaitlistForm>({
    service: serviceType,
    preferredDays: [],
    preferredTimes: [],
    payType: '',
    zip: zipCode,
    urgency: '',
    email: '',
    name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  // Social-proof metrics ("12 families matched", "3.2 days avg", "4.9/5") are
  // illustrative figures for investor/AACT walk-throughs only. Real families
  // must never see fabricated match analytics, so gate them behind demo mode.
  const demo = isDemoMode();

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter((d) => d !== day)
        : [...prev.preferredDays, day],
    }));
  };

  const toggleTime = (time: string) => {
    setForm((prev) => ({
      ...prev,
      preferredTimes: prev.preferredTimes.includes(time)
        ? prev.preferredTimes.filter((t) => t !== time)
        : [...prev.preferredTimes, time],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.service || !form.email || !form.name || !form.zip || !form.urgency) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Try Supabase — fall back to localStorage for demo
      let savedToSupabase = false;
      try {
        const { error } = await supabase.from('provider_waitlist').insert({
          name: form.name,
          email: form.email,
          service_type: form.service,
          preferred_days: form.preferredDays,
          preferred_times: form.preferredTimes,
          pay_type: form.payType,
          zip_code: form.zip,
          urgency: form.urgency,
          created_at: new Date().toISOString(),
        });
        if (!error) savedToSupabase = true;
      } catch {
        // Supabase not configured — use localStorage
      }

      if (!savedToSupabase) {
        const existing = JSON.parse(
          localStorage.getItem('aminy_provider_waitlist') || '[]',
        );
        existing.push({ ...form, id: Date.now(), createdAt: new Date().toISOString() });
        localStorage.setItem('aminy_provider_waitlist', JSON.stringify(existing));
      }

      // Queue position is a simulated figure — only show it in demo walk-throughs,
      // never present a fabricated "#N in line" to a real family.
      setPosition(demo ? Math.floor(Math.random() * 8) + 2 : null);
      setSubmitted(true);
      toast.success("You're on the list! We'll be in touch within 24–48 hours.");
    } catch (err) {
      console.error('Waitlist error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-[#FAF7F2] to-white"
        style={{ overflowX: 'hidden', overflowY: 'auto' }}
      >
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Back */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-slate-400 text-sm mb-6 hover:text-[#5A6B7A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#6B9080]/10 mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#6B9080]" />
            </div>

            <h1 className="text-2xl font-bold text-[#132F43] mb-2">
              You're on the list!
            </h1>

            {position && (
              <p className="text-[#5A6B7A] mb-1">
                You're{' '}
                <span className="font-bold text-[#6B9080]">
                  #{position} in line
                </span>{' '}
                for {form.service} therapy
                {form.zip ? ` in ${form.zip}` : ''}.
              </p>
            )}

            <p className="text-[#5A6B7A] text-sm mb-6">
              We'll notify you within{' '}
              <span className="font-semibold">24–48 hours</span> when a match
              is available.
            </p>

            {/* Social proof (illustrative — demo walk-throughs only) */}
            {demo && (
              <Card className="p-4 bg-white border border-[#E8E4DF] mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-semibold text-[#3A4A57]">
                    12 families found a match last week
                  </span>
                </div>
                <p className="text-sm text-[#5A6B7A]">
                  Our average match time in Phoenix is 3.2 days. We prioritize
                  urgent cases.
                </p>
              </Card>
            )}

            {/* While you wait */}
            <div className="text-left">
              <p className="text-sm font-semibold text-[#5A6B7A] mb-3">
                While you wait:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {WHILE_YOU_WAIT.map((item) => (
                  <button
                    key={item.screen}
                    onClick={() => onNavigate?.(item.screen)}
                    className="flex flex-col gap-1 p-3 bg-white rounded-xl border border-[#E8E4DF] text-left hover:border-[#6B9080]/20 hover:bg-[#6B9080]/10 transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-[#6B9080]" />
                    <span className="text-sm font-semibold text-[#132F43]">
                      {item.label}
                    </span>
                    <span className="text-sm text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-50 to-white"
      style={{ overflowX: 'hidden', overflowY: 'auto' }}
    >
      <div className="max-w-lg mx-auto px-4 py-6 pb-16">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-[#E8E4DF] -mx-4 px-4 py-3 mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-lg hover:bg-[#F0EDE8] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
              </button>
            )}
            <div>
              <h1 className="text-base font-semibold text-[#132F43]">
                Join Provider Waitlist
              </h1>
              <p className="text-sm text-slate-400">We'll find your match</p>
            </div>
          </div>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-primary" />
            <Badge className="bg-[#6B9080]/10 text-[#6B9080] border-[#6B9080]/20">
              Growing in your area
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-[#132F43] mb-2">
            We're actively recruiting providers for your area
          </h2>
          <p className="text-sm text-[#5A6B7A]">
            {demo
              ? "You're not alone — 12 families found a match last week. Join the waitlist and we'll notify you the moment a provider opens up."
              : "Join the waitlist and we'll notify you the moment a provider opens up in your area."}
          </p>
        </motion.div>

        {/* Social proof strip — illustrative match metrics for demo walk-throughs only */}
        {demo ? (
          <div className="flex gap-3 mb-6">
            {[
              { icon: Users, label: '12 matches', sub: 'last week' },
              { icon: Clock, label: '3.2 days', sub: 'avg match time' },
              { icon: Star, label: '4.9/5', sub: 'match satisfaction' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-1 bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center"
              >
                <stat.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-sm font-bold text-[#132F43]">{stat.label}</p>
                <p className="text-sm text-slate-400">{stat.sub}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 bg-white rounded-xl border border-[#E8E4DF] p-3 mb-6">
            <Heart className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm text-[#5A6B7A]">
              We match families with vetted providers as soon as availability opens
              in your area — and prioritize urgent cases.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              Your name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Parent name"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8E4DF] text-sm text-[#132F43] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              Email for notifications <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8E4DF] text-sm text-[#132F43] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>

          {/* Service type */}
          <div>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              Service needed <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {SERVICES.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, service: svc.id }))}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    form.service === svc.id
                      ? 'border-[#6B9080] bg-[#6B9080]/10'
                      : 'border-[#E8E4DF] bg-white hover:border-[#6B9080]/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      form.service === svc.id
                        ? 'border-[#6B9080] bg-primary'
                        : 'border-slate-300'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#132F43]">
                      {svc.label}
                    </p>
                    <p className="text-sm text-slate-400">{svc.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Zip code */}
          <div>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              Zip code <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.zip}
              onChange={(e) => setForm((prev) => ({ ...prev, zip: e.target.value }))}
              placeholder="85018"
              maxLength={5}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8E4DF] text-sm text-[#132F43] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>

          {/* Preferred days */}
          <div>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              Preferred days
            </label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    form.preferredDays.includes(day)
                      ? 'bg-primary text-white'
                      : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred times */}
          <div>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              Preferred times
            </label>
            <div className="space-y-1.5">
              {TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => toggleTime(time)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm transition-colors ${
                    form.preferredTimes.includes(time)
                      ? 'border-[#6B9080] bg-[#6B9080]/10 text-[#6B9080] font-medium'
                      : 'border-[#E8E4DF] text-[#5A6B7A] hover:border-[#6B9080]/20'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${
                      form.preferredTimes.includes(time)
                        ? 'border-[#6B9080] bg-primary'
                        : 'border-slate-300'
                    }`}
                  />
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Pay type */}
          <div>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              Insurance or cash-pay?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'insurance', label: 'Insurance' },
                  { id: 'cash-pay', label: 'Cash-pay' },
                  { id: 'unsure', label: 'Not sure' },
                ] as { id: PayType; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, payType: opt.id }))}
                  className={`px-2 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.payType === opt.id
                      ? 'border-[#6B9080] bg-[#6B9080]/10 text-[#6B9080]'
                      : 'border-[#E8E4DF] text-[#5A6B7A] hover:border-[#6B9080]/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-[#3A4A57] mb-1.5">
              How urgent? <span className="text-red-400">*</span>
            </label>
            <div className="space-y-1.5">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, urgency: opt.id }))}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm font-medium transition-colors ${
                    form.urgency === opt.id
                      ? 'border-[#6B9080] bg-[#6B9080]/10 text-[#6B9080]'
                      : `border-[#E8E4DF] ${opt.color} hover:border-[#6B9080]/20`
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                      form.urgency === opt.id
                        ? 'border-[#6B9080] bg-primary'
                        : 'border-slate-300'
                    }`}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary text-white font-semibold h-12 rounded-xl text-sm mt-2"
          >
            {isSubmitting ? 'Joining...' : 'Join Waitlist'}
          </Button>

          <p className="text-sm text-center text-slate-400">
            We'll reach out within 24–48 hours when a match opens up. No spam.
          </p>
        </form>

        {/* While you wait */}
        <div className="mt-8">
          <p className="text-sm font-semibold text-[#5A6B7A] mb-3 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            While you wait
          </p>
          <div className="grid grid-cols-2 gap-2">
            {WHILE_YOU_WAIT.map((item) => (
              <button
                key={item.screen}
                onClick={() => onNavigate?.(item.screen)}
                className="flex flex-col gap-1 p-3 bg-white rounded-xl border border-[#E8E4DF] text-left hover:border-[#6B9080]/20 hover:bg-[#6B9080]/10 transition-colors"
              >
                <item.icon className="w-4 h-4 text-[#6B9080]" />
                <span className="text-sm font-semibold text-[#132F43]">
                  {item.label}
                </span>
                <span className="text-sm text-slate-400">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
