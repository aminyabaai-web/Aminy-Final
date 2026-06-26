// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * FamilyHelpCenter — Support hub for families
 *
 * Category cards, FAQs, chat, benefits letter generator, crisis resources.
 * Screen name: 'family-help-center'
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Calendar,
  Users,
  CreditCard,
  Lock,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  FileText,
  Phone,
  ArrowLeft,
  Search,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// Data
// ============================================================================

interface FAQItem {
  question: string;
  answer: string;
}

interface HelpCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  faqs: FAQItem[];
}

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'coverage',
    label: 'Understanding Your Coverage',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-[#EEF4F8]',
    faqs: [
      {
        question: 'Does my insurance cover ABA therapy?',
        answer: 'Most major insurance plans are required by law to cover ABA therapy when prescribed for autism spectrum disorder. This includes BCBS, UHC, Aetna, Cigna, and Medicaid (AHCCCS in Arizona). Check your "Coverage" tab in the Insurance Hub to see your specific benefits.',
      },
      {
        question: 'What is a prior authorization and why do I need one?',
        answer: 'Prior authorization (PA) is your insurance company\'s way of approving treatment before it begins. ABA therapy almost always requires PA. Aminy submits your PA request automatically — you\'ll see the status in your Insurance Hub. Typical approval time is 3–10 business days.',
      },
      {
        question: 'What does "in-network" mean for me?',
        answer: 'In-network means your provider has a contracted rate with your insurance plan, which results in lower out-of-pocket costs for you. All Aminy-verified providers are in-network with at least one major payer. Your copay or coinsurance will be significantly lower with in-network providers.',
      },
      {
        question: 'How does my deductible affect therapy costs?',
        answer: 'Your deductible is the amount you pay for healthcare each year before insurance starts sharing costs. Once you hit your deductible, you\'ll typically only owe a copay or coinsurance per session. Track your deductible progress in the Insurance Hub.',
      },
      {
        question: 'Can I use an FSA or HSA for therapy?',
        answer: 'Yes! ABA therapy, speech therapy, and mental health therapy are all FSA/HSA-eligible expenses. You can use your FSA or HSA card to pay copays and any out-of-pocket costs. Aminy generates itemized receipts for all sessions for easy reimbursement.',
      },
      {
        question: 'What if my claim is denied?',
        answer: 'Don\'t panic — denials are common and can often be successfully appealed. Aminy\'s billing team will review the denial reason and file an appeal on your behalf. You\'ll be notified by push notification. Appeals are resolved within 30–60 days for most plans.',
      },
    ],
  },
  {
    id: 'scheduling',
    label: 'Scheduling Help',
    icon: Calendar,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    faqs: [
      {
        question: 'How do I book a session?',
        answer: 'Tap "Book Session" on your dashboard or go to My Appointments. You can search for providers by specialty, distance, and insurance. Once you select a time, the provider confirms within 24 hours. You\'ll get a reminder 1 hour before each session.',
      },
      {
        question: 'What is your cancellation policy?',
        answer: 'Cancel at least 24 hours before your session to avoid a late cancellation fee (typically $35–$50). Cancellations within 24 hours may be charged to your card on file. Life happens — you can cancel up to 3 sessions per quarter without a fee if it\'s your first time.',
      },
      {
        question: 'Can I switch providers?',
        answer: 'Yes, you can switch providers at any time. Go to My Provider → Request Change. Your session history and progress notes transfer automatically. Note: if you have prior authorization tied to a specific provider, you may need a new PA for a new provider.',
      },
      {
        question: 'How do telehealth sessions work?',
        answer: 'Telehealth sessions happen right inside Aminy — no app downloads needed. You\'ll get a "Join Session" button 5 minutes before your scheduled time. Sessions are encrypted and private, and recorded only with your consent. Works on iPhone, iPad, or any computer.',
      },
      {
        question: 'What if my provider cancels last-minute?',
        answer: 'If your provider cancels within 2 hours of the session, you\'ll receive a credit toward your next session automatically. We\'ll also show you available same-day or next-day alternatives from other providers on the platform.',
      },
      {
        question: 'How many sessions can we have per week?',
        answer: 'Session frequency is determined by your treatment plan and insurance authorization. ABA typically runs 10–25 hours/week for intensive programs. Your BCBA will recommend the right frequency during your initial assessment.',
      },
    ],
  },
  {
    id: 'provider',
    label: 'Provider Questions',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    faqs: [
      {
        question: 'How are Aminy providers vetted?',
        answer: 'Every provider on Aminy undergoes: credential verification (license, NPI, certifications), background check, malpractice insurance confirmation, and a clinical practice review. BCBAs are required to hold current BACB certification. We re-verify annually.',
      },
      {
        question: 'Can I see a provider\'s reviews and ratings?',
        answer: 'Yes — every provider profile shows reviews from other families on the platform. After each session, you\'ll be invited to leave a quick rating. Reviews are moderated but not filtered for negativity — we believe in transparency.',
      },
      {
        question: 'What credentials should my ABA therapist have?',
        answer: 'BCBA (Board Certified Behavior Analyst) is the gold standard for ABA supervision. RBTs (Registered Behavior Technicians) deliver direct therapy under BCBA oversight. Both credentials require ongoing education and BACB certification.',
      },
      {
        question: 'Can I communicate with my provider between sessions?',
        answer: 'Yes — use the Messages tab in Aminy for encrypted, private messaging with your provider. Providers typically respond within 24 business hours. For urgent clinical concerns, call your provider\'s direct line. For emergencies, call 988 or 911.',
      },
      {
        question: 'What happens if my child doesn\'t click with their provider?',
        answer: 'The therapeutic relationship matters enormously. If it\'s not working, request a provider change through the app — no explanation needed. We\'ll suggest 2–3 alternatives based on your child\'s profile. There\'s no fee for requesting a change.',
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & Payments',
    icon: CreditCard,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    faqs: [
      {
        question: 'When am I billed for sessions?',
        answer: 'For insured sessions, you\'re billed your copay/coinsurance amount after the claim is processed (typically 5–7 business days post-session). Cash-pay sessions are charged 24 hours after the session completes. All charges appear in your billing history.',
      },
      {
        question: 'How do I get a superbill?',
        answer: 'A superbill is an itemized receipt you can submit to insurance for reimbursement. In Aminy, go to Billing → Session History → tap any session → "Download Superbill". Superbills include all required fields: CPT codes, diagnosis codes, NPI, dates of service.',
      },
      {
        question: 'I was charged more than expected — what do I do?',
        answer: 'First, check your Explanation of Benefits (EOB) in the Insurance Hub to see what insurance paid. If the charge looks wrong, tap "Dispute" next to the charge in your billing history and our team will review within 2 business days. We never add surprise fees.',
      },
      {
        question: 'Can I set up a payment plan?',
        answer: 'Yes. If you have a large balance, contact Aminy support to set up monthly payments. We also participate in CareCredit and can provide a financial hardship review for AHCCCS-eligible families. No one is turned away for inability to pay.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'Visa, Mastercard, American Express, Discover, HSA/FSA cards, and bank account (ACH). Apple Pay and Google Pay are also accepted on mobile. Payment methods are stored securely using Stripe — Aminy never stores your card number.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy & Records',
    icon: Lock,
    color: 'text-[#5A6B7A]',
    bgColor: 'bg-[#EDF4F7]',
    faqs: [
      {
        question: 'Who can see my child\'s records?',
        answer: 'Your child\'s clinical records are accessible only to: you, your approved caregivers, and your active providers. Insurance companies see claim data (CPT codes, diagnosis codes) as required for reimbursement. Aminy never sells your data. Ever.',
      },
      {
        question: 'How does Aminy protect my data?',
        answer: 'Aminy is HIPAA-conscious and privacy-first. We use strong encryption (AES-256) for clinical data, follow HIPAA-aligned security practices, and our telehealth runs on Daily.co\'s HIPAA-compliant video infrastructure (covered by a Business Associate Agreement). Your data stays private and you control who can see it.',
      },
      {
        question: 'Can I request a copy of my child\'s records?',
        answer: 'Yes — this is your right under HIPAA. Go to Profile → Health Records → "Request My Records". You\'ll receive a secure download link within 5 business days. Records include session notes, assessments, progress reports, and billing history.',
      },
      {
        question: 'How long are records kept?',
        answer: 'We retain clinical records for 7 years from the last date of service (or until your child turns 21, whichever is later) per state and federal requirements. After that, records are permanently deleted using NIST 800-88 secure erasure standards.',
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes. Go to Settings → Account → "Delete Account". Note: clinical records required to be retained by law cannot be immediately deleted, but all personal identifiers will be removed within 30 days of your request. Your billing and session history will be purged.',
      },
    ],
  },
];

const CRISIS_RESOURCES = [
  { name: '988 Suicide & Crisis Lifeline', number: '988', note: 'Call or text — 24/7', color: 'text-red-600' },
  { name: 'SAMHSA National Helpline', number: '1-800-662-4357', note: 'Mental health & substance use — free, confidential, 24/7', color: 'text-purple-600' },
  { name: 'Crisis Text Line', number: 'Text HOME to 741741', note: 'Text-based crisis support — 24/7', color: 'text-blue-600' },
  { name: 'Arizona Crisis Line', number: '1-844-534-4673', note: 'AZ Behavioral Health Crisis Line — 24/7', color: 'text-emerald-600' },
  { name: 'Emergency Services', number: '911', note: 'Immediate danger — call emergency services', color: 'text-red-700' },
];

// ============================================================================
// Sub-components
// ============================================================================

function FAQAccordion({ faqs }: { faqs: FAQItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="divide-y divide-slate-100">
      {faqs.map((faq, i) => (
        <div key={i}>
          <button
            className="w-full flex items-start gap-3 p-4 text-left hover:bg-[#F6FBFB] transition-colors"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
          >
            <span className="text-sm font-medium text-[#132F43] flex-1 leading-relaxed">{faq.question}</span>
            {openIdx === i ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            )}
          </button>
          <AnimatePresence>
            {openIdx === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="px-4 pb-4 text-sm text-[#5A6B7A] leading-relaxed">{faq.answer}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function ChatInterface({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([
    { from: 'aminy', text: 'Hi! I\'m here to help. What\'s your question about your coverage or care?' },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { from: 'parent', text: input.trim() }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          from: 'aminy',
          text: 'Thanks for your question! Our care team will review this and respond within 2 business hours. For urgent coverage questions, you can also call the member services number on the back of your insurance card.',
        },
      ]);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-[#E8E4DF] rounded-t-3xl shadow-2xl max-w-lg mx-auto"
      style={{ maxHeight: '70vh' }}
    >
      <div className="flex items-center justify-between p-4 border-b border-[#E8E4DF]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2A7D99' }}>
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-[#132F43] text-sm">Aminy Support</p>
            <p className="text-sm text-slate-400">Typically replies in under 2 hours</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F6FBFB] transition-colors">
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: '45vh' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === 'parent' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.from === 'parent'
                ? 'bg-slate-900 text-white rounded-br-sm'
                : 'bg-[#EDF4F7] text-[#132F43] rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[#E8E4DF] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type your question..."
          className="flex-1 px-4 py-2.5 bg-[#EDF4F7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          onClick={send}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: '#2A7D99' }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface FamilyHelpCenterProps {
  onBack?: () => void;
  childName?: string;
  memberPlan?: string;
}

export function FamilyHelpCenter({ onBack, childName = 'your child', memberPlan = 'BCBS Arizona' }: FamilyHelpCenterProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingLetter, setGeneratingLetter] = useState(false);

  const category = HELP_CATEGORIES.find((c) => c.id === activeCategory);

  const filteredFAQs = searchQuery
    ? HELP_CATEGORIES.flatMap((cat) =>
        cat.faqs
          .filter(
            (faq) =>
              faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
              faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((faq) => ({ ...faq, category: cat.label }))
      )
    : [];

  const handleGenerateLetter = async () => {
    setGeneratingLetter(true);
    await new Promise((r) => setTimeout(r, 1500));
    setGeneratingLetter(false);
    toast.success('Benefits explanation letter generated — check your email and the Vault in Aminy.');
  };

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-[#F6FBFB] transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
            </button>
          )}
          {activeCategory ? (
            <>
              <button
                onClick={() => setActiveCategory(null)}
                className="p-2 rounded-xl hover:bg-[#F6FBFB] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
              </button>
              <div className="flex-1">
                <h1 className="font-bold text-[#132F43]">{category?.label}</h1>
                <p className="text-sm text-[#5A6B7A]">{category?.faqs.length} topics</p>
              </div>
            </>
          ) : (
            <div className="flex-1">
              <h1 className="font-bold text-[#132F43]">Help Center</h1>
              <p className="text-sm text-[#5A6B7A]">Answers for {childName}'s care</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">
        {!activeCategory && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help topics..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#E8E4DF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Search results */}
            {searchQuery && (
              <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
                {filteredFAQs.length === 0 ? (
                  <p className="p-4 text-sm text-[#5A6B7A] text-center">No results for "{searchQuery}"</p>
                ) : (
                  <>
                    <p className="px-4 pt-3 text-sm text-slate-400 font-medium">{filteredFAQs.length} result{filteredFAQs.length !== 1 ? 's' : ''}</p>
                    <FAQAccordion faqs={filteredFAQs} />
                  </>
                )}
              </div>
            )}

            {/* Category cards */}
            {!searchQuery && (
              <div className="grid grid-cols-2 gap-3">
                {HELP_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveCategory(cat.id)}
                      className="bg-white border border-[#E8E4DF] rounded-2xl p-4 text-left space-y-3 hover:border-[#6B9080]/30 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.bgColor}`}>
                        <Icon className={`w-5 h-5 ${cat.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-[#132F43] text-sm leading-tight">{cat.label}</p>
                        <p className="text-sm text-slate-400 mt-0.5">{cat.faqs.length} topics</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Quick actions */}
            {!searchQuery && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Quick Actions</p>
                <button
                  onClick={() => setShowChat(true)}
                  className="w-full bg-white border border-[#E8E4DF] rounded-2xl p-4 flex items-center gap-3 hover:border-[#6B9080]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#2A7D99' }}>
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-[#132F43] text-sm">Talk to Aminy Support</p>
                    <p className="text-sm text-slate-400">Typically responds in under 2 hours</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={handleGenerateLetter}
                  disabled={generatingLetter}
                  className="w-full bg-white border border-[#E8E4DF] rounded-2xl p-4 flex items-center gap-3 hover:border-[#6B9080]/30 transition-colors disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EEF4F8] flex items-center justify-center">
                    {generatingLetter ? (
                      <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-[#132F43] text-sm">Get a Benefits Explanation Letter</p>
                    <p className="text-sm text-slate-400">Letter explaining {memberPlan} coverage for employers or schools</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Category FAQ view */}
        {activeCategory && category && (
          <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
            <FAQAccordion faqs={category.faqs} />
          </div>
        )}

        {/* Crisis resources — always visible */}
        <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-red-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-red-800 text-sm">Crisis Resources</h3>
            </div>
            <p className="text-sm text-red-600 mt-0.5">Always available — free and confidential</p>
          </div>
          <div className="divide-y divide-red-100">
            {CRISIS_RESOURCES.map((resource) => (
              <div key={resource.name} className="p-4 flex items-start gap-3">
                <Phone className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-[#132F43] text-sm">{resource.name}</p>
                  <p className={`text-sm font-bold ${resource.color}`}>{resource.number}</p>
                  <p className="text-sm text-[#5A6B7A] mt-0.5">{resource.note}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat overlay */}
      <AnimatePresence>
        {showChat && <ChatInterface onClose={() => setShowChat(false)} />}
      </AnimatePresence>

      {/* Floating chat button */}
      {!showChat && !activeCategory && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center text-white z-40"
          style={{ backgroundColor: '#2A7D99' }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

export default FamilyHelpCenter;
