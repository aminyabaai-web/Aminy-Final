import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, Heart, CheckCircle2, ArrowRight, FastForward, Volume2 } from 'lucide-react';
import * as ConvoResponses from '../lib/conversational-responses';
import { CompassIcon } from './CompassIcon';
import { VoiceInputButton } from './VoiceInputButton';

// Progress step definitions for breadcrumbs
const ONBOARDING_STEPS = [
  { id: 'welcome', label: 'Welcome', progress: 0 },
  { id: 'empathy', label: 'How you feel', progress: 15 },
  { id: 'story', label: 'Your story', progress: 35 },
  { id: 'insights', label: 'Insights', progress: 65 },
  { id: 'routines', label: 'Your plan', progress: 85 },
  { id: 'start', label: 'Get started', progress: 100 },
];

interface Message {
  id: string;
  type: 'aminy' | 'parent';
  content: string | React.ReactNode;
  timestamp: Date;
}

interface StarterRoutine {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  goals: string[];
}

interface AIIntakeChatProps {
  onComplete: (data: {
    childName: string;
    childAge: string;
    recentChallenges: string;
    parentGoals: string;
    selectedRoutines: string[];
    selectedTier: 'free' | 'core' | 'pro';
    chatTranscript: Message[];
  }) => void;
  initialData?: {
    email?: string;
    childName?: string;
    childAge?: string;
  };
  isReturningUser?: boolean;
  onSkipOnboarding?: () => void;
}

export function AIIntakeChat({ onComplete, initialData, isReturningUser = false, onSkipOnboarding }: AIIntakeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [step, setStep] = useState<'intro' | 'empathy' | 'conversation' | 'summary' | 'routines' | 'complete'>('intro');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useVoiceFirst, setUseVoiceFirst] = useState(false);

  // Collected data - pre-populate from initialData if available
  const [childName, setChildName] = useState(initialData?.childName || '');
  const [childAge, setChildAge] = useState(initialData?.childAge || '');
  const [recentChallenges, setRecentChallenges] = useState('');
  const [parentGoals, setParentGoals] = useState('');
  const [conversationHistory, setConversationHistory] = useState('');
  const [selectedRoutines, setSelectedRoutines] = useState<string[]>([]);
  const [extractedInsights, setExtractedInsights] = useState<string[]>([]);
  const [empathyDetected, setEmpathyDetected] = useState<'stressed' | 'calm' | 'hopeful' | null>(null);
  const [hasReceivedFirstMessage, setHasReceivedFirstMessage] = useState(false);
  const [conversationTurn, setConversationTurn] = useState(0);
  const [waitingForUserResponse, setWaitingForUserResponse] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll with smooth behavior - ensures messages are always visible above input
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    // Use double requestAnimationFrame for better reliability
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      });
    });
  };

  useEffect(() => {
    // Delay to ensure DOM is fully updated including animations
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  // Add message helpers
  const addAminyMessage = (content: string | React.ReactNode, delay = 800) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const message: Message = {
        id: `aminy-${Date.now()}`,
        type: 'aminy',
        content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
    }, delay);
  };

  const addParentMessage = (content: string) => {
    const message: Message = {
      id: `parent-${Date.now()}`,
      type: 'parent',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  // Initialize with welcome
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messages.length === 0) {
        addAminyMessage(
          <div className="space-y-3">
            <p className="text-lg font-medium">Hi, I'm Aminy — and I'm about to become the most helpful thing on your phone. 🌿</p>
            <p className="text-gray-600">I'm here to take the mental load off your shoulders. No more Googling at 2am, no more wondering if you're doing it right, no more feeling alone in this.</p>
          </div>,
          400
        );

        setTimeout(() => {
          addAminyMessage(
            <div className="space-y-2">
              <p className="text-gray-700">Think of me as your:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-1">
                <li>✓ <strong>Personal BCBA</strong> — evidence-based strategies, 24/7</li>
                <li>✓ <strong>Developmental expert</strong> — who actually knows your child</li>
                <li>✓ <strong>Supportive friend</strong> — who gets it, without judgment</li>
              </ul>
              <p className="text-gray-600 mt-2">The more you share with me, the better I can help. I'll remember everything and build a personalized plan that actually works for <em>your</em> family.</p>
            </div>,
            1000
          );

          setTimeout(() => {
            addAminyMessage(
              'empathy-buttons',
              1200
            );
          }, 1200);
        }, 600);

        setProgress(5);
      }
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle empathy check response
  const handleEmpathyResponse = (feeling: 'stressed' | 'calm' | 'hopeful') => {
    setEmpathyDetected(feeling);
    setStep('conversation');
    setProgress(15);

    addParentMessage(feeling === 'stressed' ? '😓 Overwhelmed' : feeling === 'calm' ? '😌 Managing okay' : '🌟 Ready for change');

    setTimeout(() => {
      // Personalized response based on feeling with value hook
      const responses = {
        stressed: (
          <div className="space-y-2">
            <p>I hear you. That overwhelmed feeling? It's real, and it's valid.</p>
            <p className="text-gray-600">Here's what I want you to know: <strong>you don't have to figure this out alone anymore.</strong> That's literally why I exist — to carry some of that weight for you.</p>
          </div>
        ),
        calm: (
          <div className="space-y-2">
            <p>That's wonderful that you're managing — and the fact that you're here means you want even better for your family.</p>
            <p className="text-gray-600">I'm here to help you go from "getting by" to <strong>actually thriving</strong> — with less effort, not more.</p>
          </div>
        ),
        hopeful: (
          <div className="space-y-2">
            <p>I love that energy! You're in exactly the right headspace to make real progress.</p>
            <p className="text-gray-600">Let's channel that into <strong>a concrete plan</strong> that'll actually stick — not just ideas, but daily routines designed for your specific situation.</p>
          </div>
        )
      };

      addAminyMessage(responses[feeling], 600);

      setTimeout(() => {
        addAminyMessage(
          <div className="space-y-2">
            <p className="font-medium">Tell me about your child and what's been on your mind.</p>
            <p className="text-sm text-gray-500">
              Their name, age, what's been challenging... whatever feels important. I'll remember everything and use it to build your personalized support plan.
            </p>
          </div>,
          1000
        );
        setProgress(20);
      }, 1000);
    }, 300);
  };

  // DYNAMIC insight extraction - extracts from actual user content
  const extractInsightsFromConversation = async (text: string): Promise<string[]> => {
    const insights: string[] = [];
    const combined = text.toLowerCase();
    
    // Extract specific behavioral challenges with context
    const behaviorPatterns = [
      { pattern: /(?:major |big |huge |terrible )?(?:meltdown|tantrum|outburst|explosion|breakdown)s?/i, insight: 'Managing intense emotional meltdowns and outbursts' },
      { pattern: /(?:getting|putting on|changing|won't wear) (?:dressed|clothes|clothing)/i, insight: 'Getting dressed triggers resistance and stress' },
      { pattern: /(?:won't|doesn't|refuses to|can't|struggles? (?:to|with)) (?:eat|eating|food|meals?)/i, insight: 'Mealtimes and eating are major challenges' },
      { pattern: /(?:bedtime|sleep|sleeping|won't sleep|can't sleep|night)/i, insight: 'Sleep and bedtime routines need support' },
      { pattern: /(?:potty|toilet|bathroom) training/i, insight: 'Working on potty training and bathroom independence' },
      { pattern: /(?:hitting|biting|kicking|aggressive|aggression|violent)/i, insight: 'Managing aggressive behaviors and physical responses' },
      { pattern: /(?:screaming|yelling|crying|screams)/i, insight: 'Frequent screaming and intense crying episodes' },
      { pattern: /(?:transition|transitions|change|changes|switching)/i, insight: 'Transitions between activities are difficult' },
      { pattern: /(?:morning|mornings|getting ready|school prep)/i, insight: 'Morning routines are chaotic and stressful' },
      { pattern: /(?:speech|language|talking|speak|communication|non-?verbal)/i, insight: 'Speech and communication development needs support' },
      { pattern: /(?:friends|friend|social|socially|play|playing with others)/i, insight: 'Building social skills and friendships' },
      { pattern: /(?:sensory|sensitive|sounds|textures|touch|loud)/i, insight: 'Sensory sensitivities impact daily activities' },
      { pattern: /(?:school|classroom|teacher|learning|homework)/i, insight: 'School environment and learning challenges' },
      { pattern: /(?:focus|attention|concentrat|adhd|hyperactive)/i, insight: 'Attention and focus are areas of concern' },
      { pattern: /(?:routine|structure|consistency|schedule)/i, insight: 'Need for consistent routines and structure' },
      { pattern: /(?:autism|asd|spectrum|autistic)/i, insight: 'Navigating autism spectrum needs' },
      { pattern: /(?:anxiety|anxious|worried|nervous|fearful|scared)/i, insight: 'Managing anxiety and worry' },
      { pattern: /(?:picky|selective) (?:eat|food)/i, insight: 'Selective eating and food challenges' }
    ];
    
    // Extract parent emotional state
    const parentStatePatterns = [
      { pattern: /(?:exhausted|drained|worn out|tired|so tired|no energy)/i, insight: 'You\'re feeling completely exhausted and drained' },
      { pattern: /(?:overwhelm|overwhelmed|drowning|can't keep up|too much)/i, insight: 'The overwhelm feels impossible to manage' },
      { pattern: /(?:alone|lonely|no one understands|isolated|by myself)/i, insight: 'You\'re feeling alone in this journey' },
      { pattern: /(?:don't know what to do|lost|confused|no idea|helpless)/i, insight: 'You\'re looking for clear direction and guidance' },
      { pattern: /(?:breaking|breaking down|can't do this|failing|not enough)/i, insight: 'You\'re at a breaking point and need support now' },
      { pattern: /(?:guilt|guilty|bad parent|failing|not doing enough)/i, insight: 'You\'re carrying heavy guilt and self-doubt' }
    ];
    
    // Extract goals and hopes
    const goalPatterns = [
      { pattern: /(?:want|need|hope|wish|would love) (?:to |for )?(?:calmer|peaceful|smooth|easier|better)/i, insight: 'Making daily life calmer and more peaceful' },
      { pattern: /(?:want|need|hope) (?:to |for )?(?:help|support|guide|teach)/i, insight: 'Seeking practical tools and strategies' },
      { pattern: /(?:independent|independence|by (?:himself|herself|themselves))/i, insight: 'Building your child\'s independence and confidence' },
      { pattern: /(?:happy|happier|joy|joyful|smile|smiling)/i, insight: 'Creating more joy and happiness in daily life' }
    ];
    
    // Match behavioral patterns
    behaviorPatterns.forEach(({ pattern, insight }) => {
      if (pattern.test(text) && !insights.includes(insight)) {
        insights.push(insight);
      }
    });
    
    // Match parent state patterns (max 1)
    let foundParentState = false;
    parentStatePatterns.forEach(({ pattern, insight }) => {
      if (!foundParentState && pattern.test(text) && !insights.includes(insight)) {
        insights.unshift(insight); // Add parent state first
        foundParentState = true;
      }
    });
    
    // Match goal patterns (max 1)
    let foundGoal = false;
    goalPatterns.forEach(({ pattern, insight }) => {
      if (!foundGoal && pattern.test(text) && !insights.includes(insight)) {
        insights.push(insight);
        foundGoal = true;
      }
    });
    
    // Smart fallback: Extract key phrases from user input
    if (insights.length === 0) {
      // Look for any action words or descriptive phrases
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      if (sentences.length > 0) {
        // Find the most substantive sentence
        const substantiveSentence = sentences.reduce((longest, current) => 
          current.length > longest.length ? current : longest
        );
        
        // Extract key concern
        const concernMatch = substantiveSentence.match(/(?:struggle|difficult|hard|challenge|problem|issue|concern)s?\s+(?:with|is)\s+(.{10,50})/i);
        if (concernMatch) {
          insights.push(`Working on: ${concernMatch[1].trim()}`);
        }
        
        // If still nothing, use a specific observation about their message
        if (insights.length === 0) {
          if (text.length > 100) {
            insights.push('You\'re sharing detailed context about your child\'s needs');
            insights.push('Looking for comprehensive support and strategies');
          } else if (combined.includes('help')) {
            insights.push('You\'re actively seeking help and guidance');
            insights.push('Ready to make positive changes');
          } else {
            insights.push('Understanding your child\'s unique developmental journey');
            insights.push('Building supportive routines that work for your family');
          }
        }
      } else {
        insights.push('Supporting your family\'s unique needs');
        insights.push('Creating practical, manageable strategies');
      }
    }
    
    return insights.slice(0, 3);
  };

  // Enhanced data extraction with better pattern matching
  const extractStructuredData = (text: string) => {
    const lower = text.toLowerCase();
    
    // Extract name with improved patterns
    let name = '';
    const namePatterns = [
      /(?:name is|named|called|this is|meet|he's|she's|my (?:son|daughter|child|kid))\s+([A-Z][a-z]+)/i,
      /^([A-Z][a-z]+)(?:\s+is|\s+has|\s+struggles|\s+needs)/i,
      /(?:my|our)\s+(?:son|daughter|child|kid),?\s+([A-Z][a-z]+)/i,
      /([A-Z][a-z]+)\s+(?:is|has|struggles|needs)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length > 1) {
        // Filter out common false positives
        const excluded = ['he', 'she', 'we', 'i', 'my', 'the', 'has', 'is', 'it'];
        if (!excluded.includes(match[1].toLowerCase())) {
          name = match[1];
          break;
        }
      }
    }
    
    // Extract age with improved patterns and validation
    let age = '';
    let ageIsValid = true;
    const agePatterns = [
      /(\d+)\s*(?:years?\s*old|year[s-]old|yr[s]?\.?\s*old|y\.?o\.?)/i,
      /age\s*(?:is|was|:|=)?\s*(\d+)/i,  // age is/was/:/= 5
      /(?:is|he's|she's|turning)\s+(\d+)/i,
      /(\d+)\s*year/i
    ];
    
    for (const pattern of agePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const ageNum = parseInt(match[1]);
        if (ageNum >= 1 && ageNum <= 18) { // Reasonable age range
          age = match[1];
          break;
        } else if (ageNum > 0) {
          // Age found but outside reasonable range
          ageIsValid = false;
          break;
        }
      }
    }
    
    // Check for invalid age inputs (single letters, gibberish, quotes)
    // Matches: "age is d", "age was 'd'", "age: t", "5 years old and d", etc.
    const invalidPatterns = [
      /(?:age|old)\s+(?:is|was|:|=)\s*['"]?([a-zA-Z])['"]?\b/i,  // age is/was 'd' or age is t
      /(?:age|old)\s+(?:and\s+)?([a-zA-Z])\b/i,  // age and d, old t
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(text)) {
        ageIsValid = false;
        break;
      }
    }
    
    return { name, age, ageIsValid };
  };
  
  // Validate user input
  const validateInput = (text: string): { isValid: boolean; clarification?: string } => {
    const trimmed = text.trim();
    
    // Check for age-related responses that might need clarification FIRST
    // This is more specific than length check
    const { age, ageIsValid } = extractStructuredData(trimmed);
    const hasAgeKeyword = /(?:age|old|years?|yr)/i.test(trimmed);
    
    // If they mention age but it's not valid (e.g., "age is t" or "50 years old")
    if (hasAgeKeyword && !age && ageIsValid === false) {
      return {
        isValid: false,
        clarification: "Could you let me know how old your child is in years? For example, '5 years old' or just '5'."
      };
    }
    
    // Only check length for the main story input, not super strict
    // Allow very short responses since some parents might be brief
    if (trimmed.length < 2) {
      return { 
        isValid: false, 
        clarification: "I want to make sure I understand you clearly. Could you share a bit more?" 
      };
    }
    
    return { isValid: true };
  };

  // Generate personalized starter routines
  const generateStarterRoutines = (): StarterRoutine[] => {
    const allRoutines: StarterRoutine[] = [
      {
        id: 'calm-morning',
        title: 'Calm Morning Routine',
        description: 'Visual schedule, sensory breaks, gentle transitions to start the day with ease',
        icon: '🌅',
        goals: ['Reduce morning stress', 'Build independence', 'Create predictability']
      },
      {
        id: 'speech-play',
        title: 'Speech Play',
        description: 'Daily 10-minute games that make language practice fun and natural',
        icon: '💬',
        goals: ['Expand vocabulary', 'Practice articulation', 'Build confidence']
      },
      {
        id: 'bedtime-winddown',
        title: 'Bedtime Wind-Down',
        description: 'Calming sequence with visual timer, sensory activities, and connection time',
        icon: '🌙',
        goals: ['Ease bedtime battles', 'Improve sleep quality', 'End day positively']
      },
      {
        id: 'emotion-toolkit',
        title: 'Emotion Toolkit',
        description: 'Quick regulation strategies for big feelings throughout the day',
        icon: '💙',
        goals: ['Manage meltdowns', 'Teach self-regulation', 'Build emotional awareness']
      },
      {
        id: 'social-practice',
        title: 'Social Practice',
        description: 'Structured play activities to build friendship skills naturally',
        icon: '🤝',
        goals: ['Practice turn-taking', 'Build social confidence', 'Strengthen connections']
      }
    ];
    
    // Intelligently select 3 based on insights
    const selected: StarterRoutine[] = [];
    const insights = extractedInsights.join(' ').toLowerCase();
    
    if (insights.includes('morning') || insights.includes('transition')) selected.push(allRoutines[0]);
    if (insights.includes('speech') || insights.includes('language')) selected.push(allRoutines[1]);
    if (insights.includes('bedtime') || insights.includes('sleep')) selected.push(allRoutines[2]);
    if (insights.includes('emotion') || insights.includes('meltdown') || insights.includes('feeling')) selected.push(allRoutines[3]);
    if (insights.includes('social') || insights.includes('friend')) selected.push(allRoutines[4]);
    
    // Fill to 3 routines with most relevant defaults
    while (selected.length < 3) {
      const remaining = allRoutines.filter(r => !selected.find(s => s.id === r.id));
      if (remaining.length > 0) {
        selected.push(remaining[0]);
      } else {
        break;
      }
    }
    
    return selected.slice(0, 3);
  };

  // Smart message handling - no re-asking!
  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;
    
    const userMessage = currentInput.trim();
    
    // Validate input
    const validation = validateInput(userMessage);
    if (!validation.isValid && validation.clarification) {
      addParentMessage(userMessage);
      setCurrentInput('');
      
      // Ask for clarification warmly
      setTimeout(() => {
        addAminyMessage(validation.clarification, 600);
      }, 200);
      return;
    }
    
    addParentMessage(userMessage);
    setCurrentInput('');
    
    // Update conversation history
    const newHistory = conversationHistory + '\n' + userMessage;
    setConversationHistory(newHistory);
    
    // Process based on step
    if (step === 'conversation') {
      // Extract structured data from every message
      const { name, age } = extractStructuredData(userMessage);
      if (name && !childName) setChildName(name);
      if (age && !childAge) setChildAge(age);

      // Store the message as challenges and context
      if (!recentChallenges) {
        setRecentChallenges(userMessage);
      } else {
        setRecentChallenges(prev => prev + '\n' + userMessage);
      }
      setParentGoals(userMessage);

      // Increment conversation turn
      const newTurn = conversationTurn + 1;
      setConversationTurn(newTurn);
      setWaitingForUserResponse(false);

      // Generate thoughtful follow-up questions based on conversation turn
      const generateFollowUpQuestion = (turn: number, content: string, extractedName: string, extractedAge: string) => {
        const lowerContent = content.toLowerCase();
        const childRef = extractedName || 'your child';

        // Turn 1: Initial response - acknowledge and show how Aminy helps with this specific issue
        if (turn === 1) {
          const hasStressIndicators = /overwhelm|exhaust|struggle|hard|difficult|chaotic|cry|frustrated|stress|anxious|worried|can't|fail/i.test(lowerContent);
          const hasBehaviorMention = /meltdown|tantrum|hitting|biting|scream|aggressive|won't|refuse/i.test(lowerContent);
          const hasSleepMention = /sleep|bedtime|night|wake/i.test(lowerContent);
          const hasRoutineMention = /morning|routine|transition|schedule/i.test(lowerContent);
          const hasSocialMention = /friend|social|school|play/i.test(lowerContent);

          let acknowledgment = extractedName
            ? `Thank you for trusting me with ${extractedName}'s story. `
            : `Thank you for sharing that with me. `;

          if (hasStressIndicators) {
            acknowledgment += `I can hear how much you're carrying. `;
          }

          // Ask a specific follow-up based on what they mentioned + value hook
          if (hasBehaviorMention) {
            return {
              message: (
                <div className="space-y-2">
                  <p>{acknowledgment}Managing big reactions is exhausting — especially when you don't know what's coming next.</p>
                  <p className="text-sm text-teal-700 bg-teal-50 p-2 rounded-lg">💡 <strong>This is exactly what I'm built for.</strong> I'll help you understand the "why" behind the behavior and give you in-the-moment strategies that actually work.</p>
                </div>
              ),
              question: `Can you tell me more about when these moments tend to happen? Knowing the triggers helps me build you a prevention plan, not just a reaction plan.`
            };
          } else if (hasSleepMention) {
            return {
              message: (
                <div className="space-y-2">
                  <p>{acknowledgment}Sleep issues affect <em>everything</em> — your child's mood, your energy, the whole household.</p>
                  <p className="text-sm text-teal-700 bg-teal-50 p-2 rounded-lg">💡 <strong>I've helped hundreds of families fix sleep.</strong> I'll create a personalized bedtime routine based on what's actually happening, not generic advice.</p>
                </div>
              ),
              question: `What does a typical bedtime look like right now? Walk me through it — the more detail, the better I can help.`
            };
          } else if (hasRoutineMention) {
            return {
              message: (
                <div className="space-y-2">
                  <p>{acknowledgment}When routines don't work, every day feels like a battle.</p>
                  <p className="text-sm text-teal-700 bg-teal-50 p-2 rounded-lg">💡 <strong>I'll build you visual schedules, transition warnings, and step-by-step routines</strong> — customized for ${childRef}'s needs. No more chaos.</p>
                </div>
              ),
              question: `Which part of the day feels most chaotic? Morning, transitions between activities, or evening wind-down?`
            };
          } else if (hasSocialMention) {
            return {
              message: (
                <div className="space-y-2">
                  <p>{acknowledgment}Watching your child struggle socially is heartbreaking.</p>
                  <p className="text-sm text-teal-700 bg-teal-50 p-2 rounded-lg">💡 <strong>I specialize in social skill building</strong> — structured activities, conversation scripts, play scenarios designed for how ${childRef} thinks.</p>
                </div>
              ),
              question: `What does ${childRef} enjoy doing? Understanding their interests helps me create connection opportunities that feel natural.`
            };
          } else {
            return {
              message: (
                <div className="space-y-2">
                  <p>{acknowledgment}Every family's situation is unique — that's why I don't do cookie-cutter advice.</p>
                  <p className="text-sm text-teal-700 bg-teal-50 p-2 rounded-lg">💡 <strong>The more you share, the more personalized I become.</strong> I'll remember everything and build strategies specifically for your family.</p>
                </div>
              ),
              question: `What's the one thing that, if it got even a little bit better, would make the biggest difference for your family right now?`
            };
          }
        }

        // Turn 2: Dig deeper into goals + show transformation possibility
        if (turn === 2) {
          return {
            message: (
              <div className="space-y-2">
                <p>This is so helpful — I'm already thinking about strategies for ${childRef}.</p>
                <p className="text-gray-600">Now I want to understand what success looks like for <em>you</em>.</p>
              </div>
            ),
            question: `When you imagine things going well, what does a good day look like? What would change about your mornings, your stress level, your relationship with ${childRef}?`
          };
        }

        // Turn 3: Wrap up + build anticipation for the plan
        if (turn === 3) {
          return {
            message: (
              <div className="space-y-2">
                <p>You clearly know ${childRef} incredibly well. That knowledge + my expertise? That's a powerful combination.</p>
                <p className="text-gray-600">I'm almost ready to build your personalized plan...</p>
              </div>
            ),
            question: `One last thing — what are ${childRef}'s strengths or interests we can build on? The best strategies use what's already working.`
          };
        }

        return null; // Ready to move forward
      };

      // Handle based on conversation turn
      if (newTurn <= 3) {
        setProgress(20 + (newTurn * 15)); // Progress: 35, 50, 65

        const followUp = generateFollowUpQuestion(newTurn, newHistory, name || childName, age || childAge);

        if (followUp) {
          setTimeout(() => {
            // First show the acknowledgment/value message
            addAminyMessage(followUp.message, 600 + (Math.random() * 300));

            // Then show the follow-up question after a natural pause
            setTimeout(() => {
              addAminyMessage(
                <p className="text-gray-800 font-medium">{followUp.question}</p>,
                700 + (Math.random() * 300)
              );
              setWaitingForUserResponse(true);
            }, 1200);
          }, 400);
        }

        if (!hasReceivedFirstMessage) {
          setHasReceivedFirstMessage(true);
        }
      } else {
        // Turn 4+: Now we're ready to summarize and move forward
        setProgress(75);

        setTimeout(async () => {
          const childRef = childName || 'your child';
          const ageContext = childAge ? ` (${childAge} years old)` : '';

          addAminyMessage(
            <div className="space-y-2">
              <p className="font-medium">Okay, I've got a clear picture now. Let me show you what I'm going to do for you...</p>
            </div>,
            600
          );

          // Extract insights and create summary
          setTimeout(async () => {
            const insights = await extractInsightsFromConversation(newHistory);
            setExtractedInsights(insights);

            addAminyMessage(
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-900 mb-2">What I heard about {childRef}{ageContext}:</p>
                  <ul className="space-y-2">
                    {insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-teal-50 to-blue-50 p-4 rounded-xl border border-teal-200">
                  <p className="font-semibold text-gray-900 mb-2">Here's how I'm going to help:</p>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold">→</span>
                      <span><strong>Daily strategies</strong> sent right when you need them</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold">→</span>
                      <span><strong>In-the-moment support</strong> when things get hard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold">→</span>
                      <span><strong>Progress tracking</strong> so you can see what's working</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold">→</span>
                      <span><strong>A plan that evolves</strong> as {childRef} grows</span>
                    </li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600 italic">
                  No more researching at midnight. No more second-guessing yourself. Just clear, expert guidance whenever you need it.
                </p>
              </div>,
              1400
            );

            setProgress(85);

            // Move to routines after summary
            setTimeout(() => {
              addAminyMessage(
                <div className="space-y-3">
                  <p className="font-medium">I've created three starter routines based on everything you shared.</p>
                  <p className="text-gray-600">These are your first wins — quick strategies you can start using today. Pick what feels most urgent for your family.</p>
                  <p className="text-sm text-teal-700 font-medium">Once you're in, I'll expand these into a full personalized care plan.</p>
                </div>,
                1200
              );

              setTimeout(() => {
                setStep('routines');
                setProgress(90);
              }, 1400);
            }, 2200);
          }, 1200);
        }, 400);
      }
    }
  };

  // Handle routine selection
  const handleRoutineToggle = (routineId: string) => {
    setSelectedRoutines(prev =>
      prev.includes(routineId)
        ? prev.filter(id => id !== routineId)
        : [...prev, routineId]
    );
  };

  // Handle complete
  const handleComplete = () => {
    setProgress(95);

    // Show strong closing message focused on value and transformation
    const childRef = childName || 'your child';

    addAminyMessage(
      <div className="space-y-3">
        <p className="text-lg font-medium text-gray-900">
          You just did something most parents never do.
        </p>
        <p className="text-gray-700">
          You stopped trying to figure it out alone. You asked for help. That takes courage — and it's going to change everything.
        </p>
      </div>,
      500
    );

    setTimeout(() => {
      addAminyMessage(
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-teal-500 to-blue-500 text-white p-5 rounded-xl">
            <p className="font-semibold text-lg mb-3">Here's what happens next:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>I build {childRef}'s <strong>complete care plan</strong> based on everything you shared</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>You get <strong>daily strategies</strong> delivered at the right moments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>I'm here <strong>24/7</strong> when things get hard (and they will — I'll be ready)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>Together, we track progress and celebrate wins — <strong>big and small</strong></span>
              </li>
            </ul>
          </div>

          <div className="text-center space-y-3">
            <p className="text-gray-700 font-medium">
              Imagine waking up tomorrow with a plan. With support. With someone in your corner.
            </p>
            <p className="text-sm text-gray-500">
              That's what this is. No more Googling. No more guessing. Just real help.
            </p>
          </div>

          <div className="border-t pt-4">
            <Button
              onClick={handleStartTrial}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white h-14 text-lg font-semibold shadow-lg"
            >
              Start My 7-Day Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
              <span>✓ No credit card</span>
              <span>✓ Cancel anytime</span>
              <span>✓ Full access</span>
            </div>
          </div>

          <p className="text-xs text-center text-gray-400">
            After your trial: continue free with limited features, or unlock everything for less than a coffee a day.
          </p>
        </div>,
        1400
      );

      setProgress(100);
    }, 1800);
  };

  const handleStartTrial = () => {
    onComplete({
      childName: childName || 'Child',
      childAge: childAge || 'Not specified',
      recentChallenges: recentChallenges || conversationHistory,
      parentGoals: parentGoals || conversationHistory,
      selectedRoutines: selectedRoutines.length > 0 ? selectedRoutines : generateStarterRoutines().map(r => r.id).slice(0, 2),
      selectedTier: 'core',
      chatTranscript: messages
    });
  };

  // Voice input using Web Speech API
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setCurrentInput((prev) => prev + (prev ? ' ' : '') + finalTranscript);
          toast.success('Got it!');
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'no-speech') {
          toast.info("I didn't hear anything. Try again?");
        } else if (event.error === 'not-allowed') {
          toast.error('Please enable microphone access to use voice input.');
        } else {
          toast.error("Voice features aren't available right now — but typing works great!");
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error("Voice features aren't available on this device yet — but typing works great!");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info('Listening... speak now', { duration: 2000 });
      } catch {
        toast.error("Couldn't start voice input. Try typing instead.");
      }
    }
  };

  const starterRoutines = generateStarterRoutines();

  // Get current step index for breadcrumbs
  const getCurrentStepIndex = () => {
    if (step === 'intro') return 0;
    if (step === 'empathy') return 1;
    if (step === 'conversation') return 2;
    if (step === 'summary') return 3;
    if (step === 'routines') return 4;
    return 5;
  };

  return (
    <div className="h-screen bg-gradient-to-b from-teal-50 via-white to-blue-50 flex flex-col overflow-hidden">
      {/* Header with Progress Breadcrumbs */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4 shrink-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <CompassIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Building Your Plan</h1>
                <p className="text-xs text-gray-500">
                  {step === 'intro' || step === 'empathy' ? 'Let\'s get started' :
                   step === 'conversation' ? 'Learning about your family' :
                   step === 'routines' ? 'Your personalized strategies' :
                   'Almost there!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Skip option for returning users */}
              {isReturningUser && onSkipOnboarding && step !== 'routines' && step !== 'complete' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkipOnboarding}
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >
                  <FastForward className="w-3 h-3 mr-1" />
                  Skip to dashboard
                </Button>
              )}
              <Badge variant="outline" className="text-teal-600 border-teal-200 text-xs">
                <Heart className="w-3 h-3 mr-1" />
                Private & secure
              </Badge>
            </div>
          </div>

          {/* Progress Breadcrumbs */}
          <div className="flex items-center gap-1 mb-2">
            {ONBOARDING_STEPS.map((stepDef, index) => {
              const isActive = index === getCurrentStepIndex();
              const isComplete = index < getCurrentStepIndex();
              return (
                <React.Fragment key={stepDef.id}>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      isActive
                        ? 'bg-teal-100 text-teal-700 font-medium'
                        : isComplete
                          ? 'text-teal-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {isComplete && <CheckCircle2 className="w-3 h-3" />}
                    <span className="hidden sm:inline">{stepDef.label}</span>
                    <span className="sm:hidden">{index + 1}</span>
                  </div>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div className={`w-4 h-0.5 ${isComplete ? 'bg-teal-400' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Chat Container - Scrollable with proper spacing */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-6"
        style={{ 
          scrollBehavior: 'smooth'
        }}
      >
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.type === 'parent' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-start gap-2 max-w-[85%]">
                  {message.type === 'aminy' && (
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CompassIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`flex-1 rounded-2xl px-4 py-3 ${
                      message.type === 'aminy'
                        ? 'bg-white border border-gray-200 shadow-sm'
                        : 'bg-teal-500 text-white'
                    }`}
                  >
                    {typeof message.content === 'string' ? (
                      message.content === 'empathy-buttons' ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">Before we start, how are you feeling right now?</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEmpathyResponse('stressed')}
                              className="text-xs"
                            >
                              😓 Overwhelmed
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEmpathyResponse('calm')}
                              className="text-xs"
                            >
                              😌 Managing okay
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEmpathyResponse('hopeful')}
                              className="text-xs"
                            >
                              🌟 Ready for change
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      )
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CompassIcon className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Starter Routines Display */}
          {step === 'routines' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-4"
            >
              <Card className="p-5 border-teal-200 bg-white/80">
                <h3 className="font-medium text-gray-900 mb-2">Here are three routines made for {childName || 'your family'}:</h3>
                <p className="text-sm text-gray-600 mb-4">Each one is designed around what you shared{childName ? ` about ${childName}` : ''}. Choose what feels right to start.</p>
                
                <div className="space-y-3">
                  {starterRoutines.map((routine) => (
                    <div
                      key={routine.id}
                      className={`w-full p-4 rounded-xl border-2 transition-all ${
                        selectedRoutines.includes(routine.id)
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-3xl">{routine.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{routine.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{routine.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {routine.goals.map((goal, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {goal}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRoutineToggle(routine.id)}
                        variant={selectedRoutines.includes(routine.id) ? 'default' : 'outline'}
                        className={`w-full ${
                          selectedRoutines.includes(routine.id)
                            ? 'bg-teal-500 hover:bg-teal-600 text-white'
                            : 'border-teal-300 text-teal-600 hover:bg-teal-50'
                        }`}
                        size="sm"
                      >
                        {selectedRoutines.includes(routine.id) ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          <>Try now</>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleComplete}
                  className="w-full mt-4 bg-[#1e293b] hover:bg-[#0f172a] text-white"
                  disabled={selectedRoutines.length === 0}
                  size="lg"
                >
                  Continue with {selectedRoutines.length} routine{selectedRoutines.length !== 1 ? 's' : ''}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-xs text-center text-gray-500 mt-2">
                  You can change these anytime
                </p>
              </Card>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
          
          {/* Spacer to ensure last message is visible above input */}
          {step === 'conversation' && <div className="h-4" />}
        </div>
      </div>

      {/* Input Area - Pinned to bottom of container */}
      {step === 'conversation' && (
        <div className="bg-white border-t border-gray-200 px-4 py-4 pb-safe shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="max-w-2xl mx-auto">
            {/* Voice-first toggle */}
            {conversationTurn === 0 && !currentInput && (
              <div className="flex items-center justify-center gap-4 mb-3">
                <button
                  onClick={() => setUseVoiceFirst(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
                    !useVoiceFirst
                      ? 'bg-teal-100 text-teal-700 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  Type
                </button>
                <button
                  onClick={() => setUseVoiceFirst(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
                    useVoiceFirst
                      ? 'bg-teal-100 text-teal-700 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  Speak
                </button>
              </div>
            )}

            {/* Voice-first mode */}
            {useVoiceFirst && conversationTurn === 0 ? (
              <div className="flex flex-col items-center gap-3">
                <VoiceInputButton
                  variant="floating"
                  size="lg"
                  onTranscript={(transcript, isFinal) => {
                    if (isFinal && transcript.trim()) {
                      setCurrentInput(transcript);
                      setUseVoiceFirst(false);
                      // Auto-submit after voice
                      setTimeout(() => {
                        handleSendMessage();
                      }, 500);
                    }
                  }}
                  placeholder="Tap and tell me about your child..."
                />
                <button
                  onClick={() => setUseVoiceFirst(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  I'd rather type
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      value={currentInput}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Auto-capitalize first letter
                        if (value.length > 0 && currentInput.length === 0) {
                          value = value.charAt(0).toUpperCase() + value.slice(1);
                        }
                        setCurrentInput(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={conversationTurn === 0
                        ? "Tell me about your child and what's been on your mind..."
                        : "Share more details..."}
                      className="pr-12 resize-none"
                      rows={3}
                      autoFocus
                      autoCapitalize="sentences"
                      autoCorrect="on"
                      spellCheck={true}
                    />
                    <button
                      onClick={handleVoiceInput}
                      className={`absolute right-2 bottom-2 p-2 rounded-lg transition-colors ${
                        isListening
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Voice input"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim() || isTyping}
                    className="bg-teal-500 hover:bg-teal-600 text-white h-[88px] px-6"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  🔒 Everything you share helps me build your personalized plan
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
