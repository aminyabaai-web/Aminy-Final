/**
 * MFA Enrollment Component
 *
 * Guides users through setting up two-factor authentication
 * with an authenticator app (Google Authenticator, Authy, etc.)
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Shield,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  ArrowRight,
  X,
  QrCode,
} from 'lucide-react';
import { enrollMFA, verifyMFAEnrollment, type MFAEnrollmentResult } from '../lib/mfa';

interface MFAEnrollmentProps {
  onComplete: () => void;
  onSkip?: () => void;
  required?: boolean;
  gracePeriodEnds?: Date;
}

export function MFAEnrollment({
  onComplete,
  onSkip,
  required = false,
  gracePeriodEnds,
}: MFAEnrollmentProps) {
  const [step, setStep] = useState<'intro' | 'scan' | 'verify' | 'success'>('intro');
  const [enrollment, setEnrollment] = useState<MFAEnrollmentResult | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Start enrollment when moving to scan step
  const handleStartEnrollment = async () => {
    setIsLoading(true);
    setError(null);

    const result = await enrollMFA('Aminy');

    if (result) {
      setEnrollment(result);
      setStep('scan');
    } else {
      setError('Failed to start MFA setup. Please try again.');
    }

    setIsLoading(false);
  };

  // Verify the code from authenticator app
  const handleVerify = async () => {
    if (!enrollment || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    const success = await verifyMFAEnrollment(enrollment.factorId, verificationCode);

    if (success) {
      setStep('success');
    } else {
      setError('Invalid code. Make sure you entered the code from your authenticator app.');
    }

    setIsLoading(false);
  };

  // Copy secret to clipboard
  const handleCopySecret = async () => {
    if (enrollment?.secret) {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  // Handle code input - only allow digits
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
    if (error) setError(null);
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (verificationCode.length === 6 && !isLoading) {
      handleVerify();
    }
  }, [verificationCode]);

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
        {/* Step: Introduction */}
        {step === 'intro' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(87, 117, 144, 0.1)' }}
              >
                <Shield className="w-8 h-8" style={{ color: '#0891b2' }} />
              </div>

              <h1
                className="text-2xl font-bold mb-2"
                style={{ color: '#0D1B2A' }}
              >
                {required ? 'Set Up Two-Factor Authentication' : 'Secure Your Account'}
              </h1>

              <p className="text-sm" style={{ color: '#0D1B2A', opacity: 0.7 }}>
                {required
                  ? 'As a healthcare provider, two-factor authentication is required to protect patient data.'
                  : 'Add an extra layer of security to your account with two-factor authentication.'}
              </p>

              {gracePeriodEnds && !required && (
                <p
                  className="mt-3 text-sm p-3 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    color: '#F57C00',
                  }}
                >
                  MFA will be required after {gracePeriodEnds.toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: '#F5F5F5' }}>
                <Smartphone className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#0891b2' }} />
                <div>
                  <p className="font-medium text-sm" style={{ color: '#0D1B2A' }}>
                    Use an authenticator app
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#0D1B2A', opacity: 0.6 }}>
                    Google Authenticator, Authy, or 1Password
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: '#F5F5F5' }}>
                <QrCode className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#0891b2' }} />
                <div>
                  <p className="font-medium text-sm" style={{ color: '#0D1B2A' }}>
                    Scan a QR code
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#0D1B2A', opacity: 0.6 }}>
                    Quick and secure setup in seconds
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div
                className="mb-4 p-3 rounded-lg flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  color: '#F44336',
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleStartEnrollment}
              disabled={isLoading}
              className="w-full h-12 rounded-xl font-medium text-white"
              style={{ backgroundColor: '#0891b2' }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            {onSkip && !required && (
              <button
                onClick={onSkip}
                className="w-full mt-4 text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ color: '#0891b2' }}
              >
                Skip for now
              </button>
            )}
          </motion.div>
        )}

        {/* Step: Scan QR Code */}
        {step === 'scan' && enrollment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#0D1B2A' }}>
                Scan QR Code
              </h2>
              <p className="text-sm" style={{ color: '#0D1B2A', opacity: 0.7 }}>
                Open your authenticator app and scan this code
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(13, 27, 42, 0.1)',
                }}
              >
                <img
                  src={enrollment.qrCode}
                  alt="MFA QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            {/* Manual entry option */}
            <div className="mb-6">
              <p className="text-xs text-center mb-2" style={{ color: '#0D1B2A', opacity: 0.5 }}>
                Can't scan? Enter this code manually:
              </p>
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: '#F5F5F5' }}
              >
                <code className="text-sm font-mono" style={{ color: '#0D1B2A' }}>
                  {enrollment.secret}
                </code>
                <button
                  onClick={handleCopySecret}
                  className="p-1.5 rounded hover:bg-white/50 transition-colors"
                  aria-label="Copy secret"
                >
                  {copiedSecret ? (
                    <Check className="w-4 h-4" style={{ color: '#4CAF50' }} />
                  ) : (
                    <Copy className="w-4 h-4" style={{ color: '#0891b2' }} />
                  )}
                </button>
              </div>
            </div>

            <Button
              onClick={() => setStep('verify')}
              className="w-full h-12 rounded-xl font-medium text-white"
              style={{ backgroundColor: '#0891b2' }}
            >
              Continue
            </Button>
          </motion.div>
        )}

        {/* Step: Verify Code */}
        {step === 'verify' && enrollment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#0D1B2A' }}>
                Enter Verification Code
              </h2>
              <p className="text-sm" style={{ color: '#0D1B2A', opacity: 0.7 }}>
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {/* Code Input */}
            <div className="mb-6">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={verificationCode}
                onChange={handleCodeChange}
                placeholder="000000"
                maxLength={6}
                className="w-full h-14 text-center text-2xl font-mono tracking-widest rounded-xl"
                style={{
                  backgroundColor: '#F5F5F5',
                  border: error ? '2px solid #F44336' : '2px solid transparent',
                }}
                autoFocus
                disabled={isLoading}
              />
            </div>

            {error && (
              <div
                className="mb-4 p-3 rounded-lg flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  color: '#F44336',
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleVerify}
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full h-12 rounded-xl font-medium text-white"
              style={{ backgroundColor: '#0891b2' }}
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

            <button
              onClick={() => setStep('scan')}
              className="w-full mt-4 text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: '#0891b2' }}
            >
              Back to QR code
            </button>
          </motion.div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)' }}
            >
              <Check className="w-8 h-8" style={{ color: '#4CAF50' }} />
            </div>

            <h2 className="text-xl font-bold mb-2" style={{ color: '#0D1B2A' }}>
              Two-Factor Authentication Enabled
            </h2>

            <p className="text-sm mb-6" style={{ color: '#0D1B2A', opacity: 0.7 }}>
              Your account is now protected with an extra layer of security. You'll need
              your authenticator app to sign in.
            </p>

            <div
              className="p-4 rounded-lg mb-6 text-left"
              style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)' }}
            >
              <p className="text-sm font-medium" style={{ color: '#F57C00' }}>
                Important: Save your backup codes
              </p>
              <p className="text-xs mt-1" style={{ color: '#F57C00', opacity: 0.8 }}>
                If you lose access to your authenticator app, you'll need backup codes
                to sign in. Go to Settings {'>'} Security to view and save them.
              </p>
            </div>

            <Button
              onClick={onComplete}
              className="w-full h-12 rounded-xl font-medium text-white"
              style={{ backgroundColor: '#0891b2' }}
            >
              Continue
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default MFAEnrollment;
