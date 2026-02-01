/**
 * Appointment Confirmation & Payment Flow
 *
 * Steps:
 * 1. Confirm appointment details
 * 2. Collect payment (Stripe)
 * 3. Show confirmation success
 */

import React, { useState } from 'react';
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
  calculateVisitPrice,
  validatePromoCode,
  formatPrice,
  VisitPriceType
} from '../../lib/stripe-service';
import { createAppointment } from '../../lib/telehealth-api';
import {
  scheduleAppointmentReminders,
  sendAppointmentConfirmationEmail
} from '../../lib/notification-system';
import {
  addToCalendar,
  CALENDAR_OPTIONS,
  CalendarType,
  createCalendarEventFromAppointment
} from '../../lib/calendar-service';

interface AppointmentConfirmationProps {
  provider: Provider;
  slot: TimeSlot;
  visitType: VisitType;
  intake: GetCareIntake;
  onBack: () => void;
  onComplete: (appointmentId: string) => void;
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
  const [promoError, setPromoError] = useState<string | null>(null);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);

  const visitConfig = VISIT_TYPES[visitType];

  // Calculate price with discounts
  // Check membership from intake data (intake contains user subscription info)
  const priceType: VisitPriceType = visitType === 'consult' ? 'consult' : 'extended';
  const isMember = intake?.userTier && intake.userTier !== 'free';
  const pricing = calculateVisitPrice(priceType, isMember, promoApplied || undefined);
  const price = pricing.total / 100; // Convert from cents to dollars

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

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;

    const result = validatePromoCode(promoCode);
    if (result.valid) {
      setPromoApplied(promoCode.toUpperCase());
      setPromoError(null);
    } else {
      setPromoError('Invalid promo code');
      setPromoApplied(null);
    }
  };

  const handleProceedToPayment = () => {
    setCurrentStep('payment');
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Get user data (in production, from auth context)
      const userId = localStorage.getItem('user-id') || 'user-temp';
      const userEmail = localStorage.getItem('user-email') || 'user@example.com';

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
        isMember: false, // TODO: Check actual membership status
        promoCode: promoApplied || undefined,
      });

      // Redirect to Stripe Checkout
      if (checkout.url) {
        window.location.href = checkout.url;
      } else {
        throw new Error('Failed to create payment session');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setCurrentStep('payment');
      alert(error?.message || 'Unable to process payment. Please try again.');
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
      <ChevronRight className="w-4 h-4 text-gray-300" aria-hidden="true" />
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </span>
        <span className="text-xs font-medium text-green-600 hidden sm:inline">Choose provider</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300" aria-hidden="true" />
      <div className="flex items-center gap-1.5">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
          currentPhase === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-[#577590] text-white'
        }`}>
          {currentPhase === 'success' ? <Check className="w-3 h-3" /> : '3'}
        </span>
        <span className={`text-xs font-medium ${
          currentPhase === 'success' ? 'text-green-600' : 'text-[#577590]'
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
              <h1 className="text-lg font-semibold text-gray-900">Confirm Appointment</h1>
              <p className="text-sm text-gray-500">Review your booking details</p>
            </div>
          </div>
          <ProgressBreadcrumbs currentPhase="confirm" />
        </header>

        {/* Content */}
        <div className="px-4 py-6 pb-32 space-y-3 sm:space-y-4">
          {/* Provider Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex gap-3 sm:gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {provider.avatarUrl ? (
                  <img
                    src={provider.avatarUrl}
                    alt={`${provider.firstName} ${provider.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#577590] to-[#466379] flex items-center justify-center text-white font-semibold">
                    {provider.firstName[0]}{provider.lastName[0]}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {provider.firstName} {provider.lastName}, {provider.credentials}
                </h3>
                <p className="text-sm text-gray-500">{provider.roleDisplayName}</p>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 sm:space-y-4">
            <h4 className="font-medium text-gray-900">Appointment Details</h4>

            <div className="space-y-3">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-900">{formatDate(slot.startTime)}</p>
                  <p className="text-sm text-gray-500">{formatTime(slot.startTime)}</p>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-900">{visitConfig.displayName}</p>
                  <p className="text-sm text-gray-500">{visitConfig.duration} minutes</p>
                </div>
              </div>

              {/* Visit Type */}
              <div className="flex items-start gap-3">
                <Video className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-900">Remote Visit</p>
                  <p className="text-sm text-gray-500">Over Zoom (link sent via email)</p>
                </div>
              </div>
            </div>

            {/* Visit Reason */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Reason for visit</p>
              <p className="text-gray-900">{intake.visitReason}</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700">{visitConfig.displayName}</span>
              <span className="text-gray-900">{formatPrice(pricing.subtotal)}</span>
            </div>

            {/* Show discounts */}
            {pricing.breakdown.map((line, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm text-green-600">
                <span>{line.split(':')[0]}</span>
                <span>{line.split(':')[1]}</span>
              </div>
            ))}

            {/* Promo Code Input */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Promo code"
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#577590]/20"
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={!promoCode.trim()}
                  className="px-4 py-2 text-sm font-medium text-[#577590] bg-[#577590]/10 rounded-lg hover:bg-[#577590]/20 disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="font-medium text-gray-900">Total</span>
              <div className="text-right">
                {pricing.discount > 0 && (
                  <span className="text-sm text-gray-400 line-through mr-2">
                    {formatPrice(pricing.subtotal)}
                  </span>
                )}
                <span className="text-xl font-bold text-gray-900">{formatPrice(pricing.total)}</span>
              </div>
            </div>
            {/* HSA/FSA and Superbill Info */}
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs">✓</span>
                <span className="font-medium">HSA/FSA eligible</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs">📄</span>
                <span>Superbill provided for insurance reimbursement</span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Cancellation Policy</p>
                <p className="text-sm text-gray-500 mt-1">
                  Free cancellation up to 24 hours before your appointment.
                  Cancellations within 24 hours may be charged a $25 fee.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-bottom">
          <button
            onClick={handleProceedToPayment}
            className="w-full py-4 bg-[#577590] text-white font-semibold text-lg rounded-xl hover:bg-[#466379] active:scale-[0.98] transition-all"
          >
            Continue to Payment
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
      <div className="min-h-screen bg-[#F5F5F5]">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentStep('confirm')}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Payment</h1>
              <p className="text-sm text-gray-500">Secure checkout</p>
            </div>
          </div>
          <ProgressBreadcrumbs currentPhase="payment" />
        </header>

        {/* Content */}
        <div className="px-4 py-6 pb-32 space-y-3 sm:space-y-4">
          {/* Amount */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-gray-500 mb-1">Amount due</p>
            <p className="text-4xl font-bold text-gray-900">${price}.00</p>
          </div>

          {/* Stripe Checkout Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 sm:space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Secure Payment
            </h4>

            <p className="text-sm text-gray-600">
              You'll be redirected to Stripe's secure checkout to complete your payment.
              We accept all major credit and debit cards.
            </p>

            <div className="flex items-center gap-2 text-sm text-gray-500">
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
              <p className="text-xs text-green-600">Your payment info is encrypted and secure</p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-bottom">
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className={`w-full py-4 font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-2 ${
              isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#577590] text-white hover:bg-[#466379] active:scale-[0.98]'
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
                Pay ${price}.00
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
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Content */}
      <div className="px-4 py-12 pb-32">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">You're booked!</h1>
          <p className="text-gray-600">
            Confirmation sent to your email
          </p>
        </div>

        {/* Appointment Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {provider.avatarUrl ? (
                <img
                  src={provider.avatarUrl}
                  alt={`${provider.firstName} ${provider.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#577590] to-[#466379] flex items-center justify-center text-white font-semibold">
                  {provider.firstName[0]}{provider.lastName[0]}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {provider.firstName} {provider.lastName}, {provider.credentials}
              </p>
              <p className="text-sm text-gray-500">{visitConfig.displayName}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400" />
              {formatDate(slot.startTime)}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-gray-400" />
              {formatTime(slot.startTime)}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Video className="w-4 h-4 text-gray-400" />
              Remote visit over Zoom
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="relative">
            <button
              onClick={() => setShowCalendarOptions(!showCalendarOptions)}
              className="w-full py-3 bg-white border-2 border-[#577590] text-[#577590] font-medium rounded-xl hover:bg-[#577590]/5 transition-colors flex items-center justify-center gap-2"
            >
              <CalendarPlus className="w-5 h-5" />
              Add to Calendar
              <ChevronDown className={`w-4 h-4 transition-transform ${showCalendarOptions ? 'rotate-180' : ''}`} />
            </button>

            {/* Calendar Options Dropdown */}
            {showCalendarOptions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-10">
                {CALENDAR_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handleAddToCalendar(option.type)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <span className="text-lg">{option.icon}</span>
                    <span className="text-gray-900">{option.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => handleAddToCalendar('download')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-t border-gray-100"
                >
                  <span className="text-lg">📥</span>
                  <span className="text-gray-900">Download .ics file</span>
                </button>
              </div>
            )}
          </div>

          <button
            className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Message Your Care Team
          </button>
        </div>

        {/* Quick Intake Prompt */}
        <div className="mt-4 sm:mt-6 p-4 bg-[#577590]/10 rounded-xl">
          <h4 className="font-medium text-[#577590] mb-1">Complete Quick Intake</h4>
          <p className="text-sm text-gray-600 mb-3">
            Help your provider prepare by answering a few questions (2 minutes).
          </p>
          <button className="text-sm font-medium text-[#577590] hover:underline flex items-center gap-1">
            Start Quick Intake
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Reminder Info */}
        <div className="mt-4 sm:mt-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
          <p className="font-medium text-gray-700 mb-2">We'll remind you:</p>
          <ul className="space-y-1">
            <li>• 24 hours before your visit</li>
            <li>• 1 hour before your visit</li>
            <li>• 15 minutes before (with join link)</li>
          </ul>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-bottom">
        <button
          onClick={handleDone}
          className="w-full py-4 bg-[#577590] text-white font-semibold text-lg rounded-xl hover:bg-[#466379] active:scale-[0.98] transition-all"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default AppointmentConfirmationScreen;
