/**
 * Telehealth Flow Container
 * Orchestrates the complete Get Care booking flow
 *
 * Flow:
 * 1. Home/Entry → Browse Concerns OR Get Care
 * 2. Browse Concerns → Get Care (with concern pre-selected)
 * 3. Get Care → Book Visit (with intake data)
 * 4. Book Visit → Appointment Confirmation
 * 5. Appointment Confirmation → Success → Care Plan
 */

import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Shield, Clock, Zap, Heart, ChevronRight, CheckCircle } from 'lucide-react';
import {
  Concern,
  Provider,
  TimeSlot,
  VisitType,
  GetCareIntake,
  BookingState,
  MOCK_PROVIDERS
} from '../../types/telehealth';

import { BrowseTopConcerns } from './BrowseTopConcerns';
import { GetCareIntakeScreen } from './GetCareIntake';
import { BookVisitScreen } from './BookVisit';
import { AppointmentConfirmationScreen } from './AppointmentConfirmation';
import { CarePlanTabScreen } from './CarePlanTab';
import { VisitSummaryDetailScreen } from './VisitSummaryDetail';

// Flow steps
type TelehealthStep =
  | 'choose-path'
  | 'browse-concerns'
  | 'get-care'
  | 'verify-insurance'
  | 'book-visit'
  | 'confirm'
  | 'care-plan'
  | 'summary-detail';

type BookingPath = 'quick-consult' | 'start-services' | null;

interface TelehealthFlowProps {
  initialStep?: TelehealthStep;
  onClose: () => void;
  defaultState?: string;
  // Analytics callback
  onAnalytics?: (event: string, data?: Record<string, any>) => void;
}

export function TelehealthFlow({
  initialStep = 'choose-path',
  onClose,
  defaultState,
  onAnalytics
}: TelehealthFlowProps) {
  // Flow state
  const [currentStep, setCurrentStep] = useState<TelehealthStep>(initialStep);
  const [bookingPath, setBookingPath] = useState<BookingPath>(null);
  const [booking, setBooking] = useState<BookingState>({});
  const [selectedConcern, setSelectedConcern] = useState<Concern | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedVisitType, setSelectedVisitType] = useState<VisitType>('consult');
  const [viewingSummaryId, setViewingSummaryId] = useState<string | null>(null);

  // Track analytics
  const trackEvent = useCallback((event: string, data?: Record<string, any>) => {
    onAnalytics?.(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }, [onAnalytics]);

  // Validate current step and redirect if missing required data
  useEffect(() => {
    if (currentStep === 'verify-insurance' && !booking.intake) {
      setCurrentStep('get-care');
    } else if (currentStep === 'book-visit' && !booking.intake) {
      setCurrentStep('get-care');
    } else if (currentStep === 'confirm' && (!selectedProvider || !selectedSlot || !booking.intake)) {
      setCurrentStep('book-visit');
    }
  }, [currentStep, booking.intake, selectedProvider, selectedSlot]);

  // =========================================================================
  // Navigation handlers
  // =========================================================================

  // Path selection handlers
  const handleChooseQuickConsult = () => {
    setBookingPath('quick-consult');
    trackEvent('booking_path_selected', { path: 'quick-consult' });
    setCurrentStep('browse-concerns');
  };

  const handleChooseStartServices = () => {
    setBookingPath('start-services');
    trackEvent('booking_path_selected', { path: 'start-services' });
    setCurrentStep('browse-concerns');
  };

  const handleSelectConcern = (concern: Concern) => {
    setSelectedConcern(concern);
    trackEvent('concern_selected', { concernId: concern.id, concernName: concern.name });
    setCurrentStep('get-care');
  };

  const handleIntakeSubmit = (intake: GetCareIntake) => {
    setBooking(prev => ({ ...prev, intake }));
    trackEvent('get_care_submitted', {
      visitReason: intake.visitReason,
      userState: intake.userState,
      visitFormat: intake.visitFormat,
      bookingPath,
    });
    // Start Services path goes through insurance verification first
    if (bookingPath === 'start-services') {
      setCurrentStep('verify-insurance');
    } else {
      setCurrentStep('book-visit');
    }
  };

  const handleSelectSlot = (provider: Provider, slot: TimeSlot, visitType: VisitType) => {
    setSelectedProvider(provider);
    setSelectedSlot(slot);
    setSelectedVisitType(visitType);
    setBooking(prev => ({
      ...prev,
      selectedProviderId: provider.id,
      selectedSlotId: slot.id,
      selectedSlot: slot
    }));
    trackEvent('slot_selected', {
      providerId: provider.id,
      slotTime: slot.startTime,
      visitType
    });
    setCurrentStep('confirm');
  };

  const handleJoinWaitlist = (provider?: Provider) => {
    trackEvent('waitlist_joined', { providerId: provider?.id });
    // In production, show waitlist modal or redirect
    toast.success('Added to waitlist!', {
      description: 'We\'ll notify you when appointments become available.',
    });
  };

  // 72-Hour Fallback Handlers
  const handleRequestLocalCare = () => {
    trackEvent('local_care_requested', { userState: defaultState });
    // In production, navigate to Find Care screen or show modal
    toast.success('Local care support requested', {
      description: 'We\'ll help you find providers in your area.',
    });
  };

  const handleStartHomeProgram = () => {
    trackEvent('home_program_started', { userState: defaultState });
    // In production, navigate to Home Program onboarding
    toast.success('Welcome to Aminy Home Program!', {
      description: 'We\'ll support you at home while you wait for telehealth.',
    });
  };

  const handleExportReferralPacket = () => {
    trackEvent('referral_packet_exported', { userState: defaultState });
    // In production, trigger PDF generation and download
    toast.success('Referral packet downloaded!', {
      description: 'Share this with local providers to help them understand your needs.',
    });
  };

  const handleAppointmentComplete = (appointmentId: string) => {
    setBooking(prev => ({ ...prev, appointmentId }));
    trackEvent('appointment_confirmed', { appointmentId });
    setCurrentStep('care-plan');
  };

  const handleBookFollowUp = () => {
    // Reset booking state and start fresh
    setBooking({});
    setSelectedConcern(null);
    setSelectedProvider(null);
    setSelectedSlot(null);
    setCurrentStep('browse-concerns');
  };

  const handleViewSummary = (summaryId: string) => {
    setViewingSummaryId(summaryId);
    setCurrentStep('summary-detail');
  };

  // Insurance verification complete handler
  const handleInsuranceVerified = () => {
    trackEvent('insurance_verified', { bookingPath });
    setCurrentStep('book-visit');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'choose-path':
        onClose();
        break;
      case 'browse-concerns':
        setCurrentStep('choose-path');
        break;
      case 'get-care':
        if (selectedConcern) {
          setCurrentStep('browse-concerns');
        } else {
          setCurrentStep('choose-path');
        }
        break;
      case 'verify-insurance':
        setCurrentStep('get-care');
        break;
      case 'book-visit':
        if (bookingPath === 'start-services') {
          setCurrentStep('verify-insurance');
        } else {
          setCurrentStep('get-care');
        }
        break;
      case 'confirm':
        setCurrentStep('book-visit');
        break;
      case 'care-plan':
        onClose();
        break;
      case 'summary-detail':
        setCurrentStep('care-plan');
        break;
      default:
        onClose();
    }
  };

  // =========================================================================
  // Render current step
  // =========================================================================

  switch (currentStep) {
    case 'choose-path':
      return (
        <div className="min-h-screen bg-[#F5F5F5]">
          <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Get Care</h1>
                <p className="text-xs text-gray-500">Choose how you'd like to get started</p>
              </div>
            </div>
          </header>
          <div className="p-4 space-y-4 max-w-lg mx-auto">
            {/* Quick Consult Card */}
            <button onClick={handleChooseQuickConsult} className="w-full text-left">
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900">Quick Consult</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Cash Pay</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Book a session right away — no insurance needed. Perfect for one-time questions or ongoing self-pay.
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Book as soon as today</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>$50–$175 per session · Save up to 20% with bundles</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Any provider, any specialty</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                </div>
              </div>
            </button>

            {/* Start Services Card */}
            <button onClick={handleChooseStartServices} className="w-full text-left">
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 hover:border-emerald-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900">Start Services</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Insurance</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Use your insurance for ongoing therapy. We'll verify coverage, match you with in-network providers, and handle the paperwork.
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Insurance eligibility verified before booking</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Matched with in-network providers</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Intake auto-generated from your Aminy profile</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                </div>
              </div>
            </button>

            {/* Nudge for cash-pay users */}
            <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <span className="font-medium">Not sure?</span> Start with a Quick Consult — you can always add insurance later. We'll even check if your plan covers the services you need.
              </p>
            </div>
          </div>
        </div>
      );

    case 'browse-concerns':
      return (
        <BrowseTopConcerns
          onBack={handleBack}
          onSelectConcern={handleSelectConcern}
          userState={defaultState}
        />
      );

    case 'get-care':
      return (
        <GetCareIntakeScreen
          onBack={handleBack}
          onSubmit={handleIntakeSubmit}
          preselectedConcern={selectedConcern || undefined}
          defaultState={defaultState}
        />
      );

    case 'verify-insurance':
      return (
        <div className="min-h-screen bg-[#F5F5F5]">
          <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Verify Insurance</h1>
                <p className="text-xs text-gray-500">We'll check your coverage before matching providers</p>
              </div>
            </div>
          </header>
          <div className="p-4 max-w-lg mx-auto space-y-4">
            <div className="bg-white rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Insurance Eligibility Check</h3>
                  <p className="text-xs text-gray-500">Takes about 30 seconds</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                We'll verify your insurance covers the services you need and find in-network providers. Your intake paperwork will be auto-generated from your Aminy profile.
              </p>
              <div className="space-y-2">
                {['Coverage verified in real-time', 'In-network providers highlighted', 'Prior authorization tracked', 'Intake auto-populated'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleInsuranceVerified}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
              >
                Verify My Insurance
              </button>
              <button
                onClick={() => {
                  setBookingPath('quick-consult');
                  trackEvent('switched_to_cash_pay', { fromStep: 'verify-insurance' });
                  setCurrentStep('book-visit');
                }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip — I'll pay out of pocket
              </button>
            </div>
          </div>
        </div>
      );

    case 'book-visit':
      // If intake is missing, useEffect will redirect - show nothing while redirecting
      if (!booking.intake) {
        return null;
      }
      return (
        <BookVisitScreen
          onBack={handleBack}
          onSelectSlot={handleSelectSlot}
          onJoinWaitlist={handleJoinWaitlist}
          onRequestLocalCare={handleRequestLocalCare}
          onStartHomeProgram={handleStartHomeProgram}
          onExportReferralPacket={handleExportReferralPacket}
          intake={booking.intake}
        />
      );

    case 'confirm':
      // If required data is missing, useEffect will redirect - show nothing while redirecting
      if (!selectedProvider || !selectedSlot || !booking.intake) {
        return null;
      }
      return (
        <AppointmentConfirmationScreen
          provider={selectedProvider}
          slot={selectedSlot}
          visitType={selectedVisitType}
          intake={booking.intake}
          onBack={handleBack}
          onComplete={handleAppointmentComplete}
        />
      );

    case 'care-plan':
      return (
        <CarePlanTabScreen
          onBack={onClose}
          onBookFollowUp={handleBookFollowUp}
          onViewSummary={handleViewSummary}
        />
      );

    case 'summary-detail':
      // Mock summary data - in production, fetch from API
      const mockSummary = {
        id: viewingSummaryId || 'vs-1',
        appointmentId: 'apt-1',
        providerId: 'provider-1',
        userId: 'user-1',
        reasonForVisit: 'Meltdowns during transitions',
        whatWeDiscussed: [
          'Identified triggers: sudden changes and sensory overwhelm',
          'Current routine review showed gaps in visual supports',
          'Discussed proactive strategies vs reactive responses'
        ],
        planForNext7Days: [
          'Create a visual schedule for morning routine',
          'Give 5-minute and 2-minute warnings before transitions',
          'Practice "First-Then" language during calm moments'
        ],
        whatToTrack: [
          'Number of meltdowns per day',
          'Successful transitions (count)'
        ],
        followUpRecommendation: 'Check-in in 2 weeks',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return (
        <VisitSummaryDetailScreen
          summary={mockSummary}
          provider={MOCK_PROVIDERS[0]}
          onBack={handleBack}
          onBookFollowUp={handleBookFollowUp}
          onShare={() => trackEvent('visit_summary_shared', { summaryId: viewingSummaryId })}
          onExport={() => trackEvent('visit_summary_exported', { summaryId: viewingSummaryId })}
        />
      );

    default:
      return null;
  }
}

export default TelehealthFlow;
