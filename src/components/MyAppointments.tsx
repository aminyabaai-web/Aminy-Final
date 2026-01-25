/**
 * My Appointments Dashboard
 * Inspired by One Medical appointment management
 * Shows upcoming/past appointments with actions
 */

import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';

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
  appointments: Appointment[];
  onBookNew: () => void;
  onJoinCall: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onLeaveReview: (appointment: Appointment) => void;
  onBookAgain: (appointment: Appointment) => void;
  onCompleteQuestionnaire: (appointment: Appointment) => void;
  childName?: string;
}

// Mock Data
export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    provider: {
      id: 'bcba-1',
      name: 'Dr. Sarah Chen',
      title: 'BCBA-D',
      specialty: 'Behavior Analysis',
    },
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    duration: 30,
    sessionType: 'BCBA Consultation',
    status: 'upcoming',
    visitType: 'video',
    videoCallUrl: 'https://meet.aminy.app/session/abc123',
    concern: 'Morning routine transitions',
    preVisitQuestionnaire: {
      completed: false,
      url: '/questionnaire/abc123',
    },
    canReschedule: true,
    canCancel: true,
    cancellationDeadline: new Date(Date.now() + 1 * 60 * 60 * 1000),
  },
  {
    id: '2',
    provider: {
      id: 'slp-1',
      name: 'Dr. Emily Watson',
      title: 'SLP-CCC',
      specialty: 'Speech-Language Pathology',
    },
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    duration: 45,
    sessionType: 'Speech Evaluation',
    status: 'upcoming',
    visitType: 'video',
    concern: 'Language development',
    preVisitQuestionnaire: {
      completed: true,
      url: '/questionnaire/def456',
    },
    canReschedule: true,
    canCancel: true,
  },
  {
    id: '3',
    provider: {
      id: 'bcba-1',
      name: 'Dr. Sarah Chen',
      title: 'BCBA-D',
      specialty: 'Behavior Analysis',
    },
    scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    duration: 30,
    sessionType: 'Parent Coaching',
    status: 'completed',
    visitType: 'video',
    concern: 'Bedtime routine',
    postVisitReview: {
      submitted: false,
    },
    sessionNotes: 'Discussed visual schedule implementation for bedtime. Parent to track progress over next week.',
    canReschedule: false,
    canCancel: false,
  },
  {
    id: '4',
    provider: {
      id: 'bcba-2',
      name: 'Dr. Michael Torres',
      title: 'BCBA',
      specialty: 'Early Intervention',
    },
    scheduledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    duration: 30,
    sessionType: 'Initial Assessment',
    status: 'completed',
    visitType: 'video',
    postVisitReview: {
      submitted: true,
      rating: 5,
    },
    canReschedule: false,
    canCancel: false,
  },
];

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
  onJoinCall: (a: Appointment) => void;
  onReschedule: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
  onLeaveReview: (a: Appointment) => void;
  onBookAgain: (a: Appointment) => void;
  onCompleteQuestionnaire: (a: Appointment) => void;
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
      <div className="p-4">
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
              onClick={() => onCompleteQuestionnaire(appointment)}
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
              onClick={() => onLeaveReview(appointment)}
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
            onClick={() => onJoinCall(appointment)}
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
                onClick={() => onReschedule(appointment)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reschedule
              </button>
            )}
            {appointment.canCancel && (
              <button
                onClick={() => onCancel(appointment)}
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
            onClick={() => onBookAgain(appointment)}
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
  appointments,
  onBookNew,
  onJoinCall,
  onReschedule,
  onCancel,
  onLeaveReview,
  onBookAgain,
  onCompleteQuestionnaire,
  childName
}: MyAppointmentsProps) {
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
      <div className="p-4 space-y-4">
        <AnimatePresence mode="wait">
          {displayedAppointments.length > 0 ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 'upcoming' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 'upcoming' ? 20 : -20 }}
              className="space-y-4"
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
              className="py-12 text-center"
            >
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
              </h3>
              <p className="text-gray-500 mb-6">
                {activeTab === 'upcoming'
                  ? 'Book a session with one of our experts'
                  : 'Your completed sessions will appear here'
                }
              </p>
              {activeTab === 'upcoming' && (
                <button
                  onClick={onBookNew}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Book Your First Session
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
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
              if (nextCall) onJoinCall(nextCall);
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
