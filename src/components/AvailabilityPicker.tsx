// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Availability Picker Component
 * Inspired by One Medical, OpenTable, and Calendly
 * Visual time slot selection with horizontal date scroll
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  Calendar,
  Sun,
  Sunset,
  Moon,
  Loader2
} from 'lucide-react';

// Types
export interface TimeSlot {
  id: string;
  date: Date;
  startTime: string; // "09:00"
  endTime: string; // "09:30"
  available: boolean;
}

export interface DayAvailability {
  date: Date;
  slots: TimeSlot[];
}

interface AvailabilityPickerProps {
  providerId: string;
  providerName?: string;
  sessionType: string;
  sessionDuration: number; // minutes
  onSelectSlot: (slot: TimeSlot) => void;
  selectedSlot?: TimeSlot | null;
  availability?: DayAvailability[];
  loading?: boolean;
  timezone?: string;
}

// Helper Functions
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function formatDayOfWeek(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

function formatDayNumber(date: Date): string {
  return date.getDate().toString();
}

function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
}

function getTimeOfDay(time: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(time.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// Generate mock availability data
function generateMockAvailability(
  providerId: string,
  daysAhead: number = 14
): DayAvailability[] {
  const availability: DayAvailability[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    // Skip weekends for some providers
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    const slots: TimeSlot[] = [];
    const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                       '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
                       '17:00', '17:30', '18:00'];

    timeSlots.forEach((time, idx) => {
      // Random availability (more available further out)
      const availabilityChance = Math.min(0.3 + (i * 0.05), 0.8);
      const available = !isWeekend && Math.random() < availabilityChance;

      const [hours, minutes] = time.split(':').map(Number);
      const endHours = hours;
      const endMinutes = minutes + 30;
      const endTime = `${endHours.toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      slots.push({
        id: `${date.toISOString()}-${time}`,
        date,
        startTime: time,
        endTime,
        available,
      });
    });

    availability.push({ date, slots });
  }

  return availability;
}

// Time Slot Button Component
function TimeSlotButton({
  slot,
  selected,
  onClick
}: {
  slot: TimeSlot;
  selected: boolean;
  onClick: () => void;
}) {
  if (!slot.available) {
    return (
      <button
        disabled
        className="px-3 py-2 text-sm text-gray-300 bg-gray-50 rounded-lg cursor-not-allowed"
      >
        {formatTime(slot.startTime)}
      </button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
        selected
          ? 'bg-teal-600 text-white shadow-md'
          : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
      }`}
    >
      <span className="flex items-center gap-1">
        {selected && <Check className="w-3.5 h-3.5" />}
        {formatTime(slot.startTime)}
      </span>
    </motion.button>
  );
}

// Time Period Section
function TimePeriodSection({
  period,
  slots,
  selectedSlot,
  onSelectSlot
}: {
  period: 'morning' | 'afternoon' | 'evening';
  slots: TimeSlot[];
  selectedSlot?: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
}) {
  const icons = {
    morning: <Sun className="w-4 h-4" />,
    afternoon: <Sunset className="w-4 h-4" />,
    evening: <Moon className="w-4 h-4" />
  };

  const labels = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening'
  };

  const availableSlots = slots.filter(s => s.available);

  if (availableSlots.length === 0 && slots.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 text-gray-600">
        {icons[period]}
        <span className="text-sm font-medium">{labels[period]}</span>
        <span className="text-xs text-gray-400">
          ({availableSlots.length} available)
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <TimeSlotButton
            key={slot.id}
            slot={slot}
            selected={selectedSlot?.id === slot.id}
            onClick={() => onSelectSlot(slot)}
          />
        ))}
      </div>
    </div>
  );
}

// Date Selector Component
function DateSelector({
  availability,
  selectedDate,
  onSelectDate
}: {
  availability: DayAvailability[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">
          {formatMonthYear(selectedDate)}
        </h4>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Scrollable Date Pills */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {availability.map((day) => {
          const isSelected = day.date.toDateString() === selectedDate.toDateString();
          const availableCount = day.slots.filter(s => s.available).length;
          const hasAvailability = availableCount > 0;

          return (
            <button
              key={day.date.toISOString()}
              onClick={() => onSelectDate(day.date)}
              disabled={!hasAvailability}
              className={`flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-teal-600 text-white shadow-md'
                  : hasAvailability
                  ? 'bg-white border border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className={`text-xs font-medium ${isSelected ? 'text-teal-100' : 'text-gray-500'}`}>
                {isToday(day.date) ? 'Today' : isTomorrow(day.date) ? 'Tmrw' : formatDayOfWeek(day.date)}
              </div>
              <div className={`text-lg font-bold ${isSelected ? 'text-white' : hasAvailability ? 'text-gray-900' : 'text-gray-300'}`}>
                {formatDayNumber(day.date)}
              </div>
              {hasAvailability && (
                <div className={`text-[10px] ${isSelected ? 'text-teal-100' : 'text-teal-600'}`}>
                  {availableCount} slots
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Main Component
export function AvailabilityPicker({
  providerId,
  providerName,
  sessionType,
  sessionDuration,
  onSelectSlot,
  selectedSlot,
  availability: propAvailability,
  loading = false,
  timezone = 'America/New_York'
}: AvailabilityPickerProps) {
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showMoreTimes, setShowMoreTimes] = useState(false);

  // Load availability
  useEffect(() => {
    if (propAvailability) {
      setAvailability(propAvailability);
    } else {
      // Generate mock data for demo
      setAvailability(generateMockAvailability(providerId));
    }
  }, [providerId, propAvailability]);

  // Get selected day's slots
  const selectedDayAvailability = availability.find(
    (day) => day.date.toDateString() === selectedDate.toDateString()
  );

  // Group slots by time of day
  const morningSlots = selectedDayAvailability?.slots.filter(
    (s) => getTimeOfDay(s.startTime) === 'morning'
  ) || [];
  const afternoonSlots = selectedDayAvailability?.slots.filter(
    (s) => getTimeOfDay(s.startTime) === 'afternoon'
  ) || [];
  const eveningSlots = selectedDayAvailability?.slots.filter(
    (s) => getTimeOfDay(s.startTime) === 'evening'
  ) || [];

  // Initial display limit
  const displayMorning = showMoreTimes ? morningSlots : morningSlots.slice(0, 4);
  const displayAfternoon = showMoreTimes ? afternoonSlots : afternoonSlots.slice(0, 4);
  const displayEvening = showMoreTimes ? eveningSlots : eveningSlots.slice(0, 4);

  const hasMoreTimes = morningSlots.length > 4 || afternoonSlots.length > 4 || eveningSlots.length > 4;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <span className="ml-3 text-gray-600">Loading availability...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-teal-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Select a Time</h3>
            <p className="text-sm text-gray-500">
              {sessionDuration} min {sessionType}
              {providerName && ` with ${providerName}`}
            </p>
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="p-4 border-b border-gray-100">
        <DateSelector
          availability={availability}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {/* Time Slots */}
      <div className="p-3 sm:p-4">
        {selectedDayAvailability ? (
          <>
            <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatDate(selectedDate)}
              <span className="text-gray-300">|</span>
              <span>Timezone: {timezone}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDate.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <TimePeriodSection
                  period="morning"
                  slots={displayMorning}
                  selectedSlot={selectedSlot}
                  onSelectSlot={onSelectSlot}
                />

                <TimePeriodSection
                  period="afternoon"
                  slots={displayAfternoon}
                  selectedSlot={selectedSlot}
                  onSelectSlot={onSelectSlot}
                />

                <TimePeriodSection
                  period="evening"
                  slots={displayEvening}
                  selectedSlot={selectedSlot}
                  onSelectSlot={onSelectSlot}
                />

                {/* No availability message */}
                {morningSlots.length === 0 && afternoonSlots.length === 0 && eveningSlots.length === 0 && (
                  <div className="py-8 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No availability on this day</p>
                    <p className="text-sm mt-1">Try selecting a different date</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Show More Times */}
            {hasMoreTimes && (
              <button
                onClick={() => setShowMoreTimes(!showMoreTimes)}
                className="w-full mt-4 py-2 text-teal-600 font-medium hover:bg-teal-50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                {showMoreTimes ? 'Show fewer times' : 'Show more times'}
                {showMoreTimes ? (
                  <ChevronLeft className="w-4 h-4 rotate-90" />
                ) : (
                  <ChevronRight className="w-4 h-4 rotate-90" />
                )}
              </button>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-gray-300" />
            <p>Loading times...</p>
          </div>
        )}
      </div>

      {/* Selected Slot Summary */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-teal-50 border-t border-teal-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-teal-600" />
                  <div>
                    <p className="font-medium text-teal-900">
                      {formatDate(selectedSlot.date)} at {formatTime(selectedSlot.startTime)}
                    </p>
                    <p className="text-sm text-teal-700">
                      {sessionDuration} min {sessionType}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onSelectSlot(selectedSlot)}
                  className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AvailabilityPicker;
