// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Payment Confirmation Component
 * Shows loading state while verifying payment via webhook
 */

import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Check, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { TierType } from '../lib/tier-utils';

interface PaymentConfirmationProps {
  status: 'pending' | 'success' | 'failed' | 'timeout';
  tier: TierType | null;
  error: string | null;
  isPolling: boolean;
  onRetry: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

export function PaymentConfirmation({
  status,
  tier,
  error,
  isPolling,
  onRetry,
  onContinue,
  onCancel,
}: PaymentConfirmationProps) {
  const tierNames: Record<TierType, string> = {
    free: 'Free',
    starter: 'Starter',
    core: 'Core',
    pro: 'Pro',
    proplus: 'Pro+',
  };

  if (status === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full p-8 text-center animate-in fade-in zoom-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-600 mb-4 sm:mb-6">
            Welcome to Aminy {tier ? tierNames[tier] : ''}! Your subscription is now active.
          </p>
          <Button
            onClick={onContinue}
            className="w-full bg-primary hover:bg-[#6B9080] text-white"
          >
            Continue to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (status === 'timeout' || status === 'failed') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Verification Taking Longer Than Expected
          </h2>
          <p className="text-gray-600 mb-4">
            {error || "We're still processing your payment. This usually takes just a moment."}
          </p>
          <p className="text-sm text-gray-500 mb-4 sm:mb-6">
            If you were charged, your subscription will be activated shortly. You can also check your email for confirmation.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={onRetry}
              variant="outline"
              className="flex-1"
              disabled={isPolling}
            >
              {isPolling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
            <Button
              onClick={onContinue}
              className="flex-1 bg-primary hover:bg-[#6B9080] text-white"
            >
              Continue Anyway
            </Button>
          </div>
          <button
            onClick={onCancel}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Contact Support
          </button>
        </Card>
      </div>
    );
  }

  // Pending/polling state
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-[#6B9080]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-[#6B9080] animate-spin" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Confirming Your Payment
        </h2>
        <p className="text-gray-600 mb-2">
          Please wait while we activate your subscription...
        </p>
        <p className="text-sm text-gray-400">
          This usually takes just a few seconds
        </p>
      </Card>
    </div>
  );
}

export default PaymentConfirmation;
