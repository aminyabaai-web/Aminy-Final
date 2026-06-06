// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { DisclaimerFooter } from './DisclaimerFooter';
import { ScreenHeader } from './ui/ScreenHeader';
import { AddToCalendarButtons } from './AddToCalendarButtons';
import { isDemoMode } from '../lib/demo-seed';
import { toast } from 'sonner';
import { 
  MessageCircle,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Send,
  Paperclip,
  Camera,
  Plus,
  CheckCircle,
  AlertCircle,
  User,
  Video,
  Phone,
  ArrowLeft,
  Download,
  Star,
  ChevronRight,
  Shield,
  Award,
  Target,
  TrendingUp,
  Users,
  BookOpen,
  Stethoscope,
  Brain,
  Play
} from 'lucide-react';

interface CareTabProps {
  userTier: string | null;
  childName?: string;
  onNavigate?: (destination: string) => void;
  onPaywallTrigger?: () => void;
  onSuccessEvent?: (eventType: string, source: string) => void;
  returnTo?: string | null;
  onBack?: () => void;
}

type CareTabView = 'messages' | 'schedule' | 'minutes' | 'past-sessions';

interface CoachMessage {
  id: string;
  from: 'coach' | 'parent';
  content: string;
  timestamp: Date;
  coachName?: string;
  coachCredentials?: string[];
  attachments?: string[];
  messageType?: 'text' | 'video' | 'audio';
}

interface CoachingSession {
  id: string;
  date: Date;
  duration: number; // in minutes
  coachName: string;
  coachCredentials: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  type: '25min' | '50min';
  summary?: {
    whatWePracticed: string[];
    nextSteps: string[];
    keyInsights: string;
    recommendedActivities: string[];
  };
}

interface MinutesUsage {
  id: string;
  date: Date;
  activity: string;
  minutesUsed: number;
  type: 'session' | 'consultation' | 'review';
}

export function CareTab({ userTier, childName = 'your child', onNavigate, onPaywallTrigger, onSuccessEvent, returnTo, onBack }: CareTabProps) {
  const [activeView, setActiveView] = useState<CareTabView>('messages');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<'25min' | '50min'>('25min');
  const [bookingConsent, setBookingConsent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Coaching data. Real users start empty (a friendly empty state renders until
  // their real coach/sessions/messages load); the fabricated 'Sarah Chen' thread,
  // session summaries, and minutes history are DEMO MODE ONLY. Never show a real
  // parent an invented clinician, conversation, or clinical insight.
  const demo = isDemoMode();

  const [messages, setMessages] = useState<CoachMessage[]>(demo ? [
    {
      id: '1',
      from: 'coach',
      content: 'Hi! I\'m Sarah, your assigned developmental coach. I\'m excited to work with you and support your journey with your child. How has your week been going with the new activities we discussed?',
      timestamp: new Date('2024-12-15T09:00:00'),
      coachName: 'Sarah Chen',
      coachCredentials: ['BCBA', 'M.Ed'],
      messageType: 'text'
    },
    {
      id: '2',
      from: 'parent',
      content: 'Hi Sarah! Things have been going well. We\'ve been working on the morning routine strategies, and I\'ve noticed some improvement in transitions. I do have a question about handling meltdowns during homework time though.',
      timestamp: new Date('2024-12-15T14:30:00'),
      messageType: 'text'
    },
    {
      id: '3',
      from: 'coach',
      content: 'That\'s wonderful progress with the morning routine! For homework meltdowns, let\'s try breaking tasks into smaller chunks and using the visual timer we discussed. I\'m sending you a quick video demonstration of a technique that might help.',
      timestamp: new Date('2024-12-15T15:15:00'),
      coachName: 'Sarah Chen',
      coachCredentials: ['BCBA', 'M.Ed'],
      messageType: 'video',
      attachments: ['homework-support-technique.mp4']
    }
  ] : []);

  const [upcomingSessions] = useState<CoachingSession[]>(demo ? [
    {
      id: '1',
      date: new Date('2024-12-18T10:00:00'),
      duration: 25,
      coachName: 'Sarah Chen',
      coachCredentials: ['BCBA', 'M.Ed'],
      status: 'scheduled',
      type: '25min'
    }
  ] : []);

  const [pastSessions] = useState<CoachingSession[]>(demo ? [
    {
      id: '1',
      date: new Date('2024-12-10T10:00:00'),
      duration: 25,
      coachName: 'Sarah Chen',
      coachCredentials: ['BCBA', 'M.Ed'],
      status: 'completed',
      type: '25min',
      summary: {
        whatWePracticed: [
          'Morning routine visual schedule implementation',
          'Transition warning strategies (5-minute, 2-minute alerts)',
          'Positive reinforcement for successful transitions',
          'Managing resistance during routine changes'
        ],
        nextSteps: [
          'Continue using visual schedule for 2 more weeks',
          'Add evening routine visual schedule',
          'Practice transition warnings during weekend activities',
          'Document any challenging moments for next session'
        ],
        keyInsights: 'Your child responds exceptionally well to visual cues and advance notice. The 5-minute warning has reduced morning transitions from 15 minutes to 7 minutes on average. Consider expanding this approach to other daily activities.',
        recommendedActivities: [
          'Visual Schedule Creation activity (Practice tools)',
          'Transition Timer practice (5-10 minutes daily)',
          'Social Story about morning routines',
          'Choice board for breakfast options'
        ]
      }
    },
    {
      id: '2',
      date: new Date('2024-12-03T14:00:00'),
      duration: 50,
      coachName: 'Sarah Chen',
      coachCredentials: ['BCBA', 'M.Ed'],
      status: 'completed',
      type: '50min',
      summary: {
        whatWePracticed: [
          'Initial assessment and goal setting',
          'Family routine analysis',
          'Behavior observation and ABC data collection',
          'Introduction to ABA principles for daily use'
        ],
        nextSteps: [
          'Implement morning routine visual schedule',
          'Start ABC data collection for challenging behaviors',
          'Practice positive reinforcement strategies',
          'Schedule follow-up session in one week'
        ],
        keyInsights: 'Strong family dynamics and clear commitment to consistency. Child shows excellent receptive language skills and responds well to structured activities. Focus areas identified: transitions and task initiation.',
        recommendedActivities: [
          'ABC Data Collection sheet (available in Plan)',
          'First/Then visual cards creation',
          'Preferred activities assessment',
          'Environmental modifications for focus'
        ]
      }
    }
  ] : []);

  const [minutesWallet] = useState(demo ? {
    includedThisMonth: userTier === 'pro' ? 200 : 50,
    usedThisMonth: userTier === 'pro' ? 75 : 25,
    purchased: 0
  } : {
    includedThisMonth: 0,
    usedThisMonth: 0,
    purchased: 0
  });

  const [minutesUsage] = useState<MinutesUsage[]>(demo ? [
    {
      id: '1',
      date: new Date('2024-12-10T10:00:00'),
      activity: 'Behavior Coaching Session',
      minutesUsed: 25,
      type: 'session'
    },
    {
      id: '2',
      date: new Date('2024-12-03T14:00:00'),
      activity: 'Initial Assessment & Planning',
      minutesUsed: 50,
      type: 'session'
    }
  ] : []);

  const remainingMinutes = minutesWallet.includedThisMonth + minutesWallet.purchased - minutesWallet.usedThisMonth;

  // Analytics tracking
  useEffect(() => {
    // Analytics removed for production
  }, [activeView, userTier, messages.length, upcomingSessions.length, remainingMinutes]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    // Analytics removed for production

    const newMessage: CoachMessage = {
      id: Date.now().toString(),
      from: 'parent',
      content: messageInput.trim(),
      timestamp: new Date(),
      messageType: 'text'
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');

    // Demo mode only: simulate a coach reply so walkthroughs feel alive. Real
    // users must NEVER receive a fabricated 'coach' message — their note is
    // delivered to the real coach, who responds within office hours.
    if (demo) {
      setTimeout(() => {
        const coachResponse: CoachMessage = {
          id: (Date.now() + 1).toString(),
          from: 'coach',
          content: 'Thank you for sharing that. I\'ll review what you\'ve said and get back to you with some specific strategies. In the meantime, keep documenting what you\'re observing - that data is really valuable for our work together.',
          timestamp: new Date(),
          coachName: 'Sarah Chen',
          coachCredentials: ['BCBA', 'M.Ed'],
          messageType: 'text'
        };
        setMessages(prev => [...prev, coachResponse]);
      }, 2000);
    }

    toast(demo ? 'Message sent to your coach' : 'Message sent — your coach will respond during office hours');

    // First message sent — return-to-home logic
    if (onSuccessEvent) {
      onSuccessEvent('first_message_sent', 'care_messages');
    }
  };

  const handleBookSession = () => {
    if (!bookingConsent) {
      toast('Please confirm you understand this is educational coaching, not therapy');
      return;
    }

    // Analytics removed for production

    setShowBookingModal(false);
    setBookingConsent(false);
    toast(`${selectedDuration} coaching session booked successfully!`);
    
    // Trigger success event for return-to-home
    if (onSuccessEvent) {
      onSuccessEvent('session_booked', 'care_schedule');
    }
  };

  const handleSessionSummaryAction = (action: 'add_to_plan', sessionId: string) => {
    // Analytics removed for production

    const session = pastSessions.find(s => s.id === sessionId);
    if (session?.summary) {
      toast('Recommended activities added to your Plan');

      // Trigger success event for return-to-home (next steps injected)
      if (onSuccessEvent) {
        onSuccessEvent('next_steps_injected', 'care_past_sessions');
      }
    }
  };

  const handleExportSummary = async (session: CoachingSession) => {
    if (!session.summary) return;
    const s = session.summary;
    const text = [
      `Session Summary — ${session.date.toLocaleDateString()} (${session.duration} min)`,
      `Coach: ${session.coachName}${session.coachCredentials.length ? `, ${session.coachCredentials.join(', ')}` : ''}`,
      '',
      'What We Practiced:',
      ...s.whatWePracticed.map(i => `  • ${i}`),
      '',
      'Your Next Steps:',
      ...s.nextSteps.map(i => `  • ${i}`),
      '',
      'Key Insights:',
      `  ${s.keyInsights}`,
      '',
      'Recommended Activities:',
      ...s.recommendedActivities.map(i => `  • ${i}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Summary copied to clipboard');
    } catch {
      toast('Unable to copy summary on this device');
    }
  };

  const handleBuyMinutes = (pack: '25' | '50') => {
    const prices = { '25': 49, '50': 89 };

    // Billing for add-on minute packs is not live yet. In demo mode we confirm
    // the selection for walkthroughs; for real users we keep the affordance
    // honest rather than implying a charge that does not happen.
    if (demo) {
      toast.success(`${pack}-minute pack selected — $${prices[pack]}`);
      return;
    }
    toast('Add-on minute packs are coming soon');
  };

  // Handle AMA (Ask Me Anything) submission for non-Pro users
  const handleAMASubmit = () => {
    // This would normally show a paywall or redirect to upgrade
    if (userTier !== 'pro' && onSuccessEvent) {
      // Simulate AMA submission for non-Pro users
      toast('AMA question submitted - upgrade to Pro for instant responses!');
      onSuccessEvent('ama_sent_non_pro', 'care_ama');
    }
  };

  // Handle session reschedule/cancel for return-to-home
  const handleSessionAction = (action: 'reschedule' | 'cancel', sessionId: string) => {
    if (action === 'reschedule') {
      toast('Session rescheduled successfully!');
      if (onSuccessEvent) {
        onSuccessEvent('session_rescheduled', 'care_schedule');
      }
    } else if (action === 'cancel') {
      toast('Session cancelled successfully!');
      if (onSuccessEvent) {
        onSuccessEvent('session_cancelled', 'care_schedule');
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeView === 'messages') {
      scrollToBottom();
    }
  }, [messages, activeView]);

  const renderCredentialBadges = (credentials: string[]) => {
    return credentials.map(cred => {
      const isRBT = cred === 'RBT';
      const isBCBA = cred === 'BCBA';
      
      return (
        <Badge
          key={cred}
          variant="outline"
          className={`text-xs ${
            isBCBA 
              ? 'bg-purple-50 text-purple-700 border-purple-200' 
              : isRBT 
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-[#FAF7F2] text-gray-700 border-gray-200'
          }`}
        >
          {cred}
        </Badge>
      );
    });
  };

  const renderMessages = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Coach Office Hours */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900">Coach Office Hours</span>
        </div>
        <p className="text-sm text-blue-700">
          Monday-Friday: 9:00 AM - 5:00 PM PST • Response time: Within 24 hours
        </p>
      </div>

      {/* Message Thread */}
      <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No messages yet</p>
            <p className="text-sm text-gray-500">
              Send a note below and your coach will reply during office hours.
            </p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.from === 'parent' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${message.from === 'parent' ? 'order-1' : 'order-2'}`}>
              {message.from === 'coach' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {message.coachName}
                      </span>
                      {message.coachCredentials && (
                        <div className="flex gap-1">
                          {renderCredentialBadges(message.coachCredentials)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
              
              <div className={`rounded-lg px-4 py-3 ${
                message.from === 'parent'
                  ? 'bg-accent text-white'
                  : 'bg-[#FAF7F2] border border-gray-200'
              }`}>
                <p className="text-sm">{message.content}</p>
                
                {message.attachments && (
                  <div className="mt-3 space-y-2">
                    {message.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white/20 rounded">
                        {message.messageType === 'video' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        <span className="text-xs font-medium">{attachment}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto">
                          <Play className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {message.from === 'parent' && (
                <div className="text-right mt-1">
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            aria-label="Attach photo"
            onClick={() => toast('Photo attachments are coming soon')}
          >
            <Camera className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            aria-label="Attach file"
            onClick={() => toast('File attachments are coming soon')}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={`Message your coach about ${childName}...`}
            className="min-h-[80px] pr-12"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          {messageInput.trim() && (
            <Button
              onClick={handleSendMessage}
              size="sm"
              className="absolute bottom-2 right-2 p-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Emergency Notice */}
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="font-medium text-red-900 text-sm">Not for emergencies</span>
        </div>
        <p className="text-xs text-red-700 mt-1">
          For urgent concerns, contact your child's healthcare provider immediately.
        </p>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Duration Selection */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Session Duration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedDuration('25min')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedDuration === '25min'
                ? 'border-accent bg-accent/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="font-semibold text-lg">25 min</div>
              <div className="text-sm text-gray-600">Quick check-in</div>
              <div className="text-xs text-gray-500 mt-1">Focus session</div>
            </div>
          </button>
          <button
            onClick={() => setSelectedDuration('50min')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedDuration === '50min'
                ? 'border-accent bg-accent/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="font-semibold text-lg">50 min</div>
              <div className="text-sm text-gray-600">Deep dive</div>
              <div className="text-xs text-gray-500 mt-1">Strategy session</div>
            </div>
          </button>
        </div>
      </div>

      {/* Calendar Placeholder */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Available Times</h3>
        <div className="p-8 bg-[#FAF7F2] rounded-lg border-2 border-dashed border-gray-300 text-center">
          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-4">Calendar integration coming soon</p>
          <p className="text-sm text-gray-500">
            For now, your coach will reach out to schedule based on your availability
          </p>
        </div>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Upcoming Sessions</h3>
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">{session.coachName}</div>
                      <div className="flex gap-1">
                        {renderCredentialBadges(session.coachCredentials)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{session.duration} min</Badge>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {session.date.toLocaleDateString()} at {session.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <AddToCalendarButtons
                  appointment={{
                    id: session.id,
                    title: `${session.duration}-min Behavior Coaching${session.coachName ? ` — ${session.coachName}` : ''}`,
                    provider: session.coachName,
                    service_type: 'Behavior Coaching',
                    start_iso: session.date.toISOString(),
                    end_iso: new Date(session.date.getTime() + session.duration * 60000).toISOString(),
                  }}
                  variant="inline"
                  label="Add to calendar"
                  className="mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleSessionAction('reschedule', session.id)}
                  >
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleSessionAction('cancel', session.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consent & Book */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <input
            type="checkbox"
            id="booking-consent"
            checked={bookingConsent}
            onChange={(e) => setBookingConsent(e.target.checked)}
            className="mt-0.5"
          />
          <label htmlFor="booking-consent" className="text-sm text-amber-900">
            <span className="font-medium">I understand this is educational coaching, not therapy.</span>
            <span className="block text-amber-700 mt-1">
              Our coaches provide developmental guidance and ABA-informed strategies for daily routines and learning.
            </span>
          </label>
        </div>

        <Button
          onClick={handleBookSession}
          disabled={!bookingConsent}
          className="w-full"
        >
          Book {selectedDuration} Session
        </Button>
      </div>
    </div>
  );

  const renderMinutes = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Minutes Wallet */}
      <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
        <h3 className="font-semibold text-gray-900 mb-4">Your Minutes Wallet</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {minutesWallet.includedThisMonth}
            </div>
            <div className="text-sm text-gray-600">Included this month</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {remainingMinutes}
            </div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {minutesWallet.purchased}
            </div>
            <div className="text-sm text-gray-600">Purchased</div>
          </div>
        </div>
      </div>

      {/* Buy Minutes — billing for add-on packs is not live yet, so this is
          shown only in demo walkthroughs. Real users see no non-functional
          Purchase buttons. */}
      {demo && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Buy Additional Minutes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="text-center mb-3">
                <div className="text-xl sm:text-2xl font-bold">25 min</div>
                <div className="text-lg font-semibold text-accent">$49</div>
                <div className="text-xs text-gray-500">$1.96 per minute</div>
              </div>
              <Button
                onClick={() => handleBuyMinutes('25')}
                size="sm"
                variant="outline"
                className="w-full"
              >
                Purchase
              </Button>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="text-center mb-3">
                <div className="text-xl sm:text-2xl font-bold">50 min</div>
                <div className="text-lg font-semibold text-accent">$89</div>
                <div className="text-xs text-gray-500">$1.78 per minute</div>
                <Badge className="text-xs mt-1">Best Value</Badge>
              </div>
              <Button
                onClick={() => handleBuyMinutes('50')}
                size="sm"
                variant="outline"
                className="w-full"
              >
                Purchase
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Usage History */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Recent Usage</h3>
        <div className="space-y-3">
          {minutesUsage.map((usage) => (
            <div key={usage.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div>
                <div className="font-medium text-sm">{usage.activity}</div>
                <div className="text-xs text-gray-500">
                  {usage.date.toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm">-{usage.minutesUsed} min</div>
                <div className="text-xs text-gray-500">
                  {usage.type === 'session' ? 'Coaching Session' : 'Consultation'}
                </div>
              </div>
            </div>
          ))}
          {minutesUsage.length === 0 && (
            <div className="text-center py-6">
              <Clock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No usage yet</p>
              <p className="text-sm text-gray-500">Your coaching minutes activity will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPastSessions = () => (
    <div className="space-y-3 sm:space-y-4">
      {pastSessions.map((session) => (
        <div key={session.id} className="space-y-3">
          {/* Session Header */}
          <button
            onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
            className="w-full p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">{session.coachName}</div>
                  <div className="flex gap-1">
                    {renderCredentialBadges(session.coachCredentials)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {session.date.toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500">
                  {session.duration} minutes
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge 
                className={`${
                  session.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-[#F0EDE8] text-gray-800'
                }`}
              >
                {session.status}
              </Badge>
              <ChevronRight 
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  selectedSession?.id === session.id ? 'rotate-90' : ''
                }`} 
              />
            </div>
          </button>

          {/* Session Summary */}
          {selectedSession?.id === session.id && session.summary && (
            <div className="p-4 bg-[#FAF7F2] rounded-lg border border-gray-200 space-y-3 sm:space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  What We Practiced
                </h4>
                <ul className="space-y-1">
                  {session.summary.whatWePracticed.map((item, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Your Next Steps
                </h4>
                <ul className="space-y-1">
                  {session.summary.nextSteps.map((step, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <ArrowLeft className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0 rotate-180" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-orange-600" />
                  Key Insights
                </h4>
                <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                  {session.summary.keyInsights}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-green-600" />
                  Recommended Activities
                </h4>
                <ul className="space-y-1">
                  {session.summary.recommendedActivities.map((activity, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <Play className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  onClick={() => handleSessionSummaryAction('add_to_plan', session.id)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  Add to Plan
                </Button>
                <Button
                  onClick={() => handleExportSummary(session)}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-3 h-3" />
                  Export Summary
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {pastSessions.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No completed sessions yet</p>
          <p className="text-sm text-gray-500">Your session summaries will appear here</p>
        </div>
      )}
    </div>
  );

  const tabItems = [
    { id: 'messages' as CareTabView, label: 'Messages', icon: MessageCircle },
    { id: 'schedule' as CareTabView, label: 'Schedule', icon: Calendar },
    { id: 'minutes' as CareTabView, label: 'Minutes', icon: Clock },
    { id: 'past-sessions' as CareTabView, label: 'Past Sessions', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]/30 pb-20">
      {/* Header — shared chrome via ScreenHeader (back control + consistent
          padding); Pro badge preserved as a trailing action. */}
      <ScreenHeader
        title="Care"
        subtitle="ABA-informed Behavior Coaching"
        onBack={onBack}
        icon={<Stethoscope className="w-6 h-6" />}
        actions={userTier === 'pro' ? (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">Pro</Badge>
        ) : undefined}
      />
      {/* Compliance disclaimer — subtle inline (full text on tap) */}
      <div className="bg-white border-b border-gray-100 px-4 pb-3">
        <div className="max-w-md mx-auto">
          <DisclaimerFooter variant="subtle" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Non-Pro: the 'Plan' nav entry lands here, so the screen must match its
            name. Show a real (non-coaching) care-plan summary first — goals,
            routines, progress — then offer 1-on-1 coaching as the Pro add-on.
            Honesty: the snapshot numbers below are illustrative and only render
            in demo mode; real non-Pro users get an honest description + a link
            to where their live plan lives (home dashboard), never invented stats. */}
        {userTier !== 'pro' ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Care Plan summary */}
            <div className="p-5 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Your Care Plan</h2>
                {demo && (
                  <Badge variant="outline" className="text-xs bg-white/60 text-gray-600 border-gray-300">
                    Sample
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {childName ? `${childName}'s` : 'Your'} goals, daily routines, and progress — all in one place.
              </p>

              {demo ? (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center bg-white/70 rounded-lg py-3">
                    <div className="text-xl font-bold text-purple-600">3</div>
                    <div className="text-xs text-gray-600">Active goals</div>
                  </div>
                  <div className="text-center bg-white/70 rounded-lg py-3">
                    <div className="text-xl font-bold text-blue-600">5</div>
                    <div className="text-xs text-gray-600">Daily routines</div>
                  </div>
                  <div className="text-center bg-white/70 rounded-lg py-3">
                    <div className="text-xl font-bold text-green-600">68%</div>
                    <div className="text-xs text-gray-600">On track</div>
                  </div>
                </div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-2 mt-4">
                  <li className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    Goals tailored to {childName || 'your child'} from your screening and check-ins
                  </li>
                  <li className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    Daily routines and activities you can do at home
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Progress you log over time, summarized for you
                  </li>
                </ul>
              )}

              {onNavigate && (
                <Button
                  variant="outline"
                  className="w-full mt-4 bg-white"
                  onClick={() => onNavigate('dashboard')}
                >
                  View goals &amp; routines
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>

            {/* Coaching add-on (Pro) */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
              <Stethoscope className="w-10 h-10 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Add 1-on-1 coaching</h3>
              <p className="text-sm text-gray-600 mb-4 max-w-xs mx-auto">
                Work directly with certified developmental specialists on {childName || 'your child'}'s plan
              </p>
              <ul className="text-sm text-purple-700 space-y-1 text-left mb-4">
                <li>• Direct messaging with BCBA-certified coaches</li>
                <li>• 25 &amp; 50-minute video coaching sessions</li>
                <li>• Personalized strategy development</li>
                <li>• Session summaries with actionable next steps</li>
              </ul>
              {onPaywallTrigger ? (
                <Button onClick={onPaywallTrigger} className="w-full">
                  Upgrade to Pro
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Available on Pro
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="mb-4 sm:mb-6">
              <div className="flex bg-[#F0EDE8] rounded-lg p-1">
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveView(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-3 px-2 rounded-md text-sm font-medium transition-all ${
                        activeView === tab.id
                          ? 'bg-white text-accent shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <Card className="aminy-card">
              <div className="p-4 sm:p-5 md:p-6">
                {activeView === 'messages' && renderMessages()}
                {activeView === 'schedule' && renderSchedule()}
                {activeView === 'minutes' && renderMinutes()}
                {activeView === 'past-sessions' && renderPastSessions()}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
