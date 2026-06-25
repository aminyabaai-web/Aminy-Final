// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Calendar, Video, Sparkles, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface Session {
  id: string;
  type: 'telehealth' | 'junior';
  title: string;
  date: Date;
  time: string;
  provider?: string;
}

interface UpcomingSessionsStripProps {
  sessions: Session[];
  onSessionClick?: (sessionId: string) => void;
  onViewAll?: () => void;
}

export function UpcomingSessionsStrip({
  sessions = [],
  onSessionClick,
  onViewAll 
}: UpcomingSessionsStripProps) {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Upcoming</h3>
        </div>
        {sessions.length > 2 && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-accent hover:text-accent/80 flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sessions.slice(0, 2).map((session) => (
          <Card
            key={session.id}
            onClick={() => onSessionClick?.(session.id)}
            className="p-3 cursor-pointer hover:border-accent/30 transition-colors border-[#E8E4DF]"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                session.type === 'telehealth' 
                  ? 'bg-[#EEF4F8]' 
                  : 'bg-purple-50'
              }`}>
                {session.type === 'telehealth' ? (
                  <Video className="w-5 h-5 text-blue-600" />
                ) : (
                  <Sparkles className="w-5 h-5 text-purple-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{session.title}</p>
                  <Badge 
                    variant="secondary" 
                    className={`text-sm ${
                      session.type === 'telehealth' 
                        ? 'bg-[#EEF4F8] text-blue-700' 
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    {session.type === 'telehealth' ? 'Video' : 'Jr'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatDate(session.date)}</span>
                  <span>•</span>
                  <span>{session.time}</span>
                  {session.provider && (
                    <>
                      <span>•</span>
                      <span>{session.provider}</span>
                    </>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
