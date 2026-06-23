// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Coverage Coach Education Content
 * Static educational content for insurance navigation
 *
 * Sections:
 * 1. Insurance Questions Checklist
 * 2. CPT Codes Explained
 * 3. Appeal Template
 * 4. Single-Case Agreement Guide
 * 5. Medicaid Waiver Info
 * 6. State-by-State Waiver Overview
 */

import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ClipboardList,
  FileCode,
  FileText,
  Handshake,
  MapPin,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink,
  Phone,
  Shield,
  DollarSign,
  Clock,
  Users,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface CoverageCoachEducationProps {
  onBack?: () => void;
  userState?: string;
}

type Section = 'overview' | 'questions' | 'cpt-codes' | 'appeal' | 'single-case' | 'medicaid' | 'state-waivers';

export function CoverageCoachEducation({ onBack, userState = 'AZ' }: CoverageCoachEducationProps) {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const copyToClipboard = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const sections = [
    { id: 'questions', icon: ClipboardList, label: 'Questions to Ask', color: 'text-blue-600 bg-[#EEF4F8]' },
    { id: 'cpt-codes', icon: FileCode, label: 'CPT Codes Explained', color: 'text-purple-600 bg-purple-50' },
    { id: 'appeal', icon: FileText, label: 'Appeal Template', color: 'text-amber-600 bg-amber-50' },
    { id: 'single-case', icon: Handshake, label: 'Single-Case Agreement', color: 'text-green-600 bg-green-50' },
    { id: 'medicaid', icon: Shield, label: 'Medicaid Waivers', color: 'text-[#6B9080] bg-[#6B9080]/10' },
    { id: 'state-waivers', icon: MapPin, label: 'State-by-State Guide', color: 'text-[#6B9080] bg-indigo-50' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection sections={sections} onSelectSection={(id) => setActiveSection(id as Section)} />;
      case 'questions':
        return <InsuranceQuestionsSection onCopy={copyToClipboard} copiedItem={copiedItem} />;
      case 'cpt-codes':
        return <CPTCodesSection expandedItems={expandedItems} toggleExpand={toggleExpand} />;
      case 'appeal':
        return <AppealTemplateSection onCopy={copyToClipboard} copiedItem={copiedItem} />;
      case 'single-case':
        return <SingleCaseAgreementSection />;
      case 'medicaid':
        return <MedicaidWaiverSection />;
      case 'state-waivers':
        return <StateWaiversSection userState={userState} expandedItems={expandedItems} toggleExpand={toggleExpand} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] sticky top-0 z-10">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            {activeSection !== 'overview' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection('overview')}
                className="text-[#5A6B7A]"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : onBack ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-[#5A6B7A]"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Coverage Coach
              </Button>
            ) : null}
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-[#1B2733]">
                {activeSection === 'overview' ? 'Insurance Education' : sections.find(s => s.id === activeSection)?.label}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}

// Overview Section
function OverviewSection({ sections, onSelectSection }: { sections: { id: string; icon: React.ComponentType<{ className?: string }>; label: string; color: string }[]; onSelectSection: (id: string) => void }) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="p-4 bg-gradient-to-r from-accent/10 to-teal-50 border-accent/20">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-[#1B2733] mb-1">Your Insurance Navigation Guide</h2>
            <p className="text-sm text-[#5A6B7A]">
              Everything you need to understand your coverage, file appeals, and navigate the system — all in plain language.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3">
        {sections.map((section) => (
          <Card
            key={section.id}
            className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-accent/30"
            onClick={() => onSelectSection(section.id)}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${section.color}`}>
                <section.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#1B2733]">{section.label}</h3>
                <p className="text-sm text-[#5A6B7A]">
                  {section.id === 'questions' && 'Questions to ask your insurance company'}
                  {section.id === 'cpt-codes' && 'What ABA billing codes mean'}
                  {section.id === 'appeal' && 'Ready-to-use appeal letter template'}
                  {section.id === 'single-case' && 'How to get out-of-network coverage'}
                  {section.id === 'medicaid' && 'Understanding Medicaid waiver programs'}
                  {section.id === 'state-waivers' && 'Waiver options in your state'}
                </p>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Insurance Questions Section
function InsuranceQuestionsSection({ onCopy, copiedItem }: { onCopy: (text: string, id: string) => void; copiedItem: string | null }) {
  const questions = [
    {
      category: 'Coverage Basics',
      icon: Shield,
      items: [
        'Does my plan cover Applied Behavior Analysis (ABA) therapy for autism?',
        'What is the prior authorization process for ABA services?',
        'Is there an age limit for ABA coverage under my plan?',
        'What is my out-of-pocket maximum for behavioral health services?',
        'Are there any annual or lifetime hour limits for ABA therapy?'
      ]
    },
    {
      category: 'Providers & Access',
      icon: Users,
      items: [
        'Can you provide a list of in-network ABA providers in my area?',
        'What happens if there are no in-network providers available?',
        'Can I request a single-case agreement for an out-of-network provider?',
        'What is the process for adding a new provider to your network?'
      ]
    },
    {
      category: 'Costs & Billing',
      icon: DollarSign,
      items: [
        'What is my copay or coinsurance for ABA therapy sessions?',
        'Do I have a separate behavioral health deductible?',
        'Are parent training sessions (CPT 97156) covered?',
        'What CPT codes are covered under my ABA benefit?'
      ]
    },
    {
      category: 'Authorization & Timelines',
      icon: Clock,
      items: [
        'How long does prior authorization take to process?',
        'How often do I need to renew authorization?',
        'What documentation is required for authorization?',
        'What is the appeal timeline if authorization is denied?'
      ]
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <Card className="p-4 bg-[#EEF4F8] border-[#C8DDE8]">
        <p className="text-sm text-[#4A6478]">
          <strong>Pro tip:</strong> Call the number on the back of your insurance card and ask for the "Behavioral Health Benefits" department. Keep notes of who you spoke with and when.
        </p>
      </Card>

      {questions.map((category, idx) => (
        <Card key={idx} className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-4">
            <category.icon className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-[#1B2733]">{category.category}</h3>
          </div>
          <div className="space-y-3">
            {category.items.map((question, qIdx) => {
              const itemId = `q-${idx}-${qIdx}`;
              return (
                <div key={qIdx} className="flex items-start gap-2 group">
                  <span className="w-6 h-6 bg-[#F0EDE8] rounded-full flex items-center justify-center text-xs font-medium text-[#5A6B7A] flex-shrink-0">
                    {qIdx + 1}
                  </span>
                  <p className="text-sm text-[#3A4A57] flex-1">{question}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopy(question, itemId)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedItem === itemId ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

// CPT Codes Section
function CPTCodesSection({ expandedItems, toggleExpand }: { expandedItems: Set<string>; toggleExpand: (id: string) => void }) {
  const cptCodes = [
    {
      code: '97151',
      name: 'Behavior Assessment',
      description: 'Initial assessment by a qualified healthcare provider to evaluate behavioral health needs.',
      details: 'Used for the initial evaluation that determines if ABA therapy is appropriate. Typically conducted by a BCBA (Board Certified Behavior Analyst). Usually authorized for 1-4 hours initially.',
      whoProvides: 'BCBA or BCaBA under BCBA supervision',
      typical: '1-4 hours for initial assessment'
    },
    {
      code: '97153',
      name: 'Adaptive Behavior Treatment',
      description: 'Direct one-on-one ABA therapy services provided by a trained technician.',
      details: 'This is the most common code for ABA therapy. It covers direct therapy time where a Registered Behavior Technician (RBT) works one-on-one with your child implementing the behavior plan.',
      whoProvides: 'RBT (Registered Behavior Technician) under BCBA supervision',
      typical: '10-40 hours per week depending on treatment plan'
    },
    {
      code: '97155',
      name: 'Adaptive Behavior Treatment with Protocol Modification',
      description: 'BCBA supervision and modification of the treatment protocol.',
      details: 'Used when the BCBA is directly present during therapy sessions to modify treatment protocols, train technicians, or provide direct intervention. This is a higher-level service.',
      whoProvides: 'BCBA (Board Certified Behavior Analyst)',
      typical: '2-8 hours per week'
    },
    {
      code: '97156',
      name: 'Family Adaptive Behavior Treatment Guidance',
      description: 'Parent/caregiver training to support generalization of skills.',
      details: 'Parent training is crucial for ABA success. This code covers sessions where the BCBA or RBT teaches parents strategies to reinforce learning at home. Many plans cover 4-8 hours per month.',
      whoProvides: 'BCBA, sometimes RBT with BCBA oversight',
      typical: '4-8 hours per month'
    },
    {
      code: '97157',
      name: 'Multiple-Family Group Training',
      description: 'Group training for multiple families simultaneously.',
      details: 'Less common but used for group parent training sessions. May be more cost-effective for some families. Covers the same content as 97156 but in a group setting.',
      whoProvides: 'BCBA',
      typical: 'Varies by program'
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="p-4 bg-purple-50 border-purple-200">
        <p className="text-sm text-purple-800">
          <strong>What are CPT codes?</strong> CPT (Current Procedural Terminology) codes are standardized codes that healthcare providers use to bill insurance for specific services. Understanding these helps you verify what your plan covers.
        </p>
      </Card>

      {cptCodes.map((cpt) => {
        const isExpanded = expandedItems.has(cpt.code);
        return (
          <Card key={cpt.code} className="overflow-hidden">
            <button
              onClick={() => toggleExpand(cpt.code)}
              className="w-full p-4 flex items-start gap-3 sm:gap-4 text-left hover:bg-[#FAF7F2] transition-colors"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-purple-700">{cpt.code}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#1B2733]">{cpt.name}</h3>
                <p className="text-sm text-[#5A6B7A] mt-1">{cpt.description}</p>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-[#E8E4DF]">
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-[#3A4A57]">{cpt.details}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
                    <div className="bg-[#FAF7F2] p-3 rounded-lg">
                      <p className="text-sm font-medium text-[#5A6B7A] mb-1">Who Provides</p>
                      <p className="text-sm text-[#1B2733]">{cpt.whoProvides}</p>
                    </div>
                    <div className="bg-[#FAF7F2] p-3 rounded-lg">
                      <p className="text-sm font-medium text-[#5A6B7A] mb-1">Typical Amount</p>
                      <p className="text-sm text-[#1B2733]">{cpt.typical}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// Appeal Template Section
function AppealTemplateSection({ onCopy, copiedItem }: { onCopy: (text: string, id: string) => void; copiedItem: string | null }) {
  const appealTemplate = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Insurance Company Name]
[Appeals Department]
[Address]

RE: Appeal of Denial for [Child's Name]
Member ID: [Your Member ID]
Group Number: [Your Group Number]
Claim/Authorization Number: [Reference Number]

Dear Appeals Committee,

I am writing to formally appeal the denial of coverage for Applied Behavior Analysis (ABA) therapy services for my child, [Child's Name], dated [Date of Denial Letter].

REASON FOR APPEAL:

1. Medical Necessity: [Child's Name] was diagnosed with Autism Spectrum Disorder on [Diagnosis Date] by [Diagnosing Provider]. ABA therapy is recognized by the American Academy of Pediatrics, the U.S. Surgeon General, and the National Institute of Mental Health as an evidence-based, medically necessary treatment for autism.

2. State Mandate Compliance: [Your State] requires insurance coverage for autism spectrum disorder treatments, including ABA therapy, under [cite specific state law, e.g., "Arizona Revised Statutes 20-826.04"].

3. Plan Coverage: My plan documents indicate coverage for behavioral health services and treatment of autism spectrum disorders. The denial contradicts the terms of my coverage.

DOCUMENTATION ENCLOSED:
- Letter of medical necessity from treating BCBA
- Diagnostic evaluation
- Current treatment plan with measurable goals
- Progress reports demonstrating treatment efficacy
- Peer-reviewed research supporting ABA effectiveness

I request that you overturn this denial and authorize [Number] hours per week of ABA therapy as recommended by [Child's Name]'s treatment team.

Please respond within [30 days or your state's required timeline]. If I do not receive a favorable response, I will pursue an external review through the [State Insurance Commissioner/Department of Insurance].

Sincerely,

[Your Signature]
[Your Printed Name]
[Phone Number]
[Email Address]

Enclosures: [List all attachments]`;

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900 mb-1">Before You Send</p>
            <p className="text-sm text-amber-700">
              Customize this template with your specific situation. Include all supporting documentation. Keep copies of everything you send.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#1B2733]">Insurance Appeal Letter Template</h3>
          <Button
            onClick={() => onCopy(appealTemplate, 'appeal-template')}
            size="sm"
            className="gap-2"
          >
            {copiedItem === 'appeal-template' ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Template
              </>
            )}
          </Button>
        </div>

        <div className="bg-[#FAF7F2] rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-[#3A4A57] whitespace-pre-wrap font-mono">
            {appealTemplate}
          </pre>
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <h3 className="font-semibold text-[#1B2733] mb-3">Appeal Tips</h3>
        <ul className="space-y-2">
          {[
            'File your appeal within the required timeframe (usually 60-180 days)',
            'Send via certified mail with return receipt requested',
            'Include peer-reviewed research supporting ABA effectiveness',
            'Get a letter of medical necessity from your BCBA and pediatrician',
            'Reference your state\'s autism insurance mandate if applicable',
            'Keep a log of all phone calls with names and reference numbers'
          ].map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-[#3A4A57]">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// Single-Case Agreement Section
function SingleCaseAgreementSection() {
  const steps = [
    {
      title: 'Document Network Inadequacy',
      description: 'Show that there are no in-network providers available within a reasonable distance or with reasonable wait times.',
      tips: [
        'Request a list of in-network ABA providers from your insurance',
        'Call each provider and document availability (many will have 6-12 month wait lists)',
        'Note the distance to each provider from your home',
        'Document if providers don\'t accept new patients'
      ]
    },
    {
      title: 'Identify Your Preferred Provider',
      description: 'Find an out-of-network provider who can serve your child and is willing to work with your insurance.',
      tips: [
        'Ensure they are a licensed BCBA in your state',
        'Confirm they can provide the hours your child needs',
        'Ask if they have experience with single-case agreements',
        'Get their tax ID, NPI number, and credentials'
      ]
    },
    {
      title: 'Submit Your Request',
      description: 'Contact your insurance to formally request a single-case agreement.',
      tips: [
        'Call member services and ask for the "network adequacy" or "single-case agreement" department',
        'Explain that you cannot access in-network care',
        'Provide documentation of your network adequacy search',
        'Include a letter from your pediatrician supporting the request'
      ]
    },
    {
      title: 'Negotiate Terms',
      description: 'Work with both your provider and insurance to agree on reimbursement rates.',
      tips: [
        'Insurance may offer 80-100% of their in-network rate',
        'Your provider may need to agree to the negotiated rate',
        'Get the agreement in writing before starting services',
        'Clarify how long the agreement will last'
      ]
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="p-4 bg-green-50 border-green-200">
        <p className="text-sm text-green-800">
          <strong>What is a Single-Case Agreement?</strong> It's a contract between your insurance and an out-of-network provider that allows them to be paid at or near in-network rates for your specific case.
        </p>
      </Card>

      <div className="space-y-3 sm:space-y-4">
        {steps.map((step, idx) => (
          <Card key={idx} className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-[#1B2733] mb-1">{step.title}</h3>
                <p className="text-sm text-[#5A6B7A] mb-3">{step.description}</p>
                <ul className="space-y-2">
                  {step.tips.map((tip, tipIdx) => (
                    <li key={tipIdx} className="flex items-start gap-2 text-sm text-[#3A4A57]">
                      <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Medicaid Waiver Section
function MedicaidWaiverSection() {
  const waiverTypes = [
    {
      name: 'HCBS (Home and Community-Based Services) Waiver',
      description: 'Provides services to help individuals live in their homes and communities rather than institutions.',
      services: ['Personal care assistance', 'Respite care', 'Habilitation services', 'Therapeutic services', 'Environmental modifications'],
      eligibility: 'Must meet institutional level of care and Medicaid financial requirements'
    },
    {
      name: 'EPSDT (Early and Periodic Screening, Diagnostic and Treatment)',
      description: 'Medicaid benefit for children under 21 that covers all medically necessary services.',
      services: ['ABA therapy', 'Speech therapy', 'Occupational therapy', 'Diagnostic assessments', 'Any treatment deemed medically necessary'],
      eligibility: 'All Medicaid-eligible children under 21'
    },
    {
      name: 'Autism-Specific Waivers',
      description: 'Some states have waivers specifically designed for individuals with autism.',
      services: ['Intensive behavioral services', 'Respite care', 'Family training', 'Community inclusion support', 'Specialized equipment'],
      eligibility: 'Autism diagnosis and state-specific criteria'
    },
    {
      name: 'DD (Developmental Disabilities) Waivers',
      description: 'For individuals with developmental disabilities including autism.',
      services: ['Day programs', 'Supported employment', 'Residential services', 'Therapy services', 'Case management'],
      eligibility: 'Developmental disability diagnosis with functional limitations'
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="p-4 bg-[#6B9080]/10 border-[#6B9080]/20">
        <p className="text-sm text-[#6B9080]">
          <strong>What are Medicaid Waivers?</strong> They allow states to provide services not typically covered by Medicaid, enabling care in homes and communities. Wait lists can be long (years in some states), so apply early.
        </p>
      </Card>

      {waiverTypes.map((waiver, idx) => (
        <Card key={idx} className="p-3 sm:p-4">
          <h3 className="font-semibold text-[#1B2733] mb-2">{waiver.name}</h3>
          <p className="text-sm text-[#5A6B7A] mb-3">{waiver.description}</p>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[#5A6B7A] mb-2">Services Covered</p>
              <div className="flex flex-wrap gap-2">
                {waiver.services.map((service, sIdx) => (
                  <Badge key={sIdx} variant="secondary" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-[#FAF7F2] p-3 rounded-lg">
              <p className="text-sm font-medium text-[#5A6B7A] mb-1">Eligibility</p>
              <p className="text-sm text-[#3A4A57]">{waiver.eligibility}</p>
            </div>
          </div>
        </Card>
      ))}

      <Card className="p-4 bg-[#EEF4F8] border-[#C8DDE8]">
        <div className="flex items-start gap-2">
          <Phone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">How to Apply</p>
            <p className="text-sm text-blue-700">
              Contact your state's Medicaid office or Division of Developmental Disabilities. Many states also have parent advocacy organizations that can help navigate the application process.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// State-by-State Waivers Section
function StateWaiversSection({ userState, expandedItems, toggleExpand }: { userState: string; expandedItems: Set<string>; toggleExpand: (id: string) => void }) {
  const stateWaivers: Record<string, { waivers: string[]; contact: string; notes: string }> = {
    'AZ': {
      waivers: ['Arizona Long Term Care System (ALTCS)', 'DDD (Division of Developmental Disabilities)', 'Children\'s Rehabilitative Services (CRS)'],
      contact: '1-800-654-8713 (AHCCCS)',
      notes: 'Arizona has relatively shorter wait times compared to other states. DDD provides comprehensive autism services.'
    },
    'CA': {
      waivers: ['Regional Centers (21 centers statewide)', 'HCBS Waiver', 'Self-Determination Program'],
      contact: 'Contact your local Regional Center',
      notes: 'Regional Centers are the primary access point for developmental disability services. Services start at diagnosis with no wait list for early intervention.'
    },
    'TX': {
      waivers: ['CLASS (Community Living Assistance and Support Services)', 'HCS (Home and Community-based Services)', 'DBMD (Deaf Blind with Multiple Disabilities)', 'MDCP (Medically Dependent Children Program)'],
      contact: '1-877-787-8999 (HHS)',
      notes: 'Texas has significant wait lists for some waivers (10+ years for HCS). Interest lists open periodically.'
    },
    'FL': {
      waivers: ['iBudget Florida Waiver', 'CDC+ (Consumer Directed Care Plus)', 'Family Care Waiver'],
      contact: '1-866-273-2273 (APD)',
      notes: 'Wait lists can be long. Apply to all applicable waivers simultaneously.'
    },
    'NY': {
      waivers: ['OPWDD Waiver', 'Care at Home Waiver', 'HCBS Waiver'],
      contact: 'OPWDD Front Door: 1-866-946-9733',
      notes: 'New York has strong autism mandates for private insurance. OPWDD manages waiver services for developmental disabilities.'
    },
    'PA': {
      waivers: ['Autism Waiver', 'Consolidated Waiver', 'Person/Family Directed Support Waiver', 'Community Living Waiver'],
      contact: '1-866-539-7689 (ODP)',
      notes: 'Pennsylvania has a dedicated Autism Waiver with specialized services. Apply through the county MH/ID office.'
    },
    'IL': {
      waivers: ['Home-Based Services Waiver', 'CILA (Community Integrated Living Arrangement)', 'Supportive Living Program'],
      contact: '1-800-843-6154 (DHS)',
      notes: 'Apply through PUNS (Prioritization of Urgency of Need for Services). Early childhood services have shorter waits.'
    },
    'OH': {
      waivers: ['Individual Options Waiver', 'Level One Waiver', 'SELF Waiver'],
      contact: 'Contact your County Board of DD',
      notes: 'Each county operates its own Board of Developmental Disabilities. Services and wait times vary by county.'
    }
  };

  const currentStateData = stateWaivers[userState] || stateWaivers['AZ'];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Current State Highlight */}
      <Card className="p-4 bg-indigo-50 border-[#6B9080]/20">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-[#6B9080]" />
          <h3 className="font-semibold text-indigo-900">Your State: {userState}</h3>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-indigo-700 mb-2">Available Waivers</p>
            <div className="flex flex-wrap gap-2">
              {currentStateData.waivers.map((waiver, idx) => (
                <Badge key={idx} className="bg-indigo-100 text-indigo-800 border-[#6B9080]/20">
                  {waiver}
                </Badge>
              ))}
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg">
            <p className="text-sm font-medium text-[#5A6B7A] mb-1">Contact</p>
            <p className="text-sm text-[#1B2733] font-mono">{currentStateData.contact}</p>
          </div>

          <p className="text-sm text-indigo-800">{currentStateData.notes}</p>
        </div>
      </Card>

      {/* Other States */}
      <h3 className="font-semibold text-[#1B2733] mt-4 sm:mt-6 mb-3">Other States</h3>
      {Object.entries(stateWaivers).filter(([state]) => state !== userState).map(([state, data]) => {
        const isExpanded = expandedItems.has(state);
        return (
          <Card key={state} className="overflow-hidden">
            <button
              onClick={() => toggleExpand(state)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FAF7F2] transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-[#1B2733]">{state}</span>
                <Badge variant="outline" className="text-xs">{data.waivers.length} waivers</Badge>
              </div>
              {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-[#E8E4DF]">
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {data.waivers.map((waiver, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {waiver}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-[#5A6B7A]"><strong>Contact:</strong> {data.contact}</p>
                  <p className="text-sm text-[#5A6B7A]">{data.notes}</p>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default CoverageCoachEducation;
