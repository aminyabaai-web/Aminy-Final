/**
 * AuthCallback - Handles OAuth redirects and password reset tokens
 *
 * This component handles:
 * 1. OAuth callbacks from Google/Apple sign-in
 * 2. Password reset token processing
 * 3. Email confirmation redirects
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { Logo } from './Logo';

interface AuthCallbackProps {
  onAuthSuccess: (email: string) => void;
  onPasswordReset: () => void;
  onError: (message: string) => void;
}

export function AuthCallback({ onAuthSuccess, onPasswordReset, onError }: AuthCallbackProps) {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your request...');

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
          setMessage('Redirecting to password reset...');
          setStatus('success');
          // Give user a moment to see the message
          setTimeout(() => {
            onPasswordReset();
          }, 1000);
          return;
        }

        // For OAuth, Supabase automatically handles the session from the URL
        // We just need to check if we have a session now
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setMessage('Sign in successful! Redirecting...');
          setStatus('success');
          setTimeout(() => {
            onAuthSuccess(session.user.email || '');
          }, 1000);
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
              setMessage('Email confirmed! Redirecting...');
              setStatus('success');
              setTimeout(() => {
                onAuthSuccess(data.session.user.email || '');
              }, 1000);
              return;
            }
          }

          // If we still don't have a session, something went wrong
          throw new Error('Unable to complete sign in. Please try again.');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setMessage(err.message || 'An error occurred during sign in.');
        setStatus('error');
        setTimeout(() => {
          onError(err.message || 'Authentication failed');
        }, 2000);
      }
    };

    handleCallback();
  }, [onAuthSuccess, onPasswordReset, onError]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#F5F5F5' }}
    >
      <div className="text-center max-w-md">
        <div className="mb-8">
          <Logo size="md" showTagline={false} />
        </div>

        {status === 'processing' && (
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div
              className="w-10 h-10 border-3 rounded-full animate-spin"
              style={{
                borderColor: 'rgba(87, 117, 144, 0.2)',
                borderTopColor: '#577590',
              }}
            />
            <p
              className="text-lg"
              style={{ color: '#0D1B2A', opacity: 0.7 }}
            >
              {message}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)' }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#4CAF50"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p
              className="text-lg font-medium"
              style={{ color: '#0D1B2A' }}
            >
              {message}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)' }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#F44336"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p
              className="text-lg"
              style={{ color: '#F44336' }}
            >
              {message}
            </p>
            <p
              className="text-sm"
              style={{ color: '#0D1B2A', opacity: 0.6 }}
            >
              Redirecting you back...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthCallback;
