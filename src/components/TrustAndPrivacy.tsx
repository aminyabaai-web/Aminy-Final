// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Trust & Privacy Center
 * HIPAA-Lite toggle, data practices transparency, delete data flow
 */

import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, Download, Trash2, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PrivacySettings {
  enhancedPrivacyMode: boolean; // HIPAA-Lite
  allowModelTraining: boolean;
  shareAnonymizedData: boolean;
  localStorageOnly: boolean;
}

interface DataAuditLog {
  id: string;
  action: string;
  timestamp: string;
  dataType: string;
  description: string;
}

export function TrustAndPrivacy({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<PrivacySettings>({
    enhancedPrivacyMode: false,
    allowModelTraining: false,
    shareAnonymizedData: false,
    localStorageOnly: false,
  });
  const [auditLogs, setAuditLogs] = useState<DataAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrivacySettings();
    loadAuditLogs();
  }, [userId]);

  async function loadPrivacySettings() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/privacy/settings?userId=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || settings);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
    setLoading(false);
  }

  async function loadAuditLogs() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/privacy/audit-log?userId=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  }

  async function updateSetting(key: keyof PrivacySettings, value: boolean) {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/privacy/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId, settings: newSettings }),
        }
      );

      if (response.ok) {
        toast.success('Privacy settings updated');
        
        if (key === 'enhancedPrivacyMode' && value) {
          toast.info('Enhanced Privacy Mode enabled. Data stored locally and model training disabled.');
        }
      } else {
        toast.error('Failed to update settings');
        setSettings(settings); // Revert
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Failed to update settings');
      setSettings(settings); // Revert
    }
  }

  async function exportUserData() {
    try {
      toast.info('Preparing your data export...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/privacy/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aminy-data-${userId}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Data exported successfully');
      } else {
        toast.error('Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  }

  async function deleteUserData() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/privacy/delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (response.ok) {
        toast.success('Your data has been permanently deleted');
        
        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to homepage after delay
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        toast.error('Failed to delete data');
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      toast.error('Failed to delete data');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Enhanced Privacy Mode (HIPAA-Lite) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Enhanced Privacy Mode
          </CardTitle>
          <CardDescription>
            Keep your data local and private - no cloud training, maximum security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enhanced-privacy" className="text-base font-semibold">
                Enable Enhanced Privacy
              </Label>
              <p className="text-sm text-slate-600 mt-1">
                Stores data locally, disables AI model training, and adds extra encryption
              </p>
            </div>
            <Switch
              id="enhanced-privacy"
              checked={settings.enhancedPrivacyMode}
              onCheckedChange={(checked) => updateSetting('enhancedPrivacyMode', checked)}
            />
          </div>

          {settings.enhancedPrivacyMode && (
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-slate-900">Enhanced Privacy Active</p>
                  <ul className="text-slate-700 space-y-1 ml-4 list-disc">
                    <li>All data stored on your device</li>
                    <li>AI conversations not used for training</li>
                    <li>Strong client-side encryption (AES-256) for synced data</li>
                    <li>No third-party analytics</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Privacy Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Controls</CardTitle>
          <CardDescription>
            Manage how your data is used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="model-training" className="text-base">
                Allow AI Model Improvement
              </Label>
              <p className="text-sm text-slate-600 mt-1">
                Help improve Aminy by anonymously training AI models
              </p>
            </div>
            <Switch
              id="model-training"
              checked={settings.allowModelTraining}
              onCheckedChange={(checked) => updateSetting('allowModelTraining', checked)}
              disabled={settings.enhancedPrivacyMode}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="anonymized-data" className="text-base">
                Share Anonymized Usage Data
              </Label>
              <p className="text-sm text-slate-600 mt-1">
                Help us understand how Aminy is used (no personal info)
              </p>
            </div>
            <Switch
              id="anonymized-data"
              checked={settings.shareAnonymizedData}
              onCheckedChange={(checked) => updateSetting('shareAnonymizedData', checked)}
              disabled={settings.enhancedPrivacyMode}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="local-only" className="text-base">
                Local Storage Only
              </Label>
              <p className="text-sm text-slate-600 mt-1">
                Never sync data to cloud (may limit features)
              </p>
            </div>
            <Switch
              id="local-only"
              checked={settings.localStorageOnly}
              onCheckedChange={(checked) => updateSetting('localStorageOnly', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Our Data Practices
          </CardTitle>
          <CardDescription>
            Plain-English explanation of how we handle your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="text-sm text-slate-700 space-y-3">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">What We Collect</h4>
              <p>We collect only what's needed: your child's development goals, routine data, and progress notes. No selling, no sharing with third parties.</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1">How We Use It</h4>
              <p>Your data powers personalized AI guidance and progress tracking. With Enhanced Privacy Mode, data never leaves your device.</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Your Rights</h4>
              <p>You can export or delete all your data anytime. We're HIPAA-conscious and follow strict security protocols.</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Security</h4>
              <p>All data encrypted in transit (TLS) and at rest (AES-256). Regular security audits and penetration testing.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export or delete your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={exportUserData}
            variant="outline"
            className="w-full justify-start"
          >
            <Download className="w-4 h-4 mr-3" />
            Export All My Data
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full justify-start"
              >
                <Trash2 className="w-4 h-4 mr-3" />
                Delete All My Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
                    <strong>Warning:</strong> You will lose all progress, routines, documents, and AI conversation history.
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteUserData}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Data Access Log
          </CardTitle>
          <CardDescription>
            See when and how your data has been accessed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">
              No activity logged yet
            </p>
          ) : (
            <div className="space-y-2">
              {auditLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3 bg-slate-50 rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">{log.action}</p>
                    <p className="text-slate-600">{log.description}</p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-4">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
