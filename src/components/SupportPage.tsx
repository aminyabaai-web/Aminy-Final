// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  ArrowLeft,
  HelpCircle,
  Search,
  Bell,
  User,
  Zap,
  Brain,
  MessageCircle,
  Mail,
  Phone,
  Video,
  Clock,
  CheckCircle,
  AlertTriangle,
  Shield,
  Activity,
  RefreshCw,
  Download,
  FileText,
  BookOpen,
  Play,
  ExternalLink,
  Send,
  ThumbsUp,
  ThumbsDown,
  Settings,
  CreditCard,
  Smartphone,
  Wifi,
  Eye,
  Star,
  Crown,
  Users,
  Bug,
  Lightbulb,
  Heart,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Info,
  Paperclip,
  Copy,
  QrCode,
  AlertCircle,
  MessageCircle as MessageSquareIcon
} from 'lucide-react';

interface SupportPageProps {
  onNavigate?: (destination: string) => void;
  userTier?: string;
}

// Mock user data
const mockUserData = {
  name: "Amy Johnson",
  email: "amy.johnson@email.com",
  childName: "Eddie"
};

export function SupportPage({ onNavigate, userTier = 'core' }: SupportPageProps) {
  const [activeView, setActiveView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [troubleshooterStep, setTroubleshooterStep] = useState(0);
  const [troubleshooterPath, setTroubleshooterPath] = useState<string[]>([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiQuery, setAiQuery] = useState('');

  // Quick tiles for help home - memoized to prevent re-creation
  const quickTiles = useMemo(() => [
    {
      id: 'junior-setup',
      title: 'Set up Aminy Ease',
      description: 'Pair your child\'s device',
      icon: <Smartphone className="w-5 h-5" />,
      category: 'setup',
      popular: true
    },
    ...(userTier === 'pro' ? [{
      id: 'schedule-session',
      title: 'Schedule a Session',
      description: 'Book live telehealth',
      icon: <Video className="w-5 h-5" />,
      category: 'sessions',
      popular: true
    }] : []),
    {
      id: 'billing',
      title: 'Manage Plan & Billing',
      description: 'Update payment & subscription',
      icon: <CreditCard className="w-5 h-5" />,
      category: 'billing',
      popular: true
    },
    {
      id: 'reports',
      title: 'Reports & Exports',
      description: 'Download and share data',
      icon: <Download className="w-5 h-5" />,
      category: 'reports',
      popular: false
    },
    {
      id: 'privacy',
      title: 'Privacy & Sharing',
      description: 'Control data access',
      icon: <Shield className="w-5 h-5" />,
      category: 'privacy',
      popular: false
    }
  ], [userTier]);

  // Guided troubleshooters - memoized to prevent re-creation
  const troubleshooters = useMemo(() => [
    {
      id: 'junior-pairing',
      title: 'Ease Pairing Not Working',
      icon: <Smartphone className="w-5 h-5" />,
      steps: [
        { id: 'wifi', title: 'Check Wi-Fi Connection', instruction: 'Make sure both devices are on the same Wi-Fi network' },
        { id: 'update', title: 'Update App', instruction: 'Check for app updates in the App Store or Play Store' },
        { id: 'code', title: 'Display Pairing Code', instruction: 'Go to Settings > Ease Setup and display the QR code' },
        { id: 'pair', title: 'Re-pair Device', instruction: 'Scan the QR code with your child\'s device' }
      ]
    },
    {
      id: 'signin-issues',
      title: 'Can\'t Sign In / Verification Emails',
      icon: <Mail className="w-5 h-5" />,
      steps: [
        { id: 'email', title: 'Check Email Address', instruction: 'Verify you\'re using the correct email address' },
        { id: 'spam', title: 'Check Spam Folder', instruction: 'Look for emails from support@aminy.ai' },
        { id: 'resend', title: 'Resend Verification', instruction: 'Request a new verification email' }
      ]
    },
    ...(userTier === 'pro' ? [{
      id: 'session-booking',
      title: 'Session Booking / Reschedule / Credits',
      icon: <Video className="w-5 h-5" />,
      steps: [
        { id: 'balance', title: 'Check Credit Balance', instruction: 'Go to Settings > Sessions to view remaining credits' },
        { id: 'calendar', title: 'Select Available Time', instruction: 'Choose from available time slots in your preferred window' }
      ]
    }] : []),
    {
      id: 'exports-pdfs',
      title: 'Exports & PDFs Not Downloading',
      icon: <Download className="w-5 h-5" />,
      steps: [
        { id: 'browser', title: 'Check Browser Settings', instruction: 'Allow downloads and pop-ups for aminy.com' },
        { id: 'space', title: 'Check Storage Space', instruction: 'Ensure you have enough space on your device' }
      ]
    }
  ], [userTier]);

  // Contact topics for triage - memoized to prevent re-creation
  const contactTopics = useMemo(() => [
    { id: 'account-billing', label: 'Account & Billing', sla: userTier === 'pro' ? '4-8 hours' : '24-48 hours' },
    { id: 'junior-devices', label: 'Ease & Devices', sla: userTier === 'pro' ? '4-8 hours' : '24-48 hours' },
    ...(userTier === 'pro' ? [{ id: 'sessions', label: 'Sessions', sla: 'Priority - 2-4 hours' }] : []),
    { id: 'reports-data', label: 'Reports & Data', sla: userTier === 'pro' ? '4-8 hours' : '24-48 hours' },
    { id: 'privacy-sharing', label: 'Privacy & Sharing', sla: userTier === 'pro' ? '4-8 hours' : '24-48 hours' },
    { id: 'other', label: 'Other', sla: userTier === 'pro' ? '4-8 hours' : '24-48 hours' }
  ], [userTier]);

  // System status (mock) - memoized to prevent re-creation
  const systemStatus = useMemo(() => ({
    overall: 'operational' as const,
    services: [
      { name: 'Aminy Web App', status: 'operational' as const },
      { name: 'Aminy Ease', status: 'operational' as const },
      { name: 'Care Messaging', status: 'operational' as const },
      { name: 'Live Sessions', status: 'operational' as const, proOnly: true },
      { name: 'Reports & Exports', status: 'operational' as const }
    ],
    lastIncident: 'Feb 8, 2024 - Brief maintenance window completed'
  }), []);

  // AI Assistant suggestions - memoized to prevent re-creation
  const aiSuggestions = useMemo(() => [
    "How do I pair Aminy Ease?",
    "Why can't I schedule a session?",
    "How do I export my progress report?",
    "Where do I update my billing information?"
  ], []);

  // AI Response data structure
  const [aiResponse, setAiResponse] = useState<{
    query: string;
    article: string;
    steps: string[];
    canTryFix: boolean;
  } | null>(null);

  const getAIArticle = useCallback((query: string): string => {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('pair') || lowerQuery.includes('junior')) {
      return "Pairing Aminy Ease requires both devices on the same network and updated apps.";
    } else if (lowerQuery.includes('session') || lowerQuery.includes('video')) {
      return "Session booking requires active Pro subscription and available credits.";
    } else if (lowerQuery.includes('report') || lowerQuery.includes('export')) {
      return "Export issues are often related to browser settings or temporary connectivity.";
    } else {
      return "Here's what we found about your issue:";
    }
  }, []);

  const getAISteps = useCallback((query: string): string[] => {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('pair') || lowerQuery.includes('junior')) {
      return [
        "Check that both devices are connected to the same Wi-Fi network",
        "Update Aminy app on both devices to the latest version",
        "Go to Settings > Ease Setup and display the QR code",
        "Scan the QR code with your child's device camera"
      ];
    } else if (lowerQuery.includes('session') || lowerQuery.includes('video')) {
      return [
        "Verify you have a Pro subscription with available credits",
        "Check your preferred scheduling window in Settings",
        "Ensure your calendar app permissions are enabled",
        "Try booking during off-peak hours (10 AM - 2 PM)"
      ];
    } else if (lowerQuery.includes('report') || lowerQuery.includes('export')) {
      return [
        "Check your browser allows downloads from aminy.com",
        "Disable ad blockers and pop-up blockers temporarily",
        "Clear browser cache and try again",
        "Try downloading from a different browser or device"
      ];
    } else {
      return [
        "Check your account settings and preferences",
        "Refresh the app or restart your browser",
        "Ensure you have a stable internet connection",
        "Try logging out and back in again"
      ];
    }
  }, []);

  const handleAIQuery = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setAiQuery(query);
    setShowAIAssistant(true);
    
    // Immediate response instead of setTimeout to prevent timeout issues
    setAiResponse({
      query,
      article: getAIArticle(query),
      steps: getAISteps(query),
      canTryFix: true
    });
  }, [getAIArticle, getAISteps]);

  const handleTryFix = useCallback((action: string) => {
    // Simplified action without alert to prevent blocking
    setAiResponse(prev => prev ? { ...prev, canTryFix: false } : null);
  }, []);

  const handleSubmitContact = useCallback(() => {
    if (!selectedTopic || !contactMessage.trim()) return;
    
    const caseId = `#${Math.floor(Math.random() * 10000)}`;
    
    // Show success state instead of alert
    setContactMessage('');
    setSelectedTopic('');
    
    // Could show a toast or success message here instead of alert
  }, [selectedTopic, contactMessage]);

  const renderHome = () => (
    <div className="space-y-8">
      {/* Hero Search */}
      <div className="text-center space-y-3 sm:space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">How can we help you?</h1>
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Ask about routines, billing, pairing Ease..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                handleAIQuery(searchQuery);
              }
            }}
          />
        </div>
      </div>

      {/* Quick Tiles */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickTiles.map((tile) => (
          <Card key={tile.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                {tile.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900">{tile.title}</h3>
                  {tile.popular && (
                    <Badge className="bg-orange-100 text-orange-700 text-xs">Popular</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600">{tile.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </Card>
        ))}
      </div>

      {/* AI Assistant */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">AI Assistant</h2>
          <Badge className="bg-accent/10 text-accent text-xs">Instant Help</Badge>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <p className="text-sm text-slate-600">Describe your issue and get instant solutions with in-app fixes.</p>
          
          <div className="relative">
            <Textarea
              placeholder="Describe your issue... (e.g., 'I can't pair my child's iPad' or 'My reports won't download')"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="min-h-[80px] pr-12"
            />
            <Button 
              size="sm"
              className="absolute bottom-2 right-2 bg-accent hover:bg-accent/90 text-white"
              onClick={() => handleAIQuery(aiQuery)}
              disabled={!aiQuery.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {aiSuggestions.slice(0, 4).map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleAIQuery(suggestion)}
                className="text-xs hover:bg-accent/5 hover:border-accent"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {/* AI Response */}
        {aiResponse && (
          <div className="mt-4 sm:mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <Brain className="w-3 h-3 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">AI Solution</h3>
                <p className="text-sm text-blue-700">{aiResponse.article}</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              {aiResponse.steps.slice(0, 3).map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-semibold text-blue-600 border border-blue-200">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-slate-700">{step}</p>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveView('contact')}
              >
                Contact Support
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setAiResponse(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Support SLA Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <strong>Response Times:</strong> We reply within {userTier === 'pro' ? '4-8 hours' : '24-48 business hours'}. 
            {userTier === 'pro' ? ' Pro plans receive priority support.' : ' Pro plans get faster response times and priority handling.'}
          </div>
        </div>
      </div>
    </div>
  );

  const [activeTroubleshooter, setActiveTroubleshooter] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepResults, setStepResults] = useState<{ [key: string]: 'worked' | 'failed' | null }>({});

  const handleStepResult = useCallback((stepId: string, result: 'worked' | 'failed') => {
    setStepResults(prev => ({ ...prev, [stepId]: result }));
    
    if (result === 'worked') {
      // Success! Reset troubleshooter
      setActiveTroubleshooter(null);
      setCurrentStep(0);
      setStepResults({});
    } else {
      // Move to next step or show contact form
      const troubleshooter = troubleshooters.find(t => t.id === activeTroubleshooter);
      if (troubleshooter && currentStep < troubleshooter.steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // All steps failed, route to contact
        setActiveView('contact');
        setActiveTroubleshooter(null);
        setCurrentStep(0);
        setStepResults({});
      }
    }
  }, [activeTroubleshooter, currentStep, troubleshooters]);

  const renderTroubleshooters = () => {
    if (activeTroubleshooter) {
      const troubleshooter = troubleshooters.find(t => t.id === activeTroubleshooter);
      if (!troubleshooter) return null;
      
      const step = troubleshooter.steps[currentStep];
      
      return (
        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setActiveTroubleshooter(null);
                setCurrentStep(0);
                setStepResults({});
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Troubleshooters
            </Button>
            <h1 className="text-2xl font-semibold text-slate-900">{troubleshooter.title}</h1>
          </div>
          
          {/* Progress Indicator */}
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-900">Step {currentStep + 1} of {troubleshooter.steps.length}</span>
              <span className="text-xs text-slate-500">
                {Math.round(((currentStep + 1) / troubleshooter.steps.length) * 100)}% complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / troubleshooter.steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Current Step */}
          <Card className="p-8">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xl sm:text-2xl font-bold text-accent">{currentStep + 1}</span>
              </div>
              
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">{step.title}</h2>
              <p className="text-slate-600 max-w-md mx-auto">{step.instruction}</p>
              
              {step.id === 'code' && (
                <div className="bg-gray-50 rounded-lg p-4 my-4">
                  <div className="flex items-center justify-center gap-3 sm:gap-4">
                    <QrCode className="w-16 h-16 text-slate-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900">Sample QR Code</p>
                      <p className="text-xs text-slate-500">This would show your actual pairing code</p>
                    </div>
                  </div>
                </div>
              )}
              
              {step.id === 'resend' && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => handleTryFix('resend-verification')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </Button>
              )}
            </div>
            
            <div className="flex justify-center gap-3 sm:gap-4 mt-8">
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                onClick={() => handleStepResult(step.id, 'worked')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                It Worked
              </Button>
              <Button 
                variant="outline" 
                className="min-w-[120px]"
                onClick={() => handleStepResult(step.id, 'failed')}
              >
                <X className="w-4 h-4 mr-2" />
                It Didn't Work
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-3 sm:space-y-4 sm:space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Guided Troubleshooters</h1>
        <p className="text-slate-600">Step-by-step solutions with automatic diagnostics collection</p>
        
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {troubleshooters.map((troubleshooter) => (
            <Card key={troubleshooter.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 sm:gap-4 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                  {troubleshooter.icon}
                </div>
                <h3 className="font-semibold text-slate-900">{troubleshooter.title}</h3>
              </div>
              
              <div className="space-y-2 mb-4">
                {troubleshooter.steps.slice(0, 3).map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-xs font-semibold text-slate-600">
                      {idx + 1}
                    </div>
                    <span>{step.title}</span>
                  </div>
                ))}
                <div className="text-xs text-slate-500">+{troubleshooter.steps.length - 3} more steps</div>
              </div>
              
              <Button 
                className="w-full"
                onClick={() => {
                  setActiveTroubleshooter(troubleshooter.id);
                  setCurrentStep(0);
                }}
              >
                Start Troubleshooter
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          ))}
        </div>

        {/* Self-Service Success Stats */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="text-sm text-green-900">
              <strong>90% of issues</strong> are resolved using our guided troubleshooters. Average resolution time: <strong>3 minutes</strong>.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContact = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Contact Us</h1>
      
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Triage Form */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-3">What do you need help with?</label>
            <div className="grid gap-2 md:grid-cols-2">
              {contactTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedTopic === topic.id
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-gray-200 hover:border-gray-300 text-slate-700'
                  }`}
                >
                  <div className="font-medium">{topic.label}</div>
                  <div className="text-xs text-slate-500 mt-1">Response: {topic.sla}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Pro Coach Shortcut */}
          {userTier === 'pro' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-purple-900">Message Your Aminy Coach</h3>
                  <p className="text-sm text-purple-700">Get personalized guidance from your assigned coach</p>
                </div>
                <Button 
                  variant="outline" 
                  className="ml-auto border-purple-300 text-purple-700 hover:bg-purple-100"
                  onClick={() => onNavigate?.('care')}
                >
                  Open Care
                </Button>
              </div>
            </div>
          )}

          {/* Message Field */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Describe your issue</label>
            <Textarea
              placeholder="Please provide as much detail as possible about what you're experiencing..."
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Attachments (optional)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Paperclip className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Drop screenshots or files here</p>
              <p className="text-xs text-slate-500">Helps us understand your issue better</p>
            </div>
          </div>

          {/* Contact Preference */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-3">Preferred contact method</label>
            <div className="flex gap-3 sm:gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="contact" value="email" defaultChecked />
                <span className="text-sm text-slate-700">Email (default)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="contact" value="sms" />
                <span className="text-sm text-slate-700">SMS callback (optional)</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-slate-500">
              Expected response: {selectedTopic ? contactTopics.find(t => t.id === selectedTopic)?.sla || '24-48 hours' : '24-48 hours'}
            </div>
            <Button
              onClick={handleSubmitContact}
              disabled={!selectedTopic || !contactMessage.trim()}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderOrderBilling = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Order & Billing Support</h1>
      
      <div className="grid gap-3 sm:gap-4 sm:gap-6 md:grid-cols-2">
        {/* Common Actions */}
        <Card className="p-4 sm:p-5 md:p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => onNavigate?.('settings')}
            >
              <CreditCard className="w-4 h-4 mr-3" />
              Update Payment Method
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-3" />
              Download Invoice
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <RefreshCw className="w-4 h-4 mr-3" />
              Change Subscription
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <AlertTriangle className="w-4 h-4 mr-3" />
              Dispute a Charge
            </Button>
          </div>
        </Card>

        {/* Refund Policy */}
        <Card className="p-4 sm:p-5 md:p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Refund Policy</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <p><strong>30-day money-back guarantee</strong> for new subscriptions</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <p><strong>Pro sessions:</strong> Full refund if cancelled 24+ hours before</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <p><strong>Digital purchases:</strong> 7-day refund window</p>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <p>Refunds processed within 5-7 business days</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Billing History */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Recent Charges</h2>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('settings')}>
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {[
            { date: 'Feb 15, 2024', description: 'Core Plan - Monthly', amount: '$59.00', status: 'Paid' },
            { date: 'Jan 15, 2024', description: 'Core Plan - Monthly', amount: '$59.00', status: 'Paid' }
          ].map((charge, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-slate-900">{charge.description}</p>
                <p className="text-sm text-slate-500">{charge.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">{charge.amount}</span>
                <Badge className="bg-green-100 text-green-700">{charge.status}</Badge>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderSafety = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Safety & Urgent Guidance</h1>
      
      {/* Emergency Notice */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-900 mb-2">Emergency Guidance</h2>
            <p className="text-red-800 mb-4">
              <strong>Aminy provides educational guidance. For emergencies, call local emergency services.</strong>
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Emergency: 911</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Crisis Text Line: Text HOME to 741741</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">National Suicide Prevention Lifeline: 988</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Non-Emergency Resources */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Child Development Resources</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-between">
              <span>Early Intervention Services</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              <span>Autism Support Networks</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              <span>Special Education Resources</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Parent Support</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-between">
              <span>Parent Support Groups</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              <span>Family Counseling Resources</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              <span>Respite Care Services</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Safety Guidelines */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Safety Guidelines</h2>
        <div className="space-y-3 sm:space-y-4 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-green-600 mt-0.5" />
            <p><strong>Data Protection:</strong> All information shared with Aminy is encrypted and handled according to HIPAA-conscious practices.</p>
          </div>
          <div className="flex items-start gap-2">
            <Eye className="w-4 h-4 text-blue-600 mt-0.5" />
            <p><strong>Privacy:</strong> You control who sees your child's information through our granular sharing controls.</p>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-purple-600 mt-0.5" />
            <p><strong>Professional Boundaries:</strong> Our coaches provide educational guidance, not medical treatment.</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderSystemStatus = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">System Status & Updates</h1>
      
      {/* Overall Status */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <div className={`w-3 h-3 rounded-full ${
            systemStatus.overall === 'operational' ? 'bg-green-500' :
            systemStatus.overall === 'degraded' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
          <h2 className="text-lg font-semibold text-slate-900">
            {systemStatus.overall === 'operational' ? 'All Systems Operational' :
             systemStatus.overall === 'degraded' ? 'Some Services Affected' :
             'Service Outage'}
          </h2>
        </div>
        
        <div className="space-y-3">
          {systemStatus.services.map((service, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  service.status === 'operational' ? 'bg-green-500' :
                  service.status === 'degraded' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <span className="text-sm text-slate-700">{service.name}</span>
                {service.proOnly && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs">Pro</Badge>
                )}
              </div>
              <Badge 
                className={`text-xs ${
                  service.status === 'operational' ? 'bg-green-100 text-green-700' :
                  service.status === 'degraded' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}
              >
                {service.status}
              </Badge>
            </div>
          ))}
        </div>

        {systemStatus.lastIncident && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-slate-500">
              <strong>Last incident:</strong> {systemStatus.lastIncident}
            </p>
          </div>
        )}
      </Card>

      {/* Release Notes */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Latest Updates</h2>
          <Badge className="bg-blue-100 text-blue-700">Version 1.2.4</Badge>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {[
            { date: 'Feb 10, 2024', title: 'Enhanced AI Recommendations', type: 'feature' },
            { date: 'Feb 5, 2024', title: 'Improved Ease Pairing', type: 'improvement' },
            { date: 'Jan 28, 2024', title: 'Bug Fixes & Performance', type: 'fix' }
          ].map((update, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <Badge 
                className={`text-xs mt-1 ${
                  update.type === 'feature' ? 'bg-green-100 text-green-700' :
                  update.type === 'improvement' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}
              >
                {update.type}
              </Badge>
              <div>
                <h3 className="font-medium text-slate-900">{update.title}</h3>
                <p className="text-xs text-slate-500">{update.date}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mt-4">
          <Button variant="outline" size="sm">
            View All Release Notes
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>

      {/* Beta Features */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-slate-900">Beta Features</h2>
        </div>
        
        <p className="text-sm text-slate-600 mb-4">
          Get early access to new features and help shape Aminy's future.
        </p>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-slate-900">Join Beta Program</h3>
            <p className="text-xs text-slate-500">Get new features before they're released</p>
          </div>
          <Button variant="outline" size="sm">
            Join Beta
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderFeedback = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Feedback & Requests</h1>
      
      <div className="grid gap-3 sm:gap-4 sm:gap-6 md:grid-cols-2">
        {/* Feature Requests */}
        <Card className="p-4 sm:p-5 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-slate-900">Suggest a Feature</h2>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Which area?</label>
              <select className="w-full border rounded-lg px-3 py-2">
                <option value="">Select area...</option>
                <option value="plan">Plan</option>
                <option value="junior">Ease</option>
                <option value="care">Care</option>
                <option value="reports">Reports</option>
                <option value="settings">Settings</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <Textarea
              placeholder="Describe your feature idea..."
              className="min-h-[100px]"
            />
            
            <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
              <Lightbulb className="w-4 h-4 mr-2" />
              Submit Suggestion
            </Button>
          </div>
        </Card>

        {/* Bug Reports */}
        <Card className="p-4 sm:p-5 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bug className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">Report a Bug</h2>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-slate-900 mb-2">Device Info</h3>
              <div className="space-y-1 text-xs text-slate-600">
                <p>Browser: Chrome 120.0.0</p>
                <p>OS: macOS 14.2.1</p>
                <p>App Version: 1.2.4</p>
                <p>Screen: 1920x1080</p>
              </div>
            </div>
            
            <Textarea
              placeholder="What happened? Please include steps to reproduce..."
              className="min-h-[100px]"
            />
            
            <Button className="w-full bg-red-500 hover:bg-red-600 text-white">
              <Bug className="w-4 h-4 mr-2" />
              Report Bug
            </Button>
          </div>
        </Card>
      </div>

      {/* Share Your Story */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="w-5 h-5 text-pink-500" />
          <h2 className="text-lg font-semibold text-slate-900">Share Your Story</h2>
        </div>
        
        <p className="text-sm text-slate-600 mb-4">
          Help other families by sharing how Aminy has made a difference in your journey.
        </p>
        
        <Textarea
          placeholder="Tell us about your experience with Aminy..."
          className="min-h-[120px] mb-4"
        />
        
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="rounded" />
            <span>I consent to sharing my story publicly</span>
          </label>
          <Button className="bg-pink-500 hover:bg-pink-600 text-white">
            <Heart className="w-4 h-4 mr-2" />
            Share Story
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate?.('more')}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-semibold text-slate-900">Support</h1>
                    <p className="text-sm text-slate-600">Frictionless help, fast resolution</p>
                  </div>
                </div>
              </div>
              
              {/* Navigation Tabs */}
              <div className="hidden md:flex items-center space-x-1">
                <Button
                  variant={activeView === 'home' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('home')}
                >
                  Help Home
                </Button>
                <Button
                  variant={activeView === 'troubleshooters' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('troubleshooters')}
                >
                  Troubleshooters
                </Button>
                <Button
                  variant={activeView === 'contact' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('contact')}
                >
                  Contact Us
                </Button>
                <Button
                  variant={activeView === 'billing' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('billing')}
                >
                  Order & Billing
                </Button>
                <Button
                  variant={activeView === 'safety' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('safety')}
                >
                  Safety
                </Button>
                <Button
                  variant={activeView === 'status' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('status')}
                >
                  System Status
                </Button>
                <Button
                  variant={activeView === 'feedback' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('feedback')}
                >
                  Feedback
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="px-4 py-2">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'home', label: 'Home' },
              { id: 'troubleshooters', label: 'Fix Issues' },
              { id: 'contact', label: 'Contact' },
              { id: 'billing', label: 'Billing' },
              { id: 'safety', label: 'Safety' },
              { id: 'status', label: 'Status' },
              { id: 'feedback', label: 'Feedback' }
            ].map((nav) => (
              <Button
                key={nav.id}
                variant={activeView === nav.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView(nav.id)}
                className="whitespace-nowrap"
              >
                {nav.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 max-w-6xl mx-auto">
        {activeView === 'home' && renderHome()}
        {activeView === 'troubleshooters' && renderTroubleshooters()}
        {activeView === 'contact' && renderContact()}
        {activeView === 'billing' && renderOrderBilling()}
        {activeView === 'safety' && renderSafety()}
        {activeView === 'status' && renderSystemStatus()}
        {activeView === 'feedback' && renderFeedback()}
      </div>

      {/* Empty States */}
      {activeView === 'home' && quickTiles.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No support cases yet</h3>
          <p className="text-slate-600">Search the Help Center or contact us—real people read and reply.</p>
        </div>
      )}

      {/* Educational Disclaimer */}
      <div className="bg-blue-50 border-t border-blue-200 mt-12">
        <div className="px-4 py-4 sm:px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <strong>Important:</strong> Aminy provides educational support and guidance. For medical emergencies or urgent clinical needs, always contact your healthcare provider or local emergency services.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupportPage;