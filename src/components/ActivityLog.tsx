// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Clock, User, FileText, MessageSquare, Calendar, Check } from 'lucide-react';
import { Card } from './ui/card';
import { ScreenHeader } from './ui/ScreenHeader';
import { isDemoMode } from '../lib/demo-seed';

interface Activity {
  id: string;
  type: 'session' | 'note' | 'message' | 'goal' | 'plan';
  title: string;
  description: string;
  timestamp: Date;
  user: string;
}

interface ActivityLogProps {
  activities?: Activity[];
  maxItems?: number;
  onBack?: () => void;
}

// In-memory sample timeline shown ONLY in demo mode (?demo=...). Never written
// to the DB; real users see real `activities` or the honest empty state below.
function demoActivities(): Activity[] {
  const now = Date.now();
  return [
    { id: 'demo-act-1', type: 'session', title: 'ABA session completed', description: 'Focus on transitions — 4 of 5 targets met', timestamp: new Date(now - 35 * 60_000), user: 'Dr. Sarah Lee, BCBA-D' },
    { id: 'demo-act-2', type: 'goal', title: 'Goal updated', description: 'Functional communication moved to "mastered"', timestamp: new Date(now - 3 * 3600_000), user: 'Dr. Sarah Lee, BCBA-D' },
    { id: 'demo-act-3', type: 'note', title: 'Caregiver note added', description: 'Bedtime routine went smoothly two nights in a row', timestamp: new Date(now - 22 * 3600_000), user: 'You' },
    { id: 'demo-act-4', type: 'message', title: 'Message from your BCBA', description: 'Great progress this week — let’s review at our next check-in', timestamp: new Date(now - 2 * 86_400_000), user: 'Priya Patel, BCBA' },
    { id: 'demo-act-5', type: 'plan', title: 'Care plan reviewed', description: 'Quarterly plan reviewed and re-authorized', timestamp: new Date(now - 5 * 86_400_000), user: 'Marcus Johnson, BCBA' },
  ];
}

export function ActivityLog({ activities = [], maxItems = 10, onBack }: ActivityLogProps) {
  // Real data via props takes precedence. With no data source wired, fall back
  // to in-memory sample data in demo mode so the screen isn't permanently empty
  // for investor walk-throughs; real users still get the honest empty state.
  const sourceActivities = activities.length > 0 ? activities : (isDemoMode() ? demoActivities() : []);
  const displayedActivities = sourceActivities.slice(0, maxItems);
  const showSampleBanner = activities.length === 0 && isDemoMode();

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'session':
        return Calendar;
      case 'note':
        return FileText;
      case 'message':
        return MessageSquare;
      case 'goal':
        return Check;
      case 'plan':
        return User;
      default:
        return Clock;
    }
  };

  const getColor = (type: Activity['type']) => {
    switch (type) {
      case 'session':
        return 'text-blue-600 bg-blue-50';
      case 'note':
        return 'text-green-600 bg-green-50';
      case 'message':
        return 'text-purple-600 bg-purple-50';
      case 'goal':
        return 'text-amber-600 bg-amber-50';
      case 'plan':
        return 'text-[#6B9080] bg-[#6B9080]/10';
      default:
        return 'text-gray-600 bg-[#FAF7F2]';
    }
  };

  const formatTime = (date: Date) => {
    const ts = date instanceof Date ? date.getTime() : new Date(date).getTime();
    if (isNaN(ts)) return '';
    const now = new Date();
    const diff = now.getTime() - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div>
      {onBack && (
        <ScreenHeader title="Incident Log" onBack={onBack} />
      )}
    <Card className="p-3 sm:p-4 m-4">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="font-semibold">Recent Incidents</h3>
        {showSampleBanner && (
          <span
            className="flex-shrink-0 inline-flex items-center rounded-full bg-amber-50 text-amber-700 font-medium"
            style={{ fontSize: '10px', paddingTop: '2px', paddingBottom: '2px', paddingLeft: '8px', paddingRight: '8px' }}
          >
            Sample data
          </span>
        )}
      </div>
      <div className="space-y-3 sm:space-y-4">
        {displayedActivities.map((activity) => {
          const Icon = getIcon(activity.type);
          const colorClass = getColor(activity.type);

          return (
            <div key={activity.id} className="flex gap-3">
              <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{activity.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">{activity.user}</p>
                  <span className="text-xs text-muted-foreground">•</span>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {displayedActivities.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-muted-foreground">No recent incidents</p>
            <p className="text-xs text-muted-foreground mt-1">
              Incidents logged during sessions and check-ins will appear here.
            </p>
          </div>
        )}
      </div>
    </Card>
    </div>
  );
}
