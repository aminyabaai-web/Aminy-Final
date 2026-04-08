// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Clinical form schemas: incident logs, session notes, treatment goals.
 */
import { z } from "zod";
import { uuidSchema, isoDateSchema, futureDateSchema } from "./common";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const sessionTypeEnum = z.enum(
  ["aba", "speech", "ot", "consultation"],
  { message: "Invalid session type" },
);

export type ClinicalSessionType = z.infer<typeof sessionTypeEnum>;

export const promptLevelEnum = z.enum(
  ["independent", "gestural", "verbal", "model", "partial-physical", "full-physical"],
  { message: "Invalid prompt level" },
);

export type PromptLevel = z.infer<typeof promptLevelEnum>;

// ---------------------------------------------------------------------------
// Incident log (ABC data)
// ---------------------------------------------------------------------------

export const incidentLogSchema = z.object({
  childId: uuidSchema.describe("Child identifier"),

  date: isoDateSchema.describe("Date of the incident"),

  time: z
    .string()
    .min(1, { message: "Time is required" })
    .describe("Time of day (e.g. 14:30)"),

  antecedent: z
    .string()
    .min(10, { message: "Antecedent must be at least 10 characters" })
    .describe("What happened immediately before the behavior"),

  behavior: z
    .string()
    .min(10, { message: "Behavior description must be at least 10 characters" })
    .describe("Observable behavior that occurred"),

  consequence: z
    .string()
    .min(10, { message: "Consequence must be at least 10 characters" })
    .describe("What happened immediately after the behavior"),

  severity: z
    .number()
    .int({ message: "Severity must be a whole number" })
    .min(1, { message: "Severity must be at least 1" })
    .max(5, { message: "Severity must be at most 5" })
    .describe("Severity rating (1 = mild, 5 = severe)"),

  location: z
    .string()
    .min(1, { message: "Location is required" })
    .describe("Where the incident took place"),

  witnesses: z
    .string()
    .optional()
    .describe("Names of witnesses (optional)"),

  notes: z
    .string()
    .optional()
    .describe("Additional notes or observations (optional)"),
});

export type IncidentLogInput = z.infer<typeof incidentLogSchema>;

// ---------------------------------------------------------------------------
// Session goal trial data (nested in session notes)
// ---------------------------------------------------------------------------

export const goalTrialSchema = z.object({
  goalId: z
    .string()
    .min(1, { message: "Goal ID is required" })
    .describe("Reference to the treatment goal"),

  trials: z
    .number()
    .int({ message: "Trials must be a whole number" })
    .min(0, { message: "Trials cannot be negative" })
    .describe("Total number of trials conducted"),

  successes: z
    .number()
    .int({ message: "Successes must be a whole number" })
    .min(0, { message: "Successes cannot be negative" })
    .describe("Number of successful trials"),

  promptLevel: promptLevelEnum.describe(
    "Highest level of prompting used during trials",
  ),
});

export type GoalTrialInput = z.infer<typeof goalTrialSchema>;

// ---------------------------------------------------------------------------
// Session note
// ---------------------------------------------------------------------------

export const sessionNoteSchema = z.object({
  childId: uuidSchema.describe("Child identifier"),

  providerId: uuidSchema.describe("Provider identifier"),

  date: isoDateSchema.describe("Date of the session"),

  duration: z
    .number()
    .int({ message: "Duration must be a whole number of minutes" })
    .min(15, { message: "Session must be at least 15 minutes" })
    .max(180, { message: "Session cannot exceed 180 minutes" })
    .describe("Session duration in minutes (15-180)"),

  sessionType: sessionTypeEnum.describe("Type of clinical session"),

  goals: z
    .array(goalTrialSchema)
    .describe("Trial data for each targeted goal"),

  notes: z
    .string()
    .min(1, { message: "Session notes are required" })
    .describe("Clinician notes about the session"),

  parentPresent: z
    .boolean()
    .describe("Whether a parent or caregiver was present"),
});

export type SessionNoteInput = z.infer<typeof sessionNoteSchema>;

// ---------------------------------------------------------------------------
// Treatment goal
// ---------------------------------------------------------------------------

export const treatmentGoalSchema = z
  .object({
    description: z
      .string()
      .min(10, { message: "Description must be at least 10 characters" })
      .describe("Plain-language description of the goal"),

    targetBehavior: z
      .string()
      .min(1, { message: "Target behavior is required" })
      .describe("Specific behavior being targeted"),

    baselineLevel: z
      .number()
      .min(0, { message: "Baseline cannot be below 0" })
      .max(100, { message: "Baseline cannot exceed 100" })
      .describe("Current performance level (0-100)"),

    targetLevel: z
      .number()
      .min(0, { message: "Target level cannot be below 0" })
      .max(100, { message: "Target level cannot exceed 100" })
      .describe("Desired performance level (0-100)"),

    measurementMethod: z
      .string()
      .min(1, { message: "Measurement method is required" })
      .describe("How progress will be measured"),

    targetDate: futureDateSchema.describe(
      "Expected date to reach the target level (must be in the future)",
    ),
  })
  .refine((data) => data.targetLevel > data.baselineLevel, {
    message: "Target level must be greater than baseline level",
    path: ["targetLevel"],
  });

export type TreatmentGoalInput = z.infer<typeof treatmentGoalSchema>;
