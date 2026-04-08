// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { ArrowLeft, UserPlus, QrCode, Link as LinkIcon, Mail, MoreVertical, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ManageCaregivers } from './ManageCaregivers';
import { useAuditedAction } from '../hooks/useAuditedAction';

interface CaregiverManagementScreenProps {
  onBack?: () => void;
}

export function CaregiverManagementScreen({ onBack }: CaregiverManagementScreenProps) {
  // HIPAA audit: log caregiver/account access view on mount
  useAuditedAction('user_account');

  const [showAddCaregiver, setShowAddCaregiver] = useState(false);
  type CaregiverRole = 'owner' | 'caregiver' | 'read-only';
  type CaregiverStatus = 'active' | 'pending';

  const [caregivers, setCaregivers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    role: CaregiverRole;
    status: CaregiverStatus;
    addedDate: string;
  }>>([
    {
      id: '1',
      name: 'Parent (You)',
      email: 'parent@example.com',
      role: 'owner',
      status: 'active',
      addedDate: '2025-09-01'
    },
    {
      id: '2',
      name: 'Partner',
      email: 'partner@example.com',
      role: 'caregiver',
      status: 'active',
      addedDate: '2025-09-15'
    },
    {
      id: '3',
      name: 'Grandparent',
      email: 'grandparent@example.com',
      role: 'read-only',
      status: 'pending',
      addedDate: '2025-10-18'
    }
  ]);

  const handleInvite = (email: string, role: CaregiverRole) => {
    const newCaregiver = {
      id: Date.now().toString(),
      name: email.split('@')[0],
      email,
      role,
      status: 'pending' as CaregiverStatus,
      addedDate: new Date().toISOString().split('T')[0]
    };
    setCaregivers([...caregivers, newCaregiver]);
    setShowAddCaregiver(false);
  };

  const handleRevoke = (id: string) => {
    setCaregivers(caregivers.filter(c => c.id !== id));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'caregiver':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'read-only':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-semibold">Manage Caregivers</h1>
              <p className="text-sm text-muted-foreground">
                Control who has access to your child's care plan
              </p>
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
              <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Owner</p>
                <p className="text-xs text-muted-foreground">
                  Full access: Edit plans, manage caregivers, billing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Caregiver</p>
                <p className="text-xs text-muted-foreground">
                  Can edit plans, log activities, view reports
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Read-only</p>
                <p className="text-xs text-muted-foreground">
                  View-only access to plans and progress
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Add Caregiver Button */}
        {!showAddCaregiver && (
          <Button onClick={() => setShowAddCaregiver(true)} className="w-full">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Caregiver
          </Button>
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
                    <p className="text-xs text-muted-foreground mt-2">
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
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
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
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <QrCode className="w-6 h-6" />
              <span className="text-sm">QR Code</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <LinkIcon className="w-6 h-6" />
              <span className="text-sm">Share Link</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <Mail className="w-6 h-6" />
              <span className="text-sm">Email Invite</span>
            </Button>
          </div>
        </Card>

        {/* Privacy Notice */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Privacy & Security:</strong> All caregivers must accept an invitation
            and verify their email before gaining access. You can revoke access at any time.
            Changes take effect immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
