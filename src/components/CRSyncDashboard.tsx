/**
 * CentralReach Sync Dashboard
 *
 * Shows parents the status of data syncing between Aminy and CentralReach.
 * Provides transparency about what data is flowing, when it last synced,
 * and any errors that need attention.
 *
 * Accessed from Settings → CentralReach Integration
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Shield,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { syncScheduler, type SyncDataType } from '../lib/centralreach-sync-scheduler';

interface CRSyncDashboardProps {
  userId: string;
  childId?: string;
  onBack?: () => void;
}

const DATA_TYPE_LABELS: Record<SyncDataType, { label: string; description: string }> = {
  sessions: { label: 'Therapy Sessions', description: 'Session notes, dates, and goals from your provider' },
  goals: { label: 'Treatment Goals', description: 'Current goals and progress from your BCBA' },
  insurance: { label: 'Insurance Info', description: 'Payer details, coverage, and authorization' },
  home_programs: { label: 'Home Programs', description: 'ABA programs assigned by your provider' },
  auth_status: { label: 'Authorization Status', description: 'Units approved, used, and remaining' },
  behavior_logs: { label: 'Behavior Logs', description: 'ABC data logged in Aminy sent to your provider' },
  routine_completions: { label: 'Routine Progress', description: 'Daily routine completions shared with your team' },
  junior_results: { label: 'Junior Sessions', description: 'Aminy Junior activity results for your provider' },
  wellness_data: { label: 'Caregiver Wellness', description: 'Your wellness check-ins shared with your team' },
};

type StatusColor = 'green' | 'yellow' | 'red' | 'gray';

function getStatusColor(status: string): StatusColor {
  switch (status) {
    case 'success': return 'green';
    case 'syncing': return 'yellow';
    case 'error': return 'red';
    case 'backoff': return 'red';
    default: return 'gray';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'success': return 'Synced';
    case 'syncing': return 'Syncing...';
    case 'error': return 'Error';
    case 'backoff': return 'Paused (retrying later)';
    case 'idle': return 'Not yet synced';
    default: return 'Unknown';
  }
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function CRSyncDashboard({ userId, childId, onBack }: CRSyncDashboardProps) {
  const [syncStatuses, setSyncStatuses] = useState(syncScheduler.getStatus());
  const [isConnected, setIsConnected] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [syncingItem, setSyncingItem] = useState<string | null>(null);

  // Refresh status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatuses([...syncScheduler.getStatus()]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsConnected(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncNow = useCallback(async (dataType: SyncDataType, direction: 'pull' | 'push') => {
    const key = `${dataType}:${direction}`;
    setSyncingItem(key);
    try {
      await syncScheduler.syncNow(dataType, direction);
      setSyncStatuses([...syncScheduler.getStatus()]);
    } catch {
      // Error is tracked in sync record
    }
    setSyncingItem(null);
  }, []);

  const pullStatuses = syncStatuses.filter(s => s.direction === 'pull');
  const pushStatuses = syncStatuses.filter(s => s.direction === 'push');

  const overallHealth = syncStatuses.every(s => s.status === 'success' || s.status === 'idle')
    ? 'healthy'
    : syncStatuses.some(s => s.status === 'error' || s.status === 'backoff')
    ? 'issues'
    : 'syncing';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">CentralReach Sync</h2>
          <p className="text-xs text-gray-500 mt-0.5">Data flowing between Aminy & your provider</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back
          </button>
        )}
      </div>

      {/* Overall status */}
      <div className={`rounded-xl p-4 border ${
        overallHealth === 'healthy'
          ? 'bg-green-50 border-green-200'
          : overallHealth === 'issues'
          ? 'bg-red-50 border-red-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center gap-3">
          {overallHealth === 'healthy' && <CheckCircle className="w-5 h-5 text-green-600" />}
          {overallHealth === 'issues' && <AlertTriangle className="w-5 h-5 text-red-600" />}
          {overallHealth === 'syncing' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {overallHealth === 'healthy' && 'All syncs healthy'}
              {overallHealth === 'issues' && 'Some syncs need attention'}
              {overallHealth === 'syncing' && 'Syncing in progress...'}
            </p>
            <p className="text-xs text-gray-500">
              {!isConnected ? (
                <span className="flex items-center gap-1 text-amber-600">
                  <WifiOff size={10} /> Offline — syncs will resume when connected
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Wifi size={10} /> Connected
                  <span className="mx-1">•</span>
                  <Shield size={10} /> HIPAA-encrypted
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Pull section: Provider → Aminy */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <ArrowDownCircle size={16} className="text-blue-500" />
          From Your Provider
        </h3>
        <div className="space-y-2">
          {pullStatuses.map((record) => {
            const meta = DATA_TYPE_LABELS[record.dataType];
            const color = getStatusColor(record.status);
            const key = `${record.dataType}:${record.direction}`;
            const expanded = expandedItem === key;
            const isSyncing = syncingItem === key || record.status === 'syncing';

            return (
              <div key={key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedItem(expanded ? null : key)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      color === 'green' ? 'bg-green-500' :
                      color === 'yellow' ? 'bg-yellow-500' :
                      color === 'red' ? 'bg-red-500' : 'bg-gray-300'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                      <p className="text-xs text-gray-500">{timeAgo(record.lastSyncAt)}</p>
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>

                {expanded && (
                  <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
                    <p className="text-xs text-gray-500">{meta.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Status: <span className="font-medium">{getStatusLabel(record.status)}</span></span>
                      {record.recordsSynced > 0 && (
                        <span className="text-gray-500">{record.recordsSynced} records</span>
                      )}
                    </div>
                    {record.lastError && (
                      <p className="text-xs text-red-600 bg-red-50 rounded p-2">{record.lastError}</p>
                    )}
                    <button
                      onClick={() => handleSyncNow(record.dataType, 'pull')}
                      disabled={isSyncing || !isConnected}
                      className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 disabled:text-gray-400 font-medium"
                    >
                      {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {isSyncing ? 'Syncing...' : 'Sync now'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Push section: Aminy → Provider */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <ArrowUpCircle size={16} className="text-teal-500" />
          To Your Provider
        </h3>
        <div className="space-y-2">
          {pushStatuses.map((record) => {
            const meta = DATA_TYPE_LABELS[record.dataType];
            const color = getStatusColor(record.status);
            const key = `${record.dataType}:${record.direction}`;
            const expanded = expandedItem === key;
            const isSyncing = syncingItem === key || record.status === 'syncing';

            return (
              <div key={key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedItem(expanded ? null : key)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      color === 'green' ? 'bg-green-500' :
                      color === 'yellow' ? 'bg-yellow-500' :
                      color === 'red' ? 'bg-red-500' : 'bg-gray-300'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                      <p className="text-xs text-gray-500">{timeAgo(record.lastSyncAt)}</p>
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>

                {expanded && (
                  <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
                    <p className="text-xs text-gray-500">{meta.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Status: <span className="font-medium">{getStatusLabel(record.status)}</span></span>
                      {record.recordsSynced > 0 && (
                        <span className="text-gray-500">{record.recordsSynced} records</span>
                      )}
                    </div>
                    {record.lastError && (
                      <p className="text-xs text-red-600 bg-red-50 rounded p-2">{record.lastError}</p>
                    )}
                    <button
                      onClick={() => handleSyncNow(record.dataType, 'push')}
                      disabled={isSyncing || !isConnected}
                      className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 disabled:text-gray-400 font-medium"
                    >
                      {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {isSyncing ? 'Syncing...' : 'Sync now'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy footer */}
      <p className="text-xs text-gray-400 text-center">
        All data is HIPAA-encrypted in transit and at rest. Only your authorized providers can access shared data.
      </p>
    </div>
  );
}

export default CRSyncDashboard;
