// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Calendar as CalendarUI } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  AlertCircle,
  Info,
  Download,
  Mail,
  FileText,
  Sparkles,
  CalendarPlus,
  CalendarDays,
  Timer,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAminyStore } from '../lib/store';
import { isDemoMode } from '../lib/demo-seed';
import {
  orchestratePostSession,
  type SessionCompletionData,
  type OrchestrationResult,
} from '../lib/session-orchestrator';

interface SessionCredit {
  type: '50min' | '25min';
  available: number;
  used: number;
  total: number;
  resetDate: Date;
}

interface ScheduledSession {
  id: string;
  type: '50min' | '25min';
  provider: string;
  date: Date;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  sessionSummary?: SessionNotes;
}

interface SessionNotes {
  sessionId: string;
  date: Date;
  provider: string;
  duration: string;
  topics: string[];
  observations: string;
  recommendations: string[];
  nextSteps: string[];
  parentQuestions: string[];
  progress: {
    area: string;
    status: 'improved' | 'maintained' | 'needs_attention';
    notes: string;
  }[];
}

interface TelehealthSessionManagerProps {
  childName: string;
  parentName: string;
  userTier?: string;
  onSessionScheduled?: (session: ScheduledSession) => void;
  onNotesComplete?: (notes: SessionNotes) => void;
  onSessionComplete?: (session: ScheduledSession) => void;
}

export function TelehealthSessionManager({
  childName,
  parentName,
  userTier = 'pro',
  onSessionScheduled,
  onNotesComplete,
  onSessionComplete
}: TelehealthSessionManagerProps) {
  const [sessionCredits, setSessionCredits] = useState<SessionCredit[]>([
    {
      type: '50min',
      available: 1,
      used: 0,
      total: 1,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    },
    {
      type: '25min',
      available: 1,
      used: 0,
      total: 1,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  ]);

  // Real users start with no session history — the empty states below render until
  // their own appointments and provider-written notes load from the backend. The
  // sample completed session (with its fabricated provider name and clinical
  // observations/progress notes about the child) is DEMO MODE ONLY. Never show a
  // real family invented clinical notes, and never let fabricated "completed"
  // sessions trigger the post-session orchestration (superbill/FHIR/notifications).
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>(
    isDemoMode()
      ? [
    {
      id: 's1',
      type: '50min',
      provider: 'Dr. Sarah Chen, BCBA',
      date: new Date(2025, 9, 28, 14, 0), // Oct 28, 2025 at 2:00 PM
      time: '2:00 PM',
      status: 'completed',
      sessionSummary: {
        sessionId: 's1',
        date: new Date(2025, 9, 28),
        provider: 'Dr. Sarah Chen, BCBA',
        duration: '50 minutes',
        topics: ['Morning routine progress', 'Social skills development', 'Sensory strategies'],
        observations: `${childName} showed significant improvement in morning routine independence. Successfully completed dressing with minimal prompts on 4/5 school days. Demonstrated increased tolerance for transitions when using visual timer.`,
        recommendations: [
          'Continue using visual sequence cards for morning routine',
          'Introduce peer play opportunities 2x per week',
          'Implement sensory break schedule before challenging activities'
        ],
        nextSteps: [
          'Add "choosing breakfast" to morning routine goals',
          'Schedule playdate with structured activities',
          'Create sensory toolkit for school'
        ],
        parentQuestions: [
          'How to handle meltdowns during transitions?',
          'Best approach for introducing new foods?'
        ],
        progress: [
          {
            area: 'Morning Routine',
            status: 'improved',
            notes: 'Increased independence from 40% to 80% over past month'
          },
          {
            area: 'Social Skills',
            status: 'maintained',
            notes: 'Continues parallel play, working toward cooperative play'
          },
          {
            area: 'Communication',
            status: 'improved',
            notes: 'Using more full sentences, requesting help appropriately'
          }
        ]
      }
    }
  ]
      : []
  );

  const [showScheduling, setShowScheduling] = useState(false);
  const [selectedSessionType, setSelectedSessionType] = useState<'50min' | '25min' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Available providers — the named roster is illustrative sample data for demo
  // walkthroughs only. Real users get the verified roster from the backend (empty
  // until loaded); never offer a real family a fabricated clinician to book.
  const providers = isDemoMode()
    ? [
        'Dr. Sarah Chen, BCBA',
        'Dr. Michael Rodriguez, PhD',
        'Dr. Emily Thompson, PsyD',
        'Dr. James Wilson, BCBA-D'
      ]
    : [];

  // Available time slots
  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
    '4:00 PM', '5:00 PM', '6:00 PM'
  ];

  // Persist to global store
  const addSession = useAminyStore(state => state.addSession);
  const storeUser = useAminyStore(state => state.user);
  const currentChildId = useAminyStore(state => state.currentChildId);

  /**
   * Post-session orchestration: when a session is completed (notes finalized),
   * trigger the automated workflow for superbill, FHIR, notifications, etc.
   */
  const handlePostSessionOrchestration = async (session: ScheduledSession) => {
    if (!storeUser?.id || !session.sessionSummary) return;

    const sessionEnd = new Date(session.date);
    const durationMinutes = session.type === '50min' ? 50 : 25;
    sessionEnd.setMinutes(sessionEnd.getMinutes() + durationMinutes);

    const completionData: SessionCompletionData = {
      appointmentId: session.id,
      userId: storeUser.id,
      childId: currentChildId ?? `child-${storeUser.id.substring(0, 8)}`,
      providerId: `provider-${session.provider.replace(/\s+/g, '-').toLowerCase()}`,
      providerName: session.provider,
      childName,
      sessionStart: session.date.toISOString(),
      sessionEnd: sessionEnd.toISOString(),
      sessionDuration: durationMinutes,
      visitType: session.type === '50min' ? 'deep-review' : 'consult-25',
      visitFormat: 'remote',
      diagnosisCodes: ['F84.0'], // Default; real flow would pull from child profile
      sessionNotes: session.sessionSummary.observations,
      soapContent: {
        subjective: session.sessionSummary.topics.join('; '),
        objective: session.sessionSummary.observations,
        assessment: session.sessionSummary.progress
          .map(p => `${p.area}: ${p.status} - ${p.notes}`)
          .join('; '),
        plan: session.sessionSummary.recommendations.join('; '),
      },
    };

    try {
      const result: OrchestrationResult = await orchestratePostSession(completionData);
      const successCount = result.steps.filter(s => s.status === 'success').length;
      const errorCount = result.errors.length;

      if (errorCount === 0) {
        toast.success('Post-session tasks completed', {
          description: `${successCount} tasks processed automatically (superbill, follow-up, records)`,
        });
      } else {
        toast.warning('Post-session tasks partially completed', {
          description: `${successCount} succeeded, ${errorCount} need attention`,
        });
      }

      if (import.meta.env.DEV) console.log('[TelehealthSessionManager] Orchestration result:', result);
    } catch (err) {
      console.error('[TelehealthSessionManager] Orchestration error:', err);
      toast.error('Could not complete post-session tasks', {
        description: 'Superbill and records may need manual processing',
      });
    }
  };

  // Track which sessions have already been orchestrated so we don't re-run
  const orchestratedSessionIds = React.useRef<Set<string>>(new Set());

  // When a session transitions to 'completed' with notes, trigger orchestration
  useEffect(() => {
    for (const session of scheduledSessions) {
      if (
        session.status === 'completed' &&
        session.sessionSummary &&
        !orchestratedSessionIds.current.has(session.id)
      ) {
        orchestratedSessionIds.current.add(session.id);
        handlePostSessionOrchestration(session);
        onSessionComplete?.(session);
      }
    }
  }, [scheduledSessions]); // eslint-disable-line react-hooks/exhaustive-deps

  const getDaysUntilReset = () => {
    const resetDate = sessionCredits[0].resetDate;
    const now = new Date();
    const diff = resetDate.getTime() - now.getTime();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  };

  const canScheduleSession = (type: '50min' | '25min'): boolean => {
    const credit = sessionCredits.find(c => c.type === type);
    return credit ? credit.available > 0 : false;
  };

  const handleScheduleSession = (type: '50min' | '25min') => {
    if (!canScheduleSession(type)) {
      toast.error('No credits available', {
        description: `You've used your ${type} session for this month. Credits reset in ${getDaysUntilReset()} days.`
      });
      return;
    }

    setSelectedSessionType(type);
    setShowScheduling(true);
  };

  const confirmSchedule = () => {
    if (!selectedSessionType || !selectedDate || !selectedTime || !selectedProvider) {
      toast.error('Please complete all fields');
      return;
    }

    const newSession: ScheduledSession = {
      id: `s${Date.now()}`,
      type: selectedSessionType,
      provider: selectedProvider,
      date: selectedDate,
      time: selectedTime,
      status: 'scheduled'
    };

    setScheduledSessions(prev => [...prev, newSession]);
    
    // Deduct credit
    setSessionCredits(prev => prev.map(credit => 
      credit.type === selectedSessionType
        ? { ...credit, available: credit.available - 1, used: credit.used + 1 }
        : credit
    ));

    // Add to global store
    addSession({
      type: 'telehealth',
      scheduledAt: selectedDate.toISOString(),
      duration: selectedSessionType === '50min' ? 50 : 25,
      status: 'scheduled',
      notes: `Session with ${selectedProvider}`
    });

    toast.success('Session scheduled!', {
      description: `${selectedSessionType} session booked for ${selectedDate.toLocaleDateString()} at ${selectedTime}`
    });

    if (onSessionScheduled) {
      onSessionScheduled(newSession);
    }

    // Reset form
    setShowScheduling(false);
    setSelectedSessionType(null);
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedProvider('');
  };

  const exportToCalendar = (session: ScheduledSession, format: 'ics' | 'google') => {
    if (format === 'ics') {
      // Generate ICS file
      const icsContent = generateICS(session);
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telehealth-session-${session.id}.ics`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Calendar file downloaded');
    } else {
      // Google Calendar
      const googleUrl = generateGoogleCalendarUrl(session);
      window.open(googleUrl, '_blank');
      toast.success('Opening Google Calendar');
    }
  };

  const generateICS = (session: ScheduledSession): string => {
    const startDate = session.date;
    const endDate = new Date(startDate.getTime() + (session.type === '50min' ? 50 : 25) * 60000);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Aminy//Telehealth//EN
BEGIN:VEVENT
UID:${session.id}@aminy.ai
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Telehealth Session with ${session.provider}
DESCRIPTION:${session.type} telehealth session for ${childName}
LOCATION:Aminy Video Call
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: Session starts in 15 minutes
END:VALARM
END:VEVENT
END:VCALENDAR`;
  };

  const generateGoogleCalendarUrl = (session: ScheduledSession): string => {
    const startDate = session.date;
    const endDate = new Date(startDate.getTime() + (session.type === '50min' ? 50 : 25) * 60000);
    
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Telehealth Session with ${session.provider}`,
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: `${session.type} telehealth session for ${childName}`,
      location: 'Aminy Video Call'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const exportSessionNotes = (notes: SessionNotes) => {
    const notesText = formatSessionNotesForExport(notes);
    const blob = new Blob([notesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-notes-${notes.date.toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Session notes exported');
  };

  const formatSessionNotesForExport = (notes: SessionNotes): string => {
    return `TELEHEALTH SESSION NOTES
Date: ${notes.date.toLocaleDateString()}
Provider: ${notes.provider}
Duration: ${notes.duration}
Child: ${childName}

TOPICS COVERED:
${notes.topics.map(t => `- ${t}`).join('\n')}

OBSERVATIONS:
${notes.observations}

RECOMMENDATIONS:
${notes.recommendations.map(r => `- ${r}`).join('\n')}

NEXT STEPS:
${notes.nextSteps.map(s => `- ${s}`).join('\n')}

PARENT QUESTIONS:
${notes.parentQuestions.map(q => `- ${q}`).join('\n')}

PROGRESS UPDATES:
${notes.progress.map(p => `
${p.area}: ${p.status.toUpperCase()}
${p.notes}
`).join('\n')}

---
Generated by Aminy - ${new Date().toLocaleDateString()}
`;
  };

  const getStatusColor = (status: 'improved' | 'maintained' | 'needs_attention') => {
    switch (status) {
      case 'improved': return 'text-green-700 bg-green-50 border-green-200';
      case 'maintained': return 'text-blue-700 bg-[#EEF4F8] border-[#C8DDE8]';
      case 'needs_attention': return 'text-amber-700 bg-amber-50 border-amber-200';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Session Credits Overview */}
      <Card className="p-6 border-l-4 border-l-[#6B9080]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg text-[#132F43]">Monthly Session Credits</h3>
            <p className="text-sm text-[#5A6B7A] mt-1">
              Resets in {getDaysUntilReset()} days
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {userTier === 'pro' ? 'Pro' : 'Premium'} Plan
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {sessionCredits.map((credit) => (
            <div
              key={credit.type}
              className="p-4 bg-[#F6FBFB] rounded-lg border border-[#E8E4DF]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-[#6B9080]" />
                  <span className="font-medium text-[#132F43]">{credit.type}</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-[#132F43]">
                  {credit.available}
                </span>
              </div>
              
              <Progress 
                value={(credit.available / credit.total) * 100} 
                className="h-2 mb-2"
              />
              
              <div className="flex items-center justify-between text-sm text-[#5A6B7A]">
                <span>{credit.available} available</span>
                <span>{credit.used} used</span>
              </div>

              <Button
                size="sm"
                onClick={() => handleScheduleSession(credit.type)}
                disabled={credit.available === 0}
                className="w-full mt-3"
                variant={credit.available > 0 ? 'default' : 'outline'}
              >
                {credit.available > 0 ? (
                  <>
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    Schedule {credit.type}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    No Credits
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        <Alert className="mt-4 bg-[#EEF4F8] border-[#C8DDE8]">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>No rollover:</strong> Unused credits don't carry over to next month. 
            Schedule your sessions to get the most value!
          </AlertDescription>
        </Alert>
      </Card>

      {/* Upcoming Sessions */}
      <div>
        <h3 className="font-semibold text-lg text-[#132F43] mb-4">Upcoming Sessions</h3>
        {scheduledSessions.filter(s => s.status === 'scheduled').length > 0 ? (
          <div className="space-y-3">
            {scheduledSessions
              .filter(s => s.status === 'scheduled')
              .map((session) => (
                <Card key={session.id} className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#6B9080]/10 rounded-lg flex items-center justify-center">
                        <Video className="w-5 h-5 text-[#6B9080]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[#132F43]">{session.provider}</h4>
                        <p className="text-sm text-[#5A6B7A]">{session.type} session</p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-[#5A6B7A]">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-4 h-4" />
                            {session.date.toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.time}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Confirmed
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToCalendar(session, 'ics')}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      .ics
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToCalendar(session, 'google')}
                      className="flex-1"
                    >
                      <CalendarDays className="w-4 h-4 mr-2" />
                      Google
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        ) : (
          <Card className="p-6 text-center bg-[#F6FBFB]">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="text-sm text-[#5A6B7A]">
              No upcoming sessions. Use your monthly credits above!
            </p>
          </Card>
        )}
      </div>

      {/* Session History with Notes */}
      <div>
        <h3 className="font-semibold text-lg text-[#132F43] mb-4">Session History & Notes</h3>
        {scheduledSessions.filter(s => s.status === 'completed' && s.sessionSummary).length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {scheduledSessions
              .filter(s => s.status === 'completed' && s.sessionSummary)
              .map((session) => {
                const notes = session.sessionSummary!;
                return (
                  <Card key={session.id} className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-[#132F43] mb-1">
                          {notes.provider}
                        </h4>
                        <p className="text-sm text-[#5A6B7A]">
                          {notes.date.toLocaleDateString()} • {notes.duration}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportSessionNotes(notes)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>

                    <Separator className="mb-4" />

                    {/* Topics Covered */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-[#3A4A57] mb-2">Topics Covered:</h5>
                      <div className="flex flex-wrap gap-2">
                        {notes.topics.map((topic, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Observations */}
                    <div className="mb-4 p-3 bg-[#F6FBFB] rounded-lg">
                      <h5 className="text-sm font-medium text-[#3A4A57] mb-2">Observations:</h5>
                      <p className="text-sm text-[#3A4A57] leading-relaxed">
                        {notes.observations}
                      </p>
                    </div>

                    {/* Progress Updates */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-[#3A4A57] mb-2">Progress Updates:</h5>
                      <div className="space-y-2">
                        {notes.progress.map((prog, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${getStatusColor(prog.status)}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{prog.area}</span>
                              <Badge variant="outline" className="text-sm capitalize">
                                {prog.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm">{prog.notes}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-[#3A4A57] mb-2">Recommendations:</h5>
                      <ul className="space-y-1">
                        {notes.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-[#3A4A57]">
                            <CheckCircle className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Next Steps */}
                    <div className="p-3 bg-[#6B9080]/10 rounded-lg border border-[#6B9080]/20">
                      <h5 className="text-sm font-medium text-[#6B9080] mb-2">Next Steps:</h5>
                      <ul className="space-y-1">
                        {notes.nextSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-[#6B9080]">
                            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Auto-integration notice */}
                    <div className="mt-4 pt-4 border-t border-[#E8E4DF]">
                      <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                        <FileText className="w-4 h-4" />
                        <span>These notes automatically appear in your progress reports</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        ) : (
          <Card className="p-6 text-center bg-[#F6FBFB]">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="text-sm text-[#5A6B7A]">
              Session notes will appear here after your appointments
            </p>
          </Card>
        )}
      </div>

      {/* Scheduling Dialog with Embedded Calendar */}
      <Dialog open={showScheduling} onOpenChange={(open) => {
        setShowScheduling(open);
        if (!open) {
          setSelectedDate(undefined);
          setSelectedTime('');
          setSelectedProvider('');
          setSelectedSessionType(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#132F43]">
              Schedule {selectedSessionType} Telehealth Session
            </DialogTitle>
            <DialogDescription className="text-[#5A6B7A]">
              Choose a date, time, and provider for your session with {childName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 sm:space-y-6 py-4">
            {/* Calendar */}
            <div>
              <Label className="text-sm text-[#3A4A57] mb-2 block">Select Date</Label>
              <div className="border border-[#E8E4DF] rounded-lg p-2 bg-white">
                <CalendarUI
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="mx-auto"
                />
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <Label className="text-sm text-[#3A4A57] mb-2 block">Select Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Provider Selection */}
            <div>
              <Label className="text-sm text-[#3A4A57] mb-2 block">Select Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose your provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedDate && selectedTime && selectedProvider && (
              <Alert className="bg-[#6B9080]/10 border-[#6B9080]/20">
                <CheckCircle className="w-4 h-4 text-[#6B9080]" />
                <AlertDescription className="text-sm text-[#6B9080]">
                  <strong>Ready to schedule:</strong> {selectedSessionType} session on{' '}
                  {selectedDate.toLocaleDateString()} at {selectedTime} with {selectedProvider}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowScheduling(false);
                setSelectedDate(undefined);
                setSelectedTime('');
                setSelectedProvider('');
                setSelectedSessionType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSchedule}
              disabled={!selectedDate || !selectedTime || !selectedProvider}
              className="bg-primary hover:bg-[#216982]"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
