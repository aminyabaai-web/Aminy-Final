import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { 
  Mic, 
  Heart, 
  Wind, 
  Star, 
  Play, 
  Sparkles, 
  Trophy,
  Settings,
  Clock,
  CheckCircle,
  Volume2,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AminyJrCompleteProps {
  childName: string;
  childId: string;
  parentId: string;
  onComplete: (summary: SessionSummary) => void;
  parentalControls?: {
    sessionTimeLimit: number;
    dailyLimit: number;
  };
}

interface SessionSummary {
  activity: string;
  duration: number;
  starsEarned: number;
  calmCoinsEarned: number;
  speechAttempts?: number;
  breathingCycles?: number;
  achievements: string[];
  timestamp: string;
}

type GameMode = 'menu' | 'speech-buddy' | 'calm-quest' | 'reinforcement-stars';

export function AminyJrComplete({ 
  childName,
  childId,
  parentId,
  onComplete,
  parentalControls = { sessionTimeLimit: 3, dailyLimit: 15 }
}: AminyJrCompleteProps) {
  const [currentGame, setCurrentGame] = useState<GameMode>('menu');
  const [sessionTime, setSessionTime] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [totalCalmCoins, setTotalCalmCoins] = useState(0);
  const [showParentControls, setShowParentControls] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  
  const [speechPhrase, setSpeechPhrase] = useState("Hi mom!");
  const [speechAttempts, setSpeechAttempts] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const [breathingCycle, setBreathingCycle] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('rest');
  const [breathingCount, setBreathingCount] = useState(0);
  
  const [currentStreak, setCurrentStreak] = useState(3);
  const [weeklyGoals, setWeeklyGoals] = useState([
    { name: 'Morning routine', completed: true },
    { name: 'Calm transition', completed: true },
    { name: 'Bedtime story', completed: false }
  ]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
    }
  }, []);

  // Session timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sessionActive) {
      timer = setInterval(() => {
        setSessionTime(prev => {
          const newTime = prev + 1;
          if (newTime >= parentalControls.sessionTimeLimit * 60) {
            handleEndSession();
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [sessionActive]);

  const playSuccessChime = () => {
    // Create success chime using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const createAnimatedOrbs = () => {
    // Create floating orb animation
    const orbs = [];
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const orb = document.createElement('div');
        orb.className = 'fixed w-12 h-12 rounded-full pointer-events-none z-50 animate-float-up';
        orb.style.background = 'linear-gradient(120deg, #C9EAD9, #FFE2B6, #E6E0F8)';
        orb.style.left = `${Math.random() * window.innerWidth}px`;
        orb.style.top = `${window.innerHeight}px`;
        orb.style.opacity = '0.8';
        orb.style.boxShadow = '0 0 20px rgba(201, 234, 217, 0.6)';
        
        document.body.appendChild(orb);
        
        setTimeout(() => {
          orb.remove();
        }, 2000);
      }, i * 100);
    }
  };

  const syncCalmCoinsToSupabase = async (coinsEarned: number) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/jr-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            parentId,
            childId,
            coinsEarned,
            timestamp: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to sync Calm Coins');
      }

      const data = await response.json();
      return data.newBalance;
    } catch (error) {
      console.error('Error syncing Calm Coins:', error);
      toast.error('Couldn\'t sync progress. Will retry later.');
      return null;
    }
  };

  const handleEndSession = async () => {
    setSessionActive(false);
    
    const summary: SessionSummary = {
      activity: currentGame,
      duration: sessionTime,
      starsEarned: totalStars,
      calmCoinsEarned: totalCalmCoins,
      speechAttempts,
      breathingCycles: breathingCount,
      achievements: [],
      timestamp: new Date().toISOString()
    };
    
    if (totalStars >= 10) summary.achievements.push('Star Collector');
    if (breathingCount >= 3) summary.achievements.push('Calm Champion');
    if (speechAttempts >= 5) summary.achievements.push('Speech Hero');
    
    // Sync to Supabase
    await syncCalmCoinsToSupabase(totalCalmCoins);
    
    // Save session to database
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/jr-session/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            childId,
            parentId,
            ...summary
          })
        }
      );
    } catch (error) {
      console.error('Error saving session:', error);
    }
    
    playSuccessChime();
    createAnimatedOrbs();
    
    onComplete(summary);
    toast.success(`Great job, ${childName}! You earned ${totalCalmCoins} Calm Coins! 🌟`);
  };

  const startGame = (game: GameMode) => {
    setCurrentGame(game);
    setSessionActive(true);
  };

  // Speech Buddy Game
  const SpeechBuddyGame = () => {
    const phrases = [
      "Hi mom!", "I love you", "Thank you", "Please help me", "Good morning",
      "I'm happy", "Can I play?", "More please", "All done", "I need help"
    ];

    const handleSpeechAttempt = async () => {
      if (!recognitionRef.current) {
        toast.error('Speech recognition not supported in this browser');
        return;
      }

      setIsListening(true);
      setSpeechAttempts(prev => prev + 1);

      try {
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.toLowerCase();
          const expectedPhrase = speechPhrase.toLowerCase();
          
          // Check if speech matches (fuzzy match)
          const similarity = transcript.includes(expectedPhrase) || 
                            expectedPhrase.includes(transcript) ||
                            transcript.length > 0; // Accept any speech for encouragement
          
          setIsListening(false);
          
          if (similarity) {
            const stars = 2;
            const coins = 5;
            setTotalStars(prev => prev + stars);
            setTotalCalmCoins(prev => prev + coins);
            
            playSuccessChime();
            toast.success(`Amazing! +${stars} stars, +${coins} Calm Coins! 🎉`, {
              icon: '⭐'
            });
            
            setSpeechPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
          } else {
            toast('Try again! You can do it! 💪', { icon: '🎯' });
          }
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
          toast('Try again! You can do it! 💪', { icon: '🎯' });
        };

        recognitionRef.current.start();
      } catch (error) {
        setIsListening(false);
        console.error('Speech recognition error:', error);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-b from-[#C9EAD9]/20 to-[#FFE2B6]/20">
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#C9EAD9] via-[#FFE2B6] to-[#E6E0F8] animate-pulse flex items-center justify-center shadow-lg">
            <Mic className={`w-16 h-16 text-white ${isListening ? 'animate-bounce' : ''}`} />
          </div>
          {isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-accent animate-ping"></div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg mb-6 text-center max-w-sm">
          <p className="text-sm text-slate-500 mb-2">Say this phrase:</p>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{speechPhrase}</h2>
          
          <Button
            onClick={handleSpeechAttempt}
            disabled={isListening}
            size="lg"
            className="bg-gradient-to-r from-accent to-teal-500 hover:opacity-90 text-white w-full"
          >
            {isListening ? (
              <>
                <Volume2 className="w-5 h-5 mr-2 animate-pulse" />
                Listening...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Tap to Speak
              </>
            )}
          </Button>
        </div>

        <div className="text-center">
          <div className="flex items-center gap-2 justify-center mb-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-2xl font-bold text-slate-900">{totalStars}</span>
          </div>
          <p className="text-sm text-slate-600">Stars earned today</p>
        </div>

        <Button
          variant="ghost"
          onClick={() => setCurrentGame('menu')}
          className="mt-8"
        >
          Back to Games
        </Button>
      </div>
    );
  };

  // Calm Quest Game
  const CalmQuestGame = () => {
    const startBreathing = () => {
      setBreathingCycle('inhale');
      
      const sequence = [
        { phase: 'inhale' as const, duration: 4000, message: 'Breathe in...' },
        { phase: 'hold' as const, duration: 4000, message: 'Hold...' },
        { phase: 'exhale' as const, duration: 6000, message: 'Breathe out...' },
        { phase: 'rest' as const, duration: 2000, message: 'Great job!' }
      ];

      let currentStep = 0;

      const runSequence = () => {
        if (currentStep >= sequence.length) {
          setBreathingCount(prev => prev + 1);
          const stars = 3;
          const coins = 8;
          setTotalStars(prev => prev + stars);
          setTotalCalmCoins(prev => prev + coins);
          
          playSuccessChime();
          toast.success(`Calm cycle complete! +${stars} stars, +${coins} Calm Coins! 🌈`);
          setBreathingCycle('rest');
          return;
        }

        const step = sequence[currentStep];
        setBreathingCycle(step.phase);
        
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(step.message);
          utterance.rate = 0.8;
          utterance.pitch = 1.2;
          speechSynthesis.speak(utterance);
        }

        setTimeout(() => {
          currentStep++;
          runSequence();
        }, step.duration);
      };

      runSequence();
    };

    const getOrbSize = () => {
      switch (breathingCycle) {
        case 'inhale': return 'scale-150';
        case 'hold': return 'scale-150';
        case 'exhale': return 'scale-100';
        default: return 'scale-100';
      }
    };

    const getOrbColor = () => {
      switch (breathingCycle) {
        case 'inhale': return 'from-blue-300 to-blue-500';
        case 'hold': return 'from-purple-300 to-purple-500';
        case 'exhale': return 'from-green-300 to-green-500';
        default: return 'from-[#C9EAD9] to-[#FFE2B6]';
      }
    };

    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-b from-[#E6E0F8]/20 to-[#C9EAD9]/20">
        <div className="mb-8 flex flex-col items-center">
          <div 
            className={`w-48 h-48 rounded-full bg-gradient-to-br ${getOrbColor()} transition-all duration-1000 ease-in-out ${getOrbSize()} flex items-center justify-center shadow-2xl`}
          >
            <Wind className="w-20 h-20 text-white" />
          </div>
          
          <div className="mt-6 text-center">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {breathingCycle === 'inhale' && 'Breathe In...'}
              {breathingCycle === 'hold' && 'Hold...'}
              {breathingCycle === 'exhale' && 'Breathe Out...'}
              {breathingCycle === 'rest' && 'Ready to start?'}
            </h3>
            <p className="text-slate-600">Follow the gentle orb</p>
          </div>
        </div>

        {breathingCycle === 'rest' && (
          <Button
            onClick={startBreathing}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 text-white"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Calm Breathing
          </Button>
        )}

        <div className="mt-8 text-center">
          <div className="flex items-center gap-2 justify-center mb-2">
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
            <span className="text-2xl font-bold text-slate-900">{breathingCount}</span>
          </div>
          <p className="text-sm text-slate-600">Calm cycles completed</p>
        </div>

        <Button
          variant="ghost"
          onClick={() => setCurrentGame('menu')}
          className="mt-8"
        >
          Back to Games
        </Button>
      </div>
    );
  };

  // Reinforcement Stars Game
  const ReinforcementStarsGame = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-b from-[#FFE2B6]/20 to-[#E6E0F8]/20">
        <div className="mb-8 text-center">
          <div className="relative inline-block">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center shadow-xl animate-pulse">
              <Trophy className="w-16 h-16 text-white" />
            </div>
            <Badge className="absolute -top-2 -right-2 bg-accent text-white text-lg px-3 py-1">
              {currentStreak} days
            </Badge>
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 mt-4 mb-2">Amazing Streak!</h2>
          <p className="text-slate-600">Keep it going, {childName}! 🌟</p>
        </div>

        <Card className="w-full max-w-sm p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">This Week's Goals</h3>
          <div className="space-y-3">
            {weeklyGoals.map((goal, idx) => (
              <div 
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  goal.completed 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-slate-50 border border-slate-200'
                }`}
              >
                {goal.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Target className="w-5 h-5 text-slate-400" />
                )}
                <span className={`flex-1 ${goal.completed ? 'text-green-900 font-medium' : 'text-slate-700'}`}>
                  {goal.name}
                </span>
                {goal.completed && (
                  <Badge className="bg-yellow-500 text-white">
                    +5 ⭐
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-6">
          <Card className="p-4 text-center bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2 fill-yellow-600" />
            <p className="text-2xl font-bold text-yellow-900">{totalStars}</p>
            <p className="text-xs text-yellow-700">Total Stars</p>
          </Card>
          
          <Card className="p-4 text-center bg-gradient-to-br from-accent/10 to-teal-100 border-accent/30">
            <Sparkles className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-accent">{totalCalmCoins}</p>
            <p className="text-xs text-teal-700">Calm Coins</p>
          </Card>
        </div>

        <Button
          variant="ghost"
          onClick={() => setCurrentGame('menu')}
        >
          Back to Games
        </Button>
      </div>
    );
  };

  // Main Menu
  const GameMenu = () => {
    const games = [
      {
        id: 'speech-buddy' as const,
        title: 'Speech Buddy',
        description: 'Practice talking with fun phrases!',
        icon: Mic,
        color: 'from-[#C9EAD9] to-[#FFE2B6]',
        iconColor: 'text-green-600'
      },
      {
        id: 'calm-quest' as const,
        title: 'Calm Quest',
        description: 'Breathe with the magic orb',
        icon: Wind,
        color: 'from-[#E6E0F8] to-[#C9EAD9]',
        iconColor: 'text-purple-600'
      },
      {
        id: 'reinforcement-stars' as const,
        title: 'My Stars',
        description: 'See your amazing progress!',
        icon: Trophy,
        color: 'from-[#FFE2B6] to-[#E6E0F8]',
        iconColor: 'text-yellow-600'
      }
    ];

    return (
      <div className="h-full p-6 bg-gradient-to-b from-white to-slate-50">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-teal-500 mx-auto mb-4 flex items-center justify-center animate-bounce">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Hi {childName}! 👋</h1>
          <p className="text-slate-600">Pick a fun activity to play</p>
        </div>

        <div className="space-y-4 mb-8">
          {games.map(game => (
            <Card 
              key={game.id}
              onClick={() => startGame(game.id)}
              className={`p-6 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-r ${game.color} border-2 border-transparent hover:border-accent`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md">
                  <game.icon className={`w-8 h-8 ${game.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{game.title}</h3>
                  <p className="text-sm text-slate-700">{game.description}</p>
                </div>
                <Play className="w-6 h-6 text-slate-400" />
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4 bg-slate-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600">
                {parentalControls.sessionTimeLimit} min session
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowParentControls(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="h-screen bg-white">
      {sessionActive && (
        <div className="bg-accent/10 border-b border-accent/20">
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-sm text-slate-700">
                {Math.floor(sessionTime / 60)}:{(sessionTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <Progress 
              value={(sessionTime / (parentalControls.sessionTimeLimit * 60)) * 100} 
              className="flex-1 mx-4 h-2"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleEndSession}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {currentGame === 'menu' && <GameMenu />}
      {currentGame === 'speech-buddy' && <SpeechBuddyGame />}
      {currentGame === 'calm-quest' && <CalmQuestGame />}
      {currentGame === 'reinforcement-stars' && <ReinforcementStarsGame />}

      <Sheet open={showParentControls} onOpenChange={setShowParentControls}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Parental Controls</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            <Card className="p-4 bg-green-50 border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Today's Progress</h4>
              <div className="space-y-2 text-sm text-green-800">
                <div className="flex justify-between">
                  <span>Sessions completed:</span>
                  <span className="font-semibold">3</span>
                </div>
                <div className="flex justify-between">
                  <span>Stars earned:</span>
                  <span className="font-semibold">{totalStars} ⭐</span>
                </div>
                <div className="flex justify-between">
                  <span>Calm Coins:</span>
                  <span className="font-semibold">{totalCalmCoins} 🪙</span>
                </div>
              </div>
            </Card>

            <Button
              onClick={() => setShowParentControls(false)}
              className="w-full bg-accent hover:bg-accent/90"
            >
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
        
        .animate-float-up {
          animation: float-up 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Dashboard Parent Summary Card
export function JrParentSummaryCard({ summary, childName }: { summary: SessionSummary; childName: string }) {
  return (
    <Card className="p-5 bg-gradient-to-r from-[#C9EAD9]/20 to-[#FFE2B6]/20 border-accent/20">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-accent to-teal-500 rounded-full flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 mb-1">Aminy Jr earned {summary.calmCoinsEarned} Calm Coins today ⭐</h3>
          <p className="text-sm text-slate-600">
            {childName} played {summary.activity} for {Math.floor(summary.duration / 60)} min
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 text-center">
          <Star className="w-6 h-6 text-yellow-500 fill-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900">{summary.starsEarned}</p>
          <p className="text-xs text-slate-600">Stars</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <Sparkles className="w-6 h-6 text-accent mx-auto mb-1" />
          <p className="text-2xl font-bold text-accent">{summary.calmCoinsEarned}</p>
          <p className="text-xs text-slate-600">Coins</p>
        </div>
      </div>

      {summary.achievements.length > 0 && (
        <div className="bg-white rounded-lg p-3">
          <p className="text-xs font-medium text-slate-700 mb-2">Achievements:</p>
          <div className="flex flex-wrap gap-2">
            {summary.achievements.map((achievement, idx) => (
              <Badge key={idx} className="bg-purple-100 text-purple-700">
                🏆 {achievement}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
