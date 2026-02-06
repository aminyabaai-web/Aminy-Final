/**
 * CreateAccountScreen - Calm, Apple-level Premium Signup
 *
 * Design Philosophy:
 * - Emotional safety over conversion optimization
 * - Restraint over feature promotion
 * - Whitespace as a design element
 * - Typography that breathes
 *
 * Inspired by: Calm, Apple Health, Headspace
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, ArrowLeft, ArrowRight, AlertCircle, Check, Loader2 } from 'lucide-react';
import aminyLogoCropped from "../assets/aminy-logo-cropped.png";
import { supabase } from '../utils/supabase/client';

const fontStack = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const fontSmoothing: React.CSSProperties = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'geometricPrecision',
} as React.CSSProperties;

// Apple icon SVG
const AppleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

// Google icon SVG
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

interface CreateAccountScreenProps {
  onBack: () => void;
  onCreateAccount: (email: string) => void;
  onLogin: () => void;
}

export function CreateAccountScreen({
  onBack,
  onCreateAccount,
  onLogin
}: CreateAccountScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    signup?: string;
    terms?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const fullNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fullNameRef.current?.focus();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Please enter your name";
    }

    if (!email) {
      newErrors.email = "Please enter your email";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Please create a password";
    } else if (password.length < 8) {
      newErrors.password = "At least 8 characters needed";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    if (!acceptedTerms) {
      newErrors.terms = "Please accept to continue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        // Map Supabase errors to user-friendly messages
        if (error.message.includes('User already registered')) {
          throw new Error("An account with this email already exists. Try signing in instead.");
        } else if (error.message.includes('Password')) {
          throw new Error("Password must be at least 8 characters.");
        } else {
          throw new Error(error.message);
        }
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          // Email already exists but not confirmed
          throw new Error("An account with this email already exists. Please check your email for a confirmation link.");
        }
        onCreateAccount(email);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setErrors({
        signup: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [socialAuthLoading, setSocialAuthLoading] = useState<'apple' | 'google' | null>(null);

  const handleSocialAuth = async (provider: 'apple' | 'google') => {
    setSocialAuthLoading(provider);
    setErrors({});

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
        },
      });

      if (error) {
        throw error;
      }

      // The user will be redirected to the OAuth provider
      // On success, they'll be redirected back to /auth/callback
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unable to sign in with ${provider}. Please try again.`;
      console.error(`${provider} auth error:`, error);
      setErrors({
        signup: errorMessage
      });
      setSocialAuthLoading(null);
    }
  };

  const clearError = (field: keyof typeof errors) => {
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Common input styles
  const inputStyles: React.CSSProperties = {
    width: '100%',
    height: '44px',
    backgroundColor: '#FFFFFF',
    border: '1px solid rgba(17, 24, 39, 0.1)',
    borderRadius: '12px',
    padding: '0 16px',
    fontSize: '15px',
    fontFamily: fontStack,
    color: 'rgba(17, 24, 39, 0.88)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    ...fontSmoothing,
  };

  const labelStyles: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    color: 'rgba(17, 24, 39, 0.5)',
    fontFamily: fontStack,
    fontSize: '13px',
    fontWeight: 400,
    ...fontSmoothing,
  };

  return (
    <div
      className="min-h-screen min-h-[100dvh]"
      style={{
        backgroundColor: '#F8F8F6',
        fontFamily: fontStack,
        display: 'flex',
        flexDirection: 'column',
        ...fontSmoothing,
      }}
    >
      {/* Back Navigation */}
      <nav
        style={{
          padding: '12px 20px 4px',
          position: 'sticky',
          top: 0,
          backgroundColor: '#F8F8F6',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(17, 24, 39, 0.45)',
              fontFamily: fontStack,
              fontSize: '14px',
              fontWeight: 400,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'color 0.2s ease',
              ...fontSmoothing,
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(17, 24, 39, 0.65)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(17, 24, 39, 0.45)'}
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            <span>Back</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main
        style={{
          padding: '4px 20px',
          paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
        }}
      >
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>

          {/* Logo - Clean container with NO background elements */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '16px',
              // Explicitly no backgrounds, borders, or shadows
              background: 'none',
              border: 'none',
              boxShadow: 'none',
            }}
          >
            <img
              src={aminyLogoCropped}
              alt="Aminy"
              style={{
                width: 'min(36vw, 120px)',
                aspectRatio: '827 / 338',
                objectFit: 'contain',
                display: 'block',
                // Explicitly no backgrounds or effects
                background: 'none',
                border: 'none',
                boxShadow: 'none',
              }}
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              color: 'rgba(17, 24, 39, 0.9)',
              fontFamily: fontStack,
              fontWeight: 600,
              fontSize: '22px',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              textAlign: 'center',
              marginBottom: '4px',
              ...fontSmoothing,
            }}
          >
            Create your account
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            style={{
              color: 'rgba(17, 24, 39, 0.44)',
              fontFamily: fontStack,
              fontWeight: 400,
              fontSize: '13px',
              lineHeight: 1.5,
              textAlign: 'center',
              marginBottom: '16px',
              ...fontSmoothing,
            }}
          >
            Start your 7-day free trial
          </motion.p>

          {/* Social Auth Buttons - Side by side to save space */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}
          >
            <button
              type="button"
              onClick={() => handleSocialAuth('apple')}
              disabled={isLoading || socialAuthLoading !== null}
              style={{
                flex: 1,
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                fontFamily: fontStack,
                fontWeight: 500,
                fontSize: '13px',
                borderRadius: '10px',
                border: 'none',
                cursor: socialAuthLoading ? 'default' : 'pointer',
                opacity: socialAuthLoading && socialAuthLoading !== 'apple' ? 0.5 : 1,
                transition: 'opacity 0.2s ease',
                ...fontSmoothing,
              }}
            >
              {socialAuthLoading === 'apple' ? (
                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <AppleIcon />
              )}
              {socialAuthLoading === 'apple' ? 'Connecting...' : 'Apple'}
            </button>
            <button
              type="button"
              onClick={() => handleSocialAuth('google')}
              disabled={isLoading || socialAuthLoading !== null}
              style={{
                flex: 1,
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                color: 'rgba(17, 24, 39, 0.8)',
                fontFamily: fontStack,
                fontWeight: 500,
                fontSize: '13px',
                borderRadius: '10px',
                border: '1px solid rgba(17, 24, 39, 0.12)',
                cursor: socialAuthLoading ? 'default' : 'pointer',
                opacity: socialAuthLoading && socialAuthLoading !== 'google' ? 0.5 : 1,
                transition: 'opacity 0.2s ease',
                ...fontSmoothing,
              }}
            >
              {socialAuthLoading === 'google' ? (
                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <GoogleIcon />
              )}
              {socialAuthLoading === 'google' ? 'Connecting...' : 'Google'}
            </button>
          </motion.div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(17, 24, 39, 0.08)' }} />
            <span style={{ color: 'rgba(17, 24, 39, 0.35)', fontSize: '11px', fontFamily: fontStack }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(17, 24, 39, 0.08)' }} />
          </div>

          {/* Error Display */}
          {errors.signup && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(180, 90, 90, 0.06)',
                border: '1px solid rgba(180, 90, 90, 0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertCircle style={{ width: '15px', height: '15px', color: 'rgba(180, 90, 90, 0.7)', flexShrink: 0 }} />
              <p
                style={{
                  fontSize: '13px',
                  color: 'rgba(180, 90, 90, 0.85)',
                  fontFamily: fontStack,
                  margin: 0,
                  ...fontSmoothing,
                }}
              >
                {errors.signup}
              </p>
            </motion.div>
          )}

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" style={labelStyles}>Full name</label>
              <input
                ref={fullNameRef}
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) clearError('fullName');
                }}
                placeholder="Your name"
                disabled={isLoading}
                style={{
                  ...inputStyles,
                  borderColor: errors.fullName ? 'rgba(180, 90, 90, 0.4)' : 'rgba(17, 24, 39, 0.1)',
                }}
              />
              {errors.fullName && (
                <p style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(180, 90, 90, 0.85)', fontFamily: fontStack }}>
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" style={labelStyles}>Email</label>
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
                required
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                style={{
                  ...inputStyles,
                  borderColor: errors.email ? 'rgba(180, 90, 90, 0.4)' : 'rgba(17, 24, 39, 0.1)',
                }}
              />
              {errors.email && (
                <p id="signup-email-error" role="alert" style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(180, 90, 90, 0.85)', fontFamily: fontStack }}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" style={labelStyles}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) clearError('password');
                  }}
                  placeholder="At least 8 characters"
                  disabled={isLoading}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'signup-password-error' : undefined}
                  style={{
                    ...inputStyles,
                    paddingRight: '48px',
                    borderColor: errors.password ? 'rgba(180, 90, 90, 0.4)' : 'rgba(17, 24, 39, 0.1)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(17, 24, 39, 0.3)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff style={{ width: '18px', height: '18px', strokeWidth: 1.5 }} aria-hidden="true" /> : <Eye style={{ width: '18px', height: '18px', strokeWidth: 1.5 }} aria-hidden="true" />}
                </button>
              </div>
              {errors.password && (
                <p id="signup-password-error" role="alert" style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(180, 90, 90, 0.85)', fontFamily: fontStack }}>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" style={labelStyles}>Confirm password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) clearError('confirmPassword');
                  }}
                  placeholder="Re-enter password"
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'signup-confirm-error' : undefined}
                  style={{
                    ...inputStyles,
                    paddingRight: '48px',
                    borderColor: errors.confirmPassword ? 'rgba(180, 90, 90, 0.4)' : 'rgba(17, 24, 39, 0.1)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(17, 24, 39, 0.3)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showConfirmPassword ? <EyeOff style={{ width: '18px', height: '18px', strokeWidth: 1.5 }} aria-hidden="true" /> : <Eye style={{ width: '18px', height: '18px', strokeWidth: 1.5 }} aria-hidden="true" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="signup-confirm-error" role="alert" style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(180, 90, 90, 0.85)', fontFamily: fontStack }}>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms - Custom styled checkbox */}
            <div style={{ marginTop: '2px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => {
                  setAcceptedTerms(!acceptedTerms);
                  if (errors.terms) clearError('terms');
                }}
              >
                {/* Custom checkbox */}
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    minWidth: '18px',
                    borderRadius: '4px',
                    border: `1.5px solid ${errors.terms ? 'rgba(180, 90, 90, 0.4)' : acceptedTerms ? '#5a7380' : 'rgba(17, 24, 39, 0.2)'}`,
                    backgroundColor: acceptedTerms ? '#5a7380' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {acceptedTerms && (
                    <Check style={{ width: '12px', height: '12px', color: '#FFFFFF', strokeWidth: 2.5 }} />
                  )}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    lineHeight: '18px',
                    color: 'rgba(17, 24, 39, 0.55)',
                    fontFamily: fontStack,
                    ...fontSmoothing,
                  }}
                >
                  I accept the{' '}
                  <span
                    role="button"
                    tabIndex={0}
                    style={{
                      color: '#5a7380',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open('https://aminy.com/terms', '_blank');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        window.open('https://aminy.com/terms', '_blank');
                      }
                    }}
                  >Terms</span>
                  {' '}and{' '}
                  <span
                    role="button"
                    tabIndex={0}
                    style={{
                      color: '#5a7380',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open('https://aminy.com/privacy', '_blank');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        window.open('https://aminy.com/privacy', '_blank');
                      }
                    }}
                  >Privacy Policy</span>
                </span>
              </div>
              {errors.terms && (
                <p style={{ marginTop: '6px', marginLeft: '28px', fontSize: '11px', color: 'rgba(180, 90, 90, 0.85)', fontFamily: fontStack }}>
                  {errors.terms}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                backgroundColor: '#5a7380',
                color: '#FFFFFF',
                fontFamily: fontStack,
                fontWeight: 500,
                fontSize: '15px',
                letterSpacing: '-0.01em',
                padding: '0 24px',
                height: '44px',
                borderRadius: '12px',
                border: 'none',
                cursor: isLoading ? 'default' : 'pointer',
                transition: 'background-color 0.2s ease',
                opacity: isLoading ? 0.7 : 1,
                ...fontSmoothing,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#4f6872';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#5a7380';
              }}
            >
              {isLoading ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight style={{ width: '15px', height: '15px', strokeWidth: 2 }} />
                </>
              )}
            </button>

            {/* Trust Signal */}
            <p
              style={{
                textAlign: 'center',
                marginTop: '4px',
                color: 'rgba(17, 24, 39, 0.36)',
                fontFamily: fontStack,
                fontSize: '12px',
                fontWeight: 400,
                ...fontSmoothing,
              }}
            >
              No credit card required · Cancel anytime
            </p>
          </motion.form>

          {/* Sign In Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{ marginTop: '12px', textAlign: 'center' }}
          >
            <button
              onClick={onLogin}
              disabled={isLoading}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(17, 24, 39, 0.45)',
                fontFamily: fontStack,
                fontSize: '13px',
                fontWeight: 400,
                cursor: 'pointer',
                padding: '8px 16px',
                transition: 'color 0.2s ease',
                ...fontSmoothing,
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(17, 24, 39, 0.65)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(17, 24, 39, 0.45)'}
            >
              Already have an account? Sign in
            </button>
          </motion.div>

        </div>
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(17, 24, 39, 0.35);
        }
        input:focus {
          border-color: rgba(90, 115, 128, 0.5) !important;
          box-shadow: 0 0 0 3px rgba(90, 115, 128, 0.1);
        }
      `}</style>
    </div>
  );
}

export default CreateAccountScreen;
