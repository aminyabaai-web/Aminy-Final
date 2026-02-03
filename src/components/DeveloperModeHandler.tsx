import React, { useEffect, useState } from 'react';
import { DeveloperModePanel } from './DeveloperModePanel';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface DeveloperModeHandlerProps {
  onNavigate?: (screen: string, tab?: string) => void;
  onTierChange?: (tier: 'free' | 'core' | 'pro' | 'pro-plus') => void;
}

export function DeveloperModeHandler({ onNavigate, onTierChange }: DeveloperModeHandlerProps) {
  const [showDevMode, setShowDevMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement ||
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true';

      if (isTyping) {
        return; // Let the user type normally
      }

      // Shift + D activates developer mode
      if (e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDevMode(prev => !prev);
      }

      // Shift + H goes to home
      if (e.shiftKey && e.key === 'H') {
        e.preventDefault();
        onNavigate?.('dashboard', 'home');
      }

      // Shift + C goes to care tab
      if (e.shiftKey && e.key === 'C') {
        e.preventDefault();
        onNavigate?.('dashboard', 'care');
      }

      // Shift + R goes to reports
      if (e.shiftKey && e.key === 'R') {
        e.preventDefault();
        onNavigate?.('dashboard', 'reports');
      }

      // Shift + B goes to benefits
      if (e.shiftKey && e.key === 'B') {
        e.preventDefault();
        onNavigate?.('benefits');
      }

      // Shift + T goes to telehealth
      if (e.shiftKey && e.key === 'T') {
        e.preventDefault();
        onNavigate?.('telehealth');
      }

      // Shift + M goes to caregiver management
      if (e.shiftKey && e.key === 'M') {
        e.preventDefault();
        onNavigate?.('caregivers');
      }

      // Shift + V goes to vault
      if (e.shiftKey && e.key === 'V') {
        e.preventDefault();
        onNavigate?.('vault');
      }

      // Shift + 2 goes to Phase 2 menu
      if (e.shiftKey && e.key === '@') { // Shift + 2 = @
        e.preventDefault();
        onNavigate?.('phase2-menu');
      }

      // Shift + A goes to Analytics
      if (e.shiftKey && e.key === 'A') {
        e.preventDefault();
        onNavigate?.('analytics');
      }

      // Shift + L goes to Launch Status
      if (e.shiftKey && e.key === 'L') {
        e.preventDefault();
        onNavigate?.('launch-status');
      }

      // Shift + P goes to BCBA Portal
      if (e.shiftKey && e.key === 'P') {
        e.preventDefault();
        onNavigate?.('bcba-portal');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  return (
    <Dialog open={showDevMode} onOpenChange={setShowDevMode}>
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b shrink-0">
          <DialogTitle>Developer Mode</DialogTitle>
          <DialogDescription>
            Quick navigation and testing tools
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <DeveloperModePanel 
            onNavigate={(screen, tab) => {
              setShowDevMode(false); // Close dialog first
              setTimeout(() => {
                onNavigate?.(screen, tab); // Then navigate
              }, 100);
            }} 
            onTierChange={onTierChange}
          />
        </div>
        
        <div className="p-4 pt-3 border-t bg-gray-50 space-y-2 shrink-0">
          <div className="p-2 bg-white border rounded-lg">
            <h4 className="text-xs font-semibold mb-1.5">Keyboard Shortcuts</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1 text-xs">
              <div className="flex items-center justify-between">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Shift+D</kbd>
                <span className="text-muted-foreground text-xs">Toggle</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Shift+H</kbd>
                <span className="text-muted-foreground text-xs">Home</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Shift+C</kbd>
                <span className="text-muted-foreground text-xs">Care</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Shift+R</kbd>
                <span className="text-muted-foreground text-xs">Reports</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="px-1.5 py-0.5 bg-purple-100 rounded text-xs">Shift+2</kbd>
                <span className="text-muted-foreground text-xs">Phase 2</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="px-1.5 py-0.5 bg-purple-100 rounded text-xs">Shift+P</kbd>
                <span className="text-muted-foreground text-xs">BCBA</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="px-1.5 py-0.5 bg-purple-100 rounded text-xs">Shift+A</kbd>
                <span className="text-muted-foreground text-xs">Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
