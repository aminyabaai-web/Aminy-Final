import React from 'react';
import { useFeatureFlags } from '../lib/feature-flags';
import { Sparkles, Brain, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export function AskAminyStatusIndicator() {
  const { isEnabled, flags } = useFeatureFlags();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const activeFeatures = Object.entries(flags).filter(([, enabled]) => enabled);
  const isEnhanced = isEnabled('enhancedFloatingButton');

  if (!isEnhanced) {
    return null;
  }

  return (
    <button 
      className="fixed top-4 right-4 z-50 w-14 h-14 bg-accent hover:bg-accent/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group border-2 border-white/20 backdrop-blur-sm"
      onClick={() => {
        activeFeatures.forEach(([feature, enabled]) => {
        });
      }}
      title={`Aminy Enhanced (${activeFeatures.filter(([, enabled]) => enabled).length} features active)`}
    >
      <div className="relative">
        <Sparkles className="w-6 h-6 transition-transform group-hover:scale-110" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
      </div>
    </button>
  );
}