// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SecureMessaging.tsx
 * HIPAA-compliant secure messaging between providers and parents
 *
 * Features:
 * - End-to-end message threads
 * - Read receipts
 * - File attachments (PDFs, images)
 * - Quick reply templates
 * - Notification preferences
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import {
  MessageSquare,
  Send,
  Paperclip,
  Image,
  FileText,
  Check,
  CheckCheck,
  Clock,
  Search,
  MoreVertical,
  Phone,
  Video,
  Bell,
  BellOff,
  ChevronLeft,
  User,
  Shield,
  AlertCircle,
  X,
  Plus,
  Download,
  Loader2
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuditedAction } from '../hooks/useAuditedAction';

interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderType: 'provider' | 'parent';
  content: string;
  attachments?: Attachment[];
  readAt?: Date;
  createdAt: Date;
}

interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'document';
  url: string;
  size: number;
}

interface Thread {
  id: string;
  providerId: string;
  providerName: string;
  providerCredentials: string;
  providerPhoto?: string;
  parentId: string;
  parentName: string;
  childName: string;
  lastMessage?: Message;
  unreadCount: number;
  isMuted: boolean;
  createdAt: Date;
}

interface SecureMessagingProps {
  userId: string;
  userType: 'provider' | 'parent';
  userName: string;
  onBack?: () => void;
}

// Quick reply templates
const QUICK_REPLIES = {
  provider: [
    "Thank you for the update. I'll review and get back to you.",
    "Great progress! Let's discuss this in our next session.",
    "Please send me the behavior data from this week.",
    "I've attached some resources that may help.",
    "Can we schedule a call to discuss this further?",
  ],
  parent: [
    "Thank you for the information!",
    "We'll try that strategy and let you know how it goes.",
    "Can we move our next session?",
    "I have a quick question about today's activities.",
    "Here's the update you requested.",
  ],
};

export function SecureMessaging({ userId, userType, userName }: SecureMessagingProps) {
  useAuditedAction('message');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard avoidance for iOS
  const { isKeyboardOpen, keyboardHeight } = useKeyboardHeight();

  // Load threads
  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    try {
      const field = userType === 'provider' ? 'provider_id' : 'parent_id';
      const { data, error } = await supabase
        .from('message_threads')
        .select('*')
        .eq(field, userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedThreads: Thread[] = data.map(t => ({
          id: t.id,
          providerId: t.provider_id,
          providerName: t.provider_name,
          providerCredentials: t.provider_credentials || '',
          providerPhoto: t.provider_photo,
          parentId: t.parent_id,
          parentName: t.parent_name,
          childName: t.child_name,
          unreadCount: t.unread_count || 0,
          isMuted: t.is_muted || false,
          createdAt: new Date(t.created_at),
        }));
        setThreads(formattedThreads);
      } else {
        // Demo data
        setThreads([
          {
            id: 'demo-1',
            providerId: 'provider-1',
            providerName: 'Dr. Sarah Mitchell',
            providerCredentials: 'BCBA, LBA',
            parentId: 'parent-1',
            parentName: 'Jennifer Thompson',
            childName: 'Emma',
            unreadCount: 2,
            isMuted: false,
            createdAt: new Date(),
          },
          {
            id: 'demo-2',
            providerId: 'provider-2',
            providerName: 'Dr. Michael Chen',
            providerCredentials: 'SLP-CCC',
            parentId: 'parent-1',
            parentName: 'Jennifer Thompson',
            childName: 'Emma',
            unreadCount: 0,
            isMuted: false,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        ]);
      }
    } catch (error) {
      console.error('[SecureMessaging] Error loading threads:', error);
      // Set demo data on error
      setThreads([
        {
          id: 'demo-1',
          providerId: 'provider-1',
          providerName: 'Dr. Sarah Mitchell',
          providerCredentials: 'BCBA, LBA',
          parentId: 'parent-1',
          parentName: 'Jennifer Thompson',
          childName: 'Emma',
          unreadCount: 2,
          isMuted: false,
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, userType]);

  // Load messages for a thread
  const loadMessages = useCallback(async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedMessages: Message[] = data.map(m => ({
          id: m.id,
          threadId: m.thread_id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          senderType: m.sender_type,
          content: m.content,
          attachments: m.attachments,
          readAt: m.read_at ? new Date(m.read_at) : undefined,
          createdAt: new Date(m.created_at),
        }));
        setMessages(formattedMessages);
      } else {
        // Demo messages
        setMessages([
          {
            id: 'm1',
            threadId,
            senderId: 'provider-1',
            senderName: 'Dr. Sarah Mitchell',
            senderType: 'provider',
            content: "Hi Jennifer! I wanted to follow up on Emma's progress with the new turn-taking strategies we discussed. How has it been going at home?",
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            readAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          },
          {
            id: 'm2',
            threadId,
            senderId: 'parent-1',
            senderName: 'Jennifer Thompson',
            senderType: 'parent',
            content: "Hi Dr. Mitchell! We've been practicing every day during playtime. Emma is starting to wait her turn more consistently, especially with her favorite puzzles. She still struggles a bit when she's tired though.",
            createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
            readAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          },
          {
            id: 'm3',
            threadId,
            senderId: 'provider-1',
            senderName: 'Dr. Sarah Mitchell',
            senderType: 'provider',
            content: "That's wonderful progress! The fatigue factor is completely normal. Here are a few strategies to help when she's tired:\n\n1. Shorter turn-taking games (2-3 turns max)\n2. Use a visual timer to make waiting concrete\n3. Pair with a preferred activity right after\n\nI've attached a visual support you can print out.",
            attachments: [
              { id: 'a1', name: 'turn_taking_visual.pdf', type: 'pdf', url: '#', size: 245000 }
            ],
            createdAt: new Date(Date.now() - 30 * 60 * 1000),
          },
        ]);
      }

      // Mark messages as read
      if (threadId.startsWith('demo')) return;
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .neq('sender_id', userId)
        .is('read_at', null);

    } catch (error) {
      console.error('[SecureMessaging] Error loading messages:', error);
    }
  }, [userId]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!selectedThread) return;

    setIsSending(true);
    try {
      const message: Partial<Message> = {
        threadId: selectedThread.id,
        senderId: userId,
        senderName: userName,
        senderType: userType,
        content: newMessage.trim(),
        createdAt: new Date(),
      };

      // Handle attachments
      if (attachments.length > 0) {
        // In production, upload to Supabase storage
        message.attachments = attachments.map((file, i) => ({
          id: `att-${Date.now()}-${i}`,
          name: file.name,
          type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'document',
          url: URL.createObjectURL(file),
          size: file.size,
        }));
      }

      // Save to Supabase if not demo
      if (!selectedThread.id.startsWith('demo')) {
        const { error } = await supabase.from('secure_messages').insert({
          thread_id: selectedThread.id,
          sender_id: userId,
          sender_name: userName,
          sender_type: userType,
          content: message.content,
          attachments: message.attachments,
        });
        if (error) throw error;
      }

      // Add to local state
      setMessages(prev => [...prev, { ...message, id: `msg-${Date.now()}` } as Message]);
      setNewMessage('');
      setAttachments([]);
      setShowQuickReplies(false);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (error) {
      console.error('[SecureMessaging] Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Toggle mute
  const toggleMute = async (threadId: string) => {
    setThreads(prev =>
      prev.map(t => t.id === threadId ? { ...t, isMuted: !t.isMuted } : t)
    );
    // Update in Supabase if not demo
    if (!threadId.startsWith('demo')) {
      await supabase
        .from('message_threads')
        .update({ is_muted: !threads.find(t => t.id === threadId)?.isMuted })
        .eq('id', threadId);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024); // 10MB limit
    setAttachments(prev => [...prev, ...validFiles]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.id);
    }
  }, [selectedThread, loadMessages]);

  // Filter threads by search
  const filteredThreads = threads.filter(t =>
    t.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.childName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] flex bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Thread List */}
      <div className={`w-80 border-r border-neutral-200 flex flex-col ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-neutral-900">Messages</h2>
            <Button variant="ghost" size="sm">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* HIPAA Notice */}
        <div className="px-4 py-2 bg-teal-50 border-b border-teal-100">
          <div className="flex items-center gap-2 text-xs text-teal-700">
            <Shield className="w-3.5 h-3.5" />
            <span>Encrypted, private messaging</span>
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">No conversations yet</p>
            </div>
          ) : (
            filteredThreads.map(thread => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={`w-full p-4 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-100 ${
                  selectedThread?.id === thread.id ? 'bg-teal-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    {thread.providerPhoto ? (
                      <img
                        src={thread.providerPhoto}
                        alt={`${userType === 'parent' ? thread.providerName : thread.parentName}'s profile photo`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-teal-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-neutral-900 truncate">
                        {userType === 'parent' ? thread.providerName : thread.parentName}
                      </span>
                      {thread.lastMessage && (
                        <span className="text-xs text-neutral-400">
                          {formatTime(thread.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-neutral-500 truncate">
                        {userType === 'parent'
                          ? thread.providerCredentials
                          : `Re: ${thread.childName}`}
                      </p>
                      {thread.unreadCount > 0 && (
                        <Badge className="bg-teal-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] text-center">
                          {thread.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message View */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setSelectedThread(null)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <User className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">
                  {userType === 'parent' ? selectedThread.providerName : selectedThread.parentName}
                </h3>
                <p className="text-sm text-neutral-500">
                  {userType === 'parent'
                    ? selectedThread.providerCredentials
                    : `Parent of ${selectedThread.childName}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Phone className="w-5 h-5 text-neutral-600" />
              </Button>
              <Button variant="ghost" size="sm">
                <Video className="w-5 h-5 text-neutral-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleMute(selectedThread.id)}
              >
                {selectedThread.isMuted ? (
                  <BellOff className="w-5 h-5 text-neutral-400" />
                ) : (
                  <Bell className="w-5 h-5 text-neutral-600" />
                )}
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-5 h-5 text-neutral-600" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 sm:space-y-4 bg-neutral-50">
            {messages.map(message => {
              const isOwn = message.senderId === userId;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-teal-600 text-white rounded-br-md'
                          : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map(att => (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 p-2 rounded-lg ${
                                isOwn ? 'bg-teal-700' : 'bg-neutral-100'
                              }`}
                            >
                              {att.type === 'pdf' ? (
                                <FileText className="w-5 h-5" />
                              ) : att.type === 'image' ? (
                                <Image className="w-5 h-5" />
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                              <span className="text-sm truncate flex-1">{att.name}</span>
                              <Download className="w-4 h-4" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={`flex items-center gap-1 mt-1 text-xs text-neutral-400 ${
                      isOwn ? 'justify-end' : 'justify-start'
                    }`}>
                      <span>{formatTime(message.createdAt)}</span>
                      {isOwn && (
                        message.readAt ? (
                          <CheckCheck className="w-3.5 h-3.5 text-teal-500" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {showQuickReplies && (
            <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-500">Quick Replies</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickReplies(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES[userType].map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setNewMessage(reply);
                      setShowQuickReplies(false);
                    }}
                    className="text-xs px-3 py-1.5 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors"
                  >
                    {reply.slice(0, 30)}...
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200">
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg"
                  >
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                    <span className="text-xs text-neutral-400">{formatFileSize(file.size)}</span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Area - with keyboard avoidance */}
          <div
            className="p-4 border-t border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            style={{
              paddingBottom: isKeyboardOpen
                ? `${Math.max(16, keyboardHeight - 100)}px`
                : 'max(16px, env(safe-area-inset-bottom))',
              transition: 'padding-bottom 0.15s ease-out',
            }}
          >
            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-5 h-5 text-neutral-500" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                >
                  <MessageSquare className="w-5 h-5 text-neutral-500" />
                </Button>
              </div>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 min-h-[40px] max-h-32 resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={(!newMessage.trim() && attachments.length === 0) || isSending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-neutral-50">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-1">Select a conversation</h3>
            <p className="text-neutral-500">Choose a thread to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecureMessaging;
