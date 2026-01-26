import React, { useState } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  Lightbulb,
  Check,
  AlertCircle,
  Clock,
  Settings as SettingsIcon,
  ChevronRight
} from 'lucide-react';

/**
 * ADAPTIVE REMINDERS - SMART NOTIFICATION MANAGEMENT
 * 
 * Four-screen flow:
 * 1. Reminder Settings Screen - Configure reminders with AI suggestions
 * 2. Reminder Notification - In-app preview with quick actions
 * 3. Snooze Success State - Toast confirmation
 * 4. Reminder Error State - Toast error with action
 */

interface ReminderTime {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

interface ReminderSettings {
  enabled: boolean;
  morning: ReminderTime;
  afternoon: ReminderTime;
  evening: ReminderTime;
  tone: 'gentle' | 'encouraging' | 'playful';
}

interface AdaptiveRemindersProps {
  childName?: string;
  onClose?: () => void;
}

const defaultSettings: ReminderSettings = {
  enabled: true,
  morning: { hour: 7, minute: 30, period: 'AM' },
  afternoon: { hour: 3, minute: 0, period: 'PM' },
  evening: { hour: 7, minute: 30, period: 'PM' },
  tone: 'gentle'
};

export function AdaptiveReminders({ childName = 'Eddie', onClose }: AdaptiveRemindersProps) {
  const [settings, setSettings] = useState<ReminderSettings>(defaultSettings);
  const [showPreview, setShowPreview] = useState(false);

  // Handle toggle change
  const handleToggleChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }));
  };

  // Handle time change
  const handleTimeChange = (
    routine: 'morning' | 'afternoon' | 'evening',
    field: 'hour' | 'minute' | 'period',
    value: number | 'AM' | 'PM'
  ) => {
    setSettings(prev => ({
      ...prev,
      [routine]: {
        ...prev[routine],
        [field]: value
      }
    }));
  };

  // Handle tone change
  const handleToneChange = (tone: 'gentle' | 'encouraging' | 'playful') => {
    setSettings(prev => ({ ...prev, tone }));
  };

  // Handle save
  const handleSave = () => {
    // Simulate save
    toast.success('Reminder settings saved', {
      description: 'Your preferences have been updated',
      duration: 3000
    });
  };

  // Format time for display
  const formatTime = (time: ReminderTime): string => {
    const hour12 = time.hour === 0 ? 12 : time.hour;
    const minute = time.minute.toString().padStart(2, '0');
    return `${hour12}:${minute} ${time.period}`;
  };

  // Get preview message based on tone
  const getPreviewMessage = (): string => {
    const timeStr = formatTime(settings.morning);
    switch (settings.tone) {
      case 'gentle':
        return `Gentle reminder: It's time for morning routine with ${childName} 🌅`;
      case 'encouraging':
        return `You've got this! Time for morning routine with ${childName} 💪`;
      case 'playful':
        return `Rise and shine! Let's start the day with ${childName} 🎉`;
      default:
        return `Reminder: Time for morning routine with ${childName}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-primary mb-2">
            Reminder Settings
          </h1>
          <p className="text-muted-foreground">
            Get timely reminders for {childName}'s activities
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          {/* Main Toggle */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {settings.enabled ? (
                <Bell className="w-5 h-5 text-accent" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <Label className="text-base font-semibold cursor-pointer">
                  Send me reminders
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receive notifications for scheduled activities
                </p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={handleToggleChange}
              className="data-[state=checked]:bg-accent"
            />
          </div>

          {/* Time Pickers Section */}
          {settings.enabled && (
            <>
              {/* Morning Routine */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Morning routine</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start the day with structured activities
                    </p>
                  </div>
                  <TimeInput
                    time={settings.morning}
                    onChange={(field, value) => handleTimeChange('morning', field, value)}
                  />
                </div>
                <AIBadge
                  recommendation="Aminy recommends 7:15 AM based on your family's patterns"
                />
              </div>

              {/* Afternoon Practice */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Afternoon practice</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      After-school learning opportunities
                    </p>
                  </div>
                  <TimeInput
                    time={settings.afternoon}
                    onChange={(field, value) => handleTimeChange('afternoon', field, value)}
                  />
                </div>
                <AIBadge
                  recommendation="Aminy recommends 3:15 PM based on your family's patterns"
                />
              </div>

              {/* Evening Wind-down */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Evening wind-down</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Calming activities before bedtime
                    </p>
                  </div>
                  <TimeInput
                    time={settings.evening}
                    onChange={(field, value) => handleTimeChange('evening', field, value)}
                  />
                </div>
                <AIBadge
                  recommendation="Aminy recommends 7:15 PM based on your family's patterns"
                />
              </div>

              {/* Tone Selector */}
              <div className="pt-4 border-t border-gray-100">
                <Label className="text-base font-medium mb-3 block">
                  Reminder tone
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <ToneButton
                    tone="gentle"
                    label="Gentle"
                    selected={settings.tone === 'gentle'}
                    onClick={() => handleToneChange('gentle')}
                  />
                  <ToneButton
                    tone="encouraging"
                    label="Encouraging"
                    selected={settings.tone === 'encouraging'}
                    onClick={() => handleToneChange('encouraging')}
                  />
                  <ToneButton
                    tone="playful"
                    label="Playful"
                    selected={settings.tone === 'playful'}
                    onClick={() => handleToneChange('playful')}
                  />
                </div>
              </div>

              {/* Preview Section */}
              <div className="pt-4 border-t border-gray-100">
                <Label className="text-base font-medium mb-3 block">
                  Preview
                </Label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 flex-1">
                      {getPreviewMessage()}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="pt-6 border-t border-gray-100">
            <Button
              onClick={handleSave}
              className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-lg transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              Save Settings
            </Button>
          </div>
        </div>

        {/* Show Notification Preview Button */}
        <div className="mt-4">
          <button
            onClick={() => setShowPreview(true)}
            className="text-sm text-accent hover:underline"
          >
            Preview notification
          </button>
        </div>
      </div>

      {/* In-App Notification Preview */}
      {showPreview && (
        <ReminderNotification
          childName={childName}
          tone={settings.tone}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// Time Input Component
interface TimeInputProps {
  time: ReminderTime;
  onChange: (field: 'hour' | 'minute' | 'period', value: number | 'AM' | 'PM') => void;
}

function TimeInput({ time, onChange }: TimeInputProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Hour */}
      <select
        value={time.hour}
        onChange={(e) => onChange('hour', parseInt(e.target.value))}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>

      <span className="text-gray-500">:</span>

      {/* Minute */}
      <select
        value={time.minute}
        onChange={(e) => onChange('minute', parseInt(e.target.value))}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
      >
        {[0, 15, 30, 45].map((minute) => (
          <option key={minute} value={minute}>
            {minute.toString().padStart(2, '0')}
          </option>
        ))}
      </select>

      {/* Period */}
      <select
        value={time.period}
        onChange={(e) => onChange('period', e.target.value as 'AM' | 'PM')}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

// AI Badge Component
interface AIBadgeProps {
  recommendation: string;
}

function AIBadge({ recommendation }: AIBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg">
      <Lightbulb className="w-4 h-4 text-accent flex-shrink-0" />
      <p className="text-xs text-accent font-medium">{recommendation}</p>
    </div>
  );
}

// Tone Button Component
interface ToneButtonProps {
  tone: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

function ToneButton({ tone, label, selected, onClick }: ToneButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
        selected
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-gray-300 bg-white text-gray-700 hover:border-accent/50'
      }`}
    >
      {label}
    </button>
  );
}

// Reminder Notification Component (Screen 2)
interface ReminderNotificationProps {
  childName: string;
  tone: 'gentle' | 'encouraging' | 'playful';
  onClose: () => void;
}

function ReminderNotification({ childName, tone, onClose }: ReminderNotificationProps) {
  const getMessage = (): string => {
    switch (tone) {
      case 'gentle':
        return `Gentle reminder: It's time for afternoon practice with ${childName}`;
      case 'encouraging':
        return `You've got this! Time for afternoon practice with ${childName}`;
      case 'playful':
        return `Let's go! Time for afternoon practice with ${childName}`;
      default:
        return `Reminder: Time for afternoon practice with ${childName}`;
    }
  };

  const handleStartNow = () => {
    onClose();
    toast.success('Starting activity', {
      description: 'Launching afternoon practice',
      duration: 2000
    });
  };

  const handleSnooze = (duration: string) => {
    onClose();
    // Success toast (Screen 3)
    toast.success(`We'll remind you in ${duration}`, {
      icon: <Check className="w-4 h-4" />,
      duration: 4000
    });
  };

  const handleTurnOff = () => {
    onClose();
    toast.info('Reminders paused', {
      description: 'You can turn them back on in settings',
      duration: 3000
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Notification Card - with safe area for notched devices */}
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-lg shadow-2xl z-50 border border-gray-200 dark:border-slate-700"
        style={{ top: 'max(16px, env(safe-area-inset-top))' }}
      >
        <div className="p-6 space-y-4">
          {/* Message */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-base font-medium text-gray-900 leading-relaxed">
                {getMessage()}
              </p>
            </div>
          </div>

          {/* Quick Action Chips */}
          <div className="space-y-2">
            <Button
              onClick={handleStartNow}
              className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-lg transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              Start now
            </Button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSnooze('30 minutes')}
                className="px-3 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:border-accent hover:bg-accent/5 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                30 min
              </button>
              <button
                onClick={() => handleSnooze('1 hour')}
                className="px-3 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:border-accent hover:bg-accent/5 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                1 hour
              </button>
              <button
                onClick={() => handleSnooze('tomorrow')}
                className="px-3 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:border-accent hover:bg-accent/5 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                Tomorrow
              </button>
            </div>
          </div>

          {/* Turn Off Link */}
          <div className="pt-2 text-center">
            <button
              onClick={handleTurnOff}
              className="text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              Turn off reminders
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Example usage with error state demonstration
export function AdaptiveRemindersExample() {
  const [showSettings, setShowSettings] = useState(false);

  const handleTestError = () => {
    // Error toast (Screen 4)
    toast.error("Couldn't set that reminder", {
      description: 'Check your notification settings?',
      icon: <AlertCircle className="w-4 h-4" />,
      duration: 5000,
      action: {
        label: 'Open Settings',
        onClick: () => {
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-semibold mb-4">Adaptive Reminders Demo</h1>

        <Button
          onClick={() => setShowSettings(true)}
          className="w-full bg-accent hover:bg-accent/90"
        >
          <SettingsIcon className="w-4 h-4 mr-2" />
          Configure Reminders
        </Button>

        <Button
          onClick={handleTestError}
          variant="outline"
          className="w-full"
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Test Error State
        </Button>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-50 overflow-y-auto">
          <div
            className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 p-4 flex items-center gap-3"
            style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
          >
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ← Back
            </button>
          </div>
          <AdaptiveReminders
            childName="Eddie"
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}
    </div>
  );
}
