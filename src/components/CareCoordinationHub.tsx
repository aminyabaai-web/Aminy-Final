// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Care Coordination Hub — the single screen that answers:
 *   "Where are we with my kid's care, across every service?"
 *
 * Surfaces, for each of ABA / PT / OT / ST / Mental Health / Pediatrician:
 *   - Authorization status (pending, approved, expiring, denied)
 *   - Site of care (in-home, clinic, telehealth, school)
 *   - Provider on record (with phone/email)
 *   - Last visit + next appointment
 *   - Action shortcuts: book, call, message, request auth, ask Aminy
 *
 * Parents finally have one place to see the whole picture instead of
 * juggling 5 portals + 8 phone numbers.
 */

import React, { useEffect, useState } from 'react';
import {
  ChevronRight, Activity, Brain, Hand, MessageCircle, Stethoscope, HeartPulse,
  Calendar, Phone, MapPin, ShieldCheck, ShieldAlert, Plus, Sparkles, Clock, Building, Home, Video, School, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { AISparkleButton } from './AISparkleButton';
import { AddToCalendarButtons } from './AddToCalendarButtons';
import { ScreenHeader } from './ui/ScreenHeader';

// ─── Service taxonomy ────────────────────────────────────────────────────────

export type ServiceType = 'ABA' | 'PT' | 'OT' | 'ST' | 'MentalHealth' | 'Pediatrician';
export type SiteOfCare = 'in_home' | 'clinic' | 'telehealth' | 'school' | 'community';
export type AuthStatus = 'none' | 'pending' | 'approved' | 'expiring' | 'denied' | 'not_required';

const SERVICE_META: Record<ServiceType, {
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  typicallyAuthRequired: boolean;
  preferredSites: SiteOfCare[];
}> = {
  ABA:          { label: 'ABA Therapy',          short: 'ABA', icon: Brain,       color: '#43AA8B', description: 'Applied Behavior Analysis — behavioral, communication, daily living skills',  typicallyAuthRequired: true,  preferredSites: ['in_home', 'clinic', 'telehealth'] },
  PT:           { label: 'Physical Therapy',     short: 'PT',  icon: Activity,    color: '#577590', description: 'Gross motor, balance, gait, mobility', typicallyAuthRequired: true,  preferredSites: ['clinic', 'school', 'in_home'] },
  OT:           { label: 'Occupational Therapy', short: 'OT',  icon: Hand,        color: '#9B5DE5', description: 'Fine motor, sensory processing, self-care skills',                                  typicallyAuthRequired: true,  preferredSites: ['clinic', 'school', 'in_home'] },
  ST:           { label: 'Speech Therapy',       short: 'ST',  icon: MessageCircle, color: '#E07A5F', description: 'Articulation, language, AAC, feeding/swallowing',                                  typicallyAuthRequired: true,  preferredSites: ['clinic', 'school', 'telehealth'] },
  MentalHealth: { label: 'Mental Health',        short: 'MH',  icon: HeartPulse,  color: '#F8B400', description: 'Therapy, psychiatry, parent coaching for emotional regulation',                    typicallyAuthRequired: true,  preferredSites: ['telehealth', 'clinic'] },
  Pediatrician: { label: 'Pediatrician',         short: 'PED', icon: Stethoscope, color: '#1a3a5c', description: 'Primary care, well-child visits, referral coordination',                            typicallyAuthRequired: false, preferredSites: ['clinic', 'telehealth'] },
};

const SITE_META: Record<SiteOfCare, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  in_home:    { label: 'In-home',    icon: Home },
  clinic:     { label: 'Clinic',     icon: Building },
  telehealth: { label: 'Telehealth', icon: Video },
  school:     { label: 'School',     icon: School },
  community:  { label: 'Community',  icon: MapPin },
};

interface ServiceRow {
  service: ServiceType;
  providerName?: string;
  providerPhone?: string;
  siteOfCare?: SiteOfCare;
  authStatus: AuthStatus;
  authExpiresAt?: string;
  nextAppointmentAt?: string;
  lastVisitAt?: string;
  sessionsThisMonth?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CareCoordinationHubProps {
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
  userId: string;
  childName?: string;
}

export function CareCoordinationHub({ onBack, onNavigate, userId, childName }: CareCoordinationHubProps) {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServiceStatus();
  }, [userId]);

  async function loadServiceStatus() {
    setIsLoading(true);

    // Pull appointments → derive next/last visit per service_type
    const { data: appts } = await supabase
      .from('appointments')
      .select('service_type, provider_name, location, start_at, status')
      .eq('user_id', userId)
      .order('start_at', { ascending: false })
      .limit(50);

    // Pull prior_auth_requests for auth status per service
    const { data: auths } = await supabase
      .from('prior_auth_requests')
      .select('service_type, status, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const now = Date.now();
    const rows: ServiceRow[] = (Object.keys(SERVICE_META) as ServiceType[]).map(service => {
      const serviceAppts = (appts || []).filter(a => a.service_type === service);
      const upcoming = serviceAppts.filter(a => new Date(a.start_at).getTime() > now && a.status === 'scheduled');
      const past = serviceAppts.filter(a => new Date(a.start_at).getTime() <= now && a.status !== 'cancelled');

      const auth = (auths || []).find(a => a.service_type === service);
      let authStatus: AuthStatus = SERVICE_META[service].typicallyAuthRequired ? 'none' : 'not_required';
      if (auth) {
        if (auth.status === 'approved' && auth.expires_at) {
          const expiresAt = new Date(auth.expires_at).getTime();
          const daysLeft = (expiresAt - now) / 86_400_000;
          authStatus = daysLeft < 30 ? 'expiring' : 'approved';
        } else if (auth.status === 'pending') {
          authStatus = 'pending';
        } else if (auth.status === 'denied') {
          authStatus = 'denied';
        }
      }

      return {
        service,
        providerName: serviceAppts[0]?.provider_name ?? undefined,
        siteOfCare: serviceAppts[0]?.location?.toLowerCase().includes('telehealth') ? 'telehealth'
                  : serviceAppts[0]?.location?.toLowerCase().includes('home')        ? 'in_home'
                  : serviceAppts[0]?.location?.toLowerCase().includes('school')      ? 'school'
                  : serviceAppts[0]?.location ? 'clinic' : undefined,
        authStatus,
        authExpiresAt: auth?.expires_at ?? undefined,
        nextAppointmentAt: upcoming[upcoming.length - 1]?.start_at,
        lastVisitAt: past[0]?.start_at,
        sessionsThisMonth: past.filter(a => {
          const days = (now - new Date(a.start_at).getTime()) / 86_400_000;
          return days <= 30;
        }).length,
      };
    });

    setServices(rows);
    setIsLoading(false);
  }

  const activeServices = services.filter(s =>
    s.providerName || s.nextAppointmentAt || s.authStatus !== 'none'
  );
  const inactiveServices = services.filter(s => !activeServices.includes(s));

  return (
    <div className="min-h-screen bg-mist pb-20">
      {/* Header */}
      <ScreenHeader
        title="Care Coordination"
        subtitle={childName ? `${childName}'s services in one place` : 'Every service · one view'}
        icon={<ShieldCheck className="w-6 h-6" />}
        onBack={onBack}
        variant="flat"
        actions={
          <AISparkleButton
            prompt={`Look at ${childName || 'my child'}'s care across ABA, PT, OT, ST, mental health. What's working, what authorizations are at risk, and what should I be coordinating this week?`}
            label="Ask Aminy"
            visual
          />
        }
      />

      {/* Quick stats banner */}
      <div className="mx-4 mt-4 rounded-2xl p-4 grid grid-cols-3 gap-3" style={{ background: 'linear-gradient(135deg, #43AA8B12 0%, #57759012 100%)', border: '1px solid #43AA8B25' }}>
        <Stat label="Active services" value={String(activeServices.length)} />
        <Stat label="Upcoming visits" value={String(services.filter(s => s.nextAppointmentAt).length)} />
        <Stat label="Auth alerts" value={String(services.filter(s => s.authStatus === 'expiring' || s.authStatus === 'pending' || s.authStatus === 'denied').length)} accent={services.some(s => s.authStatus === 'expiring' || s.authStatus === 'denied')} />
      </div>

      {/* Active services */}
      {activeServices.length > 0 && (
        <div className="mt-5">
          <p className="px-4 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Active care</p>
          <div className="space-y-2 px-4">
            {activeServices.map(row => (
              <ServiceCard key={row.service} row={row} onNavigate={onNavigate} childName={childName} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive (add new service) */}
      {inactiveServices.length > 0 && (
        <div className="mt-5">
          <p className="px-4 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Add a service</p>
          <div className="space-y-2 px-4">
            {inactiveServices.map(row => {
              const meta = SERVICE_META[row.service];
              const Icon = meta.icon;
              return (
                <button
                  key={row.service}
                  onClick={() => onNavigate?.('marketplace')}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-dashed border-[#E8E4DF] hover:border-[#6B9080]/30 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}15` }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1B2733]">{meta.label}</p>
                    <p className="text-sm text-[#5A6B7A] truncate">{meta.description}</p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Site of care education */}
      <div className="mx-4 mt-5 rounded-2xl bg-white border border-[#E8E4DF] p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Site of Care Guide</p>
        </div>
        <p className="text-sm text-[#3A4A57] mb-3">Where care happens shapes what your child actually learns. Aminy will recommend the right setting per service.</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SITE_META) as SiteOfCare[]).map(site => {
            const meta = SITE_META[site];
            const Icon = meta.icon;
            return (
              <div key={site} className="flex items-center gap-2 p-2 rounded-xl bg-[#FAF7F2]">
                <Icon className="w-4 h-4 text-[#5A6B7A] shrink-0" />
                <span className="text-sm text-[#3A4A57]">{meta.label}</span>
              </div>
            );
          })}
        </div>
        <AISparkleButton
          prompt={`Which site of care is best for ${childName || 'my child'} for each service they receive? Consider their age, sensory profile, and typical week.`}
          label="Get my recommendations"
          className="mt-3 w-full justify-center"
        />
      </div>

      {/* Loading shimmer */}
      {isLoading && activeServices.length === 0 && (
        <div className="px-4 mt-4 space-y-2">
          <div className="h-20 rounded-2xl bg-[#F0EDE8] animate-pulse" />
          <div className="h-20 rounded-2xl bg-[#F0EDE8] animate-pulse" />
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold" style={{ color: accent ? '#E07A5F' : '#0D1B2A' }}>{value}</p>
      <p className="text-xs text-[#5A6B7A] uppercase tracking-wide">{label}</p>
    </div>
  );
}

function AuthBadge({ status, expiresAt }: { status: AuthStatus; expiresAt?: string }) {
  const styles: Record<AuthStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    none:         { bg: 'bg-[#F0EDE8]',   text: 'text-[#5A6B7A]',   label: 'No auth on file', icon: <ShieldAlert className="w-3 h-3" /> },
    pending:      { bg: 'bg-amber-50',    text: 'text-amber-700',   label: 'Pending',          icon: <Clock className="w-3 h-3" /> },
    approved:     { bg: 'bg-[#6B9080]/10',     text: 'text-[#6B9080]',    label: 'Approved',         icon: <ShieldCheck className="w-3 h-3" /> },
    expiring:     { bg: 'bg-orange-50',   text: 'text-orange-700',  label: 'Expiring soon',    icon: <AlertTriangle className="w-3 h-3" /> },
    denied:       { bg: 'bg-red-50',      text: 'text-red-700',     label: 'Denied — appeal',  icon: <AlertTriangle className="w-3 h-3" /> },
    not_required: { bg: 'bg-[#FAF7F2]',    text: 'text-[#5A6B7A]',   label: 'No auth needed',   icon: <ShieldCheck className="w-3 h-3" /> },
  };
  const s = styles[status];
  let labelText = s.label;
  if (status === 'expiring' && expiresAt) {
    const days = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
    labelText = `Expires in ${days}d`;
  }
  return (
    <span className={`flex items-center gap-1 text-xs ${s.bg} ${s.text} px-2 py-0.5 rounded-full font-medium whitespace-nowrap`}>
      {s.icon}{labelText}
    </span>
  );
}

function ServiceCard({ row, onNavigate, childName }: { row: ServiceRow; onNavigate?: (screen: string) => void; childName?: string }) {
  const meta = SERVICE_META[row.service];
  const Icon = meta.icon;
  const SiteIcon = row.siteOfCare ? SITE_META[row.siteOfCare].icon : null;

  return (
    <div className="rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}15` }}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[#1B2733]">{meta.label}</p>
              <AuthBadge status={row.authStatus} expiresAt={row.authExpiresAt} />
            </div>
            {row.providerName && (
              <p className="text-sm text-[#5A6B7A] truncate mt-0.5">{row.providerName}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {row.siteOfCare && SiteIcon && (
                <span className="flex items-center gap-1 text-sm text-[#5A6B7A]">
                  <SiteIcon className="w-3 h-3" />{SITE_META[row.siteOfCare].label}
                </span>
              )}
              {typeof row.sessionsThisMonth === 'number' && row.sessionsThisMonth > 0 && (
                <span className="text-sm text-[#5A6B7A]">{row.sessionsThisMonth} sessions this month</span>
              )}
            </div>
          </div>
        </div>

        {/* Next appointment */}
        {row.nextAppointmentAt && (
          <div className="mt-3 px-3 py-2 rounded-xl space-y-2" style={{ background: `${meta.color}10` }}>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
              <p className="text-sm flex-1" style={{ color: meta.color }}>
                <span className="font-semibold">Next:</span>{' '}
                {new Date(row.nextAppointmentAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
            <AddToCalendarButtons
              appointment={{
                title: `${meta.label}${row.providerName ? ` — ${row.providerName}` : ''}`,
                provider: row.providerName,
                service_type: row.service,
                start_iso: row.nextAppointmentAt,
                location: row.siteOfCare,
              }}
              variant="inline"
              label={null}
            />
          </div>
        )}

        {/* Action row */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onNavigate?.('marketplace')}
            className="flex-1 text-xs font-medium px-3 py-2 rounded-xl border border-[#E8E4DF] text-[#3A4A57] hover:bg-[#FAF7F2]"
          >
            Book
          </button>
          {row.authStatus === 'denied' || row.authStatus === 'expiring' || row.authStatus === 'none' ? (
            <button
              onClick={() => onNavigate?.('prior-auth')}
              className="flex-1 text-xs font-medium px-3 py-2 rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)' }}
            >
              {row.authStatus === 'denied' ? 'Appeal' : 'Request auth'}
            </button>
          ) : (
            <AISparkleButton
              prompt={`For ${childName || 'my child'}'s ${meta.label}: review the current authorization, recent visits, and progress. Tell me what to focus on with this provider this month.`}
              label="Ask Aminy"
              className="flex-1 justify-center"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CareCoordinationHub;
