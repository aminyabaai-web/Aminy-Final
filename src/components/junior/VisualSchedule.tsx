// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  GripVertical,
  Plus,
  Trash2,
  Edit3,
  Play,
  Pause,
  RotateCcw,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { playTap, playComplete, playSuccess, haptic } from './activities/sounds';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduleItem {
  id: string;
  emoji: string;
  label: string;
  time?: string; // "8:00 AM"
  durationMinutes?: number;
  status: 'upcoming' | 'current' | 'done';
  notes?: string;
}

interface VisualScheduleProps {
  childName: string;
  onBack: () => void;
}

type ScheduleTemplate = {
  name: string;
  emoji: string;
  items: Omit<ScheduleItem, 'id' | 'status'>[];
};

// ---------------------------------------------------------------------------
// Pre-built templates
// ---------------------------------------------------------------------------

const TEMPLATES: ScheduleTemplate[] = [
  {
    name: 'Morning Routine',
    emoji: '🌅',
    items: [
      { emoji: '⏰', label: 'Wake Up', time: '7:00 AM', durationMinutes: 5 },
      { emoji: '🚽', label: 'Bathroom', time: '7:05 AM', durationMinutes: 10 },
      { emoji: '👕', label: 'Get Dressed', time: '7:15 AM', durationMinutes: 15 },
      { emoji: '🥣', label: 'Breakfast', time: '7:30 AM', durationMinutes: 20 },
      { emoji: '🦷', label: 'Brush Teeth', time: '7:50 AM', durationMinutes: 5 },
      { emoji: '🎒', label: 'Pack Backpack', time: '7:55 AM', durationMinutes: 5 },
      { emoji: '🚌', label: 'Bus / Car', time: '8:00 AM', durationMinutes: 10 },
    ],
  },
  {
    name: 'After School',
    emoji: '🏫',
    items: [
      { emoji: '🏠', label: 'Come Home', time: '3:30 PM', durationMinutes: 5 },
      { emoji: '🍎', label: 'Snack', time: '3:35 PM', durationMinutes: 15 },
      { emoji: '📚', label: 'Homework', time: '3:50 PM', durationMinutes: 30 },
      { emoji: '🎮', label: 'Free Time', time: '4:20 PM', durationMinutes: 30 },
      { emoji: '🍽️', label: 'Dinner', time: '5:30 PM', durationMinutes: 30 },
      { emoji: '🛁', label: 'Bath Time', time: '6:30 PM', durationMinutes: 20 },
    ],
  },
  {
    name: 'Bedtime',
    emoji: '🌙',
    items: [
      { emoji: '🛁', label: 'Bath / Shower', time: '7:00 PM', durationMinutes: 20 },
      { emoji: '👕', label: 'Pajamas', time: '7:20 PM', durationMinutes: 5 },
      { emoji: '🦷', label: 'Brush Teeth', time: '7:25 PM', durationMinutes: 5 },
      { emoji: '📖', label: 'Story Time', time: '7:30 PM', durationMinutes: 15 },
      { emoji: '🤗', label: 'Hugs & Kisses', time: '7:45 PM', durationMinutes: 5 },
      { emoji: '💤', label: 'Lights Out', time: '7:50 PM', durationMinutes: 0 },
    ],
  },
  {
    name: 'Therapy Day',
    emoji: '🩺',
    items: [
      { emoji: '🌅', label: 'Morning Routine', time: '7:00 AM', durationMinutes: 60 },
      { emoji: '🚗', label: 'Drive to Therapy', time: '9:00 AM', durationMinutes: 20 },
      { emoji: '🗣️', label: 'Speech Therapy', time: '9:30 AM', durationMinutes: 45 },
      { emoji: '🎮', label: 'Break / Play', time: '10:15 AM', durationMinutes: 15 },
      { emoji: '🧩', label: 'OT Session', time: '10:30 AM', durationMinutes: 45 },
      { emoji: '🍽️', label: 'Lunch', time: '12:00 PM', durationMinutes: 30 },
      { emoji: '🏠', label: 'Home & Rest', time: '1:00 PM', durationMinutes: 60 },
      { emoji: '🎨', label: 'Quiet Activity', time: '2:00 PM', durationMinutes: 60 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Timer hook
// ---------------------------------------------------------------------------

function useCountdownTimer(isRunning: boolean, totalSeconds: number) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remaining]);

  const reset = useCallback(() => setRemaining(totalSeconds), [totalSeconds]);

  return { remaining, reset };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VisualSchedule({ childName, onBack }: VisualScheduleProps) {
  // State
  const [items, setItems] = useState<ScheduleItem[]>(() => {
    try {
      const stored = localStorage.getItem(`schedule-${childName}`);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  });

  const [view, setView] = useState<'schedule' | 'first-then' | 'templates' | 'edit'>('schedule');
  const [timerRunning, setTimerRunning] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Add/Edit form state
  const [formEmoji, setFormEmoji] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDuration, setFormDuration] = useState('15');

  // First/Then state
  const [firstItem, setFirstItem] = useState<ScheduleItem | null>(null);
  const [thenItem, setThenItem] = useState<ScheduleItem | null>(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`schedule-${childName}`, JSON.stringify(items));
    } catch { /* ignore */ }
  }, [items, childName]);

  // Current activity for timer
  const currentItem = items.find((i) => i.status === 'current');
  const currentDuration = (currentItem?.durationMinutes || 0) * 60;
  const { remaining, reset: resetTimer } = useCountdownTimer(timerRunning, currentDuration);

  // ---- Handlers ----

  const handleMarkDone = useCallback((id: string) => {
    playComplete();
    haptic([80, 40, 120]);

    setJustCompletedId(id);
    setTimeout(() => setJustCompletedId(null), 800);

    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) return { ...item, status: 'done' as const };
        return item;
      });
      // Auto-advance: set next upcoming item to current
      const doneIdx = updated.findIndex((i) => i.id === id);
      const nextUpcoming = updated.find((i, idx) => idx > doneIdx && i.status === 'upcoming');
      if (nextUpcoming) {
        return updated.map((i) =>
          i.id === nextUpcoming.id ? { ...i, status: 'current' as const } : i
        );
      }
      return updated;
    });
    setTimerRunning(false);
  }, []);

  const handleSetCurrent = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: item.id === id ? ('current' as const) : item.status === 'current' ? ('upcoming' as const) : item.status,
      }))
    );
    setTimerRunning(false);
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleAddItem = useCallback(() => {
    if (!formLabel.trim()) return;
    const newItem: ScheduleItem = {
      id: `sched-${Date.now()}`,
      emoji: formEmoji || '📌',
      label: formLabel.trim(),
      time: formTime || undefined,
      durationMinutes: parseInt(formDuration) || 15,
      status: 'upcoming',
    };
    if (editingItem) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? { ...i, emoji: newItem.emoji, label: newItem.label, time: newItem.time, durationMinutes: newItem.durationMinutes }
            : i
        )
      );
      setEditingItem(null);
    } else {
      setItems((prev) => [...prev, newItem]);
    }
    setFormEmoji('');
    setFormLabel('');
    setFormTime('');
    setFormDuration('15');
    setShowAddItem(false);
  }, [formEmoji, formLabel, formTime, formDuration, editingItem]);

  const handleLoadTemplate = useCallback((template: ScheduleTemplate) => {
    const newItems: ScheduleItem[] = template.items.map((t, i) => ({
      ...t,
      id: `tmpl-${Date.now()}-${i}`,
      status: (i === 0 ? 'current' : 'upcoming') as ScheduleItem['status'],
    }));
    setItems(newItems);
    setView('schedule');
  }, []);

  const handleResetSchedule = useCallback(() => {
    setItems((prev) =>
      prev.map((item, i) => ({
        ...item,
        status: (i === 0 ? 'current' : 'upcoming') as ScheduleItem['status'],
      }))
    );
    setTimerRunning(false);
  }, []);

  const startEditItem = useCallback((item: ScheduleItem) => {
    setEditingItem(item);
    setFormEmoji(item.emoji);
    setFormLabel(item.label);
    setFormTime(item.time || '');
    setFormDuration(String(item.durationMinutes || 15));
    setShowAddItem(true);
  }, []);

  // ---- Drag handlers (HTML drag and drop) ----

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (index: number) => {
      if (dragIndex === null || dragIndex === index) {
        setDragIndex(null);
        setDragOverIndex(null);
        return;
      }
      setItems((prev) => {
        const copy = [...prev];
        const [removed] = copy.splice(dragIndex, 1);
        copy.splice(index, 0, removed);
        return copy;
      });
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  // ---- Touch-based reorder (for mobile) ----
  const touchStartY = useRef<number>(0);
  const touchDragIdx = useRef<number | null>(null);

  const handleTouchDragStart = useCallback((index: number, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDragIdx.current = index;
    setDragIndex(index);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchDragIdx.current === null) return;
    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const scheduleItem = elements.find((el) => el.hasAttribute('data-schedule-index'));
    if (scheduleItem) {
      const idx = parseInt(scheduleItem.getAttribute('data-schedule-index') || '-1');
      if (idx >= 0) setDragOverIndex(idx);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDragIdx.current !== null && dragOverIndex !== null) {
      handleDrop(dragOverIndex);
    }
    touchDragIdx.current = null;
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragOverIndex, handleDrop]);

  // Auto-populate First/Then from schedule
  useEffect(() => {
    if (view === 'first-then') {
      const cur = items.find((i) => i.status === 'current');
      const nextIdx = cur ? items.indexOf(cur) + 1 : -1;
      const next = nextIdx >= 0 && nextIdx < items.length ? items[nextIdx] : null;
      setFirstItem(cur || null);
      setThenItem(next || null);
    }
  }, [view, items]);

  // ---- Render ----

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">
          {childName}&apos;s Schedule
        </h2>
        <div className="flex gap-1.5">
          <button
            onClick={handleResetSchedule}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            aria-label="Reset schedule"
          >
            <RotateCcw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex px-3 py-2 gap-2">
          <button
            onClick={() => setView('schedule')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              view === 'schedule'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1" />
            Schedule
          </button>
          <button
            onClick={() => setView('first-then')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              view === 'first-then'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronRight className="w-4 h-4 inline mr-1" />
            First / Then
          </button>
          <button
            onClick={() => setView('templates')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              view === 'templates'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1" />
            Templates
          </button>
        </div>
      </div>

      {/* ---- Timer Bar (when current activity) ---- */}
      {view === 'schedule' && currentItem && currentItem.durationMinutes && currentItem.durationMinutes > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentItem.emoji}</span>
            <span className="text-sm font-medium text-blue-800">
              {currentItem.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-mono font-bold ${remaining <= 60 ? 'text-red-600' : 'text-blue-800'}`}>
              {formatTime(remaining)}
            </span>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                timerRunning ? 'bg-yellow-400' : 'bg-blue-500'
              }`}
            >
              {timerRunning ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={() => {
                resetTimer();
                setTimerRunning(false);
              }}
              className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* ---- Main Content ---- */}
      <div className="flex-1 overflow-y-auto">
        {/* ---- Schedule View ---- */}
        {view === 'schedule' && (
          <div className="p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock className="w-14 h-14 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium mb-1">No schedule yet</p>
                <p className="text-gray-400 text-sm mb-4">
                  Create a schedule or pick a template
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddItem(true)}
                    className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Add Activity
                  </button>
                  <button
                    onClick={() => setView('templates')}
                    className="px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium"
                  >
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    Templates
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="space-y-2"
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {items.map((item, index) => {
                  const isDone = item.status === 'done';
                  const isCurrent = item.status === 'current';
                  const isDragging = dragIndex === index;
                  const isDragOver = dragOverIndex === index;
                  const isJustCompleted = justCompletedId === item.id;

                  return (
                    <div
                      key={item.id}
                      data-schedule-index={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={`
                        flex items-center gap-3 p-3 rounded-2xl border-2 transition-all
                        ${isDone ? 'bg-gray-50 border-gray-200 opacity-60' : ''}
                        ${isCurrent ? 'bg-blue-50 border-blue-400 vs-current-pulse' : ''}
                        ${!isDone && !isCurrent ? 'bg-white border-gray-200' : ''}
                        ${isDragging ? 'opacity-50 scale-95' : ''}
                        ${isDragOver ? 'border-blue-500 border-dashed' : ''}
                        ${isJustCompleted ? 'vs-check-animate' : ''}
                      `}
                    >
                      {/* Drag handle */}
                      <div
                        className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
                        onTouchStart={(e) => handleTouchDragStart(index, e)}
                      >
                        <GripVertical className="w-5 h-5 text-gray-300" />
                      </div>

                      {/* Timeline dot */}
                      <div className="flex-shrink-0 relative">
                        {/* Connecting line */}
                        {index < items.length - 1 && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gray-200" />
                        )}
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                            isDone
                              ? 'bg-green-100'
                              : isCurrent
                              ? 'bg-blue-100'
                              : 'bg-gray-100'
                          }`}
                        >
                          {isDone ? (
                            <Check className="w-6 h-6 text-green-600" />
                          ) : (
                            <span>{item.emoji}</span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm ${
                            isDone ? 'line-through text-gray-400' : 'text-gray-800'
                          }`}
                        >
                          {item.label}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.time && (
                            <span className="text-xs text-gray-500">{item.time}</span>
                          )}
                          {item.durationMinutes && item.durationMinutes > 0 && (
                            <span className="text-xs text-gray-400">
                              {item.durationMinutes} min
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {!isDone && (
                          <button
                            onClick={() => handleMarkDone(item.id)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isCurrent
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                            aria-label={`Mark ${item.label} as done`}
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => startEditItem(item)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                          aria-label={`Edit ${item.label}`}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                          aria-label={`Delete ${item.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add button at bottom */}
                <button
                  onClick={() => setShowAddItem(true)}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Activity
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- First / Then View ---- */}
        {view === 'first-then' && (
          <div className="p-4 flex flex-col gap-4 h-full">
            <p className="text-center text-sm text-gray-500">
              Simplified view for younger children
            </p>

            {/* First panel */}
            <div className="flex-1 bg-blue-50 border-3 border-blue-400 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-3">
                First
              </span>
              {firstItem ? (
                <>
                  <span className="text-6xl mb-3">{firstItem.emoji}</span>
                  <span className="text-xl font-bold text-blue-800">
                    {firstItem.label}
                  </span>
                  {firstItem.durationMinutes && firstItem.durationMinutes > 0 && (
                    <span className="text-sm text-blue-600 mt-1">
                      {firstItem.durationMinutes} minutes
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-400">No current activity</span>
              )}
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <ChevronRight className="w-6 h-6 text-gray-500 rotate-90" />
              </div>
            </div>

            {/* Then panel */}
            <div className="flex-1 bg-green-50 border-3 border-green-400 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-bold text-green-600 uppercase tracking-wider mb-3">
                Then
              </span>
              {thenItem ? (
                <>
                  <span className="text-6xl mb-3">{thenItem.emoji}</span>
                  <span className="text-xl font-bold text-green-800">
                    {thenItem.label}
                  </span>
                  {thenItem.durationMinutes && thenItem.durationMinutes > 0 && (
                    <span className="text-sm text-green-600 mt-1">
                      {thenItem.durationMinutes} minutes
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-400">All done after this!</span>
              )}
            </div>

            {/* Done button for First/Then */}
            {firstItem && (
              <button
                onClick={() => handleMarkDone(firstItem.id)}
                className="w-full py-4 rounded-2xl bg-green-500 text-white text-lg font-bold flex items-center justify-center gap-2"
              >
                <Check className="w-6 h-6" />
                Done with {firstItem.label}!
              </button>
            )}
          </div>
        )}

        {/* ---- Templates View ---- */}
        {view === 'templates' && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-500 text-center mb-2">
              Choose a pre-built schedule to get started
            </p>
            {TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => handleLoadTemplate(template)}
                className="w-full bg-white rounded-2xl border-2 border-gray-200 p-4 text-left hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{template.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {template.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {template.items.length} activities
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {template.items.map((item, i) => (
                    <span
                      key={i}
                      className="bg-gray-100 px-2 py-1 rounded-lg text-xs text-gray-600"
                    >
                      {item.emoji} {item.label}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---- Add / Edit Item Modal ---- */}
      {showAddItem && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end justify-center z-50"
          onClick={() => {
            setShowAddItem(false);
            setEditingItem(null);
          }}
        >
          <div
            className="bg-white rounded-t-3xl p-5 w-full max-w-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingItem ? 'Edit Activity' : 'Add Activity'}
              </h3>
              <button
                onClick={() => {
                  setShowAddItem(false);
                  setEditingItem(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Emoji</label>
                <input
                  type="text"
                  value={formEmoji}
                  onChange={(e) => setFormEmoji(e.target.value)}
                  placeholder="🎨"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-center text-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Activity Name</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. Speech Therapy"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  maxLength={30}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Time (optional)</label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="9:00 AM"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    maxLength={10}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="15"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    min={0}
                    max={480}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleAddItem}
              disabled={!formLabel.trim()}
              className={`w-full mt-4 py-3 rounded-xl text-white font-medium ${
                formLabel.trim()
                  ? 'bg-blue-500 active:bg-blue-600'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {editingItem ? 'Save Changes' : 'Add to Schedule'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisualSchedule;
