import React from 'react';
import { Sparkles, Brain, MessageSquare, Zap, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFeatureFlags } from '../lib/feature-flags';

interface AskAminyFeaturedCardProps {
  userTier: string;
  userData: { parentName: string; childName: string };
  onAskAminyClick: () => void;
  className?: string;
}

export function AskAminyFeaturedCard({
  userTier,
  userData,
  onAskAminyClick,
  className
}: AskAminyFeaturedCardProps) {
  const { isEnabled } = useFeatureFlags();
  
  const hasAdvancedFeatures = isEnabled('advancedStreaming') && isEnabled('contextAwareResponses');
  const hasContextDetection = isEnabled('contextDetection');
  
  return (
    <div 
      className={cn(
        "aminy-ai-card relative bg-gradient-to-br from-white via-accent/2 to-purple-50/30 border border-accent/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden",
        className
      )}
      onClick={onAskAminyClick}
    >
      {/* Premium Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1 bg-accent/10 rounded-full text-xs font-medium text-accent">
        <Zap className="w-3 h-3" />
        Advanced AI
      </div>

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
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Talk to Aminy</h3>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Zap className="w-3 h-3 mr-1" />
              Always Available
            </span>
            {hasAdvancedFeatures && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <Brain className="w-3 h-3 mr-1" />
                Enhanced AI
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[#5A6B7A] mb-4 aminy-ai-subtitle">
        Get personalized, evidence-based guidance for {userData.childName}'s development. 
        Ask about routines, behaviors, milestones, or any concerns.
      </p>

      {/* Feature Highlights */}
      <div className="mb-4 p-3 bg-accent/5 rounded-lg border border-accent/10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-accent">Advanced AI Features:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="bg-accent/10 text-accent px-2 py-1 rounded-full">Real-time streaming</span>
          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Context-aware</span>
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Persistent history</span>
          {hasContextDetection && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">Proactive insights</span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <button 
          className="text-left p-2 bg-[#FAF7F2] hover:bg-accent/5 hover:border-accent/30 rounded-lg text-sm transition-colors border border-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onAskAminyClick();
          }}
        >
          Help with {userData.childName}'s routine
        </button>
        <button 
          className="text-left p-2 bg-[#FAF7F2] hover:bg-accent/5 hover:border-accent/30 rounded-lg text-sm transition-colors border border-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onAskAminyClick();
          }}
        >
          Communication strategies
        </button>
      </div>

      {/* CTA */}
      <button className="w-full bg-accent text-white py-3 rounded-xl font-medium hover:bg-accent/90 transition-colors group-hover:scale-105 transition-transform flex items-center justify-center gap-2">
        Start Conversation
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-accent/1 to-purple-500/2 rounded-2xl pointer-events-none" />
    </div>
  );
}

// Hook for promoting Ask Aminy when appropriate
export function useAskAminyFeatured() {
  const { isEnabled } = useFeatureFlags();
  
  const isFullyEnhanced = () => {
    return isEnabled('enhancedFloatingButton') && 
           isEnabled('advancedStreaming') && 
           isEnabled('contextAwareResponses');
  };

  const getFeatureLevel = () => {
    if (isEnabled('contextDetection')) return 'full-ai';
    if (isFullyEnhanced()) return 'advanced';
    if (isEnabled('enhancedFloatingButton')) return 'enhanced';
    return 'basic';
  };

  return {
    isFullyEnhanced: isFullyEnhanced(),
    getFeatureLevel,
    hasAdvancedFeatures: isEnabled('advancedStreaming') || isEnabled('contextAwareResponses'),
    hasContextDetection: isEnabled('contextDetection'),
    showPromotion: true // Always show since it's the centerpiece
  };
}