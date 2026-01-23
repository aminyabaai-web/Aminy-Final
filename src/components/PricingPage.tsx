import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, X, Sparkles, Target, Stethoscope, Heart, Shield, MessageCircle, BarChart3, FileText, Bell, Users } from 'lucide-react';

// Aminy's unique advantages - what makes us different
const AMINY_ADVANTAGES = [
  { icon: Heart, feature: 'Remembers your child over time', description: 'Builds a complete picture of your child\'s journey' },
  { icon: BarChart3, feature: 'Tracks progress automatically', description: 'ABA-style data collection without manual logging' },
  { icon: FileText, feature: 'Creates payer-ready reports', description: 'Insurance-compliant documentation with one click' },
  { icon: Bell, feature: 'Reaches out proactively', description: 'Daily nudges and scheduled check-ins' },
  { icon: Users, feature: 'Shares with care team', description: 'Connect BCBAs, therapists, and family members' },
  { icon: Shield, feature: 'HIPAA-ready infrastructure', description: 'Built for sensitive health data from day one' },
  { icon: Sparkles, feature: 'Visual routines for kids', description: 'Aminy Jr mode with token boards and rewards' },
];

interface PricingPageProps {
  onSelectTier: (tier: 'starter' | 'core' | 'pro') => void;
  currentTier?: string;
}

export function PricingPage({ onSelectTier, currentTier }: PricingPageProps) {
  const [selectedTier, setSelectedTier] = useState<'starter' | 'core' | 'pro'>('core');

  const tiers = [
    {
      id: 'starter' as const,
      name: 'Starter',
      price: 29,
      period: 'month',
      description: 'Start calm routines at home.',
      icon: Heart,
      features: [
        'AI-personalized daily plan',
        '2 activities per day',
        'Basic progress tracking',
        'Aminy Jr: 2 games',
        'Community access'
      ],
      cta: 'Start with Starter',
      gradient: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      accentColor: 'text-blue-600',
      buttonClass: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'core' as const,
      name: 'Core',
      price: 99,
      period: 'month',
      description: 'Build calm, connect daily.',
      icon: Target,
      features: [
        'Everything in Starter, plus:',
        'Unlimited AI chat coach',
        'Auto-adapting calm plan',
        'All Aminy Jr modules',
        'Complete activity library',
        'Weekly progress reports',
        'Priority email support'
      ],
      cta: 'Start Free 7-Day Core Trial',
      trialNote: 'No credit card needed',
      recommended: true,
      gradient: 'from-accent/10 to-teal-100',
      borderColor: 'border-accent',
      accentColor: 'text-accent',
      buttonClass: 'bg-accent hover:bg-accent/90'
    },
    {
      id: 'pro' as const,
      name: 'Plus',
      price: 229,
      period: 'month',
      description: 'Full support with BCBA guidance.',
      icon: Stethoscope,
      features: [
        'Everything in Core, plus:',
        'Live telehealth sessions (4/mo)',
        'BCBA notes & documentation',
        'Insurance authorization letters',
        'Provider-ready reports',
        'IEP support materials',
        'Dedicated care coordinator',
        'Priority phone support'
      ],
      cta: 'Start Free 7-Day Plus Trial',
      trialNote: 'No credit card needed',
      gradient: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      accentColor: 'text-purple-600',
      buttonClass: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Powered by AI and ABA Science</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 mb-4">
            Choose Your Calm Plan
          </h1>
          
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-2">
            Start with a 7-day free trial of Core or Plus — no credit card needed.
          </p>
          
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Using proven ABA principles, Aminy creates calm you can feel.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isSelected = selectedTier === tier.id;
            const isCurrent = currentTier === tier.id;
            
            return (
              <Card 
                key={tier.id}
                className={`relative p-6 transition-all ${
                  tier.recommended 
                    ? `border-2 ${tier.borderColor} shadow-lg scale-105` 
                    : `border ${tier.borderColor} hover:shadow-md`
                }`}
              >
                {/* Recommended Badge */}
                {tier.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-white border-accent text-accent">
                      Current Plan
                    </Badge>
                  </div>
                )}

                {/* Header */}
                <div className={`bg-gradient-to-br ${tier.gradient} rounded-lg p-4 mb-6`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${tier.accentColor}`} />
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-900">{tier.name}</h3>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-4">{tier.description}</p>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900">${tier.price}</span>
                    <span className="text-slate-500">/{tier.period}</span>
                  </div>
                  
                  {tier.trialNote && (
                    <p className="text-xs text-slate-500 mt-2">
                      Then ${tier.price}/mo • Cancel anytime
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 ${tier.accentColor} mt-0.5 flex-shrink-0`} />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={() => {
                    setSelectedTier(tier.id);
                    onSelectTier(tier.id);
                  }}
                  className={`w-full ${tier.buttonClass} text-white`}
                  size="lg"
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Current Plan' : tier.cta}
                </Button>

                {tier.trialNote && !isCurrent && (
                  <p className="text-xs text-center text-slate-500 mt-2">
                    {tier.trialNote}
                  </p>
                )}
              </Card>
            );
          })}
        </div>

        {/* Why Aminy Works Section */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <Badge className="bg-teal-100 text-teal-800 mb-3">Why Aminy Works</Badge>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Built specifically for your family's journey
            </h2>
            <p className="text-slate-600">
              Aminy isn't just AI chat—it's a complete support system designed for families navigating neurodivergence.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {AMINY_ADVANTAGES.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 text-sm">{item.feature}</h3>
                      <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-slate-500 mt-6 max-w-xl mx-auto">
            The companion is the hook. The clinical utility is the moat. We're building the system of record that clinics and payers want to integrate with.
          </p>
        </div>

        {/* Guarantee Section */}
        <div className="bg-gradient-to-r from-accent/5 to-teal-50 border border-accent/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Our Calm Guarantee</h3>
              <p className="text-slate-700 mb-4">
                <strong>Noticeably calmer routines in 7 days — or cancel anytime.</strong>
              </p>
              <p className="text-sm text-slate-600">
                We're confident that Aminy's ABA-based approach will bring measurable calm to your family. 
                If you don't see progress in your first week, cancel with one click — no questions asked.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent mb-1">7 days</div>
            <p className="text-sm text-slate-600">Free trial period</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent mb-1">No card</div>
            <p className="text-sm text-slate-600">Required to start</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent mb-1">Cancel</div>
            <p className="text-sm text-slate-600">Anytime, 1-click</p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6 text-center">Common Questions</h2>
          
          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="font-semibold text-slate-900 mb-2">What happens after my free trial?</h4>
              <p className="text-sm text-slate-600">
                After 7 days, Core and Plus trials automatically move to the Starter tier ($29/mo) unless you 
                choose to continue your paid plan. You'll receive reminders before any charges.
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Can I switch plans later?</h4>
              <p className="text-sm text-slate-600">
                Absolutely! You can upgrade or downgrade anytime from your account settings. 
                Changes take effect immediately.
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Is my insurance accepted?</h4>
              <p className="text-sm text-slate-600">
                Most plans cover ABA services under behavioral health. Plus tier includes insurance 
                authorization letters and BCBA documentation to maximize your benefits.
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold text-slate-900 mb-2">What's included in "ABA principles"?</h4>
              <p className="text-sm text-slate-600">
                Applied Behavior Analysis (ABA) includes positive reinforcement, visual cues, 
                predictable routines, and data-driven progress tracking — all simplified for everyday family life.
              </p>
            </Card>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-12 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-600 mb-4">
            Have questions? We're here to help.
          </p>
          <Button variant="outline" size="sm">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
