import React, { useState } from 'react';
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
  onInvite?: (email: string, role: CaregiverRole) => void;
  onRemove?: (id: string) => void;
  onUpgrade?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const roleLabels: Record<CaregiverRole, string> = {
  owner: 'Owner',
  caregiver: 'Caregiver',
  'read-only': 'Read-only'
};

const roleColors: Record<CaregiverRole, string> = {
  owner: 'bg-purple-100 text-purple-700 border-purple-200',
  caregiver: 'bg-blue-100 text-blue-700 border-blue-200',
  'read-only': 'bg-gray-100 text-gray-700 border-gray-200'
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

// Caregiver limits per tier
const MAX_CAREGIVERS: Record<TierType, number> = {
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
  onInvite,
  onRemove,
  onUpgrade
}: ManageCaregiversProps) {
  const [caregivers, setCaregivers] = useState<Caregiver[]>(
    initialCaregivers || [
      {
        id: '1',
        name: 'Current User',
        email: 'parent@example.com',
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
  const [inviteRole, setInviteRole] = useState<CaregiverRole>('read-only');
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
  const handleInvite = () => {
    if (!inviteEmail || !canAddMore) return;

    const newCaregiver: Caregiver = {
      id: `caregiver_${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
      invitedAt: new Date()
    };

    setCaregivers([...caregivers, newCaregiver]);
    onInvite?.(inviteEmail, inviteRole);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  const handleCopyLink = async () => {
    const inviteLink = `${window.location.origin}/invite?code=DEMO_CODE`;
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRemove = (id: string) => {
    setCaregivers(caregivers.filter(c => c.id !== id));
    onRemove?.(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Manage Caregivers
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Invite family members or care providers to help manage your child's plan
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isUnlimited && (
            <Badge variant="outline">
              {activeCount}/{maxCaregivers} members
            </Badge>
          )}
          {isUnlimited && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Unlimited members
            </Badge>
          )}
        </div>
      </div>

      {/* Role Descriptions */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-medium text-sm mb-3">Access Roles</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.keys(roleDescriptions) as CaregiverRole[]).map((role) => (
            <div key={role} className="text-sm">
              <Badge className={`${roleColors[role]} mb-1`}>
                {roleLabels[role]}
              </Badge>
              <p className="text-muted-foreground text-xs">{roleDescriptions[role]}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Invite Actions */}
      {canAddMore ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowInviteModal(true)}>
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
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="font-medium text-gray-600">
                    {caregiver.name[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{caregiver.name}</p>
                    {caregiver.role === 'owner' && (
                      <Crown className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{caregiver.email}</p>
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
            <h3 className="text-lg font-semibold mb-4">Invite Caregiver</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="caregiver@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Access Role</label>
                <div className="space-y-2">
                  {(['caregiver', 'read-only'] as CaregiverRole[]).map((role) => (
                    <label
                      key={role}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        inviteRole === role
                          ? 'border-accent bg-accent/5'
                          : 'border-gray-200 hover:border-gray-300'
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
                <Button onClick={handleInvite} disabled={!inviteEmail}>
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
