// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Chat History Component
 *
 * Displays past AI conversations with the ability to:
 * - View conversation list with previews
 * - Search/filter conversations
 * - Resume a past conversation
 * - Delete conversations
 */

import React, { useState, useEffect } from 'react';
import { Clock, Search, Trash2, MessageSquare, ChevronRight, X } from 'lucide-react';
import { EmptyConversations, EmptySearchResults } from './ui/empty-state';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';

export interface ConversationSummary {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
  currentConversationId?: string;
  className?: string;
}

export function ChatHistory({
  isOpen,
  onClose,
  onSelectConversation,
  currentConversationId,
  className
}: ChatHistoryProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load conversations from localStorage
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    try {
      const allConversations: ConversationSummary[] = [];

      // Scan localStorage for conversation keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('aminy-conversation-')) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              const conversationId = key.replace('aminy-conversation-', '');

              // Extract first user message as title/preview
              const messages = parsed.messages || [];
              const firstUserMessage = messages.find((m: { role: string; content?: string }) => m.role === 'user');
              const lastMessage = messages[messages.length - 1];

              allConversations.push({
                id: conversationId,
                title: parsed.title || (firstUserMessage?.content?.slice(0, 50) + '...') || 'New Conversation',
                preview: lastMessage?.content?.slice(0, 100) || 'No messages yet',
                messageCount: messages.length,
                createdAt: new Date(parsed.createdAt || parsed.lastUpdated || Date.now()),
                updatedAt: new Date(parsed.lastUpdated || Date.now())
              });
            } catch (e) {
              // Skip malformed data
            }
          }
        }
      }

      // Sort by most recent
      allConversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setConversations(allConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen]);

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Delete a conversation
  const handleDelete = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();

    if (confirm('Delete this conversation? This cannot be undone.')) {
      localStorage.removeItem(`aminy-conversation-${conversationId}`);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    }
  };

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm',
        className
      )}
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Chat History
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-800 border-0 rounded-lg text-sm focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto mb-2" />
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            searchQuery ? (
              <EmptySearchResults
                searchTerm={searchQuery}
                onClear={() => setSearchQuery('')}
              />
            ) : (
              <EmptyConversations
                onStartChat={onClose}
              />
            )
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredConversations.map(conversation => (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors',
                    currentConversationId === conversation.id && 'bg-accent/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {conversation.title}
                        </h3>
                        {currentConversationId === conversation.id && (
                          <span className="px-2 py-0.5 text-xs bg-accent/10 text-accent rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {conversation.preview}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                        <span>{formatRelativeTime(conversation.updatedAt)}</span>
                        <span>•</span>
                        <span>{conversation.messageCount} messages</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, conversation.id)}
                        className="w-8 h-8 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default ChatHistory;
