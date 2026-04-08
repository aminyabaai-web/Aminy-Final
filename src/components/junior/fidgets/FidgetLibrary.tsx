// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * FidgetLibrary — Main fidget browser
 * Colorful grid of 10 fidget cards that kids tap to open.
 */
import { useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { playTap, haptic } from '../activities/sounds';

import PopIt from './PopIt';
import FidgetSpinner from './FidgetSpinner';
import ColorWheel from './ColorWheel';
import ToggleSwitches from './ToggleSwitches';
import ZenGarden from './ZenGarden';
import SquishBall from './SquishBall';
import InfinityLoop from './InfinityLoop';
import DrawingPad from './DrawingPad';
import BubbleWrap from './BubbleWrap';
import FluidSim from './FluidSim';

interface FidgetLibraryProps {
  onBack: () => void;
  onComplete?: (data: { timeSpent: number; interactions: number }) => void;
}

interface FidgetDef {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  description: string;
  component: React.ComponentType<{ onBack: () => void; onComplete?: (data: { timeSpent: number; interactions: number }) => void }>;
}

const FIDGETS: FidgetDef[] = [
  {
    id: 'pop-it',
    name: 'Pop-It',
    emoji: '🫧',
    gradient: 'linear-gradient(135deg, #EF4444, #F97316)',
    description: 'Pop colorful bubbles!',
    component: PopIt,
  },
  {
    id: 'spinner',
    name: 'Spinner',
    emoji: '🌀',
    gradient: 'linear-gradient(135deg, #3B82F6, #6366F1)',
    description: 'Spin it fast!',
    component: FidgetSpinner,
  },
  {
    id: 'color-wheel',
    name: 'Colors',
    emoji: '🌈',
    gradient: 'linear-gradient(135deg, #EC4899, #F59E0B)',
    description: 'Pick your color',
    component: ColorWheel,
  },
  {
    id: 'toggles',
    name: 'Toggles',
    emoji: '🔘',
    gradient: 'linear-gradient(135deg, #22C55E, #06B6D4)',
    description: 'Click click click!',
    component: ToggleSwitches,
  },
  {
    id: 'zen-garden',
    name: 'Zen Garden',
    emoji: '🏖️',
    gradient: 'linear-gradient(135deg, #D4A574, #A0926E)',
    description: 'Draw in the sand',
    component: ZenGarden,
  },
  {
    id: 'squish-ball',
    name: 'Squish Ball',
    emoji: '🟣',
    gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)',
    description: 'Squish and bounce!',
    component: SquishBall,
  },
  {
    id: 'infinity-loop',
    name: 'Infinity',
    emoji: '♾️',
    gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    description: 'Trace the loop',
    component: InfinityLoop,
  },
  {
    id: 'drawing-pad',
    name: 'Drawing',
    emoji: '🎨',
    gradient: 'linear-gradient(135deg, #F43F5E, #A855F7)',
    description: 'Draw anything!',
    component: DrawingPad,
  },
  {
    id: 'bubble-wrap',
    name: 'Bubble Wrap',
    emoji: '💥',
    gradient: 'linear-gradient(135deg, #10B981, #3B82F6)',
    description: 'Pop pop pop!',
    component: BubbleWrap,
  },
  {
    id: 'fluid-sim',
    name: 'Lava Lamp',
    emoji: '🫠',
    gradient: 'linear-gradient(135deg, #7C3AED, #EC4899)',
    description: 'Touch the lava',
    component: FluidSim,
  },
];

export default function FidgetLibrary({ onBack, onComplete }: FidgetLibraryProps) {
  const [activeFidget, setActiveFidget] = useState<string | null>(null);
  const startTime = useRef(Date.now());
  const totalInteractions = useRef(0);

  const openFidget = useCallback((id: string) => {
    playTap();
    haptic(30);
    setActiveFidget(id);
  }, []);

  const closeFidget = useCallback(() => {
    setActiveFidget(null);
  }, []);

  const handleFidgetComplete = useCallback((data: { timeSpent: number; interactions: number }) => {
    totalInteractions.current += data.interactions;
  }, []);

  const handleBack = useCallback(() => {
    onComplete?.({
      timeSpent: Math.floor((Date.now() - startTime.current) / 1000),
      interactions: totalInteractions.current,
    });
    onBack();
  }, [onBack, onComplete]);

  // Render active fidget
  if (activeFidget) {
    const fidget = FIDGETS.find(f => f.id === activeFidget);
    if (fidget) {
      const Component = fidget.component;
      return <Component onBack={closeFidget} onComplete={handleFidgetComplete} />;
    }
  }

  // Library grid
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fce7f3 30%, #e0e7ff 60%, #ccfbf1 100%)' }}>
      {/* Header */}
      <div className="w-full flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <ArrowLeft size={24} color="#333" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1e293b' }}>Fidgets</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Pick one to play with!</p>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {FIDGETS.map((fidget, i) => (
            <motion.button
              key={fidget.id}
              onClick={() => openFidget(fidget.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-2xl p-4 flex flex-col items-center gap-2 text-left"
              style={{
                background: fidget.gradient,
                minHeight: 130,
                minWidth: 44,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            >
              <span className="text-4xl" role="img" aria-hidden="true">{fidget.emoji}</span>
              <span className="text-base font-bold text-white drop-shadow-sm">{fidget.name}</span>
              <span className="text-xs text-white/80">{fidget.description}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
