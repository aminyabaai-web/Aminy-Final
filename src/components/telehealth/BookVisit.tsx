// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Book Visit Screen
 * One Medical-style provider cards with time slot pills
 *
 * Features:
 * - Segmented control: Remote | In Office | Date
 * - Provider cards with availability
 * - Time slot pills for 1-tap booking
 * - 72-hour telehealth-first routing rule enforcement
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Video,
  Building2,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Calendar,
  AlertCircle,
  Bell,
  MapPin,
  Home,
  FileText,
  Check,
  Loader2
} from 'lucide-react';
import {
  Provider,
  ProviderRole,
  GetCareIntake,
  VisitType,
  TimeSlot,
  PROVIDER_ROLE_DISPLAY
} from '../../types/telehealth';
import {
  checkTelehealthAvailability72Hours,
  TelehealthAvailabilityCheck,
  generateSlots
} from '../../lib/availability-engine';
import { getProviderSlots } from '../../lib/telehealth-api';
import { PRICING_MESSAGING } from '../../lib/pricing';
import { getDisplayPricingForProvider } from '../../lib/telehealth-economics';
import { supabase } from '../../utils/supabase/client';

const LIVE_TELEHEALTH_STATES = new Set(['AZ', 'MT', 'TX']);

interface BookVisitProps {
  onBack: () => void;
  onSelectSlot: (provider: Provider, slot: TimeSlot, visitType: VisitType) => void;
  onJoinWaitlist: (provider?: Provider) => void;
  onRequestLocalCare?: () => void;
  onStartHomeProgram?: () => void;
  onExportReferralPacket?: () => void;
  intake: GetCareIntake;
}

export function BookVisitScreen({
  onBack,
  onSelectSlot,
  onJoinWaitlist,
  onRequestLocalCare,
  onStartHomeProgram,
  onExportReferralPacket,
  intake
}: BookVisitProps) {
  const [visitFormat, setVisitFormat] = useState<'remote' | 'in-office'>('remote');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [visitType, setVisitType] = useState<VisitType>(intake.preferredVisitType || 'consult');
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  // Fetch real providers from database
  useEffect(() => {
    async function loadProviders() {
      setIsLoadingProviders(true);
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
          .order('rating', { ascending: false });

        if (error) {
          console.error('Failed to load providers:', error);
          return;
        }

        if (data && data.length > 0) {
          // Transform database providers to Provider type
          interface ProviderRow {
            id: string;
            full_name?: string;
            name?: string;
            provider_type?: string;
            credentials?: string;
            bio?: string;
            license_state?: string | null;
            state?: string | null;
            hourly_rate?: number;
            rating?: string;
            review_count?: number;
            verified?: boolean;
            accepting_new_patients?: boolean;
            offers_telehealth?: boolean;
            created_at?: string;
            updated_at?: string;
            photo_url?: string;
          }
          const providers: Provider[] = (data as ProviderRow[])
            .filter((provider) => {
              const providerState = (provider.license_state || provider.state || '').toUpperCase();
              return LIVE_TELEHEALTH_STATES.has(providerState);
            })
            .map((p) => {
              const organization = 'independent' as Provider['organization'];
              const providerState = (p.license_state || p.state || '').toUpperCase();
              const fullName = p.full_name || p.name || 'Provider';
              const [firstName = 'Provider', ...lastNameParts] = fullName.trim().split(/\s+/);
              const pricing = getDisplayPricingForProvider(
                organization,
                p.hourly_rate || 99,
                p.hourly_rate ? p.hourly_rate * 2 : undefined,
              );

              return {
                id: p.id,
                firstName,
                lastName: lastNameParts.join(' '),
                role: (p.provider_type || 'bcba') as ProviderRole,
                roleDisplayName: PROVIDER_ROLE_DISPLAY[p.provider_type as keyof typeof PROVIDER_ROLE_DISPLAY] || 'Provider',
                credentials: p.credentials || '',
                bio: p.bio || '',
                licensedStates: providerState ? [providerState] : [],
                offersConsult: true,
                offersDeepReview: true,
                consultPrice: pricing.consultPrice,
                deepReviewPrice: pricing.deepReviewPrice,
                organization,
                rating: parseFloat(p.rating || '4.5') || 4.5,
                reviewCount: p.review_count || 0,
                isActive: true,
                acceptingNewPatients: p.accepting_new_patients ?? true,
                createdAt: p.created_at || new Date().toISOString(),
                updatedAt: p.updated_at || new Date().toISOString(),
                avatarUrl: p.photo_url,
              };
            });
          setAllProviders(providers);
        }
      } catch (err) {
        console.error('Error loading providers:', err instanceof Error ? err.message : err);
      } finally {
        setIsLoadingProviders(false);
      }
    }
    loadProviders();
  }, []);

  // Generate next 14 days for date selector
  const dateOptions = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Filter providers by user's state + insurance (Headway-style)
  const availableProviders = useMemo(() => {
    return allProviders.filter(provider => {
      // Check if provider is licensed in user's state
      if (!provider.licensedStates.includes(intake.userState)) {
        return false;
      }
      // Check if provider offers selected visit type
      if (visitType === 'consult' && !provider.offersConsult) return false;
      if (visitType === 'deep-review' && !provider.offersDeepReview) return false;
      // Insurance filter — show providers who accept the user's plan
      if (intake.insurancePlan && intake.paymentPreference === 'insurance') {
        const planLower = intake.insurancePlan.toLowerCase();
        const acceptsPlan = provider.acceptedInsurance?.some(
          ins => ins.toLowerCase().includes(planLower) || planLower.includes(ins.toLowerCase())
        );
        // If provider doesn't list any insurance panels, include them (may accept)
        if (provider.acceptedInsurance && provider.acceptedInsurance.length > 0 && !acceptsPlan) {
          return false;
        }
      }
      // Check if provider is active and accepting
      return provider.isActive && provider.acceptingNewPatients;
    });
  }, [allProviders, intake.userState, intake.insurancePlan, intake.paymentPreference, visitType]);

  // Load real slots from provider availability
  const [providerSlots, setProviderSlots] = useState<Record<string, TimeSlot[]>>({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch real availability slots for each provider
  useEffect(() => {
    async function loadSlots() {
      if (availableProviders.length === 0) return;

      setIsLoadingSlots(true);
      const slotsMap: Record<string, TimeSlot[]> = {};
      const dateStr = selectedDate.toISOString().split('T')[0];

      try {
        // Load slots for all providers in parallel
        await Promise.all(
          availableProviders.map(async (provider) => {
            try {
              // If provider has availability blocks, use them
              if (provider.availabilityBlocks && provider.availabilityBlocks.length > 0) {
                const slots = generateSlots(
                  provider.id,
                  provider.availabilityBlocks,
                  provider.timeOffBlocks || [],
                  visitType,
                  [],
                  selectedDate
                );
                // Filter to selected date
                slotsMap[provider.id] = slots.filter(slot =>
                  slot.startTime.startsWith(dateStr)
                );
              } else {
                // Try API call for slots
                const slots = await getProviderSlots(provider.id, visitType, selectedDate);
                slotsMap[provider.id] = slots.filter(slot =>
                  slot.startTime.startsWith(dateStr)
                );
              }
            } catch (error) {
              console.error(`Failed to load slots for ${provider.id}:`, error);
              slotsMap[provider.id] = []; // Empty on error
            }
          })
        );
      } catch (error) {
        console.error('Failed to load provider slots:', error);
      } finally {
        setProviderSlots(slotsMap);
        setIsLoadingSlots(false);
      }
    }

    loadSlots();
  }, [availableProviders, selectedDate, visitType]);

  // =========================================================================
  // 72-HOUR TELEHEALTH-FIRST ROUTING RULE
  // =========================================================================
  // Business Rule: "Help finding local care" ONLY appears when there are ZERO
  // eligible Aminy telehealth providers licensed in the user's state with
  // availability within the next 72 hours.
  // =========================================================================

  // Use real loaded slots for the 72-hour availability check
  // instead of randomly generated mock data
  const allSlotsNext72Hours = useMemo(() => {
    const slots: TimeSlot[] = [];
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    // Aggregate all loaded provider slots
    Object.values(providerSlots).forEach(ps => {
      ps.forEach(slot => {
        const slotTime = new Date(slot.startTime);
        if (slotTime > now && slotTime < threeDaysFromNow) {
          slots.push(slot);
        }
      });
    });

    // If we have active providers but slots haven't loaded yet,
    // don't prematurely trigger "no availability" — return a placeholder
    if (availableProviders.length > 0 && slots.length === 0 && isLoadingSlots) {
      return availableProviders.map(p => ({
        id: `placeholder-${p.id}`,
        providerId: p.id,
        startTime: new Date(now.getTime() + 3600000).toISOString(),
        endTime: new Date(now.getTime() + 5400000).toISOString(),
        visitType,
        status: 'available' as const,
      }));
    }

    return slots;
  }, [providerSlots, availableProviders, isLoadingSlots, visitType]);

  // Check 72-hour availability
  const telehealthAvailability = useMemo<TelehealthAvailabilityCheck>(() => {
    return checkTelehealthAvailability72Hours(
      allProviders,
      intake.userState,
      allSlotsNext72Hours,
      visitType
    );
  }, [allProviders, intake.userState, allSlotsNext72Hours, visitType]);

  // CRITICAL: Only show local care options when NO telehealth available within 72 hours
  const shouldShowLocalCareOptions = telehealthAvailability.shouldShowLocalCare;

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const noProvidersAvailable = availableProviders.length === 0 && !isLoadingProviders;

  // Show loading while fetching providers
  if (isLoadingProviders) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),transparent_30%),linear-gradient(180deg,#f7fffd_0%,#f4f7f8_100%)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#6B9080] animate-spin mx-auto mb-3" />
          <p className="text-[#5A6B7A] font-medium">Finding providers in your area...</p>
          <p className="text-sm text-[#8A9BA8] mt-1">This only takes a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),transparent_30%),linear-gradient(180deg,#f7fffd_0%,#f4f7f8_100%)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#E8E4DF]/80 bg-white/88 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/78">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-[#F0EDE8] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[#3A4A57]" />
          </button>
          <div>
              <h1 className="text-lg font-semibold text-[#1B2733]">Choose a visit</h1>
              <p className="max-w-[320px] truncate text-sm text-[#5A6B7A]">{intake.visitReason}</p>
          </div>
        </div>
        {/* Progress Breadcrumbs */}
        <nav className="flex items-center gap-2 mt-3" aria-label="Booking progress">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </span>
            <span className="text-xs font-medium text-green-600">Tell us more</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A9BA8]" aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">2</span>
            <span className="text-xs font-medium text-[#6B9080]">Choose provider</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A9BA8]" aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 bg-[#E8E4DF] rounded-full flex items-center justify-center text-[#5A6B7A] text-xs font-bold">3</span>
            <span className="text-xs text-[#8A9BA8]">Confirm</span>
          </div>
        </nav>
      </header>

      {/* Filters */}
      <div className="border-b border-[#E8E4DF]/80 bg-white/82 px-4 py-3 space-y-3 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        {/* Visit Format Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setVisitFormat('remote')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              visitFormat === 'remote'
                ? 'bg-primary text-white'
                : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#6B9080]/10'
            }`}
          >
            <Video className="w-4 h-4" />
            Remote
          </button>
          <button
            disabled
            className="flex items-center gap-2 rounded-full border border-[#E8E4DF] bg-white px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed"
          >
            <Building2 className="w-4 h-4" />
            In Office
            <span className="rounded-full bg-[#F0EDE8] px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em] text-[#5A6B7A]">Soon</span>
          </button>
        </div>

        {/* Visit Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setVisitType('consult')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              visitType === 'consult'
                ? 'bg-[#6B9080]/10 text-[#6B9080] border-2 border-[#6B9080]'
                : 'bg-[#F0EDE8] text-[#5A6B7A] border-2 border-transparent hover:bg-[#6B9080]/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            25-min Consult
          </button>
          <button
            onClick={() => setVisitType('deep-review')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              visitType === 'deep-review'
                ? 'bg-[#6B9080]/10 text-[#6B9080] border-2 border-[#6B9080]'
                : 'bg-[#F0EDE8] text-[#5A6B7A] border-2 border-transparent hover:bg-[#6B9080]/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            50-min Deep Review
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <Calendar className="w-4 h-4 text-[#8A9BA8] flex-shrink-0" />
          {dateOptions.map((date) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-primary text-white'
                    : isToday
                    ? 'bg-[#6B9080]/10 text-[#6B9080]'
                    : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#6B9080]/10'
                }`}
              >
                {formatDate(date)}
              </button>
            );
          })}
        </div>
        <p className="text-xs leading-5 text-[#5A6B7A]">
          Choose a time and Aminy keeps the rest simple: payment, reminders, secure room access, and any superbill follow-up stay attached to the same appointment.
        </p>
      </div>

      {/* Provider List */}
      <div className="px-4 py-6 pb-24 space-y-3 sm:space-y-4">
        {/* Pricing Info Banner */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#E8E4DF] bg-white/92 p-4 shadow-sm">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💳</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#1B2733]">
              Cash-pay stays simple here
            </p>
            <p className="text-xs text-[#5A6B7A]">
              Choose a licensed provider, book a time, and keep reminders, room access, and your superbill in one place.
            </p>
          </div>
        </div>

        {/* 72-Hour Availability Status Banner */}
        {telehealthAvailability.hasAvailabilityWithin72Hours && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Video className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">
                {telehealthAvailability.eligibleProviderCount} provider{telehealthAvailability.eligibleProviderCount !== 1 ? 's' : ''} available within 72 hours
              </p>
              {telehealthAvailability.earliestSlot && (
                <p className="text-xs text-green-600">
                  Next available: {new Date(telehealthAvailability.earliestSlot.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(telehealthAvailability.earliestSlot.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
              <p className="mt-1 text-xs text-green-700">
                Aminy keeps the whole path calmer: booking, reminders, secure room access, and follow-up.
              </p>
            </div>
          </div>
        )}

        {noProvidersAvailable || !telehealthAvailability.hasAvailabilityWithin72Hours ? (
          /* No Providers / No 72-hour availability - Show fallback with local care options */
          <NoProvidersCard
            userState={intake.userState}
            onJoinWaitlist={() => onJoinWaitlist()}
            onRequestLocalCare={onRequestLocalCare}
            onStartHomeProgram={onStartHomeProgram}
            onExportReferralPacket={onExportReferralPacket}
            availabilityCheck={telehealthAvailability}
          />
        ) : (
          /* Telehealth available within 72 hours - Show providers ONLY (no local care links) */
          availableProviders.map((provider) => {
            const slots = providerSlots[provider.id] || [];
            const price = visitType === 'consult' ? provider.consultPrice : provider.deepReviewPrice;

            return (
              <ProviderCard
                key={provider.id}
                provider={provider}
                slots={slots}
                price={price}
                visitType={visitType}
                onSelectSlot={(slot) => onSelectSlot(provider, slot, visitType)}
                onJoinWaitlist={() => onJoinWaitlist(provider)}
                formatTime={formatTime}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Provider Card Component
// ============================================================================

interface ProviderCardProps {
  provider: Provider;
  slots: TimeSlot[];
  price: number;
  visitType: VisitType;
  onSelectSlot: (slot: TimeSlot) => void;
  onJoinWaitlist: () => void;
  formatTime: (iso: string) => string;
}

function ProviderCard({
  provider,
  slots,
  price,
  visitType,
  onSelectSlot,
  onJoinWaitlist,
  formatTime
}: ProviderCardProps) {
  const hasSlots = slots.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-[#E8E4DF]/80 overflow-hidden shadow-sm">
      {/* Provider Info */}
      <div className="p-4 flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-[#E8E4DF] overflow-hidden">
            {provider.avatarUrl ? (
              <img
                src={provider.avatarUrl}
                alt={`${provider.firstName} ${provider.lastName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-lg sm:text-xl font-semibold">
                {provider.firstName[0]}{provider.lastName[0]}
              </div>
            )}
          </div>
          {provider.hasVideoIntro && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Video className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[#1B2733]">
                {provider.firstName} {provider.lastName}, {provider.credentials}
              </h3>
              <p className="text-sm text-[#5A6B7A]">{provider.roleDisplayName}</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-[#1B2733]">${price}</span>
              <p className="text-xs text-green-600 font-medium">HSA/FSA eligible</p>
            </div>
          </div>

          {/* Rating & Visit Type */}
          <div className="flex items-center gap-3 mt-2">
            {provider.rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span className="text-[#3A4A57]">{provider.rating}</span>
                <span className="text-[#8A9BA8]">({provider.reviewCount})</span>
              </div>
            )}
              <div className="flex items-center gap-1 text-sm text-[#5A6B7A]">
                <Video className="w-4 h-4" />
                Secure Aminy video room
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#5A6B7A]">
              {provider.bio || 'Calm, practical support with clear next steps and follow-up you can come back to later.'}
            </p>
          </div>
        </div>

      {/* Time Slots */}
      <div className="px-4 pb-4">
        {hasSlots ? (
          <div>
            <p className="mb-2 text-sm text-[#5A6B7A]">
              {slots.length} appointment{slots.length !== 1 ? 's' : ''} available
            </p>
            <div className="flex flex-wrap gap-2">
              {slots.slice(0, 6).map((slot) => (
              <button
                key={slot.id}
                onClick={() => onSelectSlot(slot)}
                className="rounded-full border border-[#6B9080]/20 bg-[#6B9080]/10 px-4 py-2 text-sm font-medium text-[#6B9080] transition-all hover:bg-[#6B9080]/10 hover:shadow-sm active:scale-95"
              >
                {formatTime(slot.startTime)}
              </button>
            ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-[#5A6B7A] mb-2">No appointments available today</p>
            <button
              onClick={onJoinWaitlist}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#6B9080] px-4 py-2 text-sm font-medium text-[#6B9080] transition-all hover:bg-[#6B9080]/10"
            >
              <Bell className="w-4 h-4" />
              Join Waitlist
            </button>
          </div>
        )}
      </div>

      {/* Organization Badge */}
      {provider.organization !== 'independent' && (
        <div className="px-4 py-2 bg-[#FAF7F2] border-t border-[#E8E4DF]">
          <span className="text-xs text-[#5A6B7A] uppercase tracking-wide">
            {provider.organization === 'aact' && 'AACT Partner'}
            {provider.organization === 'rise' && 'Rise Partner'}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// No Providers Card - 72-Hour Fallback UI
// ============================================================================
// BUSINESS RULE: This card ONLY appears when there are ZERO eligible telehealth
// providers within 72 hours. It shows:
// 1. Join Telehealth Waitlist
// 2. Request Local Care Support (with Referral Packet export)
// 3. Start Aminy Home Program
// ============================================================================

interface NoProvidersCardProps {
  userState: string;
  onJoinWaitlist: () => void;
  onRequestLocalCare?: () => void;
  onStartHomeProgram?: () => void;
  onExportReferralPacket?: () => void;
  availabilityCheck?: TelehealthAvailabilityCheck;
}

function NoProvidersCard({
  userState,
  onJoinWaitlist,
  onRequestLocalCare,
  onStartHomeProgram,
  onExportReferralPacket,
  availabilityCheck
}: NoProvidersCardProps) {
  // Only show local care options when explicitly allowed by 72-hour rule
  const showLocalCareOptions = availabilityCheck?.shouldShowLocalCare ?? true;

  return (
    <div className="bg-white rounded-3xl border border-[#E8E4DF]/80 p-6 shadow-sm">
      <div className="text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-[#1B2733] mb-2">
          No telehealth available within 72 hours
        </h3>
        <p className="text-[#5A6B7A] mb-2">
          We don't currently have providers licensed in {userState} with availability in the next 72 hours.
        </p>
        {/* Reassurance copy per requirement */}
        <p className="text-sm font-medium text-[#6B9080] mb-4 sm:mb-6">
          We'll support you at home while you wait.
        </p>

        <div className="space-y-3">
          {/* Primary CTA: Join Waitlist */}
          <button
            onClick={onJoinWaitlist}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-medium text-white transition-colors hover:bg-[#6B9080]"
          >
            <Bell className="w-4 h-4" />
            Join Telehealth Waitlist
          </button>

          {/* ONLY show local care when 72-hour rule permits */}
          {showLocalCareOptions && (
            <>
              {/* Secondary: Request Local Care Support */}
              {onRequestLocalCare && (
                <button
                  onClick={onRequestLocalCare}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#6B9080]/20 bg-[#6B9080]/10 py-3 font-medium text-[#6B9080] transition-colors hover:bg-[#6B9080]/10"
                >
                  <MapPin className="w-4 h-4" />
                  Request Local Care Support
                </button>
              )}

              {/* Export Referral Packet */}
              {onExportReferralPacket && (
                <button
                  onClick={onExportReferralPacket}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E8E4DF] py-3 font-medium text-[#3A4A57] transition-colors hover:bg-[#FAF7F2]"
                >
                  <FileText className="w-4 h-4" />
                  Download Referral Packet (PDF)
                </button>
              )}
            </>
          )}

          {/* Home Program CTA */}
          {onStartHomeProgram && (
            <button
              onClick={onStartHomeProgram}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-medium text-white transition-colors hover:bg-[#6B9080]"
            >
              <Home className="w-4 h-4" />
              Start Aminy Home Program Now
            </button>
          )}

          <div className="pt-4 border-t border-[#E8E4DF]">
            <h4 className="text-sm font-medium text-[#3A4A57] mb-2">While you wait:</h4>
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                <span className="text-lg">🎥</span>
                <div>
                  <p className="text-sm font-medium text-[#1B2733]">Monthly Q&A Sessions</p>
                  <p className="text-xs text-[#5A6B7A]">Live sessions with providers (included)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                <span className="text-lg">📚</span>
                <div>
                  <p className="text-sm font-medium text-[#1B2733]">Evidence-Based Resources</p>
                  <p className="text-xs text-[#5A6B7A]">Guides and strategies library</p>
                </div>
              </div>
              {/* ONLY show Find Local Care option when 72-hour rule permits */}
              {showLocalCareOptions && (
                <button
                  onClick={onRequestLocalCare}
                  className="w-full flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl hover:bg-[#F0EDE8] transition-colors text-left"
                >
                  <span className="text-lg">🔍</span>
                  <div>
                    <p className="text-sm font-medium text-[#1B2733]">Find Local Care</p>
                    <p className="text-xs text-[#5A6B7A]">Provider directory & referrals</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookVisitScreen;
