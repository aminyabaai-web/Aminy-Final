import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { UnifiedChat } from './UnifiedChat';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';

interface PersistentChatFABProps {
  userData?: {
    parentName: string;
    childName: string;
  };
  isAuthenticated?: boolean;
}

export function PersistentChatFAB({ userData, isAuthenticated = false }: PersistentChatFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewSuggestion, setHasNewSuggestion] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Detect keyboard on mobile and adjust FAB position
  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - viewportHeight;
      
      // If keyboard is open (height difference > 150px), adjust FAB
      if (heightDiff > 150) {
        setKeyboardHeight(heightDiff);
      } else {
        setKeyboardHeight(0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);

  // Example starter prompts
  const starterPrompts = [
    "How can I make mornings smoother?",
    "Give me a calm cue for transitions.",
    "What should I focus on today?",
    "Help with bedtime routine."
  ];

  // Simulate AI suggestion (in production, this would come from AI brain)
  useEffect(() => {
    // Show subtle pulse after 10 seconds if user hasn't opened chat
    const timer = setTimeout(() => {
      if (!isOpen) {
        setHasNewSuggestion(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <>
      {/* Floating Action Button */}
      <div 
        className="fixed z-50 transition-all duration-300"
        style={{
          bottom: keyboardHeight > 0 ? `${keyboardHeight + 20}px` : '100px',
          right: '20px'
        }}
      >
        <Button
          onClick={() => {
            setIsOpen(true);
            setHasNewSuggestion(false);
          }}
          size="lg"
          className="relative h-14 px-6 bg-accent hover:bg-accent/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-full group"
          aria-label="Ask Aminy - Open AI chat"
        >
          {/* Pulse animation for new suggestion */}
          {hasNewSuggestion && (
            <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-75"></span>
          )}
          
          {/* AI gradient glow effect */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-accent via-teal-400 to-accent opacity-0 group-hover:opacity-20 blur-sm transition-opacity"></span>
          
          <MessageCircle className="w-5 h-5 mr-2 relative z-10" />
          <span className="relative z-10 font-semibold">Ask Aminy 💬</span>
          
          {/* Sparkle indicator */}
          {hasNewSuggestion && (
            <Sparkles className="w-4 h-4 ml-1 text-yellow-300 animate-pulse relative z-10" />
          )}
        </Button>

        {/* Tooltip hint on first visit */}
        {!isOpen && hasNewSuggestion && (
          <div className="absolute bottom-16 right-0 bg-white border border-accent/20 rounded-lg shadow-lg p-3 max-w-[200px] animate-in slide-in-from-bottom-2 fade-in">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-700">
                <strong>Tip:</strong> Ask me anything about your calm plan!
              </p>
            </div>
            <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white"></div>
          </div>
        )}
      </div>

      {/* Chat Sheet - Slides from bottom on mobile, right on desktop */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[85vh] sm:h-full sm:max-w-md p-0 rounded-t-2xl sm:rounded-none"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent to-teal-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-lg">Ask Aminy</SheetTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Powered by AI and ABA behavioral science
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Starter Prompts */}
            {!isAuthenticated && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-slate-600 font-medium">Try asking:</p>
                <div className="grid gap-2">
                  {starterPrompts.slice(0, 2).map((prompt, idx) => (
                    <button
                      key={idx}
                      className="text-left px-3 py-2 bg-accent/5 hover:bg-accent/10 border border-accent/20 rounded-lg text-sm text-slate-700 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </SheetHeader>

          {/* Chat Content */}
          <div className="h-[calc(100%-140px)] overflow-hidden">
            {isAuthenticated && userData ? (
              <UnifiedChat
                userData={userData}
                onClose={() => setIsOpen(false)}
                starterPrompts={starterPrompts}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Sign in to chat with Aminy
                </h3>
                <p className="text-sm text-slate-600 mb-6 max-w-sm">
                  Get personalized guidance based on your family's progress and goals.
                </p>
                <Button className="bg-accent hover:bg-accent/90">
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
