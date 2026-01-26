import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { 
  MessageCircle,
  Calendar,
  Clock,
  FileText,
  ArrowLeft,
  Send,
  Paperclip,
  Mic,
  Image,
  Plus,
  Download,
  Video,
  Phone,
  MoreVertical,
  User,
  Search,
  Filter,
  Star,
  CheckCircle,
  AlertTriangle,
  Shield,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  X,
  Archive,
  Calendar as CalendarIcon,
  Home,
  Settings
} from 'lucide-react';

// Hook for tier management
function useTierLite() {
  const [tier, setTier] = useState(window.aminyTier?.get?.() || "starter");
  useEffect(() => window.aminyTier?.subscribe?.(setTier), []);
  return tier;
}

interface CarePageProProps {
  userData?: {
    parentName?: string;
    childName?: string;
  };
  onNavigate?: (destination: string) => void;
  userTier?: string;
  freeMessageCount?: number;
  setFreeMessageCount?: (count: number) => void;
}

type CareView = 'messages' | 'schedule' | 'minutes' | 'past-sessions';
type MessageThread = {
  id: string;
  patientName: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  avatarInitials: string;
  status: 'online' | 'offline';
  specialty: string;
};

type Message = {
  id: string;
  threadId: string;
  sender: 'coach' | 'patient';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    type: 'file' | 'image' | 'video';
    name: string;
    size?: string;
    url?: string;
  }>;
  deliveryStatus?: 'sent' | 'delivered' | 'read';
};

type ScheduledSession = {
  id: string;
  date: Date;
  duration: 25 | 50;
  coachName: string;
  coachCredentials: string[];
  type: 'initial' | 'follow-up' | 'intensive';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
};

type SessionMinutes = {
  id: string;
  sessionId: string;
  date: Date;
  duration: number;
  coachName: string;
  notes: string;
  goals: string[];
  strategies: string[];
  homework: string[];
  progress: string;
};

type PastSession = {
  id: string;
  date: Date;
  duration: number;
  coachName: string;
  coachCredentials: string[];
  summary: string;
  attachments: Array<{
    type: 'guide' | 'report' | 'video';
    name: string;
    size: string;
  }>;
  outcome: 'successful' | 'needs-follow-up' | 'cancelled';
};

// Mock data
const mockThreads: MessageThread[] = [
  {
    id: 'thread-1',
    patientName: 'Dr. Sarah Chen, BCBA',
    lastMessage: 'I reviewed Maya\'s latest assessment. The communication strategies are working well!',
    timestamp: '2 min ago',
    unread: true,
    avatarInitials: 'SC',
    status: 'online',
    specialty: 'Behavior Analysis'
  },
  {
    id: 'thread-2',
    patientName: 'Care Coordinator',
    lastMessage: 'Your next session is confirmed for Thursday at 2 PM. Please prepare the ABC data sheets.',
    timestamp: '1 hour ago',
    unread: false,
    avatarInitials: 'CC',
    status: 'offline',
    specialty: 'Care Coordination'
  },
  {
    id: 'thread-3',
    patientName: 'Dr. Michael Park, PhD',
    lastMessage: 'The sensory integration plan is ready for review. Great progress this week!',
    timestamp: '3 hours ago',
    unread: false,
    avatarInitials: 'MP',
    status: 'online',
    specialty: 'Clinical Psychology'
  }
];

const mockMessages: Record<string, Message[]> = {
  'thread-1': [
    {
      id: 'msg-1',
      threadId: 'thread-1',
      sender: 'coach',
      content: 'Good morning! I hope your week is going well. I wanted to follow up on the visual schedule implementation we discussed last session.',
      timestamp: new Date('2024-12-16T09:00:00'),
      deliveryStatus: 'delivered'
    },
    {
      id: 'msg-2',
      threadId: 'thread-1',
      sender: 'patient',
      content: 'Hi Dr. Chen! The visual schedule has been fantastic. Maya is responding really well to it, and we\'ve seen a significant reduction in morning transition difficulties.',
      timestamp: new Date('2024-12-16T09:15:00'),
      deliveryStatus: 'read'
    },
    {
      id: 'msg-3',
      threadId: 'thread-1',
      sender: 'coach',
      content: 'That\'s wonderful to hear! I\'m attaching a progress report and some additional visual supports that might help with evening routines as well.',
      timestamp: new Date('2024-12-16T10:30:00'),
      attachments: [
        { type: 'file', name: 'Maya_Progress_Report_Dec2024.pdf', size: '2.3 MB' },
        { type: 'image', name: 'Evening_Routine_Visual.png', size: '856 KB' }
      ],
      deliveryStatus: 'delivered'
    },
    {
      id: 'msg-4',
      threadId: 'thread-1',
      sender: 'coach',
      content: 'I reviewed Maya\'s latest assessment. The communication strategies are working well!',
      timestamp: new Date('2024-12-16T14:20:00'),
      deliveryStatus: 'delivered'
    }
  ]
};

export default function CarePagePro({ userData, onNavigate, userTier, freeMessageCount = 0, setFreeMessageCount }: CarePageProProps) {
  const tier = useTierLite();
  const isPro = tier === 'pro';
  
  // Core state
  const [activeView, setActiveView] = useState<CareView>('messages');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showThreadList, setShowThreadList] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Message state
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  
  // Session state
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<25 | 50>(25);
  
  // Minutes state
  const [remainingMinutes, setRemainingMinutes] = useState(125); // Pro tier default
  const [usedMinutes, setUsedMinutes] = useState(75);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  
  // Computed values
  const currentThread = useMemo(() => {
    return mockThreads.find(thread => thread.id === selectedThreadId);
  }, [selectedThreadId]);
  
  const currentMessages = useMemo(() => {
    return selectedThreadId ? mockMessages[selectedThreadId] || [] : [];
  }, [selectedThreadId]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-select first thread on desktop
  useEffect(() => {
    if (!isMobile && !selectedThreadId && mockThreads.length > 0) {
      setSelectedThreadId(mockThreads[0].id);
    }
  }, [isMobile, selectedThreadId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages]);

  // Dynamic composer height
  useEffect(() => {
    if (composerRef.current) {
      const composer = composerRef.current;
      composer.style.height = 'auto';
      composer.style.height = Math.min(composer.scrollHeight, 120) + 'px';
    }
  }, [messageInput]);

  const handleBackToDashboard = () => {
    if (onNavigate) {
      onNavigate('home');
    }
  };

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
    if (isMobile) {
      setShowThreadList(false);
    }
  };

  const handleBackToThreads = () => {
    setShowThreadList(true);
    setSelectedThreadId(null);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending || !selectedThreadId) return;
    
    setIsSending(true);
    
    // Simulate message sending
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Add message to current thread (in real app, this would be API call)
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        threadId: selectedThreadId,
        sender: 'patient',
        content: messageInput.trim(),
        timestamp: new Date(),
        deliveryStatus: 'sent'
      };
      
      // Update messages
      if (mockMessages[selectedThreadId]) {
        mockMessages[selectedThreadId].push(newMessage);
      }
      
      setMessageInput('');
      toast.success('Message sent');
      
      // Simulate coach response
      setTimeout(() => {
        const coachResponse: Message = {
          id: `msg-${Date.now() + 1}`,
          threadId: selectedThreadId,
          sender: 'coach',
          content: 'Thank you for the update! I\'ll review this and get back to you with specific recommendations.',
          timestamp: new Date(),
          deliveryStatus: 'delivered'
        };
        
        if (mockMessages[selectedThreadId]) {
          mockMessages[selectedThreadId].push(coachResponse);
        }
      }, 2000);
      
    } catch (error) {
      toast.error("Couldn't send that message. Want to try again?");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleBookSession = () => {
    toast.success(`${selectedDuration}-minute session booked successfully!`);
    setShowBookingModal(false);
  };

  const handleBuyMinutes = (minutes: 25 | 50) => {
    const prices = { 25: 49, 50: 89 };
    toast.success(`${minutes} minutes purchased for $${prices[minutes]}`);
    setRemainingMinutes(prev => prev + minutes);
  };

  const renderTopActions = () => (
    <div className="flex gap-3 mb-6 overflow-x-auto">
      <Button
        onClick={() => setShowBookingModal(true)}
        className="flex items-center gap-2 whitespace-nowrap"
      >
        <Calendar className="w-4 h-4" />
        Book 25-min
      </Button>
      <Button
        variant="outline"
        onClick={() => handleSendMessage()}
        className="flex items-center gap-2 whitespace-nowrap"
      >
        <MessageCircle className="w-4 h-4" />
        New Message
      </Button>
      <Button
        variant="outline"
        onClick={() => setActiveView('minutes')}
        className="flex items-center gap-2 whitespace-nowrap"
      >
        <CreditCard className="w-4 h-4" />
        Buy Minutes
      </Button>
    </div>
  );

  const renderSectionTabs = () => (
    <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
      {[
        { id: 'messages', label: 'Messages', icon: MessageCircle },
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'minutes', label: 'Minutes', icon: Clock },
        { id: 'past-sessions', label: 'Past Sessions', icon: Archive }
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveView(id as CareView)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeView === id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Icon className="w-4 h-4" />
          {!isMobile && label}
        </button>
      ))}
    </div>
  );

  const renderThreadList = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Conversations</h3>
        <Button variant="ghost" size="sm">
          <Search className="w-4 h-4" />
        </Button>
      </div>
      
      {mockThreads.map((thread) => (
        <button
          key={thread.id}
          onClick={() => handleThreadSelect(thread.id)}
          className={`w-full p-4 rounded-lg border text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            selectedThreadId === thread.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}
          aria-label={`Conversation with ${thread.patientName}`}
          tabIndex={0}
        >
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">{thread.avatarInitials}</span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white rounded-full ${
                thread.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
              }`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-gray-900 truncate">{thread.patientName}</h4>
                <span className="text-xs text-gray-500">{thread.timestamp}</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">{thread.specialty}</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    thread.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-xs text-gray-500">
                    Office hours: 9-6p PST
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 truncate">{thread.lastMessage}</p>
              
              <div className="flex items-center gap-1 mt-2">
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                  Avg response: 24-48h
                </div>
                {thread.unread && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
      
      {/* Empty state */}
      {mockThreads.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>Select a conversation to start messaging</p>
        </div>
      )}
    </div>
  );

  const renderConversationHeader = () => {
    if (!currentThread) return null;
    
    return (
      <div className="msgsHeader bg-white border-b border-gray-100 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={handleBackToThreads}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Back to Messages"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            
            <div className="relative">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">{currentThread.avatarInitials}</span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white rounded-full ${
                currentThread.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
              }`} />
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900">{currentThread.patientName}</h3>
              <div className="flex items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700" style={{ height: '24px' }}>
                  <Clock className="w-3 h-3" />
                  Office hours: 9-6p PST
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700" style={{ height: '24px' }}>
                  <CheckCircle className="w-3 h-3" />
                  Avg response: 24-48h
                </div>
              </div>
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700" style={{ height: '20px' }}>
                BCBA Licensed
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Emergency Resources"
            >
              <AlertTriangle className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMessageStream = () => {
    if (!currentThread || currentMessages.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm">Send a message to begin chatting with your care team</p>
          </div>
        </div>
      );
    }

    // Group consecutive messages by sender
    const groupedMessages = currentMessages.reduce((acc, message, index) => {
      const prevMessage = currentMessages[index - 1];
      const isGrouped = prevMessage && prevMessage.sender === message.sender;
      
      if (isGrouped) {
        acc[acc.length - 1].messages.push(message);
      } else {
        acc.push({
          sender: message.sender,
          messages: [message]
        });
      }
      
      return acc;
    }, [] as Array<{ sender: 'coach' | 'patient'; messages: Message[] }>);

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Date separator */}
        <div className="flex items-center justify-center my-4">
          <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
            Today
          </div>
        </div>
        
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex} className={`flex ${group.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] space-y-1 ${group.sender === 'patient' ? 'ml-12' : 'mr-12'}`}>
              {group.messages.map((message, messageIndex) => (
                <div key={message.id}>
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      group.sender === 'patient'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.attachments.map((attachment, attachIndex) => (
                          <div
                            key={attachIndex}
                            className={`flex items-center gap-2 p-2 rounded-lg ${
                              group.sender === 'patient' 
                                ? 'bg-white/20' 
                                : 'bg-gray-50'
                            }`}
                          >
                            {attachment.type === 'file' && <FileText className="w-4 h-4" />}
                            {attachment.type === 'image' && <Image className="w-4 h-4" />}
                            {attachment.type === 'video' && <Video className="w-4 h-4" />}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{attachment.name}</div>
                              {attachment.size && (
                                <div className="text-xs opacity-75">{attachment.size}</div>
                              )}
                            </div>
                            <button className="p-1 hover:bg-white/20 rounded">
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp and delivery status */}
                  {messageIndex === group.messages.length - 1 && (
                    <div className={`mt-1 text-xs text-gray-500 ${
                      group.sender === 'patient' ? 'text-right' : 'text-left'
                    }`}>
                      <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {group.sender === 'patient' && message.deliveryStatus === 'delivered' && (
                        <span className="ml-2">Delivered</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] mr-12">
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    );
  };

  const renderComposer = () => {
    if (!currentThread) return null;
    
    return (
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 focus-within:border-blue-500 transition-colors">
          <textarea
            ref={composerRef}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="w-full bg-transparent resize-none focus:outline-none text-sm placeholder-gray-500 pr-20"
            style={{ minHeight: '20px', maxHeight: '120px' }}
          />
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Attach file"
              >
                <Paperclip className="w-4 h-4 text-gray-600" />
              </button>
              <button
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Voice input"
              >
                <Mic className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || isSending}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    if (isMobile && showThreadList) {
      return renderThreadList();
    }
    
    if (isMobile && !showThreadList) {
      return (
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {renderConversationHeader()}
          {renderMessageStream()}
          {renderComposer()}
        </div>
      );
    }
    
    // Desktop layout
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)]">
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg p-4 overflow-y-auto">
          {renderThreadList()}
        </div>
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
          {selectedThreadId ? (
            <>
              {renderConversationHeader()}
              {renderMessageStream()}
              {renderComposer()}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-sm">Choose a thread from the left to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSchedule = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Book a Session</h3>
          <div className="text-sm text-gray-500">Dr. Sarah Chen, BCBA</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setSelectedDuration(25)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              selectedDuration === 25
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">25 min</div>
              <div className="text-sm text-gray-600">Focus Session</div>
            </div>
          </button>
          <button
            onClick={() => setSelectedDuration(50)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              selectedDuration === 50
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">50 min</div>
              <div className="text-sm text-gray-600">Deep Dive</div>
            </div>
          </button>
        </div>
        
        <Button onClick={handleBookSession} className="w-full">
          Book {selectedDuration}-minute Session
        </Button>
      </div>
      
      {/* Upcoming Sessions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Sessions</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Dr. Sarah Chen, BCBA</div>
              <div className="text-sm text-gray-600">Thursday, Dec 19 • 2:00 PM PST</div>
            </div>
            <Badge variant="outline">25 min</Badge>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMinutes = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Minutes Wallet</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">200</div>
            <div className="text-sm text-gray-600">Included</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{remainingMinutes}</div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{usedMinutes}</div>
            <div className="text-sm text-gray-600">Used</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Buy Additional Minutes</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg text-center">
            <div className="text-xl font-bold">25 min</div>
            <div className="text-lg font-semibold text-blue-600">$49</div>
            <Button onClick={() => handleBuyMinutes(25)} size="sm" className="mt-2 w-full">
              Purchase
            </Button>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg text-center">
            <div className="text-xl font-bold">50 min</div>
            <div className="text-lg font-semibold text-blue-600">$89</div>
            <Button onClick={() => handleBuyMinutes(50)} size="sm" className="mt-2 w-full">
              Purchase
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPastSessions = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session History</h3>
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Dr. Sarah Chen, BCBA</div>
              <div className="text-sm text-gray-500">Dec 10, 2024</div>
            </div>
            <div className="text-sm text-gray-600 mb-3">
              Morning routine strategies and visual schedule implementation
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Session Notes
              </Button>
              <Button size="sm" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Resources
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isPro) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="p-4">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleBackToDashboard}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Professional Care</h1>
                <p className="text-sm text-gray-500">Direct messaging with your care team</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
              
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Upgrade to Pro for Full Care Access
              </h2>
              
              <p className="text-gray-600 mb-6">
                Get unlimited messaging, session booking, and personalized care coordination.
              </p>
              
              <Button className="w-full">
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Professional Care</h1>
              <p className="text-sm text-gray-500">Secure messaging and session management</p>
            </div>
          </div>
          
          {/* Top Actions */}
          {renderTopActions()}
          
          {/* Section Tabs */}
          {renderSectionTabs()}
          
          {/* Content */}
          <div className="min-h-[400px]">
            {activeView === 'messages' && renderMessages()}
            {activeView === 'schedule' && renderSchedule()}
            {activeView === 'minutes' && renderMinutes()}
            {activeView === 'past-sessions' && renderPastSessions()}
          </div>
        </div>
      </div>
      
      {/* Footer Disclaimer - with safe area for notched devices */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 p-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            For emergencies, call 911. This is educational guidance, not medical treatment.
          </p>
        </div>
      </div>
    </div>
  );
}