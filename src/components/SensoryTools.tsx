// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Star,
  Volume2,
  Settings,
  Wind,
  Droplet,
  Circle,
  RotateCw,
  CheckCircle,
  Sparkles,
  Moon,
  Sun,
  Waves,
  X
} from 'lucide-react';
import { connectorActions } from '../lib/connector-hub';

interface SensoryToolsProps {
  childName: string;
  onBack: () => void;
  onSessionComplete?: (data: {
    toolId: string;
    duration: number;
    completed: boolean;
    moodBefore?: number;
    moodAfter?: number;
    coinsEarned?: number;
    toolType?: string;
  }) => void;
}

type ToolType = 'fluid-swirl' | 'bubble-pop' | 'fidget-spinner' | 'breathe-glow' | null;

interface Bubble {
  id: string;
  x: number;
  y: number;
  size: number;
  velocity: { x: number; y: number };
  hue: number;           // Pre-computed color
  wobblePhase: number;   // For wobble animation
  wobbleSpeed: number;   // Wobble frequency
}

interface PopEffect {
  id: string;
  x: number;
  y: number;
  size: number;
  hue: number;
}

interface AmbientParticle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  speed: number;
  opacity: number;
}

export function SensoryTools({ childName, onBack, onSessionComplete }: SensoryToolsProps) {
  const [selectedTool, setSelectedTool] = useState<ToolType>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings
  const [visualIntensity, setVisualIntensity] = useState(50);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  
  // Tool-specific state
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popEffects, setPopEffects] = useState<PopEffect[]>([]);
  const [spinnerRotation, setSpinnerRotation] = useState(0);
  const [spinnerVelocity, setSpinnerVelocity] = useState(0);
  const [breathePhase, setBreathePhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breatheProgress, setBreatheProgress] = useState(0);
  const [breatheParticles, setBreatheParticles] = useState<AmbientParticle[]>([]);
  const [fluidParticles, setFluidParticles] = useState<Array<{ x: number; y: number; vx: number; vy: number; hue: number; size: number }>>([]);
  const [touchPoint, setTouchPoint] = useState<{ x: number; y: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(undefined);

  // Timer for session duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStartTime && selectedTool) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
        setSessionDuration(elapsed);
        
        // Auto-complete after 90 seconds
        if (elapsed >= 90) {
          handleCompleteSession(true);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStartTime, selectedTool]);

  // Haptic feedback
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!hapticEnabled) return;
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30
      };
      navigator.vibrate(patterns[intensity]);
    }
  }, [hapticEnabled]);

  // ========== FLUID SWIRL ==========
  useEffect(() => {
    if (selectedTool !== 'fluid-swirl' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Initialize particles with varied sizes
    const particles: Array<{ x: number; y: number; vx: number; vy: number; hue: number; size: number }> = [];
    for (let i = 0; i < 300; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        hue: Math.random() * 360,
        size: 2 + Math.random() * 4 // 2-6px varied sizes
      });
    }
    setFluidParticles(particles);

    let hueShift = 0;
    let lastTouchPoint: { x: number; y: number } | null = null;

    const animate = () => {
      // Fade effect for trails
      ctx.fillStyle = `rgba(15, 15, 25, ${0.08 * (visualIntensity / 100)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      hueShift = (hueShift + 0.3) % 360; // Smooth color shifting

      particles.forEach((p, i) => {
        // Apply gentle drift when not touching
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Add slight random movement for organic feel
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += (Math.random() - 0.5) * 0.1;

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Soft bounce off edges
        if (p.x < 0) { p.x = 0; p.vx *= -0.8; }
        if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -0.8; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.8; }
        if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -0.8; }

        // Shift hue over time for rainbow effect
        p.hue = (p.hue + 0.2) % 360;

        // Draw glowing particle
        const alpha = 0.7 * (visualIntensity / 100);
        const displayHue = (p.hue + hueShift) % 360;

        // Outer glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, `hsla(${displayHue}, 80%, 65%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${displayHue}, 70%, 55%, ${alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${displayHue}, 60%, 45%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core particle
        ctx.fillStyle = `hsla(${displayHue}, 90%, 75%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections to nearby particles
        particles.slice(i + 1, i + 30).forEach(p2 => {
          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 80) {
            const lineAlpha = (1 - distance / 80) * alpha * 0.4;
            ctx.strokeStyle = `hsla(${(displayHue + (p2.hue + hueShift) % 360) / 2}, 70%, 60%, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedTool, visualIntensity]);

  const handleFluidTouch = (e: React.TouchEvent | React.MouseEvent) => {
    if (selectedTool !== 'fluid-swirl' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    setTouchPoint({ x, y });

    // Add force to nearby particles with improved physics
    fluidParticles.forEach(p => {
      const dx = p.x - x;
      const dy = p.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 150 && distance > 0) {
        // Smoother force falloff with quadratic curve
        const force = Math.pow((150 - distance) / 150, 2) * 3;
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;

        // Push particles away from touch point
        p.vx += normalizedDx * force;
        p.vy += normalizedDy * force;

        // Add slight swirl effect
        p.vx += normalizedDy * force * 0.3;
        p.vy -= normalizedDx * force * 0.3;

        // Clamp velocity
        const maxVel = 8;
        const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (vel > maxVel) {
          p.vx = (p.vx / vel) * maxVel;
          p.vy = (p.vy / vel) * maxVel;
        }
      }
    });

    triggerHaptic('light');
  };

  // ========== BUBBLE POP ==========
  useEffect(() => {
    if (selectedTool !== 'bubble-pop') return;

    const interval = setInterval(() => {
      if (bubbles.length < 15) {
        // Pre-compute bubble colors for consistent rendering
        const hue = Math.random() * 360;
        const newBubble: Bubble = {
          id: `bubble-${Date.now()}-${Math.random()}`,
          x: Math.random() * (window.innerWidth - 100) + 50,
          y: window.innerHeight + 50,
          size: 50 + Math.random() * 50,
          velocity: {
            x: (Math.random() - 0.5) * 1.5,
            y: -1.5 - Math.random() * 1.5
          },
          hue,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.03
        };
        setBubbles(prev => [...prev, newBubble]);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [selectedTool, bubbles.length]);

  useEffect(() => {
    if (selectedTool !== 'bubble-pop') return;

    const animate = () => {
      setBubbles(prev =>
        prev
          .map(bubble => ({
            ...bubble,
            x: bubble.x + bubble.velocity.x + Math.sin(bubble.wobblePhase) * 0.5,
            y: bubble.y + bubble.velocity.y,
            wobblePhase: bubble.wobblePhase + bubble.wobbleSpeed
          }))
          .filter(bubble => bubble.y > -100)
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedTool]);

  // Clean up pop effects after animation
  useEffect(() => {
    if (popEffects.length === 0) return;

    const timeout = setTimeout(() => {
      setPopEffects(prev => prev.slice(1));
    }, 500);

    return () => clearTimeout(timeout);
  }, [popEffects]);

  const handleBubblePop = (bubble: Bubble) => {
    // Create pop effect at bubble location
    setPopEffects(prev => [...prev, {
      id: bubble.id,
      x: bubble.x,
      y: bubble.y,
      size: bubble.size,
      hue: bubble.hue
    }]);

    setBubbles(prev => prev.filter(b => b.id !== bubble.id));
    triggerHaptic('medium');
  };

  // ========== FIDGET SPINNER ==========
  useEffect(() => {
    if (selectedTool !== 'fidget-spinner') return;

    const animate = () => {
      setSpinnerRotation(prev => (prev + spinnerVelocity) % 360);
      // Much lower friction for longer, satisfying spins
      setSpinnerVelocity(prev => prev * 0.995);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedTool, spinnerVelocity]);

  const handleSpinnerSpin = () => {
    // Add to existing velocity for more realistic momentum
    setSpinnerVelocity(prev => Math.min(prev + 15 + Math.random() * 10, 45));
    triggerHaptic('heavy');
  };

  // Calculate RPM for display
  const spinnerRPM = Math.round(Math.abs(spinnerVelocity) * 10);

  // ========== BREATHE GLOW ==========
  // Initialize ambient particles for breathe glow
  useEffect(() => {
    if (selectedTool !== 'breathe-glow') return;

    // Create floating ambient particles
    const particles: AmbientParticle[] = [];
    for (let i = 0; i < 20; i++) {
      particles.push({
        id: i,
        angle: (i / 20) * Math.PI * 2,
        distance: 150 + Math.random() * 100,
        size: 2 + Math.random() * 4,
        speed: 0.002 + Math.random() * 0.003,
        opacity: 0.3 + Math.random() * 0.4
      });
    }
    setBreatheParticles(particles);

    return () => setBreatheParticles([]);
  }, [selectedTool]);

  // Animate ambient particles
  useEffect(() => {
    if (selectedTool !== 'breathe-glow' || breatheParticles.length === 0) return;

    const animate = () => {
      setBreatheParticles(prev =>
        prev.map(p => ({
          ...p,
          angle: p.angle + p.speed,
          // Pulse distance with breathing
          distance: breathePhase === 'inhale'
            ? 150 + (breatheProgress / 100) * 50
            : breathePhase === 'hold'
              ? 200
              : 200 - (breatheProgress / 100) * 50
        }))
      );
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedTool, breatheParticles.length, breathePhase, breatheProgress]);

  useEffect(() => {
    if (selectedTool !== 'breathe-glow') return;

    const cycleDuration = {
      inhale: 4000,
      hold: 2000,
      exhale: 6000
    };

    const updateBreatheCycle = () => {
      setBreatheProgress(prev => {
        const duration = cycleDuration[breathePhase];
        const increment = (100 / duration) * 100; // 100ms intervals

        if (prev >= 100) {
          // Move to next phase
          if (breathePhase === 'inhale') {
            setBreathePhase('hold');
          } else if (breathePhase === 'hold') {
            setBreathePhase('exhale');
          } else {
            setBreathePhase('inhale');
          }
          return 0;
        }

        return prev + increment;
      });
    };

    const interval = setInterval(updateBreatheCycle, 100);

    return () => clearInterval(interval);
  }, [selectedTool, breathePhase]);

  const getGlowSize = () => {
    // Smoother easing with cubic function
    const easeProgress = breatheProgress / 100;
    const easedProgress = breathePhase === 'inhale'
      ? easeProgress * easeProgress * (3 - 2 * easeProgress) // Smooth ease in-out
      : easeProgress * easeProgress * (3 - 2 * easeProgress);

    if (breathePhase === 'inhale') {
      return 100 + easedProgress * 150; // 100px to 250px
    } else if (breathePhase === 'hold') {
      return 250;
    } else {
      return 250 - easedProgress * 150; // 250px to 100px
    }
  };

  // Get phase duration for progress arc
  const getPhaseDuration = () => {
    const durations = { inhale: 4, hold: 2, exhale: 6 };
    return durations[breathePhase];
  };

  // Start session
  const handleStartTool = (tool: ToolType) => {
    setSelectedTool(tool);
    setSessionStartTime(new Date());
    setSessionDuration(0);
  };

  // Complete session
  const handleCompleteSession = (autoComplete = false) => {
    if (!selectedTool || !sessionStartTime) return;

    const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
    const completed = duration >= 60; // At least 60 seconds

    // Log to connector
    connectorActions.logOutcome({
      childId: 'child-1',
      type: 'sensory_tool',
      subtype: selectedTool,
      value: duration,
      metadata: {
        toolId: selectedTool,
        duration,
        completed,
        visualIntensity,
        hapticEnabled
      }
    });

    // Award star if completed
    if (completed) {
      toast.success(`Great job! ${childName} earned a star! ⭐`);
    }

    // Callback
    if (onSessionComplete) {
      onSessionComplete({
        toolId: selectedTool,
        duration,
        completed
      });
    }

    // Reset
    setSelectedTool(null);
    setSessionStartTime(null);
    setSessionDuration(0);
    setBubbles([]);
    setPopEffects([]);
    setSpinnerVelocity(0);
    setSpinnerRotation(0);
    setBreathePhase('inhale');
    setBreatheProgress(0);
    setBreatheParticles([]);
    setTouchPoint(null);

    if (!autoComplete) {
      toast.info('Session saved!');
    }
  };

  const tools = [
    {
      id: 'fluid-swirl' as ToolType,
      name: 'Fluid Swirl',
      description: 'Touch and swirl colorful, flowing particles',
      icon: <Waves className="w-8 h-8" />,
      color: 'from-cyan-400 to-blue-500'
    },
    {
      id: 'bubble-pop' as ToolType,
      name: 'Bubble Pop',
      description: 'Pop floating bubbles for tactile feedback',
      icon: <Circle className="w-8 h-8" />,
      color: 'from-purple-400 to-pink-500'
    },
    {
      id: 'fidget-spinner' as ToolType,
      name: 'Fidget Spinner',
      description: 'Spin and watch it gradually slow down',
      icon: <RotateCw className="w-8 h-8" />,
      color: 'from-orange-400 to-red-500'
    },
    {
      id: 'breathe-glow' as ToolType,
      name: 'Breathe Glow',
      description: 'Follow the glowing circle to calm breathing',
      icon: <Wind className="w-8 h-8" />,
      color: 'from-green-400 to-teal-500'
    }
  ];

  // Tool selection view
  if (!selectedTool) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-[#E8E4DF] px-4 py-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack} aria-label="Go back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg text-[#1B2733]">Calm Corner</h1>
                <p className="text-sm text-[#5A6B7A]">Sensory tools for {childName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Accessibility settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-6">
          {/* Settings Panel */}
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="p-4 bg-white/80 border-purple-200">
                <h3 className="font-medium text-[#1B2733] mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Accessibility Settings
                </h3>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <Label className="text-sm text-[#3A4A57] mb-2">Visual Intensity</Label>
                    <Slider
                      value={[visualIntensity]}
                      onValueChange={([value]) => setVisualIntensity(value)}
                      min={10}
                      max={100}
                      step={10}
                      className="mt-2"
                    />
                    <p className="text-sm text-[#5A6B7A] mt-1">{visualIntensity}%</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-[#3A4A57]">Haptic Feedback</Label>
                    <Switch
                      checked={hapticEnabled}
                      onCheckedChange={setHapticEnabled}
                    />
                  </div>

                  {/* Ambient sounds - coming in future update
                  <div>
                    <Label className="text-sm text-[#3A4A57] mb-2">Ambient Sound</Label>
                    <p className="text-sm text-[#8A9BA8]">Coming soon</p>
                  </div>
                  */}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Info Banner */}
          <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-[#3A4A57] mb-1">
                  These tools help with sensory regulation and calming
                </p>
                <p className="text-sm text-[#5A6B7A]">
                  Each session is 90 seconds. Complete a full session to earn a star! ⭐
                </p>
              </div>
            </div>
          </Card>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => handleStartTool(tool.id)}
                className="group relative overflow-hidden rounded-2xl border-2 border-[#E8E4DF] bg-white hover:border-purple-400 transition-all hover:shadow-lg"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="relative p-6">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white`}>
                      {tool.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-medium text-[#1B2733] mb-1">{tool.name}</h3>
                      <p className="text-sm text-[#5A6B7A]">{tool.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-purple-300 text-purple-700">
                    <Star className="w-3 h-3 mr-1" />
                    90 seconds
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // Tool active view
  const currentTool = tools.find(t => t.id === selectedTool);
  const progressPercent = Math.min(100, (sessionDuration / 90) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white relative overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCompleteSession()}
              className="text-white hover:bg-white/20"
              aria-label="End session"
            >
              <X className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-sm font-medium">{currentTool?.name}</h2>
              <p className="text-sm text-gray-300">{90 - sessionDuration}s remaining</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-300">Progress</p>
            <p className="text-sm font-medium">{Math.round(progressPercent)}%</p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-2">
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>

      {/* Tool Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {selectedTool === 'fluid-swirl' && (
          <canvas
            ref={canvasRef}
            onMouseMove={handleFluidTouch}
            onTouchMove={handleFluidTouch}
            onClick={handleFluidTouch}
            className="w-full h-full cursor-pointer"
            style={{ touchAction: 'none' }}
          />
        )}

        {selectedTool === 'bubble-pop' && (
          <div className="w-full h-full relative overflow-hidden">
            {/* Pop effects layer */}
            <AnimatePresence>
              {popEffects.map(effect => (
                <motion.div
                  key={`pop-${effect.id}`}
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute pointer-events-none"
                  style={{
                    left: effect.x,
                    top: effect.y,
                    width: effect.size,
                    height: effect.size,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {/* Expanding ring */}
                  <div
                    className="absolute inset-0 rounded-full border-4"
                    style={{
                      borderColor: `hsla(${effect.hue}, 80%, 70%, 0.8)`
                    }}
                  />
                  {/* Sparkle particles */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 1, x: 0, y: 0, opacity: 1 }}
                      animate={{
                        scale: 0,
                        x: Math.cos((i / 8) * Math.PI * 2) * 60,
                        y: Math.sin((i / 8) * Math.PI * 2) * 60,
                        opacity: 0
                      }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full"
                      style={{
                        background: `hsla(${(effect.hue + i * 20) % 360}, 90%, 70%, 1)`,
                        boxShadow: `0 0 8px hsla(${(effect.hue + i * 20) % 360}, 90%, 70%, 0.8)`
                      }}
                    />
                  ))}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Bubbles layer */}
            <AnimatePresence>
              {bubbles.map(bubble => (
                <motion.button
                  key={bubble.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1 + Math.sin(bubble.wobblePhase * 2) * 0.05,
                    opacity: 0.9,
                    x: bubble.x,
                    y: bubble.y
                  }}
                  exit={{ scale: 1.3, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleBubblePop(bubble)}
                  className="absolute"
                  style={{
                    width: bubble.size,
                    height: bubble.size,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {/* Bubble with iridescent shimmer */}
                  <div
                    className="w-full h-full rounded-full relative overflow-hidden"
                    style={{
                      background: `
                        radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9) 0%, transparent 50%),
                        radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.3) 0%, transparent 30%),
                        linear-gradient(135deg,
                          hsla(${bubble.hue}, 70%, 75%, 0.7) 0%,
                          hsla(${(bubble.hue + 40) % 360}, 70%, 65%, 0.6) 50%,
                          hsla(${(bubble.hue + 80) % 360}, 70%, 70%, 0.7) 100%
                        )
                      `,
                      boxShadow: `
                        inset 0 0 ${bubble.size * 0.3}px rgba(255, 255, 255, 0.4),
                        inset -${bubble.size * 0.1}px -${bubble.size * 0.1}px ${bubble.size * 0.2}px rgba(0, 0, 0, 0.1),
                        0 0 ${bubble.size * 0.2}px hsla(${bubble.hue}, 60%, 60%, 0.3)
                      `,
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    {/* Shimmer highlight */}
                    <div
                      className="absolute w-1/3 h-1/3 rounded-full"
                      style={{
                        top: '15%',
                        left: '20%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)'
                      }}
                    />
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {selectedTool === 'fidget-spinner' && (
          <div className="flex flex-col items-center gap-8">
            <motion.div
              animate={{ rotate: spinnerRotation }}
              onClick={handleSpinnerSpin}
              className="cursor-pointer select-none"
              style={{
                // Add motion blur at high speeds
                filter: spinnerVelocity > 20 ? `blur(${Math.min(spinnerVelocity / 15, 3)}px)` : 'none'
              }}
            >
              <div className="relative w-64 h-64">
                {/* Spinner arms with 3D effect */}
                {[0, 120, 240].map((angle, i) => {
                  const armColors = [
                    { from: '#60A5FA', to: '#7C3AED', shadow: 'rgba(124, 58, 237, 0.6)' },
                    { from: '#34D399', to: '#0EA5E9', shadow: 'rgba(14, 165, 233, 0.6)' },
                    { from: '#F472B6', to: '#F59E0B', shadow: 'rgba(245, 158, 11, 0.6)' }
                  ];
                  const colors = armColors[i];

                  return (
                    <div
                      key={i}
                      className="absolute top-1/2 left-1/2 w-20 h-20 -ml-10 -mt-10 rounded-full"
                      style={{
                        transform: `rotate(${angle}deg) translateY(-80px)`,
                        background: `
                          radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 50%),
                          linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)
                        `,
                        boxShadow: `
                          0 0 30px ${colors.shadow},
                          inset 0 2px 4px rgba(255,255,255,0.3),
                          inset 0 -2px 4px rgba(0,0,0,0.2),
                          0 4px 8px rgba(0,0,0,0.3)
                        `
                      }}
                    >
                      {/* Inner bearing circle */}
                      <div
                        className="absolute top-1/2 left-1/2 w-8 h-8 -ml-4 -mt-4 rounded-full"
                        style={{
                          background: `
                            radial-gradient(circle at 40% 40%, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%)
                          `,
                          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.3)'
                        }}
                      />
                    </div>
                  );
                })}

                {/* Center hub with 3D metallic effect */}
                <div
                  className="absolute top-1/2 left-1/2 w-16 h-16 -ml-8 -mt-8 rounded-full"
                  style={{
                    background: `
                      radial-gradient(circle at 35% 35%, #f3f4f6 0%, #d1d5db 30%, #9ca3af 60%, #6b7280 100%)
                    `,
                    boxShadow: `
                      0 0 20px rgba(0,0,0,0.3),
                      inset 0 2px 4px rgba(255,255,255,0.6),
                      inset 0 -2px 4px rgba(0,0,0,0.3),
                      0 4px 12px rgba(0,0,0,0.4)
                    `,
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}
                >
                  {/* Center dot */}
                  <div
                    className="absolute top-1/2 left-1/2 w-4 h-4 -ml-2 -mt-2 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 40% 40%, #374151 0%, #111827 100%)',
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2)'
                    }}
                  />
                </div>
              </div>
            </motion.div>

            {/* RPM Counter and instructions */}
            <div className="text-center">
              {spinnerRPM > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold text-purple-400 mb-2"
                >
                  {spinnerRPM} RPM
                </motion.p>
              )}
              <p className="text-lg text-gray-300">
                {spinnerRPM > 100 ? 'Great spin!' : spinnerRPM > 0 ? 'Keep tapping!' : 'Tap to spin!'}
              </p>
            </div>
          </div>
        )}

        {selectedTool === 'breathe-glow' && (
          <div className="flex flex-col items-center gap-8 relative">
            {/* Ambient floating particles */}
            {breatheParticles.map(particle => (
              <motion.div
                key={particle.id}
                className="absolute rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${Math.cos(particle.angle) * particle.distance}px, ${Math.sin(particle.angle) * particle.distance}px)`,
                  background: `radial-gradient(circle, rgba(52, 211, 153, ${particle.opacity}) 0%, transparent 70%)`,
                  boxShadow: `0 0 ${particle.size * 2}px rgba(52, 211, 153, ${particle.opacity * 0.5})`
                }}
              />
            ))}

            {/* Progress arc container */}
            <div className="relative">
              {/* SVG Progress Arc */}
              <svg
                className="absolute"
                style={{
                  width: getGlowSize() + 40,
                  height: getGlowSize() + 40,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Background arc */}
                <circle
                  cx={(getGlowSize() + 40) / 2}
                  cy={(getGlowSize() + 40) / 2}
                  r={(getGlowSize() + 20) / 2}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                />
                {/* Progress arc */}
                <circle
                  cx={(getGlowSize() + 40) / 2}
                  cy={(getGlowSize() + 40) / 2}
                  r={(getGlowSize() + 20) / 2}
                  fill="none"
                  stroke={breathePhase === 'inhale' ? '#34D399' : breathePhase === 'hold' ? '#60A5FA' : '#A78BFA'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={Math.PI * (getGlowSize() + 20)}
                  strokeDashoffset={Math.PI * (getGlowSize() + 20) * (1 - breatheProgress / 100)}
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center',
                    transition: 'stroke 0.3s ease'
                  }}
                />
              </svg>

              {/* Main glow orb */}
              <motion.div
                animate={{
                  width: getGlowSize(),
                  height: getGlowSize(),
                  opacity: breathePhase === 'hold' ? 1 : 0.85
                }}
                transition={{ duration: 0.1, ease: 'linear' }}
                className="rounded-full relative"
                style={{
                  background: `
                    radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3) 0%, transparent 40%),
                    radial-gradient(circle at center, #34D399 0%, #0D9488 50%, #0F766E 100%)
                  `,
                  boxShadow: `
                    0 0 ${getGlowSize() / 2}px rgba(52, 211, 153, 0.5),
                    0 0 ${getGlowSize()}px rgba(52, 211, 153, 0.3),
                    inset 0 0 ${getGlowSize() / 4}px rgba(255, 255, 255, 0.2)
                  `
                }}
              >
                {/* Pulsing ring during hold phase */}
                {breathePhase === 'hold' && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-white/20"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </motion.div>
            </div>

            {/* Phase indicator */}
            <div className="text-center mt-4">
              <motion.p
                key={breathePhase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-medium capitalize mb-2"
                style={{
                  color: breathePhase === 'inhale' ? '#34D399' : breathePhase === 'hold' ? '#60A5FA' : '#A78BFA'
                }}
              >
                {breathePhase}
              </motion.p>
              <p className="text-sm text-[#8A9BA8]">
                {breathePhase === 'inhale' && 'Breathe in slowly...'}
                {breathePhase === 'hold' && 'Hold gently...'}
                {breathePhase === 'exhale' && 'Breathe out slowly...'}
              </p>
              <p className="text-sm text-[#5A6B7A] mt-1">
                {getPhaseDuration()}s phase
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Completion Badge */}
      {sessionDuration >= 60 && sessionDuration < 90 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <Badge className="bg-yellow-500 text-yellow-900 px-4 py-2 text-sm">
            <Star className="w-4 h-4 mr-2" />
            Almost done! Keep going to earn your star!
          </Badge>
        </motion.div>
      )}
    </div>
  );
}
