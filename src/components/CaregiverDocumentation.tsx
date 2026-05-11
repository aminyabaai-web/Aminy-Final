// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Caregiver Documentation Component
 * For paid parent caregivers using fiscal intermediaries
 *
 * Features:
 * - Time tracking for waiver documentation
 * - Activity log export (PDF/CSV)
 * - Fiscal intermediary-compatible formats
 * - Integration notes for Acumen/PPL/GT Independence/CDCN
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Clock,
  Download,
  FileText,
  Calendar,
  Plus,
  ChevronRight,
  CheckCircle,
  Edit,
  Trash2,
  AlertCircle,
  Building2,
  Users,
  Play,
  Pause,
  RotateCcw,
  FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { useAuditedAction } from '../hooks/useAuditedAction';

interface TimeEntry {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  activity_type: string;
  description: string;
  client_name: string;
  verified: boolean;
}

interface CaregiverDocumentationProps {
  onBack?: () => void;
  clientName: string;
  fiscalIntermediary?: 'acumen' | 'ppl' | 'gt_independence' | 'cdcn' | 'other';
}

const ACTIVITY_TYPES = [
  { id: 'personal_care', label: 'Personal Care' },
  { id: 'respite', label: 'Respite Care' },
  { id: 'habilitation', label: 'Habilitation Services' },
  { id: 'community', label: 'Community Integration' },
  { id: 'skill_building', label: 'Skill Building' },
  { id: 'behavioral_support', label: 'Behavioral Support' },
  { id: 'transportation', label: 'Transportation' },
  { id: 'supervision', label: 'Supervision' },
  { id: 'other', label: 'Other' }
];

const FISCAL_INTERMEDIARIES = [
  { id: 'acumen', name: 'Acumen', website: 'https://acumenfiscalagent.com' },
  { id: 'ppl', name: 'PPL', website: 'https://www.pplfirst.com' },
  { id: 'gt_independence', name: 'GT Independence', website: 'https://www.gtindependence.com' },
  { id: 'cdcn', name: 'CDCN', website: 'https://cdcn.org' },
  { id: 'other', name: 'Other', website: '' }
];

export function CaregiverDocumentation({
  onBack,
  clientName,
  fiscalIntermediary = 'acumen'
}: CaregiverDocumentationProps) {
  useAuditedAction('session_notes');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [selectedDateRange, setSelectedDateRange] = useState<'week' | 'biweekly' | 'month'>('biweekly');
  const [selectedFI, setSelectedFI] = useState(fiscalIntermediary);

  // New entry form state
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    activity_type: 'personal_care',
    description: ''
  });

  useEffect(() => {
    loadEntries();
  }, [selectedDateRange]);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning && timerStart) {
      interval = setInterval(() => {
        setTimerElapsed(Math.floor((new Date().getTime() - timerStart.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerStart]);

  const loadEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = getStartDate(selectedDateRange);

      const { data, error } = await supabase
        .from('caregiver_time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (data && !error) {
        setEntries(data);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStartDate = (range: 'week' | 'biweekly' | 'month'): string => {
    const now = new Date();
    switch (range) {
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'biweekly':
        now.setDate(now.getDate() - 14);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
    }
    return now.toISOString().split('T')[0];
  };

  const handleStartTimer = () => {
    setTimerStart(new Date());
    setTimerRunning(true);
    setTimerElapsed(0);
    toast.success('Timer started');
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);
    toast.info('Timer paused');
  };

  const handleStopTimer = () => {
    if (!timerStart) return;

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - timerStart.getTime()) / 60000);

    setNewEntry({
      ...newEntry,
      date: timerStart.toISOString().split('T')[0],
      start_time: timerStart.toTimeString().slice(0, 5),
      end_time: endTime.toTimeString().slice(0, 5)
    });

    setShowAddEntry(true);
    setTimerRunning(false);
    setTimerStart(null);
    setTimerElapsed(0);
  };

  const handleSaveEntry = async () => {
    if (!newEntry.start_time || !newEntry.end_time) {
      toast.error('Please enter start and end times');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate duration
      const start = new Date(`2000-01-01T${newEntry.start_time}`);
      const end = new Date(`2000-01-01T${newEntry.end_time}`);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

      if (durationMinutes <= 0) {
        toast.error('End time must be after start time');
        return;
      }

      const { error } = await supabase
        .from('caregiver_time_entries')
        .insert({
          user_id: user.id,
          date: newEntry.date,
          start_time: newEntry.start_time,
          end_time: newEntry.end_time,
          duration_minutes: durationMinutes,
          activity_type: newEntry.activity_type,
          description: newEntry.description,
          client_name: clientName,
          verified: false
        });

      if (error) throw error;

      toast.success('Time entry saved');
      setShowAddEntry(false);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        activity_type: 'personal_care',
        description: ''
      });
      loadEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Could not save entry');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this time entry?')) return;

    try {
      const { error } = await supabase
        .from('caregiver_time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Entry deleted');
      loadEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Could not delete entry');
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTimerDisplay = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalHours = (): number => {
    return entries.reduce((sum, entry) => sum + entry.duration_minutes, 0) / 60;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Start Time', 'End Time', 'Duration (Hours)', 'Activity Type', 'Description', 'Client Name', 'Verified'];
    const rows = entries.map(e => [
      e.date,
      e.start_time,
      e.end_time,
      (e.duration_minutes / 60).toFixed(2),
      ACTIVITY_TYPES.find(a => a.id === e.activity_type)?.label || e.activity_type,
      e.description,
      e.client_name,
      e.verified ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caregiver-timesheet-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('CSV exported');
  };

  const generateEVVReport = () => {
    // Generate EVV-compatible format based on fiscal intermediary
    const report = {
      provider_name: 'Parent Caregiver',
      client_name: clientName,
      pay_period: `${getStartDate(selectedDateRange)} to ${new Date().toISOString().split('T')[0]}`,
      total_hours: getTotalHours().toFixed(2),
      entries: entries.map(e => ({
        date: e.date,
        start_time: e.start_time,
        end_time: e.end_time,
        service_code: mapActivityToServiceCode(e.activity_type),
        units: Math.ceil(e.duration_minutes / 15), // 15-minute units
        description: e.description
      })),
      generated_at: new Date().toISOString(),
      fiscal_intermediary: selectedFI
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evv-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('EVV report generated');
  };

  const mapActivityToServiceCode = (activityType: string): string => {
    const codes: Record<string, string> = {
      'personal_care': 'S5125',
      'respite': 'S5150',
      'habilitation': 'T2017',
      'community': 'T2038',
      'skill_building': 'T2021',
      'behavioral_support': 'H2019',
      'transportation': 'T2003',
      'supervision': 'S5135',
      'other': 'T1019'
    };
    return codes[activityType] || 'T1019';
  };

  const fiInfo = FISCAL_INTERMEDIARIES.find(fi => fi.id === selectedFI);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-slate-900">Caregiver Timesheet</h1>
              <p className="text-sm text-slate-500">For {clientName}</p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Building2 className="w-3 h-3" />
              {fiInfo?.name}
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Timer Card */}
        <Card className="p-6 bg-gradient-to-r from-accent/10 to-teal-50 border-accent/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Quick Timer
            </h2>
            <div className="text-3xl font-mono font-bold text-slate-900">
              {formatTimerDisplay(timerElapsed)}
            </div>
          </div>

          <div className="flex gap-3">
            {!timerRunning ? (
              <Button onClick={handleStartTimer} className="flex-1 gap-2 bg-accent hover:bg-accent/90">
                <Play className="w-4 h-4" />
                Start Timer
              </Button>
            ) : (
              <>
                <Button onClick={handlePauseTimer} variant="outline" className="flex-1 gap-2">
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
                <Button onClick={handleStopTimer} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4" />
                  Save Entry
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-accent">{getTotalHours().toFixed(1)}</p>
            <p className="text-sm text-slate-500">Total Hours</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{entries.length}</p>
            <p className="text-sm text-slate-500">Entries</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-600">
              {entries.filter(e => e.verified).length}
            </p>
            <p className="text-sm text-slate-500">Verified</p>
          </Card>
        </div>

        {/* Date Range & Export */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['week', 'biweekly', 'month'] as const).map((range) => (
              <Button
                key={range}
                variant={selectedDateRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDateRange(range)}
              >
                {range === 'week' && '7 Days'}
                {range === 'biweekly' && '14 Days'}
                {range === 'month' && '30 Days'}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1">
              <FileDown className="w-4 h-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={generateEVVReport} className="gap-1">
              <FileText className="w-4 h-4" />
              EVV Report
            </Button>
          </div>
        </div>

        {/* Add Entry Form */}
        {showAddEntry && (
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-slate-900 mb-4">Add Time Entry</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Activity Type</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={newEntry.activity_type}
                  onChange={(e) => setNewEntry({ ...newEntry, activity_type: e.target.value })}
                >
                  {ACTIVITY_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Start Time</label>
                <Input
                  type="time"
                  value={newEntry.start_time}
                  onChange={(e) => setNewEntry({ ...newEntry, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">End Time</label>
                <Input
                  type="time"
                  value={newEntry.end_time}
                  onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm text-slate-600 mb-1 block">Description</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg resize-none"
                rows={2}
                placeholder="Activities performed..."
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEntry} className="flex-1">Save Entry</Button>
              <Button variant="outline" onClick={() => setShowAddEntry(false)}>Cancel</Button>
            </div>
          </Card>
        )}

        {!showAddEntry && (
          <Button onClick={() => setShowAddEntry(true)} variant="outline" className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Manual Entry
          </Button>
        )}

        {/* Time Entries */}
        <div className="space-y-3">
          <h3 className="font-medium text-slate-900">Time Entries</h3>

          {entries.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">No entries for this period</p>
            </Card>
          ) : (
            entries.map((entry) => (
              <Card key={entry.id} className="p-3 sm:p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{entry.date}</span>
                      <Badge variant="secondary" className="text-xs">
                        {ACTIVITY_TYPES.find(a => a.id === entry.activity_type)?.label}
                      </Badge>
                      {entry.verified && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {entry.start_time} - {entry.end_time} ({formatDuration(entry.duration_minutes)})
                    </p>
                    {entry.description && (
                      <p className="text-sm text-slate-500 mt-1">{entry.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Fiscal Intermediary Info */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                Submitting to {fiInfo?.name}
              </h4>
              <p className="text-sm text-blue-700 mb-2">
                Export your timesheet in CSV format and submit through your fiscal intermediary's portal.
                EVV reports are formatted for electronic verification.
              </p>
              {fiInfo?.website && (
                <a
                  href={fiInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline"
                >
                  Visit {fiInfo.name} Portal
                </a>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CaregiverDocumentation;
