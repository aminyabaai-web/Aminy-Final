import React, { useState, useEffect } from 'react';
import { Sparkles, Send, ArrowRight, Heart, Brain } from 'lucide-react';
import { Card } from './ui/card';
import { CompassIcon } from './CompassIcon';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { useContextEngine } from '../lib/context-engine';
import { useAnalytics } from '../lib/analytics-engine';

interface AskAminyHomeCardProps {
  userName?: string;
  childName?: string;
  tier?: string;
  messagesLeft?: number;
  chatMessages?: any[];
  aiInput?: string;
  isAiReplying?: boolean;
  onInputChange?: (value: string) => void;
  onSendMessage?: () => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  onShowLiveVideo?: () => void;
  userTier?: string;
  userData?: { parentName: string; childName: string };
  onAskAminyClick?: () => void;
  className?: string;
}

export function AskAminyHomeCard({
  userName,
  childName,
  tier,
  messagesLeft,
  chatMessages,
  aiInput,
  isAiReplying,
  onInputChange,
  onSendMessage,
  onKeyPress,
  onShowLiveVideo,
  userTier,
  userData,
  onAskAminyClick,
  className
}: AskAminyHomeCardProps) {
  // Normalize props to handle both interfaces
  const safeTier = tier || userTier || 'free';
  const safeChildName = childName || userData?.childName || 'your child';
  const safeParentName = userName || userData?.parentName || 'Parent';
  const [isHovered, setIsHovered] = useState(false);
  const [contextualPrompts, setContextualPrompts] = useState<string[]>([]);
  const [contextRichness, setContextRichness] = useState(0);
  
  const { generatePrompts, getInsights } = useContextEngine();
  const { track } = useAnalytics();

  useEffect(() => {
    // Generate contextual prompts on component mount only
    try {
      const prompts = generatePrompts();
      const insights = getInsights();
      
      setContextualPrompts(
        prompts.slice(0, 2).map(p => p.prompt)
      );
      setContextRichness(insights.contextRichness);
      
      // Track context-aware feature display
      track('ask_aminy_contextual_display', {
        contextRichness: insights.contextRichness,
        promptCount: prompts.length,
        userTier: safeTier,
      });
    } catch (error) {
      // Set default empty state on error
      setContextualPrompts([]);
      setContextRichness(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount to prevent infinite loop

  const getQuickPrompts = () => {
    // Use contextual prompts if available, otherwise fall back to generic ones
    if (contextualPrompts.length > 0) {
      return contextualPrompts;
    }
    
    return [
      `Help with ${safeChildName}'s bedtime routine`,
      'Strategies for communication',
      'Managing transitions and changes',
      'Supporting emotional regulation'
    ];
  };

  const handlePromptClick = (prompt: string, index: number) => {
    track('ask_aminy_quick_prompt_used', {
      prompt,
      index,
      isContextual: contextualPrompts.length > 0,
      contextRichness,
    });
    
    onAskAminyClick();
  };

  return (
    <Card 
      className={cn(
        "relative p-8 border-0 shadow-lg bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/30 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-700 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onAskAminyClick}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent opacity-50" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl flex items-center justify-center transition-all duration-300",
              isHovered && "scale-110 from-accent/30 to-accent/20 shadow-lg"
            )}>
              <CompassIcon className={cn(
                "w-8 h-8 transition-all duration-300",
                isHovered && "rotate-12 scale-110"
              )} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                Your AI companion
                <Sparkles className="w-6 h-6 text-accent animate-pulse" />
              </h2>
              <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">
                <Heart className="w-3 h-3 mr-1" />
                Unlimited—same across all plans
              </Badge>
            </div>
          </div>
          <ArrowRight className={cn(
            "w-6 h-6 text-slate-400 transition-all duration-300",
            isHovered && "text-accent transform translate-x-1"
          )} />
        </div>

        <div className="mb-8">
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            I'm here 24/7 to handle the heavy lifting—analyzing patterns, answering questions, and adapting your plan automatically. Like having the best developmental pediatrician, BCBA, and best friend in one.
          </p>
          
          {/* Context Intelligence Indicator */}
          {contextRichness > 30 && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                AI-personalized based on {safeChildName}'s profile
              </span>
              <Badge className="ml-auto bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                {contextRichness}% context
              </Badge>
            </div>
          )}
        </div>

        {/* Quick action prompts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {contextualPrompts.length > 0 ? 'Personalized for you:' : 'Quick suggestions:'}
            </p>
            {contextualPrompts.length > 0 && (
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
            )}
          </div>
          <div className="grid gap-3">
            {getQuickPrompts().slice(0, 2).map((prompt, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-sm cursor-pointer",
                  contextualPrompts.length > 0 
                    ? "bg-blue-50/60 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-50/80 dark:hover:bg-blue-900/30" 
                    : "bg-white/60 dark:bg-slate-700/40 border-slate-200/50 dark:border-slate-600/50 hover:bg-white/80 dark:hover:bg-slate-700/60"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePromptClick(prompt, index);
                }}
              >
                <Send className={cn(
                  "w-4 h-4 flex-shrink-0",
                  contextualPrompts.length > 0 ? "text-blue-600 dark:text-blue-400" : "text-accent"
                )} />
                <span className={cn(
                  contextualPrompts.length > 0 
                    ? "text-blue-700 dark:text-blue-300" 
                    : "text-slate-700 dark:text-slate-300"
                )}>
                  {prompt}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
          <Button 
            className={cn(
              "w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-xl text-base transition-all duration-200 shadow-lg hover:shadow-xl",
              isHovered && "shadow-2xl transform translate-y-[-2px]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onAskAminyClick();
            }}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Conversation
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Ambient glow effect */}
      <div className={cn(
        "absolute -inset-1 bg-gradient-to-r from-accent/20 via-blue-500/20 to-cyan-500/20 rounded-3xl opacity-0 transition-opacity duration-300 blur-xl",
        isHovered && "opacity-30"
      )} />
    </Card>
  );
}