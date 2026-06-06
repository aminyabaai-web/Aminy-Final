// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { CrisisResources, UrgentHelpDisclaimer } from './GlobalDisclaimer';
import { 
  X, 
  HelpCircle,
  BookOpen,
  Shield,
  MessageCircle,
  Gamepad2,
  CreditCard,
  Lock,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Phone,
  Search,
  User,
  Mail,
  Send
} from 'lucide-react';

interface HelpCenterProps {
  onClose: () => void;
  isOpen?: boolean;
  onAnalytics?: (event: string, data: Record<string, unknown>) => void;
}

// Stub component for backward compatibility
export const UrgentHelpSheet = HelpCenter;

export function HelpCenter({ onClose, onAnalytics }: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<string>('gettingStarted');
  const [selectedArticle, setSelectedArticle] = useState<{ title: string; bullets: string[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [showUrgentHelp, setShowUrgentHelp] = useState(false);

  // Help tabs data
  const helpTabs = {
    gettingStarted: [
      { 
        title: "Welcome to Aminy", 
        bullets: [
          "What you can do in Aminy (Plan, Calm & Rewards, Reports).",
          "Finish onboarding to personalize your plan.",
          "Use Calm & Rewards to support tough moments, transitions, and reward goals."
        ]
      },
      { 
        title: "Completing Onboarding", 
        bullets: [
          "Steps 1–7 take ~6–10 minutes.",
          "Insight Snapshot seeds Top-3 goals.",
          "Benefits builds a personalized checklist."
        ]
      },
      { 
        title: "Navigating Aminy", 
        bullets: [
          "Home shows Today's Plan & Connector.",
          "Calm & Rewards opens the child-facing calm corner, reward board, and transition tools.",
          "Reports exports parent PDF / provider packet."
        ]
      }
    ],
    billing: [
      { 
        title: "Trials & refunds", 
        bullets: [
          "Free 7-day Core trial.",
          "Cancel anytime during trial to avoid charges.",
          "Refund policy link in Billing."
        ]
      },
      { 
        title: "Coaching minutes", 
        bullets: [
          "Minutes wallet shows included & remaining.",
          "Buy add-on packs; sessions deduct minutes.",
          "Receipts emailed automatically."
        ]
      }
    ],
    privacy: [
      { 
        title: "What we store", 
        bullets: [
          "Goals, tasks, text notes, and usage metrics.",
          "Audio off by default (on-device only).",
          "Export/Delete data from Privacy settings."
        ]
      }
    ],
    safety: [
      { 
        title: "Urgent help", 
        bullets: [
          "Aminy isn't for crises.",
          "US: call 911 for emergencies.",
          "US: call/text 988 for mental-health crises."
        ]
      }
    ]
  };

  const helpTabsNavigation = [
    {
      id: 'gettingStarted',
      label: 'Getting started',
      icon: <BookOpen className="w-4 h-4" />,
      description: 'Setup guide and first steps'
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: <CreditCard className="w-4 h-4" />,
      description: 'Subscriptions and payments'
    },
    {
      id: 'privacy',
      label: 'Privacy & Data',
      icon: <Lock className="w-4 h-4" />,
      description: 'Your data and privacy rights'
    },
    {
      id: 'safety',
      label: 'Safety',
      icon: <AlertTriangle className="w-4 h-4" />,
      description: 'Safety resources and support'
    }
  ];

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSelectedArticle(null);
    setSearchQuery('');
  };

  // Handle article selection
  const handleArticleSelect = (article: { title: string; bullets: string[] }) => {
    setSelectedArticle(article);
  };

  // Current tab data
  const currentTab = helpTabsNavigation.find(tab => tab.id === activeTab);
  const tabArticles = helpTabs[activeTab as keyof typeof helpTabs] || [];

  // Filtered articles based on search
  const filteredArticles = searchQuery 
    ? tabArticles.filter(article => {
        const titleMatch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
        const bulletMatch = article.bullets.some((bullet: string) => 
          bullet.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return titleMatch || bulletMatch;
      })
    : tabArticles;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-center-title"
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white border-b border-[#E8E4DF]">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#6B9080]/10 rounded-xl flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-[#6B9080]" />
              </div>
              <div>
                <h2 id="help-center-title" className="text-xl text-[#1B2733]">
                  Help & Support
                </h2>
                <p className="text-sm text-[#5A6B7A]">
                  {selectedArticle ? selectedArticle.title : 'Get help with Aminy'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUrgentHelp(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Phone className="w-4 h-4 mr-2" />
                Urgent Help
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-[#5A6B7A]"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          {!selectedArticle && !showContactForm && (
            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-[#6B9080]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex h-[calc(90vh-180px)]">
          {/* Sidebar */}
          <div className="w-80 border-r border-[#E8E4DF] overflow-y-auto bg-[#FAF7F2]">
            {!selectedArticle ? (
              <div className="p-3 sm:p-4">
                <nav className="space-y-2">
                  {helpTabsNavigation.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-white text-[#1B2733] shadow-sm'
                          : 'text-[#5A6B7A] hover:text-[#1B2733] hover:bg-white/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activeTab === tab.id ? 'bg-[#6B9080]/10 text-[#6B9080]' : 'bg-[#F0EDE8] text-[#5A6B7A]'
                      }`}>
                        {tab.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{tab.label}</div>
                        <div className="text-xs text-[#5A6B7A]">{tab.description}</div>
                      </div>
                    </button>
                  ))}
                </nav>

                <div className="mt-4 sm:mt-6">
                  <Button
                    onClick={() => setShowContactForm(true)}
                    className="w-full bg-primary hover:bg-[#6B9080] text-white"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 sm:p-4">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedArticle(null)}
                  className="flex items-center space-x-2 w-full justify-start mb-4 text-[#5A6B7A] hover:text-[#1B2733]"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>Back to {currentTab?.label}</span>
                </Button>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {showContactForm ? (
              /* Contact Form */
              <div className="p-4 sm:p-5 md:p-6">
                <div className="max-w-2xl">
                  <h3 className="text-lg text-[#1B2733] mb-4">Contact Support</h3>
                  <form className="space-y-3 sm:space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const subject = (form.elements.namedItem('subject') as HTMLInputElement)?.value;
                    const message = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value;
                    if (!subject?.trim() || !message?.trim()) return;
                    // Open mailto with form content as fallback
                    const mailtoUrl = `mailto:support@aminy.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
                    window.open(mailtoUrl, '_blank');
                    onAnalytics?.('help_contact_submitted', { subject });
                    setShowContactForm(false);
                  }}>
                    <div>
                      <label className="block text-sm text-[#3A4A57] mb-2">Subject</label>
                      <input
                        name="subject"
                        type="text"
                        required
                        placeholder="Brief description of your issue"
                        className="w-full px-3 py-2 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-[#6B9080]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#3A4A57] mb-2">Message</label>
                      <textarea
                        name="message"
                        rows={6}
                        required
                        placeholder="Please describe your issue in detail..."
                        className="w-full px-3 py-2 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-[#6B9080]"
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button type="submit" className="bg-primary hover:bg-[#6B9080] text-white">
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowContactForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            ) : selectedArticle ? (
              /* Article View */
              <div className="p-4 sm:p-5 md:p-6">
                <div className="max-w-2xl">
                  <h3 className="text-xl text-[#1B2733] mb-4">{selectedArticle.title}</h3>
                  <div className="space-y-3">
                    {selectedArticle.bullets.map((bullet: string, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <p className="text-[#3A4A57] leading-relaxed">{bullet}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-[#E8E4DF]">
                    <p className="text-sm text-[#5A6B7A] mb-4">Still need help?</p>
                    <Button
                      onClick={() => setShowContactForm(true)}
                      variant="outline"
                      className="text-[#6B9080] border-[#6B9080]/20 hover:bg-[#6B9080]/10"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Articles Grid */
              <div className="p-4 sm:p-5 md:p-6">
                <div className="mb-4">
                  <h3 className="text-lg text-[#1B2733]">{currentTab?.label}</h3>
                  <p className="text-sm text-[#5A6B7A]">{currentTab?.description}</p>
                </div>
                
                <div className="grid gap-3 sm:gap-4">
                  {filteredArticles.map((article, index) => (
                    <Card
                      key={index}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer border-[#E8E4DF]"
                      onClick={() => handleArticleSelect(article)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-[#1B2733] mb-2">{article.title}</h4>
                          <div className="space-y-1">
                            {article.bullets.slice(0, 2).map((bullet: string, bulletIndex: number) => (
                              <p key={bulletIndex} className="text-sm text-[#5A6B7A] line-clamp-1">
                                • {bullet}
                              </p>
                            ))}
                            {article.bullets.length > 2 && (
                              <p className="text-sm text-[#5A6B7A]">
                                +{article.bullets.length - 2} more
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 ml-4 flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>

                {filteredArticles.length === 0 && searchQuery && (
                  <div className="text-center py-8">
                    <p className="text-[#5A6B7A]">No articles found for "{searchQuery}"</p>
                    <Button
                      onClick={() => setSearchQuery('')}
                      variant="ghost"
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Urgent Help Modal */}
      {showUrgentHelp && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUrgentHelp(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg text-[#1B2733]">Urgent Help</h3>
                  <p className="text-sm text-[#5A6B7A]">Emergency resources & support</p>
                </div>
              </div>
              
              <CrisisResources />
              
              <div className="mt-4 sm:mt-6 flex space-x-3">
                <Button
                  onClick={() => setShowUrgentHelp(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
