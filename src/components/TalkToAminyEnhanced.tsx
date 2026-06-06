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
import { sendMessage, getCurrentContext, type AIResponse } from '../lib/ai-engine';
import { useAminyStore } from '../lib/store';

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
  onMessageSent?: () => void;
  onPaywallTrigger?: () => void;
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
  // Get user context for real AI calls
  const user = useAminyStore((s) => s.user);
  const userId = user?.id || 'anonymous';
  const childId = user?.id ? `child-${user.id.substring(0, 8)}` : 'default';

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

  // Enhanced AI response generation using real Claude AI
  const generateResponse = async (userMessage: string, vaultContext: VaultRecord[], conversationContext: Message[] = []) => {
    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setIsTyping(true);
      setIsStreaming(true);

      // Generate conversation title if this is the first message
      if (messages.length === 0 && !conversationTitle) {
        const title = userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage;
        setConversationTitle(title);
      }

      let citations: Message['citations'] = [];
      let contextUsed = false;

      // Build vault context string for the AI
      let vaultContextString = '';
      if (vaultContext.length > 0) {
        contextUsed = true;
        vaultContextString = '\n\n[VAULT DOCUMENTS RELEVANT TO THIS QUESTION]\n' +
          vaultContext.map(record => {
            const snippet = record.vaultText?.substring(0, 500) || 'No content available';
            return `--- ${record.title} (${record.tags.join(', ')}) ---\n${snippet}`;
          }).join('\n\n');

        // Build citations
        vaultContext.forEach(record => {
          const snippet = record.vaultText?.substring(0, 150) + '...' || 'No content available';
          citations.push({
            recordId: record.id,
            title: record.title,
            snippet: snippet,
          });
        });

        // Publish citation events
        citations.forEach(citation => {
          connectorHub.publish(VAULT_EVENTS.VAULT_CITATION, {
            recordId: citation.recordId,
            snippet: citation.snippet
          }, 'talk-to-aminy');
        });
      }

      // Build conversation history for the AI engine
      const historyForAI = conversationContext
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp.toISOString?.() || new Date().toISOString(),
        }));

      // Append vault context to the user message so Claude can reference documents
      const enrichedMessage = vaultContextString
        ? `${userMessage}\n${vaultContextString}`
        : userMessage;

      // Call real AI engine
      const aiResponse: AIResponse = await sendMessage(
        enrichedMessage,
        historyForAI,
        {
          userId,
          childId,
          conversationId,
          enableMemory: true,
          maxTokens: 1024,
        }
      );

      setIsTyping(false);
      setIsStreaming(false);

      return { response: aiResponse.content, citations, contextUsed };

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }

      setIsTyping(false);
      setIsStreaming(false);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    if (!canSendMessage) {
      onPaywallTrigger?.();
      return;
    }

    // Abort any ongoing response generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    onMessageSent?.();
    
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
      
    } catch (error: unknown) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
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
    
    interface SpeechRecognitionEvent {
      results: { [index: number]: { [index: number]: { transcript: string } } };
    }

    interface SpeechRecognitionErrorEvent {
      error: string;
    }

    interface SpeechRecognitionInstance {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onstart: (() => void) | null;
      onresult: ((event: SpeechRecognitionEvent) => void) | null;
      onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
      onend: (() => void) | null;
      start: () => void;
    }

    interface WindowWithSpeechRecognition extends Window {
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      SpeechRecognition?: new () => SpeechRecognitionInstance;
    }

    const windowWithSR = window as unknown as WindowWithSpeechRecognition;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionCtor = windowWithSR.webkitSpeechRecognition || windowWithSR.SpeechRecognition;
      if (!SpeechRecognitionCtor) return;
      const recognition = new SpeechRecognitionCtor();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
        adjustTextareaHeight();
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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
      onPaywallTrigger?.();
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
              <h3 className="font-semibold text-primary">Aminy</h3>
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
          <div
            className="space-y-3 sm:space-y-4 pr-4"
            role="log"
            aria-label="Conversation with Aminy"
            aria-live="polite"
            aria-relevant="additions"
            aria-busy={isStreaming}
          >
            {messages.map((message, index) => {
              const messageAriaLabel = `${message.role === 'user' ? 'You said' : 'Aminy said'} at ${message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              return (
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
                  role="group"
                  aria-label={messageAriaLabel}
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
            );
            })}

            {/* Enhanced Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start" role="status" aria-live="polite">
                <div className="bg-muted border border-border/50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CompassIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <div className="flex space-x-1" aria-hidden="true">
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
          <div className="text-center text-[#5A6B7A] mb-3">
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
        <div className="bg-[#FAF7F2] rounded-xl border border-[#E8E4DF] focus-within:border-accent transition-all duration-200 focus-within:shadow-sm">
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
            <div className="flex items-center justify-between p-3 pt-0 border-t border-[#E8E4DF]/50">
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
          <p className="text-center text-[#5A6B7A] text-xs aminy-ai-helper-text">
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
      <div className="mt-4 pt-3 border-t border-[#E8E4DF]">
        <DisclaimerFooter variant="compact" className="text-center" />
      </div>
    </Card>
  );
};