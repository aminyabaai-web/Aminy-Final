import React, { useState } from 'react';
import { 
  Heart, Calendar, MessageCircle, Users, Sparkles, Check, CheckCircle,
  AlertCircle, Info, AlertTriangle, Home, BarChart3, Settings, Mail,
  ChevronRight, ArrowRight, Play, Clock, User, Star, Shield, GraduationCap,
  Download, Share, Copy, Printer, X, Menu
} from 'lucide-react';

/**
 * COMPREHENSIVE DESIGN SYSTEM FOR AMINY
 * 
 * A complete, production-ready design system built for Aminy's AI-first experience.
 * Features Apple-clean design with teal accents (#0891b2), white backgrounds, 
 * navy fonts, and minimal styling.
 * 
 * Created for: Figma Make deliverables - Phase 1 Component Library
 */

export function ComprehensiveDesignSystem() {
  const [activeTab, setActiveTab] = useState('buttons');
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // BUTTON COMPONENTS
  const ButtonShowcase = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-primary">Buttons</h3>
      
      {/* Primary Buttons */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Primary Button</h4>
        <div className="flex flex-wrap gap-3">
          <button className="w-full sm:w-auto bg-accent text-white font-semibold py-4 px-6 rounded-lg hover:opacity-90 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Primary Large
          </button>
          <button className="w-full sm:w-auto bg-accent text-white font-semibold py-3 px-5 rounded-lg hover:opacity-90 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Primary Medium
          </button>
          <button className="w-full sm:w-auto bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Primary Small
          </button>
          <button className="w-full sm:w-auto bg-accent text-white font-semibold py-4 px-6 rounded-lg opacity-50 cursor-not-allowed" disabled>
            Disabled
          </button>
        </div>
      </div>

      {/* Secondary Buttons */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Secondary Button</h4>
        <div className="flex flex-wrap gap-3">
          <button className="w-full sm:w-auto border-2 border-accent text-accent font-semibold py-4 px-6 rounded-lg hover:bg-accent/10 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Secondary Large
          </button>
          <button className="w-full sm:w-auto border-2 border-accent text-accent font-semibold py-3 px-5 rounded-lg hover:bg-accent/10 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Secondary Medium
          </button>
          <button className="w-full sm:w-auto border-2 border-accent text-accent font-semibold py-2 px-4 rounded-lg hover:bg-accent/10 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Secondary Small
          </button>
        </div>
      </div>

      {/* Tertiary Buttons */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Tertiary Button (Ghost)</h4>
        <div className="flex flex-wrap gap-3">
          <button className="w-full sm:w-auto text-accent font-semibold py-4 px-6 rounded-lg hover:bg-accent/5 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Tertiary Large
          </button>
          <button className="w-full sm:w-auto text-accent font-semibold py-3 px-5 rounded-lg hover:bg-accent/5 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Tertiary Medium
          </button>
          <button className="w-full sm:w-auto text-accent font-semibold py-2 px-4 rounded-lg hover:bg-accent/5 transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Tertiary Small
          </button>
        </div>
      </div>
    </div>
  );

  // INPUT COMPONENTS
  const InputShowcase = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-primary">Inputs</h3>
      
      {/* Text Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Text Input
        </label>
        <input
          type="text"
          placeholder="Enter text here..."
          className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
        />
        <p className="text-xs text-gray-600">Helper text goes here</p>
      </div>

      {/* Text Input with Validation */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Email (with validation)
        </label>
        <div className="relative">
          <input
            type="email"
            placeholder="your@email.com"
            className="w-full min-h-[44px] px-3 py-2 pr-10 border border-green-500 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
          />
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
        </div>
        <p className="text-xs text-green-600">✓ Valid email address</p>
      </div>

      {/* Select Dropdown */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Select Dropdown
        </label>
        <select className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all bg-white">
          <option>Choose an option</option>
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </select>
      </div>

      {/* Multi-select Chips */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Multi-select Chips
        </label>
        <div className="flex flex-wrap gap-2">
          {['Animals', 'Music', 'Art', 'Sports'].map((item) => (
            <button
              key={item}
              className="px-3 py-2 border-2 border-accent bg-accent/10 text-accent rounded-full text-sm font-medium hover:bg-accent/20 transition-all"
            >
              {item} <Check className="inline w-4 h-4 ml-1" />
            </button>
          ))}
          {['Books', 'Nature'].map((item) => (
            <button
              key={item}
              className="px-3 py-2 border-2 border-gray-300 bg-white text-gray-700 rounded-full text-sm font-medium hover:border-accent/50 transition-all"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Switch */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Toggle Switch
        </label>
        <div className="flex items-center gap-3">
          <button className="relative w-12 h-6 bg-accent rounded-full transition-all">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-md transition-all"></div>
          </button>
          <span className="text-sm text-gray-600">Enabled</span>
        </div>
      </div>

      {/* Radio Buttons */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Radio Buttons
        </label>
        <div className="space-y-2">
          {['Option A', 'Option B', 'Option C'].map((option, idx) => (
            <label key={option} className="flex items-center gap-3 cursor-pointer">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${idx === 0 ? 'border-accent' : 'border-gray-300'}`}>
                {idx === 0 && <div className="w-3 h-3 rounded-full bg-accent"></div>}
              </div>
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  // CARD COMPONENTS
  const CardShowcase = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-primary">Cards</h3>
      
      {/* Activity Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <h4 className="text-lg font-semibold">Morning Visual Schedule</h4>
          <span className="bg-accent text-white text-xs font-medium px-2 py-1 rounded-full">5 min</span>
        </div>
        <p className="text-sm text-gray-600 mb-3">Create a simple picture schedule for the day</p>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Sparkles className="w-4 h-4" />
          <span>Materials: Paper & markers</span>
        </div>
        <button className="w-full bg-accent text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-all">
          Start
        </button>
      </div>

      {/* Report Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-base font-semibold">Weekly Progress</h4>
            <p className="text-xs text-gray-500">Last 7 days</p>
          </div>
        </div>
        
        {/* Chart Placeholder */}
        <div className="h-32 bg-gray-50 rounded-lg mb-3 flex items-center justify-center">
          <span className="text-xs text-gray-400">Chart visualization</span>
        </div>
        
        {/* AI Narrative */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900">
            This week, Eddie tried 3 new activities. They seemed most engaged with turn-taking games.
          </p>
        </div>
      </div>

      {/* Plan Card (Compact) */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium">Turn-Taking Game</p>
              <p className="text-xs text-gray-500">10 min • Any toy</p>
            </div>
          </div>
          <button className="text-accent text-sm font-medium hover:underline">
            Start
          </button>
        </div>
      </div>
    </div>
  );

  // BADGE COMPONENTS
  const BadgeShowcase = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-primary">Badges</h3>
      
      {/* Trust Badges */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Trust Badges</h4>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Parent-tested</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">HIPAA-conscious</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
            <GraduationCap className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Designed with BCBAs</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-900">AI-powered</span>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Status Badges</h4>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Success
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Warning
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            <Info className="w-3 h-3" />
            Info
          </span>
        </div>
      </div>
    </div>
  );

  // NAVIGATION COMPONENTS
  const NavigationShowcase = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-primary">Navigation</h3>
      
      {/* Bottom Nav */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Bottom Navigation</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-2 flex justify-around">
          {[
            { icon: Home, label: 'Home', active: true },
            { icon: Calendar, label: 'Plan', active: false },
            { icon: BarChart3, label: 'Progress', active: false },
            { icon: MessageCircle, label: 'Chat', active: false },
            { icon: Settings, label: 'More', active: false }
          ].map((item) => (
            <button
              key={item.label}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                item.active ? 'text-accent' : 'text-gray-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Tabs (Underline Style)</h4>
        <div className="flex gap-6 border-b border-gray-200">
          <button className="pb-2 text-sm font-medium text-accent border-b-2 border-accent">
            Active Tab
          </button>
          <button className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">
            Inactive Tab
          </button>
          <button className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">
            Another Tab
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Progress Stepper</h4>
        <div className="flex items-center justify-between max-w-md">
          {[1, 2, 3, 4, 5].map((step, idx) => (
            <React.Fragment key={step}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                idx < 2 ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {idx < 2 ? <Check className="w-4 h-4" /> : step}
              </div>
              {idx < 4 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  idx < 2 ? 'bg-accent' : 'bg-gray-200'
                }`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  // FEEDBACK COMPONENTS
  const FeedbackShowcase = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-primary">Feedback</h3>
      
      {/* Modal Trigger */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Modal</h4>
        <button
          onClick={() => setShowModal(true)}
          className="bg-accent text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-all"
        >
          Show Modal
        </button>
      </div>

      {/* Toast Trigger */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Toast Notification</h4>
        <button
          onClick={() => {
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4000);
          }}
          className="border-2 border-accent text-accent font-semibold py-3 px-6 rounded-lg hover:bg-accent/10 transition-all"
        >
          Show Toast
        </button>
      </div>

      {/* Skeleton Loader */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Skeleton Loader</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  );

  // DESIGN TOKENS
  const TokensShowcase = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-primary">Design Tokens</h3>
      
      {/* Colors */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Colors</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: 'Primary Teal', value: '#0891b2', class: 'bg-[#0891b2]' },
            { name: 'White', value: '#FFFFFF', class: 'bg-white border' },
            { name: 'Navy', value: '#111827', class: 'bg-[#111827]' },
            { name: 'Gray 50', value: '#F9FAFB', class: 'bg-[#F9FAFB] border' },
            { name: 'Success', value: '#10B981', class: 'bg-[#10B981]' },
            { name: 'Error', value: '#EF4444', class: 'bg-[#EF4444]' }
          ].map((color) => (
            <div key={color.name} className="space-y-2">
              <div className={`h-16 rounded-lg ${color.class}`}></div>
              <div>
                <p className="text-xs font-medium">{color.name}</p>
                <p className="text-xs text-gray-500">{color.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Typography</h4>
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">H1: 28-32px / Bold</h1>
            <p className="text-xs text-gray-500">Large headings</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-1">H2: 22-24px / Semibold</h2>
            <p className="text-xs text-gray-500">Section headings</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-1">H3: 18-20px / Semibold</h3>
            <p className="text-xs text-gray-500">Subsection headings</p>
          </div>
          <div>
            <p className="text-base mb-1">Body: 16px / Regular</p>
            <p className="text-xs text-gray-500">Body text</p>
          </div>
          <div>
            <p className="text-sm mb-1">Caption: 14px / Regular</p>
            <p className="text-xs text-gray-500">Helper text</p>
          </div>
        </div>
      </div>

      {/* Spacing */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Spacing</h4>
        <div className="space-y-2">
          {[
            { name: '8px', size: 'w-2' },
            { name: '16px', size: 'w-4' },
            { name: '24px', size: 'w-6' },
            { name: '32px', size: 'w-8' },
            { name: '40px', size: 'w-10' },
            { name: '48px', size: 'w-12' }
          ].map((space) => (
            <div key={space.name} className="flex items-center gap-3">
              <div className={`${space.size} h-4 bg-accent rounded`}></div>
              <span className="text-xs text-gray-600">{space.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Border Radius</h4>
        <div className="flex flex-wrap gap-3">
          {[
            { name: '8px', class: 'rounded-lg' },
            { name: '12px', class: 'rounded-xl' },
            { name: '16px', class: 'rounded-2xl' },
            { name: 'Full', class: 'rounded-full' }
          ].map((radius) => (
            <div key={radius.name} className="text-center">
              <div className={`w-16 h-16 bg-accent/20 border-2 border-accent ${radius.class} mb-1`}></div>
              <p className="text-xs text-gray-600">{radius.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Shadows */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Shadows</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs font-medium">Small</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <p className="text-xs font-medium">Medium</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <p className="text-xs font-medium">Large</p>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'buttons', label: 'Buttons', component: ButtonShowcase },
    { id: 'inputs', label: 'Inputs', component: InputShowcase },
    { id: 'cards', label: 'Cards', component: CardShowcase },
    { id: 'badges', label: 'Badges', component: BadgeShowcase },
    { id: 'navigation', label: 'Navigation', component: NavigationShowcase },
    { id: 'feedback', label: 'Feedback', component: FeedbackShowcase },
    { id: 'tokens', label: 'Tokens', component: TokensShowcase }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ButtonShowcase;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-primary">
                  Aminy Design System
                </h1>
                <p className="text-xs text-gray-500">
                  Complete Component Library v1.0
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <ActiveComponent />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary">Modal Example</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              This is a centered overlay modal with a backdrop blur effect.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border-2 border-accent text-accent font-semibold py-3 rounded-lg hover:bg-accent/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-accent text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg z-50 flex items-start gap-3 max-w-md animate-in slide-in-from-top">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Success!</p>
            <p className="text-sm text-gray-600">Your changes have been saved.</p>
          </div>
        </div>
      )}
    </div>
  );
}
