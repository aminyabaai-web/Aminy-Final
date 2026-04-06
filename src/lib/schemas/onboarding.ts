// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Child / family onboarding schemas.
 */
import { z } from "zod";
import { pastDateSchema, usStateSchema } from "./common";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const therapyTypeEnum = z.enum(
  ["aba", "speech", "ot", "pt", "behavioral"],
  { message: "Invalid therapy type" },
);

export type TherapyType = z.infer<typeof therapyTypeEnum>;

export const relationshipEnum = z.enum(
  ["mother", "father", "guardian", "caregiver", "other"],
  { message: "Invalid relationship type" },
);

export type Relationship = z.infer<typeof relationshipEnum>;

// ---------------------------------------------------------------------------
// Child profile
// ---------------------------------------------------------------------------

export const childProfileSchema = z.object({
  childName: z
    .string()
    .min(2, { message: "Child name must be at least 2 characters" })
    .max(50, { message: "Child name must be 50 characters or fewer" })
    .describe("Child's first name or preferred name"),

  dateOfBirth: pastDateSchema.describe("Child's date of birth (must be in the past)"),

  diagnosis: z
    .array(z.string().min(1, { message: "Diagnosis cannot be empty" }))
    .min(1, { message: "At least one diagnosis is required" })
    .describe("List of diagnoses (e.g. ASD, ADHD)"),

  therapyTypes: z
    .array(therapyTypeEnum)
    .describe("Therapy types the child is receiving or seeking"),

  insuranceProvider: z
    .string()
    .optional()
    .describe("Insurance company name (optional)"),

  policyNumber: z
    .string()
    .optional()
    .describe("Insurance policy number (optional)"),
});

export type ChildProfileInput = z.infer<typeof childProfileSchema>;

// ---------------------------------------------------------------------------
// Family setup (wraps one-or-more child profiles)
// ---------------------------------------------------------------------------

export const familySetupSchema = z.object({
  parentName: z
    .string()
    .min(2, { message: "Parent name must be at least 2 characters" })
    .describe("Name of the parent or primary caregiver"),

  relationship: relationshipEnum.describe(
    "Relationship to the child(ren)",
  ),

  state: usStateSchema.describe("US state of residence"),

  timezone: z
    .string()
    .min(1, { message: "Timezone is required" })
    .describe("IANA timezone identifier (e.g. America/New_York)"),

  children: z
    .array(childProfileSchema)
    .min(1, { message: "At least one child profile is required" })
    .describe("Child profiles to onboard"),
});

export type FamilySetupInput = z.infer<typeof familySetupSchema>;
