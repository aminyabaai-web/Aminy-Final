import React from 'react';
import { Sparkles, Brain, MessageSquare, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFeatureFlags } from '../lib/feature-flags';

interface AskAminyPromotionProps {
  userTier: string;
  userData: { parentName: string; childName: string };
  onAskAminyClick: () => void;
  className?: string;
  compact?: boolean;
}

export function AskAminyPromotion({
  userTier,
  userData,
  onAskAminyClick,
  className,
  compact = false
}: AskAminyPromotionProps) {
  const { isEnabled } = useFeatureFlags();
  
  const isEnhanced = isEnabled('enhancedFloatingButton');
  const hasAdvancedFeatures = isEnabled('advancedStreaming') || isEnabled('contextAwareResponses');
  const hasContextDetection = isEnabled('contextDetection');
  
  if (compact) {
    return (
      <div 
        className={cn(
          "bg-gradient-to-r from-accent/5 via-purple-500/5 to-accent/5 border border-accent/20 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-accent/40",
          className
        )}
        onClick={onAskAminyClick}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              {hasContextDetection ? (
                <Brain className="w-5 h-5 text-accent" />
              ) : (
                <Sparkles className="w-5 h-5 text-accent" />
              )}
            </div>
            {isEnhanced && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                <Zap className="w-2 h-2 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Talk to Aminy</h3>
            <p className="text-sm text-gray-600">Get instant guidance for {userData.childName}</p>
          </div>
          <MessageSquare className="w-5 h-5 text-accent/60" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "aminy-ai-card relative bg-gradient-to-br from-white via-accent/2 to-purple-50/30 border border-accent/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group",
        className
      )}
      onClick={onAskAminyClick}
    >
      {/* Premium Badge */}
      {isEnhanced && (
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-accent/10 rounded-full text-xs font-medium text-accent">
          <Zap className="w-3 h-3" />
          {hasAdvancedFeatures ? 'ChatGPT-Level' : 'Enhanced'}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            {hasContextDetection ? (
              <Brain className="w-6 h-6 text-accent" />
            ) : (
              <Sparkles className="w-6 h-6 text-accent" />
            )}
          </div>
          {isEnhanced && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Talk to Aminy</h3>
          <div className="flex items-center gap-2">
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
            {hasAdvancedFeatures && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <Brain className="w-3 h-3 mr-1" />
                AI Enhanced
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-4 aminy-ai-subtitle">
        Get personalized, evidence-based guidance for {userData.childName}'s development. 
        Ask about routines, behaviors, milestones, or any concerns.
      </p>

      {/* Feature Highlights */}
      {isEnhanced && (
        <div className="mb-4 p-3 bg-accent/5 rounded-lg border border-accent/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Enhanced Features Active:</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {hasAdvancedFeatures && (
              <span className="bg-accent/10 text-accent px-2 py-1 rounded-full">Real-time streaming</span>
            )}
            {isEnabled('contextAwareResponses') && (
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Context-aware</span>
            )}
            {hasContextDetection && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Proactive insights</span>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button 
          className="text-left p-2 bg-gray-50 hover:bg-accent/5 hover:border-accent/30 rounded-lg text-sm transition-colors border border-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onAskAminyClick();
          }}
        >
          Help with {userData.childName}'s routine
        </button>
        <button 
          className="text-left p-2 bg-gray-50 hover:bg-accent/5 hover:border-accent/30 rounded-lg text-sm transition-colors border border-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onAskAminyClick();
          }}
        >
          Communication strategies
        </button>
      </div>

      {/* CTA */}
      <button className="w-full bg-accent text-white py-3 rounded-xl font-medium hover:bg-accent/90 transition-colors group-hover:scale-105 transition-transform">
        Start Conversation
      </button>

      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-accent/1 to-purple-500/2 rounded-2xl pointer-events-none" />
    </div>
  );
}

// Hook for promoting Ask Aminy when appropriate
export function useAskAminyPromotion() {
  const { isEnabled } = useFeatureFlags();
  
  const shouldPromote = () => {
    // More aggressive promotion when enhanced features are available
    return isEnabled('enhancedFloatingButton') || Math.random() < 0.3;
  };

  const getPromotionLevel = () => {
    if (isEnabled('contextDetection')) return 'full-ai';
    if (isEnabled('advancedStreaming') || isEnabled('contextAwareResponses')) return 'chatgpt-level';
    if (isEnabled('enhancedFloatingButton')) return 'enhanced';
    return 'basic';
  };

  return {
    shouldPromote,
    getPromotionLevel,
    isEnhanced: isEnabled('enhancedFloatingButton'),
    hasAdvancedFeatures: isEnabled('advancedStreaming') || isEnabled('contextAwareResponses'),
    hasContextDetection: isEnabled('contextDetection')
  };
}