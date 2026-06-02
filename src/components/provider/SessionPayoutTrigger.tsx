// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SessionPayoutTrigger — Admin/supervisor UI to release payment to a provider
 * after a session is marked complete and payment is confirmed.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Calendar,
  Clock,
  ArrowRight,
  Shield,
  X,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  createSessionPayout,
  calculateProviderAmount,
  getPlatformFeeRate,
  formatCents,
  type SessionPayoutParams,
  type PayoutRecord,
} from '../../lib/stripe-connect';

// ============================================================================
// Props
// ============================================================================

export interface SessionPayoutTriggerProps {
  /** Unique session identifier */
  sessionId: string;
  /** Provider receiving the payout */
  providerId: string;
  providerName: string;
  /** Stripe Connect account ID of the provider (must be active) */
  stripeConnectAccountId: string;
  /** Total collected from the family in cents */
  sessionAmountCents: number;
  /** Care rail — determines platform take rate (cash 35%, insured 10%, aact 5%) */
  rail?: import('../../lib/stripe-connect').PayoutRail;
  /** Human-readable session description */
  sessionDescription?: string;
  /** ISO timestamp when the session occurred */
  sessionDate?: string;
  /** Session duration in minutes */
  durationMinutes?: number;
  onSuccess?: (payout: PayoutRecord) => void;
  onCancel?: () => void;
  /**
   * When true, wraps the card in a full-screen shell (background + centering + padding)
   * so it can render as a standalone screen. Defaults to false for embedded use.
   */
  fullScreen?: boolean;
  /**
   * When true, marks this as illustrative demo data: the dollar figures and any
   * Transfer ID are clearly labeled as a sample and no real funds move.
   */
  isSample?: boolean;
}

// ============================================================================
// Component
// ============================================================================

type ViewState = 'confirm' | 'loading' | 'success' | 'error';

export function SessionPayoutTrigger({
  sessionId,
  providerId,
  providerName,
  stripeConnectAccountId,
  sessionAmountCents,
  rail = 'cash_pay',
  sessionDescription,
  sessionDate,
  durationMinutes,
  onSuccess,
  onCancel,
  fullScreen = false,
  isSample = false,
}: SessionPayoutTriggerProps) {
  const [viewState, setViewState] = useState<ViewState>('confirm');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [payoutRecord, setPayoutRecord] = useState<PayoutRecord | null>(null);

  const { providerCents, platformFeeCents } = calculateProviderAmount(sessionAmountCents, rail);
  const feePct = Math.round(getPlatformFeeRate(rail) * 100);

  const handleRelease = async () => {
    setViewState('loading');
    setErrorMessage(null);

    try {
      const params: SessionPayoutParams = {
        sessionId,
        providerId,
        stripeConnectAccountId,
        sessionAmountCents,
        rail,
        sessionDescription: sessionDescription ?? `Session on ${sessionDate ?? sessionId}`,
      };

      const payout = await createSessionPayout(params);
      setPayoutRecord(payout);
      setViewState('success');
      onSuccess?.(payout);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Payout failed. Please try again.');
      setViewState('error');
    }
  };

  const handleRetry = () => {
    setViewState('confirm');
    setErrorMessage(null);
  };

  const dateLabel = sessionDate
    ? new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const content = (
    <AnimatePresence mode="wait">
      {/* ---- Confirm State ---- */}
      {viewState === 'confirm' && (
        <motion.div
          key="confirm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="rounded-2xl border-0 shadow-sm bg-white overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: '#0D1B2A' }}>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-teal-400" />
                <span className="text-white font-semibold text-sm">Release Payment</span>
              </div>
              {onCancel && (
                <button onClick={onCancel} className="text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isSample && (
              <div
                className="px-5 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold"
                style={{ backgroundColor: '#92400E', color: '#FFFBEB' }}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Illustrative sample — no funds will move
              </div>
            )}

            <div className="p-5 space-y-4">
              {/* Session info */}
              <div className="rounded-xl bg-gray-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium text-gray-800">{providerName}</span>
                </div>
                {sessionDescription && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    <span>{sessionDescription}</span>
                  </div>
                )}
                {dateLabel && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{dateLabel}</span>
                  </div>
                )}
                {durationMinutes && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{durationMinutes} minutes</span>
                  </div>
                )}
              </div>

              {/* Fee breakdown */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Payment Breakdown</h3>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Session total</span>
                  <span className="font-medium text-gray-700">{formatCents(sessionAmountCents)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Platform fee ({feePct}%)</span>
                  <span className="font-medium text-red-500">−{formatCents(platformFeeCents)}</span>
                </div>

                <div className="h-px bg-gray-100 my-1" />

                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Provider receives</span>
                  <span className="text-lg font-bold text-teal-600">{formatCents(providerCents)}</span>
                </div>
              </div>

              {/* Confirm button */}
              <Button
                onClick={handleRelease}
                className="w-full h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: '#43AA8B' }}
              >
                Release Payment to Provider
                <ArrowRight className="w-4 h-4" />
              </Button>

              {onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
                >
                  Cancel
                </button>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ---- Loading State ---- */}
      {viewState === 'loading' && (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Card className="rounded-2xl border-0 shadow-sm bg-white p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            <p className="text-sm font-medium text-gray-700">Processing payout…</p>
            <p className="text-xs text-gray-400 text-center">Transferring {formatCents(providerCents)} to {providerName}</p>
          </Card>
        </motion.div>
      )}

      {/* ---- Success State ---- */}
      {viewState === 'success' && payoutRecord && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="rounded-2xl border-0 shadow-sm bg-white p-6 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">Payment Released</h3>
              <p className="text-teal-600 font-semibold text-xl mt-1">{formatCents(payoutRecord.providerAmountCents)}</p>
              <p className="text-xs text-gray-400 mt-1">Transfer ID: {payoutRecord.transferId}</p>
            </div>
            <p className="text-sm text-gray-500">
              {providerName} will receive this payment within 2 business days via Stripe.
            </p>
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="mt-2 rounded-xl text-sm"
              >
                Done
              </Button>
            )}
          </Card>
        </motion.div>
      )}

      {/* ---- Error State ---- */}
      {viewState === 'error' && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="rounded-2xl border-0 shadow-sm bg-white p-6 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">Payout Failed</h3>
              {errorMessage && (
                <p className="text-sm text-red-500 mt-1 max-w-xs">{errorMessage}</p>
              )}
            </div>
            <div className="flex gap-3 mt-2">
              <Button
                onClick={handleRetry}
                className="rounded-xl text-sm text-white"
                style={{ backgroundColor: '#43AA8B' }}
              >
                Try Again
              </Button>
              {onCancel && (
                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="rounded-xl text-sm"
                >
                  Cancel
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-6">
        <div className="w-full max-w-md">{content}</div>
      </div>
    );
  }

  return content;
}

export default SessionPayoutTrigger;
