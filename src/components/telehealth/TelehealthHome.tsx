// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Telehealth Home Screen
 * One Medical-style entry point with prominent CTAs
 *
 * Features:
 * - Book a Visit CTA
 * - Browse Top Concerns
 * - Messages / Ask Aminy
 * - My Plan access
 * - Monthly Q&A promo
 * - Resources library
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  MessageCircle,
  FileText,
  Video,
  ChevronRight,
  Search,
  Star,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { TelehealthFlow } from './TelehealthFlow';
import { QASessionsHub } from './QASessionsHub';
import { PlaybooksLibrary } from './PlaybooksLibrary';
import { DEFAULT_CONCERNS, Provider, PROVIDER_ROLE_DISPLAY } from '../../types/telehealth';
import { supabase } from '../../utils/supabase/client';
import { DataProvenanceBadge } from '../ui/DataProvenanceBadge';
import { LaunchStateBadge } from '../ui/LaunchStateBadge';
import { createDataProvenance, getSurfaceLaunchConfig, type DataProvenance } from '../../lib/product-truth';
import { getDisplayPricingForProvider } from '../../lib/telehealth-economics';

const LIVE_TELEHEALTH_STATES = new Set(['AZ', 'MT', 'TX']);

interface TelehealthHomeProps {
  onBack: () => void;
  userState?: string;
  userName?: string;
  onNavigate?: (destination: string) => void;
}

type HomeView = 'home' | 'flow' | 'qa-sessions' | 'playbooks';
type FlowEntry = 'choose-path' | 'browse-concerns' | 'get-care' | 'care-plan';

export function TelehealthHome({
  onBack,
  userState = 'AZ',
  userName = 'there',
  onNavigate
}: TelehealthHomeProps) {
  const [currentView, setCurrentView] = useState<HomeView>('home');
  const [flowEntry, setFlowEntry] = useState<FlowEntry>('browse-concerns');
  const [featuredProviders, setFeaturedProviders] = useState<Provider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [featuredProvidersProvenance, setFeaturedProvidersProvenance] = useState<DataProvenance | null>(null);
  const [providerAvailabilityNote, setProviderAvailabilityNote] = useState<string>(getSurfaceLaunchConfig('telehealth').message);

  const launchConfig = getSurfaceLaunchConfig('telehealth');

  // Featured concerns (subset for quick access)
  const featuredConcerns = DEFAULT_CONCERNS.slice(0, 4);

  // Fetch real providers from Supabase (same pattern as BookVisit.tsx)
  useEffect(() => {
    async function loadFeaturedProviders() {
      try {
        const { data, error } = await supabase
          .from('provider_profiles')
          .select(`
            id,
            full_name,
            name,
            provider_type,
            credentials,
            bio,
            rating,
            review_count,
            verified,
            accepting_new_patients,
            offers_telehealth,
            license_state,
            state,
            hourly_rate,
            photo_url
          `)
          .eq('verified', true)
          .eq('accepting_new_patients', true)
          .eq('offers_telehealth', true)
          .order('rating', { ascending: false })
          .limit(4);

        if (!error && data && data.length > 0) {
          const providers: Provider[] = data
            .filter((p: Record<string, unknown>) => {
              const providerState = String(p.license_state || p.state || '').toUpperCase();
              return LIVE_TELEHEALTH_STATES.has(providerState) && (!userState || providerState === userState.toUpperCase());
            })
            .slice(0, 2)
            .map((p: Record<string, unknown>) => {
              const fullName = String(p.full_name || p.name || 'Provider');
              const [firstName = 'Provider', ...lastNameParts] = fullName.trim().split(/\s+/);
              const organization = 'independent' as Provider['organization'];
              const providerState = String(p.license_state || p.state || '').toUpperCase();
              const hourlyRate = Number(p.hourly_rate) || 99;
              const pricing = getDisplayPricingForProvider(organization, hourlyRate, hourlyRate * 2);
              return {
                id: p.id as string,
                firstName,
                lastName: lastNameParts.join(' '),
                role: (p.provider_type as Provider['role']) || 'bcba',
                roleDisplayName: PROVIDER_ROLE_DISPLAY[p.provider_type as keyof typeof PROVIDER_ROLE_DISPLAY] || 'Provider',
                credentials: (p.credentials as string) || '',
                bio: (p.bio as string) || '',
                licensedStates: providerState ? [providerState] : [],
                offersConsult: true,
                offersDeepReview: true,
                consultPrice: pricing.consultPrice,
                deepReviewPrice: pricing.deepReviewPrice,
                organization,
                rating: parseFloat(String(p.rating)) || 4.5,
                reviewCount: Number(p.review_count) || 0,
                isActive: true,
                acceptingNewPatients: Boolean(p.accepting_new_patients ?? true),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                avatarUrl: p.photo_url as string | undefined,
              };
            });
          if (providers.length > 0) {
            setFeaturedProviders(providers);
            setFeaturedProvidersProvenance(createDataProvenance('live', 'Verified provider availability', {
              isVerified: true,
              lastUpdatedAt: new Date().toISOString(),
            }));
            setProviderAvailabilityNote(`Showing verified live availability for ${providers.length} provider${providers.length === 1 ? '' : 's'} in ${userState.toUpperCase()}.`);
          } else {
            setFeaturedProviders([]);
            setFeaturedProvidersProvenance(null);
            setProviderAvailabilityNote('Verified provider availability is limited right now. You can still use Aminy for between-session guidance today.');
          }
        } else {
          setFeaturedProviders([]);
          setFeaturedProvidersProvenance(null);
          setProviderAvailabilityNote('Verified provider availability is limited right now. You can still use Aminy for between-session guidance today.');
        }
      } catch {
        setFeaturedProviders([]);
        setFeaturedProvidersProvenance(null);
        setProviderAvailabilityNote('Live provider availability is temporarily unavailable. Use Aminy guidance now and check back for verified openings.');
      } finally {
        setIsLoadingProviders(false);
      }
    }
    loadFeaturedProviders();
  }, [userState]);

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
    <div
      className="min-h-screen bg-[#FAF7F2]"
      style={{ background: 'linear-gradient(180deg, #FAF7F2 0%, #f6faf8 40%, #eef4f8 100%)' }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-teal-100/80 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-teal-50 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Care Visits</h1>
              <p className="text-sm text-gray-500">Calm booking, reminders, and secure join links in supported states</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 pb-24 space-y-3 sm:space-y-6">
        {/* Greeting */}
        <div
          className="rounded-2xl border border-white/80 p-5 shadow-md"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(240,249,249,0.95), rgba(235,246,250,0.96))' }}
        >
          <div className="inline-flex rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium tracking-[0.02em] text-teal-700">
            Supported in {userState.toUpperCase()}
          </div>
          <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-950 sm:text-xl">Hi {userName}!</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
            Find calm support fast. Book expert care, ask Aminy for guidance, or take the next small step without losing momentum.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <LaunchStateBadge state={launchConfig.state} label={launchConfig.badgeLabel} />
            {featuredProvidersProvenance ? <DataProvenanceBadge provenance={featuredProvidersProvenance} /> : null}
          </div>
          <p className="text-sm text-sky-800">{providerAvailabilityNote}</p>
          <p className="mt-2 text-xs leading-5 text-sky-700">
            Cash-pay booking is live in supported states, and Aminy keeps the booking, reminders, secure room link, and follow-up together in one place.
          </p>
        </div>

        {/* Primary CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => startFlow('choose-path')}
            className="bg-white/90 rounded-2xl border border-slate-200 p-4 text-left shadow-sm hover:shadow-md hover:border-[#6B9080] transition-all"
          >
            <div className="w-12 h-12 bg-[#6B9080]/10 rounded-full flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-[#6B9080]" />
            </div>
            <h3 className="font-semibold text-gray-900">Book a Visit</h3>
            <p className="text-sm text-gray-500 mt-1">1:1 with an expert</p>
          </button>

          <button
            onClick={() => onNavigate?.('messages')}
            className="bg-white/90 rounded-2xl border border-slate-200 p-4 text-left shadow-sm hover:shadow-md hover:border-[#6B9080] transition-all"
          >
            <div className="w-12 h-12 bg-[#6B9080]/10 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-[#6B9080]" />
            </div>
            <h3 className="font-semibold text-gray-900">Aminy</h3>
            <p className="text-sm text-gray-500 mt-1">AI guidance 24/7</p>
          </button>

          <button
            onClick={() => startFlow('care-plan')}
            className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#6B9080]/30 transition-all"
          >
            <div className="w-12 h-12 bg-[#6B9080]/10 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-[#6B9080]" />
            </div>
            <h3 className="font-semibold text-gray-900">My Plan</h3>
            <p className="text-sm text-gray-500 mt-1">Goals, routines & progress</p>
          </button>

          <button
            onClick={() => onNavigate?.('resources')}
            className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#6B9080]/30 transition-all"
          >
            <div className="w-12 h-12 bg-[#6B9080]/10 rounded-full flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-[#6B9080]" />
            </div>
            <h3 className="font-semibold text-gray-900">Resources</h3>
            <p className="text-sm text-gray-500 mt-1">Guides & tools</p>
          </button>
        </div>

        {/* Browse common starting points */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Common starting points</h3>
            <button
              onClick={() => startFlow('browse-concerns')}
              className="text-sm text-[#6B9080] font-medium flex items-center gap-1 hover:underline"
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
                className="flex w-40 flex-shrink-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#6B9080]/30 hover:shadow-md"
              >
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6B9080]/10 text-xl">
                  {concern.icon}
                </span>
                <span className="text-sm font-medium leading-5 text-gray-900 line-clamp-2">{concern.name}</span>
                <span className="mt-2 text-xs text-slate-500">Tap to see the safest next step</span>
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
                className="text-sm text-[#6B9080] font-medium flex items-center gap-1 hover:underline"
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
                  className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#6B9080]/30 transition-all"
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
                        <div className="w-full h-full bg-gradient-to-br from-[#6B9080] to-[#466379] flex items-center justify-center text-white font-semibold">
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
                If telehealth is not the right fit, browse local therapists, BCBAs, and specialists near you.
              </p>
              <button
                onClick={() => onNavigate?.('find-care')}
                className="mt-3 text-sm font-medium text-[#6B9080] hover:underline flex items-center gap-1"
              >
                Explore local providers
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
