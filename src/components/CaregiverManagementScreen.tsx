// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, QrCode, Link as LinkIcon, Mail, MoreVertical, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ManageCaregivers, COPARENT_REASSURANCE, buildCaregiverInviteLink, type ChildOption } from './ManageCaregivers';
import { useAuditedAction } from '../hooks/useAuditedAction';
import { isDemoMode } from '../lib/demo-seed';
import { supabase } from '../utils/supabase/client';

interface CaregiverManagementScreenProps {
  onBack?: () => void;
}

export function CaregiverManagementScreen({ onBack }: CaregiverManagementScreenProps) {
  // HIPAA audit: log caregiver/account access view on mount
  useAuditedAction('user_account');

  const [showAddCaregiver, setShowAddCaregiver] = useState(false);
  type CaregiverRole = 'owner' | 'caregiver' | 'read-only';
  type CaregiverStatus = 'active' | 'pending';

  type Caregiver = {
    id: string;
    name: string;
    email: string;
    role: CaregiverRole;
    status: CaregiverStatus;
    addedDate: string;
    /** Which child care circle(s) this member was invited to (per-child scoping). */
    childNames?: string[];
  };
  // Real users start with an empty team and invite their own people. Sample
  // members appear only in demo mode for investor/partner walk-throughs.
  const [caregivers, setCaregivers] = useState<Caregiver[]>(
    isDemoMode()
      ? [
          { id: '1', name: 'Parent (You)', email: 'you@aminy.ai', role: 'owner', status: 'active', addedDate: '2026-04-01' },
          { id: '2', name: 'Partner', email: 'partner@aminy.ai', role: 'caregiver', status: 'active', addedDate: '2026-04-15' },
          { id: '3', name: 'Grandparent', email: 'grandparent@aminy.ai', role: 'read-only', status: 'pending', addedDate: '2026-05-18' },
        ]
      : []
  );

  // Per-child scoping (iCloud-Family-style): invites go to a specific child's
  // care circle. Children + previously sent invites load from Supabase; the
  // invite records persist in caregiver_invites (see the 20260703170000
  // migration — invite record only; shared-access RLS is a follow-up).
  const [userId, setUserId] = useState<string | null>(null);
  const [childProfiles, setChildProfiles] = useState<ChildOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id || cancelled) return;
        setUserId(user.id);

        const [{ data: kids }, { data: invites }] = await Promise.all([
          supabase.from('children').select('id, name').eq('parent_id', user.id),
          supabase
            .from('caregiver_invites')
            .select('id, invitee_name, invitee_email, role, status, invited_at, child_name')
            .eq('owner_id', user.id)
            .neq('status', 'revoked'),
        ]);
        if (cancelled) return;

        if (kids) setChildProfiles(kids.map((k) => ({ id: k.id, name: k.name })));
        if (invites && invites.length > 0) {
          // Collapse per-child rows into one member entry per invitee email.
          const byEmail = new Map<string, Caregiver>();
          for (const inv of invites) {
            const existing = byEmail.get(inv.invitee_email);
            const childNames = [
              ...(existing?.childNames ?? []),
              ...(inv.child_name ? [inv.child_name] : []),
            ];
            byEmail.set(inv.invitee_email, {
              id: existing?.id ?? inv.id,
              name: inv.invitee_name || inv.invitee_email.split('@')[0],
              email: inv.invitee_email,
              role: (inv.role as CaregiverRole) || 'caregiver',
              status: inv.status === 'accepted' ? 'active' : 'pending',
              addedDate: (inv.invited_at || new Date().toISOString()).split('T')[0],
              childNames: childNames.length > 0 ? childNames : undefined,
            });
          }
          setCaregivers((prev) => {
            const known = new Set(prev.map((c) => c.email));
            return [...prev, ...[...byEmail.values()].filter((c) => !known.has(c.email))];
          });
        }
      } catch {
        // Non-blocking — the screen still works with local state only.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleInvite = (email: string, role: CaregiverRole, childIds: string[] = []) => {
    const scopedChildren = childProfiles.filter((c) => childIds.includes(c.id));
    const newCaregiver: Caregiver = {
      id: Date.now().toString(),
      name: email.split('@')[0],
      email,
      role,
      status: 'pending' as CaregiverStatus,
      addedDate: new Date().toISOString().split('T')[0],
      childNames: scopedChildren.length > 0 ? scopedChildren.map((c) => c.name) : undefined,
    };
    setCaregivers([...caregivers, newCaregiver]);
    setShowAddCaregiver(false);

    // Persist child-scoped invite records (one row per child care circle).
    if (userId) {
      type CaregiverInviteRow = {
        owner_id: string;
        child_id: string | null;
        child_name: string | null;
        invitee_name: string;
        invitee_email: string;
        role: CaregiverRole;
      };
      const rows: CaregiverInviteRow[] = scopedChildren.length > 0
        ? scopedChildren.map((c) => ({
            owner_id: userId,
            child_id: c.id,
            child_name: c.name,
            invitee_name: email.split('@')[0],
            invitee_email: email.toLowerCase(),
            role,
          }))
        : [{
            owner_id: userId,
            child_id: null,
            child_name: null,
            invitee_name: email.split('@')[0],
            invitee_email: email.toLowerCase(),
            role,
          }];
      supabase
        .from('caregiver_invites')
        .insert(rows)
        .then(({ error }) => {
          if (error) {
            toast.error('Invite saved on this device only — it could not be stored to your account');
          } else {
            toast.success(
              scopedChildren.length > 0
                ? `Invite recorded for ${scopedChildren.map((c) => c.name).join(' and ')}'s care circle`
                : 'Invite recorded'
            );
          }
        });
    }
  };

  const handleRevoke = (id: string) => {
    setCaregivers(caregivers.filter(c => c.id !== id));
  };

  const handleResend = (caregiver: Caregiver) => {
    toast.success(`Invitation re-sent to ${caregiver.email}`);
  };

  // Copy a shareable caregiver-invite link to the clipboard. Mirrors the
  // Copy-Invite-Link action in ManageCaregivers. The link deep-links into
  // signup; after the co-parent verifies their email, the post-auth accept hook
  // in App.tsx runs `accept_caregiver_invites()` which matches by email (no id
  // in the URL). `inviter` seeds a warm signup header — use the first child's
  // care-circle name when available.
  const handleCopyInviteLink = async () => {
    const inviter = childProfiles[0]?.name;
    const inviteLink = buildCaregiverInviteLink(window.location.origin, inviter);
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied to clipboard');
    } catch {
      toast('Unable to copy the link on this device');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'caregiver':
        return 'bg-blue-100 text-blue-700 border-[#C8DDE8]';
      case 'read-only':
        return 'bg-[#EDF4F7] text-[#3A4A57] border-[#E8E4DF]';
      default:
        return 'bg-[#EDF4F7] text-[#3A4A57] border-[#E8E4DF]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-[#EDF4F7] text-[#3A4A57] border-[#E8E4DF]';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E4DF]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-semibold">Family &amp; Care Team</h1>
              <p className="text-sm text-muted-foreground">
                Control who has access to your child's care plan
              </p>
              <p className="text-sm text-[#2A7D99] mt-0.5">{COPARENT_REASSURANCE}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Role Explanations */}
        <Card className="p-4 sm:p-5 md:p-6">
          <h2 className="font-semibold mb-4">Access Roles</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Owner</p>
                <p className="text-sm text-muted-foreground">
                  Full access: Edit plans, manage caregivers, billing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Caregiver</p>
                <p className="text-sm text-muted-foreground">
                  Can edit plans, log activities, view reports
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#5A6B7A] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Read-only</p>
                <p className="text-sm text-muted-foreground">
                  View-only access to plans and progress
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Add Caregiver Button + shareable invite link */}
        {!showAddCaregiver && (
          <div className="space-y-2">
            <Button onClick={() => setShowAddCaregiver(true)} className="w-full bg-[#2A7D99] hover:bg-[#376E80] text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Caregiver
            </Button>
            <Button variant="outline" onClick={handleCopyInviteLink} className="w-full">
              <LinkIcon className="w-4 h-4 mr-2" />
              Copy invite link
            </Button>
          </div>
        )}

        {/* Add Caregiver Form */}
        {showAddCaregiver && (
          <ManageCaregivers
            onInvite={handleInvite}
            onCancel={() => setShowAddCaregiver(false)}
          />
        )}

        {/* Active Caregivers */}
        <div>
          <h2 className="font-semibold mb-4">Team Members</h2>
          {caregivers.length === 0 && (
            <Card className="p-8 text-center border-dashed">
              <div className="w-12 h-12 rounded-full bg-[#EDF4F7] flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-[#3A4A57] mb-1">Build your care team</p>
              <p className="text-sm text-[#5A6B7A]">Invite your partner, a grandparent, or anyone who helps care for your child. They'll get their own secure access.</p>
            </Card>
          )}
          <div className="space-y-3">
            {caregivers.map((caregiver) => (
              <Card key={caregiver.id} className="p-3 sm:p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{caregiver.name}</h3>
                      {caregiver.role === 'owner' && (
                        <Badge variant="outline" className={getRoleColor(caregiver.role)}>
                          Owner
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {caregiver.email}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className={getRoleColor(caregiver.role)}>
                        {caregiver.role === 'owner' && 'Owner'}
                        {caregiver.role === 'caregiver' && 'Caregiver'}
                        {caregiver.role === 'read-only' && 'Read-only'}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(caregiver.status)}>
                        {caregiver.status === 'active' && 'Active'}
                        {caregiver.status === 'pending' && 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Added: {new Date(caregiver.addedDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {caregiver.role !== 'owner' && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(caregiver.id)}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {caregiver.status === 'pending' && (
                  <div className="mt-3 pt-3 border-t border-[#E8E4DF]">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleResend(caregiver)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Resend Invite
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevoke(caregiver.id)}
                      >
                        Cancel Invite
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Invite Methods */}
        <Card className="p-4 sm:p-5 md:p-6">
          <h2 className="font-semibold mb-4">Invite Methods</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => toast('QR code invites are coming soon')}
            >
              <QrCode className="w-6 h-6" />
              <span className="text-sm">QR Code</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={handleCopyInviteLink}
            >
              <LinkIcon className="w-6 h-6" />
              <span className="text-sm">Share Link</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => setShowAddCaregiver(true)}
            >
              <Mail className="w-6 h-6" />
              <span className="text-sm">Email Invite</span>
            </Button>
          </div>
        </Card>

        {/* Privacy Notice */}
        <div className="p-4 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Privacy & Security:</strong> All caregivers must accept an invitation
            and verify their email before gaining access. You can revoke access at any time.
            Changes take effect immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
