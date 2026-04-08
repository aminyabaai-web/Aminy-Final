// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SubscriptionPauseFlow
 *
 * Allows users to pause their subscription for 1, 2, or 3 months
 * and resume it early if desired.
 *
 * Uses pause_collection on the Stripe subscription (no charges during pause).
 * Calls stripe-service.ts: pauseSubscription(), resumePausedSubscription(), getPauseStatus()
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PauseCircle,
  PlayCircle,
  Calendar,
  AlertTriangle,
  Loader2,
  Check,
  X,
  Clock,
} from 'lucide-react';
import {
  pauseSubscription,
  resumePausedSubscription,
  getPauseStatus,
  type PauseStatus,
} from '../lib/stripe-service';

interface SubscriptionPauseFlowProps {
  subscriptionId: string;
  onStatusChange?: (isPaused: boolean) => void;
  onClose?: () => void;
}

type PauseDuration = 1 | 2 | 3;

const DURATION_OPTIONS: { value: PauseDuration; label: string; description: string }[] = [
  { value: 1, label: '1 Month', description: 'Resume next month' },
  { value: 2, label: '2 Months', description: 'Resume in 2 months' },
  { value: 3, label: '3 Months', description: 'Resume in 3 months' },
];

function formatResumeDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntilResume(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function SubscriptionPauseFlow({
  subscriptionId,
  onStatusChange,
  onClose,
}: SubscriptionPauseFlowProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [pauseStatus, setPauseStatus] = useState<PauseStatus | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<PauseDuration>(1);
  const [step, setStep] = useState<'check' | 'select' | 'confirm' | 'paused' | 'success'>('check');
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await getPauseStatus(subscriptionId);
      setPauseStatus(status);
      setStep(status.isPaused ? 'paused' : 'select');
    } catch (err) {
      setError('Could not check subscription status');
      console.error('Pause status error:', err);
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handlePause = async () => {
    setProcessing(true);
    setError(null);
    try {
      const result = await pauseSubscription(subscriptionId, selectedDuration);
      setPauseStatus({
        isPaused: true,
        resumeDate: result.resumeDate,
        pausedAt: new Date().toISOString(),
        pauseDurationMonths: selectedDuration,
      });
      setStep('paused');
      onStatusChange?.(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause subscription');
    } finally {
      setProcessing(false);
    }
  };

  const handleResume = async () => {
    setProcessing(true);
    setError(null);
    try {
      await resumePausedSubscription(subscriptionId);
      setPauseStatus({
        isPaused: false,
        resumeDate: null,
        pausedAt: null,
        pauseDurationMonths: null,
      });
      setStep('success');
      onStatusChange?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume subscription');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
        <Loader2 className="w-6 h-6 text-teal-500 animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500">Checking subscription status...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pauseStatus?.isPaused ? (
            <PauseCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <PauseCircle className="w-4 h-4 text-gray-400" />
          )}
          <h3 className="text-sm font-semibold text-gray-800">
            {pauseStatus?.isPaused ? 'Subscription Paused' : 'Pause Subscription'}
          </h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Duration selector */}
        {step === 'select' && (
          <>
            <p className="text-sm text-gray-600">
              Pausing your subscription stops billing. You will not be charged during the pause
              period, but you will lose access to premium features.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pause Duration
              </p>
              {DURATION_OPTIONS.map((opt) => {
                const resumeDate = new Date();
                resumeDate.setMonth(resumeDate.getMonth() + opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedDuration(opt.value)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      selectedDuration === opt.value
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedDuration === opt.value
                            ? 'border-teal-500 bg-teal-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedDuration === opt.value && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        Resumes {resumeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep('confirm')}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Continue
            </button>
          </>
        )}

        {/* Confirmation step */}
        {step === 'confirm' && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Confirm Pause for {selectedDuration} {selectedDuration === 1 ? 'Month' : 'Months'}
                  </p>
                  <ul className="text-xs text-amber-700 mt-1.5 space-y-1 list-disc list-inside">
                    <li>Billing will stop during the pause</li>
                    <li>Premium features will be unavailable</li>
                    <li>Your data and settings will be preserved</li>
                    <li>Subscription resumes automatically on {(() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + selectedDuration);
                      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    })()}</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handlePause}
                disabled={processing}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {processing && <Loader2 size={14} className="animate-spin" />}
                {processing ? 'Pausing...' : 'Pause Now'}
              </button>
            </div>
          </>
        )}

        {/* Currently paused state */}
        {step === 'paused' && pauseStatus && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3">
              <PauseCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Your subscription is paused
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  No charges during pause. Premium features are unavailable.
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Calendar size={12} />
                    Resumes on
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatResumeDate(pauseStatus.resumeDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Clock size={12} />
                    Days remaining
                  </span>
                  <span className="font-medium text-gray-900">
                    {daysUntilResume(pauseStatus.resumeDate)} days
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleResume}
              disabled={processing}
              className="w-full py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Resuming...
                </>
              ) : (
                <>
                  <PlayCircle size={16} />
                  Resume Subscription Now
                </>
              )}
            </button>
          </>
        )}

        {/* Success after resume */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Subscription Resumed!</p>
              <p className="text-xs text-gray-500 mt-1">
                Your premium features are now active again.
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Done
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SubscriptionPauseFlow;
