import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { unsplash_tool } from '../lib/unsplash';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  Sparkles, 
  Star, 
  Crown,
  Heart,
  Zap,
  Smile,
  Music,
  Gamepad2,
  Gift,
  PartyPopper,
  Mic,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Home,
  ArrowLeft,
  Target,
  Trophy,
  Check,
  Users2,
  Brain,
  Clock,
  Waves,
  Sun,
  Moon,
  Cloud,
  Rainbow,
  Flower2,
  Butterfly,
  Fish,
  Bird,
  Rabbit,
  Cat,
  Dog,
  Bear,
  Rocket,
  Castle,
  Wand2,
  Magic,
  Globe,
  Mountain,
  Trees,
  Leaf,
  Apple,
  Cherry,
  Candy,
  IceCream,
  Pizza,
  Cookie
} from 'lucide-react';

interface JuniorEnhancedMagicalProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier?: string | null;
}

interface MagicalBuddy {
  id: string;
  name: string;
  personality: string;
  icon: React.ReactNode;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  unlocked: boolean;
  specialPower: string;
  greeting: string;
}

interface MagicalActivity {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  world: string;
  duration: string;
  level: number;
  tokens: number;
  unlocked: boolean;
  colors: {
    bg: string;
    text: string;
    accent: string;
  };
  preview: string;
}

interface SpeechResult {
  accuracy: number;
  stars: number;
  encouragement: string;
  nextStep: string;
  celebrationLevel: 'good' | 'great' | 'amazing' | 'perfect';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  earned: boolean;
  date?: Date;
}

export function JuniorEnhancedMagical({ userData, userTier = 'starter' }: JuniorEnhancedMagicalProps) {
  // Core state
  const [activeView, setActiveView] = useState<'welcome' | 'home' | 'buddy-select' | 'worlds' | 'activity' | 'celebration' | 'calming-island' | 'rewards-store'>('welcome');
  const [selectedBuddy, setSelectedBuddy] = useState<string>('sunny');
  const [currentTokens, setCurrentTokens] = useState(12);
  const [currentStars, setCurrentStars] = useState(47);
  const [streakDays, setStreakDays] = useState(4);
  const [currentLevel, setCurrentLevel] = useState(3);
  const [selectedActivity, setSelectedActivity] = useState<MagicalActivity | null>(null);
  
  // Session state
  const [isRecording, setIsRecording] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [practiceCount, setPracticeCount] = useState(0);
  const [sessionResults, setSessionResults] = useState<SpeechResult[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Animations and effects
  const [sparkleAnimation, setSparkleAnimation] = useState(false);
  const [buddyAnimation, setBuddyAnimation] = useState('');
  const [backgroundMusic, setBackgroundMusic] = useState(true);

  const childName = userData.childName || 'Friend';

  // ✨ MAGICAL BUDDY CHARACTERS - Like Disney Characters
  const magicalBuddies: MagicalBuddy[] = [
    {
      id: 'sunny',
      name: 'Sunny',
      personality: 'Cheerful & Encouraging',
      icon: <Sun className="w-8 h-8" />,
      colors: {
        primary: 'from-yellow-300 to-orange-400',
        secondary: 'bg-yellow-50',
        accent: 'text-yellow-600'
      },
      unlocked: true,
      specialPower: 'Makes every sound shine bright! ☀️',
      greeting: `Hi ${childName}! Let's make beautiful sounds together! 🌟`
    },
    {
      id: 'luna',
      name: 'Luna',
      personality: 'Calm & Gentle',
      icon: <Moon className="w-8 h-8" />,
      colors: {
        primary: 'from-purple-300 to-pink-400',
        secondary: 'bg-purple-50',
        accent: 'text-purple-600'
      },
      unlocked: true,
      specialPower: 'Helps you stay calm and focused! 🌙',
      greeting: `Hello sweetie! Let's practice with peaceful, gentle sounds! 💜`
    },
    {
      id: 'ziggy',
      name: 'Ziggy',
      personality: 'Playful & Fun',
      icon: <Zap className="w-8 h-8" />,
      colors: {
        primary: 'from-green-300 to-blue-400',
        secondary: 'bg-green-50',
        accent: 'text-green-600'
      },
      unlocked: userTier === 'core' || userTier === 'pro',
      specialPower: 'Turns practice into play time! ⚡',
      greeting: `Hey there ${childName}! Ready to have some sound-tastic fun? 🎮`
    },
    {
      id: 'sage',
      name: 'Sage',
      personality: 'Wise & Patient',
      icon: <Crown className="w-8 h-8" />,
      colors: {
        primary: 'from-blue-300 to-indigo-400',
        secondary: 'bg-blue-50',
        accent: 'text-blue-600'
      },
      unlocked: userTier === 'pro',
      specialPower: 'Guides you to become a speech master! 👑',
      greeting: `Greetings ${childName}! Together we'll master every sound! 🏰`
    }
  ];

  // 🌟 MAGICAL WORLDS & ACTIVITIES - Like Theme Parks
  const magicalWorlds = [
    {
      id: 'sound-safari',
      name: 'Sound Safari',
      description: 'Go on adventures with talking animals!',
      icon: <Bear className="w-12 h-12" />,
      colors: { bg: 'from-green-400 to-emerald-500', text: 'text-white' },
      activities: [
        {
          id: 'animal-sounds',
          title: 'Animal Sound Adventure',
          description: 'Help animals find their voices!',
          icon: <Cat className="w-8 h-8" />,
          world: 'Sound Safari',
          duration: '3-5 minutes',
          level: 1,
          tokens: 2,
          unlocked: true,
          colors: { bg: 'bg-green-100', text: 'text-green-700', accent: 'border-green-300' },
          preview: 'Practice with friendly forest animals!'
        },
        {
          id: 'jungle-journey',
          title: 'Jungle Sound Journey',
          description: 'Discover sounds in the magical jungle',
          icon: <Bird className="w-8 h-8" />,
          world: 'Sound Safari',
          duration: '4-6 minutes',
          level: 2,
          tokens: 3,
          unlocked: true,
          colors: { bg: 'bg-emerald-100', text: 'text-emerald-700', accent: 'border-emerald-300' },
          preview: 'Follow the singing birds through the jungle!'
        }
      ]
    },
    {
      id: 'magical-castle',
      name: 'Magical Castle',
      description: 'Cast spells with perfect pronunciation!',
      icon: <Castle className="w-12 h-12" />,
      colors: { bg: 'from-purple-400 to-pink-500', text: 'text-white' },
      activities: [
        {
          id: 'spell-practice',
          title: 'Magic Spell Practice',
          description: 'Say magic words to cast spells!',
          icon: <Wand2 className="w-8 h-8" />,
          world: 'Magical Castle',
          duration: '3-5 minutes',
          level: 1,
          tokens: 2,
          unlocked: true,
          colors: { bg: 'bg-purple-100', text: 'text-purple-700', accent: 'border-purple-300' },
          preview: 'Learn magic words with Princess Luna!'
        },
        {
          id: 'dragon-chat',
          title: 'Chat with Dragons',
          description: 'Have conversations with friendly dragons',
          icon: <Sparkles className="w-8 h-8" />,
          world: 'Magical Castle',
          duration: '5-7 minutes',
          level: 2,
          tokens: 3,
          unlocked: userTier === 'core' || userTier === 'pro',
          colors: { bg: 'bg-pink-100', text: 'text-pink-700', accent: 'border-pink-300' },
          preview: 'Practice talking with wise, kind dragons!'
        }
      ]
    },
    {
      id: 'underwater-palace',
      name: 'Underwater Palace',
      description: 'Swim with sea friends and practice sounds!',
      icon: <Fish className="w-12 h-12" />,
      colors: { bg: 'from-cyan-400 to-blue-500', text: 'text-white' },
      activities: [
        {
          id: 'mermaid-songs',
          title: 'Mermaid Songs',
          description: 'Sing beautiful sounds underwater!',
          icon: <Music className="w-8 h-8" />,
          world: 'Underwater Palace',
          duration: '3-5 minutes',
          level: 1,
          tokens: 2,
          unlocked: true,
          colors: { bg: 'bg-cyan-100', text: 'text-cyan-700', accent: 'border-cyan-300' },
          preview: 'Sing with mermaids in the coral reef!'
        },
        {
          id: 'dolphin-play',
          title: 'Play with Dolphins',
          description: 'Learn dolphin language!',
          icon: <Waves className="w-8 h-8" />,
          world: 'Underwater Palace',
          duration: '4-6 minutes',
          level: 2,
          tokens: 3,
          unlocked: userTier === 'core' || userTier === 'pro',
          colors: { bg: 'bg-blue-100', text: 'text-blue-700', accent: 'border-blue-300' },
          preview: 'Speak dolphin with your ocean friends!'
        }
      ]
    },
    {
      id: 'rainbow-garden',
      name: 'Rainbow Garden',
      description: 'Help flowers bloom with perfect words!',
      icon: <Flower2 className="w-12 h-12" />,
      colors: { bg: 'from-pink-400 to-rose-500', text: 'text-white' },
      activities: [
        {
          id: 'flower-power',
          title: 'Flower Power Words',
          description: 'Make flowers bloom with your voice!',
          icon: <Rainbow className="w-8 h-8" />,
          world: 'Rainbow Garden',
          duration: '3-5 minutes',
          level: 1,
          tokens: 2,
          unlocked: true,
          colors: { bg: 'bg-rose-100', text: 'text-rose-700', accent: 'border-rose-300' },
          preview: 'Watch flowers dance to your words!'
        },
        {
          id: 'butterfly-whispers',
          title: 'Butterfly Whispers',
          description: 'Share secrets with magical butterflies',
          icon: <Butterfly className="w-8 h-8" />,
          world: 'Rainbow Garden',
          duration: '4-6 minutes',
          level: 2,
          tokens: 3,
          unlocked: userTier === 'core' || userTier === 'pro',
          colors: { bg: 'bg-orange-100', text: 'text-orange-700', accent: 'border-orange-300' },
          preview: 'Whisper sweet words to colorful butterflies!'
        }
      ]
    }
  ];

  // 🏆 ACHIEVEMENTS SYSTEM - Like Video Game Badges
  const achievements: Achievement[] = [
    {
      id: 'first-word',
      title: 'First Word Wizard',
      description: 'Said your first perfect word!',
      icon: <Star className="w-6 h-6" />,
      earned: true,
      date: new Date()
    },
    {
      id: 'streak-3',
      title: 'Three Day Star',
      description: 'Practiced 3 days in a row!',
      icon: <Trophy className="w-6 h-6" />,
      earned: true,
      date: new Date()
    },
    {
      id: 'token-collector',
      title: 'Token Collector',
      description: 'Earned 10 tokens!',
      icon: <Gift className="w-6 h-6" />,
      earned: false
    },
    {
      id: 'buddy-master',
      title: 'Buddy Master',
      description: 'Unlocked all speech buddies!',
      icon: <Crown className="w-6 h-6" />,
      earned: false
    }
  ];

  // Get current buddy data
  const getCurrentBuddy = () => magicalBuddies.find(b => b.id === selectedBuddy) || magicalBuddies[0];

  // Handle speech practice with magical feedback
  const handleSpeechPractice = async () => {
    if (!currentWord || isRecording) return;

    setIsRecording(true);
    setBuddyAnimation('listening');
    
    try {
      // Simulate speech recognition processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate magical results
      const accuracy = Math.random() * 0.4 + 0.6; // 60-100%
      const stars = Math.min(3, Math.floor(accuracy * 4));
      
      let celebrationLevel: SpeechResult['celebrationLevel'] = 'good';
      let encouragement = '';
      let nextStep = '';
      
      if (accuracy > 0.95) {
        celebrationLevel = 'perfect';
        encouragement = '🌟 PERFECT! That was absolutely magical!';
        nextStep = "You're ready for the next adventure!";
        setCurrentTokens(prev => prev + 2);
        setCurrentStars(prev => prev + 3);
        triggerConfetti();
      } else if (accuracy > 0.85) {
        celebrationLevel = 'amazing';
        encouragement = '⭐ Amazing work! You said that beautifully!';
        nextStep = "Let's try another magical word!";
        setCurrentTokens(prev => prev + 1);
        setCurrentStars(prev => prev + 2);
      } else if (accuracy > 0.7) {
        celebrationLevel = 'great';
        encouragement = '👍 Great try! I can hear you working hard!';
        nextStep = "Let's practice that sound together!";
        setCurrentStars(prev => prev + 1);
      } else {
        celebrationLevel = 'good';
        encouragement = '💙 Good effort! Every try makes you stronger!';
        nextStep = "Let me show you a fun way to make that sound!";
      }

      const result: SpeechResult = {
        accuracy,
        stars,
        encouragement,
        nextStep,
        celebrationLevel
      };

      setSessionResults(prev => [...prev, result]);
      setPracticeCount(prev => prev + 1);
      
      // Show magical feedback
      toast.success(encouragement, {
        description: nextStep,
        duration: 4000,
      });

      // Generate next word
      generateNextWord();
      
    } catch (error) {
      console.error('Speech practice error:', error);
      toast.error("Oops! Let's try that again! 🎯");
    } finally {
      setIsRecording(false);
      setBuddyAnimation('');
    }
  };

  // Generate next practice word
  const generateNextWord = () => {
    const words = ['cat', 'sun', 'star', 'moon', 'tree', 'fish', 'bird', 'flower'];
    const newWord = words[Math.floor(Math.random() * words.length)];
    setCurrentWord(newWord);
  };

  // Trigger confetti celebration
  const triggerConfetti = () => {
    setShowConfetti(true);
    setSparkleAnimation(true);
    setTimeout(() => {
      setShowConfetti(false);
      setSparkleAnimation(false);
    }, 3000);
  };

  // Start activity session
  const startActivity = (activity: MagicalActivity) => {
    if (!activity.unlocked) {
      toast('This adventure is locked! 🔒', {
        description: 'Unlock it by practicing more!',
        duration: 3000,
      });
      return;
    }

    setSelectedActivity(activity);
    setActiveView('activity');
    setIsSessionActive(true);
    generateNextWord();
    setPracticeCount(0);
    setSessionResults([]);

    toast.success(`Starting ${activity.title}! 🎮`, {
      description: activity.preview,
      duration: 3000,
    });
  };

  // Complete session
  const completeSession = () => {
    if (!selectedActivity) return;

    const sessionStars = sessionResults.reduce((total, result) => total + result.stars, 0);
    const sessionTokens = Math.floor(sessionStars / 3);
    
    setCurrentTokens(prev => prev + sessionTokens);
    setCurrentStars(prev => prev + sessionStars);
    
    toast.success('🎉 Session Complete!', {
      description: `You earned ${sessionTokens} tokens and ${sessionStars} stars!`,
      duration: 4000,
    });

    setActiveView('celebration');
    triggerConfetti();
    
    setTimeout(() => {
      setActiveView('home');
      setIsSessionActive(false);
      setSelectedActivity(null);
    }, 5000);
  };

  // Initialize first word on mount
  useEffect(() => {
    generateNextWord();
  }, []);

  // === RENDER FUNCTIONS ===

  // Welcome Screen - Like a Disney Movie Opening
  const renderWelcome = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300 flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md mx-auto">
        {/* Magical Logo Area */}
        <div className="relative">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center shadow-2xl mb-6">
            <Sparkles className="w-16 h-16 text-white" />
          </div>
          {sparkleAnimation && (
            <div className="absolute inset-0 animate-ping">
              <div className="w-32 h-32 mx-auto bg-yellow-200 rounded-full opacity-20"></div>
            </div>
          )}
        </div>

        {/* Welcome Text */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            Welcome to
          </h1>
          <h2 className="text-5xl font-black text-yellow-200 drop-shadow-lg">
            Speech Adventures!
          </h2>
          <p className="text-xl text-white/90 font-medium">
            Where every word is magical! ✨
          </p>
        </div>

        {/* Enter Button */}
        <Button 
          onClick={() => setActiveView('buddy-select')}
          className="bg-white text-purple-600 hover:bg-yellow-100 px-12 py-4 rounded-full text-xl font-bold shadow-xl transform transition-all hover:scale-105"
        >
          <Play className="w-6 h-6 mr-2" />
          Start Adventure!
        </Button>

        {/* Floating animations */}
        <div className="absolute top-20 left-10 animate-bounce delay-300">
          <Star className="w-8 h-8 text-yellow-200" />
        </div>
        <div className="absolute top-32 right-10 animate-bounce delay-700">
          <Heart className="w-6 h-6 text-pink-200" />
        </div>
        <div className="absolute bottom-20 left-20 animate-bounce delay-500">
          <Rainbow className="w-10 h-10 text-blue-200" />
        </div>
      </div>
    </div>
  );

  // Buddy Selection Screen - Character Selection
  const renderBuddySelect = () => (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-800 mb-2">
            Choose Your Speech Buddy! 🌟
          </h1>
          <p className="text-lg text-purple-600">
            Pick a magical friend to practice with!
          </p>
        </div>

        {/* Buddy Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {magicalBuddies.map((buddy) => (
            <Card 
              key={buddy.id}
              className={`p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                selectedBuddy === buddy.id 
                  ? 'ring-4 ring-yellow-400 shadow-2xl' 
                  : 'hover:shadow-xl'
              } ${
                !buddy.unlocked 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
              }`}
              onClick={() => buddy.unlocked && setSelectedBuddy(buddy.id)}
            >
              {/* Buddy Avatar */}
              <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${buddy.colors.primary} flex items-center justify-center mb-4 shadow-lg`}>
                <div className="text-white">
                  {buddy.icon}
                </div>
              </div>

              {/* Buddy Info */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                  {buddy.name}
                  {!buddy.unlocked && <Crown className="w-5 h-5 text-yellow-500" />}
                </h3>
                <p className="text-sm font-medium text-gray-600">
                  {buddy.personality}
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  {buddy.specialPower}
                </p>
                
                {selectedBuddy === buddy.id && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">
                      {buddy.greeting}
                    </p>
                  </div>
                )}
              </div>

              {/* Lock Overlay */}
              {!buddy.unlocked && (
                <div className="absolute inset-0 bg-gray-400/20 rounded-lg flex items-center justify-center">
                  <div className="bg-white/90 rounded-full p-3">
                    <Crown className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button 
            onClick={() => setActiveView('home')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-xl transform transition-all hover:scale-105"
          >
            <Sparkles className="w-6 h-6 mr-2" />
            Let's Go Adventure!
          </Button>
        </div>
      </div>
    </div>
  );

  // Home Screen - Magical Dashboard
  const renderHome = () => {
    const currentBuddy = getCurrentBuddy();
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentBuddy.colors.primary} p-4`}>
        <div className="max-w-6xl mx-auto">
          {/* Header with Buddy */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-white/20 flex items-center justify-center ${
                buddyAnimation === 'listening' ? 'animate-pulse' : ''
              }`}>
                <div className="text-white">
                  {currentBuddy.icon}
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Hi {childName}! 👋
                </h1>
                <p className="text-white/80">
                  {currentBuddy.name} is here to help!
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-white/20 rounded-full px-4 py-2 text-white text-center">
                <div className="text-lg font-bold">{currentTokens}</div>
                <div className="text-xs">Tokens</div>
              </div>
              <div className="bg-white/20 rounded-full px-4 py-2 text-white text-center">
                <div className="text-lg font-bold">{currentStars}</div>
                <div className="text-xs">Stars</div>
              </div>
              <div className="bg-white/20 rounded-full px-4 py-2 text-white text-center">
                <div className="text-lg font-bold">{streakDays}</div>
                <div className="text-xs">Days</div>
              </div>
            </div>
          </div>

          {/* Progress Journey */}
          <Card className="p-6 mb-6 bg-white/90 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Your Magic Journey</h2>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium">Level {currentLevel}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Progress value={75} className="h-3 bg-gray-200" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>Almost to Level {currentLevel + 1}!</span>
                <span>15 more stars needed ⭐</span>
              </div>
            </div>
          </Card>

          {/* Quick Practice */}
          <Card className="p-6 mb-6 bg-white/90 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Practice ⚡</h2>
            
            <div className="flex flex-col items-center space-y-4">
              <div className="text-center">
                <div className="text-lg text-gray-600 mb-2">Let's practice this word:</div>
                <div className="text-4xl font-bold text-purple-600 bg-purple-100 rounded-full px-8 py-4 inline-block">
                  {currentWord}
                </div>
              </div>
              
              <Button
                onClick={handleSpeechPractice}
                disabled={isRecording}
                className={`w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white shadow-xl transform transition-all hover:scale-110 ${
                  isRecording ? 'animate-pulse' : ''
                }`}
              >
                {isRecording ? (
                  <div className="flex flex-col items-center">
                    <Waves className="w-8 h-8 mb-1" />
                    <span className="text-xs">Listening...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Mic className="w-8 h-8 mb-1" />
                    <span className="text-xs">Say it!</span>
                  </div>
                )}
              </Button>
              
              <p className="text-sm text-gray-600 text-center max-w-xs">
                Tap the microphone and say the word clearly! {currentBuddy.name} is listening! 👂
              </p>
            </div>
          </Card>

          {/* Adventure Worlds */}
          <Card className="p-6 bg-white/90 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Adventure Worlds 🌍</h2>
              <Button
                onClick={() => setActiveView('worlds')}
                variant="outline"
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
              >
                See All Worlds
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {magicalWorlds.slice(0, 4).map((world) => (
                <div
                  key={world.id}
                  className={`p-4 rounded-xl bg-gradient-to-br ${world.colors.bg} cursor-pointer transform transition-all hover:scale-105 shadow-lg`}
                  onClick={() => setActiveView('worlds')}
                >
                  <div className="text-center">
                    <div className="text-white mb-2">
                      {world.icon}
                    </div>
                    <h3 className="text-sm font-bold text-white">{world.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Confetti Effect */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="animate-spin">
                <PartyPopper className="w-32 h-32 text-yellow-400" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Worlds Screen - Theme Park Map
  const renderWorlds = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-300 via-purple-300 to-pink-300 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              Magical Worlds 🌟
            </h1>
            <p className="text-white/80">
              Choose your adventure!
            </p>
          </div>
          <Button
            onClick={() => setActiveView('home')}
            className="bg-white/20 text-white hover:bg-white/30 rounded-full"
          >
            <Home className="w-5 h-5" />
          </Button>
        </div>

        {/* Worlds Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {magicalWorlds.map((world) => (
            <Card key={world.id} className="p-6 bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:scale-102">
              {/* World Header */}
              <div className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br ${world.colors.bg} mb-6`}>
                <div className="text-white">
                  {world.icon}
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${world.colors.text}`}>
                    {world.name}
                  </h2>
                  <p className={`${world.colors.text} opacity-90`}>
                    {world.description}
                  </p>
                </div>
              </div>

              {/* Activities */}
              <div className="space-y-3">
                {world.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${activity.colors.bg} ${activity.colors.text} ${activity.colors.accent} ${
                      !activity.unlocked ? 'opacity-50' : 'hover:scale-102'
                    }`}
                    onClick={() => startActivity(activity)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-current">
                        {activity.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold">{activity.title}</h3>
                        <p className="text-sm opacity-80">{activity.preview}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span>🕐 {activity.duration}</span>
                          <span>🪙 {activity.tokens} tokens</span>
                          <span>⭐ Level {activity.level}</span>
                        </div>
                      </div>
                      {!activity.unlocked && <Crown className="w-5 h-5 text-yellow-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  // Activity Screen - Immersive Game
  const renderActivity = () => {
    if (!selectedActivity) return null;

    const currentBuddy = getCurrentBuddy();

    return (
      <div className={`min-h-screen bg-gradient-to-br ${selectedActivity.colors.bg} bg-opacity-20 p-4`}>
        <div className="max-w-4xl mx-auto">
          {/* Activity Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${currentBuddy.colors.primary} flex items-center justify-center`}>
                <div className="text-white">
                  {currentBuddy.icon}
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {selectedActivity.title}
                </h1>
                <p className="text-gray-600">{selectedActivity.description}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setActiveView('home')}
                variant="outline"
                className="rounded-full"
              >
                <Home className="w-5 h-5" />
              </Button>
              <Button
                onClick={completeSession}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full"
              >
                <Check className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Practice Area */}
          <Card className="p-8 mb-6 bg-white/90 backdrop-blur-sm">
            <div className="text-center space-y-6">
              {/* Current Word */}
              <div>
                <div className="text-lg text-gray-600 mb-4">
                  {currentBuddy.name} wants you to say:
                </div>
                <div className="text-6xl font-bold text-purple-600 bg-purple-100 rounded-3xl px-12 py-8 inline-block shadow-lg">
                  {currentWord}
                </div>
              </div>

              {/* Record Button */}
              <Button
                onClick={handleSpeechPractice}
                disabled={isRecording}
                className={`w-32 h-32 rounded-full bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white shadow-2xl transform transition-all hover:scale-110 ${
                  isRecording ? 'animate-pulse' : ''
                }`}
              >
                {isRecording ? (
                  <div className="flex flex-col items-center">
                    <Waves className="w-12 h-12 mb-2" />
                    <span className="text-sm">Listening...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Mic className="w-12 h-12 mb-2" />
                    <span className="text-sm">Tap to Say!</span>
                  </div>
                )}
              </Button>

              {/* Encouragement */}
              <p className="text-lg text-gray-700 max-w-md mx-auto">
                Take your time! {currentBuddy.name} believes in you! 🌟
              </p>
            </div>
          </Card>

          {/* Session Progress */}
          <Card className="p-6 bg-white/90 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Session Progress</h3>
              <div className="text-sm text-gray-600">
                {practiceCount} words practiced
              </div>
            </div>
            
            <div className="flex gap-2 mb-4">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    i < sessionResults.length
                      ? sessionResults[i].celebrationLevel === 'perfect'
                        ? 'bg-yellow-400'
                        : sessionResults[i].celebrationLevel === 'amazing'
                        ? 'bg-green-400'
                        : sessionResults[i].celebrationLevel === 'great'
                        ? 'bg-blue-400'
                        : 'bg-purple-400'
                      : 'bg-gray-200'
                  }`}
                >
                  {i < sessionResults.length && (
                    <Star className="w-4 h-4 text-white" />
                  )}
                </div>
              ))}
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Great job practicing! Keep going to earn more stars! ⭐
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // Celebration Screen
  const renderCelebration = () => (
    <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-orange-300 to-red-300 flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md mx-auto">
        <div className="relative">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl mb-6">
            <Trophy className="w-16 h-16 text-white" />
          </div>
          {showConfetti && (
            <div className="absolute inset-0 animate-bounce">
              <PartyPopper className="w-16 h-16 text-yellow-200 mx-auto" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            🎉 Amazing Work! 🎉
          </h1>
          <p className="text-xl text-white/90 font-medium">
            You completed {selectedActivity?.title}!
          </p>
          <div className="bg-white/20 rounded-xl p-6 text-white">
            <div className="text-3xl font-bold mb-2">
              +{sessionResults.reduce((total, result) => total + result.stars, 0)} ⭐
            </div>
            <div className="text-lg">
              Stars Earned!
            </div>
          </div>
        </div>

        <Button 
          onClick={() => setActiveView('home')}
          className="bg-white text-orange-600 hover:bg-yellow-100 px-8 py-4 rounded-full text-lg font-bold shadow-xl transform transition-all hover:scale-105"
        >
          <Home className="w-6 h-6 mr-2" />
          Home
        </Button>
      </div>
    </div>
  );

  // Main render switch
  switch (activeView) {
    case 'welcome':
      return renderWelcome();
    case 'buddy-select':
      return renderBuddySelect();
    case 'home':
      return renderHome();
    case 'worlds':
      return renderWorlds();
    case 'activity':
      return renderActivity();
    case 'celebration':
      return renderCelebration();
    default:
      return renderHome();
  }
}