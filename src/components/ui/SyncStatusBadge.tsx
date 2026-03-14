import React from 'react';
import { Badge } from './badge';
import { AlertTriangle, CheckCircle2, Clock3, Laptop } from 'lucide-react';
import { type SyncStatus } from '../../lib/product-truth';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  className?: string;
}

const META = {
  synced: {
    label: 'Synced',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  pending_sync: {
    label: 'Pending sync',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: Clock3,
  },
  local_only: {
    label: 'Local only',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Laptop,
  },
  sync_failed: {
    label: 'Sync failed',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: AlertTriangle,
  },
} as const;

export function SyncStatusBadge({ status, className }: SyncStatusBadgeProps) {
  const meta = META[status];
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        meta.className,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{meta.label}</span>
    </Badge>
  );
}

export default SyncStatusBadge;
