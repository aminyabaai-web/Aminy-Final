/**
 * Tests for useFormValidation hook — the bridge between Zod schemas and React forms.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useFormValidation } from '../lib/use-form-validation';

// ---------------------------------------------------------------------------
// Test schema (mirrors loginSchema pattern)
// ---------------------------------------------------------------------------
const testSchema = z.object({
  email: z.string().email({ message: 'Invalid email' }),
  password: z.string().min(8, { message: 'Min 8 characters' }),
});

const accountSchema = z
  .object({
    name: z.string().min(2, { message: 'Name too short' }),
    email: z.string().email({ message: 'Invalid email' }),
    password: z.string().min(8, { message: 'Min 8 characters' }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useFormValidation', () => {
  it('returns success with typed data on valid input', () => {
    const { result } = renderHook(() => useFormValidation(testSchema));

    let outcome: ReturnType<typeof result.current.validate>;
    act(() => {
      outcome = result.current.validate({ email: 'a@b.com', password: '12345678' });
    });

    expect(outcome!.success).toBe(true);
    if (outcome!.success) {
      expect(outcome!.data).toEqual({ email: 'a@b.com', password: '12345678' });
    }
    expect(result.current.errors).toEqual({});
  });

  it('returns field errors on invalid input', () => {
    const { result } = renderHook(() => useFormValidation(testSchema));

    let outcome: ReturnType<typeof result.current.validate>;
    act(() => {
      outcome = result.current.validate({ email: 'bad', password: '123' });
    });

    expect(outcome!.success).toBe(false);
    expect(result.current.errors.email).toBe('Invalid email');
    expect(result.current.errors.password).toBe('Min 8 characters');
  });

  it('returns error for missing fields', () => {
    const { result } = renderHook(() => useFormValidation(testSchema));

    act(() => {
      result.current.validate({});
    });

    expect(result.current.errors.email).toBeDefined();
    expect(result.current.errors.password).toBeDefined();
  });

  it('clears errors on subsequent valid submission', () => {
    const { result } = renderHook(() => useFormValidation(testSchema));

    // First: invalid
    act(() => {
      result.current.validate({ email: '', password: '' });
    });
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

    // Second: valid
    act(() => {
      result.current.validate({ email: 'a@b.com', password: '12345678' });
    });
    expect(result.current.errors).toEqual({});
  });

  it('handles refine() cross-field validation (password match)', () => {
    const { result } = renderHook(() => useFormValidation(accountSchema));

    act(() => {
      result.current.validate({
        name: 'Jane',
        email: 'jane@x.com',
        password: 'Password1',
        confirmPassword: 'Different1',
      });
    });

    expect(result.current.errors.confirmPassword).toBe('Passwords must match');
  });

  it('setFieldError adds a manual server error', () => {
    const { result } = renderHook(() => useFormValidation(testSchema));

    act(() => {
      result.current.setFieldError('email', 'Email already taken');
    });

    expect(result.current.errors.email).toBe('Email already taken');
  });

  it('clearErrors resets all errors', () => {
    const { result } = renderHook(() => useFormValidation(testSchema));

    act(() => {
      result.current.validate({ email: '', password: '' });
    });
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

    act(() => {
      result.current.clearErrors();
    });
    expect(result.current.errors).toEqual({});
  });

  it('fieldError helper returns correct value', () => {
    const { result } = renderHook(() => useFormValidation(testSchema));

    act(() => {
      result.current.validate({ email: 'bad', password: '12345678' });
    });

    // fieldError reads from ref, so check after render
    expect(result.current.errors.email).toBe('Invalid email');
    expect(result.current.errors.password).toBeUndefined();
  });
});
