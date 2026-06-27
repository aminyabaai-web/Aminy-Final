// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * PracticeRevenueWidget
 *
 * Revenue summary card for the provider portal.
 * Reads from localStorage demo data (no real Stripe yet).
 * Small card component — embeddable in provider portal.
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { DollarSign, TrendingUp, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { isDemoMode } from '../../lib/demo-seed';

// ─── Types ────────────────────────────────────────────────────────────

interface RevenueData {
  thisWeekBilled: number;
  thisWeekPaid: number;
  thisWeekPending: number;
  thisMonthBilled: number;
  thisMonthPaid: number;
  allTimeBilled: number;
  allTimePaid: number;
  avgPerSession: number;
  cleanClaimsThisWeek: number;
  totalClaimsThisWeek: number;
  topPayer: string;
  topPayerAvgDays: number;
  nextDepositDate: string;
  nextDepositAmount: number;
}

// ─── Load / initialize demo data ─────────────────────────────────────

const ZERO_REVENUE: RevenueData = {
  thisWeekBilled: 0,
  thisWeekPaid: 0,
  thisWeekPending: 0,
  thisMonthBilled: 0,
  thisMonthPaid: 0,
  allTimeBilled: 0,
  allTimePaid: 0,
  avgPerSession: 0,
  cleanClaimsThisWeek: 0,
  totalClaimsThisWeek: 0,
  topPayer: '—',
  topPayerAvgDays: 0,
  nextDepositDate: '—',
  nextDepositAmount: 0,
};

function loadRevenueData(): RevenueData {
  try {
    const stored = localStorage.getItem('aminy_provider_revenue');
    if (stored) return JSON.parse(stored) as RevenueData;
  } catch { /* ignore */ }

  // Real providers start at zero — no Stripe wiring yet, so we must NOT fabricate
  // revenue. Only demo mode shows illustrative sample figures (and never persists
  // them, so they can't leak into a real account later).
  if (!isDemoMode()) {
    return ZERO_REVENUE;
  }

  // Illustrative sample data — demo walkthroughs only.
  const data: RevenueData = {
    thisWeekBilled: 2100,
    thisWeekPaid: 1680,
    thisWeekPending: 420,
    thisMonthBilled: 8400,
    thisMonthPaid: 7140,
    allTimeBilled: 24500,
    allTimePaid: 20825,
    avgPerSession: 175,
    cleanClaimsThisWeek: 11,
    totalClaimsThisWeek: 12,
    topPayer: 'United Healthcare',
    topPayerAvgDays: 19,
    nextDepositDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    nextDepositAmount: 420,
  };

  return data;
}

// ─── Update revenue when session is billed ────────────────────────────

export function recordBilledSession(amountCents: number, isPaid = false): void {
  const data = loadRevenueData();
  const amount = amountCents / 100;
  data.thisWeekBilled += amount;
  data.thisMonthBilled += amount;
  data.allTimeBilled += amount;
  data.totalClaimsThisWeek += 1;

  if (isPaid) {
    data.thisWeekPaid += amount;
    data.thisMonthPaid += amount;
    data.allTimePaid += amount;
    data.cleanClaimsThisWeek += 1;
  } else {
    data.thisWeekPending += amount;
    data.nextDepositAmount += amount;
  }

  try {
    localStorage.setItem('aminy_provider_revenue', JSON.stringify(data));
  } catch { /* ignore */ }
}

// ─── Format helpers ───────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

// ─── Component ────────────────────────────────────────────────────────

interface PracticeRevenueWidgetProps {
  onViewDetails?: () => void;
  compact?: boolean;
}

export function PracticeRevenueWidget({ onViewDetails, compact = false }: PracticeRevenueWidgetProps) {
  const data = useMemo(() => loadRevenueData(), []);
  const cleanRate = data.totalClaimsThisWeek > 0
    ? Math.round((data.cleanClaimsThisWeek / data.totalClaimsThisWeek) * 100)
    : 100;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">This Week</span>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-emerald-900">{fmt(data.thisWeekBilled)}</p>
            <p className="text-sm text-emerald-600">{fmt(data.thisWeekPaid)} paid</p>
          </div>
        </div>
        {data.nextDepositAmount > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700">
            <Clock className="w-3 h-3" />
            <span>Next deposit {data.nextDepositDate}: {fmt(data.nextDepositAmount)}</span>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#E8E4DF] bg-white p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-sm font-bold text-[#132F43]">Practice Revenue</span>
        </div>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex items-center gap-1 text-sm text-[#6B9080] font-medium hover:text-[#6B9080]"
          >
            Details
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* This week */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Billed', amount: data.thisWeekBilled, color: 'text-[#132F43]' },
          { label: 'Paid', amount: data.thisWeekPaid, color: 'text-emerald-700' },
          { label: 'Pending', amount: data.thisWeekPending, color: 'text-amber-600' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-[#F6FBFB] p-2.5 text-center">
            <p className={`text-base font-bold ${item.color}`}>{fmt(item.amount)}</p>
            <p className="text-sm text-[#5A6B7A] mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* This month / All-time */}
      <div className="flex gap-4 border-t border-[#E8E4DF] pt-3">
        <div>
          <p className="text-sm text-[#5A6B7A]">This month</p>
          <p className="text-sm font-bold text-[#132F43]">{fmt(data.thisMonthBilled)}</p>
          <p className="text-sm text-[#5A6B7A]">{fmt(data.thisMonthPaid)} collected</p>
        </div>
        <div className="border-l border-[#E8E4DF] pl-4">
          <p className="text-sm text-[#5A6B7A]">All-time</p>
          <p className="text-sm font-bold text-[#132F43]">{fmt(data.allTimeBilled)}</p>
          <p className="text-sm text-[#5A6B7A]">{fmt(data.allTimePaid)} collected</p>
        </div>
        <div className="border-l border-[#E8E4DF] pl-4 ml-auto">
          <p className="text-sm text-[#5A6B7A]">Avg/session</p>
          <p className="text-sm font-bold text-[#132F43]">${data.avgPerSession}</p>
        </div>
      </div>

      {/* Clean claims + Top payer */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800">
            Clean claims: {data.cleanClaimsThisWeek} of {data.totalClaimsThisWeek} this week ({cleanRate}%)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700">
            {data.topPayer} pays fastest — avg {data.topPayerAvgDays} days
          </p>
        </div>
      </div>

      {/* Next deposit */}
      {data.nextDepositAmount > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-[#EEF4F8] border border-blue-100 p-3">
          <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#4A6478]">Expected next deposit</p>
            <p className="text-sm text-blue-700">
              {data.nextDepositDate} — {fmt(data.nextDepositAmount)} (pending clean claims)
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default PracticeRevenueWidget;
