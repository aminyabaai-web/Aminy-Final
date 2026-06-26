// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Session Timeout Dialog
 *
 * HIPAA-compliant warning dialog shown when a user has been idle on
 * a PHI screen for the configured timeout period.
 *
 * Features:
 * - Countdown timer showing seconds until auto-logout
 * - "Stay signed in" button to dismiss and reset the timer
 * - Accessible: focus-trapped, aria-live countdown, keyboard support
 * - Auto-logout when countdown reaches 0
 *
 * Usage:
 *   <SessionTimeoutDialog
 *     isOpen={isWarningVisible}
 *     remainingSeconds={remainingSeconds}
 *     onStaySignedIn={staySignedIn}
 *   />
 */

import React, { useEffect, useRef } from 'react';

export interface SessionTimeoutDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Seconds remaining before auto-logout */
  remainingSeconds: number;
  /** Callback when user clicks "Stay signed in" */
  onStaySignedIn: () => void;
  /** Optional callback when user clicks "Log out now" */
  onLogoutNow?: () => void;
}

export const SessionTimeoutDialog: React.FC<SessionTimeoutDialogProps> = ({
  isOpen,
  remainingSeconds,
  onStaySignedIn,
  onLogoutNow,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const stayButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the "Stay signed in" button when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let React render
      const timer = setTimeout(() => {
        stayButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Trap focus within dialog
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const container = dialogRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onStaySignedIn();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onStaySignedIn]);

  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds} second${seconds !== 1 ? 's' : ''}`;

  const urgency = remainingSeconds <= 10 ? 'high' : remainingSeconds <= 30 ? 'medium' : 'low';

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 99998,
        }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label="Session timeout warning"
        aria-describedby="session-timeout-message"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99999,
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          width: 'calc(100% - 48px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
        }}
      >
        {/* Warning icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: urgency === 'high' ? '#fef2f2' : '#fff7ed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
          aria-hidden="true"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke={urgency === 'high' ? '#dc2626' : '#f59e0b'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 8px',
          }}
        >
          Your session is about to expire
        </h2>

        {/* Message */}
        <p
          id="session-timeout-message"
          style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '0 0 20px',
            lineHeight: 1.5,
          }}
        >
          For your security, you will be automatically logged out due to inactivity.
        </p>

        {/* Countdown */}
        <div
          aria-live="assertive"
          aria-atomic="true"
          style={{
            fontSize: '32px',
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: urgency === 'high' ? '#dc2626' : urgency === 'medium' ? '#f59e0b' : '#111827',
            margin: '0 0 24px',
            letterSpacing: '-0.02em',
          }}
        >
          {timeDisplay}
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <button
            ref={stayButtonRef}
            onClick={onStaySignedIn}
            type="button"
            style={{
              width: '100%',
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#ffffff',
              backgroundColor: '#2A7D99',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              minHeight: '48px',
              minWidth: '44px',
            }}
            aria-label="Stay signed in and continue your session"
          >
            Stay signed in
          </button>

          {onLogoutNow && (
            <button
              onClick={onLogoutNow}
              type="button"
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#6b7280',
                backgroundColor: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                minHeight: '44px',
                minWidth: '44px',
              }}
              aria-label="Log out now"
            >
              Log out now
            </button>
          )}
        </div>

        {/* HIPAA notice */}
        <p
          style={{
            fontSize: '11px',
            color: '#9ca3af',
            margin: '16px 0 0',
            lineHeight: 1.4,
          }}
        >
          This timeout protects your health information in compliance with HIPAA security requirements.
        </p>
      </div>
    </>
  );
};

export default SessionTimeoutDialog;
