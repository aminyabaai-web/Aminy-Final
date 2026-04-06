// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Accessible Form Error Component
 *
 * Announces form errors to screen readers via aria-live region,
 * associates error messages with form fields via aria-describedby,
 * and moves focus to the first error field on submit.
 *
 * WCAG 2.1 compliance:
 * - 1.3.1: Info and Relationships (programmatic label association)
 * - 3.3.1: Error Identification (errors clearly described)
 * - 3.3.2: Labels or Instructions (errors linked to fields)
 * - 4.1.3: Status Messages (aria-live announcements)
 *
 * Usage:
 *   <AccessibleFormError
 *     fieldId="email"
 *     error={errors.email}
 *   />
 *
 *   // The associated input should have:
 *   // <input id="email" aria-describedby="email-error" aria-invalid={!!errors.email} />
 */

import React, { useEffect, useRef } from 'react';

// ============================================================================
// Single Field Error
// ============================================================================

export interface AccessibleFormErrorProps {
  /** ID of the associated form field (used to generate error element ID) */
  fieldId: string;
  /** Error message to display (null/undefined = no error) */
  error?: string | null;
  /** CSS class for styling */
  className?: string;
  /** Whether to announce the error immediately (default: true) */
  announce?: boolean;
}

export const AccessibleFormError: React.FC<AccessibleFormErrorProps> = ({
  fieldId,
  error,
  className = '',
  announce = true,
}) => {
  const errorId = `${fieldId}-error`;
  const announcerRef = useRef<HTMLDivElement>(null);

  // Announce error to screen readers when it changes
  useEffect(() => {
    if (error && announce && announcerRef.current) {
      // Clear then set to force re-announcement
      announcerRef.current.textContent = '';
      requestAnimationFrame(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = `Error: ${error}`;
        }
      });
    }
  }, [error, announce]);

  if (!error) return null;

  return (
    <>
      {/* Visible error message linked to the input via aria-describedby */}
      <div
        id={errorId}
        role="alert"
        className={`accessible-form-error ${className}`}
        style={{
          color: '#dc2626',
          fontSize: '13px',
          lineHeight: 1.4,
          marginTop: '4px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '4px',
        }}
      >
        {/* Error icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0, marginTop: '2px' }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{error}</span>
      </div>

      {/* Screen reader announcement (visually hidden) */}
      {announce && (
        <div
          ref={announcerRef}
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        />
      )}
    </>
  );
};

// ============================================================================
// Form Error Summary — shows all errors at once
// ============================================================================

export interface FormErrorSummaryProps {
  /** Map of field names to error messages */
  errors: Record<string, string | null | undefined>;
  /** Whether the form has been submitted (only show after first submit) */
  hasSubmitted?: boolean;
  /** Callback when a field link is clicked */
  onFieldClick?: (fieldId: string) => void;
  /** Title for the error summary */
  title?: string;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  hasSubmitted = false,
  onFieldClick,
  title = 'Please fix the following errors:',
}) => {
  const summaryRef = useRef<HTMLDivElement>(null);
  const activeErrors = Object.entries(errors).filter(([, msg]) => !!msg);

  // Focus the summary when errors appear after submit
  useEffect(() => {
    if (hasSubmitted && activeErrors.length > 0 && summaryRef.current) {
      summaryRef.current.focus();
    }
  }, [hasSubmitted, activeErrors.length]);

  if (!hasSubmitted || activeErrors.length === 0) return null;

  return (
    <div
      ref={summaryRef}
      role="alert"
      aria-label={`${activeErrors.length} form error${activeErrors.length !== 1 ? 's' : ''}`}
      tabIndex={-1}
      style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      <h3
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#991b1b',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h3>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {activeErrors.map(([field, message]) => (
          <li
            key={field}
            style={{
              fontSize: '13px',
              color: '#dc2626',
              padding: '4px 0',
            }}
          >
            {onFieldClick ? (
              <button
                type="button"
                onClick={() => onFieldClick(field)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  padding: 0,
                  fontFamily: 'inherit',
                  minHeight: '44px',
                  minWidth: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                aria-label={`Go to ${field} field: ${message}`}
              >
                {message}
              </button>
            ) : (
              <span>{message}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AccessibleFormError;
