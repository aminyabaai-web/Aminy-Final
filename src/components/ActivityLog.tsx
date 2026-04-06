// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Clock, User, FileText, MessageSquare, Calendar, Check } from 'lucide-react';
import { Card } from './ui/card';

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

export function ActivityLog({ activities = [], maxItems = 10, onBack }: ActivityLogProps) {
  const displayedActivities = activities.slice(0, maxItems);

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
        return 'text-teal-600 bg-teal-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div>
      {onBack && (
        <div className="flex items-center gap-2 p-4 border-b">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
          <h1 className="text-xl font-semibold">Activity Log</h1>
        </div>
      )}
    <Card className="p-3 sm:p-4 m-4">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
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

        {activities.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        )}
      </div>
    </Card>
    </div>
  );
}
