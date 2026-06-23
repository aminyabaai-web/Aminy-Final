// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { 
  Bell, 
  Mail, 
  Sun, 
  Moon, 
  Trophy,
  CheckCircle,
  Settings,
  X,
  Sparkles,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationEmailSystemProps {
  userData: {
    parentName: string;
    childName: string;
  };
}

interface Notification {
  id: string;
  type: 'morning-cue' | 'evening-reflection' | 'milestone' | 'tip' | 'reminder';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface EmailPreferences {
  weeklyDigest: boolean;
  dailyTips: boolean;
  milestones: boolean;
  communityUpdates: boolean;
}

interface PushPreferences {
  morningCue: boolean;
  eveningReflection: boolean;
  milestones: boolean;
  reminders: boolean;
}

export function NotificationEmailSystem({ userData }: NotificationEmailSystemProps) {
  const [showBellFeed, setShowBellFeed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOptInModal, setShowOptInModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({
    weeklyDigest: true,
    dailyTips: false,
    milestones: true,
    communityUpdates: false
  });

  const [pushPreferences, setPushPreferences] = useState<PushPreferences>({
    morningCue: true,
    eveningReflection: true,
    milestones: true,
    reminders: true
  });

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'morning-cue',
      title: 'Ready for today\'s calm plan? ☀️',
      message: `Good morning, ${userData.parentName}! ${userData.childName}'s calm plan is ready. Let's make today amazing.`,
      timestamp: '8:00 AM',
      read: false
    },
    {
      id: '2',
      type: 'milestone',
      title: '7-Day Streak Achievement! 🎉',
      message: `Amazing! ${userData.childName} completed their morning routine 7 days in a row. Celebrate this win together!`,
      timestamp: 'Yesterday',
      read: false
    },
    {
      id: '3',
      type: 'evening-reflection',
      title: 'How did today go? 🌙',
      message: 'Take 30 seconds to log today\'s wins. Your reflection helps Aminy personalize tomorrow\'s plan.',
      timestamp: 'Yesterday at 8:00 PM',
      read: false
    },
    {
      id: '4',
      type: 'tip',
      title: 'New tip based on your progress',
      message: 'Struggling with transitions? Try the "First-Then" strategy — it works wonders!',
      timestamp: '2 days ago',
      read: true
    },
    {
      id: '5',
      type: 'reminder',
      title: 'Upcoming telehealth session',
      message: 'Your BCBA session is scheduled for tomorrow at 2:00 PM. Tap to join.',
      timestamp: '2 days ago',
      read: true,
      actionUrl: '/telehealth'
    }
  ]);

  // Check if user has opted in to notifications
  useEffect(() => {
    const hasOptedIn = localStorage.getItem('notifications-opted-in');
    if (!hasOptedIn) {
      // Show opt-in modal after 5 seconds
      setTimeout(() => {
        setShowOptInModal(true);
      }, 5000);
    }
  }, []);

  const handleOptIn = () => {
    localStorage.setItem('notifications-opted-in', 'true');
    setShowOptInModal(false);
    toast.success('Notifications enabled! You\'ll get helpful reminders.');
    
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleOptOut = () => {
    setShowOptInModal(false);
    toast('You can enable notifications anytime in Settings.');
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  const handleEmailPreferenceChange = (key: keyof EmailPreferences) => {
    setEmailPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePushPreferenceChange = (key: keyof PushPreferences) => {
    setPushPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'morning-cue':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'evening-reflection':
        return <Moon className="w-5 h-5 text-indigo-500" />;
      case 'milestone':
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'tip':
        return <Sparkles className="w-5 h-5 text-accent" />;
      case 'reminder':
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <>
      {/* Bell Icon Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowBellFeed(true)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-accent text-white text-sm">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Feed Sheet */}
      <Sheet open={showBellFeed} onOpenChange={setShowBellFeed}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#E8E4DF]">
            <div className="flex items-center justify-between">
              <SheetTitle>Notifications</SheetTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowBellFeed(false);
                    setShowSettings(true);
                  }}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="overflow-y-auto h-[calc(100vh-80px)]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                <Bell className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-[#5A6B7A] mb-2">No notifications yet</p>
                <p className="text-sm text-[#5A6B7A]">
                  We'll send you helpful reminders and updates
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-[#FAF7F2] ${
                      !notification.read ? 'bg-accent/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className={`text-sm font-medium ${!notification.read ? 'text-[#1B2733]' : 'text-[#3A4A57]'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-accent rounded-full mt-1 ml-2"></div>
                          )}
                        </div>
                        <p className="text-sm text-[#5A6B7A] mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#5A6B7A]">{notification.timestamp}</span>
                          {notification.actionUrl && (
                            <Button size="sm" variant="outline" className="h-7 text-sm">
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Notification Preferences</SheetTitle>
          </SheetHeader>

          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 sm:space-y-6">
            {/* Push Notifications */}
            <div>
              <h3 className="font-medium text-[#1B2733] mb-4">Push Notifications</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1B2733]">Morning Cue</p>
                    <p className="text-sm text-[#5A6B7A]">Daily calm plan reminder (8:00 AM)</p>
                  </div>
                  <Switch
                    checked={pushPreferences.morningCue}
                    onCheckedChange={() => handlePushPreferenceChange('morningCue')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1B2733]">Evening Reflection</p>
                    <p className="text-sm text-[#5A6B7A]">Reflect on today's wins (8:00 PM)</p>
                  </div>
                  <Switch
                    checked={pushPreferences.eveningReflection}
                    onCheckedChange={() => handlePushPreferenceChange('eveningReflection')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1B2733]">Milestone Celebrations</p>
                    <p className="text-sm text-[#5A6B7A]">Celebrate streaks and achievements</p>
                  </div>
                  <Switch
                    checked={pushPreferences.milestones}
                    onCheckedChange={() => handlePushPreferenceChange('milestones')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1B2733]">Activity Reminders</p>
                    <p className="text-sm text-[#5A6B7A]">Upcoming sessions and tasks</p>
                  </div>
                  <Switch
                    checked={pushPreferences.reminders}
                    onCheckedChange={() => handlePushPreferenceChange('reminders')}
                  />
                </div>
              </div>
            </div>

            {/* Email Preferences */}
            <div className="pt-6 border-t border-[#E8E4DF]">
              <h3 className="font-medium text-[#1B2733] mb-4">Email Digest</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1B2733]">Weekly Calm Progress Summary</p>
                    <p className="text-sm text-[#5A6B7A]">Highlights, goals, and encouragement</p>
                  </div>
                  <Switch
                    checked={emailPreferences.weeklyDigest}
                    onCheckedChange={() => handleEmailPreferenceChange('weeklyDigest')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1B2733]">Daily ABA Tips</p>
                    <p className="text-sm text-[#5A6B7A]">Morning behavioral science lessons</p>
                  </div>
                  <Switch
                    checked={emailPreferences.dailyTips}
                    onCheckedChange={() => handleEmailPreferenceChange('dailyTips')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1B2733]">Milestone Updates</p>
                    <p className="text-sm text-[#5A6B7A]">Achievement notifications via email</p>
                  </div>
                  <Switch
                    checked={emailPreferences.milestones}
                    onCheckedChange={() => handleEmailPreferenceChange('milestones')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1B2733]">Community Updates</p>
                    <p className="text-sm text-[#5A6B7A]">Parent stories and new resources</p>
                  </div>
                  <Switch
                    checked={emailPreferences.communityUpdates}
                    onCheckedChange={() => handleEmailPreferenceChange('communityUpdates')}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={() => {
                setShowSettings(false);
                toast.success('Preferences saved!');
              }}
              className="w-full bg-accent hover:bg-accent/90"
            >
              Save Preferences
            </Button>

            {/* Unsubscribe */}
            <p className="text-sm text-center text-[#5A6B7A]">
              Want to unsubscribe from all emails?{' '}
              <button className="text-accent hover:underline">Click here</button>
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Opt-In Modal */}
      <Sheet open={showOptInModal} onOpenChange={setShowOptInModal}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-accent to-teal-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Bell className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-semibold text-[#1B2733] mb-2">
              Stay connected to your calm plan
            </h2>
            
            <p className="text-[#5A6B7A] mb-4 sm:mb-6 max-w-md mx-auto">
              Get gentle reminders, celebrate milestones, and stay on track with {userData.childName}'s progress.
            </p>

            <div className="space-y-3 mb-4 sm:mb-6 text-left max-w-sm mx-auto">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#1B2733]">Morning calm cues</p>
                  <p className="text-sm text-[#5A6B7A]">Start each day prepared</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#1B2733]">Milestone celebrations</p>
                  <p className="text-sm text-[#5A6B7A]">Never miss an achievement</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#1B2733]">Evening reflections</p>
                  <p className="text-sm text-[#5A6B7A]">Track progress daily</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleOptIn}
                size="lg"
                className="w-full bg-accent hover:bg-accent/90"
              >
                Enable Notifications
              </Button>
              <Button
                onClick={handleOptOut}
                size="lg"
                variant="outline"
                className="w-full"
              >
                Maybe Later
              </Button>
            </div>

            <p className="text-sm text-[#5A6B7A] mt-4">
              You can change these settings anytime in your account preferences.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// Weekly Email Digest Preview Component
export function WeeklyEmailDigestPreview({ 
  userData,
  weekHighlights,
  nextGoals
}: {
  userData: { parentName: string; childName: string };
  weekHighlights: string[];
  nextGoals: string[];
}) {
  return (
    <div className="max-w-2xl mx-auto bg-white border border-[#E8E4DF] rounded-lg overflow-hidden">
      {/* Email Header */}
      <div className="bg-gradient-to-r from-accent to-teal-500 p-8 text-center text-white">
        <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
          <Heart className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Weekly Calm Progress Summary</h1>
        <p className="text-teal-100">
          {userData.parentName}, here's how {userData.childName} did this week
        </p>
      </div>

      {/* Content */}
      <div className="p-8 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Section 1: Highlights */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733] mb-4">🌟 This Week's Highlights</h2>
          <ul className="space-y-2">
            {weekHighlights.map((highlight, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-[#3A4A57]">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 2: Next Goals */}
        <div className="bg-accent/5 rounded-lg p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733] mb-4">🎯 Next Week's Goals</h2>
          <ul className="space-y-2">
            {nextGoals.map((goal, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {idx + 1}
                </span>
                <span className="text-[#3A4A57]">{goal}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 3: Encouragement */}
        <div className="border-l-4 border-accent pl-4">
          <p className="text-[#3A4A57] leading-relaxed italic">
            "Progress isn't about perfection. Every small step — every calm transition, every successful routine — builds confidence and skills that last a lifetime. You're doing amazing work, {userData.parentName}. Keep going." 💙
          </p>
          <p className="text-sm text-[#5A6B7A] mt-2">— Your Aminy team</p>
        </div>

        {/* CTA */}
        <div className="text-center pt-6 border-t border-[#E8E4DF]">
          <Button className="bg-accent hover:bg-accent/90">
            View Full Progress Report
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#FAF7F2] p-6 text-center text-sm text-[#5A6B7A] border-t border-[#E8E4DF]">
        <p className="mb-2">Guided by AI. Grounded in ABA. Built for Family Life.</p>
        <p>
          <a href="#" className="text-accent hover:underline">Unsubscribe</a> • 
          <a href="#" className="text-accent hover:underline ml-2">Update Preferences</a> • 
          <a href="#" className="text-accent hover:underline ml-2">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
