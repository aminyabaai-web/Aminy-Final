import React, { useState } from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';
import { PersistentAskAminy } from './PersistentAskAminy';
import { cn } from '../lib/utils';

interface FloatingAskAminyProps {
  userTier: string;
  userData: { parentName: string; childName: string };
  onPaywallTrigger?: () => void;
  className?: string;
  disabled?: boolean;
}

export function FloatingAskAminy({
  userTier,
  userData,
  onPaywallTrigger,
  className,
  disabled = false
}: FloatingAskAminyProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (disabled) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        data-floating-ask-aminy
        className={cn(
          "fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-30 w-14 h-14 bg-accent hover:bg-accent/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group",
          "hover:scale-105 active:scale-95",
          "md:bottom-24",
          className
        )}
        aria-label="Ask Aminy"
      >
        <div className="relative">
          <Sparkles className="w-6 h-6 transition-transform group-hover:scale-110" />
          
          {/* Subtle pulse animation */}
          <div className="absolute -inset-2 bg-accent/20 rounded-full animate-ping opacity-75"></div>
          
          {/* Badge for starter users */}
          {userTier === 'starter' && (
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              !
            </div>
          )}
        </div>
      </button>

      {/* Chat Modal */}
      <PersistentAskAminy
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

// Hook for managing the floating button state
export function useFloatingAskAminy() {
  const [isVisible, setIsVisible] = useState(true);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);
  const toggle = () => setIsVisible(!isVisible);

  return {
    isVisible,
    show,
    hide,
    toggle
  };
}