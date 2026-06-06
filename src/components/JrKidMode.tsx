// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { DisclaimerFooter } from './DisclaimerFooter';
import { BRAND_NAME } from '../lib/constants';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Brain,
  Users,
  Zap,
  Calendar,
  Gift,
  Lock,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Star,
  Sparkles,
  Heart
} from 'lucide-react';

interface ModuleSession {
  module: string;
  startedAt: Date;
  attempts: number;
  successful: number;
  durationMin: number;
  accuracy: number;
}

interface JrKidModeProps {
  childName: string;
  tokens?: number;
  onTokensChange?: (newTokens: number) => void;
  onExitKidMode?: () => void;
  onExit?: () => void;
  onSessionComplete?: (sessionData: ModuleSession) => void;
  prefersReducedMotion?: boolean;
  jrProfile?: import('../types/connector').JrProfile;
}

export const JrKidMode: React.FC<JrKidModeProps> = ({
  childName,
  tokens = 0,
  onTokensChange,
  onExitKidMode,
  onSessionComplete,
  prefersReducedMotion
}) => {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [showMicConsent, setShowMicConsent] = useState(false);
  const [sessionData, setSessionData] = useState<ModuleSession | null>(null);
  const [showRewards, setShowRewards] = useState(false);

  // Check for first-time mic consent
  useEffect(() => {
    const hasSeenMicConsent = localStorage.getItem('jr-mic-consent-seen');
    if (!hasSeenMicConsent) {
      setShowMicConsent(true);
    }
  }, []);

  const handleMicConsent = (granted: boolean) => {
    setMicEnabled(granted);
    localStorage.setItem('jr-mic-consent-seen', 'true');
    setShowMicConsent(false);
  };

  const startModule = (moduleType: string) => {
    setActiveModule(moduleType);
    setSessionData({
      module: moduleType,
      startedAt: new Date(),
      attempts: 0,
      successful: 0,
      durationMin: 0,
      accuracy: 0
    });
  };

  const completeModule = (accuracy: number = 80) => {
    if (sessionData) {
      const endTime = new Date();
      const durationMin = Math.round((endTime.getTime() - sessionData.startedAt.getTime()) / 60000);
      
      const completedSession = {
        ...sessionData,
        durationMin,
        accuracy,
        successful: sessionData.attempts > 0 ? Math.round(sessionData.attempts * (accuracy / 100)) : 1
      };

      // Award token
      onTokensChange?.((tokens ?? 0) + 1);

      // Report session data
      onSessionComplete?.(completedSession);

      // Show celebration
      showCelebration();
    }
    
    setActiveModule(null);
    setSessionData(null);
  };

  const showCelebration = () => {
    // Create confetti effect
    if (!prefersReducedMotion) {
      const celebration = document.createElement('div');
      celebration.className = 'fixed inset-0 pointer-events-none z-50';
      celebration.innerHTML = '🎉'.repeat(20);
      celebration.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
        align-items: center;
        font-size: 2rem;
        animation: enhanced-confetti 1.5s ease-out;
      `;
      document.body.appendChild(celebration);
      setTimeout(() => document.body.removeChild(celebration), 1500);
    }
  };

  const redeemReward = () => {
    if ((tokens ?? 0) >= 3) {
      onTokensChange?.((tokens ?? 0) - 3);
      // Show reward animation
      showCelebration();
      setShowRewards(false);
    }
  };

  if (showMicConsent) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-4xl mb-4 sm:mb-6">🎤</div>
          <h2 className="text-lg sm:text-xl font-semibold text-primary mb-4">Voice Recognition</h2>
          <p className="text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
            On-device recognition by default. You can turn off the mic anytime.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => handleMicConsent(false)}
              variant="outline"
              className="flex-1"
            >
              <MicOff className="w-4 h-4 mr-2" />
              No Mic
            </Button>
            <Button
              onClick={() => handleMicConsent(true)}
              className="flex-1"
            >
              <Mic className="w-4 h-4 mr-2" />
              Allow Mic
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (showRewards) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
        {/* Rewards Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl" role="img" aria-hidden="true">🎁</div>
              <div>
                <h1 className="text-xl text-primary font-semibold">Rewards</h1>
                <p className="text-sm text-muted-foreground">Pick your prize!</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <Star className="w-3 h-3 mr-1" />
                {tokens} tokens
              </Badge>
              <Button
                onClick={() => setShowRewards(false)}
                variant="ghost"
                size="sm"
              >
                <Lock className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Rewards Content */}
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="grid grid-cols-1 gap-3 sm:gap-6">
            {(() => {
              // Static color classes - Tailwind purges dynamic classes at build time
              const rewardColors: Record<string, { gradient: string; border: string }> = {
                blue: { gradient: 'bg-gradient-to-br from-blue-100 to-blue-200', border: 'border-blue-200' },
                green: { gradient: 'bg-gradient-to-br from-green-100 to-green-200', border: 'border-green-200' },
                purple: { gradient: 'bg-gradient-to-br from-purple-100 to-purple-200', border: 'border-purple-200' },
                orange: { gradient: 'bg-gradient-to-br from-orange-100 to-orange-200', border: 'border-orange-200' },
              };

              const rewards = [
                { name: 'Bubble Time', cost: 3, icon: '🫧', color: 'blue' },
                { name: 'Music Break', cost: 3, icon: '🎵', color: 'green' },
                { name: 'Screen Time', cost: 5, icon: '📱', color: 'purple' },
                { name: 'Special Snack', cost: 4, icon: '🍪', color: 'orange' }
              ];

              return rewards.map((reward) => {
                const colorClasses = rewardColors[reward.color] || rewardColors.blue;
                const isAffordable = (tokens ?? 0) >= reward.cost;

                return (
                  <Card
                    key={reward.name}
                    className={`p-6 text-center cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                      isAffordable
                        ? `${colorClasses.gradient} ${colorClasses.border} ${!prefersReducedMotion ? 'hover:scale-105' : 'hover:opacity-90'}`
                        : 'opacity-50 cursor-not-allowed bg-[#F0EDE8]'
                    }`}
                    onClick={() => isAffordable && redeemReward()}
                    tabIndex={isAffordable ? 0 : -1}
                    role="button"
                    aria-disabled={!isAffordable}
                    onKeyDown={(e) => {
                      if (isAffordable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        redeemReward();
                      }
                    }}
                  >
                    <div className="text-4xl mb-3" aria-hidden="true">{reward.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{reward.name}</h3>
                    <div className="flex items-center justify-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" aria-hidden="true" />
                      <span className="font-medium">{reward.cost} tokens</span>
                    </div>
                  </Card>
                );
              });
            })()}
          </div>
        </div>
      </div>
    );
  }

  if (activeModule) {
    return <ModuleInterface 
      moduleType={activeModule}
      childName={childName}
      micEnabled={micEnabled}
      onComplete={completeModule}
      onBack={() => setActiveModule(null)}
      sessionData={sessionData}
      setSessionData={setSessionData}
      prefersReducedMotion={prefersReducedMotion ?? false}
    />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
      {/* Kid Mode Header with Tokens and Exit */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-teal-400 rounded-full flex items-center justify-center text-white text-lg font-bold">
              {childName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl text-primary font-semibold">Hi {childName}!</h1>
              <p className="text-sm text-muted-foreground">Choose your activity</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <Star className="w-3 h-3 mr-1" />
              {tokens}
            </Badge>
            <Button
              onClick={onExitKidMode}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Exit kid mode"
              onMouseDown={(e) => {
                // Require long press (500ms) for exit
                const timeout = setTimeout(() => {
                  onExitKidMode?.();
                }, 500);
                
                const handleMouseUp = () => {
                  clearTimeout(timeout);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <Lock className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setMicEnabled(!micEnabled)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              aria-label={micEnabled ? "Turn off microphone" : "Turn on microphone"}
            >
              {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Kid Mode Content - Large Activity Tiles */}
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-3 sm:gap-6 md:grid-cols-2">
          {/* Speech Tile */}
          <Card 
            className={`p-8 text-center bg-gradient-to-br from-blue-100 to-blue-200 border-blue-200 cursor-pointer transition-all duration-200 ${!prefersReducedMotion ? 'hover:scale-105' : 'hover:bg-blue-200'}`}
            onClick={() => startModule('speech')}
          >
            <div className="p-4 bg-blue-500 rounded-full inline-flex mb-4">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-blue-900 mb-2">Speech</h3>
            <p className="text-blue-700">Greetings, requests, and sounds</p>
          </Card>

          {/* Social Tile */}
          <Card 
            className={`p-8 text-center bg-gradient-to-br from-green-100 to-green-200 border-green-200 cursor-pointer transition-all duration-200 ${!prefersReducedMotion ? 'hover:scale-105' : 'hover:bg-green-200'}`}
            onClick={() => startModule('social')}
          >
            <div className="p-4 bg-green-500 rounded-full inline-flex mb-4">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-green-900 mb-2">Social</h3>
            <p className="text-green-700">Waiting games and social skills</p>
          </Card>

          {/* Sensory Tile */}
          <Card 
            className={`p-8 text-center bg-gradient-to-br from-purple-100 to-purple-200 border-purple-200 cursor-pointer transition-all duration-200 ${!prefersReducedMotion ? 'hover:scale-105' : 'hover:bg-purple-200'}`}
            onClick={() => startModule('sensory')}
          >
            <div className="p-4 bg-purple-500 rounded-full inline-flex mb-4">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-purple-900 mb-2">Sensory</h3>
            <p className="text-purple-700">Breathing and calming activities</p>
          </Card>

          {/* Routines Tile */}
          <Card 
            className={`p-8 text-center bg-gradient-to-br from-orange-100 to-orange-200 border-orange-200 cursor-pointer transition-all duration-200 ${!prefersReducedMotion ? 'hover:scale-105' : 'hover:bg-orange-200'}`}
            onClick={() => startModule('routines')}
          >
            <div className="p-4 bg-orange-500 rounded-full inline-flex mb-4">
              <Calendar className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-orange-900 mb-2">Routines</h3>
            <p className="text-orange-700">Visual schedules and sequences</p>
          </Card>

          {/* Rewards Tile */}
          <Card 
            className={`p-8 text-center bg-gradient-to-br from-pink-100 to-pink-200 border-pink-200 cursor-pointer transition-all duration-200 col-span-1 md:col-span-2 ${!prefersReducedMotion ? 'hover:scale-105' : 'hover:bg-pink-200'}`}
            onClick={() => setShowRewards(true)}
          >
            <div className="p-4 bg-pink-500 rounded-full inline-flex mb-4">
              <Gift className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-pink-900 mb-2">Rewards</h3>
            <p className="text-pink-700">See your stars and prizes</p>
          </Card>
        </div>
        
        {/* Disclaimer Footer for Parent View */}
        <div className="max-w-md mx-auto px-4 pb-4">
          <DisclaimerFooter variant="compact" className="text-center" />
        </div>
      </div>
    </div>
  );
};

// Module Interface Component
interface ModuleInterfaceProps {
  moduleType: string;
  childName: string;
  micEnabled: boolean;
  onComplete: (accuracy?: number) => void;
  onBack: () => void;
  sessionData: ModuleSession | null;
  setSessionData: (data: ModuleSession | null) => void;
  prefersReducedMotion: boolean;
}

const ModuleInterface: React.FC<ModuleInterfaceProps> = ({
  moduleType,
  childName,
  micEnabled,
  onComplete,
  onBack,
  sessionData,
  setSessionData,
  prefersReducedMotion
}) => {
  const [currentActivity, setCurrentActivity] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [activityComplete, setActivityComplete] = useState(false);

  const moduleConfig = {
    speech: {
      title: 'Speech Practice',
      color: 'blue',
      icon: Brain,
      activities: [
        { name: 'Greetings', prompt: 'Say "Hi" to me!', keywords: ['hi', 'hello', 'hey'] },
        { name: 'Requests', prompt: 'Say "I want water"', keywords: ['want', 'water'] },
        { name: 'Sounds', prompt: 'Make the "p" sound', keywords: ['p', 'pop', 'papa'] }
      ]
    },
    social: {
      title: 'Social Skills',
      color: 'green',
      icon: Users,
      activities: [
        { name: 'Waiting', prompt: 'Let\'s practice waiting together', duration: 30 },
        { name: 'Turn Taking', prompt: 'Wait for your turn', duration: 20 },
        { name: 'Flexible Thinking', prompt: 'Sometimes plans change, and that\'s okay!', duration: 25 }
      ]
    },
    sensory: {
      title: 'Sensory Break',
      color: 'purple',
      icon: Zap,
      activities: [
        { name: 'Deep Breathing', prompt: 'Breathe in... and out...', duration: 120 },
        { name: 'Body Scan', prompt: 'Notice how your body feels', duration: 90 },
        { name: 'Calming Sounds', prompt: 'Listen to the peaceful sounds', duration: 60 }
      ]
    },
    routines: {
      title: 'Daily Routines',
      color: 'orange',
      icon: Calendar,
      activities: [
        { name: 'Morning Routine', prompt: 'Let\'s go through your morning steps', steps: ['Wake up', 'Brush teeth', 'Get dressed', 'Eat breakfast'] },
        { name: 'Evening Routine', prompt: 'Time for evening routine', steps: ['Dinner', 'Bath time', 'Pajamas', 'Story time'] },
        { name: 'School Preparation', prompt: 'Getting ready for school', steps: ['Backpack', 'Lunch', 'Shoes', 'Say goodbye'] }
      ]
    }
  };

  const config = moduleConfig[moduleType as keyof typeof moduleConfig] as { title: string; color: string; icon: React.ComponentType<{ className?: string }>; activities: { name: string; prompt: string; keywords?: string[]; duration?: number; steps?: string[] }[] } | undefined;

  if (!config) {
    return <div>Module not found</div>;
  }

  // Static color classes — Tailwind v4 JIT only emits complete static strings,
  // so dynamic class assembly (e.g. `bg-${config.color}-500`) is never generated.
  const moduleColors: Record<string, { pageBg: string; iconBg: string; button: string; accentText: string }> = {
    blue: {
      pageBg: 'bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100',
      iconBg: 'bg-blue-500',
      button: 'bg-blue-500 hover:bg-blue-600',
      accentText: 'text-blue-500',
    },
    green: {
      pageBg: 'bg-gradient-to-br from-green-50 via-green-50 to-green-100',
      iconBg: 'bg-green-500',
      button: 'bg-green-500 hover:bg-green-600',
      accentText: 'text-green-500',
    },
    purple: {
      pageBg: 'bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100',
      iconBg: 'bg-purple-500',
      button: 'bg-purple-500 hover:bg-purple-600',
      accentText: 'text-purple-500',
    },
    orange: {
      pageBg: 'bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100',
      iconBg: 'bg-orange-500',
      button: 'bg-orange-500 hover:bg-orange-600',
      accentText: 'text-orange-500',
    },
  };
  const colors = moduleColors[config.color] ?? moduleColors.blue;

  const handleActivityAction = () => {
    if (sessionData) {
      setSessionData({
        ...sessionData,
        attempts: sessionData.attempts + 1
      });
    }

    if (config.activities[currentActivity].keywords && micEnabled) {
      // Speech recognition simulation
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setShowFeedback(true);
        setActivityComplete(true);
        setTimeout(() => {
          if (currentActivity < config.activities.length - 1) {
            setCurrentActivity(currentActivity + 1);
            setShowFeedback(false);
            setActivityComplete(false);
          } else {
            onComplete(85); // 85% accuracy
          }
        }, 2000);
      }, 2000);
    } else if (config.activities[currentActivity].duration) {
      // Timer-based activity
      const duration = config.activities[currentActivity].duration || 30;
      setTimeout(() => {
        setActivityComplete(true);
        setTimeout(() => {
          if (currentActivity < config.activities.length - 1) {
            setCurrentActivity(currentActivity + 1);
            setActivityComplete(false);
          } else {
            onComplete(90);
          }
        }, 1000);
      }, duration * 1000);
    } else if (config.activities[currentActivity].steps) {
      // Step-through activity
      setTimeout(() => {
        setActivityComplete(true);
        setTimeout(() => {
          if (currentActivity < config.activities.length - 1) {
            setCurrentActivity(currentActivity + 1);
            setActivityComplete(false);
          } else {
            onComplete(95);
          }
        }, 3000);
      }, 2000);
    }
  };

  const currentActivityData = config.activities[currentActivity];

  return (
    <div className={`min-h-screen ${colors.pageBg}`}>
      {/* Module Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              ←
            </Button>
            <div>
              <h1 className="text-xl text-primary font-semibold">{config.title}</h1>
              <p className="text-sm text-muted-foreground">
                Activity {currentActivity + 1} of {config.activities.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {micEnabled && moduleType === 'speech' && (
              <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            )}
          </div>
        </div>
      </div>

      {/* Activity Content */}
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className={`p-6 ${colors.iconBg} rounded-full inline-flex mb-8`}>
          <config.icon className="w-16 h-16 text-white" />
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {currentActivityData.name}
        </h2>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          {currentActivityData.prompt}
        </p>

        {currentActivityData.steps && (
          <div className="mb-8">
            {currentActivityData.steps.map((step: string, index: number) => (
              <div 
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg mb-2 ${
                  activityComplete ? 'bg-green-100 text-green-800' : 'bg-white/80 text-gray-700'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                  activityComplete ? 'bg-green-500 text-white' : 'bg-[#E8E4DF] text-gray-600'
                }`}>
                  {activityComplete ? '✓' : index + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        )}

        {showFeedback && (
          <div className="mb-8 p-4 bg-green-100 border border-green-200 rounded-xl">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-green-800 font-semibold">Great job, {childName}!</p>
          </div>
        )}

        {!activityComplete && !showFeedback && (
          <Button
            onClick={handleActivityAction}
            size="lg"
            className={`${colors.button} text-white px-8 py-4 text-lg`}
            disabled={isListening}
          >
            {isListening ? (
              <>
                <Volume2 className="w-5 h-5 mr-2 animate-pulse" />
                Listening...
              </>
            ) : (
              <>
                {moduleType === 'speech' && micEnabled ? <Mic className="w-5 h-5 mr-2" /> : <Heart className="w-5 h-5 mr-2" />}
                {moduleType === 'speech' && micEnabled ? 'Start Speaking' : 'Start Activity'}
              </>
            )}
          </Button>
        )}

        {activityComplete && (
          <div className="animate-bounce">
            <Sparkles className={`w-12 h-12 ${colors.accentText} mx-auto`} />
          </div>
        )}
      </div>
    </div>
  );
};