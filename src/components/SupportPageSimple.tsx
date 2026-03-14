import React, { useState } from 'react';
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
  Brain,
  MessageCircle,
  Mail,
  Phone,
  Video,
  Clock,
  CheckCircle,
  Shield,
  Activity,
  Download,
  FileText,
  BookOpen,
  Send,
  ThumbsUp,
  ExternalLink,
  Smartphone,
  CreditCard,
  Bug,
  Lightbulb,
  Heart,
  ChevronRight,
  Plus,
  X,
  Info
} from 'lucide-react';

interface SupportPageProps {
  onNavigate?: (destination: string) => void;
  userTier?: string;
}

export function SupportPageSimple({ onNavigate, userTier = 'core' }: SupportPageProps) {
  const [activeView, setActiveView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  // Quick tiles for help home
  const quickTiles = [
    {
      id: 'junior-setup',
      title: 'Set up Aminy Ease',
      description: 'Pair your child\'s device',
      icon: <Smartphone className="w-5 h-5" />,
      popular: true
    },
    {
      id: 'billing',
      title: 'Manage Plan & Billing',
      description: 'Update payment & subscription',
      icon: <CreditCard className="w-5 h-5" />,
      popular: true
    },
    {
      id: 'reports',
      title: 'Reports & Exports',
      description: 'Download and share data',
      icon: <Download className="w-5 h-5" />,
      popular: false
    }
  ];

  const contactTopics = [
    { id: 'account-billing', label: 'Account & Billing' },
    { id: 'junior-devices', label: 'Ease & Devices' },
    { id: 'reports-data', label: 'Reports & Data' },
    { id: 'other', label: 'Other' }
  ];

  const handleSubmitContact = () => {
    if (!selectedTopic || !contactMessage.trim()) return;
    
    setContactMessage('');
    setSelectedTopic('');
  };

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
                </button>
              ))}
            </div>
          </div>

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

          {/* Submit */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-slate-500">
              Expected response: {userTier === 'pro' ? '4-8 hours' : '24-48 hours'}
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
            </div>
          </div>
        </div>
      </div>
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
                  variant={activeView === 'contact' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('contact')}
                >
                  Contact Us
                </Button>
                <Button
                  variant={activeView === 'safety' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('safety')}
                >
                  Safety
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
              { id: 'contact', label: 'Contact' },
              { id: 'safety', label: 'Safety' }
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
        {activeView === 'contact' && renderContact()}
        {activeView === 'safety' && renderSafety()}
      </div>


    </div>
  );
}

export default SupportPageSimple;