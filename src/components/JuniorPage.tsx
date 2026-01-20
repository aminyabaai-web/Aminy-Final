import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Play, 
  BookOpen, 
  Music, 
  Gamepad2, 
  Star, 
  Clock,
  Target,
  Trophy,
  Heart,
  Settings,
  User,
  Bell,
  ChevronRight,
  Mic,
  Volume2,
  RotateCcw,
  Check,
  Gift,
  MessageSquare,
  Users2,
  Brain,
  Calendar,
  Zap,
  Crown,
  PartyPopper,
  Headphones,
  Smile,
  Baby,
  Robot,
  Pause,
  Square,
  Home,
  ArrowLeft,
  ArrowRight,
  Shield,
  Lock,
  MicIcon,
  Wand2,
  TrendingUp,
  Award,
  Lightbulb,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  ThumbsUp,
  Eye,
  Waves,
  Activity,
  Filter,
  Shuffle,
  Timer,
  CheckCircle,
  XCircle,
  Plus,
  BarChart3,
  Layers
} from 'lucide-react';
import { CompassIcon } from './CompassIcon';

interface JuniorPageProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier?: string | null;
}

interface BuddyVoice {
  id: string;
  name: string;
  personality: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  unlocked: boolean;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: string;
  skillType: 'speech' | 'social' | 'routines' | 'sensory' | 'executive' | 'aac';
  level: 0 | 1 | 2 | 3;
  sessionSize: 'micro' | 'standard' | 'extended';
  unlocked: boolean;
  tier: 'starter' | 'core' | 'pro';
  color: string;
  track: string;
  voiceReady: boolean;
}

interface SpeechAnalysis {
  accuracy: number;
  clarity: number;
  attempt: boolean;
  phonemes: string[];
  confidence: number;
  needsSupport: boolean;
  latency: number;
}

interface RealWorldMission {
  id: string;
  title: string;
  description: string;
  safetyLevel: 'safe' | 'ask_parent' | 'restricted';
  tokens: number;
  completed: boolean;
}

// Track filter options
const TRACK_FILTERS = [
  { id: 'speech', label: 'Speech', icon: MessageSquare, color: 'blue' },
  { id: 'social', label: 'Social', icon: Users2, color: 'green' },
  { id: 'routines', label: 'Routines', icon: Clock, color: 'orange' },
  { id: 'sensory', label: 'Sensory', icon: Brain, color: 'purple' },
  { id: 'executive', label: 'Executive', icon: Target, color: 'indigo' },
  { id: 'aac', label: 'AAC', icon: Layers, color: 'pink' }
];

export function JuniorPage({ userData, userTier = 'starter' }: JuniorPageProps) {
  const [activeView, setActiveView] = useState<'kid-login' | 'home' | 'buddy-select' | 'activity-select' | 'activity' | 'celebration' | 'calm-corner' | 'parent-education'>('kid-login');
  const [selectedBuddy, setSelectedBuddy] = useState<string>('sunny');
  const [currentSpeechLevel, setCurrentSpeechLevel] = useState<number>(2);
  const [isRecording, setIsRecording] = useState(false);
  const [audioProcessing, setAudioProcessing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [todayTokens, setTodayTokens] = useState(12);
  const [weekStreak, setWeekStreak] = useState(4);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activeTrackFilter, setActiveTrackFilter] = useState<string>('all');
  const [currentWord, setCurrentWord] = useState('');
  const [practiceAttempts, setPracticeAttempts] = useState(0);
  const [successStreak, setSuccessStreak] = useState(0);
  const [needsBreak, setNeedsBreak] = useState(false);
  const [speechAnalysis, setSpeechAnalysis] = useState<SpeechAnalysis | null>(null);
  const [isKidMode, setIsKidMode] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [showExitPIN, setShowExitPIN] = useState(false);
  const [voiceNavEnabled, setVoiceNavEnabled] = useState(true);
  const [practiceReps, setPracticeReps] = useState(23);
  const [generalizationWins, setGeneralizationWins] = useState(7);
  
  // Enhanced Parent Integration State
  const [todaysFocus, setTodaysFocus] = useState<string[]>(['/s/ blends', 'morning routine step 3']);
  const [sharedRewards, setSharedRewards] = useState(['stickers', 'high-fives', 'favorite song']);
  const [recentParentActivity, setRecentParentActivity] = useState('Set focus: practice /s/ sounds');
  const [parentMicroCards, setParentMicroCards] = useState([
    {
      id: 'victory-s-sounds',
      title: 'Eddie nailed /s/ in blends!',
      message: 'Try "stir soup" at dinner tonight',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      type: 'celebration' as const,
      actionable: true
    }
  ]);
  
  // Real World Mission State
  const [currentMission, setCurrentMission] = useState<RealWorldMission | null>({
    id: 'socks-s-sounds',
    title: 'Real-World Mission',
    description: 'Say 3 /s/ sounds while putting on socks',
    safetyLevel: 'ask_parent',
    tokens: 2,
    completed: false
  });

  const childName = userData.childName || 'Eddie';
  const safeTier = userTier || 'starter';

  // Revolutionary Buddy Voices
  const buddyVoices: BuddyVoice[] = [
    {
      id: 'sunny',
      name: 'Sunny',
      personality: 'Friendly & Encouraging',
      icon: <Smile className="w-6 h-6" />,
      color: 'bg-yellow-100 text-yellow-600',
      description: 'Celebrates every try - warm and supportive voice',
      unlocked: true
    },
    {
      id: 'luna',
      name: 'Luna',
      personality: 'Calm & Gentle',
      icon: <Heart className="w-6 h-6" />,
      color: 'bg-purple-100 text-purple-600',
      description: 'Perfect for anxious moments - soothing voice',
      unlocked: true
    },
    {
      id: 'ziggy',
      name: 'Ziggy',
      personality: 'Playful & Fun',
      icon: <PartyPopper className="w-6 h-6" />,
      color: 'bg-green-100 text-green-600',
      description: 'Makes practice feel like play - energetic voice',
      unlocked: safeTier === 'core' || safeTier === 'pro'
    },
    {
      id: 'sage',
      name: 'Sage',
      personality: 'Wise Guide',
      icon: <Crown className="w-6 h-6" />,
      color: 'bg-blue-100 text-blue-600',
      description: 'Patient mentor for big goals - wise voice',
      unlocked: safeTier === 'pro'
    }
  ];

  // Revolutionary Activity Taxonomy - Complete IEP-mapped catalog
  const activities: Activity[] = [
    // === SPEECH TRACK ===
    // Articulation
    {
      id: 'sound-safari',
      title: 'Sound Safari',
      description: 'Practice individual sounds with fun animal friends',
      icon: <Volume2 className="w-5 h-5" />,
      duration: '2-4 min',
      skillType: 'speech',
      level: 0,
      sessionSize: 'micro',
      unlocked: true,
      tier: 'starter',
      color: 'bg-blue-100 text-blue-600',
      track: 'Articulation',
      voiceReady: true
    },
    {
      id: 'sound-detectives',
      title: 'Sound Detectives',
      description: 'Minimal pairs practice: "bat" vs "pat"',
      icon: <Eye className="w-5 h-5" />,
      duration: '3-5 min',
      skillType: 'speech',
      level: 1,
      sessionSize: 'standard',
      unlocked: true,
      tier: 'starter',
      color: 'bg-blue-100 text-blue-600',
      track: 'Phonology',
      voiceReady: true
    },
    {
      id: 's-blend-builder',
      title: 'S-Blend Builder',
      description: 'Master tricky "st", "sp", "sc" sounds',
      icon: <Zap className="w-5 h-5" />,
      duration: '4-6 min',
      skillType: 'speech',
      level: 2,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-blue-100 text-blue-600',
      track: 'Articulation',
      voiceReady: true
    },
    {
      id: 'smooth-talker',
      title: 'Smooth Talker',
      description: 'Rate control and rhythm practice',
      icon: <Waves className="w-5 h-5" />,
      duration: '4-6 min',
      skillType: 'speech',
      level: 2,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-cyan-100 text-cyan-600',
      track: 'Fluency',
      voiceReady: true
    },
    // Language
    {
      id: 'word-garden',
      title: 'Word Garden',
      description: 'Grow vocabulary in themed categories',
      icon: <MessageSquare className="w-5 h-5" />,
      duration: '3-5 min',
      skillType: 'speech',
      level: 1,
      sessionSize: 'standard',
      unlocked: true,
      tier: 'starter',
      color: 'bg-green-100 text-green-600',
      track: 'Language',
      voiceReady: true
    },
    {
      id: 'sentence-castle',
      title: 'Sentence Castle',
      description: 'Build sentences to save the kingdom',
      icon: <Award className="w-5 h-5" />,
      duration: '5-7 min',
      skillType: 'speech',
      level: 2,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-green-100 text-green-600',
      track: 'Language',
      voiceReady: true
    },
    {
      id: 'wh-questions-quest',
      title: 'WH-Questions Quest',
      description: 'Master who, what, where, when, why',
      icon: <HelpCircle className="w-5 h-5" />,
      duration: '4-6 min',
      skillType: 'speech',
      level: 2,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-green-100 text-green-600',
      track: 'Language',
      voiceReady: true
    },

    // === SOCIAL COMMUNICATION TRACK ===
    {
      id: 'turn-taking-time',
      title: 'Turn-Taking Time',
      description: 'Learn to share conversation and play',
      icon: <Users2 className="w-5 h-5" />,
      duration: '4-6 min',
      skillType: 'social',
      level: 1,
      sessionSize: 'standard',
      unlocked: true,
      tier: 'starter',
      color: 'bg-purple-100 text-purple-600',
      track: 'Turn-taking',
      voiceReady: true
    },
    {
      id: 'emotion-detectives',
      title: 'Emotion Detectives',
      description: 'Read faces and understand feelings',
      icon: <Smile className="w-5 h-5" />,
      duration: '3-5 min',
      skillType: 'social',
      level: 1,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-purple-100 text-purple-600',
      track: 'Perspective',
      voiceReady: true
    },
    {
      id: 'communication-repair',
      title: 'Communication Repair',
      description: 'Try again when misunderstood',
      icon: <RefreshCw className="w-5 h-5" />,
      duration: '5-7 min',
      skillType: 'social',
      level: 2,
      sessionSize: 'standard',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-purple-100 text-purple-600',
      track: 'Perspective',
      voiceReady: true
    },

    // === DAILY ROUTINES TRACK ===
    {
      id: 'daily-helper',
      title: 'Daily Helper',
      description: 'Practice daily routines with visual schedules',
      icon: <Clock className="w-5 h-5" />,
      duration: '3-5 min',
      skillType: 'routines',
      level: 1,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-orange-100 text-orange-600',
      track: 'Scripts',
      voiceReady: true
    },
    {
      id: 'ask-and-tell',
      title: 'Ask & Tell',
      description: 'Requesting help and commenting skills',
      icon: <MessageSquare className="w-5 h-5" />,
      duration: '2-4 min',
      skillType: 'routines',
      level: 0,
      sessionSize: 'micro',
      unlocked: true,
      tier: 'starter',
      color: 'bg-orange-100 text-orange-600',
      track: 'Scripts',
      voiceReady: true
    },

    // === SENSORY & REGULATION TRACK ===
    {
      id: 'calm-corner',
      title: 'Calm Corner',
      description: 'Breathing bubbles and co-regulation',
      icon: <Brain className="w-5 h-5" />,
      duration: '2-4 min',
      skillType: 'sensory',
      level: 0,
      sessionSize: 'micro',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-indigo-100 text-indigo-600',
      track: 'Calm',
      voiceReady: true
    },
    {
      id: 'movement-minute',
      title: 'Movement Minute',
      description: 'Gross motor + speech coordination',
      icon: <Activity className="w-5 h-5" />,
      duration: '2-3 min',
      skillType: 'sensory',
      level: 0,
      sessionSize: 'micro',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-indigo-100 text-indigo-600',
      track: 'Movement',
      voiceReady: true
    },
    {
      id: 'reset-pack',
      title: 'Reset Pack',
      description: 'Emergency regulation toolkit',
      icon: <Shield className="w-5 h-5" />,
      duration: '1-3 min',
      skillType: 'sensory',
      level: 0,
      sessionSize: 'micro',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-indigo-100 text-indigo-600',
      track: 'Reset',
      voiceReady: false
    },

    // === EXECUTIVE SKILLS TRACK ===
    {
      id: 'flexible-thinker',
      title: 'Flexible Thinker',
      description: 'Practice switching between tasks',
      icon: <Shuffle className="w-5 h-5" />,
      duration: '4-6 min',
      skillType: 'executive',
      level: 2,
      sessionSize: 'standard',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-teal-100 text-teal-600',
      track: 'Flexibility',
      voiceReady: true
    },
    {
      id: 'plan-it',
      title: 'Plan It',
      description: '2-step → 3-step planning practice',
      icon: <BarChart3 className="w-5 h-5" />,
      duration: '5-8 min',
      skillType: 'executive',
      level: 2,
      sessionSize: 'extended',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-teal-100 text-teal-600',
      track: 'Planning',
      voiceReady: true
    },
    {
      id: 'unexpected-change-coach',
      title: 'Unexpected Change Coach',
      description: 'Handle surprises with flexibility',
      icon: <AlertTriangle className="w-5 h-5" />,
      duration: '6-8 min',
      skillType: 'executive',
      level: 3,
      sessionSize: 'extended',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-teal-100 text-teal-600',
      track: 'Flexibility',
      voiceReady: true
    },
    {
      id: 'friendship-fix-it',
      title: 'Friendship Fix-It',
      description: 'Repair social misunderstandings',
      icon: <Users2 className="w-5 h-5" />,
      duration: '7-9 min',
      skillType: 'social',
      level: 3,
      sessionSize: 'extended',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-purple-100 text-purple-600',
      track: 'Social Problem-Solving',
      voiceReady: true
    },
    {
      id: 'self-advocacy-coach',
      title: 'Self-Advocacy Coach',
      description: 'Practice asking "Can I have space?" and more',
      icon: <Shield className="w-5 h-5" />,
      duration: '5-7 min',
      skillType: 'social',
      level: 2,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-purple-100 text-purple-600',
      track: 'Self-Advocacy',
      voiceReady: true
    },
    {
      id: 'interoception-explorer',
      title: 'Body Signals Explorer',
      description: 'Understand what your body is telling you',
      icon: <Activity className="w-5 h-5" />,
      duration: '4-6 min',
      skillType: 'sensory',
      level: 2,
      sessionSize: 'standard',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-indigo-100 text-indigo-600',
      track: 'Interoception',
      voiceReady: true
    },

    // === AAC/COMMUNICATION SUPPORT TRACK ===
    {
      id: 'core-words-practice',
      title: 'Core Words Practice',
      description: 'High-frequency words: more, go, stop, help',
      icon: <Zap className="w-5 h-5" />,
      duration: '3-5 min',
      skillType: 'aac',
      level: 1,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-pink-100 text-pink-600',
      track: 'Core Words',
      voiceReady: true
    },
    {
      id: 'communication-board',
      title: 'Communication Board Builder',
      description: 'Build your personal communication board',
      icon: <Layers className="w-5 h-5" />,
      duration: '7-10 min',
      skillType: 'aac',
      level: 2,
      sessionSize: 'extended',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-pink-100 text-pink-600',
      track: 'AAC Builder',
      voiceReady: false
    }
  ];

  // AI-picked activities based on parent focus + child data
  const getJustForYouActivities = (): Activity[] => {
    const focusActivities = activities.filter(activity => {
      if (todaysFocus.some(focus => focus.includes('/s/'))) {
        return activity.id.includes('s-blend') || activity.id.includes('sound');
      }
      if (todaysFocus.some(focus => focus.includes('routine'))) {
        return activity.skillType === 'routines';
      }
      return activity.unlocked && activity.level <= currentSpeechLevel;
    });
    
    return focusActivities.slice(0, 3);
  };

  // Continue activities (resume last 2 activities)
  const getContinueActivities = (): Activity[] => {
    return activities.filter(activity => activity.unlocked).slice(0, 2);
  };

  // AI-selected calming picks
  const getCalmingPicks = (): Activity[] => {
    return activities.filter(activity => 
      activity.skillType === 'sensory' && activity.unlocked
    ).slice(0, 2);
  };

  // Filter activities by track
  const getFilteredActivities = () => {
    if (activeTrackFilter === 'all') return activities;
    return activities.filter(activity => activity.skillType === activeTrackFilter);
  };

  // Handle Speech Practice with Revolutionary AI Feedback
  const handleSpeechPractice = async () => {
    try {
      setIsRecording(true);
      setAudioProcessing(true);
      setPracticeAttempts(prev => prev + 1);
      setPracticeReps(prev => prev + 1);
      
      // Simulate <250ms latency for alive feeling
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Advanced phoneme-level speech analysis simulation
      const targetPhonemes = analyzeTargetPhonemes(currentWord);
      const analysis: SpeechAnalysis = {
        accuracy: Math.random() * 0.4 + 0.6,
        clarity: Math.random() * 0.3 + 0.7,
        attempt: true,
        phonemes: targetPhonemes,
        confidence: Math.random() * 0.3 + 0.7,
        needsSupport: Math.random() < 0.3,
        latency: 180 + Math.random() * 70 // 180-250ms
      };
      
      setSpeechAnalysis(analysis);
      
      // Advanced error-aware re-cues with place/manner feedback
      if (analysis.accuracy > 0.9) {
        setSuccessStreak(prev => prev + 1);
        setTodayTokens(prev => prev + 1);
        setGeneralizationWins(prev => prev + 1);
        toast.success(`🌟 AMAZING! That "${currentWord}" was PERFECT!`, {
          description: `Phoneme accuracy: ${Math.round(analysis.accuracy * 100)}% - Token earned!`,
          duration: 3000,
        });
        syncToParent('practice_success', {
          word: currentWord,
          accuracy: analysis.accuracy,
          phonemes: analysis.phonemes,
          clarity: analysis.clarity,
          streak: successStreak + 1,
          phonemeLevel: true
        });
      } else if (analysis.accuracy > 0.7) {
        setSuccessStreak(prev => Math.max(0, prev - 1));
        toast("👍 Good try! I heard you working on that sound!", {
          description: "Let's try it in a different word",
          duration: 3000,
        });
      } else {
        // Advanced phoneme-specific coaching
        const errorType = detectSpeechError(currentWord, analysis);
        setSuccessStreak(0);
        
        if (errorType === 's_to_t_substitution') {
          toast("🐍 Let's put your tongue behind your teeth like a snake - ssss!", {
            description: "Watch my mouth animation",
            duration: 4500,
          });
        } else if (errorType === 'voicing_error') {
          toast("🎵 Feel the buzz in your throat - try again!", {
            description: "Put your hand on your neck",
            duration: 4000,
          });
        } else {
          toast("👄 Let's break this sound down together!", {
            description: "I'll show you the mouth position",
            duration: 4000,
          });
        }
        
        syncToParent('needs_support', {
          word: currentWord,
          accuracy: analysis.accuracy,
          supportType: 'phoneme_level_cuing',
          errorPattern: errorType
        });
      }
      
      // Check for frustration and offer regulation break
      if (practiceAttempts > 3 && analysis.accuracy < 0.6) {
        setNeedsBreak(true);
        toast("💙 You're working so hard! Want to take a calm break?", {
          description: "Breathing bubbles help us reset",
          duration: 5000,
        });
      }
      
    } catch (error) {
      console.error('Speech practice error:', error);
      toast.error("Let's try that again!");
    } finally {
      setIsRecording(false);
      setAudioProcessing(false);
    }
  };

  // Advanced phoneme analysis for speech targets
  const analyzeTargetPhonemes = (word: string): string[] => {
    // Simplified phoneme mapping - in real app would use phonetic dictionary
    const phonemeMap: {[key: string]: string[]} = {
      'star': ['s', 't', 'ar'],
      'sun': ['s', 'ʌ', 'n'],
      'soap': ['s', 'oʊ', 'p'],
      'snake': ['s', 'n', 'eɪ', 'k'],
      'spider': ['s', 'p', 'aɪ', 'd', 'ər'],
      'blanket': ['b', 'l', 'æ', 'n', 'k', 'ət'],
      // Add more mappings as needed
    };
    return phonemeMap[word.toLowerCase()] || word.split('');
  };

  // Detect specific speech error patterns
  const detectSpeechError = (word: string, analysis: SpeechAnalysis): string => {
    if (word.includes('s') && analysis.accuracy < 0.5) {
      return 's_to_t_substitution';
    }
    if (analysis.clarity < 0.6) {
      return 'voicing_error';
    }
    return 'general_articulation';
  };

  // Sync data to parent app
  const syncToParent = (eventType: string, data: any) => {
    const parentUpdate = {
      timestamp: new Date(),
      childName,
      eventType,
      data,
      buddy: selectedBuddy,
      sessionData: {
        tokensEarned: todayTokens,
        streak: weekStreak,
        currentLevel: currentSpeechLevel
      }
    };
    
    
    // Mock real-time parent notifications
    if (eventType === 'practice_success' && data.accuracy > 0.9) {
    }
    if (eventType === 'milestone_reached') {
    }
  };

  // Handle activity selection with session initialization
  const handleActivitySelect = (activity: Activity) => {
    if (!activity.unlocked) {
      toast(`This activity unlocks with ${activity.tier === 'core' ? 'Core' : 'Pro'} plan! 🔓`, {
        description: "Upgrade to access more learning games",
        duration: 4000,
      });
      return;
    }
    
    setSelectedActivity(activity);
    setActiveView('activity');
    setCurrentWord(generateTargetWord(activity));
    setPracticeAttempts(0);
    setSuccessStreak(0);
    setSpeechAnalysis(null);
    
    syncToParent('session_started', {
      activity: activity.title,
      level: activity.level,
      track: activity.track,
      focus: todaysFocus
    });
  };

  // Generate target word based on activity and speech level
  const generateTargetWord = (activity: Activity): string => {
    const wordsByLevel = {
      0: ['ma', 'ba', 'pa', 'moo', 'bee'],
      1: ['ball', 'cat', 'dog', 'more', 'help'],
      2: ['spider', 'blanket', 'sandwich'],
      3: ['fantastic', 'butterfly', 'adventure']
    };
    
    if (todaysFocus.some(focus => focus.includes('/s/'))) {
      return ['star', 'sun', 'soap', 'snake'][Math.floor(Math.random() * 4)];
    }
    
    const levelWords = wordsByLevel[activity.level as keyof typeof wordsByLevel] || wordsByLevel[1];
    return levelWords[Math.floor(Math.random() * levelWords.length)];
  };

  // Handle celebration with milestone detection
  const triggerCelebration = (reason: string = 'general') => {
    setShowConfetti(true);
    setActiveView('celebration');
    
    const newTokenCount = todayTokens + (reason === 'session_complete' ? 2 : 1);
    setTodayTokens(newTokenCount);
    
    // Milestone detection
    if (newTokenCount % 10 === 0) {
      syncToParent('milestone_reached', {
        reason: `${newTokenCount} tokens earned`,
        type: 'token_milestone',
        celebration: 'special_reward_unlocked'
      });
    }
    
    syncToParent('celebration_triggered', {
      reason,
      tokensEarned: newTokenCount,
      parentHighFive: true
    });
    
    setTimeout(() => {
      setShowConfetti(false);
      setActiveView('home');
    }, 3000);
  };

  // Handle regulation break
  const handleRegulationBreak = () => {
    setNeedsBreak(false);
    setActiveView('calm-corner');
    
    syncToParent('regulation_break', {
      trigger: 'frustration_detected',
      tool: 'breathing_bubbles',
      duration: '60-90 seconds'
    });
  };

  // Handle Kid Mode login
  const handleKidLogin = (code: string) => {
    if (code === '123456' || code.length === 6) { // Mock validation
      setIsKidMode(true);
      setActiveView('home');
      toast.success(`Welcome ${childName}! 🎉`, {
        description: "Let's start practicing together!",
        duration: 3000,
      });
    } else {
      toast.error("Try again! Ask your grown-up for the code.");
    }
  };

  // Handle exit Kid Mode
  const handleExitKidMode = (pin: string) => {
    if (pin === '123') { // Mock PIN validation
      setIsKidMode(false);
      setActiveView('parent-education');
      setShowExitPIN(false);
      toast.success("Switched to Parent Mode");
    } else {
      toast.error("Wrong PIN. Try again.");
    }
  };

  // Voice navigation handler
  const handleVoiceNavigation = () => {
    if (voiceNavEnabled) {
      toast("🎤 What do you want to practice?", {
        description: "Say 'speech sounds', 'social games', or 'calming time'",
        duration: 4000,
      });
    }
  };

  // Render different views
  const renderView = () => {
    switch (activeView) {
      case 'kid-login':
        return renderKidLogin();
      case 'parent-education':
        return renderParentEducation();
      case 'buddy-select':
        return renderBuddySelect();
      case 'activity-select':
        return renderActivitySelect();
      case 'activity':
        return renderActivity();
      case 'celebration':
        return renderCelebration();
      case 'calm-corner':
        return renderCalmCorner();
      default:
        return renderHome();
    }
  };

  // Home View - Complete with all sections
  const renderHome = () => {
    const justForYou = getJustForYouActivities();
    const continueActivities = getContinueActivities();
    const calmingPicks = getCalmingPicks();

    return (
      <div className="space-y-6">
        {/* Central AI Voice Therapy CTA */}
        <Card className="p-6 border-0 shadow-sm bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto">
              <CompassIcon className="w-8 h-8 compass-animate" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Hi, {childName}! 🤝 What do you want to practice today?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                I'll listen and help you get better.
              </p>
              <Badge variant="secondary" className="mt-2">
                {safeTier === 'pro' ? 'Full speech therapy features with live coach integration' :
                 safeTier === 'core' ? 'Enhanced activities plus coach insights shared with parents' :
                 'AI-powered speech practice with unlimited support'}
              </Badge>
            </div>
            
            {/* Today's Focus from Parent */}
            {todaysFocus.length > 0 && (
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Today's Focus</span>
                </div>
                <p className="text-sm text-teal-600 dark:text-teal-400">
                  {todaysFocus.join(' & ')}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Set by your grown-ups • Activities below match this focus
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Enhanced Progress Display with meaningful metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center border-0 shadow-sm">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {todayTokens}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Today's tokens
            </div>
          </Card>
          
          <Card className="p-4 text-center border-0 shadow-sm">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {practiceReps}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Practice reps
            </div>
          </Card>
          
          <Card className="p-4 text-center border-0 shadow-sm">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {generalizationWins}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Generalization wins
            </div>
          </Card>
          
          <Card className="p-4 text-center border-0 shadow-sm">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {weekStreak}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Day streak
            </div>
          </Card>
        </div>

        {/* Continue Section */}
        <Card className="p-6 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Continue</h3>
            <Badge variant="secondary" className="text-xs">Resume last 2</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {continueActivities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => handleActivitySelect(activity)}
                className="flex items-center space-x-3 p-4 rounded-lg border hover:border-teal-300 hover:bg-teal-50 cursor-pointer transition-all"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activity.color}`}>
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100">{activity.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {activity.duration} • Level {activity.level}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </Card>

        {/* Just for You - AI-Picked Activities */}
        <Card className="p-6 border-0 shadow-sm bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Just for You</h3>
            </div>
            <Badge variant="secondary" className="text-xs">AI-picked • 3 activities</Badge>
          </div>
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
            Based on parent focus + your progress data
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {justForYou.map((activity) => (
              <div
                key={activity.id}
                onClick={() => handleActivitySelect(activity)}
                className="p-4 rounded-lg border border-purple-200 hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer transition-all"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activity.color} mb-3`}>
                  {activity.icon}
                </div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">{activity.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  {activity.duration} • {activity.track}
                </p>
                <div className="flex items-center space-x-1">
                  {activity.voiceReady && (
                    <div className="flex items-center space-x-1">
                      <Volume2 className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600">Voice ready</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Speech Journey */}
        <Card className="p-6 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Speech Journey</h3>
            <Badge variant="secondary" className="text-xs">Level {currentSpeechLevel}</Badge>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-700 dark:text-slate-300">Current level: Word Builder</span>
                <span className="text-slate-500 dark:text-slate-500">Next: Sentence Maker</span>
              </div>
              <Progress value={75} className="h-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                75% complete - keep practicing to unlock the next level!
              </p>
            </div>
          </div>
        </Card>

        {/* Real-World Mission */}
        {currentMission && !currentMission.completed && (
          <Card className="p-4 border-0 shadow-sm bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{currentMission.title}</h3>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
              {currentMission.description}
            </p>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                onClick={() => {
                  toast("Asking your grown-up to help! 👨‍👩‍👧‍👦", {
                    description: "They'll get a notification about your mission",
                    duration: 3000,
                  });
                  syncToParent('mission_help_requested', currentMission);
                }}
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                Ask Parent
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                onClick={() => {
                  setCurrentMission(null);
                  toast("Mission saved for later! ⏰");
                }}
              >
                <Clock className="w-4 h-4 mr-1" />
                Do Later
              </Button>
            </div>
          </Card>
        )}

        {/* Calming Picks */}
        {calmingPicks.length > 0 && (
          <Card className="p-6 border-0 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Calming Picks</h3>
              </div>
              <Badge variant="secondary" className="text-xs">AI-selected</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calmingPicks.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => handleActivitySelect(activity)}
                  className="flex items-center space-x-3 p-4 rounded-lg border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activity.color}`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">{activity.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {activity.duration} • Try first
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            onClick={() => setActiveView('activity-select')}
            className="h-20 flex-col space-y-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white"
          >
            <Play className="w-6 h-6" />
            <span>Start Activity</span>
          </Button>
          
          <Button 
            onClick={() => setActiveView('buddy-select')}
            variant="outline"
            className="h-20 flex-col space-y-2 border-2 hover:border-teal-300 hover:bg-teal-50"
          >
            <Headphones className="w-6 h-6" />
            <span>Choose Buddy</span>
          </Button>
          
          <Button 
            onClick={() => triggerCelebration('daily_check_in')}
            variant="outline"
            className="h-20 flex-col space-y-2 border-2 hover:border-purple-300 hover:bg-purple-50"
          >
            <Gift className="w-6 h-6" />
            <span>Rewards</span>
          </Button>
        </div>

        {/* Token Economy Status */}
        <Card className="p-4 border-0 shadow-sm bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Token Bank: {todayTokens}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Your grown-ups just got the good news—pick a reward together!
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                {10 - (todayTokens % 10)} more for milestone!
              </p>
              <div className="flex space-x-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < (todayTokens % 5) ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // Buddy Selection with Copy from Spec
  const renderBuddySelect = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setActiveView('home')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Choose Your Buddy
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Pick a voice companion to guide your learning
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buddyVoices.map((buddy) => (
          <Card 
            key={buddy.id}
            className={`p-6 border-2 cursor-pointer transition-all ${
              selectedBuddy === buddy.id 
                ? 'border-teal-300 bg-teal-50 dark:bg-teal-900/20' 
                : buddy.unlocked 
                  ? 'border-gray-200 hover:border-gray-300' 
                  : 'border-gray-200 opacity-50'
            }`}
            onClick={() => buddy.unlocked && setSelectedBuddy(buddy.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${buddy.color}`}>
                {buddy.icon}
              </div>
              <div className="flex flex-col space-y-2">
                {selectedBuddy === buddy.id && (
                  <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                {!buddy.unlocked && (
                  <Lock className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {buddy.name}
            </h3>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {buddy.personality}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              {buddy.description}
            </p>
            
            {buddy.unlocked ? (
              <Button 
                size="sm" 
                variant={selectedBuddy === buddy.id ? "default" : "outline"}
                className="w-full"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                {selectedBuddy === buddy.id ? 'Selected' : 'Preview Voice'}
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled className="w-full">
                <Lock className="w-4 h-4 mr-2" />
                {safeTier === 'starter' ? 'Core Plan' : 'Pro Plan'}
              </Button>
            )}
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={() => {
            setActiveView('home');
            toast.success(`${buddyVoices.find(b => b.id === selectedBuddy)?.name} selected! 🎉`);
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-8"
        >
          Save Buddy Choice
        </Button>
      </div>
    </div>
  );

  // Activity Selection with Filter Chips and Smart Organization
  const renderActivitySelect = () => {
    const filteredActivities = getFilteredActivities();
    const availableActivities = filteredActivities.filter(a => a.unlocked);
    const lockedActivities = filteredActivities.filter(a => !a.unlocked);

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveView('home')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              What do you want to do?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Choose an activity to practice with your buddy
            </p>
          </div>
        </div>

        {/* Track Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeTrackFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTrackFilter('all')}
            className="text-xs h-8"
          >
            All Tracks
          </Button>
          {TRACK_FILTERS.map((track) => (
            <Button
              key={track.id}
              size="sm"
              variant={activeTrackFilter === track.id ? 'default' : 'outline'}
              onClick={() => setActiveTrackFilter(track.id)}
              className="text-xs h-8"
            >
              <track.icon className="w-3 h-3 mr-1" />
              {track.label}
            </Button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
            <Filter className="w-4 h-4" />
            <span>Sort by:</span>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="ghost" className="text-xs">Recommended</Button>
            <Button size="sm" variant="ghost" className="text-xs">Shortest</Button>
            <Button size="sm" variant="ghost" className="text-xs">New</Button>
          </div>
        </div>

        {/* Available Activities */}
        {availableActivities.length > 0 && (
          <div>
            <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-4">
              Ready to Play ({availableActivities.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableActivities.map((activity) => (
                <Card 
                  key={activity.id}
                  className="p-4 border-0 shadow-sm hover:shadow-md cursor-pointer transition-all"
                  onClick={() => handleActivitySelect(activity)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activity.color}`}>
                      {activity.icon}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        Level {activity.level}
                      </Badge>
                      {activity.voiceReady && (
                        <div className="flex items-center space-x-1">
                          <Volume2 className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-600">Voice ready</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {activity.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {activity.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="flex items-center space-x-1">
                      <Timer className="w-3 h-3" />
                      <span>{activity.duration}</span>
                    </span>
                    <span className="capitalize">{activity.track}</span>
                  </div>
                  
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                    <Play className="w-4 h-4 mr-2" />
                    Start Activity
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Locked Activities */}
        {lockedActivities.length > 0 && (
          <div>
            <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-4">
              Unlock More ({lockedActivities.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
              {lockedActivities.map((activity) => (
                <Card key={activity.id} className="p-4 border-0 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activity.color} opacity-60`}>
                      {activity.icon}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.tier === 'core' ? 'Core Plan' : 'Pro Plan'}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {activity.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {activity.description}
                  </p>
                  
                  <Button variant="outline" disabled className="w-full">
                    <Lock className="w-4 h-4 mr-2" />
                    Upgrade Required
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Revolutionary AI Speech Activity Interface
  const renderActivity = () => {
    if (!selectedActivity) return null;

    const buddyData = buddyVoices.find(b => b.id === selectedBuddy) || buddyVoices[0];
    
    return (
      <div className="space-y-6">
        {/* Activity Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveView('activity-select')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {selectedActivity.title}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                <span>Level {selectedActivity.level}</span>
                <span>•</span>
                <span>{selectedActivity.duration}</span>
                <span>•</span>
                <span className="text-teal-600 dark:text-teal-400">{selectedActivity.track}</span>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setActiveView('home')}
          >
            <Home className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>

        {/* Revolutionary AI Buddy Interface */}
        <Card className="p-6 border-0 shadow-sm bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${buddyData.color}`}>
                {buddyData.icon}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {buddyData.name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your AI Speech Buddy
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isRecording ? 'bg-red-500 animate-pulse' : 
                audioProcessing ? 'bg-yellow-500 animate-pulse' : 
                'bg-green-500'
              }`}></div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {isRecording ? 'Recording...' : audioProcessing ? 'Analyzing...' : 'Ready'}
              </span>
            </div>
          </div>
          
          {/* Dynamic AI Coaching Response */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {audioProcessing ? (
                <><Wand2 className="w-4 h-4 inline mr-1 animate-spin" />I'm listening carefully to your '{currentWord}' sound...</>
              ) : speechAnalysis?.accuracy && speechAnalysis.accuracy > 0.85 ? (
                <>🌟 WOW! That '{currentWord}' was AMAZING! You're getting so good at this! Token earned!</>
              ) : speechAnalysis && practiceAttempts > 0 ? (
                <>👍 Good try on '{currentWord}'! {speechAnalysis.needsSupport ? "Let's try together: watch my mouth, then your turn." : "Let's practice it again!"}</>
              ) : practiceAttempts === 0 ? (
                <>😊 Hi {childName}! Let's practice saying '{currentWord}' together. I'll help you make it perfect!</>
              ) : (
                <>👄 Great try saying {currentWord}! Let's say it again together.</>
              )}
            </p>
            
            {/* Real-time Speech Analysis Feedback */}
            {speechAnalysis && (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="text-center">
                    <div className="font-medium mb-1">Accuracy</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(speechAnalysis.accuracy * 100)}%` }}
                      />
                    </div>
                    <span className="text-green-600 font-medium">{Math.round(speechAnalysis.accuracy * 100)}%</span>
                  </div>
                  <div className="text-center">
                    <div className="font-medium mb-1">Clarity</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(speechAnalysis.clarity * 100)}%` }}
                      />
                    </div>
                    <span className="text-blue-600 font-medium">{Math.round(speechAnalysis.clarity * 100)}%</span>
                  </div>
                  <div className="text-center">
                    <div className="font-medium mb-1">Response</div>
                    <div className="text-purple-600 font-medium">{speechAnalysis.latency}ms</div>
                    <div className="text-purple-500 text-xs">Real-time</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Speech Practice Controls */}
          <div className="grid grid-cols-3 gap-3">
            <Button 
              variant="outline"
              className="h-12"
              onClick={() => toast("🔊 Example: " + currentWord, { duration: 2000 })}
            >
              <Volume2 className="w-5 h-5 mr-2" />
              Example
            </Button>
            
            <Button 
              onClick={handleSpeechPractice}
              disabled={audioProcessing}
              className="h-12 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {audioProcessing ? (
                <>
                  <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Try It!
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              className="h-12"
              onClick={() => {
                setCurrentWord(generateTargetWord(selectedActivity));
                setPracticeAttempts(0);
                setSpeechAnalysis(null);
                toast("🔄 New word: " + currentWord);
              }}
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Skip
            </Button>
          </div>
        </Card>

        {/* Self-Advocacy Controls */}
        <Card className="p-4 border-0 shadow-sm bg-purple-50 dark:bg-purple-900/20">
          <div className="flex items-center justify-center space-x-4">
            <Button 
              size="sm"
              variant="outline" 
              onClick={() => {
                toast("That's okay! Let's make it easier! 💜", { duration: 3000 });
                setNeedsBreak(false);
                syncToParent('self_advocacy', { type: 'too_hard', support_provided: true });
              }}
              className="text-purple-600 border-purple-300 hover:bg-purple-100"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Too Hard?
            </Button>
            
            <Button 
              size="sm"
              variant="outline" 
              onClick={handleRegulationBreak}
              className="text-purple-600 border-purple-300 hover:bg-purple-100"
            >
              <Brain className="w-4 h-4 mr-2" />
              Need a Break?
            </Button>
            
            <Button 
              size="sm"
              variant="outline" 
              onClick={() => {
                toast("Of course! Getting help now! 🤝", { duration: 3000 });
                syncToParent('child_needs_help', { 
                  activity: selectedActivity.title,
                  word: currentWord,
                  buddy: selectedBuddy
                });
              }}
              className="text-purple-600 border-purple-300 hover:bg-purple-100"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Need Help
            </Button>
          </div>
        </Card>

        {/* Session Progress */}
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-900 dark:text-slate-100">Session Progress</h3>
            <Badge variant="secondary" className="text-xs">
              {Math.min(practiceAttempts, 5)}/5 attempts
            </Badge>
          </div>
          
          <Progress value={Math.min(practiceAttempts * 20, 100)} className="mb-3" />
          
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tokens earned: +{Math.floor(practiceAttempts / 2)}</span>
            <span>Time left: ~{Math.max(1, 5 - Math.floor(practiceAttempts * 0.8))} min</span>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setActiveView('activity-select')}
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          <Button 
            onClick={() => triggerCelebration('session_complete')}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Star className="w-4 h-4 mr-2" />
            Finish Session
          </Button>
        </div>
      </div>
    );
  };

  // Enhanced Celebration with Parent Integration
  const renderCelebration = () => (
    <div className="space-y-6 text-center">
      <div className="relative">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 50}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                  fontSize: `${16 + Math.random() * 8}px`
                }}
              >
                {['🎉', '⭐', '🌟', '🎊', '✨', '🏆', '💫'][Math.floor(Math.random() * 7)]}
              </div>
            ))}
          </div>
        )}
        
        <Card className="p-8 border-0 shadow-sm bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-pink-900/20">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Trophy className="w-12 h-12 text-yellow-700" />
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Amazing Work, {childName}! 🎉
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Token earned! Your grown-ups just got the good news—pick a reward together.
          </p>
          
          {/* Parent Integration Message */}
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Users2 className="w-5 h-5 text-teal-600" />
              <span className="font-medium text-teal-800 dark:text-teal-300">
                Sharing with Family
              </span>
            </div>
            <p className="text-teal-700 dark:text-teal-300 text-sm">
              Your progress was sent to your grown-ups so they can celebrate with you! 🎈
            </p>
            {sharedRewards.length > 0 && (
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-2">
                Special rewards ready: {sharedRewards.join(', ')}
              </p>
            )}
          </div>
          
          <div className="flex space-x-3 justify-center">
            <Button 
              onClick={() => setActiveView('activity-select')}
              variant="outline"
              className="px-6"
            >
              <Play className="w-4 h-4 mr-2" />
              Play More
            </Button>
            <Button 
              onClick={() => setActiveView('home')}
              className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white px-8"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );

  // Calm Corner - Regulation Micro-Session
  const renderCalmCorner = () => (
    <div className="space-y-6 text-center">
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setActiveView('home')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Calm Corner
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Let's take a breathing break together
          </p>
        </div>
      </div>

      <Card className="p-8 border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Brain className="w-10 h-10 text-indigo-600" />
        </div>
        
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Breathing Bubbles
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Watch the bubble grow as you breathe in, shrink as you breathe out
        </p>

        {/* Animated Breathing Circle */}
        <div className="w-32 h-32 mx-auto mb-6 relative">
          <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-200 to-purple-200 animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium text-slate-700">Breathe</span>
          </div>
        </div>

        <div className="space-y-4">
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => {
              toast.success("Great job taking a break! 🌈", {
                description: "Breaks help our brains learn better",
                duration: 3000,
              });
              syncToParent('regulation_success', {
                tool: 'breathing_bubbles',
                duration: '60 seconds',
                effectiveness: 'successful'
              });
              setActiveView('home');
            }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            I Feel Better
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setActiveView('home')}
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Aminy Junior
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  🌟 The Gold Standard
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Bell className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Shield className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Parent Activity Sync Strip */}
      {recentParentActivity && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="px-4 py-2 sm:px-6">
            <div className="flex items-center justify-center space-x-2">
              <Users2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Parent update: {recentParentActivity}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        {renderView()}
      </div>
    </div>
  );
}

export default JuniorPage;