// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Appointment booking schema.
 */
import { z } from "zod";
import { uuidSchema, futureDateSchema } from "./common";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const visitTypeEnum = z.enum(
  ["initial-eval", "follow-up", "consultation", "parent-training"],
  { message: "Invalid visit type" },
);

export type VisitType = z.infer<typeof visitTypeEnum>;

export const visitFormatEnum = z.enum(
  ["remote", "in-person", "hybrid"],
  { message: "Invalid visit format" },
);

export type VisitFormat = z.infer<typeof visitFormatEnum>;

export const visitForWhomEnum = z.enum(
  ["child", "parent", "family"],
  { message: "Invalid selection for who the visit is for" },
);

export type VisitForWhom = z.infer<typeof visitForWhomEnum>;

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export const bookingSchema = z.object({
  providerId: uuidSchema.describe("Selected provider identifier"),

  visitType: visitTypeEnum.describe("Type of visit being booked"),

  visitFormat: visitFormatEnum.describe(
    "Whether the visit is remote, in-person, or hybrid",
  ),

  preferredDate: futureDateSchema.describe(
    "Preferred appointment date (must be in the future)",
  ),

  preferredTime: z
    .string()
    .min(1, { message: "Preferred time is required" })
    .describe("Preferred appointment time (e.g. 10:00 AM)"),

  whoIsThisFor: visitForWhomEnum.describe(
    "Who the appointment is for",
  ),

  visitReason: z
    .string()
    .min(10, { message: "Visit reason must be at least 10 characters" })
    .max(500, { message: "Visit reason must be 500 characters or fewer" })
    .describe("Brief description of why this visit is needed"),

  insuranceVerified: z
    .boolean()
    .describe("Whether insurance eligibility has been verified"),
});

export type BookingInput = z.infer<typeof bookingSchema>;
