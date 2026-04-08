// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useFormValidation — Bridge between Zod schemas and React form state.
 *
 * Replaces custom validateForm() functions in components with a single hook
 * that delegates to the project's existing Zod schemas in src/lib/schemas/.
 *
 * Usage:
 *   import { loginSchema } from '@/lib/schemas';
 *   const { validate, fieldError, clearErrors } = useFormValidation(loginSchema);
 *
 *   const handleSubmit = (e) => {
 *     const result = validate({ email, password });
 *     if (!result.success) return;         // errors auto-set
 *     await signIn(result.data);            // result.data is typed
 *   };
 */

import { useState, useCallback, useRef } from "react";
import type { ZodType, ZodError } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationSuccess<T> {
  success: true;
  data: T;
  errors: null;
}

export interface ValidationFailure {
  success: false;
  data: null;
  errors: Record<string, string>;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ---------------------------------------------------------------------------
// Utility: flatten Zod errors into { fieldName: firstMessage }
// ---------------------------------------------------------------------------

function flattenZodErrors(error: ZodError): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!flat[key]) {
      flat[key] = issue.message;
    }
  }
  return flat;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFormValidation<T>(schema: ZodType<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorsRef = useRef(errors);
  errorsRef.current = errors;

  /**
   * Validate data against the schema.
   * On failure, field errors are set and returned.
   * On success, typed `data` is returned (safe to send to API).
   */
  const validate = useCallback(
    (data: unknown): ValidationResult<T> => {
      const result = schema.safeParse(data);
      if (result.success) {
        setErrors({});
        return { success: true, data: result.data, errors: null };
      }
      const fieldErrors = flattenZodErrors(result.error);
      setErrors(fieldErrors);
      return { success: false, data: null, errors: fieldErrors };
    },
    [schema],
  );

  /**
   * Validate a single field (useful for onBlur feedback).
   * Returns the error message or null if valid.
   */
  const validateField = useCallback(
    (fieldName: string, value: unknown): string | null => {
      // Build a partial object with just this field
      const partialResult = schema.safeParse({ [fieldName]: value });
      if (partialResult.success) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
        return null;
      }
      const issue = partialResult.error.issues.find(
        (i) => i.path[0] === fieldName,
      );
      if (issue) {
        setErrors((prev) => ({ ...prev, [fieldName]: issue.message }));
        return issue.message;
      }
      return null;
    },
    [schema],
  );

  /**
   * Get the error for a specific field (returns undefined if none).
   */
  const fieldError = useCallback(
    (field: string): string | undefined => errorsRef.current[field],
    [],
  );

  /**
   * Clear all errors (e.g., when user starts typing).
   */
  const clearErrors = useCallback(() => setErrors({}), []);

  /**
   * Set a manual error (e.g., server-side "email already taken").
   */
  const setFieldError = useCallback(
    (field: string, message: string) =>
      setErrors((prev) => ({ ...prev, [field]: message })),
    [],
  );

  return {
    errors,
    validate,
    validateField,
    fieldError,
    clearErrors,
    setFieldError,
    setErrors,
  } as const;
}
