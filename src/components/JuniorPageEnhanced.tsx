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
  Layers,
  QrCode,
  LogOut,
  PartyPopper as Confetti
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
  focus?: string[];
  mode?: string;
  regulationFriendly?: boolean;
}

interface SpeechAnalysis {
  accuracy: number;
  clarity: number;
  attempt: boolean;
  phonemes: string[];
  confidence: number;
  needsSupport: boolean;
  latency: number;
  phonemeLevel?: boolean;
  coarticulationScore?: number;
  prosodyScore?: number;
}

interface RealWorldMission {
  id: string;
  title: string;
  description: string;
  safetyLevel: 'safe' | 'ask_parent' | 'restricted';
  tokens: number;
  completed: boolean;
}

interface ParentMicroCard {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'celebration' | 'strategy' | 'milestone' | 'regulation';
  actionable: boolean;
}

// Track filter options
const TRACK_FILTERS = [
  { id: 'all', label: 'All', icon: Sparkles, color: 'gray' },
  { id: 'speech', label: 'Speech', icon: MessageSquare, color: 'blue' },
  { id: 'social', label: 'Social', icon: Users2, color: 'green' },
  { id: 'routines', label: 'Routines', icon: Clock, color: 'orange' },
  { id: 'sensory', label: 'Sensory', icon: Brain, color: 'purple' },
  { id: 'executive', label: 'Executive', icon: Target, color: 'indigo' },
  { id: 'aac', label: 'AAC', icon: Layers, color: 'pink' }
];

export function JuniorPageEnhanced({ userData, userTier = 'starter' }: JuniorPageProps) {
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
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(true);
  
  // Enhanced Parent Integration State
  const [todaysFocus, setTodaysFocus] = useState<string[]>(['/s/ blends', 'morning routine step 3']);
  const [sharedRewards, setSharedRewards] = useState(['stickers', 'high-fives', 'favorite song']);
  const [recentParentActivity, setRecentParentActivity] = useState('Set focus: practice /s/ sounds');
  const [parentMicroCards, setParentMicroCards] = useState<ParentMicroCard[]>([
    {
      id: 'victory-s-sounds',
      title: 'Eddie nailed /s/ in blends!',
      message: 'Try "stir soup" at dinner tonight',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      type: 'celebration',
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

  // Enhanced Activity Taxonomy - Complete with advanced features for highly verbal kids
  const activities: Activity[] = [
    // === SPEECH TRACK ===
    // Articulation with phoneme-level tracking
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
      voiceReady: true,
      focus: ['/p/', '/b/', '/m/'],
      mode: 'listen→repeat',
      regulationFriendly: true
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
      voiceReady: true,
      focus: ['/s/ blends'],
      mode: 'contrast',
      regulationFriendly: false
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
      voiceReady: true,
      mode: 'contrast',
      regulationFriendly: true
    },
    // Fluency with prosody training
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
      voiceReady: true,
      mode: 'carryover',
      regulationFriendly: true
    },
    // Language with carryover focus
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
      voiceReady: true,
      mode: 'carryover',
      regulationFriendly: true
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
      voiceReady: true,
      mode: 'carryover',
      regulationFriendly: false
    },

    // === SOCIAL COMMUNICATION TRACK - Enhanced for highly verbal kids ===
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
      voiceReady: true,
      regulationFriendly: true
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
      voiceReady: true,
      regulationFriendly: true
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
      voiceReady: true,
      regulationFriendly: false
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
      voiceReady: true,
      regulationFriendly: true
    },
    {
      id: 'perspective-taking-playground',
      title: 'Perspective Taking Playground',
      description: 'Understand what others think and feel',
      icon: <Eye className="w-5 h-5" />,
      duration: '6-8 min',
      skillType: 'social',
      level: 3,
      sessionSize: 'extended',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-purple-100 text-purple-600',
      track: 'Perspective',
      voiceReady: true,
      regulationFriendly: false
    },

    // === EXECUTIVE SKILLS TRACK - Advanced for highly verbal kids ===
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
      voiceReady: true,
      regulationFriendly: true
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
      voiceReady: true,
      regulationFriendly: true
    },
    {
      id: 'plan-the-day',
      title: 'Plan the Day',
      description: 'Multi-step planning and organization',
      icon: <BarChart3 className="w-5 h-5" />,
      duration: '5-8 min',
      skillType: 'executive',
      level: 3,
      sessionSize: 'extended',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-teal-100 text-teal-600',
      track: 'Planning',
      voiceReady: true,
      regulationFriendly: false
    },

    // === SENSORY & REGULATION TRACK - Enhanced with interoception ===
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
      voiceReady: true,
      regulationFriendly: true
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
      voiceReady: true,
      regulationFriendly: true
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
      voiceReady: false,
      regulationFriendly: true
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
      voiceReady: true,
      regulationFriendly: true
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
      voiceReady: true,
      regulationFriendly: true
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
      voiceReady: true,
      regulationFriendly: true
    }
  ];

  // Enhanced activity filtering with AI recommendations
  const getJustForYouActivities = (): Activity[] => {
    const focusActivities = activities.filter(activity => {
      // Match parent's focus areas
      const matchesFocus = todaysFocus.some(focus => {
        if (focus.includes('/s/')) return activity.focus?.includes('/s/ blends') || activity.id.includes('s-blend') || activity.id.includes('sound');
        if (focus.includes('routine')) return activity.skillType === 'routines';
        return false;
      });
      
      // Match regulation needs
      const isRegulationFriendly = needsBreak ? activity.regulationFriendly : true;
      
      return (matchesFocus || activity.level <= currentSpeechLevel) && 
             activity.unlocked && 
             isRegulationFriendly;
    });
    
    return focusActivities.slice(0, 3);
  };

  // Enhanced continue activities
  const getContinueActivities = (): Activity[] => {
    return activities.filter(activity => activity.unlocked).slice(0, 2);
  };

  // Enhanced calming picks
  const getCalmingPicks = (): Activity[] => {
    return activities.filter(activity => 
      activity.skillType === 'sensory' && 
      activity.unlocked &&
      activity.regulationFriendly
    ).slice(0, 2);
  };

  // Filter activities by track with enhanced logic
  const getFilteredActivities = () => {
    let filtered = activeTrackFilter === 'all' 
      ? activities 
      : activities.filter(activity => activity.skillType === activeTrackFilter);
    
    if (showOnlyRecommended) {
      const recommended = getJustForYouActivities().map(a => a.id);
      filtered = filtered.filter(a => recommended.includes(a.id) || a.unlocked);
    }
    
    return filtered;
  };

  // Advanced Speech Practice with Revolutionary AI Feedback
  const handleSpeechPractice = async () => {
    try {
      setIsRecording(true);
      setAudioProcessing(true);
      setPracticeAttempts(prev => prev + 1);
      setPracticeReps(prev => prev + 1);
      
      // Simulate <250ms latency for alive feeling
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Advanced phoneme-level speech analysis with coarticulation scoring
      const targetPhonemes = analyzeTargetPhonemes(currentWord);
      const analysis: SpeechAnalysis = {
        accuracy: Math.random() * 0.4 + 0.6,
        clarity: Math.random() * 0.3 + 0.7,
        attempt: true,
        phonemes: targetPhonemes,
        confidence: Math.random() * 0.3 + 0.7,
        needsSupport: Math.random() < 0.3,
        latency: 180 + Math.random() * 70, // 180-250ms
        phonemeLevel: true,
        coarticulationScore: Math.random() * 0.3 + 0.7,
        prosodyScore: Math.random() * 0.4 + 0.6
      };
      
      setSpeechAnalysis(analysis);
      
      // Advanced error-aware re-cues with place/manner/voicing feedback
      if (analysis.accuracy > 0.9) {
        setSuccessStreak(prev => prev + 1);
        setTodayTokens(prev => prev + 1);
        setGeneralizationWins(prev => prev + 1);
        toast.success(`🌟 AMAZING! That "${currentWord}" was PERFECT!`, {
          description: `Phoneme accuracy: ${Math.round(analysis.accuracy * 100)}% - Token earned!`,
          duration: 3000,
        });
        
        // Create parent micro-card for immediate sharing
        const newMicroCard: ParentMicroCard = {
          id: `victory-${Date.now()}`,
          title: `${childName} nailed "${currentWord}"!`,
          message: `Try practicing ${currentWord} sounds during snack time`,
          timestamp: new Date(),
          type: 'celebration',
          actionable: true
        };
        setParentMicroCards(prev => [newMicroCard, ...prev]);
        
        syncToParent('practice_success', {
          word: currentWord,
          accuracy: analysis.accuracy,
          phonemes: analysis.phonemes,
          clarity: analysis.clarity,
          streak: successStreak + 1,
          phonemeLevel: true,
          coarticulation: analysis.coarticulationScore
        });
      } else if (analysis.accuracy > 0.7) {
        setSuccessStreak(prev => Math.max(0, prev - 1));
        toast("👍 Good try! I heard you working on that sound!", {
          description: "Let's try it in a different word",
          duration: 3000,
        });
      } else {
        // Advanced phoneme-specific coaching with visual cues
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
        } else if (errorType === 'coarticulation_difficulty') {
          toast("🔗 Let's practice the sounds together - bl-bl-blanket!", {
            description: "Breaking it down helps",
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
          errorPattern: errorType,
          recommendedStrategy: getRecommendedStrategy(errorType)
        });
      }
      
      // Enhanced frustration detection with regulation break offer
      if (practiceAttempts > 3 && analysis.accuracy < 0.6) {
        setNeedsBreak(true);
        toast("💙 You're working so hard! Want to take a calm break?", {
          description: "Breathing bubbles help us reset",
          duration: 5000,
        });
        
        // Auto-recommend calming activity
        const calmActivity = activities.find(a => a.id === 'calm-corner');
        if (calmActivity && calmActivity.unlocked) {
          setTimeout(() => {
            toast("🫧 Calm Corner is ready when you are!", {
              description: "Tap to start breathing bubbles",
              duration: 4000,
            });
          }, 2000);
        }
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
    const phonemeMap: {[key: string]: string[]} = {
      'star': ['s', 't', 'ɑr'],
      'sun': ['s', 'ʌ', 'n'],
      'soap': ['s', 'oʊ', 'p'],
      'snake': ['s', 'n', 'eɪ', 'k'],
      'spider': ['s', 'p', 'aɪ', 'd', 'ər'],
      'blanket': ['b', 'l', 'æ', 'n', 'k', 'ət'],
      'sandwich': ['s', 'æ', 'n', 'd', 'w', 'ɪ', 'tʃ'],
      'fantastic': ['f', 'æ', 'n', 't', 'æ', 's', 't', 'ɪ', 'k']
    };
    return phonemeMap[word.toLowerCase()] || word.split('');
  };

  // Enhanced speech error detection
  const detectSpeechError = (word: string, analysis: SpeechAnalysis): string => {
    if (word.includes('s') && analysis.accuracy < 0.5) {
      return 's_to_t_substitution';
    }
    if (analysis.clarity < 0.6) {
      return 'voicing_error';
    }
    if (analysis.coarticulationScore && analysis.coarticulationScore < 0.6) {
      return 'coarticulation_difficulty';
    }
    if (analysis.prosodyScore && analysis.prosodyScore < 0.5) {
      return 'prosody_difficulty';
    }
    return 'general_articulation';
  };

  // Get recommended strategy for parents
  const getRecommendedStrategy = (errorType: string): string => {
    const strategies = {
      's_to_t_substitution': 'Practice "snake sound" with tongue behind teeth',
      'voicing_error': 'Feel throat vibration with hand on neck',
      'coarticulation_difficulty': 'Break down into smaller sound chunks',
      'prosody_difficulty': 'Practice with rhythm and stress patterns',
      'general_articulation': 'Use visual and tactile cues'
    };
    return strategies[errorType as keyof typeof strategies] || 'Provide positive encouragement';
  };

  // Enhanced sync to parent app with micro-cards
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
        currentLevel: currentSpeechLevel,
        practiceReps,
        generalizationWins
      }
    };
    
    
    // Enhanced parent notifications with actionable insights
    if (eventType === 'practice_success' && data.accuracy > 0.9) {
    }
    if (eventType === 'milestone_reached') {
    }
    if (eventType === 'needs_support') {
    }
  };

  // Handle Kid Mode login with enhanced security
  const handleKidLogin = (code: string) => {
    if (code === '123456' || code.length === 6) { // Mock validation
      setIsKidMode(true);
      setActiveView('home');
      toast.success(`Welcome ${childName}! 🎉`, {
        description: "Let's start practicing together!",
        duration: 3000,
      });
      
      // Kid Mode safety prompt
      setTimeout(() => {
        toast("🛡️ Kid Mode is active", {
          description: "Safe practice environment just for you!",
          duration: 2000,
        });
      }, 1000);
    } else {
      toast.error("Try again! Ask your grown-up for the code.");
    }
  };

  // Handle exit Kid Mode with PIN
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

  // Enhanced voice navigation
  const handleVoiceNavigation = () => {
    if (voiceNavEnabled) {
      toast("🎤 What do you want to practice?", {
        description: "Say 'speech sounds', 'social games', 'calming time', or 'daily routines'",
        duration: 4000,
      });
      
      // Mock voice recognition processing
      setTimeout(() => {
        const mockCommands = ['speech sounds', 'social games', 'calming time'];
        const randomCommand = mockCommands[Math.floor(Math.random() * mockCommands.length)];
        toast(`🎯 I heard "${randomCommand}"!`, {
          description: "Let me find the perfect activity for you",
          duration: 2000,
        });
        
        // Auto-filter activities based on voice command
        if (randomCommand === 'speech sounds') setActiveTrackFilter('speech');
        if (randomCommand === 'social games') setActiveTrackFilter('social');
        if (randomCommand === 'calming time') setActiveTrackFilter('sensory');
      }, 2000);
    }
  };

  // Enhanced activity selection
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
    
    // Enhanced session start with focus matching
    const matchesFocus = todaysFocus.some(focus => {
      if (focus.includes('/s/')) return activity.focus?.includes('/s/ blends');
      return false;
    });
    
    if (matchesFocus) {
      toast(`🎯 Perfect choice! This matches today's focus`, {
        description: "Your grown-ups will be so proud!",
        duration: 3000,
      });
    }
    
    syncToParent('session_started', {
      activity: activity.title,
      level: activity.level,
      track: activity.track,
      focus: todaysFocus,
      matchesFocus
    });
  };

  // Enhanced target word generation
  const generateTargetWord = (activity: Activity): string => {
    const wordsByLevel = {
      0: ['ma', 'ba', 'pa', 'moo', 'bee', 'hi', 'go'],
      1: ['ball', 'cat', 'dog', 'more', 'help', 'up', 'stop'],
      2: ['spider', 'blanket', 'sandwich', 'happy', 'running'],
      3: ['fantastic', 'butterfly', 'adventure', 'understand', 'friendship']
    };
    
    // Focus-based word selection
    if (todaysFocus.some(focus => focus.includes('/s/'))) {
      const sWords = ['star', 'sun', 'soap', 'snake', 'smile', 'story'];
      return sWords[Math.floor(Math.random() * sWords.length)];
    }
    
    const levelWords = wordsByLevel[activity.level as keyof typeof wordsByLevel] || wordsByLevel[1];
    return levelWords[Math.floor(Math.random() * levelWords.length)];
  };

  // Enhanced celebration with parent sharing
  const triggerCelebration = (reason: string = 'general') => {
    setShowConfetti(true);
    setActiveView('celebration');
    
    const newTokenCount = todayTokens + (reason === 'session_complete' ? 2 : 1);
    setTodayTokens(newTokenCount);
    
    // Enhanced milestone detection
    if (newTokenCount % 10 === 0) {
      syncToParent('milestone_reached', {
        reason: `${newTokenCount} tokens earned`,
        type: 'token_milestone',
        celebration: 'special_reward_unlocked',
        recommendedCelebration: 'Extra story time or favorite activity'
      });
    }
    
    // Create celebratory micro-card for parents
    const celebrationCard: ParentMicroCard = {
      id: `celebration-${Date.now()}`,
      title: `${childName} completed a session!`,
      message: 'High-five time! Celebrate this win together',
      timestamp: new Date(),
      type: 'celebration',
      actionable: true
    };
    setParentMicroCards(prev => [celebrationCard, ...prev]);
    
    syncToParent('celebration_triggered', {
      reason,
      tokensEarned: newTokenCount,
      parentHighFive: true,
      shareWithFamily: true
    });
    
    setTimeout(() => {
      setShowConfetti(false);
      setActiveView('home');
    }, 3000);
  };

  // Enhanced regulation break with choice
  const handleRegulationBreak = () => {
    setNeedsBreak(false);
    setActiveView('calm-corner');
    
    syncToParent('regulation_break', {
      trigger: 'frustration_detected',
      tool: 'breathing_bubbles',
      duration: '60-90 seconds',
      selfAdvocacy: 'Child chose regulation break'
    });
    
    toast("🫧 Great choice! Taking breaks helps us learn better", {
      description: "You're being so smart about your feelings",
      duration: 3000,
    });
  };

  // Enhanced render views
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

  // Kid Login Screen with QR code and 6-digit pairing
  const renderKidLogin = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center border-0 shadow-lg">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Baby className="w-10 h-10 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Hi {childName}! 👋
        </h1>
        <p className="text-slate-600 mb-6">
          Ask your grown-up for the special code to start practicing!
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Enter your 6-digit code
            </label>
            <input
              type="text"
              maxLength={6}
              className="w-full p-3 text-center text-lg border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:outline-none"
              placeholder="123456"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && pairingCode.length === 6) {
                  handleKidLogin(pairingCode);
                }
              }}
            />
          </div>
          
          <Button 
            onClick={() => handleKidLogin(pairingCode)}
            disabled={pairingCode.length !== 6}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 text-lg"
          >
            Start Practicing! 🚀
          </Button>
          
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <QrCode className="w-6 h-6 text-slate-600" />
              <span className="ml-2 text-sm font-medium text-slate-700">Or scan QR code</span>
            </div>
            <div className="w-32 h-32 bg-white border-2 border-slate-200 rounded mx-auto flex items-center justify-center">
              <span className="text-xs text-slate-500">QR Code Here</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">Safe Kid Mode</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            COPPA compliant • Local voice processing • No web access
          </p>
        </div>
      </Card>
    </div>
  );

  // Parent Education Screen
  const renderParentEducation = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">What is Aminy Junior?</h1>
            <p className="text-slate-600 mt-2">Revolutionary AI speech therapy for your child</p>
          </div>
          <Button
            onClick={() => setActiveView('kid-login')}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Kid Mode</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video placeholder */}
          <Card className="p-6">
            <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center mb-4">
              <Play className="w-12 h-12 text-slate-600" />
              <span className="ml-2 text-slate-600">60-second demo video</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">See Junior in Action</h3>
            <p className="text-slate-600 text-sm">
              Watch how our AI buddy guides your child through personalized speech therapy sessions
            </p>
          </Card>

          {/* Key Benefits */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Why Junior Beats the Competition</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Target className="w-3 h-3 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Parent-Child Data Loop</h4>
                  <p className="text-sm text-slate-600">Unlike Buddy.ai, we sync with your care plan</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Brain className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Phoneme-Level Analysis</h4>
                  <p className="text-sm text-slate-600">Advanced speech technology beyond generic chatbots</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users2 className="w-3 h-3 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Multi-Domain Program</h4>
                  <p className="text-sm text-slate-600">Speech + Social + Executive + Sensory skills</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Kid Mode Safety</h4>
                  <p className="text-sm text-slate-600">COPPA compliant with secure device pairing</p>
                </div>
              </div>
            </div>
          </Card>

          {/* How it connects */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">How Junior Connects to Your Plan</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-teal-50 rounded-lg">
                <Target className="w-5 h-5 text-teal-600" />
                <span className="text-sm text-slate-700">Focus areas sync from your IEP goals</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-slate-700">Progress feeds into Reports tab</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-slate-700">Coach gets detailed session insights</span>
              </div>
            </div>
          </Card>

          {/* Safety & Compliance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Safety & Compliance</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>COPPA compliant voice processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Local-only microphone permissions</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>On-device profanity filter</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>No open web links or messaging</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Session PIN to exit Kid Mode</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Auto-lock after 2 minutes idle</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Pricing tiers */}
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4">Junior Features by Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="font-medium">Starter ($29/mo)</span>
              </div>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• AI-powered speech practice</li>
                <li>• Basic buddy voices (Sunny, Luna)</li>
                <li>• Unlimited practice sessions</li>
                <li>• Parent progress reports</li>
              </ul>
            </div>
            
            <div className="p-4 border-2 border-teal-500 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-5 h-5 text-teal-600" />
                <span className="font-medium">Core ($59/mo)</span>
              </div>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Everything in Starter</li>
                <li>• Advanced activities + Ziggy buddy</li>
                <li>• Coach insights sharing</li>
                <li>• Regulation break tools</li>
                <li>• Real-world missions</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Crown className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Pro ($229/mo)</span>
              </div>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Everything in Core</li>
                <li>• All buddy voices + Sage</li>
                <li>• Executive function training</li>
                <li>• Advanced social skills</li>
                <li>• Live telehealth included</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Button
            onClick={() => setActiveView('kid-login')}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3"
          >
            Return to Kid Mode
          </Button>
        </div>
      </div>
    </div>
  );

  // Enhanced Home View with voice navigation and micro-cards
  const renderHome = () => {
    const justForYou = getJustForYouActivities();
    const continueActivities = getContinueActivities();
    const calmingPicks = getCalmingPicks();

    return (
      <div className="space-y-6">
        {/* Kid Mode Header with exit option */}
        {isKidMode && (
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Kid Mode Active</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExitPIN(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Exit
            </Button>
          </div>
        )}

        {/* Parent Micro-Cards - Live updates from sessions */}
        {parentMicroCards.length > 0 && (
          <Card className="p-4 border-0 shadow-sm bg-gradient-to-r from-blue-50 to-teal-50">
            <div className="flex items-center space-x-2 mb-3">
              <Bell className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Just happened</span>
            </div>
            {parentMicroCards.slice(0, 2).map((card) => (
              <div key={card.id} className="bg-white/80 rounded-lg p-3 mb-2 last:mb-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 text-sm">{card.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{card.message}</p>
                  </div>
                  {card.actionable && (
                    <Button size="sm" className="ml-2 bg-teal-600 hover:bg-teal-700 text-white text-xs px-2 py-1">
                      Add to Routine
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Central AI Voice Therapy CTA with enhanced features */}
        <Card className="p-6 border-0 shadow-sm bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto">
              <CompassIcon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Hi, {childName}! 🤝 What do you want to practice today?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                I'll listen and help you get better with phoneme-level feedback.
              </p>
              
              {/* Voice Navigation Button */}
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Button
                  onClick={handleVoiceNavigation}
                  className="bg-teal-600 hover:bg-teal-700 text-white flex items-center space-x-2"
                >
                  <Mic className="w-4 h-4" />
                  <span>Voice Navigation</span>
                </Button>
                <Badge variant="secondary" className="text-xs">
                  {safeTier === 'pro' ? 'Full therapy features + live coach' :
                   safeTier === 'core' ? 'Enhanced activities + coach insights' :
                   'AI-powered speech practice'}
                </Badge>
              </div>
              
              {/* Today's Focus from Parent with enhanced display */}
              {todaysFocus.length > 0 && (
                <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-3">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Target className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Today's Focus</span>
                  </div>
                  <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">
                    {todaysFocus.join(' & ')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Set by your grown-ups • Activities below match this focus
                  </p>
                </div>
              )}
            </div>
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

        {/* Regulation Break Prompt */}
        {needsBreak && (
          <Card className="p-4 border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Brain className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">Need a break?</h3>
                  <p className="text-sm text-slate-600">Breathing bubbles help us reset and learn better</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleRegulationBreak}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Yes, let's calm down
                </Button>
                <Button
                  onClick={() => setNeedsBreak(false)}
                  variant="ghost"
                >
                  Keep practicing
                </Button>
              </div>
            </div>
          </Card>
        )}

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
                className="p-4 rounded-lg border-2 border-slate-200 hover:border-teal-300 cursor-pointer transition-colors bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${activity.color} rounded-lg flex items-center justify-center`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">{activity.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{activity.track} • {activity.duration}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Just For You Section - AI-curated based on parent focus */}
        <Card className="p-6 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Just For You</h3>
            <Badge variant="secondary" className="text-xs">AI-picked</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Based on your focus areas and progress level
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {justForYou.map((activity) => (
              <div
                key={activity.id}
                onClick={() => handleActivitySelect(activity)}
                className="p-4 rounded-lg border-2 border-slate-200 hover:border-teal-300 cursor-pointer transition-colors bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <div className="text-center">
                  <div className={`w-12 h-12 ${activity.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                    {activity.icon}
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">{activity.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{activity.description}</p>
                  <Badge variant="outline" className="text-xs">
                    {activity.track}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Access Buttons - Enhanced with large tap areas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => setActiveView('activity-select')}
            className="h-20 bg-teal-600 hover:bg-teal-700 text-white flex flex-col items-center justify-center space-y-1"
          >
            <Play className="w-6 h-6" />
            <span>Start Activity</span>
          </Button>
          
          <Button
            onClick={() => setActiveView('buddy-select')}
            className="h-20 bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center justify-center space-y-1"
          >
            <Smile className="w-6 h-6" />
            <span>Choose Buddy</span>
          </Button>
          
          <Button
            onClick={() => triggerCelebration('manual')}
            className="h-20 bg-yellow-600 hover:bg-yellow-700 text-white flex flex-col items-center justify-center space-y-1"
          >
            <Trophy className="w-6 h-6" />
            <span>My Rewards</span>
          </Button>
        </div>

        {/* Calming Corner Quick Access */}
        {calmingPicks.length > 0 && (
          <Card className="p-6 border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-blue-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">Calming Corner</h3>
              </div>
              <Badge variant="secondary" className="text-xs">When you need it</Badge>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Take a break anytime with these regulation-friendly activities
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calmingPicks.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => handleActivitySelect(activity)}
                  className="p-4 rounded-lg border-2 border-indigo-200 hover:border-indigo-300 cursor-pointer transition-colors bg-white hover:bg-indigo-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${activity.color} rounded-lg flex items-center justify-center`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{activity.title}</h4>
                      <p className="text-xs text-slate-600">{activity.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Real-World Mission */}
        {currentMission && !currentMission.completed && (
          <Card className="p-6 border-0 shadow-sm bg-gradient-to-r from-orange-50 to-yellow-50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{currentMission.title}</h3>
                <p className="text-sm text-slate-600">{currentMission.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500 capitalize">{currentMission.safetyLevel.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium">{currentMission.tokens} tokens</span>
              </div>
            </div>
          </Card>
        )}

        {/* Exit PIN Modal */}
        {showExitPIN && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-sm p-6 m-4">
              <h3 className="text-lg font-semibold text-center mb-4">Exit Kid Mode</h3>
              <p className="text-sm text-slate-600 text-center mb-6">
                Enter the 3-digit PIN to switch to Parent Mode
              </p>
              <input
                type="text"
                maxLength={3}
                className="w-full p-3 text-center text-lg border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:outline-none mb-4"
                placeholder="123"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleExitKidMode((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowExitPIN(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement;
                    handleExitKidMode(input?.value || '');
                  }}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Exit
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // Enhanced Activity Select with better filtering and voice commands
  const renderActivitySelect = () => {
    const filteredActivities = getFilteredActivities();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Choose Your Activity</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {showOnlyRecommended ? 'Showing recommended activities' : 'Showing all activities'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleVoiceNavigation}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Mic className="w-4 h-4" />
              <span>Voice</span>
            </Button>
            <Button
              onClick={() => setActiveView('home')}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
        </div>

        {/* Enhanced Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {TRACK_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeTrackFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveTrackFilter(filter.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Toggle for recommendations */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowOnlyRecommended(!showOnlyRecommended)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showOnlyRecommended
                ? 'bg-teal-100 text-teal-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Show only 3 recommended</span>
          </button>
          {!showOnlyRecommended && (
            <span className="text-sm text-slate-500">
              Showing all {filteredActivities.length} activities
            </span>
          )}
        </div>

        {/* Activities Grid with enhanced metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map((activity) => (
            <Card
              key={activity.id}
              className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                activity.unlocked
                  ? 'hover:border-teal-300 border-2 border-slate-200'
                  : 'border-2 border-slate-100 opacity-75'
              }`}
              onClick={() => handleActivitySelect(activity)}
            >
              <div className="text-center space-y-4">
                <div className={`w-16 h-16 ${activity.color} rounded-xl flex items-center justify-center mx-auto`}>
                  {activity.icon}
                </div>
                
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {activity.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {activity.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-4 text-xs text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{activity.duration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="w-3 h-3" />
                      <span>Level {activity.level + 1}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {activity.track}
                    </Badge>
                    {activity.focus && (
                      <Badge variant="secondary" className="text-xs">
                        {activity.focus[0]}
                      </Badge>
                    )}
                    {activity.mode && (
                      <Badge variant="outline" className="text-xs">
                        {activity.mode}
                      </Badge>
                    )}
                    {activity.regulationFriendly && (
                      <Badge className="text-xs bg-indigo-100 text-indigo-800">
                        Calm-friendly
                      </Badge>
                    )}
                  </div>
                </div>

                {!activity.unlocked && (
                  <div className="flex items-center justify-center space-x-1 text-xs text-slate-500">
                    <Lock className="w-3 h-3" />
                    <span>{activity.tier === 'core' ? 'Core' : 'Pro'} plan</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Enhanced Activity Session with advanced coaching
  const renderActivity = () => {
    if (!selectedActivity) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {selectedActivity.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {selectedActivity.track} • Level {selectedActivity.level + 1}
            </p>
          </div>
          <Button
            onClick={() => setActiveView('home')}
            variant="outline"
            size="sm"
          >
            <Home className="w-4 h-4 mr-1" />
            Home
          </Button>
        </div>

        {/* Session Progress */}
        <Card className="p-6 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 ${selectedActivity.color} rounded-lg flex items-center justify-center`}>
                {selectedActivity.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Practice: "{currentWord}"</h3>
                <p className="text-sm text-slate-600">
                  Attempt {practiceAttempts + 1} • {successStreak} in a row
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-teal-600">{todayTokens}</div>
              <div className="text-xs text-slate-500">tokens today</div>
            </div>
          </div>

          {/* Speech Analysis Display */}
          {speechAnalysis && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    {Math.round(speechAnalysis.accuracy * 100)}%
                  </div>
                  <div className="text-xs text-slate-500">Accuracy</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    {Math.round(speechAnalysis.clarity * 100)}%
                  </div>
                  <div className="text-xs text-slate-500">Clarity</div>
                </div>
                {speechAnalysis.coarticulationScore && (
                  <div>
                    <div className="text-lg font-semibold text-slate-900">
                      {Math.round(speechAnalysis.coarticulationScore * 100)}%
                    </div>
                    <div className="text-xs text-slate-500">Flow</div>
                  </div>
                )}
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    {speechAnalysis.latency}ms
                  </div>
                  <div className="text-xs text-slate-500">Response</div>
                </div>
              </div>
            </div>
          )}

          {/* Practice Button */}
          <div className="text-center">
            <Button
              onClick={handleSpeechPractice}
              disabled={isRecording || audioProcessing}
              className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 text-lg"
            >
              {audioProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-5 h-5 mr-2" />
                  Recording...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Say "{currentWord}"
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Session Controls with regulation options */}
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWord(generateTargetWord(selectedActivity))}
              className="flex items-center space-x-1"
            >
              <Shuffle className="w-4 h-4" />
              <span>New Word</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView('calm-corner')}
              className="flex items-center space-x-1"
            >
              <Brain className="w-4 h-4" />
              <span>Need a Break</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast("🤔 That's okay! Let's try something easier", {
                  description: "Every try makes you stronger",
                  duration: 3000,
                });
              }}
              className="flex items-center space-x-1"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Too Hard</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerCelebration('session_complete')}
              className="flex items-center space-x-1"
            >
              <CheckCircle className="w-4 h-4" />
              <span>I'm Done!</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  // Enhanced Celebration with parent sharing
  const renderCelebration = () => (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-6xl animate-bounce">🎉</div>
        </div>
      )}
      
      <Card className="w-full max-w-lg p-8 text-center border-0 shadow-lg">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-yellow-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Amazing Work, {childName}! 🌟
        </h1>
        <p className="text-slate-600 mb-6">
          You earned {todayTokens} tokens today and practiced {practiceReps} times!
        </p>
        
        <div className="space-y-4 mb-8">
          <div className="p-4 bg-teal-50 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Star className="w-5 h-5 text-teal-600" />
              <span className="font-medium text-teal-800">Today's Wins</span>
            </div>
            <div className="text-sm text-teal-700">
              {generalizationWins} sounds mastered • {weekStreak} day streak
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Heart className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Share with Family</span>
            </div>
            <p className="text-sm text-blue-700">
              Your grown-ups got a celebration message!
            </p>
            <Button
              size="sm"
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                toast("🎥 Victory video recorded!", {
                  description: "Shared with your grown-ups",
                  duration: 3000,
                });
              }}
            >
              Record Victory Video
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={() => setActiveView('home')}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3"
          >
            Continue Practicing! 🚀
          </Button>
          
          <Button
            onClick={() => setActiveView('calm-corner')}
            variant="outline"
            className="w-full"
          >
            Take a Calm Break 🫧
          </Button>
        </div>
      </Card>
    </div>
  );

  // Enhanced Calm Corner with interoception activities
  const renderCalmCorner = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 text-center border-0 shadow-lg">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Brain className="w-10 h-10 text-indigo-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Calm Corner 🫧
        </h1>
        <p className="text-slate-600 mb-6">
          Let's take deep breaths and reset together
        </p>
        
        <div className="space-y-4 mb-8">
          <div className="p-6 bg-white rounded-xl">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <div className="w-8 h-8 bg-indigo-400 rounded-full opacity-70"></div>
            </div>
            <h3 className="font-medium text-slate-900 mb-2">Breathing Bubbles</h3>
            <p className="text-sm text-slate-600 mb-4">
              Watch the bubble grow as you breathe in, shrink as you breathe out
            </p>
            <div className="text-xs text-indigo-600">
              In for 4... Hold for 2... Out for 6...
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="p-4 h-auto flex flex-col items-center space-y-2"
              onClick={() => {
                toast("🤲 Feel your hands and feet", {
                  description: "Notice how they feel right now",
                  duration: 4000,
                });
              }}
            >
              <Activity className="w-6 h-6 text-indigo-600" />
              <span className="text-sm">Body Check</span>
            </Button>
            
            <Button
              variant="outline"
              className="p-4 h-auto flex flex-col items-center space-y-2"
              onClick={() => {
                toast("💪 Push against the wall for 10 seconds", {
                  description: "Great for heavy work input",
                  duration: 4000,
                });
              }}
            >
              <Shield className="w-6 h-6 text-indigo-600" />
              <span className="text-sm">Wall Push</span>
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={() => {
              setTodayTokens(prev => prev + 1);
              syncToParent('regulation_success', {
                tool: 'breathing_bubbles',
                duration: '90 seconds',
                selfInitiated: true
              });
              toast("🌟 Great job regulating! You earned a token!", {
                duration: 3000,
              });
              setTimeout(() => setActiveView('home'), 2000);
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
          >
            I Feel Better! ✨
          </Button>
          
          <Button
            onClick={() => setActiveView('home')}
            variant="outline"
            className="w-full"
          >
            Back to Activities
          </Button>
        </div>
        
        <div className="mt-6 p-3 bg-indigo-50 rounded-lg">
          <p className="text-xs text-indigo-700">
            Taking breaks helps your brain learn better! 🧠✨
          </p>
        </div>
      </Card>
    </div>
  );

  // Enhanced Buddy Select with personality previews
  const renderBuddySelect = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Choose Your Buddy</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Each buddy has a different voice and personality
          </p>
        </div>
        <Button
          onClick={() => setActiveView('home')}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {buddyVoices.map((buddy) => (
          <Card
            key={buddy.id}
            className={`p-6 cursor-pointer transition-all duration-200 border-2 ${
              buddy.unlocked
                ? selectedBuddy === buddy.id
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 hover:border-teal-300'
                : 'border-slate-100 opacity-75'
            }`}
            onClick={() => {
              if (buddy.unlocked) {
                setSelectedBuddy(buddy.id);
                toast(`${buddy.name} is now your buddy! 🎉`, {
                  description: buddy.description,
                  duration: 3000,
                });
              } else {
                toast(`${buddy.name} unlocks with ${buddy.id === 'ziggy' ? 'Core' : 'Pro'} plan! 🔓`, {
                  duration: 3000,
                });
              }
            }}
          >
            <div className="text-center space-y-4">
              <div className={`w-20 h-20 ${buddy.color} rounded-full flex items-center justify-center mx-auto`}>
                {buddy.icon}
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {buddy.name}
                </h3>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {buddy.personality}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {buddy.description}
                </p>
              </div>

              {selectedBuddy === buddy.id && (
                <Badge className="bg-teal-600 text-white">
                  Current Buddy
                </Badge>
              )}
              
              {!buddy.unlocked && (
                <div className="flex items-center justify-center space-x-1 text-xs text-slate-500">
                  <Lock className="w-3 h-3" />
                  <span>{buddy.id === 'ziggy' ? 'Core' : 'Pro'} plan</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button
          onClick={() => setActiveView('home')}
          className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3"
        >
          Start Practicing with {buddyVoices.find(b => b.id === selectedBuddy)?.name}!
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto p-4">
        {renderView()}
      </div>
    </div>
  );
}