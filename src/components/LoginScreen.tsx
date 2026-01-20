/**
 * LoginScreen - Warm, welcoming sign-in experience
 * Brand: Soft Cream (#F5F5F5), Deep Navy (#0D1B2A), Muted Teal (#577590)
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Eye, EyeOff, ArrowLeft, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuthRateLimit } from '../lib/security/auth-rate-limit';

interface LoginScreenProps {
  onBack: () => void;
  onLogin: (email: string) => void;
  onForgotPassword?: () => void;
  onCreateAccount: () => void;
  onAppleSignIn?: () => void;
  onGoogleSignIn?: () => void;
}

export function LoginScreen({
  onBack,
  onLogin,
  onForgotPassword,
  onCreateAccount,
  onAppleSignIn,
  onGoogleSignIn
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    signin?: string;
    apple?: string;
    google?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Auth rate limiting
  const { limited, remainingAttempts, lockedUntil, message: rateLimitMessage, recordFailure, recordSuccess, checkRateLimit } = useAuthRateLimit();

  // Check rate limit on mount
  useEffect(() => {
    checkRateLimit();
  }, [checkRateLimit]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = "We need your email to find your account";
    } else if (!validateEmail(email)) {
      newErrors.email = "That doesn't look like an email address";
    }

    if (!password) {
      newErrors.password = "Please enter your password";
    } else if (password.length < 8) {
      newErrors.password = "Passwords are at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limit before attempting login
    if (limited) {
      setErrors({ signin: rateLimitMessage });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Record failed attempt for rate limiting
        const rateLimitResult = recordFailure();

        // Map Supabase errors to user-friendly messages
        let errorMessage: string;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "We couldn't find that combination. Double-check and try again.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and confirm your account first.";
        } else {
          errorMessage = error.message;
        }

        // Add rate limit warning if applicable
        if (rateLimitResult.message) {
          errorMessage = `${errorMessage} ${rateLimitResult.message}`;
        }

        throw new Error(errorMessage);
      }

      // Success - clear rate limit
      recordSuccess();

      if (data.user) {
        onLogin(data.user.email || email);
      }
    } catch (error: any) {
      setErrors({
        signin: error.message || "We couldn't find that combination. Double-check and try again."
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

      if (error) {
        throw new Error(error.message);
      }
      // OAuth will redirect, so we don't need to do anything else
    } catch (error: any) {
      setErrors({
        apple: error.message || "Apple Sign-In didn't complete. Please try again."
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

      if (error) {
        throw new Error(error.message);
      }
      // OAuth will redirect, so we don't need to do anything else
    } catch (error: any) {
      setErrors({
        google: error.message || "Google Sign-In didn't complete. Please try again."
      });
      setIsLoading(false);
    }
  };

  const clearError = (field: keyof typeof errors) => {
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#F5F5F5' }}
    >
      {/* Header */}
      <nav className="px-6 py-5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 transition-opacity hover:opacity-70"
            style={{ color: '#577590' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </button>
          <div className="w-16" />
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Hero Section */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mb-6"
            >
              <Logo size="md" showTagline={false} />
            </motion.div>

            <h1
              className="text-3xl sm:text-4xl font-bold mb-4"
              style={{
                color: '#0D1B2A',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Welcome Back
            </h1>

            <p
              className="text-lg"
              style={{
                color: '#0D1B2A',
                opacity: 0.7,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Sign in to continue your journey
            </p>
          </div>

          {/* Error Display */}
          {(errors.signin || errors.apple || errors.google) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl"
              style={{
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid rgba(244, 67, 54, 0.2)',
              }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F44336' }} />
                <p className="text-sm" style={{ color: '#F44336' }}>
                  {errors.signin || errors.apple || errors.google}
                </p>
              </div>
            </motion.div>
          )}

          {/* Form Card */}
          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 24px rgba(13, 27, 42, 0.08)',
              border: '1px solid rgba(13, 27, 42, 0.06)',
            }}
          >
            {/* SSO Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                onClick={handleAppleSignIn}
                disabled={isLoading}
                variant="outline"
                className="w-full h-12 rounded-xl transition-all"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(13, 27, 42, 0.15)',
                  color: '#0D1B2A',
                }}
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09z"/>
                    <path d="M15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                  </svg>
                  Continue with Apple
                </div>
              </Button>

              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                variant="outline"
                className="w-full h-12 rounded-xl transition-all"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(13, 27, 42, 0.15)',
                  color: '#0D1B2A',
                }}
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </div>
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid rgba(13, 27, 42, 0.1)' }} />
              </div>
              <div className="relative flex justify-center">
                <span
                  className="px-4 text-sm"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#0D1B2A',
                    opacity: 0.5,
                  }}
                >
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <Label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#0D1B2A' }}
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) clearError('email');
                  }}
                  placeholder="you@example.com"
                  className="w-full h-12 text-base rounded-xl transition-all"
                  style={{
                    backgroundColor: '#F5F5F5',
                    border: errors.email ? '2px solid #F44336' : '2px solid transparent',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm flex items-center gap-1" style={{ color: '#F44336' }}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <Label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#0D1B2A' }}
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) clearError('password');
                    }}
                    placeholder="Enter your password"
                    className="w-full h-12 text-base pr-12 rounded-xl transition-all"
                    style={{
                      backgroundColor: '#F5F5F5',
                      border: errors.password ? '2px solid #F44336' : '2px solid transparent',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: '#577590' }}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm flex items-center gap-1" style={{ color: '#F44336' }}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Forgot Password */}
              {onForgotPassword && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    disabled={isLoading}
                    className="text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ color: '#577590' }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-lg font-semibold text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                style={{
                  backgroundColor: '#577590',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Create Account Link */}
            <p
              className="mt-6 text-center text-sm"
              style={{
                color: '#0D1B2A',
                opacity: 0.7,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Don't have an account?{' '}
              <button
                onClick={onCreateAccount}
                disabled={isLoading}
                className="font-medium underline hover:opacity-80 transition-opacity"
                style={{ color: '#577590' }}
              >
                Create one
              </button>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(13, 27, 42, 0.1)' }}>
            <p
              className="text-center text-xs"
              style={{
                color: '#0D1B2A',
                opacity: 0.4,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              © {new Date().getFullYear()} Aminy
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default LoginScreen;
