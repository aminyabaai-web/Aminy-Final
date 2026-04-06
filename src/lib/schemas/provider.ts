// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider application and credentialing schemas.
 */
import { z } from "zod";
import {
  uuidSchema,
  usPhoneSchema,
  usStateSchema,
  emailSchema,
  npiSchema,
  futureDateSchema,
  isoDateSchema,
} from "./common";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const providerTypeEnum = z.enum(
  ["bcba", "bcaba", "rbt", "slp", "ot", "psychologist", "lcsw"],
  { message: "Invalid provider type" },
);

export type ProviderType = z.infer<typeof providerTypeEnum>;

export const payerTypeEnum = z.enum(
  ["medicaid", "chip", "private", "tricare"],
  { message: "Invalid payer type" },
);

export type PayerType = z.infer<typeof payerTypeEnum>;

// ---------------------------------------------------------------------------
// Provider application
// ---------------------------------------------------------------------------

export const providerApplicationSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: "First name is required" })
    .describe("Provider first name"),

  lastName: z
    .string()
    .min(1, { message: "Last name is required" })
    .describe("Provider last name"),

  email: emailSchema.describe("Provider email address"),

  phone: usPhoneSchema.describe("Provider US phone number"),

  npiNumber: npiSchema.describe("National Provider Identifier"),

  licenseNumber: z
    .string()
    .min(1, { message: "License number is required" })
    .describe("State license number"),

  licenseState: usStateSchema.describe(
    "State where the license was issued",
  ),

  licenseExpiration: futureDateSchema.describe(
    "License expiration date (must be in the future)",
  ),

  providerType: providerTypeEnum.describe(
    "Clinical provider type / credential",
  ),

  yearsExperience: z
    .number()
    .int({ message: "Years of experience must be a whole number" })
    .min(0, { message: "Years of experience cannot be negative" })
    .max(50, { message: "Years of experience cannot exceed 50" })
    .describe("Years of clinical experience (0-50)"),

  specialties: z
    .array(
      z.string().min(1, { message: "Specialty cannot be empty" }),
    )
    .min(1, { message: "At least one specialty is required" })
    .describe("Clinical specialties (e.g. early intervention, feeding therapy)"),

  bio: z
    .string()
    .min(50, { message: "Bio must be at least 50 characters" })
    .max(1000, { message: "Bio must be 1000 characters or fewer" })
    .describe("Professional biography for the provider profile"),
});

export type ProviderApplicationInput = z.infer<typeof providerApplicationSchema>;

// ---------------------------------------------------------------------------
// Credentialing
// ---------------------------------------------------------------------------

export const credentialingSchema = z.object({
  providerId: uuidSchema.describe("Provider identifier"),

  payerName: z
    .string()
    .min(1, { message: "Payer name is required" })
    .describe("Name of the insurance payer"),

  payerType: payerTypeEnum.describe("Category of insurance payer"),

  caqhNumber: z
    .string()
    .optional()
    .describe("CAQH ProView number (optional)"),

  taxId: z
    .string()
    .min(1, { message: "Tax ID is required" })
    .describe("Tax identification number (EIN or SSN)"),

  groupNpi: z
    .string()
    .regex(/^\d{10}$/, { message: "Group NPI must be exactly 10 digits" })
    .optional()
    .describe("Group NPI number (optional, 10-digit)"),

  effectiveDate: isoDateSchema.describe(
    "Effective date of credentialing",
  ),

  statesLicensed: z
    .array(usStateSchema)
    .min(1, { message: "At least one licensed state is required" })
    .describe("US states where the provider is licensed"),
});

export type CredentialingInput = z.infer<typeof credentialingSchema>;
