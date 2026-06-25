// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GlobalDisclaimer } from './GlobalDisclaimer';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { 
  SessionPrepModal, 
  ProviderInfoCard, 
  AppointmentCard, 
  PostSessionModal, 
  InsuranceStatusBanner 
} from './CareTabEnhancements';
import { EnhancedScheduleView } from './EnhancedScheduleView';
import { useAuditedAction } from '../hooks/useAuditedAction';
import {
  MessageCircle, Calendar, Clock, FileText, ArrowLeft, Send, Paperclip, Image, X, 
  AlertTriangle, Phone, User, Camera, MoreVertical, Video, Search, 
  Plus, ArrowDown, Mic, Download, CreditCard, Archive, Filter, Star, CheckCircle, Shield,
  Edit3, Reply, HelpCircle, AlertCircle, Trash2, RotateCcw, Volume2, 
  Zap, Users, Hash, AtSign, Eye, Copy, Share, ExternalLink,
  PlayCircle, Loader2, Check, RefreshCw, Wifi, WifiOff, Upload,
  Calendar as CalendarDays, Bell, Square, Home, Slash,
  MonitorSpeaker, Maximize2, StickyNote, ChevronDown, ChevronUp,
  FileVideo, FileImage, File, Mic2, Settings, Pin
} from 'lucide-react';

// Enhanced TierLite hook with safety checks
function useTierLite() {
  const [tier, setTier] = useState(() => {
    if (typeof window === 'undefined') return "starter";
    try {
      return window.aminyTier?.get?.() || "starter";
    } catch (error) {
      return "starter";
    }
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const unsubscribe = window.aminyTier?.subscribe?.(setTier);
      return unsubscribe || (() => {});
    } catch (error) {
      return () => {};
    }
  }, []);
  
  return tier;
}

// NEW TIERING STRUCTURE - Updated Pro pricing
const TIER_PRICING = {
  starter: { price: 29, name: 'Starter' },
  core: { price: 59, name: 'Core' },
  pro: { price: 229, name: 'Pro' }
};

const SESSION_PRICING = {
  rbt_25_single: 60,        // 1 × 25-min Focus Session with RBT Coach (a la carte)
  rbt_50_single: 110        // 1 × 50-min Comprehensive Session with RBT Coach (a la carte)
};

interface CarePageProps {
  userTier?: string | null;
  childName?: string;
  onNavigate?: (destination: string) => void;
  onPaywallTrigger?: () => void;
  connectorData?: Record<string, unknown>;
  setActiveTab?: (tab: string) => void;
  userData?: {
    parentName?: string;
    childName?: string;
  };
  freeMessageCount?: number;
  setFreeMessageCount?: (count: number) => void;
}

type CareView = 'messages' | 'schedule' | 'sessions' | 'past-sessions';
type ThreadFilter = 'all' | 'unread' | 'starred' | 'files';
type FileTypeFilter = 'all' | 'pdf' | 'images' | 'video' | 'docs';
type SessionType = 'rbt_25' | 'rbt_50';

// Enhanced types
interface MessageThread {
  id: string;
  patientName: string;
  patientInitials: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  starred: boolean;
  pinned: boolean;
  onlineStatus: 'online' | 'idle' | 'away' | 'offline';
  specialty: string;
  credentials: string[];
  officeHours: string;
  avgResponse: string;
  lastActive: string;
  hasAttachments: boolean;
  archived: boolean;
}

interface Message {
  id: string;
  threadId: string;
  sender: 'coach' | 'Client';
  content: string;
  timestamp: Date;
  senderName?: string;
  credentials?: string[];
  attachments?: Array<{
    id: string;
    type: 'file' | 'image' | 'video' | 'audio' | 'document' | 'pdf';
    name: string;
    size: string;
    url?: string;
    preview?: string;
  }>;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  reactions?: Array<{
    type: string;
    users: string[];
    count: number;
  }>;
  mentions?: string[];
  tasks?: string[];
  readBy?: Array<{
    userId: string;
    timestamp: Date;
  }>;
}

interface SessionPrepItem {
  id: string;
  text: string;
  completed: boolean;
}

interface SessionHistoryItem {
  id: string;
  date: string;
  change: string;
  source: string;
  coach: string;
  type: '+' | '-';
}

interface PastSessionFile {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'doc';
  size: string;
  date: string;
  sessionIndex: string;
}

// Enhanced mock data - FIXED: Remove "Dr." and "BCBA, M.Ed" and message counts
const mockThreads: MessageThread[] = [
  {
    id: 'thread-1',
    patientName: 'Sarah',
    patientInitials: 'S',
    lastMessage: 'I reviewed Maya\'s latest progress report. The communication strategies are showing excellent results!',
    timestamp: '2 min ago',
    unread: true,
    starred: false,
    pinned: true,
    onlineStatus: 'online',
    specialty: 'Registered Behavior Technician',
    credentials: ['RBT'],
    officeHours: '9-6p PST',
    avgResponse: 'Typical reply: 24–48 h',
    lastActive: 'Active now',
    hasAttachments: true,
    archived: false
  },
  {
    id: 'thread-2',
    patientName: 'Care Coordinator',
    patientInitials: 'CC',
    lastMessage: 'Your next session is confirmed for Thursday at 2 PM.',
    timestamp: '1 hour ago',
    unread: false,
    starred: true,
    pinned: false,
    onlineStatus: 'idle',
    specialty: 'Care Coordination Team',
    credentials: ['RBT', 'Certified'],
    officeHours: '9-6p PST',
    avgResponse: 'Typical reply: 24–48 h',
    lastActive: '30 minutes ago',
    hasAttachments: false,
    archived: false
  }
];

const mockMessages: Record<string, Message[]> = {
  'thread-1': [
    {
      id: 'msg-1',
      threadId: 'thread-1',
      sender: 'coach',
      content: 'Good morning! I wanted to follow up on Maya\'s progress with the communication goals.',
      timestamp: new Date('2024-12-16T09:00:00'),
      senderName: 'Sarah',
      credentials: ['RBT'],
      deliveryStatus: 'delivered',
      attachments: [
        {
          id: 'att-1',
          type: 'document',
          name: 'Progress_Report_Maya_Dec2024.pdf',
          size: '2.3 MB',
          url: '#'
        }
      ],
      reactions: [
        { type: '👍', users: ['Client'], count: 1 },
        { type: '❤️', users: ['Client'], count: 1 }
      ]
    },
    {
      id: 'msg-2',
      threadId: 'thread-1',
      sender: 'Client',
      content: 'Hi Sarah! Maya has been doing incredibly well with the visual schedule. Thank you for the detailed report!',
      timestamp: new Date('2024-12-16T09:15:00'),
      deliveryStatus: 'read',
      readBy: [
        { userId: 'coach-1', timestamp: new Date('2024-12-16T09:20:00') }
      ]
    }
  ]
};

// Mock scheduled appointments for calendar view - Enhanced with insurance info
const mockAppointments = [
  {
    id: '1',
    title: '50-min Comprehensive Session with RBT Coach',
    date: '2024-12-18',
    time: '2:00 PM - 2:50 PM',
    type: 'rbt_50',
    status: 'confirmed',
    provider: 'Sarah',
    notes: 'Focus on communication goals and social skills',
    insuranceStatus: 'verified',
    copay: 25,
    authorizationNumber: 'AUTH-2024-001',
    canReschedule: true,
    rescheduleDeadline: '2024-12-17T14:00:00'
  },
  {
    id: '2', 
    title: 'Care Plan Review',
    date: '2024-12-20',
    time: '10:00 AM - 10:30 AM',
    type: 'consultation',
    status: 'confirmed',
    provider: 'Care Coordinator',
    notes: 'Monthly progress review and goal adjustments',
    insuranceStatus: 'verified',
    copay: 0,
    canReschedule: true,
    rescheduleDeadline: '2024-12-19T10:00:00'
  },
  {
    id: '3',
    title: '25-min Focus Session with RBT Coach',
    date: '2024-12-25',
    time: '1:00 PM - 1:25 PM',
    type: 'rbt_25',
    status: 'pending_insurance',
    provider: 'Sarah',
    notes: 'Follow-up on behavior intervention strategies',
    insuranceStatus: 'pending',
    copay: 25,
    canReschedule: false,
    rescheduleDeadline: null
  }
];

// Analytics helper
const trackEvent = (eventName: string, properties: Record<string, unknown> = {}) => {
  try {
    // In real app, this would fire to analytics service
    const win = window as Window & { gtag?: (command: string, event: string, params: Record<string, unknown>) => void };
    if (typeof window !== 'undefined' && win.gtag) {
      win.gtag('event', eventName, properties);
    }
  } catch (error) {
  }
};

export default function CarePage({ 
  userTier = null, 
  childName = 'your child', 
  onNavigate, 
  onPaywallTrigger,
  connectorData,
  setActiveTab,
  userData,
  freeMessageCount = 0,
  setFreeMessageCount
}: CarePageProps) {
  useAuditedAction('care_plan');
  const tier = useTierLite();
  const isPro = tier === 'pro';
  const isCore = tier === 'core';
  const isStarter = tier === 'starter';
  
  // Core state
  const [activeView, setActiveView] = useState<CareView>('messages');
  
  // Render schedule view with enhanced components
  const renderScheduleView = () => {
    return (
      <EnhancedScheduleView
        userTier={tier}
        isStarter={isStarter}
        onPaywallTrigger={onPaywallTrigger}
        mockAppointments={mockAppointments}
      />
    );
  };

  // Main render
  return (
    <div
      className="min-h-screen bg-white dark:bg-slate-950 flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <GlobalDisclaimer />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E8E4DF] dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate?.('home')}
            className="text-[#5A6B7A] hover:text-[#1B2733] dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          <h1 className="text-lg sm:text-xl font-semibold text-[#1B2733] dark:text-white">Care</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E8E4DF] dark:border-slate-800 bg-white dark:bg-slate-950 px-6">
        {[
          { id: 'messages', label: 'Messages', icon: MessageCircle },
          { id: 'schedule', label: 'Schedule', icon: Calendar },
          { id: 'sessions', label: 'Sessions', icon: Video },
          { id: 'past-sessions', label: 'Past Sessions', icon: FileText }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as CareView)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeView === id
                ? 'border-[#6B9080] text-[#6B9080] dark:text-primary'
                : 'border-transparent text-[#5A6B7A] hover:text-[#1B2733] dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'schedule' && renderScheduleView()}
        {activeView === 'messages' && (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-slate-400 dark:text-[#5A6B7A] mb-4" />
              <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">Enhanced Messages</h3>
              <p className="text-[#5A6B7A] dark:text-slate-400">Professional messaging with providers</p>
            </div>
          </div>
        )}
        {activeView === 'sessions' && (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <Video className="mx-auto h-12 w-12 text-slate-400 dark:text-[#5A6B7A] mb-4" />
              <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">Session Management</h3>
              <p className="text-[#5A6B7A] dark:text-slate-400">Manage your therapy sessions</p>
            </div>
          </div>
        )}
        {activeView === 'past-sessions' && (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-400 dark:text-[#5A6B7A] mb-4" />
              <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-2">Session History</h3>
              <p className="text-[#5A6B7A] dark:text-slate-400">View past session records and files</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
