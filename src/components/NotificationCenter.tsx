// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Notification Center
 * In-app notification viewer with read/unread, swipe to archive, deep links
 */

import React, { useState, useEffect } from 'react';
import { Bell, Check, Archive, X, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  notificationDB,
  NotificationPayload,
  handleNotificationClick,
  getUnreadCount,
} from '../lib/notification-system';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';

interface NotificationCenterProps {
  onNotificationClick?: (notification: NotificationPayload) => void;
}

export function NotificationCenter({ onNotificationClick }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [isOpen]);

  useEffect(() => {
    updateUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(updateUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    setIsLoading(true);
    try {
      const notifs = await notificationDB.getNotifications(50);
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
    setIsLoading(false);
  }

  async function updateUnreadCount() {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error getting unread count:', error);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      await notificationDB.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      
      await updateUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function handleNotificationItemClick(notification: NotificationPayload) {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Handle deep link
    handleNotificationClick(notification);
    
    // Close sheet
    setIsOpen(false);

    // Callback
    onNotificationClick?.(notification);
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'achievement':
        return '🎉';
      case 'progress':
        return '📊';
      case 'reminder':
        return '🔔';
      case 'coach':
        return '💙';
      case 'engagement':
        return '💬';
      default:
        return '✨';
    }
  }

  function getRelativeTime(timestamp: string): string {
    const now = Date.now();
    const notifTime = new Date(timestamp).getTime();
    const diffMs = now - notifTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications ${unreadCount > 0 ? `- ${unreadCount} unread` : ''}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-1 text-sm"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="text-sm font-normal text-[#5A6B7A]">
                {unreadCount} unread
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-3" />
                <p className="text-sm text-[#5A6B7A]">Loading notifications...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 bg-[#EDF4F7] rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-[#132F43] mb-2">
                No notifications yet
              </h3>
              <p className="text-sm text-[#5A6B7A]">
                We'll notify you about progress updates, achievements, and important reminders.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-[#F6FBFB] transition-colors cursor-pointer ${
                    !notification.read ? 'bg-accent/5' : ''
                  }`}
                  onClick={() => handleNotificationItemClick(notification)}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 text-2xl mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-[#132F43] text-sm">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>

                      <p className="text-sm text-[#5A6B7A] mb-2">
                        {notification.body}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#5A6B7A]">
                          {getRelativeTime(notification.timestamp)}
                        </span>

                        {notification.deepLink && (
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
