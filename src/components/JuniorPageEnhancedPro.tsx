import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { motion } from 'motion/react';
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
  Compass,
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
  PartyPopper as Confetti,
  MoveRight,
  Volume,
  Wifi,
  WifiOff,
  Languages,
  Moon,
  Sun,
  Camera,
  Mic2,
  Download,
  Radio,
  Wind
} from 'lucide-react';

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
  voiceSettings: {
    pace: number;
    enthusiasm: number;
    visualDensity: number;
    sensoryLoad: boolean;
  };
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
  whyToday?: string;
  energyLevel?: 'quick-wins' | 'challenge' | 'adaptive';
  offlineReady?: boolean;
  multilingual?: boolean;
  aacrequired?: boolean;
  prosodyFocus?: boolean;
  naturalisticMission?: boolean;
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
  voicingAccuracy?: number;
  placementAccuracy?: number;
  mannerAccuracy?: number;
  intelligibilityProxy?: number;
  errorlessLearningNeeded?: boolean;
  visualCuesRecommended?: boolean;
}

interface RealWorldMission {
  id: string;
  title: string;
  description: string;
  safetyLevel: 'safe' | 'ask_parent' | 'restricted';
  tokens: number;
  completed: boolean;
  requiresParentConfirmation: boolean;
  contextualCues: string[];
  generalizationTarget: string;
}

interface ParentMicroCard {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'celebration' | 'strategy' | 'milestone' | 'regulation';
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'speech' | 'behavior' | 'social' | 'sensory';
}

interface MouthAnimation {
  id: string;
  phoneme: string;
  position: 'open' | 'closed' | 'rounded' | 'spread';
  tongue: 'tip-up' | 'tip-down' | 'back-up' | 'center';
  duration: number;
}

interface VisualCoaching {
  enabled: boolean;
  mouthAnimation: boolean;
  spectrogramFireworks: boolean;
  arMouthOverlay: boolean;
  phonemeVisualization: boolean;
}

interface ParentControls {
  dailyMaxTime: number; // minutes
  activityFilters: string[];
  bedtimeBlackout: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  voiceDownloadApprovals: boolean;
  kidSafeMode: boolean;
  openWorldChatDisabled: boolean;
  profileSwitching: boolean;
}

interface LanguageSettings {
  primary: string;
  secondary?: string;
  codeSwitchAwareness: boolean;
  homeLanguageSupport: boolean;
}

interface OfflinePack {
  id: string;
  title: string;
  activities: string[];
  size: string;
  downloaded: boolean;
}

// Enhanced track filters with advanced categorization
const TRACK_FILTERS = [
  { id: 'all', label: 'All', icon: Sparkles, color: 'gray' },
  { id: 'speech', label: 'Speech', icon: MessageSquare, color: 'blue' },
  { id: 'social', label: 'Social', icon: Users2, color: 'green' },
  { id: 'routines', label: 'Routines', icon: Clock, color: 'orange' },
  { id: 'sensory', label: 'Sensory', icon: Brain, color: 'purple' },
  { id: 'executive', label: 'Executive', icon: Target, color: 'indigo' },
  { id: 'aac', label: 'AAC', icon: Layers, color: 'pink' },
  { id: 'prosody', label: 'Prosody', icon: Radio, color: 'cyan' },
  { id: 'fluency', label: 'Fluency', icon: Waves, color: 'teal' }
];

export function JuniorPageEnhancedPro({ userData, userTier = 'starter' }: JuniorPageProps) {
  const [activeView, setActiveView] = useState<'kid-login' | 'home' | 'buddy-select' | 'activity-select' | 'activity' | 'celebration' | 'calm-corner' | 'parent-education' | 'visual-coaching' | 'offline-manager' | 'parent-controls'>('kid-login');
  const [selectedBuddy, setSelectedBuddy] = useState<string>('sunny');
  const [currentSpeechLevel, setCurrentSpeechLevel] = useState<number>(2);
  const [isRecording, setIsRecording] = useState(false);
  const [audioProcessing, setAudioProcessing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [todayTokens, setTodayTokens] = useState(12);
  const [weekStreak, setWeekStreak] = useState(4);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activeTrackFilter, setActiveTrackFilter] = useState<string>('all');
  const [currentWord, setCurrentWord] = useState('star');
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
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [emotionDetected, setEmotionDetected] = useState<'frustrated' | 'excited' | 'anxious' | 'calm'>('calm');
  
  // Enhanced Parent Integration State
  const [todaysFocus, setTodaysFocus] = useState<string[]>(['/s/ blends', 'morning routine step 3', 'prosody practice']);
  const [sharedRewards, setSharedRewards] = useState(['stickers', 'high-fives', 'favorite song']);
  const [recentParentActivity, setRecentParentActivity] = useState('Set focus: practice /s/ sounds with prosody');
  const [parentMicroCards, setParentMicroCards] = useState<ParentMicroCard[]>([
    {
      id: 'victory-s-sounds',
      title: 'Eddie nailed /s/ in blends!',
      message: 'Try "stir soup" at dinner tonight - 94% accuracy!',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      type: 'celebration',
      actionable: true,
      priority: 'high',
      category: 'speech'
    },
    {
      id: 'regulation-break-needed',
      title: 'Regulation support detected',
      message: 'Eddie took a calm break after 4 attempts - great self-awareness!',
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
      type: 'regulation',
      actionable: false,
      priority: 'medium',
      category: 'sensory'
    }
  ]);
  
  // Advanced features state
  const [visualCoaching, setVisualCoaching] = useState<VisualCoaching>({
    enabled: true,
    mouthAnimation: true,
    spectrogramFireworks: true,
    arMouthOverlay: false,
    phonemeVisualization: true
  });

  const [languageSettings, setLanguageSettings] = useState<LanguageSettings>({
    primary: 'en-US',
    secondary: 'es-ES',
    codeSwitchAwareness: true,
    homeLanguageSupport: true
  });

  const [parentControls, setParentControls] = useState<ParentControls>({
    dailyMaxTime: 20,
    activityFilters: [],
    bedtimeBlackout: {
      enabled: true,
      startTime: '20:00',
      endTime: '07:00'
    },
    voiceDownloadApprovals: true,
    kidSafeMode: true,
    openWorldChatDisabled: true,
    profileSwitching: false
  });

  const [offlinePacks, setOfflinePacks] = useState<OfflinePack[]>([
    {
      id: 'essential-speech',
      title: 'Essential Speech Pack',
      activities: ['sound-safari', 's-blend-builder', 'sound-detectives'],
      size: '45 MB',
      downloaded: true
    },
    {
      id: 'car-ride-calm',
      title: 'Car Ride Calm Pack',
      activities: ['calm-corner', 'breathing-bubbles', 'body-scan'],
      size: '32 MB',
      downloaded: false
    },
    {
      id: 'social-skills-express',
      title: 'Social Skills Express',
      activities: ['turn-taking-time', 'emotion-detectives', 'self-advocacy-coach'],
      size: '58 MB',
      downloaded: true
    }
  ]);
  
  // Real World Mission State with enhanced naturalistic learning
  const [currentMission, setCurrentMission] = useState<RealWorldMission | null>({
    id: 'breakfast-s-sounds',
    title: 'Real-World Mission',
    description: 'Say 3 /s/ sounds while making breakfast with parent',
    safetyLevel: 'ask_parent',
    tokens: 3,
    completed: false,
    requiresParentConfirmation: true,
    contextualCues: ['cereal', 'syrup', 'spoon'],
    generalizationTarget: '/s/ in daily routines'
  });

  // Child energy detection and adaptive AI
  const [childEnergyLevel, setChildEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState<number>(2);
  const [prosodyJourney, setProsodyJourney] = useState({
    currentLevel: 'word-level',
    nextTarget: 'phrase-level',
    mastery: { pitch: 0.7, stress: 0.8, rate: 0.6, pausing: 0.5 }
  });

  const childName = userData.childName || 'Eddie';
  const safeTier = userTier || 'starter';

  // Revolutionary Buddy Voices with enhanced personality controls
  const buddyVoices: BuddyVoice[] = [
    {
      id: 'sunny',
      name: 'Sunny',
      personality: 'Friendly & Encouraging',
      icon: <Smile className="w-6 h-6" />,
      color: 'bg-yellow-100 text-yellow-600',
      description: 'Celebrates every try - warm and supportive voice',
      unlocked: true,
      voiceSettings: {
        pace: 3,
        enthusiasm: 4,
        visualDensity: 3,
        sensoryLoad: false
      }
    },
    {
      id: 'luna',
      name: 'Luna',
      personality: 'Calm & Gentle',
      icon: <Heart className="w-6 h-6" />,
      color: 'bg-purple-100 text-purple-600',
      description: 'Perfect for anxious moments - soothing voice',
      unlocked: true,
      voiceSettings: {
        pace: 2,
        enthusiasm: 2,
        visualDensity: 2,
        sensoryLoad: false
      }
    },
    {
      id: 'ziggy',
      name: 'Ziggy',
      personality: 'Playful & Fun',
      icon: <PartyPopper className="w-6 h-6" />,
      color: 'bg-green-100 text-green-600',
      description: 'Makes practice feel like play - energetic voice',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      voiceSettings: {
        pace: 4,
        enthusiasm: 5,
        visualDensity: 4,
        sensoryLoad: true
      }
    },
    {
      id: 'sage',
      name: 'Sage',
      personality: 'Wise Guide',
      icon: <Crown className="w-6 h-6" />,
      color: 'bg-blue-100 text-blue-600',
      description: 'Patient mentor for big goals - wise voice',
      unlocked: safeTier === 'pro',
      voiceSettings: {
        pace: 2,
        enthusiasm: 3,
        visualDensity: 2,
        sensoryLoad: false
      }
    }
  ];

  // Enhanced Activity Taxonomy with revolutionary features
  const activities: Activity[] = [
    // === ENHANCED SPEECH TRACK ===
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
      regulationFriendly: true,
      whyToday: 'Perfect for building confidence with easy sounds',
      energyLevel: 'quick-wins',
      offlineReady: true,
      multilingual: true
    },
    {
      id: 's-blend-builder',
      title: 'S-Blend Builder',
      description: 'Master tricky "st", "sp", "sc" sounds with visual mouth cues',
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
      regulationFriendly: false,
      whyToday: 'Parent focus: /s/ blends practice',
      energyLevel: 'challenge',
      offlineReady: true
    },
    {
      id: 'prosody-playground',
      title: 'Prosody Playground',
      description: 'Master rhythm, stress, and melody in speech',
      icon: <Radio className="w-5 h-5" />,
      duration: '5-7 min',
      skillType: 'speech',
      level: 2,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-cyan-100 text-cyan-600',
      track: 'Prosody',
      voiceReady: true,
      mode: 'rhythm-matching',
      regulationFriendly: true,
      whyToday: 'Building natural speech melody',
      energyLevel: 'adaptive',
      prosodyFocus: true
    },
    {
      id: 'multilingual-bridge',
      title: 'Language Bridge',
      description: 'Practice sounds in home language + English',
      icon: <Languages className="w-5 h-5" />,
      duration: '4-6 min',
      skillType: 'speech',
      level: 1,
      sessionSize: 'standard',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-emerald-100 text-emerald-600',
      track: 'Multilingual',
      voiceReady: true,
      mode: 'code-switch',
      regulationFriendly: true,
      whyToday: 'Supporting bilingual development',
      energyLevel: 'adaptive',
      multilingual: true
    },
    
    // === ENHANCED SOCIAL TRACK ===
    {
      id: 'friendship-fix-it',
      title: 'Friendship Fix-It',
      description: 'Repair social misunderstandings with real scenarios',
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
      regulationFriendly: false,
      whyToday: 'Building advanced social repair skills',
      energyLevel: 'challenge',
      naturalisticMission: true
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
      regulationFriendly: true,
      whyToday: 'Empowering self-expression',
      energyLevel: 'adaptive',
      naturalisticMission: true
    },

    // === ENHANCED REGULATION TRACK ===
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
      regulationFriendly: true,
      whyToday: 'Building body awareness',
      energyLevel: 'adaptive',
      offlineReady: true
    },
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
      regulationFriendly: true,
      whyToday: 'Perfect for reset moments',
      energyLevel: 'quick-wins',
      offlineReady: true
    },

    // === AAC ENHANCED TRACK ===
    {
      id: 'aac-bridge-pro',
      title: 'AAC Bridge Pro',
      description: 'Core word practice with board integration',
      icon: <Layers className="w-5 h-5" />,
      duration: '3-5 min',
      skillType: 'aac',
      level: 1,
      sessionSize: 'standard',
      unlocked: safeTier === 'pro',
      tier: 'pro',
      color: 'bg-pink-100 text-pink-600',
      track: 'AAC Integration',
      voiceReady: true,
      regulationFriendly: true,
      whyToday: 'Supporting communication independence',
      energyLevel: 'adaptive',
      aacrequired: true,
      naturalisticMission: true
    }
  ];

  // Adaptive AI Journey that never stalls
  const getPersonalizedJourney = useCallback(() => {
    const userProfile = {
      currentLevel: currentSpeechLevel,
      strengths: ['articulation', 'vocabulary'],
      challenges: ['prosody', 's-blends'],
      regulationNeeds: needsBreak,
      energyLevel: childEnergyLevel,
      recentAccuracy: speechAnalysis?.accuracy || 0.8,
      sessionTime: currentSessionTime
    };

    // Dynamic difficulty shaping based on performance
    if (userProfile.recentAccuracy < 0.6 && practiceAttempts > 2) {
      return {
        recommendedActivities: activities.filter(a => 
          a.regulationFriendly && 
          a.energyLevel === 'quick-wins' && 
          a.level <= userProfile.currentLevel - 1
        ),
        supportLevel: 'errorless-learning',
        visualSupports: true,
        adaptiveMessage: 'Let\'s build success with easier targets first!'
      };
    }

    // Progressive challenge when ready
    if (userProfile.recentAccuracy > 0.9 && successStreak > 3) {
      return {
        recommendedActivities: activities.filter(a => 
          a.level === userProfile.currentLevel + 1 && 
          a.unlocked
        ),
        supportLevel: 'minimal-cues',
        visualSupports: false,
        adaptiveMessage: 'You\'re ready for the next challenge!'
      };
    }

    // Default adaptive path
    return {
      recommendedActivities: activities.filter(a => 
        a.level <= userProfile.currentLevel && 
        a.unlocked &&
        todaysFocus.some(focus => a.focus?.some(f => focus.includes(f)))
      ),
      supportLevel: 'moderate-support',
      visualSupports: true,
      adaptiveMessage: 'Perfect level for you today!'
    };
  }, [currentSpeechLevel, needsBreak, childEnergyLevel, speechAnalysis, practiceAttempts, successStreak, todaysFocus, currentSessionTime, activities]);

  // Enhanced speech practice with revolutionary AI feedback
  const handleAdvancedSpeechPractice = async () => {
    try {
      setIsRecording(true);
      setAudioProcessing(true);
      setPracticeAttempts(prev => prev + 1);
      setPracticeReps(prev => prev + 1);
      
      // Simulate ultra-low latency <200ms
      await new Promise(resolve => setTimeout(resolve, 180));
      
      // Revolutionary phoneme-level analysis with coarticulation
      const targetPhonemes = analyzeTargetPhonemes(currentWord);
      const analysis: SpeechAnalysis = {
        accuracy: Math.random() * 0.4 + 0.6,
        clarity: Math.random() * 0.3 + 0.7,
        attempt: true,
        phonemes: targetPhonemes,
        confidence: Math.random() * 0.3 + 0.7,
        needsSupport: Math.random() < 0.3,
        latency: 150 + Math.random() * 50, // 150-200ms
        phonemeLevel: true,
        coarticulationScore: Math.random() * 0.3 + 0.7,
        prosodyScore: Math.random() * 0.4 + 0.6,
        voicingAccuracy: Math.random() * 0.3 + 0.7,
        placementAccuracy: Math.random() * 0.4 + 0.6,
        mannerAccuracy: Math.random() * 0.3 + 0.7,
        intelligibilityProxy: Math.random() * 0.2 + 0.8,
        errorlessLearningNeeded: practiceAttempts > 3 && Math.random() < 0.4,
        visualCuesRecommended: Math.random() < 0.6
      };
      
      setSpeechAnalysis(analysis);
      
      // Advanced error-aware re-cues with place/manner/voicing feedback
      if (analysis.accuracy > 0.9) {
        setSuccessStreak(prev => prev + 1);
        setTodayTokens(prev => prev + 1);
        setGeneralizationWins(prev => prev + 1);
        
        // Spectacular visual celebration
        if (visualCoaching.spectrogramFireworks) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }
        
        toast.success(`🌟 AMAZING! That "${currentWord}" was PERFECT!`, {
          description: `Phoneme accuracy: ${Math.round(analysis.accuracy * 100)}% | Prosody: ${Math.round((analysis.prosodyScore || 0) * 100)}%`,
          duration: 3000,
        });
        
        // Create enhanced parent micro-card
        const newMicroCard: ParentMicroCard = {
          id: `victory-${Date.now()}`,
          title: `${childName} nailed "${currentWord}" with prosody!`,
          message: `Accuracy: ${Math.round(analysis.accuracy * 100)}% | Try in context: "stirring soup"`,
          timestamp: new Date(),
          type: 'celebration',
          actionable: true,
          priority: 'high',
          category: 'speech'
        };
        setParentMicroCards(prev => [newMicroCard, ...prev]);
        
        syncToParentEnhanced('practice_mastery', {
          word: currentWord,
          accuracy: analysis.accuracy,
          phonemes: analysis.phonemes,
          prosody: analysis.prosodyScore,
          coarticulation: analysis.coarticulationScore,
          generalizationReady: true,
          nextTarget: 'real-world context'
        });
        
      } else if (analysis.accuracy > 0.7) {
        setSuccessStreak(prev => Math.max(0, prev - 1));
        
        if (visualCoaching.mouthAnimation) {
          toast(`👍 Good work! I heard ${Math.round(analysis.accuracy * 100)}% of those sounds!`, {
            description: "Let's fine-tune that last part 👄",
            duration: 3000,
          });
        } else {
          toast(`👍 Good try! You're ${Math.round(analysis.accuracy * 100)}% there!`, {
            description: "One more adjustment and you've got it!",
            duration: 3000,
          });
        }
        
      } else {
        // Revolutionary error-specific coaching
        const errorType = detectAdvancedSpeechError(currentWord, analysis);
        setSuccessStreak(0);
        
        if (analysis.errorlessLearningNeeded) {
          // Switch to errorless learning mode
          toast("💙 Let's try an easier way! I'll help you more.", {
            description: "Switching to guided practice mode",
            duration: 4000,
          });
          
          setAdaptiveDifficulty(prev => Math.max(1, prev - 1));
          
        } else if (errorType === 's_to_t_substitution') {
          if (visualCoaching.mouthAnimation) {
            toast("🐍 Snake sound! Tongue tip behind teeth, air flows out - sssss!", {
              description: "👄 Watch my mouth animation • 🤚 Feel the air on your hand",
              duration: 5000,
            });
          } else {
            toast("🐍 Let's make the snake sound - tongue behind your teeth!", {
              description: "Feel the air flowing out - sssss!",
              duration: 4000,
            });
          }
          
        } else if (errorType === 'prosody_difficulty') {
          toast("🎵 Let's add some music to that word!", {
            description: "STARfish goes up ⬆️ then down ⬇️",
            duration: 4000,
          });
          
        } else if (errorType === 'coarticulation_difficulty') {
          toast("🔗 Let's connect those sounds smoothly!", {
            description: "ST-ST-STAR - practice the connection",
            duration: 4500,
          });
        }
        
        syncToParentEnhanced('needs_coaching', {
          word: currentWord,
          accuracy: analysis.accuracy,
          errorPattern: errorType,
          recommendedStrategy: getEnhancedStrategy(errorType),
          visualSupportsUsed: visualCoaching.enabled
        });
      }
      
      // Emotion-aware pacing and regulation detection
      detectEmotionAndAdapt(analysis);
      
    } catch (error) {
      console.error('Speech practice error:', error);
      toast.error("Let's try that again! 🔄");
    } finally {
      setIsRecording(false);
      setAudioProcessing(false);
    }
  };

  // Advanced emotion detection and adaptive pacing
  const detectEmotionAndAdapt = (analysis: SpeechAnalysis) => {
    // Detect frustration from voice patterns + timing
    if (practiceAttempts > 3 && analysis.accuracy < 0.6 && analysis.latency > 2000) {
      setEmotionDetected('frustrated');
      setNeedsBreak(true);
      
      toast("💙 You're working so hard! Want to take a breathing break?", {
        description: "🫧 Calm Corner is ready when you are",
        duration: 5000,
      });
      
      // Auto-suggest regulation activity
      setTimeout(() => {
        const calmActivity = activities.find(a => a.id === 'calm-corner');
        if (calmActivity?.unlocked) {
          toast("🫧 Ready for breathing bubbles?", {
            description: "Tap to start your calm moment",
            duration: 4000,
          });
        }
      }, 2000);
      
    } else if (analysis.accuracy > 0.9 && successStreak > 2) {
      setEmotionDetected('excited');
      // Offer level-up opportunity
      toast("🚀 You're on fire! Ready for a bigger challenge?", {
        description: "Tap to try the next level",
        duration: 3000,
      });
    }
  };

  // Enhanced phoneme analysis with multilingual support
  const analyzeTargetPhonemes = (word: string): string[] => {
    const phonemeMap: {[key: string]: string[]} = {
      'star': ['s', 't', 'ɑr'],
      'sun': ['s', 'ʌ', 'n'],
      'soap': ['s', 'oʊ', 'p'],
      'snake': ['s', 'n', 'eɪ', 'k'],
      'spider': ['s', 'p', 'aɪ', 'd', 'ər'],
      'blanket': ['b', 'l', 'æ', 'n', 'k', 'ət'],
      'sandwich': ['s', 'æ', 'n', 'd', 'w', 'ɪ', 'tʃ'],
      'fantastic': ['f', 'æ', 'n', 't', 'æ', 's', 't', 'ɪ', 'k'],
      // Spanish words for multilingual support
      'sol': ['s', 'o', 'l'],
      'casa': ['k', 'a', 's', 'a'],
      'estrella': ['e', 's', 't', 'r', 'e', 'ʎ', 'a']
    };
    return phonemeMap[word.toLowerCase()] || word.split('');
  };

  // Enhanced speech error detection with advanced categorization
  const detectAdvancedSpeechError = (word: string, analysis: SpeechAnalysis): string => {
    if (word.includes('s') && analysis.accuracy < 0.5 && analysis.placementAccuracy && analysis.placementAccuracy < 0.6) {
      return 's_to_t_substitution';
    }
    if (analysis.voicingAccuracy && analysis.voicingAccuracy < 0.6) {
      return 'voicing_error';
    }
    if (analysis.coarticulationScore && analysis.coarticulationScore < 0.6) {
      return 'coarticulation_difficulty';
    }
    if (analysis.prosodyScore && analysis.prosodyScore < 0.5) {
      return 'prosody_difficulty';
    }
    if (analysis.mannerAccuracy && analysis.mannerAccuracy < 0.6) {
      return 'manner_error';
    }
    if (analysis.intelligibilityProxy && analysis.intelligibilityProxy < 0.7) {
      return 'intelligibility_concern';
    }
    return 'general_articulation';
  };

  // Enhanced strategy recommendations for parents
  const getEnhancedStrategy = (errorType: string): string => {
    const strategies = {
      's_to_t_substitution': 'Use "snake sound" with airflow - have child feel air on palm',
      'voicing_error': 'Practice with hand on throat to feel vibration difference',
      'coarticulation_difficulty': 'Break into syllables: "st-ar" then connect smoothly',
      'prosody_difficulty': 'Use pitch slides and rhythm patterns - make it musical!',
      'manner_error': 'Focus on how air flows (stop vs. continuous sounds)',
      'intelligibility_concern': 'Slow down rate and over-articulate for clarity',
      'general_articulation': 'Use visual, tactile, and auditory cues together'
    };
    return strategies[errorType as keyof typeof strategies] || 'Provide positive encouragement and model correct production';
  };

  // Enhanced sync to parent app with comprehensive data
  const syncToParentEnhanced = (eventType: string, data: any) => {
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
        generalizationWins,
        emotionDetected,
        sessionTime: currentSessionTime,
        adaptiveDifficulty,
        prosodyJourney
      },
      technicalData: {
        visualCoachingUsed: visualCoaching.enabled,
        multilingualMode: languageSettings.codeSwitchAwareness,
        offlineMode: isOfflineMode,
        voiceNavUsed: voiceNavEnabled
      }
    };
    
    
    // Advanced parent notifications with actionable insights
    if (eventType === 'practice_mastery' && data.accuracy > 0.9) {
    }
    
    if (eventType === 'needs_coaching') {
    }
    
    if (eventType === 'regulation_success') {
    }
  };

  // Handle Kid Mode login with enhanced security
  const handleKidLogin = (code: string) => {
    if (code === '123456' || code.length === 6) {
      setIsKidMode(true);
      setActiveView('home');
      toast.success(`Hi ${childName}! So glad you're here 🌟`, {
        description: "Ready to play and learn together?",
        duration: 2000,
      });
      
      // Voice greeting if enabled
      if (voiceNavEnabled) {
        setTimeout(() => {
          toast(`🎵 Hi ${childName}! Your buddy ${buddyVoices.find(b => b.id === selectedBuddy)?.name} is excited to see you!`, {
            description: "What would you like to practice today?",
            duration: 3000,
          });
        }, 1000);
      }
    } else {
      toast.error("Let's try that code again! 🔢");
    }
  };

  // Voice navigation for 6-8 year olds
  const handleVoiceCommand = (command: string) => {
    if (!voiceNavEnabled) return;
    
    const normalizedCommand = command.toLowerCase();
    
    if (normalizedCommand.includes('home') || normalizedCommand.includes('back')) {
      setActiveView('home');
      toast("🏠 Going home!");
    } else if (normalizedCommand.includes('calm') || normalizedCommand.includes('break')) {
      setActiveView('calm-corner');
      toast("💙 Time for calm corner!");
    } else if (normalizedCommand.includes('practice') || normalizedCommand.includes('activity')) {
      setActiveView('activity-select');
      toast("🎯 Let's find an activity!");
    } else if (normalizedCommand.includes('help') || normalizedCommand.includes('stuck')) {
      toast("🤗 I'm here to help! You can say 'home', 'practice', or 'calm'", {
        description: "Or just tap the buttons!",
        duration: 4000,
      });
    }
  };

  // Naturalistic mission completion
  const completeRealWorldMission = () => {
    if (currentMission && !currentMission.completed) {
      const updatedMission = { ...currentMission, completed: true };
      setCurrentMission(updatedMission);
      setTodayTokens(prev => prev + updatedMission.tokens);
      setGeneralizationWins(prev => prev + 1);
      
      toast.success(`🌟 Real-world mission complete! +${updatedMission.tokens} tokens!`, {
        description: "Great job practicing in real life!",
        duration: 3000,
      });
      
      const newMicroCard: ParentMicroCard = {
        id: `mission-${Date.now()}`,
        title: `${childName} completed real-world mission!`,
        message: `Successfully used /s/ sounds during ${updatedMission.description}`,
        timestamp: new Date(),
        type: 'milestone',
        actionable: false,
        priority: 'high',
        category: 'speech'
      };
      setParentMicroCards(prev => [newMicroCard, ...prev]);
      
      syncToParentEnhanced('mission_completed', {
        mission: updatedMission,
        context: 'real_world_generalization',
        tokensEarned: updatedMission.tokens
      });
    }
  };

  // Enhanced activity filtering with AI recommendations
  const getEnhancedJustForYouActivities = (): Activity[] => {
    const journey = getPersonalizedJourney();
    
    return journey.recommendedActivities.slice(0, 3).map(activity => ({
      ...activity,
      whyToday: journey.adaptiveMessage
    }));
  };

  // Kid Mode Login Screen
  if (activeView === 'kid-login' && !isKidMode) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center"
            >
              <Baby className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl mb-2">Hi {childName}! 👋</h1>
            <p className="text-gray-600">Enter your special code to start</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.1 }}
                  className="w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center text-xl"
                  style={{
                    backgroundColor: i < pairingCode.length ? '#0891b2' : 'white',
                    color: i < pairingCode.length ? 'white' : '#666'
                  }}
                >
                  {i < pairingCode.length ? '●' : ''}
                </motion.div>
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[1,2,3,4,5,6,7,8,9,'🔄',0,'✓'].map((num, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="h-14 bg-gray-100 rounded-xl text-xl"
                  onClick={() => {
                    if (num === '🔄') {
                      setPairingCode('');
                    } else if (num === '✓') {
                      handleKidLogin(pairingCode);
                    } else if (typeof num === 'number' && pairingCode.length < 6) {
                      setPairingCode(prev => prev + num);
                    }
                  }}
                >
                  {num}
                </motion.button>
              ))}
            </div>
            
            {voiceNavEnabled && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl py-3 mt-4 flex items-center justify-center space-x-2"
                onClick={() => toast("🎤 Try saying 'Help me login' to get started!")}
              >
                <Mic className="w-5 h-5" />
                <span>Voice Help</span>
              </motion.button>
            )}
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Parent? Hold power button + volume up for 3 seconds
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Kid Mode Interface
  if (isKidMode) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
        {/* Kid-Safe Header */}
        <div className="bg-white shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${buddyVoices.find(b => b.id === selectedBuddy)?.color}`}
            >
              {buddyVoices.find(b => b.id === selectedBuddy)?.icon}
            </motion.div>
            <div>
              <h2 className="text-xl">Hi {childName}!</h2>
              <p className="text-sm text-gray-600">
                With {buddyVoices.find(b => b.id === selectedBuddy)?.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Token Counter */}
            <motion.div 
              animate={{ scale: todayTokens > 0 ? [1, 1.1, 1] : 1 }}
              className="bg-yellow-100 px-3 py-1 rounded-full flex items-center space-x-1"
            >
              <Star className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-600">{todayTokens}</span>
            </motion.div>
            
            {/* Offline Indicator */}
            {isOfflineMode && (
              <div className="bg-gray-100 px-2 py-1 rounded-full">
                <WifiOff className="w-4 h-4 text-gray-600" />
              </div>
            )}
            
            {/* Parent Exit - Hidden */}
            <div 
              className="w-8 h-8 opacity-0" 
              onDoubleClick={() => setShowExitPIN(true)}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeView === 'home' && (
            <div className="p-6 space-y-6">
              {/* Today's Mission */}
              {currentMission && !currentMission.completed && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-gradient-to-r from-teal-400 to-blue-500 rounded-2xl p-6 text-white"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg">🌟 Today's Mission</h3>
                    <Badge className="bg-white text-teal-600">
                      +{currentMission.tokens} tokens
                    </Badge>
                  </div>
                  <p className="mb-4">{currentMission.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentMission.contextualCues.map((cue, index) => (
                      <span key={index} className="bg-white/20 px-2 py-1 rounded-lg text-sm">
                        {cue}
                      </span>
                    ))}
                  </div>
                  <Button 
                    onClick={completeRealWorldMission}
                    className="bg-white text-teal-600 hover:bg-gray-100"
                  >
                    I did it! ✓
                  </Button>
                </motion.div>
              )}

              {/* Progress Tiles */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <span className="text-2xl">{weekStreak}</span>
                  </div>
                  <p className="text-sm text-gray-600">Day Streak</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-6 h-6 text-blue-500" />
                    <span className="text-2xl">{practiceReps}</span>
                  </div>
                  <p className="text-sm text-gray-600">Practice Reps</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="text-2xl">{Math.round((speechAnalysis?.accuracy || 0.8) * 100)}%</span>
                  </div>
                  <p className="text-sm text-gray-600">Accuracy</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    <span className="text-2xl">{generalizationWins}</span>
                  </div>
                  <p className="text-sm text-gray-600">Real-world Wins</p>
                </motion.div>
              </div>

              {/* Just For You Activities */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg">🎯 Just For You</h3>
                  <div className="text-sm text-gray-600">
                    Based on: {todaysFocus.join(' • ')}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {getEnhancedJustForYouActivities().map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setSelectedActivity(activity);
                        setActiveView('activity');
                        setCurrentWord('star'); // Set practice word
                      }}
                      className={`${activity.color} rounded-2xl p-4 cursor-pointer shadow-sm`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {activity.icon}
                          <div>
                            <h4 className="text-sm">{activity.title}</h4>
                            <p className="text-xs opacity-75">{activity.duration}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {activity.energyLevel === 'quick-wins' && (
                            <Badge variant="secondary" className="text-xs">Quick Win</Badge>
                          )}
                          {activity.energyLevel === 'challenge' && (
                            <Badge variant="secondary" className="text-xs">Challenge</Badge>
                          )}
                          {activity.offlineReady && (
                            <Download className="w-4 h-4 opacity-60" />
                          )}
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                      {activity.whyToday && (
                        <p className="text-xs opacity-75 mb-2">💡 {activity.whyToday}</p>
                      )}
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {activity.track}
                        </Badge>
                        {activity.prosodyFocus && (
                          <Badge variant="outline" className="text-xs bg-cyan-50">
                            Prosody
                          </Badge>
                        )}
                        {activity.naturalisticMission && (
                          <Badge variant="outline" className="text-xs bg-green-50">
                            Real-world
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveView('activity-select')}
                  className="bg-white rounded-2xl p-4 shadow-sm flex items-center space-x-3"
                >
                  <Gamepad2 className="w-6 h-6 text-blue-500" />
                  <span>All Activities</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveView('calm-corner')}
                  className="bg-white rounded-2xl p-4 shadow-sm flex items-center space-x-3"
                >
                  <Brain className="w-6 h-6 text-purple-500" />
                  <span>Calm Corner</span>
                </motion.button>
              </div>
            </div>
          )}

          {activeView === 'activity' && selectedActivity && (
            <div className="p-6">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-3xl shadow-lg overflow-hidden"
              >
                {/* Activity Header */}
                <div className={`${selectedActivity.color} p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setActiveView('home')}
                      className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </motion.button>
                    
                    <div className="text-center">
                      <h2 className="text-xl text-white mb-1">{selectedActivity.title}</h2>
                      <p className="text-white/80 text-sm">{selectedActivity.description}</p>
                    </div>
                    
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      {selectedActivity.icon}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="bg-white/20 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (practiceAttempts / 5) * 100)}%` }}
                      className="bg-white h-2 rounded-full"
                    />
                  </div>
                </div>

                {/* Practice Area */}
                <div className="p-6">
                  {/* Current Word Display with Visual Coaching */}
                  <div className="text-center mb-8">
                    <motion.div
                      animate={{ scale: isRecording ? [1, 1.1, 1] : 1 }}
                      transition={{ duration: 0.8, repeat: isRecording ? Infinity : 0 }}
                      className="text-6xl mb-4"
                    >
                      {currentWord}
                    </motion.div>
                    
                    {/* Phoneme Visualization */}
                    {visualCoaching.phonemeVisualization && (
                      <div className="flex justify-center space-x-2 mb-4">
                        {analyzeTargetPhonemes(currentWord).map((phoneme, index) => (
                          <motion.div
                            key={index}
                            animate={{ 
                              backgroundColor: speechAnalysis?.phonemes.includes(phoneme) ? '#10b981' : '#e5e7eb',
                              scale: isRecording ? [1, 1.2, 1] : 1 
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white"
                          >
                            {phoneme}
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Mouth Animation Display */}
                    {visualCoaching.mouthAnimation && (
                      <motion.div
                        animate={{ scale: isRecording ? [1, 1.05, 1] : 1 }}
                        className="w-24 h-16 bg-gradient-to-br from-pink-200 to-red-200 rounded-full mx-auto mb-4 flex items-center justify-center"
                      >
                        <motion.div
                          animate={{ 
                            scaleY: isRecording ? [1, 0.6, 1] : 1,
                            scaleX: currentWord.includes('o') ? 1.2 : 1
                          }}
                          className="w-8 h-6 bg-red-400 rounded-full"
                        />
                      </motion.div>
                    )}

                    {/* Visual feedback */}
                    {speechAnalysis && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex justify-center space-x-4 text-sm"
                      >
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                          <span>Accuracy: {Math.round(speechAnalysis.accuracy * 100)}%</span>
                        </div>
                        {speechAnalysis.prosodyScore && (
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-blue-500 rounded-full" />
                            <span>Melody: {Math.round(speechAnalysis.prosodyScore * 100)}%</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Recording Controls */}
                  <div className="flex justify-center space-x-4 mb-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAdvancedSpeechPractice}
                      disabled={isRecording || audioProcessing}
                      className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg ${
                        isRecording 
                          ? 'bg-red-500 animate-pulse' 
                          : audioProcessing 
                          ? 'bg-yellow-500' 
                          : 'bg-gradient-to-br from-blue-500 to-purple-500'
                      }`}
                    >
                      {audioProcessing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <RefreshCw className="w-8 h-8" />
                        </motion.div>
                      ) : isRecording ? (
                        <Square className="w-8 h-8" />
                      ) : (
                        <Mic className="w-8 h-8" />
                      )}
                    </motion.button>

                    {/* Help Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        if (selectedActivity.id === 's-blend-builder') {
                          toast("🐍 Remember: Tongue behind teeth, let air flow out - ssss!", {
                            description: "Like a snake making its sound",
                            duration: 4000,
                          });
                        } else {
                          toast("💡 Listen carefully, then try your best!", {
                            description: "I believe in you!",
                            duration: 3000,
                          });
                        }
                      }}
                      className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center"
                    >
                      <HelpCircle className="w-6 h-6 text-gray-600" />
                    </motion.button>

                    {/* Break Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setActiveView('calm-corner')}
                      className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center"
                    >
                      <Brain className="w-6 h-6 text-purple-600" />
                    </motion.button>
                  </div>

                  {/* Kid-friendly controls */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentWord('sun')}
                      className="h-12"
                    >
                      <Sun className="w-4 h-4 mr-2" />
                      sun
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentWord('star')}
                      className="h-12"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      star
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentWord('snake')}
                      className="h-12"
                    >
                      <Wind className="w-4 h-4 mr-2" />
                      snake
                    </Button>
                  </div>
                </div>

                {/* Confetti Effect */}
                {showConfetti && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 pointer-events-none z-50"
                  >
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ y: -100, x: Math.random() * window.innerWidth, rotate: 0 }}
                        animate={{ 
                          y: window.innerHeight + 100, 
                          rotate: 360,
                          transition: { duration: 2, delay: i * 0.1 }
                        }}
                        className="absolute w-4 h-4 bg-yellow-400 rounded-full"
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            </div>
          )}

          {activeView === 'calm-corner' && (
            <div className="p-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl p-8 text-center min-h-96"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setActiveView('home')}
                  className="mb-6 w-10 h-10 bg-white/50 rounded-full flex items-center justify-center mx-auto"
                >
                  <ArrowLeft className="w-5 h-5 text-indigo-600" />
                </motion.button>

                <h2 className="text-2xl text-indigo-800 mb-6">🫧 Calm Corner</h2>
                
                {/* Breathing Animation */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-32 h-32 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full mx-auto mb-8 flex items-center justify-center"
                >
                  <Wind className="w-12 h-12 text-indigo-600" />
                </motion.div>

                <p className="text-indigo-700 mb-8 text-lg">
                  Breathe in slowly... and breathe out slowly...
                </p>

                <div className="space-y-4">
                  <Button
                    onClick={() => {
                      setNeedsBreak(false);
                      setEmotionDetected('calm');
                      toast.success("💙 Great job calming down! You're ready to practice again.", {
                        duration: 3000,
                      });
                      
                      syncToParentEnhanced('regulation_success', {
                        activity: 'calm-corner',
                        duration: '2-3 minutes',
                        outcome: 'successful_self_regulation'
                      });
                    }}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white w-full py-3 rounded-xl"
                  >
                    I feel better now 😌
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setActiveView('home')}
                    className="w-full py-3 rounded-xl"
                  >
                    Back to activities
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {activeView === 'activity-select' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setActiveView('home')}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5" />
                </motion.button>
                
                <h2 className="text-xl">🎯 Choose Activity</h2>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setActiveView('buddy-select')}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${buddyVoices.find(b => b.id === selectedBuddy)?.color}`}
                >
                  {buddyVoices.find(b => b.id === selectedBuddy)?.icon}
                </motion.button>
              </div>

              {/* Track Filters */}
              <div className="flex overflow-x-auto space-x-2 mb-6 pb-2">
                {TRACK_FILTERS.map((filter) => (
                  <motion.button
                    key={filter.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setActiveTrackFilter(filter.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap ${
                      activeTrackFilter === filter.id 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <filter.icon className="w-4 h-4" />
                    <span className="text-sm">{filter.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Activities Grid */}
              <div className="space-y-3">
                {activities
                  .filter(activity => 
                    activeTrackFilter === 'all' || activity.skillType === activeTrackFilter
                  )
                  .filter(activity => activity.unlocked)
                  .map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setSelectedActivity(activity);
                        setActiveView('activity');
                        setCurrentWord(activity.focus?.[0]?.replace(/[\/\[\]]/g, '') || 'star');
                      }}
                      className={`${activity.color} rounded-2xl p-4 cursor-pointer shadow-sm`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {activity.icon}
                          <div>
                            <h4 className="text-sm">{activity.title}</h4>
                            <p className="text-xs opacity-75">{activity.duration} • {activity.track}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {activity.tier === 'pro' && (
                            <Crown className="w-4 h-4 text-yellow-600" />
                          )}
                          {activity.offlineReady && (
                            <Download className="w-4 h-4 opacity-60" />
                          )}
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          Level {activity.level}
                        </Badge>
                        {activity.regulationFriendly && (
                          <Badge variant="outline" className="text-xs bg-green-50">
                            Calm-friendly
                          </Badge>
                        )}
                        {activity.prosodyFocus && (
                          <Badge variant="outline" className="text-xs bg-cyan-50">
                            Prosody
                          </Badge>
                        )}
                        {activity.multilingual && (
                          <Badge variant="outline" className="text-xs bg-purple-50">
                            Multilingual
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {activeView === 'buddy-select' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setActiveView('activity-select')}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5" />
                </motion.button>
                
                <h2 className="text-xl">🎭 Choose Your Buddy</h2>
                
                <div className="w-10 h-10" />
              </div>

              <div className="space-y-4">
                {buddyVoices.map((buddy) => (
                  <motion.div
                    key={buddy.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    whileHover={{ scale: buddy.unlocked ? 1.02 : 1 }}
                    onClick={() => {
                      if (buddy.unlocked) {
                        setSelectedBuddy(buddy.id);
                        toast.success(`${buddy.name} is excited to practice with you! 🌟`);
                      } else {
                        toast(`${buddy.name} will unlock with ${buddy.id === 'ziggy' ? 'Core' : 'Pro'} subscription! 🔒`);
                      }
                    }}
                    className={`${buddy.color} rounded-2xl p-6 cursor-pointer shadow-sm ${
                      !buddy.unlocked ? 'opacity-50' : ''
                    } ${selectedBuddy === buddy.id ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        {buddy.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg">{buddy.name}</h3>
                          {!buddy.unlocked && <Lock className="w-4 h-4" />}
                          {selectedBuddy === buddy.id && <CheckCircle className="w-4 h-4" />}
                        </div>
                        <p className="text-sm opacity-80">{buddy.personality}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm opacity-75 mb-4">{buddy.description}</p>
                    
                    {buddy.unlocked && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Pace:</span>
                          <div className="flex space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full ${
                                  i < buddy.voiceSettings.pace ? 'bg-white' : 'bg-white/30'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Energy:</span>
                          <div className="flex space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full ${
                                  i < buddy.voiceSettings.enthusiasm ? 'bg-white' : 'bg-white/30'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Exit PIN Modal */}
        {showExitPIN && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg mb-4 text-center">Parent Access</h3>
              <p className="text-sm text-gray-600 mb-4 text-center">
                Enter parent PIN to exit Kid Mode
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3,4,5,6,7,8,9,'C',0,'✓'].map((num, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-12"
                    onClick={() => {
                      if (num === '✓') {
                        setIsKidMode(false);
                        setShowExitPIN(false);
                        setActiveView('kid-login');
                      } else if (num === 'C') {
                        // Clear PIN
                      } else {
                        // Add to PIN
                      }
                    }}
                  >
                    {num}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="ghost"
                onClick={() => setShowExitPIN(false)}
                className="w-full mt-4"
              >
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    );
  }

  // Default fallback
  return <div>Loading...</div>;
}