// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Trash2,
  QrCode,
  Link,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Crown,
  Lock,
  Shield,
  Users,
  Copy,
  Check
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { TierType, hasFeature, getTierDisplayName, compareTiers } from '../lib/tier-utils';

// ============================================================================
// Types
// ============================================================================

type CaregiverRole = 'owner' | 'caregiver' | 'read-only';
type CaregiverStatus = 'active' | 'pending' | 'expired';

interface Caregiver {
  id: string;
  name: string;
  email: string;
  role: CaregiverRole;
  status: CaregiverStatus;
  invitedAt: Date;
  acceptedAt?: Date;
  permissions?: CaregiverPermissions;
  /** Which child care circle(s) this member was invited to (display only). */
  childNames?: string[];
}

/** Child option for the per-child care-circle picker (iCloud-Family-style scoping). */
export interface ChildOption {
  id: string;
  name: string;
}

interface CaregiverPermissions {
  viewReports: boolean;
  editPlan: boolean;
  scheduleSessions: boolean;
  manageVault: boolean;
  viewAllChildren: boolean;
}

interface ManageCaregiversProps {
  caregivers?: Caregiver[];
  tier?: TierType;
  /** The family's children — when provided, invites are scoped per child
   *  (the invitee joins specific care circles, not the whole account). */
  childProfiles?: ChildOption[];
  onInvite?: (email: string, role: CaregiverRole, childIds: string[]) => void;
  onRemove?: (id: string) => void;
  onUpgrade?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// Invite link
// ============================================================================

/**
 * Build the shareable caregiver-invite link. The accept flow matches the
 * signed-in user's VERIFIED email to pending caregiver_invites rows (server
 * RPC `accept_caregiver_invites()`), so the link only needs a flag — no invite
 * id. `?screen=create-account` deep-links straight into signup;
 * `caregiver_invite=1` is captured to localStorage there so the post-auth hook
 * knows to run the accept RPC. `inviter` (optional) is used only for a warm
 * signup header ("Join {inviter}'s care circle").
 */
export function buildCaregiverInviteLink(origin: string, inviter?: string): string {
  const base = `${origin}/?screen=create-account&caregiver_invite=1`;
  const name = (inviter ?? '').trim();
  return name ? `${base}&inviter=${encodeURIComponent(name)}` : base;
}

// ============================================================================
// Constants
// ============================================================================

const roleLabels: Record<CaregiverRole, string> = {
  owner: 'Owner',
  caregiver: 'Co-parent / Caregiver',
  'read-only': 'Read-only'
};

// TRUTH SOURCE for co-parent copy (drift-guarded in
// src/test/components/CaregiverCopyTruth.test.tsx): free tier is owner-only,
// every PAID tier includes at least one additional caregiver seat at no extra
// cost. UI copy must therefore say "every paid plan" — never "every plan".
export const COPARENT_REASSURANCE =
  "Co-parents are included with every paid plan at no extra cost — they see your child's plans, progress, and reports.";

const roleColors: Record<CaregiverRole, string> = {
  // Owner is a neutral slate chip — accents must not compete with the one teal primary CTA
  owner: 'bg-slate-100 text-slate-600 border-slate-200',
  caregiver: 'bg-blue-100 text-blue-700 border-[#C8DDE8]',
  'read-only': 'bg-[#EDF4F7] text-[#3A4A57] border-[#E8E4DF]'
};

const statusColors: Record<CaregiverStatus, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700'
};

const roleDescriptions: Record<CaregiverRole, string> = {
  owner: 'Full access to all features, billing, and settings',
  caregiver: 'Can view and edit plans, track progress, and schedule sessions',
  'read-only': 'Can view progress and reports only'
};

// Caregiver limits per tier (exported for the copy-truth drift test)
export const MAX_CAREGIVERS: Record<TierType, number> = {
  free: 1, // Owner only
  starter: 2, // Owner + 1
  core: 3, // Owner + 2
  pro: 5, // Owner + 4
  proplus: Infinity // Unlimited
};

// ============================================================================
// Component
// ============================================================================

export function ManageCaregivers({
  caregivers: initialCaregivers,
  tier = 'free',
  childProfiles = [],
  onInvite,
  onRemove,
  onUpgrade
}: ManageCaregiversProps) {
  const [caregivers, setCaregivers] = useState<Caregiver[]>(
    initialCaregivers || [
      {
        id: 'owner',
        name: 'You',
        email: '',
        role: 'owner',
        status: 'active',
        invitedAt: new Date(),
        acceptedAt: new Date(),
        permissions: {
          viewReports: true,
          editPlan: true,
          scheduleSessions: true,
          manageVault: true,
          viewAllChildren: true
        }
      }
    ]
  );

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  // Default to co-parent — the most common (and highest-value) second member.
  const [inviteRole, setInviteRole] = useState<CaregiverRole>('caregiver');
  // Per-child care-circle scoping — default: all children selected.
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(
    () => childProfiles.map((c) => c.id)
  );
  // childProfiles usually arrives async (Supabase fetch) — re-default selection.
  useEffect(() => {
    setSelectedChildIds(childProfiles.map((c) => c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childProfiles.map((c) => c.id).join(',')]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Calculate limits
  const maxCaregivers = MAX_CAREGIVERS[tier];
  const isUnlimited = maxCaregivers === Infinity;
  const activeCount = caregivers.filter(c => c.status !== 'expired').length;
  const canAddMore = isUnlimited || activeCount < maxCaregivers;
  const remainingSlots = isUnlimited ? Infinity : maxCaregivers - activeCount;

  // Determine upgrade tier for more caregivers
  const getUpgradeTier = (): TierType | null => {
    if (tier === 'proplus') return null;
    if (tier === 'pro') return 'proplus';
    if (tier === 'core') return 'pro';
    if (tier === 'starter') return 'core';
    return 'starter';
  };

  const upgradeTier = getUpgradeTier();

  // Handlers
  const hasChildren = childProfiles.length > 0;
  const selectedChildNames = childProfiles
    .filter((c) => selectedChildIds.includes(c.id))
    .map((c) => c.name);

  const handleInvite = () => {
    if (!inviteEmail || !canAddMore) return;
    if (hasChildren && selectedChildIds.length === 0) return;

    const newCaregiver: Caregiver = {
      id: `caregiver_${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
      invitedAt: new Date(),
      childNames: selectedChildNames.length > 0 ? selectedChildNames : undefined
    };

    setCaregivers([...caregivers, newCaregiver]);
    onInvite?.(inviteEmail, inviteRole, hasChildren ? selectedChildIds : []);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  const handleCopyLink = async () => {
    const inviteLink = buildCaregiverInviteLink(window.location.origin);
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRemove = (id: string) => {
    setCaregivers(caregivers.filter(c => c.id !== id));
    onRemove?.(id);
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Family &amp; Care Team
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Invite your partner, family members, or care providers to help manage your child's plan
          </p>
          <p className="text-sm text-[#2A7D99] mt-1">{COPARENT_REASSURANCE}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isUnlimited && (
            <Badge variant="outline">
              {activeCount}/{maxCaregivers} members
            </Badge>
          )}
          {isUnlimited && (
            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
              Unlimited members
            </Badge>
          )}
        </div>
      </div>

      {/* Role Descriptions */}
      <Card className="p-4 bg-[#F6FBFB]">
        <h4 className="font-medium text-sm mb-3">Access Roles</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.keys(roleDescriptions) as CaregiverRole[]).map((role) => (
            <div key={role} className="text-sm">
              <Badge className={`${roleColors[role]} mb-1`}>
                {roleLabels[role]}
              </Badge>
              <p className="text-muted-foreground text-sm">{roleDescriptions[role]}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Invite Actions */}
      {canAddMore ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowInviteModal(true)} className="bg-[#2A7D99] hover:bg-[#376E80] text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite by Email
          </Button>
          <Button variant="outline" onClick={handleCopyLink}>
            {copiedLink ? (
              <Check className="w-4 h-4 mr-2 text-green-600" />
            ) : (
              <Link className="w-4 h-4 mr-2" />
            )}
            {copiedLink ? 'Copied!' : 'Copy Invite Link'}
          </Button>
          <Button variant="outline">
            <QrCode className="w-4 h-4 mr-2" />
            Show QR Code
          </Button>
        </div>
      ) : (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">Caregiver limit reached</p>
              <p className="text-sm text-amber-700 mt-1">
                Your {getTierDisplayName(tier)} plan allows up to {maxCaregivers} caregiver
                {maxCaregivers !== 1 ? 's' : ''}.
              </p>
              {upgradeTier && onUpgrade && (
                <Button
                  onClick={onUpgrade}
                  size="sm"
                  className="mt-3 bg-amber-600 hover:bg-amber-700"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to {getTierDisplayName(upgradeTier)}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Caregivers List */}
      <div className="space-y-3">
        {caregivers.map((caregiver) => (
          <Card
            key={caregiver.id}
            className={`p-4 ${caregiver.status === 'pending' ? 'border-amber-200 bg-amber-50/50' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E8E4DF] flex items-center justify-center">
                  <span className="font-medium text-[#5A6B7A]">
                    {caregiver.name[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#132F43]">{caregiver.name}</p>
                    {caregiver.role === 'owner' && (
                      <Crown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{caregiver.email}</p>
                  {caregiver.childNames && caregiver.childNames.length > 0 && (
                    <p className="text-sm text-[#2A7D99]">
                      {caregiver.childNames.join(' and ')}&apos;s care circle
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status badge */}
                <Badge className={statusColors[caregiver.status]}>
                  {caregiver.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {caregiver.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                  {caregiver.status === 'expired' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {caregiver.status.charAt(0).toUpperCase() + caregiver.status.slice(1)}
                </Badge>

                {/* Role badge */}
                <Badge className={roleColors[caregiver.role]}>{roleLabels[caregiver.role]}</Badge>

                {/* Remove button (not for owner) */}
                {caregiver.role !== 'owner' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(caregiver.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Pending invitation actions */}
            {caregiver.status === 'pending' && (
              <div className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-amber-700">
                  Invitation sent {caregiver.invitedAt.toLocaleDateString()}
                </span>
                <Button variant="link" size="sm" className="text-amber-700 p-0 h-auto">
                  Resend
                </Button>
                <span className="text-amber-400">|</span>
                <Button
                  variant="link"
                  size="sm"
                  className="text-amber-700 p-0 h-auto"
                  onClick={() => handleRemove(caregiver.id)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-1">Invite to your Family &amp; Care Team</h3>
            <p className="text-sm text-muted-foreground mb-4">{COPARENT_REASSURANCE}</p>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="caregiver@example.com"
                  className="w-full px-3 py-2 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              {/* Per-child care-circle scoping — invites are to a child's care
                  circle (like iCloud Family sharing), not blanket account access. */}
              {hasChildren && (
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Which child&apos;s care circle?
                  </label>
                  <div className="space-y-2">
                    {childProfiles.map((child) => (
                      <label
                        key={child.id}
                        className="flex items-center gap-3 p-2.5 border border-[#E8E4DF] rounded-lg cursor-pointer hover:border-accent/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedChildIds.includes(child.id)}
                          onChange={() =>
                            setSelectedChildIds((prev) =>
                              prev.includes(child.id)
                                ? prev.filter((id) => id !== child.id)
                                : [...prev, child.id]
                            )
                          }
                        />
                        <span className="text-sm font-medium">{child.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedChildNames.length > 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      You&apos;re inviting {inviteEmail || 'them'} to{' '}
                      {selectedChildNames.join(' and ')}&apos;s care circle
                      {selectedChildNames.length > 1 ? 's' : ''}.
                    </p>
                  ) : (
                    <p className="text-sm text-amber-600 mt-2">
                      Pick at least one child to share.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium block mb-2">Access Role</label>
                <div className="space-y-2">
                  {(['caregiver', 'read-only'] as CaregiverRole[]).map((role) => (
                    <label
                      key={role}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        inviteRole === role
                          ? 'border-accent bg-accent/5'
                          : 'border-[#E8E4DF] hover:border-[#E8E4DF]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={inviteRole === role}
                        onChange={() => setInviteRole(role)}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium">{roleLabels[role]}</span>
                        <p className="text-sm text-muted-foreground">{roleDescriptions[role]}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail || (hasChildren && selectedChildIds.length === 0)}
                  className="bg-[#2A7D99] hover:bg-[#376E80] text-white"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Caregivers can only access data for children you've explicitly shared with them. All
          activity is logged for your security.
        </p>
      </div>
    </div>
  );
}
