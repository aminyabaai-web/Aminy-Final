/**
 * CentralReach Zod validation schemas.
 *
 * Validates ALL data flowing in (CentralReach -> Aminy) and out (Aminy -> CentralReach)
 * of the bidirectional integration. Every API response and push payload is validated
 * before use to catch schema drift, malformed data, and injection attempts.
 */
import { z } from "zod";
import { uuidSchema, isoDateSchema } from "./common";

// ---------------------------------------------------------------------------
// Shared enums & atoms
// ---------------------------------------------------------------------------

export const crSessionTypeEnum = z.enum(
  [
    "direct_therapy",
    "supervision",
    "parent_training",
    "assessment",
    "group_therapy",
    "telehealth",
    "consultation",
  ],
  { message: "Invalid CentralReach session type" },
);
export type CRSessionTypeEnum = z.infer<typeof crSessionTypeEnum>;

export const crPromptLevelEnum = z.enum(
  [
    "independent",
    "gestural",
    "verbal",
    "model",
    "partial_physical",
    "full_physical",
  ],
  { message: "Invalid prompt level" },
);
export type CRPromptLevelEnum = z.infer<typeof crPromptLevelEnum>;

export const crMeasurementMethodEnum = z.enum(
  [
    "trial_by_trial",
    "frequency",
    "duration",
    "latency",
    "interval_recording",
    "permanent_product",
  ],
  { message: "Invalid measurement method" },
);
export type CRMeasurementMethodEnum = z.infer<typeof crMeasurementMethodEnum>;

export const crGoalDomainEnum = z.enum(
  [
    "communication",
    "social_skills",
    "daily_living",
    "behavior_reduction",
    "academic",
    "motor_skills",
    "play_leisure",
    "self_management",
  ],
  { message: "Invalid goal domain" },
);
export type CRGoalDomainEnum = z.infer<typeof crGoalDomainEnum>;

export const crGoalPhaseEnum = z.enum(
  ["baseline", "acquisition", "mastery", "maintenance", "generalization"],
  { message: "Invalid goal phase" },
);
export type CRGoalPhaseEnum = z.infer<typeof crGoalPhaseEnum>;

export const crSessionStatusEnum = z.enum(
  ["scheduled", "in_progress", "completed", "cancelled", "no_show"],
  { message: "Invalid session status" },
);
export type CRSessionStatusEnum = z.infer<typeof crSessionStatusEnum>;

export const crGoalStatusEnum = z.enum(
  ["active", "mastered", "on_hold", "discontinued"],
  { message: "Invalid goal status" },
);
export type CRGoalStatusEnum = z.infer<typeof crGoalStatusEnum>;

export const crHomeProgramStatusEnum = z.enum(
  ["assigned", "in_progress", "completed", "overdue"],
  { message: "Invalid home program status" },
);
export type CRHomeProgramStatusEnum = z.infer<typeof crHomeProgramStatusEnum>;

export const crAuthStatusEnum = z.enum(
  ["active", "expired", "pending", "denied"],
  { message: "Invalid authorization status" },
);
export type CRAuthStatusEnum = z.infer<typeof crAuthStatusEnum>;

export const crWebhookEventEnum = z.enum(
  [
    "session_completed",
    "goal_updated",
    "authorization_changed",
    "home_program_assigned",
    "client_updated",
    "session_cancelled",
    "note_signed",
  ],
  { message: "Invalid webhook event type" },
);
export type CRWebhookEventEnum = z.infer<typeof crWebhookEventEnum>;

export const crRoutineTypeEnum = z.enum(
  ["morning", "afternoon", "evening", "bedtime", "mealtime", "custom"],
  { message: "Invalid routine type" },
);
export type CRRoutineTypeEnum = z.infer<typeof crRoutineTypeEnum>;

/** Time string HH:MM (24-hour) */
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "Must be a valid time in HH:MM format (24-hour)",
  })
  .describe("Time string (HH:MM, 24-hour)");

/** Percentage 0-100 */
const percentageSchema = z
  .number()
  .min(0, { message: "Cannot be below 0" })
  .max(100, { message: "Cannot exceed 100" });

/** Positive integer */
const positiveIntSchema = z
  .number()
  .int({ message: "Must be a whole number" })
  .min(0, { message: "Cannot be negative" });

/** CPT billing code (4-5 chars) */
const billingCodeSchema = z
  .string()
  .regex(/^[0-9A-Z]{4,5}$/, {
    message: "Must be a valid CPT/HCPCS billing code",
  })
  .describe("CPT or HCPCS billing code");

// ---------------------------------------------------------------------------
// Pull Schemas (CentralReach -> Aminy)
// ---------------------------------------------------------------------------

/** Insurance / authorization info from CentralReach */
export const crInsuranceSchema = z.object({
  payerId: z.string().min(1, { message: "Payer ID is required" }),
  payerName: z.string().min(1, { message: "Payer name is required" }),
  memberId: z.string().min(1, { message: "Member ID is required" }),
  groupNumber: z.string(),
  authorizationNumber: z.string(),
  authUnitsRemaining: positiveIntSchema.describe("Authorized units remaining"),
  authUnitsUsed: positiveIntSchema.describe("Authorized units used"),
  authStartDate: isoDateSchema.describe("Authorization start date"),
  authEndDate: isoDateSchema.describe("Authorization end date"),
  authStatus: crAuthStatusEnum.describe("Authorization status"),
});
export type CRInsuranceInput = z.infer<typeof crInsuranceSchema>;

/** Client record from CentralReach */
export const crClientSchema = z.object({
  id: z.string().min(1, { message: "Client ID is required" }),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  dateOfBirth: isoDateSchema.describe("Date of birth"),
  diagnosis: z.array(z.string()).describe("ICD-10 diagnosis codes"),
  insuranceInfo: crInsuranceSchema,
  status: z.enum(["active", "inactive", "discharged"]),
  primaryProviderId: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CRClientInput = z.infer<typeof crClientSchema>;

/** Goal data recorded during a session */
export const crGoalDataSchema = z.object({
  goalId: z.string().min(1, { message: "Goal ID is required" }),
  trials: positiveIntSchema.describe("Total trials conducted"),
  successes: positiveIntSchema.describe("Successful trials"),
  accuracy: percentageSchema.describe("Trial accuracy (0-100)"),
  promptLevel: crPromptLevelEnum.describe("Prompt level used"),
  notes: z.string().describe("Goal-specific notes"),
  phase: crGoalPhaseEnum.describe("Current goal phase"),
});
export type CRGoalDataInput = z.infer<typeof crGoalDataSchema>;

/** Session record from CentralReach */
export const crSessionSchema = z.object({
  id: z.string().min(1, { message: "Session ID is required" }),
  clientId: z.string().min(1, { message: "Client ID is required" }),
  providerId: z.string().min(1, { message: "Provider ID is required" }),
  date: isoDateSchema.describe("Session date"),
  startTime: timeSchema.describe("Session start time"),
  endTime: timeSchema.describe("Session end time"),
  duration: z
    .number()
    .int()
    .min(1, { message: "Duration must be at least 1 minute" })
    .max(480, { message: "Duration cannot exceed 480 minutes" })
    .describe("Session duration in minutes"),
  sessionType: crSessionTypeEnum.describe("Type of therapy session"),
  notes: z.string().describe("Session notes"),
  goals: z.array(crGoalDataSchema).describe("Goal trial data for this session"),
  billingCode: billingCodeSchema.describe("CPT billing code"),
  billingUnits: positiveIntSchema.describe("Billing units"),
  status: crSessionStatusEnum.describe("Session status"),
  signedOff: z.boolean().describe("Whether session note is signed off"),
  signedOffBy: z.string().describe("Who signed off"),
  signedOffAt: z.string().describe("Sign-off timestamp"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CRSessionInput = z.infer<typeof crSessionSchema>;

/** Treatment goal from CentralReach */
export const crGoalSchema = z.object({
  id: z.string().min(1, { message: "Goal ID is required" }),
  clientId: z.string().min(1, { message: "Client ID is required" }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters" })
    .describe("Goal description"),
  targetBehavior: z
    .string()
    .min(1, { message: "Target behavior is required" })
    .describe("Specific target behavior"),
  baseline: percentageSchema.describe("Baseline level (0-100)"),
  currentLevel: percentageSchema.describe("Current performance level (0-100)"),
  target: percentageSchema.describe("Target level (0-100)"),
  measurementMethod: crMeasurementMethodEnum.describe("How progress is measured"),
  domain: crGoalDomainEnum.describe("Treatment domain"),
  status: crGoalStatusEnum.describe("Goal status"),
  targetDate: isoDateSchema.describe("Target mastery date"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CRGoalInput = z.infer<typeof crGoalSchema>;

/** Home program activity */
export const crActivitySchema = z.object({
  id: z.string().min(1, { message: "Activity ID is required" }),
  name: z.string().min(1, { message: "Activity name is required" }),
  instructions: z.string().min(1, { message: "Instructions are required" }),
  targetTrials: positiveIntSchema.describe("Target number of trials"),
  targetAccuracy: percentageSchema.describe("Target accuracy (0-100)"),
  materials: z.array(z.string()).describe("Required materials"),
  domain: crGoalDomainEnum.describe("Activity domain"),
  linkedGoalId: z.string().describe("Linked treatment goal ID"),
  videoUrl: z.string().url().optional().describe("Instructional video URL"),
});
export type CRActivityInput = z.infer<typeof crActivitySchema>;

/** Home program from CentralReach */
export const crHomeProgramSchema = z.object({
  id: z.string().min(1, { message: "Home program ID is required" }),
  clientId: z.string().min(1, { message: "Client ID is required" }),
  providerId: z.string().min(1, { message: "Provider ID is required" }),
  assignedDate: isoDateSchema.describe("Date assigned"),
  activities: z.array(crActivitySchema).describe("Program activities"),
  dueDate: isoDateSchema.describe("Due date"),
  status: crHomeProgramStatusEnum.describe("Program status"),
  instructions: z.string().describe("Overall instructions"),
  frequencyPerWeek: z
    .number()
    .int()
    .min(1, { message: "Frequency must be at least 1" })
    .max(7, { message: "Frequency cannot exceed 7" })
    .describe("Sessions per week"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CRHomeProgramInput = z.infer<typeof crHomeProgramSchema>;

// ---------------------------------------------------------------------------
// Push Schemas (Aminy -> CentralReach)
// ---------------------------------------------------------------------------

/** ABC behavior log pushed to CentralReach */
export const crBehaviorLogPayloadSchema = z.object({
  clientId: z.string().min(1, { message: "Client ID is required" }),
  reportedBy: z.string().min(1, { message: "Reporter ID is required" }),
  date: isoDateSchema.describe("Date of the incident"),
  time: timeSchema.describe("Time of the incident"),
  antecedent: z
    .string()
    .min(10, { message: "Antecedent must be at least 10 characters" })
    .describe("What happened before the behavior"),
  behavior: z
    .string()
    .min(10, { message: "Behavior must be at least 10 characters" })
    .describe("Observable behavior"),
  consequence: z
    .string()
    .min(10, { message: "Consequence must be at least 10 characters" })
    .describe("What happened after the behavior"),
  severity: z
    .number()
    .int()
    .min(1, { message: "Severity must be at least 1" })
    .max(5, { message: "Severity must be at most 5" })
    .describe("Severity rating (1-5)"),
  location: z
    .string()
    .min(1, { message: "Location is required" })
    .describe("Where the incident occurred"),
  duration: z
    .number()
    .min(0)
    .optional()
    .describe("Duration in minutes"),
  environmentalFactors: z
    .array(z.string())
    .optional()
    .describe("Environmental factors"),
  notes: z.string().optional().describe("Additional notes"),
});
export type CRBehaviorLogPayloadInput = z.infer<typeof crBehaviorLogPayloadSchema>;

/** Billing documentation nested in routine completion */
export const crBillingDocumentationSchema = z.object({
  isHomeProgramActivity: z.boolean().describe("Whether this is a home program activity"),
  linkedHomeProgramId: z.string().optional().describe("Linked home program ID"),
  linkedGoalIds: z.array(z.string()).describe("Linked goal IDs"),
  parentTrainingMinutes: positiveIntSchema.describe("Minutes of parent training"),
});
export type CRBillingDocumentationInput = z.infer<typeof crBillingDocumentationSchema>;

/** Routine completion pushed to CentralReach */
export const crRoutineCompletionPayloadSchema = z.object({
  clientId: z.string().min(1, { message: "Client ID is required" }),
  reportedBy: z.string().min(1, { message: "Reporter ID is required" }),
  date: isoDateSchema.describe("Date of completion"),
  routineType: crRoutineTypeEnum.describe("Type of routine"),
  routineName: z.string().min(1, { message: "Routine name is required" }),
  stepsCompleted: positiveIntSchema.describe("Steps completed"),
  stepsTotal: positiveIntSchema.describe("Total steps"),
  completionPercentage: percentageSchema.describe("Completion percentage"),
  independenceLevel: crPromptLevelEnum.describe("Level of independence"),
  duration: positiveIntSchema.describe("Duration in minutes"),
  notes: z.string().optional().describe("Additional notes"),
  billingDocumentation: crBillingDocumentationSchema.describe(
    "Billing documentation for insurance",
  ),
});
export type CRRoutineCompletionPayloadInput = z.infer<typeof crRoutineCompletionPayloadSchema>;

/** Junior session results pushed to CentralReach */
export const crJuniorSessionPayloadSchema = z.object({
  clientId: z.string().min(1, { message: "Client ID is required" }),
  reportedBy: z.string().min(1, { message: "Reporter ID is required" }),
  date: isoDateSchema.describe("Date of session"),
  sessionDuration: z
    .number()
    .int()
    .min(1, { message: "Duration must be at least 1 minute" })
    .describe("Session duration in minutes"),
  gameType: z.string().min(1, { message: "Game type is required" }),
  skillDomain: crGoalDomainEnum.describe("Skill domain targeted"),
  trialsCompleted: positiveIntSchema.describe("Total trials"),
  trialsCorrect: positiveIntSchema.describe("Correct trials"),
  accuracy: percentageSchema.describe("Accuracy (0-100)"),
  engagementScore: percentageSchema.describe("Engagement score (0-100)"),
  linkedGoalIds: z.array(z.string()).describe("Linked goal IDs"),
  rewards: z.object({
    starsEarned: positiveIntSchema.describe("Stars earned"),
    badgesEarned: z.array(z.string()).describe("Badges earned"),
  }),
  adaptiveDifficulty: z.object({
    startLevel: positiveIntSchema.describe("Starting difficulty level"),
    endLevel: positiveIntSchema.describe("Ending difficulty level"),
    adjustments: z.number().int().describe("Number of difficulty adjustments"),
  }),
});
export type CRJuniorSessionPayloadInput = z.infer<typeof crJuniorSessionPayloadSchema>;

/** Caregiver wellness data pushed to CentralReach */
export const crCaregiverWellnessPayloadSchema = z.object({
  caregiverId: z.string().min(1, { message: "Caregiver ID is required" }),
  clientId: z.string().min(1, { message: "Client ID is required" }),
  date: isoDateSchema.describe("Date of wellness check"),
  stressLevel: z
    .number()
    .int()
    .min(1, { message: "Stress level must be at least 1" })
    .max(10, { message: "Stress level must be at most 10" })
    .describe("Stress level (1-10)"),
  sleepHours: z
    .number()
    .min(0, { message: "Sleep hours cannot be negative" })
    .max(24, { message: "Sleep hours cannot exceed 24" })
    .describe("Hours of sleep"),
  selfCareCompleted: z.boolean().describe("Whether self-care was completed"),
  supportNetworkContact: z.boolean().describe("Whether support network was contacted"),
  wellnessScore: percentageSchema.describe("Composite wellness score (0-100)"),
  concerns: z.string().optional().describe("Caregiver concerns"),
  notes: z.string().optional().describe("Additional notes"),
});
export type CRCaregiverWellnessPayloadInput = z.infer<typeof crCaregiverWellnessPayloadSchema>;

/** Activity completion within a home program update */
export const crActivityCompletionSchema = z.object({
  activityId: z.string().min(1, { message: "Activity ID is required" }),
  completed: z.boolean().describe("Whether the activity was completed"),
  trials: positiveIntSchema.describe("Trials conducted"),
  successes: positiveIntSchema.describe("Successful trials"),
  accuracy: percentageSchema.describe("Accuracy (0-100)"),
  promptLevel: crPromptLevelEnum.describe("Prompt level used"),
  duration: positiveIntSchema.describe("Duration in minutes"),
  notes: z.string().optional().describe("Activity notes"),
});
export type CRActivityCompletionInput = z.infer<typeof crActivityCompletionSchema>;

/** Home program progress update pushed to CentralReach */
export const crHomeProgramProgressPayloadSchema = z.object({
  homeProgramId: z.string().min(1, { message: "Home program ID is required" }),
  clientId: z.string().min(1, { message: "Client ID is required" }),
  date: isoDateSchema.describe("Date of update"),
  completions: z.array(crActivityCompletionSchema).describe("Activity completions"),
  overallCompletionRate: percentageSchema.describe("Overall completion rate (0-100)"),
  caregiverNotes: z.string().describe("Caregiver notes"),
});
export type CRHomeProgramProgressPayloadInput = z.infer<typeof crHomeProgramProgressPayloadSchema>;

// ---------------------------------------------------------------------------
// Webhook Schema
// ---------------------------------------------------------------------------

/** Incoming CentralReach webhook payload */
export const crWebhookPayloadSchema = z.object({
  event: crWebhookEventEnum.describe("Webhook event type"),
  timestamp: z.string().describe("Event timestamp"),
  organizationId: z.string().min(1, { message: "Organization ID is required" }),
  data: z.record(z.string(), z.unknown()).describe("Event-specific data"),
  signature: z.string().min(1, { message: "Webhook signature is required" }),
});
export type CRWebhookPayloadInput = z.infer<typeof crWebhookPayloadSchema>;

// ---------------------------------------------------------------------------
// API Response Envelope
// ---------------------------------------------------------------------------

/** Generic CentralReach API response wrapper */
export const crApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    pagination: z
      .object({
        page: z.number().int().min(1),
        pageSize: z.number().int().min(1),
        totalCount: z.number().int().min(0),
        totalPages: z.number().int().min(0),
      })
      .optional(),
    errors: z
      .array(
        z.object({
          code: z.string(),
          message: z.string(),
          details: z.string().optional(),
        }),
      )
      .optional(),
  });

/** API error response */
export const crApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.string().optional(),
  statusCode: z.number().int(),
  retryable: z.boolean(),
});
export type CRApiErrorInput = z.infer<typeof crApiErrorSchema>;
