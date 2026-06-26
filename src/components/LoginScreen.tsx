// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * LoginScreen - Premium sign-in experience
 * Matches the calm/Apple-inspired aesthetic of the splash page
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuthRateLimit } from '../lib/security/auth-rate-limit';
import { useFormValidation } from '../lib/use-form-validation';
import { loginSchema } from '../lib/schemas';
import aminyLogoCropped from "../assets/aminy-logo-cropped.png";

interface LoginScreenProps {
  onBack: () => void;
  onLogin: (email: string) => void;
  onForgotPassword?: () => void;
  onCreateAccount: () => void;
}

const fontStack = "'Schibsted Grotesk', 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif";

const fontSmoothing: React.CSSProperties = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'geometricPrecision',
} as React.CSSProperties;

export function LoginScreen({
  onBack,
  onLogin,
  onForgotPassword,
  onCreateAccount,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { errors, validate, setFieldError, clearErrors, setErrors } = useFormValidation(loginSchema);
  const [isLoading, setIsLoading] = useState(false);

  const { limited, message: rateLimitMessage, recordFailure, recordSuccess, checkRateLimit } = useAuthRateLimit();

  useEffect(() => {
    checkRateLimit();
  }, [checkRateLimit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (limited) {
      setErrors({ signin: rateLimitMessage || 'Too many attempts. Please try again later.' });
      return;
    }

    const result = validate({ email, password });
    if (!result.success) return;

    setIsLoading(true);
    clearErrors();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const rateLimitResult = recordFailure();
        let errorMessage: string;

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Email or password is incorrect";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please confirm your email first";
        } else {
          errorMessage = error.message;
        }

        if (rateLimitResult.message) {
          errorMessage = `${errorMessage}. ${rateLimitResult.message}`;
        }

        throw new Error(errorMessage);
      }

      recordSuccess();
      if (data.user) {
        onLogin(data.user.email || email);
      }
    } catch (error) {
      setErrors({
        signin: error instanceof Error ? error.message : "Something went wrong. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setErrors({});
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw new Error(error.message);
    } catch (error) {
      setErrors({
        signin: error instanceof Error ? error.message : "Apple sign in failed"
      });
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrors({});
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw new Error(error.message);
    } catch (error) {
      setErrors({
        signin: error instanceof Error ? error.message : "Google sign in failed"
      });
      setIsLoading(false);
    }
  };

  const clearError = (field: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex flex-col overflow-y-auto pb-6"
      style={{
        background: 'linear-gradient(180deg, #F6FBFB 0%, #EAF3F7 55%, #E4EFF5 100%)',
        fontFamily: fontStack,
        ...fontSmoothing,
      }}
    >
      {/* Back Button */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="px-6 py-5"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 transition-all hover:opacity-60"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 450,
              ...fontSmoothing,
            }}
          >
            Back
          </span>
        </button>
      </motion.nav>

      {/* Main Content */}
      <main
        className="flex-1 flex flex-col items-center px-6"
        style={{
          paddingTop: 'clamp(24px, 6vh, 48px)',
          paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '380px' }}>
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '40px',
            }}
          >
            <img
              src={aminyLogoCropped}
              alt="Aminy"
              style={{
                width: 'min(55vw, 220px)',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ textAlign: 'center', marginBottom: '36px' }}
          >
            <h1
              style={{
                color: 'var(--color-text-deep)',
                fontFamily: fontStack,
                fontWeight: 600,
                fontSize: 'clamp(1.5rem, 5vw, 1.75rem)',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                marginBottom: '8px',
                ...fontSmoothing,
              }}
            >
              Welcome back
            </h1>
            <h2 className="sr-only">Sign in options</h2>
            <h3 className="sr-only">Email sign in form</h3>
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontFamily: fontStack,
                fontWeight: 400,
                fontSize: '15px',
                ...fontSmoothing,
              }}
            >
              Sign in to support your child.
            </p>
          </motion.div>

          {/* Error Message */}
          {errors.signin && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '24px',
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
              }}
            >
              <div className="flex items-center gap-3">
                <AlertCircle style={{ width: '18px', height: '18px', color: '#DC2626', flexShrink: 0 }} />
                <p
                  style={{
                    color: '#DC2626',
                    fontSize: '14px',
                    fontWeight: 450,
                    ...fontSmoothing,
                  }}
                >
                  {errors.signin}
                </p>
              </div>
            </motion.div>
          )}

          {/* OAuth Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}
          >
            <button
              onClick={handleAppleSignIn}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                height: '52px',
                backgroundColor: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px)',
                color: 'var(--color-text-deep)',
                fontFamily: fontStack,
                fontWeight: 500,
                fontSize: '15px',
                borderRadius: '14px',
                border: '1px solid rgba(42,125,153,0.18)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'opacity 0.2s ease, transform 0.1s ease, background-color 0.2s ease',
                ...fontSmoothing,
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.98)')}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.92)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseDown={(e) => !isLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09z"/>
                <path d="M15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
              Continue with Apple
            </button>

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                height: '52px',
                backgroundColor: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px)',
                color: 'var(--color-text-primary)',
                fontFamily: fontStack,
                fontWeight: 500,
                fontSize: '15px',
                borderRadius: '14px',
                border: '1px solid rgba(42,125,153,0.18)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'opacity 0.2s ease, transform 0.1s ease, background-color 0.2s ease',
                ...fontSmoothing,
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.98)')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.92)'}
              onMouseDown={(e) => !isLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-soft)' }} />
            <span
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '13px',
                fontWeight: 450,
                ...fontSmoothing,
              }}
            >
              or
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border-soft)' }} />
          </motion.div>

          {/* Email Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  ...fontSmoothing,
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) clearError('email');
                }}
                placeholder="you@example.com"
                disabled={isLoading}
                autoComplete="email"
                style={{
                  width: '100%',
                  height: '52px',
                  padding: '0 16px',
                  backgroundColor: 'var(--color-surface)',
                  border: errors.email ? '2px solid #DC2626' : '1px solid var(--color-input-border)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontFamily: fontStack,
                  color: 'var(--color-text-deep)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  ...fontSmoothing,
                }}
                onFocus={(e) => {
                  if (!errors.email) {
                    e.currentTarget.style.borderColor = '#2A7D99';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(42,125,153,0.12)';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.email) {
                    e.currentTarget.style.borderColor = 'var(--color-input-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              />
              {errors.email && (
                <p
                  style={{
                    marginTop: '6px',
                    color: '#DC2626',
                    fontSize: '13px',
                    fontWeight: 450,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    ...fontSmoothing,
                  }}
                >
                  <AlertCircle style={{ width: '14px', height: '14px' }} />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  ...fontSmoothing,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) clearError('password');
                  }}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 48px 0 16px',
                    backgroundColor: 'var(--color-surface)',
                    border: errors.password ? '2px solid #DC2626' : '1px solid var(--color-input-border)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontFamily: fontStack,
                    color: 'var(--color-text-deep)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    ...fontSmoothing,
                  }}
                  onFocus={(e) => {
                    if (!errors.password) {
                      e.currentTarget.style.borderColor = '#2A7D99';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(42,125,153,0.12)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.password) {
                      e.currentTarget.style.borderColor = 'var(--color-input-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(17, 24, 39, 0.7)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(17, 24, 39, 0.4)'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p
                  style={{
                    marginTop: '6px',
                    color: '#DC2626',
                    fontSize: '13px',
                    fontWeight: 450,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    ...fontSmoothing,
                  }}
                >
                  <AlertCircle style={{ width: '14px', height: '14px' }} />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Forgot Password */}
            {onForgotPassword && (
              <div style={{ textAlign: 'right', marginTop: '-8px' }}>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#376E80',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '4px 0',
                    transition: 'opacity 0.2s ease',
                    ...fontSmoothing,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="action-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                height: '52px',
                marginTop: '8px',
                backgroundColor: '#2A7D99',
                color: '#FFFFFF',
                fontFamily: fontStack,
                fontWeight: 500,
                fontSize: '15px',
                letterSpacing: '-0.008em',
                borderRadius: '14px',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'background-color 0.2s ease, transform 0.1s ease',
                ...fontSmoothing,
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#216982')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2A7D99'}
              onMouseDown={(e) => !isLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isLoading ? (
                <>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFFFFF',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </motion.form>

          {/* Create Account Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            style={{
              textAlign: 'center',
              marginTop: '28px',
            }}
          >
            <span
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '14px',
                ...fontSmoothing,
              }}
            >
              Don't have an account?
            </span>{' '}
            <button
              onClick={onCreateAccount}
              disabled={isLoading}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#376E80',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationColor: 'rgba(42,125,153,0.3)',
                textUnderlineOffset: '2px',
                transition: 'opacity 0.2s ease',
                ...fontSmoothing,
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Create one
            </button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '40px',
            }}
          >
            {['Secure', 'Private', 'HIPAA-Conscious'].map((text) => (
              <span
                key={text}
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid var(--color-border-soft)',
                  borderRadius: '10px',
                  color: 'var(--color-text-muted)',
                  fontFamily: fontStack,
                  fontSize: '12px',
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
      </main>

      {/* Keyframes for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LoginScreen;
