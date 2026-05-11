// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Session Scheduler Component
 *
 * Multi-step booking flow:
 * 1. Select visit type
 * 2. Pick a date
 * 3. Choose a time slot (from provider availability)
 * 4. Confirm & book
 *
 * Uses session-scheduler.ts for data operations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Loader2,
  AlertCircle,
  User,
  Video,
  X,
  Stethoscope,
} from 'lucide-react';
import {
  bookSession,
  getProviderAvailability,
  type VisitType,
  type ProviderTimeSlot,
  type ScheduledSession,
  VISIT_TYPE_LABELS,
  VISIT_TYPE_DURATIONS,
} from '../../lib/session-scheduler';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SessionSchedulerProps {
  providerId: string;
  providerName: string;
  providerTitle?: string;
  providerPhotoUrl?: string;
  userId: string;
  childId?: string;
  childName?: string;
  onBooked?: (session: ScheduledSession) => void;
  onCancel?: () => void;
}

type Step = 'visit-type' | 'date' | 'time' | 'confirm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(startDate);
  // Start from Monday
  const dayOfWeek = start.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + mondayOffset);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Visit type options
// ---------------------------------------------------------------------------

const VISIT_TYPES: VisitType[] = [
  'follow-up',
  'initial-evaluation',
  'therapy',
  'parent-coaching',
  'medication-review',
  'crisis',
  'team-meeting',
];

const VISIT_TYPE_ICONS: Record<VisitType, React.ReactNode> = {
  'initial-evaluation': <Stethoscope size={18} />,
  'follow-up': <CheckCircle size={18} />,
  'crisis': <AlertCircle size={18} />,
  'medication-review': <Stethoscope size={18} />,
  'therapy': <User size={18} />,
  'parent-coaching': <User size={18} />,
  'team-meeting': <Video size={18} />,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessionScheduler({
  providerId,
  providerName,
  providerTitle,
  providerPhotoUrl,
  userId,
  childId,
  childName,
  onBooked,
  onCancel,
}: SessionSchedulerProps) {
  const [step, setStep] = useState<Step>('visit-type');
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [duration, setDuration] = useState<number>(50);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ProviderTimeSlot | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(new Date());
  const [slots, setSlots] = useState<ProviderTimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookedSession, setBookedSession] = useState<ScheduledSession | null>(null);

  const today = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // -----------------------------------------------------------------------
  // Load available slots when date changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!selectedDate) return;

    async function loadSlots() {
      setLoadingSlots(true);
      setSlots([]);
      setSelectedSlot(null);
      const dateStr = toDateString(selectedDate!);
      const available = await getProviderAvailability(providerId, dateStr);
      setSlots(available);
      setLoadingSlots(false);
    }

    loadSlots();
  }, [selectedDate, providerId]);

  // -----------------------------------------------------------------------
  // Step navigation
  // -----------------------------------------------------------------------
  const goNext = useCallback(() => {
    const steps: Step[] = ['visit-type', 'date', 'time', 'confirm'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  }, [step]);

  const goBack = useCallback(() => {
    const steps: Step[] = ['visit-type', 'date', 'time', 'confirm'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  }, [step]);

  // -----------------------------------------------------------------------
  // Book the session
  // -----------------------------------------------------------------------
  const handleBook = useCallback(async () => {
    if (!visitType || !selectedSlot) return;

    setBooking(true);
    setBookingError(null);

    try {
      const session = await bookSession({
        providerId,
        childId,
        dateTime: selectedSlot.startTime,
        duration,
        visitType,
        userId,
      });

      setBookedSession(session);
      onBooked?.(session);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Failed to book session');
    } finally {
      setBooking(false);
    }
  }, [visitType, selectedSlot, providerId, childId, duration, userId, onBooked]);

  // -----------------------------------------------------------------------
  // Week navigation
  // -----------------------------------------------------------------------
  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    if (d >= today) setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------
  const availableSlots = slots.filter(s => s.available);
  const isPastDate = (d: Date) => d < today && !isSameDay(d, today);
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  // -----------------------------------------------------------------------
  // Success screen
  // -----------------------------------------------------------------------
  if (bookedSession) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Booked!</h2>
          <p className="text-sm text-gray-600 mb-4">
            Your {VISIT_TYPE_LABELS[bookedSession.visitType]} with {providerName} is confirmed.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-gray-700">{formatDate(new Date(bookedSession.dateTime))}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} className="text-gray-400" />
              <span className="text-gray-700">
                {formatTime(bookedSession.dateTime)} &middot; {bookedSession.duration} min
              </span>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-start justify-center z-50 overflow-y-auto p-4 pt-6 pb-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step !== 'visit-type' && (
              <button
                onClick={goBack}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-gray-900">Schedule Session</h2>
              <p className="text-xs text-gray-500">with {providerName}</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-1">
          {(['visit-type', 'date', 'time', 'confirm'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= ['visit-type', 'date', 'time', 'confirm'].indexOf(step)
                  ? 'bg-teal-500'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="p-4">
          {/* ===== Step 1: Visit Type ===== */}
          {step === 'visit-type' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3">What type of visit do you need?</p>
              {VISIT_TYPES.map(vt => {
                const durations = VISIT_TYPE_DURATIONS[vt];
                return (
                  <button
                    key={vt}
                    onClick={() => {
                      setVisitType(vt);
                      setDuration(durations[durations.length - 1]); // Default to longest
                      goNext();
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      visitType === vt
                        ? 'border-teal-300 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                      {VISIT_TYPE_ICONS[vt]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{VISIT_TYPE_LABELS[vt]}</p>
                      <p className="text-xs text-gray-400">
                        {durations.join(' or ')} min
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </button>
                );
              })}
            </div>
          )}

          {/* ===== Step 2: Date ===== */}
          {step === 'date' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select a date</p>

              {/* Duration selector (if visit type has multiple options) */}
              {visitType && VISIT_TYPE_DURATIONS[visitType].length > 1 && (
                <div className="flex gap-2 mb-2">
                  {VISIT_TYPE_DURATIONS[visitType].map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        duration === d
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              )}

              {/* Week navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevWeek}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {formatShortDate(weekDays[0])} - {formatShortDate(weekDays[6])}
                </span>
                <button
                  onClick={nextWeek}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day buttons */}
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => {
                  const disabled = isPastDate(day) || isWeekend(day);
                  const selected = selectedDate && isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        if (!disabled) {
                          setSelectedDate(day);
                          goNext();
                        }
                      }}
                      disabled={disabled}
                      className={`flex flex-col items-center py-3 rounded-xl text-xs transition-all ${
                        disabled
                          ? 'opacity-30 cursor-not-allowed'
                          : selected
                            ? 'bg-teal-600 text-white'
                            : isToday
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-[10px] uppercase opacity-60">
                        {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
                      </span>
                      <span className="text-sm font-semibold mt-1">
                        {day.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== Step 3: Time ===== */}
          {step === 'time' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Available times on {selectedDate && formatShortDate(selectedDate)}
                </p>
                {loadingSlots && <Loader2 size={16} className="text-teal-500 animate-spin" />}
              </div>

              {!loadingSlots && availableSlots.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No available slots on this date.</p>
                  <button
                    onClick={goBack}
                    className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Pick a different date
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {availableSlots.map(slot => {
                  const selected = selectedSlot?.startTime === slot.startTime;
                  return (
                    <button
                      key={slot.startTime}
                      onClick={() => {
                        setSelectedSlot(slot);
                        goNext();
                      }}
                      className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                        selected
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-700 border border-gray-200'
                      }`}
                    >
                      {formatTime(slot.startTime)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== Step 4: Confirm ===== */}
          {step === 'confirm' && visitType && selectedDate && selectedSlot && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Confirm your appointment</p>

              {/* Provider card */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {providerPhotoUrl ? (
                  <img
                    src={providerPhotoUrl}
                    alt={providerName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold">
                    {providerName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{providerName}</p>
                  {providerTitle && (
                    <p className="text-xs text-gray-500">{providerTitle}</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Stethoscope size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Visit Type</span>
                    <p className="font-medium text-gray-900">{VISIT_TYPE_LABELS[visitType]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Calendar size={14} className="text-green-600" />
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Date</span>
                    <p className="font-medium text-gray-900">{formatDate(selectedDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Clock size={14} className="text-purple-600" />
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Time</span>
                    <p className="font-medium text-gray-900">
                      {formatTime(selectedSlot.startTime)} &middot; {duration} min
                    </p>
                  </div>
                </div>
                {childName && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-amber-600" />
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Child</span>
                      <p className="font-medium text-gray-900">{childName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {bookingError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{bookingError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'confirm' && (
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={goBack}
              className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-medium text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleBook}
              disabled={booking}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                booking
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {booking ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionScheduler;
