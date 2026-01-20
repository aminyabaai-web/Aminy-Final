import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { generateAIResponse, validateUserInput } from '../lib/ai-conversation';
import * as ConvoResponses from '../lib/conversational-responses';
import { ImageWithFallback } from './figma/ImageWithFallback';
import compassIcon from 'figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png';
import { 
  ArrowRight,
  Mic,
  Heart,
  Shield,
  CheckCircle2,
  Sparkles,
  Target,
  Video,
  FileText,
  BarChart3,
  MessageCircle,
  Users,
  Calendar,
  Stethoscope,
  Check,
  Send,
  ChevronDown,
  X
} from 'lucide-react';

// Type Definitions
interface OnboardingData {
  childName?: string;
  childAge?: string;
  childGender?: string;
  morningChallenges: string;
  mainWorries: string;
  developmentalConcerns?: {
    hasConcerns: boolean;
    areas: string[];
    details: string;
  };
  insurance?: {
    hasInsurance: boolean;
    planType?: string;
    state?: string;
  };
  selectedTier: 'free' | 'core' | 'pro';
  priorities: string[];
  planSettings: {
    aiGuidance: boolean;
    gentleReminders: boolean;
    progressTracking: boolean;
  };
  chatTranscript?: ConversationMessage[];
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  initialData?: {
    email?: string;
  };
}

interface ConversationMessage {
  id: string;
  type: 'aminy' | 'parent';
  content: string | React.ReactNode;
  timestamp: Date;
  summary?: string[];
}

type QuestionKey = 
  | 'welcome'
  | 'child_name'
  | 'child_age'
  | 'initial_brain_dump'
  | 'mornings'
  | 'school'
  | 'evenings'
  | 'hygiene'
  | 'speech'
  | 'social'
  | 'behavior'
  | 'sensory'
  | 'summary'
  | 'insurance'
  | 'plan_selection'
  | 'complete';

interface QuestionDefinition {
  key: QuestionKey;
  aminyMessage: string | ((context: any) => string);
  skipable?: boolean;
  inputType?: 'text' | 'radio' | 'none' | 'plan-selection';
  placeholder?: string;
  options?: { value: string; label: string }[];
  shouldAsk?: (responses: Map<QuestionKey, any>) => boolean;
}

// Conversational Onboarding Component
export const OnboardingFlow5Steps: React.FC<OnboardingFlowProps> = ({ onComplete, initialData }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionKey>('welcome');
  const [responses, setResponses] = useState<Map<QuestionKey, any>>(new Map());
  const [currentInput, setCurrentInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedTier, setSelectedTier] = useState<'free' | 'core' | 'pro'>('core');
  const [insuranceData, setInsuranceData] = useState({ hasInsurance: false, planType: '', state: '' });
  const [devConcerns, setDevConcerns] = useState({ hasConcerns: false, areas: [] as string[], details: '' });
  
  // Child information state
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  
  // AI conversation history for GPT context
  const [aiConversationHistory, setAiConversationHistory] = useState<{role: string; content: string}[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const isLoadingInitialGreeting = useRef(false);

  // Helper functions for adding messages
  const addAminyMessage = (content: string | React.ReactNode, questionKey?: QuestionKey) => {
    const message: ConversationMessage = {
      id: `aminy-${Date.now()}`,
      type: 'aminy',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const addParentMessage = (content: string, summary?: string[]) => {
    const message: ConversationMessage = {
      id: `parent-${Date.now()}`,
      type: 'parent',
      content,
      summary,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  // Auto-scroll to bottom when new messages arrive - improved for reliability
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    // Use both scrollIntoView and scrollTop for better compatibility
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
    
    // Also scroll the container itself
    if (chatContainerRef.current) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message (run once on mount)
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const timer = setTimeout(() => {
      if (messages.length === 0) {
        addAminyMessage(
          "Hey there 👋 I'm Aminy — and I'm here to help make things easier. Let me ask you a few quick questions so I can personalize everything just for your family.",
          'welcome'
        );
        setCurrentQuestion('child_name');
        
        // After brief pause, AI asks for the name naturally
        setTimeout(async () => {
          // Prevent duplicate AI calls in React Strict Mode
          if (isLoadingInitialGreeting.current) {
            return;
          }
          isLoadingInitialGreeting.current = true;
          
          setIsAiThinking(true);
          try {
            const aiResponse = await generateAIResponse([], {
              step: 'asking_name',
              childName,
              childAge
            });
            addAminyMessage(aiResponse.message, 'child_name');
            setAiConversationHistory([{ role: 'assistant', content: aiResponse.message }]);
            setIsAiThinking(false);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error('Initial AI greeting error:', error);
            }
            // Fallback to a friendly ask
            addAminyMessage("What's your child's name?", 'child_name');
            setIsAiThinking(false);
          }
        }, 800);
        
        // Force scroll to bottom after initial message
        setTimeout(() => scrollToBottom('auto'), 200);
      }
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Ensure scroll to bottom on mount
  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom('auto'), 300);
    return () => clearTimeout(timer);
  }, []);

  // Analyze response and generate summary bullets
  const analyzeBrainDump = (text: string): string[] => {
    const summary: string[] = [];
    const lower = text.toLowerCase();
    
    if (lower.includes('morning') || lower.includes('wake') || lower.includes('breakfast') || lower.includes('dress')) {
      summary.push('Morning routines can be challenging');
    }
    if (lower.includes('tantrum') || lower.includes('meltdown') || lower.includes('cry') || lower.includes('upset')) {
      summary.push('Big emotions and meltdowns are frequent');
    }
    if (lower.includes('speech') || lower.includes('talk') || lower.includes('language') || lower.includes('word')) {
      summary.push('Speech and communication development are concerns');
    }
    if (lower.includes('school') || lower.includes('teacher') || lower.includes('class')) {
      summary.push('School experiences need support');
    }
    if (lower.includes('sleep') || lower.includes('bedtime') || lower.includes('night')) {
      summary.push('Sleep and bedtime routines are difficult');
    }
    if (lower.includes('food') || lower.includes('eat') || lower.includes('meal') || lower.includes('picky')) {
      summary.push('Eating and mealtimes can be tough');
    }
    if (lower.includes('friend') || lower.includes('social') || lower.includes('play') || lower.includes('other kid')) {
      summary.push('Social interaction with peers is a focus');
    }
    if (lower.includes('sensory') || lower.includes('loud') || lower.includes('texture') || lower.includes('touch')) {
      summary.push('Sensory sensitivities are present');
    }
    if (lower.includes('potty') || lower.includes('toilet') || lower.includes('bath') || lower.includes('teeth') || lower.includes('hygiene')) {
      summary.push('Hygiene routines need attention');
    }
    if (lower.includes('transition') || lower.includes('change') || lower.includes('new')) {
      summary.push('Transitions and changes are hard');
    }
    if (lower.includes('insurance') || lower.includes('coverage') || lower.includes('afford') || lower.includes('cost') || lower.includes('money')) {
      summary.push('Insurance and cost concerns are top of mind');
    }
    
    if (summary.length === 0) {
      summary.push('Daily routines feel overwhelming');
      summary.push('You\'re looking for guidance and support');
    }
    
    return summary;
  };

  // Determine which follow-up questions to ask based on initial response
  const determineFollowUpQuestions = (brainDump: string): QuestionKey[] => {
    const questions: QuestionKey[] = [];
    const lower = brainDump.toLowerCase();
    
    // Only ask 1-2 targeted follow-ups to keep it brief (under 3 min)
    let followUpCount = 0;
    const maxFollowUps = 2;
    
    // Prioritize questions that appear most relevant
    if (followUpCount < maxFollowUps && (lower.includes('morning') || lower.includes('wake') || lower.includes('breakfast') || lower.includes('dress'))) {
      questions.push('mornings');
      followUpCount++;
    }
    if (followUpCount < maxFollowUps && (lower.includes('school') || lower.includes('teacher') || lower.includes('class'))) {
      questions.push('school');
      followUpCount++;
    }
    if (followUpCount < maxFollowUps && (lower.includes('bedtime') || lower.includes('sleep') || lower.includes('evening') || lower.includes('night'))) {
      questions.push('evenings');
      followUpCount++;
    }
    if (followUpCount < maxFollowUps && (lower.includes('speech') || lower.includes('talk') || lower.includes('word') || lower.includes('language'))) {
      questions.push('speech');
      followUpCount++;
    }
    if (followUpCount < maxFollowUps && (lower.includes('potty') || lower.includes('toilet') || lower.includes('bath') || lower.includes('teeth') || lower.includes('hygiene'))) {
      questions.push('hygiene');
      followUpCount++;
    }
    if (followUpCount < maxFollowUps && (lower.includes('tantrum') || lower.includes('meltdown') || lower.includes('cry') || lower.includes('upset'))) {
      questions.push('behavior');
      followUpCount++;
    }
    
    // No insurance question - go straight to summary and plan selection
    return questions;
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.info('Voice input not supported in this browser. Please type your response.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info('Listening... Speak now');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setCurrentInput(prev => prev ? `${prev} ${transcript}` : transcript);
      toast.success('Voice input captured');
    };

    recognition.onerror = () => {
      toast.error('Voice input failed. Please try typing instead.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSendMessage = () => {
    // Allow sending on welcome and plan_selection without text input
    const questionsWithoutTextInput = ['welcome', 'plan_selection'];
    if (!currentInput.trim() && !questionsWithoutTextInput.includes(currentQuestion)) return;

    // Handle different question types (welcome is skipped - we go straight to asking name)
    if (currentQuestion === 'welcome') {
      // This should not happen anymore since we start with child_name
      setCurrentQuestion('child_name');
      
    } else if (currentQuestion === 'child_name') {
      const userInput = currentInput.trim();
      addParentMessage(userInput);
      setCurrentInput('');
      
      // Let AI handle everything - no frontend validation
      setIsAiThinking(true);
      const newHistory = [...aiConversationHistory, { role: 'user', content: userInput }];
      
      setTimeout(async () => {
        try {
          const aiResponse = await generateAIResponse(newHistory, {
            step: 'asking_name',
            childName,
            childAge
          });
          
          // Check if AI extracted a valid name from the response
          const extractedName = aiResponse.detectedName;
          
          if (extractedName && extractedName !== childName) {
            // AI found a valid name - save it and move to age question
            setChildName(extractedName);
            responses.set('child_name', extractedName);
            setProgress(20);
            setCurrentQuestion('child_age');
          }
          // If no valid name, AI will ask again naturally (we stay on child_name question)
          
          addAminyMessage(aiResponse.message, extractedName ? 'child_age' : 'child_name');
          setAiConversationHistory([...newHistory, { role: 'assistant', content: aiResponse.message }]);
          setIsAiThinking(false);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);

          // Only log detailed errors in development
          if (import.meta.env.DEV) {
            console.error('❌ AI response error:', error);
            console.error('Error details:', errorMsg);

            // If it's an API key error, show a helpful message
            if (errorMsg.includes('ANTHROPIC_API_KEY') || errorMsg.includes('not configured')) {
              console.error('⚠️ ANTHROPIC_API_KEY is not configured in the Supabase Edge Function environment');
              console.error('Please configure ANTHROPIC_API_KEY as an environment secret in Supabase');
            }
          }
          
          // Show user-friendly error message
          addAminyMessage("Oops! I'm having trouble connecting right now. Let me try a simpler approach - what's your child's name?", 'child_name');
          setIsAiThinking(false);
        }
      }, 600);
      
    } else if (currentQuestion === 'child_age') {
      const userInput = currentInput.trim();
      addParentMessage(userInput);
      setCurrentInput('');
      
      // Let AI handle everything - no frontend validation
      setIsAiThinking(true);
      const newHistory = [...aiConversationHistory, { role: 'user', content: userInput }];
      
      setTimeout(async () => {
        try {
          const aiResponse = await generateAIResponse(newHistory, {
            step: 'asking_age',
            childName,
            childAge
          });
          
          // Check if AI extracted a valid age
          const extractedAge = aiResponse.detectedAge;
          
          if (extractedAge && extractedAge !== childAge) {
            // AI found a valid age - save it and move to main story
            setChildAge(extractedAge);
            responses.set('child_age', extractedAge);
            setProgress(30);
            setCurrentQuestion('initial_brain_dump');
          }
          // If no valid age, AI will ask again naturally (stay on child_age question)
          
          addAminyMessage(aiResponse.message, extractedAge ? 'initial_brain_dump' : 'child_age');
          setAiConversationHistory([...newHistory, { role: 'assistant', content: aiResponse.message }]);
          setIsAiThinking(false);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('AI response error:', error);
          }
          addAminyMessage(`How old is ${childName}?`, 'child_age');
          setIsAiThinking(false);
        }
      }, 600);
      
    } else if (currentQuestion === 'initial_brain_dump') {
      const userInput = currentInput.trim();
      addParentMessage(userInput);
      responses.set('initial_brain_dump', userInput);
      setCurrentInput('');
      setProgress(50);
      
      // Use AI for intelligent follow-up conversation
      setIsAiThinking(true);
      const newHistory = [...aiConversationHistory, { role: 'user', content: userInput }];
      
      setTimeout(async () => {
        try {
          const aiResponse = await generateAIResponse(newHistory, {
            step: 'main_story',
            childName,
            childAge
          });
          
          addAminyMessage(aiResponse.message);
          setAiConversationHistory([...newHistory, { role: 'assistant', content: aiResponse.message }]);
          setIsAiThinking(false);
          
          // After 1-2 AI exchanges, move to summary
          // Count how many exchanges we've had
          const exchangeCount = newHistory.filter(m => m.role === 'user').length;
          
          if (exchangeCount >= 3) {
            // Had enough conversation, move to summary
            setProgress(70);
            setTimeout(() => {
              showSummaryAndPlan();
            }, 1000);
          } else {
            // Continue the conversation
            setProgress(prev => Math.min(prev + 10, 65));
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('AI response error:', error);
          }
          addAminyMessage(`I hear you. Tell me more about what's challenging with ${childName}.`);
          setIsAiThinking(false);
        }
      }, 600);
      
    } else if (currentQuestion === 'insurance') {
      // Handle insurance response from button clicks
      if (insuranceData.hasInsurance) {
        addParentMessage('Yes, I have insurance');
      } else if (currentInput && currentInput.toLowerCase().includes('skip')) {
        addParentMessage("I'll skip this for now");
      } else {
        addParentMessage('No, not currently');
      }
      responses.set('insurance', insuranceData);
      setCurrentInput('');
      setProgress(88);
      
      setTimeout(() => {
        addAminyMessage(
          `Perfect! Now let's choose the plan that's right for ${childName}. You'll start with a 7-day free trial of Core—no credit card required.`
        );
        setTimeout(() => {
          setCurrentQuestion('plan_selection');
          setProgress(90);
        }, 400);
      }, 600);
      
    } else if (currentQuestion === 'plan_selection') {
      const tierNames = { free: 'Starter', core: 'Core', pro: 'Plus' };
      addParentMessage(`I'll go with the ${tierNames[selectedTier]} plan`);
      responses.set('selectedTier', selectedTier);
      setProgress(100);
      
      setTimeout(() => {
        completeOnboarding();
      }, 800);
      
    } else {
      // Regular follow-up question
      addParentMessage(currentInput);
      responses.set(currentQuestion, currentInput);
      setCurrentInput('');
      setProgress(prev => Math.min(prev + 10, 65));
      
      setTimeout(() => {
        askNextFollowUp();
      }, 800);
    }
  };

  const askNextFollowUp = () => {
    const followUpQueue = responses.get('followUpQueue') as QuestionKey[] || [];
    
    if (followUpQueue.length > 0) {
      const nextQuestion = followUpQueue.shift();
      responses.set('followUpQueue', followUpQueue);
      
      const name = childName || 'your child';
      
      const questionTexts: Record<string, string> = {
        mornings: `Quick question: What specifically makes mornings with ${name} challenging?`,
        school: `And how are things going at school for ${name}?`,
        evenings: `What does bedtime usually look like with ${name}?`,
        speech: `Can you tell me a bit about ${name}'s speech and communication?`,
        hygiene: `How are things like potty training, bath time, or teeth brushing going?`,
        behavior: `When do the meltdowns or big emotions usually happen with ${name}?`,
        sensory: `Have you noticed any sensory sensitivities? (loud sounds, textures, etc.)`
      };
      
      if (nextQuestion && questionTexts[nextQuestion]) {
        setProgress(prev => Math.min(prev + 10, 65));
        addAminyMessage(questionTexts[nextQuestion]);
        setCurrentQuestion(nextQuestion);
      } else {
        askNextFollowUp(); // Skip if question not found
      }
    } else {
      // All follow-ups done, go to summary
      setProgress(70);
      setTimeout(() => {
        showSummaryAndPlan();
      }, 600);
    }
  };

  const showSummaryAndPlan = () => {
    setProgress(80);
    
    // Generate personalized summary and goals
    const brainDump = responses.get('initial_brain_dump') as string || '';
    const themes = analyzeBrainDump(brainDump);
    const goals = generateGoals(brainDump, responses);
    
    const summaryContent = (
      <div className="space-y-4">
        <p className="font-medium">Perfect! Here's your personalized starter plan for {childName}:</p>
        
        {/* Starter Goals */}
        <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-xl p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            Starter Goals (Next 2-3 Weeks)
          </h4>
          <ul className="space-y-2.5">
            {goals.slice(0, 3).map((goal, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span className="font-medium">{goal}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Key Themes */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">Focus Areas:</p>
          <div className="flex flex-wrap gap-1.5">
            {themes.slice(0, 4).map((theme, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {theme}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
    
    addAminyMessage(summaryContent);
    
    // Ask insurance question next
    setTimeout(() => {
      setCurrentQuestion('insurance');
      setTimeout(() => {
        addAminyMessage(
          `By the way, do you have any insurance coverage for therapy or services? This helps us tailor support and maximize your benefits, but it's completely optional and you can skip. Insurance isn't required to use Aminy.`
        );
      }, 400);
    }, 1200);
  };

  const generateGoals = (brainDump: string, responses: Map<QuestionKey, any>): string[] => {
    const goals: string[] = [];
    const lower = brainDump.toLowerCase();
    
    if (lower.includes('morning') || lower.includes('routine')) {
      goals.push('Create a visual morning routine chart with 3-5 simple steps');
    }
    if (lower.includes('tantrum') || lower.includes('meltdown')) {
      goals.push('Practice one calming technique daily (deep breaths, safe space)');
    }
    if (lower.includes('speech') || lower.includes('communication')) {
      goals.push('Schedule speech evaluation and explore insurance coverage');
    }
    if (lower.includes('sleep') || lower.includes('bedtime')) {
      goals.push('Establish a consistent bedtime routine with visual cues');
    }
    if (lower.includes('school')) {
      goals.push('Set up communication system with teacher for daily updates');
    }
    if (lower.includes('social') || lower.includes('friend')) {
      goals.push('Arrange one structured playdate per week with support');
    }
    
    // Default goals if none detected
    if (goals.length === 0) {
      goals.push('Establish one consistent daily routine that works for your family');
      goals.push('Identify your top 2 support priorities and create action steps');
    }
    
    return goals.slice(0, 3);
  };

  const completeOnboarding = () => {
    const brainDump = responses.get('initial_brain_dump') as string || '';
    
    // Extract priorities
    const priorities: string[] = [];
    const combinedText = brainDump.toLowerCase();
    
    if (combinedText.includes('morning') || combinedText.includes('routine')) {
      priorities.push('mornings');
    }
    if (combinedText.includes('tantrum') || combinedText.includes('meltdown')) {
      priorities.push('meltdowns');
    }
    if (combinedText.includes('speech') || combinedText.includes('talk')) {
      priorities.push('communication');
    }
    if (combinedText.includes('sleep') || combinedText.includes('bedtime')) {
      priorities.push('sleep');
    }
    if (combinedText.includes('school')) {
      priorities.push('school');
    }
    
    if (priorities.length === 0) {
      priorities.push('mornings', 'meltdowns');
    }

    const onboardingData: OnboardingData = {
      childName: responses.get('child_name') || childName,
      childAge: responses.get('child_age') || childAge,
      morningChallenges: brainDump,
      mainWorries: brainDump,
      developmentalConcerns: devConcerns.hasConcerns ? devConcerns : undefined,
      insurance: insuranceData.hasInsurance ? insuranceData : undefined,
      selectedTier,
      priorities: priorities.slice(0, 2),
      planSettings: {
        aiGuidance: true,
        gentleReminders: true,
        progressTracking: true
      },
      chatTranscript: messages
    };

    onComplete(onboardingData);
  };

  const handleSkip = () => {
    if (currentQuestion === 'welcome') {
      handleSendMessage();
    } else if (currentQuestion === 'child_age') {
      addParentMessage("I'd prefer not to say");
      responses.set('child_age', '');
      setProgress(30);
      setTimeout(() => {
        addAminyMessage(
          `No problem! Now, tell me about a typical day with ${childName || 'your child'}. What goes well, and what feels challenging? Feel free to share whatever comes to mind.`,
          'initial_brain_dump'
        );
        setCurrentQuestion('initial_brain_dump');
      }, 600);
    } else {
      addParentMessage("I'll skip this");
      responses.set(currentQuestion, '');
      setProgress(prev => Math.min(prev + 10, 65));
      setTimeout(() => askNextFollowUp(), 800);
    }
  };

  // Render specific input based on current question
  const renderInput = () => {
    // No special "welcome" button - we go straight to asking questions

    // Insurance question with simple Yes/No/Skip buttons
    if (currentQuestion === 'insurance') {
      return (
        <div className="space-y-3" style={{ minHeight: '200px' }}>
          <div className="grid grid-cols-2 gap-2" style={{ minHeight: '120px' }}>
            <Button
              type="button"
              onClick={() => {
                addParentMessage('Yes, I have insurance');
                responses.set('insurance', { hasInsurance: true, planType: '', state: '' });
                setProgress(88);
                setTimeout(() => {
                  addAminyMessage(
                    `Perfect! Now let's choose the plan that's right for ${childName}. You'll start with a 7-day free trial of Core—no credit card required.`
                  );
                  setTimeout(() => {
                    setCurrentQuestion('plan_selection');
                    setProgress(90);
                  }, 400);
                }, 600);
              }}
              variant="outline"
              className="flex flex-col items-center justify-center gap-2 border-2 hover:border-accent hover:bg-accent/5 h-[110px]"
            >
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <span className="font-medium">Yes</span>
              <span className="text-xs text-muted-foreground">I have insurance</span>
            </Button>
            
            <Button
              type="button"
              onClick={() => {
                addParentMessage('No, not currently');
                responses.set('insurance', { hasInsurance: false, planType: '', state: '' });
                setProgress(88);
                setTimeout(() => {
                  addAminyMessage(
                    `Perfect! Now let's choose the plan that's right for ${childName}. You'll start with a 7-day free trial of Core—no credit card required.`
                  );
                  setTimeout(() => {
                    setCurrentQuestion('plan_selection');
                    setProgress(90);
                  }, 400);
                }, 600);
              }}
              variant="outline"
              className="flex flex-col items-center justify-center gap-2 border-2 hover:border-slate-300 hover:bg-slate-50 h-[110px]"
            >
              <X className="w-5 h-5 text-slate-500" />
              <span className="font-medium">No</span>
              <span className="text-xs text-muted-foreground">Not currently</span>
            </Button>
          </div>
          
          <div className="text-center">
            <Button 
              type="button"
              onClick={() => {
                addParentMessage("I'll skip this for now");
                responses.set('insurance', { hasInsurance: false, planType: '', state: '' });
                setProgress(88);
                setTimeout(() => {
                  addAminyMessage(
                    `Perfect! Now let's choose the plan that's right for ${childName}. You'll start with a 7-day free trial of Core—no credit card required.`
                  );
                  setTimeout(() => {
                    setCurrentQuestion('plan_selection');
                    setProgress(90);
                  }, 400);
                }, 600);
              }}
              variant="ghost" 
              size="sm"
              className="text-xs h-auto py-2"
            >
              Skip for now
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground bg-slate-50 rounded-lg p-2.5">
            💙 Insurance isn't required to use Aminy—we're here to support you either way.
          </p>
        </div>
      );
    }

    if (currentQuestion === 'plan_selection') {
      const tiers = [
        {
          id: 'free' as const,
          name: 'Starter',
          price: 29,
          subtitle: 'Basic support',
          features: ['AI personalized plan', '2 daily activities', 'Progress tracking', 'Aminy Jr: 2 games'],
          icon: Heart
        },
        {
          id: 'core' as const,
          name: 'Core',
          price: 0,
          originalPrice: 99,
          subtitle: '7-day free trial • Most popular',
          features: ['Unlimited AI chat', 'Auto-adapting plan', 'All Jr modules', 'Complete activity library', 'Then $99/mo • Cancel anytime'],
          icon: Target,
          recommended: true
        },
        {
          id: 'pro' as const,
          name: 'Plus',
          price: 0,
          originalPrice: 229,
          subtitle: '7-day free trial • Full support',
          features: ['Everything in Core', 'Live telehealth sessions', 'Insurance letters & BCBA notes', 'Priority support', 'Then $229/mo • Cancel anytime'],
          icon: Stethoscope
        }
      ];

      return (
        <div className="space-y-4" style={{ minHeight: '500px' }}>
          <div className="grid gap-3" style={{ minHeight: '450px' }}>
            {tiers.map((tier) => {
              const Icon = tier.icon;
              const isSelected = selectedTier === tier.id;
              
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all text-left w-full ${
                    isSelected ? 'border-accent bg-accent/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ minHeight: '140px', contain: 'layout style' }}
                >
                  {tier.recommended && (
                    <Badge className="absolute -top-2 left-4 bg-accent text-xs">Recommended</Badge>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-accent/10' : 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-gray-600'}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <h4 className="font-semibold">{tier.name}</h4>
                        {tier.price === 0 ? (
                          <>
                            <span className="text-xl font-bold text-accent">Free Trial</span>
                            {tier.originalPrice && (
                              <span className="text-xs text-muted-foreground line-through">${tier.originalPrice}/mo</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-xl font-bold">${tier.price}</span>
                            <span className="text-sm text-muted-foreground">/mo</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{tier.subtitle}</p>
                      <ul className="space-y-1">
                        {tier.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs">
                            <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${isSelected ? 'text-accent' : 'text-gray-400'}`} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {(selectedTier === 'core' || selectedTier === 'pro') && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-purple-900">
                  <strong>Start your free trial now.</strong> No credit card required. Cancel anytime during the trial—no charge.
                </p>
              </div>
            </div>
          )}

          <Button 
            type="button"
            onClick={handleSendMessage} 
            className="w-full gap-2 bg-accent hover:bg-accent/90 h-12"
          >
            {selectedTier === 'free' ? 'Get Started' : 'Start Free Trial'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    // Child name input
    if (currentQuestion === 'child_name') {
      return (
        <div className="space-y-3" style={{ minHeight: '100px' }}>
          <Input
            value={currentInput}
            onChange={(e) => {
              let value = e.target.value;
              // Auto-capitalize first letter when starting to type
              if (value.length > 0 && currentInput.length === 0) {
                value = value.charAt(0).toUpperCase() + value.slice(1);
              }
              setCurrentInput(value);
            }}
            placeholder="e.g., Eddie, Gracie, William"
            className="text-sm h-11"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            autoFocus
            autoCapitalize="words"
          />
          
          <Button 
            type="button"
            onClick={handleSendMessage} 
            className="w-full gap-2 h-11"
            disabled={!currentInput.trim()}
          >
            Continue
            <Send className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    // Child age input
    if (currentQuestion === 'child_age') {
      return (
        <div className="space-y-3" style={{ minHeight: '100px' }}>
          <Input
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder="e.g., 3, 5 years old, 4.5"
            className="text-sm h-11"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            autoFocus
          />
          
          <div className="flex gap-2">
            <Button 
              type="button"
              onClick={handleSkip} 
              variant="ghost" 
              size="sm"
              className="h-11"
            >
              Skip
            </Button>
            <Button 
              type="button"
              onClick={handleSendMessage} 
              className="flex-1 gap-2 h-11"
              disabled={!currentInput.trim()}
            >
              Continue
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Default text input for other questions
    return (
      <div className="space-y-3" style={{ minHeight: '160px' }}>
        <Textarea
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder={
            currentQuestion === 'initial_brain_dump'
              ? `Example: "Mornings are chaos—getting dressed is a battle. Bedtime takes hours. We're exhausted but want to help."`
              : 'Type your response here...'
          }
          rows={currentQuestion === 'initial_brain_dump' ? 4 : 3}
          className="resize-none text-sm"
          style={{ minHeight: currentQuestion === 'initial_brain_dump' ? '100px' : '75px' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleVoiceInput}
            disabled={isListening}
            className="gap-2"
          >
            <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse text-accent' : ''}`} />
            {isListening ? 'Listening...' : 'Voice'}
          </Button>
          
          {currentQuestion !== 'initial_brain_dump' && currentQuestion !== 'welcome' && (
            <Button 
              type="button"
              onClick={handleSkip} 
              variant="ghost" 
              size="sm"
              className="h-11"
            >
              Skip
            </Button>
          )}
          
          <Button
            type="button"
            onClick={handleSendMessage}
            disabled={(!currentInput.trim() && currentQuestion !== 'welcome') || isAiThinking}
            className="flex-1 gap-2 h-11"
          >
            {isAiThinking ? (
              <>
                <span className="inline-block animate-pulse">Thinking...</span>
              </>
            ) : (
              <>
                Send
                <Send className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-accent/5 via-accent/8 to-accent/5 border-b border-accent/10 px-4 py-4 flex-shrink-0" style={{ height: '120px' }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <ImageWithFallback
                src={compassIcon}
                alt="Aminy"
                width="40"
                height="40"
                style={{
                  width: '40px',
                  height: '40px',
                  objectFit: 'contain'
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold">Chat with Aminy</h1>
              </div>
              <p className="text-sm text-muted-foreground">Understanding your family's needs</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Chat progress</span>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>
      </div>

      {/* Chat Messages - Scrollable area between header and input */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        style={{ 
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="flex-1"></div>
        <div className="max-w-2xl mx-auto space-y-4 w-full pb-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'parent' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.type === 'aminy'
                    ? 'bg-slate-50 border border-slate-200'
                    : 'bg-accent text-white'
                }`}
                style={{ contain: 'layout style paint', willChange: 'transform' }}
              >
                {message.type === 'aminy' && (
                  <div className="flex items-center gap-2 mb-2">
                    <ImageWithFallback
                      src={compassIcon}
                      alt="Aminy"
                      width="16"
                      height="16"
                      style={{
                        width: '16px',
                        height: '16px',
                        objectFit: 'contain'
                      }}
                    />
                    <span className="text-xs font-medium text-accent">Aminy</span>
                  </div>
                )}
                
                <div className="text-sm leading-relaxed">{message.content}</div>
                
                {message.summary && message.summary.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-xs opacity-90 mb-2">✓ Aminy heard:</p>
                    <ul className="space-y-1">
                      {message.summary.map((point, idx) => (
                        <li key={idx} className="text-xs opacity-90 flex items-start gap-1.5">
                          <span>•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>
      </div>

      {/* Input Area - Fixed at bottom, part of flex layout */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 flex-shrink-0" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        <div className="max-w-2xl mx-auto">
          {renderInput()}
        </div>
      </div>
    </div>
  );
};
