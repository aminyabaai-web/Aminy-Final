// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useEffect, useRef } from 'react';
import {
  Users,
  ShoppingBag,
  User,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Settings,
  Bell,
  Shield,
  FileText,
  MessageSquare,
  BarChart3,
  Brain,
  TrendingUp
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface MoreMenuItem {
  id: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  sublabel: string;
  destination: string;
  analytics: string;
}

interface MorePageProps {
  onNavigate: (destination: string) => void;
  onAnalytics: (event: string, data: Record<string, string>) => void;
}

export function MorePage({ onNavigate, onAnalytics }: MorePageProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // Focus management for ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const moreButton = document.querySelector('button[aria-label*="More"]') as HTMLButtonElement;
        if (moreButton) {
          moreButton.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus first item when page loads
  useEffect(() => {
    if (firstItemRef.current) {
      firstItemRef.current.focus();
    }
  }, []);

  // The 5 main More tabs as mentioned by the user
  const mainMoreItems = [
    {
      id: 'document-vault',
      icon: FileText,
      label: 'Document Vault',
      sublabel: 'Your medical records & documents',
      destination: 'document-vault', // Routes to DocumentVaultPage
      analytics: 'document_vault'
    },
    {
      id: 'parent-hub',
      icon: Users,
      label: 'Parent Hub',
      sublabel: 'Connect with other families',
      destination: 'community', // Routes to ParentHubPage
      analytics: 'parent_hub'
    },
    {
      id: 'shop',
      icon: ShoppingBag,
      label: 'Shop',
      sublabel: 'Recommended tools & products',
      destination: 'shop', // Routes to ShopPage
      analytics: 'shop'
    },
    {
      id: 'settings-account',
      icon: User,
      label: 'Settings & Account',
      sublabel: 'Manage your preferences',
      destination: 'profile', // Routes to SettingsPage
      analytics: 'settings_account'
    },
    {
      id: 'support',
      icon: HelpCircle,
      label: 'Support',
      sublabel: 'Get help and contact us',
      destination: 'support', // Routes to SupportPage
      analytics: 'support'
    }
  ];

  const additionalItems = [
    {
      id: 'weekly-insights',
      icon: Brain,
      label: 'Weekly Insights',
      sublabel: 'AI-powered progress summary',
      destination: 'weekly-insights',
      analytics: 'weekly_insights'
    },
    {
      id: 'analytics',
      icon: BarChart3,
      label: 'Analytics & Trends',
      sublabel: 'Visual progress tracking',
      destination: 'analytics-charts',
      analytics: 'analytics_charts'
    },
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      sublabel: 'Manage alerts and reminders',
      destination: 'settings', // Routes to SettingsPage with notifications section
      analytics: 'notifications'
    },
    {
      id: 'junior',
      icon: Sparkles,
      label: 'Aminy Ease',
      sublabel: 'Calm, rewards, transitions',
      destination: 'junior', // Routes to junior tab
      analytics: 'junior'
    }
  ];

  const legalItems = [
    {
      id: 'feedback',
      icon: MessageSquare,
      label: 'Send Feedback',
      sublabel: 'Help us improve Aminy',
      destination: 'feedback', // Opens external feedback form
      analytics: 'feedback'
    },
    {
      id: 'privacy',
      icon: Shield,
      label: 'Privacy & Safety',
      sublabel: 'Your data and safety',
      destination: 'privacy-policy',
      analytics: 'privacy'
    },
    {
      id: 'terms',
      icon: FileText,
      label: 'Terms & Policies',
      sublabel: 'Legal information',
      destination: 'terms-of-service',
      analytics: 'terms'
    }
  ];

  const handleItemClick = (item: MoreMenuItem) => {
    try {
      onAnalytics('more_item_opened', { item: item.analytics });
      // Some destinations need special handling before they have their own screens
      if (item.destination === 'support') {
        window.open('mailto:support@aminy.ai?subject=Aminy%20Support', '_blank');
        return;
      }
      if (item.destination === 'feedback') {
        window.open('mailto:feedback@aminy.ai?subject=Aminy%20Feedback', '_blank');
        return;
      }
      onNavigate(item.destination);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, item: MoreMenuItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick(item);
    }
  };

  const MenuItem = ({ item, isFirst = false }: { item: MoreMenuItem; isFirst?: boolean }) => {
    const Icon = item.icon;
    
    return (
      <button
        ref={isFirst ? firstItemRef : undefined}
        role="menuitem"
        onClick={() => handleItemClick(item)}
        onKeyDown={(e) => handleKeyDown(e, item)}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-[#E8E4DF] dark:border-slate-600 hover:border-[#E8E4DF] dark:hover:border-slate-500 hover:bg-[#FAF7F2] dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 group"
        aria-label={`Open ${item.label}`}
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-[#F0EDE8] dark:bg-slate-700 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#5A6B7A] dark:text-slate-300" strokeWidth={1.5} />
          </div>
          
          <div className="text-left">
            <div className="text-sm text-[#1B2733] dark:text-slate-100">{item.label}</div>
            <div className="text-xs text-[#5A6B7A] dark:text-slate-400">{item.sublabel}</div>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-[#8A9BA8] dark:text-slate-400 group-hover:text-[#5A6B7A] dark:group-hover:text-slate-300 transition-colors" />
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-mist dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-[#E8E4DF] dark:border-slate-600">
        <div className="px-4 py-6 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl text-[#1B2733] dark:text-slate-100">Settings</h1>
            <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 max-w-2xl mx-auto">
        <div ref={menuRef} role="menu" aria-label="Settings navigation menu" className="space-y-8">
          
          {/* Main More Items - The 5 core tabs */}
          <div>
            <h2 className="text-sm text-[#5A6B7A] dark:text-slate-400 uppercase tracking-wide mb-3">Main Features</h2>
            <div className="space-y-2">
              {mainMoreItems.map((item, index) => (
                <MenuItem key={item.id} item={item} isFirst={index === 0} />
              ))}
            </div>
          </div>

          {/* Additional Features */}
          <div>
            <h2 className="text-sm text-[#5A6B7A] dark:text-slate-400 uppercase tracking-wide mb-3">Additional Features</h2>
            <div className="space-y-2">
              {additionalItems.map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Appearance Section */}
          <div>
            <h2 className="text-sm text-[#5A6B7A] dark:text-slate-400 uppercase tracking-wide mb-3">Appearance</h2>
            <div className="space-y-2">
              <ThemeToggle />
            </div>
          </div>

          {/* Support & Legal */}
          <div>
            <h2 className="text-sm text-[#5A6B7A] dark:text-slate-400 uppercase tracking-wide mb-3">Support & Legal</h2>
            <div className="space-y-2">
              {legalItems.map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="mt-12 pt-8 border-t border-[#E8E4DF] dark:border-slate-600">
          <div className="text-center text-xs text-[#5A6B7A] dark:text-slate-400 space-y-1">
            <p>Aminy Version 1.0.0</p>
            <p>© {new Date().getFullYear()} Aminy, LLC All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}