// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * MFA Settings Component
 *
 * Manages MFA settings: enable/disable, view backup codes
 * Used in account settings page
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
} from 'lucide-react';
import {
  getMFAStatus,
  checkMFARequirement,
  unenrollMFA,
  generateBackupCodes,
  type MFAStatus,
  type MFARequirement,
} from '../lib/mfa';
import MFAEnrollment from './MFAEnrollment';

interface MFASettingsProps {
  onClose?: () => void;
}

export function MFASettings({ onClose }: MFASettingsProps) {
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [requirement, setRequirement] = useState<MFARequirement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Load MFA status
  const loadStatus = async () => {
    setIsLoading(true);
    const [mfaStatus, mfaRequirement] = await Promise.all([
      getMFAStatus(),
      checkMFARequirement(),
    ]);
    setStatus(mfaStatus);
    setRequirement(mfaRequirement);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Handle disable MFA
  const handleDisable = async () => {
    if (!status?.factors.length) return;

    setIsDisabling(true);
    setDisableError(null);

    const factor = status.factors[0];
    const success = await unenrollMFA(factor.id);

    if (success) {
      setShowDisableConfirm(false);
      setDisableCode('');
      await loadStatus();
    } else {
      setDisableError('Failed to disable MFA. Please try again.');
    }

    setIsDisabling(false);
  };

  // Generate and show backup codes
  const handleGenerateBackupCodes = () => {
    const codes = generateBackupCodes();
    setBackupCodes(codes);
    setShowBackupCodes(true);
  };

  // Copy backup codes to clipboard
  const handleCopyBackupCodes = async () => {
    if (!backupCodes) return;
    await navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  // Download backup codes as file
  const handleDownloadBackupCodes = () => {
    if (!backupCodes) return;
    const content = `Aminy Backup Codes\nGenerated: ${new Date().toISOString()}\n\nKeep these codes safe. Each code can only be used once.\n\n${backupCodes.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aminy-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show enrollment flow
  if (showEnrollment) {
    return (
      <MFAEnrollment
        onComplete={() => {
          setShowEnrollment(false);
          loadStatus();
        }}
        onSkip={() => setShowEnrollment(false)}
        required={requirement?.required}
        gracePeriodEnds={requirement?.gracePeriodEnds}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: status?.isEnrolled
                ? 'rgba(76, 175, 80, 0.1)'
                : 'rgba(87, 117, 144, 0.1)',
            }}
          >
            {status?.isEnrolled ? (
              <ShieldCheck className="w-6 h-6" style={{ color: '#4CAF50' }} />
            ) : (
              <Shield className="w-6 h-6" style={{ color: '#0891b2' }} />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#0D1B2A' }}>
              Two-Factor Authentication
            </h2>
            <p className="text-sm" style={{ color: '#0D1B2A', opacity: 0.6 }}>
              {status?.isEnrolled ? 'Enabled' : 'Not enabled'}
            </p>
          </div>
        </div>

        {/* Requirement Notice */}
        {requirement?.required && !status?.isEnrolled && (
          <div
            className="p-4 rounded-lg mb-6"
            style={{
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#F44336' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: '#F44336' }}>
                  MFA Required
                </p>
                <p className="text-xs mt-1" style={{ color: '#F44336', opacity: 0.8 }}>
                  {requirement.reason}
                </p>
              </div>
            </div>
          </div>
        )}

        {requirement?.gracePeriodEnds && !status?.isEnrolled && (
          <div
            className="p-4 rounded-lg mb-6"
            style={{
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              border: '1px solid rgba(255, 152, 0, 0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#F57C00' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: '#F57C00' }}>
                  MFA will be required soon
                </p>
                <p className="text-xs mt-1" style={{ color: '#F57C00', opacity: 0.8 }}>
                  Set up MFA before {requirement.gracePeriodEnds.toLocaleDateString()} to avoid interruptions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 12px rgba(13, 27, 42, 0.06)',
            border: '1px solid rgba(13, 27, 42, 0.06)',
          }}
        >
          {status?.isEnrolled ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <Smartphone className="w-5 h-5" style={{ color: '#0891b2' }} />
                <div>
                  <p className="font-medium text-sm" style={{ color: '#0D1B2A' }}>
                    Authenticator App
                  </p>
                  <p className="text-xs" style={{ color: '#0D1B2A', opacity: 0.5 }}>
                    Configured and active
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleGenerateBackupCodes}
                  variant="outline"
                  className="w-full h-10 rounded-lg text-sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Backup Codes
                </Button>

                <Button
                  onClick={() => setShowDisableConfirm(true)}
                  variant="outline"
                  className="w-full h-10 rounded-lg text-sm"
                  style={{ borderColor: 'rgba(244, 67, 54, 0.3)', color: '#F44336' }}
                >
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Disable MFA
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm mb-4" style={{ color: '#0D1B2A', opacity: 0.7 }}>
                Add an extra layer of security to your account by requiring a code
                from your authenticator app when signing in.
              </p>

              <Button
                onClick={() => setShowEnrollment(true)}
                className="w-full h-12 rounded-xl font-medium text-white"
                style={{ backgroundColor: '#0891b2' }}
              >
                <Shield className="w-4 h-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            </>
          )}
        </div>

        {/* Disable Confirmation Modal */}
        <AnimatePresence>
          {showDisableConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowDisableConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm rounded-xl p-6"
                style={{ backgroundColor: '#FFFFFF' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)' }}
                  >
                    <AlertTriangle className="w-6 h-6" style={{ color: '#F44336' }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#0D1B2A' }}>
                    Disable Two-Factor Authentication?
                  </h3>
                  <p className="text-sm" style={{ color: '#0D1B2A', opacity: 0.7 }}>
                    This will make your account less secure. You'll only need your
                    password to sign in.
                  </p>
                </div>

                {disableError && (
                  <div
                    className="mb-4 p-3 rounded-lg flex items-center gap-2"
                    style={{
                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                      color: '#F44336',
                    }}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm">{disableError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowDisableConfirm(false);
                      setDisableCode('');
                      setDisableError(null);
                    }}
                    variant="outline"
                    className="flex-1 h-10 rounded-lg"
                    disabled={isDisabling}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDisable}
                    className="flex-1 h-10 rounded-lg text-white"
                    style={{ backgroundColor: '#F44336' }}
                    disabled={isDisabling}
                  >
                    {isDisabling ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Disable'
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backup Codes Modal */}
        <AnimatePresence>
          {showBackupCodes && backupCodes && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowBackupCodes(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm rounded-xl p-6"
                style={{ backgroundColor: '#FFFFFF' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#0D1B2A' }}>
                    Backup Codes
                  </h3>
                  <p className="text-sm" style={{ color: '#0D1B2A', opacity: 0.7 }}>
                    Save these codes in a safe place. Each code can only be used once.
                  </p>
                </div>

                <div
                  className="grid grid-cols-2 gap-2 p-4 rounded-lg mb-4 font-mono text-sm"
                  style={{ backgroundColor: '#F5F5F5' }}
                >
                  {backupCodes.map((code, index) => (
                    <div key={index} className="text-center py-1" style={{ color: '#0D1B2A' }}>
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mb-4">
                  <Button
                    onClick={handleCopyBackupCodes}
                    variant="outline"
                    className="flex-1 h-10 rounded-lg text-sm"
                  >
                    {copiedCodes ? (
                      <Check className="w-4 h-4 mr-2" style={{ color: '#4CAF50' }} />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copiedCodes ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    onClick={handleDownloadBackupCodes}
                    variant="outline"
                    className="flex-1 h-10 rounded-lg text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>

                <Button
                  onClick={() => setShowBackupCodes(false)}
                  className="w-full h-10 rounded-lg font-medium text-white"
                  style={{ backgroundColor: '#0891b2' }}
                >
                  Done
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default MFASettings;
