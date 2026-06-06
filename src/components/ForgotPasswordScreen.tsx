// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useFormValidation } from '../lib/use-form-validation';
import { forgotPasswordSchema } from '../lib/schemas';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onBackToLogin: () => void;
}

export function ForgotPasswordScreen({ onBack, onBackToLogin }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const { errors, validate, clearErrors, setErrors } = useFormValidation(forgotPasswordSchema);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = validate({ email });
    if (!result.success) return;

    setIsLoading(true);
    clearErrors();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) {
        throw new Error(error.message);
      }

      setIsSuccess(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email. Please try again.';
      setErrors({ email: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col relative overflow-hidden">
        {/* Header with Back Button */}
        <nav aria-label="Password reset navigation" className="flex items-center justify-between p-6 border-b border-[#E8E4DF]">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-lg px-2 py-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <Logo size="sm" showText={false} showTagline={false} />
          <div className="w-16"></div>
        </nav>

        {/* Success Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md text-center">
            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 sm:mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            {/* Success Message */}
            <h1 className="text-primary mb-3" style={{
              fontSize: 'clamp(28px, 5vw, 32px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em'
            }}>
              Check your email
            </h1>
            
            <p className="text-muted-foreground mb-2" style={{
              fontSize: 'clamp(16px, 2.5vw, 18px)',
              fontWeight: 450,
              lineHeight: 1.5
            }}>
              We've sent a password reset link to:
            </p>
            
            <p className="text-accent font-medium mb-8" style={{
              fontSize: 'clamp(16px, 2.5vw, 18px)'
            }}>
              {email}
            </p>

            {/* Instructions */}
            <div className="bg-[#EEF4F8] border border-[#C8DDE8] rounded-xl p-4 mb-8 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Next steps:</h3>
              <ul className="text-[#4A6478] text-sm space-y-1">
                <li>• Check your email inbox (and spam folder)</li>
                <li>• Click the reset link in the email</li>
                <li>• Create a new password</li>
                <li>• Sign in with your new password</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={onBackToLogin}
                className="action-button w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                style={{
                  fontSize: '16px',
                  height: '48px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
                }}
              >
                Back to Sign In
              </Button>

              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                }}
                className="w-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-lg py-2"
              >
                Didn't receive the email? Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col relative overflow-hidden">
      {/* Header with Back Button */}
      <nav aria-label="Password reset navigation" className="flex items-center justify-between p-6 border-b border-[#E8E4DF]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-lg px-2 py-1"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>
        <Logo size="sm" showText={false} showTagline={false} />
        <div className="w-16"></div>
      </nav>

      {/* Reset Form Container */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-primary mb-2" style={{
              fontSize: 'clamp(28px, 5vw, 32px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em'
            }}>
              Reset your password
            </h1>
            <p className="text-muted-foreground" style={{
              fontSize: 'clamp(16px, 2.5vw, 18px)',
              fontWeight: 450,
              lineHeight: 1.5
            }}>
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {/* Reset Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 sm:space-y-6">
            {/* Email Field */}
            <div>
              <Label htmlFor="reset-email" className="block text-sm font-medium text-foreground mb-2">
                Email address
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({});
                }}
                placeholder="Enter your email address"
                className={`w-full h-12 aminy-input-left ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={isLoading}
              />
              {errors.email && (
                <div className="mt-2 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{errors.email}</p>
                </div>
              )}
            </div>

            {/* Send Reset Link Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="action-button w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              style={{
                fontSize: '16px',
                height: '48px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
              }}
            >
              {isLoading ? 'Sending reset link...' : 'Send reset link'}
            </Button>
          </form>

          {/* Footer Link */}
          <div className="mt-4 sm:mt-6 text-center">
            <button
              onClick={onBackToLogin}
              disabled={isLoading}
              className="text-accent hover:text-accent/80 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-lg px-2 py-1"
              style={{ fontSize: '16px', fontWeight: 500 }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
