/**
 * ProviderLanding.tsx
 *
 * Marketing landing page for providers to learn about joining Aminy's
 * provider marketplace and apply to become a verified provider.
 */

import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Logo } from './Logo';
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
  Clock,
  TrendingUp,
  Heart,
  Sparkles,
  Building2,
  Award,
  MessageSquare,
} from 'lucide-react';

interface ProviderLandingProps {
  onApply: () => void;
  onLogin: () => void;
  onBack: () => void;
}

export function ProviderLanding({ onApply, onLogin, onBack }: ProviderLandingProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2">
            <Logo size={36} showText />
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onLogin}>
              Provider Sign In
            </Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={onApply}>
              Apply Now
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-teal-50 to-white dark:from-slate-800 dark:to-slate-900 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-teal-100 text-teal-700 mb-4">
                For ABA & Mental Health Providers
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white leading-tight">
                Grow Your Practice,
                <br />
                <span className="text-teal-600">Empower Families</span>
              </h1>
              <p className="text-xl text-neutral-600 dark:text-slate-400 mt-6 leading-relaxed">
                Join Aminy's marketplace and connect with families who need your expertise.
                Get AI-powered tools, streamlined scheduling, and a platform built for
                neurodivergent care.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button
                  size="lg"
                  className="bg-teal-600 hover:bg-teal-700 text-lg px-8"
                  onClick={onApply}
                >
                  Apply to Join
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8" onClick={onLogin}>
                  Sign In
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-neutral-600 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Free to join
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Set your own rates
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Flexible schedule
                </span>
              </div>
            </div>

            <div className="relative">
              <Card className="p-6 bg-white dark:bg-slate-800 shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-xl font-semibold">
                    SM
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">Dr. Sarah Mitchell</h3>
                    <p className="text-neutral-500 dark:text-slate-400">BCBA, LBA</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-medium">4.9</span>
                      <span className="text-sm text-neutral-400">(127 reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">42</p>
                    <p className="text-xs text-neutral-500 dark:text-slate-400">Active Clients</p>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">$8.2k</p>
                    <p className="text-xs text-neutral-500 dark:text-slate-400">This Month</p>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">98%</p>
                    <p className="text-xs text-neutral-500 dark:text-slate-400">Satisfaction</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 w-full justify-center py-2">
                  <Shield className="w-4 h-4 mr-2" />
                  Verified Provider
                </Badge>
              </Card>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-teal-200 dark:bg-teal-900/50 rounded-full opacity-50 blur-xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-violet-200 dark:bg-violet-900/50 rounded-full opacity-50 blur-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Provider Types */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
              We're Looking For
            </h2>
            <p className="text-neutral-600 dark:text-slate-400 mt-3">
              Licensed professionals who are passionate about neurodivergent care
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: 'BCBAs', desc: 'Board Certified Behavior Analysts', icon: Brain },
              { title: 'Psychologists', desc: 'Clinical & Child Psychologists', icon: Heart },
              { title: 'Therapists', desc: 'LMFT, LCSW, LPC', icon: MessageSquare },
              { title: 'SLPs', desc: 'Speech-Language Pathologists', icon: Users },
            ].map(({ title, desc, icon: Icon }) => (
              <Card key={title} className="p-5 text-center hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">{title}</h3>
                <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-neutral-50 dark:bg-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Everything You Need to Grow
            </h2>
            <p className="text-neutral-600 dark:text-slate-400 mt-3 max-w-2xl mx-auto">
              Aminy provides the tools and technology to help you focus on what matters most - your clients
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                desc: 'HIPAA-compliant video sessions integrated directly into the platform. No third-party tools needed.',
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
                className={`p-6 ${highlight ? 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800' : ''}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  highlight
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-500'
                    : 'bg-neutral-100 dark:bg-slate-700'
                }`}>
                  <Icon className={`w-6 h-6 ${highlight ? 'text-white' : 'text-neutral-600 dark:text-slate-400'}`} />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
                <p className="text-neutral-600 dark:text-slate-400 text-sm">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Getting Started is Easy
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: 1,
                title: 'Apply Online',
                desc: 'Complete a simple application with your credentials',
                icon: FileText,
              },
              {
                step: 2,
                title: 'AI Verification',
                desc: 'Our AI verifies your license and credentials',
                icon: Sparkles,
              },
              {
                step: 3,
                title: 'Build Profile',
                desc: 'Set up your profile, rates, and availability',
                icon: Users,
              },
              {
                step: 4,
                title: 'Start Helping',
                desc: 'Connect with families and grow your practice',
                icon: Heart,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="text-center relative">
                <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-teal-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                  {step}
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
                <p className="text-neutral-600 dark:text-slate-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section className="py-16 bg-gradient-to-br from-teal-600 to-cyan-600">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-3xl font-bold mb-4">
                Earn What You're Worth
              </h2>
              <p className="text-teal-100 text-lg mb-6">
                Set your own rates and keep more of what you earn. Our platform fee is a simple 15%
                with no hidden costs.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-200" />
                  <span>Average provider earns $6,000-$12,000/month</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-200" />
                  <span>Set your own hourly rates ($75-$200+)</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-200" />
                  <span>Weekly automatic payouts</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-200" />
                  <span>No monthly fees or minimums</span>
                </div>
              </div>
            </div>

            <Card className="p-6 bg-white dark:bg-slate-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                Earnings Example
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <span className="text-neutral-600 dark:text-slate-400">20 sessions/week @ $99</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">$1,980</span>
                </div>
                <div className="flex justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <span className="text-neutral-600 dark:text-slate-400">Platform fee (15%)</span>
                  <span className="font-semibold text-red-600">-$297</span>
                </div>
                <div className="flex justify-between p-4 bg-teal-50 dark:bg-teal-900/30 rounded-lg border-2 border-teal-200 dark:border-teal-700">
                  <span className="font-semibold text-teal-800 dark:text-teal-300">Your Weekly Earnings</span>
                  <span className="text-xl font-bold text-teal-700 dark:text-teal-400">$1,683</span>
                </div>
                <p className="text-center text-neutral-500 dark:text-slate-400 text-sm">
                  = $6,732/month or $80,784/year
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
              What Providers Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
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
              <Card key={i} className="p-6">
                <div className="flex gap-1 mb-4">
                  {Array(testimonial.rating).fill(0).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <p className="text-neutral-700 dark:text-slate-300 mb-4">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{testimonial.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-neutral-900 dark:bg-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-neutral-400 text-lg mb-8 max-w-2xl mx-auto">
            Join our growing network of verified providers and help families get the support they need.
            Applications are reviewed within 24-48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-teal-600 hover:bg-teal-700 text-lg px-8"
              onClick={onApply}
            >
              Apply Now - It's Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-neutral-600 text-white hover:bg-neutral-800"
              onClick={onLogin}
            >
              Provider Sign In
            </Button>
          </div>
          <p className="text-neutral-500 text-sm mt-6">
            Questions? Contact us at <a href="mailto:providers@aminy.co" className="text-teal-400 hover:underline">providers@aminy.co</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 dark:bg-slate-900 border-t border-neutral-800 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <Logo size={28} showText={false} />
            <span className="text-neutral-400">Aminy for Providers</span>
          </div>
          <div className="flex gap-6 text-sm text-neutral-500">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ProviderLanding;
