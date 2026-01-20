import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Brain, Volume2, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { 
  generateContextualAIResponse, 
  storeConversation,
  buildAIContext,
  type AminyAIContext
} from '../lib/aminy-ai-brain';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  contextAware?: boolean;
}

interface AskAminyWithBrainProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  userTier: 'free' | 'core' | 'pro';
  userData: { parentName: string; childName: string };
  onPaywallTrigger?: () => void;
}

/**
 * Ask Aminy with Unified AI Brain
 * 
 * This is the TRUE AI companion - it knows:
 * - Child's age, concerns, strengths, goals
 * - Vault documents (IEPs, evaluations, reports)
 * - Daily plans and routines
 * - Past conversations and what worked
 * - Junior mode activity (what child has been doing)
 * - Current challenges and successful strategies
 * 
 * The AI gives SPECIFIC, CONTEXTUAL advice, not generic responses
 */
export function AskAminyWithBrain({
  isOpen,
  onToggle,
  onClose,
  userTier,
  userData,
  onPaywallTrigger
}: AskAminyWithBrainProps) {
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [aiContext, setAiContext] = useState<AminyAIContext | null>(null);
  const [showContext, setShowContext] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load AI context on mount
  useEffect(() => {
    if (isOpen) {
      loadAIContext();
      
      // Add welcome message if first time
      if (messages.length === 0) {
        addWelcomeMessage();
      }
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load complete AI context
  const loadAIContext = async () => {
    try {
      const context = await buildAIContext();
      setAiContext(context);
    } catch (error) {
      toast.error('Taking a moment to load your child\'s profile...');
    }
  };

  // Add welcome message
  const addWelcomeMessage = () => {
    const welcomeMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Hi! I'm Aminy, ${userData.childName}'s dedicated AI companion. I know everything about ${userData.childName} - their age, challenges, strengths, daily plan, and vault documents. Ask me anything, and I'll give you specific, personalized guidance!`,
      timestamp: new Date(),
      contextAware: true
    };
    setMessages([welcomeMsg]);
  };

  // Handle sending message
  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    // Check tier limits
    if (userTier === 'free' && messages.length >= 10) {
      onPaywallTrigger?.();
      toast.error("You've hit the free chat limit. Upgrade to Core for unlimited questions!");
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      // Build conversation history for AI
      const conversationHistory = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      // Get AI response with FULL context
      const aiResponse = await generateContextualAIResponse(
        input.trim(),
        conversationHistory
      );

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        contextAware: true
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Store conversation for memory
      await storeConversation(
        [...conversationHistory, { role: 'user', content: input.trim() }, { role: 'assistant', content: aiResponse }],
        extractTopic(input.trim())
      );

    } catch (error) {
      toast.error('I had a little hiccup. Mind trying that again?');
      
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I'm having trouble connecting right now, but I'm here to help! Can you try asking again?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  // Extract topic from user message
  const extractTopic = (message: string): string => {
    const lower = message.toLowerCase();
    if (lower.includes('bedtime') || lower.includes('sleep')) return 'bedtime-routine';
    if (lower.includes('meltdown') || lower.includes('tantrum')) return 'behavior-regulation';
    if (lower.includes('school') || lower.includes('teacher')) return 'school-support';
    if (lower.includes('food') || lower.includes('eating')) return 'feeding-challenges';
    if (lower.includes('social') || lower.includes('friend')) return 'social-skills';
    return 'general-support';
  };

  // Quick action suggestions
  const quickActions = [
    { label: '💭 Bedtime struggles', query: `${userData.childName} is having trouble with bedtime. What should I do?` },
    { label: '🎯 Morning routine', query: `Help me create a better morning routine for ${userData.childName}` },
    { label: '😢 Managing meltdowns', query: `${userData.childName} had a meltdown today. How can I help?` },
    { label: '🏫 School support', query: `What should I tell ${userData.childName}'s teacher?` },
    { label: '📊 Progress check', query: `How is ${userData.childName} doing overall?` }
  ];

  const handleQuickAction = (query: string) => {
    setInput(query);
    setTimeout(() => handleSend(), 100);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-x-4 bottom-4 md:right-6 md:left-auto md:bottom-6 md:w-[480px] z-50"
      >
        <Card className="flex flex-col h-[600px] max-h-[80vh] shadow-2xl border-2 border-accent/20">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-accent/5 to-accent/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Ask Aminy</h3>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200">
                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                    Context-Aware AI
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your child's AI companion
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {aiContext && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContext(!showContext)}
                  className="h-8 text-xs"
                >
                  <ChevronDown className={cn("w-3 h-3", showContext && "rotate-180")} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Context Panel */}
          {showContext && aiContext && (
            <div className="p-3 border-b bg-slate-50 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">Context Loaded</Badge>
                <span className="text-muted-foreground">AI knows:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  <span>{aiContext.child.name}, age {aiContext.child.age}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  <span>{aiContext.vault.evaluations.length} evaluations</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  <span>{aiContext.dailyPlan.todaysFocus.length} today's activities</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  <span>{aiContext.memory.conversations.length} past conversations</span>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      message.role === 'user'
                        ? "bg-accent text-white"
                        : "bg-slate-100 text-slate-900"
                    )}
                  >
                    {message.contextAware && (
                      <div className="flex items-center gap-1 mb-1 text-[10px] opacity-70">
                        <Brain className="w-3 h-3" />
                        <span>Context-aware response</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                      <span className="text-muted-foreground">Aminy is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick actions for first message */}
              {messages.length <= 1 && !isThinking && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Try asking about:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickActions.slice(0, 3).map((action, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action.query)}
                        className="text-xs h-auto py-1.5 px-3"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Tier indicator for free users */}
          {userTier === 'free' && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-center text-amber-800">
              {Math.max(0, 10 - messages.length)} questions remaining on free tier
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask about ${userData.childName}'s routines, behavior, progress...`}
                className="resize-none min-h-[44px] max-h-[120px]"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                className="h-11 w-11 p-0 flex-shrink-0"
              >
                {isThinking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              AI has full context about {userData.childName} • Press Enter to send
            </p>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
