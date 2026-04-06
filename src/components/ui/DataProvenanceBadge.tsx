// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Badge } from './badge';
import { Clock3, Database, ShieldCheck } from 'lucide-react';
import {
  type DataProvenance,
  formatTimestamp,
} from '../../lib/product-truth';

interface DataProvenanceBadgeProps {
  provenance: DataProvenance;
  className?: string;
}

export function DataProvenanceBadge({ provenance, className }: DataProvenanceBadgeProps) {
  const styles = {
    live: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    sample: 'border-amber-200 bg-amber-50 text-amber-700',
    local: 'border-slate-200 bg-slate-100 text-slate-700',
  } as const;

  const Icon = provenance.isVerified ? ShieldCheck : provenance.source === 'live' ? Database : Clock3;
  const timestamp = formatTimestamp(provenance.lastUpdatedAt);

  return (
    <Badge
      variant="outline"
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        styles[provenance.source],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={timestamp ? `${provenance.label} • ${timestamp}` : provenance.label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{provenance.label}</span>
      {timestamp ? <span className="opacity-80">• {timestamp}</span> : null}
    </Badge>
  );
}

export default DataProvenanceBadge;
