/**
 * Telehealth Home Screen
 * One Medical-style entry point with prominent CTAs
 *
 * Features:
 * - Book a Visit CTA
 * - Browse Top Concerns
 * - Messages / Ask Aminy
 * - Care Plan access
 * - Monthly Q&A promo
 * - Resources library
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MessageCircle,
  FileText,
  Video,
  ChevronRight,
  Search,
  Star,
  Clock,
  Users,
  BookOpen,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { TelehealthFlow } from './TelehealthFlow';
import { QASessionsHub } from './QASessionsHub';
import { PlaybooksLibrary } from './PlaybooksLibrary';
import { DEFAULT_CONCERNS, MOCK_PROVIDERS } from '../../types/telehealth';

interface TelehealthHomeProps {
  onBack: () => void;
  userState?: string;
  userName?: string;
  onNavigate?: (destination: string) => void;
}

type HomeView = 'home' | 'flow' | 'qa-sessions' | 'playbooks';
type FlowEntry = 'browse-concerns' | 'get-care' | 'care-plan';

export function TelehealthHome({
  onBack,
  userState = 'AZ',
  userName = 'there',
  onNavigate
}: TelehealthHomeProps) {
  const [currentView, setCurrentView] = useState<HomeView>('home');
  const [flowEntry, setFlowEntry] = useState<FlowEntry>('browse-concerns');

  // Featured concerns (subset for quick access)
  const featuredConcerns = DEFAULT_CONCERNS.slice(0, 4);

  // Featured providers
  const featuredProviders = MOCK_PROVIDERS.filter(p =>
    p.licensedStates.includes(userState)
  ).slice(0, 2);

  const startFlow = (entry: FlowEntry) => {
    setFlowEntry(entry);
    setCurrentView('flow');
  };

  // If in flow mode, render the telehealth flow
  if (currentView === 'flow') {
    return (
      <TelehealthFlow
        initialStep={flowEntry}
        onClose={() => setCurrentView('home')}
        defaultState={userState}
      />
    );
  }

  // Q&A Sessions Hub
  if (currentView === 'qa-sessions') {
    return (
      <QASessionsHub
        onBack={() => setCurrentView('home')}
      />
    );
  }

  // Playbooks Library
  if (currentView === 'playbooks') {
    return (
      <PlaybooksLibrary
        onBack={() => setCurrentView('home')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Get Care</h1>
              <p className="text-sm text-gray-500">Book consults & access support</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 pb-24 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Greeting */}
        <div className="bg-gradient-to-br from-[#0891b2] to-[#466379] rounded-2xl p-5 text-white">
          <h2 className="text-lg sm:text-xl font-semibold mb-1">Hi {userName}!</h2>
          <p className="text-white/80 text-sm">
            Get personalized guidance from autism and neurodivergence experts.
          </p>
        </div>

        {/* Primary CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => startFlow('browse-concerns')}
            className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#0891b2]/30 transition-all"
          >
            <div className="w-12 h-12 bg-[#0891b2]/10 rounded-full flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-[#0891b2]" />
            </div>
            <h3 className="font-semibold text-gray-900">Book a Visit</h3>
            <p className="text-sm text-gray-500 mt-1">1:1 with an expert</p>
          </button>

          <button
            onClick={() => onNavigate?.('messages')}
            className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#0891b2]/30 transition-all"
          >
            <div className="w-12 h-12 bg-[#0891b2]/10 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-[#0891b2]" />
            </div>
            <h3 className="font-semibold text-gray-900">Ask Aminy</h3>
            <p className="text-sm text-gray-500 mt-1">AI guidance 24/7</p>
          </button>

          <button
            onClick={() => startFlow('care-plan')}
            className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#0891b2]/30 transition-all"
          >
            <div className="w-12 h-12 bg-[#0891b2]/10 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-[#0891b2]" />
            </div>
            <h3 className="font-semibold text-gray-900">Care Plan</h3>
            <p className="text-sm text-gray-500 mt-1">Summaries & tasks</p>
          </button>

          <button
            onClick={() => onNavigate?.('resources')}
            className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#0891b2]/30 transition-all"
          >
            <div className="w-12 h-12 bg-[#0891b2]/10 rounded-full flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-[#0891b2]" />
            </div>
            <h3 className="font-semibold text-gray-900">Resources</h3>
            <p className="text-sm text-gray-500 mt-1">Guides & tools</p>
          </button>
        </div>

        {/* Browse Top Concerns */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Top Concerns</h3>
            <button
              onClick={() => startFlow('browse-concerns')}
              className="text-sm text-[#0891b2] font-medium flex items-center gap-1 hover:underline"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {featuredConcerns.map((concern) => (
              <button
                key={concern.id}
                onClick={() => {
                  setFlowEntry('get-care');
                  setCurrentView('flow');
                }}
                className="flex-shrink-0 w-32 bg-white rounded-xl border border-gray-100 p-3 text-center hover:shadow-md hover:border-[#0891b2]/30 transition-all"
              >
                <span className="text-2xl block mb-2">{concern.icon}</span>
                <span className="text-sm font-medium text-gray-900 line-clamp-2">{concern.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Monthly Q&A - Included in Membership */}
        <section
          onClick={() => setCurrentView('qa-sessions')}
          className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Video className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Included</span>
              <h3 className="font-semibold text-gray-900 mt-1">Monthly Live Q&A Sessions</h3>
              <p className="text-sm text-gray-600 mt-1">
                Join live sessions with BCBAs, therapists, and parent coaches. Ask questions, get answers.
              </p>
              <button className="mt-3 text-sm font-medium text-amber-700 hover:underline flex items-center gap-1">
                View Schedule & Replays
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Evidence-Based Playbooks */}
        <section
          onClick={() => setCurrentView('playbooks')}
          className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-medium text-green-600 uppercase tracking-wide">New</span>
              <h3 className="font-semibold text-gray-900 mt-1">Evidence-Based Playbooks</h3>
              <p className="text-sm text-gray-600 mt-1">
                Expert strategies for meltdowns, communication, sensory needs, and more. Research-backed.
              </p>
              <button className="mt-3 text-sm font-medium text-green-700 hover:underline flex items-center gap-1">
                Browse Library
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Featured Providers */}
        {featuredProviders.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Available Providers</h3>
              <button
                onClick={() => startFlow('browse-concerns')}
                className="text-sm text-[#0891b2] font-medium flex items-center gap-1 hover:underline"
              >
                View all
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {featuredProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => startFlow('browse-concerns')}
                  className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#0891b2]/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {provider.avatarUrl ? (
                        <img
                          src={provider.avatarUrl}
                          alt={`${provider.firstName} ${provider.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0891b2] to-[#466379] flex items-center justify-center text-white font-semibold">
                          {provider.firstName[0]}{provider.lastName[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {provider.firstName} {provider.lastName}, {provider.credentials}
                      </p>
                      <p className="text-sm text-gray-500">{provider.roleDisplayName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {provider.rating && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Star className="w-3 h-3 text-amber-400 fill-current" />
                            {provider.rating}
                          </div>
                        )}
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          From ${provider.consultPrice}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Find Local Care */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Find Local Care</h3>
              <p className="text-sm text-gray-500 mt-1">
                Browse local therapists, BCBAs, and specialists in your area.
              </p>
              <button
                onClick={() => onNavigate?.('find-care')}
                className="mt-3 text-sm font-medium text-[#0891b2] hover:underline flex items-center gap-1"
              >
                Search Providers
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700">
                <span className="font-medium">Emergency?</span>{' '}
                <a href="tel:911" className="underline font-semibold">Call 911</a>
              </p>
              <p className="text-xs text-red-600 mt-1">
                Aminy provides guidance and coaching, not emergency medical care.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TelehealthHome;
