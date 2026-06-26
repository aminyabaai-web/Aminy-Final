// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Clock, User, FileText, MessageSquare, Calendar, Check, Plus, X } from 'lucide-react';
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
  const [showLogForm, setShowLogForm] = useState(false);
  const [logText, setLogText] = useState('');
  const [localLogs, setLocalLogs] = useState<Activity[]>([]);

  const handleAddLog = () => {
    if (!logText.trim()) return;
    const newEntry: Activity = {
      id: `local-${Date.now()}`,
      type: 'note',
      title: 'Behavior noted',
      description: logText.trim(),
      timestamp: new Date(),
      user: 'You',
    };
    setLocalLogs(prev => [newEntry, ...prev]);
    setLogText('');
    setShowLogForm(false);
  };

  // Real data via props takes precedence. With no data source wired, fall back
  // to in-memory sample data in demo mode so the screen isn't permanently empty
  // for investor walk-throughs; real users still get the honest empty state.
  const sourceActivities = [...localLogs, ...(activities.length > 0 ? activities : (isDemoMode() ? demoActivities() : []))];
  const displayedActivities = sourceActivities.slice(0, maxItems);
  const showSampleBanner = activities.length === 0 && localLogs.length === 0 && isDemoMode();

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
        return 'text-blue-600 bg-[#EEF4F8]';
      case 'note':
        return 'text-green-600 bg-green-50';
      case 'message':
        return 'text-purple-600 bg-purple-50';
      case 'goal':
        return 'text-amber-600 bg-amber-50';
      case 'plan':
        return 'text-[#2A7D99] bg-[#2A7D99]/10';
      default:
        return 'text-[#5A6B7A] bg-[#FAF7F2]';
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
        <div className="flex items-center gap-2">
          {showSampleBanner && (
            <span
              className="flex-shrink-0 inline-flex items-center rounded-full bg-amber-50 text-amber-700 font-medium"
              style={{ fontSize: '10px', paddingTop: '2px', paddingBottom: '2px', paddingLeft: '8px', paddingRight: '8px' }}
            >
              Sample data
            </span>
          )}
          <button
            onClick={() => setShowLogForm(v => !v)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-[#376E80] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Log behavior
          </button>
        </div>
      </div>

      {showLogForm && (
        <div className="mb-4 p-3 rounded-xl border border-[#E8E4DF] dark:border-slate-600 bg-[#FAF7F2] dark:bg-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#1B2733] dark:text-slate-200">Describe the behavior</p>
            <button onClick={() => { setShowLogForm(false); setLogText(''); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={logText}
            onChange={e => setLogText(e.target.value)}
            placeholder="What happened? When, where, what triggered it…"
            className="w-full text-sm rounded-lg border border-[#E8E4DF] dark:border-slate-600 p-2 bg-white dark:bg-slate-700 text-[#1B2733] dark:text-slate-100 resize-none"
            rows={3}
          />
          <button
            onClick={handleAddLog}
            disabled={!logText.trim()}
            className="w-full py-2 rounded-lg bg-[#2A7D99] disabled:opacity-40 text-white text-sm font-semibold transition-colors hover:bg-[#376E80]"
          >
            Save
          </button>
        </div>
      )}
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
                  <p className="text-sm text-muted-foreground">{activity.user}</p>
                  <span className="text-sm text-muted-foreground">•</span>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {displayedActivities.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto mb-3 text-[#8A9BA8]" />
            <p className="text-sm text-muted-foreground">No incidents logged yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap "Log behavior" to record an incident.
            </p>
          </div>
        )}
      </div>
    </Card>
    </div>
  );
}
