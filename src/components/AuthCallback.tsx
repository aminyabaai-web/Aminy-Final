/**
 * AuthCallback - Handles OAuth redirects and password reset tokens
 *
 * Premium, calm design matching the app's aesthetic.
 * Handles:
 * 1. OAuth callbacks from Google/Apple sign-in
 * 2. Password reset token processing
 * 3. Email confirmation redirects
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../utils/supabase/client';
import aminyLogoCropped from "../assets/aminy-logo-cropped.png";

interface AuthCallbackProps {
  onAuthSuccess: (email: string) => void;
  onPasswordReset: () => void;
  onError: (message: string) => void;
}

const fontStack = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const fontSmoothing: React.CSSProperties = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'geometricPrecision',
} as React.CSSProperties;

export function AuthCallback({ onAuthSuccess, onPasswordReset, onError }: AuthCallbackProps) {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Signing you in');
  const [subMessage, setSubMessage] = useState('Please wait a moment...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the URL hash and query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        // Check for error in URL
        const error = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

        if (error) {
          throw new Error(errorDescription || error);
        }

        // Check if this is a password recovery
        const type = hashParams.get('type') || queryParams.get('type');

        if (type === 'recovery') {
          setMessage('Password reset ready');
          setSubMessage('Taking you to reset your password...');
          setStatus('success');
          setTimeout(() => {
            onPasswordReset();
          }, 1200);
          return;
        }

        // For OAuth, Supabase automatically handles the session from the URL
        // We just need to check if we have a session now
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setMessage('Welcome back');
          setSubMessage('Preparing your dashboard...');
          setStatus('success');
          setTimeout(() => {
            onAuthSuccess(session.user.email || '');
          }, 1200);
        } else {
          // No session and no error - might be email confirmation
          const accessToken = hashParams.get('access_token');
          if (accessToken) {
            // Try to get session with the access token
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              throw refreshError;
            }
            if (data.session?.user) {
              setMessage('Email confirmed');
              setSubMessage('Your account is ready...');
              setStatus('success');
              setTimeout(() => {
                onAuthSuccess(data.session.user.email || '');
              }, 1200);
              return;
            }
          }

          // If we still don't have a session, something went wrong
          throw new Error('Unable to complete sign in. Please try again.');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setMessage('Something went wrong');
        setSubMessage(err.message || 'Please try signing in again.');
        setStatus('error');
        setTimeout(() => {
          onError(err.message || 'Authentication failed');
        }, 2500);
      }
    };

    handleCallback();
  }, [onAuthSuccess, onPasswordReset, onError]);

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-6"
      style={{
        backgroundColor: '#F8F8F6',
        fontFamily: fontStack,
        ...fontSmoothing,
      }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: '48px' }}
      >
        <img
          src={aminyLogoCropped}
          alt="Aminy"
          style={{
            width: '140px',
            aspectRatio: '827 / 338',
            objectFit: 'contain',
          }}
        />
      </motion.div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          width: '100%',
          maxWidth: '320px',
          textAlign: 'center',
        }}
      >
        {/* Status Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '28px',
          }}
        >
          {status === 'processing' && (
            <div
              style={{
                width: '56px',
                height: '56px',
                position: 'relative',
              }}
            >
              {/* Outer spinning ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2.5px solid transparent',
                  borderTopColor: '#5a7380',
                  borderRightColor: 'rgba(90, 115, 128, 0.3)',
                }}
              />
              {/* Inner pulsing circle */}
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(90, 115, 128, 0.15)',
                }}
              />
            </div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(76, 175, 80, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <motion.svg
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4CAF50"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  d="M5 13l4 4L19 7"
                />
              </motion.svg>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </motion.div>
          )}
        </motion.div>

        {/* Message */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{
            color: status === 'error' ? '#DC2626' : 'rgba(17, 24, 39, 0.88)',
            fontFamily: fontStack,
            fontWeight: 600,
            fontSize: '20px',
            letterSpacing: '-0.01em',
            marginBottom: '8px',
            ...fontSmoothing,
          }}
        >
          {message}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          style={{
            color: 'rgba(17, 24, 39, 0.5)',
            fontFamily: fontStack,
            fontWeight: 400,
            fontSize: '14px',
            lineHeight: 1.5,
            ...fontSmoothing,
          }}
        >
          {subMessage}
        </motion.p>

        {/* Progress bar for processing state */}
        {status === 'processing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            style={{
              marginTop: '32px',
              height: '3px',
              backgroundColor: 'rgba(90, 115, 128, 0.15)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                height: '100%',
                width: '40%',
                backgroundColor: '#5a7380',
                borderRadius: '2px',
              }}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Subtle footer with badge styling */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        style={{
          position: 'absolute',
          bottom: '32px',
          display: 'flex',
          gap: '8px',
        }}
      >
        {['Secure', 'Private', 'HIPAA-Conscious'].map((text) => (
          <span
            key={text}
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(17, 24, 39, 0.04)',
              borderRadius: '10px',
              color: 'rgba(17, 24, 39, 0.35)',
              fontFamily: fontStack,
              fontSize: '10px',
              fontWeight: 450,
              letterSpacing: '0.01em',
              ...fontSmoothing,
            }}
          >
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default AuthCallback;
