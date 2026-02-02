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
      style={{
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F7 100%)'
      }}
    >
      {/* Card container */}
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center"
        style={{
          boxShadow: '0 4px 24px rgba(13, 27, 42, 0.08), 0 1px 3px rgba(13, 27, 42, 0.04)'
        }}
      >
        <div className="mb-6">
          <Logo size="md" showTagline={false} />
        </div>

        {status === 'processing' && (
          <div className="flex flex-col items-center gap-5">
            {/* Premium spinner */}
            <div className="relative w-14 h-14">
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  border: '3px solid transparent',
                  borderTopColor: '#577590',
                  borderRightColor: '#577590',
                }}
              />
              <div
                className="absolute inset-2 rounded-full animate-pulse"
                style={{
                  backgroundColor: 'rgba(87, 117, 144, 0.08)',
                }}
              />
            </div>
            <div>
              <p
                className="text-base font-medium mb-1"
                style={{ color: '#0D1B2A' }}
              >
                {message}
              </p>
              <p
                className="text-sm"
                style={{ color: '#577590' }}
              >
                This will only take a moment
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                animation: 'scaleIn 0.3s ease-out'
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#4CAF50"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p
                className="text-base font-medium"
                style={{ color: '#0D1B2A' }}
              >
                {message}
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)' }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#F44336"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p
                className="text-base font-medium mb-1"
                style={{ color: '#F44336' }}
              >
                {message}
              </p>
              <p
                className="text-sm"
                style={{ color: '#577590' }}
              >
                Redirecting you back...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Subtle branding footer */}
      <p
        className="mt-6 text-xs"
        style={{ color: 'rgba(13, 27, 42, 0.4)' }}
      >
        Secured by Aminy
      </p>
    </div>
  );
}

export default AuthCallback;
