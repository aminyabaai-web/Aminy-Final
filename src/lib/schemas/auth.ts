/**
 * Authentication schemas for login, registration, and password flows.
 */
import { z } from "zod";
import { emailSchema } from "./common";

// ---------------------------------------------------------------------------
// Password helpers (shared between create-account and reset-password)
// ---------------------------------------------------------------------------

/** Password with complexity requirements: min 8 chars, 1 uppercase, 1 number */
const strongPasswordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  .regex(/[0-9]/, {
    message: "Password must contain at least one number",
  })
  .describe("Password (min 8 chars, uppercase + number required)");

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema.describe("User email address"),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .describe("User password (min 8 characters)"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Create account
// ---------------------------------------------------------------------------

export const createAccountSchema = z
  .object({
    email: emailSchema.describe("Registration email address"),
    password: strongPasswordSchema,
    confirmPassword: z
      .string()
      .describe("Must match the password field"),
    firstName: z
      .string()
      .min(2, { message: "First name must be at least 2 characters" })
      .describe("User first name"),
    lastName: z
      .string()
      .min(2, { message: "Last name must be at least 2 characters" })
      .describe("User last name"),
    acceptTerms: z
      .literal(true, {
        message: "You must accept the terms and conditions",
      })
      .describe("Terms of service acceptance (must be true)"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

export const forgotPasswordSchema = z.object({
  email: emailSchema.describe("Email for password reset link"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------

export const resetPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z
      .string()
      .describe("Must match the new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
