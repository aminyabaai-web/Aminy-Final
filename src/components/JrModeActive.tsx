// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  Play,
  Pause,
  RotateCcw,
  Star,
  Zap,
  Heart,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Wind,
  Volume2,
  VolumeX,
  Trophy,
  Sparkles,
  Timer,
  Brain,
  MessageSquare,
  Users2,
  Puzzle,
  Smile,
  Frown,
  Meh
} from 'lucide-react';

interface Target {
  id: string;
  skill: 'speech' | 'social' | 'sensory' | 'routines';
  description: string;
  attempts: number;
  successes: number;
  mastered: boolean;
}

interface FatigueEvent {
  timestamp: Date;
  type: 'slow_response' | 'incorrect_answer' | 'no_response' | 'frustration_indicator';
  activity: string;
}

interface SessionData {
  type: 'jr';
  minutes: number;
  targets: string[];
  accuracy: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  fatigueEvents: FatigueEvent[];
  activitiesCompleted: number;
}

interface JrModeActiveProps {
  childName: string;
  onSessionComplete: (sessionData: SessionData) => void;
  onPlanMasteryUpdate: (mastery: { targetId: string; progress: number }) => void;
}

export function JrModeActive({ childName, onSessionComplete, onPlanMasteryUpdate }: JrModeActiveProps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [currentActivity, setCurrentActivity] = useState<number>(0);
  const [targets, setTargets] = useState<Target[]>([
    {
      id: 'speech-1',
      skill: 'speech',
      description: 'Say "Hello" when greeting',
      attempts: 0,
      successes: 0,
      mastered: false
    },
    {
      id: 'social-1', 
      skill: 'social',
      description: 'Make eye contact during play',
      attempts: 0,
      successes: 0,
      mastered: false
    },
    {
      id: 'sensory-1',
      skill: 'sensory', 
      description: 'Touch different textures',
      attempts: 0,
      successes: 0,
      mastered: false
    },
    {
      id: 'routines-1',
      skill: 'routines',
      description: 'Follow 2-step instructions',
      attempts: 0,
      successes: 0,
      mastered: false
    }
  ]);
  const [fatigueEvents, setFatigueEvents] = useState<FatigueEvent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showCalmBreak, setShowCalmBreak] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activitiesCompleted, setActivitiesCompleted] = useState(0);
  
  const sessionTimer = useRef<NodeJS.Timeout | null>(null);

  // Jr Mode Activities
  const activities = [
    {
      id: 'greeting',
      title: 'Morning Greeting',
      instruction: `Hi ${childName}! Can you say "Good morning" and wave hello?`,
      targetSkills: ['speech', 'social'],
      expectedDuration: 30,
      icon: <MessageSquare className="w-6 h-6" />
    },
    {
      id: 'eye-contact',
      title: 'Look at Me Game',
      instruction: 'Look at my eyes and copy what I do!',
      targetSkills: ['social'],
      expectedDuration: 45,
      icon: <Users2 className="w-6 h-6" />
    },
    {
      id: 'texture-play',
      title: 'Texture Explorer',
      instruction: 'Touch the soft fabric, then the bumpy ball. How do they feel?',
      targetSkills: ['sensory'],
      expectedDuration: 60,
      icon: <Puzzle className="w-6 h-6" />
    },
    {
      id: 'follow-steps',
      title: 'Simple Steps',
      instruction: 'First, clap your hands. Then, touch your nose.',
      targetSkills: ['routines'],
      expectedDuration: 40,
      icon: <Target className="w-6 h-6" />
    }
  ];

  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'speech': return <MessageSquare className="w-4 h-4" />;
      case 'social': return <Users2 className="w-4 h-4" />;
      case 'sensory': return <Puzzle className="w-4 h-4" />;
      case 'routines': return <Target className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getSkillColor = (skill: string) => {
    switch (skill) {
      case 'speech': return 'text-blue-600 bg-[#EEF4F8] border-[#C8DDE8]';
      case 'social': return 'text-green-600 bg-green-50 border-green-200';
      case 'sensory': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'routines': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-[#5A6B7A] bg-[#FAF7F2] border-[#E8E4DF]';
    }
  };

  // Start a new Jr session
  const startSession = () => {
    setIsSessionActive(true);
    setSessionStartTime(new Date());
    setCurrentActivity(0);
    setFatigueEvents([]);
    setErrors([]);
    setShowCalmBreak(false);
    setSessionPaused(false);
    setActivitiesCompleted(0);
    
    // Reset targets
    setTargets(prev => prev.map(target => ({
      ...target,
      attempts: 0,
      successes: 0
    })));

    if (soundEnabled) {
      // Play start sound
    }
  };

  // End the current session
  const endSession = () => {
    if (!sessionStartTime) return;
    
    const endTime = new Date();
    const minutes = Math.round((endTime.getTime() - sessionStartTime.getTime()) / 60000);
    
    // Calculate overall accuracy
    const totalAttempts = targets.reduce((sum, target) => sum + target.attempts, 0);
    const totalSuccesses = targets.reduce((sum, target) => sum + target.successes, 0);
    const accuracy = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;
    
    // Update plan mastery for targets that showed progress
    targets.forEach(target => {
      if (target.attempts > 0) {
        const progress = target.attempts > 0 ? (target.successes / target.attempts) * 100 : 0;
        onPlanMasteryUpdate({ targetId: target.id, progress });
        
        // Mark as mastered if 80% or higher success rate
        if (progress >= 80 && target.attempts >= 3) {
          setTargets(prev => prev.map(t => 
            t.id === target.id ? { ...t, mastered: true } : t
          ));
        }
      }
    });

    const sessionData: SessionData = {
      type: 'jr',
      minutes,
      targets: targets.map(t => t.id),
      accuracy,
      errors,
      startTime: sessionStartTime,
      endTime,
      fatigueEvents,
      activitiesCompleted
    };

    onSessionComplete(sessionData);
    
    setIsSessionActive(false);
    setSessionStartTime(null);
    setCurrentActivity(0);
    
    if (soundEnabled) {
    }
  };

  // Record a fatigue event
  const recordFatigueEvent = (type: FatigueEvent['type']) => {
    const event: FatigueEvent = {
      timestamp: new Date(),
      type,
      activity: activities[currentActivity]?.id || 'unknown'
    };
    
    setFatigueEvents(prev => {
      const newEvents = [...prev, event];
      
      // Check for 3 consecutive fatigue events
      if (newEvents.length >= 3) {
        const lastThree = newEvents.slice(-3);
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        // If all 3 events happened within 5 minutes, show calm break
        if (lastThree.every(e => e.timestamp > fiveMinutesAgo)) {
          setShowCalmBreak(true);
          setSessionPaused(true);
        }
      }
      
      return newEvents;
    });
  };

  // Handle activity response
  const handleActivityResponse = (success: boolean) => {
    const activity = activities[currentActivity];
    if (!activity) return;

    // Update targets based on activity skills
    activity.targetSkills.forEach(skill => {
      setTargets(prev => prev.map(target => {
        if (target.skill === skill) {
          return {
            ...target,
            attempts: target.attempts + 1,
            successes: success ? target.successes + 1 : target.successes
          };
        }
        return target;
      }));
    });

    if (!success) {
      const errorMsg = `${activity.title}: Incorrect or no response`;
      setErrors(prev => [...prev, errorMsg]);
      recordFatigueEvent('incorrect_answer');
    }

    // Move to next activity or end session
    if (currentActivity < activities.length - 1) {
      setCurrentActivity(prev => prev + 1);
      if (success) {
        setActivitiesCompleted(prev => prev + 1);
      }
    } else {
      setActivitiesCompleted(prev => success ? prev + 1 : prev);
      endSession();
    }

    if (soundEnabled && success) {
    }
  };

  // Handle calm break completion
  const completeCalmBreak = () => {
    setShowCalmBreak(false);
    setSessionPaused(false);
  };

  const getCurrentActivity = () => activities[currentActivity];
  const getSessionDuration = () => {
    if (!sessionStartTime) return 0;
    return Math.round((new Date().getTime() - sessionStartTime.getTime()) / 60000);
  };

  // Calm Break Card Component
  const CalmBreakCard = () => (
    <Card className="p-6 bg-gradient-to-br from-[#FAF7F2] to-[#F0EDE8] border-[#C8DDE8]">
      <div className="text-center">
        <div className="mb-4">
          <Wind className="w-12 h-12 text-blue-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-[#4A6478] mb-2">Time for a Calm Break</h3>
          <p className="text-sm text-blue-600">
            Let's take a moment to breathe and relax together.
          </p>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <div className="p-4 bg-white/60 rounded-xl">
            <p className="text-sm text-blue-700 mb-2">Follow the breathing circle:</p>
            <div className="w-16 h-16 mx-auto bg-blue-200 rounded-full animate-pulse flex items-center justify-center">
              <Wind className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-blue-600 mt-2">Breathe in... and out...</p>
          </div>
          
          <Button 
            onClick={completeCalmBreak}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            <Heart className="w-4 h-4 mr-2" />
            I Feel Better Now
          </Button>
        </div>
      </div>
    </Card>
  );

  // Session Summary Component
  const SessionSummary = () => {
    const totalAttempts = targets.reduce((sum, target) => sum + target.attempts, 0);
    const totalSuccesses = targets.reduce((sum, target) => sum + target.successes, 0);
    const accuracy = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;
    
    return (
      <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="text-center mb-4 sm:mb-6">
          <Trophy className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">Great Job, {childName}!</h3>
          <p className="text-sm text-green-600">You completed your Jr Mode session!</p>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="text-lg font-bold text-green-700">{activitiesCompleted}</div>
              <div className="text-sm text-green-600">Activities</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="text-lg font-bold text-green-700">{accuracy}%</div>
              <div className="text-sm text-green-600">Accuracy</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-green-800">Skills Practiced:</h4>
            {targets.filter(t => t.attempts > 0).map(target => (
              <div key={target.id} className="flex items-center justify-between p-2 bg-white/40 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded border ${getSkillColor(target.skill)}`}>
                    {getSkillIcon(target.skill)}
                  </div>
                  <span className="text-sm text-green-700">{target.description}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-green-700">
                    {target.successes}/{target.attempts}
                  </span>
                  {target.mastered && <Star className="w-3 h-3 text-yellow-500" />}
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            onClick={() => window.location.reload()}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start New Session
          </Button>
        </div>
      </Card>
    );
  };

  // Main Jr Mode Interface
  if (showCalmBreak) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <CalmBreakCard />
      </div>
    );
  }

  if (!isSessionActive) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        {activitiesCompleted > 0 ? (
          <SessionSummary />
        ) : (
          <Card className="p-6 text-center">
            <div className="mb-4 sm:mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center">
                <Play className="w-8 h-8 text-[#4E93A8]" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-primary mb-2">Ready to Learn, {childName}?</h2>
              <p className="text-muted-foreground">
                Let's practice some fun activities together! Tap the button when you're ready to start.
              </p>
            </div>
            
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <h3 className="text-sm font-semibold text-primary">Today's Activities:</h3>
              <div className="grid gap-2">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-lg">
                    <div className="text-[#4E93A8]">{activity.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-primary">{activity.title}</div>
                      <div className="text-sm text-muted-foreground">{activity.expectedDuration}s</div>
                    </div>
                    <div className="flex gap-1">
                      {activity.targetSkills.map(skill => (
                        <div key={skill} className={`p-1 rounded border ${getSkillColor(skill)}`}>
                          {getSkillIcon(skill)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                <span className="text-sm text-muted-foreground">
                  Sound {soundEnabled ? 'On' : 'Off'}
                </span>
              </div>
            </div>
            
            <Button 
              onClick={startSession}
              className="w-full bg-primary hover:bg-[#376E80]"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Jr Mode Session
            </Button>
          </Card>
        )}
      </div>
    );
  }

  const currentActivityData = getCurrentActivity();
  const progress = ((currentActivity + 1) / activities.length) * 100;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-3 sm:space-y-4">
      {/* Session Header */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[#4E93A8] border-[#4E93A8]">
              Session Active
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-3 h-3" />
              {getSessionDuration()}m
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSessionPaused(!sessionPaused)}
              className="p-2"
            >
              {sessionPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={endSession}
              className="p-2 text-red-600 hover:text-red-700"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{currentActivity + 1} of {activities.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </Card>

      {/* Current Activity */}
      {currentActivityData && !sessionPaused && (
        <Card className="p-4 sm:p-5 md:p-6">
          <div className="text-center mb-4 sm:mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center">
              {currentActivityData.icon}
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">
              {currentActivityData.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {currentActivityData.instruction}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => handleActivityResponse(false)}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            >
              <Frown className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => handleActivityResponse(true)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Smile className="w-4 h-4 mr-2" />
              Great Job!
            </Button>
          </div>
          
          {/* Quick fatigue indicators */}
          <div className="flex justify-center gap-3 sm:gap-4 mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => recordFatigueEvent('slow_response')}
              className="text-sm text-muted-foreground"
            >
              <Timer className="w-3 h-3 mr-1" />
              Slow
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => recordFatigueEvent('no_response')}
              className="text-sm text-muted-foreground"
            >
              <Meh className="w-3 h-3 mr-1" />
              No Response
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => recordFatigueEvent('frustration_indicator')}
              className="text-sm text-muted-foreground"
            >
              <Frown className="w-3 h-3 mr-1" />
              Frustrated
            </Button>
          </div>
        </Card>
      )}

      {sessionPaused && (
        <Card className="p-6 text-center">
          <Pause className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">Session Paused</h3>
          <p className="text-muted-foreground mb-4">Take your time. Resume when ready!</p>
          <Button 
            onClick={() => setSessionPaused(false)}
            className="bg-primary hover:bg-[#376E80]"
          >
            <Play className="w-4 h-4 mr-2" />
            Resume Session
          </Button>
        </Card>
      )}

      {/* Targets Progress */}
      <Card className="p-3 sm:p-4">
        <h4 className="text-sm font-semibold text-primary mb-3">Skills Progress</h4>
        <div className="space-y-2">
          {targets.map(target => {
            const successRate = target.attempts > 0 ? (target.successes / target.attempts) * 100 : 0;
            return (
              <div key={target.id} className="flex items-center justify-between p-2 bg-[#FAF7F2] rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded border ${getSkillColor(target.skill)}`}>
                    {getSkillIcon(target.skill)}
                  </div>
                  <span className="text-sm text-primary">{target.description}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">
                    {target.attempts > 0 ? `${Math.round(successRate)}%` : '—'}
                  </span>
                  {target.mastered && <Star className="w-3 h-3 text-yellow-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Fatigue Indicators */}
      {fatigueEvents.length > 0 && (
        <Card className="p-3 sm:p-4">
          <h4 className="text-sm font-semibold text-primary mb-2">Session Notes</h4>
          <div className="text-sm text-muted-foreground">
            {fatigueEvents.length} attention event{fatigueEvents.length !== 1 ? 's' : ''} recorded
            {fatigueEvents.length >= 2 && (
              <div className="mt-1 p-2 bg-[#EEF4F8] rounded text-blue-600">
                Consider a calm break if needed
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}