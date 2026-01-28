import React from 'react';
import { 
  Heart, Play, ChevronRight, Users, Shield, GraduationCap, Sparkles,
  CheckCircle, ExternalLink, FileText, Package
} from 'lucide-react';

/**
 * COVER PAGE - DESIGN SYSTEM PROTOTYPE ENTRY POINT
 * 
 * Professional cover page for the Aminy AI-First Experience
 * Provides navigation to all prototype flows and component library
 */

interface CoverPageProps {
  onNavigate: (destination: string) => void;
}

export function CoverPage({ onNavigate }: CoverPageProps) {
  const handleStart = () => {
    onNavigate('splash');
  };

  const handleViewDesignSystem = () => {
    onNavigate('design-system');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Logo & Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-accent rounded-2xl shadow-lg mb-4 sm:mb-6">
              <Heart className="w-12 h-12 text-white" />
            </div>
            
            <h1 className="text-4xl font-bold text-primary mb-2">
              Aminy AI-First Experience
            </h1>
            <p className="text-xl text-gray-600">
              Complete Design System & Prototype
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-sm font-medium text-accent">Version 1.0</span>
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm text-gray-500">October 2025</span>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
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

          {/* Usage Instructions */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4 sm:mb-6 flex items-center gap-2">
              <Play className="w-6 h-6 text-accent" />
              Usage Instructions
            </h2>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-accent">1</span>
                </div>
                <p className="text-gray-700">
                  Click <span className="font-semibold">"Start Prototype"</span> button to begin from the Splash screen
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-accent">2</span>
                </div>
                <p className="text-gray-700">
                  Navigate using interactive hotspots and buttons throughout the experience
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-accent">3</span>
                </div>
                <p className="text-gray-700">
                  All flows are fully linked and interactive with realistic delays and animations
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-accent">4</span>
                </div>
                <p className="text-gray-700">
                  Access the <span className="font-semibold">complete design system</span> via the "View Design System" button
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-accent">5</span>
                </div>
                <p className="text-gray-700">
                  Use <span className="font-semibold">Shift+D</span> to toggle developer panel for quick navigation
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8">
            <button
              onClick={handleStart}
              className="flex items-center justify-center gap-2 bg-accent text-white font-semibold py-4 px-8 rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
            >
              <Play className="w-5 h-5" />
              Start Prototype
            </button>
            
            <button
              onClick={handleViewDesignSystem}
              className="flex items-center justify-center gap-2 border-2 border-accent text-accent font-semibold py-4 px-8 rounded-lg hover:bg-accent/10 transition-all"
            >
              <Package className="w-5 h-5" />
              View Design System
            </button>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
            <button
              onClick={() => onNavigate('onboarding')}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-accent hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-primary">Onboarding Flow</h3>
                <ChevronRight className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm text-gray-600">5-step magic setup experience</p>
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-accent hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-primary">Today Plan</h3>
                <ChevronRight className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm text-gray-600">Value-first home screen</p>
            </button>

            <button
              onClick={() => onNavigate('paywall')}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-accent hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-primary">Pricing</h3>
                <ChevronRight className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm text-gray-600">Subscription and paywall</p>
            </button>
          </div>

          {/* Features Grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-primary mb-4">What's Included</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[
                { icon: CheckCircle, text: 'Complete component library', color: 'text-green-600' },
                { icon: CheckCircle, text: '5-step onboarding flow', color: 'text-green-600' },
                { icon: CheckCircle, text: 'AI-first interactions', color: 'text-green-600' },
                { icon: CheckCircle, text: 'Mobile-optimized layouts', color: 'text-green-600' },
                { icon: CheckCircle, text: 'WCAG AA accessible', color: 'text-green-600' },
                { icon: CheckCircle, text: 'Production-ready code', color: 'text-green-600' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                  <span className="text-sm text-gray-700">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Credits */}
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">Designed for viral growth and user delight</p>
            <p>Built with React, TypeScript, and Tailwind CSS</p>
            <p className="mt-4 text-xs text-gray-400">
              © 2025 Aminy. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
