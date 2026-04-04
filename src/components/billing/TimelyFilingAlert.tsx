/**
 * TimelyFilingAlert — Claims at Risk Widget
 * Shows warning/critical/expired claims with actionable CTAs.
 * Supports compact mode for dashboard embedding.
 */

import React from 'react';
import {
  AlertTriangle,
  Clock,
  XCircle,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '../ui/card';
import { getTimelyFilingStatus, type TimelyFilingStatus } from '../../lib/timely-filing';

// ============================================================================
// Props
// ============================================================================

interface TimelyFilingAlertProps {
  claims: Array<{ serviceDate: string; payerId: string; claimId: string }>;
  onFileClaim?: (claimId: string) => void;
  compact?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_CONFIG = {
  expired: {
    label: 'Expired',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badgeBg: 'bg-red-100 text-red-700',
    icon: XCircle,
    iconColor: 'text-red-500',
  },
  critical: {
    label: 'Critical',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badgeBg: 'bg-orange-100 text-orange-700',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
  },
  warning: {
    label: 'Warning',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-700',
    icon: Clock,
    iconColor: 'text-amber-500',
  },
  ok: {
    label: 'OK',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-100',
    badgeBg: 'bg-green-100 text-green-700',
    icon: FileCheck,
    iconColor: 'text-green-500',
  },
} as const;

type AlertStatus = keyof typeof STATUS_CONFIG;

function daysLabel(s: TimelyFilingStatus): string {
  if (s.status === 'expired') {
    const overdue = Math.abs(s.daysRemaining);
    return `Expired ${overdue} day${overdue !== 1 ? 's' : ''} ago`;
  }
  return `${s.daysRemaining} day${s.daysRemaining !== 1 ? 's' : ''} left`;
}

// ============================================================================
// Single claim row
// ============================================================================

function ClaimRow({
  filing,
  onFileClaim,
  compact,
}: {
  filing: TimelyFilingStatus;
  onFileClaim?: (id: string) => void;
  compact: boolean;
}) {
  const cfg = STATUS_CONFIG[filing.status as AlertStatus] ?? STATUS_CONFIG.warning;
  const Icon = cfg.icon;

  return (
    <div className={`flex items-center gap-3 ${compact ? 'py-2' : 'py-3'} px-3 rounded-xl ${cfg.bg} border ${cfg.border} mb-2`}>
      <Icon className={`w-4 h-4 shrink-0 ${cfg.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">
          {filing.claimId.length > 12 ? `…${filing.claimId.slice(-10)}` : filing.claimId}
        </p>
        {!compact && (
          <p className="text-xs text-gray-500 mt-0.5">
            DOS: {formatDate(filing.serviceDate)} · Deadline: {formatDate(filing.deadlineDate)}
          </p>
        )}
        <p className={`text-xs font-medium mt-0.5 ${cfg.color}`}>{daysLabel(filing)}</p>
      </div>
      {onFileClaim && (
        <button
          onClick={() => onFileClaim(filing.claimId)}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
        >
          File Now
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Group section
// ============================================================================

function StatusGroup({
  status,
  filings,
  onFileClaim,
  compact,
}: {
  status: AlertStatus;
  filings: TimelyFilingStatus[];
  onFileClaim?: (id: string) => void;
  compact: boolean;
}) {
  const [expanded, setExpanded] = React.useState(!compact || status === 'critical' || status === 'expired');
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div className="mb-3">
      <button
        className="w-full flex items-center justify-between mb-1.5 px-1"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
          <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.badgeBg}`}>
            {filings.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div>
          {filings.map((f) => (
            <ClaimRow key={f.claimId} filing={f} onFileClaim={onFileClaim} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function TimelyFilingAlert({ claims, onFileClaim, compact = false }: TimelyFilingAlertProps) {
  const allStatuses = claims.map((c) => getTimelyFilingStatus(c));
  const expired = allStatuses.filter((s) => s.status === 'expired');
  const critical = allStatuses.filter((s) => s.status === 'critical');
  const warning = allStatuses.filter((s) => s.status === 'warning');

  const riskCount = expired.length + critical.length + warning.length;

  if (riskCount === 0) {
    return (
      <Card className={`${compact ? 'p-3' : 'p-4'} rounded-2xl border-0 shadow-sm bg-green-50`}>
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-green-700">All claims filing on time</span>
        </div>
        {!compact && (
          <p className="text-xs text-green-600 mt-1">{claims.length} claim{claims.length !== 1 ? 's' : ''} monitored — no timely filing risk detected.</p>
        )}
      </Card>
    );
  }

  return (
    <Card className={`${compact ? 'p-3' : 'p-5'} rounded-2xl border-0 shadow-sm bg-white`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3 className={`font-semibold text-gray-800 ${compact ? 'text-xs' : 'text-sm'}`}>
              Timely Filing Risk
            </h3>
            {!compact && (
              <p className="text-xs text-gray-400">{riskCount} claim{riskCount !== 1 ? 's' : ''} need attention</p>
            )}
          </div>
        </div>
        {compact && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {riskCount}
          </span>
        )}
      </div>

      {/* Groups */}
      {expired.length > 0 && (
        <StatusGroup status="expired" filings={expired} onFileClaim={onFileClaim} compact={compact} />
      )}
      {critical.length > 0 && (
        <StatusGroup status="critical" filings={critical} onFileClaim={onFileClaim} compact={compact} />
      )}
      {warning.length > 0 && (
        <StatusGroup status="warning" filings={warning} onFileClaim={onFileClaim} compact={compact} />
      )}

      {/* Footer count */}
      {!compact && claims.length > riskCount && (
        <p className="text-xs text-gray-400 text-center mt-2">
          {claims.length - riskCount} other claim{claims.length - riskCount !== 1 ? 's' : ''} on track
        </p>
      )}
    </Card>
  );
}

export default TimelyFilingAlert;
