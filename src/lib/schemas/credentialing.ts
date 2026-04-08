// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Credentialing Engine Zod Schemas
 *
 * Validation schemas for the provider credentialing system.
 * Mirrors types in `../credentialing-engine.ts` with runtime validation.
 */
import { z } from "zod";
import {
  uuidSchema,
  usStateSchema,
  isoDateSchema,
  npiSchema,
} from "./common";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const credentialingStatusEnum = z.enum(
  [
    "not-started",
    "documents-pending",
    "submitted",
    "under-review",
    "approved",
    "denied",
    "expired",
    "renewal-needed",
  ],
  { message: "Invalid credentialing status" },
);

export type CredentialingStatusEnum = z.infer<typeof credentialingStatusEnum>;

export const credentialingPayerTypeEnum = z.enum(
  ["medicaid", "chip", "private", "tricare", "workers-comp"],
  { message: "Invalid payer type" },
);

export type CredentialingPayerTypeEnum = z.infer<typeof credentialingPayerTypeEnum>;

export const credentialingProviderTypeEnum = z.enum(
  ["bcba", "bcaba", "rbt", "slp", "ot", "psychologist", "lcsw"],
  { message: "Invalid provider type" },
);

export type CredentialingProviderTypeEnum = z.infer<typeof credentialingProviderTypeEnum>;

export const documentTypeEnum = z.enum(
  [
    "license",
    "npi",
    "liability-insurance",
    "caqh-profile",
    "board-certification",
    "cv-resume",
    "w9",
    "drivers-license",
    "dea-certificate",
    "supervision-agreement",
    "background-check",
    "immunization-records",
    "continuing-education",
  ],
  { message: "Invalid document type" },
);

export type DocumentTypeEnum = z.infer<typeof documentTypeEnum>;

export const documentStatusEnum = z.enum(
  ["pending", "approved", "rejected", "expired"],
  { message: "Invalid document status" },
);

export type DocumentStatusEnum = z.infer<typeof documentStatusEnum>;

export const credentialingEventTypeEnum = z.enum(
  [
    "status-change",
    "document-uploaded",
    "document-approved",
    "document-rejected",
    "note-added",
    "submission",
    "follow-up",
    "payer-response",
    "renewal-initiated",
  ],
  { message: "Invalid credentialing event type" },
);

export type CredentialingEventTypeEnum = z.infer<typeof credentialingEventTypeEnum>;

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const credentialingDocumentSchema = z.object({
  id: z.string().min(1, { message: "Document ID is required" }),
  type: documentTypeEnum,
  name: z
    .string()
    .min(1, { message: "Document name is required" })
    .describe("Human-readable document name"),
  required: z.boolean().describe("Whether the document is required for this application"),
  uploaded: z.boolean().describe("Whether the document has been uploaded"),
  uploadedAt: z
    .string()
    .datetime({ message: "Must be a valid ISO datetime" })
    .nullable()
    .describe("When the document was uploaded"),
  expirationDate: isoDateSchema
    .nullable()
    .describe("Expiration date of the credential / document"),
  fileUrl: z
    .string()
    .url({ message: "Must be a valid URL" })
    .nullable()
    .describe("Storage URL for the uploaded document"),
  status: documentStatusEnum.describe("Review status of the document"),
});

export type CredentialingDocumentInput = z.infer<typeof credentialingDocumentSchema>;

export const credentialingEventSchema = z.object({
  id: z.string().min(1, { message: "Event ID is required" }),
  timestamp: z
    .string()
    .datetime({ message: "Must be a valid ISO datetime" })
    .describe("When the event occurred"),
  type: credentialingEventTypeEnum.describe("Category of the timeline event"),
  description: z
    .string()
    .min(1, { message: "Description is required" })
    .describe("Human-readable event description"),
  actor: z
    .string()
    .min(1, { message: "Actor is required" })
    .describe("Who or what triggered the event (system, provider, payer, userId)"),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Additional event-specific data"),
});

export type CredentialingEventInput = z.infer<typeof credentialingEventSchema>;

// ---------------------------------------------------------------------------
// Main application schema
// ---------------------------------------------------------------------------

export const credentialingApplicationSchema = z.object({
  id: z.string().min(1, { message: "Application ID is required" }),
  providerId: uuidSchema.describe("Provider identifier"),
  payerId: z
    .string()
    .min(1, { message: "Payer ID is required" })
    .describe("Insurance payer identifier"),
  payerName: z
    .string()
    .min(1, { message: "Payer name is required" })
    .describe("Human-readable payer name"),
  payerType: credentialingPayerTypeEnum.describe("Category of insurance payer"),
  status: credentialingStatusEnum.describe("Current application status"),
  submittedAt: z
    .string()
    .datetime({ message: "Must be a valid ISO datetime" })
    .nullable()
    .describe("When the application was submitted to the payer"),
  approvedAt: z
    .string()
    .datetime({ message: "Must be a valid ISO datetime" })
    .nullable()
    .describe("When the application was approved"),
  effectiveDate: isoDateSchema
    .nullable()
    .describe("Credentialing effective date"),
  expirationDate: isoDateSchema
    .nullable()
    .describe("Credentialing expiration date"),

  // Provider info
  npiNumber: npiSchema.describe("National Provider Identifier"),
  taxId: z
    .string()
    .min(1, { message: "Tax ID is required" })
    .describe("Tax identification number (EIN or SSN)"),
  licenseNumber: z
    .string()
    .min(1, { message: "License number is required" })
    .describe("State license number"),
  licenseState: usStateSchema.describe("State where the license was issued"),
  licenseExpiration: isoDateSchema.describe("License expiration date"),
  caqhNumber: z
    .string()
    .nullable()
    .describe("CAQH ProView number (optional)"),

  // Tracking
  documentsRequired: z
    .array(credentialingDocumentSchema)
    .describe("Documents required by the payer for this application"),
  documentsSubmitted: z
    .array(credentialingDocumentSchema)
    .describe("Documents uploaded by the provider"),
  notes: z
    .array(z.string())
    .describe("Application notes and comments"),
  timeline: z
    .array(credentialingEventSchema)
    .describe("Chronological timeline of application events"),
});

export type CredentialingApplicationInput = z.infer<typeof credentialingApplicationSchema>;

// ---------------------------------------------------------------------------
// Enrollment initiation schema (for starting a new application)
// ---------------------------------------------------------------------------

export const startEnrollmentSchema = z.object({
  providerId: uuidSchema.describe("Provider identifier"),
  payerId: z
    .string()
    .min(1, { message: "Payer ID is required" })
    .describe("Insurance payer identifier"),
  npiNumber: npiSchema.describe("National Provider Identifier"),
  taxId: z
    .string()
    .min(1, { message: "Tax ID is required" })
    .regex(/^\d{2}-?\d{7}$/, { message: "Tax ID must be in XX-XXXXXXX format" })
    .describe("Tax identification number (EIN or SSN)"),
  licenseNumber: z
    .string()
    .min(1, { message: "License number is required" })
    .describe("State license number"),
  licenseState: usStateSchema.describe("State where the license was issued"),
  licenseExpiration: isoDateSchema.describe("License expiration date"),
  caqhNumber: z
    .string()
    .optional()
    .describe("CAQH ProView number (optional)"),
  providerType: credentialingProviderTypeEnum.describe("Provider clinical type"),
});

export type StartEnrollmentInput = z.infer<typeof startEnrollmentSchema>;

// ---------------------------------------------------------------------------
// Document upload schema
// ---------------------------------------------------------------------------

export const documentUploadSchema = z.object({
  applicationId: z
    .string()
    .min(1, { message: "Application ID is required" })
    .describe("Credentialing application ID"),
  type: documentTypeEnum.describe("Type of document being uploaded"),
  name: z
    .string()
    .min(1, { message: "Document name is required" })
    .max(200, { message: "Document name must be 200 characters or fewer" })
    .describe("Human-readable document name"),
  expirationDate: isoDateSchema
    .optional()
    .describe("Expiration date of the credential / document (optional)"),
});

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

// ---------------------------------------------------------------------------
// CAQH lookup schema
// ---------------------------------------------------------------------------

export const caqhLookupSchema = z.object({
  caqhNumber: z
    .string()
    .regex(/^\d{8,10}$/, { message: "CAQH number must be 8-10 digits" })
    .describe("CAQH ProView provider number"),
});

export type CAQHLookupInput = z.infer<typeof caqhLookupSchema>;

// ---------------------------------------------------------------------------
// Payer search schema
// ---------------------------------------------------------------------------

export const payerSearchSchema = z.object({
  state: usStateSchema.describe("State to search for available payers"),
  providerType: credentialingProviderTypeEnum.describe("Provider type to filter by"),
});

export type PayerSearchInput = z.infer<typeof payerSearchSchema>;

// ---------------------------------------------------------------------------
// Renewal initiation schema
// ---------------------------------------------------------------------------

export const renewalInitiationSchema = z.object({
  applicationId: z
    .string()
    .min(1, { message: "Application ID is required" })
    .describe("Existing credentialing application ID to renew"),
});

export type RenewalInitiationInput = z.infer<typeof renewalInitiationSchema>;

// ---------------------------------------------------------------------------
// Credentialing report request schema
// ---------------------------------------------------------------------------

export const credentialingReportSchema = z.object({
  providerId: uuidSchema.describe("Provider identifier"),
  includeExpiring: z
    .boolean()
    .default(true)
    .describe("Include credentials expiring within 180 days"),
  includeDenied: z
    .boolean()
    .default(true)
    .describe("Include denied applications in the report"),
});

export type CredentialingReportInput = z.infer<typeof credentialingReportSchema>;

// ---------------------------------------------------------------------------
// State licensure query schema
// ---------------------------------------------------------------------------

export const stateLicensureQuerySchema = z.object({
  state: usStateSchema.describe("US state to query licensure requirements for"),
  providerType: credentialingProviderTypeEnum.describe("Provider type"),
});

export type StateLicensureQueryInput = z.infer<typeof stateLicensureQuerySchema>;
