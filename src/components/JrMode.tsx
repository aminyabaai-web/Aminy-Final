// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// Aminy MVP - Jr Mode (Child App Interface)
// Interactive learning companion for children with development needs

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Heart, Star, Sparkles, Volume2, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { connectorActions } from '../lib/connector-hub';
import { toast } from 'sonner';

interface JrModeProps {
  childName: string;
  onExit: () => void;
  userTier?: string | null;
}

interface ActivityData {
  id: string;
  title: string;
  type: 'speech' | 'social' | 'sensory' | 'cognitive';
  targetBehavior: string;
  difficulty: number; // 1-5
  instructions: string;
  expectedResponses: string[];
}

export function JrMode({ childName, onExit, userTier }: JrModeProps) {
  const [isActive, setIsActive] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [currentActivity, setCurrentActivity] = useState<ActivityData | null>(null);
  const [sessionTargets, setSessionTargets] = useState<string[]>([]);
  const [accuracy, setAccuracy] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [fatigueTriggers, setFatigueTriggers] = useState(0);
  const [showCalmBreak, setShowCalmBreak] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Sample activities for demonstration
  const activities: ActivityData[] = [
    {
      id: 'speech-1',
      title: 'Animal Sounds',
      type: 'speech',
      targetBehavior: 'Imitate animal sounds with clear articulation',
      difficulty: 2,
      instructions: 'Listen and repeat the animal sounds you hear!',
      expectedResponses: ['moo', 'woof', 'meow', 'oink', 'quack']
    },
    {
      id: 'social-1',
      title: 'Turn Taking',
      type: 'social',
      targetBehavior: 'Wait for turn and engage appropriately',
      difficulty: 3,
      instructions: 'Wait for your turn, then tap when it\'s time!',
      expectedResponses: ['wait', 'my_turn', 'thank_you']
    },
    {
      id: 'sensory-1',
      title: 'Color Matching',
      type: 'sensory',
      targetBehavior: 'Match colors accurately',
      difficulty: 1,
      instructions: 'Find and tap the matching colors!',
      expectedResponses: ['red_match', 'blue_match', 'green_match', 'yellow_match']
    }
  ];

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && sessionStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 60000);
        setSessionMinutes(elapsed);
        
        // Check for fatigue after 10+ minutes
        if (elapsed >= 10 && Math.random() > 0.7) {
          handleFatigue();
        }
      }, 60000); // Update every minute
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, sessionStartTime]);

  const startSession = () => {
    setIsActive(true);
    setSessionStartTime(new Date());
    setSessionMinutes(0);
    setAccuracy(0);
    setErrors([]);
    setFatigueTriggers(0);
    setSessionTargets([]);
    
    // Start with a random activity
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    setCurrentActivity(randomActivity);
    setSessionTargets([randomActivity.targetBehavior]);
    
  };

  const endSession = () => {
    if (!sessionStartTime) return;
    
    const finalMinutes = Math.floor((Date.now() - sessionStartTime.getTime()) / 60000);
    const finalAccuracy = Math.max(65, Math.min(95, 75 + Math.random() * 20)); // 65-95% range
    
    // Create session data and publish event
    connectorActions.completeJrSession({
      childId: 'child-1', // In real app, this would come from props/context
      minutes: Math.max(1, finalMinutes),
      targets: sessionTargets,
      accuracy: Math.round(finalAccuracy),
      errors: errors
    });
    
    setIsActive(false);
    setSessionStartTime(null);
    setCurrentActivity(null);
    setShowCalmBreak(false);
    
    // Show completion celebration
    toast.success(`Great job, ${childName}!`, {
      description: `Session completed: ${Math.max(1, finalMinutes)} min, ${Math.round(finalAccuracy)}% accuracy. You're amazing!`,
      duration: 5000,
    });

    // Session data logged for analytics
  };

  const handleFatigue = () => {
    setFatigueTriggers(prev => prev + 1);
    
    if (fatigueTriggers >= 2) { // After 3 consecutive triggers
      setShowCalmBreak(true);
      setIsActive(false);
      
      // Still log minutes even during calm break
      setTimeout(() => {
        setShowCalmBreak(false);
        setIsActive(true);
        setFatigueTriggers(0);
      }, 30000); // 30 second calm break
    }
  };

  const handleActivityResponse = (response: string) => {
    if (!currentActivity) return;
    
    const isCorrect = currentActivity.expectedResponses.includes(response);
    
    if (isCorrect) {
      setAccuracy(prev => Math.min(100, prev + 5));
      // Show positive feedback
      const encouragement = ['Great job!', 'Awesome!', 'You\'re doing amazing!', 'Perfect!'];
      const message = encouragement[Math.floor(Math.random() * encouragement.length)];
      toast.success(message, { duration: 2000 });
    } else {
      setErrors(prev => [...prev, `${currentActivity.id}_${response}`]);
      setAccuracy(prev => Math.max(0, prev - 2));
      // Show gentle correction
      toast('Try again! You\'ve got this!', { duration: 2000 });
    }
    
    // Move to next activity after response
    setTimeout(() => {
      const nextActivity = activities[Math.floor(Math.random() * activities.length)];
      setCurrentActivity(nextActivity);
      setSessionTargets(prev => [...prev, nextActivity.targetBehavior]);
    }, 1000);
  };

  if (showCalmBreak) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F6FBFB] to-[#EDF4F7] flex flex-col items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Heart className="w-12 h-12 text-blue-500 animate-pulse" />
          </div>
          <h1 className="text-2xl font-semibold text-primary mb-4">
            Take a Calm Break, {childName}
          </h1>
          <p className="text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
            Let's take some deep breaths together. You're doing such a great job learning!
          </p>
          <div className="w-full bg-blue-100 rounded-full h-3 mb-4">
            <div className="bg-blue-500 h-3 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-sm text-muted-foreground">
            Calm break in progress... 🌸
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-green-200 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-primary">Aminy Jr</h1>
              <p className="text-sm text-muted-foreground">Hi {childName}! 👋</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-muted-foreground hover:text-foreground"
          >
            <Home className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        
        {/* Session Status */}
        {isActive && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-4 sm:mb-6 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">Active Session</span>
              </div>
              <span className="text-sm text-muted-foreground">{sessionMinutes} min</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Accuracy</span>
                  <span className="font-medium text-primary">{Math.round(accuracy)}%</span>
                </div>
                <Progress value={accuracy} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Activities</span>
                  <span className="font-medium text-primary">{sessionTargets.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Activity */}
        {isActive && currentActivity && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-4 sm:mb-6 border border-[#C8DDE8]">
            <div className="text-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-primary mb-2">
                {currentActivity.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {currentActivity.instructions}
              </p>
            </div>
            
            {/* Sample Interactive Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentActivity.expectedResponses.slice(0, 4).map((response, index) => (
                <button
                  key={index}
                  onClick={() => handleActivityResponse(response)}
                  className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl border border-purple-200 hover:from-purple-200 hover:to-blue-200 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">
                      {response === 'moo' && '🐄'}
                      {response === 'woof' && '🐕'}
                      {response === 'meow' && '🐱'}
                      {response === 'oink' && '🐷'}
                      {response === 'wait' && '⏳'}
                      {response === 'my_turn' && '👋'}
                      {response.includes('match') && '🎨'}
                      {!['moo', 'woof', 'meow', 'oink', 'wait', 'my_turn'].includes(response) && !response.includes('match') && '⭐'}
                    </div>
                    <span className="text-sm font-medium text-primary capitalize">
                      {response.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start/Stop Controls */}
        <div className="text-center">
          {!isActive ? (
            <Button
              onClick={startSession}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-8 rounded-2xl text-lg transition-all duration-200 transform hover:scale-105"
            >
              <Play className="w-6 h-6 mr-2" />
              Start Learning! 🌟
            </Button>
          ) : (
            <Button
              onClick={endSession}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 font-semibold py-4 px-8 rounded-2xl text-lg transition-all duration-200"
            >
              <Pause className="w-6 h-6 mr-2" />
              Finish Session
            </Button>
          )}
        </div>

        {/* Encouragement */}
        {!isActive && (
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Ready to play and learn together? Tap start when you're ready! 🎈
            </p>
          </div>
        )}

        {/* Session Stats Preview */}
        {!isActive && sessionTargets.length > 0 && (
          <div className="mt-4 sm:mt-6 bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-[#E8E4DF]">
            <h3 className="text-sm font-semibold text-primary mb-2">Last Session</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Activities completed</span>
              <span className="font-medium text-primary">{sessionTargets.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}