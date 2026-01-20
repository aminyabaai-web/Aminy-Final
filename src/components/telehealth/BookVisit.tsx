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
  FileText
} from 'lucide-react';
import {
  Provider,
  GetCareIntake,
  VisitType,
  TimeSlot,
  VISIT_TYPES,
  MOCK_PROVIDERS,
  PROVIDER_ROLE_DISPLAY
} from '../../types/telehealth';
import {
  checkTelehealthAvailability72Hours,
  TelehealthAvailabilityCheck
} from '../../lib/availability-engine';

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

  // Filter providers by user's state
  const availableProviders = useMemo(() => {
    return MOCK_PROVIDERS.filter(provider => {
      // Check if provider is licensed in user's state
      if (!provider.licensedStates.includes(intake.userState)) {
        return false;
      }
      // Check if provider offers selected visit type
      if (visitType === 'consult' && !provider.offersConsult) return false;
      if (visitType === 'deep-review' && !provider.offersDeepReview) return false;
      // Check if provider is active and accepting
      return provider.isActive && provider.acceptingNewPatients;
    });
  }, [intake.userState, visitType]);

  // =========================================================================
  // 72-HOUR TELEHEALTH-FIRST ROUTING RULE
  // =========================================================================
  // Business Rule: "Help finding local care" ONLY appears when there are ZERO
  // eligible Aminy telehealth providers licensed in the user's state with
  // availability within the next 72 hours.
  // =========================================================================

  // Generate ALL slots for next 72 hours for the 72-hour check
  const allSlotsNext72Hours = useMemo(() => {
    const slots: TimeSlot[] = [];
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    // Generate slots for all providers (not just filtered by state - we check state in the function)
    MOCK_PROVIDERS.forEach(provider => {
      const slotDuration = VISIT_TYPES[visitType].duration;

      // Generate slots for next 3 days
      for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        const currentDate = new Date(now);
        currentDate.setDate(now.getDate() + dayOffset);
        currentDate.setHours(0, 0, 0, 0);

        // Generate 4-8 random slots per day for demo
        const slotCount = Math.floor(Math.random() * 5) + 4;
        const usedHours = new Set<number>();

        for (let i = 0; i < slotCount; i++) {
          let hour: number;
          do {
            hour = 9 + Math.floor(Math.random() * 8); // 9am-5pm
          } while (usedHours.has(hour));
          usedHours.add(hour);

          const startTime = new Date(currentDate);
          startTime.setHours(hour, Math.random() > 0.5 ? 0 : 30, 0, 0);

          // Skip slots in the past
          if (startTime <= now) continue;
          // Skip slots beyond 72 hours
          if (startTime > threeDaysFromNow) continue;

          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + slotDuration);

          slots.push({
            id: `${provider.id}-${startTime.toISOString()}`,
            providerId: provider.id,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            visitType,
            status: 'available'
          });
        }
      }
    });

    return slots;
  }, [visitType]);

  // Check 72-hour availability
  const telehealthAvailability = useMemo<TelehealthAvailabilityCheck>(() => {
    return checkTelehealthAvailability72Hours(
      MOCK_PROVIDERS,
      intake.userState,
      allSlotsNext72Hours,
      visitType
    );
  }, [intake.userState, allSlotsNext72Hours, visitType]);

  // CRITICAL: Only show local care options when NO telehealth available within 72 hours
  const shouldShowLocalCareOptions = telehealthAvailability.shouldShowLocalCare;

  // Generate mock slots for each provider
  const providerSlots = useMemo(() => {
    const slotsMap: Record<string, TimeSlot[]> = {};
    const dateStr = selectedDate.toISOString().split('T')[0];

    availableProviders.forEach(provider => {
      const slots: TimeSlot[] = [];
      const slotDuration = VISIT_TYPES[visitType].duration;

      // Generate 3-6 random slots for demo
      const slotCount = Math.floor(Math.random() * 4) + 3;
      const startHour = 9;
      const usedHours = new Set<number>();

      for (let i = 0; i < slotCount; i++) {
        let hour: number;
        do {
          hour = startHour + Math.floor(Math.random() * 8);
        } while (usedHours.has(hour));
        usedHours.add(hour);

        const startTime = new Date(selectedDate);
        startTime.setHours(hour, Math.random() > 0.5 ? 0 : 30, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + slotDuration);

        slots.push({
          id: `${provider.id}-${dateStr}-${hour}`,
          providerId: provider.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          visitType,
          status: 'available'
        });
      }

      // Sort by time
      slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      slotsMap[provider.id] = slots;
    });

    return slotsMap;
  }, [availableProviders, selectedDate, visitType]);

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

  const noProvidersAvailable = availableProviders.length === 0;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Book Visit</h1>
            <p className="text-sm text-gray-500 truncate max-w-[250px]">{intake.visitReason}</p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3">
        {/* Visit Format Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setVisitFormat('remote')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              visitFormat === 'remote'
                ? 'bg-[#577590] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Video className="w-4 h-4" />
            Remote
          </button>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            <Building2 className="w-4 h-4" />
            In Office
            <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">Soon</span>
          </button>
        </div>

        {/* Visit Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setVisitType('consult')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              visitType === 'consult'
                ? 'bg-[#577590]/10 text-[#577590] border-2 border-[#577590]'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            25-min Consult
          </button>
          <button
            onClick={() => setVisitType('deep-review')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              visitType === 'deep-review'
                ? 'bg-[#577590]/10 text-[#577590] border-2 border-[#577590]'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            50-min Deep Review
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {dateOptions.map((date) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-[#577590] text-white'
                    : isToday
                    ? 'bg-[#577590]/10 text-[#577590]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {formatDate(date)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Provider List */}
      <div className="px-4 py-6 pb-24 space-y-4">
        {/* 72-Hour Availability Status Banner */}
        {telehealthAvailability.hasAvailabilityWithin72Hours && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
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
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Provider Info */}
      <div className="p-4 flex gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
            {provider.avatarUrl ? (
              <img
                src={provider.avatarUrl}
                alt={`${provider.firstName} ${provider.lastName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#577590] to-[#466379] flex items-center justify-center text-white text-xl font-semibold">
                {provider.firstName[0]}{provider.lastName[0]}
              </div>
            )}
          </div>
          {provider.hasVideoIntro && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#577590] rounded-full flex items-center justify-center">
              <Video className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">
                {provider.firstName} {provider.lastName}, {provider.credentials}
              </h3>
              <p className="text-sm text-gray-500">{provider.roleDisplayName}</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">${price}</span>
          </div>

          {/* Rating & Visit Type */}
          <div className="flex items-center gap-3 mt-2">
            {provider.rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span className="text-gray-700">{provider.rating}</span>
                <span className="text-gray-400">({provider.reviewCount})</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Video className="w-4 h-4" />
              Remote visit over Zoom
            </div>
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <div className="px-4 pb-4">
        {hasSlots ? (
          <div>
            <p className="text-sm text-gray-600 mb-2">
              {slots.length} appointment{slots.length !== 1 ? 's' : ''} available
            </p>
            <div className="flex flex-wrap gap-2">
              {slots.slice(0, 6).map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => onSelectSlot(slot)}
                  className="px-4 py-2 bg-[#577590] text-white text-sm font-medium rounded-full hover:bg-[#466379] active:scale-95 transition-all"
                >
                  {formatTime(slot.startTime)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-gray-500 mb-2">No appointments available today</p>
            <button
              onClick={onJoinWaitlist}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#577590] text-[#577590] text-sm font-medium rounded-full hover:bg-[#577590]/5 transition-all"
            >
              <Bell className="w-4 h-4" />
              Join Waitlist
            </button>
          </div>
        )}
      </div>

      {/* Organization Badge */}
      {provider.organization !== 'independent' && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <span className="text-xs text-gray-500 uppercase tracking-wide">
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
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No telehealth available within 72 hours
        </h3>
        <p className="text-gray-600 mb-2">
          We don't currently have providers licensed in {userState} with availability in the next 72 hours.
        </p>
        {/* Reassurance copy per requirement */}
        <p className="text-sm text-[#577590] font-medium mb-6">
          We'll support you at home while you wait.
        </p>

        <div className="space-y-3">
          {/* Primary CTA: Join Waitlist */}
          <button
            onClick={onJoinWaitlist}
            className="w-full py-3 bg-[#577590] text-white font-medium rounded-xl hover:bg-[#466379] transition-colors flex items-center justify-center gap-2"
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
                  className="w-full py-3 border-2 border-[#577590] text-[#577590] font-medium rounded-xl hover:bg-[#577590]/5 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Request Local Care Support
                </button>
              )}

              {/* Export Referral Packet */}
              {onExportReferralPacket && (
                <button
                  onClick={onExportReferralPacket}
                  className="w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
              className="w-full py-3 bg-gradient-to-r from-[#43AA8B] to-[#577590] text-white font-medium rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Start Aminy Home Program Now
            </button>
          )}

          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-2">While you wait:</h4>
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-lg">🎥</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">Monthly Q&A Sessions</p>
                  <p className="text-xs text-gray-500">Live sessions with providers (included)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-lg">📚</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">Evidence-Based Resources</p>
                  <p className="text-xs text-gray-500">Guides and strategies library</p>
                </div>
              </div>
              {/* ONLY show Find Local Care option when 72-hour rule permits */}
              {showLocalCareOptions && (
                <button
                  onClick={onRequestLocalCare}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-lg">🔍</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Find Local Care</p>
                    <p className="text-xs text-gray-500">Provider directory & referrals</p>
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
