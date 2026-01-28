import React from 'react';
import { Brain, MessageSquare, Sparkles } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface AminyWelcomeBannerProps {
  userName: string;
  onStartChat: () => void;
  suggestedPrompts?: string[];
}

export function AminyWelcomeBanner({ 
  userName, 
  onStartChat,
  suggestedPrompts = [
    "What's the one thing I should focus on today?",
    "I need help with a tough moment",
    "Show me my benefits status"
  ]
}: AminyWelcomeBannerProps) {
  return (
    <Card className="overflow-hidden border-2 border-accent/20 bg-gradient-to-br from-white to-accent/5">
      <div className="p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold">Hi {userName} — you're doing great.</h2>
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Ready for today's calm plan? Using ABA principles and adaptive AI, I'm here to support you, celebrate progress, and guide you through every step.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600 mb-2">Try asking:</p>
              <div className="grid gap-2">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={onStartChat}
                    className="text-left px-3 py-2 bg-white hover:bg-accent/5 border border-slate-200 hover:border-accent/30 rounded-lg text-sm text-slate-700 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span>{prompt}</span>
                      <MessageSquare className="w-3 h-3 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={onStartChat}
              className="w-full mt-4 bg-accent hover:bg-accent/90 gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Start conversation
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
