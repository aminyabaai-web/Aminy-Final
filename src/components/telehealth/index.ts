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

// Re-export Referral Packet generator
export {
  generateReferralPacketPDF,
  downloadReferralPacketPDF,
  getReferralPacketBlob,
  createSamplePacketData
} from '../../lib/referral-packet-generator';

export type { ReferralPacketData } from '../../lib/referral-packet-generator';
