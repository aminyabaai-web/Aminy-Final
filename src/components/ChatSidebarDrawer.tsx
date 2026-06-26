// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * ChatSidebarDrawer — Claude.ai-style left drawer.
 *
 * Slides in from the left, lists past conversations grouped by recency
 * (Today / Yesterday / Last 7 days / Last 30 days / Older), supports
 * search, "New chat", and per-conversation delete.
 *
 * Replaces the centered ChatHistory modal. Used inside AskAminyChatScreen.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Trash2, MessageSquare, X } from 'lucide-react';

export interface ConversationSummary {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  updatedAt: Date;
}

interface ChatSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  currentConversationId?: string;
}

export function ChatSidebarDrawer({
  isOpen,
  onClose,
  onSelectConversation,
  onNewChat,
  currentConversationId,
}: ChatSidebarDrawerProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    try {
      const list: ConversationSummary[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith('aminy-conversation-')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const messages = parsed.messages || [];
          const firstUser = messages.find((m: { role: string; content?: string }) => m.role === 'user');
          const last = messages[messages.length - 1];
          list.push({
            id: key.replace('aminy-conversation-', ''),
            title:
              parsed.title ||
              (firstUser?.content ? firstUser.content.slice(0, 50) : 'New Conversation'),
            preview: last?.content?.slice(0, 100) || 'No messages yet',
            messageCount: messages.length,
            updatedAt: new Date(parsed.lastUpdated || parsed.createdAt || Date.now()),
          });
        } catch {
          // ignore malformed entries
        }
      }
      list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setConversations(list);
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
    );
  }, [conversations, query]);

  const grouped = useMemo(() => groupByRecency(filtered), [filtered]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    localStorage.removeItem(`aminy-conversation-${id}`);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-[88vw] max-w-[320px] bg-[#FAF7F2] border-r border-[#F0EDE8] flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
            role="dialog"
            aria-label="Chat history"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#F0EDE8] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#132F43]">Conversations</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-[#F0EDE8] flex items-center justify-center transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4 text-[#5A6B7A]" />
              </button>
            </div>

            {/* New chat */}
            <div className="p-3">
              <button
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] text-white text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" />
                New chat
              </button>
            </div>

            {/* Search */}
            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9BAA]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#F0EDE8] text-sm text-[#132F43] placeholder-[#8E9BAA] focus:outline-none focus:border-[#6B9080] focus:ring-2 focus:ring-[#6B9080]/20"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pb-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-[#8E9BAA]">Loading…</div>
              ) : filtered.length === 0 ? (
                <EmptyDrawer query={query} />
              ) : (
                <div className="space-y-4 px-2">
                  {grouped.map((g) => (
                    <div key={g.label}>
                      <div className="px-2 pb-1.5 pt-1 text-xs font-semibold tracking-wider text-[#8E9BAA] uppercase">
                        {g.label}
                      </div>
                      <div className="space-y-1">
                        {g.items.map((c) => {
                          const active = c.id === currentConversationId;
                          return (
                            <div
                              key={c.id}
                              className={`group flex items-start gap-2 rounded-xl px-2 py-2 transition-colors ${
                                active ? 'bg-[#6B9080]/10' : 'hover:bg-white'
                              }`}
                            >
                              <button
                                onClick={() => {
                                  onSelectConversation(c.id);
                                  onClose();
                                }}
                                className="flex-1 min-w-0 text-left"
                              >
                                <div className="flex items-center gap-1.5">
                                  <MessageSquare
                                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                                      active ? 'text-[#6B9080]' : 'text-[#8E9BAA]'
                                    }`}
                                  />
                                  <p
                                    className={`text-sm truncate ${
                                      active ? 'font-semibold text-[#132F43]' : 'text-[#132F43]'
                                    }`}
                                  >
                                    {c.title}
                                  </p>
                                </div>
                                <p className="mt-0.5 text-sm text-[#8E9BAA] truncate pl-5">
                                  {c.preview}
                                </p>
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, c.id)}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[#8E9BAA] hover:text-[#E07A5F] hover:bg-[#E07A5F]/10 transition-all"
                                aria-label={`Delete ${c.title}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function EmptyDrawer({ query }: { query: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F0EDE8] flex items-center justify-center">
        <MessageSquare className="w-5 h-5 text-[#8E9BAA]" />
      </div>
      <p className="text-sm font-medium text-[#132F43] mb-1">
        {query ? 'No matches' : 'No conversations yet'}
      </p>
      <p className="text-sm text-[#8E9BAA] leading-relaxed">
        {query
          ? `Nothing matches "${query}". Try another search.`
          : 'Your chats with Aminy will appear here.'}
      </p>
    </div>
  );
}

interface Bucket {
  label: string;
  items: ConversationSummary[];
}

function groupByRecency(items: ConversationSummary[]): Bucket[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();
  const yesterdayStart = todayStart - day;
  const last7Start = now - 7 * day;
  const last30Start = now - 30 * day;

  const today: ConversationSummary[] = [];
  const yesterday: ConversationSummary[] = [];
  const week: ConversationSummary[] = [];
  const month: ConversationSummary[] = [];
  const older: ConversationSummary[] = [];

  for (const c of items) {
    const t = c.updatedAt.getTime();
    if (t >= todayStart) today.push(c);
    else if (t >= yesterdayStart) yesterday.push(c);
    else if (t >= last7Start) week.push(c);
    else if (t >= last30Start) month.push(c);
    else older.push(c);
  }

  const buckets: Bucket[] = [];
  if (today.length) buckets.push({ label: 'Today', items: today });
  if (yesterday.length) buckets.push({ label: 'Yesterday', items: yesterday });
  if (week.length) buckets.push({ label: 'Previous 7 days', items: week });
  if (month.length) buckets.push({ label: 'Previous 30 days', items: month });
  if (older.length) buckets.push({ label: 'Older', items: older });
  return buckets;
}

export default ChatSidebarDrawer;
