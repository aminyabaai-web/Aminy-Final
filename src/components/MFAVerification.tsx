/**
 * MFA Verification Component
 *
 * Shown after login when user has MFA enabled but hasn't verified
 * for the current session (AAL1 -> AAL2 upgrade)
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Shield, AlertCircle, Lock } from 'lucide-react';
import { verifyMFALogin } from '../lib/mfa';

interface MFAVerificationProps {
  onSuccess: () => void;
  onCancel?: () => void;
  email?: string;
}

export function MFAVerification({
  onSuccess,
  onCancel,
  email,
}: MFAVerificationProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 5;

  // Handle code input - only allow digits
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    if (error) setError(null);
  };

  // Verify the code
  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (attempts >= maxAttempts) {
      setError('Too many failed attempts. Please sign in again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const success = await verifyMFALogin(code);

    if (success) {
      onSuccess();
    } else {
      setAttempts(prev => prev + 1);
      const remaining = maxAttempts - attempts - 1;
      if (remaining > 0) {
        setError(`Invalid code. ${remaining} attempts remaining.`);
      } else {
        setError('Too many failed attempts. Please sign in again.');
      }
      setCode('');
    }

    setIsLoading(false);
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && !isLoading && attempts < maxAttempts) {
      handleVerify();
    }
  }, [code]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#F5F5F5' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 24px rgba(13, 27, 42, 0.08)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(87, 117, 144, 0.1)' }}
            >
              <Shield className="w-8 h-8" style={{ color: '#577590' }} />
            </div>

            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0D1B2A' }}>
              Two-Factor Authentication
            </h1>

            <p className="text-sm" style={{ color: '#0D1B2A', opacity: 0.7 }}>
              Enter the 6-digit code from your authenticator app
            </p>

            {email && (
              <p className="text-sm mt-2" style={{ color: '#577590' }}>
                {email}
              </p>
            )}
          </div>

          {/* Code Input */}
          <div className="mb-6">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              maxLength={6}
              className="w-full h-14 text-center text-2xl font-mono tracking-widest rounded-xl"
              style={{
                backgroundColor: '#F5F5F5',
                border: error ? '2px solid #F44336' : '2px solid transparent',
              }}
              autoFocus
              disabled={isLoading || attempts >= maxAttempts}
              aria-label="Authentication code"
              aria-describedby={error ? 'mfa-error' : undefined}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              id="mfa-error"
              className="mb-4 p-3 rounded-lg flex items-center gap-2"
              style={{
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                color: '#F44336',
              }}
              role="alert"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={isLoading || code.length !== 6 || attempts >= maxAttempts}
            className="w-full h-12 rounded-xl font-medium text-white"
            style={{ backgroundColor: '#577590' }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              'Verify'
            )}
          </Button>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(13, 27, 42, 0.1)' }}>
            <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F5F5F5' }}>
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#577590' }} />
              <div>
                <p className="text-xs" style={{ color: '#0D1B2A', opacity: 0.7 }}>
                  Open your authenticator app (Google Authenticator, Authy, or 1Password)
                  and enter the code for Aminy.
                </p>
              </div>
            </div>
          </div>

          {/* Cancel Option */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full mt-4 text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: '#577590' }}
            >
              Sign in with a different account
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default MFAVerification;
