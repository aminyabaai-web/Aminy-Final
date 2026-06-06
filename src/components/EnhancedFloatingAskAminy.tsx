// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useMemo } from 'react';
import { syncEncryptedStorage } from '../lib/security/encrypted-storage';
import { Sparkles, MessageCircle, Zap, Brain, Sun, Moon, Coffee, Sunset } from 'lucide-react';
import { EnhancedAskAminy } from './EnhancedAskAminy';
import { cn } from '../lib/utils';
import { useAnalytics } from '../lib/analytics-engine';

// Time-based contextual prompts
const TIME_BASED_PROMPTS = {
  morning: {
    icon: Coffee,
    label: 'Morning',
    prompts: [
      (childName: string) => `Help with ${childName}'s morning routine`,
      () => 'Getting ready without meltdowns',
    ]
  },
  afternoon: {
    icon: Sun,
    label: 'Afternoon',
    prompts: [
      () => 'After-school decompression help',
      (childName: string) => `Supporting ${childName} with homework`,
    ]
  },
  evening: {
    icon: Sunset,
    label: 'Evening',
    prompts: [
      (childName: string) => `Help with ${childName}'s bedtime`,
      () => 'Wind-down activities that work',
    ]
  },
  night: {
    icon: Moon,
    label: 'Night',
    prompts: [
      () => 'Processing today\'s challenges',
      () => 'Sleep strategies that help',
    ]
  }
};

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

interface TimeAwarePromptsProps {
  userData: { parentName: string; childName: string };
  onAskAminyClick: () => void;
}

function TimeAwarePrompts({ userData, onAskAminyClick }: TimeAwarePromptsProps) {
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const config = TIME_BASED_PROMPTS[timeOfDay];
  const TimeIcon = config.icon;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
        <TimeIcon className="w-3 h-3" />
        <span>{config.label} suggestions</span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {config.prompts.map((promptFn, index) => (
          <button
            key={index}
            className="text-left p-2.5 bg-[#FAF7F2] hover:bg-[#F0EDE8] rounded-lg text-sm transition-colors border border-transparent hover:border-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              onAskAminyClick();
            }}
          >
            {promptFn(userData.childName)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface EnhancedFloatingAskAminyProps {
  userTier: string;
  userData: { parentName: string; childName: string };
  onPaywallTrigger?: () => void;
  className?: string;
  disabled?: boolean;
  showPulse?: boolean;
}

export function EnhancedFloatingAskAminy({
  userTier,
  userData,
  onPaywallTrigger,
  className,
  disabled = false,
  showPulse = true
}: EnhancedFloatingAskAminyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewContext, setHasNewContext] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const { track } = useAnalytics();

  // Check for new contextual information
  useEffect(() => {
    const checkContextUpdates = () => {
      try {
        const lastContextCheck = syncEncryptedStorage.getItem('aminy-last-context-check');
        const lastDataUpdate = syncEncryptedStorage.getItem('aminy-last-data-update');
        
        if (lastDataUpdate && (!lastContextCheck || lastDataUpdate > lastContextCheck)) {
          setHasNewContext(true);
          syncEncryptedStorage.setItem('aminy-last-context-check', Date.now().toString());
        }
      } catch (error) {
      }
    };

    checkContextUpdates();
    const interval = setInterval(checkContextUpdates, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Count active conversations
  useEffect(() => {
    const countMessages = () => {
      try {
        let totalMessages = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const cleanKey = key.replace(/^enc_/, '');
            if (cleanKey.startsWith('aminy-conversation-')) {
              const conversation = JSON.parse(syncEncryptedStorage.getItem(cleanKey) || '{}');
              totalMessages += (conversation.messages || []).length;
            }
          }
        }
        setMessageCount(totalMessages);
      } catch (error) {
      }
    };

    countMessages();
    window.addEventListener('storage', countMessages);
    
    return () => {
      window.removeEventListener('storage', countMessages);
    };
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewContext(false);
    
    track('ask_aminy_opened', {
      source: 'floating_button',
      userTier,
      hasNewContext,
      messageCount,
      childName: userData.childName
    });
  };

  if (disabled) return null;

  const getRemainingMessages = () => {
    if (userTier !== 'starter') return null;
    return Math.max(0, 10 - messageCount);
  };

  const remainingMessages = getRemainingMessages();
  const isLowOnMessages = remainingMessages !== null && remainingMessages <= 3;

  return (
    <>
      {/* Enhanced Floating Action Button */}
      <button
        onClick={handleOpen}
        data-floating-ask-aminy="enhanced"
        className={cn(
          "fixed bottom-20 right-4 z-30 w-14 h-14 bg-accent hover:bg-accent/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group",
          "hover:scale-110 active:scale-95",
          hasNewContext && "animate-pulse",
          className
        )}
        aria-label={`Aminy - ${remainingMessages !== null ? `${remainingMessages} messages left` : 'Unlimited'}`}
      >
        <div className="relative">
          {/* Main icon */}
          <div className="relative z-10">
            {hasNewContext ? (
              <Brain className="w-6 h-6 transition-transform group-hover:scale-110" />
            ) : (
              <Sparkles className="w-6 h-6 transition-transform group-hover:scale-110" />
            )}
          </div>
          
          {/* Pulse animation */}
          {showPulse && (
            <div className="absolute -inset-2 bg-accent/20 rounded-full animate-ping opacity-75"></div>
          )}
          
          {/* Context indicator */}
          {hasNewContext && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-bounce">
              <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
            </div>
          )}
          
          {/* Message count badge */}
          {userTier === 'starter' && (
            <div className={cn(
              "absolute -top-2 -right-2 min-w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center px-1",
              isLowOnMessages ? "bg-red-500 animate-pulse" : "bg-amber-500"
            )}>
              {remainingMessages}
            </div>
          )}
          
          {/* Premium indicator */}
          {userTier !== 'starter' && (
            <div className="absolute -top-1 -right-1 w-3 h-3">
              <Zap className="w-3 h-3 text-yellow-400 drop-shadow-sm" />
            </div>
          )}
        </div>

        {/* Hover tooltip */}
        <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          {hasNewContext ? 'New insights available!' : 'Message Aminy AI'}
          <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-t-2 border-b-2 border-t-transparent border-b-transparent transform -translate-y-1/2"></div>
        </div>
      </button>

      {/* Enhanced Chat Modal */}
      <EnhancedAskAminy
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        onClose={() => setIsOpen(false)}
        userTier={userTier}
        userData={userData}
        onPaywallTrigger={onPaywallTrigger}
      />
    </>
  );
}

// Enhanced hook for managing floating button state
export function useEnhancedFloatingAskAminy() {
  const [isVisible, setIsVisible] = useState(true);
  const [hasUnreadContext, setHasUnreadContext] = useState(false);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);
  const toggle = () => setIsVisible(!isVisible);
  
  const markContextRead = () => setHasUnreadContext(false);
  const setNewContext = () => setHasUnreadContext(true);

  // Auto-show when new context is available
  useEffect(() => {
    if (hasUnreadContext && !isVisible) {
      setIsVisible(true);
    }
  }, [hasUnreadContext, isVisible]);

  return {
    isVisible,
    hasUnreadContext,
    show,
    hide,
    toggle,
    markContextRead,
    setNewContext
  };
}

// Enhanced Home Card Integration
interface EnhancedAskAminyHomeCardProps {
  userTier: string;
  userData: { parentName: string; childName: string };
  onAskAminyClick: () => void;
  className?: string;
}

export function EnhancedAskAminyHomeCard({
  userTier,
  userData,
  onAskAminyClick,
  className
}: EnhancedAskAminyHomeCardProps) {
  const [contextScore, setContextScore] = useState(0);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);

  useEffect(() => {
    // Simulate context richness calculation
    const calculateContext = () => {
      let score = 0;
      const activities = [];

      // Check for recent data
      try {
        const caregiverData = syncEncryptedStorage.getItem('caregiver');
        const childData = syncEncryptedStorage.getItem('child');
        const planData = syncEncryptedStorage.getItem('carePlanData');
        
        if (caregiverData) {
          score += 25;
          activities.push('Profile completed');
        }
        if (childData) {
          score += 25;
          activities.push('Child info added');
        }
        if (planData) {
          score += 50;
          activities.push('Care plan generated');
        }

        setContextScore(score);
        setRecentActivity(activities);
      } catch (error) {
      }
    };

    calculateContext();
  }, []);

  return (
    <div className={cn(
      "aminy-ai-card relative bg-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer",
      className
    )} onClick={onAskAminyClick}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Talk to Aminy</h3>
            {userTier !== 'starter' ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Zap className="w-3 h-3 mr-1" />
                Unlimited
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                10 free messages
              </span>
            )}
          </div>
        </div>
        
        {contextScore > 50 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg">
            <Brain className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">{contextScore}% personalized</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-4">
        Get personalized, evidence-based guidance for {userData.childName}'s development. 
        Ask about routines, behaviors, milestones, or any concerns.
      </p>

      {/* Context Insights */}
      {recentActivity.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">AI understands:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentActivity.map((activity, index) => (
              <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {activity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Time-Aware Suggested Prompts */}
      <TimeAwarePrompts userData={userData} onAskAminyClick={onAskAminyClick} />

      {/* CTA */}
      <button className="w-full bg-accent text-white py-3 rounded-xl font-medium hover:bg-accent/90 transition-colors">
        Start Conversation
      </button>
    </div>
  );
}