// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Telehealth Components - One Medical-style Get Care Experience
 *
 * This module provides a complete telehealth booking flow including:
 * - Browse Top Concerns (topic grid)
 * - Get Care Intake (mini questionnaire)
 * - Book Visit (provider cards + time slots)
 * - Appointment Confirmation + Payment
 * - Care Plan (visit summaries + action items)
 * - Provider Portal (availability management)
 */

// Main flow container
export { TelehealthFlow } from './TelehealthFlow';
export { TelehealthHome } from './TelehealthHome';

// Individual screens
export { BrowseTopConcerns } from './BrowseTopConcerns';
export { GetCareIntakeScreen } from './GetCareIntake';
export { BookVisitScreen } from './BookVisit';
export { AppointmentConfirmationScreen } from './AppointmentConfirmation';
export { CarePlanTabScreen } from './CarePlanTab';
export { VisitSummaryDetailScreen } from './VisitSummaryDetail';
export { ProviderPortalNew } from './ProviderPortalNew';
export { TelehealthPreferences } from './TelehealthPreferences';
export { VideoRoom } from './VideoRoom';
export { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
export { PostSessionNotes } from './PostSessionNotes';

// New components (scorecard push to 9+)
export { RecordingPlayback } from './RecordingPlayback';
export { SessionScheduler } from './SessionScheduler';
export { ParticipantManager } from './ParticipantManager';
export type { CallParticipant, ParticipantRole } from './ParticipantManager';

// Q&A Sessions & Playbooks
export { QASessionsHub } from './QASessionsHub';
export { PlaybooksLibrary } from './PlaybooksLibrary';

// Re-export types for convenience
export type {
  Concern,
  ConcernCategory,
  Provider,
  ProviderRole,
  ProviderOrganization,
  AvailabilityBlock,
  TimeOffBlock,
  TimeSlot,
  VisitType,
  VisitFormat,
  Appointment,
  AppointmentStatus,
  VisitSummary,
  ActionItem,
  GetCareIntake,
  BookingState,
  WaitlistEntry,
  TelehealthAnalyticsEvent,
  TelehealthAnalyticsPayload
} from '../../types/telehealth';

// Re-export constants
export {
  DEFAULT_CONCERNS,
  CONCERN_CATEGORIES,
  VISIT_TYPES,
  PROVIDER_ROLE_DISPLAY,
  US_STATES,
  MOCK_PROVIDERS
} from '../../types/telehealth';

// Re-export availability engine
export {
  generateSlots,
  holdSlot,
  releaseHold,
  confirmSlot,
  getSlotsForDate,
  groupSlotsByProvider,
  formatSlotTime,
  formatSlotDate,
  isSlotSoon,
  getNextAvailableSlot,
  checkTelehealthAvailability72Hours,
  formatAvailabilityStatus
} from '../../lib/availability-engine';

// Re-export types for 72-hour check
export type { TelehealthAvailabilityCheck } from '../../lib/availability-engine';

// Re-export telehealth API
export {
  telehealthApi,
  createAppointment,
  getAppointment,
  getUserAppointments,
  getUpcomingAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getProviders,
  getProviderSlots,
  holdSlotForCheckout,
  releaseSlotHold,
  getVisitSummaries,
  getActionItems,
  toggleActionItem,
  joinWaitlist
} from '../../lib/telehealth-api';

// Re-export video service
export {
  createVideoRoom,
  getMeetingToken,
  joinTelehealthSession,
  endTelehealthSession,
  toggleAudio,
  toggleVideo,
  startScreenShare,
  stopScreenShare,
  leaveCall
} from '../../lib/daily-video';

// Re-export connection quality + auto-reconnect hooks
export { useConnectionQuality } from '../../hooks/useConnectionQuality';
export type { ConnectionQuality, NetworkStats, ConnectionQualityResult } from '../../hooks/useConnectionQuality';
export { useAutoReconnect } from '../../hooks/useAutoReconnect';
export type { ReconnectState, AutoReconnectConfig, AutoReconnectResult } from '../../hooks/useAutoReconnect';

// Re-export recording storage service
export {
  logRecordingConsent,
  hasAllConsents,
  createRecordingMetadata,
  updateRecordingMetadata,
  getRecordingForSession,
  uploadRecordingToStorage,
  transferDailyRecordingToStorage,
  getRecordingPlaybackUrl,
} from '../../lib/recording-storage';
export type { RecordingConsent, RecordingMetadata } from '../../lib/recording-storage';

// Re-export calendar service
export {
  addToCalendar,
  downloadICSFile,
  CALENDAR_OPTIONS
} from '../../lib/calendar-service';

// Re-export Stripe service (visit payments)
export {
  createVisitPayment,
  calculateVisitPrice,
  validatePromoCode,
  formatPrice,
  VISIT_PRICES
} from '../../lib/stripe-service';
export type { CareRail, AppointmentFinancials, ProviderSettlement, PartnerInvoice } from '../../lib/telehealth-economics';

// Re-export Referral Packet generator
export {
  generateReferralPacketPDF,
  downloadReferralPacketPDF,
  getReferralPacketBlob,
  createSamplePacketData
} from '../../lib/referral-packet-generator';

export type { ReferralPacketData } from '../../lib/referral-packet-generator';

// Re-export session scheduler service
export {
  bookSession,
  getUpcomingSessions,
  cancelSession,
  sendReminder,
  getProviderAvailability,
  VISIT_TYPE_LABELS,
  VISIT_TYPE_DURATIONS,
} from '../../lib/session-scheduler';
export type {
  ScheduledSession,
  ProviderTimeSlot,
  BookSessionParams,
  SessionStatus,
} from '../../lib/session-scheduler';
export type { VisitType as SchedulerVisitType } from '../../lib/session-scheduler';

// Re-export care plan updater service
export {
  extractActionItems,
  updateCarePlan,
  generateHomeProgram,
  processSessionNotesForCarePlan,
} from '../../lib/care-plan-updater';
export type {
  PostSessionNotes as PostSessionNotesData,
  ExtractedActionItem,
  HomeProgramItem,
  HomeProgram,
} from '../../lib/care-plan-updater';
