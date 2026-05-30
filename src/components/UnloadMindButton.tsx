// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Unload Mind Floating Action Button
 * Persistent button that opens the mind dump modal
 */

import React from 'react';
import { Brain } from 'lucide-react';

interface UnloadMindButtonProps {
  onClick: () => void;
}

export function UnloadMindButton({ onClick }: UnloadMindButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-40 group"
      style={{ 
        contain: 'layout',
        willChange: 'transform'
      }}
      aria-label="Unload your mind"
    >
      {/* Main Button */}
      <div className="relative">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-accent/20 rounded-2xl blur-xl group-hover:bg-accent/30 transition-all duration-300" />
        
        {/* Button */}
        <div className="relative bg-accent hover:bg-accent/90 text-white px-5 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 min-h-[56px]">
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <span className="font-semibold text-[15px] leading-[20px]">
            Unload my mind
          </span>
        </div>

        {/* Pulse Animation (subtle) — inline animation: `animate-ping-slow` has no
            utility class in the precompiled stylesheet, only the keyframe exists */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-accent/40 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ animation: 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
        />
      </div>
    </button>
  );
}
