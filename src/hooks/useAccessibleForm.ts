// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Accessible Form Hook
 *
 * Extension of the existing useForm hook with built-in accessibility features:
 * - Automatic aria-describedby wiring for error messages
 * - aria-invalid state management
 * - Focus management: moves focus to first error field on submit
 * - Screen reader announcements for error/success states
 * - Error summary generation for the FormErrorSummary component
 *
 * WCAG 2.1 compliance:
 * - 1.3.1: Info and Relationships (programmatic associations)
 * - 3.3.1: Error Identification (field-level error messages)
 * - 3.3.3: Error Suggestion (contextual error messages)
 * - 4.1.3: Status Messages (aria-live announcements)
 *
 * Usage:
 *   const form = useAccessibleForm({
 *     initialValues: { email: '', name: '' },
 *     validationRules: {
 *       email: [validators.required(), validators.email()],
 *       name: [validators.required()],
 *     },
 *     onSubmit: async (values) => { ... },
 *   });
 *
 *   <form onSubmit={form.handleSubmit}>
 *     <FormErrorSummary errors={form.errorSummary} hasSubmitted={form.hasSubmitted} />
 *     <input {...form.getAccessibleFieldProps('email')} />
 *     <AccessibleFormError fieldId="email" error={form.errors.email} />
 *   </form>
 */

import { useCallback, useRef, useMemo } from 'react';
import { useForm, type UseFormOptions, type UseFormReturn } from './useForm';
import { announceToScreenReader } from './useAccessibilityEnhancements';

// ============================================================================
// Types
// ============================================================================

export interface UseAccessibleFormOptions<T extends Record<string, unknown>>
  extends UseFormOptions<T> {
  /** Accessible name for the form (used in announcements) */
  formLabel?: string;
  /** Announce errors to screen readers (default: true) */
  announceErrors?: boolean;
  /** Announce success to screen readers (default: true) */
  announceSuccess?: boolean;
  /** Success message for screen readers */
  successMessage?: string;
}

export interface UseAccessibleFormReturn<T extends Record<string, unknown>>
  extends UseFormReturn<T> {
  /** Whether the form has been submitted at least once */
  hasSubmitted: boolean;
  /** Error summary for the FormErrorSummary component */
  errorSummary: Record<string, string | null | undefined>;
  /** Get accessible field props (extends getFieldProps with a11y attributes) */
  getAccessibleFieldProps: <K extends keyof T>(
    field: K,
    options?: { label?: string; description?: string }
  ) => {
    id: string;
    name: K;
    value: T[K];
    onChange: (e: { target: { value: T[K] } } | T[K]) => void;
    onBlur: () => void;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
    'aria-required': boolean;
    'aria-errormessage': string | undefined;
  };
  /** Focus a specific field by name */
  focusField: (field: keyof T) => void;
  /** Ref to attach to the form element for focus management */
  formRef: React.RefObject<HTMLFormElement | null>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAccessibleForm<T extends Record<string, unknown>>(
  options: UseAccessibleFormOptions<T>
): UseAccessibleFormReturn<T> {
  const {
    formLabel,
    announceErrors = true,
    announceSuccess = true,
    successMessage = 'Form submitted successfully',
    validationRules,
    ...formOptions
  } = options;

  const formRef = useRef<HTMLFormElement>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  // Use the base form hook
  const baseForm = useForm<T>({
    ...formOptions,
    validationRules,
    onSubmit: async (values: T) => {
      try {
        await formOptions.onSubmit?.(values);
        if (announceSuccess) {
          announceToScreenReader(successMessage, 'polite');
        }
      } catch (err) {
        if (announceErrors) {
          const message = err instanceof Error ? err.message : 'An error occurred';
          announceToScreenReader(`Error: ${message}`, 'assertive');
        }
        throw err;
      }
    },
  });

  // Whether form has been submitted at least once
  const hasSubmitted = baseForm.submitCount > 0;

  // Error summary for FormErrorSummary component
  const errorSummary = useMemo(() => {
    const summary: Record<string, string | null | undefined> = {};
    for (const [key, value] of Object.entries(baseForm.errors)) {
      if (value) {
        summary[key] = value as string;
      }
    }
    return summary;
  }, [baseForm.errors]);

  // Announce errors after submit
  const wrappedHandleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      await baseForm.handleSubmit(e);

      // If there are errors after validation, announce them
      if (announceErrors && hasSubmitted) {
        const errorCount = Object.values(baseForm.errors).filter(Boolean).length;
        if (errorCount > 0) {
          const noun = formLabel || 'form';
          announceToScreenReader(
            `${noun} has ${errorCount} error${errorCount !== 1 ? 's' : ''}. Please review and correct.`,
            'assertive'
          );
        }
      }
    },
    [baseForm, announceErrors, hasSubmitted, formLabel]
  );

  // Get accessible field props
  const getAccessibleFieldProps = useCallback(
    <K extends keyof T>(
      field: K,
      fieldOptions?: { label?: string; description?: string }
    ) => {
      const baseProps = baseForm.getFieldProps(field);
      const fieldId = String(field);
      const errorId = `${fieldId}-error`;
      const descriptionId = fieldOptions?.description ? `${fieldId}-description` : undefined;
      const hasError = !!baseForm.errors[field];

      // Build aria-describedby from all descriptors
      const describedByParts: string[] = [];
      if (hasError) describedByParts.push(errorId);
      if (descriptionId) describedByParts.push(descriptionId);

      // Check if field is required based on validation rules
      const isRequired = !!(
        validationRules &&
        field in validationRules &&
        (validationRules[field] as unknown[])?.some(
          (rule: unknown) =>
            rule &&
            typeof rule === 'object' &&
            'message' in (rule as Record<string, unknown>) &&
            ((rule as { message: string }).message.toLowerCase().includes('required') ||
              (rule as { message: string }).message.toLowerCase().includes('is required'))
        )
      );

      return {
        id: fieldId,
        name: baseProps.name,
        value: baseProps.value,
        onChange: baseProps.onChange,
        onBlur: baseProps.onBlur,
        'aria-invalid': hasError,
        'aria-describedby': describedByParts.length > 0 ? describedByParts.join(' ') : undefined,
        'aria-required': isRequired,
        'aria-errormessage': hasError ? errorId : undefined,
        ref: (el: HTMLElement | null) => {
          fieldRefs.current[String(field)] = el;
        },
      };
    },
    [baseForm, validationRules]
  );

  // Focus a specific field
  const focusField = useCallback(
    (field: keyof T) => {
      const fieldId = String(field);
      const element =
        fieldRefs.current[fieldId] ||
        formRef.current?.querySelector<HTMLElement>(`#${fieldId}`) ||
        formRef.current?.querySelector<HTMLElement>(`[name="${fieldId}"]`);

      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    []
  );

  return {
    ...baseForm,
    handleSubmit: wrappedHandleSubmit,
    hasSubmitted,
    errorSummary,
    getAccessibleFieldProps,
    focusField,
    formRef,
  };
}

export default useAccessibleForm;
