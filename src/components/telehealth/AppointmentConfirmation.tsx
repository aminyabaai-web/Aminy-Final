// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Appointment Confirmation & Payment Flow
 *
 * Steps:
 * 1. Confirm appointment details
 * 2. Collect payment (Stripe)
 * 3. Show confirmation success
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Video,
  Clock,
  Calendar,
  CreditCard,
  CheckCircle,
  CalendarPlus,
  MessageCircle,
  ExternalLink,
  Shield,
  Lock,
  Info,
  ChevronDown,
  ChevronRight,
  Check
} from 'lucide-react';
import {
  Provider,
  TimeSlot,
  VisitType,
  VISIT_TYPES,
  GetCareIntake
} from '../../types/telehealth';
import {
  createVisitPayment,
  validatePromoCode,
  formatPrice,
  VisitPriceType
} from '../../lib/stripe-service';
import {
  calculateAppointmentFinancials,
  getCashPayVisitEconomics,
  visitClassForVisitType,
} from '../../lib/telehealth-economics';
import { createAppointment } from '../../lib/telehealth-api';
import {
  scheduleAppointmentReminders,
  sendAppointmentConfirmationEmail
} from '../../lib/notification-system';
import {
  scheduleNotification,
} from '../../lib/push-notifications';
import {
  addToCalendar,
  CALENDAR_OPTIONS,
  CalendarType,
  createCalendarEventFromAppointment
} from '../../lib/calendar-service';
import {
  isCalendarConnected,
  syncAppointmentToCalendar,
} from '../../lib/google-calendar-sync';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

interface AppointmentConfirmationProps {
  provider: Provider;
  slot: TimeSlot;
  visitType: VisitType;
  intake: GetCareIntake;
  onBack: () => void;
  onComplete: (appointmentId: string) => void;
  onJoinVideo?: () => void;
}

type FlowStep = 'confirm' | 'payment' | 'success';

export function AppointmentConfirmationScreen({
  provider,
  slot,
  visitType,
  intake,
  onBack,
  onComplete
}: AppointmentConfirmationProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('confirm');
  const [saveCard, setSaveCard] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoDiscountCents, setPromoDiscountCents] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [calendarAutoSynced, setCalendarAutoSynced] = useState(false);
  const [telehealthConsent, setTelehealthConsent] = useState(false);

  const visitConfig = VISIT_TYPES[visitType];

  // Calculate price with discounts
  // Check membership from intake data (intake contains user subscription info)
  const priceType: VisitPriceType = visitType === 'consult' ? 'consult' : 'extended';
  const isMember = intake?.userTier ? intake.userTier !== 'free' : false;
  const visitClass = visitClassForVisitType(visitType);
  const visitEconomics = getCashPayVisitEconomics(visitClass);
  const [pricing, setPricing] = useState(() => calculateAppointmentFinancials({
    rail: 'cash_pay_direct',
    visitClass,
    applyMemberDiscount: isMember,
    promoDiscountCents: 0,
  }));

  useEffect(() => {
    setPricing(calculateAppointmentFinancials({
      rail: 'cash_pay_direct',
      visitClass,
      applyMemberDiscount: isMember,
      promoDiscountCents,
    }));
  }, [visitClass, isMember, promoDiscountCents]);

  // Auto-sync to Google Calendar when appointment is confirmed
  useEffect(() => {
    if (currentStep !== 'success' || !appointmentId || calendarAutoSynced) return;

    const autoSync = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const connected = await isCalendarConnected(user.id);
        if (connected) {
          const result = await syncAppointmentToCalendar(appointmentId);
          if (result.success) {
            if (import.meta.env.DEV) console.log('Appointment auto-synced to Google Calendar:', result.eventId);
          } else {
            console.warn('Calendar auto-sync failed:', result.error);
          }
        }
      } catch (err) {
        console.warn('Calendar auto-sync error:', err);
      } finally {
        setCalendarAutoSynced(true);
      }
    };

    autoSync();
  }, [currentStep, appointmentId, calendarAutoSynced]);

  const price = pricing.totalCents / 100; // Convert from cents to dollars

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;

    const result = await validatePromoCode(promoCode);
    if (result.valid) {
      setPromoApplied(promoCode.toUpperCase());
      setPromoDiscountCents(result.discountAmount || 0);
      setPromoError(null);
    } else {
      setPromoError('Invalid promo code');
      setPromoApplied(null);
      setPromoDiscountCents(0);
    }
  };

  const handleProceedToPayment = () => {
    setCurrentStep('payment');
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Get real user data from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || localStorage.getItem('user-id');
      const userEmail = user?.email || localStorage.getItem('user-email');

      if (!userId || !userEmail) {
        toast.error('Session expired. Please sign out and sign back in to book.');
        setIsProcessing(false);
        return;
      }

      // Store pending appointment info for after payment
      const pendingAppointment = {
        userId,
        userEmail,
        providerId: provider.id,
        providerName: `${provider.firstName} ${provider.lastName}`,
        slotId: slot.id,
        slot,
        visitType,
        intake,
        visitDisplayName: visitConfig.displayName,
        timestamp: Date.now(),
      };
      localStorage.setItem('pending-telehealth-appointment', JSON.stringify(pendingAppointment));

      // Create Stripe checkout session for the visit
      const checkout = await createVisitPayment({
        userId,
        email: userEmail,
        visitType: visitType as VisitPriceType,
        providerId: provider.id,
        slotId: slot.id,
        scheduledAt: slot.startTime,
        isMember: isMember || false,
        promoCode: promoApplied || undefined,
      });

      // Schedule push notification reminders for the appointment
      // (fire-and-forget — don't block the Stripe redirect)
      const appointmentDate = new Date(slot.startTime);
      const providerFullName = `${provider.firstName} ${provider.lastName}`;

      scheduleAppointmentReminders(
        `pending-${Date.now()}`,
        userId,
        userEmail,
        undefined, // phone — not collected in this flow
        appointmentDate,
        providerFullName,
      ).catch((err) => console.error('Failed to schedule appointment reminders:', err));

      // Also schedule a push notification 1 hour before via push-notifications system
      const oneHourBefore = new Date(appointmentDate.getTime() - 60 * 60 * 1000);
      if (oneHourBefore > new Date()) {
        scheduleNotification(userId, {
          userId,
          title: 'Appointment in 1 hour',
          body: `Your appointment with ${providerFullName} starts in 1 hour. Get ready!`,
          scheduledFor: oneHourBefore,
          type: 'custom',
          data: { providerName: providerFullName, visitType },
        }).catch((err) => console.error('Failed to schedule push reminder:', err));
      }

      // Send confirmation email
      sendAppointmentConfirmationEmail(userEmail, {
        userName: 'there',
        providerName: providerFullName,
        appointmentDate: appointmentDate.toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        }),
        appointmentTime: appointmentDate.toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true
        }),
        visitType: visitConfig.displayName,
      }).catch((err) => console.error('Failed to send confirmation email:', err));

      // Redirect to Stripe Checkout
      if (checkout.url) {
        window.location.href = checkout.url;
      } else {
        throw new Error('Failed to create payment session');
      }
    } catch (error: unknown) {
      console.error('Payment error:', error);
      setCurrentStep('payment');
      alert(error instanceof Error ? error.message : 'Unable to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToCalendar = (calendarType?: CalendarType) => {
    addToCalendar(
      {
        providerName: `${provider.firstName} ${provider.lastName}`,
        startTime: slot.startTime,
        endTime: slot.endTime,
        visitType,
        reasonForVisit: intake.visitReason,
      },
      calendarType
    );
    setShowCalendarOptions(false);
  };

  const handleDone = () => {
    if (appointmentId) {
      onComplete(appointmentId);
    }
  };

  // Progress breadcrumbs component
  const ProgressBreadcrumbs = ({ currentPhase }: { currentPhase: 'confirm' | 'payment' | 'success' }) => (
    <nav className="flex items-center gap-2 mt-3" aria-label="Booking progress">
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </span>
        <span className="text-xs font-medium text-green-600 hidden sm:inline">Tell us more</span>
      </div>
      <ChevronRight className="w-4 h-4 text-[#8A9BA8]" aria-hidden="true" />
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </span>
        <span className="text-xs font-medium text-green-600 hidden sm:inline">Choose provider</span>
      </div>
      <ChevronRight className="w-4 h-4 text-[#8A9BA8]" aria-hidden="true" />
      <div className="flex items-center gap-1.5">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
          currentPhase === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-[#6B9080] text-white'
        }`}>
          {currentPhase === 'success' ? <Check className="w-3 h-3" /> : '3'}
        </span>
        <span className={`text-xs font-medium ${
          currentPhase === 'success' ? 'text-green-600' : 'text-[#6B9080]'
        }`}>
          {currentPhase === 'confirm' ? 'Confirm' : currentPhase === 'payment' ? 'Payment' : 'Booked'}
        </span>
      </div>
    </nav>
  );

  // ============================================================================
  // Step 1: Confirm Details
  // ============================================================================
  if (currentStep === 'confirm') {
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
              <h1 className="text-lg font-semibold text-[#1B2733]">Confirm your visit</h1>
              <p className="text-sm text-[#5A6B7A]">Take one last quiet look before checkout</p>
            </div>
          </div>
          <ProgressBreadcrumbs currentPhase="confirm" />
        </header>

        {/* Content */}
        <div className="px-4 py-6 pb-32 space-y-3 sm:space-y-4">
          {/* Provider Card */}
          <div className="bg-white rounded-3xl border border-[#E8E4DF]/80 p-4 shadow-sm">
            <div className="flex gap-3 sm:gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-[#E8E4DF] overflow-hidden flex-shrink-0">
                {provider.avatarUrl ? (
                  <img
                    src={provider.avatarUrl}
                    alt={`${provider.firstName} ${provider.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-600 to-[#466379] flex items-center justify-center text-white font-semibold">
                    {provider.firstName[0]}{provider.lastName[0]}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-[#1B2733]">
                  {provider.firstName} {provider.lastName}, {provider.credentials}
                </h3>
                <p className="text-sm text-[#5A6B7A]">{provider.roleDisplayName}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#6B9080]/20 bg-[#6B9080]/10/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#6B9080]">Booking rail</p>
            <h4 className="mt-1 text-sm font-semibold text-[#6B9080]">
              {provider.organization === 'aact' ? 'AACT Telehealth powered by Aminy' : 'Aminy Provider Network cash-pay visit'}
            </h4>
            <p className="mt-2 text-sm text-[#6B9080]">
              Aminy handles the booking, payment, reminders, and secure room. Your provider remains responsible for the care they deliver and the documentation that supports it.
            </p>
          </div>

          {/* Appointment Details */}
          <div className="bg-white rounded-3xl border border-[#E8E4DF]/80 p-4 space-y-3 sm:space-y-4 shadow-sm">
            <h4 className="font-medium text-[#1B2733]">Appointment Details</h4>

            <div className="space-y-3">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#8A9BA8] mt-0.5" />
                <div>
                  <p className="text-[#1B2733]">{formatDate(slot.startTime)}</p>
                  <p className="text-sm text-[#5A6B7A]">{formatTime(slot.startTime)}</p>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#8A9BA8] mt-0.5" />
                <div>
                  <p className="text-[#1B2733]">{visitConfig.displayName}</p>
                  <p className="text-sm text-[#5A6B7A]">{visitConfig.duration} minutes</p>
                </div>
              </div>

              {/* Visit Type */}
              <div className="flex items-start gap-3">
                <Video className="w-5 h-5 text-[#8A9BA8] mt-0.5" />
                <div>
                  <p className="text-[#1B2733]">Remote Visit</p>
                  <p className="text-sm text-[#5A6B7A]">Secure Aminy video room, reminders, and a join link that stays easy to find later</p>
                </div>
              </div>
            </div>

            {/* Visit Reason */}
            <div className="pt-3 border-t border-[#E8E4DF]">
              <p className="text-sm text-[#5A6B7A] mb-1">Reason for visit</p>
              <p className="text-[#1B2733]">{intake.visitReason}</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-3xl border border-[#E8E4DF]/80 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#3A4A57]">{visitConfig.displayName}</span>
              <span className="text-[#1B2733]">{formatPrice(pricing.subtotalCents)}</span>
            </div>

            {/* Show discounts */}
            {pricing.memberDiscountCents > 0 && (
              <div className="flex items-center justify-between text-sm text-green-600">
                <span>{visitEconomics.publicLabel} savings</span>
                <span>-{formatPrice(pricing.memberDiscountCents)}</span>
              </div>
            )}
            {promoDiscountCents > 0 && (
              <div className="flex items-center justify-between text-sm text-green-600">
                <span>Promo savings</span>
                <span>-{formatPrice(promoDiscountCents)}</span>
              </div>
            )}

            {/* Promo Code Input */}
            <div className="mt-3 pt-3 border-t border-[#E8E4DF]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Promo code"
                  className="flex-1 px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={!promoCode.trim()}
                  className="px-4 py-2 text-sm font-medium text-[#6B9080] bg-[#6B9080]/10 rounded-lg hover:bg-[#6B9080]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
              {promoError && (
                <p className="text-xs text-red-500 mt-1">{promoError}</p>
              )}
              {promoApplied && (
                <p className="text-xs text-green-600 mt-1">Promo "{promoApplied}" applied!</p>
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-[#E8E4DF] flex items-center justify-between">
              <span className="font-medium text-[#1B2733]">Total</span>
              <div className="text-right">
                {(pricing.memberDiscountCents > 0 || promoDiscountCents > 0) && (
                  <span className="text-sm text-[#8A9BA8] line-through mr-2">
                    {formatPrice(pricing.subtotalCents)}
                  </span>
                )}
                <span className="text-xl font-bold text-[#1B2733]">{formatPrice(pricing.totalCents)}</span>
              </div>
            </div>
            {/* HSA/FSA and Superbill Info */}
            <div className="mt-3 pt-3 border-t border-[#E8E4DF] space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs">✓</span>
                <span className="font-medium">HSA/FSA eligible</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                <span className="w-5 h-5 bg-[#F0EDE8] rounded-full flex items-center justify-center flex-shrink-0 text-xs">📄</span>
                <span>Superbill provided for insurance reimbursement</span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="rounded-2xl border border-[#E8E4DF] bg-white/88 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#8A9BA8] mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#3A4A57]">Reschedule and cancellation</p>
                <p className="text-sm text-[#5A6B7A] mt-1">
                  Cancel or reschedule free up to 24 hours before your visit. Late cancellations are charged 50% of the visit price, and no-shows are charged the full visit amount. If life changes suddenly, the same appointment record keeps your reminders, payment details, and next steps together.
                </p>
                <p className="mt-2 text-xs text-[#5A6B7A]">
                  After booking, you can make changes from appointment details without losing your reminder history or secure room link.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8E4DF] bg-[#6B9080]/10/70 p-4">
            <div className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 text-[#6B9080]" />
              <div>
                <p className="text-sm font-medium text-[#6B9080]">What happens next</p>
                <p className="mt-1 text-sm text-[#6B9080]">
                  After checkout, Aminy confirms the visit, sends your reminders, and keeps the video room link ready in the app and email. If you need reimbursement, your superbill is prepared after the session.
                </p>
                <p className="mt-2 text-xs text-[#6B9080]">
                  You will not be bounced between tools. Booking, reminders, room access, and follow-up stay in Aminy.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Telehealth Consent + Footer CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8E4DF] safe-area-bottom">
          <label className="flex items-start gap-3 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={telehealthConsent}
              onChange={e => setTelehealthConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#E8E4DF] text-[#6B9080] focus:ring-teal-500"
            />
            <span className="text-xs text-[#5A6B7A] leading-5">
              I consent to receive care via telehealth. I understand this session uses secure video, is not a substitute for emergency care, and that I should call 911 for emergencies. I have reviewed the{' '}
              <a href="/?screen=privacy-policy" className="text-[#6B9080] underline">Privacy Policy</a> and{' '}
              <a href="/?screen=terms-of-service" className="text-[#6B9080] underline">Terms of Service</a>.
            </span>
          </label>
          <button
            onClick={handleProceedToPayment}
            disabled={!telehealthConsent}
            className={`w-full rounded-2xl py-4 text-lg font-semibold transition-all active:scale-[0.98] ${
              telehealthConsent
                ? 'bg-primary text-white hover:bg-[#6B9080]'
                : 'bg-[#E8E4DF] text-[#8A9BA8] cursor-not-allowed'
            }`}
          >
            Continue to secure checkout
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Step 2: Payment
  // ============================================================================
  if (currentStep === 'payment') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),transparent_30%),linear-gradient(180deg,#f7fffd_0%,#f4f7f8_100%)]">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-[#E8E4DF]/80 bg-white/88 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/78">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentStep('confirm')}
              className="p-2 -ml-2 rounded-full hover:bg-[#F0EDE8] transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-[#3A4A57]" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#1B2733]">Secure checkout</h1>
              <p className="text-sm text-[#5A6B7A]">Finish booking in one calm step</p>
            </div>
          </div>
          <ProgressBreadcrumbs currentPhase="payment" />
        </header>

        {/* Content */}
        <div className="px-4 py-6 pb-32 space-y-3 sm:space-y-4">
          {/* Amount */}
          <div className="bg-white rounded-3xl border border-[#E8E4DF]/80 p-4 text-center shadow-sm">
            <p className="text-[#5A6B7A] mb-1">Amount due</p>
            <p className="text-4xl font-bold text-[#1B2733]">{formatPrice(pricing.totalCents)}</p>
          </div>

          {/* Stripe Checkout Info */}
          <div className="bg-white rounded-3xl border border-[#E8E4DF]/80 p-4 space-y-3 sm:space-y-4 shadow-sm">
            <h4 className="font-medium text-[#1B2733] flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Secure Payment
            </h4>

            <p className="text-sm text-[#5A6B7A]">
              You'll be redirected to Stripe's secure checkout to complete payment.
              Aminy brings you back with the confirmed appointment, reminders, and the secure room link already attached.
            </p>

            <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
              <div className="flex -space-x-1">
                <div className="w-8 h-5 bg-blue-600 rounded text-white text-[10px] flex items-center justify-center font-bold">VISA</div>
                <div className="w-8 h-5 bg-red-500 rounded text-white text-[10px] flex items-center justify-center font-bold">MC</div>
                <div className="w-8 h-5 bg-blue-400 rounded text-white text-[10px] flex items-center justify-center font-bold">AMEX</div>
              </div>
              <span>and more</span>
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 rounded-xl">
            <Lock className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-green-800">
                Secured by <span className="font-medium">Stripe</span>
              </p>
              <p className="text-xs text-green-600">Your payment details stay encrypted. Aminy stores the appointment record, not your full card.</p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-[#E8E4DF]/80 bg-white/92 p-4 safe-area-bottom backdrop-blur supports-[backdrop-filter]:bg-white/84">
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className={`w-full py-4 font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-2 ${
              isProcessing
                ? 'bg-slate-300 text-[#5A6B7A] cursor-not-allowed'
                : 'bg-primary text-white hover:bg-[#6B9080] active:scale-[0.98]'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Pay {formatPrice(pricing.totalCents)}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Step 3: Success
  // ============================================================================
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),transparent_30%),linear-gradient(180deg,#f7fffd_0%,#f4f7f8_100%)]">
      {/* Content */}
      <div className="px-4 py-12 pb-32">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1B2733] mb-2">Your visit is confirmed</h1>
          <p className="text-[#5A6B7A]">
            Confirmation and reminders are on the way to your email and inside Aminy.
          </p>
        </div>

        {/* Appointment Summary */}
        <div className="mb-4 bg-white rounded-3xl border border-[#E8E4DF]/80 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E8E4DF]">
            <div className="w-12 h-12 rounded-full bg-[#E8E4DF] overflow-hidden flex-shrink-0">
              {provider.avatarUrl ? (
                <img
                  src={provider.avatarUrl}
                  alt={`${provider.firstName} ${provider.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-600 to-[#466379] flex items-center justify-center text-white font-semibold">
                  {provider.firstName[0]}{provider.lastName[0]}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-[#1B2733]">
                {provider.firstName} {provider.lastName}, {provider.credentials}
              </p>
              <p className="text-sm text-[#5A6B7A]">{visitConfig.displayName}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-[#3A4A57]">
              <Calendar className="w-4 h-4 text-[#8A9BA8]" />
              {formatDate(slot.startTime)}
            </div>
            <div className="flex items-center gap-2 text-[#3A4A57]">
              <Clock className="w-4 h-4 text-[#8A9BA8]" />
              {formatTime(slot.startTime)}
            </div>
            <div className="flex items-center gap-2 text-[#3A4A57]">
              <Video className="w-4 h-4 text-[#8A9BA8]" />
              Secure Aminy video room
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E4DF] bg-[#6B9080]/10/70 p-4">
            <div className="flex items-start gap-3">
              <Video className="mt-0.5 h-5 w-5 text-[#6B9080]" />
              <div>
                <p className="text-sm font-medium text-[#6B9080]">Joining is simple</p>
                <p className="mt-1 text-sm text-[#6B9080]">
                  Aminy keeps the room link attached to this appointment and includes it in your reminder messages. The join button appears 15 minutes before start so you never need to hunt for it.
                </p>
                <p className="mt-2 text-xs text-[#6B9080]">
                  Open Aminy a few minutes early and use the same appointment card for reminders, room access, and follow-up.
                </p>
              </div>
            </div>
          </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="relative">
            <button
              onClick={() => setShowCalendarOptions(!showCalendarOptions)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#6B9080]/20 bg-white py-3 font-medium text-[#6B9080] transition-colors hover:bg-[#6B9080]/10"
            >
              <CalendarPlus className="w-5 h-5" />
              Add to Calendar
              <ChevronDown className={`w-4 h-4 transition-transform ${showCalendarOptions ? 'rotate-180' : ''}`} />
            </button>

            {/* Calendar Options Dropdown */}
            {showCalendarOptions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[#E8E4DF] shadow-lg overflow-hidden z-10">
                {CALENDAR_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handleAddToCalendar(option.type)}
                    className="w-full px-4 py-3 text-left hover:bg-[#FAF7F2] transition-colors flex items-center gap-3"
                  >
                    <span className="text-lg">{option.icon}</span>
                    <span className="text-[#1B2733]">{option.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => handleAddToCalendar('download')}
                  className="w-full px-4 py-3 text-left hover:bg-[#FAF7F2] transition-colors flex items-center gap-3 border-t border-[#E8E4DF]"
                >
                  <span className="text-lg">📥</span>
                  <span className="text-[#1B2733]">Download .ics file</span>
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#E8E4DF] bg-white px-4 py-3 text-left shadow-sm">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 text-[#5A6B7A]" />
              <div>
                <p className="text-sm font-medium text-[#1B2733]">Need to change something?</p>
                <p className="mt-1 text-sm text-[#5A6B7A]">
                  Reschedule or cancel free up to 24 hours before the visit. Late cancellations are charged 50% and no-shows are charged the full visit amount.
                </p>
                <p className="mt-2 text-xs text-[#5A6B7A]">
                  Payment context, policy details, refund status, and the next room link stay tied to the same appointment record.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Intake Prompt */}
        <div className="mt-4 sm:mt-6 p-4 bg-[#6B9080]/10 rounded-xl">
          <h4 className="font-medium text-[#6B9080] mb-1">Complete Quick Intake</h4>
          <p className="text-sm text-[#5A6B7A] mb-3">
            Help your provider prepare by answering a few questions (2 minutes).
          </p>
          <button className="text-sm font-medium text-[#6B9080] hover:underline flex items-center gap-1">
            Start Quick Intake
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Reminder Info */}
        <div className="mt-4 sm:mt-6 p-4 bg-[#FAF7F2] rounded-xl text-sm text-[#5A6B7A]">
          <p className="font-medium text-[#3A4A57] mb-2">We'll remind you:</p>
          <ul className="space-y-1">
            <li>• 24 hours before your visit</li>
            <li>• 1 hour before your visit</li>
            <li>• 15 minutes before (with join link)</li>
          </ul>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8E4DF] safe-area-bottom">
          <button
            onClick={handleDone}
            className="w-full py-4 bg-[#6B9080] text-white font-semibold text-lg rounded-xl hover:bg-[#466379] active:scale-[0.98] transition-all"
          >
            Open appointment details &amp; join info
          </button>
        </div>
      </div>
    );
  }

export default AppointmentConfirmationScreen;
