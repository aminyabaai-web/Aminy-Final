// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { ArrowLeft, Bell, Shield, Clock, Eye, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Slider } from './ui/slider';

interface JuniorSettingsProps {
  onBack: () => void;
  childName: string;
}

export function JuniorSettings({ onBack, childName }: JuniorSettingsProps) {
  const [settings, setSettings] = useState({
    enabled: true,
    activityNotifications: true,
    timeLimit: 30,
    contentFilter: true,
    gentleExitPrompt: true,
    trackingEnabled: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTimeLimit = (value: number[]) => {
    setSettings(prev => ({ ...prev, timeLimit: value[0] }));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 sm:gap-4 px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Calm &amp; Rewards Settings</h1>
            <p className="text-sm text-muted-foreground">Manage {childName}&apos;s calm tools, rewards, and transition supports</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 sm:space-y-4 sm:space-y-6 max-w-2xl mx-auto">
        {/* Junior Mode Status */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-foreground">Kid-side support</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {settings.enabled 
                  ? `${childName} can open calm tools, reward progress, and transition helpers anytime`
                  : 'Kid-side support is currently turned off'}
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={() => handleToggle('enabled')}
              aria-label="Toggle kid-side support"
            />
          </div>
        </div>

        {/* Activity Notifications */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <Label htmlFor="activity-notifications" className="font-semibold">
                  Activity Notifications
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when {childName} completes activities
              </p>
            </div>
            <Switch
              id="activity-notifications"
              checked={settings.activityNotifications}
              onCheckedChange={() => handleToggle('activityNotifications')}
              disabled={!settings.enabled}
            />
          </div>
        </div>

        {/* Time Limits */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-[#6B9080]" />
              <Label className="font-semibold">Daily Time Limit</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Set a maximum time {childName} can use Ease per day
            </p>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-bold text-accent">{settings.timeLimit}</span>
              <span className="text-sm text-muted-foreground">minutes per day</span>
            </div>
            <Slider
              value={[settings.timeLimit]}
              onValueChange={handleTimeLimit}
              max={120}
              min={15}
              step={15}
              disabled={!settings.enabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15 min</span>
              <span>60 min</span>
              <span>120 min</span>
            </div>
          </div>
        </div>

        {/* Content Restrictions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-5 h-5 text-green-600" />
                  <Label htmlFor="content-filter" className="font-semibold">
                    Age-Appropriate Content
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Filter activities based on {childName}'s age and development level
                </p>
              </div>
              <Switch
                id="content-filter"
                checked={settings.contentFilter}
                onCheckedChange={() => handleToggle('contentFilter')}
                disabled={!settings.enabled}
              />
            </div>

            <div className="h-px bg-[#E8E4DF]" />

            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <Label htmlFor="gentle-exit-prompt" className="font-semibold">
                    Gentle Exit Reminder
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Show a soft reminder before leaving calm tools or reward boards so transitions feel less abrupt
                </p>
              </div>
              <Switch
                id="gentle-exit-prompt"
                checked={settings.gentleExitPrompt}
                onCheckedChange={() => handleToggle('gentleExitPrompt')}
                disabled={!settings.enabled}
              />
            </div>
          </div>
        </div>

        {/* Activity Tracking */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <Label htmlFor="tracking" className="font-semibold">
                  Activity Tracking
                </Label>
              </div>
              <p className="text-sm text-blue-900/70">
                Track {childName}'s progress and milestones to help with therapy and care planning
              </p>
            </div>
            <Switch
              id="tracking"
              checked={settings.trackingEnabled}
              onCheckedChange={() => handleToggle('trackingEnabled')}
              disabled={!settings.enabled}
            />
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-[#FAF7F2] rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-muted-foreground text-center">
            Calm tools, rewards, and transition supports are designed to lower stress quickly and make daily routines easier for {childName}.
          </p>
        </div>
      </div>
    </div>
  );
}
