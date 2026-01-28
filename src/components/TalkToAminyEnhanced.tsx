import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { 
  Send,
  Mic,
  MicOff,
  Paperclip,
  FileText,
  Shield,
  ChevronRight,
  RotateCcw,
  Trash2,
  Copy,
  CheckCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  MessageSquare
} from 'lucide-react';
import { CompassIcon } from './CompassIcon';
import type { VaultRecord } from '../types/vault';
import { VAULT_EVENTS } from '../types/vault';
import { connectorHub } from '../lib/connector-hub';
import { DisclaimerFooter } from './DisclaimerFooter';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Array<{
    recordId: string;
    title: string;
    snippet: string;
    page?: number;
  }>;
  isStreamComplete?: boolean;
  streamingText?: string;
  contextUsed?: boolean;
}

interface TalkToAminyEnhancedProps {
  vaultRecords: VaultRecord[];
  userTier: string | null;
  canSendMessage: boolean;
  onMessageSent: () => void;
  onPaywallTrigger: () => void;
  onRecordOpen: (recordId: string) => void;
}

export const TalkToAminyEnhanced: React.FC<TalkToAminyEnhancedProps> = ({
  vaultRecords,
  userTier,
  canSendMessage,
  onMessageSent,
  onPaywallTrigger,
  onRecordOpen
}) => {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useRecords, setUseRecords] = useState(true);
  
  // Enhanced state for streaming experience
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>('');
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [conversationId] = useState<string>(() => `conv-${Date.now()}`);
  
  // Refs for enhanced functionality
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 120; // Max 5 lines approximately
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }
  }, []);

  // Load conversation from localStorage on mount
  useEffect(() => {
    try {
      const savedConversation = localStorage.getItem(`aminy-conversation-${conversationId}`);
      if (savedConversation) {
        const parsed = JSON.parse(savedConversation);
        setMessages(parsed.messages || []);
        setConversationTitle(parsed.title || '');
        setUseRecords(parsed.useRecords !== undefined ? parsed.useRecords : true);
      }
    } catch (error) {
    }
  }, [conversationId]);

  // Save conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const conversationData = {
          messages,
          title: conversationTitle,
          useRecords,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(`aminy-conversation-${conversationId}`, JSON.stringify(conversationData));
        
        // Update activity timestamp
        setLastActivity(new Date());
      } catch (error) {
      }
    }
  }, [messages, conversationTitle, useRecords, conversationId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Auto-resize textarea when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  // Get usable records for retrieval
  const usableRecords = vaultRecords.filter(record => record.usableByAssistant);
  
  // Mock search vault function - in real app this would use vector search
  const searchVault = (query: string): Array<{record: VaultRecord, relevanceScore: number}> => {
    if (!useRecords || !query.trim()) return [];
    
    return usableRecords
      .map(record => {
        let score = 0;
        const searchText = `${record.title} ${record.vaultText} ${record.tags.join(' ')}`.toLowerCase();
        const queryLower = query.toLowerCase();
        
        // Simple relevance scoring
        if (record.title.toLowerCase().includes(queryLower)) score += 10;
        if (record.vaultText?.toLowerCase().includes(queryLower)) score += 5;
        record.tags.forEach(tag => {
          if (tag.toLowerCase().includes(queryLower)) score += 3;
        });
        
        return { record, relevanceScore: score };
      })
      .filter(result => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3); // Top 3 results
  };

  // Enhanced AI response generation with streaming and context awareness
  const generateResponse = async (userMessage: string, vaultContext: VaultRecord[], conversationContext: Message[] = []) => {
    // Create abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      setIsTyping(true);
      setIsStreaming(true);
      
      // Generate conversation title if this is the first message
      if (messages.length === 0 && !conversationTitle) {
        const title = userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage;
        setConversationTitle(title);
      }
      
      let response = '';
      let citations: Message['citations'] = [];
      let contextUsed = false;
      
      // Enhanced context awareness
      const recentMessages = conversationContext.slice(-4); // Last 2 exchanges
      const hasContext = recentMessages.length > 0;
      
      // Check if question is about records or builds on previous conversation
      const isRecordQuery = /\b(iep|evaluation|goals|school|therapy|report|assessment|last|recent|mentioned|you said|earlier|previous|before|that|it)\b/i.test(userMessage);
      const isFollowUp = /\b(you said|earlier|previous|before|that|it|more|explain|tell me more|what about|how about|also)\b/i.test(userMessage);
      
      // Enhanced response generation with multiple response types
      if (isRecordQuery && vaultContext.length > 0) {
        contextUsed = true;
        response = await generateRecordBasedResponse(userMessage, vaultContext, recentMessages, signal);
        
        // Add citations
        vaultContext.forEach(record => {
          const snippet = record.vaultText?.substring(0, 150) + '...' || 'No content available';
          citations.push({
            recordId: record.id,
            title: record.title,
            snippet: snippet,
            page: Math.floor(Math.random() * 10) + 1 // Mock page number
          });
        });
        
        // Publish citation event
        citations.forEach(citation => {
          connectorHub.publish(VAULT_EVENTS.VAULT_CITATION, {
            recordId: citation.recordId,
            snippet: citation.snippet
          }, 'talk-to-aminy');
        });
        
      } else if (isFollowUp && hasContext) {
        response = await generateContextAwareResponse(userMessage, recentMessages, signal);
      } else {
        response = await generateStandardResponse(userMessage, signal);
      }
      
      setIsTyping(false);
      setIsStreaming(false);
      
      return { response, citations, contextUsed };
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return null;
      }
      
      setIsTyping(false);
      setIsStreaming(false);
      throw error;
    }
  };

  // Generate record-based responses with more sophistication
  const generateRecordBasedResponse = async (userMessage: string, vaultContext: VaultRecord[], recentMessages: Message[], signal: AbortSignal): Promise<string> => {
    // Simulate AI processing with realistic delays
    await new Promise(resolve => setTimeout(resolve, 800));
    if (signal.aborted) throw new Error('AbortError');
    
    const responses = [
      "Based on your uploaded records, I can see that your child has shown significant progress in several key areas. The evaluation highlights specific strengths in communication development and suggests continued focus on social interaction goals.",
      "Looking at your documents, the most recent assessment indicates positive trends in behavior regulation and adaptive skills. The recommendations emphasize building on current successes while introducing new challenges gradually.",
      "From your records, I notice consistent patterns in your child's learning preferences and response to different intervention strategies. The data suggests that visual supports have been particularly effective.",
      "Your uploaded evaluations show clear developmental milestones being met, with particular strength in language comprehension. The therapist notes suggest expanding current programs to include peer interaction components.",
      "Based on the documentation you've shared, your child's progress trajectory is very encouraging. The reports consistently mention improved self-regulation and increased engagement in structured activities."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Generate context-aware follow-up responses
  const generateContextAwareResponse = async (userMessage: string, recentMessages: Message[], signal: AbortSignal): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    if (signal.aborted) throw new Error('AbortError');
    
    const lastAssistantMessage = recentMessages.filter(m => m.role === 'assistant').slice(-1)[0];
    
    if (lastAssistantMessage?.content.includes('progress')) {
      return "Absolutely! Building on that progress, I'd recommend focusing on consistency in your current approaches while gradually introducing new challenges. What specific area would you like to expand on first?";
    } else if (lastAssistantMessage?.content.includes('strategies')) {
      return "Great question! Those strategies can be adapted in several ways. Would you like me to suggest modifications for home, school, or community settings?";
    } else {
      return "I understand you'd like to know more about that. Could you help me understand which specific aspect you'd like me to elaborate on?";
    }
  };

  // Generate standard helpful responses
  const generateStandardResponse = async (userMessage: string, signal: AbortSignal): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 700));
    if (signal.aborted) throw new Error('AbortError');
    
    // Enhanced response matching based on keywords
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('routine') || lowerMessage.includes('schedule')) {
      return "Routines are so important for development! I'd suggest starting with visual schedules that show each step clearly. What time of day or activity would you like to focus on first?";
    } else if (lowerMessage.includes('behavior') || lowerMessage.includes('meltdown')) {
      return "Understanding the triggers behind challenging behaviors is key. I can help you identify patterns and develop prevention strategies. What situations tend to be most difficult?";
    } else if (lowerMessage.includes('speech') || lowerMessage.includes('communication')) {
      return "Communication development happens at different paces for every child. I can suggest activities that match your child's current level and interests. What communication goals are you working on?";
    } else if (lowerMessage.includes('school') || lowerMessage.includes('teacher')) {
      return "School partnerships are crucial for success. I can help you prepare for meetings, understand IEP goals, or suggest home-school collaboration strategies. What's your main school concern?";
    } else if (lowerMessage.includes('sensory') || lowerMessage.includes('overwhelmed')) {
      return "Sensory needs can really impact daily life. I can help identify your child's sensory profile and suggest accommodations or activities. What sensory challenges do you notice most?";
    } else {
      return "I'm here to help with any aspect of your child's development! Whether it's daily routines, communication, behavior strategies, school support, or understanding evaluations - what would be most helpful to discuss right now?";
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    if (!canSendMessage) {
      onPaywallTrigger();
      return;
    }
    
    // Abort any ongoing response generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const userMessage = inputValue.trim();
    setInputValue('');
    onMessageSent();
    
    // Add user message
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    try {
      // Search vault for relevant context
      const vaultResults = searchVault(userMessage);
      const relevantRecords = vaultResults.map(result => result.record);
      
      // Generate AI response with enhanced context
      const result = await generateResponse(userMessage, relevantRecords, messages);
      
      if (result) {
        const { response, citations, contextUsed } = result;
        
        // Add AI response with streaming simulation
        const aiMsgId = `msg-${Date.now() + 1}`;
        const aiMsg: Message = {
          id: aiMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          citations: citations,
          isStreamComplete: false,
          contextUsed: contextUsed
        };
        
        setMessages(prev => [...prev, aiMsg]);
        setStreamingMessageId(aiMsgId);
        
        // Simulate streaming response
        await simulateStreaming(response, aiMsgId);
      }
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error generating response:', error);
        toast.error('Sorry, I encountered an issue. Please try again.');
        
        // Add error message
        const errorMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
          timestamp: new Date(),
          isStreamComplete: true
        };
        
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  // Simulate streaming response for better UX
  const simulateStreaming = async (fullResponse: string, messageId: string) => {
    const words = fullResponse.split(' ');
    const wordsPerChunk = 2;
    const delayBetweenChunks = 50;
    
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(0, i + wordsPerChunk).join(' ');
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: chunk, streamingText: chunk }
          : msg
      ));
      
      if (i + wordsPerChunk < words.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
      }
    }
    
    // Mark streaming as complete
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: fullResponse, isStreamComplete: true, streamingText: undefined }
        : msg
    ));
    
    setStreamingMessageId(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Enhanced conversation management
  const handleClearConversation = () => {
    try {
      setMessages([]);
      setConversationTitle('');
      localStorage.removeItem(`aminy-conversation-${conversationId}`);
      toast.success('Conversation cleared');
      
      // Focus back on input
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast.error('Failed to clear conversation');
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Message copied to clipboard');
    } catch (error) {
      console.error('Failed to copy message:', error);
      toast.error('Failed to copy message');
    }
  };

  const handleRegenerateResponse = async () => {
    if (messages.length < 2) return;
    
    const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
    if (!lastUserMessage) return;
    
    // Remove the last assistant message
    setMessages(prev => prev.filter(msg => 
      !(msg.role === 'assistant' && msg.timestamp > lastUserMessage.timestamp)
    ));
    
    // Regenerate response
    try {
      const vaultResults = searchVault(lastUserMessage.content);
      const relevantRecords = vaultResults.map(result => result.record);
      const result = await generateResponse(lastUserMessage.content, relevantRecords, messages.slice(0, -2));
      
      if (result) {
        const { response, citations, contextUsed } = result;
        const aiMsgId = `msg-${Date.now()}`;
        const aiMsg: Message = {
          id: aiMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          citations: citations,
          isStreamComplete: false,
          contextUsed: contextUsed
        };
        
        setMessages(prev => [...prev, aiMsg]);
        setStreamingMessageId(aiMsgId);
        await simulateStreaming(response, aiMsgId);
      }
    } catch (error) {
      console.error('Error regenerating response:', error);
      toast.error('Failed to regenerate response');
    }
  };

  // Voice input functionality
  const handleVoiceToggle = () => {
    if (!isMicEnabled) {
      // Request microphone permission
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          setIsMicEnabled(true);
          toast.success('Microphone enabled');
        })
        .catch(() => {
          toast.error('Microphone access denied');
        });
    } else {
      setIsMicEnabled(false);
      setIsListening(false);
      toast.success('Microphone disabled');
    }
  };

  const handleStartListening = () => {
    if (!isMicEnabled) {
      handleVoiceToggle();
      return;
    }
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
        adjustTextareaHeight();
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast.error('Voice recognition failed. Please try again.');
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      toast.error('Speech recognition not supported in this browser');
    }
  };

  // Enhanced file attachment (placeholder implementation)
  const handleFileAttachment = () => {
    if (userTier === 'starter') {
      onPaywallTrigger();
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt,.jpg,.png';
    input.multiple = false;
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // File size limit check (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error('File must be smaller than 5MB');
          return;
        }
        
        // Simulate file processing
        toast.success(`File "${file.name}" attached (analysis coming soon)`);
        
        // In production, this would upload and analyze the file
      }
    };
    
    input.click();
  };

  const suggestedPrompts = [
    "What goals did the school mention in the last IEP?",
    "Summarize recent evaluation findings",
    "What therapy minutes are recommended?",
    "Show me progress from recent reports"
  ];

  // Only show prompts that have potential vault matches
  const relevantPrompts = suggestedPrompts.filter(prompt => 
    searchVault(prompt).length > 0 || !useRecords
  );

  return (
    <Card className="p-6 aminy-card aminy-ai-card">
      {/* Enhanced Header with Conversation Management */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg aminy-ai-icon">
            <CompassIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-primary">Ask Aminy</h3>
              <Badge className="text-xs badge">
                {userTier === 'core' || userTier === 'pro' ? 'Unlimited' : 'Limited'}
              </Badge>
              {isStreaming && (
                <Badge variant="secondary" className="text-xs animate-pulse">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Thinking...
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground aminy-ai-subtitle">
              {conversationTitle || 'Your AI guide for child development insights and personalized support with smart record search.'}
            </p>
          </div>
        </div>
        
        {/* Conversation Controls */}
        {messages.length > 0 && (
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRegenerateResponse}
              disabled={isTyping || isStreaming}
              title="Regenerate last response"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearConversation}
              disabled={isTyping || isStreaming}
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Enhanced Use Records Toggle */}
      {usableRecords.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="use-records"
              checked={useRecords}
              onCheckedChange={setUseRecords}
            />
            <Label htmlFor="use-records" className="text-sm flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Use my records ({usableRecords.length} available)
            </Label>
          </div>
          {useRecords && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Context enabled
            </Badge>
          )}
        </div>
      )}

      {/* Enhanced Messages with Better Layout */}
      {messages.length > 0 && (
        <ScrollArea className="max-h-80 mb-4">
          <div className="space-y-3 sm:space-y-4 pr-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg text-sm relative ${
                    message.role === 'user'
                      ? 'bg-accent text-white'
                      : 'bg-muted text-foreground border border-border/50'
                  }`}
                >
                  {/* Message Header with Timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {message.role === 'assistant' && (
                        <CompassIcon className="w-3 h-3 opacity-60" />
                      )}
                      <span className={`text-xs opacity-60 ${
                        message.role === 'user' ? 'text-white/80' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.contextUsed && (
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="w-2 h-2 mr-1" />
                          Records used
                        </Badge>
                      )}
                    </div>
                    
                    {/* Message Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyMessage(message.content)}
                        className={`h-6 w-6 p-0 ${
                          message.role === 'user' 
                            ? 'hover:bg-white/20 text-white/80' 
                            : 'hover:bg-muted text-muted-foreground'
                        }`}
                        title="Copy message"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      {message.role === 'assistant' && index === messages.length - 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRegenerateResponse}
                          disabled={isTyping || isStreaming}
                          className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground"
                          title="Regenerate response"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Message Content with Streaming */}
                  <div>
                    {message.isStreamComplete === false ? (
                      <div className="flex items-center gap-2">
                        <span>{message.streamingText || message.content}</span>
                        <div className="w-2 h-4 bg-current opacity-60 animate-pulse" />
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                  
                  {/* Enhanced Citations */}
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs opacity-60 font-medium">
                        Referenced from your records:
                      </div>
                      {message.citations.map((citation, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="h-auto p-2 text-xs bg-white/10 hover:bg-white/20 text-left w-full justify-start"
                          onClick={() => onRecordOpen(citation.recordId)}
                        >
                          <FileText className="w-3 h-3 mr-2 flex-shrink-0" />
                          <div className="text-left">
                            <div className="font-medium">{citation.title}</div>
                            {citation.snippet && (
                              <div className="text-xs opacity-80 mt-1 line-clamp-2">
                                {citation.snippet}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Enhanced Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border/50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CompassIcon className="w-4 h-4 animate-spin" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-muted-foreground">Aminy is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {/* Conversation Stats */}
      {messages.length > 0 && (
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="w-3 h-3" />
            <span>{messages.length} messages</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {useRecords && usableRecords.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-accent">
              <Shield className="w-3 h-3" />
              <span>Records active</span>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Suggested Prompts */}
      {messages.length === 0 && (
        <div className="mb-4">
          <div className="text-center text-gray-500 mb-3">
            <p className="text-sm font-medium">
              {usableRecords.length > 0 && useRecords 
                ? "Ask about your uploaded records:"
                : "Get started with these questions:"
              }
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {(relevantPrompts.length > 0 ? relevantPrompts : [
              "How can I help my child with daily routines?",
              "What are signs of developmental progress?",
              "How do I handle challenging behaviors?"
            ]).slice(0, 3).map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                className="text-left justify-start h-auto p-3 text-sm hover:bg-accent/5 hover:border-accent/30 transition-all group"
                onClick={() => {
                  setInputValue(prompt);
                  setTimeout(handleSendMessage, 100);
                }}
                disabled={!canSendMessage}
              >
                <div className="flex items-start gap-2 w-full">
                  <Sparkles className="w-4 h-4 text-accent/60 flex-shrink-0 mt-0.5" />
                  <span className="group-hover:text-accent transition-colors">{prompt}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Input Area */}
      <div className="relative">
        <div className="bg-gray-50 rounded-xl border border-gray-200 focus-within:border-accent transition-all duration-200 focus-within:shadow-sm">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder={
                usableRecords.length > 0 && useRecords
                  ? "Ask about your records, goals, or get development guidance..."
                  : "Ask me anything about child development, strategies, or progress..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="border-0 bg-transparent resize-none focus-visible:ring-0 aminy-ai-input-field min-h-[80px] max-h-[120px]"
              disabled={isTyping || isStreaming}
              style={{ height: 'auto' }}
            />
            
            {/* Input Actions Row */}
            <div className="flex items-center justify-between p-3 pt-0 border-t border-gray-100/50">
              <div className="flex items-center gap-1">
                {/* Enhanced File Attachment */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleFileAttachment}
                  disabled={isTyping || isStreaming}
                  aria-label="Attach file"
                  title={userTier === 'starter' ? 'File attachment (Pro feature)' : 'Attach document or image'}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                {/* Enhanced Voice Input */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={isMicEnabled ? handleStartListening : handleVoiceToggle}
                  disabled={isTyping || isStreaming}
                  aria-label={isMicEnabled ? "Start voice input" : "Enable microphone"}
                  title={isMicEnabled ? (isListening ? "Listening..." : "Click to speak") : "Enable voice input"}
                  className={isListening ? "text-red-500" : ""}
                >
                  {isListening ? (
                    <div className="relative">
                      <Mic className="w-4 h-4" />
                      <div className="absolute inset-0 animate-ping">
                        <Mic className="w-4 h-4 opacity-75" />
                      </div>
                    </div>
                  ) : isMicEnabled ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}
                </Button>

                {/* Audio Toggle for Message Reading */}
                {messages.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toast.info('Text-to-speech coming soon!')}
                    aria-label="Toggle audio reading"
                    title="Read messages aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {/* Enhanced Send Button */}
              <div className="flex items-center gap-2">
                {inputValue.trim() && (
                  <span className="text-xs text-muted-foreground">
                    {inputValue.length}/2000
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping || isStreaming}
                  aria-label={`Send message${!canSendMessage ? ' (upgrade required)' : ''}`}
                  className={`transition-all duration-200 ${
                    inputValue.trim() ? 'animate-in zoom-in-50' : ''
                  }`}
                >
                  {isTyping || isStreaming ? (
                    <div className="animate-spin">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Helper Text with Dynamic Content */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <p className="text-center text-gray-500 text-xs aminy-ai-helper-text">
            {isListening ? (
              <span className="text-accent flex items-center gap-1">
                <div className="w-1 h-1 bg-accent rounded-full animate-pulse" />
                Listening... Speak now
              </span>
            ) : useRecords && usableRecords.length > 0 ? (
              <>
                <Shield className="w-3 h-3 inline mr-1" />
                Searching {usableRecords.length} record{usableRecords.length !== 1 ? 's' : ''} for context
              </>
            ) : (
              "AI responses are for guidance only, not medical advice"
            )}
          </p>
          
          {/* Character count for mobile */}
          {inputValue.length > 100 && (
            <span className={`text-xs ${
              inputValue.length > 1800 ? 'text-red-500' : 
              inputValue.length > 1500 ? 'text-amber-500' : 'text-muted-foreground'
            }`}>
              {inputValue.length}/2000
            </span>
          )}
        </div>
        
        {/* Quick Actions for Active Conversations */}
        {messages.length > 1 && !isTyping && !isStreaming && (
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setInputValue("Can you elaborate on that?")}
              className="text-xs"
            >
              Tell me more
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setInputValue("What should I do next?")}
              className="text-xs"
            >
              Next steps
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setInputValue("How can I implement this at home?")}
              className="text-xs"
            >
              How to implement
            </Button>
          </div>
        )}
      </div>
      
      {/* Enhanced Disclaimer Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <DisclaimerFooter variant="compact" className="text-center" />
      </div>
    </Card>
  );
};