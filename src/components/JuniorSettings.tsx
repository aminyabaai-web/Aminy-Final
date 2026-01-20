import React, { useState } from 'react';
import { ArrowLeft, Bell, Shield, Clock, Eye, Lock } from 'lucide-react';
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
    requirePin: false,
    trackingEnabled: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTimeLimit = (value: number[]) => {
    setSettings(prev => ({ ...prev, timeLimit: value[0] }));
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4 px-4 py-4">
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
            <h1 className="font-semibold text-foreground">Junior Settings</h1>
            <p className="text-sm text-muted-foreground">Manage {childName}'s Junior mode</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Junior Mode Status */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-foreground">Junior Mode</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {settings.enabled 
                  ? `${childName} can access their personalized activities and games`
                  : 'Junior mode is currently disabled'}
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={() => handleToggle('enabled')}
              aria-label="Toggle Junior mode"
            />
          </div>
        </div>

        {/* Activity Notifications */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-start justify-between gap-4 mb-4">
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
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <Label className="font-semibold">Daily Time Limit</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Set a maximum time {childName} can use Junior mode per day
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-accent">{settings.timeLimit}</span>
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
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
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

            <div className="h-px bg-gray-200" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-amber-600" />
                  <Label htmlFor="require-pin" className="font-semibold">
                    Require PIN to Exit
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {childName} will need your PIN to leave Junior mode
                </p>
              </div>
              <Switch
                id="require-pin"
                checked={settings.requirePin}
                onCheckedChange={() => handleToggle('requirePin')}
                disabled={!settings.enabled}
              />
            </div>
          </div>
        </div>

        {/* Activity Tracking */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-start justify-between gap-4">
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
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-muted-foreground text-center">
            All Junior mode activities are designed by developmental specialists and tailored to {childName}'s needs.
          </p>
        </div>
      </div>
    </div>
  );
}
