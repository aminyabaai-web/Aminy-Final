// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * BundleCreditHistory
 *
 * Timeline view of all bundle purchases and credit usage.
 * Shows: purchase date, bundle type, credits bought, credits used,
 * credits remaining, and expiry date.
 *
 * Data sourced from Supabase bundle_credit_transactions table
 * and existing getBundleCredits() from stripe-service.ts.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  MinusCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  Gift,
  ArrowLeft,
} from 'lucide-react';
import { getBundleCredits, formatPrice } from '../lib/stripe-service';
import { supabase } from '../utils/supabase/client';

interface BundleCreditHistoryProps {
  userId: string;
  onBack?: () => void;
}

interface CreditTransaction {
  id: string;
  type: 'purchase' | 'usage' | 'expiry' | 'refund';
  bundleId: string | null;
  bundleName: string;
  consultCreditsChange: number;
  deepReviewCreditsChange: number;
  consultCreditsAfter: number;
  deepReviewCreditsAfter: number;
  amount: number; // cents
  expiresAt: string | null;
  providerId: string | null;
  sessionId: string | null;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

// Bundle name mapping
const BUNDLE_NAMES: Record<string, string> = {
  'consult-4': '4-Pack Consult',
  'consult-8': '8-Pack Consult',
  'deep-review-3': '3-Pack Deep Review',
  'deep-review-6': '6-Pack Deep Review',
  'mixed-starter': 'Mixed Starter Bundle',
};

function getBundleName(bundleId: string | null): string {
  if (!bundleId) return 'Credit Adjustment';
  return BUNDLE_NAMES[bundleId] || bundleId;
}

function getTransactionIcon(type: CreditTransaction['type']) {
  switch (type) {
    case 'purchase': return { icon: Gift, color: 'text-green-500', bg: 'bg-green-50' };
    case 'usage': return { icon: MinusCircle, color: 'text-blue-500', bg: 'bg-[#EEF4F8]' };
    case 'expiry': return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' };
    case 'refund': return { icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-50' };
    default: return { icon: Package, color: 'text-[#5A6B7A]', bg: 'bg-[#FAF7F2]' };
  }
}

function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function BundleCreditHistory({ userId, onBack }: BundleCreditHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [currentCredits, setCurrentCredits] = useState({
    consultCredits: 0,
    deepReviewCredits: 0,
    expiresAt: null as string | null,
    bundleId: null as string | null,
  });

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Fetch current credits
      const credits = await getBundleCredits(userId);
      setCurrentCredits(credits);

      // Fetch transaction history from Supabase
      const { data: txns, error: txnError } = await supabase
        .from('bundle_credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txnError) {
        console.warn('[BundleCreditHistory] Table may not exist yet:', txnError);
        // Fallback: show just current credits with no history
        setTransactions([]);
        return;
      }

      setTransactions(
        (txns || []).map((t) => ({
          id: t.id,
          type: t.type || 'purchase',
          bundleId: t.bundle_id,
          bundleName: getBundleName(t.bundle_id),
          consultCreditsChange: t.consult_credits_change || 0,
          deepReviewCreditsChange: t.deep_review_credits_change || 0,
          consultCreditsAfter: t.consult_credits_after || 0,
          deepReviewCreditsAfter: t.deep_review_credits_after || 0,
          amount: t.amount || 0,
          expiresAt: t.expires_at,
          providerId: t.provider_id,
          sessionId: t.session_id,
          createdAt: new Date(t.created_at),
          metadata: t.metadata || {},
        }))
      );
    } catch (err) {
      setError('Failed to load credit history');
      console.error('BundleCreditHistory error:', err);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-[#5A6B7A]">Loading credit history...</p>
      </div>
    );
  }

  const expiryDays = daysUntil(currentCredits.expiresAt);
  const totalCurrentCredits = currentCredits.consultCredits + currentCredits.deepReviewCredits;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8A9BA8] hover:text-[#5A6B7A]">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-[#1B2733]">Bundle Credits</h2>
            <p className="text-xs text-[#5A6B7A]">Purchase history and credit usage</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-[#8A9BA8] hover:text-[#5A6B7A] disabled:text-[#8A9BA8]"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Current Credit Balance */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Package size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-[#3A4A57]">Current Balance</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="bg-[#6B9080]/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#6B9080]">{currentCredits.consultCredits}</p>
            <p className="text-xs text-[#6B9080]">Consult Credits</p>
          </div>
          <div className="bg-[#EEF4F8] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{currentCredits.deepReviewCredits}</p>
            <p className="text-xs text-blue-600">Deep Review Credits</p>
          </div>
        </div>

        {currentCredits.expiresAt && totalCurrentCredits > 0 && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
            (expiryDays ?? 0) <= 7
              ? 'bg-red-50 text-red-700'
              : (expiryDays ?? 0) <= 30
              ? 'bg-amber-50 text-amber-700'
              : 'bg-[#FAF7F2] text-[#5A6B7A]'
          }`}>
            <Calendar size={12} />
            <span>
              {(expiryDays ?? 0) === 0
                ? 'Credits expire today!'
                : `Credits expire in ${expiryDays} day${expiryDays !== 1 ? 's' : ''} (${new Date(currentCredits.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
            </span>
          </div>
        )}

        {totalCurrentCredits === 0 && (
          <p className="text-xs text-[#8A9BA8] text-center py-2">
            No active credits. Purchase a bundle to get started.
          </p>
        )}
      </div>

      {/* Transaction Timeline */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-[#8A9BA8]" />
          <h3 className="text-sm font-semibold text-[#3A4A57]">Credit History</h3>
        </div>

        {transactions.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-[#E8E4DF]" />

            <div className="space-y-4">
              {transactions.map((txn) => {
                const { icon: Icon, color, bg } = getTransactionIcon(txn.type);
                const isPositive = txn.consultCreditsChange > 0 || txn.deepReviewCreditsChange > 0;

                return (
                  <div key={txn.id} className="relative flex gap-3 pl-0">
                    {/* Timeline dot */}
                    <div className={`relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                      <Icon size={14} className={color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1B2733] truncate">
                            {txn.type === 'purchase' ? `Purchased ${txn.bundleName}` :
                             txn.type === 'usage' ? 'Credit Used' :
                             txn.type === 'expiry' ? 'Credits Expired' :
                             'Credit Refund'}
                          </p>
                          <p className="text-xs text-[#5A6B7A] mt-0.5">
                            {formatDateFull(txn.createdAt)}
                          </p>
                        </div>
                        {txn.amount > 0 && txn.type === 'purchase' && (
                          <span className="text-xs font-medium text-[#5A6B7A] whitespace-nowrap">
                            {formatPrice(txn.amount)}
                          </span>
                        )}
                      </div>

                      {/* Credit changes */}
                      <div className="flex items-center gap-3 mt-1.5">
                        {txn.consultCreditsChange !== 0 && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {isPositive ? '+' : ''}{txn.consultCreditsChange} consult
                          </span>
                        )}
                        {txn.deepReviewCreditsChange !== 0 && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            txn.deepReviewCreditsChange > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {txn.deepReviewCreditsChange > 0 ? '+' : ''}{txn.deepReviewCreditsChange} deep review
                          </span>
                        )}
                      </div>

                      {/* Running balance */}
                      <p className="text-[10px] text-[#8A9BA8] mt-1">
                        Balance after: {txn.consultCreditsAfter} consult, {txn.deepReviewCreditsAfter} deep review
                      </p>

                      {/* Expiry info for purchases */}
                      {txn.expiresAt && txn.type === 'purchase' && (
                        <p className="text-[10px] text-[#8A9BA8] mt-0.5">
                          Expires: {formatDateShort(new Date(txn.expiresAt))}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Package className="w-10 h-10 text-[#8A9BA8] mx-auto mb-2" />
            <p className="text-sm text-[#5A6B7A]">No credit history yet</p>
            <p className="text-xs text-[#8A9BA8] mt-1">
              Purchase a session bundle to see transactions here
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-[#8A9BA8] text-center">
        Credits are applied at checkout. Unused credits expire per bundle terms.
      </p>
    </div>
  );
}

export default BundleCreditHistory;
