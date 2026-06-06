import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  Home,
  Sparkles,
  Volume2,
  VolumeX,
  Trophy,
  Heart,
  ArrowLeft,
  CheckCircle,
  Target,
  Mic,
  Play,
  Pause,
  RotateCw,
  Gift,
  Zap,
  Crown,
  MessageSquare,
  Music,
  Gamepad2,
  Wind,
  Award,
  TrendingUp,
  PartyPopper,
  Circle
} from 'lucide-react';
import { CompassIcon } from './CompassIcon';
import { SensoryTools } from './SensoryTools';
import { connectorActions } from '../lib/connector-hub';

interface AminyJrEnhancedProps {
  childName: string;
  onBack: () => void;
  onNavigateToParent: () => void;
  userTier?: string | null;
}

type ViewType = 
  | 'welcome'
  | 'home'
  | 'speech-play'
  | 'calm-corner'
  | 'mini-missions'
  | 'celebration'
  | 'sensory-tools';

interface Activity {
  id: string;
  title: string;
  type: 'speech' | 'social' | 'motor' | 'emotional';
  icon: React.ReactNode;
  duration: string;
  stars: number;
  description: string;
  voicePrompt: string;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  stars: number;
  requiresParent: boolean;
  completed: boolean;
}

export function AminyJrEnhanced({
  childName,
  onBack,
  onNavigateToParent,
  userTier = 'starter'
}: AminyJrEnhancedProps) {
  const [currentView, setCurrentView] = useState<ViewType>('welcome');
  const [starsEarned, setStarsEarned] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState<string[]>([]);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [compassRotation, setCompassRotation] = useState(0);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [activityProgress, setActivityProgress] = useState(0);
  const [isActivityActive, setIsActivityActive] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([
    {
      id: 'morning-routine',
      title: 'Morning Champion',
      description: 'Complete your morning routine',
      icon: <Target className="w-5 h-5" />,
      stars: 3,
      requiresParent: true,
      completed: false
    },
    {
      id: 'try-new-food',
      title: 'Brave Taster',
      description: 'Try one bite of something new',
      icon: <Trophy className="w-5 h-5" />,
      stars: 2,
      requiresParent: true,
      completed: false
    },
    {
      id: 'use-words',
      title: 'Word Wizard',
      description: 'Use words to ask for what you want',
      icon: <MessageSquare className="w-5 h-5" />,
      stars: 2,
      requiresParent: false,
      completed: false
    },
    {
      id: 'calm-down',
      title: 'Calm Hero',
      description: 'Use a calm-down strategy when upset',
      icon: <Heart className="w-5 h-5" />,
      stars: 3,
      requiresParent: true,
      completed: false
    }
  ]);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Compass animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCompassRotation(prev => (prev + 2) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Voice prompts
  const speakPrompt = (text: string) => {
    if (!isSoundOn) return;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
    
    toast.info(text, { duration: 3000 });
  };

  // Award stars
  const awardStars = (count: number, reason: string) => {
    setStarsEarned(prev => prev + count);
    setShowConfetti(true);
    
    // Voice feedback
    speakPrompt(`Amazing! You earned ${count} star${count !== 1 ? 's' : ''}!`);
    
    // Log to parent dashboard
    connectorActions.logOutcome({
      childId: 'child-1',
      type: 'jr_win',
      subtype: reason,
      value: count,
      metadata: { stars: count, reason }
    });
    
    setTimeout(() => setShowConfetti(false), 3000);
    
    // Check for badges
    checkBadges();
  };

  // Check for badge unlocks
  const checkBadges = () => {
    if (starsEarned >= 10 && !badgesEarned.includes('first-10')) {
      setBadgesEarned(prev => [...prev, 'first-10']);
      toast.success('🎖️ Badge unlocked: Star Collector!');
    }
    if (starsEarned >= 25 && !badgesEarned.includes('first-25')) {
      setBadgesEarned(prev => [...prev, 'first-25']);
      toast.success('🏆 Badge unlocked: Super Star!');
    }
  };

  // Speech Play Activities
  const speechActivities: Activity[] = [
    {
      id: 'animal-sounds',
      title: 'Animal Sounds',
      type: 'speech',
      icon: '🐄',
      duration: '5 min',
      stars: 2,
      description: 'Make animal sounds!',
      voicePrompt: "Let's make animal sounds together! Can you say moo like a cow?"
    },
    {
      id: 'color-words',
      title: 'Color Words',
      type: 'speech',
      icon: '🎨',
      duration: '5 min',
      stars: 2,
      description: 'Name the colors!',
      voicePrompt: 'Point to something red and say red!'
    },
    {
      id: 'rhyme-time',
      title: 'Rhyme Time',
      type: 'speech',
      icon: '🎵',
      duration: '5 min',
      stars: 3,
      description: 'Words that rhyme!',
      voicePrompt: 'Cat rhymes with hat! Can you find more rhymes?'
    },
    {
      id: 'silly-faces',
      title: 'Silly Faces',
      type: 'motor',
      icon: '😜',
      duration: '3 min',
      stars: 1,
      description: 'Practice mouth movements!',
      voicePrompt: "Let's make silly faces! Stick out your tongue!"
    }
  ];

  // Start activity
  const handleStartActivity = (activity: Activity) => {
    setCurrentActivity(activity);
    setCurrentView('speech-play');
    setIsActivityActive(true);
    setActivityProgress(0);
    
    // Voice prompt
    setTimeout(() => {
      speakPrompt(activity.voicePrompt);
    }, 500);
    
    // Simulate progress
    const interval = setInterval(() => {
      setActivityProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          handleCompleteActivity(activity);
          return 100;
        }
        return prev + 2;
      });
    }, 300);
  };

  // Complete activity
  const handleCompleteActivity = (activity: Activity) => {
    setIsActivityActive(false);
    awardStars(activity.stars, activity.id);
    
    // Celebration
    setCurrentView('celebration');
    speakPrompt('You did it! Amazing work!');
    
    setTimeout(() => {
      setCurrentView('home');
      setCurrentActivity(null);
    }, 3000);
  };

  // Complete mission
  const handleCompleteMission = (missionId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    if (mission.requiresParent) {
      speakPrompt('Great job! Ask a grown-up to confirm!');
      toast.info('Parent confirmation needed');
      return;
    }
    
    setMissions(prev =>
      prev.map(m =>
        m.id === missionId ? { ...m, completed: true } : m
      )
    );
    
    awardStars(mission.stars, missionId);
  };

  // Confetti effect
  const ConfettiEffect = () => (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * window.innerWidth,
            y: -20,
            rotate: 0,
            opacity: 1
          }}
          animate={{
            y: window.innerHeight + 20,
            rotate: Math.random() * 360,
            opacity: 0
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5
          }}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][
              Math.floor(Math.random() * 5)
            ]
          }}
        />
      ))}
    </div>
  );

  // Compass Mascot
  const CompassMascot = ({ mood = 'happy' }: { mood?: 'happy' | 'excited' | 'encouraging' }) => (
    <motion.div
      animate={{
        scale: mood === 'excited' ? [1, 1.1, 1] : 1,
        rotate: mood === 'encouraging' ? [0, -5, 5, -5, 0] : 0
      }}
      transition={{
        duration: 1,
        repeat: mood !== 'happy' ? Infinity : 0,
        repeatDelay: 2
      }}
      className="relative"
    >
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg">
        <motion.div
          animate={{ rotate: compassRotation }}
          transition={{ duration: 0.05, ease: 'linear' }}
        >
          <CompassIcon className="w-12 h-12" />
        </motion.div>
      </div>
      {/* Eyes */}
      <div className="absolute top-6 left-6 flex gap-3 sm:gap-4">
        <div className="w-3 h-3 bg-white rounded-full">
          <div className="w-1.5 h-1.5 bg-black rounded-full ml-1 mt-1" />
        </div>
        <div className="w-3 h-3 bg-white rounded-full">
          <div className="w-1.5 h-1.5 bg-black rounded-full ml-1 mt-1" />
        </div>
      </div>
      {/* Smile */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-8 h-4 border-b-2 border-white rounded-full" />
    </motion.div>
  );

  // Welcome Screen
  if (currentView === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <CompassMascot mood="excited" />
          
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl text-gray-900 mt-4 sm:mt-6 mb-3"
          >
            Hi {childName}! 👋
          </motion.h1>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-gray-700 mb-8"
          >
            I'm your Compass Friend! Ready to play and learn together?
          </motion.p>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              onClick={() => {
                setCurrentView('home');
                speakPrompt("Let's have fun!");
              }}
              className="bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] hover:from-teal-600 hover:to-blue-600 text-white px-8 py-6 text-xl rounded-2xl shadow-lg"
            >
              <Play className="w-6 h-6 mr-2" />
              Let's Go!
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Sensory Tools
  if (currentView === 'sensory-tools') {
    return (
      <SensoryTools
        childName={childName}
        onBack={() => setCurrentView('home')}
        onSessionComplete={(data) => {
          if (data.completed) {
            awardStars(1, 'sensory-tool');
          }
        }}
      />
    );
  }

  // Celebration Screen
  if (currentView === 'celebration') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-100 via-orange-100 to-pink-100 flex items-center justify-center p-4">
        {showConfetti && <ConfettiEffect />}
        
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="text-center"
        >
          <Trophy className="w-32 h-32 text-yellow-500 mx-auto mb-4 sm:mb-6" />
          
          <h1 className="text-4xl mb-4">🎉 Amazing! 🎉</h1>
          
          <div className="flex justify-center gap-2 mb-4 sm:mb-6">
            {[...Array(currentActivity?.stars || 1)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.2, type: 'spring' }}
              >
                <Star className="w-12 h-12 text-yellow-500 fill-yellow-500" />
              </motion.div>
            ))}
          </div>
          
          <p className="text-2xl text-gray-800 mb-4">You did it!</p>
          <p className="text-lg text-gray-600">
            You earned {currentActivity?.stars} star{currentActivity?.stars !== 1 ? 's' : ''}!
          </p>
        </motion.div>
      </div>
    );
  }

  // Main Home View
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
                <CompassIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg text-gray-900">Aminy Jr</h1>
                <p className="text-xs text-gray-500">Hi {childName}!</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 px-3 py-1">
              <Star className="w-4 h-4 mr-1 fill-yellow-500" />
              {starsEarned}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSoundOn(!isSoundOn)}
            >
              {isSoundOn ? (
                <Volume2 className="w-5 h-5 text-gray-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {showConfetti && <ConfettiEffect />}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Mascot Guide */}
        {currentView === 'home' && (
          <Card className="p-6 bg-gradient-to-r from-teal-50 to-blue-50 border-[#6B9080]/20">
            <div className="flex items-center gap-3 sm:gap-4">
              <CompassMascot mood="encouraging" />
              <div className="flex-1">
                <p className="text-lg text-gray-800 mb-2">
                  What do you want to do today?
                </p>
                <p className="text-sm text-gray-600">
                  Pick an activity and earn stars! ⭐
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Main Menu */}
        {currentView === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Speech Play */}
            <button
              onClick={() => setCurrentView('speech-play')}
              className="group relative overflow-hidden rounded-2xl border-2 border-blue-200 bg-white hover:border-blue-400 transition-all hover:shadow-lg p-6 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white mb-4 text-3xl">
                  💬
                </div>
                <h3 className="text-xl text-gray-900 mb-2">Speech Play</h3>
                <p className="text-sm text-gray-600 mb-3">Fun games to practice words and sounds!</p>
                <Badge variant="outline" className="border-blue-300 text-blue-700">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {speechActivities.length} activities
                </Badge>
              </div>
            </button>

            {/* Calm Corner */}
            <button
              onClick={() => setCurrentView('sensory-tools')}
              className="group relative overflow-hidden rounded-2xl border-2 border-purple-200 bg-white hover:border-purple-400 transition-all hover:shadow-lg p-6 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white mb-4 text-3xl">
                  🧘
                </div>
                <h3 className="text-xl text-gray-900 mb-2">Calm Corner</h3>
                <p className="text-sm text-gray-600 mb-3">Calming activities when you need a break</p>
                <Badge variant="outline" className="border-purple-300 text-purple-700">
                  <Heart className="w-3 h-3 mr-1" />
                  Sensory tools
                </Badge>
              </div>
            </button>

            {/* Mini Missions */}
            <button
              onClick={() => setCurrentView('mini-missions')}
              className="group relative overflow-hidden rounded-2xl border-2 border-green-200 bg-white hover:border-green-400 transition-all hover:shadow-lg p-6 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-teal-100 opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white mb-4 text-3xl">
                  🎯
                </div>
                <h3 className="text-xl text-gray-900 mb-2">Mini Missions</h3>
                <p className="text-sm text-gray-600 mb-3">Daily challenges to become a super kid!</p>
                <Badge variant="outline" className="border-green-300 text-green-700">
                  <Target className="w-3 h-3 mr-1" />
                  {missions.filter(m => !m.completed).length} active
                </Badge>
              </div>
            </button>

            {/* Badges */}
            <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-8 h-8 text-yellow-600" />
                <h3 className="text-xl text-gray-900">My Badges</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {badgesEarned.length === 0 ? (
                  <p className="text-sm text-gray-600">Earn stars to unlock badges!</p>
                ) : (
                  badgesEarned.map(badge => (
                    <Badge key={badge} className="bg-yellow-200 text-yellow-900">
                      <Award className="w-3 h-3 mr-1" />
                      {badge === 'first-10' && 'Star Collector'}
                      {badge === 'first-25' && 'Super Star'}
                    </Badge>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Speech Play View */}
        {currentView === 'speech-play' && !isActivityActive && (
          <div className="space-y-3 sm:space-y-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('home')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <CompassMascot mood="encouraging" />
                <div>
                  <p className="text-lg text-gray-800">Pick a game to play!</p>
                  <p className="text-sm text-gray-600">Each one helps you practice talking</p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {speechActivities.map(activity => (
                <button
                  key={activity.id}
                  onClick={() => handleStartActivity(activity)}
                  className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white hover:border-blue-400 transition-all hover:shadow-lg p-6 text-left"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="text-5xl">{activity.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg text-gray-900 mb-1">{activity.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{activity.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                          {activity.stars} stars
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {activity.duration}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Activity */}
        {currentView === 'speech-play' && isActivityActive && currentActivity && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <div className="text-center mb-4 sm:mb-6">
                <div className="text-6xl mb-4">{currentActivity.icon}</div>
                <h2 className="text-2xl text-gray-900 mb-2">{currentActivity.title}</h2>
                <p className="text-lg text-gray-600">{currentActivity.description}</p>
              </div>

              <Progress value={activityProgress} className="h-3 mb-4" />
              <p className="text-center text-sm text-gray-600">{Math.round(activityProgress)}% complete</p>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <CompassMascot mood="encouraging" />
                <p className="text-lg text-gray-800">{currentActivity.voicePrompt}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Mini Missions View */}
        {currentView === 'mini-missions' && (
          <div className="space-y-3 sm:space-y-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('home')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <CompassMascot mood="encouraging" />
                <div>
                  <p className="text-lg text-gray-800">Your missions today!</p>
                  <p className="text-sm text-gray-600">Complete them to earn lots of stars</p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {missions.map(mission => (
                <Card
                  key={mission.id}
                  className={`p-4 ${
                    mission.completed
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          mission.completed
                            ? 'bg-green-200 text-green-700'
                            : 'bg-[#F0EDE8] text-gray-600'
                        }`}
                      >
                        {mission.completed ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          mission.icon
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {mission.title}
                        </h3>
                        <p className="text-sm text-gray-600">{mission.description}</p>
                      </div>
                    </div>
                    
                    {!mission.completed && (
                      <Button
                        onClick={() => handleCompleteMission(mission.id)}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Done!
                      </Button>
                    )}
                    
                    {mission.completed && (
                      <Badge className="bg-green-200 text-green-800">
                        <Star className="w-3 h-3 mr-1 fill-yellow-500" />
                        +{mission.stars}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hidden audio for voice */}
      <audio ref={audioRef} />
    </div>
  );
}
