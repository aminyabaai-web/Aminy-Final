import React, { useState } from 'react';
import { MessageSquare, X, Send, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface PersistentAskAminyFABProps {
  tier?: string;
  messagesLeft?: number;
  onPaywallTrigger?: () => void;
  position?: 'bottom-right' | 'bottom-left';
}

export function PersistentAskAminyFAB({
  tier = 'core',
  messagesLeft = 10,
  onPaywallTrigger,
  position = 'bottom-right'
}: PersistentAskAminyFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; text: string; isUser: boolean }>>([]);
  const [isReplying, setIsReplying] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    if (tier === 'core' && messagesLeft <= 0) {
      onPaywallTrigger?.();
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      text: input,
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsReplying(true);

    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        text: `I can help with that! Let me suggest some evidence-based strategies. Would you like me to break this down into small, doable steps?`,
        isUser: false
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsReplying(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
          aria-label="Ask Aminy"
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
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-accent/10 rounded-lg">
                <MessageSquare className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Ask Aminy</h3>
                {tier === 'core' && (
                  <p className="text-xs text-muted-foreground">
                    {messagesLeft} messages left
                  </p>
                )}
                {tier !== 'core' && (
                  <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">
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
                <div className="grid grid-cols-2 gap-2">
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
                      : 'bg-gray-100 text-gray-900'
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
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
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
