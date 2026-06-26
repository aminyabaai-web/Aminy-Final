// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import {
  MessageCircle,
  Send,
  Sparkles,
  CheckCircle,
  Shield,
  FileText,
  Mail,
  Download,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface CoverageChatFlowProps {
  childName: string;
  parentName: string;
  onComplete: (responses: CoverageResponses) => void;
  onCancel?: () => void;
}

export interface CoverageResponses {
  primaryInsurance: {
    hasInsurance: boolean;
    provider?: string;
    memberID?: string;
    groupNumber?: string;
    state?: string;
  };
  secondaryCoverage: {
    hasSecondary: boolean;
    type?: 'medicaid' | 'chip' | 'private' | 'other';
    details?: string;
  };
  respiteServices: {
    interested: boolean;
    currentUsage?: string;
    hours?: string;
  };
  habilitationServices: {
    interested: boolean;
    serviceTypes?: string[];
    frequency?: string;
  };
  currentChallenges?: string;
  specificGoals?: string;
}

interface ChatMessage {
  id: string;
  type: 'aminy' | 'user';
  content: string | React.ReactNode;
  timestamp: Date;
}

interface Question {
  id: string;
  aminyMessage: string | ((data: Partial<CoverageResponses>) => string);
  inputType: 'text' | 'radio' | 'multiselect' | 'textarea';
  options?: { value: string; label: string; description?: string }[];
  fieldPath: string;
  followUpQuestion?: (answer: string) => string | null;
}

const questions: Question[] = [
  {
    id: 'primary_insurance',
    aminyMessage: "Let's start with your insurance. Do you have health insurance coverage?",
    inputType: 'radio',
    options: [
      { value: 'yes', label: 'Yes, I have insurance' },
      { value: 'no', label: 'No insurance currently' },
      { value: 'unsure', label: "I'm not sure about my coverage" }
    ],
    fieldPath: 'primaryInsurance.hasInsurance'
  },
  {
    id: 'insurance_details',
    aminyMessage: "Great — knowing your insurance details helps me find exactly what's covered. What's your insurance provider?",
    inputType: 'text',
    fieldPath: 'primaryInsurance.provider'
  },
  {
    id: 'secondary_coverage',
    aminyMessage: (data) => `Got it. Do you have any secondary coverage like Medicaid, CHIP, or another plan?`,
    inputType: 'radio',
    options: [
      { value: 'medicaid', label: 'Medicaid', description: 'State health coverage for qualifying families' },
      { value: 'chip', label: 'CHIP', description: "Children's Health Insurance Program" },
      { value: 'private', label: 'Private secondary insurance' },
      { value: 'none', label: 'No secondary coverage' }
    ],
    fieldPath: 'secondaryCoverage.type'
  },
  {
    id: 'respite_services',
    aminyMessage: "Respite care gives you time to recharge while your child is supported by trained caregivers. Are you interested in exploring respite options?",
    inputType: 'radio',
    options: [
      { value: 'yes', label: 'Yes, I need respite support' },
      { value: 'maybe', label: 'Maybe, tell me more' },
      { value: 'no', label: 'Not right now' }
    ],
    fieldPath: 'respiteServices.interested',
    followUpQuestion: (answer) => {
      if (answer === 'yes') {
        return "How many hours of respite per week would be helpful for you?";
      }
      return null;
    }
  },
  {
    id: 'habilitation_services',
    aminyMessage: "Habilitation services help your child develop new skills. What types of services are you most interested in?",
    inputType: 'multiselect',
    options: [
      { value: 'speech', label: 'Speech therapy', description: 'Communication and language development' },
      { value: 'ot', label: 'Occupational therapy', description: 'Sensory and motor skills' },
      { value: 'pt', label: 'Physical therapy', description: 'Movement and strength' },
      { value: 'aba', label: 'ABA therapy', description: 'Applied Behavior Analysis' },
      { value: 'social', label: 'Social skills groups', description: 'Peer interaction training' }
    ],
    fieldPath: 'habilitationServices.serviceTypes'
  },
  {
    id: 'specific_goals',
    aminyMessage: "Almost done! What's the biggest thing you're trying to accomplish with coverage? (This helps me prioritize recommendations)",
    inputType: 'textarea',
    fieldPath: 'specificGoals'
  }
];

export function CoverageChatFlow({ 
  childName, 
  parentName, 
  onComplete, 
  onCancel 
}: CoverageChatFlowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Partial<CoverageResponses>>({});
  const [currentInput, setCurrentInput] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: '0',
      type: 'aminy',
      content: `Hi ${parentName} — I'm here to help you understand what's covered for ${childName}. I'll ask you a few quick questions to create a personalized Coverage Clarity Summary. Ready?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    
    // Show first question after a brief delay
    setTimeout(() => {
      showNextQuestion();
    }, 1500);
  }, []);

  const showNextQuestion = () => {
    if (currentQuestionIndex >= questions.length) {
      handleComplete();
      return;
    }

    const question = questions[currentQuestionIndex];
    const messageContent = typeof question.aminyMessage === 'function' 
      ? question.aminyMessage(responses) 
      : question.aminyMessage;

    const newMessage: ChatMessage = {
      id: `q-${currentQuestionIndex}`,
      type: 'aminy',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentInput('');
    setSelectedOptions([]);
  };

  const handleTextSubmit = () => {
    if (!currentInput.trim()) return;

    const question = questions[currentQuestionIndex];
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `a-${currentQuestionIndex}`,
      type: 'user',
      content: currentInput,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Store response
    updateResponse(question.fieldPath, currentInput);

    // Move to next question
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeout(showNextQuestion, 800);
    }, 500);
  };

  const handleRadioSelect = (value: string) => {
    const question = questions[currentQuestionIndex];
    
    // Add user message
    const selectedOption = question.options?.find(opt => opt.value === value);
    const userMessage: ChatMessage = {
      id: `a-${currentQuestionIndex}`,
      type: 'user',
      content: selectedOption?.label || value,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Store response
    updateResponse(question.fieldPath, value);

    // Check for follow-up question
    if (question.followUpQuestion) {
      const followUp = question.followUpQuestion(value);
      if (followUp) {
        setTimeout(() => {
          const followUpMessage: ChatMessage = {
            id: `followup-${currentQuestionIndex}`,
            type: 'aminy',
            content: followUp,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, followUpMessage]);
        }, 800);
        return;
      }
    }

    // Move to next question
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeout(showNextQuestion, 800);
    }, 500);
  };

  const handleMultiSelectSubmit = () => {
    if (selectedOptions.length === 0) {
      toast.error('Pick at least one option to continue');
      return;
    }

    const question = questions[currentQuestionIndex];
    
    // Add user message
    const selectedLabels = selectedOptions.map(value => 
      question.options?.find(opt => opt.value === value)?.label
    ).join(', ');
    
    const userMessage: ChatMessage = {
      id: `a-${currentQuestionIndex}`,
      type: 'user',
      content: selectedLabels,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Store response
    updateResponse(question.fieldPath, selectedOptions);

    // Move to next question
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeout(showNextQuestion, 800);
    }, 500);
  };

  const updateResponse = (fieldPath: string, value: string | string[]) => {
    const pathParts = fieldPath.split('.');
    setResponses(prev => {
      const newResponses = { ...prev };
      let current: Record<string, unknown> = newResponses as Record<string, unknown>;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]] as Record<string, unknown>;
      }
      
      current[pathParts[pathParts.length - 1]] = value;
      return newResponses;
    });
  };

  const handleComplete = () => {
    const completionMessage: ChatMessage = {
      id: 'complete',
      type: 'aminy',
      content: `Perfect! I have everything I need. I'm creating your personalized Coverage Clarity Summary now...`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, completionMessage]);

    setTimeout(() => {
      onComplete(responses as CoverageResponses);
    }, 2000);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / (questions.length + 1)) * 100;

  return (
    <div className="flex flex-col h-full max-h-screen bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[#E8E4DF] bg-gradient-to-r from-[#FAF7F2] to-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[#132F43]">Coverage Chat</h2>
              <p className="text-sm text-[#5A6B7A]">Question {Math.min(currentQuestionIndex + 1, questions.length)} of {questions.length}</p>
            </div>
          </div>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 sm:space-y-4"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'aminy' && (
              <div className="flex items-start gap-2 max-w-[80%]">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#F0EDE8] rounded-2xl rounded-tl-none px-4 py-3">
                  <p className="text-sm text-[#132F43] leading-relaxed">{message.content}</p>
                </div>
              </div>
            )}
            {message.type === 'user' && (
              <div className="bg-primary rounded-2xl rounded-tr-none px-4 py-3 max-w-[80%]">
                <p className="text-sm text-white leading-relaxed">{message.content}</p>
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2 max-w-[80%]">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-[#F0EDE8] rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span className="text-sm text-[#5A6B7A]">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {currentQuestion && !isProcessing && currentQuestionIndex < questions.length && (
        <div className="flex-shrink-0 border-t border-[#E8E4DF] p-4 bg-white">
          {currentQuestion.inputType === 'text' && (
            <div className="flex gap-2">
              <Input
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                placeholder="Type your answer..."
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleTextSubmit} disabled={!currentInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {currentQuestion.inputType === 'textarea' && (
            <div className="space-y-2">
              <Textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Share your thoughts..."
                className="min-h-[100px]"
                autoFocus
              />
              <Button onClick={handleTextSubmit} disabled={!currentInput.trim()} className="w-full">
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {currentQuestion.inputType === 'radio' && (
            <div className="space-y-2">
              {currentQuestion.options?.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRadioSelect(option.value)}
                  className="w-full text-left p-4 rounded-lg border-2 border-[#E8E4DF] hover:border-[#6B9080] hover:bg-[#6B9080]/10 transition-all"
                >
                  <div className="font-medium text-[#132F43]">{option.label}</div>
                  {option.description && (
                    <div className="text-sm text-[#5A6B7A] mt-1">{option.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.inputType === 'multiselect' && (
            <div className="space-y-3">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {currentQuestion.options?.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedOptions.includes(option.value)
                        ? 'border-[#6B9080] bg-[#6B9080]/10'
                        : 'border-[#E8E4DF] hover:border-[#6B9080]/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOptions(prev => [...prev, option.value]);
                        } else {
                          setSelectedOptions(prev => prev.filter(v => v !== option.value));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-[#132F43]">{option.label}</div>
                      {option.description && (
                        <div className="text-sm text-[#5A6B7A] mt-1">{option.description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <Button 
                onClick={handleMultiSelectSubmit} 
                disabled={selectedOptions.length === 0}
                className="w-full"
              >
                Continue ({selectedOptions.length} selected) <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
