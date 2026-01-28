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
  VolumeX,
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
  Music,
  CloudRain,
  Flame,
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
  }) => void;
}

type ToolType = 'fluid-swirl' | 'bubble-pop' | 'fidget-spinner' | 'breathe-glow' | null;
type AmbientSound = 'none' | 'rain' | 'ocean' | 'campfire' | 'forest';

interface Bubble {
  id: string;
  x: number;
  y: number;
  size: number;
  velocity: { x: number; y: number };
}

export function SensoryTools({ childName, onBack, onSessionComplete }: SensoryToolsProps) {
  const [selectedTool, setSelectedTool] = useState<ToolType>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings
  const [visualIntensity, setVisualIntensity] = useState(50);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [ambientSound, setAmbientSound] = useState<AmbientSound>('none');
  const [soundVolume, setSoundVolume] = useState(30);
  
  // Tool-specific state
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [spinnerRotation, setSpinnerRotation] = useState(0);
  const [spinnerVelocity, setSpinnerVelocity] = useState(0);
  const [breathePhase, setBreathePhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breatheProgress, setBreatheProgress] = useState(0);
  const [fluidParticles, setFluidParticles] = useState<Array<{ x: number; y: number; vx: number; vy: number; hue: number }>>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>();

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

  // Ambient sound management
  useEffect(() => {
    if (ambientSound !== 'none' && audioRef.current) {
      // In production, these would be actual audio files
      // For now, we simulate
      if (audioRef.current.volume !== soundVolume / 100) {
        audioRef.current.volume = soundVolume / 100;
      }
    }
  }, [ambientSound, soundVolume]);

  // ========== FLUID SWIRL ==========
  useEffect(() => {
    if (selectedTool !== 'fluid-swirl' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Initialize particles
    const particles: Array<{ x: number; y: number; vx: number; vy: number; hue: number }> = [];
    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        hue: Math.random() * 360
      });
    }
    setFluidParticles(particles);

    const animate = () => {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * (visualIntensity / 100)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw particle
        const alpha = 0.6 * (visualIntensity / 100);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach(p2 => {
          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 70%, 60%, ${(1 - distance / 100) * alpha})`;
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

    // Add force to nearby particles
    fluidParticles.forEach(p => {
      const dx = p.x - x;
      const dy = p.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 100) {
        const force = (100 - distance) / 100;
        p.vx += (dx / distance) * force * 2;
        p.vy += (dy / distance) * force * 2;
      }
    });

    triggerHaptic('light');
  };

  // ========== BUBBLE POP ==========
  useEffect(() => {
    if (selectedTool !== 'bubble-pop') return;

    const interval = setInterval(() => {
      if (bubbles.length < 20) {
        const newBubble: Bubble = {
          id: `bubble-${Date.now()}-${Math.random()}`,
          x: Math.random() * (window.innerWidth - 100) + 50,
          y: window.innerHeight + 50,
          size: 40 + Math.random() * 60,
          velocity: {
            x: (Math.random() - 0.5) * 2,
            y: -2 - Math.random() * 2
          }
        };
        setBubbles(prev => [...prev, newBubble]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedTool, bubbles.length]);

  useEffect(() => {
    if (selectedTool !== 'bubble-pop') return;

    const animate = () => {
      setBubbles(prev =>
        prev
          .map(bubble => ({
            ...bubble,
            x: bubble.x + bubble.velocity.x,
            y: bubble.y + bubble.velocity.y
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

  const handleBubblePop = (bubbleId: string) => {
    setBubbles(prev => prev.filter(b => b.id !== bubbleId));
    triggerHaptic('medium');
  };

  // ========== FIDGET SPINNER ==========
  useEffect(() => {
    if (selectedTool !== 'fidget-spinner') return;

    const animate = () => {
      setSpinnerRotation(prev => (prev + spinnerVelocity) % 360);
      setSpinnerVelocity(prev => prev * 0.98); // Friction

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
    setSpinnerVelocity(20 + Math.random() * 20);
    triggerHaptic('heavy');
  };

  // ========== BREATHE GLOW ==========
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
    if (breathePhase === 'inhale') {
      return 100 + (breatheProgress / 100) * 150; // 100px to 250px
    } else if (breathePhase === 'hold') {
      return 250;
    } else {
      return 250 - (breatheProgress / 100) * 150; // 250px to 100px
    }
  };

  // Start session
  const handleStartTool = (tool: ToolType) => {
    setSelectedTool(tool);
    setSessionStartTime(new Date());
    setSessionDuration(0);
    
    // Start ambient sound if selected
    if (ambientSound !== 'none') {
      toast.info(`${ambientSound} sounds playing softly...`);
    }
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
        hapticEnabled,
        ambientSound
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
    setSpinnerVelocity(0);
    setBreathePhase('inhale');
    setBreatheProgress(0);

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

  const ambientSounds = [
    { id: 'none' as AmbientSound, name: 'No sound', icon: <VolumeX className="w-4 h-4" /> },
    { id: 'rain' as AmbientSound, name: 'Rain', icon: <CloudRain className="w-4 h-4" /> },
    { id: 'ocean' as AmbientSound, name: 'Ocean waves', icon: <Waves className="w-4 h-4" /> },
    { id: 'campfire' as AmbientSound, name: 'Campfire', icon: <Flame className="w-4 h-4" /> },
    { id: 'forest' as AmbientSound, name: 'Forest', icon: <Music className="w-4 h-4" /> }
  ];

  // Tool selection view
  if (!selectedTool) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg text-gray-900">Calm Corner</h1>
                <p className="text-xs text-gray-500">Sensory tools for {childName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Settings Panel */}
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="p-4 bg-white/80 border-purple-200">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Accessibility Settings
                </h3>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <Label className="text-sm text-gray-700 mb-2">Visual Intensity</Label>
                    <Slider
                      value={[visualIntensity]}
                      onValueChange={([value]) => setVisualIntensity(value)}
                      min={10}
                      max={100}
                      step={10}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">{visualIntensity}%</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-700">Haptic Feedback</Label>
                    <Switch
                      checked={hapticEnabled}
                      onCheckedChange={setHapticEnabled}
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-700 mb-2">Ambient Sound</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {ambientSounds.map(sound => (
                        <button
                          key={sound.id}
                          onClick={() => setAmbientSound(sound.id)}
                          className={`p-2 rounded-lg border-2 text-sm flex items-center gap-2 transition-all ${
                            ambientSound === sound.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-purple-300'
                          }`}
                        >
                          {sound.icon}
                          {sound.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {ambientSound !== 'none' && (
                    <div>
                      <Label className="text-sm text-gray-700 mb-2">Volume</Label>
                      <Slider
                        value={[soundVolume]}
                        onValueChange={([value]) => setSoundVolume(value)}
                        min={0}
                        max={100}
                        step={10}
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">{soundVolume}%</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Info Banner */}
          <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-700 mb-1">
                  These tools help with sensory regulation and calming
                </p>
                <p className="text-xs text-gray-500">
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
                className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white hover:border-purple-400 transition-all hover:shadow-lg"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="relative p-6">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white`}>
                      {tool.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-medium text-gray-900 mb-1">{tool.name}</h3>
                      <p className="text-sm text-gray-600">{tool.description}</p>
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

        {/* Hidden audio element for ambient sounds */}
        <audio ref={audioRef} loop />
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
            >
              <X className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-sm font-medium">{currentTool?.name}</h2>
              <p className="text-xs text-gray-300">{90 - sessionDuration}s remaining</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-300">Progress</p>
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
          <div className="w-full h-full relative">
            <AnimatePresence>
              {bubbles.map(bubble => (
                <motion.button
                  key={bubble.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.8, x: bubble.x, y: bubble.y }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={() => handleBubblePop(bubble.id)}
                  className="absolute"
                  style={{
                    width: bubble.size,
                    height: bubble.size,
                    transform: `translate(-50%, -50%)`
                  }}
                >
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), hsla(${Math.random() * 360}, 70%, 60%, 0.6))`,
                      boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.5)'
                    }}
                  />
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
              className="cursor-pointer"
            >
              <div className="relative w-64 h-64">
                {[0, 120, 240].map((angle, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-20 h-20 -ml-10 -mt-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600"
                    style={{
                      transform: `rotate(${angle}deg) translateY(-80px)`,
                      boxShadow: '0 0 30px rgba(99, 102, 241, 0.6)'
                    }}
                  />
                ))}
                <div className="absolute top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-4 sm:mt-6 rounded-full bg-gray-800 border-4 border-white" />
              </div>
            </motion.div>
            <p className="text-lg text-gray-300">Tap to spin!</p>
          </div>
        )}

        {selectedTool === 'breathe-glow' && (
          <div className="flex flex-col items-center gap-8">
            <motion.div
              animate={{
                width: getGlowSize(),
                height: getGlowSize(),
                opacity: breathePhase === 'hold' ? 1 : 0.7
              }}
              transition={{ duration: 0.3 }}
              className="rounded-full bg-gradient-to-br from-green-400 to-teal-500"
              style={{
                boxShadow: `0 0 ${getGlowSize() / 2}px rgba(52, 211, 153, 0.6)`
              }}
            />
            <div className="text-center">
              <p className="text-2xl font-medium capitalize mb-2">{breathePhase}</p>
              <p className="text-sm text-gray-400">
                {breathePhase === 'inhale' && 'Breathe in slowly...'}
                {breathePhase === 'hold' && 'Hold gently...'}
                {breathePhase === 'exhale' && 'Breathe out slowly...'}
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
