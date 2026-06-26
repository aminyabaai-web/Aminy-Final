// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * CalendarConnectionCard — Settings card for calendar integration.
 *
 * Three options:
 *   - Google Calendar (OAuth, auto-push)
 *   - Outlook Calendar (OAuth, auto-push)
 *   - Apple Calendar / Any Calendar (.ics file, universal — works on iOS,
 *     macOS Calendar.app, Outlook, Yahoo, anything)
 *
 * One OAuth provider connected at a time. Apple .ics is always available
 * (per-appointment download), regardless of OAuth state.
 */

import React, { useEffect, useState } from 'react';
import { Calendar, Check, ExternalLink, Loader2, Unlink, AlertCircle, Apple, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCalendarConnection,
  startConnect,
  disconnect,
  type CalendarConnection,
} from '../lib/calendar-providers';

const PROVIDER_META = {
  google:  { label: 'Google Calendar',  hint: 'OAuth · auto-push on every new appointment' },
  outlook: { label: 'Outlook Calendar', hint: 'OAuth · auto-push on every new appointment' },
  apple:   { label: 'Apple Calendar / Other', hint: 'Universal .ics file — works with iCloud, Outlook, anything' },
} as const;

export function CalendarConnectionCard() {
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    try { setConnection(await getCalendarConnection()); }
    catch { setConnection({ connected: false }); }
    finally { setIsLoading(false); }
  }

  async function handleConnect(provider: 'google' | 'outlook') {
    setWorking(provider);
    try {
      const url = await startConnect(provider);
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || `Could not start ${provider} connect`);
      setWorking(null);
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${connection?.provider || 'calendar'}?`)) return;
    setWorking('disconnect');
    try {
      await disconnect();
      toast.success('Calendar disconnected');
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Disconnect failed');
    } finally {
      setWorking(null);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white border border-[#E8E4DF] p-4 flex items-center justify-center min-h-[88px]">
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
      </div>
    );
  }

  const isConnected = connection?.connected && connection.provider && connection.provider !== 'apple';
  const activeProvider = isConnected ? connection?.provider as 'google' | 'outlook' : null;

  return (
    <div className="rounded-2xl bg-white border border-[#E8E4DF] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: activeProvider ? '#4E93A815' : '#f1f5f9' }}>
          <Calendar className="w-5 h-5" style={{ color: activeProvider ? '#4E93A8' : '#64748b' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1B2733]">Calendar</p>
          <p className="text-sm text-[#5A6B7A] mt-0.5">
            {activeProvider
              ? `Connected to ${PROVIDER_META[activeProvider].label}`
              : 'Push Aminy appointments to your calendar of choice'}
          </p>
        </div>
        {activeProvider && (
          <span className="text-xs bg-[#6B9080]/10 text-[#6B9080] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium shrink-0">
            <Check className="w-3 h-3" />Active
          </span>
        )}
        {connection && (connection.status === 'expired' || connection.status === 'error') && (
          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium shrink-0">
            <AlertCircle className="w-3 h-3" />Reconnect needed
          </span>
        )}
      </div>

      {/* Active connection details */}
      {activeProvider && (
        <div className="rounded-xl bg-[#FAF7F2] px-3 py-2.5">
          <p className="text-sm font-medium text-[#3A4A57]">{connection?.email || 'Connected'}</p>
          <p className="text-sm text-[#5A6B7A] mt-0.5">
            New appointments auto-push to your {PROVIDER_META[activeProvider].label}
            {connection?.lastSyncedAt ? ` · last synced ${new Date(connection.lastSyncedAt).toLocaleString()}` : ''}
          </p>
          <button
            onClick={handleDisconnect}
            disabled={working === 'disconnect'}
            className="mt-2 flex items-center gap-1.5 text-sm text-[#5A6B7A] hover:text-red-500 font-medium"
          >
            {working === 'disconnect' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
            Disconnect
          </button>
        </div>
      )}

      {/* Provider buttons — only show what's NOT currently connected */}
      <div className="space-y-2">
        {activeProvider !== 'google' && (
          <ProviderButton
            icon={<GoogleIcon />}
            title={PROVIDER_META.google.label}
            hint={PROVIDER_META.google.hint}
            working={working === 'google'}
            onClick={() => handleConnect('google')}
            cta="Connect"
          />
        )}
        {activeProvider !== 'outlook' && (
          <ProviderButton
            icon={<OutlookIcon />}
            title={PROVIDER_META.outlook.label}
            hint={PROVIDER_META.outlook.hint}
            working={working === 'outlook'}
            onClick={() => handleConnect('outlook')}
            cta="Connect"
          />
        )}
        <ProviderButton
          icon={<Apple className="w-5 h-5 text-[#3A4A57]" />}
          title={PROVIDER_META.apple.label}
          hint={PROVIDER_META.apple.hint}
          working={false}
          isPassive
          cta="Always on"
        />
      </div>

      <p className="text-sm text-slate-400 leading-relaxed">
        Apple/iCloud doesn't allow third-party OAuth, so we use universal .ics files — tap "Add to Calendar" on any appointment to open it in Apple Calendar, Outlook, or your default app.
      </p>
    </div>
  );
}

function ProviderButton({
  icon, title, hint, working, isPassive, cta, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  working: boolean;
  isPassive?: boolean;
  cta: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={working || isPassive}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${
        isPassive
          ? 'border-[#E8E4DF] bg-[#FAF7F2] cursor-default'
          : 'border-[#E8E4DF] hover:border-[#6B9080]/30 hover:bg-[#6B9080]/10/30'
      } ${working ? 'opacity-50' : ''}`}
    >
      <div className="w-9 h-9 rounded-lg bg-white border border-[#E8E4DF] flex items-center justify-center shrink-0">
        {working ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1B2733]">{title}</p>
        <p className="text-sm text-[#5A6B7A] truncate">{hint}</p>
      </div>
      <span className={`text-sm font-semibold shrink-0 ${isPassive ? 'text-slate-400' : 'text-[#6B9080]'}`}>
        {isPassive ? <FileDown className="w-3.5 h-3.5 inline" /> : null} {cta}
      </span>
    </button>
  );
}

// Inline brand icons (avoid extra deps)
function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0078D4">
      <path d="M7.88 12.04c0 .76-.22 1.41-.66 1.95-.44.54-1.04.81-1.78.81-.7 0-1.27-.27-1.7-.81-.44-.55-.66-1.18-.66-1.91 0-.78.22-1.43.66-1.96.44-.53 1.03-.79 1.76-.79.74 0 1.32.26 1.74.79.42.53.64 1.17.64 1.92z" />
      <path d="M21 3H8.5a.5.5 0 0 0-.5.5V5H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9v1.5a.5.5 0 0 0 .5.5h7c.83 0 1.5-.67 1.5-1.5v-15A1.5 1.5 0 0 0 21 3zm-9.5 13H4V6h7.5v10zm9-2.5h-7V13h5v-2h-5V9h5V7h-5V5.5h7v8z" />
    </svg>
  );
}
