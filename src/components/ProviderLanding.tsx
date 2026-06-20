// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderLanding.tsx
 *
 * Marketing landing page for providers to learn about joining Aminy's
 * provider marketplace and apply to become a verified provider.
 * Fully mobile-optimized.
 */

import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { isDemoMode } from '../lib/demo-seed';
import compassImage from "figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png";
import {
  ArrowRight,
  CheckCircle,
  Users,
  Calendar,
  DollarSign,
  Brain,
  Shield,
  Star,
  Video,
  FileText,
  Heart,
  Sparkles,
  Award,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';

interface ProviderLandingProps {
  onApply: () => void;
  onLogin: () => void;
  onBack: () => void;
}

export function ProviderLanding({ onApply, onLogin, onBack }: ProviderLandingProps) {
  // Testimonials below are illustrative copy, not real attributed quotes, so they
  // are only shown in demo walkthroughs. Real users never see fabricated endorsements.
  const showSampleTestimonials = isDemoMode();
  return (
    <div className="min-h-screen min-h-[100dvh] bg-white dark:bg-slate-900">
      {/* Header — compact on mobile */}
      <header className="bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
          <button onClick={onBack} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: '#0d3d40' }}>
              <img
                src={compassImage}
                alt=""
                className="object-contain"
                style={{ width: '130%', height: '130%', transform: 'scale(1.15)' }}
              />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-[#1B2733] dark:text-white tracking-tight">aminy</span>
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3" onClick={onLogin}>
              Sign In
            </Button>
            <Button size="sm" className="bg-primary hover:bg-[#216982] text-xs sm:text-sm px-3 sm:px-4" onClick={onApply}>
              Apply Now
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#FAF7F2] to-white dark:from-slate-800 dark:to-slate-900 py-10 sm:py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <Badge className="bg-[#6B9080]/10 text-[#6B9080] mb-3 sm:mb-4 text-xs sm:text-sm">
                For ABA & Mental Health Providers
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1B2733] dark:text-white leading-tight">
                Grow Your Practice,
                <br />
                <span className="text-[#6B9080]">Empower Families</span>
              </h1>
              <p className="text-base sm:text-xl text-neutral-600 dark:text-slate-400 mt-4 sm:mt-6 leading-relaxed">
                Join Aminy's marketplace and connect with families who need your expertise.
                Get AI-powered tools, streamlined scheduling, and a platform built for
                neurodivergent care.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-[#216982] text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
                  onClick={onApply}
                >
                  Apply to Join
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto" onClick={onLogin}>
                  Sign In
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-x-8 mt-6 sm:mt-8 text-xs sm:text-sm text-neutral-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  Free to join
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  Competitive rates
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  Flexible schedule
                </span>
              </div>
            </div>

            {/* Provider card — illustrative sample, hidden on small mobile */}
            <div className="relative hidden sm:block">
              <Card className="p-5 sm:p-6 bg-white dark:bg-slate-800 shadow-xl">
                <Badge className="bg-neutral-100 text-neutral-600 dark:bg-slate-700 dark:text-slate-300 mb-3 sm:mb-4 text-xs sm:text-xs">
                  Sample profile — illustrative only
                </Badge>
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-white text-lg sm:text-xl font-semibold flex-shrink-0">
                    SM
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1B2733] dark:text-white text-sm sm:text-base">Dr. Sarah Mitchell</h3>
                    <p className="text-[#5A6B7A] dark:text-slate-400 text-xs sm:text-sm">BCBA, LBA</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500" />
                      <span className="text-xs sm:text-sm font-medium">4.9</span>
                      <span className="text-xs sm:text-sm text-neutral-400">(127 reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="text-center p-2 sm:p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-xl sm:text-2xl font-bold text-[#1B2733] dark:text-white">42</p>
                    <p className="text-xs sm:text-xs text-[#5A6B7A] dark:text-slate-400">Active Clients</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-xl sm:text-2xl font-bold text-[#1B2733] dark:text-white">$8.2k</p>
                    <p className="text-xs sm:text-xs text-[#5A6B7A] dark:text-slate-400">This Month</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-xl sm:text-2xl font-bold text-[#1B2733] dark:text-white">98%</p>
                    <p className="text-xs sm:text-xs text-[#5A6B7A] dark:text-slate-400">Satisfaction</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 w-full justify-center py-2 text-xs sm:text-sm">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Verified Provider
                </Badge>
              </Card>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#6B9080]/20 dark:bg-[#1a3a5c]/50 rounded-full opacity-50 blur-xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-violet-200 dark:bg-violet-900/50 rounded-full opacity-50 blur-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Provider Types */}
      <section className="py-12 sm:py-16 lg:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1B2733] dark:text-white">
              We're Looking For
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-slate-400 mt-2 sm:mt-3">
              Licensed professionals who are passionate about neurodivergent care
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {[
              { title: 'BCBAs', desc: 'Board Certified Behavior Analysts', icon: Brain },
              { title: 'RBTs', desc: 'Registered Behavior Technicians', icon: Award },
              { title: 'Psychologists', desc: 'Clinical & Child Psychologists', icon: Heart },
              { title: 'Therapists', desc: 'LMFT, LCSW, LPC', icon: MessageSquare },
              { title: 'SLPs', desc: 'Speech-Language Pathologists', icon: Users },
            ].map(({ title, desc, icon: Icon }) => (
              <Card key={title} className="p-3 sm:p-5 text-center hover:shadow-md transition-shadow">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#6B9080]/10 dark:bg-[#6B9080]/15 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#6B9080]" />
                </div>
                <h3 className="font-semibold text-[#1B2733] dark:text-white text-sm sm:text-base">{title}</h3>
                <p className="text-xs sm:text-sm text-[#5A6B7A] dark:text-slate-400 mt-1 hidden sm:block">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 lg:py-24 bg-neutral-50 dark:bg-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1B2733] dark:text-white">
              Everything You Need to Grow
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-slate-400 mt-2 sm:mt-3 max-w-2xl mx-auto">
              Aminy provides the tools and technology to help you focus on what matters most - your clients
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Brain,
                title: 'AI-Powered Insights',
                desc: 'Access comprehensive patient profiles with AI-generated summaries. Never start from zero with a new client.',
                highlight: true,
              },
              {
                icon: Users,
                title: 'Client Marketplace',
                desc: 'Get discovered by families actively seeking your expertise. Build your practice without marketing overhead.',
              },
              {
                icon: Video,
                title: 'Built-in Telehealth',
                desc: 'Encrypted, secure video sessions integrated directly into the platform. No third-party tools needed.',
              },
              {
                icon: Calendar,
                title: 'Smart Scheduling',
                desc: 'Set your availability and let families book directly. Automated reminders reduce no-shows.',
              },
              {
                icon: FileText,
                title: 'Session Documentation',
                desc: 'Streamlined SOAP notes and progress tracking. Share updates with parents in real-time.',
              },
              {
                icon: DollarSign,
                title: 'Simple Payments',
                desc: 'Get paid automatically after sessions. Transparent fees, no surprises.',
              },
            ].map(({ icon: Icon, title, desc, highlight }) => (
              <Card
                key={title}
                className={`p-4 sm:p-6 ${highlight ? 'bg-gradient-to-br from-[#FAF7F2] to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-[#6B9080]/20 dark:border-[#6B9080]/30' : ''}`}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 ${
                  highlight
                    ? 'bg-gradient-to-br from-[#6B9080] to-[#7BA7BC]'
                    : 'bg-neutral-100 dark:bg-slate-700'
                }`}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${highlight ? 'text-white' : 'text-neutral-600 dark:text-slate-400'}`} />
                </div>
                <h3 className="font-semibold text-[#1B2733] dark:text-white mb-1 sm:mb-2 text-sm sm:text-base">{title}</h3>
                <p className="text-neutral-600 dark:text-slate-400 text-xs sm:text-sm">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — vertical on mobile, horizontal on desktop */}
      <section className="py-12 sm:py-16 lg:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1B2733] dark:text-white">
              Getting Started is Easy
            </h2>
          </div>

          {/* Mobile: vertical list */}
          <div className="flex flex-col gap-6 sm:hidden max-w-sm mx-auto">
            {[
              { title: 'Apply Online', desc: 'Complete a simple application with your credentials', icon: FileText },
              { title: 'AI Verification', desc: 'Our AI verifies your license and credentials', icon: Sparkles },
              { title: 'Build Profile', desc: 'Set up your profile and availability', icon: Users },
              { title: 'Start Helping', desc: 'Connect with families and grow your practice', icon: Heart },
            ].map(({ title, desc, icon: Icon }, index) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#6B9080]/10 dark:bg-[#6B9080]/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-[#6B9080]" />
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#6B9080] bg-[#6B9080]/10 dark:bg-[#6B9080]/15 rounded-full px-2 py-0.5">Step {index + 1}</span>
                  </div>
                  <h3 className="font-semibold text-[#1B2733] dark:text-white mt-1">{title}</h3>
                  <p className="text-neutral-600 dark:text-slate-400 text-sm mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: horizontal row */}
          <div className="hidden sm:flex flex-row items-start justify-center max-w-5xl mx-auto">
            {[
              { title: 'Apply Online', desc: 'Complete a simple application with your credentials', icon: FileText },
              { title: 'AI Verification', desc: 'Our AI verifies your license and credentials', icon: Sparkles },
              { title: 'Build Profile', desc: 'Set up your profile and availability', icon: Users },
              { title: 'Start Helping', desc: 'Connect with families and grow your practice', icon: Heart },
            ].map(({ title, desc, icon: Icon }, index, arr) => (
              <React.Fragment key={title}>
                <div className="flex-1 text-center px-2">
                  <div className="w-16 h-16 rounded-full bg-[#6B9080]/10 dark:bg-[#6B9080]/15 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-8 h-8 text-[#6B9080]" />
                  </div>
                  <h3 className="font-semibold text-[#1B2733] dark:text-white mb-1">{title}</h3>
                  <p className="text-neutral-600 dark:text-slate-400 text-sm">{desc}</p>
                </div>
                {index < arr.length - 1 && (
                  <div className="flex items-center justify-center h-16 flex-shrink-0">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section className="py-10 sm:py-16 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center text-white mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
              Earn What You're Worth
            </h2>
            <p className="text-teal-100 text-sm sm:text-lg mb-4 sm:mb-6">
              Competitive, standardized rates based on your credential type
              and session length. Transparent pricing with no hidden costs.
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-8 gap-y-2 sm:gap-y-3 text-sm">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-teal-200 flex-shrink-0" />
                BCBAs $65–$95/session
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-teal-200 flex-shrink-0" />
                RBTs $20–$38/session
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-teal-200 flex-shrink-0" />
                Weekly payouts
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-teal-200 flex-shrink-0" />
                No monthly fees
              </span>
            </div>
          </div>

          <Card className="p-4 sm:p-6 bg-white dark:bg-slate-800 max-w-lg mx-auto">
            <h3 className="font-semibold text-[#1B2733] dark:text-white mb-3 sm:mb-4 text-center text-sm sm:text-base">
              BCBA Earnings Example
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between p-2.5 sm:p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg text-sm">
                <span className="text-neutral-600 dark:text-slate-400">20 consults/wk @ $65</span>
                <span className="font-semibold text-[#1B2733] dark:text-white">$1,300</span>
              </div>
              <div className="flex justify-between p-2.5 sm:p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg text-sm">
                <span className="text-neutral-600 dark:text-slate-400">10 assessments/wk @ $95</span>
                <span className="font-semibold text-[#1B2733] dark:text-white">$950</span>
              </div>
              <div className="flex justify-between p-3 sm:p-4 bg-[#6B9080]/10 dark:bg-[#6B9080]/15 rounded-lg border-2 border-[#6B9080]/20 dark:border-teal-700">
                <span className="font-semibold text-[#6B9080] dark:text-[#7BA7BC] text-sm sm:text-base">Weekly Earnings</span>
                <span className="text-lg sm:text-xl font-bold text-[#6B9080] dark:text-primary">$2,250</span>
              </div>
              <p className="text-center text-[#5A6B7A] dark:text-slate-400 text-xs sm:text-sm">
                = $9,000/month or $108,000/year
              </p>
              <p className="text-center text-neutral-400 dark:text-[#5A6B7A] text-xs sm:text-xs italic">
                Hypothetical illustration. Example only — actual earnings vary by caseload, credential, and availability.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Testimonials — sample copy, demo-only (not real attributed quotes) */}
      {showSampleTestimonials && (
      <section className="py-12 sm:py-16 lg:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1B2733] dark:text-white">
              What Providers Say
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                quote: "The AI patient summaries save me hours of intake work. I can start making a difference from session one.",
                name: "Dr. Emily Chen",
                role: "Clinical Psychologist",
                rating: 5,
              },
              {
                quote: "I've grown my practice 3x since joining Aminy. The families here are engaged and committed to their children's progress.",
                name: "Marcus Johnson",
                role: "BCBA",
                rating: 5,
              },
              {
                quote: "Finally, a platform that understands neurodivergent care. The tools are designed for how we actually work.",
                name: "Sarah Williams",
                role: "SLP, CCC-SLP",
                rating: 5,
              },
            ].map((testimonial, i) => (
              <Card key={i} className="p-4 sm:p-6">
                <div className="flex gap-0.5 mb-3 sm:mb-4">
                  {Array(testimonial.rating).fill(0).map((_, j) => (
                    <Star key={j} className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <p className="text-neutral-700 dark:text-slate-300 mb-3 sm:mb-4 text-sm sm:text-base">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-[#1B2733] dark:text-white text-sm">{testimonial.name}</p>
                    <p className="text-xs sm:text-sm text-[#5A6B7A] dark:text-slate-400">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CTA Section */}
      <section className="py-12 sm:py-16 bg-neutral-900 dark:bg-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-neutral-400 text-sm sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join our growing network of verified providers and help families get the support they need.
            Applications are reviewed within 24-48 hours.
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-[#216982] text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
            onClick={onApply}
          >
            Apply Now - It's Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-[#5A6B7A] text-xs sm:text-sm mt-4 sm:mt-6">
            Questions? Contact us at <a href="mailto:providers@aminy.ai" className="text-primary hover:underline">providers@aminy.ai</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 dark:bg-slate-900 border-t border-neutral-800 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-3 sm:mb-0">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-white flex items-center justify-center">
                <img
                  src={compassImage}
                  alt="Aminy"
                  className="object-contain"
                  style={{ width: '130%', height: '130%', transform: 'scale(1.15)' }}
                />
              </div>
              <span className="text-neutral-400 text-sm">Aminy for Providers</span>
            </div>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-[#5A6B7A]">
              <a href="/?screen=privacy-policy" className="hover:text-white">Privacy Policy</a>
              <a href="/?screen=terms-of-service" className="hover:text-white">Terms of Service</a>
              <a href="mailto:providers@aminy.ai" className="hover:text-white">Contact</a>
            </div>
          </div>
          <div className="text-center text-xs text-neutral-600 pt-4 border-t border-neutral-800">
            &copy; {new Date().getFullYear()} Aminy, LLC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ProviderLanding;
