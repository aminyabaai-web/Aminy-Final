// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CentralReach Parent-Facing Sync Status
 *
 * Simple, parent-friendly display showing when data was last synced
 * with their child's therapy provider system (CentralReach).
 *
 * Features:
 *   - Simple text: "Last synced with [Provider]'s system: 2 hours ago"
 *   - Color indicator: green (<6hrs), yellow (<24hrs), red (>24hrs)
 *   - "Sync now" button for immediate pull
 *   - Shows what data is synced: sessions, goals, home programs, authorizations
 *   - Expandable detail view per data type with individual freshness
 *
 * Design principles:
 *   - No jargon — parents don't know what "CentralReach" or "sync" means
 *   - Use provider name when available, fall back to "your provider's system"
 *   - Green/yellow/red visual language is universally understood
 *   - Expandable for curious parents, collapsed by default
 *
 * Accessed from: Dashboard header, Settings -> Data Sync
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Target,
  Home,
  Shield,
  FileText,
  Sparkles,
  Heart,
  BookOpen,
} from 'lucide-react';
import { syncScheduler } from '../lib/centralreach-sync-scheduler';
import type {
  SyncRecord,
  SyncDataType,
} from '../lib/centralreach-sync-scheduler';

// ============================================================================
// Types
// ============================================================================

interface CRSyncStatusProps {
  userId: string;
  childId?: string;
  /** Provider name to display (e.g., "Dr. Smith") */
  providerName?: string;
  /** Compact mode for dashboard header (hides detail view) */
  compact?: boolean;
  /** Callback when sync completes */
  onSyncComplete?: () => void;
}

type FreshnessLevel = 'fresh' | 'aging' | 'stale';

interface DataTypeDisplay {
  dataType: SyncDataType;
  label: string;
  description: string;
  icon: typeof Calendar;
  direction: 'pull' | 'push';
  category: 'received' | 'sent';
}

// ============================================================================
// Constants
// ============================================================================

const FRESHNESS_THRESHOLDS = {
  fresh: 6 * 60 * 60 * 1000, // < 6 hours
  aging: 24 * 60 * 60 * 1000, // < 24 hours
  // Anything beyond 24 hours is stale
};

const FRESHNESS_CONFIG = {
  fresh: {
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    dotColor: 'bg-green-500',
    label: 'Up to date',
    ringColor: 'ring-green-400',
  },
  aging: {
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dotColor: 'bg-amber-500',
    label: 'Updating soon',
    ringColor: 'ring-amber-400',
  },
  stale: {
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dotColor: 'bg-red-500',
    label: 'Needs sync',
    ringColor: 'ring-red-400',
  },
};

/** Data types shown to parents, in display order */
const DATA_TYPES: DataTypeDisplay[] = [
  {
    dataType: 'sessions',
    label: 'Therapy Sessions',
    description: 'Session notes, dates, and progress from your child\'s therapy appointments.',
    icon: Calendar,
    direction: 'pull',
    category: 'received',
  },
  {
    dataType: 'goals',
    label: 'Treatment Goals',
    description: 'Your child\'s current goals, progress levels, and target milestones.',
    icon: Target,
    direction: 'pull',
    category: 'received',
  },
  {
    dataType: 'home_programs',
    label: 'Home Programs',
    description: 'Activities assigned by your BCBA to practice at home.',
    icon: Home,
    direction: 'pull',
    category: 'received',
  },
  {
    dataType: 'insurance',
    label: 'Insurance & Authorizations',
    description: 'Coverage details and remaining authorized therapy sessions.',
    icon: Shield,
    direction: 'pull',
    category: 'received',
  },
  {
    dataType: 'behavior_logs',
    label: 'Behavior Logs',
    description: 'Your ABC logs shared with your child\'s therapy team.',
    icon: FileText,
    direction: 'push',
    category: 'sent',
  },
  {
    dataType: 'junior_results',
    label: 'Aminy Ease Progress',
    description: 'Calm, rewards, transition, and session data from your child\'s Aminy Ease sessions.',
    icon: Sparkles,
    direction: 'push',
    category: 'sent',
  },
  {
    dataType: 'wellness_data',
    label: 'Wellness Check-ins',
    description: 'Your wellness data shared with your care team for better support.',
    icon: Heart,
    direction: 'push',
    category: 'sent',
  },
  {
    dataType: 'routine_completions',
    label: 'Routine Progress',
    description: 'Daily routine completions shared with your treatment team.',
    icon: BookOpen,
    direction: 'push',
    category: 'sent',
  },
];

// ============================================================================
// Helpers
// ============================================================================

function getFreshnessLevel(lastSyncAt: string | null): FreshnessLevel {
  if (!lastSyncAt) return 'stale';
  const elapsed = Date.now() - new Date(lastSyncAt).getTime();
  if (elapsed < FRESHNESS_THRESHOLDS.fresh) return 'fresh';
  if (elapsed < FRESHNESS_THRESHOLDS.aging) return 'aging';
  return 'stale';
}

function getOverallFreshness(records: SyncRecord[]): FreshnessLevel {
  if (records.length === 0) return 'stale';

  const pullRecords = records.filter((r) => r.direction === 'pull');
  if (pullRecords.length === 0) return 'stale';

  const levels = pullRecords.map((r) => getFreshnessLevel(r.lastSyncAt));
  if (levels.includes('stale')) return 'stale';
  if (levels.includes('aging')) return 'aging';
  return 'fresh';
}

function timeAgoFriendly(dateStr: string | null): string {
  if (!dateStr) return 'Never synced';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  }
  if (seconds < 86400) {
    const hrs = Math.floor(seconds / 3600);
    return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function getMostRecentSync(records: SyncRecord[]): string | null {
  let latest: string | null = null;
  for (const record of records) {
    if (record.lastSyncAt && (!latest || record.lastSyncAt > latest)) {
      latest = record.lastSyncAt;
    }
  }
  return latest;
}

// ============================================================================
// Sub-Components
// ============================================================================

function FreshnessDot({ level }: { level: FreshnessLevel }) {
  const cfg = FRESHNESS_CONFIG[level];
  return (
    <span className="relative flex h-3 w-3">
      {level !== 'fresh' && (
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${cfg.dotColor}`}
        />
      )}
      <span
        className={`relative inline-flex rounded-full h-3 w-3 ${cfg.dotColor}`}
      />
    </span>
  );
}

function DataTypeRow({
  display,
  record,
}: {
  display: DataTypeDisplay;
  record: SyncRecord | undefined;
}) {
  const freshness = getFreshnessLevel(record?.lastSyncAt ?? null);
  const cfg = FRESHNESS_CONFIG[freshness];
  const Icon = display.icon;

  return (
    <div className="flex items-center gap-3 py-2">
      <Icon size={16} className="text-[#8A9BA8] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#132F43]">{display.label}</p>
        <p className="text-sm text-[#8A9BA8]">
          {record?.lastSyncAt
            ? timeAgoFriendly(record.lastSyncAt)
            : 'Not synced yet'}
          {record && record.recordsSynced > 0
            ? ` \u2022 ${record.recordsSynced} records`
            : ''}
        </p>
      </div>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
        {cfg.label}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CRSyncStatus({
  userId,
  providerName,
  compact = false,
  onSyncComplete,
}: CRSyncStatusProps) {
  const [records, setRecords] = useState<SyncRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await syncScheduler.init(userId);
      setRecords(syncScheduler.getStatus());
    } catch (err) {
      console.error('[CRSyncStatus] Failed to load:', err);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      // Sync all pull types (what parents care about most)
      await syncScheduler.syncAll();
      await loadData();
      onSyncComplete?.();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3">
        <Loader2 size={14} className="text-[#8A9BA8] animate-spin" />
        <span className="text-sm text-[#8A9BA8]">Checking sync status...</span>
      </div>
    );
  }

  const overallFreshness = getOverallFreshness(records);
  const freshCfg = FRESHNESS_CONFIG[overallFreshness];
  const mostRecentSync = getMostRecentSync(records);
  const providerLabel = providerName
    ? `${providerName}'s system`
    : "your provider's system";

  const FreshnessIcon =
    overallFreshness === 'fresh'
      ? CheckCircle2
      : overallFreshness === 'aging'
        ? AlertTriangle
        : XCircle;

  // Compact mode: just the dot + time + sync button
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <FreshnessDot level={overallFreshness} />
        <span className="text-sm text-[#5A6B7A]">
          {mostRecentSync ? timeAgoFriendly(mostRecentSync) : 'Not synced'}
        </span>
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="p-1 rounded-md hover:bg-[#F0EDE8] text-[#8A9BA8] disabled:opacity-50 transition-colors"
          title="Sync now"
        >
          {syncing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
        </button>
      </div>
    );
  }

  // Full view
  const receivedTypes = DATA_TYPES.filter((d) => d.category === 'received');
  const sentTypes = DATA_TYPES.filter((d) => d.category === 'sent');

  return (
    <div className="space-y-3">
      {/* Main Status Card */}
      <div
        className={`rounded-xl p-4 border ${freshCfg.bg} ${freshCfg.border}`}
      >
        <div className="flex items-center gap-3">
          <FreshnessIcon className={`w-6 h-6 ${freshCfg.color}`} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#132F43]">
              {overallFreshness === 'fresh'
                ? `Connected with ${providerLabel}`
                : overallFreshness === 'aging'
                  ? `Last synced with ${providerLabel}`
                  : `Not recently synced with ${providerLabel}`}
            </p>
            <p className="text-sm text-[#5A6B7A] mt-0.5">
              {mostRecentSync
                ? `Last synced: ${timeAgoFriendly(mostRecentSync)}`
                : 'No data has been synced yet'}
            </p>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              overallFreshness === 'stale'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-white hover:bg-[#FAF7F2] text-[#3A4A57] border border-[#E8E4DF]'
            }`}
          >
            {syncing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Sync Now
          </button>
        </div>
      </div>

      {/* Expandable Detail Section */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-1 py-1 text-left"
      >
        <span className="text-sm font-medium text-[#5A6B7A]">
          What data is synced?
        </span>
        {expanded ? (
          <ChevronDown size={14} className="text-[#8A9BA8]" />
        ) : (
          <ChevronRight size={14} className="text-[#8A9BA8]" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4">
          {/* Received from Provider */}
          <div>
            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wider mb-1 px-1">
              Received from your provider
            </p>
            <div className="bg-white rounded-lg border border-[#E8E4DF] divide-y divide-gray-100 px-3">
              {receivedTypes.map((display) => {
                const record = records.find(
                  (r) =>
                    r.dataType === display.dataType &&
                    r.direction === display.direction,
                );
                return (
                  <DataTypeRow
                    key={display.dataType}
                    display={display}
                    record={record}
                  />
                );
              })}
            </div>
          </div>

          {/* Sent to Provider */}
          <div>
            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wider mb-1 px-1">
              Shared with your provider
            </p>
            <div className="bg-white rounded-lg border border-[#E8E4DF] divide-y divide-gray-100 px-3">
              {sentTypes.map((display) => {
                const record = records.find(
                  (r) =>
                    r.dataType === display.dataType &&
                    r.direction === display.direction,
                );
                return (
                  <DataTypeRow
                    key={display.dataType}
                    display={display}
                    record={record}
                  />
                );
              })}
            </div>
          </div>

          {/* Privacy Note */}
          <div className="bg-[#FAF7F2] rounded-lg p-3 border border-[#E8E4DF]">
            <p className="text-sm text-[#5A6B7A] leading-relaxed">
              Your data is encrypted and only shared with your authorized care
              team. You can control what data is shared in Settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CRSyncStatus;
