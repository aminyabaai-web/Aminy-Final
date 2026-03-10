/**
 * Shared Error Handler for Supabase Edge Functions
 *
 * Provides a standardized error response envelope across all functions.
 * Replaces 3 inconsistent error patterns (raw strings, { error }, { error, message }).
 *
 * Usage:
 *   import { AppError, errorResponse } from '../_shared/error-handler.ts';
 *
 *   // Throw structured errors:
 *   throw new AppError('User not found', 404, 'USER_NOT_FOUND');
 *
 *   // Catch and return:
 *   catch (err) { return errorResponse(err); }
 */

import { corsHeaders } from './cors.ts';

/**
 * Structured application error with HTTP status code and error code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Standard error response envelope:
 * {
 *   error: "ERROR_CODE",
 *   message: "Human-readable description",
 *   timestamp: "2024-03-08T12:00:00.000Z",
 *   details?: { ... }
 * }
 */
export function errorResponse(
  error: unknown,
  defaultStatus = 500
): Response {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({
        error: error.code,
        message: error.message,
        timestamp,
        ...(error.details ? { details: error.details } : {}),
      }),
      {
        status: error.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const statusCode = (error as any).statusCode || defaultStatus;
    return new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        timestamp,
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle unknown error types
  return new Response(
    JSON.stringify({
      error: 'UNKNOWN_ERROR',
      message: String(error) || 'An unexpected error occurred',
      timestamp,
    }),
    {
      status: defaultStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Standard success response envelope:
 * {
 *   data: { ... },
 *   timestamp: "2024-03-08T12:00:00.000Z"
 * }
 */
export function successResponse(
  data: unknown,
  status = 200
): Response {
  return new Response(
    JSON.stringify({
      data,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Helper to safely extract error message from unknown catch values.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}
