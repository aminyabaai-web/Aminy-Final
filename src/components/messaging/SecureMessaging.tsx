// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Secure Messaging System
 *
 * One Medical-inspired messaging interface for parent-provider communication
 * Features: Thread list, real-time messaging, attachments, read receipts
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  Paperclip,
  Image,
  FileText,
  Mic,
  ChevronLeft,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  Shield,
  X,
  Plus,
  Search,
  Bell,
  BellOff,
  Trash2,
  Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../EmptyState';
import { logMessageSent, logMessageRead } from '../../lib/audit-logger';
import { supabase } from '../../utils/supabase/client';
import { isDemoMode } from '../../lib/demo-seed';

// Types
interface Provider {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  photoUrl?: string;
  isVerified: boolean;
  isOnline?: boolean;
}

interface Attachment {
  id: string;
  type: 'image' | 'document' | 'voice';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderType: 'parent' | 'provider';
  content: string;
  attachments: Attachment[];
  createdAt: string;
  readAt?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface MessageThread {
  id: string;
  provider: Provider;
  childId: string;
  childName: string;
  lastMessage?: Message;
  unreadCount: number;
  isMuted: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mock data
const MOCK_THREADS: MessageThread[] = [
  {
    id: 'thread_1',
    provider: {
      id: 'prov_1',
      name: 'Dr. Sarah Johnson',
      credentials: 'BCBA, LBA',
      specialty: 'Applied Behavior Analysis',
      isVerified: true,
      isOnline: true
    },
    childId: 'child_1',
    childName: 'Max',
    lastMessage: {
      id: 'msg_1',
      threadId: 'thread_1',
      senderId: 'prov_1',
      senderType: 'provider',
      content: 'Great progress on the morning routine today! Let\'s discuss next steps.',
      attachments: [],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'delivered'
    },
    unreadCount: 1,
    isMuted: false,
    isArchived: false,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'thread_2',
    provider: {
      id: 'prov_2',
      name: 'Emily Chen',
      credentials: 'MS, CCC-SLP',
      specialty: 'Speech-Language Pathology',
      isVerified: true,
      isOnline: false
    },
    childId: 'child_1',
    childName: 'Max',
    lastMessage: {
      id: 'msg_2',
      threadId: 'thread_2',
      senderId: 'user_1',
      senderType: 'parent',
      content: 'Thank you for the session today!',
      attachments: [],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      readAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      status: 'read'
    },
    unreadCount: 0,
    isMuted: false,
    isArchived: false,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'thread_3',
    provider: {
      id: 'system',
      name: 'Aminy Care Team',
      credentials: '',
      specialty: 'Support',
      isVerified: true,
      isOnline: true
    },
    childId: 'child_1',
    childName: 'Max',
    lastMessage: {
      id: 'msg_3',
      threadId: 'thread_3',
      senderId: 'system',
      senderType: 'provider',
      content: 'Welcome to Aminy! We\'re here to help you on your journey.',
      attachments: [],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'read'
    },
    unreadCount: 0,
    isMuted: false,
    isArchived: false,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  thread_1: [
    {
      id: 'msg_1_1',
      threadId: 'thread_1',
      senderId: 'user_1',
      senderType: 'parent',
      content: 'Hi Dr. Johnson, I wanted to ask about the behavior plan we discussed.',
      attachments: [],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      readAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      status: 'read'
    },
    {
      id: 'msg_1_2',
      threadId: 'thread_1',
      senderId: 'prov_1',
      senderType: 'provider',
      content: 'Of course! I\'d be happy to discuss. The key focus areas are:\n\n1. Morning transition routine\n2. Reducing screen time before bed\n3. Using the visual schedule consistently',
      attachments: [],
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      status: 'read'
    },
    {
      id: 'msg_1_3',
      threadId: 'thread_1',
      senderId: 'user_1',
      senderType: 'parent',
      content: 'That makes sense. We\'ve been trying the visual schedule and it\'s helping!',
      attachments: [],
      createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
      readAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'read'
    },
    {
      id: 'msg_1',
      threadId: 'thread_1',
      senderId: 'prov_1',
      senderType: 'provider',
      content: 'Great progress on the morning routine today! Let\'s discuss next steps.',
      attachments: [],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'delivered'
    }
  ]
};

// Supabase row shapes (no generated types available)
interface SupabaseProviderRow {
  id: string;
  full_name: string;
  credentials: string;
  specialty: string;
  photo_url?: string;
  is_verified: boolean;
  is_online: boolean;
}

interface SupabaseMessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_type: 'parent' | 'provider';
  content: string;
  attachments?: Attachment[];
  created_at: string;
  read_at?: string;
  status: string;
}

interface SupabaseThreadRow {
  id: string;
  child_id: string;
  child_name: string;
  unread_count: number;
  is_muted: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  provider: SupabaseProviderRow;
  last_message: SupabaseMessageRow[];
}

interface SecureMessagingProps {
  userId: string;
  userRole: 'parent' | 'provider';
  onBack?: () => void;
  /** Navigate to another screen (e.g. the provider marketplace). Optional so the
   *  component still renders standalone; falls back to a Coming-soon toast. */
  onNavigate?: (screen: string) => void;
}

export function SecureMessaging({ userId, userRole, onBack, onNavigate }: SecureMessagingProps) {
  // Real accounts start empty and load their own threads from Supabase. Demo
  // mode seeds sample conversations so prospect walkthroughs look complete.
  const demo = isDemoMode();
  const [threads, setThreads] = useState<MessageThread[]>(demo ? MOCK_THREADS : []);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showThreadMenu, setShowThreadMenu] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load threads from Supabase on mount; seed MOCK_THREADS only in demo mode
  useEffect(() => {
    async function loadThreads() {
      try {
        setThreadsLoading(true);
        const { data, error } = await supabase
          .from('message_threads')
          .select(`
            id,
            child_id,
            child_name,
            unread_count,
            is_muted,
            is_archived,
            created_at,
            updated_at,
            provider:provider_profiles(
              id,
              full_name,
              credentials,
              specialty,
              photo_url,
              is_verified,
              is_online
            ),
            last_message:messages(
              id,
              thread_id,
              sender_id,
              sender_type,
              content,
              created_at,
              read_at,
              status
            )
          `)
          .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const rows = data as unknown as SupabaseThreadRow[];
          const mapped: MessageThread[] = rows.map((t) => ({
            id: t.id,
            provider: {
              id: t.provider?.id || 'unknown',
              name: t.provider?.full_name || 'Provider',
              credentials: t.provider?.credentials || '',
              specialty: t.provider?.specialty || '',
              photoUrl: t.provider?.photo_url,
              isVerified: t.provider?.is_verified ?? true,
              isOnline: t.provider?.is_online ?? false,
            },
            childId: t.child_id || '',
            childName: t.child_name || '',
            lastMessage: t.last_message?.[0]
              ? {
                  id: t.last_message[0].id,
                  threadId: t.last_message[0].thread_id,
                  senderId: t.last_message[0].sender_id,
                  senderType: t.last_message[0].sender_type,
                  content: t.last_message[0].content,
                  attachments: [],
                  createdAt: t.last_message[0].created_at,
                  readAt: t.last_message[0].read_at,
                  status: (t.last_message[0].status || 'delivered') as Message['status'],
                }
              : undefined,
            unreadCount: t.unread_count || 0,
            isMuted: t.is_muted || false,
            isArchived: t.is_archived || false,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          }));
          setThreads(mapped);
        } else if (demo) {
          // Demo mode only: seed sample threads so walkthroughs look complete.
          setThreads(MOCK_THREADS);
        } else {
          // Real accounts with no conversations get an honest empty state.
          setThreads([]);
        }
      } catch (err) {
        console.warn('SecureMessaging: Failed to load threads from Supabase', err);
        setThreads(demo ? MOCK_THREADS : []);
      } finally {
        setThreadsLoading(false);
      }
    }

    loadThreads();
  }, [userId, demo]);

  // Load messages when thread is selected — Supabase first; MOCK_MESSAGES only in demo mode
  useEffect(() => {
    if (!selectedThread) return;

    async function loadMessages() {
      try {
        setMessagesLoading(true);
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', selectedThread!.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const rows = data as unknown as SupabaseMessageRow[];
          setMessages(
            rows.map((m) => ({
              id: m.id,
              threadId: m.thread_id,
              senderId: m.sender_id,
              senderType: m.sender_type,
              content: m.content,
              attachments: m.attachments || [],
              createdAt: m.created_at,
              readAt: m.read_at,
              status: (m.status || 'delivered') as Message['status'],
            }))
          );
        } else if (demo) {
          // Demo mode only: show the seeded conversation for this sample thread.
          setMessages(MOCK_MESSAGES[selectedThread!.id] || []);
        } else {
          // Real accounts with no message history start empty.
          setMessages([]);
        }
      } catch (err) {
        console.warn('SecureMessaging: Failed to load messages from Supabase', err);
        setMessages(demo ? (MOCK_MESSAGES[selectedThread!.id] || []) : []);
      } finally {
        setMessagesLoading(false);
      }
    }

    loadMessages();

    // Mark as read
    if (selectedThread.unreadCount > 0) {
      setThreads(prev =>
        prev.map(t =>
          t.id === selectedThread.id ? { ...t, unreadCount: 0 } : t
        )
      );
    }
  }, [selectedThread]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format time
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    const message: Message = {
      id: `msg_${Date.now()}`,
      threadId: selectedThread.id,
      senderId: userId,
      senderType: userRole,
      content: newMessage.trim(),
      attachments: [],
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    // Optimistically add message
    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Log the message
    await logMessageSent(
      userId,
      userRole,
      selectedThread.id,
      message.id,
      selectedThread.provider.id,
      false
    );

    // Simulate sending
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => m.id === message.id ? { ...m, status: 'sent' } : m)
      );
    }, 500);

    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => m.id === message.id ? { ...m, status: 'delivered' } : m)
      );
    }, 1500);

    // Update thread's last message
    setThreads(prev =>
      prev.map(t =>
        t.id === selectedThread.id
          ? { ...t, lastMessage: message, updatedAt: new Date().toISOString() }
          : t
      )
    );
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!selectedThread) return;
    setThreads(prev =>
      prev.map(t =>
        t.id === selectedThread.id ? { ...t, isMuted: !t.isMuted } : t
      )
    );
    setShowThreadMenu(false);
  };

  // Navigate to the provider marketplace to start a new conversation
  const handleFindProvider = () => {
    if (onNavigate) {
      onNavigate('marketplace');
    } else {
      toast('Starting a new conversation is coming soon.');
    }
  };

  // Archive the selected thread (hides it from the active list via filteredThreads)
  const archiveThread = () => {
    if (!selectedThread) return;
    setThreads(prev =>
      prev.map(t =>
        t.id === selectedThread.id ? { ...t, isArchived: true } : t
      )
    );
    setShowThreadMenu(false);
    setSelectedThread(null);
    toast('Conversation archived.');
  };

  // Filter threads
  const filteredThreads = threads.filter(t => {
    if (t.isArchived) return false;
    if (!searchQuery) return true;
    return (
      t.provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Total unread count
  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  // Thread List View
  if (!selectedThread) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-[#E8E4DF] dark:border-slate-700 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-[#F0EDE8] dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-[#1B2733] dark:text-white">
                    Messages
                  </h1>
                  <h2 className="sr-only">Message overview</h2>
                  <h3 className="sr-only">Threads and recent conversations</h3>
                  {totalUnread > 0 && (
                    <p className="text-sm text-[#6B9080]">{totalUnread} unread</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 rounded-full hover:bg-[#F0EDE8] dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Search className="w-5 h-5 text-[#5A6B7A]" />
                </button>
                <button
                  onClick={handleFindProvider}
                  aria-label="New conversation"
                  className="p-2 rounded-full hover:bg-[#F0EDE8] dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 text-[#5A6B7A]" />
                </button>
              </div>
            </div>

            {/* Search */}
            {showSearch && (
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F0EDE8] dark:bg-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Thread List */}
        <div className="max-w-2xl mx-auto">
          {filteredThreads.length === 0 ? (
            <EmptyState
              IconComponent={MessageCircle}
              title="No messages yet"
              description="Messages from your providers will appear here. Book a session to get started."
              actionText="Find a Provider"
              onAction={handleFindProvider}
            />
          ) : (
            filteredThreads.map(thread => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className="w-full p-4 border-b border-[#E8E4DF] dark:border-slate-700 hover:bg-[#FAF7F2] dark:hover:bg-slate-800 transition-colors flex items-start gap-3 text-left min-h-[72px]"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-lg">
                      {thread.provider.name.charAt(0)}
                    </span>
                  </div>
                  {thread.provider.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1B2733] dark:text-white truncate">
                        {thread.provider.name}
                      </span>
                      {thread.provider.isVerified && (
                        <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-sm text-[#8A9BA8] flex-shrink-0">
                      {thread.lastMessage && formatTime(thread.lastMessage.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] truncate mt-0.5">
                    {thread.lastMessage?.senderType === 'parent' && 'You: '}
                    {thread.lastMessage?.content || 'Start a conversation'}
                  </p>
                </div>

                {/* Unread badge */}
                {thread.unreadCount > 0 && (
                  <div className="flex-shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm text-white font-medium">{thread.unreadCount}</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Message Thread View
  return (
    <div className="min-h-screen bg-mist dark:bg-slate-900 flex flex-col">
      {/* Thread Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-[#E8E4DF] dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedThread(null)}
              className="p-2 rounded-full hover:bg-[#F0EDE8] dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Provider Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {selectedThread.provider.name.charAt(0)}
                  </span>
                </div>
                {selectedThread.provider.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#1B2733] dark:text-white truncate">
                    {selectedThread.provider.name}
                  </span>
                  {selectedThread.provider.isVerified && (
                    <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-[#5A6B7A] truncate">
                  {selectedThread.provider.credentials} • {selectedThread.provider.specialty}
                </p>
              </div>
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowThreadMenu(!showThreadMenu)}
                className="p-2 rounded-full hover:bg-[#F0EDE8] dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <MoreVertical className="w-5 h-5 text-[#5A6B7A]" />
              </button>

              {showThreadMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowThreadMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#E8E4DF] dark:border-slate-700 z-20 py-2">
                    <button
                      onClick={toggleMute}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#FAF7F2] dark:hover:bg-slate-700 text-left"
                    >
                      {selectedThread.isMuted ? (
                        <>
                          <Bell className="w-4 h-4 text-[#5A6B7A]" />
                          <span className="text-sm">Unmute</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="w-4 h-4 text-[#5A6B7A]" />
                          <span className="text-sm">Mute</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={archiveThread}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#FAF7F2] dark:hover:bg-slate-700 text-left"
                    >
                      <Archive className="w-4 h-4 text-[#5A6B7A]" />
                      <span className="text-sm">Archive</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
          {messages.map((message, index) => {
            const isOwn = message.senderType === userRole;
            const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                {!isOwn && showAvatar && (
                  <div className="w-8 h-8 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">
                      {selectedThread.provider.name.charAt(0)}
                    </span>
                  </div>
                )}
                {!isOwn && !showAvatar && <div className="w-8" />}

                {/* Message Bubble */}
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`
                      px-4 py-2.5 rounded-2xl
                      ${isOwn
                        ? 'bg-primary text-white rounded-tr-md'
                        : 'bg-white dark:bg-slate-800 text-[#1B2733] dark:text-white rounded-tl-md shadow-sm'
                      }
                    `}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Message Meta */}
                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                    <span className="text-sm text-[#8A9BA8]">
                      {formatTime(message.createdAt)}
                    </span>
                    {isOwn && (
                      <span className="text-[#8A9BA8]">
                        {message.status === 'sending' && <Clock className="w-3 h-3" />}
                        {message.status === 'sent' && <Check className="w-3 h-3" />}
                        {message.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                        {message.status === 'read' && <CheckCheck className="w-3 h-3 text-primary" />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="px-4 py-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{selectedThread.provider.name.split(' ')[0]} is typing...</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-800 border-t border-[#E8E4DF] dark:border-slate-700 sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-end gap-2">
            {/* Attachment Button */}
            <button
              onClick={() => toast('Attachments are coming soon.')}
              aria-label="Attach a file"
              className="p-2 rounded-full hover:bg-[#F0EDE8] dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
            >
              <Paperclip className="w-5 h-5 text-[#5A6B7A]" />
            </button>

            {/* Input */}
            <div className="flex-1 bg-[#F0EDE8] dark:bg-slate-700 rounded-2xl px-4 py-2">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                rows={1}
                className="w-full bg-transparent resize-none focus:outline-none text-sm min-h-[40px] max-h-[120px]"
                style={{ lineHeight: '24px', paddingTop: '8px' }}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className={`
                p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 transition-colors
                ${newMessage.trim()
                  ? 'bg-primary text-white hover:bg-primary'
                  : 'bg-[#F0EDE8] dark:bg-slate-700 text-[#8A9BA8]'
                }
              `}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecureMessaging;
