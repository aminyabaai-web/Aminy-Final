// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ABCDataCollection.tsx
 *
 * Professional ABC (Antecedent-Behavior-Consequence) data collection for BCBAs and parents.
 * Enables structured behavior tracking with quick-select options and detailed notes.
 *
 * Features:
 * - Quick-select categories for common antecedents, behaviors, consequences
 * - Duration and intensity tracking
 * - Setting context (home, school, community, therapy)
 * - Historical view with behavior frequency graphs
 * - Export to CSV/PDF for insurance documentation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Plus,
  Clock,
  MapPin,
  Zap,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Loader2,
  BarChart3,
  ArrowLeft,
  Info
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuditedAction } from '../hooks/useAuditedAction';

// Types
interface ABCEntry {
  id: string;
  userId: string;
  childId: string;
  occurredAt: string;
  antecedent: string;
  antecedentCategory: AntecedentCategory;
  behavior: string;
  behaviorCategory: BehaviorCategory;
  consequence: string;
  consequenceCategory: ConsequenceCategory;
  setting: SettingType;
  durationSeconds?: number;
  intensity: IntensityLevel;
  notes?: string;
  loggedByProviderId?: string;
  createdAt: string;
}

type AntecedentCategory = 'demand' | 'transition' | 'denied_access' | 'sensory' | 'social' | 'attention' | 'unexpected' | 'other';
type BehaviorCategory = 'aggression' | 'self_injury' | 'elopement' | 'property_destruction' | 'tantrum' | 'noncompliance' | 'verbal_outburst' | 'stimming' | 'other';
type ConsequenceCategory = 'attention' | 'escape' | 'access_tangible' | 'sensory' | 'natural' | 'planned_ignore' | 'redirect' | 'other';
type SettingType = 'home' | 'school' | 'community' | 'therapy' | 'other';
type IntensityLevel = 'low' | 'medium' | 'high';

interface ABCDataCollectionProps {
  userId: string;
  childId: string;
  childName: string;
  onBack?: () => void;
  isProvider?: boolean;
  providerId?: string;
}

// Quick-select options
const ANTECEDENT_OPTIONS: { value: AntecedentCategory; label: string; examples: string }[] = [
  { value: 'demand', label: 'Demand/Request', examples: 'Asked to do task, given instruction' },
  { value: 'transition', label: 'Transition', examples: 'Changing activity, leaving somewhere' },
  { value: 'denied_access', label: 'Denied Access', examples: 'Told no, item taken away' },
  { value: 'sensory', label: 'Sensory', examples: 'Loud noise, texture, bright light' },
  { value: 'social', label: 'Social', examples: 'Peer interaction, sharing required' },
  { value: 'attention', label: 'Low Attention', examples: 'Parent busy, waiting for attention' },
  { value: 'unexpected', label: 'Unexpected', examples: 'Change in routine, surprise' },
  { value: 'other', label: 'Other', examples: 'Describe in notes' },
];

const BEHAVIOR_OPTIONS: { value: BehaviorCategory; label: string; color: string }[] = [
  { value: 'tantrum', label: 'Tantrum/Crying', color: 'bg-amber-100 text-amber-700' },
  { value: 'aggression', label: 'Aggression', color: 'bg-red-100 text-red-700' },
  { value: 'self_injury', label: 'Self-Injury', color: 'bg-red-100 text-red-700' },
  { value: 'elopement', label: 'Elopement/Running', color: 'bg-orange-100 text-orange-700' },
  { value: 'property_destruction', label: 'Property Destruction', color: 'bg-orange-100 text-orange-700' },
  { value: 'noncompliance', label: 'Noncompliance', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'verbal_outburst', label: 'Verbal Outburst', color: 'bg-amber-100 text-amber-700' },
  { value: 'stimming', label: 'Stimming/Repetitive', color: 'bg-blue-100 text-blue-700' },
  { value: 'other', label: 'Other', color: 'bg-neutral-100 text-neutral-700' },
];

const CONSEQUENCE_OPTIONS: { value: ConsequenceCategory; label: string; examples: string }[] = [
  { value: 'attention', label: 'Attention Given', examples: 'Talked to, looked at, held' },
  { value: 'escape', label: 'Escape/Avoidance', examples: 'Task removed, got out of activity' },
  { value: 'access_tangible', label: 'Got Item/Activity', examples: 'Given toy, snack, screen time' },
  { value: 'sensory', label: 'Sensory Input', examples: 'Self-stimulation continued' },
  { value: 'natural', label: 'Natural Consequence', examples: 'Item broke, got hurt' },
  { value: 'planned_ignore', label: 'Planned Ignore', examples: 'No reaction given' },
  { value: 'redirect', label: 'Redirected', examples: 'Given alternative, prompted to use words' },
  { value: 'other', label: 'Other', examples: 'Describe in notes' },
];

const SETTING_OPTIONS: { value: SettingType; label: string; icon: string }[] = [
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'school', label: 'School', icon: '🏫' },
  { value: 'community', label: 'Community', icon: '🏪' },
  { value: 'therapy', label: 'Therapy', icon: '🏥' },
  { value: 'other', label: 'Other', icon: '📍' },
];

export function ABCDataCollection({
  userId,
  childId,
  childName,
  onBack,
  isProvider = false,
  providerId
}: ABCDataCollectionProps) {
  useAuditedAction('observation');
  // State
  const [entries, setEntries] = useState<ABCEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'stats'>('list');
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | 'all'>('7d');

  // Form state
  const [formData, setFormData] = useState({
    occurredAt: new Date().toISOString().slice(0, 16),
    antecedent: '',
    antecedentCategory: 'other' as AntecedentCategory,
    behavior: '',
    behaviorCategory: 'other' as BehaviorCategory,
    consequence: '',
    consequenceCategory: 'other' as ConsequenceCategory,
    setting: 'home' as SettingType,
    durationSeconds: undefined as number | undefined,
    intensity: 'medium' as IntensityLevel,
    notes: '',
  });

  // Load entries
  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      let startDate: Date | null = null;
      const now = new Date();

      if (dateFilter === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      let query = supabase
        .from('abc_entries')
        .select('*')
        .eq('child_id', childId)
        .order('occurred_at', { ascending: false });

      if (startDate) {
        query = query.gte('occurred_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: ABCEntry[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        childId: row.child_id,
        occurredAt: row.occurred_at,
        antecedent: row.antecedent,
        antecedentCategory: row.antecedent_category,
        behavior: row.behavior,
        behaviorCategory: row.behavior_category,
        consequence: row.consequence,
        consequenceCategory: row.consequence_category,
        setting: row.setting,
        durationSeconds: row.duration_seconds,
        intensity: row.intensity,
        notes: row.notes,
        loggedByProviderId: row.logged_by_provider_id,
        createdAt: row.created_at,
      }));

      setEntries(mapped);
    } catch (err) {
      console.error('[ABC] Error loading entries:', err);
    } finally {
      setIsLoading(false);
    }
  }, [childId, dateFilter]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Save entry
  const handleSave = async () => {
    if (!formData.behavior || !formData.antecedent || !formData.consequence) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('abc_entries').insert({
        user_id: userId,
        child_id: childId,
        occurred_at: formData.occurredAt,
        antecedent: formData.antecedent,
        antecedent_category: formData.antecedentCategory,
        behavior: formData.behavior,
        behavior_category: formData.behaviorCategory,
        consequence: formData.consequence,
        consequence_category: formData.consequenceCategory,
        setting: formData.setting,
        duration_seconds: formData.durationSeconds,
        intensity: formData.intensity,
        notes: formData.notes || null,
        logged_by_provider_id: isProvider ? providerId : null,
      });

      if (error) throw error;

      // Reset form
      setFormData({
        occurredAt: new Date().toISOString().slice(0, 16),
        antecedent: '',
        antecedentCategory: 'other',
        behavior: '',
        behaviorCategory: 'other',
        consequence: '',
        consequenceCategory: 'other',
        setting: 'home',
        durationSeconds: undefined,
        intensity: 'medium',
        notes: '',
      });
      setShowForm(false);
      loadEntries();
    } catch (err) {
      console.error('[ABC] Error saving entry:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete entry
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('abc_entries').delete().eq('id', id);
      if (error) throw error;
      setEntries(entries.filter(e => e.id !== id));
    } catch (err) {
      console.error('[ABC] Error deleting entry:', err);
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date', 'Time', 'Antecedent', 'Behavior', 'Consequence', 'Setting', 'Duration', 'Intensity', 'Notes'];
    const rows = entries.map(e => {
      const date = new Date(e.occurredAt);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        `${e.antecedentCategory}: ${e.antecedent}`,
        `${e.behaviorCategory}: ${e.behavior}`,
        `${e.consequenceCategory}: ${e.consequence}`,
        e.setting,
        e.durationSeconds ? `${e.durationSeconds}s` : '',
        e.intensity,
        e.notes || ''
      ].map(v => `"${v}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abc-data-${childName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate stats
  const stats = React.useMemo(() => {
    const behaviorCounts: Record<string, number> = {};
    const antecedentCounts: Record<string, number> = {};
    const consequenceCounts: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const byHour: Record<number, number> = {};

    // Trend data - incidents per day for visualization
    const trendData: { date: string; count: number; behaviors: Record<string, number> }[] = [];
    const dateCountMap: Record<string, { count: number; behaviors: Record<string, number> }> = {};

    entries.forEach(e => {
      // Behavior counts
      behaviorCounts[e.behaviorCategory] = (behaviorCounts[e.behaviorCategory] || 0) + 1;
      antecedentCounts[e.antecedentCategory] = (antecedentCounts[e.antecedentCategory] || 0) + 1;
      consequenceCounts[e.consequenceCategory] = (consequenceCounts[e.consequenceCategory] || 0) + 1;

      // By day
      const day = new Date(e.occurredAt).toLocaleDateString('en-US', { weekday: 'short' });
      byDay[day] = (byDay[day] || 0) + 1;

      // By hour
      const hour = new Date(e.occurredAt).getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;

      // Trend data by date
      const dateKey = new Date(e.occurredAt).toISOString().split('T')[0];
      if (!dateCountMap[dateKey]) {
        dateCountMap[dateKey] = { count: 0, behaviors: {} };
      }
      dateCountMap[dateKey].count++;
      dateCountMap[dateKey].behaviors[e.behaviorCategory] = (dateCountMap[dateKey].behaviors[e.behaviorCategory] || 0) + 1;
    });

    // Convert to sorted array for trend chart
    const sortedDates = Object.keys(dateCountMap).sort();
    sortedDates.forEach(date => {
      trendData.push({
        date,
        count: dateCountMap[date].count,
        behaviors: dateCountMap[date].behaviors
      });
    });

    const topBehaviors = Object.entries(behaviorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topAntecedents = Object.entries(antecedentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const likelyFunction = Object.entries(consequenceCounts)
      .sort((a, b) => b[1] - a[1])[0];

    // Calculate trend direction (improving/declining/stable)
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (trendData.length >= 3) {
      const recent = trendData.slice(-3).reduce((sum, d) => sum + d.count, 0) / 3;
      const earlier = trendData.slice(0, 3).reduce((sum, d) => sum + d.count, 0) / 3;
      if (recent < earlier * 0.8) trendDirection = 'improving';
      else if (recent > earlier * 1.2) trendDirection = 'declining';
    }

    return { behaviorCounts, antecedentCounts, consequenceCounts, byDay, byHour, topBehaviors, topAntecedents, likelyFunction, trendData, trendDirection };
  }, [entries]);

  const getBehaviorColor = (category: BehaviorCategory) => {
    return BEHAVIOR_OPTIONS.find(b => b.value === category)?.color || 'bg-neutral-100 text-neutral-700';
  };

  const getIntensityColor = (intensity: IntensityLevel) => {
    switch (intensity) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'high': return 'bg-red-100 text-red-700';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading ABC data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button onClick={onBack} className="p-2 hover:bg-neutral-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-neutral-600" />
                </button>
              )}
              <div>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">ABC Data Collection</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{childName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Log Incident
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Clinical Disclaimer */}
      <div className="max-w-4xl mx-auto px-4 pt-3">
        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800">
            For educational tracking only. Clinical behavior analysis requires oversight by a licensed BCBA.
          </span>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white dark:bg-slate-900 border-b border-neutral-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  view === 'list' ? 'bg-teal-100 text-teal-700' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-1.5" />
                Entries
              </button>
              <button
                onClick={() => setView('stats')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  view === 'stats' ? 'bg-teal-100 text-teal-700' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-1.5" />
                Analysis
              </button>
            </div>

            <div className="flex items-center gap-2">
              {(['7d', '30d', 'all'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateFilter(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    dateFilter === range
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {view === 'list' ? (
          <div className="space-y-3 sm:space-y-4">
            {entries.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No entries yet</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                  Start logging incidents to track behavior patterns
                </p>
                <Button onClick={() => setShowForm(true)} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Log First Incident
                </Button>
              </Card>
            ) : (
              entries.map(entry => (
                <Card
                  key={entry.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getBehaviorColor(entry.behaviorCategory)}>
                          {BEHAVIOR_OPTIONS.find(b => b.value === entry.behaviorCategory)?.label || entry.behaviorCategory}
                        </Badge>
                        <Badge className={getIntensityColor(entry.intensity)}>
                          {entry.intensity}
                        </Badge>
                        <Badge className="bg-neutral-100 text-neutral-600">
                          {SETTING_OPTIONS.find(s => s.value === entry.setting)?.icon} {entry.setting}
                        </Badge>
                      </div>
                      <p className="font-medium text-neutral-900 dark:text-white line-clamp-1">
                        {entry.behavior}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        <Clock className="w-3.5 h-3.5 inline mr-1" />
                        {new Date(entry.occurredAt).toLocaleString()}
                        {entry.durationSeconds && (
                          <span className="ml-2">
                            Duration: {entry.durationSeconds}s
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this entry?')) handleDelete(entry.id);
                        }}
                        className="p-2 text-neutral-400 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {expandedEntry === entry.id ? (
                        <ChevronUp className="w-5 h-5 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>
                  </div>

                  {expandedEntry === entry.id && (
                    <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-slate-800 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">Antecedent</p>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300">
                            <Badge className="mr-2 text-xs bg-blue-50 text-blue-600">
                              {ANTECEDENT_OPTIONS.find(a => a.value === entry.antecedentCategory)?.label}
                            </Badge>
                            {entry.antecedent}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">Behavior</p>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300">{entry.behavior}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">Consequence</p>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300">
                            <Badge className="mr-2 text-xs bg-purple-50 text-purple-600">
                              {CONSEQUENCE_OPTIONS.find(c => c.value === entry.consequenceCategory)?.label}
                            </Badge>
                            {entry.consequence}
                          </p>
                        </div>
                      </div>
                      {entry.notes && (
                        <div>
                          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-1">Notes</p>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        ) : (
          // Stats View
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card className="p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">{entries.length}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Incidents</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                  {(entries.length / (dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 1)).toFixed(1)}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Per Day Avg</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-amber-600">
                  {entries.filter(e => e.intensity === 'high').length}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">High Intensity</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-teal-600">
                  {stats.likelyFunction ? CONSEQUENCE_OPTIONS.find(c => c.value === stats.likelyFunction[0])?.label : 'N/A'}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Likely Function</p>
              </Card>
            </div>

            {/* Trend Chart - Behavior Frequency Over Time */}
            {stats.trendData.length > 0 && (
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">Behavior Trend</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Incidents per day over time</p>
                  </div>
                  <Badge className={
                    stats.trendDirection === 'improving' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    stats.trendDirection === 'declining' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-neutral-100 text-neutral-600 dark:bg-slate-800 dark:text-neutral-400'
                  }>
                    {stats.trendDirection === 'improving' && '↓ Improving'}
                    {stats.trendDirection === 'declining' && '↑ Increasing'}
                    {stats.trendDirection === 'stable' && '→ Stable'}
                  </Badge>
                </div>

                {/* Simple bar chart visualization */}
                <div className="flex items-end gap-1 h-32 border-b border-l border-neutral-200 dark:border-slate-700 pl-2 pb-2">
                  {stats.trendData.slice(-14).map((day, idx) => {
                    const maxCount = Math.max(...stats.trendData.slice(-14).map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    const dateObj = new Date(day.date);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative">
                        <div
                          className="w-full bg-gradient-to-t from-teal-500 to-teal-400 dark:from-teal-600 dark:to-teal-500 rounded-t transition-all hover:from-teal-600 hover:to-teal-500"
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={`${day.count} incidents on ${dateObj.toLocaleDateString()}`}
                        />
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {day.count} incidents
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                  {stats.trendData.length > 0 && (
                    <>
                      <span>{new Date(stats.trendData[Math.max(0, stats.trendData.length - 14)].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>{new Date(stats.trendData[stats.trendData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Time of Day Distribution */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Time of Day Distribution</h3>
              <div className="flex items-end gap-0.5 h-24">
                {Array.from({ length: 24 }, (_, hour) => {
                  const count = stats.byHour[hour] || 0;
                  const maxCount = Math.max(...Object.values(stats.byHour), 1);
                  const height = (count / maxCount) * 100;
                  const timeLabel = hour === 0 ? '12am' : hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`;
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center group relative">
                      <div
                        className="w-full bg-blue-400 dark:bg-blue-500 rounded-t transition-all hover:bg-blue-500 dark:hover:bg-blue-400"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {timeLabel}: {count} incidents
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
                <span>11pm</span>
              </div>
            </Card>

            {/* Top Behaviors */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Most Common Behaviors</h3>
              <div className="space-y-3">
                {stats.topBehaviors.map(([behavior, count], i) => (
                  <div key={behavior} className="flex items-center gap-3">
                    <span className="text-sm text-neutral-400 w-6">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={getBehaviorColor(behavior as BehaviorCategory)}>
                          {BEHAVIOR_OPTIONS.find(b => b.value === behavior)?.label || behavior}
                        </Badge>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{count} ({Math.round((count / entries.length) * 100)}%)</span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${(count / entries.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Antecedents */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Most Common Triggers</h3>
              <div className="space-y-3">
                {stats.topAntecedents.map(([antecedent, count], i) => (
                  <div key={antecedent} className="flex items-center gap-3">
                    <span className="text-sm text-neutral-400 w-6">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-neutral-700">
                          {ANTECEDENT_OPTIONS.find(a => a.value === antecedent)?.label || antecedent}
                        </span>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{count}</span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(count / entries.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Function Analysis */}
            <Card className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-violet-200 dark:border-violet-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Function Analysis</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
                Based on the consequences that most often follow behaviors, the likely function appears to be:
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.consequenceCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([consequence, count]) => (
                    <Badge key={consequence} className="bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-700">
                      {CONSEQUENCE_OPTIONS.find(c => c.value === consequence)?.label}: {count}
                    </Badge>
                  ))}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-4">
                Note: This is a preliminary analysis. Consult with your BCBA for a comprehensive functional behavior assessment.
              </p>
            </Card>
          </div>
        )}
      </main>

      {/* Add Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-700">
            <div className="p-6 border-b border-neutral-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Log Incident</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-neutral-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3 sm:space-y-4 sm:space-y-6">
              {/* When & Where */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">When did it happen?</label>
                  <Input
                    type="datetime-local"
                    value={formData.occurredAt}
                    onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Where?</label>
                  <div className="flex flex-wrap gap-2">
                    {SETTING_OPTIONS.map(setting => (
                      <button
                        key={setting.value}
                        onClick={() => setFormData({ ...formData, setting: setting.value })}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          formData.setting === setting.value
                            ? 'bg-teal-100 border-teal-300 text-teal-700'
                            : 'bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {setting.icon} {setting.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Antecedent */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  What happened RIGHT BEFORE? (Antecedent)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ANTECEDENT_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, antecedentCategory: option.value })}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        formData.antecedentCategory === option.value
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Describe what was happening before the behavior..."
                  value={formData.antecedent}
                  onChange={(e) => setFormData({ ...formData, antecedent: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Behavior */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  What behavior occurred?
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {BEHAVIOR_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, behaviorCategory: option.value })}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        formData.behaviorCategory === option.value
                          ? option.color + ' border-current'
                          : 'bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Describe the specific behavior..."
                  value={formData.behavior}
                  onChange={(e) => setFormData({ ...formData, behavior: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Consequence */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  What happened AFTER? (Consequence)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {CONSEQUENCE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, consequenceCategory: option.value })}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        formData.consequenceCategory === option.value
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Describe what happened after the behavior..."
                  value={formData.consequence}
                  onChange={(e) => setFormData({ ...formData, consequence: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Duration & Intensity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Duration (optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Seconds"
                      value={formData.durationSeconds || ''}
                      onChange={(e) => setFormData({ ...formData, durationSeconds: parseInt(e.target.value) || undefined })}
                      className="w-24"
                    />
                    <span className="text-neutral-500 dark:text-neutral-400">seconds</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Intensity
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => setFormData({ ...formData, intensity: level })}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors capitalize ${
                          formData.intensity === level
                            ? getIntensityColor(level) + ' border-current'
                            : 'bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Additional Notes (optional)
                </label>
                <Textarea
                  placeholder="Any other relevant details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 dark:border-slate-800 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={handleSave}
                disabled={isSaving || !formData.behavior || !formData.antecedent || !formData.consequence}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Entry
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ABCDataCollection;
