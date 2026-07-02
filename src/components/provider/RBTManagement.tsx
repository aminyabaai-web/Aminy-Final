// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * RBT Management — BCBA Practice Management
 * Manage RBT roster, supervision hours, family assignments
 * BACB requires 5% supervision of RBT direct hours
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Plus, Clock, Target, ChevronDown, ChevronRight,
  Mail, Trash2, CheckCircle2, AlertTriangle, BarChart3,
  FileText, Calendar, UserPlus, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getRBTProfiles,
  getSupervisionSessions,
  getTotalDirectServiceHours,
  loadRBTDataFromSupabase,
  saveRBTProfile,
  removeRBTProfile,
  addSupervisionSession,
  type SupervisionSession,
} from '../../lib/rbt-supervision';
import { isDemoMode } from '../../lib/demo-seed';
import { supabase } from '../../utils/supabase/client';

// ── Types ────────────────────────────────────────────────────────────

interface RBT {
  id: string;
  name: string;
  email: string;
  certificationNumber: string;
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  assignedFamilies: string[];
  totalDirectHours: number;
  totalSupervisionHours: number;
}

interface SupervisionLog {
  id: string;
  rbtId: string;
  date: string;
  hours: number;
  type: 'direct' | 'indirect' | 'group';
  notes: string;
  familyId?: string;
}

interface ClientInvoice {
  id: string;
  familyName: string;
  amount: number;
  date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  services: string;
}

interface RBTManagementProps {
  providerId?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

const BACB_SUPERVISION_RATIO = 0.05; // 5% minimum

function calcSupervisionCompliance(directHours: number, supervisionHours: number) {
  const required = directHours * BACB_SUPERVISION_RATIO;
  const ratio = directHours > 0 ? supervisionHours / directHours : 0;
  const isCompliant = supervisionHours >= required;
  return { required, ratio, isCompliant, deficit: Math.max(0, required - supervisionHours) };
}

// RBTs and supervision logs live in Supabase via src/lib/rbt-supervision.ts
// (same tables SupervisionDashboard reads — rbt_org_assignments,
// rbt_supervision_sessions, rbt_direct_service_hours). This key now only holds
// the invoice drafts (no server table yet — feature is "coming soon").
const STORAGE_KEY = 'aminy-rbt-management';

function loadInvoices(): ClientInvoice[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return (JSON.parse(stored).invoices as ClientInvoice[]) ?? [];
  } catch { /* corrupt cache — start clean */ }
  return [];
}

function newSessionId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Map a lib SupervisionSession to this screen's simpler log shape. */
function toSupervisionLog(s: SupervisionSession): SupervisionLog {
  return {
    id: s.id,
    rbtId: s.rbtId,
    date: s.date,
    hours: s.durationMinutes / 60,
    type: s.type === 'group' ? 'group' : s.includesDirectObservation ? 'direct' : 'indirect',
    notes: s.bcbaNotes,
  };
}

// ── Component ────────────────────────────────────────────────────────

export function RBTManagement({ providerId }: RBTManagementProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoadingRoster, setIsLoadingRoster] = useState(!isDemoMode());
  const [bcbaId, setBcbaId] = useState<string>(providerId || '');
  const [invoices] = useState<ClientInvoice[]>(loadInvoices);
  const [activeView, setActiveView] = useState<'roster' | 'supervision' | 'billing'>('roster');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteCert, setInviteCert] = useState('');
  const [expandedRbt, setExpandedRbt] = useState<string | null>(null);
  const [logForm, setLogForm] = useState({
    rbtId: '',
    date: new Date().toISOString().split('T')[0],
    hours: 1,
    type: 'direct' as 'direct' | 'indirect' | 'group',
    notes: '',
  });

  // Load the shared roster from Supabase (same source as SupervisionDashboard).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (isDemoMode()) {
        setBcbaId(providerId || 'bcba-001');
        setIsLoadingRoster(false);
        return;
      }
      try {
        let id = providerId || '';
        if (!id) {
          const { data: authData } = await supabase.auth.getUser();
          id = authData.user?.id || '';
        }
        if (cancelled) return;
        setBcbaId(id);
        if (id) {
          await loadRBTDataFromSupabase(id);
        }
      } catch (err) {
        console.error('[RBTManagement] Roster load failed:', err);
      } finally {
        if (!cancelled) {
          setIsLoadingRoster(false);
          setRefreshKey(k => k + 1);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [providerId]);

  // Derive this screen's view models from the shared lib (demo localStorage
  // store in demo mode; Supabase-backed cache otherwise).
  const rbts: RBT[] = useMemo(() => {
    void refreshKey;
    return getRBTProfiles().map(p => {
      const supervisionMinutes = getSupervisionSessions(p.id)
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + s.durationMinutes, 0);
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        certificationNumber: p.rbtNumber,
        status: p.status,
        joinedAt: p.hiredDate,
        assignedFamilies: [],
        totalDirectHours: getTotalDirectServiceHours(p.id),
        totalSupervisionHours: supervisionMinutes / 60,
      };
    });
  }, [refreshKey]);

  const logs: SupervisionLog[] = useMemo(() => {
    void refreshKey;
    return getSupervisionSessions()
      .map(toSupervisionLog)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [refreshKey]);

  // ── RBT Roster Actions ──────────────────────────────────────────

  const inviteRBT = async () => {
    if (!inviteEmail.includes('@') || !inviteName.trim()) {
      toast.error('Name and valid email required');
      return;
    }
    setIsSaving(true);
    try {
      await saveRBTProfile({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        certificationNumber: inviteCert.trim(),
        supervisingBCBAId: bcbaId,
      });
      setInviteEmail('');
      setInviteName('');
      setInviteCert('');
      setShowInviteForm(false);
      setRefreshKey(k => k + 1);
      toast.success(`Invitation sent to ${inviteName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add RBT');
    } finally {
      setIsSaving(false);
    }
  };

  const removeRBT = async (id: string) => {
    try {
      await removeRBTProfile(id);
      setRefreshKey(k => k + 1);
      toast.success('RBT removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove RBT');
    }
  };

  // ── Supervision Log Actions ─────────────────────────────────────

  const addSupervisionLog = async () => {
    if (!logForm.rbtId) {
      toast.error('Select an RBT');
      return;
    }
    const target = rbts.find(r => r.id === logForm.rbtId);
    if (!isDemoMode() && target?.status === 'pending') {
      toast.error(`${target.name} hasn't joined Aminy yet — supervision hours can be logged once they accept the invite.`);
      return;
    }
    setIsSaving(true);
    const session: SupervisionSession = {
      id: newSessionId(),
      rbtId: logForm.rbtId,
      bcbaId,
      date: logForm.date,
      durationMinutes: Math.round(logForm.hours * 60),
      type: logForm.type === 'group' ? 'group' : 'individual',
      includesDirectObservation: logForm.type === 'direct',
      topicsCovered: [],
      competenciesAssessed: [],
      bcbaNotes: logForm.notes,
      rbtSignature: false,
      bcbaSignature: true,
      bcbaSignatureDate: new Date().toISOString(),
      status: 'completed',
    };
    const saved = await addSupervisionSession(session);
    setIsSaving(false);
    if (!saved) {
      toast.error('Failed to save supervision log — please try again');
      return;
    }
    setShowLogForm(false);
    setLogForm({ rbtId: '', date: new Date().toISOString().split('T')[0], hours: 1, type: 'direct', notes: '' });
    setRefreshKey(k => k + 1);
    toast.success('Supervision log added');
  };

  // ── Stats ───────────────────────────────────────────────────────

  const totalRBTs = rbts.filter(r => r.status === 'active').length;
  const totalPending = rbts.filter(r => r.status === 'pending').length;
  const nonCompliantCount = rbts.filter(r => {
    if (r.totalDirectHours === 0) return false;
    const { isCompliant } = calcSupervisionCompliance(r.totalDirectHours, r.totalSupervisionHours);
    return !isCompliant;
  }).length;

  return (
    <div className="space-y-6">
      {/* View Tabs */}
      <div className="flex gap-2 bg-[#EDF4F7] rounded-xl p-1">
        {[
          { id: 'roster' as const, label: 'RBT Roster', icon: Users },
          { id: 'supervision' as const, label: 'Supervision', icon: Clock },
          { id: 'billing' as const, label: 'Billing', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeView === tab.id
                ? 'bg-white text-[#132F43] shadow-sm'
                : 'text-[#5A6B7A] hover:text-[#3A4A57]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 text-center">
          <p className="text-2xl font-bold text-[#132F43]">{totalRBTs}</p>
          <p className="text-sm text-[#5A6B7A]">Active RBTs</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 text-center">
          <p className="text-2xl font-bold text-[#132F43]">{totalPending}</p>
          <p className="text-sm text-[#5A6B7A]">Pending</p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${
          nonCompliantCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
          <p className={`text-2xl font-bold ${nonCompliantCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {nonCompliantCount}
          </p>
          <p className="text-sm text-[#5A6B7A]">Non-Compliant</p>
        </div>
      </div>

      {/* ── Roster View ──────────────────────────────────────── */}
      {activeView === 'roster' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#132F43]">RBT Roster</h3>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#216982]"
            >
              <UserPlus className="w-4 h-4" /> Invite RBT
            </button>
          </div>

          {/* Invite Form */}
          {showInviteForm && (
            <div className="bg-[#6B9080]/10 border border-[#6B9080]/20 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Full Name"
                  className="px-3 py-2.5 border border-[#E8E4DF] rounded-lg text-sm focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email"
                  className="px-3 py-2.5 border border-[#E8E4DF] rounded-lg text-sm focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="text"
                  value={inviteCert}
                  onChange={(e) => setInviteCert(e.target.value)}
                  placeholder="RBT Cert #"
                  className="px-3 py-2.5 border border-[#E8E4DF] rounded-lg text-sm focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={inviteRBT} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#216982]">
                  Send Invite
                </button>
                <button onClick={() => setShowInviteForm(false)} className="px-4 py-2 text-[#5A6B7A] text-sm hover:bg-[#EDF4F7] rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* RBT List */}
          {data.rbts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#E8E4DF]">
              <Users className="w-12 h-12 text-[#8A9BA8] mx-auto mb-3" />
              <p className="font-medium text-[#5A6B7A]">No RBTs yet</p>
              <p className="text-sm text-[#8A9BA8] mt-1">Invite RBTs to manage your practice roster</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.rbts.map(rbt => {
                const compliance = calcSupervisionCompliance(rbt.totalDirectHours, rbt.totalSupervisionHours);
                const isExpanded = expandedRbt === rbt.id;

                return (
                  <div key={rbt.id} className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
                    <button
                      onClick={() => setExpandedRbt(isExpanded ? null : rbt.id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        rbt.status === 'active' ? 'bg-[#6B9080]' : 'bg-gray-400'
                      }`}>
                        {rbt.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#132F43] truncate">{rbt.name}</p>
                        <p className="text-sm text-[#5A6B7A]">{rbt.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {rbt.status === 'pending' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Pending</span>
                        )}
                        {rbt.totalDirectHours > 0 && (
                          compliance.isCompliant ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )
                        )}
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[#8A9BA8]" /> : <ChevronRight className="w-4 h-4 text-[#8A9BA8]" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[#E8E4DF] p-4 bg-[#F6FBFB] space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-[#5A6B7A]">Cert #</p>
                            <p className="font-medium">{rbt.certificationNumber || 'Not set'}</p>
                          </div>
                          <div>
                            <p className="text-[#5A6B7A]">Direct Hours</p>
                            <p className="font-medium">{rbt.totalDirectHours.toFixed(1)} hrs</p>
                          </div>
                          <div>
                            <p className="text-[#5A6B7A]">Supervision Hours</p>
                            <p className="font-medium">{rbt.totalSupervisionHours.toFixed(1)} hrs</p>
                          </div>
                          <div>
                            <p className="text-[#5A6B7A]">Supervision Rate</p>
                            <p className={`font-medium ${compliance.isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                              {(compliance.ratio * 100).toFixed(1)}% (min 5%)
                            </p>
                          </div>
                        </div>

                        {!compliance.isCompliant && rbt.totalDirectHours > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-red-700">
                              Needs {compliance.deficit.toFixed(1)} more supervision hours to meet BACB 5% requirement.
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setLogForm(prev => ({ ...prev, rbtId: rbt.id }));
                              setShowLogForm(true);
                              setActiveView('supervision');
                            }}
                            className="flex-1 py-2 text-sm font-medium text-[#6B9080] border border-cyan-300 rounded-lg hover:bg-[#6B9080]/10"
                          >
                            Log Supervision
                          </button>
                          <button
                            onClick={() => removeRBT(rbt.id)}
                            className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Supervision View ─────────────────────────────────── */}
      {activeView === 'supervision' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#132F43]">Supervision Tracking</h3>
            <button
              onClick={() => setShowLogForm(!showLogForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#216982]"
            >
              <Plus className="w-4 h-4" /> Log Hours
            </button>
          </div>

          {/* BACB Compliance Banner */}
          <div className="bg-[#EEF4F8] border border-[#C8DDE8] rounded-xl p-4 flex gap-3">
            <Target className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#4A6478]">BACB Supervision Requirement</p>
              <p className="text-sm text-blue-600">
                BCBAs must provide supervision for at least 5% of each RBT's total direct service hours
                within each certification cycle. Track supervision here to stay compliant.
              </p>
            </div>
          </div>

          {/* Log Form */}
          {showLogForm && (
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-3">
              <p className="font-medium text-[#132F43] text-sm">Log Supervision Session</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={logForm.rbtId}
                  onChange={(e) => setLogForm(prev => ({ ...prev, rbtId: e.target.value }))}
                  className="px-3 py-2.5 border border-[#E8E4DF] rounded-lg text-sm"
                >
                  <option value="">Select RBT...</option>
                  {data.rbts.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={logForm.date}
                  onChange={(e) => setLogForm(prev => ({ ...prev, date: e.target.value }))}
                  className="px-3 py-2.5 border border-[#E8E4DF] rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={logForm.hours}
                    onChange={(e) => setLogForm(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                    step="0.25"
                    min="0.25"
                    max="8"
                    className="flex-1 px-3 py-2.5 border border-[#E8E4DF] rounded-lg text-sm"
                  />
                  <select
                    value={logForm.type}
                    onChange={(e) => setLogForm(prev => ({ ...prev, type: e.target.value as 'direct' | 'indirect' | 'group' }))}
                    className="px-3 py-2.5 border border-[#E8E4DF] rounded-lg text-sm"
                  >
                    <option value="direct">Direct</option>
                    <option value="indirect">Indirect</option>
                    <option value="group">Group</option>
                  </select>
                </div>
                <textarea
                  value={logForm.notes}
                  onChange={(e) => setLogForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Session notes..."
                  rows={2}
                  className="px-3 py-2.5 border border-[#E8E4DF] rounded-lg text-sm resize-none sm:col-span-2"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={addSupervisionLog} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#216982]">
                  Save Log
                </button>
                <button onClick={() => setShowLogForm(false)} className="px-4 py-2 text-[#5A6B7A] text-sm hover:bg-[#EDF4F7] rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* RBT Compliance Cards */}
          {data.rbts.length === 0 ? (
            <div className="text-center py-8 text-[#8A9BA8]">
              <Clock className="w-10 h-10 mx-auto mb-2 text-[#8A9BA8]" />
              <p className="text-sm">Add RBTs to track supervision</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.rbts.map(rbt => {
                const c = calcSupervisionCompliance(rbt.totalDirectHours, rbt.totalSupervisionHours);
                const pct = rbt.totalDirectHours > 0 ? Math.min(100, (c.ratio / BACB_SUPERVISION_RATIO) * 100) : 0;

                return (
                  <div key={rbt.id} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-[#132F43]">{rbt.name}</p>
                      {c.isCompliant || rbt.totalDirectHours === 0 ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Compliant</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          Needs {c.deficit.toFixed(1)}hrs
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-[#5A6B7A] mb-2">
                      <div>
                        <p>Direct</p>
                        <p className="font-semibold text-[#132F43]">{rbt.totalDirectHours.toFixed(1)}h</p>
                      </div>
                      <div>
                        <p>Supervision</p>
                        <p className="font-semibold text-[#132F43]">{rbt.totalSupervisionHours.toFixed(1)}h</p>
                      </div>
                      <div>
                        <p>Rate</p>
                        <p className={`font-semibold ${c.isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                          {(c.ratio * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="h-2 bg-[#E8E4DF] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${c.isCompliant ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent Logs */}
          {data.logs.length > 0 && (
            <div>
              <h4 className="font-medium text-[#3A4A57] text-sm mb-2">Recent Logs</h4>
              <div className="space-y-2">
                {data.logs.slice(-5).reverse().map(log => {
                  const rbt = data.rbts.find(r => r.id === log.rbtId);
                  return (
                    <div key={log.id} className="flex items-center gap-3 p-3 bg-[#F6FBFB] rounded-lg text-sm">
                      <Calendar className="w-4 h-4 text-[#8A9BA8]" />
                      <span className="text-[#5A6B7A]">{new Date(log.date).toLocaleDateString()}</span>
                      <span className="font-medium text-[#132F43]">{rbt?.name || 'Unknown'}</span>
                      <span className="text-[#5A6B7A]">{log.hours}h {log.type}</span>
                      {log.notes && <span className="text-[#8A9BA8] truncate flex-1">{log.notes}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Billing View ─────────────────────────────────────── */}
      {activeView === 'billing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#132F43]">Client Billing</h3>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#216982]">
              <Plus className="w-4 h-4" /> New Invoice
            </button>
          </div>

          {data.invoices.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#E8E4DF]">
              <FileText className="w-12 h-12 text-[#8A9BA8] mx-auto mb-3" />
              <p className="font-medium text-[#5A6B7A]">No invoices yet</p>
              <p className="text-sm text-[#8A9BA8] mt-1">Create invoices for your clients</p>
              <div className="mt-4 space-y-2 text-sm text-[#5A6B7A] max-w-sm mx-auto text-left">
                <p className="font-medium text-[#3A4A57]">Coming soon:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Auto-generate invoices from session data</li>
                  <li>Insurance claim tracking (submitted/pending/paid/denied)</li>
                  <li>Superbill generation with CPT codes</li>
                  <li>Batch billing for multiple families</li>
                  <li>Payment reminders via email</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {data.invoices.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#E8E4DF]">
                  <div className="flex-1">
                    <p className="font-medium text-[#132F43]">{inv.familyName}</p>
                    <p className="text-sm text-[#5A6B7A]">{inv.services}</p>
                  </div>
                  <p className="font-semibold text-[#132F43]">${inv.amount.toFixed(2)}</p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                    inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                    'bg-[#EDF4F7] text-[#5A6B7A]'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RBTManagement;
