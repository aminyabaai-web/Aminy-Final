// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * OrgAdminDashboard — B2B admin screen for orgs (AACT pilots, schools, agencies, enterprise).
 *
 * Shows: seat usage, billing status, member roster, invite + remove members,
 * seat count adjustment, subscription management.
 *
 * Access: visible to org owners only (RLS-enforced on the API).
 */

import React, { useEffect, useState } from 'react';
import { Building2, Users, CreditCard, ChevronLeft, Plus, X, Mail, Crown, Shield, User, ArrowUpRight, AlertCircle, Check, Loader2, Activity, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { PartnerOutcomesWidget } from './PartnerOutcomesWidget';
import {
  getMyOrganization,
  getOrgMembers,
  getOrgUsage,
  inviteMember,
  removeMember,
  updateSeatCount,
  createOrgCheckoutSession,
  formatCents,
  getSeatPriceCents,
  MIN_SEATS,
  SEAT_PRICE_LADDER,
  type Organization,
  type OrgMember,
  type OrgUsage,
} from '../lib/org-licensing';
import { openSubscriptionCheckout } from '../lib/platform-purchase';
import { ScreenHeader } from './ui/ScreenHeader';

interface OrgAdminDashboardProps {
  onBack?: () => void;
}

export function OrgAdminDashboard({ onBack }: OrgAdminDashboardProps) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [usage, setUsage] = useState<OrgUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [seatEditMode, setSeatEditMode] = useState(false);
  const [newSeatCount, setNewSeatCount] = useState(0);

  useEffect(() => {
    (async () => {
      const o = await getMyOrganization();
      if (!o) {
        setIsLoading(false);
        return;
      }
      setOrg(o);
      setNewSeatCount(o.seatCount);
      const [m, u] = await Promise.all([getOrgMembers(o.id), getOrgUsage(o)]);
      setMembers(m);
      setUsage(u);
      setIsLoading(false);
    })();
  }, []);

  const refresh = async () => {
    if (!org) return;
    const [m, u] = await Promise.all([getOrgMembers(org.id), getOrgUsage(org)]);
    setMembers(m);
    setUsage(u);
  };

  const handleInvite = async () => {
    if (!org || !inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await inviteMember(org.id, inviteEmail.trim());
      toast.success(`Invited ${inviteEmail.trim()}`);
      setInviteEmail('');
      setShowInvite(false);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (memberId: string, email: string) => {
    if (!confirm(`Remove ${email} from the organization?`)) return;
    try {
      await removeMember(memberId);
      toast.success('Member removed');
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove');
    }
  };

  const handleSaveSeats = async () => {
    if (!org) return;
    if (newSeatCount < MIN_SEATS) {
      toast.error(`Seat count must be at least ${MIN_SEATS}`);
      return;
    }
    try {
      await updateSeatCount(org.id, newSeatCount);
      toast.success('Seat count updated — billing will adjust at next cycle');
      setSeatEditMode(false);
      const refreshedOrg = await getMyOrganization();
      if (refreshedOrg) {
        setOrg(refreshedOrg);
        const u = await getOrgUsage(refreshedOrg);
        setUsage(u);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update seats');
    }
  };

  // Volume ladder hint: "1 seat $89 · 2 $79 · 3 $69 · 4 $59 · 5+ $49/seat"
  const ladderHint = [...SEAT_PRICE_LADDER].reverse()
    .map((r, i, arr) => `${r.minSeats}${i === arr.length - 1 ? '+' : ''}${i === 0 ? ' seat' : ''} $${r.pricePerSeatCents / 100}`)
    .join(' · ') + '/seat';

  // Effective per-seat price for a seat count: orgs on negotiated pricing keep
  // their DB rate; everyone else gets the volume ladder rate for that count.
  const effectiveSeatPriceCents = (seats: number): number => {
    if (!org) return getSeatPriceCents(seats);
    const onLadder = org.pricePerSeatCents === getSeatPriceCents(org.seatCount);
    return onLadder ? getSeatPriceCents(seats) : org.pricePerSeatCents;
  };

  const handleStartCheckout = async (interval: 'month' | 'year') => {
    if (!org) return;
    try {
      const { url } = await createOrgCheckoutSession({
        orgId: org.id,
        interval,
        successUrl: `${window.location.origin}/org-admin?checkout=success`,
        cancelUrl: `${window.location.origin}/org-admin?checkout=cancelled`,
      });
      openSubscriptionCheckout(url);
    } catch (e: any) {
      toast.error(e?.message || 'Could not start checkout');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mist flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-mist flex flex-col">
        {onBack && (
          <div className="px-4 pt-3 pb-2">
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#5A6B7A]">
              <ChevronLeft className="w-4 h-4" />Back
            </button>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #7BA7BC 100%)' }}>
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-[#1B2733] mb-2">No organization yet</h1>
            <p className="text-sm text-[#5A6B7A] mb-4">Organizations are for solo BCBAs, clinics, schools, agencies, and AACT-style pilots — from a single seat to enterprise, under one billing account.</p>
            <p className="text-sm text-slate-400">Contact <a href="mailto:hello@aminy.ai" className="text-[#6B9080] underline">hello@aminy.ai</a> to set up your organization.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist pb-12">
      {/* Header */}
      <ScreenHeader
        title={org.name}
        icon={<Building2 className="w-6 h-6" />}
        onBack={onBack}
        variant="flat"
        actions={
          <>
            <span className="text-xs bg-[#F0EDE8] text-[#5A6B7A] px-2 py-0.5 rounded-full capitalize">{org.planType}</span>
            <StatusBadge status={org.subscriptionStatus} />
          </>
        }
      />

      {/* Billing card */}
      {usage && (
        <div className="mx-4 mt-4 rounded-2xl bg-white border border-[#E8E4DF] p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Billing</p>
          </div>

          <div className="space-y-3">
            <Row label="Monthly" value={formatCents(usage.monthlyAmountCents)} subtitle={`${org.seatCount} ${org.seatCount === 1 ? 'seat' : 'seats'} × ${formatCents(org.pricePerSeatCents)}/seat`} />
            <Row label="Annual (save 15%)" value={formatCents(usage.annualAmountCents)} subtitle="billed yearly" />
            {usage.nextBillingDate && (
              <Row label="Next billing" value={new Date(usage.nextBillingDate).toLocaleDateString()} />
            )}
          </div>

          {org.subscriptionStatus === 'inactive' && (
            <div className="mt-4 pt-4 border-t border-[#E8E4DF] flex gap-2">
              <button onClick={() => handleStartCheckout('month')} className="flex-1 text-sm font-semibold py-2.5 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #7BA7BC 100%)' }}>
                Start Monthly
              </button>
              <button onClick={() => handleStartCheckout('year')} className="flex-1 text-sm font-semibold py-2.5 rounded-xl border border-[#6B9080] text-[#6B9080] bg-white">
                Start Annual (-15%)
              </button>
            </div>
          )}

          {org.subscriptionStatus === 'past_due' && (
            <div className="mt-3 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
              <p className="text-sm text-orange-700">Payment past due — update billing to avoid suspension</p>
            </div>
          )}
        </div>
      )}

      {/* Seats card */}
      {usage && (
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Seats</p>
            </div>
            {!seatEditMode ? (
              <button onClick={() => setSeatEditMode(true)} className="text-sm text-[#6B9080] font-semibold">Edit</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setSeatEditMode(false); setNewSeatCount(org.seatCount); }} className="text-sm text-[#5A6B7A] font-medium">Cancel</button>
                <button onClick={handleSaveSeats} className="text-sm text-[#6B9080] font-semibold">Save</button>
              </div>
            )}
          </div>

          {seatEditMode ? (
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={MIN_SEATS}
                  value={newSeatCount}
                  onChange={e => setNewSeatCount(parseInt(e.target.value || '0', 10))}
                  className="w-24 text-2xl font-bold border border-[#E8E4DF] rounded-lg px-3 py-1 text-center"
                />
                <span className="text-sm text-[#5A6B7A]">
                  seats × {formatCents(effectiveSeatPriceCents(Math.max(MIN_SEATS, newSeatCount)))}/seat
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-2">Volume pricing: {ladderHint}</p>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#1B2733]">{usage.seatsUsed}</span>
              <span className="text-sm text-[#5A6B7A]">of {usage.seatsAllocated} used</span>
            </div>
          )}

          <div className="mt-3 h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (usage.seatsUsed / usage.seatsAllocated) * 100)}%`,
                background: usage.seatsAvailable === 0 ? '#E07A5F' : 'linear-gradient(90deg, #43AA8B 0%, #7BA7BC 100%)',
              }}
            />
          </div>
          {usage.seatsAvailable === 0 && (
            <p className="text-sm text-orange-600 mt-2">All seats used — add seats above to invite more members.</p>
          )}
        </div>
      )}

      {/* EVV & Compliance card */}
      <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Compliance & EVV</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#1B2733]">EVV sync</p>
              <p className="text-sm text-slate-400">Electronic Visit Verification (DCI)</p>
            </div>
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#F0EDE8] text-[#5A6B7A]">
              Not configured
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#1B2733]">BCBA supervision</p>
              <p className="text-sm text-slate-400">Hours logged this billing period</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#1B2733]">{usage?.seatsUsed ?? 0} <span className="text-xs font-normal text-slate-400">/ {(usage?.seatsAllocated ?? 0) * 2}h</span></p>
              <p className="text-sm text-slate-400">2h/seat/mo</p>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#E8E4DF] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-[#5A6B7A]">EVV is required for AHCCCS/Medicaid reimbursement. Contact <a href="mailto:hello@aminy.ai" className="text-[#6B9080] underline">hello@aminy.ai</a> to configure DCI sync for your agency.</p>
        </div>
      </div>

      {/* Aggregate outcomes — live PHQ-9/GAD-7/ABC trends for enrolled families */}
      <div className="mx-4 mt-3">
        <PartnerOutcomesWidget partnerOrgId={org.id} />
      </div>

      {/* Members card */}
      <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF]">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#E8E4DF]">
          <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Members ({members.length})</p>
          <button
            onClick={() => setShowInvite(true)}
            disabled={!!usage && usage.seatsAvailable === 0}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #7BA7BC 100%)', color: 'white' }}
          >
            <Plus className="w-3.5 h-3.5" />Invite
          </button>
        </div>

        {showInvite && (
          <div className="px-4 py-3 bg-[#FAF7F2] border-b border-[#E8E4DF]">
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 text-sm border border-[#E8E4DF] rounded-lg px-3 py-2 bg-white"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
              <button
                onClick={handleInvite}
                disabled={isInviting || !inviteEmail.trim()}
                className="text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #7BA7BC 100%)' }}
              >
                {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
              </button>
              <button
                onClick={() => { setShowInvite(false); setInviteEmail(''); }}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-[#F0EDE8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {members.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#5A6B7A]">No members yet. Invite someone to get started.</div>
          ) : members.map(member => (
            <div key={member.id} className="px-4 py-3 flex items-center gap-3">
              <RoleIcon role={member.role} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1B2733] truncate">{member.email}</p>
                <p className="text-sm text-[#5A6B7A] capitalize">{member.role} · {member.status}</p>
              </div>
              {member.role !== 'owner' && (
                <button onClick={() => handleRemove(member.id, member.email)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <div>
        <p className="text-sm text-[#1B2733]">{label}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      <p className="text-sm font-semibold text-[#1B2733]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Organization['subscriptionStatus'] }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-[#6B9080]/10', text: 'text-[#6B9080]', label: 'Active' },
    trialing: { bg: 'bg-[#7BA7BC]/10', text: 'text-[#7BA7BC]', label: 'Trial' },
    past_due: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Past due' },
    canceled: { bg: 'bg-[#F0EDE8]', text: 'text-[#5A6B7A]', label: 'Canceled' },
    inactive: { bg: 'bg-[#F0EDE8]', text: 'text-[#5A6B7A]', label: 'Not active' },
    incomplete: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Incomplete' },
  };
  const s = styles[status] || styles.inactive;
  return <span className={`text-xs ${s.bg} ${s.text} px-2 py-0.5 rounded-full`}>{s.label}</span>;
}

function RoleIcon({ role }: { role: OrgMember['role'] }) {
  if (role === 'owner') return <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center"><Crown className="w-4 h-4 text-amber-700" /></div>;
  if (role === 'admin') return <div className="w-9 h-9 rounded-full bg-[#6B9080]/10 flex items-center justify-center"><Shield className="w-4 h-4 text-[#6B9080]" /></div>;
  if (role === 'manager') return <div className="w-9 h-9 rounded-full bg-[#7BA7BC]/10 flex items-center justify-center"><Users className="w-4 h-4 text-[#7BA7BC]" /></div>;
  return <div className="w-9 h-9 rounded-full bg-[#F0EDE8] flex items-center justify-center"><User className="w-4 h-4 text-[#5A6B7A]" /></div>;
}

export default OrgAdminDashboard;
