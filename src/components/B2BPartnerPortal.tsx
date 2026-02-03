/**
 * B2B Partner Portal
 * Materials and integration for fiscal intermediaries, ABA providers, and schools
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  Users,
  FileText,
  Download,
  ArrowRight,
  CheckCircle,
  BarChart3,
  Shield,
  Clock,
  Heart,
  Star,
  Handshake,
  Phone,
  Mail,
  Globe,
  Zap,
  Target,
  Award,
  BookOpen,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface B2BPartnerPortalProps {
  partnerType?: 'fiscal_intermediary' | 'aba_provider' | 'school' | 'general';
  onContactSales?: () => void;
}

export function B2BPartnerPortal({
  partnerType = 'general',
  onContactSales,
}: B2BPartnerPortalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Fiscal Intermediary specific content
  const fiscalIntermediaryContent = {
    headline: 'Empower Your Self-Directed Families',
    subheadline: 'Give families the tools to succeed between support hours',
    benefits: [
      {
        icon: Clock,
        title: 'Reduce Support Calls',
        description: '40% fewer "what do I do?" calls with 24/7 AI guidance',
        metric: '40% reduction',
      },
      {
        icon: FileText,
        title: 'Streamlined Documentation',
        description: 'Auto-generate EVV-compatible time logs and service notes',
        metric: 'Hours saved/week',
      },
      {
        icon: Users,
        title: 'Better Outcomes',
        description: 'Families who use Aminy show higher retention and satisfaction',
        metric: '92% satisfaction',
      },
      {
        icon: Shield,
        title: 'Compliant & Secure',
        description: 'HIPAA compliant, state-specific waiver integration',
        metric: 'Full compliance',
      },
    ],
    caseStudy: {
      title: 'Acumen Partnership Pilot Results',
      stats: [
        { label: 'Family Enrollment', value: '150+', detail: 'families onboarded in 60 days' },
        { label: 'Support Call Reduction', value: '38%', detail: 'fewer calls to care coordinators' },
        { label: 'Documentation Time', value: '2.5hrs', detail: 'saved per family per week' },
        { label: 'Retention', value: '94%', detail: '6-month family retention rate' },
      ],
      quote: "Aminy helps our families feel supported even when we're not there.",
      attribution: "Care Coordination Director, Acumen Fiscal Agent",
    },
  };

  // ABA Provider specific content
  const abaProviderContent = {
    headline: 'Extend Your Impact Beyond Sessions',
    subheadline: 'Help families practice skills when your team isn\'t there',
    benefits: [
      {
        icon: Target,
        title: 'Goal Reinforcement',
        description: 'Daily activities aligned with treatment plans',
        metric: 'Better generalization',
      },
      {
        icon: BarChart3,
        title: 'Progress Data',
        description: 'Track home practice completion and parent engagement',
        metric: 'Real-time insights',
      },
      {
        icon: Heart,
        title: 'Parent Support',
        description: 'Reduce burnout with self-care nudges and guidance',
        metric: 'Happier families',
      },
      {
        icon: Handshake,
        title: 'Better Retention',
        description: 'Engaged families stick with treatment longer',
        metric: '25% improvement',
      },
    ],
  };

  // School/District content
  const schoolContent = {
    headline: 'Support Families Beyond the Classroom',
    subheadline: 'Bridge the gap between IEP goals and home practice',
    benefits: [
      {
        icon: BookOpen,
        title: 'IEP Goal Support',
        description: 'Activities aligned with educational goals',
        metric: 'Better outcomes',
      },
      {
        icon: Users,
        title: 'Parent Engagement',
        description: 'Keep parents informed and involved',
        metric: 'Higher participation',
      },
      {
        icon: Clock,
        title: 'Time Savings',
        description: 'Less time on parent communication',
        metric: '3+ hrs/week saved',
      },
      {
        icon: Shield,
        title: 'FERPA Compliant',
        description: 'Secure, compliant family communication',
        metric: 'Full compliance',
      },
    ],
  };

  const getContent = () => {
    switch (partnerType) {
      case 'fiscal_intermediary':
        return fiscalIntermediaryContent;
      case 'aba_provider':
        return abaProviderContent;
      case 'school':
        return schoolContent;
      default:
        return fiscalIntermediaryContent;
    }
  };

  const content = getContent();

  const integrationFeatures = [
    {
      title: 'White-Label Option',
      description: 'Your branding, our technology',
      available: true,
    },
    {
      title: 'SSO Integration',
      description: 'Connect to your existing auth system',
      available: true,
    },
    {
      title: 'API Access',
      description: 'Sync data with your platform',
      available: true,
    },
    {
      title: 'Custom Reports',
      description: 'Analytics tailored to your needs',
      available: true,
    },
    {
      title: 'Bulk User Management',
      description: 'Easy onboarding for large groups',
      available: true,
    },
    {
      title: 'Dedicated Support',
      description: 'Account manager + priority help',
      available: true,
    },
  ];

  const pricingTiers = [
    {
      name: 'Starter',
      families: 'Up to 100 families',
      price: '$3/family/mo',
      features: ['Core AI features', 'Basic analytics', 'Email support'],
    },
    {
      name: 'Growth',
      families: 'Up to 500 families',
      price: '$2.50/family/mo',
      features: ['Everything in Starter', 'Custom branding', 'API access', 'Priority support'],
      popular: true,
    },
    {
      name: 'Enterprise',
      families: 'Unlimited families',
      price: 'Custom',
      features: ['Everything in Growth', 'White-label', 'SSO', 'Dedicated success manager', 'SLA guarantee'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="bg-blue-100 text-blue-800 mb-4">
            Partner Program
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {content.headline}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {content.subheadline}
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={onContactSales}
            >
              Schedule Demo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline">
              Download One-Pager
              <Download className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-12">
            Why Partner With Aminy
          </h2>
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
            {content.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {benefit.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {benefit.metric}
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Study (FI only) */}
      {partnerType === 'fiscal_intermediary' && fiscalIntermediaryContent.caseStudy && (
        <section className="py-16 px-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="bg-green-100 text-green-800 mb-4">
                Case Study
              </Badge>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {fiscalIntermediaryContent.caseStudy.title}
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 sm:gap-6 mb-8">
              {fiscalIntermediaryContent.caseStudy.stats.map((stat, index) => (
                <Card key={index} className="p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {stat.detail}
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6 bg-white">
              <blockquote className="text-lg text-gray-700 italic mb-4">
                "{fiscalIntermediaryContent.caseStudy.quote}"
              </blockquote>
              <p className="text-sm text-gray-500">
                — {fiscalIntermediaryContent.caseStudy.attribution}
              </p>
            </Card>
          </div>
        </section>
      )}

      {/* Integration Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-12">
            Enterprise-Ready Integration
          </h2>

          <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
            {integrationFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
              >
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{feature.title}</p>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-4">
            Simple, Scalable Pricing
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-xl mx-auto">
            Volume discounts that grow with you. No setup fees. No long-term contracts required.
          </p>

          <div className="grid md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
            {pricingTiers.map((tier, index) => (
              <Card
                key={index}
                className={`p-6 ${tier.popular ? 'ring-2 ring-blue-500 relative' : ''}`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white">
                    Most Popular
                  </Badge>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {tier.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {tier.families}
                </p>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
                  {tier.price}
                </div>
                <ul className="space-y-3 mb-4 sm:mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${tier.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  variant={tier.popular ? 'default' : 'outline'}
                  onClick={onContactSales}
                >
                  Get Started
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Award className="w-5 h-5 text-blue-600" />
              <span>SOC 2 Type II</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Zap className="w-5 h-5 text-blue-600" />
              <span>99.9% Uptime SLA</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-5 h-5 text-blue-600" />
              <span>10,000+ Families Served</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to partner?
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Join leading organizations in supporting autism families.
            Schedule a demo to see how Aminy can work for your organization.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            <Button
              className="bg-white text-blue-700 hover:bg-blue-50"
              onClick={onContactSales}
            >
              <Phone className="w-4 h-4 mr-2" />
              Schedule Demo
            </Button>
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              <Mail className="w-4 h-4 mr-2" />
              partnerships@aminy.ai
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-4xl mx-auto text-center text-sm">
          <p>© {new Date().getFullYear()} Aminy, LLC All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default B2BPartnerPortal;
