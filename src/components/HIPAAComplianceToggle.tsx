// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  FileText,
  Settings
} from 'lucide-react';

interface HIPAAComplianceToggleProps {
  onToggle?: (enabled: boolean) => void;
  defaultEnabled?: boolean;
}

export function HIPAAComplianceToggle({ 
  onToggle, 
  defaultEnabled = true 
}: HIPAAComplianceToggleProps) {
  const [hipaaEnabled, setHipaaEnabled] = useState(defaultEnabled);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('aminy-hipaa-enabled');
    if (saved !== null) {
      setHipaaEnabled(JSON.parse(saved));
    }
  }, []);

  const handleToggle = (enabled: boolean) => {
    setHipaaEnabled(enabled);
    localStorage.setItem('aminy-hipaa-enabled', JSON.stringify(enabled));
    onToggle?.(enabled);
  };

  const complianceFeatures = [
    {
      name: 'Data Encryption',
      enabled: hipaaEnabled,
      description: 'All data encrypted at rest and in transit (AES-256)'
    },
    {
      name: 'Access Controls',
      enabled: hipaaEnabled,
      description: 'Role-based access with audit logging'
    },
    {
      name: 'PHI Protection',
      enabled: hipaaEnabled,
      description: 'Protected Health Information safeguards'
    },
    {
      name: 'Session Timeout',
      enabled: hipaaEnabled,
      description: 'Automatic logout after 15 minutes of inactivity'
    },
    {
      name: 'Audit Trail',
      enabled: hipaaEnabled,
      description: 'Complete activity logging for compliance'
    }
  ];

  return (
    <Card className={`p-6 ${hipaaEnabled ? 'border-green-200 bg-green-50' : 'border-[#E8E4DF]'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            hipaaEnabled ? 'bg-green-100' : 'bg-[#F0EDE8]'
          }`}>
            <Shield className={`w-5 h-5 ${hipaaEnabled ? 'text-green-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <h3 className="text-[#1B2733] mb-1 flex items-center gap-2">
              HIPAA-Lite Mode
              {hipaaEnabled ? (
                <Badge className="bg-green-100 text-green-700">Active</Badge>
              ) : (
                <Badge className="bg-[#F0EDE8] text-[#3A4A57]">Disabled</Badge>
              )}
            </h3>
            <p className="text-sm text-[#5A6B7A]">
              Enhanced privacy and security protections
            </p>
          </div>
        </div>
        <Switch
          checked={hipaaEnabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {hipaaEnabled && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
          <div className="flex items-start gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#1B2733] mb-1">
                HIPAA-Conscious protections are active
              </p>
              <p className="text-sm text-[#5A6B7A]">
                Your family's health information is protected with industry-standard security measures.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hipaaEnabled && (
        <div className="bg-amber-50 rounded-lg p-4 mb-4 border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#1B2733] mb-1">
                HIPAA protections are disabled
              </p>
              <p className="text-sm text-[#5A6B7A]">
                We recommend keeping these protections enabled to ensure data privacy.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-sm text-[#5A6B7A] hover:text-[#1B2733] transition-colors mb-3"
      >
        {showDetails ? (
          <>
            <EyeOff className="w-4 h-4" />
            Hide Details
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            Show Details
          </>
        )}
      </button>

      {showDetails && (
        <div className="space-y-3 pt-3 border-t border-[#E8E4DF]">
          <h4 className="text-sm text-[#1B2733] mb-2">Active Protections</h4>
          {complianceFeatures.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                feature.enabled ? 'bg-green-100' : 'bg-[#F0EDE8]'
              }`}>
                {feature.enabled ? (
                  <Lock className="w-3 h-3 text-green-600" />
                ) : (
                  <Lock className="w-3 h-3 text-slate-400" />
                )}
              </div>
              <div>
                <div className="text-sm text-[#1B2733]">{feature.name}</div>
                <div className="text-sm text-[#5A6B7A]">{feature.description}</div>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-[#E8E4DF]">
            <Button variant="outline" className="w-full" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              View Privacy Policy
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-[#E8E4DF]">
        <p className="text-sm text-[#5A6B7A] leading-relaxed">
          <strong>Note:</strong> While Aminy implements HIPAA-conscious security practices, 
          this app is designed for personal family use and is not a substitute for clinical care. 
          For complete HIPAA compliance, please consult with your healthcare provider.
        </p>
      </div>
    </Card>
  );
}
