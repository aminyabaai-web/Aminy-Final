// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Calendar, Mail, MessageSquare } from 'lucide-react';

export function TelehealthScheduling() {
  const [sessionType, setSessionType] = useState('');
  const [datetime, setDatetime] = useState('');
  const [reason, setReason] = useState('');
  const [reminders, setReminders] = useState({
    ics: true,
    email: true,
    sms: true
  });

  const handleSchedule = () => {
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <h3 className="text-lg font-semibold">Schedule Telehealth Session</h3>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <Label>Session Type</Label>
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">Select session type...</option>
            <option value="rbt-30">RBT Check-in (30min)</option>
            <option value="bcba-15">BCBA Consultation (15min)</option>
            <option value="bcba-50">BCBA Deep Dive (50min)</option>
          </select>
        </div>

        <div>
          <Label>Preferred Date & Time</Label>
          <Input 
            type="datetime-local" 
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
        </div>

        <div>
          <Label>Reason for Session</Label>
          <Textarea 
            rows={3}
            placeholder="Brief description of what you'd like to discuss..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      {/* Reminders */}
      <div className="space-y-3">
        <Label>Send reminders via:</Label>
        
        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={reminders.ics} 
            onChange={(e) => setReminders({...reminders, ics: e.target.checked})}
            className="rounded"
          />
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Add to Calendar (ICS)</span>
        </label>

        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={reminders.email} 
            onChange={(e) => setReminders({...reminders, email: e.target.checked})}
            className="rounded"
          />
          <Mail className="w-4 h-4" />
          <span className="text-sm">Email Reminder</span>
        </label>

        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={reminders.sms} 
            onChange={(e) => setReminders({...reminders, sms: e.target.checked})}
            className="rounded"
          />
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">SMS Reminder</span>
        </label>
      </div>

      <Button className="w-full" size="lg" onClick={handleSchedule}>
        Schedule Session
      </Button>
    </div>
  );
}
