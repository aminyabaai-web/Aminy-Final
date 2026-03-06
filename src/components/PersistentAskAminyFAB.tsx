import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Mic, Brain } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ChatMsg {
  id: string;
  text: string;
  isUser: boolean;
}

interface PersistentAskAminyFABProps {
  tier?: string;
  messagesLeft?: number;
  onPaywallTrigger?: () => void;
  position?: 'bottom-right' | 'bottom-left';
  childName?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Build the conversation history for the AI endpoint
function buildApiMessages(messages: ChatMsg[], childName: string): Array<{ role: string; content: string }> {
  const systemMsg = {
    role: 'system',
    content: `You are Aminy, a warm and knowledgeable AI companion for parents of neurodivergent children. You combine the expertise of a BCBA with the warmth of a best friend. Be brief (2-3 paragraphs max), actionable, and always end with encouragement. The child's name is ${childName}. Use their name naturally. Never recommend phone calls or scheduling appointments with yourself — you are an AI companion.`,
  };

  const history = messages.map((m) => ({
    role: m.isUser ? 'user' : 'assistant',
    content: m.text,
  }));

  // Keep last 10 messages for context window efficiency
  return [systemMsg, ...history.slice(-10)];
}

export function PersistentAskAminyFAB({
  tier = 'core',
  messagesLeft = 10,
  onPaywallTrigger,
  position = 'bottom-right',
  childName = 'your child',
  isOpen: isOpenProp,
  onOpenChange
}: PersistentAskAminyFABProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = isOpenProp ?? localOpen;
  const setIsOpen = (value: boolean) => {
    setLocalOpen(value);
    onOpenChange?.(value);
  };
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isReplying, setIsReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isReplying]);

  // Cleanup any in-flight request when component unmounts
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isReplying) return;

    if (tier === 'free' && messagesLeft <= 0) {
      onPaywallTrigger?.();
      return;
    }

    const userText = input.trim();
    const userMessage: ChatMsg = {
      id: Date.now().toString(),
      text: userText,
      isUser: true,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsReplying(true);

    // Abort any prior in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            messages: buildApiMessages(updatedMessages, childName),
            stream: false,
            context: { childName, tier },
          }),
          signal: controller.signal,
        }
      );

      let aiText = '';

      if (response.ok) {
        const data = await response.json();
        aiText =
          data.message ||
          data.response ||
          data.choices?.[0]?.message?.content ||
          '';
      }

      // Fallback if response empty or failed
      if (!aiText) {
        aiText = `That's a great question about ${childName}. While I'm having a brief connection hiccup, here's what I'd suggest: start with small, consistent steps and celebrate every bit of progress. I'll be back to full speed shortly!`;
      }

      const aiResponse: ChatMsg = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        isUser: false,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // User sent a new message, ignore

      console.error('Ask Aminy AI error:', err);
      const fallback: ChatMsg = {
        id: (Date.now() + 1).toString(),
        text: `I'm having a moment — my connection hiccupped! In the meantime, know that consistency and patience are your superpowers. Try again in a sec?`,
        isUser: false,
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsReplying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const positionClasses = position === 'bottom-right'
    ? 'right-4 sm:right-6'
    : 'left-4 sm:left-6';

  return (
    <>
      {/* FAB Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-20 sm:bottom-6 ${positionClasses} z-50 h-14 w-14 rounded-full bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-200`}
          aria-label="Aminy"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </Button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <Card
          className={`fixed bottom-20 sm:bottom-6 ${positionClasses} z-50 w-[90vw] sm:w-96 max-h-[70vh] flex flex-col shadow-2xl`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Brain className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold dark:text-white">Aminy</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>I remember {childName}'s journey</span>
                </p>
                {tier === 'free' && (
                  <p className="text-[10px] text-muted-foreground">
                    {messagesLeft} messages left
                  </p>
                )}
                {tier !== 'free' && (
                  <Badge variant="outline" className="text-[10px] mt-0.5 bg-accent/10 text-accent border-accent/20">
                    Unlimited
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  How can I help you today?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {['Routines', 'Behavior', 'Sleep', 'Speech'].map((topic) => (
                    <Button
                      key={topic}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(`Help me with ${topic.toLowerCase()}`)}
                    >
                      {topic}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    message.isUser
                      ? 'bg-accent text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}

            {isReplying && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about routines, behaviors, or activities..."
                  className="resize-none min-h-[44px] max-h-[120px] pr-10"
                  rows={1}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  aria-label="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isReplying}
                className="h-11 w-11 p-0 bg-accent hover:bg-accent/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Expert-quality guidance, always available
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
