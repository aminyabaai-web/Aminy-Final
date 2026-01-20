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

import React, { useState, useCallback } from 'react';
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
  | 'browse-concerns'
  | 'get-care'
  | 'book-visit'
  | 'confirm'
  | 'care-plan'
  | 'summary-detail';

interface TelehealthFlowProps {
  initialStep?: TelehealthStep;
  onClose: () => void;
  defaultState?: string;
  // Analytics callback
  onAnalytics?: (event: string, data?: Record<string, any>) => void;
}

export function TelehealthFlow({
  initialStep = 'browse-concerns',
  onClose,
  defaultState,
  onAnalytics
}: TelehealthFlowProps) {
  // Flow state
  const [currentStep, setCurrentStep] = useState<TelehealthStep>(initialStep);
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

  // =========================================================================
  // Navigation handlers
  // =========================================================================

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
      visitFormat: intake.visitFormat
    });
    setCurrentStep('book-visit');
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
    alert('Added to waitlist! We\'ll notify you when appointments become available.');
  };

  // 72-Hour Fallback Handlers
  const handleRequestLocalCare = () => {
    trackEvent('local_care_requested', { userState: defaultState });
    // In production, navigate to Find Care screen or show modal
    alert('Local care support requested. We\'ll help you find providers in your area.');
  };

  const handleStartHomeProgram = () => {
    trackEvent('home_program_started', { userState: defaultState });
    // In production, navigate to Home Program onboarding
    alert('Welcome to Aminy Home Program! We\'ll support you at home while you wait for telehealth.');
  };

  const handleExportReferralPacket = () => {
    trackEvent('referral_packet_exported', { userState: defaultState });
    // In production, trigger PDF generation and download
    alert('Referral packet downloaded! Share this with local providers to help them understand your needs.');
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

  const handleBack = () => {
    switch (currentStep) {
      case 'get-care':
        if (selectedConcern) {
          setCurrentStep('browse-concerns');
        } else {
          onClose();
        }
        break;
      case 'book-visit':
        setCurrentStep('get-care');
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
    case 'browse-concerns':
      return (
        <BrowseTopConcerns
          onBack={onClose}
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

    case 'book-visit':
      if (!booking.intake) {
        setCurrentStep('get-care');
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
      if (!selectedProvider || !selectedSlot || !booking.intake) {
        setCurrentStep('book-visit');
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
