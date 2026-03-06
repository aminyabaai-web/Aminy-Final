/**
 * Common / shared Zod validators used across the Aminy app.
 *
 * Every helper is a standalone z.ZodType so it can be composed inside
 * z.object() definitions the same way you would use z.string().
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Reusable atomic schemas
// ---------------------------------------------------------------------------

/** UUID v4 string */
export const uuidSchema = z
  .string()
  .uuid({ message: "Must be a valid UUID" })
  .describe("UUID v4 identifier");

/** US phone number – accepts (xxx) xxx-xxxx, xxx-xxx-xxxx, xxxxxxxxxx */
export const usPhoneSchema = z
  .string()
  .regex(
    /^\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
    { message: "Must be a valid US phone number (e.g. 555-123-4567)" },
  )
  .describe("US phone number");

/** Two-letter US state / territory code */
const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "VI", "GU", "AS", "MP",
] as const;

export const usStateSchema = z
  .enum(US_STATE_CODES, {
    message: "Must be a valid 2-letter US state or territory code",
  })
  .describe("Two-letter US state / territory code");

export type USStateCode = z.infer<typeof usStateSchema>;

/** ISO 8601 date string (YYYY-MM-DD) */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Must be a valid ISO date (YYYY-MM-DD)",
  })
  .refine(
    (val) => !Number.isNaN(Date.parse(val)),
    { message: "Must be a real calendar date" },
  )
  .describe("ISO 8601 date string (YYYY-MM-DD)");

/** ISO date that must be in the future */
export const futureDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Must be a valid ISO date (YYYY-MM-DD)",
  })
  .refine(
    (val) => !Number.isNaN(Date.parse(val)),
    { message: "Must be a real calendar date" },
  )
  .refine(
    (val) => new Date(val) > new Date(),
    { message: "Date must be in the future" },
  )
  .describe("ISO date that must be in the future");

/** ISO date that must be in the past */
export const pastDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Must be a valid ISO date (YYYY-MM-DD)",
  })
  .refine(
    (val) => !Number.isNaN(Date.parse(val)),
    { message: "Must be a real calendar date" },
  )
  .refine(
    (val) => new Date(val) < new Date(),
    { message: "Date must be in the past" },
  )
  .describe("ISO date that must be in the past");

/** NPI number – exactly 10 digits */
export const npiSchema = z
  .string()
  .regex(/^\d{10}$/, { message: "NPI must be exactly 10 digits" })
  .describe("National Provider Identifier (10-digit)");

/** Validated email (delegates to z.email()) */
export const emailSchema = z
  .string()
  .email({ message: "Must be a valid email address" })
  .describe("Email address");

// ---------------------------------------------------------------------------
// Inferred types for convenience
// ---------------------------------------------------------------------------

export type UUID = z.infer<typeof uuidSchema>;
export type USPhone = z.infer<typeof usPhoneSchema>;
export type ISODate = z.infer<typeof isoDateSchema>;
export type FutureDate = z.infer<typeof futureDateSchema>;
export type PastDate = z.infer<typeof pastDateSchema>;
