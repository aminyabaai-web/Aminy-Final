/**
 * useForm Hook
 * Lightweight form state management with validation
 *
 * Provides form state, validation, and submission handling
 */

import { useState, useCallback, useMemo, useRef, FormEvent } from 'react';
import { sanitizeFormData } from '../lib/security/sanitize';

type ValidationRule<T> = {
  validate: (value: T, allValues: Record<string, unknown>) => boolean;
  message: string;
};

type FieldValidation<T> = ValidationRule<T>[];

interface FieldState<T> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

interface UseFormOptions<T extends Record<string, unknown>> {
  /** Initial form values */
  initialValues: T;
  /** Validation rules per field */
  validationRules?: Partial<{ [K in keyof T]: FieldValidation<T[K]> }>;
  /** Validate on change */
  validateOnChange?: boolean;
  /** Validate on blur */
  validateOnBlur?: boolean;
  /** Submit handler */
  onSubmit?: (values: T) => void | Promise<void>;
  /** Transform values before submit */
  transformValues?: (values: T) => T;
  /** Sanitize values before submit (default: true) */
  sanitize?: boolean;
  /** Fields that allow rich text HTML (for sanitization) */
  richTextFields?: string[];
  /** Fields to skip sanitization */
  skipSanitizeFields?: string[];
}

interface UseFormReturn<T extends Record<string, unknown>> {
  /** Current form values */
  values: T;
  /** Field errors */
  errors: Partial<{ [K in keyof T]: string | null }>;
  /** Touched state per field */
  touched: Partial<{ [K in keyof T]: boolean }>;
  /** Dirty state per field */
  dirty: Partial<{ [K in keyof T]: boolean }>;
  /** Whether form is valid */
  isValid: boolean;
  /** Whether form has been modified */
  isDirty: boolean;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Form submission error */
  submitError: string | null;
  /** Submit count */
  submitCount: number;
  /** Set a field value */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Set multiple values */
  setValues: (values: Partial<T>) => void;
  /** Set field error */
  setError: <K extends keyof T>(field: K, error: string | null) => void;
  /** Mark field as touched */
  setTouched: <K extends keyof T>(field: K, touched?: boolean) => void;
  /** Validate a single field */
  validateField: <K extends keyof T>(field: K) => boolean;
  /** Validate all fields */
  validateForm: () => boolean;
  /** Reset form to initial values */
  reset: () => void;
  /** Reset a single field */
  resetField: <K extends keyof T>(field: K) => void;
  /** Handle form submission */
  handleSubmit: (e?: FormEvent) => Promise<void>;
  /** Get props for a field input */
  getFieldProps: <K extends keyof T>(field: K) => {
    name: K;
    value: T[K];
    onChange: (e: { target: { value: T[K] } } | T[K]) => void;
    onBlur: () => void;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  };
  /** Register a field (for uncontrolled inputs) */
  register: <K extends keyof T>(field: K) => {
    name: K;
    ref: (el: HTMLInputElement | null) => void;
    onChange: (e: { target: { value: unknown } }) => void;
    onBlur: () => void;
  };
}

/**
 * Hook for form state management with validation
 *
 * @example
 * ```tsx
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   validationRules: {
 *     email: [
 *       { validate: v => !!v, message: 'Email is required' },
 *       { validate: v => /\S+@\S+\.\S+/.test(v), message: 'Invalid email' },
 *     ],
 *     password: [
 *       { validate: v => v.length >= 8, message: 'Min 8 characters' },
 *     ],
 *   },
 *   onSubmit: async (values) => {
 *     await login(values);
 *   },
 * });
 *
 * return (
 *   <form onSubmit={form.handleSubmit}>
 *     <input {...form.getFieldProps('email')} />
 *     {form.errors.email && <span>{form.errors.email}</span>}
 *     <button disabled={!form.isValid || form.isSubmitting}>
 *       {form.isSubmitting ? 'Loading...' : 'Submit'}
 *     </button>
 *   </form>
 * );
 * ```
 */
export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const {
    initialValues,
    validationRules = {},
    validateOnChange = true,
    validateOnBlur = true,
    onSubmit,
    transformValues,
    sanitize = true, // Sanitize by default for security
    richTextFields = [],
    skipSanitizeFields = [],
  } = options;

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<{ [K in keyof T]: string | null }>>({});
  const [touched, setTouched] = useState<Partial<{ [K in keyof T]: boolean }>>({});
  const [dirty, setDirty] = useState<Partial<{ [K in keyof T]: boolean }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitCount, setSubmitCount] = useState(0);

  const initialValuesRef = useRef(initialValues);
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Validate a single field
  const validateField = useCallback(<K extends keyof T>(field: K): boolean => {
    const rules = validationRules[field] as FieldValidation<T[K]> | undefined;
    if (!rules) return true;

    for (const rule of rules) {
      if (!rule.validate(values[field], values)) {
        setErrors(prev => ({ ...prev, [field]: rule.message }));
        return false;
      }
    }

    setErrors(prev => ({ ...prev, [field]: null }));
    return true;
  }, [values, validationRules]);

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    let isValid = true;
    const newErrors: Partial<{ [K in keyof T]: string | null }> = {};

    for (const field of Object.keys(initialValues) as (keyof T)[]) {
      const rules = validationRules[field] as FieldValidation<T[typeof field]> | undefined;
      if (!rules) continue;

      for (const rule of rules) {
        if (!rule.validate(values[field], values)) {
          newErrors[field] = rule.message;
          isValid = false;
          break;
        }
      }

      if (!newErrors[field]) {
        newErrors[field] = null;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [initialValues, values, validationRules]);

  // Set a field value
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    setDirty(prev => ({ ...prev, [field]: value !== initialValuesRef.current[field] }));

    if (validateOnChange) {
      // Delay validation to allow state to update
      setTimeout(() => validateField(field), 0);
    }
  }, [validateOnChange, validateField]);

  // Set multiple values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));

    const newDirty: Partial<{ [K in keyof T]: boolean }> = {};
    for (const key of Object.keys(newValues) as (keyof T)[]) {
      newDirty[key] = newValues[key] !== initialValuesRef.current[key];
    }
    setDirty(prev => ({ ...prev, ...newDirty }));
  }, []);

  // Set field error
  const setError = useCallback(<K extends keyof T>(field: K, error: string | null) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  // Mark field as touched
  const setTouchedField = useCallback(<K extends keyof T>(field: K, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));

    if (validateOnBlur && isTouched) {
      validateField(field);
    }
  }, [validateOnBlur, validateField]);

  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValuesRef.current);
    setErrors({});
    setTouched({});
    setDirty({});
    setSubmitError(null);
  }, []);

  // Reset a single field
  const resetField = useCallback(<K extends keyof T>(field: K) => {
    setValuesState(prev => ({ ...prev, [field]: initialValuesRef.current[field] }));
    setErrors(prev => ({ ...prev, [field]: null }));
    setTouched(prev => ({ ...prev, [field]: false }));
    setDirty(prev => ({ ...prev, [field]: false }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();

    setSubmitCount(prev => prev + 1);
    setSubmitError(null);

    // Mark all fields as touched
    const allTouched: Partial<{ [K in keyof T]: boolean }> = {};
    for (const key of Object.keys(initialValues) as (keyof T)[]) {
      allTouched[key] = true;
    }
    setTouched(allTouched);

    // Validate
    if (!validateForm()) {
      return;
    }

    if (!onSubmit) return;

    setIsSubmitting(true);

    try {
      // Sanitize values to prevent XSS attacks
      let finalValues = sanitize
        ? sanitizeFormData(values, {
            richTextFields,
            skipFields: skipSanitizeFields,
          })
        : values;

      // Apply custom transformation if provided
      if (transformValues) {
        finalValues = transformValues(finalValues);
      }

      await onSubmit(finalValues);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      setSubmitError(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [initialValues, validateForm, onSubmit, transformValues, values, sanitize, richTextFields, skipSanitizeFields]);

  // Get props for a field input
  const getFieldProps = useCallback(<K extends keyof T>(field: K) => {
    return {
      name: field,
      value: values[field],
      onChange: (e: { target: { value: T[K] } } | T[K]) => {
        const value = (e && typeof e === 'object' && 'target' in e)
          ? e.target.value
          : e;
        setValue(field, value as T[K]);
      },
      onBlur: () => setTouchedField(field),
      'aria-invalid': !!errors[field],
      'aria-describedby': errors[field] ? `${String(field)}-error` : undefined,
    };
  }, [values, errors, setValue, setTouchedField]);

  // Register a field (for uncontrolled inputs)
  const register = useCallback(<K extends keyof T>(field: K) => {
    return {
      name: field,
      ref: (el: HTMLInputElement | null) => {
        fieldRefs.current[field as string] = el;
      },
      onChange: (e: { target: { value: unknown } }) => {
        setValue(field, e.target.value as T[K]);
      },
      onBlur: () => setTouchedField(field),
    };
  }, [setValue, setTouchedField]);

  // Calculate derived state
  const isValid = useMemo(() => {
    return Object.values(errors).every(error => !error);
  }, [errors]);

  const isDirty = useMemo(() => {
    return Object.values(dirty).some(d => d);
  }, [dirty]);

  return {
    values,
    errors,
    touched,
    dirty,
    isValid,
    isDirty,
    isSubmitting,
    submitError,
    submitCount,
    setValue,
    setValues,
    setError,
    setTouched: setTouchedField,
    validateField,
    validateForm,
    reset,
    resetField,
    handleSubmit,
    getFieldProps,
    register,
  };
}

// ============================================
// Common Validation Rules
// ============================================

export const validators = {
  required: (message = 'This field is required'): ValidationRule<unknown> => ({
    validate: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message,
  }),

  email: (message = 'Invalid email address'): ValidationRule<string> => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length >= min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length <= max,
    message: message || `Must be at most ${max} characters`,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value) => regex.test(value),
    message,
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value >= min,
    message: message || `Must be at least ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value <= max,
    message: message || `Must be at most ${max}`,
  }),

  match: <T>(field: keyof T, message: string): ValidationRule<unknown> => ({
    validate: (value, allValues) => value === allValues[field as string],
    message,
  }),

  custom: <T>(
    validateFn: (value: T, allValues: Record<string, unknown>) => boolean,
    message: string
  ): ValidationRule<T> => ({
    validate: validateFn,
    message,
  }),
};

export default useForm;
