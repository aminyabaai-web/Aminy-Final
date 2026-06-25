// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ERA835Viewer — Remittance Advice Viewer
 * Displays ERA/835 claim payment details with color-coded status,
 * adjustment breakdowns, and appeal/post actions.
 */

import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Gavel,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { ERA835Result, PaidClaimLine } from '../../lib/era-835-parser';
import { isActionableDenial } from '../../lib/era-835-parser';

// ============================================================================
// Props
// ============================================================================

interface ERA835ViewerProps {
  era: ERA835Result;
  onAppeal?: (era: ERA835Result) => void;
  onPost?: (era: ERA835Result) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============================================================================
// Status chip
// ============================================================================

function LineStatusBadge({ status }: { status: PaidClaimLine['claimStatus'] }) {
  switch (status) {
    case 'paid':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" />
          Paid
        </span>
      );
    case 'partial':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <AlertTriangle className="w-3 h-3" />
          Partial
        </span>
      );
    case 'denied':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          Denied
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0EDE8] text-[#5A6B7A]">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
  }
}

function OverallStatusBadge({ status }: { status: ERA835Result['claimStatus'] }) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-100 text-green-700 border-green-200">Paid in Full</Badge>;
    case 'partial':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Partial Payment</Badge>;
    case 'denied':
      return <Badge className="bg-red-100 text-red-700 border-red-200">Denied</Badge>;
  }
}

// ============================================================================
// Claim line row
// ============================================================================

function ClaimLineRow({ line }: { line: PaidClaimLine }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasAdjustments = line.adjustments.length > 0;

  const rowBg =
    line.claimStatus === 'denied'
      ? 'bg-red-50 border-red-100'
      : line.claimStatus === 'partial'
      ? 'bg-amber-50 border-amber-100'
      : 'bg-white border-[#E8E4DF]';

  return (
    <div className={`rounded-xl border mb-2 overflow-hidden ${rowBg}`}>
      {/* Main row */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-sm text-[#1B2733]">{line.procedureCode}</span>
            <LineStatusBadge status={line.claimStatus} />
          </div>
          <span className="text-sm text-[#8A9BA8]">{formatDate(line.serviceDate)}</span>
        </div>

        {/* Amounts grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Billed', value: line.billedAmount, cls: 'text-[#3A4A57]' },
            { label: 'Allowed', value: line.allowedAmount, cls: 'text-blue-600' },
            { label: 'Paid', value: line.paidAmount, cls: line.paidAmount > 0 ? 'text-green-600' : 'text-red-500' },
            { label: 'Pt. Resp.', value: line.patientResponsibility, cls: 'text-amber-600' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-white/60 rounded-lg py-1.5 px-1">
              <p className="text-sm text-[#8A9BA8] mb-0.5">{label}</p>
              <p className={`text-sm font-semibold ${cls}`}>{formatCurrency(value)}</p>
            </div>
          ))}
        </div>

        {/* Denial reason summary */}
        {line.denialReason && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
            {line.denialReason}
          </p>
        )}

        {/* Toggle adjustments */}
        {hasAdjustments && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <ArrowUpRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            {expanded ? 'Hide' : 'Show'} {line.adjustments.length} adjustment{line.adjustments.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Adjustments detail */}
      {expanded && hasAdjustments && (
        <div className="border-t border-[#E8E4DF] bg-white/80 px-4 py-3 space-y-1.5">
          {line.adjustments.map((adj, i) => (
            <div key={i} className="flex items-start justify-between gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <span className={`font-medium mr-1 ${
                  adj.adjustmentGroupCode === 'CO' ? 'text-orange-600' :
                  adj.adjustmentGroupCode === 'PR' ? 'text-blue-600' : 'text-[#5A6B7A]'
                }`}>
                  {adj.adjustmentGroupCode}-{adj.reasonCode}
                </span>
                <span className="text-[#5A6B7A] truncate">{adj.description}</span>
              </div>
              <span className="font-semibold text-[#3A4A57] shrink-0">
                -{formatCurrency(adj.adjustmentAmount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function ERA835Viewer({ era, onAppeal, onPost }: ERA835ViewerProps) {
  const canAppeal = isActionableDenial(era);

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card className="p-5 rounded-2xl border-0 shadow-sm bg-white">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#EEF4F8] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-[#1B2733] text-sm leading-tight">ERA Remittance</h2>
              <p className="text-sm text-[#8A9BA8]">Check #{era.checkNumber}</p>
            </div>
          </div>
          <OverallStatusBadge status={era.claimStatus} />
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Payer', value: era.payerName || era.payerId },
            { label: 'Payment Date', value: formatDate(era.paymentDate) },
            { label: 'Patient', value: era.patientName || '—' },
            { label: 'Member ID', value: era.memberId || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#FAF7F2] rounded-xl px-3 py-2">
              <p className="text-sm text-[#8A9BA8] mb-0.5">{label}</p>
              <p className="text-sm font-medium text-[#3A4A57] truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Total payment */}
        <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800">Total Payment</span>
          </div>
          <span className="text-xl font-bold text-green-700">{formatCurrency(era.totalPayment)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canAppeal && onAppeal && (
            <Button
              onClick={() => onAppeal(era)}
              className="flex-1 h-9 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#E07A5F' }}
            >
              <Gavel className="w-4 h-4 mr-1.5" />
              Appeal This Denial
            </Button>
          )}
          {onPost && (
            <Button
              onClick={() => onPost(era)}
              className="flex-1 h-9 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#43AA8B' }}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Post to Claim
            </Button>
          )}
        </div>
      </Card>

      {/* Claim lines */}
      {era.claimLines.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide px-1 mb-2">
            Service Lines ({era.claimLines.length})
          </h3>
          <div>
            {era.claimLines.map((line, i) => (
              <ClaimLineRow key={`${line.procedureCode}-${i}`} line={line} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ERA835Viewer;
