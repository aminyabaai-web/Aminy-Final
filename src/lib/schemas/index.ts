/**
 * Barrel re-export for all Aminy validation schemas.
 *
 * Usage:
 *   import { loginSchema, type LoginInput } from '@/lib/schemas';
 */

// Common / shared validators
export {
  uuidSchema,
  usPhoneSchema,
  usStateSchema,
  isoDateSchema,
  futureDateSchema,
  pastDateSchema,
  npiSchema,
  emailSchema,
  type UUID,
  type USPhone,
  type USStateCode,
  type ISODate,
  type FutureDate,
  type PastDate,
} from "./common";

// Authentication
export {
  loginSchema,
  createAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type CreateAccountInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "./auth";

// Child / family onboarding
export {
  therapyTypeEnum,
  relationshipEnum,
  childProfileSchema,
  familySetupSchema,
  type TherapyType,
  type Relationship,
  type ChildProfileInput,
  type FamilySetupInput,
} from "./onboarding";

// Clinical forms
export {
  sessionTypeEnum,
  promptLevelEnum,
  incidentLogSchema,
  goalTrialSchema,
  sessionNoteSchema,
  treatmentGoalSchema,
  type SessionType,
  type PromptLevel,
  type IncidentLogInput,
  type GoalTrialInput,
  type SessionNoteInput,
  type TreatmentGoalInput,
} from "./clinical";

// Appointment booking
export {
  visitTypeEnum,
  visitFormatEnum,
  visitForWhomEnum,
  bookingSchema,
  type VisitType,
  type VisitFormat,
  type VisitForWhom,
  type BookingInput,
} from "./booking";

// Provider application & credentialing
export {
  providerTypeEnum,
  payerTypeEnum,
  providerApplicationSchema,
  credentialingSchema,
  type ProviderType,
  type PayerType,
  type ProviderApplicationInput,
  type CredentialingInput,
} from "./provider";

// CentralReach integration (bidirectional ABA practice management)
export {
  crSessionTypeEnum,
  crPromptLevelEnum,
  crMeasurementMethodEnum,
  crGoalDomainEnum,
  crGoalPhaseEnum,
  crSessionStatusEnum,
  crGoalStatusEnum,
  crHomeProgramStatusEnum,
  crAuthStatusEnum,
  crWebhookEventEnum,
  crRoutineTypeEnum,
  crInsuranceSchema,
  crClientSchema,
  crGoalDataSchema,
  crSessionSchema,
  crGoalSchema,
  crActivitySchema,
  crHomeProgramSchema,
  crBehaviorLogPayloadSchema,
  crBillingDocumentationSchema,
  crRoutineCompletionPayloadSchema,
  crJuniorSessionPayloadSchema,
  crCaregiverWellnessPayloadSchema,
  crActivityCompletionSchema,
  crHomeProgramProgressPayloadSchema,
  crWebhookPayloadSchema,
  crApiResponseSchema,
  crApiErrorSchema,
  type CRSessionTypeEnum,
  type CRPromptLevelEnum,
  type CRMeasurementMethodEnum,
  type CRGoalDomainEnum,
  type CRGoalPhaseEnum,
  type CRSessionStatusEnum,
  type CRGoalStatusEnum,
  type CRHomeProgramStatusEnum,
  type CRAuthStatusEnum,
  type CRWebhookEventEnum,
  type CRRoutineTypeEnum,
  type CRInsuranceInput,
  type CRClientInput,
  type CRGoalDataInput,
  type CRSessionInput,
  type CRGoalInput,
  type CRActivityInput,
  type CRHomeProgramInput,
  type CRBehaviorLogPayloadInput,
  type CRBillingDocumentationInput,
  type CRRoutineCompletionPayloadInput,
  type CRJuniorSessionPayloadInput,
  type CRCaregiverWellnessPayloadInput,
  type CRActivityCompletionInput,
  type CRHomeProgramProgressPayloadInput,
  type CRWebhookPayloadInput,
  type CRApiErrorInput,
} from "./centralreach";

// Credentialing engine (provider-payer enrollment & document management)
export {
  credentialingStatusEnum,
  credentialingPayerTypeEnum,
  credentialingProviderTypeEnum,
  documentTypeEnum,
  documentStatusEnum,
  credentialingEventTypeEnum,
  credentialingDocumentSchema,
  credentialingEventSchema,
  credentialingApplicationSchema,
  startEnrollmentSchema,
  documentUploadSchema,
  caqhLookupSchema,
  payerSearchSchema,
  renewalInitiationSchema,
  credentialingReportSchema,
  stateLicensureQuerySchema,
  type CredentialingStatusEnum,
  type CredentialingPayerTypeEnum,
  type CredentialingProviderTypeEnum,
  type DocumentTypeEnum,
  type DocumentStatusEnum,
  type CredentialingEventTypeEnum,
  type CredentialingDocumentInput,
  type CredentialingEventInput,
  type CredentialingApplicationInput,
  type StartEnrollmentInput,
  type DocumentUploadInput,
  type CAQHLookupInput,
  type PayerSearchInput,
  type RenewalInitiationInput,
  type CredentialingReportInput,
  type StateLicensureQueryInput,
} from "./credentialing";
