// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Bell, Mail, MessageSquare, Calendar, Brain } from 'lucide-react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState({
    email: {
      dailySummary: true,
      weeklyReport: true,
      goalMilestones: true,
      sessionReminders: true,
      messages: true
    },
    push: {
      sessionReminders: true,
      messages: true,
      urgentAlerts: true,
      dailyTips: false
    },
    sms: {
      sessionReminders: false,
      urgentAlerts: true,
      appointmentConfirm: false
    },
    ai: {
      checkinReminders: true,
      sessionNotesReady: true,
      weeklyDigest: false,
    },
  });

  const updatePreference = (category: keyof typeof preferences, key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-accent" />
        <h2 className="text-lg sm:text-xl font-semibold">Notification Preferences</h2>
      </div>

      {/* Email Notifications */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold">Email Notifications</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <Label>Daily Summary</Label>
            <Switch
              checked={preferences.email.dailySummary}
              onCheckedChange={(value) => updatePreference('email', 'dailySummary', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Weekly Progress Report</Label>
            <Switch
              checked={preferences.email.weeklyReport}
              onCheckedChange={(value) => updatePreference('email', 'weeklyReport', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Goal Milestones</Label>
            <Switch
              checked={preferences.email.goalMilestones}
              onCheckedChange={(value) => updatePreference('email', 'goalMilestones', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Session Reminders</Label>
            <Switch
              checked={preferences.email.sessionReminders}
              onCheckedChange={(value) => updatePreference('email', 'sessionReminders', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>New Messages</Label>
            <Switch
              checked={preferences.email.messages}
              onCheckedChange={(value) => updatePreference('email', 'messages', value)}
            />
          </div>
        </div>
      </Card>

      {/* Push Notifications */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-purple-600" />
          <h3 className="font-semibold">Push Notifications</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <Label>Session Reminders</Label>
            <Switch
              checked={preferences.push.sessionReminders}
              onCheckedChange={(value) => updatePreference('push', 'sessionReminders', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>New Messages</Label>
            <Switch
              checked={preferences.push.messages}
              onCheckedChange={(value) => updatePreference('push', 'messages', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Urgent Alerts</Label>
            <Switch
              checked={preferences.push.urgentAlerts}
              onCheckedChange={(value) => updatePreference('push', 'urgentAlerts', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Daily Tips</Label>
            <Switch
              checked={preferences.push.dailyTips}
              onCheckedChange={(value) => updatePreference('push', 'dailyTips', value)}
            />
          </div>
        </div>
      </Card>

      {/* SMS Notifications */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-green-600" />
          <h3 className="font-semibold">SMS Notifications</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <Label>Session Reminders</Label>
            <Switch
              checked={preferences.sms.sessionReminders}
              onCheckedChange={(value) => updatePreference('sms', 'sessionReminders', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Urgent Alerts</Label>
            <Switch
              checked={preferences.sms.urgentAlerts}
              onCheckedChange={(value) => updatePreference('sms', 'urgentAlerts', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Appointment Confirmations</Label>
            <Switch
              checked={preferences.sms.appointmentConfirm}
              onCheckedChange={(value) => updatePreference('sms', 'appointmentConfirm', value)}
            />
          </div>
        </div>
      </Card>

      {/* Aminy AI Notifications */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-[#43AA8B]" />
          <h3 className="font-semibold">Aminy AI</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>Check-in reminders</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Alert when a scheduled AI check-in is due</p>
            </div>
            <Switch
              checked={preferences.ai.checkinReminders}
              onCheckedChange={(value) => updatePreference('ai', 'checkinReminders', value)}
            />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>Session notes ready</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When AI finishes analyzing a therapy session note</p>
            </div>
            <Switch
              checked={preferences.ai.sessionNotesReady}
              onCheckedChange={(value) => updatePreference('ai', 'sessionNotesReady', value)}
            />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>Weekly AI digest</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Summary of AI insights from the past week</p>
            </div>
            <Switch
              checked={preferences.ai.weeklyDigest}
              onCheckedChange={(value) => updatePreference('ai', 'weeklyDigest', value)}
            />
          </div>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        You can update these preferences at any time
      </p>
    </div>
  );
}
