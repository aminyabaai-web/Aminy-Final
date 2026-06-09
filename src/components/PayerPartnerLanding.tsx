// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * PayerPartnerLanding — Professional payer/MCO-facing landing page
 * Screen: 'payer-partner'
 *
 * Converts commercial payer interest into partnership conversations.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ArrowLeft,
  Shield,
  Clock,
  TrendingDown,
  CheckCircle,
  BarChart2,
  FileText,
  Users,
  Zap,
  MapPin,
  ArrowRight,
  Building2,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';

interface PayerPartnerLandingProps {
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
}

type PayerType = 'commercial' | 'medicaid' | 'mco' | 'other';

interface ContactForm {
  name: string;
  organization: string;
  payerType: PayerType | '';
  email: string;
  phone: string;
  note: string;
}

const VALUE_PROPS = [
  {
    icon: Clock,
    headline: '< 48-hour provider matching',
    body: 'Members are matched to credentialed ABA, mental health, and speech providers in under 48 hours — faster than any existing directory.',
  },
  {
    icon: Shield,
    headline: 'EVV compliance built in',
    body: 'Every visit electronically verified. Every claim submitted clean. 89% first-pass clean claim rate — less rework, less admin overhead.',
  },
  {
    icon: BarChart2,
    headline: 'Outcomes tracked from day one',
    body: 'Standardized instruments (VBMAPP, VB-MAPP, PDDBI) tracked continuously. Cost-offset data deliverable within 90 days of network launch.',
  },
];

const STATS = [
  { value: '47%', label: 'reduction in crisis utilization', note: 'Demo projection' },
  { value: '2.3x', label: 'faster provider matching vs. directory', note: 'Demo projection' },
  { value: '89%', label: 'EVV clean rate', note: 'Demo projection' },
];

const FEATURES = [
  { icon: Users, text: 'Credentialed provider network access (ABA, MH, SLP)' },
  { icon: FileText, text: 'Prior auth coordination with digital submission' },
  { icon: Shield, text: 'EVV compliance for all Medicaid-billable visits' },
  { icon: BarChart2, text: 'Real-time outcomes dashboard for your team' },
  { icon: TrendingDown, text: 'HEDIS measure support (follow-up after hospitalization)' },
  { icon: Zap, text: 'API integration with existing payer systems' },
];

export function PayerPartnerLanding({ onBack, onNavigate }: PayerPartnerLandingProps) {
  const [form, setForm] = useState<ContactForm>({
    name: '',
    organization: '',
    payerType: '',
    email: '',
    phone: '',
    note: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.organization || !form.email) {
      toast.error('Please fill in name, organization, and email');
      return;
    }

    setIsSubmitting(true);

    try {
      let savedToSupabase = false;
      try {
        const { error } = await supabase.from('payer_partnership_inquiries').insert({
          name: form.name,
          organization: form.organization,
          payer_type: form.payerType,
          email: form.email,
          phone: form.phone,
          note: form.note,
          created_at: new Date().toISOString(),
        });
        if (!error) savedToSupabase = true;
      } catch {
        // Supabase not configured
      }

      if (!savedToSupabase) {
        const existing = JSON.parse(
          localStorage.getItem('aminy_payer_inquiries') || '[]',
        );
        existing.push({ ...form, id: Date.now(), createdAt: new Date().toISOString() });
        localStorage.setItem('aminy_payer_inquiries', JSON.stringify(existing));
      }

      setSubmitted(true);
      toast.success('Request received! Our partnerships team will reach out within 1 business day.');
    } catch (err) {
      console.error('Payer inquiry error:', err);
      toast.error('Something went wrong. Please try again or email partnerships@aminy.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-white"
      style={{ overflowX: 'hidden', overflowY: 'auto' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-[#E8E4DF]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#F0EDE8] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#6B9080]" />
            <span className="text-base font-bold text-[#1B2733]">
              Aminy for Payers
            </span>
          </div>
          <div className="ml-auto">
            <Badge className="bg-[#6B9080]/10 text-[#6B9080] border-[#6B9080]/20 text-xs">
              Payer Partnerships
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="pt-10 pb-8 text-center"
        >
          <Badge className="bg-slate-900 text-white border-transparent mb-4 text-xs px-3 py-1">
            Behavioral Health Network
          </Badge>
          <h1 className="text-2xl font-bold text-[#1B2733] mb-3 leading-tight">
            Partner with Aminy — Reduce Behavioral Health Costs Through Early Intervention
          </h1>
          <p className="text-[#5A6B7A] text-sm leading-relaxed max-w-lg mx-auto">
            Aminy connects families to credentialed behavioral health providers — ABA, mental health, and speech — with built-in EVV, prior auth coordination, and real-time outcomes tracking. Built for payers who want to show cost-offset data, not just clinical noise.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <a
              href="#contact-form"
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              Schedule a Call <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-1.5 border border-[#E8E4DF] text-[#3A4A57] text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#FAF7F2] transition-colors"
            >
              See Features
            </a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-10"
        >
          {STATS.map((stat) => (
            <Card key={stat.label} className="p-4 text-center border border-[#E8E4DF]">
              <p className="text-2xl font-bold text-[#6B9080] mb-0.5">{stat.value}</p>
              <p className="text-xs text-[#5A6B7A] font-medium mb-1">{stat.label}</p>
              <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-xs">
                {stat.note}
              </Badge>
            </Card>
          ))}
        </motion.div>

        {/* Value props */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="space-y-4 mb-10"
        >
          <h2 className="text-lg font-bold text-[#1B2733]">Why Aminy for Your Network</h2>
          {VALUE_PROPS.map((vp) => (
            <Card key={vp.headline} className="p-4 border border-[#E8E4DF]">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#6B9080]/10 flex items-center justify-center">
                  <vp.icon className="w-5 h-5 text-[#6B9080]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1B2733] mb-1">{vp.headline}</p>
                  <p className="text-xs text-[#5A6B7A] leading-relaxed">{vp.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Feature list */}
        <motion.div
          id="features"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-[#1B2733] mb-4">For Payers</h2>
          <div className="space-y-2.5">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#6B9080]/10 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-[#6B9080]" />
                </div>
                <p className="text-sm text-[#3A4A57]">{f.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Contact form */}
        <motion.div
          id="contact-form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
        >
          <Card className="p-5 border border-[#E8E4DF] bg-[#6B9080]/10">
            {submitted ? (
              <div className="text-center py-6">
                <CheckCircle className="w-10 h-10 text-[#6B9080] mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#1B2733] mb-1">
                  Request received!
                </h3>
                <p className="text-sm text-[#5A6B7A]">
                  Our partnerships team will reach out within 1 business day.
                  <br />
                  Questions? Email{' '}
                  <span className="font-medium text-[#6B9080]">
                    partnerships@aminy.com
                  </span>
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-4 h-4 text-[#6B9080]" />
                  <h3 className="text-base font-bold text-[#1B2733]">
                    Schedule a Payer Partnership Call
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#3A4A57] mb-1">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Jane Smith"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E4DF] bg-white text-sm text-[#1B2733] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3A4A57] mb-1">
                        Organization <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.organization}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            organization: e.target.value,
                          }))
                        }
                        placeholder="Acme Health Plan"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E4DF] bg-white text-sm text-[#1B2733] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3A4A57] mb-1">
                      Payer type
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(
                        [
                          { id: 'commercial', label: 'Commercial' },
                          { id: 'medicaid', label: 'Medicaid' },
                          { id: 'mco', label: 'MCO' },
                          { id: 'other', label: 'Other' },
                        ] as { id: PayerType; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, payerType: opt.id }))
                          }
                          className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            form.payerType === opt.id
                              ? 'border-[#6B9080] bg-[#6B9080]/10 text-[#6B9080]'
                              : 'border-[#E8E4DF] bg-white text-[#5A6B7A] hover:border-[#6B9080]/20'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#3A4A57] mb-1">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="jane@example.com"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E4DF] bg-white text-sm text-[#1B2733] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3A4A57] mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="(602) 555-0100"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E4DF] bg-white text-sm text-[#1B2733] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3A4A57] mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={form.note}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, note: e.target.value }))
                      }
                      placeholder="Tell us about your network, member population, or specific use case..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-[#E8E4DF] bg-white text-sm text-[#1B2733] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold h-11 rounded-xl text-sm"
                  >
                    {isSubmitting ? 'Sending...' : 'Request Partnership Call'}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>
              </>
            )}
          </Card>
        </motion.div>

        {/* Footer note */}
        <div className="mt-8 flex items-start gap-2 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>
            Currently accepting network partnerships in Arizona. Expansion to Colorado, Texas,
            and Montana in 2026.
          </p>
        </div>
      </div>
    </div>
  );
}
