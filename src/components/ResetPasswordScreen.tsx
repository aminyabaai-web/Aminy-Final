// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ResetPasswordScreen - Set new password after reset link
 */

import React, { useState } from 'react';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface ResetPasswordScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function ResetPasswordScreen({ onSuccess, onBack }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = 'Please enter a new password';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw new Error(error.message);
      }

      setIsSuccess(true);
      // Wait a moment before redirecting
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password. Please try again.';
      setErrors({
        general: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="w-16"></div>
          <Logo size="sm" showText={false} showTagline={false} />
          <div className="w-16"></div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 sm:mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h1
              className="text-primary mb-3"
              style={{
                fontSize: 'clamp(28px, 5vw, 32px)',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              Password Updated!
            </h1>

            <p
              className="text-muted-foreground mb-4 sm:mb-6"
              style={{
                fontSize: 'clamp(16px, 2.5vw, 18px)',
                fontWeight: 450,
                lineHeight: 1.5,
              }}
            >
              Your password has been successfully changed. Redirecting you to sign in...
            </p>

            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-lg px-2 py-1"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>
        <Logo size="sm" showText={false} showTagline={false} />
        <div className="w-16"></div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1
              className="text-primary mb-2"
              style={{
                fontSize: 'clamp(28px, 5vw, 32px)',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              Set new password
            </h1>
            <p
              className="text-muted-foreground"
              style={{
                fontSize: 'clamp(16px, 2.5vw, 18px)',
                fontWeight: 450,
                lineHeight: 1.5,
              }}
            >
              Choose a strong password for your account
            </p>
          </div>

          {errors.general && (
            <div className="mb-4 sm:mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 sm:space-y-6">
            <div>
              <Label
                htmlFor="new-password"
                className="block text-sm font-medium text-foreground mb-2"
              >
                New password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="Enter new password"
                  className={`w-full h-12 pr-12 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <div className="mt-2 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{errors.password}</p>
                </div>
              )}
            </div>

            <div>
              <Label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Confirm new password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="Confirm new password"
                  className={`w-full h-12 pr-12 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="mt-2 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              style={{
                fontSize: '16px',
                height: '48px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating password...
                </span>
              ) : (
                'Update password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordScreen;
