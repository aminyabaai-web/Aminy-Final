// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * My Appointments Dashboard
 * Inspired by One Medical appointment management
 * Shows upcoming/past appointments with actions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  ChevronRight,
  Star,
  RefreshCw,
  X,
  Bell,
  FileText,
  MessageSquare,
  Check,
  AlertCircle,
  Plus,
  CalendarPlus,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { EmptyState } from './EmptyState';

// Types
export interface Appointment {
  id: string;
  provider: {
    id: string;
    name: string;
    title: string;
    specialty: string;
    imageUrl?: string;
  };
  scheduledAt: Date;
  duration: number; // minutes
  sessionType: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  visitType: 'video' | 'phone' | 'in-person';
  videoCallUrl?: string;
  concern?: string;
  preVisitQuestionnaire?: {
    completed: boolean;
    url: string;
  };
  postVisitReview?: {
    submitted: boolean;
    rating?: number;
  };
  sessionNotes?: string;
  canReschedule: boolean;
  canCancel: boolean;
  cancellationDeadline?: Date;
}

interface MyAppointmentsProps {
  appointments?: Appointment[];
  onBookNew?: () => void;
  onJoinCall?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onLeaveReview?: (appointment: Appointment) => void;
  onBookAgain?: (appointment: Appointment) => void;
  onCompleteQuestionnaire?: (appointment: Appointment) => void;
  childName?: string;
  onBack?: () => void;
  onNavigateToProvider?: () => void;
}

// Fallback data (only used if database is empty or unavailable)
const FALLBACK_APPOINTMENTS: Appointment[] = [];

/**
 * Hook to load appointments from the database
 */
export function useAppointments(userId?: string): {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    if (!userId) {
      // Try to get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      userId = user.id;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('marketplace_bookings')
        .select(`
          id,
          session_type,
          scheduled_at,
          session_duration_minutes,
          status,
          concern,
          notes,
          video_room_url,
          rating,
          review,
          provider:provider_profiles(
            id,
            full_name,
            credentials,
            specialty
          )
        `)
        .eq('user_id', userId)
        .order('scheduled_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('Error loading appointments:', fetchError);
        setError(fetchError.message);
        setAppointments(FALLBACK_APPOINTMENTS);
      } else if (data && data.length > 0) {
        const now = new Date();
        setAppointments(data.map((booking: Record<string, unknown>) => {
          const scheduledAt = new Date(booking.scheduled_at as string);
          const isPast = scheduledAt < now;
          const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);
          const providerObj = booking.provider as Record<string, unknown> | null;

          let status: Appointment['status'] = booking.status as Appointment['status'];
          if (booking.status === 'confirmed' && !isPast) {
            status = 'upcoming';
          } else if (booking.status === 'confirmed' && isPast) {
            status = 'completed';
          }

          return {
            id: booking.id as string,
            provider: {
              id: (providerObj?.id as string) || 'unknown',
              name: (providerObj?.full_name as string) || 'Provider',
              title: (providerObj?.credentials as string) || '',
              specialty: (providerObj?.specialty as string) || '',
            },
            scheduledAt,
            duration: (booking.session_duration_minutes as number) || 60,
            sessionType: (booking.session_type as string) || 'Consultation',
            status,
            visitType: 'video' as const,
            videoCallUrl: booking.video_room_url as string | undefined,
            concern: booking.concern as string | undefined,
            preVisitQuestionnaire: {
              completed: true,
              url: '',
            },
            postVisitReview: booking.rating ? {
              submitted: true,
              rating: booking.rating as number,
            } : {
              submitted: false,
            },
            sessionNotes: booking.notes as string | undefined,
            canReschedule: !isPast && hoursUntil > 24,
            canCancel: !isPast && hoursUntil > 24,
          };
        }));
      } else {
        setAppointments(FALLBACK_APPOINTMENTS);
      }
    } catch (e: unknown) {
      console.error('Failed to load appointments:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
      setAppointments(FALLBACK_APPOINTMENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [userId]);

  return {
    appointments,
    isLoading,
    error,
    refetch: fetchAppointments,
  };
}

// Keep MOCK_APPOINTMENTS export for backwards compatibility (deprecated)
export const MOCK_APPOINTMENTS: Appointment[] = FALLBACK_APPOINTMENTS;

// Helper Functions
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (diff < 0) {
    const absDays = Math.abs(days);
    if (absDays === 0) return 'Today';
    if (absDays === 1) return 'Yesterday';
    return `${absDays} days ago`;
  }

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `Starts in ${minutes} min`;
  }
  if (hours < 24) return `Starts in ${hours} hours`;
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function isWithinJoinWindow(date: Date): boolean {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const minutes = diff / (1000 * 60);
  return minutes <= 15 && minutes >= -30; // Can join 15 min before to 30 min after
}

// Visit Type Icon
function VisitTypeIcon({ type }: { type: 'video' | 'phone' | 'in-person' }) {
  switch (type) {
    case 'video':
      return <Video className="w-4 h-4" />;
    case 'phone':
      return <Phone className="w-4 h-4" />;
    case 'in-person':
      return <MapPin className="w-4 h-4" />;
  }
}

// Status Badge
function StatusBadge({ status }: { status: Appointment['status'] }) {
  const styles = {
    upcoming: 'bg-teal-50 text-teal-700 border-teal-200',
    'in-progress': 'bg-green-50 text-green-700 border-green-200',
    completed: 'bg-gray-50 text-gray-600 border-gray-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    'no-show': 'bg-amber-50 text-amber-600 border-amber-200',
  };

  const labels = {
    upcoming: 'Upcoming',
    'in-progress': 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    'no-show': 'No Show',
  };

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// Appointment Card
function AppointmentCard({
  appointment,
  onJoinCall,
  onReschedule,
  onCancel,
  onLeaveReview,
  onBookAgain,
  onCompleteQuestionnaire
}: {
  appointment: Appointment;
  onJoinCall?: (a: Appointment) => void;
  onReschedule?: (a: Appointment) => void;
  onCancel?: (a: Appointment) => void;
  onLeaveReview?: (a: Appointment) => void;
  onBookAgain?: (a: Appointment) => void;
  onCompleteQuestionnaire?: (a: Appointment) => void;
}) {
  const canJoin = appointment.status === 'upcoming' && isWithinJoinWindow(appointment.scheduledAt);
  const showQuestionnaire = appointment.status === 'upcoming' &&
    appointment.preVisitQuestionnaire &&
    !appointment.preVisitQuestionnaire.completed;
  const showReviewPrompt = appointment.status === 'completed' &&
    appointment.postVisitReview &&
    !appointment.postVisitReview.submitted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Card Header */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Provider Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold">
              {appointment.provider.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{appointment.provider.name}</h3>
              <p className="text-sm text-gray-500">{appointment.provider.title}</p>
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        {/* Session Details */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDateTime(appointment.scheduledAt)}</span>
            <span className="text-teal-600 font-medium">
              ({formatRelativeTime(appointment.scheduledAt)})
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{appointment.duration} min {appointment.sessionType}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <VisitTypeIcon type={appointment.visitType} />
            <span className="capitalize">{appointment.visitType} call</span>
          </div>
          {appointment.concern && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span>Re: {appointment.concern}</span>
            </div>
          )}
        </div>

        {/* Session Notes (for completed) */}
        {appointment.sessionNotes && appointment.status === 'completed' && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-1">Session Notes</p>
            <p className="text-sm text-gray-700">{appointment.sessionNotes}</p>
          </div>
        )}
      </div>

      {/* Action Alerts */}
      {(showQuestionnaire || showReviewPrompt) && (
        <div className="px-4 pb-3">
          {showQuestionnaire && (
            <button
              onClick={() => onCompleteQuestionnaire?.(appointment)}
              className="w-full flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Complete pre-visit questions</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {showReviewPrompt && (
            <button
              onClick={() => onLeaveReview?.(appointment)}
              className="w-full flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 hover:bg-teal-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">Leave a review for {appointment.provider.name}</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {/* Join Call Button */}
        {canJoin && (
          <button
            onClick={() => onJoinCall?.(appointment)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Video className="w-4 h-4" />
            Join Call
          </button>
        )}

        {/* Upcoming Actions */}
        {appointment.status === 'upcoming' && !canJoin && (
          <>
            {appointment.canReschedule && (
              <button
                onClick={() => onReschedule?.(appointment)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reschedule
              </button>
            )}
            {appointment.canCancel && (
              <button
                onClick={() => onCancel?.(appointment)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </>
        )}

        {/* Completed Actions */}
        {appointment.status === 'completed' && (
          <button
            onClick={() => onBookAgain?.(appointment)}
            className="flex items-center gap-2 px-4 py-2 text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            Book Again
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Main Component
export function MyAppointments({
  appointments = [],
  onBookNew,
  onJoinCall,
  onReschedule,
  onCancel,
  onLeaveReview,
  onBookAgain,
  onCompleteQuestionnaire,
  childName,
  onBack,
  onNavigateToProvider
}: MyAppointmentsProps & { onBack?: () => void; onNavigateToProvider?: () => void }) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const upcomingAppointments = appointments
    .filter(a => a.status === 'upcoming' || a.status === 'in-progress')
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const pastAppointments = appointments
    .filter(a => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no-show')
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

  const displayedAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Appointments</h1>
              {childName && (
                <p className="text-sm text-gray-500">for {childName}</p>
              )}
            </div>
            <button
              onClick={onBookNew}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Book New
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upcoming ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'past'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Past ({pastAppointments.length})
            </button>
          </div>
        </div>
      </div>

      {/* Appointment List */}
      <div className="p-4 space-y-3 sm:space-y-4">
        <AnimatePresence mode="wait">
          {displayedAppointments.length > 0 ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 'upcoming' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 'upcoming' ? 20 : -20 }}
              className="space-y-3 sm:space-y-4"
            >
              {displayedAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onJoinCall={onJoinCall}
                  onReschedule={onReschedule}
                  onCancel={onCancel}
                  onLeaveReview={onLeaveReview}
                  onBookAgain={onBookAgain}
                  onCompleteQuestionnaire={onCompleteQuestionnaire}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <EmptyState
                IconComponent={Calendar}
                title={activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
                description={activeTab === 'upcoming'
                  ? 'Book a session with one of our experts'
                  : 'Your completed sessions will appear here'
                }
                actionText={activeTab === 'upcoming' ? 'Book Your First Session' : undefined}
                onAction={activeTab === 'upcoming' ? onBookNew : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Actions FAB */}
      {upcomingAppointments.length > 0 && upcomingAppointments.some(a => isWithinJoinWindow(a.scheduledAt)) && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2"
        >
          <button
            onClick={() => {
              const nextCall = upcomingAppointments.find(a => isWithinJoinWindow(a.scheduledAt));
              if (nextCall) onJoinCall?.(nextCall);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-full shadow-lg hover:bg-green-700 transition-all hover:shadow-xl"
          >
            <Video className="w-5 h-5" />
            Join Your Call Now
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default MyAppointments;
