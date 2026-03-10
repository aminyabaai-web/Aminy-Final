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
  Bot,
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
import { JrCalmCorner } from './JrCalmCorner';
import { AACBoard } from './junior/AACBoard';
import { VisualSchedule } from './junior/VisualSchedule';
import {
  recordJuniorProgress,
  getFocusAreas,
  getJuniorDifficultyOverrides,
  getJuniorAvoidanceTriggers,
  getJuniorRecommendations,
  markRecommendationApplied,
  type FocusDomain,
  type DifficultyLevel,
} from '../lib/parent-junior-bridge';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useTTS } from '../hooks/useTTS';
import { getActivitiesSync, fetchActivities, type JuniorActivity } from '../lib/junior-content-service';
import { getJuniorIcon, getSkillTypeColor } from '../utils/juniorIconMap';

// ============================================================================
// Levenshtein Similarity — real transcript-vs-target accuracy scoring
// ============================================================================

function levenshteinSimilarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  if (la.length === 0 || lb.length === 0) return 0;
  const matrix = Array.from({ length: la.length + 1 }, (_, i) =>
    Array.from({ length: lb.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la.length; i++) {
    for (let j = 1; j <= lb.length; j++) {
      matrix[i][j] =
        la[i - 1] === lb[j - 1]
          ? matrix[i - 1][j - 1]
          : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }
  return 1 - matrix[la.length][lb.length] / Math.max(la.length, lb.length);
}

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
  const [activeView, setActiveView] = useState<'kid-login' | 'home' | 'buddy-select' | 'activity-select' | 'activity' | 'celebration' | 'calm-corner' | 'parent-education' | 'visual-coaching' | 'offline-manager' | 'parent-controls' | 'aac-board' | 'visual-schedule'>('kid-login');
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
  const [useTextInput, setUseTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');

  // =========================================================================
  // Extended activities from CMS / content service
  // =========================================================================
  const [allActivitiesCMS, setAllActivitiesCMS] = useState<JuniorActivity[]>(() => getActivitiesSync());

  // Load extended activities asynchronously (Supabase or fallback)
  useEffect(() => {
    let cancelled = false;
    fetchActivities().then((fetched) => {
      if (!cancelled && fetched.length > 0) setAllActivitiesCMS(fetched);
    });
    return () => { cancelled = true; };
  }, []);

  // TTS narration hook
  const tts = useTTS();

  // Real speech recognition via Web Speech API
  const speechPromptTimestamp = useRef<number>(0);
  const latestTranscriptRef = useRef<string>('');
  const latestConfidenceRef = useRef<number>(0);
  const speechResolverRef = useRef<((transcript: string) => void) | null>(null);

  const voiceInput = useVoiceInput({
    continuous: false,
    interimResults: true,
    language: 'en-US',
    onResult: (_transcript, isFinal) => {
      // Always keep the latest transcript for when promise resolves
      if (_transcript) {
        latestTranscriptRef.current = _transcript;
      }
      if (isFinal && speechResolverRef.current) {
        // Final result received — resolve immediately (onEnd will also fire, but we guard with null check)
        const resolver = speechResolverRef.current;
        speechResolverRef.current = null;
        resolver(latestTranscriptRef.current);
      }
    },
    onEnd: () => {
      // When recognition ends (final result or timeout), resolve the promise
      if (speechResolverRef.current) {
        speechResolverRef.current(latestTranscriptRef.current);
        speechResolverRef.current = null;
      }
    },
  });

  // Keep confidence ref in sync with voice hook state (avoids stale closures)
  useEffect(() => {
    latestConfidenceRef.current = voiceInput.confidence;
  }, [voiceInput.confidence]);

  // Enhanced Parent Integration State — loaded from bridge on mount
  const [todaysFocus, setTodaysFocus] = useState<string[]>(['/s/ blends', 'morning routine step 3', 'prosody practice']);
  const [difficultyOverrides, setDifficultyOverrides] = useState<Record<string, DifficultyLevel>>({});
  const [avoidanceTriggers, setAvoidanceTriggers] = useState<string[]>([]);
  const [sharedRewards, setSharedRewards] = useState(['stickers', 'high-fives', 'favorite song']);
  const [recentParentActivity, setRecentParentActivity] = useState('Set focus: practice /s/ sounds with prosody');

  // Load parent-set focus areas, difficulty overrides, and avoidance triggers on mount
  useEffect(() => {
    const childId = userData?.childName?.toLowerCase().replace(/\s+/g, '-') || 'default';

    // Load focus areas from parent bridge (replaces hardcoded defaults)
    const focusAreas = getFocusAreas(childId);
    if (focusAreas.length > 0) {
      const goals = focusAreas.flatMap(a => a.goals);
      setTodaysFocus(goals.length > 0 ? goals : ['/s/ blends', 'morning routine step 3', 'prosody practice']);
      setRecentParentActivity(`Focus areas: ${focusAreas.map(a => `${a.domain} (${a.priority})`).join(', ')}`);
    }

    // Load difficulty overrides
    const overrides = getJuniorDifficultyOverrides(childId);
    const overrideMap: Record<string, DifficultyLevel> = {};
    overrides.forEach(o => { overrideMap[o.domain] = o.level; });
    setDifficultyOverrides(overrideMap);

    // Load avoidance triggers
    const triggers = getJuniorAvoidanceTriggers(childId);
    setAvoidanceTriggers(triggers.map(t => t.trigger.toLowerCase()));

    // Apply pending recommendations
    const recs = getJuniorRecommendations(childId).filter(r => !r.applied);
    recs.forEach((rec, idx) => {
      overrideMap[rec.domain] = rec.difficulty;
      markRecommendationApplied(childId, idx);
    });
    if (recs.length > 0) setDifficultyOverrides({ ...overrideMap });
  }, [userData?.childName]);
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
    },

    // === WAVE 2E — NEW ACTIVITIES (6 additions to reach 15 total) ===
    {
      id: 'rhyme-time',
      title: 'Rhyme Time',
      description: 'Find words that rhyme! Build phonological awareness with fun rhyming games.',
      icon: <BookOpen className="w-5 h-5" />,
      duration: '3-5 min',
      skillType: 'speech',
      level: 1,
      sessionSize: 'standard',
      unlocked: true,
      tier: 'starter',
      color: 'bg-violet-100 text-violet-600',
      track: 'Phonological Awareness',
      voiceReady: true,
      focus: ['rhyming', 'word families'],
      mode: 'matching',
      regulationFriendly: true,
      whyToday: 'Rhyming builds the foundation for reading and speech',
      energyLevel: 'quick-wins',
      offlineReady: true
    },
    {
      id: 'story-retell',
      title: 'Story Retell',
      description: 'Listen to a short story and retell key events in your own words.',
      icon: <MessageSquare className="w-5 h-5" />,
      duration: '5-8 min',
      skillType: 'speech',
      level: 2,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-teal-100 text-teal-600',
      track: 'Narrative Skills',
      voiceReady: true,
      focus: ['sequencing', 'narration', 'comprehension'],
      mode: 'listen→retell',
      regulationFriendly: true,
      whyToday: 'Storytelling strengthens language and memory',
      energyLevel: 'adaptive',
      offlineReady: true
    },
    {
      id: 'following-directions',
      title: 'Following Directions',
      description: 'Practice multi-step directions: "Put the red block ON the blue block!"',
      icon: <Compass className="w-5 h-5" />,
      duration: '3-5 min',
      skillType: 'executive',
      level: 1,
      sessionSize: 'standard',
      unlocked: true,
      tier: 'starter',
      color: 'bg-orange-100 text-orange-600',
      track: 'Receptive Language',
      voiceReady: false,
      focus: ['listening', 'spatial concepts', 'sequencing'],
      mode: 'interactive',
      regulationFriendly: true,
      whyToday: 'Following directions is key for school readiness',
      energyLevel: 'quick-wins',
      offlineReady: true
    },
    {
      id: 'vocabulary-builder',
      title: 'Vocabulary Builder',
      description: 'Name items in categories, build word associations, and expand your word bank!',
      icon: <Lightbulb className="w-5 h-5" />,
      duration: '4-6 min',
      skillType: 'speech',
      level: 1,
      sessionSize: 'standard',
      unlocked: safeTier === 'core' || safeTier === 'pro',
      tier: 'core',
      color: 'bg-amber-100 text-amber-600',
      track: 'Expressive Language',
      voiceReady: true,
      focus: ['categories', 'word associations', 'naming'],
      mode: 'category-naming',
      regulationFriendly: true,
      whyToday: 'Growing your word bank for better expression',
      energyLevel: 'adaptive',
      offlineReady: true,
      multilingual: true
    },
    {
      id: 'emotion-labels',
      title: 'Emotion Labels',
      description: 'Identify emotions from real-life scenarios. How would YOU feel?',
      icon: <Heart className="w-5 h-5" />,
      duration: '4-6 min',
      skillType: 'social',
      level: 1,
      sessionSize: 'standard',
      unlocked: true,
      tier: 'starter',
      color: 'bg-rose-100 text-rose-600',
      track: 'Social Communication',
      voiceReady: true,
      focus: ['emotion recognition', 'perspective taking', 'empathy'],
      mode: 'scenario-based',
      regulationFriendly: true,
      whyToday: 'Understanding feelings builds stronger friendships',
      energyLevel: 'adaptive',
      offlineReady: true,
      naturalisticMission: true
    },
    {
      id: 'breathing-buddy',
      title: 'Breathing Buddy',
      description: 'Guided breathing with a visual animation. Breathe in... hold... breathe out...',
      icon: <Wind className="w-5 h-5" />,
      duration: '2-3 min',
      skillType: 'sensory',
      level: 0,
      sessionSize: 'micro',
      unlocked: true,
      tier: 'starter',
      color: 'bg-sky-100 text-sky-600',
      track: 'Self-Regulation',
      voiceReady: false,
      focus: ['deep breathing', 'calm down', 'self-regulation'],
      mode: 'guided-animation',
      regulationFriendly: true,
      whyToday: 'A quick reset when emotions feel big',
      energyLevel: 'quick-wins',
      offlineReady: true
    }
  ];

  // =========================================================================
  // Merge extended CMS activities into the hardcoded list.
  // De-duplicate by ID — hardcoded wins if both exist (richer metadata).
  // =========================================================================
  const hardcodedIds = new Set(activities.map((a) => a.id));
  const extendedAsUI: Activity[] = allActivitiesCMS
    .filter((cms) => !hardcodedIds.has(cms.id))
    .map((cms) => ({
      id: cms.id,
      title: cms.title,
      description: cms.description,
      icon: getJuniorIcon(cms.icon),
      duration: cms.duration,
      skillType: cms.skillType,
      level: cms.level,
      sessionSize: cms.sessionSize,
      unlocked: cms.unlocked,
      tier: cms.tier,
      color: getSkillTypeColor(cms.skillType),
      track: cms.track,
      voiceReady: cms.voiceReady,
    }));

  const allActivities: Activity[] = [...activities, ...extendedAsUI];

  // Adaptive AI Journey with parent cross-learning
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

    // Filter out activities matching avoidance triggers from parent
    const safeActivities = allActivities.filter(a => {
      const activityText = `${a.title} ${a.description} ${a.focus?.join(' ') || ''} ${a.mode || ''}`.toLowerCase();
      return !avoidanceTriggers.some(trigger => activityText.includes(trigger));
    });

    // Apply parent difficulty overrides to adjust effective level per domain
    const getEffectiveLevel = (domain: string): number => {
      const override = difficultyOverrides[domain];
      if (override === 'easier') return Math.max(0, userProfile.currentLevel - 1);
      if (override === 'harder') return Math.min(3, userProfile.currentLevel + 1);
      return userProfile.currentLevel;
    };

    // Dynamic difficulty shaping based on performance
    if (userProfile.recentAccuracy < 0.6 && practiceAttempts > 2) {
      return {
        recommendedActivities: safeActivities.filter(a =>
          a.regulationFriendly &&
          a.energyLevel === 'quick-wins' &&
          a.level <= Math.max(0, getEffectiveLevel(a.skillType) - 1)
        ),
        supportLevel: 'errorless-learning',
        visualSupports: true,
        adaptiveMessage: 'Let\'s build success with easier targets first!'
      };
    }

    // Progressive challenge when ready
    if (userProfile.recentAccuracy > 0.9 && successStreak > 3) {
      return {
        recommendedActivities: safeActivities.filter(a =>
          a.level === getEffectiveLevel(a.skillType) + 1 &&
          a.unlocked
        ),
        supportLevel: 'minimal-cues',
        visualSupports: false,
        adaptiveMessage: 'You\'re ready for the next challenge!'
      };
    }

    // Default adaptive path — weighted by parent focus areas
    return {
      recommendedActivities: safeActivities.filter(a =>
        a.level <= getEffectiveLevel(a.skillType) &&
        a.unlocked &&
        todaysFocus.some(focus => a.focus?.some(f => focus.includes(f)))
      ),
      supportLevel: 'moderate-support',
      visualSupports: true,
      adaptiveMessage: 'Perfect level for you today!'
    };
  }, [currentSpeechLevel, needsBreak, childEnergyLevel, speechAnalysis, practiceAttempts, successStreak, todaysFocus, currentSessionTime, allActivities, difficultyOverrides, avoidanceTriggers]);

  // Enhanced speech practice with REAL speech recognition feedback
  const handleAdvancedSpeechPractice = async () => {
    // If speech recognition is not supported, switch to text input mode
    if (!voiceInput.isSupported) {
      setUseTextInput(true);
      toast('Switching to text input mode — type the word to practice!', {
        description: 'Speech recognition is not available in this browser.',
        duration: 4000,
      });
      return;
    }

    try {
      setIsRecording(true);
      setPracticeAttempts(prev => prev + 1);
      setPracticeReps(prev => prev + 1);

      // Record when the prompt was shown for real latency measurement
      speechPromptTimestamp.current = Date.now();
      latestTranscriptRef.current = '';
      latestConfidenceRef.current = 0;

      // Start real speech recognition
      voiceInput.resetTranscript();
      voiceInput.startListening();

      // Wait for speech result via onEnd callback or timeout (8s max)
      const transcript = await new Promise<string>((resolve) => {
        speechResolverRef.current = resolve;

        // Safety timeout in case onEnd never fires
        setTimeout(() => {
          if (speechResolverRef.current) {
            voiceInput.stopListening();
            const fallback = latestTranscriptRef.current;
            speechResolverRef.current = null;
            resolve(fallback);
          }
        }, 8000);
      });

      setIsRecording(false);
      setAudioProcessing(true);

      // Calculate REAL metrics from actual speech input
      const realLatency = Date.now() - speechPromptTimestamp.current;
      const realConfidence = latestConfidenceRef.current || 0; // from SpeechRecognition API via ref
      const transcriptAccuracy = transcript
        ? levenshteinSimilarity(transcript, currentWord)
        : 0;

      // Use real confidence as the primary accuracy signal, blended with transcript match
      const overallAccuracy = transcript
        ? transcriptAccuracy * 0.6 + realConfidence * 0.4
        : 0;

      const targetPhonemes = analyzeTargetPhonemes(currentWord);
      const analysis: SpeechAnalysis = {
        accuracy: overallAccuracy,
        clarity: realConfidence,
        attempt: true,
        phonemes: targetPhonemes,
        confidence: realConfidence,
        needsSupport: overallAccuracy < 0.6,
        latency: realLatency,
        phonemeLevel: true,
        // Derived metrics based on real accuracy (not random)
        coarticulationScore: Math.min(1, overallAccuracy * 1.05),
        prosodyScore: realConfidence,
        voicingAccuracy: transcriptAccuracy,
        placementAccuracy: transcriptAccuracy,
        mannerAccuracy: Math.min(1, (transcriptAccuracy + realConfidence) / 2),
        intelligibilityProxy: transcript ? Math.min(1, overallAccuracy * 1.1) : 0,
        errorlessLearningNeeded: practiceAttempts > 3 && overallAccuracy < 0.5,
        visualCuesRecommended: overallAccuracy < 0.7,
      };

      setSpeechAnalysis(analysis);

      // Feedback based on real analysis
      if (analysis.accuracy > 0.9) {
        setSuccessStreak(prev => prev + 1);
        setTodayTokens(prev => prev + 1);
        setGeneralizationWins(prev => prev + 1);

        if (visualCoaching.spectrogramFireworks) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }

        toast.success(`🌟 AMAZING! That "${currentWord}" was PERFECT!`, {
          description: `Accuracy: ${Math.round(analysis.accuracy * 100)}% | Confidence: ${Math.round(realConfidence * 100)}%`,
          duration: 3000,
        });

        const newMicroCard: ParentMicroCard = {
          id: `victory-${Date.now()}`,
          title: `${childName} nailed "${currentWord}"!`,
          message: `Accuracy: ${Math.round(analysis.accuracy * 100)}% | Heard: "${transcript}"`,
          timestamp: new Date(),
          type: 'celebration',
          actionable: true,
          priority: 'high',
          category: 'speech',
        };
        setParentMicroCards(prev => [newMicroCard, ...prev]);

        syncToParentEnhanced('practice_mastery', {
          word: currentWord,
          accuracy: analysis.accuracy,
          phonemes: analysis.phonemes,
          prosody: analysis.prosodyScore,
          coarticulation: analysis.coarticulationScore,
          generalizationReady: true,
          nextTarget: 'real-world context',
          transcript,
        });

      } else if (analysis.accuracy > 0.7) {
        setSuccessStreak(prev => Math.max(0, prev - 1));

        if (visualCoaching.mouthAnimation) {
          toast(`👍 Good work! I heard ${Math.round(analysis.accuracy * 100)}% of those sounds!`, {
            description: transcript ? `I heard: "${transcript}" — let's fine-tune! 👄` : "Let's fine-tune that last part 👄",
            duration: 3000,
          });
        } else {
          toast(`👍 Good try! You're ${Math.round(analysis.accuracy * 100)}% there!`, {
            description: transcript ? `I heard: "${transcript}"` : 'One more adjustment and you\'ve got it!',
            duration: 3000,
          });
        }

      } else if (!transcript) {
        // No speech detected at all
        toast("🎤 I didn't hear anything. Try speaking a bit louder!", {
          description: `Say "${currentWord}" into the microphone`,
          duration: 4000,
        });

      } else {
        // Low accuracy — error-specific coaching
        const errorType = detectAdvancedSpeechError(currentWord, analysis);
        setSuccessStreak(0);

        if (analysis.errorlessLearningNeeded) {
          toast("💙 Let's try an easier way! I'll help you more.", {
            description: 'Switching to guided practice mode',
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
          visualSupportsUsed: visualCoaching.enabled,
          transcript,
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

  // Text-input fallback for speech practice (when Web Speech API is unavailable)
  const handleTextInputPractice = () => {
    const typed = textInputValue.trim();
    if (!typed) return;

    setPracticeAttempts(prev => prev + 1);
    setPracticeReps(prev => prev + 1);

    const accuracy = levenshteinSimilarity(typed, currentWord);
    const targetPhonemes = analyzeTargetPhonemes(currentWord);

    const analysis: SpeechAnalysis = {
      accuracy,
      clarity: accuracy > 0.7 ? 0.9 : 0.5,
      attempt: true,
      confidence: accuracy, // use accuracy as confidence proxy for text mode
      needsSupport: accuracy < 0.5,
      latency: 0,
      phonemes: targetPhonemes,
    };

    setSpeechAnalysis(analysis);

    if (accuracy >= 0.8) {
      setSuccessStreak(prev => prev + 1);
      setTodayTokens(prev => prev + 1);
      toast.success(`Great job typing "${currentWord}"!`);
    } else {
      setSuccessStreak(0);
      toast(`Almost! You typed "${typed}" — the target is "${currentWord}". Try again!`);
    }

    setTextInputValue('');
    const childId = userData?.childName?.toLowerCase().replace(/\s+/g, '-') || 'default';
    recordJuniorProgress(childId, {
      activityId: 'text-practice',
      activityTitle: `Text practice: ${currentWord}`,
      domain: 'speech',
      completedAt: new Date().toISOString(),
      durationSeconds: 0,
      accuracy: Math.round(accuracy * 100),
      promptLevel: 0,
      tokensEarned: accuracy >= 0.8 ? 1 : 0,
      notes: `Text input mode — typed: "${typed}", target: "${currentWord}"`,
    });
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
        const calmActivity = allActivities.find(a => a.id === 'calm-corner');
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
  const syncToParentEnhanced = (eventType: string, data: {
    activityId?: string;
    word?: string;
    mission?: { description?: string };
    activity?: string;
    accuracy?: number;
    tokensEarned?: number;
    emotionBefore?: string;
    emotionAfter?: string;
    context?: string;
    [key: string]: unknown;
  }) => {
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
    
    
    // Record progress to parent-junior bridge (feeds parent AI + weekly summaries)
    const childId = 'default';
    const domainMap: Record<string, FocusDomain> = {
      'practice_mastery': 'speech',
      'needs_coaching': 'speech',
      'mission_completed': 'speech',
      'regulation_success': 'regulation',
      'social_activity': 'social',
      'sensory_activity': 'sensory',
      'routine_activity': 'routines',
      'aac_activity': 'aac',
    };

    const domain = domainMap[eventType] || 'speech';

    recordJuniorProgress(childId, {
      activityId: data.activityId || `${eventType}-${Date.now()}`,
      activityTitle: data.word || data.mission?.description || data.activity || eventType,
      domain,
      completedAt: new Date().toISOString(),
      durationSeconds: currentSessionTime || 0,
      accuracy: data.accuracy,
      promptLevel: adaptiveDifficulty,
      tokensEarned: data.tokensEarned || 1,
      emotionBefore: data.emotionBefore || emotionDetected,
      emotionAfter: data.emotionAfter || emotionDetected,
      notes: data.context || undefined,
    });
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
          
          <div className="space-y-3 sm:space-y-4">
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4 sm:mt-6">
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
          
          <div className="mt-4 sm:mt-6 text-center">
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
            <div className="p-6 space-y-3 sm:space-y-4 sm:space-y-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveView('aac-board')}
                  className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl p-4 shadow-sm flex flex-col items-center space-y-2 text-white min-h-[88px]"
                >
                  <Layers className="w-7 h-7" />
                  <span className="text-sm font-medium">My Words</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveView('visual-schedule')}
                  className="bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl p-4 shadow-sm flex flex-col items-center space-y-2 text-white min-h-[88px]"
                >
                  <Clock className="w-7 h-7" />
                  <span className="text-sm font-medium">My Schedule</span>
                </motion.button>

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

          {activeView === 'aac-board' && (
            <AACBoard
              childName={childName}
              onBack={() => setActiveView('home')}
            />
          )}

          {activeView === 'visual-schedule' && (
            <VisualSchedule
              childName={childName}
              onBack={() => setActiveView('home')}
            />
          )}

          {activeView === 'activity' && selectedActivity && (
            <div className="p-4 sm:p-5 md:p-6">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onAnimationComplete={() => {
                  // Auto-narrate activity instructions when view loads
                  if (selectedActivity.voiceReady !== false) {
                    tts.speak(`${selectedActivity.title}. ${selectedActivity.description}`);
                  }
                }}
                className="bg-white rounded-3xl shadow-lg overflow-hidden"
              >
                {/* Activity Header */}
                <div className={`${selectedActivity.color} p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => {
                        tts.stop();
                        setActiveView('home');
                      }}
                      className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </motion.button>

                    <div className="text-center flex-1 mx-3">
                      <h2 className="text-xl text-white mb-1">{selectedActivity.title}</h2>
                      <p className="text-white/80 text-sm">{selectedActivity.description}</p>
                    </div>

                    {/* TTS replay / stop button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (tts.isSpeaking) {
                          tts.stop();
                        } else {
                          tts.speak(`${selectedActivity.title}. ${selectedActivity.description}`);
                        }
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tts.isSpeaking ? 'bg-white/40' : 'bg-white/20'
                      }`}
                      aria-label={tts.isSpeaking ? 'Stop narration' : 'Read aloud'}
                    >
                      {tts.isSpeaking ? (
                        <Square className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </motion.button>
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
                <div className="p-4 sm:p-5 md:p-6">
                  {/* Speech recognition browser support banner with text input toggle */}
                  {!voiceInput.isSupported && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-sm text-amber-800">
                      <AlertTriangle className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                      Speech practice works best in Chrome, Edge, or Safari with a microphone. You can still practice with text input!
                      {!useTextInput && (
                        <button
                          onClick={() => setUseTextInput(true)}
                          className="mt-2 block mx-auto px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
                        >
                          Switch to Text Input
                        </button>
                      )}
                    </div>
                  )}

                  {/* Text input toggle for users who prefer typing */}
                  {voiceInput.isSupported && (
                    <div className="mb-3 flex justify-end">
                      <button
                        onClick={() => setUseTextInput(!useTextInput)}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        {useTextInput ? <Mic className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                        {useTextInput ? 'Switch to Voice' : 'Use Text Input'}
                      </button>
                    </div>
                  )}

                  {/* Voice input error banner */}
                  {voiceInput.error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center text-sm text-red-700">
                      {voiceInput.error}
                    </div>
                  )}

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

                    {/* Visual feedback — real metrics from speech recognition */}
                    {speechAnalysis && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex flex-wrap justify-center gap-3 text-sm"
                      >
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                          <span>Accuracy: {Math.round(speechAnalysis.accuracy * 100)}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full" />
                          <span>Confidence: {Math.round(speechAnalysis.confidence * 100)}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-purple-500 rounded-full" />
                          <span>Response: {speechAnalysis.latency < 1000 ? `${Math.round(speechAnalysis.latency)}ms` : `${(speechAnalysis.latency / 1000).toFixed(1)}s`}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Recording Controls OR Text Input Fallback */}
                  {useTextInput || !voiceInput.isSupported ? (
                    /* Text Input Mode — fallback for unsupported browsers or user preference */
                    <div className="mb-4 sm:mb-6">
                      <div className="flex items-center gap-2 max-w-sm mx-auto">
                        <input
                          type="text"
                          value={textInputValue}
                          onChange={(e) => setTextInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTextInputPractice();
                          }}
                          placeholder={`Type "${currentWord}" here...`}
                          className="flex-1 px-4 py-3 border-2 border-blue-200 rounded-xl text-lg text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
                          autoComplete="off"
                          autoCapitalize="off"
                          spellCheck={false}
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleTextInputPractice}
                          disabled={!textInputValue.trim()}
                          className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center shadow-lg disabled:opacity-50"
                        >
                          <Check className="w-6 h-6" />
                        </motion.button>
                      </div>
                      <p className="text-center text-xs text-gray-400 mt-2">
                        Type the word above, then press Enter or tap the check button
                      </p>
                    </div>
                  ) : (
                    /* Voice Input Mode — primary speech practice */
                    <div className="flex justify-center space-x-4 mb-4 sm:mb-6">
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
                  )}

                  {/* Kid-friendly controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
            <JrCalmCorner
              onBack={() => setActiveView('home')}
              onComplete={(data) => {
                setNeedsBreak(false);
                setEmotionDetected('calm');
                toast.success("💙 Great job calming down! You're ready to practice again.", {
                  duration: 3000,
                });
                syncToParentEnhanced('regulation_success', {
                  activity: data.activity,
                  emotionBefore: data.emotionBefore,
                  emotionAfter: data.emotionAfter,
                  durationSeconds: data.durationSeconds,
                  outcome: 'successful_self_regulation'
                });
                setActiveView('home');
              }}
              buddyName={
                selectedBuddy === 'sunny' ? 'Sunny' :
                selectedBuddy === 'luna' ? 'Luna' :
                selectedBuddy === 'breezy' ? 'Breezy' :
                selectedBuddy === 'sparky' ? 'Sparky' :
                'Coco'
              }
              accessMode="always"
              autoTriggered={needsBreak}
            />
          )}

          {activeView === 'activity-select' && (
            <div className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
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
              <div className="flex overflow-x-auto space-x-2 mb-4 sm:mb-6 pb-2">
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

              {/* Activity count */}
              <p className="text-xs text-gray-400 mb-3">
                {allActivities.filter(a => activeTrackFilter === 'all' || a.skillType === activeTrackFilter).length} activities
              </p>

              {/* Activities Grid — shows ALL activities, locked ones with overlay */}
              <div className="space-y-3">
                {allActivities
                  .filter(activity =>
                    activeTrackFilter === 'all' || activity.skillType === activeTrackFilter
                  )
                  .map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: Math.min(index * 0.03, 0.6) }}
                      whileHover={{ scale: activity.unlocked ? 1.02 : 1 }}
                      onClick={() => {
                        if (!activity.unlocked) {
                          toast(`Unlock "${activity.title}" with ${activity.tier === 'pro' ? 'Pro' : 'Core'} plan`);
                          return;
                        }
                        setSelectedActivity(activity);
                        tts.speak(`Let's play ${activity.title}! ${activity.description}`);
                        setActiveView('activity');
                        setCurrentWord(activity.focus?.[0]?.replace(/[\/\[\]]/g, '') || 'star');
                      }}
                      className={`${activity.color} rounded-2xl p-4 cursor-pointer shadow-sm relative ${
                        !activity.unlocked ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Lock overlay for locked activities */}
                      {!activity.unlocked && (
                        <div className="absolute top-3 right-3">
                          <Lock className="w-4 h-4 text-gray-500" />
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {activity.icon}
                          <div>
                            <h4 className="text-sm font-medium">{activity.title}</h4>
                            <p className="text-xs opacity-75">{activity.duration} {activity.track && `\u2022 ${activity.track}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {activity.tier === 'pro' && (
                            <Crown className="w-4 h-4 text-yellow-600" />
                          )}
                          {activity.voiceReady && (
                            <Volume2 className="w-3.5 h-3.5 opacity-50" />
                          )}
                          {activity.offlineReady && (
                            <Download className="w-4 h-4 opacity-60" />
                          )}
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>

                      <p className="text-xs opacity-70 mb-2 line-clamp-2">{activity.description}</p>

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
            <div className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
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

              <div className="space-y-3 sm:space-y-4">
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