// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * MedicationTracker.tsx
 *
 * Comprehensive medication tracking for parents to manage their child's medications.
 * Features:
 * - Add/edit/remove medications
 * - Track dosage schedules
 * - Log when medications are given
 * - Track side effects
 * - Refill reminders
 * - Share medication list with providers
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Pill,
  Plus,
  Clock,
  Calendar,
  Bell,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  RefreshCw,
  Share2,
  TrendingUp,
  TrendingDown,
  FileText,
  History,
  Loader2,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { isDemoMode } from '../lib/demo-seed';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[]; // e.g., ["08:00", "20:00"]
  prescriber?: string;
  pharmacy?: string;
  startDate: string;
  endDate?: string;
  refillDate?: string;
  pillCount?: number;
  notes?: string;
  sideEffects?: string[];
  isActive: boolean;
}

interface MedicationLog {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  actualTime?: string;
  status: 'taken' | 'missed' | 'skipped' | 'pending';
  notes?: string;
  sideEffectsReported?: string[];
  date: string;
}

interface MedicationTrackerProps {
  childId: string;
  childName: string;
  onClose?: () => void;
}

const TIME_ICONS: Record<string, any> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
};

const getTimeOfDay = (time: string): string => {
  const hour = parseInt(time.split(':')[0]);
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const COMMON_SIDE_EFFECTS = [
  'Drowsiness',
  'Appetite changes',
  'Sleep issues',
  'Mood changes',
  'Headache',
  'Nausea',
  'Irritability',
  'Hyperactivity',
  'Anxiety',
  'Fatigue',
];

export function MedicationTracker({ childId, childName, onClose }: MedicationTrackerProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'medications' | 'history'>('today');
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [showLogSideEffects, setShowLogSideEffects] = useState<string | null>(null);

  // Form state for adding/editing medication
  const [medicationForm, setMedicationForm] = useState<Partial<Medication>>({
    name: '',
    dosage: '',
    frequency: 'daily',
    times: ['08:00'],
    isActive: true,
  });

  // Load medications and logs
  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Try to load from Supabase
      const { data: medsData } = await supabase
        .from('medications')
        .select('*')
        .eq('child_id', childId)
        .eq('is_active', true);

      if (medsData && medsData.length > 0) {
        setMedications(medsData.map(m => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          times: m.times || [],
          prescriber: m.prescriber,
          pharmacy: m.pharmacy,
          startDate: m.start_date,
          endDate: m.end_date,
          refillDate: m.refill_date,
          pillCount: m.pill_count,
          notes: m.notes,
          sideEffects: m.side_effects,
          isActive: m.is_active,
        })));
      } else if (isDemoMode()) {
        // Sample medications — DEMO MODE ONLY. Never show fabricated prescriptions
        // (especially controlled substances) to a real user's child.
        setMedications([
          {
            id: '1',
            name: 'Methylphenidate',
            dosage: '10mg',
            frequency: 'daily',
            times: ['07:30', '12:00'],
            prescriber: 'Dr. Johnson',
            pharmacy: 'CVS Pharmacy',
            startDate: '2024-01-15',
            refillDate: '2024-02-15',
            pillCount: 45,
            notes: 'Take with food',
            sideEffects: ['Appetite changes'],
            isActive: true,
          },
          {
            id: '2',
            name: 'Melatonin',
            dosage: '3mg',
            frequency: 'daily',
            times: ['20:00'],
            startDate: '2024-01-01',
            notes: 'For sleep support',
            isActive: true,
          },
        ]);
      } else {
        // Real user with no medications on file — render the existing empty state.
        setMedications([]);
      }

      // Generate today's logs based on medications
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Try to load today's logs from Supabase
      const { data: logsData } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('child_id', childId)
        .eq('date', today);

      if (logsData && logsData.length > 0) {
        setTodaysLogs(logsData.map(l => ({
          id: l.id,
          medicationId: l.medication_id,
          medicationName: l.medication_name,
          scheduledTime: l.scheduled_time,
          actualTime: l.actual_time,
          status: l.status,
          notes: l.notes,
          sideEffectsReported: l.side_effects_reported,
          date: l.date,
        })));
      } else {
        // Build today's medication schedule. Use the user's REAL medications when
        // present; only fall back to the sample regimen in demo mode. A real user
        // with no meds gets no logs — never fabricate a controlled-substance schedule.
        const demoLogs: MedicationLog[] = [];
        const sourceMeds = medsData && medsData.length > 0
          ? medsData
          : (isDemoMode()
              ? [
                  { id: '1', name: 'Methylphenidate', times: ['07:30', '12:00'] },
                  { id: '2', name: 'Melatonin', times: ['20:00'] },
                ]
              : []);

        sourceMeds.forEach(med => {
          (med.times || []).forEach((time: string) => {
            const isPast = time < currentTime;
            demoLogs.push({
              id: `${med.id}-${time}`,
              medicationId: med.id,
              medicationName: med.name,
              scheduledTime: time,
              actualTime: isPast && time < '12:00' ? time : undefined,
              status: isPast && time < '12:00' ? 'taken' : isPast ? 'pending' : 'pending',
              date: today,
            });
          });
        });

        setTodaysLogs(demoLogs);
      }
    } catch (error) {
      console.error('[MedicationTracker] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogMedication = async (logId: string, status: 'taken' | 'skipped') => {
    const now = new Date();
    const actualTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setTodaysLogs(prev =>
      prev.map(log =>
        log.id === logId
          ? { ...log, status, actualTime: status === 'taken' ? actualTime : undefined }
          : log
      )
    );

    // Save to Supabase
    try {
      await supabase.from('medication_logs').upsert({
        id: logId,
        child_id: childId,
        medication_id: todaysLogs.find(l => l.id === logId)?.medicationId,
        medication_name: todaysLogs.find(l => l.id === logId)?.medicationName,
        scheduled_time: todaysLogs.find(l => l.id === logId)?.scheduledTime,
        actual_time: status === 'taken' ? actualTime : null,
        status,
        date: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('[MedicationTracker] Error saving log:', error);
    }
  };

  const handleSaveMedication = async () => {
    if (!medicationForm.name || !medicationForm.dosage) return;

    const newMed: Medication = {
      id: editingMedication?.id || `med-${Date.now()}`,
      name: medicationForm.name!,
      dosage: medicationForm.dosage!,
      frequency: medicationForm.frequency || 'daily',
      times: medicationForm.times || ['08:00'],
      prescriber: medicationForm.prescriber,
      pharmacy: medicationForm.pharmacy,
      startDate: medicationForm.startDate || new Date().toISOString().split('T')[0],
      endDate: medicationForm.endDate,
      refillDate: medicationForm.refillDate,
      pillCount: medicationForm.pillCount,
      notes: medicationForm.notes,
      sideEffects: medicationForm.sideEffects,
      isActive: true,
    };

    if (editingMedication) {
      setMedications(prev => prev.map(m => m.id === newMed.id ? newMed : m));
    } else {
      setMedications(prev => [...prev, newMed]);
    }

    // Save to Supabase
    try {
      await supabase.from('medications').upsert({
        id: newMed.id,
        child_id: childId,
        name: newMed.name,
        dosage: newMed.dosage,
        frequency: newMed.frequency,
        times: newMed.times,
        prescriber: newMed.prescriber,
        pharmacy: newMed.pharmacy,
        start_date: newMed.startDate,
        end_date: newMed.endDate,
        refill_date: newMed.refillDate,
        pill_count: newMed.pillCount,
        notes: newMed.notes,
        side_effects: newMed.sideEffects,
        is_active: true,
      });
    } catch (error) {
      console.error('[MedicationTracker] Error saving medication:', error);
    }

    setShowAddMedication(false);
    setEditingMedication(null);
    setMedicationForm({ name: '', dosage: '', frequency: 'daily', times: ['08:00'], isActive: true });
    loadData(); // Reload to get updated logs
  };

  const handleDeleteMedication = async (medId: string) => {
    setMedications(prev => prev.filter(m => m.id !== medId));

    try {
      await supabase.from('medications').update({ is_active: false }).eq('id', medId);
    } catch (error) {
      console.error('[MedicationTracker] Error deleting medication:', error);
    }
  };

  const handleLogSideEffect = async (logId: string, sideEffects: string[]) => {
    setTodaysLogs(prev =>
      prev.map(log =>
        log.id === logId
          ? { ...log, sideEffectsReported: sideEffects }
          : log
      )
    );

    try {
      await supabase.from('medication_logs').update({
        side_effects_reported: sideEffects,
      }).eq('id', logId);
    } catch (error) {
      console.error('[MedicationTracker] Error logging side effects:', error);
    }

    setShowLogSideEffects(null);
  };

  const addTimeSlot = () => {
    setMedicationForm(prev => ({
      ...prev,
      times: [...(prev.times || []), '12:00'],
    }));
  };

  const removeTimeSlot = (index: number) => {
    setMedicationForm(prev => ({
      ...prev,
      times: (prev.times || []).filter((_, i) => i !== index),
    }));
  };

  const updateTimeSlot = (index: number, value: string) => {
    setMedicationForm(prev => ({
      ...prev,
      times: (prev.times || []).map((t, i) => i === index ? value : t),
    }));
  };

  // Calculate stats
  const takenToday = todaysLogs.filter(l => l.status === 'taken').length;
  const totalToday = todaysLogs.length;
  const pendingNow = todaysLogs.filter(l => {
    if (l.status !== 'pending') return false;
    const now = new Date();
    const [hour, min] = l.scheduledTime.split(':').map(Number);
    const scheduledDate = new Date();
    scheduledDate.setHours(hour, min, 0, 0);
    return scheduledDate <= now;
  });

  const upcomingRefills = medications.filter(m => {
    if (!m.refillDate) return false;
    const refillDate = new Date(m.refillDate);
    const today = new Date();
    const daysUntil = Math.ceil((refillDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
  });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-label="Loading medications" role="status">
        {[0, 1, 2].map(i => (
          <Card key={i} className="p-4 animate-pulse" aria-hidden="true">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#132F43] dark:text-white flex items-center gap-2">
            <Pill className="w-6 h-6 text-[#6B9080]" />
            Medication Tracker
          </h2>
          <p className="text-[#5A6B7A] dark:text-slate-400 mt-1">
            Managing medications for {childName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close medication tracker">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#132F43] dark:text-white">
                {takenToday}/{totalToday}
              </p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Taken Today</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              pendingNow.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-neutral-100 dark:bg-slate-700'
            }`}>
              <Clock className={`w-5 h-5 ${pendingNow.length > 0 ? 'text-amber-600' : 'text-neutral-400'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#132F43] dark:text-white">{pendingNow.length}</p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Due Now</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#6B9080]/10 dark:bg-[#6B9080]/15 flex items-center justify-center">
              <Pill className="w-5 h-5 text-[#6B9080]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#132F43] dark:text-white">{medications.length}</p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Active Meds</p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 ${upcomingRefills.length > 0 ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              upcomingRefills.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-neutral-100 dark:bg-slate-700'
            }`}>
              <Bell className={`w-5 h-5 ${upcomingRefills.length > 0 ? 'text-amber-600' : 'text-neutral-400'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#132F43] dark:text-white">{upcomingRefills.length}</p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Refills Soon</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Due Now Alert */}
      {pendingNow.length > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-800 dark:text-amber-300">Medications Due</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                {pendingNow.map(l => l.medicationName).join(', ')} should have been taken by now.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200 dark:border-slate-700">
        {[
          { id: 'today', label: "Today's Schedule", icon: Calendar },
          { id: 'medications', label: 'Medications', icon: Pill },
          { id: 'history', label: 'History', icon: History },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#6B9080] text-[#6B9080]'
                : 'border-transparent text-[#5A6B7A] hover:text-neutral-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Today's Schedule */}
      {activeTab === 'today' && (
        <div className="space-y-3">
          {todaysLogs.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="font-medium text-[#132F43] dark:text-white mb-2">
                No medications scheduled
              </h3>
              <p className="text-[#5A6B7A] dark:text-slate-400 mb-4">
                Add medications to start tracking
              </p>
              <Button onClick={() => setShowAddMedication(true)} className="bg-primary hover:bg-[#216982]">
                <Plus className="w-4 h-4 mr-2" />
                Add Medication
              </Button>
            </Card>
          ) : (
            todaysLogs
              .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
              .map(log => {
                const TimeIcon = TIME_ICONS[getTimeOfDay(log.scheduledTime)];
                const isPast = (() => {
                  const now = new Date();
                  const [hour, min] = log.scheduledTime.split(':').map(Number);
                  const scheduled = new Date();
                  scheduled.setHours(hour, min, 0, 0);
                  return scheduled < now;
                })();

                return (
                  <Card
                    key={log.id}
                    className={`p-4 ${
                      log.status === 'taken'
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        : log.status === 'skipped'
                        ? 'bg-neutral-50 dark:bg-slate-800 border-neutral-200'
                        : isPast
                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          log.status === 'taken'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : log.status === 'skipped'
                            ? 'bg-neutral-200 dark:bg-slate-700'
                            : isPast
                            ? 'bg-amber-100 dark:bg-amber-900/30'
                            : 'bg-[#6B9080]/10 dark:bg-[#6B9080]/15'
                        }`}>
                          {log.status === 'taken' ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : log.status === 'skipped' ? (
                            <X className="w-6 h-6 text-neutral-400" />
                          ) : (
                            <TimeIcon className={`w-6 h-6 ${isPast ? 'text-amber-600' : 'text-[#6B9080]'}`} />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-[#132F43] dark:text-white">
                            {log.medicationName}
                          </h4>
                          <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                            {log.scheduledTime}
                            {log.status === 'taken' && log.actualTime && log.actualTime !== log.scheduledTime && (
                              <span className="ml-2 text-green-600">
                                (taken at {log.actualTime})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {log.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLogMedication(log.id, 'skipped')}
                          >
                            Skip
                          </Button>
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-[#216982]"
                            onClick={() => handleLogMedication(log.id, 'taken')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Taken
                          </Button>
                        </div>
                      ) : log.status === 'taken' ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowLogSideEffects(log.id)}
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Log Side Effects
                          </Button>
                          {log.sideEffectsReported && log.sideEffectsReported.length > 0 && (
                            <Badge className="bg-amber-100 text-amber-700">
                              {log.sideEffectsReported.length} effects logged
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge className="bg-neutral-200 text-neutral-600">Skipped</Badge>
                      )}
                    </div>
                  </Card>
                );
              })
          )}
        </div>
      )}

      {/* Medications List */}
      {activeTab === 'medications' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddMedication(true)} className="bg-primary hover:bg-[#216982]">
              <Plus className="w-4 h-4 mr-2" />
              Add Medication
            </Button>
          </div>

          {medications.length === 0 ? (
            <Card className="p-8 text-center">
              <Pill className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="font-medium text-[#132F43] dark:text-white mb-2">
                No medications added
              </h3>
              <p className="text-[#5A6B7A] dark:text-slate-400">
                Add your child's medications to start tracking
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {medications.map(med => (
                <Card key={med.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#6B9080]/10 dark:bg-[#6B9080]/15 flex items-center justify-center">
                        <Pill className="w-6 h-6 text-[#6B9080]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[#132F43] dark:text-white">
                          {med.name}
                        </h4>
                        <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                          {med.dosage} • {med.frequency}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {med.times.map((time, i) => (
                            <Badge key={i} className="bg-neutral-100 text-neutral-700 dark:bg-slate-700 dark:text-slate-300">
                              <Clock className="w-3 h-3 mr-1" />
                              {time}
                            </Badge>
                          ))}
                        </div>
                        {med.prescriber && (
                          <p className="text-sm text-neutral-400 mt-2">
                            Prescribed by {med.prescriber}
                          </p>
                        )}
                        {med.refillDate && (
                          <p className="text-sm text-amber-600 mt-1">
                            <Bell className="w-3 h-3 inline mr-1" />
                            Refill by {med.refillDate}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Edit ${med.name}`}
                        onClick={() => {
                          setEditingMedication(med);
                          setMedicationForm(med);
                          setShowAddMedication(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        aria-label={`Delete ${med.name}`}
                        onClick={() => handleDeleteMedication(med.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <Card className="p-6 text-center">
          <History className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <h3 className="font-medium text-[#132F43] dark:text-white mb-2">
            Medication History
          </h3>
          <p className="text-[#5A6B7A] dark:text-slate-400">
            Your medication logs build here as you track doses. Detailed adherence
            reports and provider sharing are coming soon.
          </p>
        </Card>
      )}

      {/* Add/Edit Medication Modal */}
      {showAddMedication && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#132F43] dark:text-white">
                  {editingMedication ? 'Edit Medication' : 'Add Medication'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddMedication(false);
                    setEditingMedication(null);
                    setMedicationForm({ name: '', dosage: '', frequency: 'daily', times: ['08:00'], isActive: true });
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                  Medication Name *
                </label>
                <Input
                  value={medicationForm.name}
                  onChange={(e) => setMedicationForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Methylphenidate"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Dosage *
                  </label>
                  <Input
                    value={medicationForm.dosage}
                    onChange={(e) => setMedicationForm(prev => ({ ...prev, dosage: e.target.value }))}
                    placeholder="e.g., 10mg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Frequency
                  </label>
                  <select
                    value={medicationForm.frequency}
                    onChange={(e) => setMedicationForm(prev => ({ ...prev, frequency: e.target.value }))}
                    className="w-full h-10 rounded-md border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="twice-daily">Twice Daily</option>
                    <option value="as-needed">As Needed</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                  Times
                </label>
                <div className="space-y-2">
                  {(medicationForm.times || []).map((time, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => updateTimeSlot(i, e.target.value)}
                        className="flex-1"
                      />
                      {(medicationForm.times || []).length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(i)}
                          className="text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addTimeSlot}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Time
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Prescriber
                  </label>
                  <Input
                    value={medicationForm.prescriber || ''}
                    onChange={(e) => setMedicationForm(prev => ({ ...prev, prescriber: e.target.value }))}
                    placeholder="Dr. Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Pharmacy
                  </label>
                  <Input
                    value={medicationForm.pharmacy || ''}
                    onChange={(e) => setMedicationForm(prev => ({ ...prev, pharmacy: e.target.value }))}
                    placeholder="CVS Pharmacy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={medicationForm.startDate || ''}
                    onChange={(e) => setMedicationForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                    Refill Date
                  </label>
                  <Input
                    type="date"
                    value={medicationForm.refillDate || ''}
                    onChange={(e) => setMedicationForm(prev => ({ ...prev, refillDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                  Notes
                </label>
                <Textarea
                  value={medicationForm.notes || ''}
                  onChange={(e) => setMedicationForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Take with food, avoid citrus, etc."
                  rows={2}
                />
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-slate-700 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddMedication(false);
                  setEditingMedication(null);
                  setMedicationForm({ name: '', dosage: '', frequency: 'daily', times: ['08:00'], isActive: true });
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-[#216982]"
                onClick={handleSaveMedication}
                disabled={!medicationForm.name || !medicationForm.dosage}
              >
                {editingMedication ? 'Save Changes' : 'Add Medication'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Log Side Effects Modal */}
      {showLogSideEffects && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#132F43] dark:text-white">
                  Log Side Effects
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowLogSideEffects(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-neutral-600 dark:text-slate-400 mb-4">
                Select any side effects observed after taking this medication:
              </p>
              <div className="flex flex-wrap gap-2">
                {COMMON_SIDE_EFFECTS.map(effect => {
                  const log = todaysLogs.find(l => l.id === showLogSideEffects);
                  const isSelected = log?.sideEffectsReported?.includes(effect);

                  return (
                    <button
                      key={effect}
                      onClick={() => {
                        const current = log?.sideEffectsReported || [];
                        const updated = isSelected
                          ? current.filter(e => e !== effect)
                          : [...current, effect];
                        handleLogSideEffect(showLogSideEffects, updated);
                        // Keep modal open to allow multiple selections
                        setTodaysLogs(prev =>
                          prev.map(l =>
                            l.id === showLogSideEffects
                              ? { ...l, sideEffectsReported: updated }
                              : l
                          )
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-white'
                          : 'bg-neutral-100 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200'
                      }`}
                    >
                      {effect}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-slate-700">
              <Button
                className="w-full bg-primary hover:bg-[#216982]"
                onClick={() => setShowLogSideEffects(null)}
              >
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default MedicationTracker;
