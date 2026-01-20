import React, { useState } from 'react';
import { UserPlus, Trash2, QrCode, Link } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Caregiver {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'caregiver' | 'read-only';
  invitedAt: Date;
}

export function ManageCaregivers() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'owner',
      invitedAt: new Date()
    }
  ]);

  const roleLabels = {
    owner: 'Owner',
    caregiver: 'Caregiver',
    'read-only': 'Read-only'
  };

  const handleInvite = () => {
  };

  const handleShareLink = () => {
  };

  const handleQRCode = () => {
  };

  const handleRemove = (id: string) => {
    setCaregivers(caregivers.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Manage Caregivers</h3>
        <Button onClick={handleInvite}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite
        </Button>
      </div>

      {/* Invite Options */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleShareLink}>
          <Link className="w-4 h-4 mr-2" />
          Share Link
        </Button>
        <Button variant="outline" size="sm" onClick={handleQRCode}>
          <QrCode className="w-4 h-4 mr-2" />
          QR Code
        </Button>
      </div>

      {/* Caregivers List */}
      <div className="space-y-3">
        {caregivers.map((caregiver) => (
          <div key={caregiver.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">{caregiver.name}</p>
              <p className="text-sm text-muted-foreground">{caregiver.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{roleLabels[caregiver.role]}</Badge>
              {caregiver.role !== 'owner' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRemove(caregiver.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
