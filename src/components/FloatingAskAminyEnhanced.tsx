import React, { useState, useEffect } from 'react';
import { Sparkles, MessageCircle, Zap, Brain } from 'lucide-react';
import { PersistentAskAminy } from './PersistentAskAminy';
import { EnhancedAskAminy } from './EnhancedAskAminy';
import { useFeatureFlags } from '../lib/feature-flags';
import { cn } from '../lib/utils';
import { useAnalytics } from '../lib/analytics-engine';

interface FloatingAskAminyEnhancedProps {
  userTier: string;
  userData: { parentName: string; childName: string };
  onPaywallTrigger?: () => void;
  className?: string;
  disabled?: boolean;
  // New enhancement props with safe defaults
  showPulse?: boolean;
  enableContextDetection?: boolean;
  enableAnalytics?: boolean;
}

export function FloatingAskAminyEnhanced({
  userTier,
  userData,
  onPaywallTrigger,
  className,
  disabled = false,
  showPulse = true,
  enableContextDetection = false, // Start disabled for safety
  enableAnalytics = true
}: FloatingAskAminyEnhancedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewContext, setHasNewContext] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const { track } = useAnalytics();
  const { isEnabled } = useFeatureFlags();

  // Safe context detection - only when enabled
  useEffect(() => {
    if (!enableContextDetection) return;
    
    const checkContextUpdates = () => {
      try {
        const lastContextCheck = localStorage.getItem('aminy-last-context-check');
        const lastDataUpdate = localStorage.getItem('aminy-last-data-update');
        
        if (lastDataUpdate && (!lastContextCheck || lastDataUpdate > lastContextCheck)) {
          setHasNewContext(true);
          localStorage.setItem('aminy-last-context-check', Date.now().toString());
        }
      } catch (error) {
      }
    };

    checkContextUpdates();
    const interval = setInterval(checkContextUpdates, 30000);
    
    return () => clearInterval(interval);
  }, [enableContextDetection]);

  // Safe message counting - only when enabled
  useEffect(() => {
    if (!enableAnalytics) return;
    
    const countMessages = () => {
      try {
        let totalMessages = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('aminy-conversation-')) {
            const conversation = JSON.parse(localStorage.getItem(key) || '{}');
            totalMessages += (conversation.messages || []).length;
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
  }, [enableAnalytics]);

  const handleOpen = () => {
    setIsOpen(true);
    if (enableContextDetection) {
      setHasNewContext(false);
    }
    
    if (enableAnalytics) {
      track('ask_aminy_opened', {
        source: 'floating_button_enhanced',
        userTier,
        hasNewContext,
        messageCount,
        childName: userData.childName
      });
    }
  };

  if (disabled) return null;

  // Ask Aminy is now unlimited for all tiers - no restrictions
  const getRemainingMessages = () => {
    return null; // Always unlimited across all tiers
  };

  const remainingMessages = getRemainingMessages();
  const isLowOnMessages = false; // Never low on messages anymore

  return (
    <>
      {/* Enhanced Floating Action Button */}
      <button
        onClick={handleOpen}
        data-floating-ask-aminy="enhanced-safe"
        className={cn(
          "fixed bottom-20 right-4 z-30 w-14 h-14 bg-accent hover:bg-accent/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group",
          "hover:scale-110 active:scale-95",
          hasNewContext && enableContextDetection && "animate-pulse",
          className
        )}
        aria-label="Aminy - Always available to help"
      >
        <div className="relative">
          {/* Main icon with enhanced context awareness */}
          <div className="relative z-10">
            {hasNewContext && enableContextDetection ? (
              <Brain className="w-6 h-6 transition-transform group-hover:scale-110" />
            ) : (
              <Sparkles className="w-6 h-6 transition-transform group-hover:scale-110" />
            )}
          </div>
          
          {/* Pulse animation - only when enabled */}
          {showPulse && (
            <div className="absolute -inset-2 bg-accent/20 rounded-full animate-ping opacity-75"></div>
          )}
          
          {/* Context indicator - only when context detection is enabled */}
          {hasNewContext && enableContextDetection && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-bounce">
              <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
            </div>
          )}
          
          {/* Always available indicator - consistent across all tiers */}
          <div className="absolute -top-1 -right-1 w-3 h-3">
            <Zap className="w-3 h-3 text-yellow-400 drop-shadow-sm" />
          </div>
        </div>

        {/* Safe hover tooltip - only when context detection is enabled */}
        {enableContextDetection && (
          <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            {hasNewContext ? 'New insights available!' : 'Ask Aminy anything'}
            <div className="absolute top-1/2 left-full w-0 h-0 border-l-4 border-l-gray-900 border-t-2 border-b-2 border-t-transparent border-b-transparent transform -translate-y-1/2"></div>
          </div>
        )}
      </button>

      {/* Chat Modal - Enhanced when advanced features enabled */}
      {isEnabled('advancedStreaming') || isEnabled('contextAwareResponses') ? (
        <EnhancedAskAminy
          isOpen={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
          onClose={() => setIsOpen(false)}
          userTier={userTier}
          userData={userData}
          onPaywallTrigger={onPaywallTrigger}
        />
      ) : (
        <PersistentAskAminy
          isOpen={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
          onClose={() => setIsOpen(false)}
          userTier={userTier}
          userData={userData}
          onPaywallTrigger={onPaywallTrigger}
        />
      )}
    </>
  );
}

// Enhanced hook with safe defaults
export function useFloatingAskAminyEnhanced() {
  const [isVisible, setIsVisible] = useState(true);
  const [hasUnreadContext, setHasUnreadContext] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(false);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);
  const toggle = () => setIsVisible(!isVisible);
  
  const enableEnhancements = () => setIsEnhanced(true);
  const disableEnhancements = () => setIsEnhanced(false);
  
  const markContextRead = () => setHasUnreadContext(false);
  const setNewContext = () => setHasUnreadContext(true);

  // Auto-show when new context is available - only when enhanced
  useEffect(() => {
    if (isEnhanced && hasUnreadContext && !isVisible) {
      setIsVisible(true);
    }
  }, [hasUnreadContext, isVisible, isEnhanced]);

  return {
    isVisible,
    hasUnreadContext,
    isEnhanced,
    show,
    hide,
    toggle,
    enableEnhancements,
    disableEnhancements,
    markContextRead,
    setNewContext
  };
}